/**
 * BIA v4 — Mesh utilities (R12.42)
 *
 * Helpers compartilhados para carregar meshes STL reais com:
 *   1. Centralização XY no origem (subtrai o centro do bounding box)
 *   2. Z apoiado em 0 (base do mesh em Z=0)
 *   3. Escala anisotrópica para dimensões alvo do usuário
 *
 * Usado pelos novos cases (R12.42): disk, lens, hexagonal_liver,
 * skin_cylinder, test_star — meshes fornecidas com offset que precisa
 * ser normalizado antes do scaling.
 */

import type { Triangle, Vec3 } from "../generator"

// Calcula a normal de um triângulo a partir dos 3 vértices (orientação CCW)
function triNormalLocal(v1: Vec3, v2: Vec3, v3: Vec3): Vec3 {
  const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2]
  const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2]
  const nx = ay * bz - az * by
  const ny = az * bx - ax * bz
  const nz = ax * by - ay * bx
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

function triLocal(v1: Vec3, v2: Vec3, v3: Vec3): Triangle {
  return { normal: triNormalLocal(v1, v2, v3), v1, v2, v3 }
}

export interface MeshNativeDims {
  width: number   // X range
  depth: number   // Y range
  height: number  // Z range
  minX: number
  minY: number
  minZ: number
  triangleCount: number
}

/**
 * Carrega uma mesh, centraliza em XY, alinha base Z=0, e escala anisotropicamente.
 *
 * Pipeline aplicado a cada vértice:
 *   1. Translada: (x - cx_native, y - cy_native, z - minZ_native)
 *      onde cx_native = minX + width/2 e cy_native = minY + depth/2
 *   2. Escala: (sx, sy, sz) = (targetWidth/width, targetDepth/depth, targetHeight/height)
 *
 * Resultado: mesh centralizada em (0,0) em XY, com base em Z=0 e dimensões
 * exatamente iguais às solicitadas pelo usuário.
 *
 * @param verts buffer flat de 9 floats por triângulo
 * @param native dimensões nativas + bounding box (minX/Y/Z) do STL original
 * @param targetWidth largura alvo (mm) — eixo X
 * @param targetDepth profundidade alvo (mm) — eixo Y
 * @param targetHeight altura alvo (mm) — eixo Z
 */
export function loadCenteredScaledMesh(
  verts: readonly number[],
  native: MeshNativeDims,
  targetWidth: number,
  targetDepth: number,
  targetHeight: number,
): Triangle[] {
  // Centro do bbox nativo em XY (Z fica apoiado em 0 — base na placa de impressão)
  const cxNative = native.minX + native.width / 2
  const cyNative = native.minY + native.depth / 2
  const zOffsetNative = native.minZ

  // Fatores de escala anisotrópica
  const sx = targetWidth / native.width
  const sy = targetDepth / native.depth
  const sz = targetHeight / native.height

  const n = verts.length / 9
  const tris: Triangle[] = new Array(n)

  for (let i = 0; i < n; i++) {
    const k = i * 9
    const v1: Vec3 = [
      (verts[k]     - cxNative) * sx,
      (verts[k + 1] - cyNative) * sy,
      (verts[k + 2] - zOffsetNative) * sz,
    ]
    const v2: Vec3 = [
      (verts[k + 3] - cxNative) * sx,
      (verts[k + 4] - cyNative) * sy,
      (verts[k + 5] - zOffsetNative) * sz,
    ]
    const v3: Vec3 = [
      (verts[k + 6] - cxNative) * sx,
      (verts[k + 7] - cyNative) * sy,
      (verts[k + 8] - zOffsetNative) * sz,
    ]
    tris[i] = triLocal(v1, v2, v3)
  }

  return tris
}
