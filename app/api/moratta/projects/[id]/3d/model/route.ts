import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import type { ThreeDModelData } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/moratta/projects/:id/3d/model
 * Returns the ThreeDModelData for the active variation.
 * Returns 404 if no model has been generated yet.
 * Requirements: 5.1, 5.6
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

  if (!activeVariation || activeVariation.threeDModel === null) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "MODEL_NOT_FOUND",
            message:
              "Modelo 3D não encontrado. Gere o modelo 3D primeiro.",
          },
        ],
      },
      { status: 404 },
    )
  }

  const modelData = activeVariation.threeDModel as unknown as ThreeDModelData

  return NextResponse.json({
    success: true,
    data: modelData,
  })
})
