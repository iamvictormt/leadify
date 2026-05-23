import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import {
  generateFromFloorPlan,
  validateCompleteness,
} from "@/lib/moratta/services/three-d-model.service"
import type { FloorPlanData, ArchitecturalStyle, ProjectParams } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/moratta/projects/:id/3d/generate
 * Generate a 3D model from the active variation's floor plan.
 * Validates completeness before generating. Timeout: 60s.
 * Requirements: 5.1, 5.5, 5.6, 5.7
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

  // Fetch project with variations, verify ownership
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

  // Find the active variation
  const activeVariation = project.activeVariation
    ? project.variations.find((v) => v.id === project.activeVariation)
    : project.variations[0]

  if (!activeVariation) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "NO_VARIATION",
            message: "Nenhuma variação encontrada. Gere uma planta baixa primeiro.",
          },
        ],
      },
      { status: 400 },
    )
  }

  const plan = activeVariation.floorPlan as unknown as FloorPlanData

  if (!plan || !plan.walls || !plan.rooms) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "NO_FLOOR_PLAN",
            message: "A variação ativa não possui uma planta baixa válida.",
          },
        ],
      },
      { status: 400 },
    )
  }

  // Validate completeness before generating (Requirement 5.7)
  const completeness = validateCompleteness(plan)

  if (!completeness.valid) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "INCOMPLETE_PLAN",
            message:
              "A planta baixa não possui informações suficientes para gerar o modelo 3D.",
            details: { incompleteElements: completeness.incompleteElements },
          },
        ],
      },
      { status: 400 },
    )
  }

  // Get architectural style from project params
  const params = project.params as unknown as ProjectParams
  const style: ArchitecturalStyle = params?.style ?? "moderno"

  // Generate 3D model
  const threeDModel = generateFromFloorPlan(plan, style)

  // Save the 3D model to the active variation
  await prisma.morattaVariation.update({
    where: { id: activeVariation.id },
    data: {
      threeDModel: threeDModel as object,
    },
  })

  return NextResponse.json({
    success: true,
    data: threeDModel,
  })
})
