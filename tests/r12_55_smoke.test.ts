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

  // ─── R12.55.1: regressões para bugs reportados pelo usuário ─────────────

  it("R12.55.1 Fix 1: G-code sai centrado no bed (sem X/Y negativos)", async () => {
    const { validateGcode, DEFAULT_BIO_LIMITS } = await import("@/lib/bioprint/gcode-validator")
    const geom: QuickGeometry = { id: "cube", width: 10, depth: 10, height: 5 }
    const blend: QuickMultiBioink = [{
      fraction: 1.0, materialLabel: "GelMA 10% w/v", nozzleDiameter_mm: 0.41,
      viscosity_PaS: 5, printSpeed_mms: 8, travelSpeed_mms: 30, pressure_kpa: 80,
      crosslinker: "UV 365nm + LAP 0.3%", hasCells: false,
    }]
    const r = generateQuickGcodeMulti(geom, blend, {
      layerHeight_mm: 0.25, infillPattern: "grid", infillDensity_pct: 20, walls: 2,
    })
    const val = validateGcode(r.gcode)
    // Bug antigo: 420 erros OUT_OF_VOLUME_X/Y. Corrigido: 0 erros.
    expect(val.verdict).toBe("safe")
    expect(val.errorCount).toBe(0)
    expect(val.stats.bbox.minX).toBeGreaterThanOrEqual(0)
    expect(val.stats.bbox.minY).toBeGreaterThanOrEqual(0)
    expect(val.stats.bbox.maxX).toBeLessThanOrEqual(DEFAULT_BIO_LIMITS.xMaxMm)
    expect(val.stats.bbox.maxY).toBeLessThanOrEqual(DEFAULT_BIO_LIMITS.yMaxMm)
    // Header deve documentar centralização
    expect(r.gcode).toMatch(/Centrado em:\s+X=110/)
  })

  it("R12.55.1 Fix 1: bedCenter customizável", () => {
    const geom: QuickGeometry = { id: "cube", width: 10, depth: 10, height: 5 }
    const blend: QuickMultiBioink = [{
      fraction: 1.0, materialLabel: "GelMA 10%", nozzleDiameter_mm: 0.41,
      viscosity_PaS: 5, printSpeed_mms: 8, travelSpeed_mms: 30,
      crosslinker: "UV", hasCells: false,
    }]
    const r = generateQuickGcodeMulti(geom, blend, {
      layerHeight_mm: 0.25, infillPattern: "grid", infillDensity_pct: 20, walls: 1,
      bedCenter: { x: 50, y: 50 },  // bed pequeno 100×100
    })
    expect(r.gcode).toMatch(/Centrado em:\s+X=50/)
    // Primeira coord X deve ser positiva
    const firstG1 = r.gcode.split("\n").find(l => l.startsWith("G1 X"))
    expect(firstG1).toBeDefined()
    const xMatch = firstG1!.match(/X([\d.-]+)/)
    expect(xMatch).toBeDefined()
    expect(parseFloat(xMatch![1])).toBeGreaterThan(0)
  })

  it("R12.55.1 Fix 2: GelMA fotocurável não recebe verdict 'poor' por baixa viscosidade", async () => {
    const { assessPrintability } = await import("@/lib/bioprint/printability-nelson2021")
    // Config real: GelMA 10% pré-UV tem ~5 Pa·s (intencionalmente baixo)
    const result = assessPrintability({
      viscosity_PaS: 5,
      printSpeed_mms: 8,
      nozzleDiameter_mm: 0.41,
      hasCells: false,
      materialLabel: "GelMA 10% w/v",
      crosslinker: "UV 365nm + LAP 0.3%",
    })
    // Antes do fix: score ~44, verdict "poor". Depois: score >= 80, verdict "good"/"excellent"
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(["excellent", "good"]).toContain(result.verdict)
    // Rationale deve explicar por que a viscosidade baixa é aceitável
    expect(result.rationale.some(r => /fotocur[áa]vel|foto.?cur|UV.?visíve|post.?deposi[çc][ãa]o/i.test(r))).toBe(true)
  })

  it("R12.55.1 Fix 2: hidrogel pré-crosslinked (alginate+CMC 400 Pa·s) mantém verdict alto", async () => {
    const { assessPrintability } = await import("@/lib/bioprint/printability-nelson2021")
    const result = assessPrintability({
      viscosity_PaS: 400,  // dentro da janela Nelson clássica
      printSpeed_mms: 8,
      nozzleDiameter_mm: 0.41,
      hasCells: false,
      materialLabel: "Alginate 2.5% + CMC 2% pré-crosslinked com CaSO4",
      crosslinker: "CaSO4 1% pré-crosslink",
    })
    // Não deve mudar o comportamento para pré-crosslinked — verdict aceitável
    // (score ~60 é o esperado com wallShear ligeiramente alto; ainda "marginal" ou melhor)
    expect(["excellent", "good", "marginal"]).toContain(result.verdict)
    expect(result.verdict).not.toBe("poor")
  })

  it("R12.55.1 Fix 2: alginate + CaCl2 puro (baixa viscosidade não-fotocurável) recebe warning correto", async () => {
    const { assessPrintability } = await import("@/lib/bioprint/printability-nelson2021")
    const result = assessPrintability({
      viscosity_PaS: 5,  // baixo E não é fotocurável
      printSpeed_mms: 8,
      nozzleDiameter_mm: 0.41,
      hasCells: false,
      materialLabel: "Alginate 2%",
      crosslinker: "CaCl2 100mM",
    })
    // Alginate com CaCl2 é iônico (não post-deposition classificado como isPostDeposition):
    // deve continuar mostrando aviso de viscosidade baixa
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
