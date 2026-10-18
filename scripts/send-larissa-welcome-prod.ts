/**
 * R13.14.7 · Envio real do e-mail de boas-vindas para a Larissa Spinola
 * via Resend (domínio biaquantis.bio verificado).
 *
 * - TO:      larissa_spinola@yahoo.com.br
 * - CC:      janaina.dernowsek@quantis.bio
 * - Reply-to: janaina.dernowsek@quantis.bio
 *
 * Inclui link de reset de senha gerado pela API /api/auth/forgot-password
 * (válido 30 min) para a aluna não precisar lembrar da senha antiga.
 */
const KEY = process.env.RESEND_API_KEY!
const FROM = process.env.RESEND_FROM_EMAIL || "BIA Academy <contato@biaquantis.bio>"
const TO = "larissa_spinola@yahoo.com.br"
const CC = "janaina.dernowsek@quantis.bio"

async function main() {
  if (!KEY) {
    console.error("❌ RESEND_API_KEY ausente"); process.exit(1)
  }

  // 1) Gera link de reset de senha
  console.log("📩 Gerando link de reset de senha...")
  const resetRes = await fetch("https://biaquantis.bio/api/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: TO }),
  })
  const resetData = await resetRes.json()
  const resetUrl: string = resetData.resetUrl || "https://biaquantis.bio/auth/forgot-password"
  console.log(`   ✓ ${resetUrl.slice(0, 80)}...`)

  // 2) Monta e envia o e-mail
  const subject = "Larissa, seu acesso à BIA Academy foi corrigido ✅"

  const text = `Olá, Larissa!

Boa notícia: seu cadastro na BIA Academy foi corrigido e agora está tudo pronto.

🌐 Entrar na plataforma: https://biaquantis.bio/academy/dashboard

E-mail: ${TO}
Senha:  a mesma que você já tinha cadastrada na BIA.

Não lembra da senha? Crie uma nova em segundos:
${resetUrl}
(link válido por 30 minutos)

O que você tem acesso:
  ✓ Todos os 12 módulos liberados desde o 1º dia
  ✓ 12 meses de acesso completo à plataforma BIA (Formulador, Bioimpressão, Organoid Builder, Chat IA...)
  ✓ 3 encontros online ao vivo com a Dra. Kamila Leichtweis
    (25/nov · 15/dez · 26/jan — todos às 19:00 horário de Brasília)
  ✓ Biblioteca com 65+ artigos científicos e white papers Quantis
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
      <div style="display:inline-block;padding:4px 10px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:999px;color:#86efac;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">✓ Cadastro corrigido</div>
      <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;font-weight:800;color:#fff;">Olá, Larissa! Seu acesso está liberado 🎉</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#c7bfe6;">Boa notícia: seu cadastro na <strong style="color:#fff;">BIA Academy</strong> foi corrigido e agora está tudo pronto para você começar a estudar.</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://biaquantis.bio/academy/dashboard" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:#fff;text-decoration:none;font-size:16px;font-weight:700;border-radius:12px;box-shadow:0 10px 30px rgba(124,58,237,0.3);">Entrar na plataforma →</a>
      <div style="margin-top:14px;font-size:12px;color:#8b7fb5;"><a href="https://biaquantis.bio/academy/dashboard" style="color:#c7a7ff;">biaquantis.bio/academy/dashboard</a></div>
    </div>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">🔑 Suas credenciais</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#8b7fb5;width:80px;">E-mail:</td><td style="padding:6px 0;color:#fff;font-family:monospace;">${TO}</td></tr>
        <tr><td style="padding:6px 0;color:#8b7fb5;">Senha:</td><td style="padding:6px 0;color:#fff;">a mesma que você já tinha cadastrada na BIA</td></tr>
      </table>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);font-size:13px;color:#c7bfe6;line-height:1.5;">
        <strong style="color:#fff;">Não lembra da senha?</strong> Clica no botão abaixo pra criar uma nova em segundos:
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

  console.log(`\n📧 Enviando...`)
  console.log(`   DE: ${FROM}`)
  console.log(`   PARA: ${TO}`)
  console.log(`   CC: ${CC}`)
  console.log(`   REPLY-TO: ${CC}\n`)

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      cc: [CC],
      reply_to: CC,
      subject,
      text,
      html,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`❌ Resend ${res.status}:`, JSON.stringify(data, null, 2))
    process.exit(1)
  }
  console.log(`✅ ENVIADO!`)
  console.log(`   Resend ID: ${data.id}`)
}

main().catch(e => { console.error(e); process.exit(1) })
