/**
 * BIA v4.2 — API de Recomendação Inteligente (Agente BIA Bioimpressão Especial)
 *
 * POST /api/gcode/recommend
 * Body: {
 *   tissue: string,
 *   application: string,
 *   bioink: { material, hasCells, concentration, ... } (opcional),
 *   geometry: string (opcional),
 *   constraints: { maxTime_min?, nozzleOptions_um?, ... }
 * }
 *
 * Returns: recomendação JSON do agente BIA v4.2 com algoritmo, porosidade,
 * placa de poços sugerida, perfil de bioimpressora, viabilidade estimada,
 * e DOIs de referência.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { generateContent, SYSTEM_PROMPTS, BiaAIError, aiErrorToHttp } from "@/lib/ai/gemini"
import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

const schema = z.object({
  tissue: z.string().min(2),
  application: z.string().min(2),
  bioink: z.object({
    material: z.string(),
    hasCells: z.boolean().optional(),
    concentration: z.number().optional(),
  }).optional(),
  geometry: z.string().optional(),
  wellPlateFormat: z.union([z.literal(6), z.literal(12), z.literal(24), z.literal(48), z.literal(96), z.literal(384)]).optional(),
  numberOfWells: z.number().int().min(1).max(384).optional(),
  constraints: z.object({
    maxTime_min: z.number().optional(),
    maxShear_Pa: z.number().optional(),
    nozzleOptions_um: z.array(z.number()).optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { tissue, application, bioink, geometry, wellPlateFormat, numberOfWells, constraints } = parsed.data

  // Charge credit
  const userRole = (session.user as { role?: string }).role
  const creditCheck = await requireCredits(
    session.user.id,
    "STL_GCODE",
    `BIA v4.2 recomendação: ${tissue}`,
    { tissue, application } as Prisma.InputJsonValue,
    userRole,
  )
  if (creditCheck) return creditCheck.error

  const prompt = `
Você é o Agente BIA v4.2 — Bioimpressão Especial. Analise o caso e gere a recomendação JSON.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CASO:
- Tecido: ${tissue}
- Aplicação: ${application}
${bioink ? `- Bioink proposto: ${bioink.material}${bioink.concentration ? ` @ ${bioink.concentration}%` : ""}${bioink.hasCells ? " (com células)" : " (acelular)"}` : "- Bioink: ainda não definido"}
${geometry ? `- Geometria: ${geometry}` : ""}
${wellPlateFormat ? `- Placa alvo: ${wellPlateFormat}-well` : ""}
${numberOfWells ? `- Número de poços a imprimir: ${numberOfWells}` : ""}
${constraints?.maxTime_min ? `- Tempo máximo: ${constraints.maxTime_min} min` : ""}
${constraints?.nozzleOptions_um ? `- Nozzles disponíveis: ${constraints.nozzleOptions_um.join(", ")} µm` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUÇÕES:
1. Escolha o ALGORITMO DE INFILL ideal entre:
   gyroid_tpms | schwarz_p | diamond_tpms | honeycomb | gradient |
   voronoi_2d | voronoi_3d | perlin_noise | l_system | rectilinear | linear | concentric

2. Defina MACRO-POROSIDADE (sempre) e MICRO-POROSIDADE (se aplicável).
3. Se o usuário mencionou poços, recomende formato e estratégia de multiplexação.
4. Recomende BIOIMPRESSORA entre: cellink_biox | cellink_inkredible | allevi_2 | allevi_3 | regemat_bio_v1 | generic_marlin.
5. Estime VIABILIDADE e avisos críticos.
6. Forneça 2-4 DOIs reais de literatura 2020-2025.

Retorne EXATAMENTE este JSON (sem markdown, apenas o objeto):
{
  "recommendedAlgorithm": "...",
  "algorithmCategory": "paramétrico | não-paramétrico",
  "justification": "razão biológica (2-3 frases)",
  "infillPercent": 0-100,
  "macroPorosity": { "density": 0.0-1.0, "poreSize_um": 100-1000 },
  "microPorosity": { "density": 0.0-1.0, "poreSize_um": 10-100 } | null,
  "walls": 1-5,
  "layerHeight_mm": 0.1-0.5,
  "wellPlateRecommendation": {
    "format": 6|12|24|48|96|384,
    "numberOfWellsSuggested": number,
    "replicationMode": "same | different | gradient",
    "trajectoryAlgorithm": "nearest_2opt | serpentine | raster",
    "zHop_mm": 3-10,
    "purge_uL": 0-5,
    "rationale": "por que este formato"
  },
  "bioprinterRecommendation": {
    "id": "cellink_biox | allevi_3 | ...",
    "rationale": "por que essa impressora"
  },
  "nozzle_um": 100-840,
  "printSpeed_mms": 1-30,
  "pressure_kpa": 10-500,
  "expectedViability_pct": 0-100,
  "expectedPrintTime_min": number,
  "criticalWarnings": ["..."],
  "references": ["DOI:...", "DOI:..."]
}
`

  let recommendation: Record<string, unknown> = {}
  try {
    const { text } = await generateContent(prompt, {
      systemPrompt: SYSTEM_PROMPTS.BIOPRINTING_ENGINE_EXPERT,
    })
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("Resposta sem JSON")
    recommendation = JSON.parse(match[0])
  } catch (err) {
    console.error("[recommend]", err)
    if (err instanceof BiaAIError) {
      const r = aiErrorToHttp(err)
      return NextResponse.json({ error: r.error, code: r.code }, { status: r.status })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Falha ao gerar recomendação: ${msg}` },
      { status: 500 },
    )
  }

  // Audit
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "gcode_recommendation",
      entity: "gcode",
      metadata: { tissue, application, recommendation: recommendation as Prisma.InputJsonValue } as Prisma.InputJsonValue,
    },
  }).catch(() => {})

  return NextResponse.json({
    success: true,
    agent: "BIA v4.2 — Bioimpressão Especial",
    recommendation,
    creditsUsed: 6,
  })
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/gcode/recommend",
    method: "POST",
    agent: "BIA v4.2 — Bioimpressão Especial",
    description: "Recomenda algoritmo de infill, placa de poços e bioimpressora baseado no tecido-alvo.",
  })
}
