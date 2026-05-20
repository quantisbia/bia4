/**
 * Edge-safe NextAuth config — usado APENAS pelo middleware.
 *
 * IMPORTANTE: este arquivo NÃO pode importar Prisma, bcryptjs nem
 * qualquer código que dependa de Node.js APIs (fs, crypto-node, etc.),
 * porque o middleware roda no Edge Runtime da Vercel.
 *
 * O config "completo" (com providers que acessam DB) vive em `config.ts`
 * e é usado em rotas de API (Node runtime) e server components.
 *
 * Padrão recomendado pelo NextAuth v5:
 * https://authjs.dev/guides/edge-compatibility
 */

import type { NextAuthConfig } from "next-auth"

// Detecta se está em HTTPS (sandbox ou produção) — apenas leitura de env,
// totalmente edge-safe.
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false

export const authEdgeConfig = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/dashboard",
  },
  // Cookies precisam estar no config do middleware também, para que
  // ele consiga *ler* o mesmo cookie que o config.ts (Node) escreve.
  cookies: {
    sessionToken: {
      name: useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: useSecureCookies ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: useSecureCookies ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  // Sem providers aqui — o middleware só precisa ler o JWT do cookie.
  // Os providers reais (Credentials com bcrypt + Prisma) ficam em config.ts.
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      const protectedPaths = ["/dashboard", "/admin"]
      const authPaths = ["/auth/login", "/auth/register"]

      const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
      const isAuthPage = authPaths.some((p) => pathname.startsWith(p))

      if (isProtected && !isLoggedIn) {
        return false
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig
