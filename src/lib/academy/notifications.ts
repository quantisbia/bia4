/**
 * BIA · Academy · R28 · Notificações para alunos ("material novo")
 * ─────────────────────────────────────────────────────────────────
 *   · createNotification(): grava o aviso (aparece no sininho de todos
 *     os alunos com matrícula ativa) e, se pedido, envia e-mail via Resend
 *     para quem tem notifyEmail = true.
 *   · E-mails saem individualmente (um por aluno) com link de descadastro
 *     assinado (HMAC) — sem precisar de login para desligar.
 *   · Não depende de SDK: fetch direto na API do Resend (mesmo padrão de
 *     send-password-reset.ts). Sem RESEND_API_KEY → só grava, não envia.
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"

export type NotificationKind = "NEW_MATERIAL" | "NEW_LESSON" | "ANNOUNCEMENT"

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  NEW_MATERIAL: "Material novo",
  NEW_LESSON: "Aula publicada",
  ANNOUNCEMENT: "Aviso",
}

const SITE = (process.env.NEXTAUTH_URL || "https://biaquantis.bio").replace(/\/$/, "")
const FROM = process.env.RESEND_FROM_EMAIL || "BIA Academy <contato@biaquantis.bio>"
const REPLY_TO = process.env.ACADEMY_REPLY_TO || "janaina.dernowsek@quantis.bio"

// ─── Descadastro assinado ─────────────────────────────────────────────
function secret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "bia-dev-secret"
}
export function unsubscribeToken(enrollmentId: string): string {
  return createHmac("sha256", secret()).update(`unsub:${enrollmentId}`).digest("base64url").slice(0, 32)
}
export function verifyUnsubscribeToken(enrollmentId: string, token: string): boolean {
  const a = Buffer.from(unsubscribeToken(enrollmentId)); const b = Buffer.from(token || "")
  return a.length === b.length && timingSafeEqual(a, b)
}
export function unsubscribeUrl(enrollmentId: string): string {
  return `${SITE}/api/academy/notifications/unsubscribe?e=${encodeURIComponent(enrollmentId)}&t=${unsubscribeToken(enrollmentId)}`
}

// ─── Template de e-mail ───────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
function firstName(n: string | null | undefined, email: string): string {
  const base = (n ?? "").replace(/^(Dra?\.|Dr\.)\s+/, "").trim()
  if (!base || base.toLowerCase() === email.split("@")[0].toLowerCase()) return "olá"
  const f = base.split(/\s+/)[0]
  return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()
}

export interface EmailInput {
  kind: NotificationKind
  title: string
  body: string
  url?: string | null
  lessonTitle?: string | null
  moduleTitle?: string | null
  files?: Array<{ title: string; sizeBytes: number }>
}

export function renderNotificationEmail(inp: EmailInput, to: { name: string | null; email: string; enrollmentId: string }): { subject: string; html: string; text: string } {
  const kindLabel = NOTIFICATION_KIND_LABEL[inp.kind]
  const link = inp.url ? (inp.url.startsWith("http") ? inp.url : `${SITE}${inp.url}`) : `${SITE}/academy/dashboard`
  const unsub = unsubscribeUrl(to.enrollmentId)
  const hi = firstName(to.name, to.email)
  const subject = `[BIA Academy] ${kindLabel}: ${inp.title}`
  const filesHtml = inp.files && inp.files.length
    ? `<ul style="margin:8px 0 0 0;padding-left:18px;">${inp.files.map((f) => `<li style="padding:3px 0;color:#c7bfe6;font-size:14px;">${esc(f.title)} <span style="color:#8b84a8;font-size:12px;">(${(f.sizeBytes / 1048576).toFixed(1)} MB)</span></li>`).join("")}</ul>`
    : ""
  const where = inp.lessonTitle ? `<p style="margin:0 0 10px 0;font-size:13px;color:#8b84a8;">${esc(inp.moduleTitle ?? "")}${inp.moduleTitle ? " · " : ""}${esc(inp.lessonTitle)}</p>` : ""
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e8e4ff;">
<div style="max-width:620px;margin:0 auto;padding:36px 22px;">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c084fc;font-weight:700;margin-bottom:6px;">BIA Academy · ${esc(kindLabel)}</div>
  <h1 style="margin:0 0 18px 0;font-size:22px;line-height:1.3;color:#fff;">${esc(inp.title)}</h1>
  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px 20px;margin-bottom:20px;">
    <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#c7bfe6;">${hi === "olá" ? "Olá" : `Olá, ${esc(hi)}`}!</p>
    ${where}
    <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#c7bfe6;white-space:pre-line;">${esc(inp.body)}</p>
    ${filesHtml}
  </div>
  <a href="${link}" style="display:inline-block;background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">Abrir na BIA Academy →</a>
  <p style="margin:26px 0 0 0;font-size:12px;line-height:1.6;color:#8b84a8;">Você recebe este e-mail porque está matriculado(a) na BIA Academy. Para não receber avisos de material novo, <a href="${unsub}" style="color:#c084fc;">clique aqui</a> (você continua vendo os avisos dentro da plataforma).</p>
  <p style="margin:6px 0 0 0;font-size:11px;color:#5e5779;">Quantis Biotechnology · <a href="${SITE}" style="color:#8b84a8;">biaquantis.bio</a></p>
</div></body></html>`
  const text = `BIA Academy · ${kindLabel}\n\n${inp.title}\n\n${inp.body}\n${inp.files?.length ? "\n" + inp.files.map((f) => `• ${f.title}`).join("\n") + "\n" : ""}\nAbrir: ${link}\n\nPara não receber e-mails de material novo: ${unsub}`
  return { subject, html, text }
}

// ─── Envio ────────────────────────────────────────────────────────────
const BATCH = 4
const BATCH_PAUSE_MS = 1000
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
async function sendOne(to: string, subject: string, html: string, text: string, unsub: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text,
        headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally { clearTimeout(timer) }
}

export interface CreateNotificationInput {
  kind: NotificationKind
  title: string
  body: string
  url?: string | null
  lessonId?: string | null
  sentById?: string | null
  /** envia e-mail para os alunos com notifyEmail = true (default true) */
  sendEmail?: boolean
  /** só para estes e-mails (teste) */
  onlyEmails?: string[]
}

