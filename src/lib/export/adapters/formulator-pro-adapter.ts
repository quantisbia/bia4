/**
 * BIA · Adapter Formulator Pro → ExportableContent — R12.68
 *
 * Converte um resultado do Formulador Profissional Pro (16 campos: score,
 * componentes, crosslinking, protocolo de preparação, warnings,
 * printingParameters, characterization, regulatory, references,
 * alternatives...) em ExportableContent.
 *
 * Este é o adapter MAIS RICO da suite — o output da IA científica do
 * Formulator Pro é o coração da BIA e merece um PDF/DOCX à altura.
 */
import type { ExportableContent, ContentBlock } from "../types"

// ─── Tipos espelhados de /dashboard/formulator-pro/page.tsx ────

export interface ProFormulationLike {
  name: string
  goalCategory: string
  rationale: string
  scientificScore: {
    overall: number
    mechanical: number
    biological: number
    manufacturability: number
    regulatory: number
  }
  components: Array<{
    name: string
    role: string
    concentration: string
    rationale: string
    safetyClass?: string
  }>
  crosslinking: {
    method: string
    parameters: Record<string, string>
    rationale: string
  }
  predictedProperties: Record<string, string | undefined>
  preparationProtocol: Array<{
    step: number
    title: string
    description: string
    timeMin?: number
    temperature?: string
    criticalPoint?: boolean
  }>
  warnings: Array<{
    severity: "info" | "warning" | "critical"
    type: string
    message: string
    suggestion?: string
  }>
  printingParameters?: Record<string, unknown>
  characterization: string[]
  regulatory: {
    estimatedClass: string
    relevantStandards: string[]
    notes: string
  }
  references: Array<{ doi?: string; title: string; year?: number }>
  alternatives?: Array<{
    name: string
    summary: string
    swapFromOriginal: string
    tradeoff: string
  }>
}

/** Contexto de entrada da formulação (o que o usuário digitou). */
export interface FormulatorInputContextLike {
  goal?: string
  targetTissue?: string
  goalCategory?: string
  specs?: Record<string, unknown>
  constraints?: Record<string, unknown>
}

/**
 * Constrói ExportableContent a partir do resultado da IA + contexto de input.
 */
