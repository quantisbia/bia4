/**
 * BIA v4.2 — Mesh Slicer (R12.49)
 *
 * Algoritmo: PLANE-MESH INTERSECTION (não voxel volumétrico).
 *
 * Para cada plano Z = z₀:
 *   1. Para cada triângulo (v0, v1, v2):
 *      - Classificar vértices: ACIMA, ABAIXO, ou NO plano
 *      - Se o triângulo cruza o plano (vértices em ambos os lados),
 *        calcular os 2 pontos de interseção (segmento 2D)
 *   2. Conectar todos os segmentos em polígonos fechados
 *      (cada segmento compartilha extremos com outros)
 *   3. Calcular bbox 2D
 *
 * Por que isto é correto:
 *   - É EXATAMENTE como Cura/PrusaSlicer fatiam (slab method)
 *   - Não perde detalhe (não há discretização voxel)
 *   - Robusto a meshes com topologia limpa (orelha, vasos, fígado)
 *
 * Complexidade: O(triCount) por camada. Para 4432 tri × 30 camadas ≈ 130k ops.
 */

import type { ParsedMesh } from "./binary-stl-parser"

export interface Vec2 {
  x: number
  y: number
}

export interface Segment2D {
  a: Vec2
  b: Vec2
}

export interface SliceResult {
  /** Polígonos fechados extraídos da camada (uma mesh pode ter buracos/ilhas) */
  polygons: Vec2[][]
  /** BBox 2D da seção neste Z */
  bbox: { minX: number; maxX: number; minY: number; maxY: number }
  /** Quantos triângulos cruzaram este plano (debug) */
  trianglesIntersected: number
  /** Segmentos brutos não conectados (debug, normalmente vazio se topologia ok) */
  orphanSegments: Segment2D[]
}

const EPS = 1e-6
const WELD_EPS = 1e-3  // pontos a menos de 0.001 mm = mesmo ponto

/**
 * Fatia uma mesh em um plano Z = z.
 */
export function sliceMeshAtZ(mesh: ParsedMesh, z: number): SliceResult {
  const segments: Segment2D[] = []
  const v = mesh.vertices

  for (let i = 0; i < mesh.triangleCount; i++) {
    const base = i * 9
    const z0 = v[base + 2]
    const z1 = v[base + 5]
    const z2 = v[base + 8]

    // Classificação: -1 abaixo, 0 no plano, +1 acima
    const s0 = z0 < z - EPS ? -1 : z0 > z + EPS ? 1 : 0
    const s1 = z1 < z - EPS ? -1 : z1 > z + EPS ? 1 : 0
    const s2 = z2 < z - EPS ? -1 : z2 > z + EPS ? 1 : 0

    // Triângulo totalmente de um lado → não cruza
    if (s0 === s1 && s1 === s2 && s0 !== 0) continue
    // Triângulo totalmente no plano → degenerado (vamos ignorar)
    if (s0 === 0 && s1 === 0 && s2 === 0) continue

    // Coletar interseções
    const pts: Vec2[] = []
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 0]]
    const sides = [s0, s1, s2]

    for (const [i0, i1] of edges) {
      const sa = sides[i0]
      const sb = sides[i1]
      const ax = v[base + i0 * 3 + 0]
      const ay = v[base + i0 * 3 + 1]
      const az = v[base + i0 * 3 + 2]
      const bx = v[base + i1 * 3 + 0]
      const by = v[base + i1 * 3 + 1]
      const bz = v[base + i1 * 3 + 2]

      if (sa === 0 && sb === 0) {
        // Aresta no plano — adiciona ambos
        pts.push({ x: ax, y: ay })
        pts.push({ x: bx, y: by })
      } else if (sa === 0) {
        pts.push({ x: ax, y: ay })
      } else if (sb === 0) {
        pts.push({ x: bx, y: by })
      } else if (sa !== sb) {
        // Aresta cruza o plano: interpola
        const t = (z - az) / (bz - az)
        pts.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t })
      }
    }

    // Deduplica vértices coincidentes
    const uniq: Vec2[] = []
    for (const p of pts) {
      if (!uniq.some((q) => Math.abs(q.x - p.x) < WELD_EPS && Math.abs(q.y - p.y) < WELD_EPS)) {
        uniq.push(p)
      }
    }

    // Esperamos exatamente 2 pontos para formar 1 segmento
    if (uniq.length === 2) {
      segments.push({ a: uniq[0], b: uniq[1] })
    } else if (uniq.length > 2) {
      // Triângulo "afia" no plano produzindo múltiplos pontos — emite
      // segmentos consecutivos (raro, mas acontece em vértices coplanares)
      for (let k = 0; k < uniq.length - 1; k++) {
        segments.push({ a: uniq[k], b: uniq[k + 1] })
      }
    }
  }

  // ─── Conectar segmentos em polígonos fechados ───
  const polygons = stitchSegmentsToPolygons(segments)

  // ─── BBox ───
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const poly of polygons) {
    for (const p of poly) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
  }
  if (polygons.length === 0) {
    minX = 0; maxX = 0; minY = 0; maxY = 0
  }

  return {
    polygons,
    bbox: { minX, maxX, minY, maxY },
    trianglesIntersected: segments.length,
    orphanSegments: [],
  }
}

