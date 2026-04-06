import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getUserByEmail } from "@/lib/db/queries"

const registerSchema = z.object({
  firstName: z.string().min(2, "Nome muito curto"),
  lastName: z.string().min(2, "Sobrenome muito curto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  institution: z.string().optional(),
  researchArea: z.string().optional(),
  terms: z.string().or(z.boolean()),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password, institution, researchArea } = parsed.data

    // Check if email already exists
    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: "Este email já está em uso." },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with subscription + credits in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: `${firstName} ${lastName}`.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
          institution: institution || null,
          researchArea: researchArea || null,
          emailVerified: new Date(), // Skip email verification for now
          role: "USER",
        },
      })

      // Create FREE subscription (demo: 10 credits)
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: "FREE",
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          monthlyCredits: 10,
        },
      })

      // Create initial credit balance (10 demo credits)
      await tx.creditBalance.create({
        data: {
          userId: newUser.id,
          balance: 10,
          totalEarned: 10,
          totalSpent: 0,
        },
      })

      // Log welcome credits
      await tx.creditTransaction.create({
        data: {
          userId: newUser.id,
          type: "CREDIT",
          amount: 10,
          balance: 10,
          description: "Créditos de demonstração BIA v4",
          metadata: { action: "demo_credits" },
        },
      })

      return newUser
    })

    return NextResponse.json(
      {
        success: true,
        message: "Conta criada com sucesso!",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[REGISTER] Error:", error)
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    )
  }
}
