/**
 * BIA · Segurança de requisições (R33-B)
 *
 * Motivação: investigação de 08/11/2026 encontrou lotes de contas-sonda
 * (`qa.tester.*@example.com`, `recon.test+*@gmail.com`, `ss.keyprobe.*`) criadas
 * em segundos, com IP real não registrado (só o IP interno 10.64.x.x da Vercel).
 *
 * Este módulo centraliza:
 *   1. getClientInfo()      — IP REAL do cliente + user-agent (Vercel/Cloudflare-aware)
 *   2. isDisposableEmail()  — bloqueia domínios descartáveis / reservados (example.com, mailinator…)
 *   3. checkRateLimit()     — rate-limit em memória por chave (IP) com janela deslizante simples
 *   4. detectRegisterBurst()— alerta por e-mail quando > N cadastros do mesmo IP em 10 min
 *
 * Nota sobre rate-limit em memória: em serverless cada instância tem seu Map,
 * então o limite é "por instância". Ainda assim barra scripts sequenciais
 * (que caem na mesma instância quente) e é complementado pelo detector de
 * rajada baseado em AuditLog (persistente), que não depende de memória.
 */
import type { NextRequest } from "next/server"

/* ──────────────────────────────────────────────────────────────────────────
   1. IP real + user-agent
────────────────────────────────────────────────────────────────────────── */
export interface ClientInfo {
  ip: string
  userAgent: string | null
  country: string | null
}

const PRIVATE_IP = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd|fe80)/i

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP.test(ip)
}

/**
 * Extrai o IP real. Ordem: x-vercel-forwarded-for (Vercel, não falsificável
 * pelo cliente) → cf-connecting-ip → true-client-ip → primeiro IP PÚBLICO de
 * x-forwarded-for → x-real-ip → "unknown".
 */
export function getClientInfo(req: Pick<NextRequest, "headers">): ClientInfo {
  const h = req.headers
  const candidates: string[] = []
  const push = (v: string | null) => { if (v) candidates.push(...v.split(",").map(s => s.trim()).filter(Boolean)) }
  push(h.get("x-vercel-forwarded-for"))
  push(h.get("cf-connecting-ip"))
  push(h.get("true-client-ip"))
  push(h.get("x-forwarded-for"))
  push(h.get("x-real-ip"))

  const pub = candidates.find(c => !isPrivateIp(c))
  const ip = pub ?? candidates[0] ?? "unknown"
  const userAgent = h.get("user-agent")?.slice(0, 256) ?? null
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null
  return { ip, userAgent, country }
}

/* ──────────────────────────────────────────────────────────────────────────
   2. E-mails descartáveis / reservados
────────────────────────────────────────────────────────────────────────── */
export const BLOCKED_EMAIL_DOMAINS = new Set([
  // reservados / documentação (RFC 2606) — nunca são caixas reais
  "example.com", "example.org", "example.net", "example.edu", "test.com", "test.org", "localhost", "invalid", "bia.com",
  // descartáveis mais comuns
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com", "10minutemail.net", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "yopmail.fr", "trashmail.com", "trashmail.net", "getnada.com",
  "dispostable.com", "maildrop.cc", "fakeinbox.com", "sharklasers.com", "spamgourmet.com", "mohmal.com", "tempr.email",
  "mintemail.com", "emailondeck.com", "mytemp.email", "tmpmail.org", "tmpmail.net", "burnermail.io", "mailnesia.com",
  "mailcatch.com", "spam4.me", "grr.la", "pokemail.net", "moakt.com", "tempail.com", "disposablemail.com", "33mail.com",
])

/** Padrões de local-part típicos de bots/sondas (não bloqueia usuários reais com "test" no nome). */
// Prefixo seguido de fim, dígito ou separador (., +, -, _) — pega `recon.test2.crosscheck`, `qa.tester.9f2`,
// `keyprobe.7` sem falso-positivo em nomes reais como "probert" ou "scannell".
const PROBE_LOCALPART = /^(qa\.tester|recon\.test|ss\.keyprobe|keyprobe|crosscheck|pentest|scanner)(?=$|[^a-z])/i

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@")
  if (at < 0) return true
  const domain = email.slice(at + 1).toLowerCase().trim()
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true
  // subdomínios de descartáveis (ex.: xyz.mailinator.com)
  for (const d of BLOCKED_EMAIL_DOMAINS) if (domain.endsWith("." + d)) return true
  return false
}

