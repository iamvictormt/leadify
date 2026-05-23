import crypto from "crypto"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { withProfessionalProfile } from "@/lib/moratta/middleware/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/moratta/projects/:id/share
 * Generate a unique share token and enable sharing for the project.
 */
export const POST = withProfessionalProfile(async (_request, auth, context) => {
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

  // If already shared, return existing token
  if (project.shareEnabled && project.shareToken) {
    return NextResponse.json({
      success: true,
      data: {
        shareToken: project.shareToken,
        shareEnabled: true,
      },
    })
  }

  // Generate a new unique share token
  const shareToken = crypto.randomUUID()

  const updated = await prisma.morattaProject.update({
    where: { id },
    data: {
      shareToken,
      shareEnabled: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      shareToken: updated.shareToken,
      shareEnabled: updated.shareEnabled,
    },
  })
})

/**
 * DELETE /api/moratta/projects/:id/share
 * Revoke sharing: set shareEnabled=false and clear shareToken.
 */
export const DELETE = withProfessionalProfile(async (_request, auth, context) => {
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

  await prisma.morattaProject.update({
    where: { id },
    data: {
      shareEnabled: false,
      shareToken: null,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      shareEnabled: false,
    },
  })
})
