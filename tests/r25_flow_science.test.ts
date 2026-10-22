/**
 * R25 · Fluxo de biotinta com racional científico (extrusão mecânica)
 * — por que não saía, e o que o G-code faz agora para sair.
 */
import { describe, it, expect } from "vitest"
import { BIOINK_CLASSES, classifyBioink, diagnoseFlow, needleDeadVolume_uL, suggestedFactor } from "../src/lib/slicer/flow-science"
import { BASIC_PROFILES, ADVANCED_PROFILES } from "../src/lib/slicer/profiles"
import { DEFAULT_EXTRUSION_SYRINGE_10ML, syringeArea_mm2 } from "../src/lib/slicer/extrusion"
import { sliceMesh } from "../src/lib/slicer/slice"
import { PRIMITIVE_CATALOG } from "../src/lib/slicer/primitives"
const makeBox = (p: Record<string, number>) => PRIMITIVE_CATALOG.find((c) => c.id === "box")!.make(p)
import { baseParams } from "../src/lib/slicer/profiles"
import { FLOW_MAX, nextFlowBump } from "../src/lib/bioprint/flow-memory"

describe("R25 · classes de biotinta e fatores da literatura", () => {
  it("classifica materiais comuns", () => {
    expect(classifyBioink("Alginato 3% + Gelatina 7%")).toBe("shear_thinning") // blend
    expect(classifyBioink("GelMA 10%")).toBe("soft_hydrogel")
    expect(classifyBioink("Pluronic F127 30%")).toBe("sacrificial")
    expect(classifyBioink("PCL + HAp")).toBe("paste")
    expect(classifyBioink("Colágeno em banho FRESH")).toBe("support_bath")
  })
  it("fatores dentro das faixas e acima de 1 para hidrogéis", () => {
    for (const c of Object.values(BIOINK_CLASSES)) {
      expect(c.extrusionFactor).toBeGreaterThanOrEqual(c.factorRange[0])
      expect(c.extrusionFactor).toBeLessThanOrEqual(c.factorRange[1])
    }
    expect(suggestedFactor("GelMA")).toBeGreaterThan(1.3)
    expect(suggestedFactor("hidroxiapatita")).toBeLessThan(1.3)
  })
  it("dead volume de 22G×25 mm + luer ≈ 43 µL", () => {
    const v = needleDeadVolume_uL(0.41)
    expect(v).toBeGreaterThan(40); expect(v).toBeLessThan(46)
  })
})

describe("R25 · diagnóstico: o modelo antigo (fator 1,0, 10 mL, 5 mm/s) não saía", () => {
  const P = { lineWidth_mm: 0.471, layerHeight_mm: 0.33, speedPerimeter_mms: 5, nozzleDiameter_mm: 0.41 }
  it("antes: êmbolo < 0,02 mm/s → very_low", () => {
    const d = diagnoseFlow(P, { ...DEFAULT_EXTRUSION_SYRINGE_10ML, flowMultiplier: 1.0 }, "GelMA")
    expect(d.plungerSpeed_mms).toBeLessThan(0.01)
    expect(d.status).toBe("very_low")
    expect(d.recommendations.join(" ")).toMatch(/3 mL|5 mL/)
  })
  it("depois: fator 1,6 + seringa 3 mL + 8 mm/s → ok", () => {
    const d = diagnoseFlow({ ...P, speedPerimeter_mms: 8 }, { ...DEFAULT_EXTRUSION_SYRINGE_10ML, flowMultiplier: 1.6, syringe: { volume_mL: 3, innerDiameter_mm: 8.66 } }, "GelMA")
    expect(d.status).toBe("ok")
    expect(d.plungerSpeed_mms).toBeGreaterThanOrEqual(0.02)
    expect(d.flowEffective_uLs).toBeGreaterThanOrEqual(0.8)
  })
  it("pré-carga no START = dead volume + extra da classe", () => {
    const d = diagnoseFlow(P, { ...DEFAULT_EXTRUSION_SYRINGE_10ML, flowMultiplier: 1.6 }, "GelMA")
    expect(d.startPrime_uL).toBeCloseTo(needleDeadVolume_uL(0.41) + BIOINK_CLASSES.soft_hydrogel.extraPrime_uL, 0)
    expect(d.startPrime_Emm).toBeGreaterThan(0.25) // ≈ 51 µL / 165 mm² ≈ 0,31 mm — visível
  })
})

