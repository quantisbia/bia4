/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 — Geradores TPMS (Triply Periodic Minimal Surfaces)
 *  ───────────────────────────────────────────────────────────────────────
 *  Gera scaffolds com topologia Gyroid, Schwarz P e Diamond — usados em
 *  literatura para regeneração óssea por terem:
 *    - alta razão superfície/volume (favorece adesão celular)
 *    - canais interconectados (vascularização e migração celular)
 *    - propriedades mecânicas previsíveis (módulo bulk × porosidade)
 *
 *  Implementação: Marching Cubes na função implícita TPMS
 *  f_gyroid(x,y,z)  = sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)
 *  f_schwarz(x,y,z) = cos(x) + cos(y) + cos(z)
 *  f_diamond(x,y,z) = sin(x)sin(y)sin(z) + sin(x)cos(y)cos(z) +
 *                     cos(x)sin(y)cos(z) + cos(x)cos(y)sin(z)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { Triangle, Vec3 } from "./generator"

export type TPMSType = "gyroid" | "schwarzP" | "diamond"

export interface TPMSParams {
  /** Tamanho do bloco em mm — cubo */
  size: number
  /** Período espacial em mm (uma "célula") — típico 4-8 mm para osso */
  period: number
  /** Espessura da parede do TPMS (-1 a 1, normalizado). 0=isosurface, 0.3≈70% porosidade */
  threshold: number
  /** Resolução da grade (cubos por aresta). 32-48 produz boa qualidade */
  resolution: number
}

// ─────────────────────────────────────────────────────────────────────────
// FUNÇÕES IMPLÍCITAS
// ─────────────────────────────────────────────────────────────────────────

function gyroid(x: number, y: number, z: number): number {
  return Math.sin(x)*Math.cos(y) + Math.sin(y)*Math.cos(z) + Math.sin(z)*Math.cos(x)
}

function schwarzP(x: number, y: number, z: number): number {
  return Math.cos(x) + Math.cos(y) + Math.cos(z)
}

function diamond(x: number, y: number, z: number): number {
  return Math.sin(x)*Math.sin(y)*Math.sin(z)
       + Math.sin(x)*Math.cos(y)*Math.cos(z)
       + Math.cos(x)*Math.sin(y)*Math.cos(z)
       + Math.cos(x)*Math.cos(y)*Math.sin(z)
}

function tpmsFunction(type: TPMSType): (x: number, y: number, z: number) => number {
  switch (type) {
    case "schwarzP": return schwarzP
    case "diamond": return diamond
    case "gyroid":
    default: return gyroid
  }
}

// ─────────────────────────────────────────────────────────────────────────
// MARCHING CUBES — TABELAS COMPACTAS (somente as 256 entradas necessárias)
// ─────────────────────────────────────────────────────────────────────────

// Vertices dos 12 edges em uma célula unit cube (coords locais 0..1)
const EDGE_VERTICES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,0],   // bottom
  [4,5],[5,6],[6,7],[7,4],   // top
  [0,4],[1,5],[2,6],[3,7],   // verticais
]

// Posições dos 8 cantos do cubo unit
const CORNER: Vec3[] = [
  [0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1],
]

// Tabela de bits → triplas de edges para triangular (referência: Bourke implementation, simplified subset)
// Para evitar 4KB de tabela, usamos algoritmo dual-marching simplificado:
// avaliamos cada cubo em 8 cantos, classificamos como dentro/fora, e
// para cada combinação geramos triângulos por interpolação linear nas 12 arestas.

