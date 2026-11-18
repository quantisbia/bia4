/**
 * R39 · Ponte tablet ↔ notebook (Impressão Básica)
 * ───────────────────────────────────────────────
 * O NOTEBOOK (host) tem a USB (Web Serial). O TABLET (client, iPad/Android) não tem.
 * Ambos conversam via este endpoint, com polling curto (≈700 ms). Sem WebSocket (Vercel serverless).
 *
 *   POST { op: "create", hostLabel }               → host cria sessão, recebe { code, sessionId }
 *   POST { op: "join", code }                      → client entra; recebe { sessionId, state }
 *   POST { op: "cmd", sessionId, action, payload } → client enfileira comando
 *   POST { op: "host-sync", sessionId, state, results: [{id, status, result}] }
 *                                                  → host publica estado e marca comandos executados;
 *                                                    recebe os comandos pendentes (claim atômico)
 *   POST { op: "client-sync", sessionId, since }   → client recebe estado + status dos seus comandos
 *   POST { op: "close", sessionId }                → encerra
 *
 * Segurança: todas as ops exigem login; a sessão pertence ao usuário que a criou e só esse usuário
 * (mesma conta logada no iPad) pode entrar. Código de 6 dígitos expira em 4 h. Ações permitidas
 * são uma lista fechada (sem G-code arbitrário vindo do tablet, exceto "raw" limitado a 1 linha
 * sem M112/M502/M500).
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ACTIONS = ["jog", "zero", "goZero", "home", "flow", "speed", "babyZ", "extrude", "valve", "start", "stop", "pause", "resume", "rearm", "loadSyringe", "setHead", "raw"] as const
const bodySchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create"), hostLabel: z.string().max(80).optional() }),
  z.object({ op: z.literal("join"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ op: z.literal("cmd"), sessionId: z.string(), action: z.enum(ACTIONS), payload: z.record(z.unknown()).optional() }),
  z.object({ op: z.literal("host-sync"), sessionId: z.string(), state: z.record(z.unknown()).optional(), results: z.array(z.object({ id: z.string(), status: z.enum(["done", "error"]), result: z.string().max(500).optional() })).max(50).optional() }),
  z.object({ op: z.literal("client-sync"), sessionId: z.string(), since: z.number().int().nonnegative().optional() }),
  z.object({ op: z.literal("close"), sessionId: z.string() }),
])

const TTL_MS = 4 * 60 * 60 * 1000
const HOST_STALE_MS = 8000
const code6 = () => String(Math.floor(100000 + Math.random() * 900000))

export async function POST(req: NextRequest) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido", issues: parsed.error.issues }, { status: 400 })
  const b = parsed.data
  const now = new Date()

  // limpeza oportunista de sessões expiradas do usuário
  await prisma.printRemoteSession.deleteMany({ where: { userId, expiresAt: { lt: now } } }).catch(() => {})

  if (b.op === "create") {
    // encerra sessões anteriores do mesmo usuário (uma impressora por vez no básico)
    await prisma.printRemoteSession.deleteMany({ where: { userId } })
    let code = code6()
    for (let i = 0; i < 5; i++) { const clash = await prisma.printRemoteSession.findUnique({ where: { code } }); if (!clash) break; code = code6() }
    const s = await prisma.printRemoteSession.create({ data: { code, userId, hostLabel: b.hostLabel ?? null, expiresAt: new Date(now.getTime() + TTL_MS), state: {} } })
    return NextResponse.json({ ok: true, sessionId: s.id, code: s.code, expiresAt: s.expiresAt })
  }

  if (b.op === "join") {
    const s = await prisma.printRemoteSession.findUnique({ where: { code: b.code } })
    if (!s || s.expiresAt < now) return NextResponse.json({ error: "Código inválido ou expirado." }, { status: 404 })
    if (s.userId !== userId) return NextResponse.json({ error: "Este código pertence a outra conta. Entre no tablet com a mesma conta do notebook." }, { status: 403 })
    const hostOnline = now.getTime() - s.hostSeenAt.getTime() < HOST_STALE_MS
    await prisma.printRemoteSession.update({ where: { id: s.id }, data: { clientSeenAt: now } })
    return NextResponse.json({ ok: true, sessionId: s.id, hostLabel: s.hostLabel, hostOnline, state: s.state })
  }

  // ops que exigem sessão do próprio usuário
  const s = await prisma.printRemoteSession.findUnique({ where: { id: b.sessionId } })
  if (!s || s.userId !== userId) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 })
  if (s.expiresAt < now) return NextResponse.json({ error: "Sessão expirada." }, { status: 410 })

  if (b.op === "cmd") {
    if (b.action === "raw") {
      const line = String((b.payload as { line?: unknown } | undefined)?.line ?? "").trim()
      if (!line || line.length > 80 || /\n|M112|M502|M500|M303|M999/i.test(line)) return NextResponse.json({ error: "Comando não permitido." }, { status: 400 })
    }
    const last = await prisma.printRemoteCommand.findFirst({ where: { sessionId: s.id }, orderBy: { seq: "desc" }, select: { seq: true } })
    const c = await prisma.printRemoteCommand.create({ data: { sessionId: s.id, seq: (last?.seq ?? 0) + 1, action: b.action, payload: (b.payload ?? null) as Prisma.InputJsonValue } })
    await prisma.printRemoteSession.update({ where: { id: s.id }, data: { clientSeenAt: now } })
    return NextResponse.json({ ok: true, id: c.id, seq: c.seq })
  }

  if (b.op === "host-sync") {
    const data: Prisma.PrintRemoteSessionUpdateInput = { hostSeenAt: now }
    if (b.state) data.state = b.state as Prisma.InputJsonValue
    await prisma.printRemoteSession.update({ where: { id: s.id }, data })
    if (b.results?.length) {
      await Promise.all(b.results.map((r) => prisma.printRemoteCommand.updateMany({ where: { id: r.id, sessionId: s.id }, data: { status: r.status, result: r.result ?? null, doneAt: now } })))
    }
    // claim: pending → running (evita executar 2× se o host fizer 2 polls paralelos)
    const pending = await prisma.printRemoteCommand.findMany({ where: { sessionId: s.id, status: "pending" }, orderBy: { seq: "asc" }, take: 20 })
    if (pending.length) await prisma.printRemoteCommand.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: "running" } })
    const clientOnline = !!s.clientSeenAt && now.getTime() - s.clientSeenAt.getTime() < HOST_STALE_MS
    return NextResponse.json({ ok: true, commands: pending.map((p) => ({ id: p.id, seq: p.seq, action: p.action, payload: p.payload })), clientOnline, code: s.code })
  }

  if (b.op === "client-sync") {
    await prisma.printRemoteSession.update({ where: { id: s.id }, data: { clientSeenAt: now } })
    const recent = await prisma.printRemoteCommand.findMany({ where: { sessionId: s.id, seq: { gt: b.since ?? 0 } }, orderBy: { seq: "asc" }, take: 50, select: { id: true, seq: true, action: true, status: true, result: true } })
    const hostOnline = now.getTime() - s.hostSeenAt.getTime() < HOST_STALE_MS
    return NextResponse.json({ ok: true, state: s.state, hostOnline, hostLabel: s.hostLabel, commands: recent })
  }

  if (b.op === "close") {
    await prisma.printRemoteSession.delete({ where: { id: s.id } }).catch(() => {})
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: "op desconhecida" }, { status: 400 })
}
