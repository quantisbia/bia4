/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.4 · Primitivas Anatômicas Paramétricas
 *  ─────────────────────────────────────────────────────────────────────
 *  CORREÇÃO CONCEITUAL do R14.3 (Janaina, 2026-10-19):
 *
 *  ❌ ERRADO (R14.3):  STL = scaffold TPMS poroso visível
 *  ✅ CERTO  (R14.4):  STL = sólido anatômico (osso, menisco, orelha...)
 *                      Padrão de preenchimento (gyroid/grid/honeycomb)
 *                      é definido NO SLICER quando gera o G-code.
 *
 *  Esta lib gera MESHES SÓLIDAS com formato anatômico realista para
 *  bioimpressão:
 *
 *   1. BLOCK        — bloco retangular (teste, scaffold genérico)
 *   2. CYLINDER     — cilindro (teste de compressão, bone plug)
 *   3. CRESCENT     — meia-lua (menisco medial/lateral)
 *   4. CRANIAL_CAP  — calota craniana (segmento esférico com curvatura)
 *   5. MANDIBLE_SEG — segmento mandibular (arco com perfil ósseo)
 *   6. FEMUR_SEG    — segmento diafisário (cilindro com cortical/medular)
 *   7. EAR_AURICLE  — cartilagem auricular (hélice + concha simplificadas)
 *   8. DISC         — disco intervertebral (toróide achatado)
 *
 *  Todas são MESHES FECHADAS (watertight), prontas pra impressão.
 *  O slicer é quem decide porosidade/padrão de infill depois.
 *
 *  Zero deps externas. Roda em qualquer runtime.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { MeshData, MeshStats } from "./tpms"

/* ═══════════════════════════════════════════════════════════════════════
 *  Tipos
 * ═══════════════════════════════════════════════════════════════════════ */

export type AnatomyKind =
  | "block"
  | "cylinder"
  | "crescent"
  | "cranial_cap"
  | "mandible_seg"
  | "femur_seg"
  | "ear_auricle"
  | "disc"

