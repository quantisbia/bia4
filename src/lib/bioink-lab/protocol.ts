/**
 * BIA v4 · R16 · Exportação de protocolo (Markdown) + handoff para o pipeline
 */
import type { BenchPlan, CellTypeId, Recipe, WindowPoint } from "./types"
import { CELL_LABELS } from "./recipes"
import { relevantTroubles } from "./troubleshooting"

export interface ProtocolInput {
  recipe: Recipe
  cell: CellTypeId
  cellDensity_Mml: number | null
  bench: BenchPlan
  window: WindowPoint
  operator?: string
  date?: Date
}

const line = (s = "") => s + "\n"

export function protocolMarkdown(p: ProtocolInput): string {
  const { recipe: r, bench: b, window: w } = p
  const date = (p.date ?? new Date()).toISOString().slice(0, 10)
  const cellLabel = CELL_LABELS[p.cell]?.label ?? p.cell
  const hasCells = p.cell !== "none" && (p.cellDensity_Mml ?? 0) > 0
  let md = ""
  md += line(`# Protocolo de biotinta — ${r.name}`)
  md += line(`_BIA · Laboratório de Biotintas · ${date}${p.operator ? ` · ${p.operator}` : ""}_`)
  md += line()
  md += line(`> ${r.short}`)
  md += line()
  md += line(`**Células:** ${cellLabel}${hasCells ? ` · ${p.cellDensity_Mml} × 10⁶/mL` : ""}  `)
  md += line(`**Reticulação:** ${r.pipelineCrosslinker} (${r.crosslink})  `)
  md += line(`**Temperatura de impressão:** ${r.printTemp_C} °C${r.bedTemp_C != null ? ` · mesa ${r.bedTemp_C} °C` : ""}  `)
  md += line(`**Janela de biofabricação:** fidelidade ${w.fidelity}/100 · viabilidade ${w.viability}/100 · ${w.inWindow ? "dentro da janela" : "fora da janela"}  `)
  md += line(`**Janela de impressão após preparo:** ${r.printWindow_min[0]}–${r.printWindow_min[1]} min · células fora da incubadora ≤ ${r.cellWindow_min} min`)
  md += line()

  md += line(`## 1. Quantidades para ${b.totalVolume_mL} mL`)
  md += line(`Volume do construto + volume morto (${b.deadVolume_mL} mL) + margem. ${b.syringes} seringa(s) de ${b.perSyringe_mL} mL.`)
  md += line()
  md += line(`| Componente | Quantidade | Obs. |`)
  md += line(`|---|---|---|`)
  for (const l of b.lines) md += line(`| ${l.name} | ${l.value} | ${l.note ?? ""} |`)
  md += line()

  md += line(`## 2. Preparo`)
  r.prep.forEach((s, i) => {
    md += line(`${i + 1}. **${s.title}**${s.critical ? " ⚠️" : ""} — ${s.detail}${s.minutes ? ` _(${s.minutes} min${s.temp_C != null ? `, ${s.temp_C} °C` : ""})_` : ""}`)
  })
  md += line()
  md += line(`**Esterilização:** ${r.sterilization}  `)
  md += line(`**Validade:** ${r.shelfLife}`)
  md += line()

  if (hasCells) {
    md += line(`## 3. Incorporação das células`)
    md += line(`- Densidade alvo: ${p.cellDensity_Mml} × 10⁶ cel/mL (faixa validada ${r.cellDensity_Mml[0]}–${r.cellDensity_Mml[1]}).`)
    md += line(`- ${r.cellMixRatio}.`)
    md += line(`- Biotinta a ${r.printTemp_C} °C antes de misturar; nunca acima de 37 °C com células.`)
    md += line(`- Carregar a seringa sem ar; imprimir em até ${r.cellWindow_min} min.`)
    md += line()
  }

  md += line(`## ${hasCells ? 4 : 3}. Parâmetros iniciais de impressão`)
  const sp = r.startParams
  md += line(`- Agulha ${sp.nozzle_mm} mm · velocidade ${sp.speed_mms} mm/s · camada ${sp.layerHeight_mm} mm · fluxo ${sp.flowPercent} %`)
  if (sp.pressure_kPa) md += line(`- Pressão pneumática equivalente: ${sp.pressure_kPa[0]}–${sp.pressure_kPa[1]} kPa`)
  md += line(`- Teste do filamento antes do G-code: 1 linha reta de 20 mm + 1 ângulo de 90°. Cordão contínuo, sem gota, sem fio → prossiga.`)
  md += line()

  md += line(`## ${hasCells ? 5 : 4}. Reticulação`)
  r.crosslinkProtocol.forEach((s, i) => {
    md += line(`${i + 1}. **${s.title}** — ${s.detail}${s.minutes ? ` _(${s.minutes} min)_` : ""}`)
  })
  md += line()

  md += line(`## ${hasCells ? 6 : 5}. Se der errado`)
  for (const t of relevantTroubles(r.crosslink, hasCells, r.components.some((c) => c.role === "bioactive")).slice(0, 6)) {
    md += line(`- **${t.symptom}** → ${t.fixes[0]}${t.knob ? ` _(ajuste: ${t.knob.param} ${t.knob.direction === "up" ? "↑" : "↓"} ${t.knob.amount})_` : ""}`)
  }
  md += line()

  md += line(`## Referências`)
  for (const ref of r.references) {
    md += line(`- ${ref.label}${ref.doi ? ` — https://doi.org/${ref.doi}` : ref.url ? ` — ${ref.url}` : ""}`)
  }
  md += line()
  md += line(`---`)
  md += line(`_Gerado pela BIA (Quantis Biotechnology). Valide em piloto antes de uso com amostras valiosas._`)
  return md
}

/**
 * Converte receita + decisões em um patch para o BioprintProcessContext
 * (`updateBioink`). Preenche `formulations[0]` E os campos legados na raiz,
 * que são lidos pelo Fatiamento/Controle/BioSlicer.
 */
export interface BioinkPatchLike {
  status: "ready"
  strategy: "single" | "dual"
  material: string
  materialId: string
  concentration: number
  crosslinker: string
  crosslinkerConc: number
  cellType: string
  cellDensityMillionMl: number
  additives: string[]
  rheology: { viscosityPaS: number; flowIndex: number; consistencyK: number; yieldStressPa: number }
  formulations: Array<{
    tool: 0 | 1 | 2 | 3
    color: string
    role: "structural" | "cellular" | "sacrificial" | "vascular" | "support-bath"
    material: string
    materialId: string
    concentration: number
    crosslinker: string
    crosslinkerConc: number
    cellType: string
    cellDensityMillionMl: number
    additives: string[]
    rheology: { viscosityPaS: number; flowIndex: number; consistencyK: number; yieldStressPa: number }
    label: string
  }>
  /** metadados extras do R16 */
  labRecipeId: string
  labPrintTemp_C: number
  labStartParams: Recipe["startParams"]
}

/** ids de célula do R16 → rótulos usados pelo pipeline antigo (CELL_SENSITIVITY) */
export const CELL_PIPELINE_ID: Record<CellTypeId, string> = {
  none: "",
  fibroblast: "Fibroblast",
  keratinocyte: "Keratinocyte",
  chondrocyte: "Chondrocyte",
  osteoblast: "Osteoblast",
  msc: "hMSC",
  huvec: "Endothelial",
  hepatocyte: "Hepatocyte",
  cardiomyocyte: "Cardiomyocyte",
  neuron: "Neuron",
  ipsc: "iPSC",
  tumor: "hMSC",
}

export function toBioinkPatch(recipe: Recipe, cell: CellTypeId, cellDensity_Mml: number | null): BioinkPatchLike {
  const polymer = recipe.components.find((c) => c.role === "polymer")
  const concentration = polymer ? polymer.amount : 0
  const xl = recipe.components.find((c) => c.role === "crosslinker" || c.role === "photoinitiator")
  const additives = recipe.components
    .filter((c) => c.role === "thickener" || c.role === "bioactive")
    .map((c) => `${c.name.split("(")[0].trim()} ${c.amount} ${c.unit}`)
  const rh = recipe.rheology
  const n = rh.powerLawN
  // K tal que η(10 s⁻¹) = viscosity: η = K·γ̇^(n−1) → K = η / 10^(n−1)
  const K = rh.viscosity_PaS / Math.pow(10, n - 1)
  const rheology = { viscosityPaS: rh.viscosity_PaS, flowIndex: n, consistencyK: Math.round(K * 100) / 100, yieldStressPa: rh.yieldStress_Pa }
  const hasCells = cell !== "none" && (cellDensity_Mml ?? 0) > 0
  const role: BioinkPatchLike["formulations"][number]["role"] =
    recipe.crosslink === "sacrificial" ? "sacrificial" : hasCells ? "cellular" : "structural"
  const cellType = hasCells ? CELL_PIPELINE_ID[cell] : ""
  const density = hasCells ? cellDensity_Mml! : 0
  const f = {
    tool: 0 as const,
    color: role === "sacrificial" ? "#f59e0b" : hasCells ? "#10b981" : "#6366f1",
    role,
    material: recipe.pipelineMaterialLabel,
    materialId: recipe.pipelineMaterialId,
    concentration,
    crosslinker: recipe.pipelineCrosslinker,
    crosslinkerConc: xl ? xl.amount : 0,
    cellType,
    cellDensityMillionMl: density,
    additives,
    rheology,
    label: recipe.name,
  }
  return {
    status: "ready",
    strategy: "single",
    material: f.material,
    materialId: f.materialId,
    concentration,
    crosslinker: f.crosslinker,
    crosslinkerConc: f.crosslinkerConc,
    cellType,
    cellDensityMillionMl: density,
    additives,
    rheology,
    formulations: [f],
    labRecipeId: recipe.id,
    labPrintTemp_C: recipe.printTemp_C,
    labStartParams: recipe.startParams,
  }
}

/** Frase em pt-BR para o campo "objetivo" do BioSlicer (intent parser) */
export function slicerHint(recipe: Recipe, cell: CellTypeId, goalLabel: string): string {
  const mat = recipe.pipelineMaterialLabel.toLowerCase()
  const cells = cell === "none" ? "sem células" : `com ${CELL_LABELS[cell]?.label.toLowerCase() ?? cell}`
  return `${goalLabel} em ${mat} ${cells}, agulha ${recipe.startParams.nozzle_mm} mm, velocidade ${recipe.startParams.speed_mms} mm/s, camada ${recipe.startParams.layerHeight_mm} mm`
}
