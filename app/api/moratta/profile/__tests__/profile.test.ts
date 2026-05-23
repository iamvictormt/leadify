import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "valid-token" }),
  }),
}))

vi.mock("@/lib/auth", () => ({
  SESSION_COOKIE_NAME: "moratta_session",
  verifySessionToken: vi.fn(() => ({
    userId: "user-1",
    exp: Math.floor(Date.now() / 1000) + 604800,
  })),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    morattaProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import { verifySessionToken } from "@/lib/auth"
import { GET, PUT } from "../route"

const mockPrisma = vi.mocked(prisma, true)
const mockVerifySession = vi.mocked(verifySessionToken)

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/moratta/profile", {
    method: "GET",
  })
}

function createPutRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/moratta/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const mockProfile = {
  id: "profile-1",
  userId: "user-1",
  type: "PERSONAL" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}

describe("GET /api/moratta/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifySession.mockReturnValue({
      userId: "user-1",
      exp: Math.floor(Date.now() / 1000) + 604800,
    })
  })

  it("retorna 401 quando não autenticado", async () => {
    mockVerifySession.mockReturnValue(null)
    const { cookies } = await import("next/headers")
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "invalid-token" }),
    } as any)

    const request = createGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it("retorna perfil existente", async () => {
    mockPrisma.morattaProfile.findUnique.mockResolvedValue(mockProfile as any)

    const request = createGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("profile-1")
    expect(data.data.type).toBe("PERSONAL")
    expect(data.data.createdAt).toBeDefined()
    expect(data.data.updatedAt).toBeDefined()
  })

  it("auto-cria perfil PERSONAL quando não existe", async () => {
    mockPrisma.morattaProfile.findUnique.mockResolvedValue(null)
    mockPrisma.morattaProfile.create.mockResolvedValue(mockProfile as any)

    const request = createGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.type).toBe("PERSONAL")
    expect(mockPrisma.morattaProfile.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "PERSONAL",
      },
    })
  })
})

describe("PUT /api/moratta/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifySession.mockReturnValue({
      userId: "user-1",
      exp: Math.floor(Date.now() / 1000) + 604800,
    })
  })

  it("retorna 401 quando não autenticado", async () => {
    mockVerifySession.mockReturnValue(null)
    const { cookies } = await import("next/headers")
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "invalid-token" }),
    } as any)

    const request = createPutRequest({ type: "PROFESSIONAL" })
    const response = await PUT(request)

    expect(response.status).toBe(401)
  })

  it("retorna 400 quando tipo é inválido", async () => {
    const request = createPutRequest({ type: "INVALID" })
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors[0].code).toBe("INVALID_INPUT")
  })

  it("faz upgrade de PERSONAL para PROFESSIONAL", async () => {
    const upgradedProfile = { ...mockProfile, type: "PROFESSIONAL", updatedAt: new Date() }
    mockPrisma.morattaProfile.findUnique.mockResolvedValue(mockProfile as any)
    mockPrisma.morattaProfile.update.mockResolvedValue(upgradedProfile as any)

    const request = createPutRequest({ type: "PROFESSIONAL" })
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.type).toBe("PROFESSIONAL")
    expect(mockPrisma.morattaProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { type: "PROFESSIONAL" },
    })
  })

  it("cria perfil com tipo solicitado quando não existe", async () => {
    const newProfile = { ...mockProfile, type: "PROFESSIONAL" }
    mockPrisma.morattaProfile.findUnique.mockResolvedValue(null)
    mockPrisma.morattaProfile.create.mockResolvedValue(newProfile as any)

    const request = createPutRequest({ type: "PROFESSIONAL" })
    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.type).toBe("PROFESSIONAL")
    expect(mockPrisma.morattaProfile.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "PROFESSIONAL",
      },
    })
  })

  it("retorna 400 quando body é JSON inválido", async () => {
    const request = new Request("http://localhost:3000/api/moratta/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    })
    const response = await PUT(request)

    expect(response.status).toBe(400)
  })
})
