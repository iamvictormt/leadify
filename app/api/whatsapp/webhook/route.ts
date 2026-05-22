import { type NextRequest } from "next/server"
import { after } from "next/server"

import { prisma } from "@/lib/prisma"
import { verifyWebhook, parseWebhookPayload } from "@/lib/whatsapp/webhook-receiver"
import { findOrCreateLead } from "@/lib/whatsapp/lead-manager"
import { routeMessage } from "@/lib/whatsapp/message-router"
import { generateWhatsAppSuggestion } from "@/lib/whatsapp/ai-suggester"
import { broadcast } from "@/lib/whatsapp/notification-service"
import { enqueueForRetry } from "@/lib/whatsapp/retry-queue"
import { DEDUP_WINDOW_HOURS } from "@/lib/whatsapp/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/whatsapp/webhook
 *
 * Meta webhook verification endpoint.
 * Extracts hub.mode, hub.verify_token, hub.challenge from query params
 * and delegates to verifyWebhook.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const mode = searchParams.get("hub.mode")
  const verifyToken = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const result = verifyWebhook({ mode, verifyToken, challenge })

  return new Response(result.body, {
    status: result.status,
    headers: { "Content-Type": result.contentType },
  })
}

/**
 * POST /api/whatsapp/webhook
 *
 * Receives inbound WhatsApp messages from Meta.
 * Always returns 200 to Meta regardless of internal errors.
 * Processes messages asynchronously after responding.
 *
 * Full flow (async, after response):
 * 1. findOrCreateLead → if new, broadcast "new_lead"
 * 2. routeMessage → store message in correct conversation
 * 3. broadcast "new_message" with preview truncated to 100 chars
 * 4. generateWhatsAppSuggestion → if success, broadcast "ai_suggestion"
 * 5. On any persistence failure → enqueueForRetry
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    // Malformed JSON — return 200 per Meta requirement
    return new Response("OK", { status: 200 })
  }

  // Parse the webhook payload
  const messages = parseWebhookPayload(body)
  if (!messages) {
    // Invalid structure or no messages — return 200 per Meta requirement
    return new Response("OK", { status: 200 })
  }

  // Process each message: identify company, check dedup, then process async
  for (const message of messages) {
    try {
      // Identify company by WABA ID
      const whatsappConfig = await prisma.whatsAppConfig.findUnique({
        where: { wabaId: message.wabaId },
      })

      if (!whatsappConfig) {
        console.log(
          `[Webhook] WABA ID não encontrado: ${message.wabaId}. Descartando mensagem.`
        )
        continue
      }

      const companyId = whatsappConfig.companyId

      // Check deduplication within the 72h window
      const dedupWindowStart = new Date(
        Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000
      )

      const existingDedup = await prisma.whatsAppMessageDedup.findFirst({
        where: {
          whatsappMsgId: message.messageId,
          receivedAt: { gte: dedupWindowStart },
        },
      })

      if (existingDedup) {
        // Duplicate message — skip processing
        continue
      }

      // Register in dedup table
      await prisma.whatsAppMessageDedup.create({
        data: {
          whatsappMsgId: message.messageId,
          companyId,
        },
      })

      // Process message asynchronously after response is sent
      after(async () => {
        try {
          // Step 1: Find or create lead
          const { lead, isNew } = await findOrCreateLead(
            message.from,
            companyId,
            message.profileName
          )

          // Step 2: If lead is new, broadcast "new_lead" notification
          if (isNew) {
            broadcast(companyId, {
              type: "new_lead",
              data: {
                leadId: lead.id,
                name: lead.name,
                phone: lead.phone ?? message.from,
                source: "WHATSAPP",
              },
            })
          }

          // Step 3: Route message to the correct conversation
          const routeResult = await routeMessage({
            leadId: lead.id,
            companyId,
            content: message.text,
            senderType: "CUSTOMER",
            whatsappMessageId: message.messageId,
            sentAt: new Date(message.timestamp * 1000),
          })

          // Step 4: Broadcast "new_message" notification with preview truncated to 100 chars
          const preview =
            message.text.length > 100
              ? message.text.substring(0, 100)
              : message.text

          broadcast(companyId, {
            type: "new_message",
            data: {
              conversationId: routeResult.conversationId,
              leadName: lead.name || message.from,
              phone: message.from,
              preview,
            },
          })

          // Step 5: Generate AI suggestion
          const suggestionResult = await generateWhatsAppSuggestion(
            message.text,
            lead.name,
            companyId
          )

          // Step 6: If suggestion succeeds, broadcast "ai_suggestion" notification
          if (suggestionResult.success) {
            broadcast(companyId, {
              type: "ai_suggestion",
              data: {
                conversationId: routeResult.conversationId,
                suggestion: suggestionResult.suggestion,
                messageId: routeResult.messageId,
              },
            })
          }
        } catch (error) {
          // Step 7: On persistence failure, enqueue for retry
          console.error(
            `[Webhook] Erro ao processar mensagem ${message.messageId} para empresa ${companyId}:`,
            error
          )

          enqueueForRetry({
            messagePayload: message,
            companyId,
            attemptCount: 0,
          })
        }
      })
    } catch (error) {
      // Log error but continue processing other messages
      console.error(
        `[Webhook] Erro ao processar mensagem ${message.messageId}:`,
        error
      )
    }
  }

  // Always return 200 to Meta
  return new Response("OK", { status: 200 })
}
