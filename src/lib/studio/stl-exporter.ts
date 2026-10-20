/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.3 · STL Exporter (binário)
 *  ─────────────────────────────────────────────────────────────────────
 *  Exporta um MeshData do engine TPMS para o formato STL binário padrão
 *  (universalmente aceito por bioimpressoras + slicers CELLINK/Allevi/
 *  BIOEDTECH/etc).
 *
 *  Especificação do STL binário (NASA/Lockheed, 1987):
 *   • 80 bytes de header (comentário, ignorado por readers)
 *   • 4 bytes LE: número de triângulos (uint32)
 *   • Para cada triângulo:
 *     - 12 bytes: normal (3 floats LE)
 *     - 36 bytes: vértices (9 floats LE)
 *     - 2 bytes: attribute byte count (uint16, geralmente 0)
 *
 *  Resultado: 50 bytes por triângulo + 84 bytes de cabeçalho.
 *
 *  Zero dependências — roda no browser, Node e edge runtime.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { MeshData } from "./tpms"

/** Tamanho fixo do cabeçalho + contagem em bytes. */
const STL_HEADER_BYTES = 80
const STL_COUNT_BYTES = 4
const STL_PRELUDE_BYTES = STL_HEADER_BYTES + STL_COUNT_BYTES

/** Tamanho fixo de cada triângulo em bytes. */
const STL_TRIANGLE_BYTES = 50

/**
 * Converte uma MeshData em um ArrayBuffer com o conteúdo STL binário.
 *
 * @param mesh dados da malha (vertices + indices)
 * @param headerComment comentário até 80 chars (vai no header, não afeta mesh)
 * @returns ArrayBuffer pronto para download/upload
 */
export function meshToSTLBinary(
  mesh: MeshData,
  headerComment: string = "BIA v4 Studio TPMS Scaffold",
): ArrayBuffer {
  const { vertices, indices } = mesh
  const triangleCount = indices.length / 3

  if (!Number.isInteger(triangleCount) || triangleCount < 0) {
    throw new Error(`Mesh inválido: indices.length=${indices.length} não é múltiplo de 3.`)
  }
  if (vertices.length % 3 !== 0) {
    throw new Error(`Mesh inválido: vertices.length=${vertices.length} não é múltiplo de 3.`)
  }

  const totalBytes = STL_PRELUDE_BYTES + triangleCount * STL_TRIANGLE_BYTES
  const buf = new ArrayBuffer(totalBytes)
  const view = new DataView(buf)

  // ── Header: 80 bytes com o comentário (truncado/pad com zeros) ──
  const headerBytes = new Uint8Array(buf, 0, STL_HEADER_BYTES)
  const encoder = new TextEncoder()
  const encoded = encoder.encode(headerComment)
  for (let i = 0; i < Math.min(encoded.length, STL_HEADER_BYTES); i++) {
    headerBytes[i] = encoded[i]
  }
  // Resto já é 0 por default do ArrayBuffer.

  // ── Contagem de triângulos (uint32 LE) ──
  view.setUint32(STL_HEADER_BYTES, triangleCount, true)

  // ── Triângulos ──
  let offset = STL_PRELUDE_BYTES
  for (let t = 0; t < triangleCount; t++) {
    const i0 = indices[t * 3]     * 3
    const i1 = indices[t * 3 + 1] * 3
    const i2 = indices[t * 3 + 2] * 3

    const ax = vertices[i0],     ay = vertices[i0 + 1], az = vertices[i0 + 2]
    const bx = vertices[i1],     by = vertices[i1 + 1], bz = vertices[i1 + 2]
    const cx = vertices[i2],     cy = vertices[i2 + 1], cz = vertices[i2 + 2]

    // Normal da face por produto vetorial
    const ex = bx - ax, ey = by - ay, ez = bz - az
    const fx = cx - ax, fy = cy - ay, fz = cz - az
    let nx = ey * fz - ez * fy
    let ny = ez * fx - ex * fz
    let nz = ex * fy - ey * fx
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len; ny /= len; nz /= len

    // Normal (12 bytes)
    view.setFloat32(offset,     nx, true); offset += 4
    view.setFloat32(offset,     ny, true); offset += 4
    view.setFloat32(offset,     nz, true); offset += 4

    // Vértice A (12 bytes)
    view.setFloat32(offset,     ax, true); offset += 4
    view.setFloat32(offset,     ay, true); offset += 4
    view.setFloat32(offset,     az, true); offset += 4

    // Vértice B (12 bytes)
    view.setFloat32(offset,     bx, true); offset += 4
    view.setFloat32(offset,     by, true); offset += 4
    view.setFloat32(offset,     bz, true); offset += 4

    // Vértice C (12 bytes)
    view.setFloat32(offset,     cx, true); offset += 4
    view.setFloat32(offset,     cy, true); offset += 4
    view.setFloat32(offset,     cz, true); offset += 4

    // Attribute byte count (uint16 = 0)
    view.setUint16(offset, 0, true); offset += 2
  }

  return buf
}