export interface AnatomyParams {
  kind: AnatomyKind
  /** Dimensão principal em mm (X = largura/comprimento). */
  sizeX: number
  /** Dimensão secundária em mm (Y). */
  sizeY: number
  /** Dimensão Z em mm (altura/espessura). */
  sizeZ: number
  /** Qualidade da mesh. 24 = baixa (teste), 48 = média, 96 = alta. */
  resolution?: number
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Catálogo de rótulos pt-BR + descrições clínicas
 * ═══════════════════════════════════════════════════════════════════════ */

export interface AnatomyMeta {
  kind: AnatomyKind
  label: string
  shortLabel: string
  emoji: string
  description: string
  typicalDims: { x: number; y: number; z: number }  // dimensões típicas em mm
  clinicalExamples: string[]
}

export const ANATOMY_CATALOG: AnatomyMeta[] = [
  {
    kind: "block",
    label: "Bloco retangular",
    shortLabel: "Bloco",
    emoji: "🧊",
    description: "Bloco sólido retangular — ideal para testes mecânicos padrão (compressão, tração) e scaffolds genéricos.",
    typicalDims: { x: 20, y: 20, z: 10 },
    clinicalExamples: ["Testes in vitro", "Scaffold genérico", "Prova mecânica"],
  },
  {
    kind: "cylinder",
    label: "Cilindro",
    shortLabel: "Cilindro",
    emoji: "🥫",
    description: "Cilindro sólido vertical — bone plug, teste de compressão ISO 604, scaffold tubular.",
    typicalDims: { x: 10, y: 10, z: 20 },
    clinicalExamples: ["Bone plug", "Teste ISO 604", "Scaffold tubular"],
  },
  {
    kind: "crescent",
    label: "Meia-lua (menisco)",
    shortLabel: "Menisco",
    emoji: "🌙",
    description: "Formato semi-lunar que mimetiza a geometria do menisco medial/lateral do joelho.",
    typicalDims: { x: 40, y: 20, z: 6 },
    clinicalExamples: ["Menisco medial", "Menisco lateral", "Cartilagem articular"],
  },
  {
    kind: "cranial_cap",
    label: "Calota craniana",
    shortLabel: "Calota",
    emoji: "🧠",
    description: "Segmento esférico com curvatura craniana realista — reparo de defeitos de calota (CBMF).",
    typicalDims: { x: 60, y: 50, z: 4 },
    clinicalExamples: ["Craniotomia reparadora", "Defeito ósseo craniano", "CBMF"],
  },
  {
    kind: "mandible_seg",
    label: "Segmento mandibular",
    shortLabel: "Mandíbula",
    emoji: "🦷",
    description: "Arco mandibular segmentado — reconstrução pós-ressecção tumoral, implantes odontológicos.",
    typicalDims: { x: 40, y: 12, z: 15 },
    clinicalExamples: ["Reconstrução mandibular", "Pós-ressecção tumoral", "Enxerto alveolar"],
  },
  {
    kind: "femur_seg",
    label: "Segmento diafisário",
    shortLabel: "Fêmur",
    emoji: "🦴",
    description: "Segmento diafisário com cortical externo e medular central (osso longo: fêmur, tíbia, úmero).",
    typicalDims: { x: 25, y: 25, z: 40 },
    clinicalExamples: ["Defeito segmentar fêmur/tíbia", "Pseudoartrose", "Fratura cominutiva"],
  },
  {
    kind: "ear_auricle",
    label: "Cartilagem auricular",
    shortLabel: "Orelha",
    emoji: "👂",
    description: "Formato de orelha externa simplificado — reconstrução de microtia, trauma auricular.",
    typicalDims: { x: 55, y: 35, z: 8 },
    clinicalExamples: ["Microtia", "Trauma auricular", "Reconstrução pós-tumor"],
  },
  {
    kind: "disc",
    label: "Disco intervertebral",
    shortLabel: "Disco",
    emoji: "⚪",
    description: "Toróide achatado — disco intervertebral lombar/cervical, menisco meniscal menor.",
    typicalDims: { x: 35, y: 25, z: 8 },
    clinicalExamples: ["Hérnia de disco", "Discopatia lombar", "Fusão intervertebral"],
  },
]

export function getAnatomyMeta(kind: AnatomyKind): AnatomyMeta {
  const meta = ANATOMY_CATALOG.find(m => m.kind === kind)
  if (!meta) throw new Error(`AnatomyKind inválido: ${kind}`)
  return meta
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Validação
 * ═══════════════════════════════════════════════════════════════════════ */

export function validateAnatomyParams(p: AnatomyParams): void {
  if (!ANATOMY_CATALOG.some(m => m.kind === p.kind)) {
    throw new Error(`Forma anatômica inválida: ${p.kind}`)
  }
  for (const [k, v] of [["sizeX", p.sizeX], ["sizeY", p.sizeY], ["sizeZ", p.sizeZ]] as const) {
    if (!Number.isFinite(v) || v <= 0 || v > 500) {
      throw new Error(`${k} deve estar entre 0 e 500 mm (recebido: ${v}).`)
    }
  }
  const res = p.resolution ?? 48
  if (!Number.isInteger(res) || res < 8 || res > 128) {
    throw new Error(`resolution deve estar entre 8 e 128 (recebido: ${res}).`)
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Dispatcher principal
 * ═══════════════════════════════════════════════════════════════════════ */

export function generateAnatomyMesh(params: AnatomyParams): MeshData {
  validateAnatomyParams(params)
  const res = params.resolution ?? 48

  switch (params.kind) {
    case "block":        return buildBlock(params.sizeX, params.sizeY, params.sizeZ)
    case "cylinder":     return buildCylinder(params.sizeX / 2, params.sizeZ, Math.max(16, res))
    case "crescent":     return buildCrescent(params.sizeX, params.sizeY, params.sizeZ, Math.max(24, res))
    case "cranial_cap":  return buildCranialCap(params.sizeX, params.sizeY, params.sizeZ, Math.max(32, res))
    case "mandible_seg": return buildMandibleSegment(params.sizeX, params.sizeY, params.sizeZ, Math.max(32, res))
    case "femur_seg":    return buildFemurSegment(params.sizeX / 2, params.sizeZ, Math.max(24, res))
    case "ear_auricle":  return buildEarAuricle(params.sizeX, params.sizeY, params.sizeZ, Math.max(48, res))
    case "disc":         return buildIntervertebralDisc(params.sizeX / 2, params.sizeY / 2, params.sizeZ, Math.max(32, res))
  }
}

/* ═══════════════════════════════════════════════════════════════════════
 *  BUILDERS — cada um retorna MeshData watertight
 *  Convenção: origem no CENTRO geométrico; Y = eixo vertical.
 * ═══════════════════════════════════════════════════════════════════════ */

interface MeshBuilder {
  verts: number[]
  tris: number[]
  addVertex(x: number, y: number, z: number): number
  addTriangle(a: number, b: number, c: number): void
}

function createBuilder(): MeshBuilder {
  const verts: number[] = []
  const tris: number[] = []
  return {
    verts,
    tris,
    addVertex(x, y, z) {
      const i = verts.length / 3
      verts.push(x, y, z)
      return i
    },
    addTriangle(a, b, c) {
      tris.push(a, b, c)
    },
  }
}

function finalizeMesh(b: MeshBuilder, sizeX: number, sizeY: number, sizeZ: number): MeshData {
  const vertices = new Float32Array(b.verts)
  const indices = new Uint32Array(b.tris)
  const normals = computeNormals(vertices, indices)

  // Volume aproximado via signed tet (fórmula clássica)
  const volume = Math.abs(computeMeshVolume(vertices, indices))

  const stats: MeshStats = {
    triangleCount: indices.length / 3,
    vertexCount: vertices.length / 3,
    porosity: 0,  // mesh SÓLIDA — porosidade zero no STL. Infill vem no slicer.
    volume_mm3: volume,
    bounds: {
      min: [-sizeX / 2, -sizeY / 2, -sizeZ / 2],
      max: [ sizeX / 2,  sizeY / 2,  sizeZ / 2],
    },
  }

  return { vertices, normals, indices, stats }
}

function computeNormals(verts: Float32Array, idx: Uint32Array): Float32Array {
  const n = verts.length
  const normals = new Float32Array(n)
  for (let t = 0; t < idx.length; t += 3) {
    const ia = idx[t] * 3, ib = idx[t + 1] * 3, ic = idx[t + 2] * 3
    const ax = verts[ia], ay = verts[ia + 1], az = verts[ia + 2]
    const bx = verts[ib], by = verts[ib + 1], bz = verts[ib + 2]
    const cx = verts[ic], cy = verts[ic + 1], cz = verts[ic + 2]
    const ex = bx - ax, ey = by - ay, ez = bz - az
    const fx = cx - ax, fy = cy - ay, fz = cz - az
    const nx = ey * fz - ez * fy
    const ny = ez * fx - ex * fz
    const nz = ex * fy - ey * fx
    normals[ia]     += nx; normals[ia + 1] += ny; normals[ia + 2] += nz
    normals[ib]     += nx; normals[ib + 1] += ny; normals[ib + 2] += nz
    normals[ic]     += nx; normals[ic + 1] += ny; normals[ic + 2] += nz
  }
  for (let i = 0; i < n; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1
    normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len
  }
  return normals
}

function computeMeshVolume(verts: Float32Array, idx: Uint32Array): number {
  let v = 0
  for (let t = 0; t < idx.length; t += 3) {
    const ia = idx[t] * 3, ib = idx[t + 1] * 3, ic = idx[t + 2] * 3
    const ax = verts[ia], ay = verts[ia + 1], az = verts[ia + 2]
    const bx = verts[ib], by = verts[ib + 1], bz = verts[ib + 2]
    const cx = verts[ic], cy = verts[ic + 1], cz = verts[ic + 2]
    v += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6
  }
  return v
}

/* ─────────────────────────────────────────────────────────────────────
 * 1. BLOCK — bloco retangular (12 tri, 8 vert)
 * ─────────────────────────────────────────────────────────────────── */

function buildBlock(sizeX: number, sizeY: number, sizeZ: number): MeshData {
  const b = createBuilder()
  const hx = sizeX / 2, hy = sizeY / 2, hz = sizeZ / 2
  // 8 vértices do cubo
  const v = [
    b.addVertex(-hx, -hy, -hz),  // 0
    b.addVertex( hx, -hy, -hz),  // 1
    b.addVertex( hx,  hy, -hz),  // 2
    b.addVertex(-hx,  hy, -hz),  // 3
    b.addVertex(-hx, -hy,  hz),  // 4
    b.addVertex( hx, -hy,  hz),  // 5
    b.addVertex( hx,  hy,  hz),  // 6
    b.addVertex(-hx,  hy,  hz),  // 7
  ]
  // 6 faces × 2 tris (CCW visto de fora)
  const quad = (a: number, bI: number, c: number, d: number) => {
    b.addTriangle(v[a], v[bI], v[c])
    b.addTriangle(v[a], v[c], v[d])
  }
  quad(3, 2, 1, 0)  // -Z (bottom)
  quad(4, 5, 6, 7)  // +Z (top)
  quad(0, 1, 5, 4)  // -Y (front)
  quad(2, 3, 7, 6)  // +Y (back)
  quad(1, 2, 6, 5)  // +X (right)
  quad(3, 0, 4, 7)  // -X (left)
  return finalizeMesh(b, sizeX, sizeY, sizeZ)
}

/* ─────────────────────────────────────────────────────────────────────
 * 2. CYLINDER — cilindro vertical (eixo Z)
 * ─────────────────────────────────────────────────────────────────── */

function buildCylinder(radius: number, height: number, segments: number): MeshData {
  const b = createBuilder()
  const hz = height / 2

  // Centros top/bottom
  const centerTop = b.addVertex(0, 0, hz)
  const centerBot = b.addVertex(0, 0, -hz)

  // Anéis top e bottom
  const topRing: number[] = []
  const botRing: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI
    const x = Math.cos(a) * radius
    const y = Math.sin(a) * radius
    topRing.push(b.addVertex(x, y, hz))
    botRing.push(b.addVertex(x, y, -hz))
  }

  // Tampa top (CCW visto de cima)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    b.addTriangle(centerTop, topRing[i], topRing[next])
  }
  // Tampa bottom (CCW visto de baixo)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    b.addTriangle(centerBot, botRing[next], botRing[i])
  }
  // Lateral
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    b.addTriangle(topRing[i], botRing[i], botRing[next])
    b.addTriangle(topRing[i], botRing[next], topRing[next])
  }

