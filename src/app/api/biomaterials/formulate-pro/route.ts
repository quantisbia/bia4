/**
 * BIA v4 — Formulador Profissional Pro
 * POST /api/biomaterials/formulate-pro
 *
 * Aceita biomateriais do catálogo OU custom (livre escolha do usuário),
 * valida com Zod, debita créditos e retorna formulação científica completa.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { prisma } from "@/lib/db/prisma"
import {
  formulateProfessional,
  type FormulatorInput,
  type ClinicalGoal,
  type BiomaterialRole,
} from "@/lib/ai/formulator-pro"
import { aiErrorToHttp } from "@/lib/ai/gemini"

const CLINICAL_GOALS = [
  "WOUND_HEALING",
  "BONE_REGENERATION",
  "GINGIVAL_REGENERATION",
  "CARTILAGE_REPAIR",
  "BREAST_IMPLANT",
  "VASCULAR_GRAFT",
  "NEURAL_REGENERATION",
  "DRUG_DELIVERY",
  "ORGANOID_SCAFFOLD",
  "GENERIC",
] as const

const ROLES = [
  "STRUCTURAL", "BIOACTIVE", "RHEOLOGY", "CROSSLINKER",
  "POROGEN", "ADDITIVE", "SOLVENT",
] as const

const componentSchema = z.object({
  name: z.string().min(1, "Nome do componente obrigatório").max(120),
  concentration: z.string().max(60).optional(),
  role: z.enum(ROLES).optional(),
  catalogId: z.string().optional(),
  knownProps: z.object({
    family: z.string().max(60).optional(),
    modulusKPa: z.number().positive().optional(),
    degradationDays: z.number().positive().optional(),
    crosslinkingMethods: z.array(z.string()).optional(),
    pH: z.number().min(0).max(14).optional(),
    chargedAt7: z.enum(["anionic", "cationic", "neutral", "amphoteric"]).optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
})

const rangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
}).optional()

const inputSchema = z.object({
  goal: z.string().min(3, "Descreva o objetivo clínico").max(300),
  goalCategory: z.enum(CLINICAL_GOALS).optional(),
  targetTissue: z.string().max(120).optional(),
  components: z.array(componentSchema).min(1, "Inclua ao menos 1 componente").max(8, "Máximo 8 componentes"),
  specs: z.object({
    targetModulusKPa: rangeSchema,
    porosityPercent: rangeSchema,
    poreSizeUm: rangeSchema,
    degradationDays: rangeSchema,
    swellingPercent: rangeSchema,
    viscoelasticBehavior: z.enum(["elastic", "viscoelastic", "plastic", "any"]).optional(),
    biodegradable: z.boolean().optional(),
    printable: z.boolean().optional(),
    cellLaden: z.boolean().optional(),
    sterilizable: z.boolean().optional(),
    transparent: z.boolean().optional(),
    injectable: z.boolean().optional(),
    pHRange: rangeSchema,
  }).optional(),
  constraints: z.object({
    avoidAnimalDerived: z.boolean().optional(),
    avoidPhotoinitiator: z.boolean().optional(),
    fdaApprovedOnly: z.boolean().optional(),
    costSensitive: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  }).optional(),
  mode: z.enum(["single", "alternatives"]).optional(),
})

export async function POST(req: NextRequest) {
  // 1) Auth
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  // 2) Parse + validate
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // 3) Cobrar créditos (BIOMATERIAL_FORMULATION = 10; modo alternatives = 15)
  const userRole = (session.user as { role?: string }).role
  const action = "BIOMATERIAL_FORMULATION"
  const description = `Formulador Pro: ${parsed.data.goal.substring(0, 80)}`
  const creditsMeta: Prisma.InputJsonValue = {
    goal: parsed.data.goal,
    goalCategory: parsed.data.goalCategory ?? "GENERIC",
    componentCount: parsed.data.components.length,
    mode: parsed.data.mode ?? "single",
  }

  const creditCheck = await requireCredits(
    session.user.id, action, description, creditsMeta, userRole,
  )
  if (creditCheck) return creditCheck.error

  // 4) Chamar IA
  try {
    const input: FormulatorInput = {
      goal: parsed.data.goal,
      goalCategory: parsed.data.goalCategory as ClinicalGoal | undefined,
      targetTissue: parsed.data.targetTissue,
      components: parsed.data.components.map(c => ({
        name: c.name,
        concentration: c.concentration,
        role: c.role as BiomaterialRole | undefined,
        catalogId: c.catalogId,
        knownProps: c.knownProps,
      })),
      specs: parsed.data.specs,
      constraints: parsed.data.constraints,
      mode: parsed.data.mode,
    }

    const formulation = await formulateProfessional(input)

    // 5) Persistir histórico (best-effort)
    try {
      await prisma.formulationRecord.create({
        data: {
          userId: session.user.id,
          biomaterialId:
            parsed.data.components.find(c => c.catalogId)?.catalogId ?? "custom-pro",
          customInputs: {
            goal: parsed.data.goal,
            goalCategory: parsed.data.goalCategory,
            components: parsed.data.components,
            specs: parsed.data.specs,
            constraints: parsed.data.constraints,
            mode: parsed.data.mode,
          } as Prisma.InputJsonValue,
          aiSuggestion: JSON.stringify(formulation).substring(0, 4000),
          creditsUsed: 10,
        },
      })
    } catch {
      // não bloqueia o retorno
    }

    return NextResponse.json(formulation)
  } catch (e) {
    const httpErr = aiErrorToHttp(e)
    return NextResponse.json(
      { error: httpErr.error, code: httpErr.code },
      { status: httpErr.status },
    )
  }
}
