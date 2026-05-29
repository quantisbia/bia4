/**
 * BIA v4.2 — Mesh-based GeometryBounds (R12.49)
 *
 * Conecta o slicer triangulado real (binary-stl-parser + mesh-slicer)
 * ao motor de G-code do BIA (que espera a interface GeometryBounds).
 *
 * Antes: case "ear" usava elipse paramétrica com taper 1.0→0.85.
 *        G-code "não parecia orelha" porque era um cone achatado.
 *
 * Agora: lemos o STL real (4432 triângulos), fatiamos em Z, retornamos
 *        os polígonos exatos para cada camada.
 *
 * Cache: a malha parseada e fatiada fica em memória de processo.
 *        Uma orelha tem ~30 camadas × ~120 vértices = 3600 pontos.
 *        Cache hit = 0 ms; cache miss = ~20-50 ms (parse + N slices).
 */

import {
  parseBinaryStl,
  normalizeMesh,
  rotateMesh,
  scaleMesh,
  type ParsedMesh,
} from "./binary-stl-parser"
import {
  sliceMeshAtZ,
  offsetPolygon,
  type Vec2,
} from "./mesh-slicer"
import type { Polygon2D, BBox2D } from "../gcode/core/types"
import type { GeometryBounds } from "../gcode/slicer/geometry-bounds"

// ─── Cache em memória de processo ──────────────────────────────────────
// Vive enquanto a Worker está warm (no Cloudflare Pages: ~30 min idle).
// Tamanho típico: 5-10 meshes × 200 KB cada = 1-2 MB. Aceitável.
const meshCache = new Map<string, ParsedMesh>()
const slicedCache = new Map<string, Map<number, ReturnType<typeof sliceMeshAtZ>>>()

/**
 * Pré-processamento por arquivo: rotação + escala antes de normalizar.
 *
 * Aplica-se a STLs cujos eixos/unidades não estão no referencial esperado
 * pelo engine BIA (Z = eixo de impressão, milímetros).
 *
 *   - rotate: { axis, degrees }  — opcional
 *   - scale:  fator escalar      — opcional
 *
 * A ordem é: rotate → scale → normalize (centra XY, base em Z=0).
 */
export interface MeshPreprocess {
  rotate?: { axis: "x" | "y" | "z"; degrees: number }
  scale?: number
}

export const STL_PREPROCESS_MAP: Record<string, MeshPreprocess> = {
  // Orelha: já vem em mm, Z é eixo longo, base em Z=0 → sem transformação
  "ear-real.stl": {},

  // Nariz: vem com eixo longo em Y (25.51 mm) e altura Z=10mm
  // Para impressão Z = base→ponta, rotacionamos 90° em X (Y → Z)
  "nose-real.stl": {
    rotate: { axis: "x", degrees: 90 },
  },

  // Fêmur: vem em unidades muito pequenas (bbox 2.1 × 1.25 × 9.06)
  // Fêmur adulto real ~450 mm de comprimento → escala ~50× para virar
  // 105×62×453 mm aproximadamente.
  "femur-real.stl": {
    scale: 50,
  },

  // Rim (R12.51): bbox cru 38.6 × 19.7 × 12.7 mm com eixo longo em X.
  // Rim humano adulto: ~120 × 60 × 30 mm com eixo longo VERTICAL (Z).
  // Transformação: rotação 90° em Y (X → Z) + escala 3× para virar
  // ~116 × 38 × 59 mm (próximo do anatômico).
  "kidney-real.stl": {
    rotate: { axis: "y", degrees: 90 },
    scale: 3,
  },

  // Coração (R12.51): convertido de coracao.3mf (PrusaSlicer) → STL binário.
  // 447378 triângulos, bbox cru 28.83 × 34.11 × 35.97 mm. Z já é o eixo longo.
  // Coração adulto: ~120 × 100 × 100 mm → escala ~3× para virar ~86×102×108 mm.
  // (modelo era "Coracao maior 3.1" — escala próxima do tamanho biopsável real)
  "heart-real.stl": {
    scale: 3,
  },
}

