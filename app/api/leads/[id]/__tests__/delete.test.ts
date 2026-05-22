import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { DELETE } from "../route"

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockPrisma = vi.mocked(prisma, true)

const mockUser = {
  id: "user-uuid-1234-5678-abcdefabcdef",
  name: "Test User",
  email: "test@example.com",
  companyId: "company-uuid-1234-5678-abcdef",
  company: { id: "company-uuid-1234-5678-abcdef", name: "Test Company" },
}

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"

const mockLead = {
  id: VALID_UUID,
  companyId: mockUser.companyId,
  name: "Lead Existente",
  phone: "11999999999",
  email: "lead@example.com",
  source: "MANUAL",
  statusId: "status-uuid-1234",
  assignedToId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createRequest(): Request {
  return new Request(`http://localhost:3000/api/leads/${VALID_UUID}`, {
    method: "DELETE",
  })
}

function createContext(id: string): RouteContext<"/api/leads/[id]"> {
  return {
    params: Promise.resolve({ id }),
  }
}

describe("DELETE /api/leads/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Autenticação", () => {
    it("retorna 401 quando usuário não está autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createRequest()
      const response = await DELETE(request, createContext(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Não autenticado")
    })
  })

  describe("UUID inválido no path", () => {
    it("retorna 404 quando o ID não é um UUID v4 válido", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)

      const request = createRequest()
      const response = await DELETE(request, createContext("not-a-valid-uuid"))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe("Lead não encontrado")
    })

    it("retorna 404 para UUID v1 (não v4)", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)

      // UUID v1 has version 1 in the third group
      const request = createRequest()
      const response = await DELETE(request, createContext("550e8400-e29b-11d4-a716-446655440000"))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe("Lead não encontrado")
    })
  })

  describe("Lead não encontrado", () => {
    it("retorna 404 quando lead não existe no banco", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      const request = createRequest()
      const response = await DELETE(request, createContext(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe("Lead não encontrado")
    })
  })

  describe("Lead de outra empresa", () => {
    it("retorna 404 com mesma mensagem genérica (isolamento multi-tenant)", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      // findFirst with companyId filter returns null for leads from other companies
      mockPrisma.lead.findFirst.mockResolvedValue(null)

      const request = createRequest()
      const response = await DELETE(request, createContext(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe("Lead não encontrado")
      // Verify the query includes companyId filter
      expect(mockPrisma.lead.findFirst).toHaveBeenCalledWith({
        where: {
          id: VALID_UUID,
          companyId: mockUser.companyId,
        },
      })
    })
  })

  describe("Exclusão com sucesso", () => {
    it("retorna 200 com { ok: true } após exclusão em cascata", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead as any)
      mockPrisma.$transaction.mockResolvedValue(undefined)

      const request = createRequest()
      const response = await DELETE(request, createContext(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ ok: true })
    })

    it("executa a transação com a função de cascata", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead as any)
      mockPrisma.$transaction.mockResolvedValue(undefined)

      const request = createRequest()
      await DELETE(request, createContext(VALID_UUID))

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe("Falha na transação", () => {
    it("retorna 500 quando a transação falha", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead as any)
      mockPrisma.$transaction.mockRejectedValue(new Error("Database error"))

      const request = createRequest()
      const response = await DELETE(request, createContext(VALID_UUID))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Não foi possível excluir o lead")
    })
  })
})
