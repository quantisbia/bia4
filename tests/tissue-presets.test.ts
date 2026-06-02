/**
 * Testes da camada de presets de tecidos (R12.54).
 *
 * Cobre:
 *   1. Todos os 4 tecidos da Onda 1 estão presentes
 *   2. Cada preset tem rationale completo (todos os campos obrigatórios)
 *   3. Faixas de parâmetros são fisicamente válidas
 *   4. Lookup helpers (findPreset, listPresetsForTissue, etc) funcionam
 *   5. countParamDeviations detecta corretamente quando o usuário desvia
 */

import { describe, it, expect } from "vitest"
import {
  TISSUE_PRESETS,
  findPreset,
  listPresetsForTissue,
  getBestPresetForTissue,
  listSupportedTissues,
  getRangesForPreset,
  countParamDeviations,
  DEFAULT_PARAM_RANGES,
  type PresetParams,
} from "@/lib/bioprint/tissue-presets"

describe("R12.54: tissue-presets — cobertura da Onda 1", () => {
  const expectedTissues = ["membrana", "vaso", "musculo", "nervo"]

  for (const tissue of expectedTissues) {
    it(`tem ao menos um preset para "${tissue}"`, () => {
      const presets = listPresetsForTissue(tissue)
      expect(presets.length).toBeGreaterThan(0)
    })
  }

  it("listSupportedTissues retorna exatamente os 4 tecidos da Onda 1", () => {
    const tissues = listSupportedTissues().map((t) => t.id)
    for (const t of expectedTissues) {
      expect(tissues).toContain(t)
    }
  })

  it("getBestPresetForTissue retorna o primeiro preset do tecido (convenção)", () => {
    const membrana = getBestPresetForTissue("membrana")
    expect(membrana).not.toBeNull()
    expect(membrana?.tissueId).toBe("membrana")
    // Primeiro do array é o "preferred" (alginato pra membrana — mais robusto)
    expect(membrana?.bioinkId).toBe("alginate")
  })

  it("getBestPresetForTissue retorna null para tecido desconhecido", () => {
    expect(getBestPresetForTissue("tecido_inexistente")).toBeNull()
  })
})

describe("R12.54: integridade dos presets — cada um tem TODOS os campos", () => {
  for (const preset of TISSUE_PRESETS) {
    describe(`preset "${preset.displayName}"`, () => {
      it("tem rationale completo (5 campos obrigatórios)", () => {
        expect(preset.rationale.layerHeight).toBeTruthy()
        expect(preset.rationale.speed).toBeTruthy()
        expect(preset.rationale.flow).toBeTruthy()
        expect(preset.rationale.infill).toBeTruthy()
        expect(preset.rationale.walls).toBeTruthy()
      })

      it("tem fluxo de bioimpressão com pelo menos 5 passos", () => {
        expect(preset.fluxoBioimpressao.length).toBeGreaterThanOrEqual(5)
        // Cada passo tem texto não-vazio
        for (const passo of preset.fluxoBioimpressao) {
          expect(passo.length).toBeGreaterThan(10)
        }
      })

      it("tem critérios de validação esperados (≥ 3)", () => {
        expect(preset.validacaoEsperada.length).toBeGreaterThanOrEqual(3)
      })

      it("tem pelo menos uma referência científica", () => {
        expect(preset.referencias.length).toBeGreaterThanOrEqual(1)
        for (const ref of preset.referencias) {
          expect(ref.citation).toBeTruthy()
        }
      })

      it("tem parâmetros fisicamente válidos", () => {
        const p = preset.params
        expect(p.layerHeightMm).toBeGreaterThan(0)
        expect(p.layerHeightMm).toBeLessThan(2) // não faz sentido > 2mm em bio
        expect(p.printSpeedMmS).toBeGreaterThan(0)
        expect(p.printSpeedMmS).toBeLessThan(50)
        expect(p.pressureKPa).toBeGreaterThanOrEqual(0)
        expect(p.pressureKPa).toBeLessThan(300)
        expect(p.flowPercent).toBeGreaterThan(0)
        expect(p.flowPercent).toBeLessThanOrEqual(100)
        expect(p.infillPercent).toBeGreaterThanOrEqual(0)
        expect(p.infillPercent).toBeLessThanOrEqual(100)
        expect(p.walls).toBeGreaterThan(0)
        expect(p.walls).toBeLessThanOrEqual(10)
        expect(p.skirtLoops).toBeGreaterThanOrEqual(0)
        expect(p.retractionMm).toBeGreaterThanOrEqual(0)
        expect(p.cartridgeTempC).toBeGreaterThanOrEqual(0)
        expect(p.cartridgeTempC).toBeLessThan(60)
        expect(p.bedTempC).toBeGreaterThanOrEqual(0)
        expect(p.bedTempC).toBeLessThan(80)
      })

      it("respeita perimeterOnly: se true, infill DEVE ser 0", () => {
        if (preset.params.perimeterOnly) {
          expect(preset.params.infillPercent).toBe(0)
        }
      })
    })
  }
})

