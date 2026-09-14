/**
 * BIA · Adapter Bioink → ExportableContent — R12.68
 *
 * Converte drafts de biotinta (T0 estrutural + T1 celular) + resultado de
 * reologia em ExportableContent.
 *
 * Escopo controlado pela usuária:
 *   - "active"  → só a biotinta ativa
 *   - "both"    → as duas biotintas juntas em um único documento
 *   - "single"  → uma única biotinta específica (por índice 0 ou 1)
 *
 * A página do Bioink usa "ask" no clique → abre picker → chama este adapter
 * com o escopo escolhido (comportamento opção C da Janaina no R12.68).
 */
import type { ExportableContent, ContentBlock } from "../types"

// ─── Tipos espelhados de /dashboard/bioprint/bioink/page.tsx ───

export interface FormulationDraftLike {
  tool: 0 | 1
  role: string // "structural" | "cellular"
  materialId: string
  concentration: number
  crosslinker: string
  crosslinkerConc: number
  hasCells: boolean
  cellType: string
  cellDensity: number
  additivesText: string
}

/** Info amigável do material vinda do catálogo (nome legível). */
export interface MaterialInfoLike {
  id: string
  label: string
  family?: string
  typicalUse?: string
}

/** Resultado de reologia (Hagen-Poiseuille). */
export interface RheologyResultLike {
  shearRateS: number
  wallShearStressPa: number
  viscosityPas?: number
  printabilityScore?: number
  warnings?: string[]
}

/**
 * Constrói ExportableContent a partir dos drafts + reologia + escopo.
 */
