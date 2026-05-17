/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Medical G-Code Engine — R12.14
 *  ───────────────────────────────────────────────────────────────────────────
 *  Nível MÉDICO/INTERMEDIÁRIO: o usuário escolhe TECIDO-ALVO e a BIA monta
 *  toolpath + parâmetros baseados em biologia.
 *
 *  Adiciona ao Quick G-Code:
 *    • Tissue strategy (16 tecidos com lógica biológica)
 *    • 3 propostas: safe / advanced / experimental
 *    • Preview CONCEITUAL antes do G-code (sem precisar gerar tudo)
 *    • Organoid niche array (placas SBS 6/12/24/96/384)
 *    • Anisotropic grid (alinhamento direcional)
 *    • Shell-core (parede + núcleo)
 *    • Lattice e helicoidal simplificado
 *    • Avaliação Nelson 2021 + risk briefing
 *
 *  Continua SÍNCRONO e DETERMINÍSTICO — nenhum LLM, nenhum timeout.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  type TissueId, type TissueStrategy, type ToolpathStrategyId,
  getTissueStrategy, toolpathLabel, logicLabel, crosslinkingLabel,
  toolpathComplexity,
} from "./tissue-strategies"
import {
  assessPrintability, NELSON_2021_CITATION,
  type PrintabilityAssessment,
} from "./printability-nelson2021"

// ─── Tipos ────────────────────────────────────────────────────────────────

export type MedicalScale = "single" | "well-plate-96" | "well-plate-24" | "well-plate-12" | "well-plate-6"

export type ProposalLevel = "safe" | "advanced" | "experimental"

export interface MedicalGcodeInput {
  tissue: TissueId
  proposalLevel: ProposalLevel
  /** Dimensões do alvo (mm) */
  dimensions: { width: number; depth: number; height: number }
  /** Para organoid-niche-array */
  scale: MedicalScale
  /** Bioink params */
  bioink: {
    materialLabel: string
    nozzleDiameter_mm: number
    viscosity_PaS: number
    printSpeed_mms: number
    travelSpeed_mms: number
    pressure_kpa?: number
    hasCells?: boolean
    cellType?: string | null
    cellDensity_M_per_mL?: number | null
    crosslinker?: string | null
  }
  /** Override de altura de camada (opcional) */
  layerHeight_mm?: number
  /** Override de infill (opcional) */
  infillDensity_pct?: number
  jobName?: string
}

export interface ConceptualPreview {
  /** Quantas camadas */
  layerCount: number
  /** Direção predominante de deposição */
  primaryDirection: string
  /** Zonas críticas detectadas */
  criticalZones: Array<{
    zone: string
    reason: string
    severity: "info" | "warning" | "critical"
  }>
  /** Densidade celular total esperada */
  totalCellCount_M?: number
  /** Volume total estimado (µL) */
  totalVolume_uL: number
  /** Tempo estimado (min) */
  estimatedTime_min: number
  /** Toolpath escolhido */
  toolpathId: ToolpathStrategyId
  /** Descrição textual do que vai ser impresso */
  narrative: string[]
}

export interface MedicalGcodeResult {
  gcode: string
  layerCount: number
  bioinkVolume_uL: number
  estimatedTime_min: number
  moveCount: number
  rationale: string[]
  warnings: string[]
  printability: PrintabilityAssessment
  preview: ConceptualPreview
  strategy: TissueStrategy
  toolpathChosen: ToolpathStrategyId
  proposalLevel: ProposalLevel
}

// ─── Internal types ────────────────────────────────────────────────────────

interface Point { x: number; y: number }
interface Move {
  type: "G0" | "G1"
  x: number; y: number; z: number
  e?: number
  f: number
  comment?: string
}
interface MoveAcc {
  list: Move[]
  e: number
  last: { x: number; y: number; z: number } | null
  z: number
  ePerMm: number
}

// ─── Configurações de placas SBS ──────────────────────────────────────────

export const WELL_PLATE_SPECS: Record<MedicalScale, {
  wells: number
  wellDiameter_mm: number
  pitch_mm: number       // distância centro-a-centro
  rows: number
  cols: number
  label: string
} | null> = {
  "single":         null,
  "well-plate-6":   { wells: 6,   wellDiameter_mm: 34.8, pitch_mm: 39.12, rows: 2, cols: 3, label: "6 wells (34.8 mm)" },
  "well-plate-12":  { wells: 12,  wellDiameter_mm: 22.1, pitch_mm: 26.0,  rows: 3, cols: 4, label: "12 wells (22.1 mm)" },
  "well-plate-24":  { wells: 24,  wellDiameter_mm: 15.6, pitch_mm: 19.3,  rows: 4, cols: 6, label: "24 wells (15.6 mm)" },
  "well-plate-96":  { wells: 96,  wellDiameter_mm: 6.86, pitch_mm: 9.0,   rows: 8, cols: 12, label: "96 wells (6.86 mm)" },
}