/**
 * Lê e parseia uma mesh do diretório /public/stl, aplica pré-processamento
 * registrado em STL_PREPROCESS_MAP, e normaliza origem (centro XY + base Z=0).
 *
 * @param fileName ex: "ear-real.stl"
 * @param baseUrl URL absoluta (Cloudflare Pages serve estáticos no mesmo domínio)
 */
export async function loadMeshFromPublic(
  fileName: string,
  baseUrl: string,
): Promise<ParsedMesh> {
  const cacheKey = fileName
  const cached = meshCache.get(cacheKey)
  if (cached) return cached

  const url = `${baseUrl.replace(/\/$/, "")}/stl/${fileName}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Falha ao baixar ${url}: HTTP ${res.status}`)
  }
  const buf = await res.arrayBuffer()
  let mesh = parseBinaryStl(buf)

  // Pré-processamento (rotação, escala) específico do arquivo
  const preprocess = STL_PREPROCESS_MAP[fileName]
  if (preprocess?.rotate) {
    mesh = rotateMesh(mesh, preprocess.rotate.axis, preprocess.rotate.degrees)
  }
  if (preprocess?.scale && preprocess.scale !== 1) {
    mesh = scaleMesh(mesh, preprocess.scale)
  }

  const normalized = normalizeMesh(mesh)
  meshCache.set(cacheKey, normalized)
  return normalized
}

/**
 * Versão sync para uso em contexto onde a mesh já foi pré-carregada
 * (ex: bundle estático via require/import, ou tests com fs.readFileSync).
 * Aplica o mesmo pré-processamento de loadMeshFromPublic.
 */
export function registerMesh(name: string, mesh: ParsedMesh): void {
  let processed = mesh
  const preprocess = STL_PREPROCESS_MAP[name]
  if (preprocess?.rotate) {
    processed = rotateMesh(processed, preprocess.rotate.axis, preprocess.rotate.degrees)
  }
  if (preprocess?.scale && preprocess.scale !== 1) {
    processed = scaleMesh(processed, preprocess.scale)
  }
  meshCache.set(name, normalizeMesh(processed))
}

export function hasMesh(name: string): boolean {
  return meshCache.has(name)
}

export function getMesh(name: string): ParsedMesh | undefined {
  return meshCache.get(name)
}

/**
 * Retorna polígonos de uma camada Z para uma mesh já em cache.
 * Aplica subcache por (meshName, z) — slicing é O(triCount) por chamada.
 */
function getSliceCached(meshName: string, mesh: ParsedMesh, z: number) {
  let subcache = slicedCache.get(meshName)
  if (!subcache) {
    subcache = new Map()
    slicedCache.set(meshName, subcache)
  }
  // Quantiza Z em 0.01 mm para colisão de cache razoável
  const zKey = Math.round(z * 100) / 100
  const cached = subcache.get(zKey)
  if (cached) return cached

  const sliced = sliceMeshAtZ(mesh, zKey)
  subcache.set(zKey, sliced)
  return sliced
}

/**
 * Constrói um GeometryBounds a partir de uma mesh já em cache.
 * Aplica escala uniforme (mesh em mm é assumida).
 *
 * @param meshName nome no cache (ex: "ear-real.stl")
 * @param origin centro do XY no referencial do bed (cx, cy do bioprinter)
 * @param targetSize (opcional) força um bbox específico (W,H,D em mm); scaling uniforme aplicado
 */
