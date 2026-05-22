import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { updateLeadStatusSchema } from "@/lib/validations/lead-status"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function PATCH(request: Request, context: RouteContext<"/api/leads/[id]/status">) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await context.params
  const json = await request.json().catch(() => null)
  const parsed = updateLeadStatusSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { statusId } = parsed.data

  // Verify lead exists and belongs to user's company
  const existingLead = await prisma.lead.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  })

  if (!existingLead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 })
  }

  // Verify statusId belongs to user's company
  const targetStatus = await prisma.leadStatus.findFirst({
    where: {
      id: statusId,
      companyId: user.companyId,
    },
  })

  if (!targetStatus) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 })
  }

  // Idempotent: if lead already has this status, return without changes
  if (existingLead.statusId === statusId) {
    const lead = await prisma.lead.findFirst({
      where: { id },
      include: {
        status: true,
        assignedTo: true,
      },
    })

    return NextResponse.json({ lead })
  }

  // Atomic transaction: update lead status + create history record
  try {
    const updatedLead = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: { statusId },
        include: {
          status: true,
          assignedTo: true,
        },
      })

      await tx.leadHistory.create({
        data: {
          leadId: id,
          oldStatus: existingLead.statusId,
          newStatus: statusId,
          userId: user.id,
        },
      })

      return lead
    })

    return NextResponse.json({ lead: updatedLead })
  } catch (error) {
    console.error("Error updating lead status:", error)
    return NextResponse.json(
      { error: "Não foi possível atualizar o status" },
      { status: 500 },
    )
  }
}
