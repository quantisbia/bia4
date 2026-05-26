/**
 * BIA v4 — Salvar Formulação como Protocolo  (R12.28)
 * ─────────────────────────────────────────────────────────────────────────
 * POST /api/protocols/save-formulation
 *
 * Salva o resultado final do Formulador Pro como um Protocol persistente
 * (categoria "synthesis") para que o usuário possa abri-lo depois em
 * /dashboard/protocols, em outro dispositivo, ou exportá-lo para o caderno
 * de laboratório / impressão.
 *
 * IMPORTANTE: este endpoint NÃO chama IA e NÃO cobra créditos novos.
 * A formulação já foi gerada (e cobrada) em /api/biomaterials/... — aqui
 * só persistimos o resultado. Por isso `creditsUsed: 0`.
 *
 * O ProFormulation completo vai em `sourceInputs` (Json) para permitir
 * reabrir/editar a formulação em sessões futuras. O `content` recebe o
 * markdown formatado para leitura/impressão direta.
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

// ─── Schema ───────────────────────────────────────────────────────────────
// Aceita o ProFormulation completo de forma defensiva: cada campo é opcional
// porque o resultado da IA pode variar. As validações de mínimo garantem que
// pelo menos algo útil foi gerado antes de gravar no DB.
const scoreSchema = z.object({
  overall: z.number(),
  mechanical: z.number(),
  biological: z.number(),
  manufacturability: z.number(),
  regulatory: z.number(),
}).partial()

const componentSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  concentration: z.string().optional(),
  rationale: z.string().optional(),
  safetyClass: z.string().optional(),
})

const protocolStepSchema = z.object({
  step: z.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  timeMin: z.number().optional(),
  temperature: z.string().optional(),
  criticalPoint: z.boolean().optional(),
})

const warningSchema = z.object({
  severity: z.string().optional(),
  type: z.string().optional(),
  message: z.string().optional(),
  suggestion: z.string().optional(),
})

const formulationSchema = z.object({
  name: z.string().min(2, "Nome da formulação muito curto").max(300),
  goalCategory: z.string().optional(),
  rationale: z.string().optional(),
  scientificScore: scoreSchema.optional(),
  components: z.array(componentSchema).optional().default([]),
  crosslinking: z.object({
    method: z.string().optional(),
    parameters: z.record(z.string(), z.string()).optional(),
    rationale: z.string().optional(),
  }).optional(),
  predictedProperties: z.record(z.string(), z.string().optional()).optional(),
  preparationProtocol: z.array(protocolStepSchema).optional().default([]),
  warnings: z.array(warningSchema).optional().default([]),
  printingParameters: z.record(z.string(), z.unknown()).optional(),
  characterization: z.array(z.string()).optional().default([]),
  regulatory: z.object({
    estimatedClass: z.string().optional(),
    relevantStandards: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
  references: z.array(z.object({
    doi: z.string().optional(),
    title: z.string(),
    year: z.number().optional(),
  })).optional().default([]),
  alternatives: z.array(z.object({
    name: z.string(),
    summary: z.string().optional(),
    swapFromOriginal: z.string().optional(),
    tradeoff: z.string().optional(),
  })).optional(),
})

const bodySchema = z.object({
  formulation: formulationSchema,
  // Contexto opcional vindo do Step 1/2 do wizard (objetivo, tecido, etc.)
  // Não é validado contra um enum porque o wizard usa strings livres.
  inputContext: z.object({
    goal: z.string().optional(),
    goalCategory: z.string().optional(),
    targetTissue: z.string().optional(),
  }).optional(),
})

type FormulationInput = z.infer<typeof formulationSchema>

// ─── Formatador markdown (server-side, autônomo) ──────────────────────────
function formatFormulationAsMarkdown(r: FormulationInput): string {
  const lines: string[] = []
  lines.push(`# ${r.name}`)
  lines.push("")
  if (r.scientificScore?.overall !== undefined) {
    lines.push(`**Score científico: ${r.scientificScore.overall}/100**`)
    const s = r.scientificScore
    const parts: string[] = []
    if (s.mechanical !== undefined)        parts.push(`Mecânico ${s.mechanical}`)
    if (s.biological !== undefined)        parts.push(`Biológico ${s.biological}`)
    if (s.manufacturability !== undefined) parts.push(`Manufaturabilidade ${s.manufacturability}`)
    if (s.regulatory !== undefined)        parts.push(`Regulatório ${s.regulatory}`)
    if (parts.length > 0) lines.push(`_${parts.join(" · ")}_`)
    lines.push("")
  }
  if (r.rationale) {
    lines.push("## Racional científico")
    lines.push(r.rationale)
    lines.push("")
  }

  if (r.warnings && r.warnings.length > 0) {
    lines.push("## ⚠️ Alertas de incompatibilidade")
    r.warnings.forEach(w => {
      const sev = (w.severity ?? "info").toUpperCase()
      lines.push(`- **[${sev}]** ${w.message ?? ""}${w.suggestion ? ` — _${w.suggestion}_` : ""}`)
    })
    lines.push("")
  }

  if (r.components && r.components.length > 0) {
    lines.push("## Componentes da formulação")
    r.components.forEach(c => {
      const conc = c.concentration ? ` (${c.concentration})` : ""
      const role = c.role ? ` — _${c.role}_` : ""
      const rat  = c.rationale ? ` — ${c.rationale}` : ""
      lines.push(`- **${c.name}**${conc}${role}${rat}`)
    })
    lines.push("")
  }

  if (r.crosslinking?.method) {
    lines.push("## Crosslinking / Reticulação")
    lines.push(`**Método:** ${r.crosslinking.method}`)
    if (r.crosslinking.rationale) lines.push(r.crosslinking.rationale)
    if (r.crosslinking.parameters) {
      const ps = Object.entries(r.crosslinking.parameters)
      if (ps.length > 0) {
        lines.push("")
        ps.forEach(([k, v]) => lines.push(`- ${k}: ${v}`))
      }
    }
    lines.push("")
  }

  if (r.predictedProperties && Object.keys(r.predictedProperties).length > 0) {
    lines.push("## Propriedades preditas")
    Object.entries(r.predictedProperties).forEach(([k, v]) => {
      if (v) lines.push(`- **${k}**: ${v}`)
    })
    lines.push("")
  }

  if (r.preparationProtocol && r.preparationProtocol.length > 0) {
    lines.push("## Protocolo de preparação")
    r.preparationProtocol.forEach(p => {
      const step = p.step ?? "?"
      const crit = p.criticalPoint ? " ⚠️" : ""
      const meta: string[] = []
      if (p.timeMin !== undefined) meta.push(`${p.timeMin} min`)
      if (p.temperature)           meta.push(p.temperature)
      const metaStr = meta.length > 0 ? ` _(${meta.join(", ")})_` : ""
      lines.push(`${step}. **${p.title ?? ""}**${crit}${metaStr}`)
      if (p.description) lines.push(`   ${p.description}`)
    })
    lines.push("")
  }

  if (r.printingParameters && Object.keys(r.printingParameters).length > 0) {
    lines.push("## Parâmetros de bioimpressão")
    Object.entries(r.printingParameters).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return
      const val = typeof v === "object" ? JSON.stringify(v) : String(v)
      lines.push(`- **${k}**: ${val}`)
    })
    lines.push("")
  }

  if (r.characterization && r.characterization.length > 0) {
    lines.push("## Caracterização recomendada")
    r.characterization.forEach(c => lines.push(`- ${c}`))
    lines.push("")
  }

  if (r.regulatory) {
    lines.push("## Considerações regulatórias")
    if (r.regulatory.estimatedClass) lines.push(`**Classe estimada:** ${r.regulatory.estimatedClass}`)
    if (r.regulatory.relevantStandards && r.regulatory.relevantStandards.length > 0) {
      lines.push(`**Normas:** ${r.regulatory.relevantStandards.join(", ")}`)
    }
    if (r.regulatory.notes) lines.push(r.regulatory.notes)
    lines.push("")
  }

  if (r.references && r.references.length > 0) {
    lines.push("## Referências")
    r.references.forEach(ref => {
      const yr  = ref.year ? ` (${ref.year})` : ""
      const doi = ref.doi  ? ` — doi: ${ref.doi}` : ""
      lines.push(`- ${ref.title}${yr}${doi}`)
    })
    lines.push("")
  }

  if (r.alternatives && r.alternatives.length > 0) {
    lines.push("## Alternativas sugeridas")
    r.alternatives.forEach(a => {
      lines.push(`- **${a.name}**${a.summary ? ` — ${a.summary}` : ""}`)
      if (a.swapFromOriginal) lines.push(`   _Substitui:_ ${a.swapFromOriginal}`)
      if (a.tradeoff)         lines.push(`   _Trade-off:_ ${a.tradeoff}`)
    })
    lines.push("")
  }

  lines.push("---")
  lines.push(`_Gerado pelo Formulador Pro — BIA v4 · ${new Date().toLocaleString("pt-BR")}_`)
  return lines.join("\n")
}

// Extrai a lista de materiais para a coluna `materials` (Json estruturado).
function extractMaterials(r: FormulationInput): Array<Record<string, string>> {
  return (r.components ?? []).map(c => ({
    name: c.name,
    concentration: c.concentration ?? "",
    role: c.role ?? "",
    rationale: c.rationale ?? "",
  }))
}

// Extrai os passos para a coluna `steps` (Json estruturado).
function extractSteps(r: FormulationInput): Array<Record<string, unknown>> {
  return (r.preparationProtocol ?? []).map(p => ({
    step: p.step ?? null,
    title: p.title ?? "",
    description: p.description ?? "",
    timeMin: p.timeMin ?? null,
    temperature: p.temperature ?? null,
    criticalPoint: p.criticalPoint ?? false,
  }))
}

// ─── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "JSON inválido no body da requisição" }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { formulation, inputContext } = parsed.data

    const markdown = formatFormulationAsMarkdown(formulation)
    const summary  = (formulation.rationale ?? "Formulação salva do Formulador Pro").slice(0, 500)

    // Salva no DB. Não cobramos créditos — o usuário já pagou ao gerar.
    const saved = await prisma.protocol.create({
      data: {
        userId:      session.user.id,
        title:       formulation.name,
        // Usa "synthesis" para que o card apareça com label "Síntese de Biomaterial"
        // na página /dashboard/protocols, que é semanticamente o que uma
        // formulação de hidrogel/bioink é.
        category:    "synthesis",
        description: summary,
        content:     markdown,
        steps:       extractSteps(formulation)     as unknown as Prisma.InputJsonValue,
        materials:   extractMaterials(formulation) as unknown as Prisma.InputJsonValue,
        equipment:   [],
        safetyNotes: (formulation.warnings ?? [])
          .filter(w => w.severity === "critical" || w.severity === "warning")
          .map(w => `[${(w.severity ?? "warning").toUpperCase()}] ${w.message ?? ""}${w.suggestion ? ` — ${w.suggestion}` : ""}`),
        aiGenerated: true,
        sourceInputs: {
          source: "formulator-pro",
          inputContext: inputContext ?? null,
          // Guarda o ProFormulation completo para permitir reabrir/editar depois.
          // Cast como Json — Prisma trata structuredClone equivalente.
          formulation: formulation as unknown,
        } as unknown as Prisma.InputJsonValue,
        creditsUsed: 0,
      },
    })

    // Audit log (best-effort)
    prisma.auditLog.create({
      data: {
        userId:   session.user.id,
        action:   "formulation_saved",
        entity:   "protocol",
        entityId: saved.id,
        metadata: {
          source: "formulator-pro",
          name:   formulation.name,
          goal:   inputContext?.goalCategory ?? null,
        } as Prisma.InputJsonValue,
      },
    }).catch(() => {})

    return NextResponse.json(
      {
        id:        saved.id,
        title:     saved.title,
        category:  saved.category,
        createdAt: saved.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/protocols/save-formulation]", error)
    return NextResponse.json(
      { error: "Erro ao salvar formulação. Tente novamente em alguns segundos." },
      { status: 500 }
    )
  }
}
