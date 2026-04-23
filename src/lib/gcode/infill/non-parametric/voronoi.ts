/**
 * BIA v4.2 — Voronoi Infill (non-parametric, biomimetic)
 *
 * Voronoi diagrams produzem padrões irregulares biomimeticamente relevantes:
 *   - trabéculas ósseas reais (osso esponjoso)
 *   - scaffolds com poros interconectados
 *   - cartilagem com matriz anisotrópica
 *
 * Algoritmo:
 *   1. gerar N pontos sementes dentro do bbox (Poisson-disk ou jittered grid)
 *   2. Lloyd relaxation (k iterações) — uniformiza densidade
 *   3. construir células Voronoi via Fortune's algorithm simplificado
 *      OU usar definição direta por bisectores (mais simples, O(n²) mas OK até n=200)
 *   4. gerar segmentos de parede (edges) e clip contra bbox
 *
 * Para bioimpressão, as edges da tesselação Voronoi se tornam as toolpaths.
 *
 * Referência: Wang et al. (2018) Acta Biomaterialia — Voronoi-based scaffolds.
 */

import type { Point2D, Segment2D, BBox2D, PorosityConfig } from "../../core/types"

// ═══════════════════════════════════════════════════════════════
// PRNG (reprodutibilidade)
// ═══════════════════════════════════════════════════════════════
function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// ═══════════════════════════════════════════════════════════════
// GERAÇÃO DE SEMENTES (Poisson-disk sampling simplificado)
// ═══════════════════════════════════════════════════════════════
function generateSeeds(
  bbox: BBox2D,
  minDist: number,
  maxAttempts: number,
  rng: () => number,
): Point2D[] {
  const pts: Point2D[] = []
  const w = bbox.maxX - bbox.minX
  const h = bbox.maxY - bbox.minY
  const targetCount = Math.floor((w * h) / (minDist * minDist * 0.8))

  for (let attempt = 0; attempt < targetCount * 4 && pts.length < targetCount; attempt++) {
    const x = bbox.minX + rng() * w
    const y = bbox.minY + rng() * h
    let ok = true
    for (const p of pts) {
      const dx = p.x - x, dy = p.y - y
      if (dx * dx + dy * dy < minDist * minDist) { ok = false; break }
    }
    if (ok) pts.push({ x, y })
  }
  void maxAttempts // reservado
  return pts
}

