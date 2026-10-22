/**
 * R24 · E-mails da turma — aulas práticas 23–24/10 (Bayer / Quantis, São Paulo)
 *
 *   1) Boas-vindas ao aluno novo (Paulo H. R. G. Reis): login, senha inicial,
 *      como trocar, as duas plataformas, aulas práticas + Guia do Aluno (PDF anexo).
 *   2) Aviso a TODOS os alunos matriculados (role STUDENT) com novos materiais
 *      (e-books/white paper, aulas), aulas práticas 23–24/10 e encerramento 24/10 ~14:30.
 *      Também com o Guia do Aluno anexo.
 *
 *   CC + reply-to: janaina.dernowsek@quantis.bio (sempre).
 *   Via Resend (domínio biaquantis.bio verificado).
 *
 *   Uso:
 *     npx tsx --env-file=.env.local scripts/send-r24-pratica-emails.ts --dry   # só lista
 *     npx tsx --env-file=.env.local scripts/send-r24-pratica-emails.ts         # envia
 *     npx tsx --env-file=.env.local scripts/send-r24-pratica-emails.ts --only=paulogsk@gmail.com
 */
import { readFileSync } from "node:fs"
import { prisma } from "../src/lib/db/prisma"

const KEY = process.env.RESEND_API_KEY!
const FROM = process.env.RESEND_FROM_EMAIL || "BIA Academy <contato@biaquantis.bio>"
const CC = "janaina.dernowsek@quantis.bio"
const DRY = process.argv.includes("--dry")
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.toLowerCase()
const SKIP = new Set((process.argv.find((a) => a.startsWith("--skip="))?.slice(7) ?? "").toLowerCase().split(",").filter(Boolean))

const NEW_STUDENT_EMAIL = "paulogsk@gmail.com"
const SENHA_INICIAL = "BiaAcademy2026!"
const GUIDE_PDF = "scripts/BIA-Academy-Guia-do-Aluno-2026.pdf"

// Equipe interna não recebe o aviso de turma (são ADMIN/INSTRUCTOR), mas a Janaina vai em CC.
const EXCLUDE = new Set(["janaina.dernowsek@quantis.bio"])

if (!KEY) { console.error("❌ RESEND_API_KEY ausente — defina em .env.local"); process.exit(1) }

const PRATICA = {
  local: "Bayer (Quantis Biotechnology) — Rua Domingos Jorge, 1100 — Vila Socorro, São Paulo/SP",
  dias: "sexta-feira 23/10 e sábado 24/10",
  inicio: "8:30",
  encerramento: "sábado 24/10, por volta das 14:30",
  contato: "(11) 96863-2231",
}

const firstName = (n: string | null, email: string) => {
  const base = (n ?? "").replace(/^(Dra?\.|Dr\.)\s+/, "").trim()
  if (!base || base.toLowerCase() === email.split("@")[0].toLowerCase()) return "olá"
  const f = base.split(/\s+/)[0]
  return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()
}

// ─── Blocos reutilizáveis (HTML) ─────────────────────────────────────────
const S = {
  body: "margin:0;padding:0;background:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e8e4ff;",
  wrap: "max-width:620px;margin:0 auto;padding:36px 22px;",
  card: "background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px 20px;margin-bottom:20px;",
  h3: "margin:0 0 10px 0;font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.5px;",
  p: "margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#c7bfe6;",
  li: "padding:5px 0;color:#c7bfe6;font-size:14px;line-height:1.55;",
  mono: "font-family:monospace;color:#fff;background:rgba(124,58,237,0.18);padding:2px 6px;border-radius:4px;",
  btn: "display:inline-block;padding:14px 30px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;",
  muted: "font-size:12px;color:#8b7fb5;",
}
const header = (tag: string) => `
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#c026d3);border-radius:12px;">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">BIA Academy</span>
    </div>
    <div style="margin-top:10px;${S.muted}text-transform:uppercase;letter-spacing:1.5px;">${tag}</div>
  </div>`
