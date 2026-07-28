/**
 * R12.59 · Smoke test — Fluxo contínuo Etapa 1+2 → Etapa 3 (Fatiamento)
 * ──────────────────────────────────────────────────────────────────────
 * Valida os helpers de conversão contexto→Quick usados pelo BasicModePanel
 * refatorado. Antes o painel mantinha estado local próprio de geometria e
 * blend, DUPLICANDO Etapas 1/2 (e contradizendo a R12.58 com 4 slots). Agora
 * geometria e blend vêm 100% do contexto.
 *
 * Escopo dos testes:
 *  - toQuickGeometryId: mapeia engineId → QuickGeometryId + fallback "cube"
 *  - extractDims: extrai width/depth/height de state.model.params + defaults
 *  - contextToQuickGeometry: integra ambos
 *  - formulationToQuick: converte 1 BioinkFormulation → QuickBioinkFormulation
 *  - contextToQuickBlend: prioriza formulations[] → legacy → default
 *  - summarizeModel / summarizeFormulation: strings dos cards read-only
 *
 * NÃO renderiza React — helpers são puros, roda rápido.
 */
import { describe, it, expect } from "vitest"
import {
  toQuickGeometryId,
  extractDims,
  contextToQuickGeometry,
  contextToQuickBlend,
  formulationToQuick,
  summarizeModel,
  summarizeFormulation,
  type ModelSnapshotForQuick,
  type BioinkSnapshotForQuick,
} from "@/lib/bioprint/context-to-quick"
import type { BioinkFormulation } from "@/lib/bioprint/process-context"

// ─── Fixtures ─────────────────────────────────────────────────────────────

const fGelMAStructural: BioinkFormulation = {
  tool: 0,
  color: "#22d3ee",
  role: "structural",
  material: "GelMA",
  materialId: "gelma",
  concentration: 8,
  crosslinker: "UV 365 nm + LAP",
  crosslinkerConc: 0.3,
  cellType: null,
  cellDensityMillionMl: null,
  additives: [],
  rheology: { viscosityPaS: 5 },
}

const fAlginateCellular: BioinkFormulation = {
  tool: 1,
  color: "#a78bfa",
  role: "cellular",
  material: "Alginato de Sódio",
  materialId: "alginate",
  concentration: 3,
  crosslinker: "CaCl₂",
  crosslinkerConc: 100,
  cellType: "hMSC",
  cellDensityMillionMl: 5,
  additives: ["VEGF"],
  rheology: { viscosityPaS: 3 },
}

const emptyBioink: BioinkSnapshotForQuick = {
  formulations: [],
  material: null,
  concentration: null,
  cellType: null,
  cellDensityMillionMl: null,
  crosslinker: null,
  rheology: null,
}

const legacyOnlyBioink: BioinkSnapshotForQuick = {
  formulations: [],
  material: "GelMA",
  concentration: 10,
  cellType: null,
  cellDensityMillionMl: null,
  crosslinker: "UV 365nm",
  rheology: null,
}

// ─── Testes: geometria ────────────────────────────────────────────────────

describe("R12.59 · toQuickGeometryId", () => {
  it("mapeia cube_tissue → cube", () => {
    expect(toQuickGeometryId("cube_tissue")).toBe("cube")
  })

  it("mapeia skin_cylinder → cylinder", () => {
    expect(toQuickGeometryId("skin_cylinder")).toBe("cylinder")
  })

  it("mapeia disk → disk (id igual)", () => {
    expect(toQuickGeometryId("disk")).toBe("disk")
  })

  it("mapeia membrane → patch", () => {
    expect(toQuickGeometryId("membrane")).toBe("patch")
  })

  it("mapeia vessel → tube", () => {
    expect(toQuickGeometryId("vessel")).toBe("tube")
  })

  it("retorna 'cube' como fallback para null", () => {
    expect(toQuickGeometryId(null)).toBe("cube")
  })

  it("retorna 'cube' como fallback para undefined", () => {
    expect(toQuickGeometryId(undefined)).toBe("cube")
  })

  it("retorna 'cube' como fallback para id desconhecido", () => {
    expect(toQuickGeometryId("chimera_organ_xyz")).toBe("cube")
  })
})