// ═══════════════════════════════════════════════════════════════
// LLOYD RELAXATION
// Uniformiza a distribuição movendo cada seed para o centroide da sua célula.
// ═══════════════════════════════════════════════════════════════
function closestSeedIdx(p: Point2D, seeds: Point2D[]): number {
  let best = 0, bestD = Infinity
  for (let i = 0; i < seeds.length; i++) {
    const dx = seeds[i].x - p.x, dy = seeds[i].y - p.y
    const d = dx * dx + dy * dy
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

export function lloydRelax(seeds: Point2D[], bbox: BBox2D, iterations: number): Point2D[] {
  let current = [...seeds]
  const gridRes = 50
  const sx = (bbox.maxX - bbox.minX) / gridRes
  const sy = (bbox.maxY - bbox.minY) / gridRes

  for (let iter = 0; iter < iterations; iter++) {
    const sums = current.map(() => ({ x: 0, y: 0, count: 0 }))
    for (let i = 0; i < gridRes; i++) {
      for (let j = 0; j < gridRes; j++) {
        const p = { x: bbox.minX + (i + 0.5) * sx, y: bbox.minY + (j + 0.5) * sy }
        const idx = closestSeedIdx(p, current)
        sums[idx].x += p.x
        sums[idx].y += p.y
        sums[idx].count++
      }
    }
    current = current.map((s, i) =>
      sums[i].count > 0
        ? { x: sums[i].x / sums[i].count, y: sums[i].y / sums[i].count }
        : s,
    )
  }
  return current
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUÇÃO DAS ARESTAS VORONOI
// Abordagem: para cada par (i, j), a aresta entre as células é
// o segmento da mediatriz perpendicular limitado pelas outras células.
// Implementação O(n²·m) via clipping por bisectores.
// ═══════════════════════════════════════════════════════════════

/**
 * Cria o polígono da célula Voronoi para a semente i,
 * começando do bbox e clippando por cada bisector (i, k).
 */
function voronoiCellPolygon(
  seeds: Point2D[],
  i: number,
  bbox: BBox2D,
): Point2D[] {
  // Início: retângulo do bbox
  let poly: Point2D[] = [
    { x: bbox.minX, y: bbox.minY },
    { x: bbox.maxX, y: bbox.minY },
    { x: bbox.maxX, y: bbox.maxY },
    { x: bbox.minX, y: bbox.maxY },
  ]

  for (let k = 0; k < seeds.length; k++) {
    if (k === i) continue
    poly = clipPolygonByBisector(poly, seeds[i], seeds[k])
    if (poly.length === 0) return []
  }
  return poly
}

/**
 * Sutherland-Hodgman clipping pelo semi-plano "mais próximo de pi que de pk".
 * Equivalente a clipar pelo bisector da mediatriz.
 */
function clipPolygonByBisector(poly: Point2D[], pi: Point2D, pk: Point2D): Point2D[] {
  if (poly.length === 0) return poly
  const out: Point2D[] = []
  const mid = { x: (pi.x + pk.x) / 2, y: (pi.y + pk.y) / 2 }
  const nx = pk.x - pi.x
  const ny = pk.y - pi.y

  // lado (·): (p - mid) · n ≤ 0 significa p mais próximo de pi
  const side = (p: Point2D) => (p.x - mid.x) * nx + (p.y - mid.y) * ny

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const sa = side(a)
    const sb = side(b)
    if (sa <= 0) out.push(a)
    if ((sa <= 0) !== (sb <= 0)) {
      const t = sa / (sa - sb)
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) })
    }
  }
  return out
}

// ═══════════════════════════════════════════════════════════════
// API PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export interface VoronoiResult {
  segments: Segment2D[]
  seeds: Point2D[]
  cellCount: number
  avgCellArea_mm2: number
}

/**
 * Gera infill Voronoi para uma camada 2D.
 * config.poreSize_um controla a densidade (poros maiores → menos células).
 * config.density (0–1) controla a irregularidade e escala.
 */
export function generateVoronoiInfill(
  bbox: BBox2D,
  config: PorosityConfig,
  lloydIterations = 3,
): VoronoiResult {
  const rng = seededRandom(config.seed ?? 42)
  // poreSize_um → minDist (mm)
  const minDist = Math.max(0.5, config.poreSize_um / 1000)
  const seeds0 = generateSeeds(bbox, minDist, 3000, rng)
  const seeds = lloydIterations > 0 ? lloydRelax(seeds0, bbox, lloydIterations) : seeds0

  const segments: Segment2D[] = []
  const edgeSet = new Set<string>()

  for (let i = 0; i < seeds.length; i++) {
    const poly = voronoiCellPolygon(seeds, i, bbox)
    if (poly.length < 3) continue
    for (let v = 0; v < poly.length; v++) {
      const a = poly[v]
      const b = poly[(v + 1) % poly.length]
      // chave canônica
      const key = [
        Math.round(a.x * 100) / 100,
        Math.round(a.y * 100) / 100,
        Math.round(b.x * 100) / 100,
        Math.round(b.y * 100) / 100,
      ].sort().join("|")
      if (edgeSet.has(key)) continue
      edgeSet.add(key)
      segments.push({ a, b })
    }
  }

  const area = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
  return {
    segments,
    seeds,
    cellCount: seeds.length,
    avgCellArea_mm2: seeds.length > 0 ? area / seeds.length : 0,
  }
}
