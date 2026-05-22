import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const subscription = await prisma.subscription.findFirst({
    where: { companyId: user.companyId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })

  // Usage stats
  const [leadCount, userCount, aiTokensUsed] = await Promise.all([
    prisma.lead.count({ where: { companyId: user.companyId } }),
    prisma.user.count({ where: { companyId: user.companyId } }),
    prisma.aiLog.aggregate({
      where: { companyId: user.companyId },
      _sum: { tokens: true },
    }),
  ])

  return NextResponse.json({
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          plan: subscription.plan,
        }
      : null,
    usage: {
      leads: leadCount,
      users: userCount,
      aiTokens: aiTokensUsed._sum.tokens ?? 0,
    },
  })
}