/**
 * Valida um buffer STL binário checando o layout mínimo.
 * Útil pra tests + feedback ao usuário.
 */
export function validateSTLBinary(buf: ArrayBuffer): { ok: true; triangleCount: number } | { ok: false; error: string } {
  if (buf.byteLength < STL_PRELUDE_BYTES) {
    return { ok: false, error: `STL muito pequeno (${buf.byteLength} bytes, mínimo ${STL_PRELUDE_BYTES}).` }
  }
  const view = new DataView(buf)
  const triangleCount = view.getUint32(STL_HEADER_BYTES, true)
  const expectedBytes = STL_PRELUDE_BYTES + triangleCount * STL_TRIANGLE_BYTES
  if (buf.byteLength !== expectedBytes) {
    return {
      ok: false,
      error: `STL inconsistente: contagem diz ${triangleCount} tri (${expectedBytes} bytes), mas buffer tem ${buf.byteLength} bytes.`,
    }
  }
  return { ok: true, triangleCount }
}

/**
 * Converte MeshData para STL ASCII (menos eficiente, só pra debug/inspeção).
 * Formato: texto puro UTF-8.
 */
export function meshToSTLAscii(mesh: MeshData, solidName: string = "bia_scaffold"): string {
  const { vertices, indices } = mesh
  const lines: string[] = [`solid ${solidName}`]
  const triangleCount = indices.length / 3

  for (let t = 0; t < triangleCount; t++) {
    const i0 = indices[t * 3]     * 3
    const i1 = indices[t * 3 + 1] * 3
    const i2 = indices[t * 3 + 2] * 3

    const ax = vertices[i0],     ay = vertices[i0 + 1], az = vertices[i0 + 2]
    const bx = vertices[i1],     by = vertices[i1 + 1], bz = vertices[i1 + 2]
    const cx = vertices[i2],     cy = vertices[i2 + 1], cz = vertices[i2 + 2]

    const ex = bx - ax, ey = by - ay, ez = bz - az
    const fx = cx - ax, fy = cy - ay, fz = cz - az
    let nx = ey * fz - ez * fy
    let ny = ez * fx - ex * fz
    let nz = ex * fy - ey * fx
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len; ny /= len; nz /= len

    lines.push(`  facet normal ${f(nx)} ${f(ny)} ${f(nz)}`)
    lines.push(`    outer loop`)
    lines.push(`      vertex ${f(ax)} ${f(ay)} ${f(az)}`)
    lines.push(`      vertex ${f(bx)} ${f(by)} ${f(bz)}`)
    lines.push(`      vertex ${f(cx)} ${f(cy)} ${f(cz)}`)
    lines.push(`    endloop`)
    lines.push(`  endfacet`)
  }

  lines.push(`endsolid ${solidName}`)
  return lines.join("\n")
}

function f(n: number): string {
  // Formato numérico STL ASCII: notação científica compacta
  return n.toExponential(6)
}

/** Tamanho em bytes de uma mesh após export STL binário. */
export function predictSTLSize(triangleCount: number): number {
  return STL_PRELUDE_BYTES + triangleCount * STL_TRIANGLE_BYTES
}
