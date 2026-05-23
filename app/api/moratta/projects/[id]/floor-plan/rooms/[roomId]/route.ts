import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { roomSchema } from "@/lib/moratta/schemas"
import type { FloorPlanData } from "@/lib/moratta/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * PUT /api/moratta/projects/:id/floor-plan/rooms/:roomId
 * Update a specific room (position, dimensions, name, type).
 */
export const PUT = withAuth(async (request, auth, context) => {
  const { id, roomId } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  if (!UUID_REGEX.test(roomId)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Ambiente não encontrado." }],
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

  // Find the room to update
  const roomIndex = floorPlan.rooms.findIndex((r) => r.id === roomId)
  if (roomIndex === -1) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Ambiente não encontrado na planta." }],
      },
      { status: 404 },
    )
  }

  // Update the room
  const updatedRooms = [...floorPlan.rooms]
  updatedRooms[roomIndex] = parseResult.data

  const updatedFloorPlan: FloorPlanData = {
    ...floorPlan,
    rooms: updatedRooms,
    totalArea: Math.round(updatedRooms.reduce((sum, r) => sum + r.area, 0) * 100) / 100,
  }

  const updatedVariation = await prisma.morattaVariation.update({
    where: { id: project.activeVariation },
    data: {
      floorPlan: updatedFloorPlan as object,
    },
  })

  return NextResponse.json({
    success: true,
    data: updatedVariation.floorPlan as unknown as FloorPlanData,
  })
})

/**
 * DELETE /api/moratta/projects/:id/floor-plan/rooms/:roomId
 * Remove a room from the floor plan. Must have at least 1 room remaining.
 */
export const DELETE = withAuth(async (request, auth, context) => {
  const { id, roomId } = await context!.params!

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Projeto não encontrado." }],
      },
      { status: 404 },
    )
  }

  if (!UUID_REGEX.test(roomId)) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Ambiente não encontrado." }],
      },
      { status: 404 },
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

  // Find the room to remove
  const roomIndex = floorPlan.rooms.findIndex((r) => r.id === roomId)
  if (roomIndex === -1) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "NOT_FOUND", message: "Ambiente não encontrado na planta." }],
      },
      { status: 404 },
    )
  }

  // Enforce minimum 1 room
  if (floorPlan.rooms.length <= 1) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "MIN_ROOMS", message: "A planta deve conter ao menos 1 ambiente." }],
      },
      { status: 400 },
    )
  }

  // Remove the room
  const updatedRooms = floorPlan.rooms.filter((r) => r.id !== roomId)

  const updatedFloorPlan: FloorPlanData = {
    ...floorPlan,
    rooms: updatedRooms,
    totalArea: Math.round(updatedRooms.reduce((sum, r) => sum + r.area, 0) * 100) / 100,
  }

  const updatedVariation = await prisma.morattaVariation.update({
    where: { id: project.activeVariation },
    data: {
      floorPlan: updatedFloorPlan as object,
    },
  })

  return NextResponse.json({
    success: true,
    data: updatedVariation.floorPlan as unknown as FloorPlanData,
  })
})
