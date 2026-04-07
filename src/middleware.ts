import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const protectedRoutes = ["/dashboard", "/admin"]
const authRoutes = ["/auth/login", "/auth/register"]

export async function middleware(req: NextRequest) {
  const { nextUrl } = req

  // Auth.js v5: O sandbox usa HTTPS externamente mas HTTP internamente.
  // Tentamos primeiro com secureCookie=true (HTTPS), depois com false (HTTP fallback)
  // para garantir que o token seja lido corretamente em qualquer ambiente.
  let token = null

  // Tenta com secureCookie=true primeiro (produção HTTPS)
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: true,
    })
  } catch {
    // silencioso
  }

  // Se não encontrou, tenta sem secureCookie (desenvolvimento HTTP)
  if (!token) {
    try {
      token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: false,
      })
    } catch {
      // silencioso
    }
  }

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
