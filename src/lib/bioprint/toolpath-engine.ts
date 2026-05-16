/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BIA · Biofabrication Toolpath Intelligence Engine (BTIE)
 *
 *  Engine proprietário para geração, análise e otimização de toolpaths
 *  em bioimpressão extrusion-based. Fundamentação científica em 5 papers
 *  canônicos (ver scientific-refs.ts).
 *
 *  Princípios:
 *    • Não copiar arquitetura de slicers genéricos (Cura, PrusaSlicer)
 *    • Bioimpressão NUNCA faz home (G28)
 *    • Toda métrica é citável (Ref ID inline)
 *    • Algoritmos puros em TypeScript, sem dependências pesadas
 *    • Saída sempre Marlin-compatível mas com cabeçalho BIA proprietário
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Tipos públicos ────────────────────────────────────────────────────────

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface GcodeMove {
  /** Tipo: G0 (travel, sem extrusão) ou G1 (extrude) */
  type: "G0" | "G1"
  /** Coordenadas alvo (em mm) */
  to: Vec3
  /** Volume extrudado neste segmento (mm, eixo E) — só relevante em G1 */
  e: number
  /** Velocidade do segmento (mm/min) */
  feedrate: number
  /** Comprimento físico (mm) do segmento */
  length: number
  /** Linha original do G-code (1-indexed) */
  line: number
  /** Camada lógica (Z arredondado) */
  layer: number
  /** Ferramenta ativa (T0, T1...) — multi-extrusor */
  tool: number
}

export interface ParsedGcode {
  moves: GcodeMove[]
  /** Lista única de Z layers (ordenada) */
  layers: number[]
  /** Estatísticas globais */
  stats: {
    totalLength: number
    totalExtrudeLength: number
    totalTravelLength: number
    totalExtrudeVolume: number
    layerCount: number
    moveCount: number
    bounds: { min: Vec3; max: Vec3 }
    estimatedTimeMin: number
  }
  /** Avisos detectados (G28, etc) */
  warnings: string[]
}

// ─── Constantes biomédicas ─────────────────────────────────────────────────

/** Densidade típica de hidrogel (kg/m³) */
export const HYDROGEL_DENSITY = 1050

/** g (m/s²) */
export const GRAVITY = 9.81

/** Constante de normalização para Pr triangular (Gusmão 2025) */
export const C0_TRIANGULAR = (Math.PI * Math.sqrt(3)) / 9

// ─── PARSER de G-code ──────────────────────────────────────────────────────

/**
 * Parser permissivo de G-code Marlin-compatível.
 * Suporta G0, G1, G90/G91 (abs/rel), G92 (zero), T0/T1 (tools), comentários.
 * Ignora explicitamente G28 com warning (bioimpressão não faz home).
 */
