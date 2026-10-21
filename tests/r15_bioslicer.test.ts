/**
 * BIA — R15 · BioSlicer: fatiador real STL → G-code para bioimpressão
 */
import { describe, it, expect } from "vitest"
import {
  signedArea, isCCW, normalizeContours, offsetPolygon, offsetPolySet, clipSegmentToPolySet,
  pointInPolySet, simplify, groupIslands,
} from "@/lib/slicer/polygon-ops"
import { sliceAtZ, layerZs, parseSTL, placeMesh } from "@/lib/slicer/mesh-slice"
import { boxMesh, cylinderMesh, tubeMesh, domeMesh } from "@/lib/slicer/primitives"
import { generateInfill, spacingFromDensity } from "@/lib/slicer/infill"
import { syringeArea_mm2, beadArea_mm2, ePerMm, volumeToE, wallShearStress_Pa, estimateViability_pct, DEFAULT_EXTRUSION_SYRINGE_10ML } from "@/lib/slicer/extrusion"
import { BASIC_PROFILES, ADVANCED_PROFILES, getProfile, baseParams } from "@/lib/slicer/profiles"
import { parseIntent } from "@/lib/slicer/intent"
import { sliceMesh } from "@/lib/slicer/slice"

const square = (s: number, cx = 0, cy = 0) => [
  { x: cx - s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy - s / 2 },
  { x: cx + s / 2, y: cy + s / 2 }, { x: cx - s / 2, y: cy + s / 2 },
]

