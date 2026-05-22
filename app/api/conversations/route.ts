import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import {
  conversationListQuerySchema,
  createConversationSchema,
} from "@/lib/validations/conversation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = conversationListQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { page, pageSize } = parsed.data
  const skip = (page - 1) * pageSize

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        lead: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true },
        },
      },
    }),
    prisma.conversation.count({
      where: { companyId: user.companyId },
    }),
  ])

  const result = conversations.map((conv) => ({
    id: conv.id,
    leadName: conv.lead.name,
    lastMessageContent: conv.messages[0]?.content ?? null,
    channel: conv.channel,
    updatedAt: conv.updatedAt.toISOString(),
    unreadCount: 0,
  }))

  return NextResponse.json({
    conversations: result,
    total,
    page,
    pageSize,
  })
}

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

  const parsed = createConversationSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  // Verify lead exists and belongs to user's company
  const lead = await prisma.lead.findFirst({
    where: {
      id: parsed.data.leadId,
      companyId: user.companyId,
    },
  })

  if (!lead) {
    return NextResponse.json(
      { error: "Lead não encontrado" },
      { status: 404 },
    )
  }

  // Create conversation with companyId from session (ignore any provided in body)
  const conversation = await prisma.conversation.create({
    data: {
      companyId: user.companyId,
      leadId: parsed.data.leadId,
      channel: parsed.data.channel,
    },
  })

  return NextResponse.json({ conversation }, { status: 201 })
}
