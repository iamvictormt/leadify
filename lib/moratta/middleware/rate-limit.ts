/**
 * Rate limiting for Moratta login attempts.
 * Tracks failed login attempts per email in-memory.
 * After 5 consecutive failures → 15-minute lockout.
 */

interface RateLimitEntry {
  attempts: number
  lockedUntil: number | null // timestamp in ms
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  lockedUntil: number | null
  lockoutRemainingMs: number | null
}

/**
 * Check if an email is currently rate-limited.
 * Returns whether the login attempt is allowed.
 */
export function checkRateLimit(email: string): RateLimitResult {
  const key = email.toLowerCase()
  const entry = rateLimitStore.get(key)

  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntil: null,
      lockoutRemainingMs: null,
    }
  }

  // Check if lockout has expired
  if (entry.lockedUntil !== null) {
    const now = Date.now()
    if (now < entry.lockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: entry.lockedUntil,
        lockoutRemainingMs: entry.lockedUntil - now,
      }
    }
    // Lockout expired — reset
    rateLimitStore.delete(key)
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
      lockedUntil: null,
      lockoutRemainingMs: null,
    }
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.attempts,
    lockedUntil: null,
    lockoutRemainingMs: null,
  }
}

/**
 * Record a failed login attempt for an email.
 * If this is the 5th consecutive failure, locks the account for 15 minutes.
 */
export function recordFailedAttempt(email: string): RateLimitResult {
  const key = email.toLowerCase()
  const entry = rateLimitStore.get(key) ?? { attempts: 0, lockedUntil: null }

  entry.attempts += 1

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
    rateLimitStore.set(key, entry)
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
      lockoutRemainingMs: LOCKOUT_DURATION_MS,
    }
  }

  rateLimitStore.set(key, entry)
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.attempts,
    lockedUntil: null,
    lockoutRemainingMs: null,
  }
}

/**
 * Reset failed attempts for an email (call on successful login).
 */
export function resetAttempts(email: string): void {
  const key = email.toLowerCase()
  rateLimitStore.delete(key)
}

/**
 * Clear all rate limit entries (useful for testing).
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear()
}
