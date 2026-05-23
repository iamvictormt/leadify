import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, validatePassword } from "@/lib/moratta/middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const registerSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
  profileType: z.enum(["PERSONAL", "PROFESSIONAL"]).optional().default("PERSONAL"),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    )
  }

  const { name, email, password, profileType } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Rate limit check
  const rateLimit = checkRateLimit(normalizedEmail)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "RATE_LIMITED",
            message: "Muitas tentativas. Tente novamente em 15 minutos.",
          },
        ],
      },
      { status: 429 },
    )
  }

  // Validate password strength
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.valid) {
    return NextResponse.json(
      {
        success: false,
        errors: passwordValidation.errors.map((msg) => ({
          code: "INVALID_PASSWORD",
          message: msg,
          field: "password",
        })),
      },
      { status: 400 },
    )
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existingUser) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "EMAIL_IN_USE",
            message: "Este e-mail já está em uso",
            field: "email",
          },
        ],
      },
      { status: 409 },
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash: hashPassword(password),
        },
      })

      // Create MorattaProfile with selected type (default PERSONAL)
      const profile = await tx.morattaProfile.create({
        data: {
          userId: user.id,
          type: profileType,
        },
      })

      return { user, profile }
    })

    const { user, profile } = result

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          profile: {
            id: profile.id,
            type: profile.type,
            createdAt: profile.createdAt,
          },
        },
      },
      { status: 201 },
    )

    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({ userId: user.id }),
      sessionCookieOptions,
    )

    return response
  } catch (error) {
    // Handle unique constraint violation (race condition)
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              code: "EMAIL_IN_USE",
              message: "Este e-mail já está em uso",
              field: "email",
            },
          ],
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "INTERNAL_ERROR",
            message: "Não foi possível criar a conta. Tente novamente.",
          },
        ],
      },
      { status: 500 },
    )
  }
}
