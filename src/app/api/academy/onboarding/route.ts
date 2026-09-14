/**
 * BIA · Academy · API de onboarding — R13.02
 *
 * GET   /api/academy/onboarding    → estado do onboarding do aluno logado
 * PATCH /api/academy/onboarding    → salva as 3 respostas (parcial ou completo)
 *
 * Decisões:
 *   - onboarding é OPCIONAL (aluno pode pular)
 *   - Salva em AcademyEnrollment.onboarding (Json?)
 *   - Não bloqueia acesso ao curso: só personaliza a jornada
 *
 * Ownership: sempre exige session.user.id + matrícula ativa
 * (retorna 403 se não é STUDENT ou matrícula expirada).
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { hasAccess } from "@/lib/academy/enrollment"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

// ─── Vocabulário permitido (aparecem na UI de /academy/welcome) ─

const PREFERRED_AREAS = [
  "biofabricacao",
  "bioimpressao",
  "engenharia-tecidual",
  "biomateriais",
  "odontologia",
  "medicina-regenerativa",
  "cosmeticos",
  "farmaceutica",
  "biotecnologia",
  "saude-animal",
  "universidade",
  "pd-empresarial",
  "outra",
] as const

const EXPERIENCE_LEVELS = ["iniciante", "intermediario", "avancado"] as const

const MAIN_GOALS = [
  "formacao-academica",
  "aplicacao-clinica",
  "pesquisa",
  "empreender",
  "atualizacao-profissional",
  "outro",
] as const

// ─── Schemas ────────────────────────────────────────────────────

const patchSchema = z.object({
  preferredArea:    z.enum(PREFERRED_AREAS).optional().nullable(),
  experienceLevel:  z.enum(EXPERIENCE_LEVELS).optional().nullable(),
  mainGoal:         z.enum(MAIN_GOALS).optional().nullable(),
  /**
   * Se true, marca `skipped: true` + `answeredAt` mesmo com campos vazios.
   * Uso do botão "Pular por agora".
   */
  skip: z.boolean().optional(),
})

interface OnboardingPayload {
  preferredArea?: string | null
  experienceLevel?: string | null
  mainGoal?: string | null
  skipped?: boolean
  answeredAt?: string
}

// ─── GET ────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      onboarding: true,
      accessUntil: true,
      completedAt: true,
      enrolledAt: true,
      source: true,
    },
  })

  if (!enrollment) {
    return NextResponse.json(
      { error: "Sem matrícula ativa", state: "NO_ENROLLMENT" },
      { status: 403 },
    )
  }

  if (!hasAccess(enrollment)) {
    return NextResponse.json(
      { error: "Matrícula expirada", state: "EXPIRED" },
      { status: 403 },
    )
  }

  const ob = (enrollment.onboarding as OnboardingPayload | null) ?? null
  const completed = Boolean(
    ob && (ob.answeredAt || ob.preferredArea || ob.experienceLevel || ob.mainGoal),
  )

  return NextResponse.json({
    enrollmentId: enrollment.id,
    completed,
    skipped: Boolean(ob?.skipped),
    onboarding: ob,
    enrolledAt: enrollment.enrolledAt,
    accessUntil: enrollment.accessUntil,
  })
}

// ─── PATCH ──────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId: session.user.id },
    select: { id: true, onboarding: true, accessUntil: true, completedAt: true },
  })
  if (!enrollment) {
    return NextResponse.json(
      { error: "Sem matrícula ativa", state: "NO_ENROLLMENT" },
      { status: 403 },
    )
  }
  if (!hasAccess(enrollment)) {
    return NextResponse.json(
      { error: "Matrícula expirada", state: "EXPIRED" },
      { status: 403 },
    )
  }

  const previous = (enrollment.onboarding as OnboardingPayload | null) ?? {}
  const nextPayload: OnboardingPayload = {
    ...previous,
    // Campos são setados apenas se enviados no body (null explícito limpa)
    ...(parsed.data.preferredArea !== undefined
      ? { preferredArea: parsed.data.preferredArea }
      : {}),
    ...(parsed.data.experienceLevel !== undefined
      ? { experienceLevel: parsed.data.experienceLevel }
      : {}),
    ...(parsed.data.mainGoal !== undefined
      ? { mainGoal: parsed.data.mainGoal }
      : {}),
    answeredAt: new Date().toISOString(),
    skipped: parsed.data.skip
      ? true
      : previous.skipped && !anyFieldFilled(parsed.data)
        ? true
        : false,
  }

  await prisma.academyEnrollment.update({
    where: { id: enrollment.id },
    data: {
      onboarding: nextPayload as unknown as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({
    success: true,
    onboarding: nextPayload,
  })
}

function anyFieldFilled(p: {
  preferredArea?: string | null
  experienceLevel?: string | null
  mainGoal?: string | null
}): boolean {
  return Boolean(p.preferredArea || p.experienceLevel || p.mainGoal)
}
