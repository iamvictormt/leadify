/**
 * Moratta authentication middleware.
 * Reuses the existing JWT system from lib/auth.ts.
 * Provides withAuth and withProfessionalProfile wrappers for API route handlers.
 */

import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export interface AuthenticatedRequest {
  userId: string
}

export interface MorattaProfileRequest extends AuthenticatedRequest {
  profileId: string
  profileType: "PERSONAL" | "PROFESSIONAL"
}

type NextRouteHandler = (
  request: Request,
  context?: { params?: Record<string, string> },
) => Promise<NextResponse>

type AuthenticatedHandler = (
  request: Request,
  auth: AuthenticatedRequest,
  context?: { params?: Record<string, string> },
) => Promise<NextResponse>

type ProfessionalHandler = (
  request: Request,
  auth: MorattaProfileRequest,
  context?: { params?: Record<string, string> },
) => Promise<NextResponse>

/**
 * Middleware wrapper that verifies JWT authentication.
 * Extracts token from httpOnly cookie, verifies it, and passes user info to handler.
 * Returns 401 if token is missing, invalid, or expired (7-day session).
 */
export function withAuth(handler: AuthenticatedHandler): NextRouteHandler {
  return async (request, context) => {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              code: "UNAUTHENTICATED",
              message: "Sessão não encontrada. Faça login para continuar.",
            },
          ],
          redirect: "/login",
        },
        { status: 401 },
      )
    }

    const session = verifySessionToken(token)

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              code: "SESSION_EXPIRED",
              message: "Sua sessão expirou. Faça login novamente.",
            },
          ],
          redirect: "/login",
        },
        { status: 401 },
      )
    }

    const auth: AuthenticatedRequest = {
      userId: session.userId,
    }

    return handler(request, auth, context)
  }
}

/**
 * Middleware wrapper that verifies the user has a PROFESSIONAL Moratta profile.
 * Must be used after withAuth (it includes auth verification).
 * Returns 403 with upgrade message if user has PERSONAL profile.
 * Returns 403 if user has no Moratta profile.
 */
export function withProfessionalProfile(handler: ProfessionalHandler): NextRouteHandler {
  return withAuth(async (request, auth, context) => {
    const profile = await prisma.morattaProfile.findUnique({
      where: { userId: auth.userId },
    })

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              code: "PROFILE_NOT_FOUND",
              message: "Perfil Moratta não encontrado. Crie um perfil para continuar.",
            },
          ],
        },
        { status: 403 },
      )
    }

    if (profile.type !== "PROFESSIONAL") {
      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              code: "PROFESSIONAL_REQUIRED",
              message:
                "Esta funcionalidade requer perfil Profissional. Faça upgrade do seu perfil para acessar.",
            },
          ],
        },
        { status: 403 },
      )
    }

    const profileAuth: MorattaProfileRequest = {
      ...auth,
      profileId: profile.id,
      profileType: profile.type,
    }

    return handler(request, profileAuth, context)
  })
}
