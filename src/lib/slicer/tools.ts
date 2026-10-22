/**
 * BIA v4 · R20 · BioSlicer — Cabeçotes / ferramentas (multi-material)
 * ─────────────────────────────────────────────────────────────────
 * A usuária informa QUANTOS cabeçotes a impressora tem e qual biotinta vai
 * em cada um. Cada papel do caminho (parede externa, parede interna, infill,
 * suporte/sacrificial) é atribuído a uma ferramenta T0..T3. O G-code final
 * é UM arquivo com trocas `T<n>` (Marlin/Klipper), retração antes da troca,
 * prime depois, e offset XY opcional por cabeçote (M218 ou aplicado no path).
 *
 * Com 1 cabeçote: tudo em T0, sem trocas (G-code idêntico ao de hoje).
 */
import type { ExtrusionModel, PathRole } from "./types"

export interface ToolHead {
  index: 0 | 1 | 2 | 3
  /** rótulo da biotinta (ex.: "GelMA 10 %") */
  label: string
  /** id de material do pipeline (gelma, alginate, pluronic…) */
  materialId?: string
  /** modelo de extrusão desta seringa (volume, Ø êmbolo, fluxo, prime/retract) */
  extrusion: ExtrusionModel
  /** offset XY do bico deste cabeçote em relação ao T0 (mm). 0,0 = colinear/aplicado pelo firmware */
  offsetX_mm: number
  offsetY_mm: number
  /** temperatura do cartucho (°C) ou null */
  temp_C: number | null
  /** cor para preview */
  color: string
}

export type RoleAssignment = Partial<Record<PathRole, 0 | 1 | 2 | 3>>

export interface ToolsConfig {
  heads: ToolHead[]
  /** qual cabeçote imprime cada papel; ausente = T0 */
  assign: RoleAssignment
  /** aplicar offset no caminho (true) ou confiar no firmware (M218) (false) */
  applyOffsetInPath: boolean
  /** µL extrudados após a troca para escorvar o novo bico */
  primeAfterSwitch_uL: number
  /** µL retraídos antes de sair de um cabeçote */
  retractBeforeSwitch_uL: number
  /** segundos de espera após a troca (estabilizar) */
  dwellAfterSwitch_s: number
  /**
   * R23 · Grupos de camada (DNA Studio "Layer groups"): cabeçote por FAIXA de camadas.
   * Ex. protocolo CELLINK SKIN: camada 1 → T0 (derme reticular), 2 → T1 (papilar), 3 → T2 (epiderme).
   * Quando presente e a camada cai numa faixa, o grupo vence a atribuição papel→ferramenta.
   * `from`/`to` são índices 1-based inclusivos; `to` ausente = até o fim.
   */
  layerGroups?: Array<{ from: number; to?: number; tool: number; label?: string }>
}

/** Cabeçote definido por grupo de camada (ou null se nenhum grupo cobre a camada). */
export function toolForLayer(cfg: ToolsConfig, layerIndex0: number): ToolHead | null {
  if (!cfg.layerGroups?.length) return null
  const n = layerIndex0 + 1
  const g = cfg.layerGroups.find((g) => n >= g.from && (g.to === undefined || n <= g.to))
  if (!g) return null
  return cfg.heads.find((h) => h.index === g.tool) ?? null
}

/** Preset: 1 cabeçote por camada, na ordem (camada 1→T0, 2→T1, …, última faixa até o fim). */
export function layerGroupsOnePerHead(heads: ToolHead[], labels?: string[]): NonNullable<ToolsConfig["layerGroups"]> {
  return heads.map((h, i) => ({ from: i + 1, to: i === heads.length - 1 ? undefined : i + 1, tool: h.index, label: labels?.[i] }))
}

export const TOOL_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899"] as const

export function singleTool(extrusion: ExtrusionModel, label = "Biotinta", materialId?: string): ToolsConfig {
  return {
    heads: [{ index: 0, label, materialId, extrusion, offsetX_mm: 0, offsetY_mm: 0, temp_C: null, color: TOOL_COLORS[0] }],
    assign: {},
    applyOffsetInPath: false,
    primeAfterSwitch_uL: 2,
    retractBeforeSwitch_uL: 1,
    dwellAfterSwitch_s: 0.5,
  }
}

export function toolForRole(cfg: ToolsConfig, role: PathRole): ToolHead {
  const idx = cfg.assign[role] ?? 0
  return cfg.heads.find((h) => h.index === idx) ?? cfg.heads[0]
}

/** Sugestão padrão de atribuição quando há 2+ biotintas: estrutural nas paredes, celular no infill, sacrificial no suporte. */
export function suggestAssignment(heads: ToolHead[], roles?: Partial<Record<number, "structural" | "cellular" | "sacrificial" | "vascular" | "support-bath">>): RoleAssignment {
  if (heads.length <= 1) return {}
  const byRole = (r: string) => heads.find((h) => roles?.[h.index] === r)?.index
  const structural = byRole("structural") ?? 0
  const cellular = byRole("cellular") ?? (heads[1]?.index ?? 0)
  const sacrificial = byRole("sacrificial") ?? byRole("vascular")
  const a: RoleAssignment = { wall_outer: structural as 0 | 1 | 2 | 3, wall_inner: structural as 0 | 1 | 2 | 3, infill: cellular as 0 | 1 | 2 | 3, bottom: structural as 0 | 1 | 2 | 3, top: structural as 0 | 1 | 2 | 3, skirt: structural as 0 | 1 | 2 | 3, purge: structural as 0 | 1 | 2 | 3 }
  if (sacrificial !== undefined) a.support = sacrificial as 0 | 1 | 2 | 3
  return a
}

export function describeTools(cfg: ToolsConfig): string {
  if (cfg.heads.length <= 1) return `1 cabeçote — ${cfg.heads[0]?.label ?? "biotinta"}`
  const parts = cfg.heads.map((h) => `T${h.index}: ${h.label}`)
  const roles = Object.entries(cfg.assign).map(([r, t]) => `${r}→T${t}`).join(", ")
  return `${cfg.heads.length} cabeçotes (${parts.join(" · ")}) · ${roles || "tudo em T0"}`
}
