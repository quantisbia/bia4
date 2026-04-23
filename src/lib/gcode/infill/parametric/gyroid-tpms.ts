/**
 * BIA v4.2 — Gyroid TPMS Infill (Triply Periodic Minimal Surface)
 *
 * Gyroid implícito: sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x) = c
 *   c = 0      → superfície balanceada (50% porosidade)
 *   c > 0      → sólido aumenta (menor porosidade)
 *   c < 0      → vazio aumenta (maior porosidade)
 *
 * Para bioimpressão (extrusão FDM/FRESH), geramos a curva de
 * intersecção do gyroid com o plano Z da camada atual.
 *
 * Aplicação biológica:
 * - Osso trabecular: c ≈ 0, T = 4–8 mm, porosidade 50–70%
 * - Scaffold vascularizado: gradient de c na direção Z
 * - Porosidade 300–600 µm ótima para osteogênese
 *
 * Referência: Al-Ketan & Abu Al-Rub (2019) Adv. Eng. Mater. 21(10)
 */

import type { Segment2D, Polygon2D, BBox2D, PorosityConfig } from "../../core/types"

export interface GyroidParams {
  period_mm: number          // comprimento de onda (L) — define tamanho do poro
  porosity: number           // 0–1 (fração de vazio) — mapeia para isoValue
  bbox: BBox2D
  z_mm: number               // altura da camada atual
  resolution: number         // pontos por período em cada eixo (20–40)
}

/**
 * Converte porosidade em isovalue do gyroid.
 * Relação empírica: porosity ≈ 0.5 - c/2 para |c|<1
 */
function porosityToIsoValue(porosity: number): number {
  const p = Math.max(0.05, Math.min(0.95, porosity))
  // mapear: porosity=0.5 → c=0; porosity=0.2 → c=0.6; porosity=0.8 → c=-0.6
  return (0.5 - p) * 1.2
}

/**
 * Campo escalar do gyroid em (x, y, z).
 * Normalizado por period = 2π*scale.
 */
function gyroidField(x: number, y: number, z: number, period: number): number {
  const k = (2 * Math.PI) / period
  return (
    Math.sin(k * x) * Math.cos(k * y) +
    Math.sin(k * y) * Math.cos(k * z) +
    Math.sin(k * z) * Math.cos(k * x)
  )
}

// ═══════════════════════════════════════════════════════════════
// MARCHING SQUARES (para extrair isolinha no plano Z fixo)
// ═══════════════════════════════════════════════════════════════

/**
 * Interpola posição da isolinha entre dois pontos (a, b) com valores (va, vb).
 */
function lerp(a: number, b: number, va: number, vb: number, iso: number): number {
  const denom = vb - va
  if (Math.abs(denom) < 1e-10) return a
  return a + ((iso - va) / denom) * (b - a)
}

/**
 * Marching Squares — gera segmentos de isolinha no grid 2D.
 */
export function marchingSquaresGyroid(params: GyroidParams): Segment2D[] {
  const { period_mm, porosity, bbox, z_mm, resolution } = params
  const iso = porosityToIsoValue(porosity)
  const segments: Segment2D[] = []

  // Step = period / resolution
  const step = period_mm / Math.max(8, Math.min(resolution, 40))
  const nx = Math.ceil((bbox.maxX - bbox.minX) / step)
  const ny = Math.ceil((bbox.maxY - bbox.minY) / step)

  // Pre-compute scalar field
  const field: number[][] = []
  for (let j = 0; j <= ny; j++) {
    const row: number[] = []
    for (let i = 0; i <= nx; i++) {
      const x = bbox.minX + i * step
      const y = bbox.minY + j * step
      row.push(gyroidField(x, y, z_mm, period_mm))
    }
    field.push(row)
  }

  // Marching squares per cell
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x0 = bbox.minX + i * step
      const y0 = bbox.minY + j * step
      const x1 = x0 + step
      const y1 = y0 + step

      const v00 = field[j][i]       - iso
      const v10 = field[j][i+1]     - iso
      const v11 = field[j+1][i+1]   - iso
      const v01 = field[j+1][i]     - iso

      let idx = 0
      if (v00 > 0) idx |= 1
      if (v10 > 0) idx |= 2
      if (v11 > 0) idx |= 4
      if (v01 > 0) idx |= 8

      if (idx === 0 || idx === 15) continue

      // Edge intersection points
      const e0 = { x: lerp(x0, x1, v00, v10, 0), y: y0 }  // bottom
      const e1 = { x: x1, y: lerp(y0, y1, v10, v11, 0) }  // right
      const e2 = { x: lerp(x0, x1, v01, v11, 0), y: y1 }  // top
      const e3 = { x: x0, y: lerp(y0, y1, v00, v01, 0) }  // left

      switch (idx) {
        case 1:  case 14: segments.push({ a: e3, b: e0 }); break
        case 2:  case 13: segments.push({ a: e0, b: e1 }); break
        case 3:  case 12: segments.push({ a: e3, b: e1 }); break
        case 4:  case 11: segments.push({ a: e1, b: e2 }); break
        case 5:           segments.push({ a: e3, b: e0 }); segments.push({ a: e1, b: e2 }); break
        case 6:  case 9:  segments.push({ a: e0, b: e2 }); break
        case 7:  case 8:  segments.push({ a: e3, b: e2 }); break
        case 10:          segments.push({ a: e0, b: e1 }); segments.push({ a: e3, b: e2 }); break
      }
    }
  }

  return segments
}

// ═══════════════════════════════════════════════════════════════
// API DE ALTO NÍVEL
// ═══════════════════════════════════════════════════════════════
export function generateGyroidInfill(
  bbox: BBox2D,
  z_mm: number,
  config: PorosityConfig,
  resolution = 30,
): Segment2D[] {
  // pore size (µm) → período (mm)
  // relação: pore_diameter ≈ 0.5 × period
  const period = (config.poreSize_um * 2) / 1000
  return marchingSquaresGyroid({
    period_mm: Math.max(0.5, period),
    porosity: config.density,
    bbox,
    z_mm,
    resolution,
  })
}

// ═══════════════════════════════════════════════════════════════
// CLIPPING CONTRA CONTORNO (polígono externo)
// ═══════════════════════════════════════════════════════════════
/**
 * Ray-casting: verifica se ponto está dentro do polígono.
 */
export function pointInPolygon(p: { x: number; y: number }, poly: Polygon2D): boolean {
  let inside = false
  const n = poly.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Filtra segmentos mantendo apenas os que têm ambos pontos dentro do polígono.
 * (Simplificação — clipping perfeito usaria Sutherland-Hodgman.)
 */
export function clipSegmentsToPolygon(segs: Segment2D[], poly: Polygon2D): Segment2D[] {
  return segs.filter((s) => pointInPolygon(s.a, poly) && pointInPolygon(s.b, poly))
}
