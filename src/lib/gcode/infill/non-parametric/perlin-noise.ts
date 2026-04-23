/**
 * BIA v4.2 — Perlin Noise Infill (morfologia orgânica)
 *
 * Perlin noise 3D gera padrões contínuos suaves, ideais para:
 *   - Tecidos com morfologia orgânica (fígado, baço, parênquima)
 *   - Gradientes de densidade biológicos (zonação hepática)
 *   - Estruturas fibrosas irregulares (cicatriz, tendão)
 *
 * Algoritmo:
 *   1. Implementação clássica Perlin (Ken Perlin, 1985/2002)
 *   2. fbm (fractional Brownian motion) com múltiplas oitavas
 *   3. Marching squares por camada para extrair isocurvas do campo
 *
 * Cada isocurva de Perlin se torna uma toolpath. Ajustar threshold
 * controla a porosidade: threshold alto → poucas linhas (+poroso);
 * threshold baixo → muitas linhas (denso).
 *
 * Referências:
 *   - Perlin K. (2002) ACM SIGGRAPH "Improving Noise"
 *   - Suresh V. et al. (2020) Mater. Sci. Eng. C 116, 111187 —
 *     "Noise-based stochastic scaffolds for heterogeneous tissue engineering"
 */

import type { BBox2D, Segment2D, PorosityConfig } from "../../core/types"

// ═══════════════════════════════════════════════════════════════
// PERLIN NOISE 3D (Ken Perlin "Improving Noise" 2002)
// ═══════════════════════════════════════════════════════════════

// Permutation table padrão Perlin (256 valores, duplicados = 512)
const PERM_BASE = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
]

export class PerlinNoise {
  private perm: number[]
  constructor(seed = 42) {
    // Embaralha o perm com base no seed (Fisher-Yates)
    const p = [...PERM_BASE]
    let s = seed >>> 0 || 1
    for (let i = p.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0
      const j = s % (i + 1)
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    this.perm = [...p, ...p]
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }
  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  /** Perlin noise 3D — retorna valor em [-1, 1]. */
  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z)
    const u = this.fade(x), v = this.fade(y), w = this.fade(z)
    const A  = this.perm[X] + Y
    const AA = this.perm[A] + Z, AB = this.perm[A + 1] + Z
    const B  = this.perm[X + 1] + Y
    const BA = this.perm[B] + Z, BB = this.perm[B + 1] + Z
    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.perm[AA], x, y, z),
                  this.grad(this.perm[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.perm[AB], x, y - 1, z),
                  this.grad(this.perm[BB], x - 1, y - 1, z), u),
        v),
      this.lerp(
        this.lerp(this.grad(this.perm[AA + 1], x, y, z - 1),
                  this.grad(this.perm[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.perm[AB + 1], x, y - 1, z - 1),
                  this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1), u),
        v),
      w)
  }

  /**
   * Fractional Brownian Motion — soma de oitavas de Perlin.
   * Mais oitavas = mais detalhe fractal (tipo superfície óssea real).
   */
  fbm(x: number, y: number, z: number, octaves = 4, persistence = 0.5, lacunarity = 2.0): number {
    let amplitude = 1
    let frequency = 1
    let total = 0
    let maxValue = 0
    for (let o = 0; o < octaves; o++) {
      total += this.noise(x * frequency, y * frequency, z * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }
    return total / maxValue
  }
}

// ═══════════════════════════════════════════════════════════════
// MARCHING SQUARES — extrai isocurvas de um campo 2D escalar
// ═══════════════════════════════════════════════════════════════

/**
 * Lookup table do marching squares (16 casos).
 * Cada caso lista pares de arestas (0=bottom, 1=right, 2=top, 3=left)
 * que devem ser conectadas.
 */
const MS_EDGES: number[][][] = [
  [],                      // 0000
  [[3, 0]],                // 0001
  [[0, 1]],                // 0010
  [[3, 1]],                // 0011
  [[1, 2]],                // 0100
  [[3, 0], [1, 2]],        // 0101 (ambíguo — resolveremos separando)
  [[0, 2]],                // 0110
  [[3, 2]],                // 0111
  [[2, 3]],                // 1000
  [[2, 0]],                // 1001
  [[0, 1], [2, 3]],        // 1010 (ambíguo)
  [[2, 1]],                // 1011
  [[1, 3]],                // 1100
  [[1, 0]],                // 1101
  [[0, 3]],                // 1110
  [],                      // 1111
]

/**
 * Interpola a posição da isocurva na aresta (a→b) onde valA e valB atravessam threshold.
 */
function interp(
  a: { x: number; y: number }, valA: number,
  b: { x: number; y: number }, valB: number,
  threshold: number,
): { x: number; y: number } {
  if (Math.abs(valB - valA) < 1e-9) return a
  const t = (threshold - valA) / (valB - valA)
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}

/**
 * Extrai isocurvas de um campo escalar 2D ao nível threshold.
 */