export function buildContentFromBioinkDrafts(params: {
  drafts: FormulationDraftLike[]
  materialsInfo?: MaterialInfoLike[] // opcional, para nomes legíveis
  rheology?: RheologyResultLike | null
  scope: "active" | "both" | "single"
  activeIdx?: 0 | 1
  singleIdx?: 0 | 1
  nozzleUm?: number
  printSpeedMmS?: number
  existing?: { entryId: string; currentVersion: number }
}): ExportableContent {
  const {
    drafts,
    materialsInfo = [],
    rheology,
    scope,
    activeIdx = 0,
    singleIdx = 0,
    nozzleUm,
    printSpeedMmS,
    existing,
  } = params

  // Seleciona quais drafts vão para o documento
  let chosen: FormulationDraftLike[]
  let scopeLabel: string
  if (scope === "both") {
    // Ordena por tool 0 depois tool 1 para sempre exportar T0-T1
    chosen = [...drafts].sort((a, b) => a.tool - b.tool)
    scopeLabel = "Biotintas T0 (estrutural) e T1 (celular)"
  } else if (scope === "single") {
    const d = drafts.find((x) => x.tool === singleIdx) ?? drafts[0]
    chosen = d ? [d] : []
    scopeLabel = d
      ? `Biotinta T${d.tool} (${humanRole(d.role)})`
      : "Biotinta"
  } else {
    // "active"
    const d = drafts.find((x) => x.tool === activeIdx) ?? drafts[0]
    chosen = d ? [d] : []
    scopeLabel = d
      ? `Biotinta ativa T${d.tool} (${humanRole(d.role)})`
      : "Biotinta"
  }

  const blocks: ContentBlock[] = []

  // Setup global (bico + velocidade)
  if (nozzleUm != null || printSpeedMmS != null) {
    blocks.push({ type: "heading", level: 2, text: "Configuração de bioimpressão" })
    const pairs: Array<{ key: string; value: string }> = []
    if (nozzleUm != null) pairs.push({ key: "Diâmetro do bico", value: `${nozzleUm} µm` })
    if (printSpeedMmS != null) pairs.push({ key: "Velocidade de impressão", value: `${printSpeedMmS} mm/s` })
    blocks.push({ type: "keyvalue", pairs })
  }

  // Um bloco por biotinta escolhida
  for (const d of chosen) {
    const materialLabel = resolveMaterialLabel(d.materialId, materialsInfo)
    blocks.push({ type: "divider" })
    blocks.push({
      type: "heading",
      level: 2,
      text: `Biotinta T${d.tool} · ${humanRole(d.role)}`,
    })
    const pairs: Array<{ key: string; value: string }> = [
      { key: "Material principal", value: materialLabel },
      { key: "Concentração", value: fmtConc(d.concentration) },
      { key: "Reticulante", value: d.crosslinker || "—" },
      { key: "Concentração do reticulante", value: fmtConc(d.crosslinkerConc) },
      { key: "Contém células", value: d.hasCells ? "Sim" : "Não" },
    ]
    if (d.hasCells) {
      pairs.push({ key: "Tipo celular", value: d.cellType || "—" })
      pairs.push({
        key: "Densidade celular",
        value: d.cellDensity != null ? `${d.cellDensity} × 10⁶ células/mL` : "—",
      })
    }
    blocks.push({ type: "keyvalue", pairs })

    if (d.additivesText?.trim()) {
      blocks.push({ type: "heading", level: 3, text: "Aditivos" })
      blocks.push({ type: "paragraph", text: d.additivesText.trim() })
    }
  }

  // Reologia (aplicada só se escopo tem 1 biotinta com resultado atual)
  if (rheology && chosen.length === 1) {
    blocks.push({ type: "divider" })
    blocks.push({ type: "heading", level: 2, text: "Reologia (Hagen-Poiseuille)" })
    const rheoPairs: Array<{ key: string; value: string }> = [
      { key: "Taxa de cisalhamento", value: `${rheology.shearRateS.toFixed(1)} s⁻¹` },
      { key: "Tensão de parede", value: `${rheology.wallShearStressPa.toFixed(1)} Pa` },
    ]
    if (rheology.viscosityPas != null) {
      rheoPairs.push({
        key: "Viscosidade estimada",
        value: `${rheology.viscosityPas.toFixed(2)} Pa·s`,
      })
    }
    if (rheology.printabilityScore != null) {
      rheoPairs.push({
        key: "Score de printabilidade",
        value: `${Math.round(rheology.printabilityScore)}/100`,
      })
    }
    blocks.push({ type: "keyvalue", pairs: rheoPairs })

    if (rheology.warnings && rheology.warnings.length > 0) {
      for (const w of rheology.warnings) {
        blocks.push({ type: "callout", variant: "warning", text: w })
      }
    }
  } else if (rheology && chosen.length > 1) {
    // Escopo "both" — informa que a reologia se aplica à biotinta ativa apenas
    blocks.push({
      type: "callout",
      variant: "info",
      title: "Reologia",
      text: "Os cálculos de reologia exibidos na interface se referem à biotinta ativa selecionada. Ao exportar as duas biotintas, apenas os parâmetros de formulação foram incluídos — para reologia individual, exporte cada biotinta separadamente.",
    })
  }

  // Título e tags
  const title = chosen.length === 2
    ? "Biotintas T0 + T1"
    : chosen.length === 1
      ? `Biotinta T${chosen[0].tool} · ${humanRole(chosen[0].role)}`
      : "Biotinta"

  const tags = uniqTags([
    "bioink",
    "biotinta",
    ...(chosen.map((c) => humanRole(c.role).toLowerCase())),
    ...(chosen.map((c) => slug(resolveMaterialLabel(c.materialId, materialsInfo)))),
  ])

  return {
    title,
    subtitle: scopeLabel,
    source: "Bioink",
    entryType: "FORMULATION",
    tags,
    category: "Biotinta",
    blocks,
    existing,
    metadata: {
      bioinkScope: scope,
      draftCount: chosen.length,
      nozzleUm,
      printSpeedMmS,
      hasRheology: rheology != null,
    },
    autoChangeSummary: `Biotinta atualizada · escopo=${scope}`,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function resolveMaterialLabel(id: string, catalog: MaterialInfoLike[]): string {
  const hit = catalog.find((m) => m.id === id)
  return hit?.label ?? id
}

function fmtConc(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  return `${n}%`
}

function humanRole(role: string): string {
  const map: Record<string, string> = {
    structural: "Estrutural",
    cellular: "Celular",
    STRUCTURAL: "Estrutural",
    CELLULAR: "Celular",
  }
  return map[role] ?? role
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
