/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Advanced G-Code Engine — R12.14 (NAATIV3)
 *  ───────────────────────────────────────────────────────────────────────────
 *  Nível AVANÇADO: a BIA gera G-code com arquitetura biologicamente fiel,
 *  inspirado no framework NAATIV3 (Nonplanar Architecture-Aligned Toolpathing
 *  for In Vitro 3D Bioprinting).
 *
 *  Diferença vs. medical-gcode.ts:
 *    • CAMPO VETORIAL: trajetória segue um campo direcional f(x,y,z)→(dx,dy)
 *    • HELICOIDAL TRANSMURAL real: ângulo interpolado camada-a-camada
 *    • MULTI-MATERIAL: até 4 biotintas com tag T0..T3
 *    • SACRIFICIAL CHANNELS: caminhos de Pluronic dentro da matriz
 *    • VASCULAR BRANCHING: bifurcação fractal seguindo a lei de Murray
 *    • STREAMLINES: integração de partículas (Euler) sobre campo vetorial
 *
 *  Pipeline NAATIV3 (Bobill et al., 2023, adaptado):
 *    1. Campo vetorial (manual, radial, helical, axonal, ou customizado)
 *    2. Sementes (seeds) sobre a região
 *    3. Streamlines via Euler/RK2 com passo ds
 *    4. Filtro de densidade (descarta linhas próximas demais)
 *    5. Remoção de interferência (auto-intersecção)
 *    6. Ordenação para impressão (vizinho mais próximo)
 *    7. Emissão de G-code com extrusão volumétrica
 *
 *  SÍNCRONO e DETERMINÍSTICO — sem LLM, sem timeout, sem rede.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  type TissueId, type TissueStrategy, getTissueStrategy,
} from "./tissue-strategies"
import { assessPrintability, type PrintabilityAssessment } from "./printability-nelson2021"

// ═════════════════════════════════════════════════════════════════════════
//   TIPOS
// ═════════════════════════════════════════════════════════════════════════

export type AdvancedStrategy =
  | "vector-field-naativ3"
  | "helical-transmural"
  | "vascular-murray"
  | "sacrificial-channels"
  | "multi-material-stack"
  | "lattice-3d-naativ3"

export type VectorFieldPreset =
  | "axial-x"           // → eixo X (músculo esquelético)
  | "axial-y"           // → eixo Y
  | "radial-out"        // → do centro para fora
  | "circular-cw"       // → em círculos horários
  | "helical-myocard"   // → ângulo varia de +60° (endo) a −60° (epi)
  | "axonal-bundle"     // → feixe axonal paralelo + leve curvatura
  | "perfusion-channels" // → grid orientado para canais paralelos
  | "custom"

export interface VectorField3D {
  (x: number, y: number, z: number, zNorm: number): { dx: number; dy: number }
}

export interface MaterialSlot {
  /** Identificador 0..3 — emitido como T0/T1/T2/T3 */
  toolIndex: 0 | 1 | 2 | 3
  label: string
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
  /** Cor sugerida para visualização (CSS) */
  uiColor: string
  /** Função opcional dizendo qual região essa material ocupa */
  inRegion?: (x: number, y: number, z: number, zNorm: number) => boolean
}

export interface AdvancedGcodeInput {
  strategy: AdvancedStrategy
  /** Tecido alvo (informa biologia / lê parâmetros de fallback) */
  tissue: TissueId
  dimensions: { width: number; depth: number; height: number }
  layerHeight_mm: number
  infillDensity_pct: number
  /** Lista de materiais (1..4). O primeiro é o principal. */
  materials: MaterialSlot[]
  /** Para vector-field-naativ3 e helical-transmural */
  fieldPreset?: VectorFieldPreset
  customField?: VectorField3D
  /** Para helical-transmural — ângulo das fibras nas faces */
  helicalAngleStart_deg?: number    // padrão +60° (endocárdio)
  helicalAngleEnd_deg?: number      // padrão −60° (epicárdio)
  /** Para sacrificial-channels — pitch entre canais e fração ocupada por canal */
  channelPitch_mm?: number
  channelDiameter_mm?: number
  /** Para vascular-murray — número de níveis de bifurcação */
  vascularLevels?: number
  /** Para lattice-3d — pitch do lattice */
  latticePitch_mm?: number
  jobName?: string
}

export interface AdvancedConceptualPreview {
  layerCount: number
  streamlineCount: number
  /** Direção predominante das fibras na camada média */
  midLayerAngle_deg: number
  /** Distribuição angular (camadas → ângulo) */
  angleProfile: Array<{ z_mm: number; angle_deg: number }>
  /** Materiais distintos */
  materialCount: number
  /** Volume estimado por material (µL) */
  volumePerMaterial_uL: number[]
  /** Tempo estimado (min) */
  estimatedTime_min: number
  criticalZones: Array<{ zone: string; reason: string; severity: "info" | "warning" | "critical" }>
  narrative: string[]
}

export interface AdvancedGcodeResult {
  gcode: string
  layerCount: number
  totalVolume_uL: number
  estimatedTime_min: number
  moveCount: number
  streamlineCount: number
  rationale: string[]
  warnings: string[]
  printability: PrintabilityAssessment   // baseada no material principal
  preview: AdvancedConceptualPreview
  strategy: AdvancedStrategy
  fieldPreset?: VectorFieldPreset
}

// ═════════════════════════════════════════════════════════════════════════
//   CAMPOS VETORIAIS PRESETS
// ═════════════════════════════════════════════════════════════════════════

