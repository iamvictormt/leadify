import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * User-facing generation states:
 * - aguardando: project is in DRAFT or waiting to start
 * - processando: project is actively being generated (GENERATING)
 * - finalizando: generation is wrapping up (mapped from GENERATING with variations)
 * - concluido: generation complete (READY)
 * - erro: generation failed (ERROR)
 */
type GenerationState = "aguardando" | "processando" | "finalizando" | "concluido" | "erro"

interface GenerationStatusResponse {
  status: GenerationState
  progress: number
}

/**
 * Maps ProjectStatus enum to user-facing generation states.
 * Progress is an approximate percentage for UI display.
 */
function mapStatusToGenerationState(
  projectStatus: string,
  hasVariations: boolean,
): GenerationStatusResponse {
  switch (projectStatus) {
    case "DRAFT":
      return { status: "aguardando", progress: 0 }
    case "GENERATING":
      // If the project already has variations, it's generating a new one (finalizando)
      if (hasVariations) {
        return { status: "finalizando", progress: 75 }
      }
      return { status: "processando", progress: 50 }
    case "READY":
      return { status: "concluido", progress: 100 }
    case "ERROR":
      return { status: "erro", progress: 0 }
    default:
      return { status: "aguardando", progress: 0 }
  }
}

/**
 * GET /api/moratta/projects/:id/generation-status
 * Returns the current generation status for polling.
 * Frontend polls this endpoint every 5 seconds during generation.
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

  // Verify ownership
  const project = await prisma.morattaProject.findFirst({
    where: { id, userId: auth.userId },
    select: {
      status: true,
      _count: {
        select: { variations: true },
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

  const hasVariations = project._count.variations > 0
  const generationStatus = mapStatusToGenerationState(project.status, hasVariations)

  return NextResponse.json({ success: true, data: generationStatus })
})