  return finalizeMesh(b, radius * 2, radius * 2, height)
}

/* ─────────────────────────────────────────────────────────────────────
 * 3. CRESCENT (meia-lua / menisco)
 *  Construção: extrusão de contorno em meia-lua ao longo de Z
 *  Contorno: arco externo (raio R_out) + arco interno (raio R_in deslocado)
 * ─────────────────────────────────────────────────────────────────── */

function buildCrescent(sizeX: number, sizeY: number, sizeZ: number, segments: number): MeshData {
  const b = createBuilder()
  const hz = sizeZ / 2
  const R_out = sizeX / 2
  const R_in = R_out * 0.55  // raio interno = 55% do externo

  // Perfil 2D (plano XY) — meia-lua aberta pra cima (+Y)
  // Arco externo: de π a 0 (sentido horário visto de +Z)
  // Arco interno: de 0 a π (fecha a meia-lua)
  const profile: Array<[number, number]> = []
  const N = Math.max(16, segments)
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = Math.PI - t * Math.PI  // de π a 0
    profile.push([Math.cos(a) * R_out, Math.sin(a) * sizeY / 2])
  }
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = t * Math.PI  // de 0 a π
    profile.push([Math.cos(a) * R_in, Math.sin(a) * sizeY / 2 * 0.7])
  }

  // Vértices top + bottom
  const topIdx: number[] = []
  const botIdx: number[] = []
  for (const [x, y] of profile) {
    topIdx.push(b.addVertex(x, y, hz))
    botIdx.push(b.addVertex(x, y, -hz))
  }

  const P = profile.length

  // Lateral (CCW)
  for (let i = 0; i < P; i++) {
    const next = (i + 1) % P
    b.addTriangle(topIdx[i], botIdx[i], botIdx[next])
    b.addTriangle(topIdx[i], botIdx[next], topIdx[next])
  }

  // Tampa top + bottom: fan triangulation a partir do centro do perfil
  const cx = profile.reduce((s, p) => s + p[0], 0) / P
  const cy = profile.reduce((s, p) => s + p[1], 0) / P
  const centerTop = b.addVertex(cx, cy, hz)
  const centerBot = b.addVertex(cx, cy, -hz)
  for (let i = 0; i < P; i++) {
    const next = (i + 1) % P
    b.addTriangle(centerTop, topIdx[i], topIdx[next])
    b.addTriangle(centerBot, botIdx[next], botIdx[i])
  }

  return finalizeMesh(b, sizeX, sizeY, sizeZ)
}

