import { describe, it, expect } from "vitest"

import {
  channelSchema,
  createConversationSchema,
  createMessageSchema,
  conversationListQuerySchema,
} from "./conversation"

describe("channelSchema", () => {
  it("accepts all valid channel values", () => {
    const validChannels = ["WHATSAPP", "INSTAGRAM", "SITE", "MANUAL"]
    for (const channel of validChannels) {
      expect(channelSchema.safeParse(channel).success).toBe(true)
    }
  })

  it("rejects invalid channel values", () => {
    expect(channelSchema.safeParse("INVALID").success).toBe(false)
    expect(channelSchema.safeParse("whatsapp").success).toBe(false)
    expect(channelSchema.safeParse("").success).toBe(false)
  })
})

describe("createConversationSchema", () => {
  it("validates a valid conversation creation", () => {
    const result = createConversationSchema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "WHATSAPP",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid leadId (not UUID)", () => {
    const result = createConversationSchema.safeParse({
      leadId: "not-a-uuid",
      channel: "WHATSAPP",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.leadId?.[0]).toBe("leadId deve ser um UUID válido")
    }
  })

  it("rejects missing leadId", () => {
    const result = createConversationSchema.safeParse({
      channel: "WHATSAPP",
    })
    expect(result.success).toBe(false)
  })

  it("rejects missing channel", () => {
    const result = createConversationSchema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid channel value", () => {
    const result = createConversationSchema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440000",
      channel: "EMAIL",
    })
    expect(result.success).toBe(false)
  })
})

describe("createMessageSchema", () => {
  it("validates a valid message creation", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Hello, world!",
      senderType: "USER",
    })
    expect(result.success).toBe(true)
  })

  it("trims whitespace from content", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "  Hello, world!  ",
      senderType: "USER",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.content).toBe("Hello, world!")
    }
  })

  it("rejects empty content", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "",
      senderType: "USER",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.content?.[0]).toBe("Conteúdo da mensagem é obrigatório")
    }
  })

  it("rejects whitespace-only content", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "   ",
      senderType: "USER",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.content?.[0]).toBe("Conteúdo da mensagem é obrigatório")
    }
  })

  it("rejects content exceeding 5000 characters", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "a".repeat(5001),
      senderType: "USER",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.content?.[0]).toBe(
        "Conteúdo deve ter no máximo 5000 caracteres",
      )
    }
  })

  it("accepts content with exactly 5000 characters", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "a".repeat(5000),
      senderType: "USER",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid conversationId (not UUID)", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "not-a-uuid",
      content: "Hello",
      senderType: "USER",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.conversationId?.[0]).toBe(
        "conversationId deve ser um UUID válido",
      )
    }
  })

  it("rejects invalid senderType", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Hello",
      senderType: "ADMIN",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issues = result.error.flatten().fieldErrors
      expect(issues.senderType?.[0]).toBe("senderType deve ser USER ou CUSTOMER")
    }
  })

  it("accepts CUSTOMER as senderType", () => {
    const result = createMessageSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Hello",
      senderType: "CUSTOMER",
    })
    expect(result.success).toBe(true)
  })
})

describe("conversationListQuerySchema", () => {
  it("applies default values when no params provided", () => {
    const result = conversationListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(20)
    }
  })

  it("coerces string values to numbers", () => {
    const result = conversationListQuerySchema.safeParse({
      page: "2",
      pageSize: "50",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.pageSize).toBe(50)
    }
  })

  it("rejects page less than 1", () => {
    const result = conversationListQuerySchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects pageSize greater than 100", () => {
    const result = conversationListQuerySchema.safeParse({ pageSize: 101 })
    expect(result.success).toBe(false)
  })

  it("rejects pageSize less than 1", () => {
    const result = conversationListQuerySchema.safeParse({ pageSize: 0 })
    expect(result.success).toBe(false)
  })

  it("accepts pageSize of exactly 100", () => {
    const result = conversationListQuerySchema.safeParse({ pageSize: 100 })
    expect(result.success).toBe(true)
  })
})
