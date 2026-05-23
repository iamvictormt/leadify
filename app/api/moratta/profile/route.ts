import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { withAuth, type AuthenticatedRequest } from "@/lib/moratta/middleware"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const updateProfileSchema = z.object({
  type: z.enum(["PERSONAL", "PROFESSIONAL"]),
})

/**
 * GET /api/moratta/profile
 * Returns the current user's MorattaProfile.
 * If no profile exists, auto-creates one with PERSONAL default.
 */
export const GET = withAuth(async (_request: Request, auth: AuthenticatedRequest) => {
  let profile = await prisma.morattaProfile.findUnique({
    where: { userId: auth.userId },
  })

  // Auto-create profile if it doesn't exist
  if (!profile) {
    profile = await prisma.morattaProfile.create({
      data: {
        userId: auth.userId,
        type: "PERSONAL",
      },
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: profile.id,
      type: profile.type,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
  })
})

/**
 * PUT /api/moratta/profile
 * Allows updating the profile type (PERSONAL → PROFESSIONAL upgrade).
 * Profile upgrade should complete in < 5 seconds (just a DB update).
 */
export const PUT = withAuth(async (request: Request, auth: AuthenticatedRequest) => {
  const json = await request.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          {
            code: "INVALID_INPUT",
            message: "Tipo de perfil inválido. Use PERSONAL ou PROFESSIONAL.",
            field: "type",
          },
        ],
      },
      { status: 400 },
    )
  }

  const { type } = parsed.data

  // Find or create profile
  let profile = await prisma.morattaProfile.findUnique({
    where: { userId: auth.userId },
  })

  if (!profile) {
    // Auto-create with the requested type
    profile = await prisma.morattaProfile.create({
      data: {
        userId: auth.userId,
        type,
      },
    })
  } else {
    // Update existing profile type
    profile = await prisma.morattaProfile.update({
      where: { userId: auth.userId },
      data: { type },
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: profile.id,
      type: profile.type,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
  })
})