export function parseGcode(gcode: string): ParsedGcode {
  const moves: GcodeMove[] = []
  const warnings: string[] = []
  const layerSet = new Set<number>()

  let absolute = true
  let absoluteE = true
  let cur: Vec3 = { x: 0, y: 0, z: 0 }
  let curE = 0
  let curFeed = 1500
  let curTool = 0

  const lines = gcode.split("\n")
  let totalLen = 0
  let totalExt = 0
  let totalTrav = 0
  let totalExtVol = 0
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity }
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].split(";")[0].trim() // remove comentário
    if (!raw) continue

    // Tool change
    if (/^T\d+/.test(raw)) {
      curTool = parseInt(raw.slice(1), 10) || 0
      continue
    }

    // Modes
    if (raw.startsWith("G90")) {
      absolute = true
      continue
    }
    if (raw.startsWith("G91")) {
      absolute = false
      continue
    }
    if (raw.startsWith("M82")) {
      absoluteE = true
      continue
    }
    if (raw.startsWith("M83")) {
      absoluteE = false
      continue
    }

    // G92 — zero in-place (não move)
    if (raw.startsWith("G92")) {
      const params = parseParams(raw)
      if (params.X !== undefined) cur.x = params.X
      if (params.Y !== undefined) cur.y = params.Y
      if (params.Z !== undefined) cur.z = params.Z
      if (params.E !== undefined) curE = params.E
      continue
    }

    // G28 — banido em bioimpressão, mas registramos como warning
    if (raw.startsWith("G28")) {
      warnings.push(
        `Linha ${i + 1}: G28 (home) detectado e IGNORADO — bioimpressão preserva bandeja/cartucho.`,
      )
      continue
    }

    // G0/G1 — movimento
    const isMove = raw.startsWith("G0") || raw.startsWith("G1")
    if (!isMove) continue

    const isG1 = raw.startsWith("G1")
    const params = parseParams(raw)

    const next: Vec3 = {
      x: absolute ? (params.X ?? cur.x) : cur.x + (params.X ?? 0),
      y: absolute ? (params.Y ?? cur.y) : cur.y + (params.Y ?? 0),
      z: absolute ? (params.Z ?? cur.z) : cur.z + (params.Z ?? 0),
    }
    if (params.F !== undefined) curFeed = params.F

    let dE = 0
    if (params.E !== undefined) {
      const nextE = absoluteE ? params.E : curE + params.E
      dE = nextE - curE
      curE = nextE
    }

    const length = dist3(cur, next)
    if (length === 0 && dE === 0) continue // skip no-op

    const layer = Math.round(next.z * 100) / 100
    layerSet.add(layer)

    moves.push({
      type: isG1 ? "G1" : "G0",
      to: next,
      e: dE,
      feedrate: curFeed,
      length,
      line: i + 1,
      layer,
      tool: curTool,
    })

    totalLen += length
    if (isG1 && dE > 0) {
      totalExt += length
      totalExtVol += dE
    } else {
      totalTrav += length
    }

    // bounds
    if (next.x < min.x) min.x = next.x
    if (next.y < min.y) min.y = next.y
    if (next.z < min.z) min.z = next.z
    if (next.x > max.x) max.x = next.x
    if (next.y > max.y) max.y = next.y
    if (next.z > max.z) max.z = next.z

    cur = next
  }

  const layers = Array.from(layerSet).sort((a, b) => a - b)
  // Tempo estimado (mm / feedrate em mm/min → min)
  let est = 0
  for (const m of moves) {
    est += m.length / Math.max(1, m.feedrate)
  }

  return {
    moves,
    layers,
    warnings,
    stats: {
      totalLength: totalLen,
      totalExtrudeLength: totalExt,
      totalTravelLength: totalTrav,
      totalExtrudeVolume: totalExtVol,
      layerCount: layers.length,
      moveCount: moves.length,
      bounds:
        min.x === Infinity
          ? { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
          : { min, max },
      estimatedTimeMin: est,
    },
  }
}

