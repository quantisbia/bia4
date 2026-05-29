import { describe, it, expect, beforeAll } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  parseBinaryStl,
  rotateMesh,
  scaleMesh,
  normalizeMesh,
} from "@/lib/stl/binary-stl-parser"
import { sliceMeshAtZ } from "@/lib/stl/mesh-slicer"
import {
  registerMesh,
  geometryBoundsFromMesh,
  hasMesh,
  clearMeshCache,
  STL_PREPROCESS_MAP,
} from "@/lib/stl/mesh-bounds"

// ═══════════════════════════════════════════════════════════════════
// R12.50: Voxelização do nariz e do fêmur reais
//
// Cobre:
//   - Parsing dos dois STLs novos (11974 + 118860 triângulos)
//   - Transformações: nariz rotaciona 90° X (Y→Z), fêmur escala 50×
//   - Integração ao engine via geometryBoundsFromMesh
// ═══════════════════════════════════════════════════════════════════

function loadStlBuffer(fileName: string): ArrayBuffer {
  const p = path.resolve(process.cwd(), "public/stl", fileName)
  const buf = fs.readFileSync(p)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe("STL_PREPROCESS_MAP — configuração das transformações por arquivo", () => {
  it("ear-real.stl: sem transformação (já está em mm com eixo certo)", () => {
    const p = STL_PREPROCESS_MAP["ear-real.stl"]
    expect(p).toBeDefined()
    expect(p.rotate).toBeUndefined()
    expect(p.scale).toBeUndefined()
  })

  it("nose-real.stl: rotaciona 90° em X (Y → Z)", () => {
    const p = STL_PREPROCESS_MAP["nose-real.stl"]
    expect(p).toBeDefined()
    expect(p.rotate?.axis).toBe("x")
    expect(p.rotate?.degrees).toBe(90)
  })

  it("femur-real.stl: escala 50× (vem em unidades pequenas)", () => {
    const p = STL_PREPROCESS_MAP["femur-real.stl"]
    expect(p).toBeDefined()
    expect(p.scale).toBe(50)
  })
})

describe("transformações: rotateMesh", () => {
  it("rotateMesh 'x' 90° transforma (0, 1, 0) em (0, 0, 1)", () => {
    // Cria triângulo com 1 vértice em Y=1
    const v = new Float32Array([0, 1, 0, 1, 0, 0, 0, 0, 0])
    const fakeMesh = {
      vertices: v,
      triangleCount: 1,
      bbox: { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 0 },
      isAscii: false,
    }
    const rotated = rotateMesh(fakeMesh, "x", 90)
    // Vértice (0,1,0) deve virar (0, 0, 1) — Y foi pra +Z
    expect(rotated.vertices[0]).toBeCloseTo(0, 5)
    expect(rotated.vertices[1]).toBeCloseTo(0, 5)
    expect(rotated.vertices[2]).toBeCloseTo(1, 5)
    // bbox recomputado
    expect(rotated.bbox.maxZ).toBeCloseTo(1, 5)
  })

  it("rotateMesh com 0° é no-op", () => {
    const v = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const fakeMesh = {
      vertices: v,
      triangleCount: 1,
      bbox: { minX: 1, maxX: 7, minY: 2, maxY: 8, minZ: 3, maxZ: 9 },
      isAscii: false,
    }
    const rotated = rotateMesh(fakeMesh, "x", 0)
    expect(rotated.vertices[0]).toBe(1)
    expect(rotated.vertices[8]).toBe(9)
  })

  it("scaleMesh duplica todas as coordenadas com factor=2", () => {
    const v = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const fakeMesh = {
      vertices: v,
      triangleCount: 1,
      bbox: { minX: 1, maxX: 7, minY: 2, maxY: 8, minZ: 3, maxZ: 9 },
      isAscii: false,
    }
    const scaled = scaleMesh(fakeMesh, 2)
    expect(scaled.vertices[0]).toBe(2)
    expect(scaled.vertices[8]).toBe(18)
    expect(scaled.bbox.maxZ).toBe(18)
  })
})

describe("nariz — STL real (R12.50)", () => {
  let noseBuffer: ArrayBuffer

  beforeAll(() => {
    noseBuffer = loadStlBuffer("nose-real.stl")
    clearMeshCache()
  })

  it("tem 598784 bytes e 11974 triângulos", () => {
    expect(noseBuffer.byteLength).toBe(598784)
    const mesh = parseBinaryStl(noseBuffer)
    expect(mesh.triangleCount).toBe(11974)
  })

  it("bbox antes da rotação: eixo longo em Y (~25.5 mm)", () => {
    const mesh = parseBinaryStl(noseBuffer)
    const W = mesh.bbox.maxX - mesh.bbox.minX
    const D = mesh.bbox.maxY - mesh.bbox.minY
    const H = mesh.bbox.maxZ - mesh.bbox.minZ
    expect(W).toBeCloseTo(15.81, 1)
    expect(D).toBeCloseTo(25.51, 1)
    expect(H).toBeCloseTo(9.96, 1)
    expect(D).toBeGreaterThan(W)  // Y é o eixo longo
    expect(D).toBeGreaterThan(H)
  })

  it("após registerMesh: Z passa a ser o eixo longo (rotação 90° X aplicada)", () => {
    const raw = parseBinaryStl(noseBuffer)
    registerMesh("nose-real.stl", raw)
    expect(hasMesh("nose-real.stl")).toBe(true)

    const bounds = geometryBoundsFromMesh("nose-real.stl", { x: 0, y: 0 })
    // Antes Z=9.96, agora Z deve ser ~25.5 (o que era Y)
    expect(bounds.height_mm).toBeGreaterThan(20)
    expect(bounds.height_mm).toBeLessThan(30)
  })

  it("fatia do nariz no meio retorna polígono fechado", () => {
    const bounds = geometryBoundsFromMesh("nose-real.stl", { x: 100, y: 100 })
    const midZ = bounds.height_mm / 2
    const polys = bounds.getPerimetersAtZ(midZ, 1, 0.4)
    expect(polys.length).toBeGreaterThan(0)
    expect(polys[0].length).toBeGreaterThanOrEqual(3)
  })
})

describe("fêmur — STL real (R12.50)", () => {
  let femurBuffer: ArrayBuffer

  beforeAll(() => {
    femurBuffer = loadStlBuffer("femur-real.stl")
    clearMeshCache()
  })

  it("tem ~5.94 MB e 118860 triângulos", () => {
    expect(femurBuffer.byteLength).toBe(5943084)
    const mesh = parseBinaryStl(femurBuffer)
    expect(mesh.triangleCount).toBe(118860)
  })

  it("bbox antes da escala: dimensões muito pequenas (~2×1×9)", () => {
    const mesh = parseBinaryStl(femurBuffer)
    const W = mesh.bbox.maxX - mesh.bbox.minX
    const D = mesh.bbox.maxY - mesh.bbox.minY
    const H = mesh.bbox.maxZ - mesh.bbox.minZ
    expect(W).toBeLessThan(5)
    expect(D).toBeLessThan(5)
    expect(H).toBeLessThan(15)
    // Z já é o eixo longo (fêmur "em pé")
    expect(H).toBeGreaterThan(W)
    expect(H).toBeGreaterThan(D)
  })

  it("após registerMesh: bbox escalado para tamanho anatômico real (~450 mm)", () => {
    const raw = parseBinaryStl(femurBuffer)
    registerMesh("femur-real.stl", raw)

    const bounds = geometryBoundsFromMesh("femur-real.stl", { x: 0, y: 0 })
    // Escala 50× sobre H=9.06 → ~453 mm
    expect(bounds.height_mm).toBeGreaterThan(400)
    expect(bounds.height_mm).toBeLessThan(500)
  })

  it("fatia do fêmur na diáfise (meio) retorna polígono", () => {
    const bounds = geometryBoundsFromMesh("femur-real.stl", { x: 0, y: 0 })
    const midZ = bounds.height_mm / 2
    const polys = bounds.getPerimetersAtZ(midZ, 1, 0.4)
    expect(polys.length).toBeGreaterThan(0)
  })

  it("fatia perto dos côndilos (base) e perto do trocânter (topo) ambas existem", () => {
    const bounds = geometryBoundsFromMesh("femur-real.stl", { x: 0, y: 0 })
    const polysBase = bounds.getPerimetersAtZ(bounds.height_mm * 0.05, 1, 0.4)
    const polysTopo = bounds.getPerimetersAtZ(bounds.height_mm * 0.95, 1, 0.4)
    expect(polysBase.length).toBeGreaterThan(0)
    expect(polysTopo.length).toBeGreaterThan(0)
  })

  it("targetSize permite o usuário definir comprimento desejado (ex: 200mm)", () => {
    const bounds = geometryBoundsFromMesh(
      "femur-real.stl",
      { x: 0, y: 0 },
      { width: 47, height: 200, depth: 28 },
    )
    // Altura deve aproximar 200
    expect(bounds.height_mm).toBeGreaterThan(150)
    expect(bounds.height_mm).toBeLessThan(250)
  })
})

describe("integração: STL_FILE_MAP cobre todas as 3 anatomias", () => {
  it("ear, nose e femur estão registrados em STL_FILE_MAP", async () => {
    // Reimport para pegar valor atual
    const { STL_FILE_MAP, hasStlForGeometry } = await import("@/lib/stl/mesh-bounds")
    expect(STL_FILE_MAP["ear"]).toBe("ear-real.stl")
    expect(STL_FILE_MAP["nose"]).toBe("nose-real.stl")
    expect(STL_FILE_MAP["femur"]).toBe("femur-real.stl")
    expect(hasStlForGeometry("ear")).toBe(true)
    expect(hasStlForGeometry("nose")).toBe(true)
    expect(hasStlForGeometry("femur")).toBe(true)
  })

  it("anatomias sem STL ainda retornam false em hasStlForGeometry", async () => {
    const { hasStlForGeometry } = await import("@/lib/stl/mesh-bounds")
    expect(hasStlForGeometry("heart")).toBe(false)
    expect(hasStlForGeometry("kidney")).toBe(false)
    expect(hasStlForGeometry("liver_anatomical")).toBe(false)
    expect(hasStlForGeometry("hand")).toBe(false)
  })
})
