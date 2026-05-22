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

  const statuses = await prisma.leadStatus.findMany({
    where: {
      companyId: user.companyId,
    },
    orderBy: {
      order: "asc",
    },
  })

  return NextResponse.json({ statuses })
}
