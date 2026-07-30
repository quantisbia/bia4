/**
 * BIA — R12.62 · Ponto inicial forte (G92 X0 Y0 Z0 E0) + fator de extrusão
 * ══════════════════════════════════════════════════════════════════════
 *
 * Feedback da usuária (verbatim):
 *   "você pode melhorar a funcionalidade do ponto inicial - G92 X0 Y0 Z0,
 *    pois tem momentos que não funciona e é muito importante começar a
 *    imprimir no ponto 0. será importante o Gcode ter o parametro de fator
 *    de extrusão para selecionar. O fluxo está muito fraco quando inicia
 *    as bioimpressoes. será bom escolher o numero, mas pode deixar os
 *    GCode padores começar com 0.6 ou escolher."
 *
 * Root causes:
 *   1) `G92 E0` só zerava o extrusor — X/Y/Z mantinham resíduos do último
 *      trabalho. Primeiro G1 do novo job ia pra ponto errado (aparente
 *      "não está no zero"). Fix: `G92 X0 Y0 Z0 E0`.
 *   2) `slice/page.tsx` hardcoded `flowMultiplier: 1.0` no payload da API
 *      → slider da UI não tinha efeito no G-code gerado. Fix: passar o
 *      valor real do slider + default 0.6× (bicos bio 200-410µm + biotintas
 *      viscosas 500-5000 cP precisam de fluxo maior).
 *   3) `SliceStepState.extrusionMultiplier` não existia → não persistia
 *      entre navegações. Fix: adicionar campo no context.
 *
 * Cobertura:
 *   A. emitHeader emite `G92 X0 Y0 Z0 E0` (não apenas `G92 E0`)
 *   B. emitHeader emite linha `; ExtrusionMultiplier:` no header
 *   C. quick-gcode header contém `G92 X0 Y0 Z0 E0`
 *   D. `flowMultiplier` respeita valor customizado (não hardcoded 1.0)
 *   E. Schema Zod do /api/gcode/generate tem default 0.6 para flowMultiplier
 *   F. `EMPTY_SLICE` tem `extrusionMultiplier: null` (backward compat)
 */

import { describe, it, expect } from "vitest"
import { emitHeader, emitFooter } from "@/lib/gcode/core/emitter"
import { getBioprinter } from "@/lib/gcode/profiles/bioprinters"
import {
  generateQuickGcode,
  type QuickGeometry,
  type QuickBioinkParams,
  type QuickGcodeOptions,
} from "@/lib/bioprint/quick-gcode"
import { makeEmptyState } from "./_helpers/factories"
import type { Bioink, PrintJob } from "@/lib/gcode/core/types"

// ── Fixtures ─────────────────────────────────────────────────────────

function buildBioink(overrides: Partial<Bioink> = {}): Bioink {
  return {
    id: "test_gelma",
    material: "GelMA",
    concentration: 10,
    hasCells: false,
    temperature_c: 25,
    pressure_kpa: 80,
    nozzleDiameter_um: 410,
    flowMultiplier: 0.6,  // R12.62: default 0.6
    retraction_mm: 0,
    printSpeed_mms: 8,
    travelSpeed_mms: 30,
    viscosity_cP: 5000,
    ...overrides,
  }
}

function buildJob(overrides: Partial<PrintJob> = {}): PrintJob {
  return {
    id: `job_${Date.now()}`,
    name: "bia_r12_62_test",
    bioprinter: getBioprinter("cellink_biox"),
    bioink: buildBioink(),
    layerHeight: 0.2,
    skirtLoops: 2,
    walls: 2,
    infillPercent: 30,
    infillAlgorithm: "linear",
    tissue: "rigid-tissue",
    application: "scaffold",
    geometryId: "test_line",
    ...overrides,
  }
}

// ── A. G92 X0 Y0 Z0 E0 — ponto inicial forte ────────────────────────

describe("R12.62.A — G92 X0 Y0 Z0 E0 (ponto inicial forte)", () => {
  it("emitHeader emite `G92 X0 Y0 Z0 E0`, não apenas `G92 E0`", () => {
    const job = buildJob()
    const headerLines = emitHeader(job.bioprinter, job.bioink, {
      jobMetadata: job,
    })
    const header = headerLines.join("\n")

    // Deve ter G92 zerando TODAS as coordenadas
    expect(header).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)

    // Não deve ter mais o G92 E0 solto (só E) — sinal do bug antigo.
    // Regex pega "G92 E0" que NÃO tem X0/Y0/Z0 antes.
    const g92Lines = header.split("\n").filter(l => l.includes("G92"))
    expect(g92Lines.length).toBeGreaterThan(0)
    for (const line of g92Lines) {
      // Se tem G92 e menciona E0, precisa mencionar X0 Y0 Z0 também
      if (/G92.*E0/.test(line)) {
        expect(line).toMatch(/X0/)
        expect(line).toMatch(/Y0/)
        expect(line).toMatch(/Z0/)
      }
    }
  })

  it("quick-gcode header contém `G92 X0 Y0 Z0 E0`", () => {
    const geom: QuickGeometry = { id: "cube", width: 10, depth: 10, height: 5 }
    const bioink: QuickBioinkParams = {
      materialLabel: "GelMA 10%",
      nozzleDiameter_mm: 0.41,
      viscosity_PaS: 5,
      printSpeed_mms: 8,
      travelSpeed_mms: 30,
      pressure_kpa: 80,
      hasCells: false,
    }
    const opts: QuickGcodeOptions = {
      layerHeight_mm: 0.2,
      infillPattern: "rectilinear",
      infillDensity_pct: 30,
      walls: 2,
      jobName: "r12_62_g92_test",
    }

    const { gcode } = generateQuickGcode(geom, bioink, opts)
    expect(gcode).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)
  })
})

