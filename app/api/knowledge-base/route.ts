import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const knowledgeBaseTypeSchema = z.enum(["SERVICE", "BUSINESS_HOURS", "FAQ"])

const createKnowledgeBaseSchema = z.object({
  type: knowledgeBaseTypeSchema,
  title: z.string().trim().min(1, "Título é obrigatório"),
  content: z.string().trim().min(1, "Conteúdo é obrigatório"),
})

export async function GET(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const parsedType = type ? knowledgeBaseTypeSchema.safeParse(type) : null

  if (type && !parsedType?.success) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
  }

  const items = await prisma.knowledgeBase.findMany({
    where: {
      companyId: user.companyId,
      ...(parsedType?.success ? { type: parsedType.data } : {}),
    },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = createKnowledgeBaseSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const existingItem = await prisma.knowledgeBase.findFirst({
    where: {
      companyId: user.companyId,
      type: parsed.data.type,
      title: parsed.data.title,
    },
  })
  const item = existingItem
    ? await prisma.knowledgeBase.update({
        where: { id: existingItem.id },
        data: {
          content: parsed.data.content,
        },
      })
    : await prisma.knowledgeBase.create({
        data: {
          companyId: user.companyId,
          type: parsed.data.type,
          title: parsed.data.title,
          content: parsed.data.content,
        },
      })

  return NextResponse.json({ item }, { status: existingItem ? 200 : 201 })
}