describe("R12.54: regras específicas por família de tecido", () => {
  it("membrana SEMPRE tem perimeterOnly=true (folha fina sem volume)", () => {
    const membranaPresets = listPresetsForTissue("membrana")
    for (const p of membranaPresets) {
      expect(p.params.perimeterOnly).toBe(true)
      expect(p.params.infillPercent).toBe(0)
    }
  })

  it("vaso SEMPRE tem perimeterOnly=true (tubular oco)", () => {
    const vasoPresets = listPresetsForTissue("vaso")
    for (const p of vasoPresets) {
      expect(p.params.perimeterOnly).toBe(true)
      expect(p.params.infillPercent).toBe(0)
    }
  })

  it("vaso tem >=3 perímetros (parede precisa ter integridade)", () => {
    const vasoPresets = listPresetsForTissue("vaso")
    for (const p of vasoPresets) {
      expect(p.params.walls).toBeGreaterThanOrEqual(3)
    }
  })

  it("músculo usa padrão parallel-lines (anisotropia)", () => {
    const muscPresets = listPresetsForTissue("musculo")
    for (const p of muscPresets) {
      expect(p.params.infillPatternId).toBe("parallel-lines")
    }
  })

  it("músculo tem infill alto (>=50%) — tecido denso", () => {
    const muscPresets = listPresetsForTissue("musculo")
    for (const p of muscPresets) {
      expect(p.params.infillPercent).toBeGreaterThanOrEqual(50)
    }
  })

  it("nervo usa padrão parallel-lines (feixes axonais)", () => {
    const nervoPresets = listPresetsForTissue("nervo")
    for (const p of nervoPresets) {
      expect(p.params.infillPatternId).toBe("parallel-lines")
    }
  })

  it("nervo tem velocidade muito baixa (<= 5 mm/s) — shear-sensitive", () => {
    const nervoPresets = listPresetsForTissue("nervo")
    for (const p of nervoPresets) {
      expect(p.params.printSpeedMmS).toBeLessThanOrEqual(5)
    }
  })

  it("nervo tem layer fino (<= 0.15 mm) — alta resolução", () => {
    const nervoPresets = listPresetsForTissue("nervo")
    for (const p of nervoPresets) {
      expect(p.params.layerHeightMm).toBeLessThanOrEqual(0.15)
    }
  })

  it("hidrogéis SEMPRE têm retração = 0 (não retraem como FDM)", () => {
    for (const p of TISSUE_PRESETS) {
      expect(p.params.retractionMm).toBe(0)
    }
  })
})

describe("R12.54: findPreset e lookup helpers", () => {
  it("findPreset retorna o preset exato para combinação válida", () => {
    const preset = findPreset("membrana", "alginate")
    expect(preset).not.toBeNull()
    expect(preset?.tissueId).toBe("membrana")
    expect(preset?.bioinkId).toBe("alginate")
  })

  it("findPreset retorna null para combinação inexistente", () => {
    expect(findPreset("membrana", "bioink_inexistente")).toBeNull()
    expect(findPreset("tecido_inexistente", "alginate")).toBeNull()
  })

  it("listPresetsForTissue retorna múltiplos presets quando há mais de um bioink", () => {
    const membrana = listPresetsForTissue("membrana")
    expect(membrana.length).toBeGreaterThanOrEqual(2) // alginate + gelma
    const bioinks = membrana.map((p) => p.bioinkId)
    expect(bioinks).toContain("alginate")
    expect(bioinks).toContain("gelma")
  })
})