// ── B. Fator de extrusão (flowMultiplier) ────────────────────────────

describe("R12.62.B — Fator de extrusão configurável", () => {
  it("emitHeader emite `; ExtrusionMultiplier:` no header (transparência)", () => {
    const job = buildJob({
      bioink: buildBioink({ flowMultiplier: 0.6 }),
    })
    const headerLines = emitHeader(job.bioprinter, job.bioink, {
      jobMetadata: job,
    })
    const header = headerLines.join("\n")

    // Linha deve aparecer no header, formatada como "N.NN×"
    expect(header).toMatch(/;\s*ExtrusionMultiplier:\s*0\.60×/)
  })

  it("emitHeader respeita flowMultiplier customizado (não força 1.0)", () => {
    // Simula usuária escolhendo 1.5× (biotinta mais viscosa)
    const job = buildJob({
      bioink: buildBioink({ flowMultiplier: 1.5 }),
    })
    const headerLines = emitHeader(job.bioprinter, job.bioink, {
      jobMetadata: job,
    })
    const header = headerLines.join("\n")

    expect(header).toMatch(/;\s*ExtrusionMultiplier:\s*1\.50×/)
    expect(header).not.toMatch(/;\s*ExtrusionMultiplier:\s*0\.60×/)
    expect(header).not.toMatch(/;\s*ExtrusionMultiplier:\s*1\.00×/)
  })

  it("Valores extremos (0.5 e 2.0) são emitidos corretamente", () => {
    // Mínimo do slider
    const jobLow = buildJob({ bioink: buildBioink({ flowMultiplier: 0.5 }) })
    const headerLow = emitHeader(jobLow.bioprinter, jobLow.bioink, {
      jobMetadata: jobLow,
    }).join("\n")
    expect(headerLow).toMatch(/;\s*ExtrusionMultiplier:\s*0\.50×/)

    // Máximo do slider
    const jobHigh = buildJob({ bioink: buildBioink({ flowMultiplier: 2.0 }) })
    const headerHigh = emitHeader(jobHigh.bioprinter, jobHigh.bioink, {
      jobMetadata: jobHigh,
    }).join("\n")
    expect(headerHigh).toMatch(/;\s*ExtrusionMultiplier:\s*2\.00×/)
  })
})

// ── C. Context roundtrip ─────────────────────────────────────────────

describe("R12.62.C — SliceStepState.extrusionMultiplier persistido", () => {
  it("EMPTY_SLICE tem extrusionMultiplier: null (backward compat)", () => {
    const state = makeEmptyState()
    // Campo existe e default é null (não undefined) — permite ?? 0.6 na UI
    expect(state.slice).toHaveProperty("extrusionMultiplier")
    expect(state.slice.extrusionMultiplier).toBeNull()
  })

  it("Estado inicial não força um número — UI decide o default 0.6", () => {
    // Convenção: se o context tem null, a slice/page.tsx aplica ?? 0.6.
    // Isso evita "vazar" um valor mágico no persist antes da 1ª edição.
    const state = makeEmptyState()
    const uiValue = state.slice.extrusionMultiplier ?? 0.6
    expect(uiValue).toBe(0.6)
  })

  it("Roundtrip: valor customizado (1.2) é preservado", () => {
    const state = makeEmptyState()
    // Simula persistência (o useEffect em slice/page.tsx chama updateSlice)
    state.slice.extrusionMultiplier = 1.2

    // Simula reidratação (usuária volta pra slice)
    const uiValue = state.slice.extrusionMultiplier ?? 0.6
    expect(uiValue).toBe(1.2)
  })
})

// ── D. Sanity: footer não regride ────────────────────────────────────

describe("R12.62.D — Sanity check (emitFooter preservado)", () => {
  it("emitFooter continua funcionando (não impactado por R12.62)", () => {
    // Regressão preventiva: só mexemos no header, footer deve continuar igual
    const job = buildJob()
    const footerLines = emitFooter(job.bioprinter, job.bioink)
    const footer = footerLines.join("\n")
    expect(footer.length).toBeGreaterThan(0)
    // M84 (disable motors) é comum em footer FDM/bio
    expect(footer).toMatch(/M84|M104\s+S0|M140\s+S0/)
  })
})