export function buildContentFromProFormulation(params: {
  result: ProFormulationLike
  inputContext?: FormulatorInputContextLike
  existing?: { entryId: string; currentVersion: number }
}): ExportableContent {
  const { result, inputContext, existing } = params

  const blocks: ContentBlock[] = []

  // ── 1. Rationale + scores ─────────────────────────────────────
  if (result.rationale) {
    blocks.push({ type: "paragraph", text: result.rationale })
  }

  const s = result.scientificScore
  if (s) {
    blocks.push({
      type: "keyvalue",
      title: "Scores científicos (0-100)",
      pairs: [
        { key: "Score geral", value: fmtScore(s.overall) },
        { key: "Mecânico", value: fmtScore(s.mechanical) },
        { key: "Biológico", value: fmtScore(s.biological) },
        { key: "Manufaturabilidade", value: fmtScore(s.manufacturability) },
        { key: "Regulatório", value: fmtScore(s.regulatory) },
      ],
    })
  }

  // ── 2. Contexto (objetivo clínico) ────────────────────────────
  if (inputContext) {
    const ctxPairs: Array<{ key: string; value: string }> = []
    if (inputContext.goal) ctxPairs.push({ key: "Objetivo clínico", value: inputContext.goal })
    if (inputContext.targetTissue) ctxPairs.push({ key: "Tecido-alvo", value: inputContext.targetTissue })
    if (inputContext.goalCategory) ctxPairs.push({ key: "Categoria", value: inputContext.goalCategory })
    if (ctxPairs.length > 0) {
      blocks.push({ type: "heading", level: 2, text: "Contexto clínico" })
      blocks.push({ type: "keyvalue", pairs: ctxPairs })
    }
  }

  // ── 3. Componentes (tabela) ───────────────────────────────────
  if (result.components && result.components.length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Componentes da formulação" })
    blocks.push({
      type: "table",
      headers: ["Componente", "Papel", "Concentração", "Segurança"],
      rows: result.components.map((c) => [
        c.name ?? "",
        humanRole(c.role),
        c.concentration ?? "",
        c.safetyClass ?? "—",
      ]),
    })
    // Racionais individuais (só se ao menos 1 componente tiver rationale)
    const withRationale = result.components.filter((c) => c.rationale?.trim())
    if (withRationale.length > 0) {
      blocks.push({ type: "heading", level: 3, text: "Justificativa por componente" })
      for (const c of withRationale) {
        blocks.push({
          type: "keyvalue",
          pairs: [{ key: c.name, value: c.rationale }],
        })
      }
    }
  }

  // ── 4. Reticulação ────────────────────────────────────────────
  if (result.crosslinking) {
    blocks.push({ type: "heading", level: 2, text: "Reticulação" })
    const cxPairs: Array<{ key: string; value: string }> = [
      { key: "Método", value: result.crosslinking.method ?? "—" },
    ]
    for (const [k, v] of Object.entries(result.crosslinking.parameters ?? {})) {
      cxPairs.push({ key: k, value: String(v) })
    }
    blocks.push({ type: "keyvalue", pairs: cxPairs })
    if (result.crosslinking.rationale) {
      blocks.push({ type: "paragraph", text: result.crosslinking.rationale })
    }
  }

  // ── 5. Propriedades previstas ─────────────────────────────────
  const predEntries = Object.entries(result.predictedProperties ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  )
  if (predEntries.length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Propriedades previstas" })
    blocks.push({
      type: "keyvalue",
      pairs: predEntries.map(([k, v]) => ({ key: k, value: String(v) })),
    })
  }

  // ── 6. Protocolo de preparação ────────────────────────────────
  if (result.preparationProtocol && result.preparationProtocol.length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Protocolo de preparação" })
    for (const p of result.preparationProtocol) {
      const meta: string[] = []
      if (p.timeMin != null) meta.push(`${p.timeMin} min`)
      if (p.temperature) meta.push(p.temperature)
      if (p.criticalPoint) meta.push("⚠ ponto crítico")
      const stepTitle = `Passo ${p.step}${p.title ? `: ${p.title}` : ""}`
      blocks.push({
        type: "heading",
        level: 3,
        text: meta.length > 0 ? `${stepTitle} · ${meta.join(" · ")}` : stepTitle,
      })
      if (p.description) blocks.push({ type: "paragraph", text: p.description })
    }
  }

  // ── 7. Warnings ───────────────────────────────────────────────
  if (result.warnings && result.warnings.length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Alertas e incompatibilidades" })
    for (const w of result.warnings) {
      blocks.push({
        type: "callout",
        variant:
          w.severity === "critical"
            ? "warning"
            : w.severity === "warning"
              ? "warning"
              : "info",
        title: w.type ? `[${w.type}] ${w.severity.toUpperCase()}` : w.severity.toUpperCase(),
        text: w.suggestion ? `${w.message} — Sugestão: ${w.suggestion}` : w.message,
      })
    }
  }

  // ── 8. Parâmetros de impressão ────────────────────────────────
  if (result.printingParameters && Object.keys(result.printingParameters).length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Parâmetros de bioimpressão" })
    const printPairs = Object.entries(result.printingParameters).map(
      ([k, v]) => ({
        key: k,
        value: typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
      }),
    )
    blocks.push({ type: "keyvalue", pairs: printPairs })
  }

  // ── 9. Caracterização recomendada ─────────────────────────────
  if (result.characterization && result.characterization.length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Caracterização recomendada" })
    blocks.push({ type: "list", items: result.characterization })
  }

  // ── 10. Regulatório ───────────────────────────────────────────
  if (result.regulatory) {
    blocks.push({ type: "heading", level: 2, text: "Considerações regulatórias" })
    blocks.push({
      type: "keyvalue",
      pairs: [
        { key: "Classe estimada", value: result.regulatory.estimatedClass ?? "—" },
      ],
    })
    if (result.regulatory.relevantStandards && result.regulatory.relevantStandards.length > 0) {
      blocks.push({ type: "heading", level: 3, text: "Normas aplicáveis" })
      blocks.push({ type: "list", items: result.regulatory.relevantStandards })
    }
    if (result.regulatory.notes) {
      blocks.push({ type: "paragraph", text: result.regulatory.notes })
    }
  }

  // ── 11. Alternativas ─────────────────────────────────────────
  if (result.alternatives && result.alternatives.length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Formulações alternativas" })
    for (const a of result.alternatives) {
      blocks.push({ type: "heading", level: 3, text: a.name })
      if (a.summary) blocks.push({ type: "paragraph", text: a.summary })
      if (a.swapFromOriginal) {
        blocks.push({
          type: "keyvalue",
          pairs: [
            { key: "Substituição em relação à formulação original", value: a.swapFromOriginal },
            { key: "Trade-off", value: a.tradeoff },
          ],
        })
      }
    }
  }

  // ── 12. Referências ───────────────────────────────────────────
  if (result.references && result.references.length > 0) {
    blocks.push({ type: "heading", level: 2, text: "Referências" })
    blocks.push({
      type: "list",
      items: result.references.map((r) => {
        const year = r.year ? ` (${r.year})` : ""
        const doi = r.doi ? ` · DOI: ${r.doi}` : ""
        return `${r.title}${year}${doi}`
      }),
    })
  }

  return {
    title: result.name || "Formulação sem título",
    subtitle: humanGoal(result.goalCategory),
    source: "Formulator Pro",
    entryType: "FORMULATION",
    tags: uniqTags([
      "formulacao",
      "formulator-pro",
      slug(result.goalCategory),
      ...(result.components ?? []).slice(0, 3).map((c) => slug(c.name)),
    ]),
    category: humanGoal(result.goalCategory),
    blocks,
    existing,
    metadata: {
      goalCategory: result.goalCategory,
      scientificScore: result.scientificScore,
      componentCount: result.components?.length ?? 0,
      inputContext: inputContext ?? null,
    },
    autoChangeSummary: `Formulação regenerada · score ${fmtScore(result.scientificScore?.overall ?? 0)}`,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function fmtScore(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  return `${Math.round(n)}/100`
}

function humanRole(role: string): string {
  const map: Record<string, string> = {
    STRUCTURAL: "Estrutural",
    BIOACTIVE: "Bioativo",
    RHEOLOGY: "Reológico",
    CROSSLINKER: "Reticulante",
    POROGEN: "Porógeno",
    ADDITIVE: "Aditivo",
    SOLVENT: "Solvente",
  }
  return map[role] ?? role
}

function humanGoal(cat: string): string {
  const map: Record<string, string> = {
    WOUND_HEALING: "Cicatrização cutânea",
    BONE_REGENERATION: "Regeneração óssea",
    GINGIVAL_REGENERATION: "Regeneração gengival",
    CARTILAGE_REPAIR: "Cartilagem articular",
    BREAST_IMPLANT: "Implante mamário biodegradável",
    VASCULAR_GRAFT: "Enxerto vascular",
    NEURAL_REGENERATION: "Regeneração nervosa",
    DRUG_DELIVERY: "Entrega controlada de fármaco",
    ORGANOID_SCAFFOLD: "Suporte para organoide",
    GENERIC: "Formulação genérica",
  }
  return map[cat] ?? cat
}

function slug(input: string | undefined): string {
  if (!input) return ""
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function uniqTags(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of list) {
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}