const praticaHtml = `
  <div style="background:linear-gradient(135deg,rgba(16,185,129,0.10),rgba(124,58,237,0.08));border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:18px 20px;margin-bottom:20px;">
    <h3 style="${S.h3}">🧪 Aulas práticas — ${PRATICA.dias}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:5px 0;color:#8b7fb5;width:110px;vertical-align:top;">Onde</td><td style="padding:5px 0;color:#fff;">${PRATICA.local}</td></tr>
      <tr><td style="padding:5px 0;color:#8b7fb5;">Horário</td><td style="padding:5px 0;color:#fff;">a partir das <strong>${PRATICA.inicio}</strong> nos dois dias</td></tr>
      <tr><td style="padding:5px 0;color:#8b7fb5;">Encerramento</td><td style="padding:5px 0;color:#fff;">${PRATICA.encerramento} — finalização do curso presencial</td></tr>
      <tr><td style="padding:5px 0;color:#8b7fb5;">Contato</td><td style="padding:5px 0;color:#fff;">Quantis · WhatsApp <strong>${PRATICA.contato}</strong></td></tr>
    </table>
    <p style="${S.p}margin-top:12px;"><strong style="color:#fff;">Leve:</strong> documento com foto, notebook com Chrome/Edge atualizado (login da BIA já testado), jaleco e calçado fechado.</p>
    <p style="${S.p}margin:0;"><strong style="color:#fff;">Antes de chegar:</strong> revise os módulos 3 (Biotintas) e 4 (Bioimpressão 3D) e, na BIA, abra <em>Bioimpressão → Fase 1</em> para conhecer o fluxo de 6 fases.</p>
  </div>`
const materiaisHtml = `
  <div style="${S.card}">
    <h3 style="${S.h3}">📚 Novos materiais na plataforma</h3>
    <ul style="margin:0;padding-left:0;list-style:none;">
      <li style="${S.li}">🎁 <strong style="color:#fbbf24;">E-book “Biofabricação em Ortopedia”</strong> — do defeito ósseo crítico ao implante bioimpresso paciente-específico (53 p., exclusivo para alunos) → <a href="https://biaquantis.bio/academy/library" style="color:#c7a7ff;">Biblioteca</a></li>
      <li style="${S.li}">📄 <strong style="color:#fff;">White paper QMatrix</strong> — agregação de esferoides em células com baixa produção de matriz extracelular (Leichtweis &amp; Guarnier, 2026)</li>
      <li style="${S.li}">🎬 <strong style="color:#fff;">Aulas completas dos módulos 1–9 e 11</strong> (75–100 min cada): Introdução, Biomateriais, Biotintas, Bioimpressão 3D, Arquitetura 3D/TPMS, Células (2D/3D + Esferoides), Tecidos, Organoides &amp; Bioassembly, Avaliação pós-impressão, Desenvolvimento de Projeto → <a href="https://biaquantis.bio/academy/modules" style="color:#c7a7ff;">Módulos</a></li>
      <li style="${S.li}">🧬 <strong style="color:#fff;">BIA · Bioimpressão em 6 fases</strong> — Modelo de tecido → Biotinta → Fatiamento (BioSlicer) → Bioimpressão (Host USB) → Análise → Maturação. Prévia do fatiamento gratuita.</li>
      <li style="${S.li}">📅 <strong style="color:#fff;">Encontros ao vivo</strong>: 25/nov · 15/dez · 26/jan, às 19:00 (Brasília) → <a href="https://biaquantis.bio/academy/live" style="color:#c7a7ff;">Agenda</a></li>
    </ul>
  </div>`
const footer = `
  <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;margin-top:28px;text-align:center;">
    <p style="${S.p}">📎 Em anexo: <strong style="color:#fff;">Guia do Aluno (PDF)</strong> — login, troca de senha, as duas plataformas, módulos, ferramentas e o roteiro das aulas práticas.</p>
    <p style="${S.p}">Dúvidas? Responda este e-mail ou fale no WhatsApp ${PRATICA.contato}.</p>
    <p style="margin:0;font-size:13px;color:#c7bfe6;">Até sexta!<br><strong style="color:#fff;">— Janaina Dernowsek · Quantis Biotechnology</strong></p>
    <p style="margin:16px 0 0 0;font-size:11px;color:#5b4f82;"><a href="https://biaquantis.bio" style="color:#8b7fb5;text-decoration:none;">biaquantis.bio</a></p>
  </div>`

