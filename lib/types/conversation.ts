/**
 * API response types for the conversations history feature.
 */

/**
 * Represents a single conversation in the list view.
 * Used by GET /api/conversations response.
 */
export interface ConversationListItem {
  id: string
  leadName: string
  lastMessageContent: string | null
  channel: string
  updatedAt: string
  unreadCount: number
}

/**
 * Represents a single message within a conversation detail view.
 * Used by GET /api/conversations/:id response.
 */
export interface MessageItem {
  id: string
  senderType: string
  content: string
  aiGenerated: boolean
  createdAt: string
}

/**
 * Represents the full conversation detail with messages.
 * Used by GET /api/conversations/:id response.
 */
export interface ConversationDetail {
  id: string
  leadName: string
  channel: string
  createdAt: string
  updatedAt: string
  messages: MessageItem[]
}
