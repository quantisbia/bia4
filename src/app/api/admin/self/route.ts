/**
 * BIA v4 — Admin Self-Management API
 * GET  /api/admin/self → retorna dados atualizados do admin
 * POST /api/admin/self → admin pode repor seus próprios créditos
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { addCredits } from "@/lib/db/queries"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "ADMIN") return null
  return session
}

// GET — retorna dados atualizados do admin (para sincronizar sessão)
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Acesso negado — apenas ADMIN" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: true,
      creditBalance: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.subscription?.plan ?? "ACADEMY",
    credits: user.creditBalance?.balance ?? 0,
    totalEarned: user.creditBalance?.totalEarned ?? 0,
    totalSpent: user.creditBalance?.totalSpent ?? 0,
    subscriptionStatus: user.subscription?.status ?? "ACTIVE",
    subscriptionEnd: user.subscription?.currentPeriodEnd,
  })
}

// POST — admin pode repor seus próprios créditos ou de qualquer usuário
export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Acesso negado — apenas ADMIN" }, { status: 403 })
  }

  const body = await req.json()
  const { action, targetUserId, amount, note } = body

  if (action === "recharge_self") {
    // Admin recarrega seus próprios créditos para 20000
    const targetBalance = 20000
    const current = await prisma.creditBalance.findUnique({
      where: { userId: session.user.id },
    })

    const currentBalance = current?.balance ?? 0
    if (currentBalance >= targetBalance) {
      return NextResponse.json({
        message: "Créditos já estão em nível máximo",
        balance: currentBalance,
      })
    }

    const topUp = targetBalance - currentBalance
    const newBalance = await addCredits(
      session.user.id,
      topUp,
      "Auto-recarga admin ACADEMY",
      { action: "admin_self_recharge", adminId: session.user.id }
    )

    return NextResponse.json({
      success: true,
      message: `Créditos recarregados: +${topUp}`,
      balance: newBalance,
    })
  }

  if (action === "grant_credits" && targetUserId && amount > 0) {
    // Admin concede créditos a um usuário específico
    const newBalance = await addCredits(
      targetUserId,
      amount,
      note ?? `Créditos concedidos pelo admin`,
      { action: "admin_grant", adminId: session.user.id, amount }
    )

    // Registrar no audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "admin_grant_credits",
        entity: "user",
        entityId: targetUserId,
        metadata: { amount, note, newBalance },
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `${amount} créditos concedidos com sucesso`,
      balance: newBalance,
    })
  }

  if (action === "ensure_admin_setup") {
    // Garante que o admin tem plano ACADEMY e créditos
    await prisma.subscription.upsert({
      where: { userId: session.user.id },
      update: {
        plan: "ACADEMY",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyCredits: 20000,
      },
      create: {
        userId: session.user.id,
        plan: "ACADEMY",
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyCredits: 20000,
      },
    })

    await prisma.creditBalance.upsert({
      where: { userId: session.user.id },
      update: {
        balance: 20000,
        totalEarned: 20000,
      },
      create: {
        userId: session.user.id,
        balance: 20000,
        totalEarned: 20000,
        totalSpent: 0,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Admin configurado: plano ACADEMY + 20.000 créditos",
    })
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
}