function parseParams(line: string): Record<string, number> {
  const out: Record<string, number> = {}
  const re = /([XYZEFIJK])(-?\d+(?:\.\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    out[m[1]] = parseFloat(m[2])
  }
  return out
}

function dist3(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// ─── MÉTRICAS BIOMÉDICAS ───────────────────────────────────────────────────

export interface ShearAnalysis {
  /** Shear máximo (Pa) em qualquer segmento */
  maxShear: number
  /** Shear médio ponderado por comprimento (Pa) */
  meanShear: number
  /** Por segmento: shear estimado em Pa */
  perMove: number[]
  /** Viabilidade prevista (% baseado em Blaeser thresholds) */
  predictedViability: number
}

/**
 * Calcula shear stress aproximado por segmento usando Hagen-Poiseuille
 * (referência: Blaeser et al. + van der Valk 2025).
 *
 * τ_wall = 4·Q / (π·R³)  [aprox. simplificada para Newtoniano]
 *
 * Onde:
 *   Q = volumetric flow rate (m³/s) = v_print · A_nozzle
 *   R = raio do nozzle (m)
 *
 * Para hidrogel (Herschel-Bulkley), aplicamos correção:
 *   τ = τ₀ + k·γ̇ⁿ
 *
 * @param parsed   G-code já parseado
 * @param nozzleId Diâmetro interno do nozzle em mm (típico 0.41 = 22GA)
 * @param viscosity Viscosidade aparente em Pa·s (típico 1–100 Pa·s)
 * @param yieldStress Tensão de cedência τ₀ em Pa (0 se Newtoniano)
 */
export function computeShear(
  parsed: ParsedGcode,
  nozzleId = 0.41,
  viscosity = 5,
  yieldStress = 0,
): ShearAnalysis {
  const R = nozzleId / 2 / 1000 // mm → m
  const A = Math.PI * R * R
  const perMove: number[] = []
  let maxS = 0
  let sumS = 0
  let sumL = 0

  for (const m of parsed.moves) {
    if (m.type === "G0" || m.e <= 0) {
      perMove.push(0)
      continue
    }
    const vMps = m.feedrate / 60 / 1000 // mm/min → m/s
    const Q = vMps * A
    // Shear rate aproximado (s⁻¹)
    const shearRate = (4 * Q) / (Math.PI * R * R * R)
    // Stress total Herschel-Bulkley (n=1 para simplificar)
    const tau = yieldStress + viscosity * shearRate
    perMove.push(tau)
    if (tau > maxS) maxS = tau
    sumS += tau * m.length
    sumL += m.length
  }

  const meanShear = sumL > 0 ? sumS / sumL : 0

  // Viabilidade ~ função do shear (Blaeser 2016 simplificado):
  //   τ < 100 Pa → 95%+
  //   100 < τ < 500 → linear decay para 70%
  //   τ > 500 → 50% (críticp)
  let viability = 95
  if (meanShear > 100 && meanShear < 500) {
    viability = 95 - ((meanShear - 100) / 400) * 25
  } else if (meanShear >= 500) {
    viability = 50
  }

  return {
    maxShear: maxS,
    meanShear,
    perMove,
    predictedViability: Math.max(40, Math.round(viability * 10) / 10),
  }
}

// ─── CONTINUIDADE DO PATH (AERO-inspired) ──────────────────────────────────

export interface ContinuityAnalysis {
  /** Razão extrude/total (0–1) — quanto maior, menos travel desperdiçado */
  extrudeRatio: number
  /** Número de levantamentos de bico (z-hops + retraçoes) */
  liftCount: number
  /** Número de segmentos contínuos extrudados (sub-paths) */
  continuousSubpaths: number
  /** Comprimento médio de cada sub-path (mm) */
  meanSubpathLen: number
  /** Score Eulerian: 1.0 = caminho perfeito sem travels */
  eulerianScore: number
}

export function analyzeContinuity(parsed: ParsedGcode): ContinuityAnalysis {
  const { totalLength, totalExtrudeLength } = parsed.stats
  const extrudeRatio = totalLength > 0 ? totalExtrudeLength / totalLength : 0

  // Subpaths: cada transição G1→G0→G1 ou Z-hop conta
  let subpaths = 0
  let inExtrude = false
  let lifts = 0
  let lastZ = -Infinity
  const subLens: number[] = []
  let curLen = 0

  for (const m of parsed.moves) {
    const isExt = m.type === "G1" && m.e > 0
    if (isExt) {
      if (!inExtrude) {
        subpaths++
        curLen = 0
      }
      curLen += m.length
      inExtrude = true
    } else {
      if (inExtrude) subLens.push(curLen)
      inExtrude = false
      if (m.to.z > lastZ + 0.1) lifts++
    }
    lastZ = m.to.z
  }
  if (inExtrude && curLen > 0) subLens.push(curLen)

  const meanLen =
    subLens.length > 0
      ? subLens.reduce((a, b) => a + b, 0) / subLens.length
      : 0

  // Eulerian score: penaliza muitos subpaths e muitos lifts.
  // 1 subpath, 0 lifts → 1.0 (caminho Euler perfeito)
  const eulerianScore = Math.max(
    0,
    1 - subpaths / 1000 - lifts / 500 + extrudeRatio * 0.3,
  )

  return {
    extrudeRatio,
    liftCount: lifts,
    continuousSubpaths: subpaths,
    meanSubpathLen: meanLen,
    eulerianScore: Math.min(1, eulerianScore),
  }
}

// ─── PRINTABILITY (Gusmão 2025) ────────────────────────────────────────────

/**
 * Pr = L² / (16·A)  →  1.0 é ideal (Gusmão et al. 2025)
 *
 * @param perimeter Perímetro projetado em mm
 * @param area      Área projetada em mm²
 */
export function printabilitySquare(perimeter: number, area: number): number {
  if (area <= 0) return 0
  return (perimeter * perimeter) / (16 * area)
}

/**
 * Pr,tri = (36·A·√3) / L²   →  1.0 é ideal
 */
export function printabilityTriangular(
  perimeter: number,
  area: number,
): number {
  if (perimeter <= 0) return 0
  return (36 * area * Math.sqrt(3)) / (perimeter * perimeter)
}

// ─── INFILL GENERATORS (proprietários BIA) ─────────────────────────────────

export interface InfillParams {
  /** Bounding box em mm */
  bounds: { width: number; depth: number; height: number }
  /** Densidade alvo (0–1) */
  density: number
  /** Espaçamento de linha em mm (auto se omitido) */
  spacing?: number
  /** Altura de camada em mm */
  layerHeight: number
  /** Velocidade em mm/min */
  feedrate: number
  /** Largura de extrusão em mm */
  extrusionWidth: number
}

/**
 * Gera Gyroid (TPMS implícito) usando equação:
 *   sin(x)·cos(y) + sin(y)·cos(z) + sin(z)·cos(x) = 0
 *
 * Aproximamos por amostragem de iso-superfície em fatias Z + marching
 * lines em cada fatia.
 * Referência: Enneper-Weierstrass / TPMS family (van der Valk 2025).
 */
export function generateGyroidGcode(p: InfillParams): string {
  const { bounds, density, layerHeight, feedrate, extrusionWidth } = p
  // Frequência espacial baseada na densidade (mais denso = mais ondas)
  const f = (0.5 + density * 3.5) // ondas por mm
  const k = (2 * Math.PI) / 10 // base wavelength 10mm

  const lines: string[] = []
  lines.push("; ╔══════════════════════════════════════════════════════════╗")
  lines.push("; ║  BIA · Gyroid TPMS infill                                ║")
  lines.push("; ║  Equation: sin(x)cos(y)+sin(y)cos(z)+sin(z)cos(x)=0      ║")
  lines.push("; ║  Ref: Enneper-Weierstrass (van der Valk 2025)            ║")
  lines.push("; ╚══════════════════════════════════════════════════════════╝")
  lines.push(`; bounds=${bounds.width}×${bounds.depth}×${bounds.height} mm`)
  lines.push(`; density=${(density * 100).toFixed(0)}% · spacing≈${p.spacing ?? extrusionWidth * 2}mm`)
  lines.push("G92 X0 Y0 Z0 E0 ; zero virtual (sem home)")
  lines.push("G90  ; absolutas")
  lines.push("M82  ; extrusão absoluta")

  let eAcc = 0
  const eFactor = 0.04 // mm extrudados por mm de path · approx

  const zSteps = Math.max(1, Math.round(bounds.height / layerHeight))
  for (let zi = 0; zi < zSteps; zi++) {
    const z = zi * layerHeight
    lines.push(`; ── layer ${zi} (z=${z.toFixed(3)}) ──`)
    lines.push(`G0 Z${z.toFixed(3)} F${feedrate * 0.5}`)

    // amostragem 2D na fatia
    const stepX = extrusionWidth
    const isoLines: Array<Array<[number, number]>> = []
    const cols = Math.ceil(bounds.width / stepX)
    let curLine: Array<[number, number]> = []
    for (let xi = 0; xi <= cols; xi++) {
      const x = xi * stepX
      // resolve y onde gyroid ≈ 0 nesta z (com sinal alternado por densidade)
      let best: number | null = null
      for (let yi = 0; yi <= 50; yi++) {
        const y = (yi / 50) * bounds.depth
        const v =
          Math.sin(k * f * x) * Math.cos(k * f * y) +
          Math.sin(k * f * y) * Math.cos(k * f * z) +
          Math.sin(k * f * z) * Math.cos(k * f * x)
        if (Math.abs(v) < 0.15) {
          best = y
          break
        }
      }
      if (best !== null) {
        curLine.push([x, best])
      } else if (curLine.length > 0) {
        isoLines.push(curLine)
        curLine = []
      }
    }
    if (curLine.length > 0) isoLines.push(curLine)

    // Emite G-code das polylines
    for (const poly of isoLines) {
      if (poly.length < 2) continue
      const [x0, y0] = poly[0]
      lines.push(`G0 X${x0.toFixed(3)} Y${y0.toFixed(3)} F${feedrate * 2}`)
      for (let i = 1; i < poly.length; i++) {
        const [x, y] = poly[i]
        const [xp, yp] = poly[i - 1]
        const seg = Math.hypot(x - xp, y - yp)
        eAcc += seg * eFactor
        lines.push(
          `G1 X${x.toFixed(3)} Y${y.toFixed(3)} E${eAcc.toFixed(4)} F${feedrate}`,
        )
      }
    }
  }

  lines.push("; ── fim do bloco Gyroid ──")
  lines.push("M104 S0 ; resfriar (segurança BIA)")
  return lines.join("\n")
}

/**
 * Voronoi-inspired infill (estocástico) — Lloyd relaxation simplificado.
 * Gera sites aleatórios e conecta vizinhos próximos.
 */
export function generateVoronoiGcode(
  p: InfillParams,
  sites = 30,
  seed = 1,
): string {
  const { bounds, layerHeight, feedrate, extrusionWidth } = p
  const lines: string[] = []
  lines.push("; ╔══════════════════════════════════════════════════════════╗")
  lines.push("; ║  BIA · Voronoi pseudo-random infill (Lloyd relaxation)   ║")
  lines.push("; ║  Ref: estocástico biomimético (van der Valk 2025)        ║")
  lines.push("; ╚══════════════════════════════════════════════════════════╝")
  lines.push("G92 X0 Y0 Z0 E0")
  lines.push("G90")
  lines.push("M82")

  // PRNG simples (mulberry32)
  let s = seed
  const rnd = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  let eAcc = 0
  const eFactor = 0.04

  const zSteps = Math.max(1, Math.round(bounds.height / layerHeight))
  for (let zi = 0; zi < zSteps; zi++) {
    const z = zi * layerHeight
    lines.push(`; ── layer ${zi} (z=${z.toFixed(3)}) ──`)
    lines.push(`G0 Z${z.toFixed(3)} F${feedrate * 0.5}`)

    // Sites aleatórios
    const pts: Array<[number, number]> = []
    for (let i = 0; i < sites; i++) {
      pts.push([rnd() * bounds.width, rnd() * bounds.depth])
    }

    // Conexão de cada site ao seu vizinho mais próximo (poda Delaunay simplificada)
    const visited = new Set<number>()
    visited.add(0)
    let cur = 0
    const [x0, y0] = pts[0]
    lines.push(`G0 X${x0.toFixed(3)} Y${y0.toFixed(3)} F${feedrate * 2}`)

    while (visited.size < pts.length) {
      let bestIdx = -1
      let bestD = Infinity
      for (let i = 0; i < pts.length; i++) {
        if (visited.has(i)) continue
        const d = Math.hypot(pts[i][0] - pts[cur][0], pts[i][1] - pts[cur][1])
        if (d < bestD) {
          bestD = d
          bestIdx = i
        }
      }
      if (bestIdx === -1) break
      visited.add(bestIdx)
      eAcc += bestD * eFactor
      lines.push(
        `G1 X${pts[bestIdx][0].toFixed(3)} Y${pts[bestIdx][1].toFixed(3)} E${eAcc.toFixed(4)} F${feedrate}`,
      )
      cur = bestIdx
    }
  }

  lines.push("; ── fim do Voronoi ──")
  lines.push("M104 S0")
  return lines.join("\n")
}

/**
 * Concentric (perímetros concêntricos) — para wells/canais perfusáveis.
 * Inspirado em CHIPS (Shiwarski 2025): 2 perímetros + infill 35%.
 */
export function generateConcentricGcode(p: InfillParams): string {
  const { bounds, layerHeight, feedrate, extrusionWidth } = p
  const lines: string[] = []
  lines.push("; ╔══════════════════════════════════════════════════════════╗")
  lines.push("; ║  BIA · Concentric perimeters (CHIPS-inspired)            ║")
  lines.push("; ║  Ref: Shiwarski et al. 2025 (FRESH + 35% rectilinear)    ║")
  lines.push("; ╚══════════════════════════════════════════════════════════╝")
  lines.push("G92 X0 Y0 Z0 E0")
  lines.push("G90")
  lines.push("M82")

  let eAcc = 0
  const eFactor = 0.04

  const zSteps = Math.max(1, Math.round(bounds.height / layerHeight))
  const nLoops = Math.max(2, Math.floor(Math.min(bounds.width, bounds.depth) / (extrusionWidth * 4)))

  for (let zi = 0; zi < zSteps; zi++) {
    const z = zi * layerHeight
    lines.push(`; ── layer ${zi} (z=${z.toFixed(3)}) · ${nLoops} perímetros ──`)
    lines.push(`G0 Z${z.toFixed(3)} F${feedrate * 0.5}`)

    for (let loop = 0; loop < nLoops; loop++) {
      const off = loop * extrusionWidth
      const x0 = off, x1 = bounds.width - off
      const y0 = off, y1 = bounds.depth - off
      if (x1 <= x0 || y1 <= y0) break

      lines.push(`; perímetro ${loop + 1}/${nLoops}`)
      lines.push(`G0 X${x0.toFixed(3)} Y${y0.toFixed(3)} F${feedrate * 2}`)
      const seg = 2 * (x1 - x0) + 2 * (y1 - y0)
      eAcc += seg * eFactor
      lines.push(`G1 X${x1.toFixed(3)} Y${y0.toFixed(3)} F${feedrate}`)
      lines.push(`G1 X${x1.toFixed(3)} Y${y1.toFixed(3)}`)
      lines.push(`G1 X${x0.toFixed(3)} Y${y1.toFixed(3)}`)
      lines.push(`G1 X${x0.toFixed(3)} Y${y0.toFixed(3)} E${eAcc.toFixed(4)}`)
    }
  }

  lines.push("; ── fim do bloco Concentric ──")
  lines.push("M104 S0")
  return lines.join("\n")
}

/**
 * Vector-field guided toolpath (NAATIV3-inspired).
 * Gera streamlines RK4 a partir de um campo vetorial 2D analítico simples.
 * Implementação simplificada (sem DTMRI real).
 */
export interface VectorFieldFn {
  (x: number, y: number, z: number): { vx: number; vy: number }
}

export function generateVectorFieldGcode(
  p: InfillParams,
  field: VectorFieldFn,
  seedsPerMm = 0.5,
): string {
  const { bounds, layerHeight, feedrate, extrusionWidth } = p
  const lines: string[] = []
  lines.push("; ╔══════════════════════════════════════════════════════════╗")
  lines.push("; ║  BIA · Vector-field streamlines (NAATIV3-inspired)       ║")
  lines.push("; ║  Ref: Griffin et al. 2025 — RK4 integration + greedy ord ║")
  lines.push("; ╚══════════════════════════════════════════════════════════╝")
  lines.push("G92 X0 Y0 Z0 E0")
  lines.push("G90")
  lines.push("M82")

  const ds = extrusionWidth * 0.5 // step size
  const maxLen = Math.max(bounds.width, bounds.depth) * 2
  let eAcc = 0
  const eFactor = 0.04

  const zSteps = Math.max(1, Math.round(bounds.height / layerHeight))
  for (let zi = 0; zi < zSteps; zi++) {
    const z = zi * layerHeight
    lines.push(`; ── layer ${zi} (z=${z.toFixed(3)}) ──`)
    lines.push(`G0 Z${z.toFixed(3)} F${feedrate * 0.5}`)

    // grid de sementes
    const nx = Math.max(2, Math.floor(bounds.width * seedsPerMm))
    const ny = Math.max(2, Math.floor(bounds.depth * seedsPerMm))
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const sx = (i + 0.5) * (bounds.width / nx)
        const sy = (j + 0.5) * (bounds.depth / ny)

        // RK4 streamline
        const stream: Array<[number, number]> = [[sx, sy]]
        let x = sx, y = sy
        let len = 0
        while (len < maxLen) {
          const k1 = field(x, y, z)
          const k2 = field(x + 0.5 * ds * k1.vx, y + 0.5 * ds * k1.vy, z)
          const k3 = field(x + 0.5 * ds * k2.vx, y + 0.5 * ds * k2.vy, z)
          const k4 = field(x + ds * k3.vx, y + ds * k3.vy, z)
          const dx = (ds / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx)
          const dy = (ds / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy)
          x += dx
          y += dy
          if (
            x < 0 || x > bounds.width ||
            y < 0 || y > bounds.depth ||
            Math.hypot(dx, dy) < 1e-4
          ) break
          stream.push([x, y])
          len += Math.hypot(dx, dy)
        }

        // Subsample streamline para evitar excesso de pontos
        if (stream.length < 3) continue
        const stride = Math.max(1, Math.floor(stream.length / 30))
        const sampled = stream.filter((_, idx) => idx % stride === 0)
        if (sampled.length < 2) continue

        const [x0, y0] = sampled[0]
        lines.push(`G0 X${x0.toFixed(3)} Y${y0.toFixed(3)} F${feedrate * 2}`)
        for (let s = 1; s < sampled.length; s++) {
          const [xa, ya] = sampled[s - 1]
          const [xb, yb] = sampled[s]
          const seg = Math.hypot(xb - xa, yb - ya)
          eAcc += seg * eFactor
          lines.push(
            `G1 X${xb.toFixed(3)} Y${yb.toFixed(3)} E${eAcc.toFixed(4)} F${feedrate}`,
          )
        }
      }
    }
  }

  lines.push("; ── fim do streamline field ──")
  lines.push("M104 S0")
  return lines.join("\n")
}

