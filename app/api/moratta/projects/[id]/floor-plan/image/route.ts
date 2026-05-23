import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { generateFloorPlanImage } from "@/lib/moratta/services/floor-plan-image.service"
import type { ProjectParams, FloorPlanData } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/moratta/projects/:id/floor-plan/image
 * Generates a 3D isometric image of the floor plan using DALL-E.
 */
export const POST = withAuth(async (request, auth, context) => {
  const { id } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { success: false, errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }] },
      { status: 404 },
    )
  }

  const project = await prisma.morattaProject.findFirst({
    where: { id, userId: auth.userId },
    include: {
      variations: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  })

  if (!project) {
    return NextResponse.json(
      { success: false, errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }] },
      { status: 404 },
    )
  }

  const params = project.params as unknown as ProjectParams
  const variation = project.variations[0]

  if (!variation) {
    return NextResponse.json(
      { success: false, errors: [{ code: "NO_VARIATION", message: "Nenhuma planta gerada ainda." }] },
      { status: 400 },
    )
  }

  const floorPlan = variation.floorPlan as unknown as FloorPlanData

  const result = await generateFloorPlanImage(floorPlan, params)

  if (!result.success) {
    return NextResponse.json(
      { success: false, errors: [{ code: "IMAGE_ERROR", message: result.error }] },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data: { imageUrl: result.imageUrl },
  })
})
