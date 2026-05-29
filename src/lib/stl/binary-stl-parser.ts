/**
 * BIA v4.2 — Binary STL Parser
 *
 * Formato STL binário (Wikipedia/Wikipedia spec):
 *   - 80 bytes  : header (texto livre, normalmente vazio/lixo)
 *   - 4 bytes   : uint32 LE = número de triângulos
 *   - N × 50 bytes :
 *       12 bytes : normal (3 × float32 LE)  — ignorada (recomputamos)
 *       36 bytes : 3 vértices (9 × float32 LE)
 *       2 bytes  : attribute byte count (geralmente 0)
 *
 * Saída: arrays planos Float32Array (eficiente para cache + slicing).
 *
 * Por que NÃO usar three.js STLLoader aqui:
 *   - Engine roda server-side (Edge/Node) sem WebGL
 *   - Queremos zero dependência externa
 *   - Precisamos do dado bruto (sem buffer geometry) pra fatiar
 */

export interface Triangle {
  /** v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z */
  vertices: Float32Array  // length 9
}

export interface ParsedMesh {
  /** Float32Array de comprimento triangleCount × 9 (xyz × 3 vertices) */
  vertices: Float32Array
  triangleCount: number
  bbox: {
    minX: number; maxX: number
    minY: number; maxY: number
    minZ: number; maxZ: number
  }
  /** True se o parser detectou STL ASCII (não suportado nesta versão) */
  isAscii: boolean
}

const HEADER_BYTES = 80
const COUNT_BYTES = 4
const TRI_BYTES = 50  // 12 normal + 36 vertices + 2 attr

/**
 * Detecta se um buffer é STL ASCII.
 * STL ASCII começa com "solid " e não tem tamanho binário esperado.
 */
export function isAsciiStl(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < HEADER_BYTES + COUNT_BYTES) return false
  const view = new DataView(buffer)
  const triCount = view.getUint32(HEADER_BYTES, true)
  const expectedBinarySize = HEADER_BYTES + COUNT_BYTES + triCount * TRI_BYTES
  if (expectedBinarySize === buffer.byteLength) return false  // é binário válido

  // Não é binário — checar prefixo "solid "
  const first6 = new Uint8Array(buffer, 0, 6)
  const prefix = String.fromCharCode(...Array.from(first6))
  return prefix.toLowerCase().startsWith("solid ")
}

/**
 * Parse STL binário → ParsedMesh.
 *
 * @throws Error se o buffer não for STL binário válido
 */
export function parseBinaryStl(buffer: ArrayBuffer): ParsedMesh {
  if (buffer.byteLength < HEADER_BYTES + COUNT_BYTES) {
    throw new Error(`STL muito pequeno (${buffer.byteLength} bytes; mínimo ${HEADER_BYTES + COUNT_BYTES})`)
  }

  const view = new DataView(buffer)
  const triCount = view.getUint32(HEADER_BYTES, true)
  const expectedSize = HEADER_BYTES + COUNT_BYTES + triCount * TRI_BYTES

  if (expectedSize !== buffer.byteLength) {
    if (isAsciiStl(buffer)) {
      throw new Error(
        `STL ASCII detectado (${buffer.byteLength} bytes). Esta versão suporta apenas STL binário. ` +
        `Reconverta com Meshmixer/Blender/PrusaSlicer salvando como "STL Binary".`
      )
    }
    throw new Error(
      `Tamanho de STL inconsistente: header diz ${triCount} triângulos (esperava ${expectedSize} bytes), ` +
      `arquivo tem ${buffer.byteLength} bytes.`
    )
  }

  if (triCount === 0) {
    throw new Error("STL vazio (0 triângulos)")
  }
  if (triCount > 5_000_000) {
    throw new Error(`STL excessivamente grande (${triCount} triângulos). Limite atual: 5M.`)
  }

  // Aloca array plano
  const vertices = new Float32Array(triCount * 9)

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  let writeIdx = 0
  for (let i = 0; i < triCount; i++) {
    const triStart = HEADER_BYTES + COUNT_BYTES + i * TRI_BYTES
    // Pula 12 bytes da normal
    const vStart = triStart + 12
    for (let v = 0; v < 3; v++) {
      const x = view.getFloat32(vStart + v * 12 + 0, true)
      const y = view.getFloat32(vStart + v * 12 + 4, true)
      const z = view.getFloat32(vStart + v * 12 + 8, true)

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        throw new Error(`Triângulo ${i} contém coordenadas NaN/Infinity no vértice ${v}`)
      }

      vertices[writeIdx++] = x
      vertices[writeIdx++] = y
      vertices[writeIdx++] = z

      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (z < minZ) minZ = z
      if (z > maxZ) maxZ = z
    }
  }

  return {
    vertices,
    triangleCount: triCount,
    bbox: { minX, maxX, minY, maxY, minZ, maxZ },
    isAscii: false,
  }
}

