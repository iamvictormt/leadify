import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { calculate } from "@/lib/moratta/services/cost-estimation.service"
import type { FloorPlanData, FinishLevel, ProjectParams } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/moratta/projects/:id/estimate
 * Calculate and return cost estimate for the active variation.
 * Uses the project's finishLevel (from params) or defaults to 'medio'.
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

  const floorPlan = variation.floorPlan as unknown as FloorPlanData
  const params = project.params as unknown as ProjectParams
  const finishLevel: FinishLevel = params.finishLevel || "medio"
  const budget = params.budget

  const estimate = calculate(floorPlan, finishLevel, budget)

  // Persist the estimate on the variation for caching
  await prisma.morattaVariation.update({
    where: { id: variation.id },
    data: { estimate: estimate as object },
  })

  return NextResponse.json({
    success: true,
    data: estimate,
  })
})
