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
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown"

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

      // Create FREE subscription (30 welcome credits)
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: "FREE",
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          monthlyCredits: 30,
        },
      })

      // Create initial credit balance (30 boas-vindas)
      await tx.creditBalance.create({
        data: {
          userId: newUser.id,
          balance: 30,
          totalEarned: 30,
          totalSpent: 0,
        },
      })

      // Log welcome credits
      await tx.creditTransaction.create({
        data: {
          userId: newUser.id,
          type: "CREDIT",
          amount: 30,
          balance: 30,
          description: "Créditos de boas-vindas — Trial BIA (30 créditos)",
          metadata: { action: "welcome_credits", plan: "FREE" },
        },
      })

      // Audit log: user registration
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "user_register",
          entity: "user",
          entityId: newUser.id,
          ip,
          metadata: {
            institution: institution || null,
            researchArea: researchArea || null,
            registeredAt: new Date().toISOString(),
          },
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
    // Log failed attempt
    await prisma.auditLog.create({
      data: {
        action: "user_register_failed",
        ip,
        metadata: { error: String(error).slice(0, 200) },
      },
    }).catch(() => {})

    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    )
  }
}