describe("R25 · perfis e G-code", () => {
  it("nenhum perfil usa fator 1,0 universal; todos têm classe", () => {
    for (const pf of [...BASIC_PROFILES, ...ADVANCED_PROFILES]) {
      expect(pf.extrusion.flowMultiplier, pf.id).toBeGreaterThan(1.05)
      expect(pf.extrusion.bioinkClass, pf.id).toBeTruthy()
    }
  })
  it("G-code começa com PRÉ-CARGA (G1 E ≥ 0,2 mm) antes do primeiro cordão e declara o fator", () => {
    const mesh = makeBox({ x: 10, y: 10, z: 1 })
    const pf = BASIC_PROFILES[0]
    const r = sliceMesh({ mesh, params: { ...baseParams(0.41), ...pf.params }, extrusion: pf.extrusion, profileId: pf.id, profileName: pf.name, jobName: "t" })
    const lines = r.gcode.split("\n")
    const iPrime = lines.findIndex((l) => l.includes("PRÉ-CARGA R25"))
    expect(iPrime).toBeGreaterThan(0)
    const primeLine = lines[iPrime + 1]
    const e = Number(/G1 E([\d.]+)/.exec(primeLine)?.[1])
    expect(e).toBeGreaterThan(0.2)
    const firstBead = lines.findIndex((l, i) => i > iPrime && /^G1 X[\d.-]+ Y[\d.-]+ E[\d.]+/.test(l))
    expect(firstBead).toBeGreaterThan(iPrime)
    expect(r.gcode).toMatch(/; Extrusão: fator 1\.60×/)
    // sem G28, com G92
    expect(r.gcode).not.toMatch(/^G28/m); expect(r.gcode).toMatch(/G92 X0 Y0 Z/)
  })
  it("startPrime_uL = 0 desliga a pré-carga", () => {
    const mesh = makeBox({ x: 10, y: 10, z: 1 })
    const pf = BASIC_PROFILES[0]
    const r = sliceMesh({ mesh, params: { ...baseParams(0.41), ...pf.params }, extrusion: { ...pf.extrusion, startPrime_uL: 0 }, profileId: pf.id, profileName: pf.name, jobName: "t" })
    expect(r.gcode).not.toContain("PRÉ-CARGA R25")
  })
  it("sliceMesh avisa quando o êmbolo vai andar devagar demais (seringa 10 mL, fator 1,0)", () => {
    const mesh = makeBox({ x: 10, y: 10, z: 1 })
    const r = sliceMesh({ mesh, params: baseParams(0.41), extrusion: { ...DEFAULT_EXTRUSION_SYRINGE_10ML, flowMultiplier: 1.0, bioinkClass: "soft_hydrogel" }, profileId: "x", profileName: "x", jobName: "t" })
    expect(r.warnings.some((w) => w.code === "flow_very_low" || w.code === "flow_low")).toBe(true)
  })
  it("M221 pode ir até 999 e os saltos são proporcionais", () => {
    expect(FLOW_MAX).toBe(999)
    expect(nextFlowBump(100)).toBe(150)
    expect(nextFlowBump(300)).toBe(400)
  })
  it("área da seringa 10 mL ≈ 165 mm² (1 µL = 0,006 mm de êmbolo) — justifica seringa menor", () => {
    expect(syringeArea_mm2({ volume_mL: 10, innerDiameter_mm: 14.5 })).toBeCloseTo(165.1, 0)
    expect(syringeArea_mm2({ volume_mL: 3, innerDiameter_mm: 8.66 })).toBeCloseTo(58.9, 0)
  })
})
