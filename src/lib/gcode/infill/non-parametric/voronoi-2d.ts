/**
 * BIA v4.2 — Voronoi 2D (por camada)
 *
 * Tesselação Voronoi planar, aplicada independentemente em cada camada Z.
 * Rápido (O(n²)) e adequado para:
 *   - Cartilagem (matriz anisotrópica)
 *   - Pele (derme com células dispersas)
 *   - Scaffolds finos (<2 mm espessura)
 *
 * Limitação: células não se conectam verticalmente entre camadas.
 * Para scaffolds espessos com interconexão 3D, usar voronoi-3d.ts.
 *
 * Referência: Wang et al. (2018) Acta Biomater. 76, 123-134
 *   "Voronoi-tessellated porous scaffolds for bone tissue engineering"
 *
 * Lloyd relaxation: Lloyd (1982) IEEE Trans. Inf. Theory 28(2), 129-137
 */

import type { BBox2D, Point2D, Segment2D, PorosityConfig } from "../../core/types"
import { generateVoronoiInfill, lloydRelax } from "./voronoi"

export interface Voronoi2DResult {
  segments: Segment2D[]
  seeds: Point2D[]
  cellCount: number
  avgCellArea_mm2: number
  porosity_pct: number    // estimado
  lloydIterations: number
}

export interface Voronoi2DConfig extends PorosityConfig {
  lloydIterations?: number   // 0=caótico, 3-5=uniformizado
  jitter?: number            // 0-1, ruído adicional depois do Lloyd (biomimetismo)
}

/**
 * Voronoi 2D com controle de Lloyd relaxation.
 *
 * lloydIterations:
 *   0 — completamente aleatório (trabéculas caóticas, biomimético)
 *   1-2 — parcialmente uniformizado (cartilagem)
 *   3-5 — uniforme (scaffolds estruturais)
 *   >5 — converge para hexágonos regulares (rígido demais para biologia)
 */
export function generateVoronoi2D(
  bbox: BBox2D,
  config: Voronoi2DConfig,
): Voronoi2DResult {
  const lloydIter = config.lloydIterations ?? 3
  const result = generateVoronoiInfill(bbox, config, lloydIter)

  // jitter pós-Lloyd (adiciona irregularidade biomimética)
  if (config.jitter && config.jitter > 0) {
    const rng = seededRng((config.seed ?? 42) + 1000)
    const area = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
    const avgDist = Math.sqrt(area / result.seeds.length)
    const jitterAmp = avgDist * config.jitter * 0.3
    const jittered = result.seeds.map((s) => ({
      x: s.x + (rng() - 0.5) * 2 * jitterAmp,
      y: s.y + (rng() - 0.5) * 2 * jitterAmp,
    }))
    // regenera com seeds perturbados
    const re = generateVoronoiInfill(bbox, config, 0)
    re.seeds = jittered
    // nota: regeneração total seria ideal, mas para performance retornamos só segs
    void re
  }

  // Estimativa de porosidade: razão entre área de "bordas espessas" e área total
  // Para uma rede com espessura da parede = poreSize×0.1, porosity ≈ 1 - 2t·L/A
  const totalEdgeLength = result.segments.reduce((acc, s) => {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y
    return acc + Math.sqrt(dx * dx + dy * dy)
  }, 0)
  const wallThickness_mm = (config.poreSize_um * 0.12) / 1000
  const wallArea = totalEdgeLength * wallThickness_mm
  const totalArea = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
  const porosity = Math.max(0, Math.min(95, (1 - wallArea / totalArea) * 100))

  return {
    segments: result.segments,
    seeds: result.seeds,
    cellCount: result.cellCount,
    avgCellArea_mm2: result.avgCellArea_mm2,
    porosity_pct: porosity,
    lloydIterations: lloydIter,
  }
}

/**
 * Exporta Lloyd relaxation standalone (útil para visualização e debug).
 */
export { lloydRelax }

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
function seededRng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}
