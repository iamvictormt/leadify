import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withProfessionalProfile } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/moratta/clients/:id
 * Get client details with linked projects.
 */
export const GET = withProfessionalProfile(async (_request, auth, context) => {
  const { id } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Cliente não encontrado." }],
      },
      { status: 404 },
    )
  }

  const client = await prisma.morattaClient.findFirst({
    where: { id, profileId: auth.profileId },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!client) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Cliente não encontrado." }],
      },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true, data: client })
})

/**
 * PUT /api/moratta/clients/:id
 * Update client (name, email, phone).
 */
export const PUT = withProfessionalProfile(async (request, auth, context) => {
  const { id } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Cliente não encontrado." }],
      },
      { status: 404 },
    )
  }

  const existing = await prisma.morattaClient.findFirst({
    where: { id, profileId: auth.profileId },
  })

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Cliente não encontrado." }],
      },
      { status: 404 },
    )
  }

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

  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "O nome do cliente é obrigatório.",
      field: "name",
    })
  }

  // After update, at least email or phone must be present
  const finalEmail = email !== undefined ? email : existing.email
  const finalPhone = phone !== undefined ? phone : existing.phone

  if (
    (!finalEmail || (typeof finalEmail === "string" && finalEmail.trim().length === 0)) &&
    (!finalPhone || (typeof finalPhone === "string" && finalPhone.trim().length === 0))
  ) {
    errors.push({
      code: "VALIDATION_ERROR",
      message: "É necessário manter ao menos e-mail ou telefone do cliente.",
      field: "email",
    })
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (email !== undefined) updateData.email = email?.trim() || null
  if (phone !== undefined) updateData.phone = phone?.trim() || null

  const updated = await prisma.morattaClient.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ success: true, data: updated })
})

/**
 * DELETE /api/moratta/clients/:id
 * Delete a client.
 */
export const DELETE = withProfessionalProfile(async (_request, auth, context) => {
  const { id } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Cliente não encontrado." }],
      },
      { status: 404 },
    )
  }

  const existing = await prisma.morattaClient.findFirst({
    where: { id, profileId: auth.profileId },
  })

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Cliente não encontrado." }],
      },
      { status: 404 },
    )
  }

  await prisma.morattaClient.delete({ where: { id } })

  return NextResponse.json({ success: true, data: { id } })
})
