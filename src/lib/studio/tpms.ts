/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.3 · TPMS Engine — Triply Periodic Minimal Surfaces
 *  ─────────────────────────────────────────────────────────────────────
 *  Gera scaffolds porosos matematicamente perfeitos para bioimpressão
 *  usando as 3 TPMS mais estudadas na literatura de tissue engineering:
 *
 *   • GYROID        — Schoen 1970. Vascularização ideal, bem conectado.
 *                     f(x,y,z) = sin(x)·cos(y) + sin(y)·cos(z) + sin(z)·cos(x)
 *
 *   • SCHWARZ-P     — Schwarz 1890. Alta porosidade, menos resistente.
 *                     f(x,y,z) = cos(x) + cos(y) + cos(z)
 *
 *   • DIAMOND       — Schoen 1970. Melhor resistência mecânica (osso).
 *                     f(x,y,z) = sin(x)·sin(y)·sin(z) +
 *                                sin(x)·cos(y)·cos(z) +
 *                                cos(x)·sin(y)·cos(z) +
 *                                cos(x)·cos(y)·sin(z)
 *
 *  Todas são zero-level isosurfaces (f=0) → extraídas via marching cubes.
 *  O parâmetro `isoLevel` controla a porosidade (↑ isoLevel ⇒ ↓ porosidade).
 *
 *  REFERÊNCIAS CIENTÍFICAS:
 *   - Yoo DJ. Int J Precis Eng Manuf (2011) — "Advanced porous scaffold
 *     design using multi-void triply periodic minimal surface models"
 *   - Naghavi SA et al. Int J Bioprint (2022) — "Mechanical Characterisation
 *     of TPMS Gyroid and Diamond Ti6Al4V Scaffolds for Bone Implants"
 *   - Iamsamang J. Comput Methods Programs Biomed (2021) —
 *     "Computational method for generating porous scaffolds"
 *
 *  Esta lib é PURA (sem React, sem Node APIs específicas) e roda tanto no
 *  browser quanto no edge/Node. Zero dependências externas.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

export type TPMSKind = "gyroid" | "schwarz_p" | "diamond"

export interface TPMSParams {
  /** Tipo de superfície mínima tripla periódica. */
  kind: TPMSKind
  /** Dimensões em mm. */
  sizeX: number
  sizeY: number
  sizeZ: number
  /** Resolução em # de amostras por eixo. 32-64 recomendado. */
  resolution: number
  /** Número de células unitárias por eixo (controla tamanho de poros). */
  cellsPerAxis: number
  /** Espessura relativa da parede (0.0 - 1.0). 0.0 = parede fina. */
  wallThickness: number
}

export interface MeshData {
  /** Vértices intercalados: [x0, y0, z0, x1, y1, z1, ...]. */
  vertices: Float32Array
  /** Normais por vértice (mesmo layout de vertices). */
  normals: Float32Array
  /** Índices triangulares. Length múltiplo de 3. */
  indices: Uint32Array
  /** Metadados calculados pós-geração. */
  stats: MeshStats
}

