import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { roomSchema } from "@/lib/moratta/schemas"
import type { FloorPlanData } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/moratta/projects/:id/floor-plan/rooms
 * Add a new room to the floor plan (max 30 rooms).
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

  const json = await request.json().catch(() => null)

  if (!json) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "INVALID_BODY", message: "Corpo da requisição inválido." }],
      },
      { status: 400 },
    )
  }

  // Validate room data
  const parseResult = roomSchema.safeParse(json)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        errors: parseResult.error.errors.map((err) => ({
          code: "VALIDATION_ERROR",
          message: err.message,
          field: err.path.join("."),
        })),
      },
      { status: 400 },
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

  // Enforce max 30 rooms
  if (floorPlan.rooms.length >= 30) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "MAX_ROOMS", message: "Limite máximo de 30 ambientes atingido." }],
      },
      { status: 400 },
    )
  }

  // Add the new room
  const newRoom = parseResult.data
  const updatedFloorPlan: FloorPlanData = {
    ...floorPlan,
    rooms: [...floorPlan.rooms, newRoom],
    totalArea: Math.round((floorPlan.rooms.reduce((sum, r) => sum + r.area, 0) + newRoom.area) * 100) / 100,
  }

  const updatedVariation = await prisma.morattaVariation.update({
    where: { id: project.activeVariation },
    data: {
      floorPlan: updatedFloorPlan as object,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: updatedVariation.floorPlan as unknown as FloorPlanData,
    },
    { status: 201 },
  )
})
