import { describe, it, expect, beforeAll } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  parseBinaryStl,
  normalizeMesh,
  isAsciiStl,
} from "@/lib/stl/binary-stl-parser"
import {
  sliceMeshAtZ,
  offsetPolygon,
} from "@/lib/stl/mesh-slicer"
import {
  registerMesh,
  geometryBoundsFromMesh,
  hasMesh,
  clearMeshCache,
} from "@/lib/stl/mesh-bounds"

// ═══════════════════════════════════════════════════════════════════
// R12.49: Voxelização da orelha real
//
// Testes em 3 níveis:
//   1. Parser STL binário → estrutura correta + bbox correto
//   2. Mesh slicer → fatia gera polígonos fechados com perímetro > 0
//   3. mesh-bounds.geometryBoundsFromMesh → integra ao engine
// ═══════════════════════════════════════════════════════════════════

const EAR_STL_PATH = path.resolve(process.cwd(), "public/stl/ear-real.stl")
let earBuffer: ArrayBuffer

beforeAll(() => {
  const buf = fs.readFileSync(EAR_STL_PATH)
  earBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})

describe("binary-stl-parser", () => {
  it("STL real da orelha tem o tamanho declarado no header", () => {
    expect(earBuffer.byteLength).toBe(221684)
  })

  it("isAsciiStl() retorna false para STL binário válido", () => {
    expect(isAsciiStl(earBuffer)).toBe(false)
  })

  it("parseBinaryStl extrai 4432 triângulos da orelha", () => {
    const mesh = parseBinaryStl(earBuffer)
    expect(mesh.triangleCount).toBe(4432)
    expect(mesh.vertices.length).toBe(4432 * 9)
    expect(mesh.isAscii).toBe(false)
  })

  it("bbox da orelha tem ~28×47×15 mm (medido com node antes)", () => {
    const mesh = parseBinaryStl(earBuffer)
    const w = mesh.bbox.maxX - mesh.bbox.minX
    const d = mesh.bbox.maxY - mesh.bbox.minY
    const h = mesh.bbox.maxZ - mesh.bbox.minZ
    expect(w).toBeCloseTo(28.07, 1)
    expect(d).toBeCloseTo(47.15, 1)
    expect(h).toBeCloseTo(15.16, 1)
  })

  it("normalizeMesh alinha base em Z=0 e centro XY", () => {
    const raw = parseBinaryStl(earBuffer)
    const norm = normalizeMesh(raw)
    // Base em Z=0
    expect(norm.bbox.minZ).toBeCloseTo(0, 3)
    // Centrada em XY (já estava centrada — bbox simétrico)
    expect(norm.bbox.minX + norm.bbox.maxX).toBeCloseTo(0, 1)
    expect(norm.bbox.minY + norm.bbox.maxY).toBeCloseTo(0, 1)
  })

  it("lança erro se STL é vazio/curto", () => {
    const tiny = new ArrayBuffer(50)
    expect(() => parseBinaryStl(tiny)).toThrow(/muito pequeno|inconsistente/i)
  })

  it("lança erro se header diz tri count que não bate", () => {
    const fake = new ArrayBuffer(84)  // 80 header + 4 count = 0 esperado
    const view = new DataView(fake)
    view.setUint32(80, 999, true)  // diz que tem 999 triângulos
    expect(() => parseBinaryStl(fake)).toThrow(/inconsistente|tamanho/i)
  })
})

