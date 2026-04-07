/**
 * BIA v4 – Admin API: User detail + actions
 * GET    /api/admin/users/[id]          → perfil completo
 * PATCH  /api/admin/users/[id]          → atualizar plano, créditos, role
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { prisma } from "@/lib/db/prisma"
import { PLAN_CREDITS } from "@/lib/db/queries"
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client"

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      subscription: true,
      creditBalance: true,
      _count: {
        select: {
          pipelineProjects: true,
          protocols: true,
          chatSessions: true,
          notebookEntries: true,
          creditTxns: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  // Histórico de créditos (últimas 30 transações)
  const creditHistory = await prisma.creditTransaction.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      amount: true,
      balance: true,
      description: true,
      metadata: true,
      createdAt: true,
    },
  })

  // Últimas sessões de acesso
  const sessions = await prisma.session.findMany({
    where: { userId: params.id },
    orderBy: { expires: "desc" },
    take: 10,
    select: { expires: true, sessionToken: true },
  })

  // Últimos projetos pipeline
  const pipelines = await prisma.pipelineProject.findMany({
    where: { userId: params.id },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      tissueType: true,
      status: true,
      completionRate: true,
      currentStage: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Audit logs do usuário
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      metadata: true,
      ip: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    user,
    creditHistory,
    sessions,
    pipelines,
    auditLogs,
  })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session: adminSession } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const { action } = body

  const adminEmail = adminSession?.user?.email ?? "admin"

  try {
    // ── Ação: upgrade de plano ─────────────────────────────────────────────
    if (action === "upgrade_plan") {
      const { plan, note } = body as {
        plan: SubscriptionPlan
        note?: string
      }

      if (!Object.values(SubscriptionPlan).includes(plan)) {
        return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
      }

      const monthlyCredits = PLAN_CREDITS[plan]
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      // Upsert subscription
      await prisma.subscription.upsert({
        where: { userId: params.id },
        update: {
          plan,
          status: SubscriptionStatus.ACTIVE,
          monthlyCredits,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
        create: {
          userId: params.id,
          plan,
          status: SubscriptionStatus.ACTIVE,
          monthlyCredits,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      })

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: params.id,
          action: "admin_upgrade_plan",
          entity: "subscription",
          metadata: { plan, note, adminEmail },
        },
      })

      return NextResponse.json({
        ok: true,
        message: `Plano atualizado para ${plan}`,
      })
    }

    // ── Ação: adicionar créditos ───────────────────────────────────────────
    if (action === "add_credits") {
      const { amount, description, reason } = body as {
        amount: number
        description?: string
        reason?: string
      }

      if (!amount || amount <= 0 || amount > 100000) {
        return NextResponse.json(
          { error: "Quantidade inválida (1–100.000)" },
          { status: 400 }
        )
      }

      const desc = description || reason || `Créditos adicionados por ${adminEmail}`

      // Busca saldo atual
      const cb = await prisma.creditBalance.findUnique({
        where: { userId: params.id },
      })
      const currentBalance = cb?.balance ?? 0
      const newBalance = currentBalance + amount

      // Upsert saldo
      await prisma.creditBalance.upsert({
        where: { userId: params.id },
        update: {
          balance: newBalance,
          totalEarned: { increment: amount },
        },
        create: {
          userId: params.id,
          balance: newBalance,
          totalEarned: newBalance,
          totalSpent: 0,
        },
      })

      // Registrar transação
      await prisma.creditTransaction.create({
        data: {
          userId: params.id,
          type: "CREDIT",
          amount,
          balance: newBalance,
          description: desc,
          metadata: { adminEmail, reason },
        },
      })

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: params.id,
          action: "admin_add_credits",
          entity: "credit_balance",
          metadata: { amount, newBalance, desc, adminEmail },
        },
      })

      return NextResponse.json({
        ok: true,
        message: `${amount} créditos adicionados (novo saldo: ${newBalance})`,
        newBalance,
      })
    }

    // ── Ação: alterar role ─────────────────────────────────────────────────
    if (action === "change_role") {
      const { role } = body as { role: string }
      const validRoles = ["USER", "RESEARCHER", "ADMIN"]
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Role inválida" }, { status: 400 })
      }

      await prisma.user.update({
        where: { id: params.id },
        data: { role: role as "USER" | "RESEARCHER" | "ADMIN" },
      })

      await prisma.auditLog.create({
        data: {
          userId: params.id,
          action: "admin_change_role",
          entity: "user",
          metadata: { role, adminEmail },
        },
      })

      return NextResponse.json({ ok: true, message: `Role alterada para ${role}` })
    }

    // ── Ação: atualizar status da subscription ─────────────────────────────
    if (action === "change_status") {
      const { status } = body as { status: SubscriptionStatus }
      const validStatuses = Object.values(SubscriptionStatus)
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Status inválido" }, { status: 400 })
      }

      await prisma.subscription.updateMany({
        where: { userId: params.id },
        data: { status },
      })

      await prisma.auditLog.create({
        data: {
          userId: params.id,
          action: "admin_change_status",
          entity: "subscription",
          metadata: { status, adminEmail },
        },
      })

      return NextResponse.json({ ok: true, message: `Status atualizado para ${status}` })
    }

    // ── Ação: atualizar perfil do usuário ──────────────────────────────────
    if (action === "update_profile") {
      const { name, institution, researchArea, bio } = body
      await prisma.user.update({
        where: { id: params.id },
        data: { name, institution, researchArea, bio },
      })
      await prisma.auditLog.create({
        data: {
          userId: params.id,
          action: "admin_update_profile",
          entity: "user",
          metadata: { adminEmail },
        },
      })
      return NextResponse.json({ ok: true, message: "Perfil atualizado" })
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 })
  } catch (err) {
    console.error("[ADMIN PATCH]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
