/**
 * BIA v4 – Admin API: Audit Logs
 * GET /api/admin/audit?page=1&limit=30&action=&userId=
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/admin"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "30"))
  const action = searchParams.get("action") ?? ""
  const userId = searchParams.get("userId") ?? ""

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (action) where.action = { contains: action }
  if (userId) where.userId = userId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        ip: true,
        createdAt: true,
        userId: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  // Enriquecer com nome/email do user
  const seen = new Set<string>()
  const userIds: string[] = []
  for (const l of logs) {
    if (l.userId && !seen.has(l.userId)) { seen.add(l.userId); userIds.push(l.userId) }
  }
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map(u => [u.id, u]))

  const enriched = logs.map(l => ({
    ...l,
    user: l.userId ? userMap.get(l.userId) ?? null : null,
  }))

  return NextResponse.json({
    logs: enriched,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  })
}