/**
 * Helper de transformação: aplica translate(dx,dy,dz) + uniform scale.
 * Usado para normalizar uma mesh (ex: alinhar base em Z=0, centralizar XY).
 */
export function transformMesh(
  mesh: ParsedMesh,
  opts: { translate?: { x: number; y: number; z: number }; scale?: number },
): ParsedMesh {
  const dx = opts.translate?.x ?? 0
  const dy = opts.translate?.y ?? 0
  const dz = opts.translate?.z ?? 0
  const s = opts.scale ?? 1

  if (dx === 0 && dy === 0 && dz === 0 && s === 1) return mesh

  const v = new Float32Array(mesh.vertices.length)
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = (mesh.vertices[i + 0] + dx) * s
    const y = (mesh.vertices[i + 1] + dy) * s
    const z = (mesh.vertices[i + 2] + dz) * s
    v[i + 0] = x
    v[i + 1] = y
    v[i + 2] = z
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }

  return {
    vertices: v,
    triangleCount: mesh.triangleCount,
    bbox: { minX, maxX, minY, maxY, minZ, maxZ },
    isAscii: false,
  }
}

/**
 * Centraliza a mesh no eixo XY e alinha a base em Z=0.
 * Útil para garantir que o slicer comece do zero independente
 * do referencial do CAD original.
 */
export function normalizeMesh(mesh: ParsedMesh): ParsedMesh {
  const cx = (mesh.bbox.minX + mesh.bbox.maxX) / 2
  const cy = (mesh.bbox.minY + mesh.bbox.maxY) / 2
  const zBase = mesh.bbox.minZ
  return transformMesh(mesh, { translate: { x: -cx, y: -cy, z: -zBase } })
}

/**
 * Rotaciona a mesh em torno de um eixo (X, Y ou Z) por ângulo em graus.
 * Útil para reorientar STLs cujo eixo longo NÃO é Z (eixo de impressão).
 *
 * Ex: nariz com eixo longo em Y → rotateMesh(mesh, "x", 90) faz Y → Z.
 *
 * Convenção: ângulos positivos seguem regra da mão direita.
 */
export function rotateMesh(
  mesh: ParsedMesh,
  axis: "x" | "y" | "z",
  degrees: number,
): ParsedMesh {
  if (degrees === 0) return mesh
  const rad = (degrees * Math.PI) / 180
  const c = Math.cos(rad)
  const s = Math.sin(rad)

  const v = new Float32Array(mesh.vertices.length)
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = mesh.vertices[i + 0]
    const y = mesh.vertices[i + 1]
    const z = mesh.vertices[i + 2]
    let nx = x, ny = y, nz = z
    if (axis === "x") {
      // X fixo, Y/Z rotacionam
      ny = c * y - s * z
      nz = s * y + c * z
    } else if (axis === "y") {
      // Y fixo, Z/X rotacionam
      nz = c * z - s * x
      nx = s * z + c * x
    } else {
      // Z fixo, X/Y rotacionam
      nx = c * x - s * y
      ny = s * x + c * y
    }
    v[i + 0] = nx
    v[i + 1] = ny
    v[i + 2] = nz
    if (nx < minX) minX = nx
    if (nx > maxX) maxX = nx
    if (ny < minY) minY = ny
    if (ny > maxY) maxY = ny
    if (nz < minZ) minZ = nz
    if (nz > maxZ) maxZ = nz
  }

  return {
    vertices: v,
    triangleCount: mesh.triangleCount,
    bbox: { minX, maxX, minY, maxY, minZ, maxZ },
    isAscii: false,
  }
}

/**
 * Escala uniforme da mesh por um fator. Aplica em todos os vértices.
 * Útil para STLs que vieram em unidades não-mm (metros, cm, etc.).
 */
export function scaleMesh(mesh: ParsedMesh, factor: number): ParsedMesh {
  if (factor === 1) return mesh
  return transformMesh(mesh, { scale: factor })
}