/* ─────────────────────────────────────────────────────────────────────
 * 4. CRANIAL_CAP (calota craniana — segmento esférico curvo)
 *  Construção: grade (u, v) mapeada em esfera parcial, com espessura.
 * ─────────────────────────────────────────────────────────────────── */

function buildCranialCap(sizeX: number, sizeY: number, thickness: number, segments: number): MeshData {
  const b = createBuilder()

  // Raio da esfera (empírico: calota real tem raio ~75-100 mm)
  const radius = Math.max(sizeX, sizeY) * 1.2
  const halfX = sizeX / 2
  const halfY = sizeY / 2

  // Ângulos de abertura (como grid uv em [-1,1]×[-1,1] projetado na esfera)
  const nu = segments, nv = Math.max(16, Math.floor(segments * halfY / halfX))

  const outerIdx: number[][] = []
  const innerIdx: number[][] = []

  for (let j = 0; j <= nv; j++) {
    outerIdx[j] = []
    innerIdx[j] = []
    const v = (j / nv) * 2 - 1  // -1..1
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1  // -1..1
      const x = u * halfX
      const y = v * halfY
      // Altura da calota: z = sqrt(R² - x² - y²) - sqrt(R² - halfMax²)
      const r2 = x * x + y * y
      const maxR2 = halfX * halfX + halfY * halfY
      const baseline = Math.sqrt(radius * radius - maxR2)
      const zOuter = Math.sqrt(Math.max(0, radius * radius - r2)) - baseline
      const zInner = zOuter - thickness

      outerIdx[j][i] = b.addVertex(x, y, zOuter)
      innerIdx[j][i] = b.addVertex(x, y, zInner)
    }
  }

  // Face externa (CCW visto de +Z)
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = outerIdx[j][i]
      const bv = outerIdx[j][i + 1]
      const c = outerIdx[j + 1][i + 1]
      const d = outerIdx[j + 1][i]
      b.addTriangle(a, bv, c)
      b.addTriangle(a, c, d)
    }
  }
  // Face interna (CCW visto de -Z)
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = innerIdx[j][i]
      const bv = innerIdx[j][i + 1]
      const c = innerIdx[j + 1][i + 1]
      const d = innerIdx[j + 1][i]
      b.addTriangle(a, c, bv)
      b.addTriangle(a, d, c)
    }
  }
  // Bordas laterais (perímetro)
  const closeStrip = (outer: number[], inner: number[]) => {
    for (let k = 0; k < outer.length - 1; k++) {
      b.addTriangle(outer[k], inner[k], inner[k + 1])
      b.addTriangle(outer[k], inner[k + 1], outer[k + 1])
    }
  }
  // Borda j=0 (frente)
  closeStrip(
    outerIdx[0].slice().reverse(),
    innerIdx[0].slice().reverse(),
  )
  // Borda j=nv (trás)
  closeStrip(outerIdx[nv], innerIdx[nv])
  // Borda i=0 (esquerda)
  closeStrip(
    outerIdx.map(row => row[0]),
    innerIdx.map(row => row[0]),
  )
  // Borda i=nu (direita)
  closeStrip(
    outerIdx.map(row => row[nu]).slice().reverse(),
    innerIdx.map(row => row[nu]).slice().reverse(),
  )

  return finalizeMesh(b, sizeX, sizeY, thickness * 2)
}

