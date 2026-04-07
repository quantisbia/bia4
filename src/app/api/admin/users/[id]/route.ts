import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "ADMIN") return null
  return session
}

// GET /api/admin/users/:id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      subscription: true,
      creditBalance: true,
      creditTxns: { orderBy: { createdAt: "desc" }, take: 20 },
      pipelineProjects: { orderBy: { createdAt: "desc" }, take: 5 },
      chatSessions: { orderBy: { createdAt: "desc" }, take: 5 },
      protocols: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  })

  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  return NextResponse.json(user)
}

// PATCH /api/admin/users/:id — update role, plan, credits
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const body = await req.json()
  const { role, plan, addCredits, note } = body

  try {
    if (role) {
      await prisma.user.update({
        where: { id: params.id },
        data: { role },
      })
    }

    if (plan) {
      const PLAN_CREDITS: Record<string, number> = {
        FREE: 10, DISCOVERY: 500, ADVANCED: 1500, ENTERPRISE: 5000, ACADEMY: 20000,
      }
      const credits = PLAN_CREDITS[plan] ?? 10
      await prisma.subscription.upsert({
        where: { userId: params.id },
        create: {
          userId: params.id,
          plan,
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          monthlyCredits: credits,
        },
        update: {
          plan,
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          monthlyCredits: credits,
        },
      })
    }

    if (addCredits && addCredits > 0) {
      await prisma.creditBalance.upsert({
        where: { userId: params.id },
        create: {
          userId: params.id,
          balance: addCredits,
          totalEarned: addCredits,
          totalSpent: 0,
        },
        update: {
          balance: { increment: addCredits },
          totalEarned: { increment: addCredits },
        },
      })
      const newBal = await prisma.creditBalance.findUnique({ where: { userId: params.id } })
      await prisma.creditTransaction.create({
        data: {
          userId: params.id,
          type: "CREDIT",
          amount: addCredits,
          balance: newBal?.balance ?? addCredits,
          description: note ?? `Créditos adicionados pelo admin`,
          metadata: { action: "admin_credit_grant", adminId: session.user.id },
        },
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "admin_user_update",
        entity: "user",
        entityId: params.id,
        metadata: { changes: body },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN USER UPDATE]", error)
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 })
  }
}