// ─── PREVIEW CONCEITUAL (antes do G-code) ──────────────────────────────────

/**
 * Gera o preview SEM gerar G-code completo. Rápido (~10 ms).
 * Permite o usuário ver se "é aquilo mesmo" antes de comitir.
 */
export function generateConceptualPreview(input: MedicalGcodeInput): ConceptualPreview {
  const strategy = getTissueStrategy(input.tissue)
  const toolpathId = strategy.toolpaths[input.proposalLevel]
  const layerH = input.layerHeight_mm ?? strategy.printingParams.layerHeight_mm.ideal
  const layerCount = Math.max(1, Math.ceil(input.dimensions.height / layerH))

  const wellSpec = WELL_PLATE_SPECS[input.scale]

  // Volume estimado
  let totalVolume_uL = 0
  if (wellSpec && (toolpathId === "organoid-niche-array")) {
    // Niche array: assume ~50 nL por microcavidade × wells
    const nichesPerWell = 16
    totalVolume_uL = wellSpec.wells * nichesPerWell * 0.05
  } else {
    // Geometria sólida (mm³ ≈ µL)
    const fillFactor = (input.infillDensity_pct ?? strategy.printingParams.infill_pct.ideal) / 100
    totalVolume_uL = input.dimensions.width * input.dimensions.depth * input.dimensions.height * fillFactor
  }

  // Cell count
  const density = input.bioink.cellDensity_M_per_mL ?? strategy.cellDensity_M_per_mL.ideal
  const totalCellCount_M = input.bioink.hasCells ? totalVolume_uL * density / 1000 : undefined

  // Tempo estimado: heurística — moves ≈ layers × perímetro/(layerH·printSpeed)
  const printSpeed = input.bioink.printSpeed_mms
  const approxMoveLength_mm = layerCount * Math.max(input.dimensions.width, input.dimensions.depth) * 6
  const estimatedTime_min = Math.max(0.5, approxMoveLength_mm / printSpeed / 60)

  // Direção predominante
  const primaryDirection = primaryDirectionFor(toolpathId)

  // Zonas críticas
  const criticalZones: ConceptualPreview["criticalZones"] = []

  // Hipóxia em scaffolds densos > 3 mm
  if (input.dimensions.height > 3 && (input.infillDensity_pct ?? strategy.printingParams.infill_pct.ideal) > 70 && input.bioink.hasCells) {
    criticalZones.push({
      zone: "Núcleo do scaffold",
      reason: "Espessura > 3 mm + infill > 70% + células ⇒ risco de hipóxia central",
      severity: "warning",
    })
  }

  // Colapso em geometrias altas/finas
  const aspectRatio = input.dimensions.height / Math.min(input.dimensions.width, input.dimensions.depth)
  if (aspectRatio > 3) {
    criticalZones.push({
      zone: "Estrutura vertical",
      reason: `Aspect ratio ${aspectRatio.toFixed(1)} > 3 — risco de colapso lateral`,
      severity: "warning",
    })
  }

  // Anisotropia ausente em tecidos que precisam
  if ((input.tissue === "myocardium" || input.tissue === "muscle" || input.tissue === "cornea") &&
      input.proposalLevel === "safe") {
    criticalZones.push({
      zone: "Função do tecido",
      reason: `${strategy.label} REQUER alinhamento. Nível 'safe' usa grid sem direção privilegiada.`,
      severity: "critical",
    })
  }

  // Shear alto
  const wallShearApprox = (input.bioink.viscosity_PaS * input.bioink.printSpeed_mms) / input.bioink.nozzleDiameter_mm
  if (wallShearApprox > 5000 && input.bioink.hasCells) {
    criticalZones.push({
      zone: "Bico de extrusão",
      reason: `Shear estimado ${(wallShearApprox / 1000).toFixed(1)} kPa — pode lisar células`,
      severity: "critical",
    })
  }

  // Narrative
  const narrative = buildNarrative(strategy, toolpathId, input, layerCount, wellSpec)

  return {
    layerCount,
    primaryDirection,
    criticalZones,
    totalCellCount_M,
    totalVolume_uL,
    estimatedTime_min,
    toolpathId,
    narrative,
  }
}

