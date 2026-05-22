import { prisma } from "@/lib/prisma"

import { getWhatsAppConfig } from "./config"
import type { SendMessageInput, SendMessageResult } from "./types"
import { MAX_MESSAGE_LENGTH } from "./types"

/**
 * Sends an outbound WhatsApp message via the Meta Graph API.
 *
 * - Validates message length (max 4096 chars)
 * - Looks up WhatsAppConfig for the company
 * - Calls Meta Graph API with the exact text provided (no modification)
 * - Returns a result object (never throws)
 */
export async function sendWhatsAppMessage(
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const { recipientPhone, text, companyId } = input

  // Validate message length
  if (text.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
    }
  }

  // Look up WhatsApp config for the company
  const config = await prisma.whatsAppConfig.findUnique({
    where: { companyId },
  })

  if (!config) {
    return {
      success: false,
      error: "WhatsApp configuration not found for this company",
    }
  }

  // Build Meta Graph API request
  const { apiVersion } = getWhatsAppConfig()
  const url = `https://graph.facebook.com/${apiVersion}/${config.phoneNumberId}/messages`

  const body = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "text",
    text: { body: text },
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.text()
      return {
        success: false,
        error: `Meta API error (${response.status}): ${errorData}`,
      }
    }

    const data = await response.json()
    const metaMessageId = data?.messages?.[0]?.id

    return {
      success: true,
      metaMessageId,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    return {
      success: false,
      error: `Failed to send WhatsApp message: ${message}`,
    }
  }
}
