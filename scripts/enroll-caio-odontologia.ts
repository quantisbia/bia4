/**
 * Matrícula · Imersão em Biofabricação e Bioimpressão Aplicadas à Odontologia (18–19/11, Bayer/SP)
 *   · Caio Barreto — caiobarreto88@yahoo.com.br
 *
 * Mesmo padrão de enroll-andres-ricardo.ts:
 *   1. User role=STUDENT com senha inicial bcrypt (não sobrescreve senha existente)
 *   2. Subscription plan=GUIDE status=ACTIVE +365d (libera as ferramentas da BIA)
 *   3. CreditBalance inicial 1500
 *   4. AcademyEnrollment accessUntil = +12 meses (source manual-paying-student)
 *   5. E-mail de boas-vindas (Resend) — texto da coordenação, revisado
 *
 * Fluxo de aprovação (regra: nunca enviar ao aluno sem aprovação):
 *   --preview   → envia o e-mail APENAS para janaina.dernowsek@quantis.bio e equipe@quantis.bio
 *   --send      → envia ao aluno (CC janaina + equipe)
 *   --dry-run   → não grava nem envia
 *
 *   NODE_OPTIONS=--max-old-space-size=500 npx tsx --env-file=.env.local scripts/enroll-caio-odontologia.ts --dry-run
 *   NODE_OPTIONS=--max-old-space-size=500 npx tsx --env-file=.env.local scripts/enroll-caio-odontologia.ts --preview
 *   NODE_OPTIONS=--max-old-space-size=500 npx tsx --env-file=.env.local scripts/enroll-caio-odontologia.ts --send
 */
import { prisma } from "../src/lib/db/prisma"
import bcrypt from "bcryptjs"
import { calculateAccessUntil } from "../src/lib/academy/enrollment"
import { writeFileSync } from "node:fs"

const DRY = process.argv.includes("--dry-run")
const PREVIEW = process.argv.includes("--preview")
const SEND = process.argv.includes("--send")

const SENHA_INICIAL = "BiaAcademy2026!"
const MONTHLY_CREDITS = 1500
const FROM = process.env.RESEND_FROM_EMAIL || "BIA Academy <contato@biaquantis.bio>"
const COORD = "janaina.dernowsek@quantis.bio"
const EQUIPE = "equipe@quantis.bio"
const REVIEWERS = [COORD, EQUIPE]
const SITE = "https://biaquantis.bio"
const WHATS = "https://wa.me/5511968632231"

const STUDENT = { email: "caiobarreto88@yahoo.com.br", name: "Caio Barreto", firstName: "Caio" }

async function enroll(s: typeof STUDENT) {
  const email = s.email.toLowerCase().trim()
  const changes: string[] = []
  const existing = await prisma.user.findUnique({ where: { email }, include: { subscription: true, creditBalance: true, academyEnrollment: true } })
  let userId = existing?.id ?? "DRY"
  let passwordIsInitial = false

  if (!existing) {
    changes.push("criar User STUDENT + senha inicial"); passwordIsInitial = true
    if (!DRY) userId = (await prisma.user.create({ data: { email, name: s.name, password: await bcrypt.hash(SENHA_INICIAL, 10), role: "STUDENT", emailVerified: new Date(), researchArea: "Odontologia" } })).id
  } else {
    changes.push(`User já existe (role=${existing.role})`)
    if (!existing.password) { changes.push("senha NULL → senha inicial"); passwordIsInitial = true; if (!DRY) await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(SENHA_INICIAL, 10) } }) }
    else if (await bcrypt.compare(SENHA_INICIAL, existing.password)) passwordIsInitial = true
    if (existing.role === "USER") { changes.push("role USER → STUDENT"); if (!DRY) await prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } }) }
    if (!existing.name && !DRY) await prisma.user.update({ where: { id: userId }, data: { name: s.name } })
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
  else if (enr.accessUntil < now) { accessUntil = calculateAccessUntil(now); changes.push(`renovar matrícula até ${accessUntil.toISOString().slice(0, 10)}`); if (!DRY) await prisma.academyEnrollment.update({ where: { userId }, data: { accessUntil } }) }
  else changes.push(`AcademyEnrollment ok (até ${enr.accessUntil.toISOString().slice(0, 10)})`)

  if (!DRY && userId !== "DRY") await prisma.auditLog.create({ data: { userId, action: "admin_enroll_student", entity: "user", entityId: userId, metadata: { course: "Imersão Odontologia 18–19/11/2026", by: "scripts/enroll-caio-odontologia.ts", changes } } }).catch(() => {})
  return { email, changes, passwordIsInitial, accessUntil }
}

