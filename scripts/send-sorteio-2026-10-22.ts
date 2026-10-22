/**
 * R24.8 · Campanha "E-book gratuito + Sorteio Quantis" (22/10/2026)
 *
 * Destinatários = usuários da BIA (tabela User) ∪ inscritos do site Quantis
 * (CSV enviado por Janaina). Dedupe por e-mail (case-insensitive), validação
 * de formato, envio INDIVIDUAL (um e-mail por destinatário — ninguém vê os
 * demais), cabeçalho List-Unsubscribe e link de descadastramento no rodapé.
 *
 *   npx tsx --env-file=.env.local scripts/send-sorteio-2026-10-22.ts --dry        # lista, não envia
 *   npx tsx --env-file=.env.local scripts/send-sorteio-2026-10-22.ts --only=x@y.z # teste com 1
 *   npx tsx --env-file=.env.local scripts/send-sorteio-2026-10-22.ts              # envia tudo
 *
 * Log: scripts/logs/sorteio-2026-10-22.<timestamp>.csv (email,status,id|erro)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { prisma } from "../src/lib/db/prisma"

const KEY = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM_EMAIL ?? "BIA Academy <contato@biaquantis.bio>"
const REPLY_TO = "janaina.dernowsek@quantis.bio"
const UNSUB_MAILTO = "mailto:contato@biaquantis.bio?subject=Descadastrar"
const SUBJECT = "🎁 E-book gratuito de Esferoides e Organoides + Sorteio ao vivo 29/10 · Quantis + BIA"

const HTML_PATH = "/home/user/uploaded_files/Email_Sorteio_Quantis_2026-10-22.html"
const CSV_PATH = "/home/user/uploaded_files/Emails_Site_Quantis_2026-10-22.csv"

const args = process.argv.slice(2)
const DRY = args.includes("--dry")
const ONLY = args.find((a) => a.startsWith("--only="))?.slice(7)?.toLowerCase()
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
// Contas de teste/internas e typos evidentes — não recebem campanha
const EXCLUDE = new Set([
  "debug.test@bia.com", "demo@bia.com", "test@test.com", "maria.silva.teste@quantis.bio", "verificacao.prod@quantis.bio",
  "janaina.dernowsel@quantis.bio", "janaina@bioedetch.com.br", "rodri_abuna@hotmial.com",
])

if (!KEY && !DRY) { console.error("RESEND_API_KEY ausente"); process.exit(1) }

function prepareHtml(raw: string): string {
  let h = raw
  // 1) remove o beacon do Cloudflare (script não roda em e-mail e piora a entregabilidade)
  h = h.replace(/<script[\s\S]*?<\/script>\s*/gi, "")
  // 2) frase de descadastramento → link real
  h = h.replace(
    "utilize a opção de descadastramento deste e-mail.",
    `<a href="${UNSUB_MAILTO}" style="color:#b9a9d4;text-decoration:underline;">clique aqui para se descadastrar</a>.`,
  )
  return h
}

function toText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|tr|h\d|li|div)>/gi, "\n")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => `${String(label).replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&middot;/g, "·")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

async function recipients(): Promise<string[]> {
  const users = await prisma.user.findMany({ select: { email: true } })
  const csv = readFileSync(CSV_PATH, "utf8").split(/\r?\n/).slice(1).map((s) => s.trim())
  const all = [...users.map((u) => u.email), ...csv]
  const seen = new Set<string>(); const out: string[] = []; const invalid: string[] = []
  for (const raw of all) {
    const e = raw.toLowerCase()
    if (!e) continue
    if (!EMAIL_RE.test(e) || EXCLUDE.has(e)) { invalid.push(raw); continue }
    if (seen.has(e)) continue
    seen.add(e); out.push(e)
  }
  if (invalid.length) console.log("⚠️  ignorados (inválidos/teste/typo):", invalid.join(", "))
  console.log(`BIA users: ${users.length} · CSV: ${csv.filter(Boolean).length} · únicos válidos: ${out.length}`)
  return out.sort()
}

async function send(to: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM, to: [to], reply_to: REPLY_TO, subject: SUBJECT, html, text,
      headers: { "List-Unsubscribe": `<${UNSUB_MAILTO}>` },
    }),
  })
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
  if (res.status === 429) return { ok: false as const, error: "rate_limit", retry: true }
  if (!res.ok) return { ok: false as const, error: `${res.status} ${data.name ?? ""} ${data.message ?? JSON.stringify(data)}`.trim() }
  return { ok: true as const, id: data.id }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const html = prepareHtml(readFileSync(HTML_PATH, "utf8"))
  const text = toText(html)
  let list = await recipients()
  if (ONLY) list = list.filter((e) => e === ONLY)

  console.log(`\n📨 ${list.length} destinatário(s) · from "${FROM}" · reply-to ${REPLY_TO}${DRY ? " · DRY-RUN (nada será enviado)" : ""}\n`)
  if (DRY) { list.forEach((e, i) => console.log(`${String(i + 1).padStart(3)}. ${e}`)); console.log("\n--- TEXTO (fallback) ---\n" + text.slice(0, 1200) + "\n…"); return }

  mkdirSync(resolve("scripts/logs"), { recursive: true })
  const logPath = resolve(`scripts/logs/sorteio-2026-10-22.${Date.now()}.csv`)
  const rows = ["email,status,id_ou_erro"]
  let ok = 0, fail = 0
  for (let i = 0; i < list.length; i++) {
    const to = list[i]
    let r = await send(to, html, text)
    if (!r.ok && "retry" in r && r.retry) { await sleep(2000); r = await send(to, html, text) }
    if (r.ok) { ok++; console.log(`✓ ${String(i + 1).padStart(3)}/${list.length} ${to} → ${r.id}`); rows.push(`${to},ok,${r.id}`) }
    else { fail++; console.log(`✗ ${String(i + 1).padStart(3)}/${list.length} ${to} → ${r.error}`); rows.push(`${to},erro,"${r.error.replace(/"/g, "'")}"`) }
    await sleep(600) // Resend: 2 req/s — margem de segurança
  }
  writeFileSync(logPath, rows.join("\n") + "\n")
  console.log(`\n✅ enviados: ${ok} · ✗ falhas: ${fail} · log: ${logPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
