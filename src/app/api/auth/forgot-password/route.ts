/**
 * ═══════════════════════════════════════════════════════════════════════
 *  POST /api/auth/forgot-password (R12.31 — revisado · R33-B endurecido)
 *  ─────────────────────────────────────────────────────────────────────
 *  R33-B (08/11/2026): o `resetUrl` NÃO é mais devolvido na resposta HTTP.
 *  A política R12.31 (link sempre visível) permitia que QUALQUER pessoa que
 *  soubesse o e-mail de um usuário redefinisse a senha dele sem acesso à
 *  caixa de entrada — exatamente o fluxo sondado por `ss.keyprobe.01`.
 *  Hoje o Resend está operacional; o link vai SÓ por e-mail. Se o envio
 *  falhar, a resposta informa e orienta a contatar o suporte.
 *  Exceção controlada: RESET_LINK_IN_RESPONSE=1 (apenas dev/local).
 *
 *  Bootstrap da tabela: chama ensurePasswordResetTable() antes do
 *  INSERT — torna o endpoint resiliente a migrations não aplicadas.
 *
 *  Anti-enumeração mantida: emails NÃO cadastrados recebem mensagem
 *  genérica sem `resetUrl`. Atacante não consegue distinguir.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getUserByEmail } from "@/lib/db/queries"
import {
  generateResetToken,
  tokenExpiry,
  TOKEN_TTL_MIN,
} from "@/lib/auth/password-reset-token"
import { ensurePasswordResetTable } from "@/lib/auth/password-reset-bootstrap"
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset"
import { getClientInfo, checkRateLimit } from "@/lib/security/request-guard"

// R33-B · só em desenvolvimento local, nunca em produção
const RESET_LINK_IN_RESPONSE = process.env.RESET_LINK_IN_RESPONSE === "1" && process.env.NODE_ENV !== "production"

const forgotSchema = z.object({
  email: z.string().email("Email inválido").max(254),
})

// Rate limit por IP (R33-B: volta a 5 / 15 min — o link agora só vai por e-mail)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5

export async function POST(req: NextRequest) {
  // R33-B · IP real + user-agent (x-vercel-forwarded-for / primeiro IP público)
  const { ip, userAgent, country } = getClientInfo(req)

  // Rate limit
  const rl = checkRateLimit("forgot-password", ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)
  if (!rl.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Muitas tentativas. Tente novamente em ${rl.retryAfterSec}s.`,
      },
      { status: 429 },
    )
  }

  // Parse
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 })
  }

  const parsed = forgotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Email inválido" },
      { status: 400 },
    )
  }

  const email = parsed.data.email.trim().toLowerCase()

  // ─── BOOTSTRAP — garante tabela disponível ──
  const tableReady = await ensurePasswordResetTable()
  if (!tableReady) {
    console.error("[forgot-password] tabela password_reset_tokens indisponível")
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sistema de recuperação temporariamente indisponível. " +
          "Entre em contato com o suporte: contato@quantisbiotech.com",
      },
      { status: 503 },
    )
  }

  // Resposta padrão (anti-enumeração) — sempre 200 OK
  const successResponse = (extra: Record<string, unknown> = {}) =>
    NextResponse.json({
      ok: true,
      expiresInMin: TOKEN_TTL_MIN,
      ...extra,
    })

  try {
    const user = await getUserByEmail(email)

    // ─── Email NÃO cadastrado → resposta neutra (anti-enumeração) ──
    if (!user) {
      console.log(`[forgot-password] email não cadastrado: ${email.slice(0, 3)}***`)
      return successResponse({
        accountExists: false,
        message:
          "Se este email tem uma conta na BIA, geramos um link de redefinição. " +
          "Verifique sua caixa de entrada e spam.",
      })
    }

    // ─── Gera token e salva hash ──
    const { plainToken, tokenHash } = await generateResetToken()
    const expires = tokenExpiry()

    // Invalida tokens anteriores não usados do mesmo usuário
    await prisma.passwordResetToken
      .updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expires: { gt: new Date() },
        },
        data: {
          usedAt: new Date(),
        },
      })
      .catch((e) => {
        console.warn(`[forgot-password] falha invalidando tokens antigos:`, e)
      })

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        email: user.email,
        tokenHash,
        expires,
        ip: ip.slice(0, 64),
        userAgent,
      },
    })

    // ─── Monta URL absoluta de reset ──
    const origin =
      req.headers.get("origin") ||
      process.env.NEXTAUTH_URL ||
      `https://${req.headers.get("host")}`
    const resetUrl = `${origin.replace(/\/$/, "")}/auth/reset-password?token=${encodeURIComponent(plainToken)}`

    // ─── Tenta enviar email (não-bloqueante para a UX) ──
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      userName: user.name,
      expiresInMin: TOKEN_TTL_MIN,
    })

    // Audit log (fire-and-forget)
    prisma.auditLog
      .create({
        data: {
          userId: user.id,
          action: "password_reset_requested",
          entity: "user",
          ip: ip !== "unknown" ? ip : null,
          metadata: {
            email: user.email,
            emailSent: emailResult.emailSent,
            emailProvider: emailResult.provider,
            emailError: emailResult.error ?? null,
            ip,
            userAgent,
            country,
          },
        },
      })
      .catch(() => {})

    // ─── R33-B: o link vai SÓ por e-mail. Nunca na resposta em produção. ──
    if (RESET_LINK_IN_RESPONSE) {
      return successResponse({ accountExists: true, emailDelivered: emailResult.emailSent, resetUrl, message: "[DEV] Link de redefinição (apenas ambiente local):" })
    }
    if (!emailResult.emailSent) {
      console.error(`[forgot-password] e-mail NÃO enviado para ${user.email}: ${emailResult.error ?? emailResult.provider}`)
      return NextResponse.json(
        {
          ok: false,
          emailDelivered: false,
          error:
            "Não conseguimos enviar o e-mail de redefinição agora. Tente novamente em alguns minutos " +
            "ou escreva para suporte@quantis.bio informando o e-mail da sua conta.",
        },
        { status: 502 },
      )
    }
    return successResponse({
      accountExists: true,
      emailDelivered: true,
      message:
        "Enviamos um link de redefinição para o seu e-mail. " +
        `Ele vale por ${TOKEN_TTL_MIN} minutos — verifique também a pasta de spam.`,
    })
  } catch (e) {
    console.error("[forgot-password] erro:", e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      {
        ok: false,
        error:
          "Não foi possível gerar o link de redefinição. Tente novamente em alguns segundos.",
      },
      { status: 500 },
    )
  }
}
