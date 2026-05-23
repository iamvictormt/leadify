import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/moratta/shared/:token
 * Public endpoint (NO auth required).
 * Returns project data in read-only format if token is valid and sharing is enabled.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params

  if (!token || token.trim().length === 0) {
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
      shareToken: token,
      shareEnabled: true,
    },
    include: {
      variations: {
        orderBy: { version: "asc" },
        select: {
          id: true,
          version: true,
          floorPlan: true,
          estimate: true,
          threeDModel: true,
        },
      },
    },
  })

  if (!project) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado ou compartilhamento desativado." }],
      },
      { status: 404 },
    )
  }

  // Return read-only project data (no userId, no sensitive info)
  const activeVariation = project.variations.find(
    (v) => v.id === project.activeVariation,
  ) ?? project.variations[0] ?? null

  return NextResponse.json({
    success: true,
    data: {
      id: project.id,
      name: project.name,
      status: project.status,
      params: project.params,
      activeVariation,
      variations: project.variations,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  })
}
