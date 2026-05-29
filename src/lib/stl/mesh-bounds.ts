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
 * Lê e parseia uma mesh do diretório /public/stl, normalizando origem.
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
  const raw = parseBinaryStl(buf)
  const normalized = normalizeMesh(raw)

  meshCache.set(cacheKey, normalized)
  return normalized
}

/**
 * Versão sync para uso em contexto onde a mesh já foi pré-carregada
 * (ex: bundle estático via require/import). Mantém compatibilidade
 * com src/lib/stl/meshes/ear-mesh-data.ts existente, caso queira.
 */
export function registerMesh(name: string, mesh: ParsedMesh): void {
  meshCache.set(name, normalizeMesh(mesh))
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
  ear: "ear-real.stl",
  // R12.49 placeholders — adicione quando você enviar os arquivos:
  // heart: "heart-real.stl",
  // kidney: "kidney-real.stl",
  // liver_anatomical: "liver-real.stl",
  // nose: "nose-real.stl",
  // hand: "hand-real.stl",
}

export function hasStlForGeometry(geomId: string): boolean {
  return geomId in STL_FILE_MAP
}

export function getStlFileForGeometry(geomId: string): string | undefined {
  return STL_FILE_MAP[geomId]
}
