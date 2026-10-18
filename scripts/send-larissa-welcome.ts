/**
 * Envia e-mail de boas-vindas para a Larissa com CC para a Janaina.
 * Usa a mesma infraestrutura Resend que já existe em src/lib/email/
 *
 * Requer RESEND_API_KEY definida em .env.local (ou no ambiente).
 * Se não houver, imprime o conteúdo pronto para você copiar+colar manualmente.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim()
const FROM = (process.env.RESEND_FROM_EMAIL || "BIA Academy <onboarding@resend.dev>").trim()
const TO = "larissa_spinola@yahoo.com.br"
const CC = "janaina.dernowsek@quantis.bio"
const STUDENT_NAME = "Larissa"
const LOGIN_URL = "https://biaquantis.bio/auth/login"
const ACADEMY_URL = "https://biaquantis.bio/academy/dashboard"
const RESET_URL = "https://biaquantis.bio/auth/forgot-password"

const SUBJECT = "Larissa, seu acesso à BIA Academy foi corrigido ✅"

const TEXT = `Olá, ${STUDENT_NAME}!

Boa notícia: seu cadastro na BIA Academy foi corrigido e agora está tudo pronto para você começar.

🌐 Entrar na plataforma:   ${LOGIN_URL}
🎓 Painel do aluno direto: ${ACADEMY_URL}

E-mail: ${TO}
Senha:  a mesma que você já tinha cadastrada na BIA. Se não lembrar, basta usar
        o link "Esqueci minha senha" em ${RESET_URL}.

O que você tem acesso:
  ✓ Todos os 12 módulos do programa liberados desde o 1º dia
  ✓ 12 meses de acesso completo à plataforma BIA (Formulador, Bioimpressão, Organoid Builder...)
  ✓ 3 encontros online ao vivo com a Dra. Kamila Leichtweis
    (25/nov · 15/dez · 26/jan — todos às 19:00 BRT)
  ✓ Biblioteca com 65+ artigos científicos e white papers Quantis
  ✓ Certificado por aula + certificado final de conclusão (com código único verificável)
  ✓ Projeto de biofabricação próprio, versionado automaticamente

Qualquer dúvida, é só responder este e-mail.

Boas-vindas e bons estudos!

— Equipe Quantis Biotechnology
   https://biaquantis.bio
`

const HTML = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#e8e4ff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <!-- Logo header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#c026d3);border-radius:12px;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">BIA Academy</span>
      </div>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(192,38,211,0.08));border:1px solid rgba(192,38,211,0.25);border-radius:16px;padding:28px;margin-bottom:24px;">
      <div style="display:inline-block;padding:4px 10px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:999px;color:#86efac;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">
        ✓ Cadastro corrigido
      </div>
      <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:800;color:#fff;">
        Olá, ${STUDENT_NAME}! Seu acesso está liberado 🎉
      </h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfe6;">
        Boa notícia: seu cadastro na <strong style="color:#fff;">BIA Academy</strong> foi corrigido e agora está tudo pronto para você começar a estudar.
      </p>
    </div>

    <!-- CTA primário -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${ACADEMY_URL}" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-size:16px;font-weight:700;border-radius:12px;box-shadow:0 10px 30px rgba(124,58,237,0.3);">
        Entrar na plataforma →
      </a>
      <div style="margin-top:14px;font-size:12px;color:#8b7fb5;">
        <a href="${ACADEMY_URL}" style="color:#c7a7ff;text-decoration:underline;">${ACADEMY_URL}</a>
      </div>
    </div>

    <!-- Credenciais -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">
        🔑 Suas credenciais
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:6px 0;color:#8b7fb5;width:80px;">E-mail:</td>
          <td style="padding:6px 0;color:#fff;font-family:monospace;">${TO}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#8b7fb5;">Senha:</td>
          <td style="padding:6px 0;color:#fff;">a mesma que você já tinha cadastrada na BIA</td>
        </tr>
      </table>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#c7bfe6;line-height:1.5;">
        Se não lembrar da senha, é só clicar em
        <a href="${RESET_URL}" style="color:#c7a7ff;">Esqueci minha senha</a>
        na tela de login — enviamos um link em segundos.
      </div>
    </div>

    <!-- O que está incluído -->
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 14px 0;font-size:15px;font-weight:700;color:#fff;">
        O que você tem acesso:
      </h3>
      <ul style="margin:0;padding-left:0;list-style:none;">
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">
          ✅ <strong style="color:#fff;">Todos os 12 módulos</strong> do programa liberados desde o 1º dia
        </li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">
          ✅ <strong style="color:#fff;">12 meses</strong> de acesso completo à plataforma BIA
          (Formulador, Bioimpressão, Organoid Builder, Chat IA...)
        </li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">
          ✅ <strong style="color:#fff;">3 encontros online ao vivo</strong> com a Dra. Kamila Leichtweis
          <br><span style="color:#8b7fb5;font-size:12px;margin-left:22px;">25/nov · 15/dez · 26/jan — todos às 19:00 (horário de Brasília)</span>
        </li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">
          ✅ Biblioteca com <strong style="color:#fff;">65+ artigos científicos</strong> e white papers Quantis
        </li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">
          ✅ <strong style="color:#fff;">Certificado por aula</strong> + certificado final (com código único verificável)
        </li>
        <li style="padding:8px 0;color:#c7bfe6;font-size:14px;line-height:1.6;">
          ✅ Projeto de biofabricação próprio, versionado automaticamente, exportável em PDF
        </li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;margin-top:32px;text-align:center;">
      <p style="margin:0 0 10px 0;font-size:13px;color:#8b7fb5;line-height:1.6;">
        Qualquer dúvida, é só responder este e-mail.
      </p>
      <p style="margin:0;font-size:13px;color:#c7bfe6;">
        Boas-vindas e bons estudos!<br>
        <strong style="color:#fff;">— Equipe Quantis Biotechnology</strong>
      </p>
      <p style="margin:18px 0 0 0;font-size:11px;color:#5b4f82;">
        <a href="https://biaquantis.bio" style="color:#8b7fb5;text-decoration:none;">biaquantis.bio</a>
      </p>
    </div>

  </div>
</body>
</html>`

async function main() {
  if (!RESEND_API_KEY) {
    console.log("\n⚠️  RESEND_API_KEY não configurada localmente.")
    console.log("    Vou mostrar o conteúdo pronto pra você enviar manualmente ou configurar a key.\n")
    console.log("─────────────────────────────────────────────────────")
    console.log(`PARA:    ${TO}`)
    console.log(`CC:      ${CC}`)
    console.log(`ASSUNTO: ${SUBJECT}`)
    console.log("─────────────────────────────────────────────────────")
    console.log(TEXT)
    console.log("─────────────────────────────────────────────────────")
    console.log("\n💡 Para enviar automaticamente:")
    console.log("   1. Pegue uma API key em https://resend.com/api-keys")
    console.log("   2. Adicione em .env.local: RESEND_API_KEY=re_...")
    console.log("   3. Rode: npx tsx scripts/send-larissa-welcome.ts")
    process.exit(1)
  }

  console.log(`\n📧 Enviando via Resend...`)
  console.log(`   DE:  ${FROM}`)
  console.log(`   PARA: ${TO}`)
  console.log(`   CC:   ${CC}`)
  console.log(`   TÍTULO: ${SUBJECT}\n`)

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM,
      to:   [TO],
      cc:   [CC],
      reply_to: CC,
      subject: SUBJECT,
      text: TEXT,
      html: HTML,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    console.error(`❌ Erro Resend ${res.status}:`, JSON.stringify(data, null, 2))
    process.exit(1)
  }

  console.log(`✅ E-mail enviado com sucesso!`)
  console.log(`   Resend ID: ${data.id ?? "(sem id)"}\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