export function isProbeEmail(email: string): boolean {
  const local = email.slice(0, email.lastIndexOf("@"))
  return PROBE_LOCALPART.test(local)
}

/* ──────────────────────────────────────────────────────────────────────────
   3. Rate-limit em memória
────────────────────────────────────────────────────────────────────────── */
interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Map<string, Bucket>>()

export interface RateLimitResult { allowed: boolean; remaining: number; retryAfterSec: number }

/**
 * @param scope   nome do limitador (ex.: "register")
 * @param key     chave (normalmente o IP)
 * @param max     máximo de eventos na janela
 * @param windowMs janela em ms
 */
export function checkRateLimit(scope: string, key: string, max: number, windowMs: number, now = Date.now()): RateLimitResult {
  let m = buckets.get(scope)
  if (!m) { m = new Map(); buckets.set(scope, m) }
  // limpeza oportunista
  if (m.size > 5000) for (const [k, b] of m) if (b.resetAt < now) m.delete(k)

  const b = m.get(key)
  if (!b || b.resetAt < now) {
    m.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 }
  }
  if (b.count >= max) return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  b.count++
  return { allowed: true, remaining: max - b.count, retryAfterSec: 0 }
}

/** Somente para testes. */
export function _resetRateLimits(): void { buckets.clear() }

/* ──────────────────────────────────────────────────────────────────────────
   4. Detector de rajada de cadastros (persistente, via AuditLog) + alerta
────────────────────────────────────────────────────────────────────────── */
export const REGISTER_BURST_WINDOW_MS = 10 * 60 * 1000
export const REGISTER_BURST_THRESHOLD = 3 // alerta quando > 3 (ou seja, no 4º)
export const SECURITY_ALERT_TO = (process.env.SECURITY_ALERT_EMAIL || "janaina.dernowsek@quantis.bio").split(",").map(s => s.trim()).filter(Boolean)

type AuditCounter = { count: (args: { where: { action: string; ip: string; createdAt: { gte: Date } } }) => Promise<number> }

/**
 * Conta cadastros recentes do IP no AuditLog. Retorna o total (incluindo o atual,
 * se já gravado) e se passou do limiar.
 */
export async function detectRegisterBurst(auditLog: AuditCounter, ip: string, now = new Date()): Promise<{ count: number; burst: boolean }> {
  if (!ip || ip === "unknown" || isPrivateIp(ip)) return { count: 0, burst: false }
  const count = await auditLog.count({ where: { action: "user_register", ip, createdAt: { gte: new Date(now.getTime() - REGISTER_BURST_WINDOW_MS) } } })
  return { count, burst: count > REGISTER_BURST_THRESHOLD }
}

export interface SecurityAlertParams {
  subject: string
  lines: string[]
}

/** Envia alerta de segurança via Resend. Nunca lança. */
export async function sendSecurityAlert({ subject, lines }: SecurityAlertParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) { console.warn("[security-alert] RESEND_API_KEY ausente:", subject, lines.join(" | ")); return false }
  const from = (process.env.RESEND_FROM_EMAIL || "BIA <contato@biaquantis.bio>").trim()
  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px"><h2 style="color:#7c3aed">🛡️ BIA · Alerta de segurança</h2><p><strong>${escapeHtml(subject)}</strong></p><ul>${lines.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul><p style="color:#666;font-size:12px">Gerado automaticamente por src/lib/security/request-guard.ts · ${new Date().toISOString()}</p></div>`
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: SECURITY_ALERT_TO, subject: `[BIA · Segurança] ${subject}`, html, text: `${subject}\n\n${lines.join("\n")}` }),
    })
    if (!res.ok) { console.warn("[security-alert] Resend", res.status); return false }
    return true
  } catch (e) {
    console.warn("[security-alert] falha:", e)
    return false
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))
}
