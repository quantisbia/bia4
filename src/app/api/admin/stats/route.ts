/**
 * BIA v4 – Admin API: Platform Statistics
 * GET /api/admin/stats
 */

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
  const todayStart    = new Date(now.setHours(0, 0, 0, 0))

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersThisWeek,
    newUsersToday,
    usersByPlan,
    totalCreditsIssued,
    totalCreditsSpent,
    creditsIssuedThisMonth,
    totalPipelines,
    totalProtocols,
    totalChatSessions,
    totalNotebookEntries,
    activeUsersThisWeek,
    recentTransactions,
    dailySignups,
  ] = await Promise.all([
    // Totais
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),

    // Usuários por plano
    prisma.subscription.groupBy({
      by: ["plan", "status"],
      _count: { id: true },
    }),

    // Créditos totais
    prisma.creditBalance.aggregate({ _sum: { totalEarned: true } }),
    prisma.creditBalance.aggregate({ _sum: { totalSpent: true } }),
    prisma.creditTransaction.aggregate({
      where: { type: "CREDIT", createdAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }),

    // Uso da plataforma
    prisma.pipelineProject.count(),
    prisma.protocol.count(),
    prisma.chatSession.count(),
    prisma.notebookEntry.count(),

    // Usuários ativos esta semana (com transações)
    prisma.creditTransaction.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),

    // Últimas 15 transações de crédito
    prisma.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        type: true,
        amount: true,
        balance: true,
        description: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),

    // Cadastros por dia (últimos 30 dias)
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT
        DATE_TRUNC('day', "created_at")::date::text AS date,
        COUNT(*) AS count
      FROM users
      WHERE "created_at" >= ${thirtyDaysAgo}
      GROUP BY 1
      ORDER BY 1
    `,
  ])

  // Receita estimada
  const planRevenue: Record<string, number> = {
    FREE: 0, DISCOVERY: 270, ADVANCED: 490, ENTERPRISE: 990, ACADEMY: 4970,
  }

  const revenueByPlan = usersByPlan.reduce((acc, r) => {
    if (r.status === "ACTIVE") {
      acc[r.plan] = (acc[r.plan] ?? 0) + (planRevenue[r.plan] ?? 0) * r._count.id
    }
    return acc
  }, {} as Record<string, number>)

  const totalMRR = Object.values(revenueByPlan).reduce((a, b) => a + b, 0)

  // Usuários sem subscription (FREE implícito)
  const usersWithSub = usersByPlan.reduce((acc, r) => acc + r._count.id, 0)
  const freeImplicit = totalUsers - usersWithSub

  return NextResponse.json({
    overview: {
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      newUsersToday,
      activeUsersThisWeek: activeUsersThisWeek.length,
    },
    plans: {
      breakdown: usersByPlan,
      freeImplicit,
    },
    credits: {
      totalIssued:       totalCreditsIssued._sum.totalEarned  ?? 0,
      totalSpent:        totalCreditsSpent._sum.totalSpent     ?? 0,
      issuedThisMonth:   creditsIssuedThisMonth._sum.amount    ?? 0,
    },
    usage: {
      totalPipelines,
      totalProtocols,
      totalChatSessions,
      totalNotebookEntries,
    },
    revenue: {
      mrr: totalMRR,
      byPlan: revenueByPlan,
    },
    recentTransactions,
    dailySignups: dailySignups.map(d => ({
      date: d.date,
      count: Number(d.count),
    })),
  })
}
