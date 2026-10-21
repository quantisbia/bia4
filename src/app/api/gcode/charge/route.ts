/**
 * BIA v4 · R20 · POST /api/gcode/charge
 * ─────────────────────────────────────
 * Cobrança + auditoria de UM G-code gerado pelo BioSlicer (fatiamento roda no
 * browser; o servidor só debita 6 créditos e registra o resumo). Substitui a
 * cobrança que vivia em /api/gcode/generate (engine antigo, removido).
 *
 * Body: { summary: { jobName, profileId, infill, layerCount, volume_uL, time_s,
 *         target, wells, tools, materialIds[], meshName, geometryId } }
 * 200 → { ok: true, charged: 6 | 0 (admin) }
 * 402 → INSUFFICIENT_CREDITS (frontend NÃO libera download/handoff)
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits, CREDIT_COSTS } from "@/lib/auth/credits"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

export const runtime = "nodejs"

const summarySchema = z.object({
  jobName: z.string().max(200).optional(),
  profileId: z.string().max(100).optional(),
  infill: z.string().max(50).optional(),
  infillDensity: z.number().optional(),
  layerCount: z.number().int().nonnegative().optional(),
  volume_uL: z.number().nonnegative().optional(),
  time_s: z.number().nonnegative().optional(),
  target: z.string().max(50).optional(),
  wells: z.number().int().nonnegative().optional(),
  tools: z.number().int().min(1).max(4).optional(),
  materialIds: z.array(z.string().max(60)).max(4).optional(),
  meshName: z.string().max(200).optional(),
  geometryId: z.string().max(100).optional(),
  gcodeLines: z.number().int().nonnegative().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const parsed = z.object({ summary: summarySchema }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", issues: parsed.error.issues }, { status: 400 })
  const s = parsed.data.summary

  const userRole = (session.user as { role?: string }).role
  const desc = `G-code (BioSlicer): ${s.meshName ?? s.geometryId ?? "modelo"} · ${s.infill ?? "?"} ${s.infillDensity ?? ""}% · ${s.wells ?? 1} alvo(s) · ${s.tools ?? 1} cabeçote(s)`
  const check = await requireCredits(session.user.id, "STL_GCODE", desc, s as Prisma.InputJsonValue, userRole)
  if (check) return check.error

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "gcode_generated",
      entity: "gcode",
      metadata: { generator: "bioslicer-r20", ...s } as Prisma.InputJsonValue,
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true, charged: userRole === "ADMIN" ? 0 : CREDIT_COSTS.STL_GCODE })
}
