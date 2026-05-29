import { describe, it, expect } from "vitest"
import {
  generateQuickGcode,
  type QuickGeometry,
  type QuickBioinkParams,
  type QuickGcodeOptions,
} from "@/lib/bioprint/quick-gcode"

// ═══════════════════════════════════════════════════════════════════
// CENÁRIO 5 (R12.47/R12.48): "Gerar G-code com altura de camada inválida
// → confirmar que sistema mostra erro"
//
// + CENÁRIO 4 (extra): G-code completo deve ter footer de purge-safe
//   (M83 + G92 E0 + G91 + G1 Z20 + G90 + M400), que foi a correção
//   da R12.45 contra "vazamento de hidrogel ao final".
//
// + sanity: G-code gerado tem G1 (movimentos) e comentário BIA
// ═══════════════════════════════════════════════════════════════════

const baseGeom: QuickGeometry = {
  id: "cube",
  width: 10,
  depth: 10,
  height: 5,
}

const baseBioink: QuickBioinkParams = {
  materialLabel: "GelMA 10%",
  nozzleDiameter_mm: 0.41,
  viscosity_PaS: 5,
  printSpeed_mms: 8,
  travelSpeed_mms: 30,
  pressure_kpa: 80,
  hasCells: false,
}

const baseOpts: QuickGcodeOptions = {
  layerHeight_mm: 0.2,
  infillPattern: "rectilinear",
  infillDensity_pct: 30,
  walls: 2,
  jobName: "test-job",
}

describe("cenário 5: altura de camada inválida → erro claro", () => {
  it("layerHeight = 0 → lança erro", () => {
    expect(() =>
      generateQuickGcode(baseGeom, baseBioink, { ...baseOpts, layerHeight_mm: 0 }),
    ).toThrow(/layer height/i)
  })

  it("layerHeight negativo → lança erro", () => {
    expect(() =>
      generateQuickGcode(baseGeom, baseBioink, { ...baseOpts, layerHeight_mm: -0.1 }),
    ).toThrow(/layer height/i)
  })

  it("layerHeight > 1 mm → lança erro (irreal para hidrogel)", () => {
    expect(() =>
      generateQuickGcode(baseGeom, baseBioink, { ...baseOpts, layerHeight_mm: 1.5 }),
    ).toThrow(/layer height/i)
  })

  it("nozzle = 0 → lança erro", () => {
    expect(() =>
      generateQuickGcode(
        baseGeom,
        { ...baseBioink, nozzleDiameter_mm: 0 },
        baseOpts,
      ),
    ).toThrow(/bico/i)
  })

  it("dimensão negativa → lança erro", () => {
    expect(() =>
      generateQuickGcode({ ...baseGeom, height: -1 }, baseBioink, baseOpts),
    ).toThrow(/positivas/i)
  })

  it("layerHeight válido (0.2 mm) → gera G-code sem lançar", () => {
    expect(() => generateQuickGcode(baseGeom, baseBioink, baseOpts)).not.toThrow()
  })

  it("layerHeight = 80% do nozzle → gera mas com warning", () => {
    const result = generateQuickGcode(baseGeom, baseBioink, {
      ...baseOpts,
      layerHeight_mm: baseBioink.nozzleDiameter_mm * 0.85,
    })
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.join(" ").toLowerCase()).toMatch(/layer height|nozzle|adesão/i)
  })
})

describe("footer de segurança (R12.45 anti-vazamento)", () => {
  // R12.45 corrigiu o vazamento de hidrogel no fim da impressão.
  // O footer DEVE conter, nesta ordem:
  //   1. M83 (extrusão relativa)
  //   2. G92 E0 (zera contador)
  //   3. G91 (movimento relativo)
  //   4. G1 Z... (levantar cabeçote)
  //   5. G90 (volta para absoluto)
  //   6. M400 (espera buffer esvaziar)
  //
  // Este teste protege contra "alguém remover o footer" em refactors futuros.

  it("inclui M83 no footer (extrusão relativa antes de retração)", () => {
    const { gcode } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    expect(gcode).toMatch(/M83/)
  })

  it("inclui G92 E0 (zera extrusor no final)", () => {
    const { gcode } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    expect(gcode).toMatch(/G92\s+E0/)
  })

  it("inclui G91 → G1 Z → G90 (levanta cabeçote em modo relativo)", () => {
    const { gcode } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    expect(gcode).toMatch(/G91/)
    expect(gcode).toMatch(/G1\s+Z\d+/)
    expect(gcode).toMatch(/G90/)
  })

  it("inclui M400 (espera buffer esvaziar antes de finalizar)", () => {
    const { gcode } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    expect(gcode).toMatch(/M400/)
  })

  it("NÃO inclui G28 (não destrói bandeja com células)", () => {
    const { gcode } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    // R12.45: G28 destruiria bandeja com células → proibido.
    expect(gcode).not.toMatch(/^G28/m)
  })
})

describe("qualidade do G-code gerado", () => {
  it("tem header BIA identificável", () => {
    const { gcode } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    // O header deve mencionar BIA, ou o material, ou o jobName
    const header = gcode.split("\n").slice(0, 50).join("\n")
    expect(header.toLowerCase()).toMatch(/bia|gelma|test-job|biotinta/i)
  })

  it("contém pelo menos um G1 (movimento extrudado)", () => {
    const { gcode } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    const g1Lines = gcode.split("\n").filter((l) => /^G1\b/.test(l.trim()))
    expect(g1Lines.length).toBeGreaterThan(0)
  })

  it("layerCount bate com height / layerHeight (com tolerância de 1)", () => {
    const result = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    const expected = Math.ceil(baseGeom.height / baseOpts.layerHeight_mm)
    expect(Math.abs(result.layerCount - expected)).toBeLessThanOrEqual(1)
  })

  it("retorna avaliação de imprimibilidade (Nelson 2021)", () => {
    const { printability } = generateQuickGcode(baseGeom, baseBioink, baseOpts)
    expect(printability).toBeDefined()
  })
})

describe("grid com infill rectilinear → produz linhas internas (R12.46)", () => {
  // R12.46 corrigiu "grid só mostrava contorno". Este teste protege
  // contra alguém remover o infill do grid de novo.

  it("grid 20×20×2 mm com rectilinear 50% tem MAIS G1 do que walls=2 sem infill", () => {
    const gridGeom: QuickGeometry = {
      id: "grid",
      width: 20,
      depth: 20,
      height: 2,
      pitch: 2,
    }
    const withInfill = generateQuickGcode(gridGeom, baseBioink, {
      ...baseOpts,
      infillPattern: "rectilinear",
      infillDensity_pct: 50,
    })
    const withoutInfill = generateQuickGcode(gridGeom, baseBioink, {
      ...baseOpts,
      infillPattern: "none",
      infillDensity_pct: 0,
    })

    // Com infill 50% deve produzir significativamente mais moves do que sem
    expect(withInfill.moveCount).toBeGreaterThan(withoutInfill.moveCount)
  })
})