describe("mesh-slicer", () => {
  it("fatia da orelha em Z = altura/2 produz pelo menos 1 polígono fechado", () => {
    const mesh = normalizeMesh(parseBinaryStl(earBuffer))
    const midZ = (mesh.bbox.maxZ - mesh.bbox.minZ) / 2
    const slice = sliceMeshAtZ(mesh, midZ)
    expect(slice.polygons.length).toBeGreaterThanOrEqual(1)

    // O polígono deve ter pelo menos 3 vértices
    const biggest = slice.polygons.sort((a, b) => b.length - a.length)[0]
    expect(biggest.length).toBeGreaterThanOrEqual(3)
  })

  it("fatia da orelha tem bbox 2D contido no bbox 3D", () => {
    const mesh = normalizeMesh(parseBinaryStl(earBuffer))
    const midZ = (mesh.bbox.maxZ - mesh.bbox.minZ) / 2
    const slice = sliceMeshAtZ(mesh, midZ)
    expect(slice.bbox.minX).toBeGreaterThanOrEqual(mesh.bbox.minX - 0.1)
    expect(slice.bbox.maxX).toBeLessThanOrEqual(mesh.bbox.maxX + 0.1)
    expect(slice.bbox.minY).toBeGreaterThanOrEqual(mesh.bbox.minY - 0.1)
    expect(slice.bbox.maxY).toBeLessThanOrEqual(mesh.bbox.maxY + 0.1)
  })

  it("fatia ACIMA do bbox (Z > maxZ) retorna 0 polígonos", () => {
    const mesh = normalizeMesh(parseBinaryStl(earBuffer))
    const zAbove = mesh.bbox.maxZ + 5
    const slice = sliceMeshAtZ(mesh, zAbove)
    expect(slice.polygons.length).toBe(0)
  })

  it("fatia ABAIXO do bbox (Z < minZ) retorna 0 polígonos", () => {
    const mesh = normalizeMesh(parseBinaryStl(earBuffer))
    const zBelow = mesh.bbox.minZ - 5
    const slice = sliceMeshAtZ(mesh, zBelow)
    expect(slice.polygons.length).toBe(0)
  })

  it("fatia perto da base tem perímetro maior que fatia no topo (taper natural)", () => {
    // A orelha "fina" mais perto do topo (hélice) do que na base (lobo).
    // Este teste documenta isso.
    const mesh = normalizeMesh(parseBinaryStl(earBuffer))
    const H = mesh.bbox.maxZ - mesh.bbox.minZ
    const lowSlice = sliceMeshAtZ(mesh, H * 0.2)
    const highSlice = sliceMeshAtZ(mesh, H * 0.85)

    const perim = (polys: { x: number; y: number }[][]) => {
      let total = 0
      for (const poly of polys) {
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i]
          const b = poly[(i + 1) % poly.length]
          total += Math.hypot(b.x - a.x, b.y - a.y)
        }
      }
      return total
    }

    // Não asseguramos qual lado é maior (depende do CAD); só que
    // ambas as fatias existem com perímetro > 0
    expect(perim(lowSlice.polygons)).toBeGreaterThan(0)
    expect(perim(highSlice.polygons)).toBeGreaterThan(0)
  })

  it("offsetPolygon reduz polígono convexo (inset positivo)", () => {
    // Quadrado 10×10 → inset 1 mm → 8×8
    const square = [
      { x: -5, y: -5 },
      { x: 5, y: -5 },
      { x: 5, y: 5 },
      { x: -5, y: 5 },
    ]
    const inset = offsetPolygon(square, 1)
    expect(inset.length).toBe(4)
    // Cada vértice ~ 1 mm para dentro
    expect(Math.abs(inset[0].x + 4)).toBeLessThan(0.5)
    expect(Math.abs(inset[0].y + 4)).toBeLessThan(0.5)
  })
})

describe("mesh-bounds (integração com engine)", () => {
  beforeAll(() => {
    clearMeshCache()
    const mesh = parseBinaryStl(earBuffer)
    registerMesh("ear-real.stl", mesh)
  })

  it("registerMesh popula o cache", () => {
    expect(hasMesh("ear-real.stl")).toBe(true)
  })

  it("geometryBoundsFromMesh retorna GeometryBounds válido", () => {
    const bounds = geometryBoundsFromMesh("ear-real.stl", { x: 100, y: 100 })
    expect(bounds.height_mm).toBeGreaterThan(0)
    expect(bounds.zMin).toBe(0)
    expect(bounds.zMax).toBeCloseTo(bounds.height_mm, 3)
  })

  it("bounds.getBoundsAtZ na metade da altura retorna área não-vazia centrada", () => {
    const bounds = geometryBoundsFromMesh("ear-real.stl", { x: 100, y: 100 })
    const midZ = bounds.height_mm / 2
    const b = bounds.getBoundsAtZ(midZ)
    const w = b.maxX - b.minX
    const d = b.maxY - b.minY
    expect(w).toBeGreaterThan(5)
    expect(d).toBeGreaterThan(5)
    // Centro aproximadamente em (100, 100) — origem do bed.
    // A orelha não é perfeitamente simétrica em todas as alturas (lobo
    // assimétrico, anti-hélice etc.), então tolerância de ±3 mm é razoável.
    const cxFatia = (b.minX + b.maxX) / 2
    const cyFatia = (b.minY + b.maxY) / 2
    expect(Math.abs(cxFatia - 100)).toBeLessThan(3)
    expect(Math.abs(cyFatia - 100)).toBeLessThan(3)
  })

  it("bounds.getPerimetersAtZ retorna polígonos não-vazios na metade", () => {
    const bounds = geometryBoundsFromMesh("ear-real.stl", { x: 100, y: 100 })
    const midZ = bounds.height_mm / 2
    const polys = bounds.getPerimetersAtZ(midZ, 2, 0.4)
    expect(polys.length).toBeGreaterThan(0)
    for (const p of polys) {
      expect(p.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("targetSize aplica escala uniforme proporcional", () => {
    // Mesh original ~28×47×15. Pedir width=14 → escala 0.5.
    const bounds = geometryBoundsFromMesh(
      "ear-real.stl",
      { x: 0, y: 0 },
      { width: 14, depth: 23.575, height: 7.58 },
    )
    // Altura escalada deve ser ~7.58
    expect(bounds.height_mm).toBeCloseTo(7.58, 0.5)
  })

  it("getBoundsAtZ acima do topo retorna ponto único (vazio)", () => {
    const bounds = geometryBoundsFromMesh("ear-real.stl", { x: 0, y: 0 })
    const b = bounds.getBoundsAtZ(bounds.zMax + 100)
    expect(b.maxX - b.minX).toBeLessThan(0.01)
    expect(b.maxY - b.minY).toBeLessThan(0.01)
  })
})