// ─── Predefined vector fields (presets) ────────────────────────────────────

/** Campo radial (vasos saindo do centro) */
export const FIELD_RADIAL: VectorFieldFn = (x, y) => {
  const cx = 20, cy = 20
  const dx = x - cx, dy = y - cy
  const n = Math.hypot(dx, dy) || 1
  return { vx: dx / n, vy: dy / n }
}

/** Campo circular (fibras concêntricas) */
export const FIELD_CIRCULAR: VectorFieldFn = (x, y) => {
  const cx = 20, cy = 20
  const dx = x - cx, dy = y - cy
  const n = Math.hypot(dx, dy) || 1
  return { vx: -dy / n, vy: dx / n }
}

/** Campo helicoidal (cardíaco simplificado) — Griffin 2025 inspired */
export const FIELD_HELICAL: VectorFieldFn = (x, y, z) => {
  const angle = z * 0.3 // helical angle progride com z
  return { vx: Math.cos(angle), vy: Math.sin(angle) }
}

/** Campo linear (fibras paralelas — muscular) */
export const FIELD_LINEAR: VectorFieldFn = (x, y, z) => {
  return { vx: 1, vy: 0 }
}

// ─── FALHAS PREDITAS (van der Valk 2025) ───────────────────────────────────

export interface FailurePrediction {
  /** Lista de avisos detectados */
  risks: Array<{
    type: "sag" | "over-extrude" | "under-extrude" | "fusion" | "clog" | "staircase"
    severity: "low" | "med" | "high"
    location?: string
    explanation: string
  }>
  /** Score geral 0–100 (100 = sem riscos) */
  score: number
}