export interface CreateNotificationResult {
  id: string
  recipients: number
  emailSent: number
  emailFailed: number
  emailSkipped: number
  errors: string[]
  emailConfigured: boolean
}

/** Alunos que devem receber: matrícula ativa (ACTIVE/COMPLETED), não expirada. */
export async function listActiveStudents(): Promise<Array<{ enrollmentId: string; userId: string; email: string; name: string | null; notifyEmail: boolean }>> {
  const rows = await prisma.academyEnrollment.findMany({
    select: { id: true, userId: true, accessUntil: true, completedAt: true, notifyEmail: true, user: { select: { email: true, name: true } } },
  })
  return rows
    .filter((r) => hasAccess(r))
    .map((r) => ({ enrollmentId: r.id, userId: r.userId, email: r.user.email, name: r.user.name, notifyEmail: r.notifyEmail }))
}

export async function createNotification(inp: CreateNotificationInput): Promise<CreateNotificationResult> {
  const lesson = inp.lessonId
    ? await prisma.academyLesson.findUnique({ where: { id: inp.lessonId }, select: { id: true, title: true, slug: true, module: { select: { slug: true, title: true } }, files: { where: { ready: true }, select: { title: true, sizeBytes: true }, orderBy: { createdAt: "asc" } } } })
    : null
  const url = inp.url ?? (lesson ? `/academy/modules/${lesson.module.slug}/${lesson.slug}` : null)

  const n = await prisma.academyNotification.create({
    data: { kind: inp.kind, title: inp.title, body: inp.body, url, lessonId: lesson?.id ?? null, sentById: inp.sentById ?? null },
  })

  const apiKey = process.env.RESEND_API_KEY
  const students = await listActiveStudents()
  const result: CreateNotificationResult = { id: n.id, recipients: students.length, emailSent: 0, emailFailed: 0, emailSkipped: 0, errors: [], emailConfigured: !!apiKey }

  if (inp.sendEmail === false) return result
  if (!apiKey) { result.emailSkipped = students.length; result.errors.push("RESEND_API_KEY ausente — aviso gravado, e-mails não enviados."); return result }

  const only = inp.onlyEmails?.map((e) => e.toLowerCase().trim()).filter(Boolean)
  const emailInput: EmailInput = { kind: inp.kind, title: inp.title, body: inp.body, url, lessonTitle: lesson?.title, moduleTitle: lesson?.module.title, files: lesson?.files }

  // envia em lotes de 4 em paralelo com pausa de 1 s entre lotes (Resend limita a 10 req/s)
  const targets = students.filter((s) => (only ? only.includes(s.email.toLowerCase()) : true))
  for (let i = 0; i < targets.length; i += BATCH) {
    if (i > 0) await sleep(BATCH_PAUSE_MS)
    const batch = targets.slice(i, i + BATCH)
    const outs = await Promise.all(batch.map(async (s) => {
      if (!s.notifyEmail) return { skipped: true as const }
      const { subject, html, text } = renderNotificationEmail(emailInput, { name: s.name, email: s.email, enrollmentId: s.enrollmentId })
      const r = await sendOne(s.email, subject, html, text, unsubscribeUrl(s.enrollmentId), apiKey)
      return { skipped: false as const, ok: r.ok, error: r.error, email: s.email }
    }))
    for (const o of outs) {
      if (o.skipped) result.emailSkipped++
      else if (o.ok) result.emailSent++
      else { result.emailFailed++; if (result.errors.length < 10) result.errors.push(`${o.email}: ${o.error}`) }
    }
  }
  if (only) result.emailSkipped += students.length - targets.length

  await prisma.academyNotification.update({
    where: { id: n.id },
    data: { emailSent: result.emailSent, emailFailed: result.emailFailed, emailSkipped: result.emailSkipped, emailedAt: new Date() },
  })
  return result
}

