import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { getUserByEmail } from "@/lib/db/queries"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha muito curta"),
})

// Detecta se está em HTTPS (sandbox ou produção)
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/dashboard",
  },
  // Cookies configurados corretamente para HTTPS sandbox
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
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) return null

          const { email, password } = parsed.data

          const user = await getUserByEmail(email)
          if (!user || !user.password) return null

          const valid = await bcrypt.compare(password, user.password)
          if (!valid) return null

          // Log login (fire-and-forget)
          prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "user_login",
              entity: "session",
              metadata: { email: user.email },
            },
          }).catch(() => {})

          const rawPlan = user.subscription?.plan ?? "FREE"
          const plan = rawPlan === "FREE" ? "DISCOVERY" : rawPlan

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? null,
            role: user.role,
            plan,
            credits: user.creditBalance?.balance ?? 0,
          }
        } catch (error) {
          console.error("[AUTH] authorize error:", error)
          return null
        }
      },
    }),
  ],
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

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? "USER"
        token.plan = (user as { plan?: string }).plan ?? "FREE"
        token.credits = (user as { credits?: number }).credits ?? 0
      }

      if (trigger === "update" && session) {
        try {
          const freshUser = await getUserByEmail(token.email as string)
          if (freshUser) {
            token.credits = freshUser.creditBalance?.balance ?? 0
            const rawPlan = freshUser.subscription?.plan ?? "FREE"
            token.plan = rawPlan === "FREE" ? "DISCOVERY" : rawPlan
            token.name = freshUser.name
            token.role = freshUser.role
          }
        } catch {
          // Keep existing token data on DB error
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.plan = token.plan as string
        session.user.credits = token.credits as number
      }
      return session
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
})
