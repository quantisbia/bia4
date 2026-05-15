/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Biomimetic Infill Patterns (R10)
 *  ─────────────────────────────────────────────────────────────────────
 *  Algoritmos de toolpath para padrões de preenchimento bio-inspirados.
 *  Cada função recebe um bounding box 2D + parâmetros e retorna uma
 *  sequência de polylines (arrays de [x, y]) para ser convertida em G-code.
 *
 *  Padrões disponíveis:
 *    · hexagonalDense      — favo de mel denso (osso cortical)
 *    · gyroidTPMS          — Gyroid (osso esponjoso, cartilagem)
 *    · voronoi3D           — Voronoi orgânico (fígado, parênquima)
 *    · voronoiAnisotropic  — Voronoi alongado (tendão direcionado)
 *    · parallelAligned     — Linhas paralelas (músculo, fibra alinhada)
 *    · concentricSpiral    — Espiral anular (vaso, mucosa)
 *    · gridOrthogonal      — Grade 0/90 (derme básica)
 *    · schwarzP            — Schwarz Primitive TPMS (osso load-bearing)
 *    · diamondTPMS         — Diamond TPMS (cartilagem articular)
 *    · alveolar            — Câmaras alveolares (pulmão, hepático)
 *    · honeycombCardiac    — Hexagonal anisotrópico cardíaco
 *    · fascicular          — Feixes paralelos (nervo periférico)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { BiomimeticPattern } from "@/lib/bioprint/tissue-parameters"

// ─── Tipos comuns ───────────────────────────────────────────────────────

export type Point2D = [number, number]
export type Polyline = Point2D[]

export interface PatternParams {
  /** Bounding box do preenchimento */
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  /** Densidade de preenchimento (0-100%) */
  infillDensity: number
  /** Espaçamento entre linhas (mm) — calculado a partir da densidade */
  lineSpacing?: number
  /** Layer index — usado para alternar padrões entre camadas (gyroid TPMS) */
  layerIndex?: number
  /** Altura de camada (mm) — usado em TPMS para variar fase Z */
  layerHeight?: number
  /** Ângulo principal (graus) — para padrões anisotrópicos */
  angleDeg?: number
  /** Razão de anisotropia (1 = isotrópico, >1 = alongado) */
  anisotropyRatio?: number
  /** Tamanho de poro alvo (mm) — para Voronoi e TPMS */
  poreSizeMm?: number
  /** Z atual (mm) — para padrões 3D que dependem de Z */
  currentZ?: number
}

export interface PatternResult {
  polylines: Polyline[]
  metadata: {
    pattern: BiomimeticPattern
    totalLength: number // mm
    pathCount: number
    estimatedPorosity: number // %
  }
}

// ─── Utilitários ────────────────────────────────────────────────────────

