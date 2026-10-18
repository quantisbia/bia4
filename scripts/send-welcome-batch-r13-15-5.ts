/**
 * R13.15.5 · Batch de e-mails:
 *   1 aluno novo (Andre Cupertino) → welcome como aluno
 *   6 colaboradores Quantis → convite para testar/usar a plataforma
 *
 * Todos com CC: janaina.dernowsek@quantis.bio
 * Reply-to: janaina.dernowsek@quantis.bio
 * Via Resend (domínio biaquantis.bio verificado)
 */
const KEY = process.env.RESEND_API_KEY!
const FROM = process.env.RESEND_FROM_EMAIL || "BIA Academy <contato@biaquantis.bio>"
const CC = "janaina.dernowsek@quantis.bio"

if (!KEY) {
  console.error("❌ RESEND_API_KEY ausente — defina em .env.local")
  process.exit(1)
}

interface Recipient {
  email: string
  name: string
  kind: "student" | "team"
  role?: string
}

const RECIPIENTS: Recipient[] = [
  // ── Aluno pagante
  { email: "andrecupertino@hotmail.com", name: "Andre Cupertino", kind: "student" },
  // ── Equipe Quantis colaboradora
  { email: "kamila.leichtweis@quantis.bio", name: "Dra. Kamila Leichtweis", kind: "team", role: "Diretora Científica" },
  { email: "vitor.mattos@quantis.bio",      name: "Vitor Mattos",            kind: "team", role: "Tech/Dev" },
  { email: "thais.amaral@quantis.bio",      name: "Thais Amaral",            kind: "team", role: "Operações" },
  { email: "lucas.guarnier@quantis.bio",    name: "Dr. Lucas Guarnier",      kind: "team", role: "Pesquisa & Desenvolvimento" },
  { email: "paula.elbl@quantis.bio",        name: "Paula Elbl",              kind: "team", role: "Colaboradora Academy" },
  { email: "suporte@quantis.bio",           name: "Equipe Suporte Quantis",  kind: "team", role: "Atendimento" },
]

