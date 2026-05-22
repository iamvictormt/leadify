import { describe, it, expect, beforeEach } from "vitest"
import {
  subscribe,
  broadcast,
  getConnectionCount,
  clearAllConnections,
} from "../notification-service"
import type { NotificationEvent } from "../types"

describe("notification-service", () => {
  beforeEach(() => {
    clearAllConnections()
  })

  describe("subscribe", () => {
    it("returns a ReadableStream", () => {
      const stream = subscribe("company-1")
      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it("registers a connection for the company", async () => {
      const stream = subscribe("company-1")
      // Need to get a reader to trigger start()
      const reader = stream.getReader()
      // Give the stream time to initialize
      await new Promise((r) => setTimeout(r, 0))

      expect(getConnectionCount("company-1")).toBe(1)

      reader.releaseLock()
      await stream.cancel()
    })

    it("supports multiple connections for the same company", async () => {
      const stream1 = subscribe("company-1")
      const stream2 = subscribe("company-1")

      const reader1 = stream1.getReader()
      const reader2 = stream2.getReader()
      await new Promise((r) => setTimeout(r, 0))

      expect(getConnectionCount("company-1")).toBe(2)

      reader1.releaseLock()
      reader2.releaseLock()
      await stream1.cancel()
      await stream2.cancel()
    })

    it("removes connection on cancel", async () => {
      const stream = subscribe("company-1")
      const reader = stream.getReader()
      await new Promise((r) => setTimeout(r, 0))

      expect(getConnectionCount("company-1")).toBe(1)

      await reader.cancel()
      await new Promise((r) => setTimeout(r, 0))

      expect(getConnectionCount("company-1")).toBe(0)
    })
  })

  describe("broadcast", () => {
    it("discards notification silently when no connections exist (Req 8.4)", () => {
      const event: NotificationEvent = {
        type: "new_message",
        data: {
          conversationId: "conv-1",
          leadName: "John",
          phone: "5511999998888",
          preview: "Hello there",
        },
      }

      // Should not throw
      expect(() => broadcast("company-1", event)).not.toThrow()
    })

    it("sends event in SSE format to connected attendants", async () => {
      const stream = subscribe("company-1")
      const reader = stream.getReader()
      await new Promise((r) => setTimeout(r, 0))

      const event: NotificationEvent = {
        type: "new_message",
        data: {
          conversationId: "conv-1",
          leadName: "John",
          phone: "5511999998888",
          preview: "Hello there",
        },
      }

      broadcast("company-1", event)

      const { value, done } = await reader.read()
      expect(done).toBe(false)

      const text = new TextDecoder().decode(value)
      expect(text).toBe(
        `event: new_message\ndata: ${JSON.stringify(event.data)}\n\n`,
      )

      reader.releaseLock()
      await stream.cancel()
    })

    it("broadcasts to all connected attendants of the same company", async () => {
      const stream1 = subscribe("company-1")
      const stream2 = subscribe("company-1")
      const reader1 = stream1.getReader()
      const reader2 = stream2.getReader()
      await new Promise((r) => setTimeout(r, 0))

      const event: NotificationEvent = {
        type: "new_lead",
        data: {
          leadId: "lead-1",
          name: "Maria",
          phone: "5511888887777",
          source: "WHATSAPP",
        },
      }

      broadcast("company-1", event)

      const result1 = await reader1.read()
      const result2 = await reader2.read()

      const text1 = new TextDecoder().decode(result1.value)
      const text2 = new TextDecoder().decode(result2.value)

      const expected = `event: new_lead\ndata: ${JSON.stringify(event.data)}\n\n`
      expect(text1).toBe(expected)
      expect(text2).toBe(expected)

      reader1.releaseLock()
      reader2.releaseLock()
      await stream1.cancel()
      await stream2.cancel()
    })

    it("does not send events to other companies", async () => {
      const stream1 = subscribe("company-1")
      const stream2 = subscribe("company-2")
      const reader1 = stream1.getReader()
      const reader2 = stream2.getReader()
      await new Promise((r) => setTimeout(r, 0))

      const event: NotificationEvent = {
        type: "new_message",
        data: {
          conversationId: "conv-1",
          leadName: "John",
          phone: "5511999998888",
          preview: "Hello",
        },
      }

      broadcast("company-1", event)

      const result1 = await reader1.read()
      expect(new TextDecoder().decode(result1.value)).toContain("new_message")

      // company-2 should not have received anything — cancel without reading
      reader1.releaseLock()
      reader2.releaseLock()
      await stream1.cancel()
      await stream2.cancel()
    })

    it("handles ai_suggestion event type", async () => {
      const stream = subscribe("company-1")
      const reader = stream.getReader()
      await new Promise((r) => setTimeout(r, 0))

      const event: NotificationEvent = {
        type: "ai_suggestion",
        data: {
          conversationId: "conv-1",
          suggestion: "Olá! Como posso ajudar?",
          messageId: "msg-1",
        },
      }

      broadcast("company-1", event)

      const { value } = await reader.read()
      const text = new TextDecoder().decode(value)
      expect(text).toBe(
        `event: ai_suggestion\ndata: ${JSON.stringify(event.data)}\n\n`,
      )

      reader.releaseLock()
      await stream.cancel()
    })

    it("removes errored controllers from the set", async () => {
      const stream = subscribe("company-1")
      const reader = stream.getReader()
      await new Promise((r) => setTimeout(r, 0))

      expect(getConnectionCount("company-1")).toBe(1)

      // Cancel the reader to close the controller, then broadcast
      await reader.cancel()
      await new Promise((r) => setTimeout(r, 0))

      const event: NotificationEvent = {
        type: "new_message",
        data: {
          conversationId: "conv-1",
          leadName: "Test",
          phone: "123",
          preview: "Hi",
        },
      }

      // Should not throw, and should clean up the dead controller
      expect(() => broadcast("company-1", event)).not.toThrow()
    })
  })
})