// ─── Template 1 · aluno novo ─────────────────────────────────────────────
function buildWelcome(name: string | null, email: string) {
  const fn = firstName(name, email)
  const subject = `${fn}, seu acesso à BIA Academy e à plataforma BIA — e as aulas práticas 23 e 24/10`
  const text = `Olá, ${fn}!

Sua matrícula na BIA Academy foi confirmada e seu acesso à plataforma BIA já está liberado.

ENTRAR
  https://biaquantis.bio/auth/login
  E-mail: ${email}
  Senha inicial: ${SENHA_INICIAL}   (B e A maiúsculos, ponto de exclamação no final)

TROCAR A SENHA (recomendado no 1º acesso)
  Entre → clique no seu nome → Configurações → Segurança → "Alterar senha".
  Esqueceu? https://biaquantis.bio/auth/forgot-password (link válido por 30 min).

AS DUAS PLATAFORMAS (mesmo login)
  • BIA Academy — o curso: 12 módulos, aulas, biblioteca (e-book + white paper + artigos),
    encontros ao vivo, projeto e certificados → https://biaquantis.bio/academy/dashboard
  • BIA — ferramentas: Bioimpressão em 6 fases, Formulador de biotintas, Organoid Builder,
    Pipeline, Protocolos, Chat IA, Notebook → https://biaquantis.bio/dashboard
  Seu plano inclui 12 meses de acesso e 1.500 créditos mensais para as ferramentas.

AULAS PRÁTICAS — ${PRATICA.dias}
  Onde: ${PRATICA.local}
  Horário: a partir das ${PRATICA.inicio} nos dois dias
  Encerramento do curso: ${PRATICA.encerramento}
  Contato Quantis: ${PRATICA.contato}
  Leve: documento, notebook (Chrome/Edge) com login testado, jaleco, calçado fechado.

Em anexo está o Guia do Aluno (PDF) com o passo a passo de tudo.

Qualquer dúvida, é só responder este e-mail.
— Janaina Dernowsek · Quantis Biotechnology · https://biaquantis.bio
`
  const html = `<!doctype html><html><body style="${S.body}"><div style="${S.wrap}">
  ${header("Matrícula confirmada")}
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(192,38,211,0.08));border:1px solid rgba(192,38,211,0.25);border-radius:16px;padding:26px;margin-bottom:22px;">
    <h1 style="margin:0 0 10px 0;font-size:23px;line-height:1.3;font-weight:800;color:#fff;">Olá, ${fn}! Seu acesso está liberado 🎉</h1>
    <p style="${S.p}margin:0;">Bem-vindo à <strong style="color:#fff;">BIA Academy</strong> e à <strong style="color:#fff;">plataforma BIA</strong>. Abaixo estão suas credenciais, como trocar a senha e tudo sobre as aulas práticas desta semana.</p>
  </div>
  <div style="text-align:center;margin:26px 0;">
    <a href="https://biaquantis.bio/auth/login" style="${S.btn}">Entrar na plataforma →</a>
    <div style="margin-top:10px;${S.muted}">biaquantis.bio/auth/login</div>
  </div>
  <div style="${S.card}">
    <h3 style="${S.h3}">🔑 Suas credenciais</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#8b7fb5;width:120px;">E-mail</td><td style="padding:6px 0;"><span style="${S.mono}">${email}</span></td></tr>
      <tr><td style="padding:6px 0;color:#8b7fb5;">Senha inicial</td><td style="padding:6px 0;"><span style="${S.mono}">${SENHA_INICIAL}</span> <span style="${S.muted}">(B e A maiúsculos, “!” no final)</span></td></tr>
    </table>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);">
      <p style="${S.p}"><strong style="color:#fff;">Troque a senha no primeiro acesso:</strong> entre → clique no seu nome → <em>Configurações</em> → <em>Segurança</em> → <em>Alterar senha</em>.</p>
      <p style="${S.p}margin:0;">Esqueceu? <a href="https://biaquantis.bio/auth/forgot-password" style="color:#c7a7ff;">Crie uma nova senha</a> pelo seu e-mail (link válido por 30 minutos).</p>
    </div>
  </div>
  <div style="${S.card}">
    <h3 style="${S.h3}">🧭 As duas plataformas (mesmo login)</h3>
    <ul style="margin:0;padding-left:0;list-style:none;">
      <li style="${S.li}">🎓 <strong style="color:#fff;">BIA Academy</strong> — o curso: 12 módulos liberados, aulas, biblioteca (e-book, white paper, 65+ artigos), encontros ao vivo, projeto e certificados → <a href="https://biaquantis.bio/academy/dashboard" style="color:#c7a7ff;">academy/dashboard</a></li>
      <li style="${S.li}">🧬 <strong style="color:#fff;">BIA — ferramentas</strong> — Bioimpressão em 6 fases (do tecido ao G-code e à maturação), Formulador de biotintas, Organoid Builder, Pipeline, Protocolos, Chat IA, Notebook → <a href="https://biaquantis.bio/dashboard" style="color:#c7a7ff;">dashboard</a></li>
      <li style="${S.li}">💳 Plano <strong style="color:#fff;">12 meses</strong> + <strong style="color:#fff;">1.500 créditos/mês</strong> para as ferramentas (o Academy não consome créditos).</li>
    </ul>
  </div>
  ${praticaHtml}
  ${materiaisHtml}
  ${footer}
</div></body></html>`
  return { subject, text, html }
}