function primaryDirectionFor(t: ToolpathStrategyId): string {
  switch (t) {
    case "planar-rectilinear":   return "X/Y alternada (0°/90° por camada)"
    case "planar-concentric":    return "Espiral do exterior para o centro"
    case "anisotropic-grid":     return "Paralelo ao eixo X (alinhamento)"
    case "vector-field":         return "Conforme campo vetorial do tecido"
    case "helical":              return "Ângulo varia +60° → −60° (transmural)"
    case "organoid-niche-array": return "Matriz XY (microcavidades)"
    case "shell-core":           return "Casca contorno + núcleo infill"
    case "voronoi":              return "Aleatório isotrópico (poros 200-500 µm)"
    case "gyroid-tpms":          return "Superfície triplicamente periódica"
    case "lattice":              return "Treliça ortogonal X/Y/Z"
    case "radial":               return "Centro → periferia"
    case "vascular-branching":   return "Bifurcação fractal Murray"
    case "sacrificial-channel":  return "Canais paralelos + matriz"
    case "multi-material":       return "Multi-tinta sincronizada"
    case "non-planar":           return "Z variável (não planar)"
    case "serpentine":           return "Contínua S-curve"
  }
}

function buildNarrative(
  s: TissueStrategy,
  t: ToolpathStrategyId,
  input: MedicalGcodeInput,
  layers: number,
  well: typeof WELL_PLATE_SPECS[MedicalScale],
): string[] {
  const out: string[] = []
  out.push(
    `${s.emoji} Tecido: ${s.label} — ${s.shortDescription}`,
  )
  out.push(
    `🧬 Lógica biológica dominante: ${s.dominantLogic.map(logicLabel).join(" · ")}.`,
  )
  out.push(
    `🛣️ Toolpath escolhido (${input.proposalLevel}): ${toolpathLabel(t)} — complexidade ${toolpathComplexity(t)}.`,
  )
  if (well) {
    out.push(
      `🧪 Escala: ${well.label} (${well.rows}×${well.cols} wells) — ideal para drug screening / HCS.`,
    )
  } else {
    out.push(
      `📐 Escala: peça única ${input.dimensions.width}×${input.dimensions.depth}×${input.dimensions.height} mm.`,
    )
  }
  out.push(
    `🖨️ Estrutura: ${layers} camadas de ${(input.layerHeight_mm ?? s.printingParams.layerHeight_mm.ideal).toFixed(2)} mm com bico Ø${input.bioink.nozzleDiameter_mm} mm.`,
  )
  out.push(
    `💧 Biotinta: ${input.bioink.materialLabel}${input.bioink.hasCells ? ` com ${input.bioink.cellType ?? "células"}` : " (acelular)"}.`,
  )
  out.push(
    `🔬 Crosslinking: ${crosslinkingLabel(s.crosslinking)} — ${input.bioink.crosslinker ?? "padrão do tecido"}.`,
  )

  // Avisos específicos por toolpath
  if (t === "organoid-niche-array") {
    out.push(`🟣 Microcavidades padronizadas para formação reprodutível de organoides.`)
  } else if (t === "anisotropic-grid" || t === "vector-field") {
    out.push(`➡️ Filamentos paralelos induzem alinhamento celular por contact guidance.`)
  } else if (t === "helical") {
    out.push(`🌀 Padrão helicoidal mimético da arquitetura transmural do miocárdio.`)
  } else if (t === "shell-core") {
    out.push(`🥚 Casca densa + núcleo poroso — pode incluir lúmen central oco.`)
  } else if (t === "voronoi") {
    out.push(`🦴 Topologia aleatória mimética do osso trabecular — alta vascularizabilidade.`)
  } else if (t === "gyroid-tpms") {
    out.push(`🌐 Gyroid biomimético com curvatura média zero — máxima razão superfície/volume.`)
  }

  return out
}

// ─── Volumetric extrusion ──────────────────────────────────────────────────

function extrusionPerMm(nozzle: number, layerH: number): number {
  return Math.PI * (nozzle / 2) * (nozzle / 2) * (layerH / nozzle)
}

function emitMove(
  acc: MoveAcc,
  to: { x: number; y: number; z?: number },
  feed_mms: number,
  extrude: boolean,
  comment?: string,
) {
  const z = to.z ?? acc.z
  const last = acc.last
  if (!last) {
    acc.list.push({ type: "G0", x: to.x, y: to.y, z, f: feed_mms * 60, comment })
    acc.last = { x: to.x, y: to.y, z }
    return
  }
  const dist = Math.hypot(to.x - last.x, to.y - last.y, z - last.z)
  if (extrude) {
    const dE = dist * acc.ePerMm
    acc.e += dE
    acc.list.push({ type: "G1", x: to.x, y: to.y, z, e: acc.e, f: feed_mms * 60, comment })
  } else {
    acc.list.push({ type: "G0", x: to.x, y: to.y, z, f: feed_mms * 60, comment })
  }
  acc.last = { x: to.x, y: to.y, z }
}

// ─── GERADORES DE TOOLPATH ────────────────────────────────────────────────

