/**
 * BIA — R12.63 · Gyroid simples + Nivea padrão-ouro + Baby-step Z + Slider destacado
 * ══════════════════════════════════════════════════════════════════════════════════
 *
 * Feedback da usuária (verbatim):
 *   "adicionar o giroide nos modelos simples, adicionar abaixar o z em
 *    tempo real para ajustar, adicionar creme nivea como biomaterial
 *    (padrão ouro) testes iniciais e que tenha o gcode com fluxo de
 *    multiplicador de extrusão 0.4. e adicionar um botão no processo
 *    de escolha dos parametros, infill, altura da camada, um parametro
 *    do fluxo / multiplicador de extrusão para escolhermos antes de
 *    levar pra impressora."
 *
 * Cobertura:
 *   A. `tpms_gyroid` está em `BASIC_GEOMETRY_IDS` (isVerifiedGeometry=true)
 *   B. Biomateriais: existe entrada `nivea_cream` com category="test-standard"
 *   C. `getRecommendedFlowMultiplier("nivea_cream") === 0.4`
 *   D. `getRecommendedFlowMultiplier(...)` fallback para 0.6 em outros IDs
 *   E. Categoria "test-standard" aparece em BIOMATERIAL_CATEGORIES
 *   F. Preset `nivea_test_standard` existe em BIOINK_PRESETS
 *   G. flowMultiplier=0.4 chega ao G-code (integration com emitter)
 */

import { describe, it, expect } from "vitest"
import { emitHeader } from "@/lib/gcode/core/emitter"
import { getBioprinter } from "@/lib/gcode/profiles/bioprinters"
import {
  BASIC_GEOMETRY_IDS,
  isBasicGeometry,
} from "@/lib/gcode/slicer/geometry-bounds"
import {
  BIOMATERIALS,
  BIOMATERIAL_CATEGORIES,
  BIOINK_PRESETS,
  getRecommendedFlowMultiplier,
  FLOW_MULTIPLIER_BY_MATERIAL,
} from "@/lib/bioprinting/biomaterials"
import type { Bioink, PrintJob } from "@/lib/gcode/core/types"

// ── A. Gyroid nas simples ────────────────────────────────────────────

describe("R12.63.A — Gyroid nas geometrias simples", () => {
  it("tpms_gyroid está em BASIC_GEOMETRY_IDS", () => {
    expect(BASIC_GEOMETRY_IDS).toContain("tpms_gyroid")
  })

  it("isBasicGeometry('tpms_gyroid') === true", () => {
    // Se o toggle "Mostrar experimentais" estiver OFF, gyroid ainda deve
    // aparecer — porque agora é "verificada".
    expect(isBasicGeometry("tpms_gyroid")).toBe(true)
  })

  it("Outras TPMS (schwarz, diamond) continuam experimentais", () => {
    // R12.63: só o gyroid subiu — os outros são mais raros e as gerações
    // ainda são pesadas. Manter fora do "simples" para não confundir.
    expect(isBasicGeometry("tpms_schwarz")).toBe(false)
    expect(isBasicGeometry("tpms_diamond")).toBe(false)
  })
})

// ── B/C/D. Nivea como padrão-ouro ────────────────────────────────────

describe("R12.63.B — Creme Nivea (padrão-ouro de teste)", () => {
  it("BIOMATERIALS contém 'nivea_cream' com category 'test-standard'", () => {
    const nivea = BIOMATERIALS.find((b) => b.id === "nivea_cream")
    expect(nivea).toBeDefined()
    expect(nivea!.category).toBe("test-standard")
    expect(nivea!.printability).toContain("extrusion")
  })

  it("Nivea marca NÃO biocompatível (viabilidade 0%)", () => {
    // Documenta explicitamente que é só pra calibração mecânica.
    const nivea = BIOMATERIALS.find((b) => b.id === "nivea_cream")
    expect(nivea!.cellViability_24h_pct).toBe(0)
  })

  it("BIOMATERIAL_CATEGORIES inclui 'test-standard'", () => {
    const ids = BIOMATERIAL_CATEGORIES.map((c) => c.id)
    expect(ids).toContain("test-standard")
  })

  it("BIOINK_PRESETS contém preset 'nivea_test_standard'", () => {
    const preset = BIOINK_PRESETS.find((p) => p.id === "nivea_test_standard")
    expect(preset).toBeDefined()
    expect(preset!.components[0].biomaterialId).toBe("nivea_cream")
  })
})

describe("R12.63.C — flowMultiplier 0.4 para Nivea", () => {
  it("getRecommendedFlowMultiplier('nivea_cream') === 0.4", () => {
    expect(getRecommendedFlowMultiplier("nivea_cream")).toBe(0.4)
  })

  it("Map explícito FLOW_MULTIPLIER_BY_MATERIAL['nivea_cream'] === 0.4", () => {
    expect(FLOW_MULTIPLIER_BY_MATERIAL.nivea_cream).toBe(0.4)
  })

  it("Fallback: material desconhecido retorna 0.6 (default R12.62)", () => {
    expect(getRecommendedFlowMultiplier("gelma")).toBe(0.6)
    expect(getRecommendedFlowMultiplier("alginate")).toBe(0.6)
    expect(getRecommendedFlowMultiplier(null)).toBe(0.6)
    expect(getRecommendedFlowMultiplier(undefined)).toBe(0.6)
    expect(getRecommendedFlowMultiplier("")).toBe(0.6)  // string vazia
    expect(getRecommendedFlowMultiplier("material_qualquer_futuro")).toBe(0.6)
  })

  it("flowMultiplier 0.4 chega ao header do G-code (integração)", () => {
    // Simula o fluxo: usuária escolhe Nivea → /slice pega 0.4 do preset
    // e injeta no bioink.flowMultiplier → emitter emite no header
    const bioink: Bioink = {
      id: "nivea_test",
      material: "Nivea Creme",
      concentration: 100,
      hasCells: false,
      temperature_c: 25,
      pressure_kpa: 40,
      nozzleDiameter_um: 410,
      flowMultiplier: getRecommendedFlowMultiplier("nivea_cream"),
      retraction_mm: 0,
      printSpeed_mms: 8,
      travelSpeed_mms: 30,
      viscosity_cP: 2000,
    }
    const job: PrintJob = {
      id: "job_nivea_calibration",
      name: "bia_nivea_calibration",
      bioprinter: getBioprinter("cellink_biox"),
      bioink,
      layerHeight: 0.2,
      skirtLoops: 2,
      walls: 2,
      infillPercent: 30,
      infillAlgorithm: "linear",
      tissue: "calibration",
      application: "test",
      geometryId: "test_line",
    }
    const headerLines = emitHeader(job.bioprinter, job.bioink, {
      jobMetadata: job,
    })
    const header = headerLines.join("\n")

    // Nivea deve gerar flowMultiplier 0.40× explícito no header
    expect(header).toMatch(/;\s*ExtrusionMultiplier:\s*0\.40×/)
  })
})
