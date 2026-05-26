/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Password Reset Email (R12.30)
 *  ─────────────────────────────────────────────────────────────────────
 *  Envia o link de redefinição de senha para o usuário.
 *
 *  Estratégia em CAMADAS (graceful degradation):
 *    1. Se RESEND_API_KEY estiver definido → envia via Resend API.
 *    2. Caso contrário → loga o link no servidor E retorna ele no
 *       payload da resposta (modo "fallback"). Isso permite que o
 *       administrador / o próprio usuário pegue o link quando a infra
 *       de email ainda não está configurada (early stage, dev, demo).
 *
 *  Filosofia: NUNCA bloquear o usuário só porque o email não foi
 *  configurado. A funcionalidade tem que funcionar — email é só o
 *  canal de entrega preferido.
 *
 *  Segurança:
 *    · Usa fetch direto à Resend (sem dependência npm — fica leve no
 *      bundle Cloudflare Workers).
 *    · Timeout de 10s para não travar o request do usuário.
 *    · Erros do Resend NÃO vazam para o usuário final (sempre 200 OK
 *      do endpoint /forgot-password para anti-enumeração).
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface SendResetEmailParams {
  to: string
  resetUrl: string
  userName?: string | null
  /** TTL em minutos do token (para exibir no email) */
  expiresInMin: number
}

export interface SendResetEmailResult {
  /** true se conseguimos enviar via Resend */
  emailSent: boolean
  /** O link em claro — sempre retornado para fallback / debug */
  resetUrl: string
  /** Provedor que tentou enviar (resend | none) */
  provider: "resend" | "none"
  /** Erro do provider (NÃO exibir ao usuário final) */
  error?: string
}

const RESET_EMAIL_TIMEOUT_MS = 10_000

/**
 * Envia o email de reset. NUNCA lança — falhas viram `emailSent: false`.
 */
export async function sendPasswordResetEmail(
  params: SendResetEmailParams,
): Promise<SendResetEmailResult> {
  const { to, resetUrl, userName, expiresInMin } = params

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const fromAddress = (process.env.RESEND_FROM_EMAIL || "BIA <onboarding@resend.dev>").trim()

  // Sem RESEND configurado → modo fallback
  if (!apiKey) {
    console.log(
      `[password-reset][fallback] RESEND_API_KEY ausente. Link para ${to}: ${resetUrl}`,
    )
    return {
      emailSent: false,
      resetUrl,
      provider: "none",
    }
  }

  const subject = "BIA — Redefinir sua senha"
  const greeting = userName ? `Olá, ${userName.split(" ")[0]}` : "Olá"

  const html = buildResetEmailHtml({ greeting, resetUrl, expiresInMin })
  const text = buildResetEmailText({ greeting, resetUrl, expiresInMin })

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), RESET_EMAIL_TIMEOUT_MS)

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.warn(`[password-reset][resend] HTTP ${res.status}: ${errText.slice(0, 200)}`)
      return {
        emailSent: false,
        resetUrl,
        provider: "resend",
        error: `Resend ${res.status}`,
      }
    }

    console.log(`[password-reset][resend] enviado para ${to}`)
    return {
      emailSent: true,
      resetUrl,
      provider: "resend",
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[password-reset][resend] falha: ${msg}`)
    return {
      emailSent: false,
      resetUrl,
      provider: "resend",
      error: msg,
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════════════

function buildResetEmailHtml(opts: {
  greeting: string
  resetUrl: string
  expiresInMin: number
}): string {
  const { greeting, resetUrl, expiresInMin } = opts
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redefinir sua senha — BIA</title>
</head>
<body style="margin:0;padding:0;background:#0a0514;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e7eb;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0a0514;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#13091f;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 16px;">
              <div style="font-size:14px;color:#a78bfa;font-weight:600;letter-spacing:0.05em;">BIA</div>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;color:#ffffff;">Redefinir sua senha</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#d1d5db;">${escapeHtml(greeting)},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#d1d5db;">
                Recebemos um pedido para redefinir a senha da sua conta na <strong>BIA</strong>.
                Clique no botão abaixo para criar uma nova senha:
              </p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${escapeAttr(resetUrl)}"
                   style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:12px;">
                  Redefinir minha senha
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#9ca3af;">
                Ou copie e cole este link no navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#a78bfa;word-break:break-all;">
                <a href="${escapeAttr(resetUrl)}" style="color:#a78bfa;text-decoration:underline;">${escapeHtml(resetUrl)}</a>
              </p>
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:14px 16px;margin:0 0 24px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#fbbf24;">
                  <strong>⏱ Este link expira em ${expiresInMin} minutos.</strong>
                  Por segurança, ele só pode ser usado uma vez.
                </p>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#9ca3af;">
                Se você <strong>não solicitou</strong> a redefinição, pode ignorar este email com segurança —
                sua senha atual continua válida.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#6b7280;text-align:center;">
                BIA — Plataforma de Bioengenharia<br/>
                Quantis Biotechnology · 2026
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildResetEmailText(opts: {
  greeting: string
  resetUrl: string
  expiresInMin: number
}): string {
  const { greeting, resetUrl, expiresInMin } = opts
  return `${greeting},

Recebemos um pedido para redefinir a senha da sua conta na BIA.

Clique no link abaixo para criar uma nova senha:

${resetUrl}

⏱ Este link expira em ${expiresInMin} minutos e só pode ser usado uma vez.

Se você não solicitou a redefinição, pode ignorar este email — sua senha atual continua válida.

—
BIA · Quantis Biotechnology
`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;")
}
