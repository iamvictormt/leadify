import { findOrCreateLead } from "./lead-manager"
import { routeMessage } from "./message-router"
import type { InboundMessagePayload } from "./types"

const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 10_000 // 10 seconds — well within the 60-second requirement

export interface RetryPayload {
  messagePayload: InboundMessagePayload
  companyId: string
  attemptCount: number
}

/**
 * In-memory retry queue for failed message processing.
 * Key: messageId, Value: RetryPayload
 *
 * Uses a Map keyed by messageId to prevent duplicate entries.
 * Task 12.4 may enhance this with a database-backed queue for durability.
 */
const queue = new Map<string, RetryPayload>()

/**
 * Enqueues a failed message payload for retry processing.
 *
 * If the same messageId is already in the queue, it is NOT duplicated
 * (the existing entry is preserved with its current attemptCount).
 *
 * Schedules a retry via setTimeout to process within 60 seconds (Req 2.7).
 */
export function enqueueForRetry(payload: RetryPayload): void {
  const messageId = payload.messagePayload.messageId

  // Prevent duplicates
  if (queue.has(messageId)) {
    return
  }

  queue.set(messageId, payload)

  // Schedule retry processing
  setTimeout(() => {
    processRetryQueue()
  }, RETRY_DELAY_MS)
}

/**
 * Processes all items currently in the retry queue.
 *
 * For each item:
 * - Attempts findOrCreateLead + routeMessage
 * - On success: removes from queue
 * - On failure: increments attemptCount; if max attempts reached, discards
 */
export async function processRetryQueue(): Promise<void> {
  const entries = Array.from(queue.entries())

  for (const [messageId, payload] of entries) {
    try {
      const { lead } = await findOrCreateLead(
        payload.messagePayload.from,
        payload.companyId,
        payload.messagePayload.profileName
      )

      await routeMessage({
        leadId: lead.id,
        companyId: payload.companyId,
        content: payload.messagePayload.text,
        senderType: "CUSTOMER",
        whatsappMessageId: payload.messagePayload.messageId,
        sentAt: new Date(payload.messagePayload.timestamp * 1000),
      })

      // Success — remove from queue
      queue.delete(messageId)
    } catch (error) {
      const nextAttempt = payload.attemptCount + 1

      if (nextAttempt >= MAX_ATTEMPTS) {
        // Max attempts reached — discard
        console.error(
          `[RetryQueue] Max attempts reached for message ${messageId}. Discarding.`,
          error
        )
        queue.delete(messageId)
      } else {
        // Increment attempt count and keep in queue
        queue.set(messageId, {
          ...payload,
          attemptCount: nextAttempt,
        })
      }
    }
  }
}

/**
 * Returns the current number of items in the retry queue.
 * Useful for testing and monitoring.
 */
export function getQueueSize(): number {
  return queue.size
}

/**
 * Clears all items from the retry queue.
 * Used for testing cleanup.
 */
export function clearQueue(): void {
  queue.clear()
}
