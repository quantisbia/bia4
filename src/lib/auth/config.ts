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

export const { handlers, auth, signIn, signOut } = NextAuth({
  // IMPORTANTE: Sem PrismaAdapter quando usamos JWT + Credentials
  // O PrismaAdapter tenta gravar Sessions no DB o que conflita com JWT strategy
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/dashboard",
  },
  // Cookies mais permissivos para funcionar com proxy/sandbox
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Permite HTTP no sandbox
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        secure: false,
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
          // Validate input
          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) return null

          const { email, password } = parsed.data

          // Find user
          const user = await getUserByEmail(email)
          if (!user || !user.password) return null

          // Verify password
          const valid = await bcrypt.compare(password, user.password)
          if (!valid) return null

          // Log login (fire-and-forget — não bloqueia o login)
          prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "user_login",
              entity: "session",
              metadata: { email: user.email },
            },
          }).catch(() => {})

          // Mapear FREE → DISCOVERY (plan legado sem créditos)
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
    // Auth.js v5: authorized callback é usado pelo middleware para proteger rotas
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      const protectedPaths = ["/dashboard", "/admin"]
      const authPaths = ["/auth/login", "/auth/register"]

      const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
      const isAuthPage = authPaths.some((p) => pathname.startsWith(p))

      // Proteger rotas: redirecionar para login se não autenticado
      if (isProtected && !isLoggedIn) {
        return false // Auth.js v5 redireciona automaticamente para signIn page
      }

      // Redirecionar para dashboard se já logado e tentar acessar auth pages
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },

    async jwt({ token, user, trigger, session }) {
      // No sign-in: attach user data to token
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? "USER"
        token.plan = (user as { plan?: string }).plan ?? "FREE"
        token.credits = (user as { credits?: number }).credits ?? 0
      }

      // On session update trigger: refresh user data from DB
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
