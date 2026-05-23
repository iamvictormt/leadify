import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { withAuth, type AuthenticatedRequest } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const updateSettingsSchema = z.object({
  aiProvider: z.enum(["gemini", "groq", "openai"]),
})

/**
 * GET /api/moratta/admin/settings
 * Returns system settings. Only accessible by ADMIN users.
 */
export const GET = withAuth(async (_request: Request, auth: AuthenticatedRequest) => {
  // Check admin role
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  })

  if (user?.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, errors: [{ code: "FORBIDDEN", message: "Acesso negado." }] },
      { status: 403 },
    )
  }

  // Get or create settings
  let settings = await prisma.systemSettings.findUnique({
    where: { id: "singleton" },
  })

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: { id: "singleton", aiProvider: "gemini" },
    })
  }

  return NextResponse.json({
    success: true,
    data: { aiProvider: settings.aiProvider },
  })
})

/**
 * PUT /api/moratta/admin/settings
 * Updates system settings. Only accessible by ADMIN users.
 */
export const PUT = withAuth(async (request: Request, auth: AuthenticatedRequest) => {
  // Check admin role
  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { role: true },
  })

  if (user?.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, errors: [{ code: "FORBIDDEN", message: "Acesso negado." }] },
      { status: 403 },
    )
  }

  const json = await request.json().catch(() => null)
  const parsed = updateSettingsSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        errors: [{ code: "INVALID_INPUT", message: "Provider inválido. Use 'gemini' ou 'groq'." }],
      },
      { status: 400 },
    )
  }

  const settings = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: { aiProvider: parsed.data.aiProvider },
    create: { id: "singleton", aiProvider: parsed.data.aiProvider },
  })

  return NextResponse.json({
    success: true,
    data: { aiProvider: settings.aiProvider },
  })
})