describe("R12.59 · extractDims", () => {
  it("usa params quando presentes", () => {
    const geom = extractDims("cube", { width: 20, depth: 15, height: 8 })
    expect(geom.width).toBe(20)
    expect(geom.depth).toBe(15)
    expect(geom.height).toBe(8)
    expect(geom.id).toBe("cube")
  })

  it("usa defaults do preset quando params é null", () => {
    const geom = extractDims("cube", null)
    // Default do preset cube = {width:10, depth:10, height:5}
    expect(geom.width).toBe(10)
    expect(geom.depth).toBe(10)
    expect(geom.height).toBe(5)
  })

  it("usa defaults para valores inválidos (0, negativo, NaN)", () => {
    const geom = extractDims("cube", { width: 0, depth: -5, height: NaN })
    expect(geom.width).toBe(10)
    expect(geom.depth).toBe(10)
    expect(geom.height).toBe(5)
  })

  it("ignora valores string em params", () => {
    // string em vez de number → deve cair no default
    const geom = extractDims("cube", { width: "20" as unknown as number })
    expect(geom.width).toBe(10)  // fallback
  })

  it("aceita wallThickness em tube", () => {
    const geom = extractDims("tube", { width: 8, depth: 8, height: 10, wallThickness: 2 })
    expect(geom.wallThickness).toBe(2)
  })

  it("ignora wallThickness em geometrias não-tube", () => {
    const geom = extractDims("cube", { width: 10, depth: 10, height: 5, wallThickness: 2 })
    expect(geom.wallThickness).toBeUndefined()
  })

  it("aceita pitch em grid", () => {
    const geom = extractDims("grid", { width: 15, depth: 15, height: 3, pitch: 2 })
    expect(geom.pitch).toBe(2)
  })

  it("ignora pitch em geometrias não-grid", () => {
    const geom = extractDims("cube", { width: 10, depth: 10, height: 5, pitch: 2 })
    expect(geom.pitch).toBeUndefined()
  })
})

describe("R12.59 · contextToQuickGeometry", () => {
  it("integra id + dims em uma chamada", () => {
    const model: ModelSnapshotForQuick = {
      geometryId: "cube_tissue",
      params: { width: 20, depth: 15, height: 8 },
    }
    const geom = contextToQuickGeometry(model)
    expect(geom.id).toBe("cube")
    expect(geom.width).toBe(20)
    expect(geom.depth).toBe(15)
    expect(geom.height).toBe(8)
  })

  it("cai em cube+defaults quando model está vazio", () => {
    const model: ModelSnapshotForQuick = { geometryId: null, params: null }
    const geom = contextToQuickGeometry(model)
    expect(geom.id).toBe("cube")
    expect(geom.width).toBe(10)
  })

  it("membrane com params usa mapping patch", () => {
    const model: ModelSnapshotForQuick = {
      geometryId: "membrane",
      params: { width: 30, depth: 30, height: 2 },
    }
    const geom = contextToQuickGeometry(model)
    expect(geom.id).toBe("patch")
    expect(geom.width).toBe(30)
    expect(geom.height).toBe(2)
  })
})

// ─── Testes: biotinta ─────────────────────────────────────────────────────

