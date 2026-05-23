import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { generateVariation } from "@/lib/moratta/services/floor-plan-generation.service"
import { calculate } from "@/lib/moratta/services/cost-estimation.service"
import type { ProjectParams, FloorPlanData, FinishLevel } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_VARIATIONS = 3

/**
 * POST /api/moratta/projects/:id/generate/variation
 * Generate a new variation for a project (max 3 total).
 * Calls AI generation service with existing variations for distinctness.
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

  // Verify ownership and get project with variations
  const project = await prisma.morattaProject.findFirst({
    where: { id, userId: auth.userId },
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

  // Validate that project has params
  const params = project.params as unknown as ProjectParams | null
  if (!params || !params.lot) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "MISSING_PARAMS",
            message: "O projeto não possui parâmetros definidos.",
          },
        ],
      },
      { status: 400 },
    )
  }

  // Check max variations limit
  if (project.variations.length >= MAX_VARIATIONS) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "MAX_VARIATIONS_REACHED",
            message: `O projeto já possui o máximo de ${MAX_VARIATIONS} variações.`,
          },
        ],
      },
      { status: 400 },
    )
  }

  // Extract existing floor plan data from variations
  const existingFloorPlans: FloorPlanData[] = project.variations.map(
    (v) => v.floorPlan as unknown as FloorPlanData,
  )

  // Set project status to GENERATING
  await prisma.morattaProject.update({
    where: { id },
    data: { status: "GENERATING" },
  })

  try {
    // Call AI generation service for variation
    const result = await generateVariation(params, existingFloorPlans)

    if (!result.success) {
      // Restore project status to READY (it had at least one variation)
      await prisma.morattaProject.update({
        where: { id },
        data: { status: "READY" },
      })

      const statusCode = result.error.code === "TIMEOUT" ? 504
        : result.error.code === "INFEASIBLE" ? 400
        : 502

      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              code: result.error.code,
              message: result.error.message,
              details: result.error.details,
            },
          ],
        },
        { status: statusCode },
      )
    }

    // Calculate cost estimate for the new variation
    const finishLevel: FinishLevel = params.finishLevel ?? "medio"
    const estimate = calculate(result.data, finishLevel, params.budget)

    // Determine next version number
    const nextVersion = project.variations.length + 1

    // Create new variation and restore project status
    const variation = await prisma.$transaction(async (tx) => {
      const newVariation = await tx.morattaVariation.create({
        data: {
          projectId: id,
          version: nextVersion,
          floorPlan: result.data as unknown as object,
          estimate: estimate as unknown as object,
        },
      })

      await tx.morattaProject.update({
        where: { id },
        data: { status: "READY" },
      })

      return newVariation
    })

    return NextResponse.json({ success: true, data: variation }, { status: 201 })
  } catch (error) {
    // Restore project status to READY on unexpected failures
    await prisma.morattaProject.update({
      where: { id },
      data: { status: "READY" },
    })

    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "GENERATION_ERROR",
            message: "Erro inesperado durante a geração da variação.",
          },
        ],
      },
      { status: 500 },
    )
  }
})
