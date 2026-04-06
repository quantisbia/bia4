import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { getUserByEmail } from "@/lib/db/queries"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha muito curta"),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          plan: user.subscription?.plan ?? "FREE",
          credits: user.creditBalance?.balance ?? 0,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, attach user data to token
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? "USER"
        token.plan = (user as { plan?: string }).plan ?? "FREE"
        token.credits = (user as { credits?: number }).credits ?? 0
      }

      // On session update trigger, refresh user data from DB
      if (trigger === "update" && session) {
        const freshUser = await getUserByEmail(token.email as string)
        if (freshUser) {
          token.credits = freshUser.creditBalance?.balance ?? 0
          token.plan = freshUser.subscription?.plan ?? "FREE"
          token.name = freshUser.name
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
  events: {
    async createUser({ user }) {
      // Auto-create credit balance and FREE subscription for new users
      if (!user.id) return
      await Promise.all([
        prisma.subscription.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            plan: "FREE",
            status: "TRIALING",
            currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            monthlyCredits: 50,
          },
        }),
        prisma.creditBalance.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            balance: 50,
            totalEarned: 50,
            totalSpent: 0,
          },
        }),
      ])
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
})