describe("R12.59 · formulationToQuick", () => {
  it("converte GelMA estrutural com fraction 1.0", () => {
    const q = formulationToQuick(fGelMAStructural, 1.0)
    expect(q.fraction).toBe(1.0)
    expect(q.materialLabel).toBe("GelMA 8% w/v")
    expect(q.hasCells).toBe(false)
    expect(q.cellType).toBeNull()
    expect(q.crosslinker).toBe("UV 365 nm + LAP")
    expect(q.pressure_kpa).toBe(80)  // GelMA sem células
    expect(q.printSpeed_mms).toBe(8)  // sem células
  })

  it("converte Alginato celular com fraction 0.5", () => {
    const q = formulationToQuick(fAlginateCellular, 0.5)
    expect(q.fraction).toBe(0.5)
    expect(q.materialLabel).toBe("Alginato de Sódio 3% w/v")
    expect(q.hasCells).toBe(true)
    expect(q.cellType).toBe("hMSC")
    expect(q.cellDensity_M_per_mL).toBe(5)
    expect(q.pressure_kpa).toBe(60)  // com células → Nelson 2021 safe
    expect(q.printSpeed_mms).toBe(5)  // com células → devagar
  })

  it("usa rheology.viscosityPaS quando disponível", () => {
    const q = formulationToQuick(fGelMAStructural, 1.0)
    expect(q.viscosity_PaS).toBe(5)  // do rheology
  })

  it("fallback de viscosidade quando rheology é null", () => {
    const f: BioinkFormulation = { ...fGelMAStructural, rheology: null }
    const q = formulationToQuick(f, 1.0)
    expect(q.viscosity_PaS).toBe(5)  // heurística GelMA = 5
  })
})

