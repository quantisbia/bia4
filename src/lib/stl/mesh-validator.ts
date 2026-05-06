/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 — Validador e Analisador de Mesh STL
 *  ───────────────────────────────────────────────────────────────────────
 *  Validações topológicas e métricas geométricas para garantir que o mesh
 *  gerado seja imprimível em bioimpressoras profissionais.
 *
 *  Ele responde 5 perguntas críticas:
 *    1. O mesh é manifold? (toda aresta está em exatamente 2 triângulos)
 *    2. O mesh é watertight? (sem buracos)
 *    3. As normais estão orientadas para fora? (consistência)
 *    4. Quais são as dimensões reais do mesh? (BBox, volume, área)
 *    5. Há paredes finas que vão falhar na impressão? (thin-wall detection)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { Triangle, Vec3 } from "./generator"

// ─────────────────────────────────────────────────────────────────────────
// TIPOS PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────

export interface BoundingBox {
  min: Vec3
  max: Vec3
  size: Vec3       // max - min
  center: Vec3     // (min+max)/2
}

export interface MeshStats {
  triangleCount: number
  uniqueVertexCount: number
  edgeCount: number
  bbox: BoundingBox
  surfaceAreaMm2: number
  volumeMm3: number
  /** True se cada aresta interna pertence a exatamente 2 triângulos */
  isManifold: boolean
  /** True se não há arestas-fronteira (watertight) */
  isWatertight: boolean
  /** True se todas as normais apontam para fora (volume positivo) */
  hasConsistentNormals: boolean
  /** Número de arestas que pertencem a mais de 2 triângulos (não-manifold) */
  nonManifoldEdges: number
  /** Número de arestas-fronteira (buracos no mesh) */
  boundaryEdges: number
  /** Aresta mais curta (mm) — paredes finas se < 0.4 mm */
  minEdgeLengthMm: number
  /** Aresta mais longa (mm) */
  maxEdgeLengthMm: number
  /** Aresta média (mm) */
  avgEdgeLengthMm: number
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info"
  code: string
  title: string
  detail: string
  /** Sugestão de remediação para o usuário */
  suggestion: string
}

export interface ValidationReport {
  stats: MeshStats
  issues: ValidationIssue[]
  /** Score de qualidade global (0-100). 100 = perfeito para impressão */
  qualityScore: number
  /** Pode imprimir sem reparos? */
  printable: boolean
}

// ─────────────────────────────────────────────────────────────────────────
// CALCULADORAS GEOMÉTRICAS
// ─────────────────────────────────────────────────────────────────────────

/** Bounding box do mesh */
export function computeBoundingBox(triangles: Triangle[]): BoundingBox {
  if (triangles.length === 0) {
    return { min: [0,0,0], max: [0,0,0], size: [0,0,0], center: [0,0,0] }
  }
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const t of triangles) {
    for (const v of [t.v1, t.v2, t.v3]) {
      if (v[0] < min[0]) min[0] = v[0]
      if (v[1] < min[1]) min[1] = v[1]
      if (v[2] < min[2]) min[2] = v[2]
      if (v[0] > max[0]) max[0] = v[0]
      if (v[1] > max[1]) max[1] = v[1]
      if (v[2] > max[2]) max[2] = v[2]
    }
  }
  return {
    min, max,
    size: [max[0]-min[0], max[1]-min[1], max[2]-min[2]],
    center: [(min[0]+max[0])/2, (min[1]+max[1])/2, (min[2]+max[2])/2],
  }
}

/** Área de um triângulo via metade do produto vetorial */
function triangleArea(t: Triangle): number {
  const ax = t.v2[0]-t.v1[0], ay = t.v2[1]-t.v1[1], az = t.v2[2]-t.v1[2]
  const bx = t.v3[0]-t.v1[0], by = t.v3[1]-t.v1[1], bz = t.v3[2]-t.v1[2]
  const cx = ay*bz - az*by
  const cy = az*bx - ax*bz
  const cz = ax*by - ay*bx
  return 0.5 * Math.sqrt(cx*cx + cy*cy + cz*cz)
}

