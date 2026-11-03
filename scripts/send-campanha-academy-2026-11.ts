/**
 * BIA · Campanha comercial BIA Academy Online · nov/2026
 *
 * Envio individualizado via Resend (um e-mail por contato; destinatários nunca expostos).
 *
 *   npx tsx --env-file=.env.local scripts/send-campanha-academy-2026-11.ts --dry                  # só lista
 *   npx tsx --env-file=.env.local scripts/send-campanha-academy-2026-11.ts --test=voce@dominio     # 1 e-mail de teste
 *   npx tsx --env-file=.env.local scripts/send-campanha-academy-2026-11.ts --send --confirm=ENVIAR # dispara p/ a base
 *   … --followup  → usa email-followup.html e exclui quem já respondeu (supressao.csv + respondidos.csv)
 *
 * Proteções:
 *   · NUNCA envia sem --send E --confirm=ENVIAR.
 *   · Exclui: Lucas Guarnier, qualquer Janaína/Dernowsek, @quantis.bio, alunos matriculados, "test"/"teste",
 *     e-mails inválidos, supressao.csv (descadastros) e quem já recebeu nesta campanha (log).
 *   · Lotes de 4 com pausa de 1,1 s (limite Resend 10 req/s). Log em scripts/logs/campanha-academy-2026-11.<ts>.csv
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { prisma } from "../src/lib/db/prisma"

const DIR = "marketing/campanha-academy-2026-11"
const BASE_CSV = `${DIR}/base-consolidada.csv`
const SUPRESSAO = `${DIR}/supressao.csv`     // uma coluna: email
const RESPONDIDOS = `${DIR}/respondidos.csv` // uma coluna: email (preencher conforme chegam respostas)
const ASSET_BASE = "https://biaquantis.bio/marketing/campanha-academy-2026-11"
const EBOOK_URL = "https://biaquantis.bio/library/quantis-white-paper-qmatrix-esferoides-2026.pdf?utm_source=email&utm_medium=convite&utm_campaign=academy_nov26"
const FROM = process.env.RESEND_FROM_EMAIL || "Quantis Biotechnology <contato@biaquantis.bio>"
const REPLY_TO = "suporte@quantis.bio"
const PRICE = "R$ 2.375"

const args = process.argv.slice(2)
const flag = (n: string) => args.includes(`--${n}`)
const val = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const DRY = flag("dry"), SEND = flag("send"), FOLLOWUP = flag("followup"), TEST = val("test"), CONFIRM = val("confirm")

const SUBJECT_A = (first: string) => `${first}, um convite reservado da Quantis para a BIA Academy`
const SUBJECT_B = "Da literatura ao protocolo reprodutível: a BIA Academy, em condições especiais"
const SUBJECT_F1 = "Em um minuto: o convite da BIA Academy que enviamos"
const PRE_MAIN = "12 módulos, plataforma BIA integrada e condições especiais para os 5 primeiros — antes de concentrarmos nossos esforços no QMatrix®."
const PRE_F1 = "O essencial do convite — e as 5 vagas promocionais ainda disponíveis."

const MAILTO_SUBJECT = encodeURIComponent("Interesse na BIA Academy Online — Convite Quantis")
const MAILTO_BODY = encodeURIComponent("Olá, equipe Quantis.\n\nTenho interesse na condição especial da BIA Academy Online apresentada no convite.\n\nNome:\nInstituição / empresa:\nPretendo começar em: ( ) 2026  ( ) 2027\nModalidade: ( ) individual  ( ) 1 inscrição com 3 logins (instituição pública)\n\nAguardo a confirmação das condições.\n")

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i
type Contact = { nome: string; first: string; email: string }

function readCsvCol(path: string): Set<string> {
  if (!existsSync(path)) return new Set()
  return new Set(readFileSync(path, "utf8").split(/\r?\n/).slice(1).map((l) => l.split(",")[0]?.trim().toLowerCase()).filter(Boolean))
}
function alreadySent(): Set<string> {
  const dir = resolve("scripts/logs"); if (!existsSync(dir)) return new Set()
  const out = new Set<string>()
  for (const f of readdirSync(dir)) {
    if (!f.startsWith(FOLLOWUP ? "campanha-academy-2026-11-followup." : "campanha-academy-2026-11.")) continue
    for (const l of readFileSync(resolve(dir, f), "utf8").split(/\r?\n/).slice(1)) { const [e, st] = l.split(","); if (e && st === "ok") out.add(e.toLowerCase()) }
  }
  return out
}
function excluded(nome: string, email: string): string | null {
  const n = nome.toLowerCase()
  if (n.includes("guarnier") || email.includes("guarnier")) return "Lucas Guarnier"
  if (n.includes("jana") || /janaina|dernowse/.test(email)) return "Janaína"
  if (/@(quantis|biaquantis)\.bio$/.test(email)) return "interno"
  if (/test/.test(email)) return "teste"
  return null
}
function fill(html: string, c: Contact, pre: string): string {
  const greeting = c.first ? `Olá, ${c.first},` : "Olá,"
  return html.replaceAll("{{preheader}}", pre).replaceAll("{{asset_base}}", ASSET_BASE).replaceAll("{{greeting}}", greeting)
    .replaceAll("{{price}}", PRICE).replaceAll("{{mailto_subject}}", MAILTO_SUBJECT).replaceAll("{{mailto_body}}", MAILTO_BODY)
    .replaceAll("{{ebook_url}}", EBOOK_URL).replaceAll("{{unsubscribe_url}}", `mailto:suporte@quantis.bio?subject=${encodeURIComponent("Descadastrar — convites Quantis")}&body=${encodeURIComponent(c.email)}`)
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const html = readFileSync(`${DIR}/${FOLLOWUP ? "email-followup.html" : "email-principal.html"}`, "utf8")
  const apiKey = process.env.RESEND_API_KEY; if (!apiKey) throw new Error("RESEND_API_KEY ausente")

  // base
  const rows = readFileSync(BASE_CSV, "utf8").split(/\r?\n/).slice(1).filter(Boolean).map((l) => {
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'))
    return { nome: cells[0]?.trim() ?? "", first: cells[1]?.trim() ?? "", email: cells[2]?.trim().toLowerCase() ?? "" }
  })
  const alunos = new Set((await prisma.academyEnrollment.findMany({ select: { user: { select: { email: true } } } })).map((e) => e.user.email.toLowerCase()))
  const supress = readCsvCol(SUPRESSAO), respondidos = readCsvCol(RESPONDIDOS), sent = alreadySent()

  const seen = new Set<string>(); const targets: Contact[] = []; const skipped: Array<[string, string]> = []
  for (const r of rows) {
    if (!EMAIL_RE.test(r.email)) { skipped.push([r.email, "inválido"]); continue }
    if (seen.has(r.email)) continue; seen.add(r.email)
    const why = excluded(r.nome, r.email) ?? (alunos.has(r.email) ? "já é aluno" : supress.has(r.email) ? "descadastro" : sent.has(r.email) ? "já recebeu" : (FOLLOWUP && respondidos.has(r.email)) ? "já respondeu" : null)
    if (why) { skipped.push([r.email, why]); continue }
    targets.push(r)
  }
  console.log(`Base: ${rows.length} · elegíveis: ${targets.length} · pulados: ${skipped.length}`)
  for (const s of skipped) console.log("  ✗", s.join(" · "))

  const pre = FOLLOWUP ? PRE_F1 : PRE_MAIN
  const subjectFor = (c: Contact) => FOLLOWUP ? SUBJECT_F1 : (c.first ? SUBJECT_A(c.first) : SUBJECT_B)

  if (TEST) {
    const c: Contact = { nome: "Teste", first: "Janaina", email: TEST }
    const r = await send(apiKey, c, subjectFor(c), fill(html, c, pre), true)
    console.log("TESTE →", TEST, r); return
  }
  if (DRY || !SEND || CONFIRM !== "ENVIAR") {
    console.log(`\n(dry) ${targets.length} e-mails seriam enviados. Para disparar: --send --confirm=ENVIAR`)
    for (const t of targets) console.log(`  → ${t.email} · "${subjectFor(t)}"`); return
  }

  mkdirSync("scripts/logs", { recursive: true })
  const logPath = resolve(`scripts/logs/campanha-academy-2026-11${FOLLOWUP ? "-followup" : ""}.${Date.now()}.csv`)
  const log: string[] = ["email,status,id_ou_erro"]; let ok = 0
  for (let i = 0; i < targets.length; i += 4) {
    if (i) await sleep(1100)
    const outs = await Promise.all(targets.slice(i, i + 4).map(async (c) => ({ c, r: await send(apiKey, c, subjectFor(c), fill(html, c, pre), false) })))
    for (const { c, r } of outs) { log.push(`${c.email},${r.ok ? "ok" : "erro"},${(r.id ?? r.error ?? "").replace(/,/g, ";")}`); if (r.ok) ok++; else console.log("  ✗", c.email, r.error) }
    writeFileSync(logPath, log.join("\n"))
  }
  console.log(`\n✓ ${ok}/${targets.length} enviados · log: ${logPath}`)
}

async function send(apiKey: string, c: Contact, subject: string, html: string, isTest: boolean): Promise<{ ok: boolean; id?: string; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: FROM, to: [c.email], reply_to: REPLY_TO, subject: isTest ? `[TESTE] ${subject}` : subject, html,
      tags: [{ name: "campaign", value: "academy_nov26" }, { name: "kind", value: FOLLOWUP ? "followup" : "main" }],
      headers: { "List-Unsubscribe": `<mailto:suporte@quantis.bio?subject=Descadastrar>` } }),
  })
  if (!res.ok) return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 160)}` }
  return { ok: true, id: ((await res.json()) as { id?: string }).id }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
