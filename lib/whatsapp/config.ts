/**
 * WhatsApp configuration — reads and validates required environment variables.
 *
 * WHATSAPP_VERIFY_TOKEN: shared token used for Meta webhook verification (required)
 * WHATSAPP_API_VERSION: Meta Graph API version (defaults to "v21.0")
 */

export interface WhatsAppEnvConfig {
  verifyToken: string
  apiVersion: string
}

/**
 * Reads and validates WhatsApp-related environment variables.
 * Throws a descriptive error if required variables are missing.
 */
export function getWhatsAppConfig(): WhatsAppEnvConfig {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (!verifyToken) {
    throw new Error(
      "Missing required environment variable: WHATSAPP_VERIFY_TOKEN. " +
        "Set it in .env.local to enable WhatsApp webhook verification.",
    )
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0"

  return {
    verifyToken,
    apiVersion,
  }
}
