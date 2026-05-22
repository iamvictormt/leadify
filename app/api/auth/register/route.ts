import { NextResponse } from "next/server"
import { z } from "zod"

import { createSessionToken, hashPassword, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth"
import { toAuthResponse } from "@/lib/auth-response"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const segmentSchema = z.enum(["Clínica", "Oficina", "Loja", "Imobiliária", "Outro"])

const registerSchema = z.object({
  name: z.string().trim().min(1, "Nome completo é obrigatório"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  companyName: z.string().trim().min(1, "Nome da empresa é obrigatório"),
  segment: segmentSchema,
  phone: z.string().trim().optional(),
  companyEmail: z.string().trim().email("Email da empresa inválido").optional().or(z.literal("")),
  document: z.string().trim().optional(),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const data = parsed.data

  if (data.password !== data.confirmPassword) {
    return NextResponse.json(
      { error: "A confirmação de senha não confere", issues: { confirmPassword: ["As senhas devem ser iguais"] } },
      { status: 400 },
    )
  }

  const email = data.email.toLowerCase()
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    return NextResponse.json(
      { error: "Este email já está em uso", issues: { email: ["Email deve ser único"] } },
      { status: 409 },
    )
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: data.companyName,
          segment: data.segment,
          phone: data.phone || null,
          email: data.companyEmail || null,
          document: data.document || null,
        },
      })

      return tx.user.create({
        data: {
          name: data.name,
          email,
          passwordHash: hashPassword(data.password),
          role: "ADMIN",
          companyId: company.id,
        },
        include: {
          company: true,
        },
      })
    })

    const response = NextResponse.json(toAuthResponse(user), { status: 201 })

    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({ userId: user.id, companyId: user.companyId, role: user.role }),
      sessionCookieOptions,
    )

    return response
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Este email já está em uso", issues: { email: ["Email deve ser único"] } },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: "Não foi possível criar a conta" }, { status: 500 })
  }
}
