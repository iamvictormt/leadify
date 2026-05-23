import { NextRequest, NextResponse } from "next/server"

// Definido diretamente aqui para evitar importar lib/auth.ts que usa node:crypto
// (incompatível com Edge Runtime do middleware)
const SESSION_COOKIE_NAME = "moratta_session"

/**
 * Middleware de proteção de rotas.
 * Redireciona para /login se o usuário não tiver um token de sessão válido
 * ao acessar rotas protegidas (/dashboard/*).
 * Redireciona para /dashboard se o usuário já estiver autenticado
 * e tentar acessar /login ou /cadastrar.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

  // Rotas protegidas - requer autenticação
  const isProtectedRoute = pathname.startsWith("/dashboard")

  // Rotas de auth - redirecionar se já autenticado
  const isAuthRoute = pathname === "/login" || pathname === "/cadastrar"

  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/cadastrar"],
}
