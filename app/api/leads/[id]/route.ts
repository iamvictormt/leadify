import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { updateLeadSchema } from "@/lib/validations/lead"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function PATCH(request: Request, context: RouteContext<"/api/leads/[id]">) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await context.params
  const json = await request.json().catch(() => null)
  const parsed = updateLeadSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const existingLead = await prisma.lead.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  })

  if (!existingLead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  // Check phone uniqueness if phone is being changed and is non-null/non-empty
  if (parsed.data.phone && parsed.data.phone.length > 0) {
    const duplicatePhone = await prisma.lead.findFirst({
      where: {
        companyId: user.companyId,
        phone: parsed.data.phone,
        id: { not: id },
      },
    })

    if (duplicatePhone) {
      return NextResponse.json(
        { error: "Já existe um lead com este telefone" },
        { status: 409 },
      )
    }
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: parsed.data,
    include: {
      status: true,
      assignedTo: true,
    },
  })

  return NextResponse.json({ lead })
}

export async function DELETE(_request: Request, context: RouteContext<"/api/leads/[id]">) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await context.params

  // Validate UUID v4 format
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidV4Regex.test(id)) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  const existingLead = await prisma.lead.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  })

  if (!existingLead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all messages from the lead's conversations
      await tx.message.deleteMany({
        where: {
          conversation: {
            leadId: id,
          },
        },
      })

      // 2. Delete all conversations belonging to the lead
      await tx.conversation.deleteMany({
        where: {
          leadId: id,
        },
      })

      // 3. Delete all lead history records
      await tx.leadHistory.deleteMany({
        where: {
          leadId: id,
        },
      })

      // 4. Delete the lead itself
      await tx.lead.delete({
        where: { id },
      })
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Não foi possível excluir o lead" },
      { status: 500 },
    )
  }
}
