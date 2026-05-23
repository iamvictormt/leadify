import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/moratta/projects/:id/duplicate
 * Duplicate a project with all its data. The copy is independent (no link to original).
 * Name = original name + " (Cópia)"
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

  // Fetch original project with variations
  const original = await prisma.morattaProject.findFirst({
    where: { id, userId: auth.userId },
    include: {
      variations: {
        orderBy: { version: "asc" },
      },
    },
  })

  if (!original) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  // Create the duplicated project with all variations in a transaction
  const duplicated = await prisma.$transaction(async (tx) => {
    const newProject = await tx.morattaProject.create({
      data: {
        userId: auth.userId,
        name: `${original.name} (Cópia)`,
        status: original.status,
        params: original.params as object,
        activeVariation: null, // Will be set after creating variations
      },
    })

    // Copy all variations
    if (original.variations.length > 0) {
      await Promise.all(
        original.variations.map((variation) =>
          tx.morattaVariation.create({
            data: {
              projectId: newProject.id,
              version: variation.version,
              floorPlan: variation.floorPlan as object,
              estimate: variation.estimate ?? undefined,
              threeDModel: variation.threeDModel ?? undefined,
            },
          }),
        ),
      )

      // If original had an active variation, find the corresponding new one
      if (original.activeVariation) {
        const activeOriginal = original.variations.find(
          (v) => v.id === original.activeVariation,
        )
        if (activeOriginal) {
          const newActive = await tx.morattaVariation.findFirst({
            where: {
              projectId: newProject.id,
              version: activeOriginal.version,
            },
          })
          if (newActive) {
            await tx.morattaProject.update({
              where: { id: newProject.id },
              data: { activeVariation: newActive.id },
            })
          }
        }
      }
    }

    // Return the full project with variations
    return tx.morattaProject.findFirst({
      where: { id: newProject.id },
      include: {
        variations: {
          orderBy: { version: "asc" },
        },
      },
    })
  })

  return NextResponse.json({ success: true, data: duplicated }, { status: 201 })
})