/* ─────────────────────────────────────────────────────────────────────
 * 5. MANDIBLE_SEG (segmento mandibular — arco com perfil ósseo)
 *  Construção: extrusão de perfil em "C" ao longo de arco curvo
 * ─────────────────────────────────────────────────────────────────── */

function buildMandibleSegment(sizeX: number, sizeY: number, sizeZ: number, segments: number): MeshData {
  const b = createBuilder()

  // Arco: 180° (meio círculo achatado — formato real da mandíbula)
  // sizeX = largura total; sizeY = espessura do osso; sizeZ = altura do corpo
  const arcLen = sizeX
  const arcRadius = arcLen / Math.PI  // meia-circunferência = arcLen
  const halfY = sizeY / 2
  const halfZ = sizeZ / 2

  const N = Math.max(16, segments)

  // Para cada ponto ao longo do arco, 4 vértices (perfil retangular)
  const vertsAtArc: Array<[number, number, number, number]> = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const theta = Math.PI * (1 - t)  // de π a 0 → arco de 180°
    const cx = Math.cos(theta) * arcRadius
    const cy = Math.sin(theta) * arcRadius  // "cresce" da origem

    // Direção tangente ao arco (pra orientar o perfil)
    const tx = -Math.sin(theta)
    const ty = Math.cos(theta)
    // Normal pro arco (apontando pra fora da curva)
    const nx = Math.cos(theta)
    const ny = Math.sin(theta)

    // 4 cantos do perfil retangular no plano local (n, Z):
    //  - (−nx·halfY, +Z)
    //  - (+nx·halfY, +Z)
    //  - (+nx·halfY, −Z)
    //  - (−nx·halfY, −Z)
    const outerTop = b.addVertex(cx + nx * halfY, cy + ny * halfY,  halfZ)
    const innerTop = b.addVertex(cx - nx * halfY, cy - ny * halfY,  halfZ)
    const innerBot = b.addVertex(cx - nx * halfY, cy - ny * halfY, -halfZ)
    const outerBot = b.addVertex(cx + nx * halfY, cy + ny * halfY, -halfZ)
    vertsAtArc.push([outerTop, innerTop, innerBot, outerBot])
    void tx; void ty  // silencia unused
  }

  // Conecta anéis consecutivos (4 faces laterais)
  for (let i = 0; i < N; i++) {
    const [a0, a1, a2, a3] = vertsAtArc[i]
    const [b0, b1, b2, b3] = vertsAtArc[i + 1]
    // Face externa (0→3)
    b.addTriangle(a0, b0, b3); b.addTriangle(a0, b3, a3)
    // Face interna (1→2)
    b.addTriangle(a1, a2, b2); b.addTriangle(a1, b2, b1)
    // Face top (0→1)
    b.addTriangle(a0, a1, b1); b.addTriangle(a0, b1, b0)
    // Face bottom (3→2)
    b.addTriangle(a3, b3, b2); b.addTriangle(a3, b2, a2)
  }

  // Tampas nas pontas (quad 0-1-2-3 do primeiro e último anel)
  const [fa, fb, fc, fd] = vertsAtArc[0]
  b.addTriangle(fa, fb, fc); b.addTriangle(fa, fc, fd)
  const [la, lb, lc, ld] = vertsAtArc[N]
  b.addTriangle(la, lc, lb); b.addTriangle(la, ld, lc)

  // Bounding real pode ser maior; usar overestimate pra bounds
  return finalizeMesh(b, sizeX, sizeY + arcRadius, sizeZ)
}