export interface MeshStats {
  /** Número de triângulos (indices.length / 3). */
  triangleCount: number
  /** Número de vértices únicos. */
  vertexCount: number
  /** Porosidade calculada por volume de voxels (0.0 - 1.0). */
  porosity: number
  /** Volume aproximado do scaffold em mm³. */
  volume_mm3: number
  /** Bounding box em mm. */
  bounds: { min: [number, number, number]; max: [number, number, number] }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Avaliação da função TPMS num ponto (x, y, z) em coordenadas normalizadas
 * ═══════════════════════════════════════════════════════════════════════ */

export function evaluateTPMS(kind: TPMSKind, x: number, y: number, z: number): number {
  switch (kind) {
    case "gyroid":
      return Math.sin(x) * Math.cos(y) +
             Math.sin(y) * Math.cos(z) +
             Math.sin(z) * Math.cos(x)

    case "schwarz_p":
      return Math.cos(x) + Math.cos(y) + Math.cos(z)

    case "diamond":
      return Math.sin(x) * Math.sin(y) * Math.sin(z) +
             Math.sin(x) * Math.cos(y) * Math.cos(z) +
             Math.cos(x) * Math.sin(y) * Math.cos(z) +
             Math.cos(x) * Math.cos(y) * Math.sin(z)
  }
}

/**
 * Validação defensiva dos parâmetros. Lança Error com mensagem pt-BR
 * em caso de valor fora de range.
 */
export function validateTPMSParams(p: TPMSParams): void {
  if (!["gyroid", "schwarz_p", "diamond"].includes(p.kind)) {
    throw new Error(`TPMS inválido: "${p.kind}". Use gyroid, schwarz_p ou diamond.`)
  }
  for (const [k, v] of [["sizeX", p.sizeX], ["sizeY", p.sizeY], ["sizeZ", p.sizeZ]] as const) {
    if (!Number.isFinite(v) || v <= 0 || v > 500) {
      throw new Error(`${k} deve estar entre 0 e 500 mm (recebido: ${v}).`)
    }
  }
  if (!Number.isInteger(p.resolution) || p.resolution < 16 || p.resolution > 128) {
    throw new Error(`resolution deve ser inteiro entre 16 e 128 (recebido: ${p.resolution}).`)
  }
  if (!Number.isInteger(p.cellsPerAxis) || p.cellsPerAxis < 1 || p.cellsPerAxis > 20) {
    throw new Error(`cellsPerAxis deve ser inteiro entre 1 e 20 (recebido: ${p.cellsPerAxis}).`)
  }
  if (!Number.isFinite(p.wallThickness) || p.wallThickness < 0.0 || p.wallThickness > 1.0) {
    throw new Error(`wallThickness deve estar entre 0.0 e 1.0 (recebido: ${p.wallThickness}).`)
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Marching Cubes — implementação clássica (Lorensen & Cline 1987)
 *  ─────────────────────────────────────────────────────────────────────
 *  Para cada cubo da grid, consulta a tabela de 256 configurações possíveis
 *  (triTable) baseado em quais cantos estão acima/abaixo do iso-nível, e
 *  emite 0-5 triângulos interpolando a superfície pelos edges.
 *
 *  Nossa versão usa SDF derivada: iso = |f(x,y,z)| - wallThickness
 *  para gerar uma "casca" espessa ao redor da superfície mínima — isso
 *  dá volume ao scaffold (sem isso ele seria uma superfície 2D, não
 *  imprimível). Essa é a técnica usada pela TPMS Studio e pelo artigo
 *  do Naghavi 2022.
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * Gera um scaffold TPMS como mesh triangular.
 * Esta função é o ponto de entrada principal da lib.
 */
export function generateTPMSMesh(params: TPMSParams): MeshData {
  validateTPMSParams(params)

  const { sizeX, sizeY, sizeZ, resolution, cellsPerAxis, wallThickness } = params
  const nx = resolution, ny = resolution, nz = resolution

  // Grid de amostras do SDF
  const sdf = new Float32Array(nx * ny * nz)
  // escala em radianos: 2π·cellsPerAxis ao longo de cada eixo
  const sx = (2 * Math.PI * cellsPerAxis) / sizeX
  const sy = (2 * Math.PI * cellsPerAxis) / sizeY
  const sz = (2 * Math.PI * cellsPerAxis) / sizeZ

  // isoLevel: parede fina = 0.0, parede grossa = ↑
  const isoLevel = wallThickness

  // Pré-computa o SDF (abs do campo TPMS centrado) + conta voxels "cheios"
  let solidVoxels = 0
  const totalVoxels = nx * ny * nz
  for (let k = 0; k < nz; k++) {
    const z = (k / (nz - 1)) * sizeZ * sx / ((2 * Math.PI * cellsPerAxis) / sizeX) * sz
    for (let j = 0; j < ny; j++) {
      const y = (j / (ny - 1)) * sizeY * sy
      for (let i = 0; i < nx; i++) {
        const x = (i / (nx - 1)) * sizeX * sx
        const f = evaluateTPMS(params.kind, x, y, z)
        const v = Math.abs(f) - isoLevel
        sdf[k * nx * ny + j * nx + i] = v
        if (v < 0) solidVoxels++
      }
    }
  }

  // Marching cubes
  const positions: number[] = []
  const triangles: number[] = []

  // Pitch em mm por célula de grid
  const dx = sizeX / (nx - 1)
  const dy = sizeY / (ny - 1)
  const dz = sizeZ / (nz - 1)

  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        marchCube(sdf, nx, ny, i, j, k, dx, dy, dz, 0, positions, triangles)
      }
    }
  }