function polylineLength(p: Polyline): number {
  let len = 0
  for (let i = 1; i < p.length; i++) {
    const dx = p[i][0] - p[i - 1][0]
    const dy = p[i][1] - p[i - 1][1]
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

function totalLength(polylines: Polyline[]): number {
  return polylines.reduce((sum, p) => sum + polylineLength(p), 0)
}

function lineSpacingFromDensity(density: number, nozzleWidth = 0.4): number {
  // Densidade 100% = espaçamento = largura do nozzle
  // Densidade 10% = espaçamento ~ nozzleWidth / 0.1
  const d = Math.max(5, Math.min(95, density))
  return nozzleWidth / (d / 100)
}

function rotatePoint(x: number, y: number, cx: number, cy: number, angleRad: number): Point2D {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

// ═══════════════════════════════════════════════════════════════════════
// 1) HEXAGONAL DENSO — Osso cortical, justaposição máxima
// ═══════════════════════════════════════════════════════════════════════
export function hexagonalDense(params: PatternParams): PatternResult {
  const { bounds, infillDensity } = params
  const W = bounds.maxX - bounds.minX
  const H = bounds.maxY - bounds.minY

  // Tamanho do hexágono inversamente proporcional à densidade
  const hexSize = Math.max(0.8, 6 - (infillDensity / 100) * 5) // 0.8 a 6 mm
  const dx = hexSize * Math.sqrt(3)
  const dy = hexSize * 1.5

  const polylines: Polyline[] = []

  const nCols = Math.ceil(W / dx) + 1
  const nRows = Math.ceil(H / dy) + 1

  for (let row = 0; row < nRows; row++) {
    for (let col = 0; col < nCols; col++) {
      const offset = (row % 2) * (dx / 2)
      const cx = bounds.minX + col * dx + offset
      const cy = bounds.minY + row * dy
      if (cx < bounds.minX - hexSize || cx > bounds.maxX + hexSize) continue
      if (cy < bounds.minY - hexSize || cy > bounds.maxY + hexSize) continue

      // Hexágono em volta de (cx, cy)
      const hex: Polyline = []
      for (let i = 0; i <= 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6
        const x = cx + hexSize * Math.cos(angle)
        const y = cy + hexSize * Math.sin(angle)
        if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
          hex.push([x, y])
        }
      }
      if (hex.length >= 2) polylines.push(hex)
    }
  }

  return {
    polylines,
    metadata: {
      pattern: "hexagonal-dense",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(5, 80 - infillDensity * 0.7),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 2) GYROID TPMS — Triply Periodic Minimal Surface
//    f(x,y,z) = sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x) = 0
//    Para 2D em layer z, fixamos z = currentZ * scale
// ═══════════════════════════════════════════════════════════════════════
export function gyroidTPMS(params: PatternParams): PatternResult {
  const { bounds, infillDensity, currentZ = 0, poreSizeMm = 1.5 } = params
  const W = bounds.maxX - bounds.minX
  const H = bounds.maxY - bounds.minY

  const scale = (2 * Math.PI) / poreSizeMm
  const z = currentZ * scale
  const sz = Math.sin(z), cz = Math.cos(z)

  // Marching squares simplificado em grid
  const gridSize = Math.max(0.3, 1 - infillDensity / 150) // 0.3-1mm
  const nCols = Math.ceil(W / gridSize)
  const nRows = Math.ceil(H / gridSize)
  const polylines: Polyline[] = []

  // Threshold da iso-superfície (varia para criar mais ou menos densidade)
  const threshold = (infillDensity - 50) / 100 // -0.5 a +0.5

  let currentLine: Polyline = []

  for (let row = 0; row <= nRows; row++) {
    for (let col = 0; col <= nCols; col++) {
      const x = bounds.minX + col * gridSize
      const y = bounds.minY + row * gridSize
      const sx = Math.sin(x * scale)
      const cx = Math.cos(x * scale)
      const sy = Math.sin(y * scale)
      const cy = Math.cos(y * scale)
      const f = sx * cy + sy * cz + sz * cx

      if (Math.abs(f - threshold) < 0.15) {
        currentLine.push([x, y])
      } else {
        if (currentLine.length >= 2) polylines.push(currentLine)
        currentLine = []
      }
    }
    if (currentLine.length >= 2) polylines.push(currentLine)
    currentLine = []
  }

  return {
    polylines,
    metadata: {
      pattern: "gyroid-tpms",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(20, 90 - infillDensity * 0.6),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 3) SCHWARZ-P TPMS — cos(x) + cos(y) + cos(z) = threshold
//    Mais "cubico", load-bearing
// ═══════════════════════════════════════════════════════════════════════
export function schwarzPTPMS(params: PatternParams): PatternResult {
  const { bounds, infillDensity, currentZ = 0, poreSizeMm = 1.5 } = params
  const W = bounds.maxX - bounds.minX
  const H = bounds.maxY - bounds.minY

  const scale = (2 * Math.PI) / poreSizeMm
  const cz = Math.cos(currentZ * scale)
  const gridSize = Math.max(0.4, 1 - infillDensity / 150)
  const threshold = (infillDensity - 50) / 100

  const polylines: Polyline[] = []
  let currentLine: Polyline = []

  const nCols = Math.ceil(W / gridSize)
  const nRows = Math.ceil(H / gridSize)

  for (let row = 0; row <= nRows; row++) {
    for (let col = 0; col <= nCols; col++) {
      const x = bounds.minX + col * gridSize
      const y = bounds.minY + row * gridSize
      const f = Math.cos(x * scale) + Math.cos(y * scale) + cz

      if (Math.abs(f - threshold) < 0.2) {
        currentLine.push([x, y])
      } else {
        if (currentLine.length >= 2) polylines.push(currentLine)
        currentLine = []
      }
    }
    if (currentLine.length >= 2) polylines.push(currentLine)
    currentLine = []
  }

  return {
    polylines,
    metadata: {
      pattern: "schwarz-p-tpms",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(15, 85 - infillDensity * 0.7),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 4) DIAMOND TPMS — sin(x)sin(y)sin(z) + sin(x)cos(y)cos(z) + ... = 0
//    Ótimo para cartilagem (alta tortuosidade)
// ═══════════════════════════════════════════════════════════════════════
export function diamondTPMS(params: PatternParams): PatternResult {
  const { bounds, infillDensity, currentZ = 0, poreSizeMm = 1.2 } = params
  const W = bounds.maxX - bounds.minX
  const H = bounds.maxY - bounds.minY

  const scale = (2 * Math.PI) / poreSizeMm
  const sz = Math.sin(currentZ * scale), cz = Math.cos(currentZ * scale)
  const gridSize = Math.max(0.3, 1 - infillDensity / 150)
  const threshold = (infillDensity - 50) / 100

  const polylines: Polyline[] = []
  let currentLine: Polyline = []

  const nCols = Math.ceil(W / gridSize)
  const nRows = Math.ceil(H / gridSize)

  for (let row = 0; row <= nRows; row++) {
    for (let col = 0; col <= nCols; col++) {
      const x = bounds.minX + col * gridSize
      const y = bounds.minY + row * gridSize
      const sx = Math.sin(x * scale), cx = Math.cos(x * scale)
      const sy = Math.sin(y * scale), cy = Math.cos(y * scale)
      const f = sx * sy * sz + sx * cy * cz + cx * sy * cz + cx * cy * sz

      if (Math.abs(f - threshold * 0.5) < 0.18) {
        currentLine.push([x, y])
      } else {
        if (currentLine.length >= 2) polylines.push(currentLine)
        currentLine = []
      }
    }
    if (currentLine.length >= 2) polylines.push(currentLine)
    currentLine = []
  }

  return {
    polylines,
    metadata: {
      pattern: "diamond-tpms",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(25, 90 - infillDensity * 0.65),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 5) VORONOI 3D — Células poligonais orgânicas
// ═══════════════════════════════════════════════════════════════════════
export function voronoi3D(params: PatternParams): PatternResult {
  const { bounds, infillDensity, poreSizeMm = 2.0, currentZ = 0 } = params
  const W = bounds.maxX - bounds.minX
  const H = bounds.maxY - bounds.minY

  // Número de sementes baseado em poreSizeMm
  const density = Math.max(15, Math.min(95, infillDensity))
  const nSeeds = Math.round((W * H) / (poreSizeMm * poreSizeMm * (100 / density)))

  // Seed determinístico baseado em layer + bounds (mesmo padrão repete entre camadas para coerência 3D)
  const seed = Math.floor(currentZ * 7.3) + Math.floor(bounds.minX) * 17 + Math.floor(bounds.minY) * 31

  // PRNG simples (mulberry32)
  let state = seed >>> 0
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Gera sementes
  const seeds: Point2D[] = []
  for (let i = 0; i < nSeeds; i++) {
    seeds.push([bounds.minX + rand() * W, bounds.minY + rand() * H])
  }

  // Para cada seed, encontra os vizinhos próximos e desenha arestas
  const polylines: Polyline[] = []
  const drawn = new Set<string>()

  for (let i = 0; i < seeds.length; i++) {
    const [x1, y1] = seeds[i]
    // Encontra os 4-6 vizinhos mais próximos
    const dists = seeds.map((s, j) => ({ j, d: (s[0] - x1) ** 2 + (s[1] - y1) ** 2 }))
      .filter(o => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)

    for (const { j } of dists) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (drawn.has(key)) continue
      drawn.add(key)

      // Aresta da Voronoi = mediatriz entre os dois pontos
      const [x2, y2] = seeds[j]
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      const dx = x2 - x1, dy = y2 - y1
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 0.1) continue
      const perpX = -dy / len, perpY = dx / len
      const edgeLen = poreSizeMm * 0.7
      const p1: Point2D = [mx - perpX * edgeLen, my - perpY * edgeLen]
      const p2: Point2D = [mx + perpX * edgeLen, my + perpY * edgeLen]

      // Clip simples ao bounds
      const clipped = clipSegment(p1, p2, bounds)
      if (clipped) polylines.push(clipped)
    }
  }

  return {
    polylines,
    metadata: {
      pattern: "voronoi-3d",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(30, 85 - infillDensity * 0.55),
    },
  }
}

function clipSegment(p1: Point2D, p2: Point2D, b: PatternParams["bounds"]): Polyline | null {
  // Cohen-Sutherland clipping
  const compute = (x: number, y: number): number => {
    let code = 0
    if (x < b.minX) code |= 1
    else if (x > b.maxX) code |= 2
    if (y < b.minY) code |= 4
    else if (y > b.maxY) code |= 8
    return code
  }

  let [x1, y1] = p1, [x2, y2] = p2
  let code1 = compute(x1, y1)
  let code2 = compute(x2, y2)
  let accept = false

  for (let i = 0; i < 4; i++) {
    if (!(code1 | code2)) { accept = true; break }
    if (code1 & code2) break

    const codeOut = code1 || code2
    let x = 0, y = 0
    if (codeOut & 8) { x = x1 + ((x2 - x1) * (b.maxY - y1)) / (y2 - y1); y = b.maxY }
    else if (codeOut & 4) { x = x1 + ((x2 - x1) * (b.minY - y1)) / (y2 - y1); y = b.minY }
    else if (codeOut & 2) { y = y1 + ((y2 - y1) * (b.maxX - x1)) / (x2 - x1); x = b.maxX }
    else if (codeOut & 1) { y = y1 + ((y2 - y1) * (b.minX - x1)) / (x2 - x1); x = b.minX }

    if (codeOut === code1) { x1 = x; y1 = y; code1 = compute(x1, y1) }
    else { x2 = x; y2 = y; code2 = compute(x2, y2) }
  }

  return accept ? [[x1, y1], [x2, y2]] : null
}

// ═══════════════════════════════════════════════════════════════════════
// 6) VORONOI ANISOTRÓPICO — Alongado em uma direção (tendão, músculo)
// ═══════════════════════════════════════════════════════════════════════
export function voronoiAnisotropic(params: PatternParams): PatternResult {
  const angle = params.angleDeg ?? 0
  const ratio = params.anisotropyRatio ?? 2.0
  const rad = (angle * Math.PI) / 180

  // Trick: gera Voronoi normal mas em um espaço estirado, depois desestira
  const stretchedBounds = {
    minX: params.bounds.minX,
    maxX: params.bounds.maxX,
    minY: params.bounds.minY * ratio,
    maxY: params.bounds.maxY * ratio,
  }

  const base = voronoi3D({ ...params, bounds: stretchedBounds })

  // Desestira + rotaciona
  const cx = (params.bounds.minX + params.bounds.maxX) / 2
  const cy = (params.bounds.minY + params.bounds.maxY) / 2

  const transformed = base.polylines.map(pl =>
    pl.map(([x, y]) => {
      const y2 = y / ratio
      return rotatePoint(x, y2, cx, cy, rad)
    })
  )

  return {
    polylines: transformed,
    metadata: {
      pattern: "voronoi-anisotropic",
      totalLength: totalLength(transformed),
      pathCount: transformed.length,
      estimatedPorosity: base.metadata.estimatedPorosity,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 7) PARALLEL ALIGNED — Linhas paralelas (músculo, fibra)
// ═══════════════════════════════════════════════════════════════════════
export function parallelAligned(params: PatternParams): PatternResult {
  const { bounds, infillDensity, angleDeg = 0 } = params
  const spacing = lineSpacingFromDensity(infillDensity)
  const rad = (angleDeg * Math.PI) / 180

  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const W = bounds.maxX - bounds.minX
  const H = bounds.maxY - bounds.minY
  const diag = Math.sqrt(W * W + H * H)

  const polylines: Polyline[] = []
  let direction = 1

  for (let offset = -diag / 2; offset <= diag / 2; offset += spacing) {
    // Linha perpendicular ao eixo do ângulo, deslocada por offset
    const p1: Point2D = [cx - diag, cy + offset]
    const p2: Point2D = [cx + diag, cy + offset]
    const r1 = rotatePoint(p1[0], p1[1], cx, cy, rad)
    const r2 = rotatePoint(p2[0], p2[1], cx, cy, rad)
    const clipped = clipSegment(r1, r2, bounds)
    if (clipped) {
      if (direction < 0) clipped.reverse()
      polylines.push(clipped)
      direction = -direction // Zigzag para reduzir traveling
    }
  }

  return {
    polylines,
    metadata: {
      pattern: "parallel-aligned",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(10, 100 - infillDensity),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 8) CONCENTRIC SPIRAL — Espiral concêntrica (vaso, anular)
// ═══════════════════════════════════════════════════════════════════════
export function concentricSpiral(params: PatternParams): PatternResult {
  const { bounds, infillDensity } = params
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const rMax = Math.min((bounds.maxX - bounds.minX) / 2, (bounds.maxY - bounds.minY) / 2)
  const spacing = lineSpacingFromDensity(infillDensity)

  const polylines: Polyline[] = []

  // Espiral arquimediana: r = a * θ
  const spiral: Polyline = []
  const turns = Math.floor(rMax / spacing)
  const dTheta = 0.05

  for (let t = 0; t < turns * 2 * Math.PI; t += dTheta) {
    const r = (spacing * t) / (2 * Math.PI)
    if (r > rMax) break
    const x = cx + r * Math.cos(t)
    const y = cy + r * Math.sin(t)
    if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
      spiral.push([x, y])
    }
  }

  if (spiral.length >= 2) polylines.push(spiral)

  return {
    polylines,
    metadata: {
      pattern: "concentric-spiral",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(20, 100 - infillDensity),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 9) GRID ORTHOGONAL — Grade 0/90 (alterna direção por camada)
// ═══════════════════════════════════════════════════════════════════════
export function gridOrthogonal(params: PatternParams): PatternResult {
  const layerIdx = params.layerIndex ?? 0
  const angle = layerIdx % 2 === 0 ? 0 : 90

  const result = parallelAligned({ ...params, angleDeg: angle })
  return {
    polylines: result.polylines,
    metadata: { ...result.metadata, pattern: "grid-orthogonal" },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 10) ALVEOLAR — Câmaras alveolares (pulmão, parênquima hepático)
//     Hexágonos grandes com aberturas internas
// ═══════════════════════════════════════════════════════════════════════
export function alveolar(params: PatternParams): PatternResult {
  const { bounds, infillDensity } = params
  const chamberSize = Math.max(2, 8 - (infillDensity / 100) * 5)
  const dx = chamberSize * Math.sqrt(3)
  const dy = chamberSize * 1.5

  const polylines: Polyline[] = []
  const nCols = Math.ceil((bounds.maxX - bounds.minX) / dx) + 1
  const nRows = Math.ceil((bounds.maxY - bounds.minY) / dy) + 1

  for (let row = 0; row < nRows; row++) {
    for (let col = 0; col < nCols; col++) {
      const offset = (row % 2) * (dx / 2)
      const cx = bounds.minX + col * dx + offset
      const cy = bounds.minY + row * dy
      if (cx < bounds.minX || cx > bounds.maxX || cy < bounds.minY || cy > bounds.maxY) continue

      // Hexágono externo
      const hexOuter: Polyline = []
      for (let i = 0; i <= 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6
        const x = cx + chamberSize * Math.cos(angle)
        const y = cy + chamberSize * Math.sin(angle)
        if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) hexOuter.push([x, y])
      }
      if (hexOuter.length >= 2) polylines.push(hexOuter)

      // Hexágono interno (vazio) — só desenha 3 lados (abertura para difusão)
      const innerR = chamberSize * 0.4
      const hexInner: Polyline = []
      for (let i = 0; i <= 3; i++) { // Apenas 3 lados → abertura
        const angle = (Math.PI / 3) * i + Math.PI / 6
        const x = cx + innerR * Math.cos(angle)
        const y = cy + innerR * Math.sin(angle)
        if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) hexInner.push([x, y])
      }
      if (hexInner.length >= 2) polylines.push(hexInner)
    }
  }

  return {
    polylines,
    metadata: {
      pattern: "alveolar",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(40, 95 - infillDensity * 0.5),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 11) HONEYCOMB CARDIAC — Hexagonal anisotrópico (alongado na direção do batimento)
// ═══════════════════════════════════════════════════════════════════════
export function honeycombCardiac(params: PatternParams): PatternResult {
  const { bounds, infillDensity, angleDeg = 0, anisotropyRatio = 1.8 } = params
  const hexSize = Math.max(1.5, 5 - (infillDensity / 100) * 3)
  const dx = hexSize * Math.sqrt(3)
  const dy = hexSize * 1.5 * anisotropyRatio // estiramento na direção principal

  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const rad = (angleDeg * Math.PI) / 180

  const polylines: Polyline[] = []
  const nCols = Math.ceil((bounds.maxX - bounds.minX) * 1.5 / dx) + 2
  const nRows = Math.ceil((bounds.maxY - bounds.minY) * 1.5 / dy) + 2

  for (let row = -1; row < nRows; row++) {
    for (let col = -1; col < nCols; col++) {
      const offset = (row % 2) * (dx / 2)
      const baseX = bounds.minX + col * dx + offset
      const baseY = bounds.minY + row * dy

      const hex: Polyline = []
      for (let i = 0; i <= 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6
        const x = baseX + hexSize * Math.cos(angle)
        const y = baseY + hexSize * anisotropyRatio * Math.sin(angle)
        const [rx, ry] = rotatePoint(x, y, cx, cy, rad)
        if (rx >= bounds.minX && rx <= bounds.maxX && ry >= bounds.minY && ry <= bounds.maxY) {
          hex.push([rx, ry])
        }
      }
      if (hex.length >= 2) polylines.push(hex)
    }
  }

  return {
    polylines,
    metadata: {
      pattern: "honeycomb-cardiac",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(15, 80 - infillDensity * 0.65),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 12) FASCICULAR — Feixes paralelos com agrupamentos (nervo periférico)
// ═══════════════════════════════════════════════════════════════════════
export function fascicular(params: PatternParams): PatternResult {
  const { bounds, infillDensity, angleDeg = 0 } = params
  const spacing = lineSpacingFromDensity(infillDensity)
  const fascicleSize = 5 // mm — diâmetro do fascículo
  const linesPerFascicle = Math.max(3, Math.round(fascicleSize / spacing))

  const rad = (angleDeg * Math.PI) / 180
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const W = bounds.maxX - bounds.minX
  const H = bounds.maxY - bounds.minY
  const diag = Math.sqrt(W * W + H * H)

  const polylines: Polyline[] = []
  let direction = 1
  let count = 0

  for (let offset = -diag / 2; offset <= diag / 2; offset += spacing) {
    // Gap entre fascículos
    if (count > 0 && count % linesPerFascicle === 0) {
      offset += spacing * 1.2 // pula um espaço maior entre feixes
    }

    const p1: Point2D = [cx - diag, cy + offset]
    const p2: Point2D = [cx + diag, cy + offset]
    const r1 = rotatePoint(p1[0], p1[1], cx, cy, rad)
    const r2 = rotatePoint(p2[0], p2[1], cx, cy, rad)
    const clipped = clipSegment(r1, r2, bounds)
    if (clipped) {
      if (direction < 0) clipped.reverse()
      polylines.push(clipped)
      direction = -direction
      count++
    }
  }

  return {
    polylines,
    metadata: {
      pattern: "fascicular",
      totalLength: totalLength(polylines),
      pathCount: polylines.length,
      estimatedPorosity: Math.max(20, 90 - infillDensity * 0.7),
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  DISPATCHER — Escolhe o padrão pela enum BiomimeticPattern
// ═══════════════════════════════════════════════════════════════════════
export function generatePattern(pattern: BiomimeticPattern, params: PatternParams): PatternResult {
  switch (pattern) {
    case "hexagonal-dense":     return hexagonalDense(params)
    case "gyroid-tpms":         return gyroidTPMS(params)
    case "schwarz-p-tpms":      return schwarzPTPMS(params)
    case "diamond-tpms":        return diamondTPMS(params)
    case "voronoi-3d":          return voronoi3D(params)
    case "voronoi-anisotropic": return voronoiAnisotropic(params)
    case "parallel-aligned":    return parallelAligned(params)
    case "concentric-spiral":   return concentricSpiral(params)
    case "grid-orthogonal":     return gridOrthogonal(params)
    case "alveolar":            return alveolar(params)
    case "honeycomb-cardiac":   return honeycombCardiac(params)
    case "fascicular":          return fascicular(params)
    default:
      // Fallback
      return parallelAligned(params)
  }
}

// ─── Conversão para G-code ──────────────────────────────────────────────

export interface ToGCodeOptions {
  z: number                  // altura Z desta camada (mm)
  feedRate: number           // mm/min (deposição)
  travelRate: number         // mm/min (travel sem extrusão)
  extrusionFactor: number    // mm de filamento por mm de movimento
  retractMm?: number         // retração entre polylines
  retractSpeed?: number      // mm/min de retração
  startE?: number            // posição inicial do extrusor
  comment?: string
}

export interface GCodeResult {
  lines: string[]
  endE: number
  totalDistance: number
}

/**
 * Converte um conjunto de polylines em comandos G-code
 */
export function polylinesToGCode(polylines: Polyline[], opts: ToGCodeOptions): GCodeResult {
  const lines: string[] = []
  let E = opts.startE ?? 0
  let totalDist = 0
  const retract = opts.retractMm ?? 0.5
  const retractSpeed = opts.retractSpeed ?? 2400
  const eFactor = opts.extrusionFactor

  if (opts.comment) lines.push(`; ── ${opts.comment} ──`)

  for (let pi = 0; pi < polylines.length; pi++) {
    const pl = polylines[pi]
    if (pl.length < 2) continue

    // Travel ao início da polyline
    if (pi > 0 && retract > 0) {
      E -= retract
      lines.push(`G1 E${E.toFixed(4)} F${retractSpeed} ; retract`)
    }
    lines.push(`G0 X${pl[0][0].toFixed(3)} Y${pl[0][1].toFixed(3)} Z${opts.z.toFixed(3)} F${opts.travelRate}`)

    if (pi > 0 && retract > 0) {
      E += retract
      lines.push(`G1 E${E.toFixed(4)} F${retractSpeed} ; unretract`)
    }

    // Desenha a polyline
    for (let i = 1; i < pl.length; i++) {
      const dx = pl[i][0] - pl[i - 1][0]
      const dy = pl[i][1] - pl[i - 1][1]
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 0.001) continue
      totalDist += d
      E += d * eFactor
      lines.push(`G1 X${pl[i][0].toFixed(3)} Y${pl[i][1].toFixed(3)} E${E.toFixed(4)} F${opts.feedRate}`)
    }
  }

  return { lines, endE: E, totalDistance: totalDist }
}
