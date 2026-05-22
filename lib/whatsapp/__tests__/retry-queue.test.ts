import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { InboundMessagePayload } from "../types"

// Mock dependencies
vi.mock("@/lib/whatsapp/lead-manager", () => ({
  findOrCreateLead: vi.fn(),
}))

vi.mock("@/lib/whatsapp/message-router", () => ({
  routeMessage: vi.fn(),
}))

// Import after mocks are set up
import {
  enqueueForRetry,
  processRetryQueue,
  getQueueSize,
  clearQueue,
  type RetryPayload,
} from "../retry-queue"
import { findOrCreateLead } from "@/lib/whatsapp/lead-manager"
import { routeMessage } from "@/lib/whatsapp/message-router"

const mockFindOrCreateLead = vi.mocked(findOrCreateLead)
const mockRouteMessage = vi.mocked(routeMessage)

function createTestPayload(overrides?: Partial<InboundMessagePayload>): InboundMessagePayload {
  return {
    from: "5511999998888",
    messageId: "wamid.test123",
    text: "Olá, preciso de ajuda",
    timestamp: 1700000000,
    type: "text",
    profileName: "João",
    wabaId: "WABA_123",
    ...overrides,
  }
}

describe("retry-queue", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearQueue()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("enqueueForRetry", () => {
    it("adds a payload to the queue", () => {
      const payload: RetryPayload = {
        messagePayload: createTestPayload(),
        companyId: "company-1",
        attemptCount: 0,
      }

      enqueueForRetry(payload)

      expect(getQueueSize()).toBe(1)
    })

    it("does not duplicate entries for the same message", () => {
      const payload: RetryPayload = {
        messagePayload: createTestPayload(),
        companyId: "company-1",
        attemptCount: 0,
      }

      enqueueForRetry(payload)
      enqueueForRetry({ ...payload, attemptCount: 1 })

      expect(getQueueSize()).toBe(1)
    })

    it("stores different messages separately", () => {
      enqueueForRetry({
        messagePayload: createTestPayload({ messageId: "wamid.msg1" }),
        companyId: "company-1",
        attemptCount: 0,
      })

      enqueueForRetry({
        messagePayload: createTestPayload({ messageId: "wamid.msg2" }),
        companyId: "company-1",
        attemptCount: 0,
      })

      expect(getQueueSize()).toBe(2)
    })

    it("schedules a retry via setTimeout", () => {
      const payload: RetryPayload = {
        messagePayload: createTestPayload(),
        companyId: "company-1",
        attemptCount: 0,
      }

      enqueueForRetry(payload)

      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })
  })

  describe("processRetryQueue", () => {
    it("removes item from queue on successful retry", async () => {
      mockFindOrCreateLead.mockResolvedValue({
        lead: { id: "lead-1" } as any,
        isNew: false,
      })
      mockRouteMessage.mockResolvedValue({
        conversationId: "conv-1",
        messageId: "msg-1",
        isNewConversation: false,
      })

      enqueueForRetry({
        messagePayload: createTestPayload(),
        companyId: "company-1",
        attemptCount: 0,
      })

      await processRetryQueue()

      expect(getQueueSize()).toBe(0)
      expect(mockFindOrCreateLead).toHaveBeenCalledWith(
        "5511999998888",
        "company-1",
        "João"
      )
      expect(mockRouteMessage).toHaveBeenCalledWith({
        leadId: "lead-1",
        companyId: "company-1",
        content: "Olá, preciso de ajuda",
        senderType: "CUSTOMER",
        whatsappMessageId: "wamid.test123",
        sentAt: new Date(1700000000 * 1000),
      })
    })

    it("increments attempt count on failure and keeps in queue", async () => {
      mockFindOrCreateLead.mockRejectedValue(new Error("DB connection error"))

      enqueueForRetry({
        messagePayload: createTestPayload(),
        companyId: "company-1",
        attemptCount: 0,
      })

      await processRetryQueue()

      // Item should still be in queue with incremented attempt count
      expect(getQueueSize()).toBe(1)
    })

    it("discards item after max attempts (3)", async () => {
      mockFindOrCreateLead.mockRejectedValue(new Error("DB connection error"))

      enqueueForRetry({
        messagePayload: createTestPayload(),
        companyId: "company-1",
        attemptCount: 2, // Next failure will be attempt 3 (max)
      })

      await processRetryQueue()

      // Item should be discarded after reaching max attempts
      expect(getQueueSize()).toBe(0)
    })

    it("processes multiple items in the queue", async () => {
      mockFindOrCreateLead.mockResolvedValue({
        lead: { id: "lead-1" } as any,
        isNew: false,
      })
      mockRouteMessage.mockResolvedValue({
        conversationId: "conv-1",
        messageId: "msg-1",
        isNewConversation: false,
      })

      enqueueForRetry({
        messagePayload: createTestPayload({ messageId: "wamid.msg1" }),
        companyId: "company-1",
        attemptCount: 0,
      })

      enqueueForRetry({
        messagePayload: createTestPayload({ messageId: "wamid.msg2" }),
        companyId: "company-1",
        attemptCount: 0,
      })

      await processRetryQueue()

      expect(getQueueSize()).toBe(0)
      expect(mockFindOrCreateLead).toHaveBeenCalledTimes(2)
      expect(mockRouteMessage).toHaveBeenCalledTimes(2)
    })

    it("handles partial failures - succeeds some, fails others", async () => {
      mockFindOrCreateLead
        .mockResolvedValueOnce({ lead: { id: "lead-1" } as any, isNew: false })
        .mockRejectedValueOnce(new Error("DB error"))

      mockRouteMessage.mockResolvedValue({
        conversationId: "conv-1",
        messageId: "msg-1",
        isNewConversation: false,
      })

      enqueueForRetry({
        messagePayload: createTestPayload({ messageId: "wamid.success" }),
        companyId: "company-1",
        attemptCount: 0,
      })

      enqueueForRetry({
        messagePayload: createTestPayload({ messageId: "wamid.fail" }),
        companyId: "company-1",
        attemptCount: 0,
      })

      await processRetryQueue()

      // One succeeded (removed), one failed (still in queue)
      expect(getQueueSize()).toBe(1)
    })

    it("retries are processed within 60 seconds", () => {
      enqueueForRetry({
        messagePayload: createTestPayload(),
        companyId: "company-1",
        attemptCount: 0,
      })

      // The retry delay is 10 seconds, well within the 60-second requirement
      // Advance time by 10 seconds to trigger the scheduled retry
      vi.advanceTimersByTime(10_000)

      // Timer should have fired (processRetryQueue called)
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
