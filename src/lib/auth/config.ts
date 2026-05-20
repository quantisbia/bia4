import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { getUserByEmail } from "@/lib/db/queries"
import { z } from "zod"
import { authEdgeConfig } from "@/lib/auth/edge"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha muito curta"),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authEdgeConfig,
  // `cookies`, `session`, `pages`, `trustHost`, etc. já vêm do authEdgeConfig.
  // Aqui só adicionamos o que é Node-only: o provider Credentials que
  // acessa Prisma e bcryptjs.
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("[AUTH] authorize start, email:", (credentials as { email?: string })?.email)
          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) {
            console.warn("[AUTH] zod parse failed:", parsed.error.flatten())
            return null
          }

          const { email, password } = parsed.data

          let user
          try {
            user = await getUserByEmail(email)
          } catch (dbErr) {
            console.error("[AUTH] getUserByEmail FAILED:", dbErr instanceof Error ? dbErr.message : String(dbErr))
            console.error("[AUTH] stack:", dbErr instanceof Error ? dbErr.stack : "no stack")
            return null
          }

          if (!user) {
            console.warn("[AUTH] user not found:", email)
            return null
          }
          if (!user.password) {
            console.warn("[AUTH] user has no password (oauth-only?):", email)
            return null
          }

          const valid = await bcrypt.compare(password, user.password)
          if (!valid) {
            console.warn("[AUTH] bcrypt mismatch for:", email)
            return null
          }

          console.log("[AUTH] login OK for:", email, "role:", user.role)

          // Log login (fire-and-forget)
          prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "user_login",
              entity: "session",
              metadata: { email: user.email },
            },
          }).catch((e) => console.warn("[AUTH] audit log failed (non-fatal):", e?.message))

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
          console.error("[AUTH] authorize fatal error:", error instanceof Error ? error.message : String(error))
          console.error("[AUTH] fatal stack:", error instanceof Error ? error.stack : "no stack")
          return null
        }
      },
    }),
  ],
  callbacks: {
    ...authEdgeConfig.callbacks,

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
