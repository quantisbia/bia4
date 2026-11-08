import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getUserByEmail } from "@/lib/db/queries"
import {
  getClientInfo, isDisposableEmail, isProbeEmail, checkRateLimit,
  detectRegisterBurst, sendSecurityAlert, REGISTER_BURST_THRESHOLD,
} from "@/lib/security/request-guard"

// R33-B · Rate-limit de cadastro por IP (investigação 08/11: 4 contas em 4 s)
const REGISTER_RL_MAX = 5
const REGISTER_RL_WINDOW_MS = 15 * 60 * 1000

const registerSchema = z.object({
  firstName: z.string().min(2, "Nome muito curto"),
  lastName: z.string().min(2, "Sobrenome muito curto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  institution: z.string().optional(),
  researchArea: z.string().optional(),
  terms: z.string().or(z.boolean()),
})

export async function POST(req: NextRequest) {
  // R33-B · IP REAL (x-vercel-forwarded-for / primeiro IP público) + user-agent
  const { ip, userAgent, country } = getClientInfo(req)

  // R33-B · rate-limit por IP
  const rl = checkRateLimit("register", ip, REGISTER_RL_MAX, REGISTER_RL_WINDOW_MS)
  if (!rl.allowed) {
    prisma.auditLog.create({
      data: { action: "user_register_blocked", entity: "user", ip, metadata: { reason: "rate_limit", userAgent, country, retryAfterSec: rl.retryAfterSec } },
    }).catch(() => {})
    return NextResponse.json(
      { error: `Muitas tentativas de cadastro. Tente novamente em ${Math.ceil(rl.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    )
  }

  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // R33-B · bloqueia e-mails descartáveis/reservados (example.com, mailinator…) e sondas conhecidas
    const emailLower = parsed.data.email.toLowerCase().trim()
    if (isDisposableEmail(emailLower) || isProbeEmail(emailLower)) {
      prisma.auditLog.create({
        data: { action: "user_register_blocked", entity: "user", ip, metadata: { reason: isProbeEmail(emailLower) ? "probe_email" : "disposable_email", email: emailLower, userAgent, country } },
      }).catch(() => {})
      return NextResponse.json(
        { error: "Use um e-mail válido e permanente (institucional ou pessoal). E-mails temporários não são aceitos." },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, password, institution, researchArea } = parsed.data

    // Check if email already exists
    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: "Este email já está em uso." },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with subscription + credits in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: `${firstName} ${lastName}`.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
          institution: institution || null,
          researchArea: researchArea || null,
          emailVerified: new Date(), // Skip email verification for now
          role: "USER",
        },
      })

      // Create FREE subscription (30 welcome credits)
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: "FREE",
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          monthlyCredits: 30,
        },
      })

      // Create initial credit balance (30 boas-vindas)
      await tx.creditBalance.create({
        data: {
          userId: newUser.id,
          balance: 30,
          totalEarned: 30,
          totalSpent: 0,
        },
      })

      // Log welcome credits
      await tx.creditTransaction.create({
        data: {
          userId: newUser.id,
          type: "CREDIT",
          amount: 30,
          balance: 30,
          description: "Créditos de boas-vindas — Trial BIA (30 créditos)",
          metadata: { action: "welcome_credits", plan: "FREE" },
        },
      })

      // Audit log: user registration
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "user_register",
          entity: "user",
          entityId: newUser.id,
          ip,
          metadata: {
            institution: institution || null,
            researchArea: researchArea || null,
            registeredAt: new Date().toISOString(),
            userAgent,
            country,
          },
        },
      })

      return newUser
    })

    // R33-B · detector de rajada (persistente via AuditLog) → alerta por e-mail
    detectRegisterBurst(prisma.auditLog, ip)
      .then(async ({ count, burst }) => {
        if (!burst) return
        await prisma.auditLog.create({
          data: { action: "security_register_burst", entity: "ip", entityId: ip, ip, metadata: { count, windowMin: 10, lastEmail: user.email, userAgent, country } },
        }).catch(() => {})
        await sendSecurityAlert({
          subject: `${count} cadastros do mesmo IP em 10 min (${ip})`,
          lines: [
            `IP: ${ip}${country ? ` (${country})` : ""}`,
            `User-Agent: ${userAgent ?? "-"}`,
            `Último e-mail cadastrado: ${user.email}`,
            `Limiar: > ${REGISTER_BURST_THRESHOLD} cadastros / 10 min`,
            "Verifique em /admin/users e, se for sonda, rode scripts/purge-test-accounts.ts",
          ],
        })
      })
      .catch(() => {})

    return NextResponse.json(
      {
        success: true,
        message: "Conta criada com sucesso!",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[REGISTER] Error:", msg)

    // Log failed attempt
    await prisma.auditLog.create({
      data: {
        action: "user_register_failed",
        ip,
        metadata: { error: msg.slice(0, 500), userAgent, country },
      },
    }).catch(() => {})

    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    )
  }
}

