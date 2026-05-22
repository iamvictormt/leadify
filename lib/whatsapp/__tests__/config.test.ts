import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { getWhatsAppConfig } from "../config"

describe("getWhatsAppConfig", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns config when WHATSAPP_VERIFY_TOKEN is set", () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "my-secret-token"
    process.env.WHATSAPP_API_VERSION = "v21.0"

    const config = getWhatsAppConfig()

    expect(config.verifyToken).toBe("my-secret-token")
    expect(config.apiVersion).toBe("v21.0")
  })

  it("throws when WHATSAPP_VERIFY_TOKEN is missing", () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN

    expect(() => getWhatsAppConfig()).toThrow(
      "Missing required environment variable: WHATSAPP_VERIFY_TOKEN",
    )
  })

  it("defaults WHATSAPP_API_VERSION to v21.0 when not set", () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "token"
    delete process.env.WHATSAPP_API_VERSION

    const config = getWhatsAppConfig()

    expect(config.apiVersion).toBe("v21.0")
  })

  it("uses custom WHATSAPP_API_VERSION when set", () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "token"
    process.env.WHATSAPP_API_VERSION = "v22.0"

    const config = getWhatsAppConfig()

    expect(config.apiVersion).toBe("v22.0")
  })
})
