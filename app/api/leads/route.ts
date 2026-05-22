import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { createLeadSchema } from "@/lib/validations/lead"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const leads = await prisma.lead.findMany({
    where: {
      companyId: user.companyId,
    },
    include: {
      status: true,
      assignedTo: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return NextResponse.json({ leads })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = createLeadSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  // Buscar primeiro LeadStatus da empresa (ordenado por order ASC)
  const defaultStatus = await prisma.leadStatus.findFirst({
    where: { companyId: user.companyId },
    orderBy: { order: "asc" },
  })

  if (!defaultStatus) {
    return NextResponse.json(
      { error: "Nenhum status de lead configurado para esta empresa" },
      { status: 400 },
    )
  }

  // Verificar unicidade do telefone dentro da empresa (se phone não-nulo)
  if (parsed.data.phone) {
    const duplicatePhone = await prisma.lead.findFirst({
      where: {
        companyId: user.companyId,
        phone: parsed.data.phone,
      },
    })

    if (duplicatePhone) {
      return NextResponse.json(
        { error: "Já existe um lead com este telefone" },
        { status: 409 },
      )
    }
  }

  // Validar assignedToId (se fornecido) pertence à mesma empresa
  if (parsed.data.assignedToId) {
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: parsed.data.assignedToId,
        companyId: user.companyId,
      },
    })

    if (!assignedUser) {
      return NextResponse.json(
        { error: "Usuário atribuído inválido" },
        { status: 400 },
      )
    }
  }

  // Criar lead com companyId do usuário autenticado (ignorar qualquer companyId no body)
  const lead = await prisma.lead.create({
    data: {
      companyId: user.companyId,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      source: parsed.data.source,
      statusId: defaultStatus.id,
      assignedToId: parsed.data.assignedToId ?? null,
      notes: parsed.data.notes ?? null,
    },
    include: {
      status: true,
      assignedTo: true,
    },
  })

  return NextResponse.json({ lead }, { status: 201 })
}
