import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/moratta/projects/:id/3d/status
 * Returns whether a 3D model exists for the active variation.
 * Requirements: 5.1, 5.5
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
    return NextResponse.json({
      success: true,
      data: {
        hasModel: false,
        generatedAt: null,
      },
    })
  }

  const hasModel = activeVariation.threeDModel !== null
  const generatedAt = hasModel ? activeVariation.updatedAt.toISOString() : null

  return NextResponse.json({
    success: true,
    data: {
      hasModel,
      generatedAt,
    },
  })
})