// Triangulação completa por padrão (256 casos). Usaremos a tabela compacta clássica:
// Cada caso = up to 5 triângulos = 15 índices de aresta, terminado por -1.
const TRI_TABLE: number[][] = [
  [],[0,8,3],[0,1,9],[1,8,3,9,8,1],[1,2,10],[0,8,3,1,2,10],[9,2,10,0,2,9],[2,8,3,2,10,8,10,9,8],
  [3,11,2],[0,11,2,8,11,0],[1,9,0,2,3,11],[1,11,2,1,9,11,9,8,11],[3,10,1,11,10,3],[0,10,1,0,8,10,8,11,10],
  [3,9,0,3,11,9,11,10,9],[9,8,10,10,8,11],[4,7,8],[4,3,0,7,3,4],[0,1,9,8,4,7],[4,1,9,4,7,1,7,3,1],
  [1,2,10,8,4,7],[3,4,7,3,0,4,1,2,10],[9,2,10,9,0,2,8,4,7],[2,10,9,2,9,7,2,7,3,7,9,4],[8,4,7,3,11,2],
  [11,4,7,11,2,4,2,0,4],[9,0,1,8,4,7,2,3,11],[4,7,11,9,4,11,9,11,2,9,2,1],[3,10,1,3,11,10,7,8,4],
  [1,11,10,1,4,11,1,0,4,7,11,4],[4,7,8,9,0,11,9,11,10,11,0,3],[4,7,11,4,11,9,9,11,10],[9,5,4],
  [9,5,4,0,8,3],[0,5,4,1,5,0],[8,5,4,8,3,5,3,1,5],[1,2,10,9,5,4],[3,0,8,1,2,10,4,9,5],
  [5,2,10,5,4,2,4,0,2],[2,10,5,3,2,5,3,5,4,3,4,8],[9,5,4,2,3,11],[0,11,2,0,8,11,4,9,5],
  [0,5,4,0,1,5,2,3,11],[2,1,5,2,5,8,2,8,11,4,8,5],[10,3,11,10,1,3,9,5,4],[4,9,5,0,8,1,8,10,1,8,11,10],
  [5,4,0,5,0,11,5,11,10,11,0,3],[5,4,8,5,8,10,10,8,11],[9,7,8,5,7,9],[9,3,0,9,5,3,5,7,3],
  [0,7,8,0,1,7,1,5,7],[1,5,3,3,5,7],[9,7,8,9,5,7,10,1,2],[10,1,2,9,5,0,5,3,0,5,7,3],
  [8,0,2,8,2,5,8,5,7,10,5,2],[2,10,5,2,5,3,3,5,7],[7,9,5,7,8,9,3,11,2],[9,5,7,9,7,2,9,2,0,2,7,11],
  [2,3,11,0,1,8,1,7,8,1,5,7],[11,2,1,11,1,7,7,1,5],[9,5,8,8,5,7,10,1,3,10,3,11],
  [5,7,0,5,0,9,7,11,0,1,0,10,11,10,0],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0],[11,10,5,7,11,5],
  [10,6,5],[0,8,3,5,10,6],[9,0,1,5,10,6],[1,8,3,1,9,8,5,10,6],[1,6,5,2,6,1],[1,6,5,1,2,6,3,0,8],
  [9,6,5,9,0,6,0,2,6],[5,9,8,5,8,2,5,2,6,3,2,8],[2,3,11,10,6,5],[11,0,8,11,2,0,10,6,5],
  [0,1,9,2,3,11,5,10,6],[5,10,6,1,9,2,9,11,2,9,8,11],[6,3,11,6,5,3,5,1,3],[0,8,11,0,11,5,0,5,1,5,11,6],
  [3,11,6,0,3,6,0,6,5,0,5,9],[6,5,9,6,9,11,11,9,8],[5,10,6,4,7,8],[4,3,0,4,7,3,6,5,10],[1,9,0,5,10,6,8,4,7],
  [10,6,5,1,9,7,1,7,3,7,9,4],[6,1,2,6,5,1,4,7,8],[1,2,5,5,2,6,3,0,4,3,4,7],[8,4,7,9,0,5,0,6,5,0,2,6],
  [7,3,9,7,9,4,3,2,9,5,9,6,2,6,9],[3,11,2,7,8,4,10,6,5],[5,10,6,4,7,2,4,2,0,2,7,11],[0,1,9,4,7,8,2,3,11,5,10,6],
  [9,2,1,9,11,2,9,4,11,7,11,4,5,10,6],[8,4,7,3,11,5,3,5,1,5,11,6],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11],
  [0,5,9,0,6,5,0,3,6,11,6,3,8,4,7],[6,5,9,6,9,11,4,7,9,7,11,9],[10,4,9,6,4,10],[4,10,6,4,9,10,0,8,3],
  [10,0,1,10,6,0,6,4,0],[8,3,1,8,1,6,8,6,4,6,1,10],[1,4,9,1,2,4,2,6,4],[3,0,8,1,2,9,2,4,9,2,6,4],
  [0,2,4,4,2,6],[8,3,2,8,2,4,4,2,6],[10,4,9,10,6,4,11,2,3],[0,8,2,2,8,11,4,9,10,4,10,6],
  [3,11,2,0,1,6,0,6,4,6,1,10],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1],[9,6,4,9,3,6,9,1,3,11,6,3],
  [8,11,1,8,1,0,11,6,1,9,1,4,6,4,1],[3,11,6,3,6,0,0,6,4],[6,4,8,11,6,8],[7,10,6,7,8,10,8,9,10],
  [0,7,3,0,10,7,0,9,10,6,7,10],[10,6,7,1,10,7,1,7,8,1,8,0],[10,6,7,10,7,1,1,7,3],[1,2,6,1,6,8,1,8,9,8,6,7],
  [2,6,9,2,9,1,6,7,9,0,9,3,7,3,9],[7,8,0,7,0,6,6,0,2],[7,3,2,6,7,2],[2,3,11,10,6,8,10,8,9,8,6,7],
  [2,0,7,2,7,11,0,9,7,6,7,10,9,10,7],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11],[11,2,1,11,1,7,10,6,1,6,7,1],
  [8,9,6,8,6,7,9,1,6,11,6,3,1,3,6],[0,9,1,11,6,7],[7,8,0,7,0,6,3,11,0,11,6,0],[7,11,6],[7,6,11],
  [3,0,8,11,7,6],[0,1,9,11,7,6],[8,1,9,8,3,1,11,7,6],[10,1,2,6,11,7],[1,2,10,3,0,8,6,11,7],
  [2,9,0,2,10,9,6,11,7],[6,11,7,2,10,3,10,8,3,10,9,8],[7,2,3,6,2,7],[7,0,8,7,6,0,6,2,0],
  [2,7,6,2,3,7,0,1,9],[1,6,2,1,8,6,1,9,8,8,7,6],[10,7,6,10,1,7,1,3,7],[10,7,6,1,7,10,1,8,7,1,0,8],
  [0,3,7,0,7,10,0,10,9,6,10,7],[7,6,10,7,10,8,8,10,9],[6,8,4,11,8,6],[3,6,11,3,0,6,0,4,6],
  [8,6,11,8,4,6,9,0,1],[9,4,6,9,6,3,9,3,1,11,3,6],[6,8,4,6,11,8,2,10,1],[1,2,10,3,0,11,0,6,11,0,4,6],
  [4,11,8,4,6,11,0,2,9,2,10,9],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3],[8,2,3,8,4,2,4,6,2],[0,4,2,4,6,2],
  [1,9,0,2,3,4,2,4,6,4,3,8],[1,9,4,1,4,2,2,4,6],[8,1,3,8,6,1,8,4,6,6,10,1],[10,1,0,10,0,6,6,0,4],
  [4,6,3,4,3,8,6,10,3,0,3,9,10,9,3],[10,9,4,6,10,4],[4,9,5,7,6,11],[0,8,3,4,9,5,11,7,6],
  [5,0,1,5,4,0,7,6,11],[11,7,6,8,3,4,3,5,4,3,1,5],[9,5,4,10,1,2,7,6,11],[6,11,7,1,2,10,0,8,3,4,9,5],
  [7,6,11,5,4,10,4,2,10,4,0,2],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6],[7,2,3,7,6,2,5,4,9],[9,5,4,0,8,6,0,6,2,6,8,7],
  [3,6,2,3,7,6,1,5,0,5,4,0],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8],[9,5,4,10,1,6,1,7,6,1,3,7],
  [1,6,10,1,7,6,1,0,7,8,7,0,9,5,4],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10],[7,6,10,7,10,8,5,4,10,4,8,10],
  [6,9,5,6,11,9,11,8,9],[3,6,11,0,6,3,0,5,6,0,9,5],[0,11,8,0,5,11,0,1,5,5,6,11],[6,11,3,6,3,5,5,3,1],
  [1,2,10,9,5,11,9,11,8,11,5,6],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5],
  [6,11,3,6,3,5,2,10,3,10,5,3],[5,8,9,5,2,8,5,6,2,3,8,2],[9,5,6,9,6,0,0,6,2],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8],
  [1,5,6,2,1,6],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6],[10,1,0,10,0,6,9,5,0,5,6,0],[0,3,8,5,6,10],[10,5,6],
  [11,5,10,7,5,11],[11,5,10,11,7,5,8,3,0],[5,11,7,5,10,11,1,9,0],[10,7,5,10,11,7,9,8,1,8,3,1],
  [11,1,2,11,7,1,7,5,1],[0,8,3,1,2,7,1,7,5,7,2,11],[9,7,5,9,2,7,9,0,2,2,11,7],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2],
  [2,5,10,2,3,5,3,7,5],[8,2,0,8,5,2,8,7,5,10,2,5],[9,0,1,5,10,3,5,3,7,3,10,2],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2],
  [1,3,5,3,7,5],[0,8,7,0,7,1,1,7,5],[9,0,3,9,3,5,5,3,7],[9,8,7,5,9,7],[5,8,4,5,10,8,10,11,8],
  [5,0,4,5,11,0,5,10,11,11,3,0],[0,1,9,8,4,10,8,10,11,10,4,5],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4],
  [2,5,1,2,8,5,2,11,8,4,5,8],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5],
  [9,4,5,2,11,3],[2,5,10,3,5,2,3,4,5,3,8,4],[5,10,2,5,2,4,4,2,0],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9],
  [5,10,2,5,2,4,1,9,2,9,4,2],[8,4,5,8,5,3,3,5,1],[0,4,5,1,0,5],[8,4,5,8,5,3,9,0,5,0,3,5],[9,4,5],
  [4,11,7,4,9,11,9,10,11],[0,8,3,4,9,7,9,11,7,9,10,11],[1,10,11,1,11,4,1,4,0,7,4,11],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4],
  [4,11,7,9,11,4,9,2,11,9,1,2],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3],[11,7,4,11,4,2,2,4,0],[11,7,4,11,4,2,8,3,4,3,2,4],
  [2,9,10,2,7,9,2,3,7,7,4,9],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10],
  [1,10,2,8,7,4],[4,9,1,4,1,7,7,1,3],[4,9,1,4,1,7,0,8,1,8,7,1],[4,0,3,7,4,3],[4,8,7],[9,10,8,10,11,8],
  [3,0,9,3,9,11,11,9,10],[0,1,10,0,10,8,8,10,11],[3,1,10,11,3,10],[1,2,11,1,11,9,9,11,8],
  [3,0,9,3,9,11,1,2,9,2,11,9],[0,2,11,8,0,11],[3,2,11],[2,3,8,2,8,10,10,8,9],[9,10,2,0,9,2],
  [2,3,8,2,8,10,0,1,8,1,10,8],[1,10,2],[1,3,8,9,1,8],[0,9,1],[0,3,8],[]
]

