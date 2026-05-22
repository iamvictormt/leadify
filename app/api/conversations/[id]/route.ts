import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_request: Request, context: RouteContext<"/api/conversations/[id]">) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await context.params

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
    include: {
      lead: {
        select: {
          name: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          senderType: true,
          content: true,
          aiGenerated: true,
          createdAt: true,
        },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 })
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      leadName: conversation.lead.name,
      channel: conversation.channel,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        senderType: msg.senderType,
        content: msg.content,
        aiGenerated: msg.aiGenerated,
        createdAt: msg.createdAt.toISOString(),
      })),
    },
  })
}