export function predictFailures(
  parsed: ParsedGcode,
  shear: ShearAnalysis,
  cont: ContinuityAnalysis,
  yieldStress = 0,
): FailurePrediction {
  const risks: FailurePrediction["risks"] = []
  let scorePenalty = 0

  // 1. Clog: shear muito alto + viscosidade alta
  if (shear.maxShear > 1000) {
    risks.push({
      type: "clog",
      severity: "high",
      location: `pico em segmento de ${shear.maxShear.toFixed(0)} Pa`,
      explanation:
        "Shear extremo (>1000 Pa) pode bloquear o bico. Reduza feedrate ou aumente nozzle ID.",
    })
    scorePenalty += 30
  } else if (shear.maxShear > 500) {
    risks.push({
      type: "clog",
      severity: "med",
      explanation: "Shear alto (>500 Pa). Monitore extrusão.",
    })
    scorePenalty += 15
  }

  // 2. Sag: layer height grande em hidrogel pouco yield
  const layerHeights: number[] = []
  for (let i = 1; i < parsed.layers.length; i++) {
    layerHeights.push(parsed.layers[i] - parsed.layers[i - 1])
  }
  const meanLh =
    layerHeights.length > 0
      ? layerHeights.reduce((a, b) => a + b, 0) / layerHeights.length
      : 0.2

  if (yieldStress < 50 && meanLh > 0.3) {
    risks.push({
      type: "sag",
      severity: "high",
      explanation: `Layer height (${meanLh.toFixed(2)} mm) excessivo para yield stress ${yieldStress} Pa. Risco de colapso vertical. Use bath support (FRESH).`,
    })
    scorePenalty += 25
  }

  // 3. Continuidade ruim → over/under
  if (cont.eulerianScore < 0.3) {
    risks.push({
      type: "under-extrude",
      severity: "med",
      explanation: `Score Eulerian ${(cont.eulerianScore * 100).toFixed(0)}/100 — muitos travels podem causar sub-extrusão no início de cada sub-path.`,
    })
    scorePenalty += 10
  }
  if (cont.continuousSubpaths > 200) {
    risks.push({
      type: "fusion",
      severity: "low",
      explanation: `${cont.continuousSubpaths} sub-paths — atenção a fusão indesejada entre filamentos próximos.`,
    })
    scorePenalty += 5
  }

  // 4. Staircase: poucos layers para alta variação Z
  const bbZ = parsed.stats.bounds.max.z - parsed.stats.bounds.min.z
  if (bbZ > 5 && parsed.stats.layerCount < bbZ / 0.5) {
    risks.push({
      type: "staircase",
      severity: "med",
      explanation: "Poucas camadas para a altura — efeito escada visível. Aumente resolução em Z.",
    })
    scorePenalty += 10
  }

  return {
    risks,
    score: Math.max(0, 100 - scorePenalty),
  }
}

