import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { floorPlanSchema } from "@/lib/moratta/schemas"
import type { FloorPlanData } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/moratta/projects/:id/floor-plan
 * Returns the active variation's floor plan data.
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
    where: { id, userId: auth.userId },
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

  if (!project.activeVariation) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NO_VARIATION", message: "Nenhuma variação ativa encontrada. Gere uma planta primeiro." }],
      },
      { status: 404 },
    )
  }

  const variation = await prisma.morattaVariation.findUnique({
    where: { id: project.activeVariation },
  })

  if (!variation) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Variação ativa não encontrada." }],
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    success: true,
    data: variation.floorPlan as unknown as FloorPlanData,
  })
})

/**
 * PUT /api/moratta/projects/:id/floor-plan
 * Save floor plan edits (full FloorPlanData replacement) on the active variation.
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

  // Validate the floor plan data
  const parseResult = floorPlanSchema.safeParse(json)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        errors: parseResult.error.errors.map((err) => ({
          code: "VALIDATION_ERROR",
          message: err.message,
          field: err.path.join("."),
        })),
      },
      { status: 400 },
    )
  }

  const project = await prisma.morattaProject.findFirst({
    where: { id, userId: auth.userId },
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

  if (!project.activeVariation) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NO_VARIATION", message: "Nenhuma variação ativa encontrada. Gere uma planta primeiro." }],
      },
      { status: 404 },
    )
  }

  const variation = await prisma.morattaVariation.update({
    where: { id: project.activeVariation },
    data: {
      floorPlan: parseResult.data as object,
    },
  })

  return NextResponse.json({
    success: true,
    data: variation.floorPlan as unknown as FloorPlanData,
  })
})
