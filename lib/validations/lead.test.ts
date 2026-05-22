import { describe, it, expect } from "vitest"

import { createLeadSchema, leadSourceSchema, updateLeadSchema } from "./lead"

describe("leadSourceSchema", () => {
  it("accepts all valid source values", () => {
    const validSources = ["MANUAL", "WHATSAPP", "INSTAGRAM", "INDICACAO", "SITE"]
    for (const source of validSources) {
      expect(leadSourceSchema.safeParse(source).success).toBe(true)
    }
  })

  it("rejects invalid source values", () => {
    expect(leadSourceSchema.safeParse("INVALID").success).toBe(false)
    expect(leadSourceSchema.safeParse("manual").success).toBe(false)
    expect(leadSourceSchema.safeParse("").success).toBe(false)
  })
})

describe("createLeadSchema", () => {
  it("validates a minimal valid lead (name only)", () => {
    const result = createLeadSchema.safeParse({ name: "João" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe("MANUAL")
    }
  })

  it("validates a complete lead", () => {
    const result = createLeadSchema.safeParse({
      name: "Maria Silva",
      phone: "11999999999",
      email: "maria@example.com",
      source: "WHATSAPP",
      assignedToId: "550e8400-e29b-41d4-a716-446655440000",
      notes: "Lead quente",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = createLeadSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects name with only spaces (trimmed to empty)", () => {
    const result = createLeadSchema.safeParse({ name: "   " })
    expect(result.success).toBe(false)
  })

  it("rejects name exceeding 100 characters", () => {
    const result = createLeadSchema.safeParse({ name: "a".repeat(101) })
    expect(result.success).toBe(false)
  })

  it("accepts name with exactly 100 characters", () => {
    const result = createLeadSchema.safeParse({ name: "a".repeat(100) })
    expect(result.success).toBe(true)
  })

  it("trims whitespace from name before validation", () => {
    const result = createLeadSchema.safeParse({ name: "  João  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("João")
    }
  })

  it("trims whitespace from phone", () => {
    const result = createLeadSchema.safeParse({ name: "João", phone: " 11999 " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.phone).toBe("11999")
    }
  })

  it("trims whitespace from email", () => {
    const result = createLeadSchema.safeParse({
      name: "João",
      email: " test@example.com ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("test@example.com")
    }
  })

  it("rejects phone exceeding 20 characters", () => {
    const result = createLeadSchema.safeParse({
      name: "João",
      phone: "1".repeat(21),
    })
    expect(result.success).toBe(false)
  })

  it("rejects email exceeding 255 characters", () => {
    const result = createLeadSchema.safeParse({
      name: "João",
      email: "a".repeat(250) + "@b.com",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email format", () => {
    const result = createLeadSchema.safeParse({
      name: "João",
      email: "invalid-email",
    })
    expect(result.success).toBe(false)
  })

  it("accepts null/undefined email", () => {
    const result = createLeadSchema.safeParse({ name: "João", email: null })
    expect(result.success).toBe(true)
  })

  it("rejects invalid assignedToId (not uuid)", () => {
    const result = createLeadSchema.safeParse({
      name: "João",
      assignedToId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })

  it("defaults source to MANUAL when not provided", () => {
    const result = createLeadSchema.safeParse({ name: "João" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe("MANUAL")
    }
  })
})

describe("updateLeadSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateLeadSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with name only", () => {
    const result = updateLeadSchema.safeParse({ name: "Novo Nome" })
    expect(result.success).toBe(true)
  })

  it("accepts statusId as valid uuid", () => {
    const result = updateLeadSchema.safeParse({
      statusId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("rejects invalid statusId", () => {
    const result = updateLeadSchema.safeParse({ statusId: "not-a-uuid" })
    expect(result.success).toBe(false)
  })

  it("rejects name if provided but empty", () => {
    const result = updateLeadSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
  })

  it("applies same validations as create for shared fields", () => {
    const result = updateLeadSchema.safeParse({
      name: "a".repeat(101),
    })
    expect(result.success).toBe(false)
  })
})
