import { NextResponse } from "next/server"
import { z } from "zod"

import { createSessionToken, SESSION_COOKIE_NAME, sessionCookieOptions, verifyPassword } from "@/lib/auth"
import { toAuthResponse } from "@/lib/auth-response"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { company: true },
  })

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 })
  }

  const response = NextResponse.json(toAuthResponse(user))

  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken({ userId: user.id, companyId: user.companyId, role: user.role }),
    sessionCookieOptions,
  )

  return response
}