/* ─────────────────────────────────────────────────────────────────────
 * 6. FEMUR_SEG (segmento diafisário — cilindro com cortical/medular)
 *  Representação simplificada: cilindro OCO (tubo) + tampas anelares.
 *  Reproduz a estrutura real: cortical externo, canal medular dentro.
 * ─────────────────────────────────────────────────────────────────── */

function buildFemurSegment(radius: number, height: number, segments: number): MeshData {
  const b = createBuilder()
  const hz = height / 2
  const outerR = radius
  const innerR = radius * 0.45  // canal medular ~45% do raio externo

  const outerTop: number[] = [], outerBot: number[] = []
  const innerTop: number[] = [], innerBot: number[] = []

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI
    const cx = Math.cos(a), sy = Math.sin(a)
    outerTop.push(b.addVertex(cx * outerR, sy * outerR,  hz))
    outerBot.push(b.addVertex(cx * outerR, sy * outerR, -hz))
    innerTop.push(b.addVertex(cx * innerR, sy * innerR,  hz))
    innerBot.push(b.addVertex(cx * innerR, sy * innerR, -hz))
  }

  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments
    // Face externa
    b.addTriangle(outerTop[i], outerBot[i], outerBot[n])
    b.addTriangle(outerTop[i], outerBot[n], outerTop[n])
    // Face interna (inverter normal pra apontar pra dentro)
    b.addTriangle(innerTop[i], innerTop[n], innerBot[n])
    b.addTriangle(innerTop[i], innerBot[n], innerBot[i])
    // Tampa top (anel)
    b.addTriangle(outerTop[i], outerTop[n], innerTop[n])
    b.addTriangle(outerTop[i], innerTop[n], innerTop[i])
    // Tampa bottom (anel, orientação invertida)
    b.addTriangle(outerBot[i], innerBot[i], innerBot[n])
    b.addTriangle(outerBot[i], innerBot[n], outerBot[n])
  }

  return finalizeMesh(b, radius * 2, radius * 2, height)
}

