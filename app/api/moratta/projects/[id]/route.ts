import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { projectParamsSchema } from "@/lib/moratta/schemas"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/moratta/projects/:id
 * Get project by ID with variations. Verifies ownership.
 */
export const GET = withAuth(async (request, auth, context) => {
  const { id } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  const project = await prisma.morattaProject.findFirst({
    where: {
      id,
      userId: auth.userId,
    },
    include: {
      variations: {
        orderBy: { version: "asc" },
      },
    },
  })

  if (!project) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  return NextResponse.json({ success: true, data: project })
})

/**
 * PUT /api/moratta/projects/:id
 * Update project (name, params, status). Verifies ownership.
 */
export const PUT = withAuth(async (request, auth, context) => {
  const { id } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
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

  // Verify ownership
  const existing = await prisma.morattaProject.findFirst({
    where: { id, userId: auth.userId },
  })

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  // Build update data
  const updateData: Record<string, unknown> = {}

  if (json.name !== undefined) {
    if (typeof json.name !== "string" || json.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          errors: [{ code: "INVALID_NAME", message: "O nome do projeto é obrigatório.", field: "name" }],
        },
        { status: 400 },
      )
    }
    updateData.name = json.name.trim()
  }

  if (json.params !== undefined) {
    const paramsResult = projectParamsSchema.safeParse(json.params)
    if (!paramsResult.success) {
      return NextResponse.json(
        {
          success: false,
          errors: paramsResult.error.errors.map((err) => ({
            code: "VALIDATION_ERROR",
            message: err.message,
            field: err.path.join("."),
          })),
        },
        { status: 400 },
      )
    }
    updateData.params = paramsResult.data
  }

  if (json.status !== undefined) {
    const validStatuses = ["DRAFT", "GENERATING", "READY", "ERROR"]
    if (!validStatuses.includes(json.status)) {
      return NextResponse.json(
        {
          success: false,
          errors: [{ code: "INVALID_STATUS", message: "Status inválido.", field: "status" }],
        },
        { status: 400 },
      )
    }
    updateData.status = json.status
  }

  if (json.activeVariation !== undefined) {
    if (json.activeVariation !== null && typeof json.activeVariation !== "string") {
      return NextResponse.json(
        {
          success: false,
          errors: [{ code: "INVALID_ACTIVE_VARIATION", message: "activeVariation deve ser um ID válido ou null.", field: "activeVariation" }],
        },
        { status: 400 },
      )
    }
    updateData.activeVariation = json.activeVariation
  }

  const project = await prisma.morattaProject.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ success: true, data: project })
})

/**
 * DELETE /api/moratta/projects/:id
 * Delete project and all associated data (variations cascade). Verifies ownership.
 */
export const DELETE = withAuth(async (request, auth, context) => {
  const { id } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  // Verify ownership
  const existing = await prisma.morattaProject.findFirst({
    where: { id, userId: auth.userId },
  })

  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  // Delete project (variations cascade via onDelete: Cascade in schema)
  await prisma.morattaProject.delete({
    where: { id },
  })

  return NextResponse.json({
    success: true,
    message: "Projeto excluído com sucesso.",
  })
})