/** Resumo do aluno: últimas N notificações com flag de lida + contagem de não lidas. */
export async function listForStudent(enrollmentId: string, take = 20) {
  const [items, reads] = await Promise.all([
    prisma.academyNotification.findMany({ orderBy: { createdAt: "desc" }, take, include: { lesson: { select: { title: true, slug: true, module: { select: { slug: true, title: true } } } } } }),
    prisma.academyNotificationRead.findMany({ where: { enrollmentId }, select: { notificationId: true } }),
  ])
  const read = new Set(reads.map((r) => r.notificationId))
  const list = items.map((n) => ({
    id: n.id, kind: n.kind as NotificationKind, title: n.title, body: n.body, url: n.url, createdAt: n.createdAt.toISOString(),
    lesson: n.lesson ? { title: n.lesson.title, moduleTitle: n.lesson.module.title } : null,
    read: read.has(n.id),
  }))
  return { items: list, unread: list.filter((x) => !x.read).length }
}

export async function markRead(enrollmentId: string, notificationIds: string[] | "all") {
  const ids = notificationIds === "all"
    ? (await prisma.academyNotification.findMany({ select: { id: true } })).map((n) => n.id)
    : notificationIds
  if (ids.length === 0) return 0
  const r = await prisma.academyNotificationRead.createMany({
    data: ids.map((notificationId) => ({ notificationId, enrollmentId })),
    skipDuplicates: true,
  })
  return r.count
}

/**
 * Reenvia o e-mail de um aviso JÁ GRAVADO apenas para os endereços informados
 * (ex.: os que falharam por 429). Não cria aviso novo; atualiza os contadores
 * (emailSent += ok, emailFailed = max(0, emailFailed − ok)).
 */
export async function resendNotificationEmails(notificationId: string, emails: string[]): Promise<{ sent: number; failed: number; errors: string[] }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { sent: 0, failed: emails.length, errors: ["RESEND_API_KEY ausente"] }
  const n = await prisma.academyNotification.findUnique({
    where: { id: notificationId },
    include: { lesson: { select: { title: true, module: { select: { title: true } }, files: { where: { ready: true }, select: { title: true, sizeBytes: true }, orderBy: { createdAt: "asc" } } } } },
  })
  if (!n) throw new Error("aviso não encontrado")
  const want = new Set(emails.map((e) => e.toLowerCase().trim()))
  const targets = (await listActiveStudents()).filter((s) => want.has(s.email.toLowerCase()) && s.notifyEmail)
  const emailInput: EmailInput = { kind: n.kind as NotificationKind, title: n.title, body: n.body, url: n.url, lessonTitle: n.lesson?.title, moduleTitle: n.lesson?.module.title, files: n.lesson?.files }
  let sent = 0; const errors: string[] = []
  for (let i = 0; i < targets.length; i += BATCH) {
    if (i > 0) await sleep(BATCH_PAUSE_MS)
    const outs = await Promise.all(targets.slice(i, i + BATCH).map(async (s) => {
      const { subject, html, text } = renderNotificationEmail(emailInput, { name: s.name, email: s.email, enrollmentId: s.enrollmentId })
      const r = await sendOne(s.email, subject, html, text, unsubscribeUrl(s.enrollmentId), apiKey)
      return { email: s.email, ...r }
    }))
    for (const o of outs) { if (o.ok) sent++; else errors.push(`${o.email}: ${o.error}`) }
  }
  await prisma.academyNotification.update({
    where: { id: notificationId },
    data: { emailSent: n.emailSent + sent, emailFailed: Math.max(0, n.emailFailed - sent), emailedAt: new Date() },
  })
  return { sent, failed: targets.length - sent, errors }
}
