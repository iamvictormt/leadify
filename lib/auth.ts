import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE_NAME = "moratta_session"

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const AUTH_SECRET = process.env.AUTH_SECRET ?? "moratta-dev-secret-change-me"

type SessionPayload = {
  userId: string
  exp: number
}

export const sessionCookieOptions = {
  httpOnly: true,
  maxAge: SESSION_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  return Buffer.from(normalized, "base64").toString("utf8")
}

function sign(value: string) {
  return toBase64Url(createHmac("sha256", AUTH_SECRET).update(value).digest())
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")

  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, originalHash] = passwordHash.split(":")

  if (algorithm !== "scrypt" || !salt || !originalHash) {
    return false
  }

  const hash = scryptSync(password, salt, 64)
  const original = Buffer.from(originalHash, "hex")

  return original.length === hash.length && timingSafeEqual(original, hash)
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const body = toBase64Url(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    }),
  )

  return `${body}.${sign(body)}`
}

export function verifySessionToken(token?: string) {
  if (!token) {
    return null
  }

  const [body, signature] = token.split(".")

  if (!body || !signature || signature !== sign(body)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(body)) as SessionPayload

    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}
