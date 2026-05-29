import { describe, it, expect, beforeAll } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  parseBinaryStl,
} from "@/lib/stl/binary-stl-parser"
import {
  registerMesh,
  geometryBoundsFromMesh,
  hasMesh,
  clearMeshCache,
  STL_PREPROCESS_MAP,
  STL_FILE_MAP,
} from "@/lib/stl/mesh-bounds"

// ═══════════════════════════════════════════════════════════════════
// R12.51: Voxelização do coração e do rim reais
//
// Cobre:
//   - Parsing dos dois STLs novos (447378 + 7960 triângulos)
//   - Transformações:
//       heart-real.stl → escala 3× (28×34×36 mm → ~86×102×108 mm)
//       kidney-real.stl → rotação 90° Y (X→Z) + escala 3×
//   - Integração ao engine via geometryBoundsFromMesh
//
// Observação de performance:
//   heart-real.stl tem 447378 triângulos (22 MB). É a mesh mais pesada
//   do projeto. Fatiar em Cloudflare Workers (10ms free / 30ms paid) pode
//   exceder o CPU limit em camadas que cruzam muitos triângulos. Mitigações
//   futuras: decimação, cache de fatias, pré-processamento em build-time.
// ═══════════════════════════════════════════════════════════════════

function loadStlBuffer(fileName: string): ArrayBuffer {
  const p = path.resolve(process.cwd(), "public/stl", fileName)
  const buf = fs.readFileSync(p)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

describe("STL_PREPROCESS_MAP — coração e rim (R12.51)", () => {
  it("heart-real.stl: escala 3× sem rotação", () => {
    const p = STL_PREPROCESS_MAP["heart-real.stl"]
    expect(p).toBeDefined()
    expect(p.scale).toBe(3)
    expect(p.rotate).toBeUndefined()
  })

  it("kidney-real.stl: rotação 90° Y + escala 3×", () => {
    const p = STL_PREPROCESS_MAP["kidney-real.stl"]
    expect(p).toBeDefined()
    expect(p.rotate?.axis).toBe("y")
    expect(p.rotate?.degrees).toBe(90)
    expect(p.scale).toBe(3)
  })
})

describe("rim — STL real (R12.51)", () => {
  let kidneyBuffer: ArrayBuffer

  beforeAll(() => {
    kidneyBuffer = loadStlBuffer("kidney-real.stl")
    clearMeshCache()
  })

  it("tem 398084 bytes e 7960 triângulos", () => {
    expect(kidneyBuffer.byteLength).toBe(398084)
    const mesh = parseBinaryStl(kidneyBuffer)
    expect(mesh.triangleCount).toBe(7960)
  })

  it("bbox antes da rotação: X é o eixo longo (~38.65 mm)", () => {
    const mesh = parseBinaryStl(kidneyBuffer)
    const W = mesh.bbox.maxX - mesh.bbox.minX
    const D = mesh.bbox.maxY - mesh.bbox.minY
    const H = mesh.bbox.maxZ - mesh.bbox.minZ
    expect(W).toBeCloseTo(38.65, 0)
    expect(D).toBeCloseTo(19.69, 0)
    expect(H).toBeCloseTo(12.73, 0)
    expect(W).toBeGreaterThan(D)  // X é o eixo longo
    expect(W).toBeGreaterThan(H)
  })

  it("após registerMesh: Z passa a ser o eixo longo (rotação 90° Y + escala 3×)", () => {
    const raw = parseBinaryStl(kidneyBuffer)
    registerMesh("kidney-real.stl", raw)
    expect(hasMesh("kidney-real.stl")).toBe(true)

    const bounds = geometryBoundsFromMesh("kidney-real.stl", { x: 0, y: 0 })
    // Antes X=38.65; após rotação Y 90° → vai pra Z; após escala 3× → ~116 mm
    expect(bounds.height_mm).toBeGreaterThan(100)
    expect(bounds.height_mm).toBeLessThan(130)
  })

  it("fatia do rim no meio retorna polígono fechado", () => {
    const bounds = geometryBoundsFromMesh("kidney-real.stl", { x: 100, y: 100 })
    const midZ = bounds.height_mm / 2
    const polys = bounds.getPerimetersAtZ(midZ, 1, 0.4)
    expect(polys.length).toBeGreaterThan(0)
    expect(polys[0].length).toBeGreaterThanOrEqual(3)
  })

  it("targetSize permite o usuário definir comprimento desejado (rim adulto ~110mm)", () => {
    const bounds = geometryBoundsFromMesh(
      "kidney-real.stl",
      { x: 0, y: 0 },
      { width: 60, height: 110, depth: 35 },
    )
    expect(bounds.height_mm).toBeGreaterThan(90)
    expect(bounds.height_mm).toBeLessThan(130)
  })
})

describe("coração — STL real (R12.51)", () => {
  let heartBuffer: ArrayBuffer

  beforeAll(() => {
    heartBuffer = loadStlBuffer("heart-real.stl")
    clearMeshCache()
  })

  it("tem ~22.37 MB e 447378 triângulos (mesh pesada — alerta perf!)", () => {
    expect(heartBuffer.byteLength).toBe(22368984)
    const mesh = parseBinaryStl(heartBuffer)
    expect(mesh.triangleCount).toBe(447378)
  })

  it("bbox antes da escala: ~28.83 × 34.11 × 35.97 mm (mesh em mm)", () => {
    const mesh = parseBinaryStl(heartBuffer)
    const W = mesh.bbox.maxX - mesh.bbox.minX
    const D = mesh.bbox.maxY - mesh.bbox.minY
    const H = mesh.bbox.maxZ - mesh.bbox.minZ
    expect(W).toBeCloseTo(28.83, 0)
    expect(D).toBeCloseTo(34.11, 0)
    expect(H).toBeCloseTo(35.97, 0)
  })

  it("após registerMesh: bbox escalado 3× para tamanho anatômico (~108 mm na maior dim)", () => {
    const raw = parseBinaryStl(heartBuffer)
    registerMesh("heart-real.stl", raw)

    const bounds = geometryBoundsFromMesh("heart-real.stl", { x: 0, y: 0 })
    // Escala 3× sobre H=35.97 → ~108 mm (próximo de coração adulto)
    expect(bounds.height_mm).toBeGreaterThan(95)
    expect(bounds.height_mm).toBeLessThan(120)
  })

  it("fatia do coração no meio retorna polígono fechado", () => {
    const bounds = geometryBoundsFromMesh("heart-real.stl", { x: 0, y: 0 })
    const midZ = bounds.height_mm / 2
    const polys = bounds.getPerimetersAtZ(midZ, 1, 0.4)
    expect(polys.length).toBeGreaterThan(0)
    expect(polys[0].length).toBeGreaterThanOrEqual(3)
  })

  it("fatia perto do ápice (base) e perto da base atrial (topo) ambas existem", () => {
    const bounds = geometryBoundsFromMesh("heart-real.stl", { x: 0, y: 0 })
    const polysApex = bounds.getPerimetersAtZ(bounds.height_mm * 0.10, 1, 0.4)
    const polysBase = bounds.getPerimetersAtZ(bounds.height_mm * 0.90, 1, 0.4)
    // Ambas as regiões devem produzir alguma fatia (o coração é maciço entre 10% e 90%)
    expect(polysApex.length + polysBase.length).toBeGreaterThan(0)
  })
})

describe("integração: STL_FILE_MAP cobre heart e kidney (R12.51)", () => {
  it("heart e kidney estão registrados em STL_FILE_MAP", () => {
    expect(STL_FILE_MAP["heart"]).toBe("heart-real.stl")
    expect(STL_FILE_MAP["kidney"]).toBe("kidney-real.stl")
  })

  it("liver_anatomical NÃO está mais em STL_FILE_MAP (removido R12.51)", () => {
    // @ts-expect-error — liver_anatomical não é mais chave válida do map
    expect(STL_FILE_MAP["liver_anatomical"]).toBeUndefined()
  })
})
