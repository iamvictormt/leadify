import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/current-user"
import { getDashboardData } from "@/lib/dashboard"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  return NextResponse.json(await getDashboardData(user.companyId))
}