/* ────────────────────────────── E-MAIL ────────────────────────────── */
function buildEmail(s: typeof STUDENT, passwordIsInitial: boolean, accessUntil: Date, previewFor?: string) {
  const subject = (previewFor ? "[PRÉVIA PARA APROVAÇÃO] " : "") + "Bem-vindo à Imersão em Biofabricação Aplicada à Odontologia — seus acessos à BIA Academy e à plataforma BIA"
  const senhaLinha = passwordIsInitial ? `Senha inicial: ${SENHA_INICIAL}` : `Senha: a que você já utiliza na BIA (esqueceu? ${SITE}/auth/forgot-password)`
  const until = accessUntil.toLocaleDateString("pt-BR")

  const text = `Prezado ${s.name}, seja muito bem-vindo!

Meu nome é Janaina Dernowsek e sou coordenadora da Imersão em Biofabricação e Bioimpressão 3D Aplicadas à Odontologia, que será realizada na Quantis Biotechnology, em São Paulo, nos dias 18 e 19 de novembro.

Este e-mail reúne as informações essenciais sobre os dois dias de atividades práticas e apresenta as duas plataformas digitais que já estão liberadas para você e que complementam o conteúdo da imersão.

═══════════════════════════════════════
SEUS ACESSOS (já ativos)
═══════════════════════════════════════
Site: ${SITE}/auth/login
E-mail: ${s.email}
${senhaLinha}

Use sempre este mesmo e-mail (o informado na inscrição). No primeiro acesso recomendamos trocar a senha em Perfil → Segurança. Se precisar, use "Esqueci minha senha" na tela de login.
Um único login dá acesso às duas plataformas abaixo. Acesso válido até ${until}.

1) BIA ACADEMY — plataforma EaD da Quantis
${SITE}/academy
Ambiente com aulas gravadas, materiais em PDF e conteúdos complementares sobre biofabricação, biomateriais, biotintas, bioimpressão 3D e aplicações clínicas, atualizados periodicamente. Como a plataforma é nova, algumas aulas ainda estão sendo adicionadas. Sugerimos assistir ao módulo introdutório antes da imersão para aproveitar melhor a prática.

2) BIA — Biofabrication Intelligent Assistant
${SITE}
Nossa plataforma de inteligência artificial aplicada à biofabricação, com ferramentas para as diferentes etapas de um projeto:
 • formulação de hidrogéis e biotintas;
 • base de dados de biomateriais (PCL, hidroxiapatita, GelMA, alginato, colágeno…);
 • geração de modelos 3D (STL) e G-code para bioimpressão;
 • testes e modelos in vitro, esferoides e organoides;
 • protocolos experimentais passo a passo;
 • apoio ao desenvolvimento de projetos — do caso clínico ao protótipo.
Você já tem 1.500 créditos mensais liberados para usar as ferramentas.

═══════════════════════════════════════
A IMERSÃO PRESENCIAL · 18 e 19 de novembro
═══════════════════════════════════════
Local: Quantis Biotechnology — Campus Bayer
Rua Domingos Jorge, 1100 — Vila Socorro — São Paulo/SP

Dois dias de atividades práticas no laboratório: biomateriais e scaffolds para regeneração óssea, preparo de biotintas, planejamento digital e bioimpressão 3D, com foco nas aplicações em implantodontia, periodontia e cirurgia bucomaxilofacial. Cada participante recebe o kit didático, incluindo o Guia Prático de Biofabricação e Bioimpressão impresso.

Nos próximos dias enviaremos a programação detalhada, horários, orientações de chegada ao campus e o que trazer.

Dúvidas: WhatsApp (11) 96863-2231 — ${WHATS}
Ou responda a este e-mail.

Será um prazer recebê-lo na Quantis para esses dias de prática, troca de conhecimento e aplicação das tecnologias de biofabricação à odontologia.

Atenciosamente,
Janaina Dernowsek
Coordenação — Imersão em Biofabricação Aplicada à Odontologia
Quantis Biotechnology · biaquantis.bio`

  const li = (t: string) => `<li style="margin:4px 0;">${t}</li>`
  const box = (inner: string, border = "#7c3aed") => `<div style="margin:18px 0;padding:16px 18px;border-radius:12px;background:#140b2b;border:1px solid ${border}55;">${inner}</div>`
  const h = (t: string) => `<p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#c4b5fd;">${t}</p>`
  const a = (href: string, t: string) => `<a href="${href}" style="color:#c7a7ff;text-decoration:underline;">${t}</a>`
  const previewBanner = previewFor ? `<div style="background:#f59e0b;color:#1a0b00;font-weight:800;padding:10px 16px;border-radius:10px;margin-bottom:16px;font-size:13px;">PRÉVIA PARA APROVAÇÃO — este e-mail ainda NÃO foi enviado ao aluno (${s.email}). Após o OK, será enviado com cópia para ${COORD} e ${EQUIPE}.</div>` : ""

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0a0514;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
<div style="max-width:640px;margin:0 auto;padding:28px 20px;">
  ${previewBanner}
  <div style="text-align:center;margin-bottom:22px;">
    <div style="display:inline-block;width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#c026d3);line-height:52px;font-size:24px;">🦷</div>
    <p style="margin:12px 0 0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#a78bfa;">Quantis Biotechnology · Imersão presencial</p>
    <h1 style="margin:6px 0 0;font-size:22px;color:#fff;line-height:1.25;">Biofabricação e Bioimpressão 3D<br/>aplicadas à Odontologia</h1>
    <p style="margin:6px 0 0;font-size:13px;color:#c4b5fd;">18 e 19 de novembro · Campus Bayer · São Paulo/SP</p>
  </div>

  <p style="font-size:15px;line-height:1.6;">Prezado <strong style="color:#fff;">${s.name}</strong>, seja muito bem-vindo!</p>
  <p style="font-size:14px;line-height:1.65;color:#d1d5db;">Meu nome é <strong style="color:#fff;">Janaina Dernowsek</strong> e sou coordenadora da Imersão em Biofabricação e Bioimpressão 3D Aplicadas à Odontologia, que será realizada na Quantis Biotechnology, em São Paulo, nos dias <strong style="color:#fff;">18 e 19 de novembro</strong>.</p>
  <p style="font-size:14px;line-height:1.65;color:#d1d5db;">Este e-mail reúne as informações essenciais sobre os dois dias de atividades práticas e apresenta as duas plataformas digitais que <strong style="color:#fff;">já estão liberadas para você</strong> e complementam o conteúdo da imersão.</p>

  ${box(`${h("Seus acessos · já ativos")}
    <table style="font-size:14px;line-height:1.7;color:#e5e7eb;border-collapse:collapse;"><tr><td style="padding-right:12px;color:#a78bfa;">🌐 Site</td><td>${a(`${SITE}/auth/login`, `${SITE}/auth/login`)}</td></tr>
    <tr><td style="padding-right:12px;color:#a78bfa;">✉️ E-mail</td><td><strong style="color:#fff;">${s.email}</strong></td></tr>
    <tr><td style="padding-right:12px;color:#a78bfa;">🔑 Senha</td><td>${passwordIsInitial ? `<code style="background:#241544;padding:2px 8px;border-radius:6px;color:#fff;font-size:14px;">${SENHA_INICIAL}</code> <span style="color:#9ca3af;font-size:12px;">(inicial — troque no primeiro acesso)</span>` : `a que você já utiliza na BIA · ${a(`${SITE}/auth/forgot-password`, "esqueci minha senha")}`}</td></tr></table>
    <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">Use sempre este mesmo e-mail (o informado na inscrição). Um único login dá acesso às duas plataformas abaixo. Se precisar, use "Esqueci minha senha" na tela de login. Acesso válido até <strong style="color:#e5e7eb;">${until}</strong>.</p>`, "#a78bfa")}

  ${box(`${h("1 · BIA Academy — plataforma EaD da Quantis")}
    <p style="margin:0 0 6px;font-size:14px;">${a(`${SITE}/academy`, `${SITE}/academy`)}</p>
    <p style="margin:0;font-size:13px;line-height:1.65;color:#d1d5db;">Aulas gravadas, materiais em PDF e conteúdos complementares sobre biofabricação, biomateriais, biotintas, bioimpressão 3D e aplicações clínicas, atualizados periodicamente. Como a plataforma é nova, algumas aulas ainda estão sendo adicionadas. <strong style="color:#fff;">Sugestão:</strong> assista ao módulo introdutório antes da imersão para aproveitar melhor a prática.</p>`)}

  ${box(`${h("2 · BIA — Biofabrication Intelligent Assistant")}
    <p style="margin:0 0 6px;font-size:14px;">${a(SITE, SITE)}</p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#d1d5db;">Nossa plataforma de inteligência artificial aplicada à biofabricação, com ferramentas para as diferentes etapas de um projeto:</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#d1d5db;">
      ${li("formulação de hidrogéis e biotintas;")}${li("base de dados de biomateriais (PCL, hidroxiapatita, GelMA, alginato, colágeno…);")}${li("geração de modelos 3D (STL) e G-code para bioimpressão;")}${li("testes e modelos in vitro, esferoides e organoides;")}${li("protocolos experimentais passo a passo;")}${li("apoio ao desenvolvimento de projetos — do caso clínico ao protótipo.")}
    </ul>
    <p style="margin:10px 0 0;font-size:12px;color:#a78bfa;">⚡ Você já tem <strong>1.500 créditos mensais</strong> liberados para usar as ferramentas.</p>`)}

  ${box(`${h("A imersão presencial · 18 e 19 de novembro")}
    <p style="margin:0 0 8px;font-size:14px;color:#fff;line-height:1.5;">📍 <strong>Quantis Biotechnology — Campus Bayer</strong><br/><span style="color:#d1d5db;font-size:13px;">Rua Domingos Jorge, 1100 — Vila Socorro — São Paulo/SP</span></p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#d1d5db;">Dois dias de atividades práticas no laboratório: biomateriais e scaffolds para regeneração óssea, preparo de biotintas, planejamento digital e bioimpressão 3D, com foco nas aplicações em implantodontia, periodontia e cirurgia bucomaxilofacial. Cada participante recebe o <strong style="color:#fff;">kit didático</strong>, incluindo o Guia Prático de Biofabricação e Bioimpressão impresso.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Nos próximos dias enviaremos a programação detalhada, horários, orientações de chegada ao campus e o que trazer.</p>`, "#f0abfc")}

  <div style="text-align:center;margin:22px 0;">
    <a href="${SITE}/auth/login" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:12px;font-size:14px;">Acessar minha conta →</a>
    <p style="margin:12px 0 0;font-size:13px;color:#d1d5db;">Dúvidas: ${a(WHATS, "WhatsApp (11) 96863-2231")} ou responda a este e-mail.</p>
  </div>

  <p style="font-size:14px;line-height:1.65;color:#d1d5db;">Será um prazer recebê-lo na Quantis para esses dias de prática, troca de conhecimento e aplicação das tecnologias de biofabricação à odontologia.</p>
  <p style="font-size:14px;line-height:1.6;margin-top:18px;">Atenciosamente,<br/><strong style="color:#fff;">Janaina Dernowsek</strong><br/><span style="color:#a78bfa;font-size:13px;">Coordenação — Imersão em Biofabricação Aplicada à Odontologia</span><br/><span style="color:#6b7280;font-size:12px;">Quantis Biotechnology · ${a(SITE, "biaquantis.bio")}</span></p>
</div></body></html>`
  return { subject, text, html }
}

async function sendEmail(to: string[], cc: string[], m: { subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY ausente")
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, cc: cc.length ? cc : undefined, reply_to: COORD, subject: m.subject, text: m.text, html: m.html, tags: [{ name: "type", value: "odonto_welcome" }] }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, id: (data as { id?: string }).id, error: (data as { message?: string }).message }
}

async function main() {
  console.log(`\n${DRY ? "🧪 DRY-RUN" : PREVIEW ? "👀 PRÉVIA (só revisores)" : SEND ? "🚀 ENVIO AO ALUNO" : "ℹ️  só matrícula (sem e-mail)"} · ${STUDENT.name}\n`)
  const r = await enroll(STUDENT)
  console.log(`▶ ${STUDENT.name} <${r.email}>`); for (const c of r.changes) console.log(`   · ${c}`)

  if (PREVIEW) {
    const m = buildEmail(STUDENT, r.passwordIsInitial, r.accessUntil, REVIEWERS.join(", "))
    writeFileSync("/tmp/caio-preview.html", m.html)
    if (DRY) { console.log(`   ✉ (dry) prévia → ${REVIEWERS.join(", ")}`); return }
    const out = await sendEmail(REVIEWERS, [], m)
    console.log(`   ✉ prévia ${out.ok ? "enviada" : "FALHOU"} → ${REVIEWERS.join(", ")} · ${out.id ?? out.error ?? out.status}`)
  } else if (SEND) {
    const m = buildEmail(STUDENT, r.passwordIsInitial, r.accessUntil)
    if (DRY) { console.log(`   ✉ (dry) → ${r.email} cc ${REVIEWERS.join(", ")}`); return }
    const out = await sendEmail([r.email], REVIEWERS, m)
    console.log(`   ✉ ${out.ok ? "ENVIADO AO ALUNO" : "FALHOU"} → ${r.email} cc ${REVIEWERS.join(", ")} · ${out.id ?? out.error ?? out.status}`)
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
