/**
 * Matrícula de 2 alunos (2026-11-03) — BIA Academy + plataforma BIA
 *   · Andres  — andros1208@hotmail.com
 *   · Ricardo — cabralessrj@gmail.com
 *
 * Mesmo padrão dos alunos pagantes anteriores (enroll-paying-students / enroll-larissa):
 *   1. User role=STUDENT com senha inicial bcrypt (não sobrescreve senha existente)
 *   2. Subscription plan=GUIDE status=ACTIVE +365d (libera as ferramentas da BIA)
 *   3. CreditBalance inicial
 *   4. AcademyEnrollment accessUntil = +12 meses (source manual-paying-student)
 *   5. E-mail de boas-vindas (Resend) com login, como entrar e o que encontra — CC Janaína
 *
 * Idempotente. Flags: --dry-run (não grava nem envia) · --no-email · --only=email
 *
 *   NODE_OPTIONS=--max-old-space-size=500 npx tsx --env-file=.env.local scripts/enroll-andres-ricardo.ts --dry-run
 *   NODE_OPTIONS=--max-old-space-size=500 npx tsx --env-file=.env.local scripts/enroll-andres-ricardo.ts
 */
import { prisma } from "../src/lib/db/prisma"
import bcrypt from "bcryptjs"
import { calculateAccessUntil } from "../src/lib/academy/enrollment"

const DRY = process.argv.includes("--dry-run")
const NO_EMAIL = process.argv.includes("--no-email")
const ONLY = process.argv.find(a => a.startsWith("--only="))?.split("=")[1]?.toLowerCase()

const SENHA_INICIAL = "BiaAcademy2026!"
const MONTHLY_CREDITS = 1500 // mesmo valor dos demais alunos (plano GUIDE; renovação mensal via renew-monthly-credits)
const FROM = process.env.RESEND_FROM_EMAIL || "BIA Academy <contato@biaquantis.bio>"
const CC = "janaina.dernowsek@quantis.bio"
const SITE = "https://biaquantis.bio"

const STUDENTS = [
  { email: "andros1208@hotmail.com", name: "Andres" },
  { email: "cabralessrj@gmail.com", name: "Ricardo" },
]

async function enroll(s: { email: string; name: string }) {
  const email = s.email.toLowerCase().trim()
  const changes: string[] = []
  const existing = await prisma.user.findUnique({ where: { email }, include: { subscription: true, creditBalance: true, academyEnrollment: true } })
  let userId = existing?.id ?? "DRY"
  let passwordIsInitial = false

  if (!existing) {
    changes.push("criar User STUDENT + senha inicial")
    passwordIsInitial = true
    if (!DRY) userId = (await prisma.user.create({ data: { email, name: s.name, password: await bcrypt.hash(SENHA_INICIAL, 10), role: "STUDENT" } })).id
  } else {
    changes.push(`User já existe (role=${existing.role})`)
    if (!existing.password) { changes.push("senha NULL → senha inicial"); passwordIsInitial = true; if (!DRY) await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(SENHA_INICIAL, 10) } }) }
    else if (await bcrypt.compare(SENHA_INICIAL, existing.password)) passwordIsInitial = true
    if (existing.role === "USER") { changes.push("role USER → STUDENT"); if (!DRY) await prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } }) }
    if (!existing.name) { if (!DRY) await prisma.user.update({ where: { id: userId }, data: { name: s.name } }) }
  }

  const now = new Date(); const periodEnd = new Date(now.getTime() + 365 * 864e5)
  const sub = existing?.subscription
  if (!sub) { changes.push("criar Subscription GUIDE/ACTIVE +365d"); if (!DRY) await prisma.subscription.create({ data: { userId, plan: "GUIDE", status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd, monthlyCredits: MONTHLY_CREDITS } }) }
  else if (sub.plan === "FREE" || (sub.status !== "ACTIVE" && sub.status !== "TRIALING")) { changes.push(`Subscription ${sub.plan}/${sub.status} → GUIDE/ACTIVE`); if (!DRY) await prisma.subscription.update({ where: { userId }, data: { plan: "GUIDE", status: "ACTIVE", currentPeriodEnd: periodEnd, monthlyCredits: MONTHLY_CREDITS } }) }
  else changes.push(`Subscription ok (${sub.plan}/${sub.status})`)

  if (!existing?.creditBalance) { changes.push(`criar CreditBalance ${MONTHLY_CREDITS}`); if (!DRY) await prisma.creditBalance.create({ data: { userId, balance: MONTHLY_CREDITS, totalEarned: MONTHLY_CREDITS, totalSpent: 0 } }) }
  else changes.push(`CreditBalance ok (saldo ${existing.creditBalance.balance})`)

  const enr = existing?.academyEnrollment
  let accessUntil = enr?.accessUntil ?? calculateAccessUntil(now)
  if (!enr) { changes.push(`criar AcademyEnrollment até ${accessUntil.toISOString().slice(0, 10)}`); if (!DRY) await prisma.academyEnrollment.create({ data: { userId, enrolledAt: now, accessUntil, source: "manual-paying-student" } }) }
  else if (enr.accessUntil < now) { accessUntil = calculateAccessUntil(now); changes.push(`matrícula expirada → renovar até ${accessUntil.toISOString().slice(0, 10)}`); if (!DRY) await prisma.academyEnrollment.update({ where: { userId }, data: { accessUntil } }) }
  else changes.push(`AcademyEnrollment ok (até ${enr.accessUntil.toISOString().slice(0, 10)})`)

  return { email, changes, passwordIsInitial, accessUntil }
}