/** Área superficial total */
export function computeSurfaceArea(triangles: Triangle[]): number {
  let total = 0
  for (const t of triangles) total += triangleArea(t)
  return total
}

/** Volume via teorema do divergente (signed sum of tetrahedra) */
export function computeVolume(triangles: Triangle[]): number {
  let v = 0
  for (const t of triangles) {
    // V = 1/6 * v1 · (v2 × v3)
    const x1 = t.v1[0], y1 = t.v1[1], z1 = t.v1[2]
    const x2 = t.v2[0], y2 = t.v2[1], z2 = t.v2[2]
    const x3 = t.v3[0], y3 = t.v3[1], z3 = t.v3[2]
    v += (x1*(y2*z3 - y3*z2) - y1*(x2*z3 - x3*z2) + z1*(x2*y3 - x3*y2)) / 6.0
  }
  return Math.abs(v)
}

/** Comprimento de uma aresta */
function edgeLength(a: Vec3, b: Vec3): number {
  return Math.sqrt(
    (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TOPOLOGIA — CONTAGEM DE ARESTAS
// ─────────────────────────────────────────────────────────────────────────

const VERTEX_PRECISION = 1e-4    // mm — agrupar vértices idênticos com tolerância

function vKey(v: Vec3): string {
  return `${Math.round(v[0]/VERTEX_PRECISION)},${Math.round(v[1]/VERTEX_PRECISION)},${Math.round(v[2]/VERTEX_PRECISION)}`
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Analisa toda a topologia do mesh.
 * Retorna contagem de vértices únicos, arestas únicas, arestas-fronteira
 * (que aparecem só em 1 triângulo), e arestas não-manifold (em >2 triângulos).
 */
export function analyzeTopology(triangles: Triangle[]): {
  uniqueVertexCount: number
  edgeCount: number
  boundaryEdges: number
  nonManifoldEdges: number
  minEdgeLengthMm: number
  maxEdgeLengthMm: number
  avgEdgeLengthMm: number
} {
  const vertexSet = new Set<string>()
  const edgeCounts = new Map<string, number>()
  const edgeLens = new Map<string, number>()

  for (const t of triangles) {
    const k1 = vKey(t.v1), k2 = vKey(t.v2), k3 = vKey(t.v3)
    vertexSet.add(k1); vertexSet.add(k2); vertexSet.add(k3)

    const edges: [string, string, Vec3, Vec3][] = [
      [k1, k2, t.v1, t.v2],
      [k2, k3, t.v2, t.v3],
      [k3, k1, t.v3, t.v1],
    ]
    for (const [a, b, va, vb] of edges) {
      if (a === b) continue   // aresta degenerada
      const k = edgeKey(a, b)
      edgeCounts.set(k, (edgeCounts.get(k) ?? 0) + 1)
      if (!edgeLens.has(k)) edgeLens.set(k, edgeLength(va, vb))
    }
  }

  let boundary = 0
  let nonManifold = 0
  let minLen = Infinity, maxLen = 0, sumLen = 0, count = 0
  edgeCounts.forEach((c, k) => {
    if (c === 1) boundary++
    else if (c > 2) nonManifold++
    const len = edgeLens.get(k) ?? 0
    if (len < minLen) minLen = len
    if (len > maxLen) maxLen = len
    sumLen += len
    count++
  })

  return {
    uniqueVertexCount: vertexSet.size,
    edgeCount: edgeCounts.size,
    boundaryEdges: boundary,
    nonManifoldEdges: nonManifold,
    minEdgeLengthMm: count > 0 ? minLen : 0,
    maxEdgeLengthMm: maxLen,
    avgEdgeLengthMm: count > 0 ? sumLen / count : 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// API PRINCIPAL — STATS COMPLETO
// ─────────────────────────────────────────────────────────────────────────

export function computeMeshStats(triangles: Triangle[]): MeshStats {
  const bbox = computeBoundingBox(triangles)
  const surfaceArea = computeSurfaceArea(triangles)
  const volume = computeVolume(triangles)
  const topo = analyzeTopology(triangles)

  // Manifold = sem arestas-fronteira nem >2 triângulos por aresta
  const isManifold = topo.nonManifoldEdges === 0 && topo.boundaryEdges === 0
  const isWatertight = topo.boundaryEdges === 0
  // Volume positivo via divergente assinado indica normais consistentes
  // Calculamos volume signed (sem abs) para ter o sinal:
  let signedVol = 0
  for (const t of triangles) {
    const x1 = t.v1[0], y1 = t.v1[1], z1 = t.v1[2]
    const x2 = t.v2[0], y2 = t.v2[1], z2 = t.v2[2]
    const x3 = t.v3[0], y3 = t.v3[1], z3 = t.v3[2]
    signedVol += (x1*(y2*z3 - y3*z2) - y1*(x2*z3 - x3*z2) + z1*(x2*y3 - x3*y2)) / 6.0
  }
  const hasConsistentNormals = signedVol > 0   // outward normals → positive volume

  return {
    triangleCount: triangles.length,
    uniqueVertexCount: topo.uniqueVertexCount,
    edgeCount: topo.edgeCount,
    bbox,
    surfaceAreaMm2: surfaceArea,
    volumeMm3: volume,
    isManifold,
    isWatertight,
    hasConsistentNormals,
    nonManifoldEdges: topo.nonManifoldEdges,
    boundaryEdges: topo.boundaryEdges,
    minEdgeLengthMm: topo.minEdgeLengthMm,
    maxEdgeLengthMm: topo.maxEdgeLengthMm,
    avgEdgeLengthMm: topo.avgEdgeLengthMm,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// VALIDAÇÃO COMPLETA — RETORNA ISSUES + SCORE
// ─────────────────────────────────────────────────────────────────────────

export interface ValidationConfig {
  /** Diâmetro do bico (mm) — paredes < 1× bico geralmente falham */
  nozzleDiameterMm?: number
  /** Tipo de aplicação para sugestões contextuais */
  application?: "bioprinting" | "fdm" | "research"
}

export function validateMesh(
  triangles: Triangle[],
  config: ValidationConfig = {}
): ValidationReport {
  const stats = computeMeshStats(triangles)
  const issues: ValidationIssue[] = []
  const nozzle = config.nozzleDiameterMm ?? 0.4   // padrão bioink: 0.4 mm

  // ── 1. Mesh vazio
  if (stats.triangleCount === 0) {
    issues.push({
      severity: "error",
      code: "EMPTY_MESH",
      title: "Mesh sem triângulos",
      detail: "A geometria não foi gerada corretamente.",
      suggestion: "Ajuste os parâmetros (ex: aumente raio, espessura ou segmentos) e gere de novo.",
    })
  }

  // ── 2. Manifold
  if (stats.nonManifoldEdges > 0) {
    issues.push({
      severity: "error",
      code: "NON_MANIFOLD",
      title: `${stats.nonManifoldEdges} aresta(s) não-manifold`,
      detail: "Algumas arestas são compartilhadas por mais de 2 triângulos. Isso quebra slicers como Cura/PrusaSlicer.",
      suggestion: "Importe no MeshLab e use 'Filters → Cleaning → Remove Non-Manifold Edges'. Ou regenere com mais segmentos.",
    })
  }

  // ── 3. Watertight
  if (stats.boundaryEdges > 0) {
    issues.push({
      severity: "error",
      code: "NOT_WATERTIGHT",
      title: `${stats.boundaryEdges} aresta(s)-fronteira detectadas`,
      detail: "O mesh tem buracos. Slicers vão produzir caminhos de extrusão errados.",
      suggestion: "Em geometrias com poros internos isso é esperado. Para impressão, use Meshmixer 'Inspector' para tapar buracos automaticamente.",
    })
  }

  // ── 4. Normais consistentes
  if (!stats.hasConsistentNormals && stats.boundaryEdges === 0) {
    issues.push({
      severity: "warning",
      code: "INVERTED_NORMALS",
      title: "Normais possivelmente invertidas",
      detail: "O volume calculado tem sinal negativo. Algumas faces podem estar viradas para dentro.",
      suggestion: "Em MeshLab: 'Filters → Normals → Re-Orient all faces coherently'.",
    })
  }

  // ── 5. Paredes finas
  if (stats.minEdgeLengthMm > 0 && stats.minEdgeLengthMm < nozzle * 0.5) {
    issues.push({
      severity: "warning",
      code: "THIN_WALLS",
      title: `Aresta mínima muito pequena (${stats.minEdgeLengthMm.toFixed(3)} mm)`,
      detail: `Detalhes finos abaixo de ½ × Ø do bico (${(nozzle*0.5).toFixed(2)} mm) podem ser ignorados ou colapsar.`,
      suggestion: `Aumente segmentos ou simplifique. Para impressão com bico ${nozzle.toFixed(2)} mm, reduza a resolução das curvas.`,
    })
  }

  // ── 6. BBox razoável
  const maxDim = Math.max(stats.bbox.size[0], stats.bbox.size[1], stats.bbox.size[2])
  if (maxDim > 200) {
    issues.push({
      severity: "warning",
      code: "TOO_LARGE",
      title: `Geometria grande (${maxDim.toFixed(1)} mm)`,
      detail: "A maioria das bioimpressoras tem volume ≤ 130×90×60 mm.",
      suggestion: "Reduza dimensões nos parâmetros ou divida em peças menores no Meshmixer.",
    })
  }
  if (maxDim < 1) {
    issues.push({
      severity: "warning",
      code: "TOO_SMALL",
      title: `Geometria muito pequena (${maxDim.toFixed(2)} mm)`,
      detail: "Pode ser difícil de extrudar ou manipular pós-impressão.",
      suggestion: "Aumente os parâmetros dimensionais.",
    })
  }

  // ── 7. Triângulos suficientes
  if (stats.triangleCount > 0 && stats.triangleCount < 50) {
    issues.push({
      severity: "info",
      code: "LOW_RESOLUTION",
      title: `Apenas ${stats.triangleCount} triângulos`,
      detail: "Curvas vão parecer poligonais.",
      suggestion: "Aumente segmentos para resolução mais lisa.",
    })
  }
  if (stats.triangleCount > 100_000) {
    issues.push({
      severity: "info",
      code: "HIGH_TRIANGLE_COUNT",
      title: `${stats.triangleCount.toLocaleString()} triângulos`,
      detail: "Arquivo grande — slicers podem ficar lentos.",
      suggestion: "Reduza segmentos ou use 'Quadric Edge Collapse Decimation' no MeshLab.",
    })
  }

  // ── 8. Volume e área
  if (stats.volumeMm3 < 1 && stats.triangleCount > 0) {
    issues.push({
      severity: "info",
      code: "VERY_LOW_VOLUME",
      title: "Volume muito baixo (<1 mm³)",
      detail: "A geometria pode ser quase uma superfície sem espessura suficiente.",
      suggestion: "Verifique se há espessura/profundidade configurada.",
    })
  }

  // ── Score de qualidade
  let score = 100
  for (const issue of issues) {
    if (issue.severity === "error") score -= 30
    else if (issue.severity === "warning") score -= 10
    else if (issue.severity === "info") score -= 3
  }
  score = Math.max(0, Math.min(100, score))
  const printable = !issues.some(i => i.severity === "error")

  return { stats, issues, qualityScore: score, printable }
}

// ─────────────────────────────────────────────────────────────────────────
// FORMATAÇÃO HUMANA
// ─────────────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(2)} MB`
}

export function formatVolume(mm3: number): string {
  if (mm3 < 1000) return `${mm3.toFixed(1)} mm³`
  return `${(mm3/1000).toFixed(2)} cm³`
}

export function formatArea(mm2: number): string {
  if (mm2 < 100) return `${mm2.toFixed(1)} mm²`
  return `${(mm2/100).toFixed(2)} cm²`
}
