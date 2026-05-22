import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const knowledgeBaseTypeSchema = z.enum(["SERVICE", "BUSINESS_HOURS", "FAQ"])

const updateKnowledgeBaseSchema = z.object({
  type: knowledgeBaseTypeSchema.optional(),
  title: z.string().trim().min(1, "Título é obrigatório").optional(),
  content: z.string().trim().min(1, "Conteúdo é obrigatório").optional(),
})

export async function PATCH(request: Request, context: RouteContext<"/api/knowledge-base/[id]">) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await context.params
  const json = await request.json().catch(() => null)
  const parsed = updateKnowledgeBaseSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const existingItem = await prisma.knowledgeBase.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  })

  if (!existingItem) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
  }

  const item = await prisma.knowledgeBase.update({
    where: { id },
    data: parsed.data,
  })

  return NextResponse.json({ item })
}

export async function DELETE(_request: Request, context: RouteContext<"/api/knowledge-base/[id]">) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await context.params
  const existingItem = await prisma.knowledgeBase.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  })

  if (!existingItem) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
  }

  await prisma.knowledgeBase.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
