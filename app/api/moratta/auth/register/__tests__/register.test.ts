import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn((p: string) => `hashed:${p}`),
  createSessionToken: vi.fn(() => "mock-session-token"),
  SESSION_COOKIE_NAME: "moratta_session",
  sessionCookieOptions: {
    httpOnly: true,
    maxAge: 604800,
    path: "/",
    sameSite: "lax",
    secure: false,
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/moratta/middleware", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remainingAttempts: 5 })),
  validatePassword: vi.fn(() => ({ valid: true, errors: [] })),
}))

import { prisma } from "@/lib/prisma"
import { checkRateLimit, validatePassword } from "@/lib/moratta/middleware"
import { POST } from "../route"

const mockPrisma = vi.mocked(prisma, true)
const mockCheckRateLimit = vi.mocked(checkRateLimit)
const mockValidatePassword = vi.mocked(validatePassword)

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/moratta/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: "João Silva",
  email: "joao@example.com",
  password: "Senha123",
}

describe("POST /api/moratta/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remainingAttempts: 5,
      lockedUntil: null,
      lockoutRemainingMs: null,
    })
    mockValidatePassword.mockReturnValue({ valid: true, errors: [] })
  })

  describe("Validação de input", () => {
    it("retorna 400 quando body é inválido (JSON malformado)", async () => {
      const request = new Request("http://localhost:3000/api/moratta/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it("retorna 400 quando email é inválido", async () => {
      const request = createRequest({ ...validBody, email: "not-an-email" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it("retorna 400 quando nome está vazio", async () => {
      const request = createRequest({ ...validBody, name: "" })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("retorna 400 quando senha está vazia", async () => {
      const request = createRequest({ ...validBody, password: "" })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe("Rate limiting", () => {
    it("retorna 429 quando rate limit é atingido", async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: Date.now() + 900000,
        lockoutRemainingMs: 900000,
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.errors[0].code).toBe("RATE_LIMITED")
    })
  })

  describe("Validação de senha", () => {
    it("retorna 400 quando senha não atende requisitos", async () => {
      mockValidatePassword.mockReturnValue({
        valid: false,
        errors: [
          "Senha deve ter no mínimo 8 caracteres",
          "Senha deve conter pelo menos uma letra maiúscula",
        ],
      })

      const request = createRequest({ ...validBody, password: "weak" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.errors).toHaveLength(2)
      expect(data.errors[0].code).toBe("INVALID_PASSWORD")
      expect(data.errors[0].field).toBe("password")
    })
  })

  describe("Email duplicado", () => {
    it("retorna 409 quando e-mail já está em uso", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "joao@example.com",
      } as any)

      const request = createRequest(validBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.errors[0].code).toBe("EMAIL_IN_USE")
      expect(data.errors[0].message).toContain("e-mail já está em uso")
    })
  })

  describe("Registro com sucesso", () => {
    it("retorna 201 com dados do usuário e perfil PERSONAL por padrão", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            create: vi.fn().mockResolvedValue({
              id: "user-1",
              name: "João Silva",
              email: "joao@example.com",
            }),
          },
          morattaProfile: {
            create: vi.fn().mockResolvedValue({
              id: "profile-1",
              userId: "user-1",
              type: "PERSONAL",
              createdAt: new Date("2024-01-01"),
            }),
          },
        }
        return fn(tx)
      })

      const request = createRequest(validBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.user.id).toBe("user-1")
      expect(data.data.user.name).toBe("João Silva")
      expect(data.data.user.email).toBe("joao@example.com")
      expect(data.data.profile.type).toBe("PERSONAL")
      // Should not expose password
      expect(data.data.user.password).toBeUndefined()
      expect(data.data.user.passwordHash).toBeUndefined()
    })

    it("retorna 201 com perfil PROFESSIONAL quando solicitado", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            create: vi.fn().mockResolvedValue({
              id: "user-2",
              name: "Maria Engenheira",
              email: "maria@example.com",
            }),
          },
          morattaProfile: {
            create: vi.fn().mockResolvedValue({
              id: "profile-2",
              userId: "user-2",
              type: "PROFESSIONAL",
              createdAt: new Date("2024-01-01"),
            }),
          },
        }
        return fn(tx)
      })

      const request = createRequest({
        ...validBody,
        name: "Maria Engenheira",
        email: "maria@example.com",
        profileType: "PROFESSIONAL",
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.profile.type).toBe("PROFESSIONAL")
    })
  })

  describe("Erro interno", () => {
    it("retorna 409 em caso de race condition (P2002)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockRejectedValue({ code: "P2002" })

      const request = createRequest(validBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.errors[0].code).toBe("EMAIL_IN_USE")
    })

    it("retorna 500 em caso de erro inesperado", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockRejectedValue(new Error("DB connection failed"))

      const request = createRequest(validBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.errors[0].code).toBe("INTERNAL_ERROR")
    })
  })
})
