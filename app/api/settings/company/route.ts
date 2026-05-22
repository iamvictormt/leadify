import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const updateCompanySchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").optional(),
  segment: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Email inválido").optional().nullable().or(z.literal("")),
  document: z.string().trim().optional().nullable(),
})

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
  })

  return NextResponse.json({ company })
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const json = await request.json().catch(() => null)
  const parsed = updateCompanySchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const company = await prisma.company.update({
    where: { id: user.companyId },
    data: {
      ...parsed.data,
      email: parsed.data.email || null,
    },
  })

  return NextResponse.json({ company })
}
