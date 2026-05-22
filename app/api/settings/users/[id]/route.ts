import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const { id } = await params

  if (id === user.id) {
    return NextResponse.json(
      { error: "Não é possível remover a si mesmo" },
      { status: 400 },
    )
  }

  const targetUser = await prisma.user.findFirst({
    where: { id, companyId: user.companyId },
  })

  if (!targetUser) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