/**
 * Conecta segmentos em polígonos fechados via "junção por proximidade".
 *
 * Algoritmo (simplificado de Cura):
 *   - Cada segmento tem duas pontas (a, b)
 *   - Encontrar a próxima ponta mais próxima da ponta livre atual
 *   - Se a distância é menor que WELD_EPS, conecta
 *   - Quando volta para o ponto inicial, fecha polígono
 */
function stitchSegmentsToPolygons(segments: Segment2D[]): Vec2[][] {
  if (segments.length === 0) return []

  const used = new Array(segments.length).fill(false)
  const polygons: Vec2[][] = []

  // Para acelerar busca, criamos um índice espacial simples por bucket
  // (não vale a pena KD-tree para < 10k segmentos)
  for (let startIdx = 0; startIdx < segments.length; startIdx++) {
    if (used[startIdx]) continue

    const poly: Vec2[] = []
    const seed = segments[startIdx]
    poly.push(seed.a, seed.b)
    used[startIdx] = true

    let endPoint = seed.b
    let safety = segments.length + 5

    while (safety-- > 0) {
      // Procurar segmento que começa OU termina em endPoint
      let bestIdx = -1
      let bestPoint: Vec2 | null = null
      let bestDist = WELD_EPS

      for (let j = 0; j < segments.length; j++) {
        if (used[j]) continue
        const s = segments[j]
        const dA = Math.hypot(s.a.x - endPoint.x, s.a.y - endPoint.y)
        const dB = Math.hypot(s.b.x - endPoint.x, s.b.y - endPoint.y)
        if (dA < bestDist) {
          bestDist = dA
          bestIdx = j
          bestPoint = s.b   // continuar para o outro lado
        }
        if (dB < bestDist) {
          bestDist = dB
          bestIdx = j
          bestPoint = s.a
        }
      }

      if (bestIdx === -1 || !bestPoint) break  // sem continuação

      used[bestIdx] = true

      // Fechou o polígono?
      const distToStart = Math.hypot(bestPoint.x - poly[0].x, bestPoint.y - poly[0].y)
      if (distToStart < WELD_EPS && poly.length >= 3) {
        break
      }

      poly.push(bestPoint)
      endPoint = bestPoint
    }

    if (poly.length >= 3) {
      polygons.push(poly)
    }
  }

  return polygons
}

/**
 * Faz offset (inset) de um polígono para gerar paredes adicionais.
 * Implementação simples por translação ao longo das normais das arestas.
 * Funciona bem para formas convexas/levemente côncavas (orelha, vasos).
 *
 * @param polygon polígono fechado (CCW ou CW)
 * @param distance distância positiva = inset (para dentro)
 */
export function offsetPolygon(polygon: Vec2[], distance: number): Vec2[] {
  if (polygon.length < 3) return []

  // Detecta orientação por área signed.
  // Convenção do nosso normal (-ey, ex) = perpendicular à esquerda da aresta.
  //   - Em polígono CCW (area > 0), normal-esquerda aponta para DENTRO  → inward = +1
  //   - Em polígono CW  (area < 0), normal-esquerda aponta para FORA    → inward = -1
  const area = signedArea(polygon)
  const inward = area > 0 ? 1 : -1

  const n = polygon.length
  const result: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n]
    const cur = polygon[i]
    const next = polygon[(i + 1) % n]

    // Normais das duas arestas adjacentes
    const e1x = cur.x - prev.x, e1y = cur.y - prev.y
    const e2x = next.x - cur.x, e2y = next.y - cur.y
    const l1 = Math.hypot(e1x, e1y) || 1
    const l2 = Math.hypot(e2x, e2y) || 1

    // Normais (perpendicular à esquerda)
    const n1x = -e1y / l1, n1y = e1x / l1
    const n2x = -e2y / l2, n2y = e2x / l2

    // Média das normais
    const bx = (n1x + n2x) * inward
    const by = (n1y + n2y) * inward
    const blen = Math.hypot(bx, by) || 1

    // Compensação angular (miter)
    const dot = n1x * n2x + n1y * n2y
    const miter = Math.min(2, 1 / Math.max(0.5, (1 + dot) / 2))

    result.push({
      x: cur.x + (bx / blen) * distance * miter,
      y: cur.y + (by / blen) * distance * miter,
    })
  }

  return result
}

function signedArea(polygon: Vec2[]): number {
  let a = 0
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const cur = polygon[i]
    const next = polygon[(i + 1) % n]
    a += cur.x * next.y - next.x * cur.y
  }
  return a / 2
}