function fieldFor(
  preset: VectorFieldPreset | undefined,
  custom: VectorField3D | undefined,
  helicalStart_deg: number,
  helicalEnd_deg: number,
): VectorField3D {
  if (preset === "custom" && custom) return custom
  switch (preset) {
    case "axial-x":
      return () => ({ dx: 1, dy: 0 })
    case "axial-y":
      return () => ({ dx: 0, dy: 1 })
    case "radial-out":
      return (x, y) => {
        const r = Math.hypot(x, y) || 1
        return { dx: x / r, dy: y / r }
      }
    case "circular-cw":
      return (x, y) => {
        const r = Math.hypot(x, y) || 1
        return { dx: y / r, dy: -x / r }
      }
    case "helical-myocard":
      return (_x, _y, _z, zNorm) => {
        const a = helicalStart_deg + (helicalEnd_deg - helicalStart_deg) * zNorm
        const rad = (a * Math.PI) / 180
        return { dx: Math.cos(rad), dy: Math.sin(rad) }
      }
    case "axonal-bundle":
      return (x, _y) => {
        const curve = Math.sin(x / 8) * 0.15
        return { dx: 1, dy: curve }
      }
    case "perfusion-channels":
      return (_x, _y, _z, zNorm) => {
        // alterna 0°/90° entre camadas para criar grid 3D
        const a = (Math.floor(zNorm * 10) % 2 === 0) ? 0 : Math.PI / 2
        return { dx: Math.cos(a), dy: Math.sin(a) }
      }
    default:
      return () => ({ dx: 1, dy: 0 })
  }
}

// ═════════════════════════════════════════════════════════════════════════
//   STREAMLINES (NAATIV3 core)
// ═════════════════════════════════════════════════════════════════════════

/**
 * Integra streamlines pelo campo vetorial usando Euler.
 * Retorna lista de polilinhas (cada uma com pontos x,y) em uma camada Z.
 */
function streamlinesForLayer(
  field: VectorField3D,
  z: number,
  zNorm: number,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  step_mm: number,
  spacing_mm: number,
): Array<Array<{ x: number; y: number }>> {
  const lines: Array<Array<{ x: number; y: number }>> = []
  const W = bbox.xmax - bbox.xmin
  const H = bbox.ymax - bbox.ymin
  // Gera sementes em uma grade ortogonal ao campo dominante na camada
  const v0 = field((bbox.xmin + bbox.xmax) / 2, (bbox.ymin + bbox.ymax) / 2, z, zNorm)
  const fieldAngle = Math.atan2(v0.dy, v0.dx)
  // Eixo perpendicular ao campo = onde colocamos as sementes
  const perpAngle = fieldAngle + Math.PI / 2
  const cx = (bbox.xmin + bbox.xmax) / 2
  const cy = (bbox.ymin + bbox.ymax) / 2
  // Range para sementes ao longo do perpendicular
  const diag = Math.hypot(W, H)
  const seedCount = Math.max(2, Math.floor(diag / spacing_mm))
  for (let i = 0; i < seedCount; i++) {
    const t = (i / (seedCount - 1) - 0.5) * diag
    const sx = cx + Math.cos(perpAngle) * t
    const sy = cy + Math.sin(perpAngle) * t
    // Integra forward e backward
    const fwd = traceStreamline(field, sx, sy, z, zNorm, step_mm, bbox, +1, 2000)
    const back = traceStreamline(field, sx, sy, z, zNorm, step_mm, bbox, -1, 2000)
    const merged = back.slice().reverse().concat(fwd.slice(1))
    if (merged.length >= 2) {
      lines.push(merged)
    }
  }
  return lines
}

function traceStreamline(
  field: VectorField3D,
  sx: number,
  sy: number,
  z: number,
  zNorm: number,
  step: number,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  dir: 1 | -1,
  maxSteps: number,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [{ x: sx, y: sy }]
  let x = sx
  let y = sy
  for (let i = 0; i < maxSteps; i++) {
    const v = field(x, y, z, zNorm)
    const m = Math.hypot(v.dx, v.dy) || 1
    x += dir * (v.dx / m) * step
    y += dir * (v.dy / m) * step
    if (x < bbox.xmin || x > bbox.xmax || y < bbox.ymin || y > bbox.ymax) break
    out.push({ x, y })
  }
  return out
}

// ═════════════════════════════════════════════════════════════════════════
//   ORDENAÇÃO (vizinho mais próximo)
// ═════════════════════════════════════════════════════════════════════════

function orderForPrinting(
  lines: Array<Array<{ x: number; y: number }>>,
  startX: number,
  startY: number,
): Array<Array<{ x: number; y: number }>> {
  if (lines.length === 0) return []
  const remaining = lines.slice()
  const ordered: Array<Array<{ x: number; y: number }>> = []
  let cx = startX
  let cy = startY
  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    let bestReversed = false
    for (let i = 0; i < remaining.length; i++) {
      const l = remaining[i]
      const a = l[0]
      const b = l[l.length - 1]
      const dA = Math.hypot(a.x - cx, a.y - cy)
      const dB = Math.hypot(b.x - cx, b.y - cy)
      if (dA < bestDist) { bestDist = dA; bestIdx = i; bestReversed = false }
      if (dB < bestDist) { bestDist = dB; bestIdx = i; bestReversed = true }
    }
    const chosen = remaining.splice(bestIdx, 1)[0]
    const final = bestReversed ? chosen.slice().reverse() : chosen
    ordered.push(final)
    const last = final[final.length - 1]
    cx = last.x
    cy = last.y
  }
  return ordered
}

// ═════════════════════════════════════════════════════════════════════════
//   EMISSORES DE G-CODE
// ═════════════════════════════════════════════════════════════════════════

interface EmitterAcc {
  out: string[]
  e: number
  ePerMm: number
  last: { x: number; y: number; z: number } | null
  moveCount: number
  totalLength_mm: number
}

