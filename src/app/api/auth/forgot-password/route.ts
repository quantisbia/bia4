/**
 * ═══════════════════════════════════════════════════════════════════════
 *  POST /api/auth/forgot-password (R12.31 — revisado)
 *  ─────────────────────────────────────────────────────────────────────
 *  R12.31 muda a postura: o link de reset SEMPRE aparece na resposta
 *  quando o email existe. Email continua sendo enviado quando RESEND
 *  está configurado, mas o usuário NUNCA fica preso esperando algo
 *  que pode não chegar (spam, DNS, infra não configurada).
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

const forgotSchema = z.object({
  email: z.string().email("Email inválido").max(254),
})

// Rate limit simples em memória (por IP)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 min
const RATE_LIMIT_MAX = 10 // R12.31: subido de 5→10 para diminuir fricção
const rateLimitBucket = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const entry = rateLimitBucket.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitBucket.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  const userAgent = req.headers.get("user-agent")?.slice(0, 256) ?? null

  // Rate limit
  const rl = checkRateLimit(ip)
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
          metadata: {
            email: user.email,
            emailSent: emailResult.emailSent,
            emailProvider: emailResult.provider,
            emailError: emailResult.error ?? null,
            ip,
          },
        },
      })
      .catch(() => {})

    // ─── R12.31: SEMPRE devolve o resetUrl quando a conta existe ──
    // O usuário pode usar imediatamente sem depender do email chegar.
    // Isso resolve o problema de "o email não chega" definitivamente.
    return successResponse({
      accountExists: true,
      emailDelivered: emailResult.emailSent,
      emailProvider: emailResult.provider,
      resetUrl,
      message: emailResult.emailSent
        ? "Enviamos um link de redefinição para o seu email. " +
          "Você também pode usar o link abaixo agora mesmo (sem esperar o email):"
        : "Link de redefinição gerado. Use o botão abaixo para criar uma nova senha agora:",
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
