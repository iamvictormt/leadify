import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender"
import { MAX_MESSAGE_LENGTH } from "@/lib/whatsapp/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/whatsapp/send
 *
 * Sends an outbound WhatsApp message on behalf of the authenticated attendant.
 * - Validates body (conversationId, text)
 * - Rejects if text > 4096 characters
 * - Calls sendWhatsAppMessage via Meta Graph API
 * - On success: stores message with status "sent", whatsappMsgId, sentAt = now
 * - On failure: stores message with status "failed", preserves text, returns error
 * - Allows retry by the attendant (idempotent creation on each call)
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const json = await request.json().catch(() => null)

  if (!json) {
    return NextResponse.json(
      { error: "Formato de requisição inválido" },
      { status: 400 },
    )
  }

  const { conversationId, text } = json as {
    conversationId?: string
    text?: string
  }

  // Validate required fields
  if (!conversationId || typeof conversationId !== "string") {
    return NextResponse.json(
      { error: "conversationId é obrigatório" },
      { status: 400 },
    )
  }

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "text é obrigatório" },
      { status: 400 },
    )
  }

  // Validate message length
  if (text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        error: `Mensagem excede o limite de ${MAX_MESSAGE_LENGTH} caracteres`,
      },
      { status: 400 },
    )
  }

  // Verify conversation exists and belongs to user's company, include lead for phone
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      companyId: user.companyId,
    },
    include: {
      lead: {
        select: { phone: true },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversa não encontrada" },
      { status: 404 },
    )
  }

  if (!conversation.lead.phone) {
    return NextResponse.json(
      { error: "Lead não possui telefone cadastrado" },
      { status: 400 },
    )
  }

  // Send message via Meta Graph API
  const result = await sendWhatsAppMessage({
    recipientPhone: conversation.lead.phone,
    text,
    companyId: user.companyId,
  })

  const now = new Date()

  if (result.success) {
    // On success: create message with status "sent", whatsappMsgId, sentAt
    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversationId,
          content: text,
          senderType: "ATTENDANT",
          aiGenerated: false,
          whatsappMsgId: result.metaMessageId,
          status: "sent",
          sentAt: now,
        },
      })

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      })

      return createdMessage
    })

    return NextResponse.json(
      {
        message,
        status: "sent",
      },
      { status: 201 },
    )
  } else {
    // On failure: create message with status "failed", preserve text
    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversationId,
          content: text,
          senderType: "ATTENDANT",
          aiGenerated: false,
          status: "failed",
          sentAt: now,
        },
      })

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: now },
      })

      return createdMessage
    })

    return NextResponse.json(
      {
        message,
        status: "failed",
        error: result.error,
      },
      { status: 502 },
    )
  }
}