// ─────────────────────────────────────────────────────────────────────────
// MARCHING CUBES IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────

function lerpVec(p1: Vec3, p2: Vec3, v1: number, v2: number, iso: number): Vec3 {
  if (Math.abs(iso - v1) < 1e-6) return p1
  if (Math.abs(iso - v2) < 1e-6) return p2
  if (Math.abs(v1 - v2) < 1e-6) return p1
  const t = (iso - v1) / (v2 - v1)
  return [
    p1[0] + t*(p2[0]-p1[0]),
    p1[1] + t*(p2[1]-p1[1]),
    p1[2] + t*(p2[2]-p1[2]),
  ]
}

function triNormal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  const ax = v2[0]-v1[0], ay = v2[1]-v1[1], az = v2[2]-v1[2]
  const bx = v3[0]-v1[0], by = v3[1]-v1[1], bz = v3[2]-v1[2]
  const nx = ay*bz - az*by
  const ny = az*bx - ax*bz
  const nz = ax*by - ay*bx
  const len = Math.sqrt(nx*nx + ny*ny + nz*nz)
  if (len < 1e-10) return [0, 0, 1]
  return [nx/len, ny/len, nz/len]
}

/**
 * Gera triângulos para uma TPMS dentro de um cubo de tamanho `size`,
 * com período espacial `period` mm e isovalor `threshold`.
 * Resolução em cubos por aresta (32-48 recomendado).
 */
