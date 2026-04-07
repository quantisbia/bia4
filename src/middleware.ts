import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const protectedRoutes = ["/dashboard", "/admin"]
const authRoutes = ["/auth/login", "/auth/register"]

export async function middleware(req: NextRequest) {
  const { nextUrl } = req

  // Auth.js v5 em produção usa cookie __Secure-authjs.session-token
  // getToken precisa saber que é secureCookie=true para usar o prefixo correto
  const isProduction = process.env.NODE_ENV === "production"

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: isProduction,
    // Auth.js v5 beta usa salt = cookieName para encode/decode
    // cookieName é derivado automaticamente pelo secureCookie flag
  })

  const isLoggedIn = !!token
  const isProtectedRoute = protectedRoutes.some((r) => nextUrl.pathname.startsWith(r))
  const isAuthRoute = authRoutes.some((r) => nextUrl.pathname.startsWith(r))

  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
