import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/moratta/middleware/auth"
import { projectParamsSchema } from "@/lib/moratta/schemas"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/moratta/projects
 * List user's projects ordered by updatedAt desc, paginated (max 50/page).
 */
export const GET = withAuth(async (request, auth) => {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10) || 20
  const limit = Math.min(Math.max(1, rawLimit), 50)

  const skip = (page - 1) * limit

  const [projects, total] = await Promise.all([
    prisma.morattaProject.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        params: true,
        activeVariation: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.morattaProject.count({
      where: { userId: auth.userId },
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({
    success: true,
    data: projects,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  })
})

/**
 * POST /api/moratta/projects
 * Create a new project with status DRAFT.
 */
export const POST = withAuth(async (request, auth) => {
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

  const { name, params } = json

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "INVALID_NAME", message: "O nome do projeto é obrigatório.", field: "name" }],
      },
      { status: 400 },
    )
  }

  const paramsResult = projectParamsSchema.safeParse(params)

  if (!paramsResult.success) {
    return NextResponse.json(
      {
        success: false,
        errors: paramsResult.error.errors.map((err) => ({
          code: "VALIDATION_ERROR",
          message: err.message,
          field: err.path.join("."),
        })),
      },
      { status: 400 },
    )
  }

  const project = await prisma.morattaProject.create({
    data: {
      userId: auth.userId,
      name: name.trim(),
      status: "DRAFT",
      params: paramsResult.data,
    },
  })

  return NextResponse.json({ success: true, data: project }, { status: 201 })
})
