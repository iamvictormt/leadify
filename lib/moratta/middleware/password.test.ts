import { describe, it, expect } from "vitest"

import { validatePassword } from "./password"

describe("validatePassword", () => {
  it("accepts a valid password with all requirements", () => {
    const result = validatePassword("Abcdef1x")
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("accepts a strong password", () => {
    const result = validatePassword("MyStr0ngP@ss!")
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects password shorter than 8 characters", () => {
    const result = validatePassword("Ab1cdef")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Senha deve ter no mínimo 8 caracteres")
  })

  it("rejects password without uppercase letter", () => {
    const result = validatePassword("abcdefg1")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Senha deve conter pelo menos uma letra maiúscula")
  })

  it("rejects password without lowercase letter", () => {
    const result = validatePassword("ABCDEFG1")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Senha deve conter pelo menos uma letra minúscula")
  })

  it("rejects password without digit", () => {
    const result = validatePassword("Abcdefgh")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Senha deve conter pelo menos um número")
  })

  it("returns multiple errors for multiple violations", () => {
    const result = validatePassword("abc")
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })

  it("accepts password with exactly 8 characters meeting all criteria", () => {
    const result = validatePassword("Aa1bbbbb")
    expect(result.valid).toBe(true)
  })

  it("rejects empty string", () => {
    const result = validatePassword("")
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
  })
})