function toolpathRectilinearLayer(
  acc: MoveAcc, w: number, d: number, infill_pct: number, nozzle: number,
  feed_print: number, feed_travel: number, layerIdx: number,
) {
  // Cross-hatch: alterna 0°/90° por camada
  const horizontal = layerIdx % 2 === 0
  const spacing = nozzle * (100 / Math.max(infill_pct, 1))
  const cx = w / 2, cy = d / 2
  if (horizontal) {
    let y = -cy
    let dir = 1
    while (y <= cy) {
      emitMove(acc, { x: dir > 0 ? -cx : cx, y }, feed_travel, false)
      emitMove(acc, { x: dir > 0 ? cx : -cx, y }, feed_print, true, `infill L${layerIdx + 1}`)
      y += spacing
      dir = -dir
    }
  } else {
    let x = -cx
    let dir = 1
    while (x <= cx) {
      emitMove(acc, { x, y: dir > 0 ? -cy : cy }, feed_travel, false)
      emitMove(acc, { x, y: dir > 0 ? cy : -cy }, feed_print, true, `infill L${layerIdx + 1}`)
      x += spacing
      dir = -dir
    }
  }
}

/** Grid anisotrópico: TODAS as camadas com mesma direção → induz alinhamento. */
function toolpathAnisotropicGridLayer(
  acc: MoveAcc, w: number, d: number, infill_pct: number, nozzle: number,
  feed_print: number, feed_travel: number, layerIdx: number,
) {
  const spacing = nozzle * (100 / Math.max(infill_pct, 1))
  const cx = w / 2, cy = d / 2
  let y = -cy
  let dir = 1
  while (y <= cy) {
    emitMove(acc, { x: dir > 0 ? -cx : cx, y }, feed_travel, false)
    emitMove(acc, { x: dir > 0 ? cx : -cx, y }, feed_print, true, `aniso L${layerIdx + 1}`)
    y += spacing
    dir = -dir
  }
}

/** Helicoidal: cada camada com rotação progressiva (+120°/total camadas) */
function toolpathHelicalLayer(
  acc: MoveAcc, w: number, d: number, infill_pct: number, nozzle: number,
  feed_print: number, feed_travel: number, layerIdx: number, totalLayers: number,
) {
  // Ângulo varia de +60° (base) a -60° (topo)
  const angleDeg = 60 - (120 * layerIdx) / Math.max(totalLayers - 1, 1)
  const angleRad = (angleDeg * Math.PI) / 180
  const ca = Math.cos(angleRad), sa = Math.sin(angleRad)
  const spacing = nozzle * (100 / Math.max(infill_pct, 1))
  const maxDim = Math.max(w, d) * 1.5
  const cx = w / 2, cy = d / 2

  // Gera linhas paralelas rotacionadas
  let s = -maxDim
  let dir = 1
  while (s <= maxDim) {
    // Linha no espaço local (eixo paralelo)
    const t = maxDim
    let p1 = { x: -t, y: s }
    let p2 = { x: t, y: s }
    // Rotaciona
    p1 = { x: p1.x * ca - p1.y * sa, y: p1.x * sa + p1.y * ca }
    p2 = { x: p2.x * ca - p2.y * sa, y: p2.x * sa + p2.y * ca }
    // Clipa pelo bounding box (simplificado: limita a [-cx, cx])
    if (clipToBox(p1, p2, cx, cy)) {
      if (dir > 0) {
        emitMove(acc, p1, feed_travel, false)
        emitMove(acc, p2, feed_print, true, `helix${angleDeg.toFixed(0)}° L${layerIdx + 1}`)
      } else {
        emitMove(acc, p2, feed_travel, false)
        emitMove(acc, p1, feed_print, true, `helix${angleDeg.toFixed(0)}° L${layerIdx + 1}`)
      }
      dir = -dir
    }
    s += spacing
  }
}

function clipToBox(p1: Point, p2: Point, cx: number, cy: number): boolean {
  // Simplesmente verifica se algum vértice está no box; se ambos estão, ok
  const inBox = (p: Point) => p.x >= -cx && p.x <= cx && p.y >= -cy && p.y <= cy
  if (inBox(p1) && inBox(p2)) return true
  // Clip rude — para fins de toolpath, projeta no box
  p1.x = Math.max(-cx, Math.min(cx, p1.x))
  p1.y = Math.max(-cy, Math.min(cy, p1.y))
  p2.x = Math.max(-cx, Math.min(cx, p2.x))
  p2.y = Math.max(-cy, Math.min(cy, p2.y))
  return Math.hypot(p2.x - p1.x, p2.y - p1.y) > 0.5
}

