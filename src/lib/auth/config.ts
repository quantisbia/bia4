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
  // e pode causar falhas silenciosas no login com Neon serverless
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/dashboard",
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

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? null,
            role: user.role,
            plan: user.subscription?.plan ?? "FREE",
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
            token.plan = freshUser.subscription?.plan ?? "FREE"
            token.name = freshUser.name
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
  debug: process.env.NODE_ENV === "development",
})
