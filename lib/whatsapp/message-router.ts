import { prisma } from "@/lib/prisma"

import type { RouteMessageInput, RouteMessageResult } from "./types"

/**
 * Routes an inbound or outbound message to the correct conversation.
 *
 * - If a Conversation with channel "WHATSAPP" already exists for the lead,
 *   the message is added to it and updatedAt is refreshed.
 * - If no such conversation exists, a new one is created atomically
 *   (via Prisma transaction) together with the message.
 * - Deduplication: if a Message with the same whatsappMsgId already exists,
 *   the function returns early without creating a duplicate.
 */
export async function routeMessage(
  input: RouteMessageInput
): Promise<RouteMessageResult> {
  const { leadId, companyId, content, senderType, whatsappMessageId, sentAt } =
    input

  // ── Deduplication check ──────────────────────────────────────────────────
  if (whatsappMessageId) {
    const existingMessage = await prisma.message.findFirst({
      where: { whatsappMsgId: whatsappMessageId },
    })

    if (existingMessage) {
      return {
        conversationId: existingMessage.conversationId,
        messageId: existingMessage.id,
        isNewConversation: false,
      }
    }
  }

  // ── Look for existing WHATSAPP conversation for this lead ────────────────
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      leadId,
      companyId,
      channel: "WHATSAPP",
    },
  })

  if (existingConversation) {
    // Add message to existing conversation and update updatedAt
    const message = await prisma.message.create({
      data: {
        conversationId: existingConversation.id,
        senderType,
        content,
        whatsappMsgId: whatsappMessageId,
        sentAt,
        status: "sent",
      },
    })

    await prisma.conversation.update({
      where: { id: existingConversation.id },
      data: { updatedAt: new Date() },
    })

    return {
      conversationId: existingConversation.id,
      messageId: message.id,
      isNewConversation: false,
    }
  }

  // ── No existing conversation — create one with the message atomically ────
  const result = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: {
        companyId,
        leadId,
        channel: "WHATSAPP",
      },
    })

    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderType,
        content,
        whatsappMsgId: whatsappMessageId,
        sentAt,
        status: "sent",
      },
    })

    return { conversationId: conversation.id, messageId: message.id }
  })

  return {
    conversationId: result.conversationId,
    messageId: result.messageId,
    isNewConversation: true,
  }
}