/** Concêntrico: espirais do contorno para o centro */
function toolpathConcentricLayer(
  acc: MoveAcc, w: number, d: number, nozzle: number,
  feed_print: number, feed_travel: number, layerIdx: number,
) {
  const cx = w / 2, cy = d / 2
  let offset = 0
  let first = true
  while (offset < Math.min(cx, cy) - nozzle / 2) {
    const x0 = -cx + offset, x1 = cx - offset
    const y0 = -cy + offset, y1 = cy - offset
    if (x1 - x0 < nozzle || y1 - y0 < nozzle) break
    if (first) {
      emitMove(acc, { x: x0, y: y0 }, feed_travel, false)
      first = false
    } else {
      emitMove(acc, { x: x0, y: y0 }, feed_print, true)
    }
    emitMove(acc, { x: x1, y: y0 }, feed_print, true, `conc L${layerIdx + 1}`)
    emitMove(acc, { x: x1, y: y1 }, feed_print, true)
    emitMove(acc, { x: x0, y: y1 }, feed_print, true)
    emitMove(acc, { x: x0, y: y0 + nozzle }, feed_print, true)
    offset += nozzle
  }
}

/** Lattice: malha XY ortogonal aberta */
function toolpathLatticeLayer(
  acc: MoveAcc, w: number, d: number, infill_pct: number, nozzle: number,
  feed_print: number, feed_travel: number, layerIdx: number,
) {
  // Lattice usa pitch maior que nozzle para criar poros
  const pitch = nozzle * Math.max(2, 100 / Math.max(infill_pct, 30))
  const cx = w / 2, cy = d / 2
  // Linhas horizontais
  let y = -cy
  let dir = 1
  while (y <= cy) {
    emitMove(acc, { x: dir > 0 ? -cx : cx, y }, feed_travel, false)
    emitMove(acc, { x: dir > 0 ? cx : -cx, y }, feed_print, true, `lattice-H L${layerIdx + 1}`)
    y += pitch
    dir = -dir
  }
  // Linhas verticais (mesma camada)
  let x = -cx
  dir = 1
  while (x <= cx) {
    emitMove(acc, { x, y: dir > 0 ? -cy : cy }, feed_travel, false)
    emitMove(acc, { x, y: dir > 0 ? cy : -cy }, feed_print, true, `lattice-V L${layerIdx + 1}`)
    x += pitch
    dir = -dir
  }
}

/** Shell-core: contorno + infill rectilinear interno */
function toolpathShellCoreLayer(
  acc: MoveAcc, w: number, d: number, infill_pct: number, nozzle: number,
  feed_print: number, feed_travel: number, layerIdx: number, walls: number,
) {
  const cx = w / 2, cy = d / 2
  // Walls: N contornos
  for (let i = 0; i < Math.min(walls, 3); i++) {
    const off = i * nozzle
    if (cx - off < nozzle || cy - off < nozzle) break
    emitMove(acc, { x: -cx + off, y: -cy + off }, feed_travel, false)
    emitMove(acc, { x:  cx - off, y: -cy + off }, feed_print, true, `wall${i + 1} L${layerIdx + 1}`)
    emitMove(acc, { x:  cx - off, y:  cy - off }, feed_print, true)
    emitMove(acc, { x: -cx + off, y:  cy - off }, feed_print, true)
    emitMove(acc, { x: -cx + off, y: -cy + off }, feed_print, true)
  }
  // Core: rectilinear infill no interior reduzido
  const innerW = Math.max(0, w - 2 * walls * nozzle)
  const innerD = Math.max(0, d - 2 * walls * nozzle)
  if (innerW > nozzle && innerD > nozzle && infill_pct > 0) {
    const spacing = nozzle * (100 / infill_pct)
    const icx = innerW / 2, icy = innerD / 2
    const horizontal = layerIdx % 2 === 0
    if (horizontal) {
      let y = -icy
      let dir = 1
      while (y <= icy) {
        emitMove(acc, { x: dir > 0 ? -icx : icx, y }, feed_travel, false)
        emitMove(acc, { x: dir > 0 ? icx : -icx, y }, feed_print, true, `core L${layerIdx + 1}`)
        y += spacing
        dir = -dir
      }
    } else {
      let x = -icx
      let dir = 1
      while (x <= icx) {
        emitMove(acc, { x, y: dir > 0 ? -icy : icy }, feed_travel, false)
        emitMove(acc, { x, y: dir > 0 ? icy : -icy }, feed_print, true, `core L${layerIdx + 1}`)
        x += spacing
        dir = -dir
      }
    }
  }
}

/**
 * Organoid niche array — gera matriz de microcavidades em well plate.
 * Cada cavidade = anel circular pequeno (cup-like).
 */
