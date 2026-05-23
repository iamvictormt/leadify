import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createSessionToken,
  verifyPassword,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/moratta/middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "E-mail e senha são obrigatórios." },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Rate limit check
  const rateLimit = checkRateLimit(normalizedEmail)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em 15 minutos." },
      { status: 429 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 },
    )
  }

  const isValid = verifyPassword(password, user.passwordHash)

  if (!isValid) {
    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 },
    )
  }

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  })

  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionToken({ userId: user.id }),
    sessionCookieOptions,
  )

  return response
}
