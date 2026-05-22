/**
 * Notification Service (SSE)
 *
 * Manages Server-Sent Events connections and event broadcasting per company.
 * Uses an in-memory Map to track active ReadableStream controllers per company.
 *
 * - subscribe(companyId): creates a ReadableStream for an attendant to receive events
 * - broadcast(companyId, event): sends an event to all connected attendants of a company
 *
 * If no attendants are connected for a company, notifications are discarded silently (Req 8.4).
 */

import type { NotificationEvent } from "./types"

/**
 * In-memory store of active SSE connections per company.
 * Key: companyId, Value: Set of ReadableStreamDefaultControllers
 */
const connections = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>()

/**
 * Creates a new SSE ReadableStream for an attendant of the given company.
 * The stream emits events in SSE format when broadcast() is called.
 *
 * When the stream is cancelled (client disconnects), the controller is
 * automatically removed from the connections set.
 */
export function subscribe(companyId: string): ReadableStream<Uint8Array> {
  let streamController: ReadableStreamDefaultController<Uint8Array>

  return new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
      let companySet = connections.get(companyId)
      if (!companySet) {
        companySet = new Set()
        connections.set(companyId, companySet)
      }
      companySet.add(controller)
    },
    cancel() {
      const companySet = connections.get(companyId)
      if (companySet) {
        companySet.delete(streamController)
        if (companySet.size === 0) {
          connections.delete(companyId)
        }
      }
    },
  })
}

/**
 * Broadcasts a notification event to all connected attendants of the given company.
 *
 * If no attendants are connected (no controllers in the set), the notification
 * is discarded silently without queuing (Req 8.4).
 *
 * Events are sent in SSE format:
 *   event: {type}\n
 *   data: {json}\n\n
 *
 * If a controller is closed/errored, it is removed from the set.
 */
export function broadcast(companyId: string, event: NotificationEvent): void {
  const companySet = connections.get(companyId)
  if (!companySet || companySet.size === 0) {
    // No connected attendants — discard silently (Req 8.4)
    return
  }

  const encoder = new TextEncoder()
  const ssePayload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
  const encoded = encoder.encode(ssePayload)

  for (const controller of companySet) {
    try {
      controller.enqueue(encoded)
    } catch {
      // Controller is closed or errored — remove it
      companySet.delete(controller)
    }
  }

  // Clean up empty sets
  if (companySet.size === 0) {
    connections.delete(companyId)
  }
}

/**
 * Returns the number of active connections for a company.
 * Useful for testing and monitoring.
 */
export function getConnectionCount(companyId: string): number {
  return connections.get(companyId)?.size ?? 0
}

/**
 * Clears all connections. Used for testing cleanup.
 */
export function clearAllConnections(): void {
  connections.clear()
}
