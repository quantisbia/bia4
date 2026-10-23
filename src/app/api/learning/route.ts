/**
 * R26 · /api/learning — espelho persistente da tabela de aprendizado.
 * GET  → linhas do usuário (últimas 500)
 * POST → upsert de uma linha (id vem do cliente; idempotente)
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

export const runtime = "nodejs"

const rowSchema = z.object({
  id: z.string().min(3).max(64),
  createdAt: z.number().optional(),
  material: z.string().min(1).max(200),
  materialKey: z.string().min(1).max(200),
  application: z.string().min(1).max(40),
  geometryId: z.string().max(120).nullable().optional(),
  params: z.record(z.string(), z.unknown()),
  flowed: z.boolean(),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional().default(""),
  symptoms: z.array(z.string()).optional(),
  adjustments: z.array(z.unknown()).optional(),
  effectiveFactor: z.number().min(0).max(50),
})

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const rows = await prisma.printLearning.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 })
  return NextResponse.json({ rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.getTime() })) })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  const parsed = rowSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Linha inválida", details: parsed.error.flatten() }, { status: 400 })
  const r = parsed.data
  const data = {
    userId, material: r.material, materialKey: r.materialKey, application: r.application, geometryId: r.geometryId ?? null,
    params: r.params as Prisma.InputJsonValue, flowed: r.flowed, rating: r.rating, text: r.text ?? "",
    symptoms: (r.symptoms ?? []) as Prisma.InputJsonValue, adjustments: (r.adjustments ?? []) as Prisma.InputJsonValue,
    effectiveFactor: r.effectiveFactor, createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
  }
  await prisma.printLearning.upsert({ where: { id: r.id }, create: { id: r.id, ...data }, update: data })
  return NextResponse.json({ ok: true, id: r.id })
}