// ─── EXPORT util: G-code BIA header proprietário ──────────────────────────

export function biaHeader(meta: {
  jobName?: string
  bioink?: string
  cellType?: string
  cellDensity?: number
  nozzleId?: number
  cartridgeC?: number
  bedC?: number
  chamberC?: number
}): string {
  const now = new Date().toISOString()
  return [
    "; ╔══════════════════════════════════════════════════════════════════╗",
    "; ║                                                                  ║",
    "; ║      ███████   ███   █████                                       ║",
    "; ║      ██   ██    ██   ██   ██   · Biofabrication Intelligent     ║",
    "; ║      ███████    ██   ██████      Assistant                      ║",
    "; ║      ██   ██    ██   ██   ██   · Toolpath Intelligence Engine   ║",
    "; ║      ███████   ███   ██   ██     R12.8 — Quantis Biotechnology  ║",
    "; ║                                                                  ║",
    "; ╚══════════════════════════════════════════════════════════════════╝",
    `; Job:        ${meta.jobName ?? "untitled"}`,
    `; Bioink:     ${meta.bioink ?? "n/a"}`,
    `; CellType:   ${meta.cellType ?? "acelular"}`,
    `; CellDens:   ${meta.cellDensity ?? 0} ×10⁶ cells/mL`,
    `; Nozzle:     ${meta.nozzleId ?? 0.41} mm ID`,
    `; Temp:       cart=${meta.cartridgeC ?? "—"}°C · bed=${meta.bedC ?? "—"}°C · chamber=${meta.chamberC ?? "—"}°C`,
    `; Generated:  ${now}`,
    "; ─────────────────────────────────────────────────────────────────",
    "; ⚠️ BIA NÃO usa G28 (home) — bioimpressora preserva bandeja/cartucho.",
    "; ⚠️ Posicione manualmente o bico e use G92 ZERO AQUI antes de iniciar.",
    "; ─────────────────────────────────────────────────────────────────",
    "; Refs científicas:",
    ";   - van der Valk & Mirzaali (2025) npj Soft Matter — toolpath/T-code",
    ";   - Griffin et al. (2025) Commun. Eng. — vector-field NAATIV3",
    ";   - Shiwarski et al. (2025) Sci. Adv. — FRESH/CHIPS",
    ";   - Gusmão et al. (2025) Bioprinting — printability Pr=L²/16A",
    ";   - Shin et al. (2022) Micromachines — ML bioprinting",
    "; ═════════════════════════════════════════════════════════════════",
    "",
  ].join("\n")
}
