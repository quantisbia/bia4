/**
 * BIA v4 – Admin API: Users list
 * GET /api/admin/users
 * Parâmetros: ?page=1&limit=20&search=&plan=&status=&sort=createdAt&order=desc
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit   = Math.min(100, parseInt(searchParams.get("limit") ?? "20"))
  const search  = searchParams.get("search")?.trim() ?? ""
  const plan    = searchParams.get("plan") ?? ""
  const status  = searchParams.get("status") ?? ""
  const sort    = searchParams.get("sort") ?? "createdAt"
  const order   = (searchParams.get("order") ?? "desc") as "asc" | "desc"

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (search) {
    where.OR = [
      { name:  { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { institution: { contains: search, mode: "insensitive" } },
    ]
  }

  if (plan) {
    where.subscription = { plan }
  }

  if (status) {
    if (where.subscription) {
      where.subscription.status = status
    } else {
      where.subscription = { status }
    }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: sort === "credits"
        ? { creditBalance: { balance: order } }
        : sort === "plan"
        ? { subscription: { plan: order } }
        : { [sort]: order },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        institution: true,
        researchArea: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            trialEndsAt: true,
            cancelledAt: true,
            monthlyCredits: true,
            externalId: true,
            createdAt: true,
          },
        },
        creditBalance: {
          select: {
            balance: true,
            totalEarned: true,
            totalSpent: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            pipelineProjects: true,
            protocols: true,
            chatSessions: true,
            notebookEntries: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  // Busca última sessão de cada user
  const userIds = users.map(u => u.id)
  const lastSessions = await prisma.session.findMany({
    where: { userId: { in: userIds } },
    orderBy: { expires: "desc" },
    select: { userId: true, expires: true },
  })

  // Busca últimas transações de crédito
  const lastTxns = await prisma.creditTransaction.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["userId"],
    select: { userId: true, type: true, amount: true, description: true, createdAt: true },
  })

  const sessionMap = new Map(lastSessions.map(s => [s.userId, s.expires]))
  const txnMap = new Map(lastTxns.map(t => [t.userId, t]))

  const enriched = users.map(u => ({
    ...u,
    lastLogin: sessionMap.get(u.id) ?? null,
    lastActivity: txnMap.get(u.id) ?? null,
  }))

  return NextResponse.json({
    users: enriched,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  })
}
