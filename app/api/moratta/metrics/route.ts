import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withProfessionalProfile } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/moratta/metrics
 * Return professional metrics panel data:
 * - totalProjects: count of projects owned by user
 * - sharedProjects: count of projects with shareEnabled=true
 * - uniqueClients: count of distinct clients with at least 1 linked project
 */
export const GET = withProfessionalProfile(async (_request, auth) => {
  const [totalProjects, sharedProjects, uniqueClients] = await Promise.all([
    // Total projects owned by the user
    prisma.morattaProject.count({
      where: { userId: auth.userId },
    }),

    // Projects with sharing enabled
    prisma.morattaProject.count({
      where: {
        userId: auth.userId,
        shareEnabled: true,
      },
    }),

    // Distinct clients with at least 1 linked project
    prisma.morattaClient.count({
      where: {
        profileId: auth.profileId,
        projects: {
          some: {},
        },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      totalProjects,
      sharedProjects,
      uniqueClients,
    },
  })
})