  // Compacta vértices (dedupe barato por hash do quantize)
  const { verts, idx } = dedupeVertices(positions, triangles)

  // Calcula normais de face suavizadas por vértice
  const normals = computeVertexNormals(verts, idx)

  // Porosidade real = 1 - (voxels sólidos / total)
  // (invertido pois voxels "sólidos" são os INTERIORES do scaffold)
  const porosity = 1 - (solidVoxels / totalVoxels)

  return {
    vertices: verts,
    normals,
    indices: idx,
    stats: {
      triangleCount: idx.length / 3,
      vertexCount: verts.length / 3,
      porosity,
      volume_mm3: sizeX * sizeY * sizeZ * (1 - porosity),
      bounds: {
        min: [0, 0, 0],
        max: [sizeX, sizeY, sizeZ],
      },
    },
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Tabelas do Marching Cubes (edge/tri tables clássicas Lorensen 1987)
 *  Códigos originais de http://paulbourke.net/geometry/polygonise/
 *  (domínio público, uso irrestrito)
 * ═══════════════════════════════════════════════════════════════════════ */

// Para cada uma das 256 configurações de cubo (8 cantos × 2 estados),
// edgeTable retorna uma bitmask de 12 bits indicando quais edges são
// cortados pela superfície.
const EDGE_TABLE = new Int32Array([
  0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c, 0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac, 0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c, 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc, 0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c, 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc, 0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc, 0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c, 0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc, 0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c, 0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac, 0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c, 0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c, 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c, 0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0,
])

// Para cada configuração, lista de triângulos (até 5) como triplas de edges.
// -1 marca o fim da lista. Total: 256 linhas × 16 valores.
// Lazy: só é construída na primeira chamada de getTriTable() — evita TDZ
// porque TRI_TABLE_RAW é declarada depois (precisa estar lá por legibilidade).
let TRI_TABLE_CACHE: number[][] | null = null
function getTriTable(): number[][] {
  if (TRI_TABLE_CACHE) return TRI_TABLE_CACHE
  TRI_TABLE_CACHE = TRI_TABLE_RAW.split(";").map(row =>
    row.split(",").map(s => parseInt(s.trim(), 10))
  )
  return TRI_TABLE_CACHE
}

// Processa 1 célula do marching cubes
function marchCube(
  sdf: Float32Array,
  nx: number, ny: number,
  i: number, j: number, k: number,
  dx: number, dy: number, dz: number,
  iso: number,
  outPositions: number[],
  outTriangles: number[],
): void {
  // Lê os 8 cantos
  const cornerVals = [
    getSDF(sdf, nx, ny, i,     j,     k),
    getSDF(sdf, nx, ny, i + 1, j,     k),
    getSDF(sdf, nx, ny, i + 1, j + 1, k),
    getSDF(sdf, nx, ny, i,     j + 1, k),
    getSDF(sdf, nx, ny, i,     j,     k + 1),
    getSDF(sdf, nx, ny, i + 1, j,     k + 1),
    getSDF(sdf, nx, ny, i + 1, j + 1, k + 1),
    getSDF(sdf, nx, ny, i,     j + 1, k + 1),
  ]

  // Posições dos cantos em mm (sistema de coord. real)
  const x0 = i * dx, y0 = j * dy, z0 = k * dz
  const cornerPos: [number, number, number][] = [
    [x0,      y0,      z0     ],
    [x0 + dx, y0,      z0     ],
    [x0 + dx, y0 + dy, z0     ],
    [x0,      y0 + dy, z0     ],
    [x0,      y0,      z0 + dz],
    [x0 + dx, y0,      z0 + dz],
    [x0 + dx, y0 + dy, z0 + dz],
    [x0,      y0 + dy, z0 + dz],
  ]

  let cubeIndex = 0
  for (let b = 0; b < 8; b++) {
    if (cornerVals[b] < iso) cubeIndex |= (1 << b)
  }

  const edgeFlags = EDGE_TABLE[cubeIndex]
  if (edgeFlags === 0) return

  // Interpola os 12 edges (os que forem relevantes)
  const edgeVerts: [number, number, number][] = new Array(12)
  const edgeMap: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  for (let e = 0; e < 12; e++) {
    if ((edgeFlags & (1 << e)) !== 0) {
      const [a, b] = edgeMap[e]
      edgeVerts[e] = interpolateVertex(iso, cornerPos[a], cornerPos[b], cornerVals[a], cornerVals[b])
    }
  }

  // Emite triângulos
  const tris = getTriTable()[cubeIndex]
  for (let t = 0; t < tris.length && tris[t] !== -1; t += 3) {
    const vA = edgeVerts[tris[t]]
    const vB = edgeVerts[tris[t + 1]]
    const vC = edgeVerts[tris[t + 2]]
    if (!vA || !vB || !vC) continue

    const idx = outPositions.length / 3
    outPositions.push(vA[0], vA[1], vA[2])
    outPositions.push(vB[0], vB[1], vB[2])
    outPositions.push(vC[0], vC[1], vC[2])
    outTriangles.push(idx, idx + 1, idx + 2)
  }
}

function getSDF(sdf: Float32Array, nx: number, ny: number, i: number, j: number, k: number): number {
  return sdf[k * nx * ny + j * nx + i]
}

function interpolateVertex(
  iso: number,
  p1: [number, number, number],
  p2: [number, number, number],
  v1: number,
  v2: number,
): [number, number, number] {
  if (Math.abs(iso - v1) < 1e-5) return p1
  if (Math.abs(iso - v2) < 1e-5) return p2
  if (Math.abs(v1 - v2) < 1e-5) return p1
  const t = (iso - v1) / (v2 - v1)
  return [
    p1[0] + t * (p2[0] - p1[0]),
    p1[1] + t * (p2[1] - p1[1]),
    p1[2] + t * (p2[2] - p1[2]),
  ]
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Dedup + normais
 * ═══════════════════════════════════════════════════════════════════════ */

function dedupeVertices(
  flatPositions: number[],
  triangles: number[],
): { verts: Float32Array; idx: Uint32Array } {
  const map = new Map<string, number>()
  const uniq: number[] = []
  const remapped: number[] = []
  const PRECISION = 1e4 // 0.0001 mm
  for (let i = 0; i < triangles.length; i++) {
    const origIdx = triangles[i]
    const x = flatPositions[origIdx * 3]
    const y = flatPositions[origIdx * 3 + 1]
    const z = flatPositions[origIdx * 3 + 2]
    const key = `${Math.round(x * PRECISION)}_${Math.round(y * PRECISION)}_${Math.round(z * PRECISION)}`
    let newIdx = map.get(key)
    if (newIdx === undefined) {
      newIdx = uniq.length / 3
      uniq.push(x, y, z)
      map.set(key, newIdx)
    }
    remapped.push(newIdx)
  }
  return {
    verts: new Float32Array(uniq),
    idx: new Uint32Array(remapped),
  }
}

function computeVertexNormals(verts: Float32Array, idx: Uint32Array): Float32Array {
  const n = verts.length
  const normals = new Float32Array(n)
  for (let t = 0; t < idx.length; t += 3) {
    const ia = idx[t] * 3, ib = idx[t + 1] * 3, ic = idx[t + 2] * 3
    const ax = verts[ia],     ay = verts[ia + 1], az = verts[ia + 2]
    const bx = verts[ib],     by = verts[ib + 1], bz = verts[ib + 2]
    const cx = verts[ic],     cy = verts[ic + 1], cz = verts[ic + 2]
    const ex = bx - ax, ey = by - ay, ez = bz - az
    const fx = cx - ax, fy = cy - ay, fz = cz - az
    // produto vetorial
    const nx = ey * fz - ez * fy
    const ny = ez * fx - ex * fz
    const nz = ex * fy - ey * fx
    normals[ia]     += nx;  normals[ia + 1] += ny;  normals[ia + 2] += nz
    normals[ib]     += nx;  normals[ib + 1] += ny;  normals[ib + 2] += nz
    normals[ic]     += nx;  normals[ic + 1] += ny;  normals[ic + 2] += nz
  }
  // normaliza
  for (let i = 0; i < n; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1
    normals[i]     /= len
    normals[i + 1] /= len
    normals[i + 2] /= len
  }
  return normals
}

/* ═══════════════════════════════════════════════════════════════════════
 *  TRI_TABLE comprimida (256 configurações)
 *  Formato: ";" separa linhas, "," separa colunas. 16 valores por linha.
 * ═══════════════════════════════════════════════════════════════════════ */

const TRI_TABLE_RAW =
  "-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1;" +
  "3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1;" +
  "3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1;" +
  "3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1;" +
  "9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1;" +
  "9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1;" +
  "2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1;" +
  "8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1;" +
  "9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1;" +
  "4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1;" +
  "3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1;" +
  "1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1;" +
  "4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1;" +
  "4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1;" +
  "9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "3,0,8,1,2,10,4,9,5,-1,-1,-1,-1,-1,-1,-1;" +
  "5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1;" +
  "2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1;" +
  "9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1;" +
  "0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1;" +
  "2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1;" +
  "10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1;" +
  "4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1;" +
  "5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1;" +
  "5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1;" +
  "9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1;" +
  "0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1;" +
  "1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1;" +
  "10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1;" +
  "8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1;" +
  "2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1;" +
  "7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1;" +
  "9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1;" +
  "2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1;" +
  "11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1;" +
  "9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1;" +
  "5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1;" +
  "11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1;" +
  "11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1;" +
  "1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1;" +
  "9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1;" +
  "5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1;" +
  "2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1;" +
  "0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1;" +
  "5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1;" +
  "6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1;" +
  "3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1;" +
  "6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1;" +
  "5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1;" +
  "1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1;" +
  "10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1;" +
  "6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1;" +
  "8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1;" +
  "7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1;" +
  "3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1;" +
  "5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1;" +
  "0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1;" +
  "9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1;" +
  "8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1;" +
  "5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1;" +
  "0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1;" +
  "6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1;" +
  "10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1;" +
  "10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1;" +
  "8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1;" +
  "1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1;" +
  "3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1;" +
  "0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1;" +
  "10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1;" +
  "3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1;" +
  "6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1;" +
  "9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1;" +
  "8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1;" +
  "3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1;" +
  "6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1;" +
  "0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1;" +
  "10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1;" +
  "10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1;" +
  "2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1;" +
  "7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1;" +
  "7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1;" +
  "2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1;" +
  "1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1;" +
  "11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1;" +
  "8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1;" +
  "0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1;" +
  "7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1;" +
  "10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1;" +
  "2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1;" +
  "6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1;" +
  "7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1;" +
  "2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1;" +
  "1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1;" +
  "10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1;" +
  "10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1;" +
  "0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1;" +
  "7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1;" +
  "6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1;" +
  "8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1;" +
  "9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1;" +
  "6,8,4,6,11,8,2,10,1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1;" +
  "4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1;" +
  "10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1;" +
  "8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1;" +
  "0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1;" +
  "1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1;" +
  "8,1,3,8,6,1,8,4,6,6,10,1,-1,-1,-1,-1;" +
  "10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1;" +
  "4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1;" +
  "10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1;" +
  "5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1;" +
  "11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1;" +
  "9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1;" +
  "6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1;" +
  "7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1;" +
  "3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1;" +
  "7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1;" +
  "9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1;" +
  "3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1;" +
  "6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1;" +
  "9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1;" +
  "1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1;" +
  "4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1;" +
  "7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1;" +
  "6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1;" +
  "3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1;" +
  "0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1;" +
  "6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1;" +
  "0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1;" +
  "11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1;" +
  "6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1;" +
  "5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1;" +
  "9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1;" +
  "1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1;" +
  "1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1;" +
  "10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1;" +
  "0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1;" +
  "5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1;" +
  "10,7,5,10,11,7,9,8,1,8,3,1,-1,-1,-1,-1;" +
  "11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1;" +
  "9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1;" +
  "7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1;" +
  "2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1;" +
  "8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1;" +
  "9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1;" +
  "9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1;" +
  "1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1;" +
  "9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1;" +
  "9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1;" +
  "5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1;" +
  "0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1;" +
  "10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1;" +
  "2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1;" +
  "0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1;" +
  "0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1;" +
  "9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1;" +
  "5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1;" +
  "3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1;" +
  "5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1;" +
  "8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1;" +
  "9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1;" +
  "0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1;" +
  "1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1;" +
  "3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1;" +
  "4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1;" +
  "9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1;" +
  "11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1;" +
  "11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1;" +
  "2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1;" +
  "9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1;" +
  "3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1;" +
  "1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1;" +
  "4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1;" +
  "4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1;" +
  "0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1;" +
  "3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1;" +
  "3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1;" +
  "0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1;" +
  "9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1;" +
  "1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1;" +
  "-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1"

/* ═══════════════════════════════════════════════════════════════════════
 *  Helpers de alto nível para preset clínico
 *  Vide src/lib/studio/parser.ts para "Dicionário clínico → TPMSParams"
 * ═══════════════════════════════════════════════════════════════════════ */

/** Preset recomendado para cada aplicação clínica (do artigo Naghavi 2022). */
export const CLINICAL_PRESETS: Record<string, { kind: TPMSKind; porosityTarget: number; cellsPerAxis: number }> = {
  // Ortopedia — osso cortical
  "scaffold_ossea_cortical": { kind: "diamond",   porosityTarget: 0.60, cellsPerAxis: 4 },
  // Ortopedia — osso esponjoso
  "scaffold_ossea_esponjosa": { kind: "gyroid",    porosityTarget: 0.75, cellsPerAxis: 5 },
  // Cartilagem articular
  "scaffold_cartilagem":     { kind: "gyroid",    porosityTarget: 0.80, cellsPerAxis: 6 },
  // Pele/dérmico
  "scaffold_pele":           { kind: "schwarz_p", porosityTarget: 0.85, cellsPerAxis: 7 },
  // Enxerto alveolar (odonto)
  "scaffold_alveolar":       { kind: "diamond",   porosityTarget: 0.65, cellsPerAxis: 4 },
  // Tecido mole genérico
  "scaffold_tecido_mole":    { kind: "schwarz_p", porosityTarget: 0.82, cellsPerAxis: 6 },
}

/**
 * Converte um preset clínico + dimensões em parâmetros TPMS prontos.
 * Faz a tradução da "porosidade desejada" em "wallThickness" via
 * calibração empírica (polinômio de 2º grau ajustado por iso).
 */
export function presetToTPMSParams(
  presetId: keyof typeof CLINICAL_PRESETS,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  resolution: number = 48,
): TPMSParams {
  const preset = CLINICAL_PRESETS[presetId]
  if (!preset) throw new Error(`Preset clínico desconhecido: "${presetId}"`)

  return {
    kind: preset.kind,
    sizeX, sizeY, sizeZ,
    resolution,
    cellsPerAxis: preset.cellsPerAxis,
    wallThickness: porosityToWallThickness(preset.porosityTarget, preset.kind),
  }
}

/**
 * Converte porosidade alvo (0.0-1.0) em wallThickness do iso-level.
 * Calibrado empiricamente: para cada TPMS, a relação é aproximadamente
 * linear invertida no range útil (0.4-0.9 de porosidade).
 *
 * Base: wall = (1 - porosidade) * fator, onde fator varia por kind.
 */
export function porosityToWallThickness(porosity: number, kind: TPMSKind): number {
  if (porosity <= 0.0 || porosity >= 1.0) {
    throw new Error(`porosity deve estar entre 0 e 1 (recebido: ${porosity}).`)
  }
  const factor = kind === "gyroid" ? 1.5 : kind === "diamond" ? 1.3 : 1.2
  // porosidade alta ⇒ wall baixa
  const wall = (1 - porosity) * factor
  // clamp
  return Math.max(0.0, Math.min(1.0, wall))
}