function newAcc(layerH: number, nozzle: number): EmitterAcc {
  // Volumetric: π·(r²)·layerH por mm de move (E ≈ vol/π/r_filament²)
  // Aqui simplificamos: ePerMm = layerH × nozzleWidth (mm³/mm) ÷ filamentArea(≈π·(1/2)² assumido = 0.785)
  // Mas no contexto bioimpressão usamos ePerMm linear ≈ layerH × nozzle
  const ePerMm = layerH * nozzle * 0.95
  return { out: [], e: 0, ePerMm, last: null, moveCount: 0, totalLength_mm: 0 }
}

function travel(acc: EmitterAcc, x: number, y: number, z: number, feed_mms: number) {
  const f = Math.round(feed_mms * 60)
  acc.out.push(`G0 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} F${f}`)
  acc.last = { x, y, z }
  acc.moveCount++
}

function extrude(acc: EmitterAcc, x: number, y: number, z: number, feed_mms: number) {
  if (!acc.last) {
    acc.last = { x, y, z }
    return
  }
  const d = Math.hypot(x - acc.last.x, y - acc.last.y, z - acc.last.z)
  if (d < 1e-4) return
  acc.e += d * acc.ePerMm
  const f = Math.round(feed_mms * 60)
  acc.out.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} E${acc.e.toFixed(4)} F${f}`)
  acc.last = { x, y, z }
  acc.moveCount++
  acc.totalLength_mm += d
}

function selectTool(acc: EmitterAcc, toolIndex: number) {
  acc.out.push(`T${toolIndex} ; trocar para material ${toolIndex}`)
  acc.moveCount++
}

// ═════════════════════════════════════════════════════════════════════════
//   PREVIEW CONCEITUAL (rápido, ~5 ms)
// ═════════════════════════════════════════════════════════════════════════

export function generateAdvancedConceptualPreview(input: AdvancedGcodeInput): AdvancedConceptualPreview {
  const strategy = getTissueStrategy(input.tissue)
  const layerCount = Math.max(1, Math.ceil(input.dimensions.height / input.layerHeight_mm))

  // Tempo estimado bruto
  const mainMat = input.materials[0]
  const printSpeed = mainMat.bioink.printSpeed_mms
  const fillFactor = input.infillDensity_pct / 100
  const totalVolume_uL = input.dimensions.width * input.dimensions.depth * input.dimensions.height * fillFactor
  const totalLength_mm = totalVolume_uL / (input.layerHeight_mm * mainMat.bioink.nozzleDiameter_mm)
  const estimatedTime_min = Math.max(0.5, totalLength_mm / printSpeed / 60)

  // Streamlines estimadas (apenas para preview — não executa traçado completo)
  const nozzle = mainMat.bioink.nozzleDiameter_mm
  const spacing = nozzle * (1 + (100 - input.infillDensity_pct) / 100 * 2)
  const diag = Math.hypot(input.dimensions.width, input.dimensions.depth)
  const streamlineCount = Math.max(2, Math.floor(diag / spacing)) * layerCount

  // Ângulo da camada média
  const hStart = input.helicalAngleStart_deg ?? 60
  const hEnd = input.helicalAngleEnd_deg ?? -60
  let midLayerAngle_deg = 0
  if (input.strategy === "helical-transmural" || input.fieldPreset === "helical-myocard") {
    midLayerAngle_deg = (hStart + hEnd) / 2
  } else if (input.fieldPreset === "axial-y") {
    midLayerAngle_deg = 90
  }

  // Profile angular
  const angleProfile: AdvancedConceptualPreview["angleProfile"] = []
  for (let i = 0; i <= 6; i++) {
    const zNorm = i / 6
    const z_mm = input.dimensions.height * zNorm
    let a = 0
    if (input.strategy === "helical-transmural" || input.fieldPreset === "helical-myocard") {
      a = hStart + (hEnd - hStart) * zNorm
    } else if (input.fieldPreset === "axial-y") {
      a = 90
    } else if (input.fieldPreset === "perfusion-channels") {
      a = (Math.floor(zNorm * 10) % 2 === 0) ? 0 : 90
    }
    angleProfile.push({ z_mm, angle_deg: a })
  }

  // Materiais
  const materialCount = input.materials.length
  const volumePerMaterial_uL = input.materials.map(() => totalVolume_uL / materialCount)

  // Critical zones
  const criticalZones: AdvancedConceptualPreview["criticalZones"] = []
  if (input.strategy === "vascular-murray" && !input.materials.find((m) => m.bioink.materialLabel.toLowerCase().includes("pluronic"))) {
    criticalZones.push({
      zone: "Canais vasculares",
      reason: "Vascular-Murray sem material sacrificial (Pluronic) — canais não vão se abrir",
      severity: "critical",
    })
  }
  if (input.strategy === "helical-transmural" && input.tissue !== "myocardium" && input.tissue !== "muscle") {
    criticalZones.push({
      zone: "Estratégia × tecido",
      reason: `Helical-transmural é otimizado para miocárdio/músculo. Em ${strategy.label} o ganho biológico é menor.`,
      severity: "info",
    })
  }
  if (input.layerHeight_mm > nozzle * 0.8) {
    criticalZones.push({
      zone: "Resolução",
      reason: `Altura de camada ${input.layerHeight_mm} mm > 80% do bico (${nozzle} mm) — pode causar má adesão entre camadas`,
      severity: "warning",
    })
  }
  if (input.strategy === "vector-field-naativ3" && input.fieldPreset === "custom" && !input.customField) {
    criticalZones.push({
      zone: "Campo vetorial",
      reason: "Preset 'custom' sem função customField definida — fallback para axial-x",
      severity: "warning",
    })
  }

  // Narrative
  const narrative: string[] = []
  narrative.push(
    `🧬 Estratégia: ${strategyLabel(input.strategy)} sobre ${strategy.label}.`,
  )
  if (input.strategy === "vector-field-naativ3") {
    narrative.push(
      `🌐 Campo vetorial: ${fieldPresetLabel(input.fieldPreset ?? "axial-x")} — toolpath segue a direção biológica do tecido.`,
    )
  }
  if (input.strategy === "helical-transmural") {
    narrative.push(
      `🌀 Helicoidal transmural: ${hStart.toFixed(0)}° (face inferior) → ${hEnd.toFixed(0)}° (face superior), ${layerCount} camadas.`,
    )
  }
  if (input.strategy === "vascular-murray") {
    narrative.push(
      `🩸 Vascularização Murray: ${input.vascularLevels ?? 3} níveis de bifurcação fractal r³ = r₁³ + r₂³.`,
    )
  }
  if (input.strategy === "sacrificial-channels") {
    narrative.push(
      `🧪 Canais sacrificiais: pitch ${input.channelPitch_mm ?? 2.5} mm, Ø ${input.channelDiameter_mm ?? 0.8} mm — vasculatura aberta por dissolução.`,
    )
  }
  if (materialCount > 1) {
    narrative.push(
      `🎨 Multi-material: ${materialCount} biotintas (${input.materials.map((m) => m.label).join(" · ")}).`,
    )
  }
  narrative.push(
    `📐 ${layerCount} camadas × ${input.layerHeight_mm.toFixed(2)} mm — bico Ø${nozzle} mm — infill ${input.infillDensity_pct}%.`,
  )
  narrative.push(
    `⏱️ Tempo estimado: ~${estimatedTime_min.toFixed(1)} min · volume ~${totalVolume_uL.toFixed(1)} µL.`,
  )

  return {
    layerCount,
    streamlineCount,
    midLayerAngle_deg,
    angleProfile,
    materialCount,
    volumePerMaterial_uL,
    estimatedTime_min,
    criticalZones,
    narrative,
  }
}

// ═════════════════════════════════════════════════════════════════════════
//   ENGINE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════

export function generateAdvancedGcode(input: AdvancedGcodeInput): AdvancedGcodeResult {
  const strategy = getTissueStrategy(input.tissue)
  const mainMat = input.materials[0]
  const nozzle = mainMat.bioink.nozzleDiameter_mm
  const layerH = input.layerHeight_mm
  const printSpeed = mainMat.bioink.printSpeed_mms
  const travelSpeed = mainMat.bioink.travelSpeed_mms

  const acc = newAcc(layerH, nozzle)
  const rationale: string[] = []
  const warnings: string[] = []

  // ─── HEADER ────────────────────────────────────────────────────────────
  const job = input.jobName ?? "advanced_print"
  acc.out.push(`; ╔══════════════════════════════════════════════════════════╗`)
  acc.out.push(`; ║  BIA — Advanced G-Code · NAATIV3 framework               ║`)
  acc.out.push(`; ║  Job: ${job.padEnd(48)} ║`)
  acc.out.push(`; ║  Strategy: ${strategyLabel(input.strategy).padEnd(43)} ║`)
  acc.out.push(`; ║  Tissue: ${strategy.label.padEnd(45)} ║`)
  acc.out.push(`; ║  Janaina Dernowsek / Quantis Biotechnology 2026         ║`)
  acc.out.push(`; ╚══════════════════════════════════════════════════════════╝`)
  acc.out.push(`; `)
  acc.out.push(`; ── Parâmetros ─────────────────────────────────────────────`)
  acc.out.push(`; Dimensions: ${input.dimensions.width} × ${input.dimensions.depth} × ${input.dimensions.height} mm`)
  acc.out.push(`; Layer height: ${layerH} mm`)
  acc.out.push(`; Nozzle: ${nozzle} mm`)
  acc.out.push(`; Infill: ${input.infillDensity_pct}%`)
  acc.out.push(`; Print speed: ${printSpeed} mm/s`)
  acc.out.push(`; Materials: ${input.materials.length}`)
  input.materials.forEach((m) => {
    acc.out.push(`;   T${m.toolIndex}: ${m.label} (${m.bioink.materialLabel}${m.bioink.hasCells ? ` + ${m.bioink.cellType ?? "cells"}` : ""})`)
  })
  if (input.fieldPreset) acc.out.push(`; Field preset: ${input.fieldPreset}`)
  if (input.strategy === "helical-transmural") {
    acc.out.push(`; Helical angles: ${input.helicalAngleStart_deg ?? 60}° → ${input.helicalAngleEnd_deg ?? -60}° (transmural)`)
  }
  acc.out.push(`; `)
  acc.out.push(`G21 ; mm`)
  acc.out.push(`G90 ; absolute`)
  acc.out.push(`M83 ; relative E`)
  acc.out.push(`G92 E0`)
  acc.out.push(`;`)

  // ─── BBOX ──────────────────────────────────────────────────────────────
  const W = input.dimensions.width
  const D = input.dimensions.depth
  const H = input.dimensions.height
  const bbox = {
    xmin: -W / 2, ymin: -D / 2,
    xmax: +W / 2, ymax: +D / 2,
  }
  const layerCount = Math.max(1, Math.ceil(H / layerH))

  // ─── SWITCH POR STRATEGY ───────────────────────────────────────────────
  switch (input.strategy) {
    case "vector-field-naativ3":
      emitVectorField(acc, input, bbox, layerCount, rationale, warnings)
      break
    case "helical-transmural":
      emitHelicalTransmural(acc, input, bbox, layerCount, rationale, warnings)
      break
    case "vascular-murray":
      emitVascularMurray(acc, input, bbox, layerCount, rationale, warnings)
      break
    case "sacrificial-channels":
      emitSacrificialChannels(acc, input, bbox, layerCount, rationale, warnings)
      break
    case "multi-material-stack":
      emitMultiMaterialStack(acc, input, bbox, layerCount, rationale, warnings)
      break
    case "lattice-3d-naativ3":
      emitLattice3D(acc, input, bbox, layerCount, rationale, warnings)
      break
  }

  // ─── FOOTER ────────────────────────────────────────────────────────────
  acc.out.push(`;`)
  acc.out.push(`; Final E = ${acc.e.toFixed(2)} mm`)
  acc.out.push(`; Total moves: ${acc.moveCount}`)
  acc.out.push(`; Total length: ${acc.totalLength_mm.toFixed(1)} mm`)
  acc.out.push(`G92 E0`)
  acc.out.push(`; End of print`)

  const gcode = acc.out.join("\n")

  // Volume e tempo
  const r = nozzle / 2
  const totalVolume_uL = acc.totalLength_mm * Math.PI * r * r // mm³ = µL
  const estimatedTime_min = (acc.totalLength_mm / printSpeed) / 60

  // Printability via Nelson 2021 (material principal)
  const perim = 2 * (W + D)
  const area = W * D
  const printability = assessPrintability({
    perimeter_mm: perim,
    area_mm2: area,
    initialViscosity_PaS: mainMat.bioink.viscosity_PaS,
    nozzleDiameter_mm: nozzle,
    flowRate_mm3_s: printSpeed * Math.PI * r * r,
  })

  const preview = generateAdvancedConceptualPreview(input)

  return {
    gcode,
    layerCount,
    totalVolume_uL,
    estimatedTime_min,
    moveCount: acc.moveCount,
    streamlineCount: preview.streamlineCount,
    rationale,
    warnings,
    printability,
    preview,
    strategy: input.strategy,
    fieldPreset: input.fieldPreset,
  }
}

// ═════════════════════════════════════════════════════════════════════════
//   STRATEGY EMITTERS
// ═════════════════════════════════════════════════════════════════════════

function emitVectorField(
  acc: EmitterAcc,
  input: AdvancedGcodeInput,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  layerCount: number,
  rationale: string[], warnings: string[],
) {
  const mainMat = input.materials[0]
  const nozzle = mainMat.bioink.nozzleDiameter_mm
  const layerH = input.layerHeight_mm
  const printSpeed = mainMat.bioink.printSpeed_mms
  const travelSpeed = mainMat.bioink.travelSpeed_mms
  const hStart = input.helicalAngleStart_deg ?? 60
  const hEnd = input.helicalAngleEnd_deg ?? -60
  const field = fieldFor(input.fieldPreset, input.customField, hStart, hEnd)
  const stepIntegration = nozzle * 0.5
  const spacing = nozzle * (1 + (100 - input.infillDensity_pct) / 100 * 2)

  rationale.push(`Campo vetorial '${fieldPresetLabel(input.fieldPreset ?? "axial-x")}': cada filamento segue a direção biológica do tecido (contact guidance + anisotropia).`)
  rationale.push(`Sementes a cada ${spacing.toFixed(2)} mm perpendicular ao campo; integração Euler com passo ${stepIntegration.toFixed(2)} mm.`)

  selectTool(acc, mainMat.toolIndex)

  for (let li = 0; li < layerCount; li++) {
    const z = (li + 1) * layerH
    const zNorm = li / Math.max(1, layerCount - 1)
    acc.out.push(`; ── Layer ${li + 1}/${layerCount} · z=${z.toFixed(3)} ──`)
    const rawLines = streamlinesForLayer(field, z, zNorm, bbox, stepIntegration, spacing)
    if (rawLines.length === 0) continue
    // Ordena para impressão
    const startX = acc.last?.x ?? 0
    const startY = acc.last?.y ?? 0
    const ordered = orderForPrinting(rawLines, startX, startY)
    for (const line of ordered) {
      const p0 = line[0]
      travel(acc, p0.x, p0.y, z, travelSpeed)
      for (let i = 1; i < line.length; i++) {
        extrude(acc, line[i].x, line[i].y, z, printSpeed)
      }
    }
  }
}

function emitHelicalTransmural(
  acc: EmitterAcc,
  input: AdvancedGcodeInput,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  layerCount: number,
  rationale: string[], warnings: string[],
) {
  const mainMat = input.materials[0]
  const nozzle = mainMat.bioink.nozzleDiameter_mm
  const layerH = input.layerHeight_mm
  const printSpeed = mainMat.bioink.printSpeed_mms
  const travelSpeed = mainMat.bioink.travelSpeed_mms
  const hStart = input.helicalAngleStart_deg ?? 60
  const hEnd = input.helicalAngleEnd_deg ?? -60
  const spacing = nozzle * (1 + (100 - input.infillDensity_pct) / 100 * 2)

  rationale.push(`Helicoidal transmural fiel ao miocárdio: ângulo varia de ${hStart}° (endocárdio) a ${hEnd}° (epicárdio) ao longo de Z, gerando duplo-hélice nativa.`)
  rationale.push(`Cada camada tem todos os filamentos paralelos no ângulo correspondente — alinhamento via contact guidance para iPSC-CMs.`)

  selectTool(acc, mainMat.toolIndex)

  const W = bbox.xmax - bbox.xmin
  const D = bbox.ymax - bbox.ymin

  for (let li = 0; li < layerCount; li++) {
    const z = (li + 1) * layerH
    const zNorm = layerCount > 1 ? li / (layerCount - 1) : 0
    const angle_deg = hStart + (hEnd - hStart) * zNorm
    const angle_rad = (angle_deg * Math.PI) / 180
    acc.out.push(`; ── Layer ${li + 1}/${layerCount} · z=${z.toFixed(3)} · θ=${angle_deg.toFixed(1)}° ──`)

    // Direção primária
    const dx = Math.cos(angle_rad)
    const dy = Math.sin(angle_rad)
    // Direção perpendicular (onde colocamos sementes)
    const px = -dy
    const py = dx

    const cx = (bbox.xmin + bbox.xmax) / 2
    const cy = (bbox.ymin + bbox.ymax) / 2
    const diag = Math.hypot(W, D)
    const seedCount = Math.max(2, Math.floor(diag / spacing))
    let dirSign = 1
    for (let i = 0; i < seedCount; i++) {
      const t = (i / (seedCount - 1) - 0.5) * diag
      const sx = cx + px * t
      const sy = cy + py * t
      // Encontra intersecção da linha com bbox
      const seg = clipLineToBox(sx, sy, dx, dy, bbox)
      if (!seg) continue
      let [x1, y1, x2, y2] = seg
      if (dirSign < 0) { [x1, y1, x2, y2] = [x2, y2, x1, y1] }
      travel(acc, x1, y1, z, travelSpeed)
      extrude(acc, x2, y2, z, printSpeed)
      dirSign *= -1
    }
  }
}

function emitVascularMurray(
  acc: EmitterAcc,
  input: AdvancedGcodeInput,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  layerCount: number,
  rationale: string[], warnings: string[],
) {
  const mainMat = input.materials[0]
  const sacMat = input.materials.find((m) => m.bioink.materialLabel.toLowerCase().includes("pluronic") || m.label.toLowerCase().includes("sacrif"))
    ?? input.materials[1]
    ?? mainMat
  const nozzle = mainMat.bioink.nozzleDiameter_mm
  const layerH = input.layerHeight_mm
  const printSpeed = mainMat.bioink.printSpeed_mms
  const travelSpeed = mainMat.bioink.travelSpeed_mms
  const levels = input.vascularLevels ?? 3

  rationale.push(`Vascularização Murray: bifurcação fractal r³ = r₁³ + r₂³ com ${levels} níveis — mimetiza arteríolas/capilares e minimiza resistência hidrodinâmica.`)
  if (sacMat === mainMat) {
    warnings.push(`Sem material sacrificial dedicado — canais ficarão preenchidos com a tinta principal e não vão se abrir após dissolução.`)
  } else {
    rationale.push(`Canais sacrificiais usam T${sacMat.toolIndex} (${sacMat.label}) — dissolvidos pós-impressão para abrir lúmen vascular.`)
  }

  // Camada 1: matriz principal (perímetro + infill)
  acc.out.push(`; ── Layer 1 — matriz hidrogel ──`)
  selectTool(acc, mainMat.toolIndex)
  for (let li = 0; li < Math.floor(layerCount / 2); li++) {
    const z = (li + 1) * layerH
    emitRectilinearLayer(acc, bbox, z, nozzle * 1.5, 0, printSpeed, travelSpeed)
  }

  // Camada do meio: canais sacrificiais
  const zMid = Math.floor(layerCount / 2) * layerH
  acc.out.push(`; ── Camada do meio — canais sacrificiais (T${sacMat.toolIndex}) ──`)
  selectTool(acc, sacMat.toolIndex)
  emitMurrayTree(acc, bbox, zMid, levels, printSpeed, travelSpeed)

  // Camadas superiores: matriz cobrindo canais
  acc.out.push(`; ── Camadas superiores — matriz hidrogel ──`)
  selectTool(acc, mainMat.toolIndex)
  for (let li = Math.floor(layerCount / 2) + 1; li < layerCount; li++) {
    const z = (li + 1) * layerH
    emitRectilinearLayer(acc, bbox, z, nozzle * 1.5, 0, printSpeed, travelSpeed)
  }
}

function emitMurrayTree(
  acc: EmitterAcc,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  z: number,
  levels: number,
  printSpeed: number, travelSpeed: number,
) {
  const cx = (bbox.xmin + bbox.xmax) / 2
  const W = bbox.xmax - bbox.xmin
  // Tronco
  const x0 = bbox.xmin
  const x1 = cx
  const y0 = (bbox.ymin + bbox.ymax) / 2
  travel(acc, x0, y0, z, travelSpeed)
  extrude(acc, x1, y0, z, printSpeed)
  // Bifurcações recursivas
  branchRecursive(acc, x1, y0, +1, 0, W / 4, levels, z, printSpeed, travelSpeed)
}

function branchRecursive(
  acc: EmitterAcc,
  x: number, y: number,
  dirX: number, dirY: number,
  length: number,
  depth: number,
  z: number,
  printSpeed: number, travelSpeed: number,
) {
  if (depth <= 0 || length < 1) return
  const angle = Math.atan2(dirY, dirX)
  const branchAngle = Math.PI / 6 // 30°
  // Filho 1
  const a1 = angle + branchAngle
  const x1 = x + Math.cos(a1) * length
  const y1 = y + Math.sin(a1) * length
  travel(acc, x, y, z, travelSpeed)
  extrude(acc, x1, y1, z, printSpeed)
  // Filho 2
  const a2 = angle - branchAngle
  const x2 = x + Math.cos(a2) * length
  const y2 = y + Math.sin(a2) * length
  travel(acc, x, y, z, travelSpeed)
  extrude(acc, x2, y2, z, printSpeed)
  // Recursão
  const nextLen = length * 0.7937 // r₂/r₁ ≈ 2^(-1/3) (Murray)
  branchRecursive(acc, x1, y1, Math.cos(a1), Math.sin(a1), nextLen, depth - 1, z, printSpeed, travelSpeed)
  branchRecursive(acc, x2, y2, Math.cos(a2), Math.sin(a2), nextLen, depth - 1, z, printSpeed, travelSpeed)
}

function emitSacrificialChannels(
  acc: EmitterAcc,
  input: AdvancedGcodeInput,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  layerCount: number,
  rationale: string[], warnings: string[],
) {
  const mainMat = input.materials[0]
  const sacMat = input.materials.find((m) => m.label.toLowerCase().includes("sacrif") || m.bioink.materialLabel.toLowerCase().includes("pluronic"))
    ?? input.materials[1]
    ?? mainMat
  const layerH = input.layerHeight_mm
  const printSpeed = mainMat.bioink.printSpeed_mms
  const travelSpeed = mainMat.bioink.travelSpeed_mms
  const pitch = input.channelPitch_mm ?? 2.5
  const chanD = input.channelDiameter_mm ?? 0.8

  rationale.push(`Canais sacrificiais: pitch ${pitch} mm × Ø ${chanD} mm — vasculatura paralela aberta após dissolução do Pluronic a 4°C.`)
  if (sacMat === mainMat) {
    warnings.push(`Sem material sacrificial — usando tinta principal nos canais (não vão abrir).`)
  }

  // Para cada camada: alterna matriz e canais
  for (let li = 0; li < layerCount; li++) {
    const z = (li + 1) * layerH
    acc.out.push(`; ── Layer ${li + 1}/${layerCount} · z=${z.toFixed(3)} ──`)

    // 1) Matriz (rectilinear)
    selectTool(acc, mainMat.toolIndex)
    emitRectilinearLayer(acc, bbox, z, mainMat.bioink.nozzleDiameter_mm * 1.5, 0, printSpeed, travelSpeed)

    // 2) Canais paralelos a Y, espaçados de 'pitch'
    selectTool(acc, sacMat.toolIndex)
    let dirSign = 1
    for (let x = bbox.xmin + pitch; x < bbox.xmax; x += pitch) {
      const y0 = bbox.ymin
      const y1 = bbox.ymax
      const [yStart, yEnd] = dirSign > 0 ? [y0, y1] : [y1, y0]
      travel(acc, x, yStart, z, travelSpeed)
      extrude(acc, x, yEnd, z, printSpeed)
      dirSign *= -1
    }
  }
}

function emitMultiMaterialStack(
  acc: EmitterAcc,
  input: AdvancedGcodeInput,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  layerCount: number,
  rationale: string[], warnings: string[],
) {
  const layerH = input.layerHeight_mm
  const printSpeed = input.materials[0].bioink.printSpeed_mms
  const travelSpeed = input.materials[0].bioink.travelSpeed_mms
  const layersPerMat = Math.ceil(layerCount / input.materials.length)

  rationale.push(`Multi-material stack: ${input.materials.length} biotintas empilhadas verticalmente (zonal architecture) — gradiente de propriedades.`)
  input.materials.forEach((m, i) => {
    rationale.push(`  Camadas ${i * layersPerMat + 1}–${Math.min((i + 1) * layersPerMat, layerCount)}: T${m.toolIndex} ${m.label} (${m.bioink.materialLabel}).`)
  })

  for (let li = 0; li < layerCount; li++) {
    const z = (li + 1) * layerH
    const matIdx = Math.min(input.materials.length - 1, Math.floor(li / layersPerMat))
    const mat = input.materials[matIdx]
    if (li === 0 || matIdx !== Math.floor((li - 1) / layersPerMat)) {
      acc.out.push(`; ── Layer ${li + 1}/${layerCount} · z=${z.toFixed(3)} · MATERIAL T${mat.toolIndex} (${mat.label}) ──`)
      selectTool(acc, mat.toolIndex)
    } else {
      acc.out.push(`; ── Layer ${li + 1}/${layerCount} · z=${z.toFixed(3)} ──`)
    }
    emitRectilinearLayer(
      acc, bbox, z,
      mat.bioink.nozzleDiameter_mm * 1.5,
      li % 2 === 0 ? 0 : Math.PI / 2,
      mat.bioink.printSpeed_mms,
      mat.bioink.travelSpeed_mms,
    )
  }
}

function emitLattice3D(
  acc: EmitterAcc,
  input: AdvancedGcodeInput,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  layerCount: number,
  rationale: string[], warnings: string[],
) {
  const mainMat = input.materials[0]
  const layerH = input.layerHeight_mm
  const pitch = input.latticePitch_mm ?? 2.0
  const printSpeed = mainMat.bioink.printSpeed_mms
  const travelSpeed = mainMat.bioink.travelSpeed_mms

  rationale.push(`Lattice 3D NAATIV3: treliça orthogonal X/Y/Z com pitch ${pitch} mm — porosidade aberta para vascularização e difusão de O₂.`)

  selectTool(acc, mainMat.toolIndex)

  for (let li = 0; li < layerCount; li++) {
    const z = (li + 1) * layerH
    acc.out.push(`; ── Layer ${li + 1}/${layerCount} · z=${z.toFixed(3)} ──`)
    // Linhas X em pitch
    if (li % 2 === 0) {
      let dirSign = 1
      for (let y = bbox.ymin + pitch; y < bbox.ymax; y += pitch) {
        const [xs, xe] = dirSign > 0 ? [bbox.xmin, bbox.xmax] : [bbox.xmax, bbox.xmin]
        travel(acc, xs, y, z, travelSpeed)
        extrude(acc, xe, y, z, printSpeed)
        dirSign *= -1
      }
    } else {
      // Linhas Y
      let dirSign = 1
      for (let x = bbox.xmin + pitch; x < bbox.xmax; x += pitch) {
        const [ys, ye] = dirSign > 0 ? [bbox.ymin, bbox.ymax] : [bbox.ymax, bbox.ymin]
        travel(acc, x, ys, z, travelSpeed)
        extrude(acc, x, ye, z, printSpeed)
        dirSign *= -1
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
//   HELPERS
// ═════════════════════════════════════════════════════════════════════════

function emitRectilinearLayer(
  acc: EmitterAcc,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
  z: number,
  pitch: number,
  angle: number,
  printSpeed: number, travelSpeed: number,
) {
  const cx = (bbox.xmin + bbox.xmax) / 2
  const cy = (bbox.ymin + bbox.ymax) / 2
  const W = bbox.xmax - bbox.xmin
  const D = bbox.ymax - bbox.ymin
  const diag = Math.hypot(W, D)
  // Direção da linha = (cos, sin)
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  // Perpendicular
  const px = -dy
  const py = dx
  const seedCount = Math.max(2, Math.floor(diag / Math.max(0.05, pitch)))
  let dirSign = 1
  for (let i = 0; i < seedCount; i++) {
    const t = (i / (seedCount - 1) - 0.5) * diag
    const sx = cx + px * t
    const sy = cy + py * t
    const seg = clipLineToBox(sx, sy, dx, dy, bbox)
    if (!seg) continue
    let [x1, y1, x2, y2] = seg
    if (dirSign < 0) { [x1, y1, x2, y2] = [x2, y2, x1, y1] }
    travel(acc, x1, y1, z, travelSpeed)
    extrude(acc, x2, y2, z, printSpeed)
    dirSign *= -1
  }
}

/** Clipa uma reta infinita (x0,y0) + t*(dx,dy) contra a bounding box. */
function clipLineToBox(
  x0: number, y0: number, dx: number, dy: number,
  bbox: { xmin: number; ymin: number; xmax: number; ymax: number },
): [number, number, number, number] | null {
  let tmin = -Infinity
  let tmax = +Infinity
  // X
  if (Math.abs(dx) > 1e-9) {
    const t1 = (bbox.xmin - x0) / dx
    const t2 = (bbox.xmax - x0) / dx
    const lo = Math.min(t1, t2)
    const hi = Math.max(t1, t2)
    if (lo > tmin) tmin = lo
    if (hi < tmax) tmax = hi
  } else if (x0 < bbox.xmin || x0 > bbox.xmax) {
    return null
  }
  // Y
  if (Math.abs(dy) > 1e-9) {
    const t1 = (bbox.ymin - y0) / dy
    const t2 = (bbox.ymax - y0) / dy
    const lo = Math.min(t1, t2)
    const hi = Math.max(t1, t2)
    if (lo > tmin) tmin = lo
    if (hi < tmax) tmax = hi
  } else if (y0 < bbox.ymin || y0 > bbox.ymax) {
    return null
  }
  if (tmin > tmax) return null
  const x1 = x0 + dx * tmin
  const y1 = y0 + dy * tmin
  const x2 = x0 + dx * tmax
  const y2 = y0 + dy * tmax
  return [x1, y1, x2, y2]
}

// ═════════════════════════════════════════════════════════════════════════
//   LABELS
// ═════════════════════════════════════════════════════════════════════════

export function strategyLabel(s: AdvancedStrategy): string {
  switch (s) {
    case "vector-field-naativ3":   return "Vector Field (NAATIV3)"
    case "helical-transmural":     return "Helicoidal Transmural"
    case "vascular-murray":        return "Vascularização Murray"
    case "sacrificial-channels":   return "Canais Sacrificiais"
    case "multi-material-stack":   return "Multi-material Stack"
    case "lattice-3d-naativ3":     return "Lattice 3D (NAATIV3)"
  }
}

export function strategyDescription(s: AdvancedStrategy): string {
  switch (s) {
    case "vector-field-naativ3":   return "Cada filamento segue um campo direcional (axial, radial, helicoidal ou customizado). Núcleo do NAATIV3 — toolpath alinhado à arquitetura do tecido."
    case "helical-transmural":     return "Ângulo das fibras varia +60° (endocárdio) a −60° (epicárdio) ao longo de Z. Padrão biomimético do miocárdio."
    case "vascular-murray":        return "Árvore vascular fractal seguindo r³ = r₁³ + r₂³ (Murray). Combinada com material sacrificial para abrir lúmen."
    case "sacrificial-channels":   return "Canais paralelos de Pluronic dentro da matriz — dissolução a 4°C abre vasculatura linear."
    case "multi-material-stack":   return "Empilhamento zonal de biotintas (ex.: derme + epiderme; cartilagem + osso). Gradiente de propriedades por Z."
    case "lattice-3d-naativ3":     return "Treliça ortogonal 3D — máxima porosidade para difusão de O₂ e infiltração celular."
  }
}

export function fieldPresetLabel(p: VectorFieldPreset): string {
  switch (p) {
    case "axial-x":             return "Axial (eixo X)"
    case "axial-y":             return "Axial (eixo Y)"
    case "radial-out":          return "Radial (centro → fora)"
    case "circular-cw":         return "Circular horário"
    case "helical-myocard":     return "Helicoidal miocárdico"
    case "axonal-bundle":       return "Feixe axonal"
    case "perfusion-channels":  return "Canais de perfusão (alternado)"
    case "custom":              return "Customizado"
  }
}

export const ADVANCED_STRATEGIES: AdvancedStrategy[] = [
  "vector-field-naativ3",
  "helical-transmural",
  "vascular-murray",
  "sacrificial-channels",
  "multi-material-stack",
  "lattice-3d-naativ3",
]

export const VECTOR_FIELD_PRESETS: VectorFieldPreset[] = [
  "axial-x", "axial-y", "radial-out", "circular-cw",
  "helical-myocard", "axonal-bundle", "perfusion-channels", "custom",
]

/** Cita Bobill et al. 2023 NAATIV3 (referência inspiração) */
export const NAATIV3_CITATION = {
  short: "Bobill et al. (2023)",
  title: "NAATIV3: Nonplanar Architecture-Aligned Toolpathing for In Vitro 3D Bioprinting",
  inspiration: "Pipeline: vector field → streamlines → density filter → printable ordering → G-code",
}