describe("R15 · polygon-ops", () => {
  it("orientação e área", () => {
    const sq = square(10)
    expect(signedArea(sq)).toBeCloseTo(100)
    expect(isCCW(sq)).toBe(true)
    expect(isCCW([...sq].reverse())).toBe(false)
  })
  it("normalizeContours: outer CCW, hole CW", () => {
    const n = normalizeContours([[...square(10)].reverse(), square(4)])
    expect(n).toHaveLength(2)
    const big = n.find((p) => Math.abs(signedArea(p)) > 50)!
    const small = n.find((p) => Math.abs(signedArea(p)) < 50)!
    expect(isCCW(big)).toBe(true)
    expect(isCCW(small)).toBe(false)
    const islands = groupIslands(n)
    expect(islands).toHaveLength(1)
    expect(islands[0].holes).toHaveLength(1)
  })
  it("offsetPolygon inset reduz área; colapsa quando grande demais", () => {
    const o = offsetPolygon(square(10), 1)
    expect(o.length).toBeGreaterThanOrEqual(4)
    expect(Math.abs(signedArea(o))).toBeCloseTo(64, 0)
    expect(offsetPolygon(square(10), 6)).toEqual([])
  })
  it("offsetPolySet: furo cresce para dentro do material", () => {
    const o = offsetPolySet(normalizeContours([square(10), square(4)]), 1)
    const hole = o.find((p) => !isCCW(p))!
    expect(Math.abs(signedArea(hole))).toBeCloseTo(36, 0)
  })
  it("clipSegmentToPolySet respeita furos (even-odd)", () => {
    const n = normalizeContours([square(10), square(4)])
    const pieces = clipSegmentToPolySet({ x: -10, y: 0 }, { x: 10, y: 0 }, n)
    expect(pieces).toHaveLength(2)
    expect(pieces.reduce((s, [a, b]) => s + Math.abs(b.x - a.x), 0)).toBeCloseTo(6, 5)
    expect(pointInPolySet({ x: 0, y: 0 }, n)).toBe(false)
    expect(pointInPolySet({ x: 4, y: 0 }, n)).toBe(true)
  })
  it("simplify remove colineares", () => {
    const pts = [{ x: 0, y: 0 }, { x: 5, y: 0.001 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    expect(simplify(pts, 0.01, true).length).toBe(4)
  })
})

describe("R15 · mesh-slice", () => {
  it("fatia caixa 10×10×3 em um quadrado CCW de área 100", () => {
    const polys = sliceAtZ(boxMesh(10, 10, 3), 1.5)
    expect(polys).toHaveLength(1)
    expect(isCCW(polys[0])).toBe(true)
    expect(Math.abs(signedArea(polys[0]))).toBeCloseTo(100, 1)
  })
  it("fatia tubo em outer CCW + hole CW", () => {
    const polys = sliceAtZ(tubeMesh(10, 6, 5, 64), 2.5)
    expect(polys).toHaveLength(2)
    const isl = groupIslands(polys)
    expect(isl).toHaveLength(1)
    expect(isl[0].holes).toHaveLength(1)
    expect(Math.abs(signedArea(isl[0].outer))).toBeCloseTo(Math.PI * 25, 0)
  })
  it("domo encolhe com Z", () => {
    const m = domeMesh(10, 4)
    expect(Math.abs(signedArea(sliceAtZ(m, 3.0)[0]))).toBeLessThan(Math.abs(signedArea(sliceAtZ(m, 0.5)[0])))
  })
  it("layerZs cobre a altura", () => {
    const zs = layerZs({ minX: 0, minY: 0, maxX: 1, maxY: 1, minZ: 0, maxZ: 3 }, 0.3, 0.3)
    expect(zs.length).toBe(10)
    expect(zs[0]).toBeCloseTo(0.15)
  })
  it("parseSTL binário round-trip", () => {
    const m = boxMesh(4, 4, 2)
    const buf = new ArrayBuffer(84 + m.triangleCount * 50)
    const dv = new DataView(buf)
    dv.setUint32(80, m.triangleCount, true)
    let off = 84
    for (let t = 0; t < m.triangleCount; t++) {
      off += 12
      for (let k = 0; k < 9; k++) { dv.setFloat32(off, m.vertices[t * 9 + k], true); off += 4 }
      off += 2
    }
    const parsed = parseSTL(buf, "box.stl")
    expect(parsed.triangleCount).toBe(12)
    expect(parsed.bbox.maxZ).toBeCloseTo(2)
  })
  it("placeMesh escala, centraliza e põe base em Z=0", () => {
    const m = placeMesh(boxMesh(10, 10, 3), { scale: 2, rotationZ_deg: 45, centerX: 50, centerY: 40, baseZ: 0 })
    expect(m.bbox.minZ).toBeCloseTo(0)
    expect(m.bbox.maxZ).toBeCloseTo(6)
    expect((m.bbox.minX + m.bbox.maxX) / 2).toBeCloseTo(50, 3)
  })
})

describe("R15 · infill", () => {
  const region = [square(20)]
  it("rectilinear: espaçamento = w/d e poro = S − w", () => {
    const out = generateInfill({ region, pattern: "rectilinear", lineWidth_mm: 0.5, density_pct: 25, angle_deg: 0, layerIndex: 0, z_mm: 0 })
    expect(out.spacing_mm).toBeCloseTo(2)
    expect(out.poreSize_mm).toBeCloseTo(1.5)
    expect(out.paths.length).toBeGreaterThanOrEqual(9)
  })
  it("woodpile: camadas com mesmo ângulo ficam alinhadas globalmente", () => {
    const a = generateInfill({ region, pattern: "rectilinear", lineWidth_mm: 0.5, density_pct: 25, angle_deg: 0, layerIndex: 0, z_mm: 0 })
    const b = generateInfill({ region: [square(14, 1.3, -0.7)], pattern: "rectilinear", lineWidth_mm: 0.5, density_pct: 25, angle_deg: 0, layerIndex: 2, z_mm: 1 })
    const ya = new Set(a.paths.map((p) => p[0].y.toFixed(3)))
    for (const p of b.paths) expect(ya.has(p[0].y.toFixed(3))).toBe(true)
  })
  it("zigzag vira caminho único contínuo", () => {
    const r = generateInfill({ region, pattern: "rectilinear", lineWidth_mm: 0.5, density_pct: 25, angle_deg: 0, layerIndex: 0, z_mm: 0 })
    const z = generateInfill({ region, pattern: "zigzag", lineWidth_mm: 0.5, density_pct: 25, angle_deg: 0, layerIndex: 0, z_mm: 0 })
    expect(z.paths.length).toBeLessThan(r.paths.length)
    expect(z.paths.length).toBe(1)
  })
  it("grid, triangles, honeycomb, gyroid, concentric geram caminhos dentro da região", () => {
    for (const pattern of ["grid", "triangles", "honeycomb", "gyroid", "concentric"] as const) {
      const out = generateInfill({ region, pattern, lineWidth_mm: 0.5, density_pct: 30, angle_deg: 0, layerIndex: 0, z_mm: 0.5 })
      expect(out.paths.length, pattern).toBeGreaterThan(0)
      for (const p of out.paths) for (const q of p) {
        expect(Math.abs(q.x), pattern).toBeLessThanOrEqual(10.01)
        expect(Math.abs(q.y), pattern).toBeLessThanOrEqual(10.01)
      }
    }
  })
  it("spacingFromDensity grid > rectilinear para mesma densidade", () => {
    expect(spacingFromDensity("grid", 0.5, 30)).toBeGreaterThan(spacingFromDensity("rectilinear", 0.5, 30))
  })
})

describe("R15 · extrusão volumétrica (seringa)", () => {
  it("área da seringa 10 mL BD (Ø14.5) ≈ 165 mm²", () => {
    expect(syringeArea_mm2({ volume_mL: 10, innerDiameter_mm: 14.5 })).toBeCloseTo(165.13, 1)
  })
  it("1 µL em seringa 10 mL ≈ 0.00606 mm de êmbolo", () => {
    expect(volumeToE(1, DEFAULT_EXTRUSION_SYRINGE_10ML)).toBeCloseTo(0.00606, 4)
  })
  it("ePerMm coerente com área do cordão", () => {
    expect(ePerMm(0.47, 0.33, DEFAULT_EXTRUSION_SYRINGE_10ML)).toBeCloseTo(beadArea_mm2(0.47, 0.33) / 165.13, 5)
  })
  it("shear e viabilidade (Blaeser)", () => {
    expect(wallShearStress_Pa(2.5, 0.8, 0.41)).toBeGreaterThan(0)
    expect(estimateViability_pct(2000, 600, true)).toBeGreaterThan(90)
    expect(estimateViability_pct(15000, 600, true)!).toBeLessThan(85)
    expect(estimateViability_pct(2000, 600, false)).toBeNull()
  })
})

describe("R15 · perfis", () => {
  it("todos os perfis têm params válidos e dicas", () => {
    for (const p of [...BASIC_PROFILES, ...ADVANCED_PROFILES]) {
      expect(p.params.layerHeight_mm).toBeGreaterThan(0)
      expect(p.params.layerHeight_mm).toBeLessThanOrEqual(p.params.nozzleDiameter_mm * 1.2)
      expect(p.params.speedPerimeter_mms).toBeLessThanOrEqual(15)
      expect(p.tips.length).toBeGreaterThan(0)
    }
    expect(getProfile("basic_first_print")).toBeDefined()
  })
})

describe("R15 · intent parser pt-BR", () => {
  it("scaffold ósseo com poro e agulha", () => {
    const r = parseIntent("Scaffold ósseo 10x10x4 mm, poro 400 µm, alginato com HAp, agulha 18G")
    expect(r.profile.id).toBe("adv_bone_scaffold")
    expect(r.params.nozzleDiameter_mm).toBeCloseTo(0.84)
    expect(r.params.strandSpacing_mm).toBeCloseTo(0.4 + r.params.lineWidth_mm, 2)
    expect(r.targetSize_mm).toEqual({ x: 10, y: 10, z: 4 })
    expect(r.material).toMatch(/Alginato/)
    expect(r.material).toMatch(/cerâmico/)
  })
  it("GelMA com células limita velocidade e define temperatura", () => {
    const r = parseIntent("Menisco em GelMA 10% com condrócitos, 3 paredes, gyroid 45%, rápido")
    expect(r.profile.id).toBe("adv_cartilage_concentric")
    expect(r.params.hasCells).toBe(true)
    expect(r.params.speedPerimeter_mms).toBeLessThanOrEqual(10)
    expect(r.params.cartridgeTemp_C).toBe(23)
    expect(r.params.wallCount).toBe(3)
    expect(r.params.infillPattern).toBe("gyroid")
    expect(r.params.infillDensity).toBe(45)
  })
  it("Matrigel em poço: cartucho frio, mesa 37, sem skirt, seringa 1 mL", () => {
    const r = parseIntent("Domo de organoide em Matrigel no poço de placa de 48, seringa 1 mL, 27G")
    expect(r.params.cartridgeTemp_C).toBe(8)
    expect(r.params.bedTemp_C).toBe(37)
    expect(r.params.skirtLoops).toBe(0)
    expect(r.extrusion.syringe?.volume_mL).toBe(1)
    expect(r.params.nozzleDiameter_mm).toBeCloseTo(0.21)
  })
  it("pneumático e velocidade explícita", () => {
    const r = parseIntent("Canal vascular com Pluronic, só paredes, pneumático 80 kPa, 10 mm/s")
    expect(r.extrusion.kind).toBe("pneumatic")
    expect(r.extrusion.pressure_kPa).toBe(80)
    expect(r.params.infillPattern).toBe("none")
    expect(r.params.speedPerimeter_mms).toBe(10)
  })
  it("sem contexto → perfil básico com confiança baixa", () => {
    const r = parseIntent("quero imprimir uma coisa")
    expect(r.profile.tier).toBe("basic")
    expect(r.confidence).toBeLessThan(0.6)
  })
})

describe("R15 · pipeline sliceMesh → G-code", () => {
  const prof = getProfile("basic_first_print")!
  const run = (mesh = boxMesh(10, 10, 2), over: Partial<typeof prof.params> = {}) => sliceMesh({
    mesh, params: { ...prof.params, ...over }, extrusion: prof.extrusion, profileId: prof.id, profileName: prof.name,
    rheology: { viscosity_PaS: 2 },
  })

  it("gera camadas e G-code com convenções BIA", () => {
    const r = run()
    expect(r.layers.length).toBeGreaterThanOrEqual(5)
    expect(r.gcode).not.toMatch(/^\s*G28\b/m)
    expect(r.gcode).toMatch(/^G92 X0 Y0 Z0 E0/m)
    expect(r.gcode).toMatch(/^M83\b/m)
    expect(r.gcode).toMatch(/^M302 S0/m)
    expect(r.gcode).toMatch(/^;LAYER:0$/m)
    expect(r.gcode).toMatch(/^;LAYER_COUNT:\d+$/m)
    expect(r.gcode).toMatch(/;TYPE:WALL-OUTER/)
    expect(r.gcode).toMatch(/;TYPE:FILL/)
    // R19: skirt é opt-in (desligado por padrão) — só aparece se skirtLoops > 0
    expect(r.gcode).not.toMatch(/;TYPE:SKIRT/)
    expect(run(undefined, { skirtLoops: 1 }).gcode).toMatch(/;TYPE:SKIRT/)
    expect(r.gcode).toMatch(/;BIA_META \{/)
    expect(r.stats.extrudeLength_mm).toBeGreaterThan(100)
    expect(r.stats.volume_uL).toBeGreaterThan(0)
    expect(r.stats.estimatedTime_s).toBeGreaterThan(0)
    expect(r.warnings.some((w) => w.level === "error")).toBe(false)
  })
  it("E é sempre positivo nos G1 de deposição e coerente com volume", () => {
    const r = run()
    const es = [...r.gcode.matchAll(/^G1 X[-\d.]+ Y[-\d.]+ E([\d.]+)/gm)].map((m) => +m[1])
    expect(es.length).toBeGreaterThan(50)
    for (const e of es) expect(e).toBeGreaterThan(0)
    const area = syringeArea_mm2(prof.extrusion.syringe!)
    expect(es.reduce((a, b) => a + b, 0) * area).toBeCloseTo(r.stats.volume_uL, -1)
  })
  it("Z cresce monotonicamente nas tags ;Z:", () => {
    const r = run()
    const zs = [...r.gcode.matchAll(/^;Z:([\d.]+)/gm)].map((m) => +m[1])
    for (let i = 1; i < zs.length; i++) expect(zs[i]).toBeGreaterThan(zs[i - 1])
    expect(zs[0]).toBeCloseTo(prof.params.firstLayerHeight_mm, 2)
  })
  it("tubo (com furo) imprime parede externa e interna do furo", () => {
    const r = run(tubeMesh(10, 6, 2, 48), { infillPattern: "none", wallCount: 1 })
    expect(r.layers[1].paths.filter((p) => p.role === "wall_outer").length).toBe(2)
  })
  it("avisos: seringa pequena → erro de capacidade", () => {
    const r = sliceMesh({
      mesh: boxMesh(30, 30, 10), params: { ...prof.params, infillDensity: 80 },
      extrusion: { ...prof.extrusion, syringe: { volume_mL: 1, innerDiameter_mm: 4.78 } },
      profileId: prof.id, profileName: prof.name,
    })
    expect(r.warnings.some((w) => w.code === "syringe_capacity")).toBe(true)
  })
  it("sem paredes e sem infill → erro no_extrusion", () => {
    const r = run(boxMesh(10, 10, 2), { wallCount: 0, infillPattern: "none", skirtLoops: 0 })
    expect(r.warnings.some((w) => w.code === "no_extrusion")).toBe(true)
  })
  it("intent → slice end-to-end (menisco gyroid)", () => {
    const it = parseIntent("menisco gelma com condrocitos 22G gyroid 40%")
    const r = sliceMesh({ mesh: cylinderMesh(12, 3, 64), params: it.params, extrusion: it.extrusion, profileId: it.profile.id, profileName: it.profile.name, rheology: it.rheology })
    expect(r.layers.length).toBeGreaterThan(5)
    expect(r.stats.viability_pct).not.toBeNull()
    expect(r.gcode).toMatch(/M104 S23/)
  })
  it("baseParams defaults coerentes", () => {
    const p = baseParams(0.41)
    expect(p.layerHeight_mm).toBeCloseTo(0.33)
    expect(p.lineWidth_mm).toBeCloseTo(0.472, 2)
  })
})