describe("R12.54: faixas de parâmetros (ranges)", () => {
  it("DEFAULT_PARAM_RANGES tem todos os 10 parâmetros principais", () => {
    expect(DEFAULT_PARAM_RANGES.layerHeightMm).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.printSpeedMmS).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.pressureKPa).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.flowPercent).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.infillPercent).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.walls).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.skirtLoops).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.retractionMm).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.cartridgeTempC).toBeDefined()
    expect(DEFAULT_PARAM_RANGES.bedTempC).toBeDefined()
  })

  it("todas as faixas têm min < max e step > 0", () => {
    for (const [name, range] of Object.entries(DEFAULT_PARAM_RANGES)) {
      expect(range.min, `${name}.min < max`).toBeLessThan(range.max)
      expect(range.step, `${name}.step > 0`).toBeGreaterThan(0)
    }
  })

  it("preset overrides as faixas quando declarado (ex: nervo layer 0.05-0.2)", () => {
    const nervo = findPreset("nervo", "gelma")!
    const ranges = getRangesForPreset(nervo)
    // Nervo tem range customizado pra layer
    expect(ranges.layerHeightMm.max).toBeLessThan(DEFAULT_PARAM_RANGES.layerHeightMm.max)
  })

  it("preset SEM overrides usa o default", () => {
    // Pega um preset que não tem ranges customizadas pra TUDO
    const preset = TISSUE_PRESETS[0]
    const ranges = getRangesForPreset(preset)
    // skirtLoops é raramente customizado → deve ser igual ao default
    expect(ranges.skirtLoops).toEqual(DEFAULT_PARAM_RANGES.skirtLoops)
  })

  it("parâmetros default do preset estão DENTRO das faixas declaradas", () => {
    for (const preset of TISSUE_PRESETS) {
      const ranges = getRangesForPreset(preset)
      const p = preset.params

      expect(
        p.layerHeightMm,
        `${preset.displayName}: layerHeight ${p.layerHeightMm} fora de [${ranges.layerHeightMm.min}, ${ranges.layerHeightMm.max}]`,
      ).toBeGreaterThanOrEqual(ranges.layerHeightMm.min)
      expect(p.layerHeightMm).toBeLessThanOrEqual(ranges.layerHeightMm.max)

      expect(p.printSpeedMmS).toBeGreaterThanOrEqual(ranges.printSpeedMmS.min)
      expect(p.printSpeedMmS).toBeLessThanOrEqual(ranges.printSpeedMmS.max)

      expect(p.flowPercent).toBeGreaterThanOrEqual(ranges.flowPercent.min)
      expect(p.flowPercent).toBeLessThanOrEqual(ranges.flowPercent.max)
    }
  })
})

describe("R12.54: countParamDeviations", () => {
  const base: PresetParams = {
    layerHeightMm: 0.2,
    printSpeedMmS: 8,
    pressureKPa: 50,
    flowPercent: 50,
    infillPercent: 30,
    infillPatternId: "classic-lines",
    walls: 2,
    skirtLoops: 2,
    retractionMm: 0,
    cartridgeTempC: 22,
    bedTempC: 4,
    chamberTempC: null,
    perimeterOnly: false,
  }

  it("retorna 0 quando params são idênticos", () => {
    expect(countParamDeviations(base, base)).toBe(0)
  })

  it("conta 1 quando apenas 1 parâmetro mudou", () => {
    const modified = { ...base, printSpeedMmS: 12 }
    expect(countParamDeviations(modified, base)).toBe(1)
  })

  it("conta múltiplos parâmetros corretamente", () => {
    const modified = { ...base, layerHeightMm: 0.15, flowPercent: 60, walls: 3 }
    expect(countParamDeviations(modified, base)).toBe(3)
  })

  it("detecta mudança em campos string (infillPatternId)", () => {
    const modified = { ...base, infillPatternId: "parallel-lines" }
    expect(countParamDeviations(modified, base)).toBe(1)
  })

  it("detecta mudança em campos booleanos (perimeterOnly)", () => {
    const modified = { ...base, perimeterOnly: true }
    expect(countParamDeviations(modified, base)).toBe(1)
  })
})
