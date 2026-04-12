import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { createOrUpdateSubscription, getUserSubscription } from "@/lib/db/queries"
import { z } from "zod"
import { SubscriptionPlan } from "@prisma/client"

// GET /api/billing — dados da assinatura atual
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const subscription = await getUserSubscription(session.user.id)

    return NextResponse.json({
      subscription: subscription ?? {
        plan: "FREE",
        status: "TRIALING",
        monthlyCredits: 50,
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
  } catch (error) {
    console.error("[BILLING GET]", error)
    return NextResponse.json({ error: "Erro ao buscar assinatura" }, { status: 500 })
  }
}

// POST /api/billing — simular upgrade de plano (mock — sem Stripe ainda)
const upgradeSchema = z.object({
  plan: z.enum(["FREE", "ORGANOID_LAB", "DISCOVERY", "ADVANCED", "ENTERPRISE", "ACADEMY"]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = upgradeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
    }

    const { plan } = parsed.data

    // In production, this would redirect to Stripe checkout
    // For now, directly upgrade the plan (demo mode)
    const subscription = await createOrUpdateSubscription(
      session.user.id,
      plan as SubscriptionPlan
    )

    return NextResponse.json({
      success: true,
      subscription,
      message: `Plano atualizado para ${plan} com sucesso!`,
    })
  } catch (error) {
    console.error("[BILLING POST]", error)
    return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 })
  }
}
