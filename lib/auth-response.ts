import type { Company, User } from "@/lib/generated/prisma/client"

export function toAuthResponse(user: User & { company: Company }) {
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    company: {
      id: user.company.id,
      name: user.company.name,
      segment: user.company.segment,
      phone: user.company.phone,
      email: user.company.email,
      document: user.company.document,
      createdAt: user.company.createdAt,
      updatedAt: user.company.updatedAt,
    },
  }
}
