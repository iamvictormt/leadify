/**
 * Shared types and interfaces for the WhatsApp integration.
 * Used across webhook receiver, lead manager, message router, sender,
 * notification service, and status engine components.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum allowed message length for WhatsApp text messages */
export const MAX_MESSAGE_LENGTH = 4096

/** Deduplication window in hours for incoming WhatsApp messages */
export const DEDUP_WINDOW_HOURS = 72

// ─── Webhook Verification ────────────────────────────────────────────────────

/** Parameters extracted from the Meta webhook verification GET request */
export interface WebhookVerificationParams {
  mode: string | null
  verifyToken: string | null
  challenge: string | null
}

/** Result of webhook verification to be sent back to Meta */
export interface WebhookVerificationResult {
  status: number
  body: string
  contentType: string
}

// ─── Inbound Message ─────────────────────────────────────────────────────────

/** Parsed payload from an inbound WhatsApp message */
export interface InboundMessagePayload {
  /** Sender phone number (e.g., "5511999998888") */
  from: string
  /** WhatsApp message ID (wamid.xxx) */
  messageId: string
  /** Message content (max 4096 chars) */
  text: string
  /** Unix timestamp from WhatsApp */
  timestamp: number
  /** Message type: "text", "image", "audio", etc. */
  type: string
  /** WhatsApp profile name of the sender */
  profileName?: string
  /** WhatsApp Business Account ID */
  wabaId: string
}

// ─── Message Routing ─────────────────────────────────────────────────────────

/** Input for routing a message to the correct conversation */
export interface RouteMessageInput {
  leadId: string
  companyId: string
  content: string
  senderType: "CUSTOMER" | "ATTENDANT"
  whatsappMessageId: string
  sentAt: Date
}

/** Result of routing a message */
export interface RouteMessageResult {
  conversationId: string
  messageId: string
  isNewConversation: boolean
}

// ─── Outbound Message Sending ────────────────────────────────────────────────

/** Input for sending a message via Meta Graph API */
export interface SendMessageInput {
  recipientPhone: string
  text: string
  companyId: string
}

/** Result of sending a message via Meta Graph API */
export interface SendMessageResult {
  success: boolean
  metaMessageId?: string
  error?: string
}

// ─── Status Transitions ──────────────────────────────────────────────────────

/** Input for triggering a lead status transition */
export interface StatusTransitionInput {
  leadId: string
  companyId: string
  triggeredByUserId: string
  /** For automatic transitions (e.g., first outbound moves to order 2) */
  targetOrder?: number
  /** For manual transitions (e.g., attendant selects a specific status) */
  targetStatusId?: string
}

// ─── Notifications (SSE) ─────────────────────────────────────────────────────

/** Payload for a new message notification */
export interface NewMessagePayload {
  conversationId: string
  leadName: string
  phone: string
  /** Message preview truncated to 100 characters */
  preview: string
}

/** Payload for a new lead notification */
export interface NewLeadPayload {
  leadId: string
  name: string
  phone: string
  source: string
}

/** Payload for an AI suggestion notification */
export interface AiSuggestionPayload {
  conversationId: string
  suggestion: string
  messageId: string
}

/** Union type for all notification events emitted via SSE */
export type NotificationEvent =
  | { type: "new_message"; data: NewMessagePayload }
  | { type: "new_lead"; data: NewLeadPayload }
  | { type: "ai_suggestion"; data: AiSuggestionPayload }
