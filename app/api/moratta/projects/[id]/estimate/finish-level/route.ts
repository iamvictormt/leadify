import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { calculate } from "@/lib/moratta/services/cost-estimation.service"
import type { FloorPlanData, ProjectParams } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const finishLevelSchema = z.object({
  finishLevel: z.enum(["baixo", "medio", "alto"]),
})

/**
 * PUT /api/moratta/projects/:id/estimate/finish-level
 * Change the finish level and recalculate the estimate.
 * Updates the project params and returns the new estimate.
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

  // Validate finish level
  const parseResult = finishLevelSchema.safeParse(json)
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

  const { finishLevel } = parseResult.data

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

  const floorPlan = variation.floorPlan as unknown as FloorPlanData
  const params = project.params as unknown as ProjectParams
  const budget = params.budget

  // Recalculate estimate with new finish level
  const estimate = calculate(floorPlan, finishLevel, budget)

  // Update the project params with the new finish level
  const updatedParams = { ...params, finishLevel }
  await prisma.morattaProject.update({
    where: { id },
    data: { params: updatedParams as object },
  })

  // Persist the updated estimate on the variation
  await prisma.morattaVariation.update({
    where: { id: variation.id },
    data: { estimate: estimate as object },
  })

  return NextResponse.json({
    success: true,
    data: estimate,
  })
})
