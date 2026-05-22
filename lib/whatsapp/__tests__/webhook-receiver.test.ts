import { describe, it, expect, vi, beforeEach } from "vitest"
import { verifyWebhook, parseWebhookPayload } from "../webhook-receiver"

// Mock the config module
vi.mock("../config", () => ({
  getWhatsAppConfig: () => ({
    verifyToken: "test-verify-token",
    apiVersion: "v21.0",
  }),
}))

describe("verifyWebhook", () => {
  it("returns 200 with challenge when all params are valid", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      verifyToken: "test-verify-token",
      challenge: "challenge_123",
    })

    expect(result.status).toBe(200)
    expect(result.body).toBe("challenge_123")
    expect(result.contentType).toBe("text/plain")
  })

  it("returns 400 when mode is null", () => {
    const result = verifyWebhook({
      mode: null,
      verifyToken: "test-verify-token",
      challenge: "challenge_123",
    })

    expect(result.status).toBe(400)
  })

  it("returns 400 when mode is not subscribe", () => {
    const result = verifyWebhook({
      mode: "unsubscribe",
      verifyToken: "test-verify-token",
      challenge: "challenge_123",
    })

    expect(result.status).toBe(400)
  })

  it("returns 403 when verify token does not match", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      verifyToken: "wrong-token",
      challenge: "challenge_123",
    })

    expect(result.status).toBe(403)
  })

  it("returns 403 when verify token is null", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      verifyToken: null,
      challenge: "challenge_123",
    })

    expect(result.status).toBe(403)
  })

  it("returns 400 when challenge is null", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      verifyToken: "test-verify-token",
      challenge: null,
    })

    expect(result.status).toBe(400)
  })

  it("returns 400 when challenge is empty string", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      verifyToken: "test-verify-token",
      challenge: "",
    })

    expect(result.status).toBe(400)
  })

  it("returns 400 when challenge is whitespace only", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      verifyToken: "test-verify-token",
      challenge: "   ",
    })

    expect(result.status).toBe(400)
  })
})

describe("parseWebhookPayload", () => {
  const validPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_123",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "5511999998888",
                phone_number_id: "PHONE_ID_123",
              },
              contacts: [
                {
                  profile: { name: "João Silva" },
                  wa_id: "5511999998888",
                },
              ],
              messages: [
                {
                  from: "5511999998888",
                  id: "wamid.abc123",
                  timestamp: "1700000000",
                  type: "text",
                  text: { body: "Olá, gostaria de saber mais sobre o produto" },
                },
              ],
            },
          },
        ],
      },
    ],
  }

  it("extracts message fields from a valid text message payload", () => {
    const result = parseWebhookPayload(validPayload)

    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0]).toEqual({
      from: "5511999998888",
      messageId: "wamid.abc123",
      text: "Olá, gostaria de saber mais sobre o produto",
      timestamp: 1700000000,
      type: "text",
      profileName: "João Silva",
      wabaId: "WABA_123",
    })
  })

  it("returns null for null body", () => {
    expect(parseWebhookPayload(null)).toBeNull()
  })

  it("returns null for non-object body", () => {
    expect(parseWebhookPayload("string")).toBeNull()
    expect(parseWebhookPayload(123)).toBeNull()
  })

  it("returns null when object is not whatsapp_business_account", () => {
    expect(parseWebhookPayload({ object: "page", entry: [] })).toBeNull()
  })

  it("returns null when entry is empty", () => {
    expect(
      parseWebhookPayload({ object: "whatsapp_business_account", entry: [] }),
    ).toBeNull()
  })

  it("returns null when no messages are present", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                statuses: [{ id: "wamid.abc", status: "delivered" }],
              },
            },
          ],
        },
      ],
    }
    expect(parseWebhookPayload(payload)).toBeNull()
  })

  it("handles non-text messages with unsupported type indication", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_456",
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Maria" }, wa_id: "5511888887777" }],
                messages: [
                  {
                    from: "5511888887777",
                    id: "wamid.img001",
                    timestamp: "1700000100",
                    type: "image",
                    image: { id: "img_id", mime_type: "image/jpeg" },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const result = parseWebhookPayload(payload)

    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0].type).toBe("image")
    expect(result![0].text).toBe("[Mídia recebida: image] Tipo não suportado")
    expect(result![0].profileName).toBe("Maria")
    expect(result![0].wabaId).toBe("WABA_456")
  })

  it("handles audio messages with unsupported type indication", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_789",
          changes: [
            {
              value: {
                contacts: [],
                messages: [
                  {
                    from: "5511777776666",
                    id: "wamid.aud001",
                    timestamp: "1700000200",
                    type: "audio",
                    audio: { id: "aud_id", mime_type: "audio/ogg" },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const result = parseWebhookPayload(payload)

    expect(result).not.toBeNull()
    expect(result![0].text).toBe("[Mídia recebida: audio] Tipo não suportado")
  })

  it("extracts wabaId from entry.id", () => {
    const result = parseWebhookPayload(validPayload)
    expect(result![0].wabaId).toBe("WABA_123")
  })

  it("extracts profileName from contacts", () => {
    const result = parseWebhookPayload(validPayload)
    expect(result![0].profileName).toBe("João Silva")
  })

  it("handles missing contacts gracefully", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "5511999998888",
                    id: "wamid.nocontact",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "Hello" },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const result = parseWebhookPayload(payload)
    expect(result).not.toBeNull()
    expect(result![0].profileName).toBeUndefined()
  })

  it("handles multiple messages in a single payload", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "Carlos" }, wa_id: "5511111112222" }],
                messages: [
                  {
                    from: "5511111112222",
                    id: "wamid.msg1",
                    timestamp: "1700000001",
                    type: "text",
                    text: { body: "Mensagem 1" },
                  },
                  {
                    from: "5511111112222",
                    id: "wamid.msg2",
                    timestamp: "1700000002",
                    type: "text",
                    text: { body: "Mensagem 2" },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const result = parseWebhookPayload(payload)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0].messageId).toBe("wamid.msg1")
    expect(result![1].messageId).toBe("wamid.msg2")
  })

  it("skips messages missing required fields", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messages: [
                  { from: "5511999998888", id: "wamid.valid", timestamp: "1700000000", type: "text", text: { body: "Valid" } },
                  { from: "5511999998888" }, // missing id and type
                  { id: "wamid.nofrom", type: "text" }, // missing from
                ],
              },
            },
          ],
        },
      ],
    }

    const result = parseWebhookPayload(payload)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0].messageId).toBe("wamid.valid")
  })

  it("handles numeric timestamp", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "5511999998888",
                    id: "wamid.numts",
                    timestamp: 1700000000,
                    type: "text",
                    text: { body: "Test" },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const result = parseWebhookPayload(payload)
    expect(result).not.toBeNull()
    expect(result![0].timestamp).toBe(1700000000)
  })
})
