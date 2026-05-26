/**
 * ═══════════════════════════════════════════════════════════════════════
 *  POST /api/auth/reset-password (R12.30)
 *  ─────────────────────────────────────────────────────────────────────
 *  Consome um token de reset e troca a senha.
 *
 *  Validações:
 *    · Token bem formado (regex)
 *    · Token existe no DB
 *    · Token NÃO expirou
 *    · Token NÃO foi usado
 *    · Nova senha ≥ 8 caracteres
 *
 *  Operações (transação):
 *    1. Atualiza User.password = bcrypt(newPassword)
 *    2. Marca PasswordResetToken.usedAt = now
 *    3. Invalida TODOS os outros tokens não-usados do mesmo usuário
 *    4. Audit log
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { hashToken, isWellFormedToken } from "@/lib/auth/password-reset-token"
import { ensurePasswordResetTable } from "@/lib/auth/password-reset-bootstrap"

const resetSchema = z.object({
  token: z.string().min(8).max(256),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres").max(200),
})

// GET /api/auth/reset-password?token=... — pré-valida o token (UX da página)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token || !isWellFormedToken(token)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_format", error: "Token inválido." },
      { status: 400 },
    )
  }

  // R12.31: garante tabela antes de qualquer query
  await ensurePasswordResetTable()

  try {
    const tokenHash = await hashToken(token)
    const entry = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!entry) {
      return NextResponse.json(
        { ok: false, reason: "not_found", error: "Este link de redefinição não foi reconhecido." },
        { status: 400 },
      )
    }
    if (entry.usedAt) {
      return NextResponse.json(
        { ok: false, reason: "used", error: "Este link já foi usado. Solicite um novo." },
        { status: 400 },
      )
    }
    if (entry.expires < new Date()) {
      return NextResponse.json(
        { ok: false, reason: "expired", error: "Este link expirou. Solicite um novo." },
        { status: 400 },
      )
    }

    return NextResponse.json({
      ok: true,
      email: maskEmail(entry.email),
      expiresAt: entry.expires.toISOString(),
    })
  } catch (e) {
    console.error("[reset-password GET] erro:", e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { ok: false, reason: "server_error", error: "Erro ao validar o link." },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 })
  }

  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      { ok: false, error: firstIssue?.message ?? "Dados inválidos" },
      { status: 400 },
    )
  }

  const { token, password } = parsed.data

  if (!isWellFormedToken(token)) {
    return NextResponse.json(
      { ok: false, error: "Token inválido." },
      { status: 400 },
    )
  }

  // R12.31: garante tabela antes de qualquer query
  await ensurePasswordResetTable()

  try {
    const tokenHash = await hashToken(token)
    const entry = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!entry) {
      return NextResponse.json(
        { ok: false, error: "Link inválido. Solicite um novo." },
        { status: 400 },
      )
    }
    if (entry.usedAt) {
      return NextResponse.json(
        { ok: false, error: "Este link já foi usado. Solicite um novo." },
        { status: 400 },
      )
    }
    if (entry.expires < new Date()) {
      return NextResponse.json(
        { ok: false, error: "Link expirado. Solicite um novo." },
        { status: 400 },
      )
    }

    const hashed = await bcrypt.hash(password, 12)
    const now = new Date()

    // Transação: troca senha + marca token usado + invalida demais
    await prisma.$transaction([
      prisma.user.update({
        where: { id: entry.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: entry.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: entry.userId,
          usedAt: null,
          id: { not: entry.id },
        },
        data: { usedAt: now },
      }),
    ])

    // Audit (fire-and-forget)
    prisma.auditLog
      .create({
        data: {
          userId: entry.userId,
          action: "password_reset_completed",
          entity: "user",
          metadata: { email: entry.email, ip },
        },
      })
      .catch(() => {})

    return NextResponse.json({
      ok: true,
      message: "Senha redefinida com sucesso. Você já pode entrar com a nova senha.",
    })
  } catch (e) {
    console.error("[reset-password POST] erro:", e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { ok: false, error: "Erro ao redefinir a senha. Tente novamente." },
      { status: 500 },
    )
  }
}

// ─── helpers ───

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 4))}@${domain}`
}