function buildEmail(name: string, email: string, passwordIsInitial: boolean, accessUntil: Date) {
  const until = accessUntil.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  const subject = `${name}, seu acesso à BIA Academy está liberado — veja como entrar`
  const senhaTxt = passwordIsInitial
    ? `Senha inicial: ${SENHA_INICIAL}  (troque no primeiro acesso)`
    : `Senha: a que você já usa na BIA. Esqueceu? ${SITE}/auth/forgot-password`
  const text = `Olá, ${name}!

Sua matrícula na BIA Academy foi confirmada. Seu acesso à plataforma de ensino e à plataforma de IA BIA já está liberado por 12 meses (até ${until}).

COMO ENTRAR
1. Acesse ${SITE}/auth/login
2. E-mail: ${email}
3. ${senhaTxt}
4. Depois de entrar, clique em "Academy" no menu (ou vá direto para ${SITE}/academy/dashboard)

Para trocar a senha: Perfil → Segurança, ou use "Esqueci minha senha" na tela de login (${SITE}/auth/forgot-password).

O QUE VOCÊ VAI ENCONTRAR
• Jornada: Módulo 0 (aulas introdutórias do curso prático) + 12 módulos liberados desde o 1º dia — engenharia tecidual, biomateriais, biotintas, bioimpressão 3D, cultura 3D, esferoides e organoides, reologia e G-code, vascularização e validação, projeto final.
• Em cada aula: vídeo, objetivo, material de estudo organizado por tópicos (com tabelas, referências com DOI e botão "Baixar PDF"), PDFs de reforço e quiz com correção imediata.
• Biblioteca: artigos curados, white papers Quantis e e-books exclusivos ("Limitações e desafios da biofabricação", "Biofabricação em Ortopedia", "QMatrix: agregação de esferoides").
• Plataforma BIA integrada: Formulador de biotintas, Bioimpressão 3D (fatiamento e G-code), Organoid Builder, Notebook com versionamento e chat científico — abra a ferramenta direto de dentro da aula.
• 3 encontros online ao vivo com a Dra. Kamila Leichtweis: 25/nov/2026, 15/dez/2026 e 26/jan/2027, às 19h (Brasília). Links e gravações em Academy → Encontros ao vivo.
• Meu Projeto: seu protocolo de biofabricação, versionado e exportável.
• Certificado final de conclusão com código de verificação pública (ao concluir as aulas e o projeto final).
• Avisos: você recebe e-mail e notificação na plataforma quando houver material novo.

PRIMEIROS PASSOS SUGERIDOS
1. Entre, complete o perfil e responda ao onboarding (1 min).
2. Assista à Aula 0.1 "Antes de ligar a bioimpressora" e baixe o Guia do Aluno.
3. Comece o Módulo 1 — Introdução à Biofabricação — e faça o quiz.

Qualquer dúvida, responda este e-mail ou escreva para suporte@quantis.bio.

Boas-vindas e bons estudos!
— Equipe Quantis Biotechnology · ${SITE}
`
  const li = (s: string) => `<li style="padding:7px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">${s}</li>`
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e8e4ff;">
<div style="max-width:600px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;"><div style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#c026d3);border-radius:12px;"><span style="color:#fff;font-size:20px;font-weight:800;">BIA Academy</span></div></div>
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(192,38,211,0.08));border:1px solid rgba(192,38,211,0.25);border-radius:16px;padding:28px;margin-bottom:24px;">
    <div style="display:inline-block;padding:4px 10px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:999px;color:#86efac;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">✓ Matrícula confirmada</div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:800;color:#fff;">Olá, ${name}! Seu acesso está liberado</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfe6;">Plataforma de ensino + plataforma de IA BIA, por <strong style="color:#fff;">12 meses</strong> (até ${until}).</p>
  </div>

  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
    <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px;">🔑 Como entrar</h3>
    <ol style="margin:0;padding-left:18px;color:#c7bfe6;font-size:14px;line-height:1.7;">
      <li>Acesse <a href="${SITE}/auth/login" style="color:#c7a7ff;">biaquantis.bio/auth/login</a></li>
      <li>E-mail: <span style="font-family:monospace;color:#fff;">${email}</span></li>
      <li>${passwordIsInitial
        ? `Senha inicial: <span style="font-family:monospace;color:#fff;">${SENHA_INICIAL}</span> <span style="color:#8b7fb5;">(troque no primeiro acesso)</span>`
        : `Senha: a que você já usa na BIA. Esqueceu? <a href="${SITE}/auth/forgot-password" style="color:#c7a7ff;">redefina aqui</a>`}</li>
      <li>Depois de entrar, clique em <strong style="color:#fff;">Academy</strong> no menu — ou vá direto ao painel do aluno.</li>
    </ol>
    <div style="text-align:center;margin-top:18px;"><a href="${SITE}/academy/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-size:15px;font-weight:700;border-radius:12px;">Entrar na BIA Academy →</a>
      <div style="margin-top:10px;font-size:12px;color:#8b7fb5;">Trocar senha: Perfil → Segurança, ou <a href="${SITE}/auth/forgot-password" style="color:#c7a7ff;">Esqueci minha senha</a></div></div>
  </div>

  <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#fff;">O que você vai encontrar</h3>
  <ul style="margin:0 0 24px;padding:0;list-style:none;">
    ${li(`📚 <strong style="color:#fff;">Jornada:</strong> Módulo 0 (introdução ao curso prático) + <strong style="color:#fff;">12 módulos liberados desde o 1º dia</strong> — engenharia tecidual, biomateriais, biotintas, bioimpressão 3D, cultura 3D, esferoides e organoides, reologia e G-code, vascularização e validação, projeto final.`)}
    ${li(`🎬 <strong style="color:#fff;">Em cada aula:</strong> vídeo, objetivo, material de estudo organizado por tópicos (tabelas, referências com DOI e botão <em>Baixar PDF</em>), PDFs de reforço e quiz com correção imediata.`)}
    ${li(`📖 <strong style="color:#fff;">Biblioteca:</strong> artigos curados, white papers Quantis e e-books exclusivos (<em>Limitações e desafios da biofabricação</em>, <em>Biofabricação em Ortopedia</em>, <em>QMatrix: agregação de esferoides</em>).`)}
    ${li(`🤖 <strong style="color:#fff;">Plataforma BIA integrada:</strong> Formulador de biotintas, Bioimpressão 3D (fatiamento e G-code), Organoid Builder, Notebook com versionamento e chat científico — abra a ferramenta de dentro da aula.`)}
    ${li(`🎥 <strong style="color:#fff;">3 encontros ao vivo</strong> com a Dra. Kamila Leichtweis: 25/nov/2026 · 15/dez/2026 · 26/jan/2027, às 19h (Brasília). Links e gravações em <em>Academy → Encontros ao vivo</em>.`)}
    ${li(`🧪 <strong style="color:#fff;">Meu Projeto:</strong> seu protocolo de biofabricação, versionado e exportável.`)}
    ${li(`🎓 <strong style="color:#fff;">Certificado final de conclusão</strong> com código de verificação pública.`)}
    ${li(`🔔 <strong style="color:#fff;">Avisos:</strong> e-mail + notificação na plataforma quando houver material novo.`)}
  </ul>

  <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <h3 style="margin:0 0 8px;font-size:13px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px;">🚀 Primeiros passos</h3>
    <ol style="margin:0;padding-left:18px;color:#c7bfe6;font-size:14px;line-height:1.7;">
      <li>Entre, complete o perfil e responda ao onboarding (1 min).</li>
      <li>Assista à Aula 0.1 <em>"Antes de ligar a bioimpressora"</em> e baixe o Guia do Aluno.</li>
      <li>Comece o Módulo 1 — Introdução à Biofabricação — e faça o quiz.</li>
    </ol>
  </div>

  <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;text-align:center;">
    <p style="margin:0 0 10px;font-size:13px;color:#8b7fb5;line-height:1.6;">Dúvidas? Responda este e-mail ou escreva para <a href="mailto:suporte@quantis.bio" style="color:#c7a7ff;">suporte@quantis.bio</a>.</p>
    <p style="margin:0;font-size:13px;color:#c7bfe6;">Boas-vindas e bons estudos!<br><strong style="color:#fff;">— Equipe Quantis Biotechnology</strong></p>
    <p style="margin:16px 0 0;font-size:11px;color:#5b4f82;"><a href="${SITE}" style="color:#8b7fb5;text-decoration:none;">biaquantis.bio</a></p>
  </div>
</div></body></html>`
  return { subject, text, html }
}

async function sendEmail(to: string, m: { subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY ausente")
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], cc: [CC], reply_to: CC, subject: m.subject, text: m.text, html: m.html, tags: [{ name: "type", value: "academy_welcome" }] }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, id: (data as any).id, error: (data as any).message }
}

async function main() {
  console.log(`\n${DRY ? "🧪 DRY-RUN" : "🚀 EXECUÇÃO"} · Matrícula Andres + Ricardo\n`)
  for (const s of STUDENTS) {
    const r = await enroll(s)
    console.log(`▶ ${s.name} <${r.email}>`); for (const c of r.changes) console.log(`   · ${c}`)
    if (NO_EMAIL || (ONLY && ONLY !== "email" && ONLY !== r.email)) continue
    const m = buildEmail(s.name, r.email, r.passwordIsInitial, r.accessUntil)
    if (DRY) { console.log(`   ✉ (dry) "${m.subject}" → ${r.email} cc ${CC}`); continue }
    const out = await sendEmail(r.email, m)
    console.log(`   ✉ ${out.ok ? "enviado" : "FALHOU"} ${out.id ?? out.error ?? out.status}`)
    await new Promise(r => setTimeout(r, 600))
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
