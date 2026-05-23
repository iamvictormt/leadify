import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withAuth, type AuthenticatedRequest } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/moratta/admin/check
 * Returns whether the current user is an admin.
 */
export const GET = withAuth(async (_request: Request, auth: AuthenticatedRequest) => {
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  })

  return NextResponse.json({
    success: true,
    data: { isAdmin: user?.role === "ADMIN" },
  })
})