// ─── Template 2 · aviso para a turma ─────────────────────────────────────
function buildTurma(name: string | null, email: string) {
  const fn = firstName(name, email)
  const subject = `${fn}, aulas práticas 23 e 24/10 na Quantis (Bayer) + novos materiais na BIA Academy`
  const text = `Olá, ${fn}!

Chegou a semana das aulas práticas da BIA Academy. 🎉

AULAS PRÁTICAS — ${PRATICA.dias}
  Onde: ${PRATICA.local}
  Horário: a partir das ${PRATICA.inicio} nos dois dias
  Encerramento do curso: ${PRATICA.encerramento}
  Contato Quantis: ${PRATICA.contato}
  Leve: documento com foto, notebook com Chrome/Edge atualizado (login da BIA testado),
  jaleco e calçado fechado.
  Antes de chegar: revise os módulos 3 (Biotintas) e 4 (Bioimpressão 3D) e abra
  BIA → Bioimpressão → Fase 1 para conhecer o fluxo de 6 fases.

NOVOS MATERIAIS NA PLATAFORMA
  • E-book "Biofabricação em Ortopedia" (53 p., exclusivo) → https://biaquantis.bio/academy/library
  • White paper QMatrix — esferoides em células com baixa produção de MEC
  • Aulas completas dos módulos 1–9 e 11 (75–100 min cada) → https://biaquantis.bio/academy/modules
  • BIA · Bioimpressão em 6 fases: Modelo de tecido → Biotinta → Fatiamento → Host → Análise → Maturação
  • Encontros ao vivo: 25/nov · 15/dez · 26/jan, 19:00 (Brasília) → https://biaquantis.bio/academy/live

ACESSO
  https://biaquantis.bio/auth/login — mesmo e-mail deste aviso.
  Esqueceu a senha? https://biaquantis.bio/auth/forgot-password
  Para trocar: Configurações → Segurança → Alterar senha.

Em anexo, o Guia do Aluno (PDF) atualizado.

Até sexta!
— Janaina Dernowsek · Quantis Biotechnology · https://biaquantis.bio
`
  const html = `<!doctype html><html><body style="${S.body}"><div style="${S.wrap}">
  ${header("Aviso da turma · aulas práticas")}
  <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(124,58,237,0.08));border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:26px;margin-bottom:22px;">
    <h1 style="margin:0 0 10px 0;font-size:23px;line-height:1.3;font-weight:800;color:#fff;">${fn}, chegou a semana das aulas práticas! 🧪</h1>
    <p style="${S.p}margin:0;">Nos dias <strong style="color:#fff;">23 e 24 de outubro</strong> nos encontramos na Quantis (Bayer), em São Paulo. Abaixo, tudo o que você precisa — e os novos materiais que já estão na plataforma.</p>
  </div>
  ${praticaHtml}
  ${materiaisHtml}
  <div style="${S.card}">
    <h3 style="${S.h3}">🔑 Acesso</h3>
    <p style="${S.p}">Entre em <a href="https://biaquantis.bio/auth/login" style="color:#c7a7ff;">biaquantis.bio/auth/login</a> com este mesmo e-mail. Esqueceu a senha? <a href="https://biaquantis.bio/auth/forgot-password" style="color:#c7a7ff;">Crie uma nova</a>. Para trocar: <em>Configurações → Segurança → Alterar senha</em>.</p>
    <div style="text-align:center;margin-top:14px;"><a href="https://biaquantis.bio/academy/dashboard" style="${S.btn}">Abrir a BIA Academy →</a></div>
  </div>
  ${footer}
</div></body></html>`
  return { subject, text, html }
}

