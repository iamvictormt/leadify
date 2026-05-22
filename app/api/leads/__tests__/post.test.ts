import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

// Mock dependencies
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    leadStatus: { findFirst: vi.fn() },
    lead: { findFirst: vi.fn(), create: vi.fn() },
    user: { findFirst: vi.fn() },
  },
}))

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { POST } from "../route"

const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockPrisma = vi.mocked(prisma, true)

const mockUser = {
  id: "user-uuid-1234-5678-abcdefabcdef",
  name: "Test User",
  email: "test@example.com",
  companyId: "company-uuid-1234-5678-abcdef",
  company: { id: "company-uuid-1234-5678-abcdef", name: "Test Company" },
}

const mockStatus = {
  id: "status-uuid-1234-5678-abcdefabcdef",
  name: "Novo",
  order: 1,
  color: "#3b82f6",
  companyId: "company-uuid-1234-5678-abcdef",
}

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Autenticação", () => {
    it("retorna 401 quando usuário não está autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const request = createRequest({ name: "Lead Test" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Não autenticado")
    })
  })

  describe("Validação", () => {
    it("retorna 400 com erros estruturados quando body é inválido", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)

      const request = createRequest({ name: "", email: "invalid" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Dados inválidos")
      expect(data.issues).toBeDefined()
      expect(data.issues.name).toBeDefined()
      expect(Array.isArray(data.issues.name)).toBe(true)
    })
  })

  describe("Source default", () => {
    it("usa 'MANUAL' como source quando não fornecido", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.leadStatus.findFirst.mockResolvedValue(mockStatus as any)
      mockPrisma.lead.findFirst.mockResolvedValue(null)
      mockPrisma.lead.create.mockResolvedValue({
        id: "new-lead-uuid",
        companyId: mockUser.companyId,
        name: "Lead Sem Source",
        phone: null,
        email: null,
        source: "MANUAL",
        statusId: mockStatus.id,
        assignedToId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: mockStatus,
        assignedTo: null,
      } as any)

      const request = createRequest({ name: "Lead Sem Source" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.lead.source).toBe("MANUAL")
    })
  })

  describe("Sem LeadStatus", () => {
    it("retorna 400 quando não há status configurado para a empresa", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.leadStatus.findFirst.mockResolvedValue(null)

      const request = createRequest({ name: "Lead Test" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Nenhum status de lead configurado para esta empresa")
    })
  })

  describe("Telefone duplicado", () => {
    it("retorna 409 quando telefone já existe na mesma empresa", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.leadStatus.findFirst.mockResolvedValue(mockStatus as any)
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: "existing-lead-uuid",
        phone: "11999999999",
      } as any)

      const request = createRequest({ name: "Lead Duplicado", phone: "11999999999" })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe("Já existe um lead com este telefone")
    })
  })

  describe("AssignedToId de outra empresa", () => {
    it("retorna 400 quando assignedToId não pertence à mesma empresa", async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.leadStatus.findFirst.mockResolvedValue(mockStatus as any)
      mockPrisma.lead.findFirst.mockResolvedValue(null)
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const request = createRequest({
        name: "Lead Com Assigned Inválido",
        assignedToId: "550e8400-e29b-41d4-a716-446655440000",
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Usuário atribuído inválido")
    })
  })

  describe("Criação com sucesso", () => {
    it("retorna 201 com lead completo incluindo status e assignedTo", async () => {
      const assignedUser = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Assigned User",
        email: "assigned@example.com",
        companyId: mockUser.companyId,
      }

      const createdLead = {
        id: "new-lead-uuid",
        companyId: mockUser.companyId,
        name: "Lead Completo",
        phone: "11988887777",
        email: "lead@example.com",
        source: "WHATSAPP",
        statusId: mockStatus.id,
        assignedToId: assignedUser.id,
        notes: "Nota de teste",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        status: mockStatus,
        assignedTo: { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email },
      }

      mockGetCurrentUser.mockResolvedValue(mockUser as any)
      mockPrisma.leadStatus.findFirst.mockResolvedValue(mockStatus as any)
      // Phone uniqueness check - no duplicate found
      mockPrisma.lead.findFirst.mockResolvedValue(null)
      // AssignedTo user exists in same company
      mockPrisma.user.findFirst.mockResolvedValue(assignedUser as any)
      mockPrisma.lead.create.mockResolvedValue(createdLead as any)

      const request = createRequest({
        name: "Lead Completo",
        phone: "11988887777",
        email: "lead@example.com",
        source: "WHATSAPP",
        assignedToId: assignedUser.id,
        notes: "Nota de teste",
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.lead).toBeDefined()
      expect(data.lead.id).toBe("new-lead-uuid")
      expect(data.lead.name).toBe("Lead Completo")
      expect(data.lead.phone).toBe("11988887777")
      expect(data.lead.email).toBe("lead@example.com")
      expect(data.lead.source).toBe("WHATSAPP")
      expect(data.lead.companyId).toBe(mockUser.companyId)
      expect(data.lead.status).toEqual(mockStatus)
      expect(data.lead.assignedTo).toEqual({
        id: assignedUser.id,
        name: assignedUser.name,
        email: assignedUser.email,
      })
    })
  })
})
