import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { generateAlgorithmic } from "@/lib/moratta/services/floor-plan-algorithmic.service"
import { calculate } from "@/lib/moratta/services/cost-estimation.service"
import type { ProjectParams, FinishLevel } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/moratta/projects/:id/generate
 * Start floor plan generation for a project.
 * Sets project status to GENERATING, calls AI generation service,
 * creates a MorattaVariation (version 1), and sets project to READY on success.
 */
export const POST = withAuth(async (request, auth, context) => {
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

  // Validate that project has params
  const params = project.params as unknown as ProjectParams | null
  if (!params || !params.lot) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "MISSING_PARAMS",
            message: "O projeto não possui parâmetros definidos. Preencha os parâmetros antes de gerar.",
          },
        ],
      },
      { status: 400 },
    )
  }

  // Set project status to GENERATING
  await prisma.morattaProject.update({
    where: { id },
    data: { status: "GENERATING" },
  })

  try {
    // Generate floor plan algorithmically (no AI, instant, free)
    const floorPlan = generateAlgorithmic(params)

    // Calculate cost estimate
    const finishLevel: FinishLevel = params.finishLevel ?? "medio"
    const estimate = calculate(floorPlan, finishLevel, params.budget)

    // Create variation (next version) and update project in a transaction
    const updatedProject = await prisma.$transaction(async (tx) => {
      // Get the latest version number
      const lastVariation = await tx.morattaVariation.findFirst({
        where: { projectId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      })
      const nextVersion = (lastVariation?.version ?? 0) + 1

      // Delete old variations to keep it clean on regenerate
      await tx.morattaVariation.deleteMany({
        where: { projectId: id },
      })

      const variation = await tx.morattaVariation.create({
        data: {
          projectId: id,
          version: nextVersion,
          floorPlan: floorPlan as unknown as object,
          estimate: estimate as unknown as object,
        },
      })

      return tx.morattaProject.update({
        where: { id },
        data: {
          status: "READY",
          activeVariation: variation.id,
        },
        include: {
          variations: {
            orderBy: { version: "asc" },
          },
        },
      })
    })

    return NextResponse.json({ success: true, data: updatedProject })
  } catch (error) {
    // Set project status to ERROR on unexpected failures
    await prisma.morattaProject.update({
      where: { id },
      data: { status: "ERROR" },
    })

    console.error("[GENERATE] Unexpected error:", error)

    const errorMessage = error instanceof Error ? error.message : "Erro inesperado durante a geração da planta."

    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "GENERATION_ERROR",
            message: errorMessage,
          },
        ],
      },
      { status: 500 },
    )
  }
})
