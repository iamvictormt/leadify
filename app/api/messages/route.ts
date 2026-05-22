import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { createMessageSchema } from "@/lib/validations/conversation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const json = await request.json().catch(() => null)

  if (!json) {
    return NextResponse.json(
      { error: "Formato de requisição inválido" },
      { status: 400 },
    )
  }

  const parsed = createMessageSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  // Verify conversation exists and belongs to user's company
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: parsed.data.conversationId,
      companyId: user.companyId,
    },
  })

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversa não encontrada" },
      { status: 404 },
    )
  }

  const now = new Date()

  // Create message and update conversation updatedAt in a transaction
  const message = await prisma.$transaction(async (tx) => {
    const createdMessage = await tx.message.create({
      data: {
        conversationId: parsed.data.conversationId,
        content: parsed.data.content,
        senderType: parsed.data.senderType,
        aiGenerated: false,
        sentAt: now,
      },
    })

    await tx.conversation.update({
      where: { id: parsed.data.conversationId },
      data: { updatedAt: now },
    })

    return createdMessage
  })

  return NextResponse.json({ message }, { status: 201 })
}