function marchingSquares(
  field: Float32Array,
  cols: number,
  rows: number,
  bbox: BBox2D,
  threshold: number,
): Segment2D[] {
  const segs: Segment2D[] = []
  const dx = (bbox.maxX - bbox.minX) / (cols - 1)
  const dy = (bbox.maxY - bbox.minY) / (rows - 1)

  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      // cantos: bottom-left, bottom-right, top-right, top-left
      const bl = { x: bbox.minX + i * dx, y: bbox.minY + j * dy }
      const br = { x: bbox.minX + (i + 1) * dx, y: bbox.minY + j * dy }
      const tr = { x: bbox.minX + (i + 1) * dx, y: bbox.minY + (j + 1) * dy }
      const tl = { x: bbox.minX + i * dx, y: bbox.minY + (j + 1) * dy }
      const vbl = field[j * cols + i]
      const vbr = field[j * cols + i + 1]
      const vtr = field[(j + 1) * cols + i + 1]
      const vtl = field[(j + 1) * cols + i]

      let idx = 0
      if (vbl > threshold) idx |= 1
      if (vbr > threshold) idx |= 2
      if (vtr > threshold) idx |= 4
      if (vtl > threshold) idx |= 8

      const edges = MS_EDGES[idx]
      for (const [e1, e2] of edges) {
        const p1 = edgePoint(e1, bl, br, tr, tl, vbl, vbr, vtr, vtl, threshold)
        const p2 = edgePoint(e2, bl, br, tr, tl, vbl, vbr, vtr, vtl, threshold)
        segs.push({ a: p1, b: p2 })
      }
    }
  }
  return segs
}

function edgePoint(
  edge: number,
  bl: { x: number; y: number }, br: { x: number; y: number },
  tr: { x: number; y: number }, tl: { x: number; y: number },
  vbl: number, vbr: number, vtr: number, vtl: number,
  threshold: number,
): { x: number; y: number } {
  switch (edge) {
    case 0: return interp(bl, vbl, br, vbr, threshold)  // bottom
    case 1: return interp(br, vbr, tr, vtr, threshold)  // right
    case 2: return interp(tl, vtl, tr, vtr, threshold)  // top
    case 3: return interp(bl, vbl, tl, vtl, threshold)  // left
    default: return bl
  }
}

// ═══════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export interface PerlinInfillResult {
  segments: Segment2D[]
  gridSize: number
  actualPorosity_pct: number
  octaves: number
  scale: number
}

export interface PerlinConfig extends PorosityConfig {
  octaves?: number         // 1-6 (mais = mais detalhe)
  scale?: number           // escala espacial (mm). Menor = mais fino
  persistence?: number     // 0-1 (amplitude decay por oitava)
  lacunarity?: number      // frequência por oitava (default 2)
  threshold?: number       // nível da isocurva [-1, 1]; se undefined, calculado a partir de density
  resolution?: number      // amostras por lado (default 80)
}

/**
 * Gera infill Perlin-noise para uma camada Z.
 *
 * Parâmetros biológicos recomendados:
 *   - Fígado (parênquima): scale=3mm, octaves=3, threshold=0.1 → lóbulos hexagonais irregulares
 *   - Baço: scale=2mm, octaves=4, threshold=0.0 → mistura vermelha/branca
 *   - Cicatriz/tendão: scale=1.5mm, octaves=5, persistence=0.7 → fibras direcionais
 */
export function generatePerlinInfill(
  bbox: BBox2D,
  z_mm: number,
  config: PerlinConfig,
): PerlinInfillResult {
  const perlin = new PerlinNoise(config.seed ?? 42)
  const octaves = config.octaves ?? 4
  const scale_mm = config.scale ?? (config.poreSize_um / 1000) * 3
  const persistence = config.persistence ?? 0.5
  const lacunarity = config.lacunarity ?? 2.0
  const resolution = config.resolution ?? 80

  // threshold a partir de density (0 = tudo, 1 = nada)
  // density 0.3 (30% de material) → threshold ~ 0.3
  const threshold = config.threshold ?? (config.density - 0.5) * 0.6

  // Amostra campo Perlin na grade
  const cols = resolution
  const rows = Math.round(resolution * (bbox.maxY - bbox.minY) / (bbox.maxX - bbox.minX))
  const field = new Float32Array(cols * rows)
  const dx = (bbox.maxX - bbox.minX) / (cols - 1)
  const dy = (bbox.maxY - bbox.minY) / (rows - 1)

  let above = 0
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (bbox.minX + i * dx) / scale_mm
      const y = (bbox.minY + j * dy) / scale_mm
      const z = z_mm / scale_mm
      const v = perlin.fbm(x, y, z, octaves, persistence, lacunarity)
      field[j * cols + i] = v
      if (v > threshold) above++
    }
  }

  const segments = marchingSquares(field, cols, rows, bbox, threshold)
  const actualPorosity = (1 - above / (cols * rows)) * 100

  return {
    segments,
    gridSize: cols * rows,
    actualPorosity_pct: actualPorosity,
    octaves,
    scale: scale_mm,
  }
}

/**
 * Configuração pré-definida para tecido hepático.
 * Gera padrão lobular irregular típico do parênquima hepático.
 */
export function perlinForLiver(poreSize_um: number, seed = 42): PerlinConfig {
  return {
    density: 0.35,
    poreSize_um,
    seed,
    octaves: 3,
    scale: 2.5,
    persistence: 0.55,
    lacunarity: 2.1,
    threshold: 0.05,
    resolution: 90,
  }
}

/**
 * Configuração pré-definida para osso trabecular (complementar ao Voronoi 3D).
 */
export function perlinForBone(poreSize_um: number, seed = 42): PerlinConfig {
  return {
    density: 0.3,
    poreSize_um,
    seed,
    octaves: 5,
    scale: 1.2,
    persistence: 0.6,
    lacunarity: 2.0,
    threshold: 0.15,
    resolution: 100,
  }
}

/**
 * Configuração pré-definida para tendão/ligamento (fibras direcionais).
 */
export function perlinForTendon(poreSize_um: number, seed = 42): PerlinConfig {
  return {
    density: 0.25,
    poreSize_um,
    seed,
    octaves: 6,
    scale: 1.5,
    persistence: 0.7,
    lacunarity: 2.3,
    threshold: 0.2,
    resolution: 120,
  }
}
