import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

// Middleware: only ADMIN role
async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  if (session.user.role !== "ADMIN") return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") ?? "overview"

  try {
    if (type === "overview") {
      const [
        totalUsers,
        activeUsers,
        totalPipelines,
        totalChats,
        totalProtocols,
        totalCreditsSpent,
        planDistribution,
        recentUsers,
        recentActivity,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        }),
        prisma.pipelineProject.count(),
        prisma.chatSession.count(),
        prisma.protocol.count(),
        prisma.creditTransaction.aggregate({
          where: { type: "DEBIT" },
          _sum: { amount: true },
        }),
        prisma.subscription.groupBy({
          by: ["plan"],
          _count: { plan: true },
        }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            subscription: true,
            creditBalance: true,
            _count: {
              select: {
                pipelineProjects: true,
                chatSessions: true,
                protocols: true,
              },
            },
          },
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ])

      return NextResponse.json({
        overview: {
          totalUsers,
          activeUsers,
          totalPipelines,
          totalChats,
          totalProtocols,
          totalCreditsSpent: Math.abs(totalCreditsSpent._sum.amount ?? 0),
        },
        planDistribution,
        recentUsers,
        recentActivity,
      })
    }

    if (type === "users") {
      const page = parseInt(searchParams.get("page") ?? "1")
      const limit = parseInt(searchParams.get("limit") ?? "20")
      const search = searchParams.get("search") ?? ""

      const where = search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { institution: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            subscription: true,
            creditBalance: true,
            _count: {
              select: {
                pipelineProjects: true,
                chatSessions: true,
                protocols: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ])

      return NextResponse.json({ users, total, page, limit })
    }

    if (type === "activity") {
      const limit = parseInt(searchParams.get("limit") ?? "50")
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return NextResponse.json({ logs })
    }

    if (type === "credits") {
      const data = await prisma.creditTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { name: true, email: true } } },
      })
      return NextResponse.json({ transactions: data })
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
  } catch (error) {
    console.error("[ADMIN STATS]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
