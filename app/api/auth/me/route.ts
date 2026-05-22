import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth"
import { toAuthResponse } from "@/lib/auth-response"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      companyId: session.companyId,
    },
    include: {
      company: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  return NextResponse.json(toAuthResponse(user))
}
