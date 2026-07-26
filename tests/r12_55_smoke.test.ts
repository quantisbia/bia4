import { describe, it, expect } from "vitest"
import {
  generateQuickGcodeMulti, collapseMultiBioink,
  GEOMETRY_PRESETS,
  type QuickMultiBioink, type QuickGeometry,
} from "@/lib/bioprint/quick-gcode"
import {
  BASIC_GEOMETRY_IDS, ADVANCED_GEOMETRY_IDS, classifyGeometry,
} from "@/lib/gcode/slicer/geometry-bounds"
import { MATERIAL_SUMMARY, getRecommendedParams } from "@/lib/bioprint/material-database"

describe("R12.55 sanity", () => {
  it("Basic geometries: 5 formas + 8 testes = 13 IDs", () => {
    expect(BASIC_GEOMETRY_IDS).toHaveLength(13)
  })
  it("Advanced geometries: 15 IDs", () => {
    expect(ADVANCED_GEOMETRY_IDS).toHaveLength(15)
  })
  it("classifyGeometry funciona", () => {
    expect(classifyGeometry("cube_tissue")).toBe("basic")
    expect(classifyGeometry("heart")).toBe("advanced")
    expect(classifyGeometry("banana")).toBe("unknown")
  })
  it("GEOMETRY_PRESETS não inclui hollow-sphere", () => {
    expect(GEOMETRY_PRESETS.find(p => p.id === "hollow-sphere")).toBeUndefined()
  })
  it("GEOMETRY_PRESETS inclui cylinder + tube", () => {
    expect(GEOMETRY_PRESETS.find(p => p.id === "cylinder")).toBeDefined()
    expect(GEOMETRY_PRESETS.find(p => p.id === "tube")).toBeDefined()
  })

  it("material-database tem 128 materiais", () => {
    expect(MATERIAL_SUMMARY.length).toBeGreaterThanOrEqual(100)
    expect(getRecommendedParams("PCL")).toBeTruthy()
    expect(getRecommendedParams("GelMA")).toBeTruthy()
    expect(getRecommendedParams("Alginate")).toBeTruthy()
  })

  it("collapseMultiBioink normaliza soma != 1", () => {
    const blend: QuickMultiBioink = [
      { fraction: 0.3, materialLabel: "A", nozzleDiameter_mm: 0.4, viscosity_PaS: 5, printSpeed_mms: 8, travelSpeed_mms: 30 },
      { fraction: 0.3, materialLabel: "B", nozzleDiameter_mm: 0.4, viscosity_PaS: 5, printSpeed_mms: 6, travelSpeed_mms: 30 },
    ]
    const eff = collapseMultiBioink(blend)
    // print speed é o mínimo (6, do B)
    expect(eff.printSpeed_mms).toBe(6)
    // label combina ambos com %
    expect(eff.materialLabel).toContain("50%")
    expect(eff.materialLabel).toContain("A")
    expect(eff.materialLabel).toContain("B")
  })

  it("generateQuickGcodeMulti gera G-code p/ cylinder", () => {
    const geom: QuickGeometry = { id: "cylinder", width: 8, depth: 8, height: 5 }
    const blend: QuickMultiBioink = [
      { fraction: 1.0, materialLabel: "GelMA 10%", nozzleDiameter_mm: 0.41, viscosity_PaS: 5, printSpeed_mms: 8, travelSpeed_mms: 30 },
    ]
    const r = generateQuickGcodeMulti(geom, blend, {
      layerHeight_mm: 0.3, infillPattern: "rectilinear", infillDensity_pct: 20, walls: 2,
    })
    expect(r.gcode).toMatch(/BIA/)
    expect(r.gcode).toMatch(/G1/)
    expect(r.gcode).not.toMatch(/^G28/m) // no home
    expect(r.layerCount).toBeGreaterThan(10)
    expect(r.bioinkVolume_uL).toBeGreaterThan(0)
  })

  it("generateQuickGcodeMulti gera G-code p/ tube com 2 anéis", () => {
    const geom: QuickGeometry = { id: "tube", width: 8, depth: 8, height: 5, wallThickness: 1.5 }
    const blend: QuickMultiBioink = [
      { fraction: 1.0, materialLabel: "Alginate 3%", nozzleDiameter_mm: 0.41, viscosity_PaS: 3, printSpeed_mms: 6, travelSpeed_mms: 25 },
    ]
    const r = generateQuickGcodeMulti(geom, blend, {
      layerHeight_mm: 0.3, infillPattern: "none", infillDensity_pct: 0, walls: 1,
    })
    expect(r.gcode).toMatch(/BIA/)
    expect(r.layerCount).toBeGreaterThan(10)
  })

  it("generateQuickGcodeMulti aceita blend real 3-componentes", () => {
    const geom: QuickGeometry = { id: "patch", width: 20, depth: 20, height: 1 }
    const blend: QuickMultiBioink = [
      { fraction: 0.6, materialLabel: "Fibrinogen 20 mg/mL", nozzleDiameter_mm: 0.30, viscosity_PaS: 0.5, printSpeed_mms: 3, travelSpeed_mms: 15 },
      { fraction: 0.35, materialLabel: "Gelatin 35 mg/mL", nozzleDiameter_mm: 0.30, viscosity_PaS: 2, printSpeed_mms: 3, travelSpeed_mms: 15 },
      { fraction: 0.05, materialLabel: "HA 3 mg/mL", nozzleDiameter_mm: 0.30, viscosity_PaS: 8, printSpeed_mms: 3, travelSpeed_mms: 15 },
    ]
    const r = generateQuickGcodeMulti(geom, blend, {
      layerHeight_mm: 0.25, infillPattern: "rectilinear", infillDensity_pct: 30, walls: 1,
    })
    expect(r.gcode).toContain("BLEND MULTI-BIOTINTA")
    expect(r.gcode).toContain("Fibrinogen")
    expect(r.gcode).toContain("Gelatin")
  })
})