describe("R12.59 · contextToQuickBlend", () => {
  it("usa formulations[] quando tem 1 item (fraction=1.0)", () => {
    const bioink: BioinkSnapshotForQuick = {
      ...emptyBioink,
      formulations: [fGelMAStructural],
    }
    const blend = contextToQuickBlend(bioink)
    expect(blend).toHaveLength(1)
    expect(blend[0].fraction).toBe(1.0)
    expect(blend[0].materialLabel).toContain("GelMA")
  })

  it("usa formulations[] com 2 itens (fraction=0.5 cada)", () => {
    const bioink: BioinkSnapshotForQuick = {
      ...emptyBioink,
      formulations: [fGelMAStructural, fAlginateCellular],
    }
    const blend = contextToQuickBlend(bioink)
    expect(blend).toHaveLength(2)
    expect(blend[0].fraction).toBe(0.5)
    expect(blend[1].fraction).toBe(0.5)
    // Ordem preservada
    expect(blend[0].materialLabel).toContain("GelMA")
    expect(blend[1].materialLabel).toContain("Alginato")
    // Célula está na 2ª biotinta
    expect(blend[0].hasCells).toBe(false)
    expect(blend[1].hasCells).toBe(true)
  })

  it("frações somam ~1.0 com 2 biotintas", () => {
    const bioink: BioinkSnapshotForQuick = {
      ...emptyBioink,
      formulations: [fGelMAStructural, fAlginateCellular],
    }
    const blend = contextToQuickBlend(bioink)
    const sum = blend.reduce((acc, f) => acc + f.fraction, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it("respeita R12.58: ao dar 2 formulations, blend tem exatamente 2 itens", () => {
    const bioink: BioinkSnapshotForQuick = {
      ...emptyBioink,
      formulations: [fGelMAStructural, fAlginateCellular],
    }
    const blend = contextToQuickBlend(bioink)
    // NUNCA deve ter 4 slots (contradição eliminada pela R12.59)
    expect(blend.length).toBeLessThanOrEqual(2)
    expect(blend.length).toBe(2)
  })

  it("usa legacy fields quando formulations[] está vazio", () => {
    const blend = contextToQuickBlend(legacyOnlyBioink)
    expect(blend).toHaveLength(1)
    expect(blend[0].materialLabel).toBe("GelMA 10% w/v")
    expect(blend[0].fraction).toBe(1.0)
    expect(blend[0].crosslinker).toBe("UV 365nm")
  })

  it("cai em GelMA 10% default quando bioink está totalmente vazio", () => {
    const blend = contextToQuickBlend(emptyBioink)
    expect(blend).toHaveLength(1)
    expect(blend[0].materialLabel).toBe("GelMA 10% w/v")
    expect(blend[0].fraction).toBe(1.0)
    expect(blend[0].hasCells).toBe(false)
  })

  it("prioriza formulations[] sobre legacy quando ambos existem", () => {
    const bioink: BioinkSnapshotForQuick = {
      ...legacyOnlyBioink,  // tem material legacy = "GelMA 10%"
      formulations: [fAlginateCellular],  // mas tem formulations com Alginato
    }
    const blend = contextToQuickBlend(bioink)
    expect(blend).toHaveLength(1)
    expect(blend[0].materialLabel).toContain("Alginato")  // usa formulations, não legacy
    expect(blend[0].hasCells).toBe(true)
  })
})

// ─── Testes: summaries ────────────────────────────────────────────────────

describe("R12.59 · summarizeModel", () => {
  it("mostra id + dimensões quando modelo está pronto", () => {
    const model: ModelSnapshotForQuick = {
      geometryId: "cube_tissue",
      params: { width: 20, depth: 15, height: 8 },
    }
    const s = summarizeModel(model)
    expect(s).toContain("cube_tissue")
    expect(s).toContain("20")
    expect(s).toContain("15")
    expect(s).toContain("8")
    expect(s).toContain("mm")
  })

  it("retorna '—' quando geometryId é null", () => {
    const model: ModelSnapshotForQuick = { geometryId: null, params: null }
    expect(summarizeModel(model)).toBe("—")
  })

  it("usa defaults quando params está null mas geometryId existe", () => {
    const model: ModelSnapshotForQuick = { geometryId: "cube_tissue", params: null }
    const s = summarizeModel(model)
    expect(s).toContain("cube_tissue")
    expect(s).toContain("10×10×5mm")  // defaults do cube
  })
})

describe("R12.59 · summarizeFormulation", () => {
  it("mostra material + concentração para formulação estrutural (sem células)", () => {
    const s = summarizeFormulation(fGelMAStructural)
    expect(s).toBe("GelMA 8%")
  })

  it("mostra material + concentração + células + densidade para formulação celular", () => {
    const s = summarizeFormulation(fAlginateCellular)
    expect(s).toContain("Alginato de Sódio 3%")
    expect(s).toContain("hMSC")
    expect(s).toContain("5×10⁶/mL")
  })

  it("não mostra células quando cellType é null (acelular)", () => {
    const s = summarizeFormulation(fGelMAStructural)
    expect(s).not.toContain("hMSC")
    expect(s).not.toContain("+")
  })
})

// ─── Teste de integração (context → quick pipeline completo) ─────────────

describe("R12.59 · pipeline integração (fluxo real)", () => {
  it("fluxo típico: cube_tissue + GelMA 8% + Alginato+hMSC → 1 geom + 2 formulations", () => {
    const model: ModelSnapshotForQuick = {
      geometryId: "cube_tissue",
      params: { width: 20, depth: 20, height: 10 },
    }
    const bioink: BioinkSnapshotForQuick = {
      ...emptyBioink,
      formulations: [fGelMAStructural, fAlginateCellular],
    }
    const geom = contextToQuickGeometry(model)
    const blend = contextToQuickBlend(bioink)

    // Geometria correta
    expect(geom.id).toBe("cube")
    expect(geom.width).toBe(20)
    expect(geom.height).toBe(10)

    // Blend tem 2 biotintas com fração igual, ordem preservada
    expect(blend).toHaveLength(2)
    expect(blend[0].materialLabel).toContain("GelMA")
    expect(blend[1].materialLabel).toContain("Alginato")
    expect(blend[1].hasCells).toBe(true)

    // Frações somam 1.0
    const sum = blend.reduce((a, f) => a + f.fraction, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it("fluxo mínimo: só legacy (backward compat R12.0..R12.9)", () => {
    const model: ModelSnapshotForQuick = { geometryId: "disk", params: null }
    const geom = contextToQuickGeometry(model)
    const blend = contextToQuickBlend(legacyOnlyBioink)

    expect(geom.id).toBe("disk")
    expect(blend).toHaveLength(1)
    expect(blend[0].materialLabel).toBe("GelMA 10% w/v")
  })
})
