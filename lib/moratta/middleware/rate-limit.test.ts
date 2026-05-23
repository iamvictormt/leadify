import { describe, it, expect, beforeEach } from "vitest"

import {
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
  clearRateLimitStore,
} from "./rate-limit"

describe("Rate Limiting", () => {
  beforeEach(() => {
    clearRateLimitStore()
  })

  describe("checkRateLimit", () => {
    it("allows first attempt for unknown email", () => {
      const result = checkRateLimit("user@example.com")
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(5)
      expect(result.lockedUntil).toBeNull()
    })

    it("is case-insensitive for email", () => {
      recordFailedAttempt("User@Example.COM")
      const result = checkRateLimit("user@example.com")
      expect(result.remainingAttempts).toBe(4)
    })
  })

  describe("recordFailedAttempt", () => {
    it("decrements remaining attempts on each failure", () => {
      const r1 = recordFailedAttempt("test@test.com")
      expect(r1.allowed).toBe(true)
      expect(r1.remainingAttempts).toBe(4)

      const r2 = recordFailedAttempt("test@test.com")
      expect(r2.allowed).toBe(true)
      expect(r2.remainingAttempts).toBe(3)
    })

    it("locks account after 5 consecutive failures", () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt("locked@test.com")
      }

      const result = recordFailedAttempt("locked@test.com")
      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
      expect(result.lockedUntil).not.toBeNull()
      expect(result.lockoutRemainingMs).toBe(15 * 60 * 1000)
    })

    it("returns locked status on check after lockout", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("locked@test.com")
      }

      const result = checkRateLimit("locked@test.com")
      expect(result.allowed).toBe(false)
      expect(result.lockoutRemainingMs).toBeGreaterThan(0)
    })
  })

  describe("resetAttempts", () => {
    it("clears failed attempts on successful login", () => {
      recordFailedAttempt("user@test.com")
      recordFailedAttempt("user@test.com")
      recordFailedAttempt("user@test.com")

      resetAttempts("user@test.com")

      const result = checkRateLimit("user@test.com")
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(5)
    })

    it("is case-insensitive", () => {
      recordFailedAttempt("User@Test.com")
      resetAttempts("user@test.com")

      const result = checkRateLimit("user@test.com")
      expect(result.remainingAttempts).toBe(5)
    })
  })

  describe("lockout expiry", () => {
    it("allows login after lockout period expires", () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("expire@test.com")
      }

      // Simulate time passing by manipulating Date.now
      const originalNow = Date.now
      Date.now = () => originalNow() + 15 * 60 * 1000 + 1

      const result = checkRateLimit("expire@test.com")
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(5)

      // Restore
      Date.now = originalNow
    })
  })
})