function toolpathOrganoidArrayLayer(
  acc: MoveAcc, well: NonNullable<typeof WELL_PLATE_SPECS[MedicalScale]>,
  niche_diameter_mm: number, nozzle: number,
  feed_print: number, feed_travel: number, layerIdx: number,
) {
  // Microcavidades dentro de cada well: grid 4×4 por padrão
  const nichesPerSide = 4
  for (let row = 0; row < well.rows; row++) {
    for (let col = 0; col < well.cols; col++) {
      // Centro do well
      const wx = (col - (well.cols - 1) / 2) * well.pitch_mm
      const wy = (row - (well.rows - 1) / 2) * well.pitch_mm
      // Calcula área útil dentro do well (80% para borda de segurança)
      const usableR = (well.wellDiameter_mm / 2) * 0.7
      const innerPitch = (2 * usableR) / (nichesPerSide + 1)
      for (let nr = 0; nr < nichesPerSide; nr++) {
        for (let nc = 0; nc < nichesPerSide; nc++) {
          const nx = wx + (nc - (nichesPerSide - 1) / 2) * innerPitch
          const ny = wy + (nr - (nichesPerSide - 1) / 2) * innerPitch
          // Filtra dentro do círculo do well
          if (Math.hypot(nx - wx, ny - wy) > usableR) continue
          // Desenha pequeno círculo (octógono) ao redor do nicho
          emitCircleAsPolygon(acc, nx, ny, niche_diameter_mm / 2, 12, feed_print, feed_travel, `niche W${well.cols * row + col + 1}`)
        }
      }
    }
  }
}

function emitCircleAsPolygon(
  acc: MoveAcc, cx: number, cy: number, r: number, sides: number,
  feed_print: number, feed_travel: number, comment: string,
) {
  const first = { x: cx + r, y: cy }
  emitMove(acc, first, feed_travel, false)
  for (let i = 1; i <= sides; i++) {
    const ang = (i / sides) * 2 * Math.PI
    emitMove(acc, { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) }, feed_print, true, i === 1 ? comment : undefined)
  }
}

// ─── G-CODE EMIT ───────────────────────────────────────────────────────────

function emitGcodeHeader(
  input: MedicalGcodeInput, strategy: TissueStrategy, preview: ConceptualPreview,
  printability: PrintabilityAssessment, toolpathChosen: ToolpathStrategyId,
): string[] {
  const now = new Date().toISOString()
  return [
    "; ═══════════════════════════════════════════════════════════════════════",
    "; BIA · Medical G-Code Engine — R12.14",
    "; Janaina Dernowsek / Quantis Biotechnology",
    "; ─────────────────────────────────────────────────────────────────────",
    `; Job:             ${input.jobName ?? `${input.tissue}_${Date.now()}`}`,
    `; Generated:       ${now}`,
    "; ─────────────────────────────────────────────────────────────────────",
    "; TECIDO ALVO:",
    `;   Tecido:        ${strategy.emoji} ${strategy.label}`,
    `;   Descrição:     ${strategy.shortDescription}`,
    `;   Lógica:        ${strategy.dominantLogic.map(logicLabel).join(" · ")}`,
    `;   Nível:         ${input.proposalLevel.toUpperCase()}`,
    `;   Toolpath:      ${toolpathLabel(toolpathChosen)}`,
    "; ─────────────────────────────────────────────────────────────────────",
    "; BIOTINTA:",
    `;   Material:      ${input.bioink.materialLabel}`,
    `;   Bico Ø:        ${input.bioink.nozzleDiameter_mm} mm`,
    `;   Viscosidade:   ${input.bioink.viscosity_PaS} Pa·s`,
    `;   Velocidade:    ${input.bioink.printSpeed_mms} mm/s (print) · ${input.bioink.travelSpeed_mms} mm/s (travel)`,
    input.bioink.pressure_kpa ? `;   Pressão:       ${input.bioink.pressure_kpa} kPa` : "",
    `;   Crosslinker:   ${input.bioink.crosslinker ?? crosslinkingLabel(strategy.crosslinking)}`,
    input.bioink.hasCells
      ? `;   Células:       ${input.bioink.cellType ?? "definido"}${input.bioink.cellDensity_M_per_mL ? ` @ ${input.bioink.cellDensity_M_per_mL} ×10⁶/mL` : ""}`
      : ";   Células:       acelular",
    preview.totalCellCount_M !== undefined
      ? `;   Cell count:    ~${preview.totalCellCount_M.toFixed(2)} ×10⁶ células totais`
      : "",
    "; ─────────────────────────────────────────────────────────────────────",
    "; GEOMETRIA:",
    `;   Dimensões:     ${input.dimensions.width} × ${input.dimensions.depth} × ${input.dimensions.height} mm`,
    `;   Camadas:       ${preview.layerCount} × ${(input.layerHeight_mm ?? strategy.printingParams.layerHeight_mm.ideal).toFixed(2)} mm`,
    `;   Escala:        ${input.scale}`,
    `;   Direção:       ${preview.primaryDirection}`,
    "; ─────────────────────────────────────────────────────────────────────",
    "; ESTIMATIVAS:",
    `;   Volume:        ~${preview.totalVolume_uL.toFixed(0)} µL`,
    `;   Tempo:         ~${preview.estimatedTime_min.toFixed(1)} min`,
    "; ─────────────────────────────────────────────────────────────────────",
    "; ANÁLISE NELSON 2021:",
    `;   Score:         ${printability.score}/100 (${printability.verdict})`,
    `;   Wall shear:    ${(printability.wallShearStress_Pa / 1000).toFixed(2)} kPa`,
    `;   Risco celular: ${printability.cellShearRisk}`,
    `;   Ref próxima:   ${printability.closestReference.id}`,
    "; ─────────────────────────────────────────────────────────────────────",
    "; ZONAS CRÍTICAS:",
    ...preview.criticalZones.map((z) => `;   [${z.severity.toUpperCase()}] ${z.zone}: ${z.reason}`),
    "; ─────────────────────────────────────────────────────────────────────",
    "; BIOSSEGURANÇA / RASTREABILIDADE:",
    ";   ⚠️ POSICIONE o bico MANUALMENTE — NENHUM aquecimento, NENHUM G28.",
    ";   ⚠️ Trabalhe em fluxo laminar (BSC classe II) se houver células.",
    ";   ⚠️ Verifique esterilidade do cartucho e da impressora antes de iniciar.",
    `;   📚 Fundamentado em: Nelson 2021 (DOI 10.3390/ijms222413481).`,
    "; ═══════════════════════════════════════════════════════════════════════",
    "",
    "G21        ; unidades em mm",
    "G90        ; coordenadas absolutas",
    "M83        ; extrusão relativa",
    "G92 E0     ; zera extruder",
    "",
  ].filter((l) => l !== "")
}

