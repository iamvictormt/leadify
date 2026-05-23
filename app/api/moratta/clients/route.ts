import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withProfessionalProfile } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/moratta/clients
 * List all clients for the professional user.
 */
export const GET = withProfessionalProfile(async (_request, auth) => {
  const clients = await prisma.morattaClient.findMany({
    where: { profileId: auth.profileId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  })

  return NextResponse.json({ success: true, data: clients })
})

/**
 * POST /api/moratta/clients
 * Create a new client. Name is required, email or phone is required.
 */
export const POST = withProfessionalProfile(async (request, auth) => {
  const json = await request.json().catch(() => null)

  if (!json) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "INVALID_BODY", message: "Corpo da requisição inválido." }],
      },
      { status: 400 },
    )
  }

  const { name, email, phone } = json

  const errors: { code: string; message: string; field?: string }[] = []

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "O nome do cliente é obrigatório.",
      field: "name",
    })
  }

  if (
    (!email || typeof email !== "string" || email.trim().length === 0) &&
    (!phone || typeof phone !== "string" || phone.trim().length === 0)
  ) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "É necessário informar e-mail ou telefone do cliente.",
      field: "email",
    })
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 })
  }

  const client = await prisma.morattaClient.create({
    data: {
      profileId: auth.profileId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
    },
  })

  return NextResponse.json({ success: true, data: client }, { status: 201 })
})
