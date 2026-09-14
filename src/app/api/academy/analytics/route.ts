/**
 * BIA · Academy · API de analytics mínimo — R13.02
 *
 * POST /api/academy/analytics    → registra 1 evento (fire-and-forget)
 * GET  /api/academy/analytics    → resumo agregado (só ADMIN/INSTRUCTOR)
 *
 * Sem cookies, sem Google Analytics — dados ficam no Postgres (Neon)
 * para o time comercial ver funil sem depender de terceiros.
 *
 * userId é OPCIONAL: visitante anônimo em /academy (landing pública)
 * fica com userId = null. Se estiver logado, capturamos automaticamente
 * da sessão NextAuth.
 *
 * IMPORTANTE: rate limit simples via check de sanidade — payload é
 * pequeno e o event é enum-like. Sem persistir IP ou user agent
 * (privacidade first).
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

// Vocabulário de eventos conhecidos — mantém consistência para agregações.
// A API aceita eventos fora dessa lista (para não travar experimentos),
// mas normaliza tudo com trim() + max 100 chars.
const KNOWN_EVENTS = [
  // Landing pública
  "landing_viewed",
  "cta_asaas_clicked",       // clique no CTA principal (curso online)
  "cta_whatsapp_clicked",    // CTA corporativo
  "cta_login_clicked",
  "module_preview_clicked",  // clique em um card de módulo
  "faq_expanded",
  // Onboarding
  "onboarding_started",
  "onboarding_completed",
  "onboarding_skipped",
  // Dashboard aluno (R13.03+)
  "lesson_opened",
  "bia_hook_opened",
  "quiz_started",
  "quiz_completed",
] as const

const postSchema = z.object({
  event:    z.string().min(1).max(100),
  path:     z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

// ─── POST ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Session é OPCIONAL (visitantes anônimos podem enviar events)
  const session = await auth().catch(() => null)
  const userId = session?.user?.id ?? null

  const eventNorm = parsed.data.event.trim().slice(0, 100)

  try {
    await prisma.academyAnalytics.create({
      data: {
        event: eventNorm,
        userId,
        path: parsed.data.path ?? null,
        metadata: (parsed.data.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    })
  } catch (e) {
    // Analytics não deve derrubar a UX — loga silencioso e retorna 202
    console.error("[academy/analytics] falha ao gravar evento:", e)
    return NextResponse.json({ accepted: false }, { status: 202 })
  }

  // 204 = evento aceito, sem body (fire-and-forget bem comportado)
  return new NextResponse(null, { status: 204 })
}

// ─── GET (dashboard agregado — restrito a ADMIN/INSTRUCTOR) ────

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const role = session.user.role
  if (role !== "ADMIN" && role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
  }

  const url = new URL(req.url)
  const since = url.searchParams.get("since") // ISO date opcional
  const cutoff = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Agrega por evento nos últimos 30 dias (ou desde o cutoff)
  const grouped = await prisma.academyAnalytics.groupBy({
    by: ["event"],
    where: { createdAt: { gte: cutoff } },
    _count: { event: true },
    orderBy: { _count: { event: "desc" } },
  })

  const total = grouped.reduce((sum, g) => sum + g._count.event, 0)

  return NextResponse.json({
    since: cutoff.toISOString(),
    total,
    events: grouped.map((g) => ({
      event: g.event,
      count: g._count.event,
      known: (KNOWN_EVENTS as readonly string[]).includes(g.event),
    })),
  })
}