function emitMovesText(moves: Move[]): string[] {
  const lines: string[] = []
  let lastZ = -1
  let lastE = 0
  for (const m of moves) {
    if (Math.abs(m.z - lastZ) > 0.001) {
      lines.push(`; ─── Z = ${m.z.toFixed(3)} mm ───`)
      lastZ = m.z
    }
    const parts: string[] = [m.type]
    parts.push(`X${m.x.toFixed(3)}`, `Y${m.y.toFixed(3)}`, `Z${m.z.toFixed(3)}`)
    if (m.e !== undefined && m.e > lastE) {
      const dE = m.e - lastE
      parts.push(`E${dE.toFixed(4)}`)
      lastE = m.e
    }
    parts.push(`F${Math.round(m.f)}`)
    if (m.comment) parts.push(`; ${m.comment}`)
    lines.push(parts.join(" "))
  }
  lines.push("", "; ─── FIM ───", "M84        ; desliga motores", "")
  return lines
}

// ─── MAIN ENGINE ──────────────────────────────────────────────────────────

export function generateMedicalGcode(input: MedicalGcodeInput): MedicalGcodeResult {
  const strategy = getTissueStrategy(input.tissue)
  const toolpathChosen = strategy.toolpaths[input.proposalLevel]
  const layerH = input.layerHeight_mm ?? strategy.printingParams.layerHeight_mm.ideal
  const infillPct = input.infillDensity_pct ?? strategy.printingParams.infill_pct.ideal
  const nozzle = input.bioink.nozzleDiameter_mm
  const feed_print = input.bioink.printSpeed_mms
  const feed_travel = input.bioink.travelSpeed_mms

  // Validações
  if (input.dimensions.width <= 0 || input.dimensions.depth <= 0 || input.dimensions.height <= 0) {
    throw new Error("Dimensões devem ser positivas.")
  }
  if (nozzle <= 0) throw new Error("Diâmetro do bico deve ser positivo.")
  if (layerH <= 0 || layerH > 1) throw new Error("Layer height fora do intervalo (0, 1].")

  const totalLayers = Math.max(1, Math.ceil(input.dimensions.height / layerH))

  // ─── Preview (também usado pelo header) ─────────────────────────────────
  const preview = generateConceptualPreview(input)

  // ─── Acumulador ─────────────────────────────────────────────────────────
  const ePerMm = extrusionPerMm(nozzle, layerH)
  const acc: MoveAcc = { list: [], e: 0, last: null, z: 0, ePerMm }

  // ─── Loop de camadas ────────────────────────────────────────────────────
  for (let li = 0; li < totalLayers; li++) {
    const z = (li + 1) * layerH
    acc.z = z

    switch (toolpathChosen) {
      case "planar-rectilinear":
        toolpathRectilinearLayer(acc, input.dimensions.width, input.dimensions.depth, infillPct, nozzle, feed_print, feed_travel, li)
        break
      case "planar-concentric":
        toolpathConcentricLayer(acc, input.dimensions.width, input.dimensions.depth, nozzle, feed_print, feed_travel, li)
        break
      case "anisotropic-grid":
      case "vector-field":  // vector-field simplificado = aniso por enquanto
        toolpathAnisotropicGridLayer(acc, input.dimensions.width, input.dimensions.depth, infillPct, nozzle, feed_print, feed_travel, li)
        break
      case "helical":
        toolpathHelicalLayer(acc, input.dimensions.width, input.dimensions.depth, infillPct, nozzle, feed_print, feed_travel, li, totalLayers)
        break
      case "lattice":
      case "voronoi":   // voronoi simplificado = lattice
      case "gyroid-tpms":
        toolpathLatticeLayer(acc, input.dimensions.width, input.dimensions.depth, infillPct, nozzle, feed_print, feed_travel, li)
        break
      case "shell-core":
      case "vascular-branching":
      case "sacrificial-channel":
      case "multi-material":
      case "non-planar":
      case "radial":
      case "serpentine":
        // Caem em shell-core (com walls=2) — variantes avançadas podem evoluir
        toolpathShellCoreLayer(acc, input.dimensions.width, input.dimensions.depth, infillPct, nozzle, feed_print, feed_travel, li, 2)
        break
      case "organoid-niche-array": {
        const well = WELL_PLATE_SPECS[input.scale]
        if (!well) {
          // Sem well plate — apenas faz um único nicho grande
          emitCircleAsPolygon(acc, 0, 0, Math.min(input.dimensions.width, input.dimensions.depth) / 4, 16, feed_print, feed_travel, "single niche")
        } else {
          toolpathOrganoidArrayLayer(acc, well, 1.5, nozzle, feed_print, feed_travel, li)
        }
        break
      }
    }
  }

  // ─── Estimativas reais ───────────────────────────────────────────────────
  const moveCount = acc.list.length
  const bioinkVolume_uL = acc.e
  let totalTime_s = 0
  for (let i = 1; i < acc.list.length; i++) {
    const a = acc.list[i - 1], b = acc.list[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    const speed_mms = b.f / 60
    if (speed_mms > 0) totalTime_s += d / speed_mms
  }
  const estimatedTime_min = Math.max(0.1, totalTime_s / 60)

  // ─── Análise Nelson ─────────────────────────────────────────────────────
  const printability = assessPrintability({
    viscosity_PaS: input.bioink.viscosity_PaS,
    printSpeed_mms: input.bioink.printSpeed_mms,
    nozzleDiameter_mm: input.bioink.nozzleDiameter_mm,
    hasCells: input.bioink.hasCells,
    materialLabel: input.bioink.materialLabel,
  })

  // ─── Rationale & warnings ───────────────────────────────────────────────
  const rationale: string[] = []
  const warnings: string[] = []
  rationale.push(...preview.narrative)
  rationale.push(`📊 Estimativa real: ${bioinkVolume_uL.toFixed(0)} µL · ${estimatedTime_min.toFixed(1)} min · ${moveCount.toLocaleString("pt-BR")} moves.`)
  rationale.push(`🔬 [Nelson 2021] Score ${printability.score}/100 (${printability.verdict}) · shear ${(printability.wallShearStress_Pa / 1000).toFixed(2)} kPa.`)

  // Risk briefing do tecido
  for (const r of strategy.risks) {
    if (r.level === "critical") warnings.push(`🚨 ${r.title}: ${r.detail} → ${r.mitigation}`)
    else if (r.level === "warning") warnings.push(`⚠ ${r.title}: ${r.detail} → ${r.mitigation}`)
  }
  // Critical zones do preview
  for (const z of preview.criticalZones) {
    if (z.severity === "critical") warnings.push(`🛑 ${z.zone}: ${z.reason}`)
    else if (z.severity === "warning") warnings.push(`⚠ ${z.zone}: ${z.reason}`)
  }
  warnings.push(...printability.warnings)

  // ─── Emit G-code text ───────────────────────────────────────────────────
  const headerLines = emitGcodeHeader(input, strategy, preview, printability, toolpathChosen)
  const moveLines = emitMovesText(acc.list)
  const gcode = [...headerLines, ...moveLines].filter((l) => l !== undefined).join("\n") + "\n"

  return {
    gcode,
    layerCount: totalLayers,
    bioinkVolume_uL,
    estimatedTime_min,
    moveCount,
    rationale,
    warnings,
    printability,
    preview,
    strategy,
    toolpathChosen,
    proposalLevel: input.proposalLevel,
  }
}