// ─── Envio ───────────────────────────────────────────────────────────────
async function send(to: string, mail: { subject: string; text: string; html: string }, pdfB64: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM, to: [to], cc: [CC], reply_to: CC,
      subject: mail.subject, text: mail.text, html: mail.html,
      attachments: [{ filename: "BIA-Academy-Guia-do-Aluno-2026.pdf", content: pdfB64 }],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { to, ok: false as const, error: JSON.stringify(data) }
  return { to, ok: true as const, id: (data as { id?: string }).id }
}

async function main() {
  const pdfB64 = readFileSync(GUIDE_PDF).toString("base64")
  const students = await prisma.academyEnrollment.findMany({
    where: { user: { role: "STUDENT" } },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { enrolledAt: "asc" },
  })
  const list = students
    .map((e) => ({ email: e.user.email.toLowerCase(), name: e.user.name }))
    .filter((r) => !EXCLUDE.has(r.email))
    .filter((r) => !ONLY || r.email === ONLY)
    .filter((r) => !SKIP.has(r.email))

  console.log(`\n📨 Destinatários (${list.length}) · CC ${CC} · from ${FROM}${DRY ? " · DRY-RUN" : ""}\n`)
  const results: Array<{ to: string; ok: boolean; id?: string; error?: string; kind: string }> = []
  for (const r of list) {
    const isNew = r.email === NEW_STUDENT_EMAIL
    const mail = isNew ? buildWelcome(r.name, r.email) : buildTurma(r.name, r.email)
    console.log(`  ${isNew ? "🆕 welcome" : "📣 turma  "} → ${r.email}  (${firstName(r.name, r.email)})  "${mail.subject}"`)
    if (DRY) continue
    const res = await send(r.email, mail, pdfB64)
    results.push({ ...res, kind: isNew ? "welcome" : "turma" })
    console.log(res.ok ? `      ✓ enviado id=${res.id}` : `      ✗ falhou: ${res.error}`)
    await new Promise((s) => setTimeout(s, 600)) // respeita rate limit do Resend (2 req/s)
  }
  if (!DRY) {
    const ok = results.filter((r) => r.ok).length
    console.log(`\n✅ ${ok}/${results.length} enviados${results.length - ok ? ` · ${results.length - ok} falha(s)` : ""}\n`)
    await prisma.auditLog.create({ data: { action: "academy.email.batch", entity: "AcademyEnrollment", metadata: { tag: "R24-pratica-23-24-out", sent: ok, failed: results.length - ok, results } } }).catch(() => {})
  }
  await prisma.$disconnect()
}
main().catch((e) => { console.error(e); process.exit(1) })
