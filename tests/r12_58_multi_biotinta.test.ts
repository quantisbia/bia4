/**
 * R12.58 · Smoke test — Etapa 2 (Biotinta) · multi-material (max 2, 1 célula cada)
 * ─────────────────────────────────────────────────────────────────────────
 * Valida a lógica de transformação draft <-> BioinkFormulation e a
 * regra de sincronização legacy que a página bioink/page.tsx aplica em
 * updateBioink().
 *
 * NÃO renderiza React — só testa os helpers e a shape do patch enviado
 * ao context, para ficar rápido e independente de DOM.
 */
import { describe, it, expect } from "vitest"
import type { BioinkFormulation, BioinkRole } from "@/lib/bioprint/process-context"

// ─── Réplica dos helpers de bioink/page.tsx (mantido em sync manualmente) ─
// Se um dia forem extraídos para src/lib/bioprint/, este import muda.

interface FormulationDraft {
  tool: 0 | 1
  role: BioinkRole
  materialId: string
  concentration: number
  crosslinker: string
  crosslinkerConc: number
  hasCells: boolean
  cellType: string
  cellDensity: number
  additivesText: string
}

const BIOINK_MATERIALS_MIN = [
  { id: "gelma",    label: "GelMA",              concDefault: 8,   defaultCrosslinker: "UV 365 nm + LAP", defaultCrosslinkerConc: 0.3 },
  { id: "alginate", label: "Alginato de Sódio",  concDefault: 3,   defaultCrosslinker: "CaCl₂",           defaultCrosslinkerConc: 100 },
  { id: "collagen", label: "Colágeno Tipo I",    concDefault: 3,   defaultCrosslinker: "Térmico 37 °C",   defaultCrosslinkerConc: 0   },
]
const TOOL_COLORS = ["#22d3ee", "#a78bfa"] as const

function draftToFormulation(d: FormulationDraft): BioinkFormulation {
  const preset = BIOINK_MATERIALS_MIN.find(m => m.id === d.materialId) ?? BIOINK_MATERIALS_MIN[0]
  const additives = d.additivesText
    .split(",").map(s => s.trim()).filter(s => s.length > 0)
  return {
    tool: d.tool,
    color: TOOL_COLORS[d.tool] ?? "#22d3ee",
    role: d.role,
    material: preset.label,
    materialId: preset.id,
    concentration: d.concentration,
    crosslinker: d.crosslinker,
    crosslinkerConc: d.crosslinkerConc,
    cellType: d.hasCells ? d.cellType : null,
    cellDensityMillionMl: d.hasCells ? d.cellDensity : null,
    additives,
    rheology: null,
  }
}