export function generateTPMS(type: TPMSType, params: TPMSParams): Triangle[] {
  const { size, period, threshold, resolution } = params
  const fn = tpmsFunction(type)
  const tris: Triangle[] = []

  const step = size / resolution
  const k = (2 * Math.PI) / period   // freq angular

  // Cache de valores f no grid (evita recomputar 8x por cubo)
  const grid = new Float32Array((resolution+1) ** 3)
  const idx = (i: number, j: number, kk: number) => i + (resolution+1)*(j + (resolution+1)*kk)
  for (let i=0; i<=resolution; i++) {
    const x = i*step
    for (let j=0; j<=resolution; j++) {
      const y = j*step
      for (let kk=0; kk<=resolution; kk++) {
        const z = kk*step
        grid[idx(i,j,kk)] = fn(x*k, y*k, z*k)
      }
    }
  }

  // Marching cubes
  for (let i=0; i<resolution; i++) {
    for (let j=0; j<resolution; j++) {
      for (let kk=0; kk<resolution; kk++) {
        // 8 corner values
        const cv: number[] = [
          grid[idx(i  , j  , kk  )],
          grid[idx(i+1, j  , kk  )],
          grid[idx(i+1, j+1, kk  )],
          grid[idx(i  , j+1, kk  )],
          grid[idx(i  , j  , kk+1)],
          grid[idx(i+1, j  , kk+1)],
          grid[idx(i+1, j+1, kk+1)],
          grid[idx(i  , j+1, kk+1)],
        ]
        // Cube index
        let cubeIdx = 0
        for (let c=0; c<8; c++) {
          if (cv[c] < threshold) cubeIdx |= (1 << c)
        }
        const triList = TRI_TABLE[cubeIdx]
        if (!triList || triList.length === 0) continue

        // Posições mundo dos cantos
        const x0 = i*step, y0 = j*step, z0 = kk*step
        const corners: Vec3[] = CORNER.map(c => [
          x0 + c[0]*step,
          y0 + c[1]*step,
          z0 + c[2]*step,
        ])

        // Posições nos 12 edges interpoladas
        const edgePts: (Vec3 | null)[] = new Array(12).fill(null)
        for (let e=0; e<12; e++) {
          const [a, b] = EDGE_VERTICES[e]
          const va = cv[a], vb = cv[b]
          if ((va < threshold) !== (vb < threshold)) {
            edgePts[e] = lerpVec(corners[a], corners[b], va, vb, threshold)
          }
        }

        for (let t=0; t<triList.length; t+=3) {
          const p1 = edgePts[triList[t]]
          const p2 = edgePts[triList[t+1]]
          const p3 = edgePts[triList[t+2]]
          if (!p1 || !p2 || !p3) continue
          tris.push({
            normal: triNormal(p1, p2, p3),
            v1: p1, v2: p2, v3: p3,
          })
        }
      }
    }
  }
  return tris
}

