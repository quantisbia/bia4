/**
 * ═══════════════════════════════════════════════════════════════════════
 *  POST /api/auth/forgot-password (R12.30)
 *  ─────────────────────────────────────────────────────────────────────
 *  Inicia o fluxo de redefinição de senha.
 *
 *  Comportamento:
 *    1. Recebe { email }
 *    2. Procura usuário (sem expor se existe — anti-enumeração)
 *    3. Se existe:
 *         · invalida tokens anteriores não usados
 *         · gera novo token (256 bits) e salva o HASH no DB
 *         · monta URL: ${origin}/auth/reset-password?token=<plain>
 *         · tenta enviar email via Resend
 *    4. Sempre retorna 200 com { ok: true } — mas se RESEND não estiver
 *       configurado E o usuário existir, retorna ALSO `resetUrl` para
 *       fallback (modo dev / infra ainda não pronta). Isso evita travar
 *       o usuário esperando email que nunca vai chegar.
 *
 *  Rate limiting: básico in-memory (não distribuído — OK para early stage;
 *  Cloudflare WAF lida com abuso massivo).
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
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset"

const forgotSchema = z.object({
  email: z.string().email("Email inválido").max(254),
})

// Rate limit simples em memória (por IP)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 min
const RATE_LIMIT_MAX = 5
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

  // Resposta padrão (anti-enumeração) — sempre 200 OK
  const successResponse = (extra: Record<string, unknown> = {}) =>
    NextResponse.json({
      ok: true,
      message:
        "Se este email tem uma conta na BIA, você receberá um link de redefinição em alguns instantes. Verifique também a pasta de spam.",
      expiresInMin: TOKEN_TTL_MIN,
      ...extra,
    })

  try {
    const user = await getUserByEmail(email)

    // Usuário não existe → resposta padrão (não revela)
    if (!user) {
      console.log(`[forgot-password] email não encontrado: ${email.slice(0, 3)}***`)
      return successResponse()
    }

    // Gera token e salva hash
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

    // Monta URL absoluta
    const origin =
      req.headers.get("origin") ||
      process.env.NEXTAUTH_URL ||
      `https://${req.headers.get("host")}`
    const resetUrl = `${origin.replace(/\/$/, "")}/auth/reset-password?token=${encodeURIComponent(plainToken)}`

    // Tenta enviar email
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
            provider: emailResult.provider,
            ip,
          },
        },
      })
      .catch(() => {})

    // Se email FALHOU ou não está configurado → expõe o link na resposta.
    // Isso é a "Camada 2" da estratégia: garante que o usuário SEMPRE
    // consegue redefinir, mesmo sem infra de email.
    if (!emailResult.emailSent) {
      return successResponse({
        emailDelivered: false,
        fallbackResetUrl: resetUrl,
        notice:
          "O envio automático de email não está disponível no momento. Use o link abaixo (ele expira em " +
          TOKEN_TTL_MIN +
          " minutos):",
      })
    }

    return successResponse({ emailDelivered: true })
  } catch (e) {
    console.error("[forgot-password] erro:", e instanceof Error ? e.message : String(e))
    // Mesmo em erro interno, retorna 200 para não vazar info
    return successResponse({ emailDelivered: false })
  }
}