async function generateResetUrl(email: string): Promise<string> {
  try {
    const res = await fetch("https://biaquantis.bio/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    return data.resetUrl || "https://biaquantis.bio/auth/forgot-password"
  } catch {
    return "https://biaquantis.bio/auth/forgot-password"
  }
}

// ═════════════════════════════════════════════════════════════════
//  Template STUDENT (aluno novo pagante)
// ═════════════════════════════════════════════════════════════════
function buildStudentEmail(r: Recipient, resetUrl: string) {
  const firstName = r.name.split(" ")[0]
  const subject = `${firstName}, seu acesso à BIA Academy está liberado 🎉`

  const text = `Olá, ${firstName}!

Boa notícia: sua matrícula na BIA Academy foi confirmada e seu acesso já está liberado.

🌐 Entrar na plataforma: https://biaquantis.bio/academy/dashboard

E-mail: ${r.email}
Senha inicial: BiaAcademy2026!  (recomendamos trocar no primeiro acesso)

Não lembra da senha? Crie uma nova em segundos:
${resetUrl}
(link válido por 30 minutos)

O que você tem acesso:
  ✓ Todos os 12 módulos liberados desde o 1º dia
  ✓ 12 meses de acesso completo à plataforma BIA (Formulador, Bioimpressão, Organoid Builder, Chat IA...)
  ✓ 3 encontros online ao vivo com a Dra. Kamila Leichtweis
    (25/nov · 15/dez · 26/jan — todos às 19:00 horário de Brasília)
  ✓ Biblioteca com 65+ artigos científicos e white papers Quantis
  ✓ E-book exclusivo "Biofabricação em Ortopedia" (brinde da matrícula)
  ✓ Certificado por aula + certificado final (código único verificável)
  ✓ Projeto de biofabricação próprio, versionado automaticamente

Qualquer dúvida, é só responder este e-mail.

Boas-vindas e bons estudos!
— Equipe Quantis Biotechnology
   https://biaquantis.bio
`

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e8e4ff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#c026d3);border-radius:12px;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">BIA Academy</span>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(192,38,211,0.08));border:1px solid rgba(192,38,211,0.25);border-radius:16px;padding:28px;margin-bottom:24px;">
      <div style="display:inline-block;padding:4px 10px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:999px;color:#86efac;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">✓ Matrícula confirmada</div>
      <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:800;color:#fff;">Olá, ${firstName}! Seu acesso está liberado 🎉</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfe6;">Sua matrícula na <strong style="color:#fff;">BIA Academy</strong> está confirmada e tudo pronto para você começar.</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://biaquantis.bio/academy/dashboard" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-size:16px;font-weight:700;border-radius:12px;box-shadow:0 10px 30px rgba(124,58,237,0.3);">Entrar na plataforma →</a>
      <div style="margin-top:14px;font-size:12px;color:#8b7fb5;"><a href="https://biaquantis.bio/academy/dashboard" style="color:#c7a7ff;">biaquantis.bio/academy/dashboard</a></div>
    </div>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">🔑 Suas credenciais</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#8b7fb5;width:120px;">E-mail:</td><td style="padding:6px 0;color:#fff;font-family:monospace;">${r.email}</td></tr>
        <tr><td style="padding:6px 0;color:#8b7fb5;">Senha inicial:</td><td style="padding:6px 0;color:#fff;font-family:monospace;">BiaAcademy2026!</td></tr>
      </table>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#c7bfe6;line-height:1.5;">
        <strong style="color:#fff;">Prefere criar sua própria senha agora?</strong> Clica no botão:
      </div>
      <div style="text-align:center;margin-top:12px;">
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);color:#c7a7ff;text-decoration:none;font-size:13px;font-weight:600;border-radius:8px;">🔑 Criar nova senha</a>
        <div style="margin-top:8px;font-size:11px;color:#5b4f82;">Link válido por 30 minutos</div>
      </div>
    </div>
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#fff;">O que você tem acesso:</h3>
      <ul style="margin:0;padding-left:0;list-style:none;">
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">✅ <strong style="color:#fff;">Todos os 12 módulos</strong> liberados desde o 1º dia</li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">✅ <strong style="color:#fff;">12 meses</strong> de acesso completo à plataforma BIA (Formulador, Bioimpressão, Organoid Builder, Chat IA...)</li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">✅ <strong style="color:#fff;">3 encontros online ao vivo</strong> com a Dra. Kamila Leichtweis<br><span style="color:#8b7fb5;font-size:12px;margin-left:22px;">25/nov · 15/dez · 26/jan — todos às 19:00 (horário de Brasília)</span></li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">✅ Biblioteca com <strong style="color:#fff;">65+ artigos científicos</strong> e white papers Quantis</li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">✅ <strong style="color:#fbbf24;">🎁 E-book exclusivo "Biofabricação em Ortopedia"</strong> (brinde da matrícula)</li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">✅ <strong style="color:#fff;">Certificado por aula</strong> + certificado final (código único verificável)</li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">✅ Projeto de biofabricação próprio, versionado automaticamente, exportável em PDF</li>
      </ul>
    </div>
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;margin-top:32px;text-align:center;">
      <p style="margin:0 0 10px 0;font-size:13px;color:#8b7fb5;line-height:1.6;">Qualquer dúvida, é só responder este e-mail.</p>
      <p style="margin:0;font-size:13px;color:#c7bfe6;">Boas-vindas e bons estudos!<br><strong style="color:#fff;">— Equipe Quantis Biotechnology</strong></p>
      <p style="margin:18px 0 0 0;font-size:11px;color:#5b4f82;"><a href="https://biaquantis.bio" style="color:#8b7fb5;text-decoration:none;">biaquantis.bio</a></p>
    </div>
  </div>
</body>
</html>`

  return { subject, text, html }
}

// ═════════════════════════════════════════════════════════════════
//  Template TEAM (colaborador Quantis)
// ═════════════════════════════════════════════════════════════════
function buildTeamEmail(r: Recipient, resetUrl: string) {
  const firstName = r.name.replace(/^(Dra?\.|Dr\.)\s+/, "").split(" ")[0]
  const subject = `${firstName}, seu acesso à BIA Academy como colaborador(a) Quantis 👋`

  const text = `Olá, ${firstName}!

Como parte da equipe Quantis, você já tem acesso completo à BIA Academy como colaborador(a) — ${r.role || "equipe interna"}.

🌐 Entrar na plataforma: https://biaquantis.bio/academy/dashboard

Suas credenciais:
  E-mail: ${r.email}
  Senha inicial: QuantisTeam2026!  (se é seu primeiro acesso)
  Role: INSTRUCTOR + Superadmin (bypass total)

Não lembra da senha ou é seu primeiro acesso? Crie uma em segundos:
${resetUrl}
(link válido por 30 minutos)

Por favor, pedimos que você:

  1. ✅ Entre na plataforma e teste o fluxo de aluno (dashboard, aulas, biblioteca, projeto)
  2. ✅ Confira o conteúdo dos 12 módulos — veja se os textos, imagens e vídeos
     estão corretos no seu domínio técnico
  3. ✅ Teste a BIA (assistente IA) com perguntas da sua área
  4. ✅ Baixe o e-book "Biofabricação em Ortopedia" (brinde da matrícula)
     e nos dê feedback sobre a qualidade editorial
  5. ✅ Reporte qualquer bug, texto errado ou melhoria direto neste e-mail
     ou no WhatsApp do time

Como SUPERADMIN, você também tem acesso a:
  → /dashboard/admin/academy — gestão de módulos, aulas, matrículas, leads
  → /dashboard/admin/academy/leads — leads do brinde (quem baixou o white paper)
  → Todas as áreas administrativas (bypass completo)

Obrigada pela sua ajuda em deixar a Academy no nível que a Quantis merece!

— Janaina Dernowsek
   CEO · Quantis Biotechnology
   https://biaquantis.bio
`

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e8e4ff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#c026d3);border-radius:12px;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">BIA Academy</span>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#8b7fb5;text-transform:uppercase;letter-spacing:1.5px;">Acesso de equipe interna</div>
    </div>
    <div style="background:linear-gradient(135deg,rgba(251,191,36,0.08),rgba(192,38,211,0.08));border:1px solid rgba(251,191,36,0.25);border-radius:16px;padding:28px;margin-bottom:24px;">
      <div style="display:inline-block;padding:4px 10px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);border-radius:999px;color:#fbbf24;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">🏢 Equipe Quantis · ${r.role || "Colaborador"}</div>
      <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:800;color:#fff;">Olá, ${firstName}! Preciso da sua ajuda 👋</h1>
      <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;color:#c7bfe6;">Como parte da equipe Quantis, você já tem acesso completo à <strong style="color:#fff;">BIA Academy</strong> como colaborador(a).</p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfe6;">Gostaria muito que você entrasse e testasse a plataforma — seu olhar técnico é fundamental pra deixar o conteúdo no nível que a Quantis merece.</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://biaquantis.bio/academy/dashboard" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-size:16px;font-weight:700;border-radius:12px;box-shadow:0 10px 30px rgba(124,58,237,0.3);">Entrar na plataforma →</a>
      <div style="margin-top:14px;font-size:12px;color:#8b7fb5;"><a href="https://biaquantis.bio/academy/dashboard" style="color:#c7a7ff;">biaquantis.bio/academy/dashboard</a></div>
    </div>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">🔑 Suas credenciais</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#8b7fb5;width:120px;">E-mail:</td><td style="padding:6px 0;color:#fff;font-family:monospace;">${r.email}</td></tr>
        <tr><td style="padding:6px 0;color:#8b7fb5;">Senha inicial:</td><td style="padding:6px 0;color:#fff;font-family:monospace;">QuantisTeam2026!</td></tr>
        <tr><td style="padding:6px 0;color:#8b7fb5;">Role:</td><td style="padding:6px 0;color:#fbbf24;font-weight:600;">INSTRUCTOR + Superadmin</td></tr>
      </table>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#c7bfe6;line-height:1.5;">
        <strong style="color:#fff;">Primeiro acesso ou esqueceu a senha?</strong>
      </div>
      <div style="text-align:center;margin-top:12px;">
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);color:#c7a7ff;text-decoration:none;font-size:13px;font-weight:600;border-radius:8px;">🔑 Criar nova senha</a>
        <div style="margin-top:8px;font-size:11px;color:#5b4f82;">Link válido por 30 minutos</div>
      </div>
    </div>

    <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#86efac;">📋 Por favor, pedimos que você:</h3>
      <ol style="margin:0;padding-left:20px;color:#c7bfe6;font-size:14px;line-height:1.7;">
        <li style="padding:4px 0;">Entre na plataforma e <strong style="color:#fff;">teste o fluxo de aluno</strong> (dashboard, aulas, biblioteca, projeto)</li>
        <li style="padding:4px 0;">Confira o <strong style="color:#fff;">conteúdo dos 12 módulos</strong> — veja se os textos, imagens e vídeos estão corretos no seu domínio técnico</li>
        <li style="padding:4px 0;">Teste a <strong style="color:#fff;">BIA (assistente IA)</strong> com perguntas da sua área</li>
        <li style="padding:4px 0;">Baixe o <strong style="color:#fbbf24;">e-book "Biofabricação em Ortopedia"</strong> (brinde da matrícula) e nos dê feedback sobre a qualidade editorial</li>
        <li style="padding:4px 0;">Reporte qualquer <strong style="color:#fff;">bug, texto errado ou melhoria</strong> direto neste e-mail ou no WhatsApp do time</li>
      </ol>
    </div>

    <div style="background:rgba(251,191,36,0.05);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 10px 0;font-size:14px;font-weight:700;color:#fbbf24;">🛡️ Como SUPERADMIN você também acessa:</h3>
      <ul style="margin:0;padding-left:20px;color:#c7bfe6;font-size:13px;line-height:1.7;">
        <li><a href="https://biaquantis.bio/dashboard/admin/academy" style="color:#c7a7ff;text-decoration:none;">/dashboard/admin/academy</a> — gestão de módulos, aulas, matrículas</li>
        <li><a href="https://biaquantis.bio/dashboard/admin/academy/leads" style="color:#c7a7ff;text-decoration:none;">/dashboard/admin/academy/leads</a> — leads do brinde (quem baixou o white paper)</li>
        <li>Todas as áreas administrativas (bypass completo)</li>
      </ul>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;margin-top:32px;text-align:center;">
      <p style="margin:0 0 10px 0;font-size:13px;color:#c7bfe6;line-height:1.6;">Obrigada pela sua ajuda em deixar a Academy no nível que a Quantis merece!</p>
      <p style="margin:0;font-size:13px;color:#c7bfe6;"><strong style="color:#fff;">— Janaina Dernowsek</strong><br>CEO · Quantis Biotechnology</p>
      <p style="margin:18px 0 0 0;font-size:11px;color:#5b4f82;"><a href="https://biaquantis.bio" style="color:#8b7fb5;text-decoration:none;">biaquantis.bio</a></p>
    </div>
  </div>
</body>
</html>`

  return { subject, text, html }
}