// ─────────────────────────────────────────────────────────────────────────
// HELPERS — porosidade aproximada a partir do threshold
// ─────────────────────────────────────────────────────────────────────────

/**
 * Para Gyroid: threshold ↔ porosidade aproximada.
 * threshold=0   → 50% porosidade
 * threshold=0.5 → 70% porosidade
 * threshold=1.0 → ~85% porosidade
 */
export function thresholdToPorosity(threshold: number): number {
  // Aproximação polinomial para gyroid
  const t = Math.max(0, Math.min(1.4, Math.abs(threshold)))
  return Math.min(95, 50 + t * 25)
}

export function porosityToThreshold(porosity: number): number {
  // Inversa aproximada
  const p = Math.max(50, Math.min(95, porosity))
  return (p - 50) / 25
}

export const TPMS_INFO: Record<TPMSType, { label: string; description: string; suggestedFor: string }> = {
  gyroid: {
    label: "Gyroid",
    description: "Superfície mínima triperiódica clássica. Razão S/V alta, alta resistência mecânica isotrópica.",
    suggestedFor: "Regeneração óssea, cartilagem, scaffolds com vascularização desejada",
  },
  schwarzP: {
    label: "Schwarz P (Primitivo)",
    description: "TPMS com canais em ângulos retos. Mais fácil de imprimir, porosidade controlável.",
    suggestedFor: "Scaffolds simples, cultura celular 3D, regeneração óssea trabecular",
  },
  diamond: {
    label: "Diamond (D)",
    description: "Topologia em rede de tetraedros. Muito alta razão S/V, mas mais complexa de imprimir.",
    suggestedFor: "Pesquisa avançada, regeneração óssea de alta complexidade celular",
  },
}