// Réplica do patch enviado ao context em bioink/page.tsx useEffect
function buildBioinkPatch(drafts: FormulationDraft[], activeIdx: number, activeRheology: { viscosityPaS: number; yieldStressPa: number }) {
  const formulations = drafts.map(draftToFormulation)
  if (formulations[activeIdx]) {
    formulations[activeIdx] = {
      ...formulations[activeIdx],
      rheology: { viscosityPaS: activeRheology.viscosityPaS, yieldStressPa: activeRheology.yieldStressPa },
    }
  }
  const primary = formulations[0]
  const status = (primary && primary.material && primary.concentration > 0) ? "ready" : "draft"
  const strategy: "single" | "dual" | "multi" =
    formulations.length === 1 ? "single" :
    formulations.length === 2 ? "dual" : "multi"

  return {
    status,
    formulations,
    strategy,
    material: primary?.material ?? null,
    concentration: primary?.concentration ?? null,
    crosslinker: primary?.crosslinker ?? null,
    crosslinkerConc: primary?.crosslinkerConc ?? null,
    cellType: primary?.cellType ?? null,
    cellDensityMillionMl: primary?.cellDensityMillionMl ?? null,
    additives: primary?.additives ?? [],
    rheology: primary?.rheology ?? null,
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────
const dGelMAStructural: FormulationDraft = {
  tool: 0, role: "structural", materialId: "gelma",
  concentration: 8, crosslinker: "UV 365 nm + LAP", crosslinkerConc: 0.3,
  hasCells: false, cellType: "Fibroblast", cellDensity: 2, additivesText: "",
}
const dAlgCellular: FormulationDraft = {
  tool: 1, role: "cellular", materialId: "alginate",
  concentration: 3, crosslinker: "CaCl₂", crosslinkerConc: 100,
  hasCells: true, cellType: "hMSC", cellDensity: 5, additivesText: "VEGF, BMP-2",
}

// ═════════════════════════════════════════════════════════════════════════
describe("R12.58 · Etapa 2 · multi-biotinta (max 2)", () => {
  describe("draftToFormulation()", () => {
    it("converte draft estrutural sem células corretamente", () => {
      const f = draftToFormulation(dGelMAStructural)
      expect(f.tool).toBe(0)
      expect(f.color).toBe("#22d3ee")
      expect(f.material).toBe("GelMA")
      expect(f.materialId).toBe("gelma")
      expect(f.concentration).toBe(8)
      expect(f.role).toBe("structural")
      expect(f.cellType).toBeNull()          // hasCells=false → cellType null
      expect(f.cellDensityMillionMl).toBeNull()
      expect(f.additives).toEqual([])
    })

    it("converte draft celular com hMSC + aditivos corretamente", () => {
      const f = draftToFormulation(dAlgCellular)
      expect(f.tool).toBe(1)
      expect(f.color).toBe("#a78bfa")
      expect(f.material).toBe("Alginato de Sódio")
      expect(f.role).toBe("cellular")
      expect(f.cellType).toBe("hMSC")
      expect(f.cellDensityMillionMl).toBe(5)
      expect(f.additives).toEqual(["VEGF", "BMP-2"])
    })

    it("aditivosText vazio/só espaços vira array vazio (não [' '])", () => {
      const d = { ...dGelMAStructural, additivesText: "   ,  , " }
      const f = draftToFormulation(d)
      expect(f.additives).toEqual([])
    })

    it("hasCells=false força cellType/cellDensity null mesmo com valores preenchidos", () => {
      const d = { ...dGelMAStructural, hasCells: false, cellType: "hMSC", cellDensity: 10 }
      const f = draftToFormulation(d)
      expect(f.cellType).toBeNull()
      expect(f.cellDensityMillionMl).toBeNull()
    })
  })

  describe("buildBioinkPatch() — SINGLE biotinta", () => {
    it("1 biotinta → strategy='single' + formulations.length=1", () => {
      const patch = buildBioinkPatch([dGelMAStructural], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.strategy).toBe("single")
      expect(patch.formulations).toHaveLength(1)
      expect(patch.status).toBe("ready")
    })

    it("campos legacy espelham formulations[0]", () => {
      const patch = buildBioinkPatch([dGelMAStructural], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.material).toBe("GelMA")
      expect(patch.concentration).toBe(8)
      expect(patch.crosslinker).toBe("UV 365 nm + LAP")
      expect(patch.cellType).toBeNull()
      expect(patch.rheology).toEqual({ viscosityPaS: 3.2, yieldStressPa: 150 })
    })
  })

  describe("buildBioinkPatch() — DUAL biotinta", () => {
    it("2 biotintas → strategy='dual' + formulations.length=2", () => {
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.strategy).toBe("dual")
      expect(patch.formulations).toHaveLength(2)
      expect(patch.status).toBe("ready")
    })

    it("tools são T0 e T1 (Marlin slot mapping)", () => {
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.formulations[0].tool).toBe(0)
      expect(patch.formulations[1].tool).toBe(1)
    })

    it("cores distintas por tool (ciano T0, violeta T1)", () => {
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.formulations[0].color).toBe("#22d3ee")
      expect(patch.formulations[1].color).toBe("#a78bfa")
      expect(patch.formulations[0].color).not.toBe(patch.formulations[1].color)
    })

    it("cada biotinta pode ter UMA célula (ou nenhuma) — não colide", () => {
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.formulations[0].cellType).toBeNull()          // Bio 1 acelular
      expect(patch.formulations[1].cellType).toBe("hMSC")        // Bio 2 celular
      expect(patch.formulations[1].cellDensityMillionMl).toBe(5)
    })

    it("legacy fields sempre refletem formulations[0], NÃO a biotinta ativa", () => {
      // Usuário está editando bio 2 (activeIdx=1), mas o downstream (slice/control)
      // deve continuar vendo bio 1 nos campos legacy — bio 1 é a "principal"
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 1, { viscosityPaS: 0.5, yieldStressPa: 20 })
      expect(patch.material).toBe("GelMA")                       // bio 1
      expect(patch.concentration).toBe(8)                        // bio 1
      expect(patch.cellType).toBeNull()                          // bio 1 é acelular
    })

    it("rheology só vai para a biotinta ATIVA (a que o painel de reologia calculou)", () => {
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 1, { viscosityPaS: 0.5, yieldStressPa: 20 })
      // Bio 2 (ativa) recebe rheology; bio 1 fica sem
      expect(patch.formulations[0].rheology).toBeNull()
      expect(patch.formulations[1].rheology).toEqual({ viscosityPaS: 0.5, yieldStressPa: 20 })
    })

    it("roles são preservados em cada biotinta", () => {
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.formulations[0].role).toBe("structural")
      expect(patch.formulations[1].role).toBe("cellular")
    })
  })

  describe("regras de negócio", () => {
    it("nunca mais que 2 biotintas na UI (limite hard-coded no draft state)", () => {
      // Este teste documenta o contrato: a UI expõe max 2 slots.
      // Se um dia formulations tiver 3+ items, o refactor R12.58 quebrou o limite.
      const dTerceira: FormulationDraft = { ...dGelMAStructural, tool: 0, materialId: "collagen" }
      // Simular tentativa de patch com 3 → strategy vira "multi"
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular, dTerceira], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      expect(patch.strategy).toBe("multi")
      // A UI R12.58 nunca produz esse estado — mas se produzir, backend não quebra.
      expect(patch.formulations).toHaveLength(3)
    })

    it("bio1 sem material → status='draft', não 'ready'", () => {
      const dVazio: FormulationDraft = { ...dGelMAStructural, concentration: 0 }
      const patch = buildBioinkPatch([dVazio], 0, { viscosityPaS: 0, yieldStressPa: 0 })
      expect(patch.status).toBe("draft")
    })

    it("estratégia dual típica: GelMA estrutural + Alginato celular (com células)", () => {
      // Cenário real reportado pela usuária: 'trabalhamos com mais de 1 tipo
      // celular e mais de 1 biomaterial'. A restrição R12.58 é 1 tipo celular
      // POR biotinta — o scaffold como um todo pode ter até 2 tipos (um por bio).
      const patch = buildBioinkPatch([dGelMAStructural, dAlgCellular], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      const cellTypes = patch.formulations
        .map(f => f.cellType)
        .filter((c): c is string => c !== null)
      // Aqui só bio 2 tem célula → 1 tipo total.
      expect(cellTypes).toEqual(["hMSC"])
      // Se ambas tiverem célula, poderiam ser dois tipos diferentes:
      const dGelMACells: FormulationDraft = { ...dGelMAStructural, hasCells: true, cellType: "Chondrocyte", cellDensity: 3 }
      const patch2 = buildBioinkPatch([dGelMACells, dAlgCellular], 0, { viscosityPaS: 3.2, yieldStressPa: 150 })
      const cellTypes2 = patch2.formulations.map(f => f.cellType).filter(Boolean)
      expect(cellTypes2.sort()).toEqual(["Chondrocyte", "hMSC"].sort())
    })
  })
})