export function geometryBoundsFromMesh(
  meshName: string,
  origin: { x: number; y: number } = { x: 0, y: 0 },
  targetSize?: { width?: number; depth?: number; height?: number },
): GeometryBounds {
  const mesh = meshCache.get(meshName)
  if (!mesh) {
    throw new Error(
      `Mesh "${meshName}" não está em cache. Chame loadMeshFromPublic() ou registerMesh() antes.`,
    )
  }

  const { minX, maxX, minY, maxY, minZ, maxZ } = mesh.bbox
  const meshW = maxX - minX
  const meshD = maxY - minY
  const meshH = maxZ - minZ

  // Escala uniforme: queremos preservar proporção. Se targetSize for fornecido,
  // calculamos o fator que faz a dimensão MAIS RESTRITIVA bater, mantendo razão.
  let scale = 1
  if (targetSize) {
    const candidates: number[] = []
    if (targetSize.width && meshW > 0) candidates.push(targetSize.width / meshW)
    if (targetSize.depth && meshD > 0) candidates.push(targetSize.depth / meshD)
    if (targetSize.height && meshH > 0) candidates.push(targetSize.height / meshH)
    if (candidates.length > 0) {
      // Usar a menor escala faz o objeto CABER no targetSize.
      // Usar a média preserva melhor a proporção quando usuário passa todos.
      scale = candidates.reduce((a, b) => a + b, 0) / candidates.length
    }
  }

  const scaledHeight = meshH * scale
  const cx = origin.x
  const cy = origin.y

  return {
    height_mm: scaledHeight,
    zMin: 0,
    zMax: scaledHeight,

    getBoundsAtZ(z: number): BBox2D {
      // Reverter escala para amostrar a mesh
      const zInMesh = z / scale
      const sliced = getSliceCached(meshName, mesh, zInMesh)
      if (sliced.polygons.length === 0) {
        // Fora da mesh — retorna ponto único (não geramos perímetros)
        return { minX: cx, maxX: cx, minY: cy, maxY: cy }
      }
      return {
        minX: cx + sliced.bbox.minX * scale,
        maxX: cx + sliced.bbox.maxX * scale,
        minY: cy + sliced.bbox.minY * scale,
        maxY: cy + sliced.bbox.maxY * scale,
      }
    },

    getPerimetersAtZ(z: number, walls: number, spacing: number): Polygon2D[] {
      const zInMesh = z / scale
      const sliced = getSliceCached(meshName, mesh, zInMesh)
      if (sliced.polygons.length === 0) return []

      const result: Polygon2D[] = []
      for (const poly of sliced.polygons) {
        // Transforma para o referencial do bed (translate + scale)
        const transformed: Vec2[] = poly.map((p) => ({
          x: cx + p.x * scale,
          y: cy + p.y * scale,
        }))

        for (let w = 0; w < walls; w++) {
          const offsetPoly = w === 0 ? transformed : offsetPolygon(transformed, w * spacing)
          if (offsetPoly.length >= 3) {
            result.push(offsetPoly)
          }
        }
      }
      return result
    },
  }
}

/**
 * Atalho: carrega + retorna GeometryBounds em uma chamada.
 */
export async function geometryBoundsFromPublicStl(
  fileName: string,
  baseUrl: string,
  origin: { x: number; y: number } = { x: 0, y: 0 },
  targetSize?: { width?: number; depth?: number; height?: number },
): Promise<GeometryBounds> {
  await loadMeshFromPublic(fileName, baseUrl)
  return geometryBoundsFromMesh(fileName, origin, targetSize)
}

/**
 * Limpa cache (útil para testes / hot reload).
 */
export function clearMeshCache(): void {
  meshCache.clear()
  slicedCache.clear()
}

// ─── Mapeamento geometryId → arquivo STL ───────────────────────────────
// Define quais geometrias do catálogo BIA têm um STL real associado.
// Pode crescer conforme você for fornecendo STLs.
export const STL_FILE_MAP: Record<string, string> = {
  ear: "ear-real.stl",          // R12.49 — 4432 tri, 28×47×15 mm
  nose: "nose-real.stl",        // R12.50 — 11974 tri, 16×10×25 mm (rotacionado 90° X)
  femur: "femur-real.stl",      // R12.50 — 118860 tri, 2×1×9 → 105×62×453 mm (escala 50×)
  kidney: "kidney-real.stl",    // R12.51 — 7960 tri, 39×20×13 → ~116×38×59 mm (rot 90° Y + escala 3×)
  heart: "heart-real.stl",      // R12.51 — 447378 tri (de 3MF), 29×34×36 → ~86×102×108 mm (escala 3×)
  // Placeholders — adicione quando você enviar os arquivos:
  // hand: "hand-real.stl",
  // R12.51: liver_anatomical REMOVIDA do catálogo a pedido da Janaina.
}

export function hasStlForGeometry(geomId: string): boolean {
  return geomId in STL_FILE_MAP
}

export function getStlFileForGeometry(geomId: string): string | undefined {
  return STL_FILE_MAP[geomId]
}