/* ─────────────────────────────────────────────────────────────────────
 * 7. EAR_AURICLE (orelha externa simplificada)
 *  Construção: forma oval alongada + concavidade central (concha).
 *  Representação PARAMÉTRICA — não é anatomicamente perfeita, mas serve
 *  como base pra customização pelo cirurgião no CAD depois.
 * ─────────────────────────────────────────────────────────────────── */

function buildEarAuricle(sizeX: number, sizeY: number, sizeZ: number, segments: number): MeshData {
  const b = createBuilder()
  const halfX = sizeX / 2, halfY = sizeY / 2, halfZ = sizeZ / 2

  // Forma base: ellipsóide achatada com depressão no centro (concha)
  const nu = segments, nv = Math.max(32, segments)

  // Front faces
  const frontIdx: number[][] = []
  for (let j = 0; j <= nv; j++) {
    frontIdx[j] = []
    const v = (j / nv) * 2 - 1  // -1..1 (verticalish)
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1
      // Shape silhouette: oval alongada verticalmente
      const silX = Math.sqrt(Math.max(0, 1 - v * v * 0.85)) * u
      const silY = v
      // Fora da elipse → vértice colapsa pra borda (silhouette)
      const x = silX * halfX
      const y = silY * halfY
      // Z: espessura cheia na borda; concavidade no centro (concha)
      const r2 = u * u + v * v
      const depressionFactor = Math.max(0, 1 - r2 * 1.5)  // mais fundo no centro
      const z = halfZ * (1 - depressionFactor * 0.6)
      frontIdx[j][i] = b.addVertex(x, y, z)
    }
  }
  // Back faces (face plana contra a cabeça)
  const backIdx: number[][] = []
  for (let j = 0; j <= nv; j++) {
    backIdx[j] = []
    const v = (j / nv) * 2 - 1
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * 2 - 1
      const silX = Math.sqrt(Math.max(0, 1 - v * v * 0.85)) * u
      const silY = v
      const x = silX * halfX
      const y = silY * halfY
      backIdx[j][i] = b.addVertex(x, y, -halfZ)
    }
  }

  // Front mesh
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = frontIdx[j][i]
      const bv = frontIdx[j][i + 1]
      const c = frontIdx[j + 1][i + 1]
      const d = frontIdx[j + 1][i]
      b.addTriangle(a, bv, c)
      b.addTriangle(a, c, d)
    }
  }
  // Back mesh (orientação invertida)
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = backIdx[j][i]
      const bv = backIdx[j][i + 1]
      const c = backIdx[j + 1][i + 1]
      const d = backIdx[j + 1][i]
      b.addTriangle(a, c, bv)
      b.addTriangle(a, d, c)
    }
  }
  // Lateral de fechamento (borda da elipse)
  const closeRim = (idxA: number[], idxB: number[]) => {
    for (let k = 0; k < idxA.length - 1; k++) {
      b.addTriangle(idxA[k], idxB[k], idxB[k + 1])
      b.addTriangle(idxA[k], idxB[k + 1], idxA[k + 1])
    }
  }
  // Borda superior
  closeRim(frontIdx[0], backIdx[0])
  // Borda inferior
  closeRim(backIdx[nv], frontIdx[nv])
  // Lateral esquerda
  closeRim(backIdx.map(r => r[0]), frontIdx.map(r => r[0]))
  // Lateral direita
  closeRim(frontIdx.map(r => r[nu]), backIdx.map(r => r[nu]))

  return finalizeMesh(b, sizeX, sizeY, sizeZ)
}

