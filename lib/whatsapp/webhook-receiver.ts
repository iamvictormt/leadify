/**
 * Webhook Receiver — handles Meta WhatsApp webhook verification
 * and inbound message payload parsing.
 */

import { getWhatsAppConfig } from "./config"
import type {
  WebhookVerificationParams,
  WebhookVerificationResult,
  InboundMessagePayload,
} from "./types"

/**
 * Verifies a Meta webhook verification request.
 *
 * Validates that:
 * - hub.mode is "subscribe"
 * - hub.verify_token matches the configured token
 * - hub.challenge is present and non-empty
 *
 * Returns the appropriate HTTP response to send back to Meta.
 */
export function verifyWebhook(
  params: WebhookVerificationParams,
): WebhookVerificationResult {
  const { mode, verifyToken, challenge } = params

  // Mode must be "subscribe"
  if (!mode || mode !== "subscribe") {
    return {
      status: 400,
      body: "Invalid mode",
      contentType: "text/plain",
    }
  }

  // Verify token must match the configured token
  const config = getWhatsAppConfig()
  if (!verifyToken || verifyToken !== config.verifyToken) {
    return {
      status: 403,
      body: "Forbidden",
      contentType: "text/plain",
    }
  }

  // Challenge must be present and non-empty
  if (!challenge || challenge.trim() === "") {
    return {
      status: 400,
      body: "Missing challenge",
      contentType: "text/plain",
    }
  }

  return {
    status: 200,
    body: challenge,
    contentType: "text/plain",
  }
}

/**
 * Parses a Meta WhatsApp webhook POST payload and extracts inbound messages.
 *
 * Expected structure:
 * {
 *   object: "whatsapp_business_account",
 *   entry: [{
 *     id: "<WABA_ID>",
 *     changes: [{
 *       value: {
 *         messages: [{ from, id, timestamp, type, text?: { body } }],
 *         contacts: [{ profile: { name } }]
 *       }
 *     }]
 *   }]
 * }
 *
 * Returns null if the payload structure is invalid or contains no messages.
 */
export function parseWebhookPayload(
  body: unknown,
): InboundMessagePayload[] | null {
  if (!body || typeof body !== "object") {
    return null
  }

  const payload = body as Record<string, unknown>

  // Must be a whatsapp_business_account object
  if (payload.object !== "whatsapp_business_account") {
    return null
  }

  // Must have entry array
  const entry = payload.entry
  if (!Array.isArray(entry) || entry.length === 0) {
    return null
  }

  const messages: InboundMessagePayload[] = []

  for (const entryItem of entry) {
    if (!entryItem || typeof entryItem !== "object") {
      continue
    }

    const wabaId = (entryItem as Record<string, unknown>).id
    if (!wabaId || typeof wabaId !== "string") {
      continue
    }

    const changes = (entryItem as Record<string, unknown>).changes
    if (!Array.isArray(changes)) {
      continue
    }

    for (const change of changes) {
      if (!change || typeof change !== "object") {
        continue
      }

      const value = (change as Record<string, unknown>).value
      if (!value || typeof value !== "object") {
        continue
      }

      const valueObj = value as Record<string, unknown>
      const rawMessages = valueObj.messages
      if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
        continue
      }

      // Extract profile name from contacts array
      const contacts = valueObj.contacts
      let profileName: string | undefined
      if (Array.isArray(contacts) && contacts.length > 0) {
        const contact = contacts[0] as Record<string, unknown> | undefined
        if (contact && typeof contact === "object") {
          const profile = contact.profile as Record<string, unknown> | undefined
          if (profile && typeof profile === "object" && typeof profile.name === "string") {
            profileName = profile.name
          }
        }
      }

      for (const msg of rawMessages) {
        if (!msg || typeof msg !== "object") {
          continue
        }

        const msgObj = msg as Record<string, unknown>

        // Required fields: from, id, type
        const from = msgObj.from
        const messageId = msgObj.id
        const type = msgObj.type
        const timestamp = msgObj.timestamp

        if (
          typeof from !== "string" ||
          typeof messageId !== "string" ||
          typeof type !== "string"
        ) {
          continue
        }

        // Extract text content based on message type
        let text: string
        if (type === "text") {
          const textObj = msgObj.text as Record<string, unknown> | undefined
          if (textObj && typeof textObj === "object" && typeof textObj.body === "string") {
            text = textObj.body
          } else {
            text = ""
          }
        } else {
          // Non-text messages: indicate unsupported type
          text = `[Mídia recebida: ${type}] Tipo não suportado`
        }

        // Parse timestamp — Meta sends it as a string (Unix seconds)
        let parsedTimestamp: number
        if (typeof timestamp === "string") {
          parsedTimestamp = parseInt(timestamp, 10)
        } else if (typeof timestamp === "number") {
          parsedTimestamp = timestamp
        } else {
          parsedTimestamp = Math.floor(Date.now() / 1000)
        }

        messages.push({
          from,
          messageId,
          text,
          timestamp: parsedTimestamp,
          type,
          profileName,
          wabaId,
        })
      }
    }
  }

  return messages.length > 0 ? messages : null
}