// ═════════════════════════════════════════════════════════════════
//  SEND
// ═════════════════════════════════════════════════════════════════
async function sendOne(r: Recipient) {
  console.log(`\n📩 ${r.email} (${r.name}) · tipo=${r.kind}`)
  console.log(`   Gerando link de reset...`)
  const resetUrl = await generateResetUrl(r.email)
  console.log(`   ✓ ${resetUrl.slice(0, 80)}...`)

  const { subject, text, html } =
    r.kind === "student" ? buildStudentEmail(r, resetUrl) : buildTeamEmail(r, resetUrl)

  console.log(`   DE: ${FROM}`)
  console.log(`   PARA: ${r.email}`)
  console.log(`   CC: ${CC}`)
  console.log(`   ASSUNTO: ${subject}`)

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      from: FROM,
      to: [r.email],
      cc: [CC],
      reply_to: CC,
      subject,
      text,
      html,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`   ❌ Resend ${res.status}:`, JSON.stringify(data))
    return { email: r.email, success: false, error: JSON.stringify(data) }
  }
  console.log(`   ✅ ENVIADO · Resend ID: ${data.id}`)
  return { email: r.email, success: true, resendId: data.id }
}

async function main() {
  console.log("📨 R13.15.5 · Batch de e-mails de boas-vindas/convite\n")
  console.log(`   Destinatários: ${RECIPIENTS.length}`)
  console.log(`   CC em todos: ${CC}`)
  console.log(`   FROM: ${FROM}\n`)
  console.log("═".repeat(66))

  const results: Array<{ email: string; success: boolean; resendId?: string; error?: string }> = []
  for (const r of RECIPIENTS) {
    const result = await sendOne(r)
    results.push(result)
    // Rate-limiting leve pra não estressar Resend
    await new Promise((r) => setTimeout(r, 600))
  }

  console.log("\n" + "═".repeat(66))
  console.log("\n📊 RESUMO FINAL:\n")
  const ok = results.filter((r) => r.success)
  const fail = results.filter((r) => !r.success)
  console.log(`   ✅ Enviados: ${ok.length}/${results.length}`)
  for (const r of ok) console.log(`      - ${r.email} (${r.resendId})`)
  if (fail.length) {
    console.log(`\n   ❌ Falhas: ${fail.length}`)
    for (const r of fail) console.log(`      - ${r.email}: ${r.error}`)
  }
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
