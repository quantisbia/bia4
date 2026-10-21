/**
 * R21 — Modelos anatômicos REAIS (malhas curvas) + Mesa (arrumar a peça).
 * Mandato: menisco/fêmur/orelha com curvas de verdade; só a dimensão é
 * escolhida; ver na mesa; rodar e arrumar antes de fatiar.
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { parseSTL, orientMesh, suggestLayFlat, IDENTITY_ORIENTATION } from "@/lib/slicer/mesh-slice"
import { ANATOMICAL_MODELS, uniformScaleFor, scaledSize } from "@/lib/slicer/anatomical-library"
import { boxMesh } from "@/lib/slicer/primitives"
import { sliceMesh } from "@/lib/slicer/slice"
import { BASIC_PROFILES } from "@/lib/slicer/profiles"

const ROOT = resolve(__dirname, "..")
const load = (file: string) => {
  const buf = readFileSync(resolve(ROOT, "public", file.replace(/^\//, "")))
  return parseSTL(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, file)
}

describe("R21 · biblioteca anatômica", () => {
  it("todo modelo tem STL em /public e as dimensões nativas batem (±2 %)", () => {
    for (const m of ANATOMICAL_MODELS) {
      expect(existsSync(resolve(ROOT, "public", m.file.slice(1))), m.file).toBe(true)
      const mesh = load(m.file)
      expect(mesh.triangleCount).toBe(m.tris)
      const sx = mesh.bbox.maxX - mesh.bbox.minX, sy = mesh.bbox.maxY - mesh.bbox.minY, sz = mesh.bbox.maxZ - mesh.bbox.minZ
      expect(Math.abs(sx - m.native.x) / m.native.x).toBeLessThan(0.02)
      expect(Math.abs(sy - m.native.y) / m.native.y).toBeLessThan(0.02)
      expect(Math.abs(sz - m.native.z) / m.native.z).toBeLessThan(0.02)
      // normalizado: centrado em XY, base em Z=0
      expect(Math.abs(mesh.bbox.minX + mesh.bbox.maxX)).toBeLessThan(0.05)
      expect(Math.abs(mesh.bbox.minZ)).toBeLessThan(0.01)
    }
  })

  it("menisco é CURVO (não facetado): muitas normais distintas, meia-lua com concavidade", () => {
    const m = load("/stl/meniscus-real.stl")
    const v = m.vertices
    const normals = new Set<string>()
    for (let t = 0; t < m.triangleCount; t++) {
      const k = t * 9
      const ax = v[k + 3] - v[k], ay = v[k + 4] - v[k + 1], az = v[k + 5] - v[k + 2]
      const bx = v[k + 6] - v[k], by = v[k + 7] - v[k + 1], bz = v[k + 8] - v[k + 2]
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
      const L = Math.hypot(nx, ny, nz) || 1
      normals.add(`${(nx / L).toFixed(1)},${(ny / L).toFixed(1)},${(nz / L).toFixed(1)}`)
    }
    expect(normals.size).toBeGreaterThan(200) // um "C" facetado teria dezenas
    // concavidade: no centro do bbox não há material (meia-lua)
    const cx = 0, cy = 0
    let hit = 0
    for (let t = 0; t < m.triangleCount; t++) {
      const k = t * 9
      const minx = Math.min(v[k], v[k + 3], v[k + 6]), maxx = Math.max(v[k], v[k + 3], v[k + 6])
      const miny = Math.min(v[k + 1], v[k + 4], v[k + 7]), maxy = Math.max(v[k + 1], v[k + 4], v[k + 7])
      if (cx >= minx && cx <= maxx && cy >= miny && cy <= maxy) hit++
    }
    expect(hit).toBe(0)
  })

  it("escala uniforme pela dimensão principal preserva proporções", () => {
    const m = ANATOMICAL_MODELS.find((x) => x.id === "ear_real")!
    const s = uniformScaleFor(m, 60)
    const sz = scaledSize(m, 60)
    expect(sz.y).toBeCloseTo(60, 5)
    expect(sz.x / sz.y).toBeCloseTo(m.native.x / m.native.y, 6)
    expect(s).toBeCloseTo(60 / m.native.y, 6)
  })
})

describe("R21 · orientMesh / suggestLayFlat", () => {
  it("rotação 90° em Y deita uma barra alta (Z→X), re-centra e apoia em Z=0", () => {
    const bar = boxMesh(4, 4, 20)
    const o = orientMesh(bar, { ...IDENTITY_ORIENTATION, rotY_deg: 90 })
    expect(o.bbox.maxX - o.bbox.minX).toBeCloseTo(20, 3)
    expect(o.bbox.maxZ - o.bbox.minZ).toBeCloseTo(4, 3)
    expect(o.bbox.minZ).toBeCloseTo(0, 6)
    expect(Math.abs(o.bbox.minX + o.bbox.maxX)).toBeLessThan(1e-4)
  })
  it("escala uniforme multiplica todas as dimensões", () => {
    const o = orientMesh(boxMesh(10, 5, 2), { ...IDENTITY_ORIENTATION, scale: 2 })
    expect(o.bbox.maxX - o.bbox.minX).toBeCloseTo(20, 4)
    expect(o.bbox.maxY - o.bbox.minY).toBeCloseTo(10, 4)
    expect(o.bbox.maxZ - o.bbox.minZ).toBeCloseTo(4, 4)
  })
  it("suggestLayFlat deita a barra (altura mínima, maior apoio)", () => {
    const bar = boxMesh(4, 4, 20)
    const s = suggestLayFlat(bar)
    const o = orientMesh(bar, s)
    expect(o.bbox.maxZ - o.bbox.minZ).toBeCloseTo(4, 2)
  })
  it("fêmur: sugestão de rotação da biblioteca deixa o osso deitado (altura ≪ comprimento)", () => {
    const m = ANATOMICAL_MODELS.find((x) => x.id === "femur_real")!
    const mesh = load(m.file)
    const o = orientMesh(mesh, { rotX_deg: m.suggestedRotation?.x ?? 0, rotY_deg: m.suggestedRotation?.y ?? 0, rotZ_deg: 0, scale: uniformScaleFor(m, 60) })
    const sx = o.bbox.maxX - o.bbox.minX, sz = o.bbox.maxZ - o.bbox.minZ
    expect(sx).toBeCloseTo(60, 1)
    expect(sz).toBeLessThan(sx * 0.3)
  })
  it("menisco anatômico fatia na base BioSlicer com G-code válido (origem no bico)", () => {
    const m = ANATOMICAL_MODELS.find((x) => x.id === "meniscus_real")!
    const mesh = orientMesh(load(m.file), { ...IDENTITY_ORIENTATION, scale: uniformScaleFor(m, 30) })
    const prof = BASIC_PROFILES[0]
    const res = sliceMesh({ mesh, params: { ...prof.params, layerHeight_mm: 0.4, firstLayerHeight_mm: 0.36 }, extrusion: prof.extrusion, profileId: prof.id, profileName: prof.name })
    expect(res.warnings.some((w) => w.level === "error")).toBe(false)
    expect(res.stats.layerCount).toBeGreaterThan(5)
    expect(res.gcode).toMatch(/G92 X0 Y0 Z0 E0/)
    expect(res.gcode).not.toMatch(/\nG28/)
  })
})