/* ─────────────────────────────────────────────────────────────────────
 * 8. DISC (disco intervertebral — toróide achatado)
 *  Construção: elipse achatada em Z, com furo central (anular + núcleo)
 *  Representação simplificada do annulus fibrosus (anel sem núcleo).
 * ─────────────────────────────────────────────────────────────────── */

function buildIntervertebralDisc(rX: number, rY: number, thickness: number, segments: number): MeshData {
  const b = createBuilder()
  const hz = thickness / 2
  const innerFactor = 0.35  // furo central = 35% do raio

  const outerTop: number[] = [], outerBot: number[] = []
  const innerTop: number[] = [], innerBot: number[] = []

  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI
    const cx = Math.cos(a), sy = Math.sin(a)
    // Externo elíptico
    outerTop.push(b.addVertex(cx * rX, sy * rY,  hz))
    outerBot.push(b.addVertex(cx * rX, sy * rY, -hz))
    // Interno elíptico (furo)
    innerTop.push(b.addVertex(cx * rX * innerFactor, sy * rY * innerFactor,  hz))
    innerBot.push(b.addVertex(cx * rX * innerFactor, sy * rY * innerFactor, -hz))
  }

  for (let i = 0; i < segments; i++) {
    const n = (i + 1) % segments
    // Lateral externa
    b.addTriangle(outerTop[i], outerBot[i], outerBot[n])
    b.addTriangle(outerTop[i], outerBot[n], outerTop[n])
    // Lateral interna
    b.addTriangle(innerTop[i], innerTop[n], innerBot[n])
    b.addTriangle(innerTop[i], innerBot[n], innerBot[i])
    // Tampa top (anel)
    b.addTriangle(outerTop[i], outerTop[n], innerTop[n])
    b.addTriangle(outerTop[i], innerTop[n], innerTop[i])
    // Tampa bottom (anel)
    b.addTriangle(outerBot[i], innerBot[i], innerBot[n])
    b.addTriangle(outerBot[i], innerBot[n], outerBot[n])
  }

  return finalizeMesh(b, rX * 2, rY * 2, thickness)
}
