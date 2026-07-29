/**
 * BIA — R12.61 · coherence-check: separação geometria vs padrão de infill
 * ══════════════════════════════════════════════════════════════════════
 *
 * Bug reportado pela usuária:
 *   "Bloqueado: resolva incoerências modelo↔G-code"
 *
 * Root cause:
 *   `coherence-check.ts` (R12.47) tinha "gyroid" em GEOMETRY_KEYWORDS.
 *   Isso significa que um G-code com `; Infill: gyroid_tpms @ 30%` no
 *   header (padrão de PREENCHIMENTO) era interpretado como geometria 3D
 *   gyroid. Quando o state pedia "ear" e o G-code emitia gyroid como
 *   INFILL, o comparador via ear ≠ gyroid → BLOQUEAVA "geometria-
 *   divergente" mesmo sendo um G-code perfeitamente válido de orelha.
 *
 * Correção (R12.61):
 *   1) `emitter.ts` emite `; JobName:` + `; Geometry: <id>` no header
 *      → fonte da verdade explícita, sem heurística
 *   2) `coherence-check.ts` lê `; Geometry:` diretamente ANTES de
 *      keyword scan
 *   3) Palavras de padrão de infill (gyroid/honeycomb/voronoi) REMOVIDAS
 *      de GEOMETRY_KEYWORDS → só ficam em INFILL_PATTERN_KEYWORDS
 *   4) Keyword scan de geometria (fallback pra G-code externo) só emite
 *      WARNING agora, não BLOCKING — sem evidência forte, sem bloqueio
 */

import { describe, it, expect } from "vitest"
import { checkCoherence } from "@/lib/bioprint/coherence-check"
import { makeEarGelmaLinesState } from "./_helpers/factories"
import { emitHeader } from "@/lib/gcode/core/emitter"
import { getBioprinter } from "@/lib/gcode/profiles/bioprinters"
import type { Bioink, PrintJob } from "@/lib/gcode/core/types"

// ── Fixtures reproduzindo o bug real ─────────────────────────────────

/**
 * G-code de orelha COM infill gyroid — cenário exato do bug reportado.
 * Header tem `; Geometry: ear` explícito (R12.61) + `; Infill: gyroid_tpms`.
 * Antes do fix, "gyroid" no infill era mal-interpretado como geometria.
 */
const GCODE_EAR_WITH_GYROID_INFILL = `
; ═════════════════════════════════════════════════
; BIA v4.2 — Bioimpressão Especial GCODE Engine
; JobName: bia_ear_gyroid_tpms
; Geometry: ear
; Tissue: rigid-tissue
; Application: scaffold
; Bioink: GelMA @ 10%
; Infill: gyroid_tpms @ 30%
; ═════════════════════════════════════════════════
G21
G90
M83
G28
G1 X10 Y10 Z0.2 E0.5 F480
G1 X20 Y20 Z0.2 E1.0 F480
`.trim()

/**
 * G-code de orelha SEM `; Geometry:` explícito (formato legado ou externo).
 * Só menciona "gyroid" no infill. Antes do fix bloqueava por keyword scan.
 * Após o fix: no máximo warning "possivelmente-divergente" (sem `;
 * Geometry:` a checagem cai em heurística fraca, não bloqueia).
 */
const GCODE_LEGACY_EAR_WITHOUT_GEOMETRY_TAG = `
; BIA v4.2
; Tissue: rigid-tissue
; Bioink: GelMA @ 10%
; Infill: gyroid_tpms @ 30%
G21
G90
G1 X10 Y10 Z0.2 E0.5 F480
G1 X20 Y20 Z0.2 E1.0 F480
`.trim()

/**
 * G-code de orelha com honeycomb (outro padrão que ANTES era confundido).
 */
const GCODE_EAR_WITH_HONEYCOMB = `
; JobName: bia_ear_honeycomb
; Geometry: ear
; Bioink: GelMA
; Infill: honeycomb @ 25%
G1 X10 Y10 Z0.2 E0.5 F480
`.trim()

/**
 * G-code de orelha com voronoi.
 */
const GCODE_EAR_WITH_VORONOI = `
; JobName: bia_ear_voronoi
; Geometry: ear
; Bioink: GelMA
; Infill: voronoi_3d @ 20%
G1 X10 Y10 Z0.2 E0.5 F480
`.trim()

/**
 * G-code de cubo COM `; Geometry: cube` explícito — state pede ear →
 * DEVE bloquear porque a divergência é confirmada pela tag.
 */
const GCODE_CUBE_WITH_EXPLICIT_TAG = `
; JobName: bia_cube_gyroid
; Geometry: cube
; Bioink: GelMA
; Infill: gyroid_tpms @ 30%
G1 X10 Y10 Z0.2 E0.5 F480
`.trim()

// ── Testes ───────────────────────────────────────────────────────────

describe("R12.61 — Separação geometria vs padrão de infill", () => {
  describe("Bug reportado: 'ear' + infill gyroid não deve bloquear", () => {
    it("state=ear + G-code com `; Geometry: ear` + `; Infill: gyroid_tpms` → NÃO bloqueia", () => {
      const state = makeEarGelmaLinesState({ infillPatternId: "gyroid_tpms" })
      const report = checkCoherence(GCODE_EAR_WITH_GYROID_INFILL, state)

      // Bug pré-R12.61: bloqueava com "geometria-divergente"
      // Fix R12.61: reconhece que gyroid é INFILL, não geometria
      expect(report.isBlocking).toBe(false)

      const geomBlock = report.issues.find(
        (i) => i.level === "blocking" && i.code === "geometria-divergente",
      )
      expect(geomBlock).toBeUndefined()
    })

    it("state=ear + G-code com `; Infill: honeycomb` → NÃO bloqueia", () => {
      const state = makeEarGelmaLinesState({ infillPatternId: "honeycomb" })
      const report = checkCoherence(GCODE_EAR_WITH_HONEYCOMB, state)
      expect(report.isBlocking).toBe(false)
    })

    it("state=ear + G-code com `; Infill: voronoi_3d` → NÃO bloqueia", () => {
      const state = makeEarGelmaLinesState({ infillPatternId: "voronoi_3d" })
      const report = checkCoherence(GCODE_EAR_WITH_VORONOI, state)
      expect(report.isBlocking).toBe(false)
    })
  })

  describe("Fonte da verdade: `; Geometry:` explícito", () => {
    it("`; Geometry: ear` bate com state.model.geometryId=ear → não bloqueia", () => {
      const state = makeEarGelmaLinesState()
      const report = checkCoherence(GCODE_EAR_WITH_GYROID_INFILL, state)
      expect(report.isBlocking).toBe(false)
    })

    it("`; Geometry: cube` diverge de state.model.geometryId=ear → BLOQUEIA", () => {
      const state = makeEarGelmaLinesState()
      const report = checkCoherence(GCODE_CUBE_WITH_EXPLICIT_TAG, state)
      expect(report.isBlocking).toBe(true)

      const geomBlock = report.issues.find(
        (i) => i.level === "blocking" && i.code === "geometria-divergente",
      )
      expect(geomBlock).toBeDefined()
      expect(geomBlock?.expected).toBe("ear")
      expect(geomBlock?.found).toBe("cube")
    })

    it("mensagem cita ; Geometry: quando bloqueia por tag explícita", () => {
      const state = makeEarGelmaLinesState()
      const report = checkCoherence(GCODE_CUBE_WITH_EXPLICIT_TAG, state)
      const geomBlock = report.issues.find((i) => i.code === "geometria-divergente")
      expect(geomBlock?.message).toMatch(/Geometry/)
    })
  })

  describe("Fallback: G-code legado sem `; Geometry:` (só warning, nunca bloqueia)", () => {
    it("G-code sem tag `; Geometry:` + só keyword scan → não bloqueia", () => {
      const state = makeEarGelmaLinesState()
      const report = checkCoherence(GCODE_LEGACY_EAR_WITHOUT_GEOMETRY_TAG, state)

      // Sem tag explícita, R12.61 downgrada blocking → warning
      const geomBlock = report.issues.find(
        (i) => i.level === "blocking" && i.code.includes("geometria"),
      )
      expect(geomBlock).toBeUndefined()
    })

    it("G-code sem tag emite warning 'possivelmente-divergente' se keyword scan achar algo diferente", () => {
      // State pede cube, G-code menciona "coração" mas sem `; Geometry:` tag
      const state = makeEarGelmaLinesState({ geometryId: "cube" })
      const gcodeMencionaCoracao = `
; BIA
; Job: bia_coração_paramétrico
; Tissue: soft-tissue
; Infill: gyroid_tpms
G1 X10 Y10 Z0.2 E0.5 F480
`.trim()
      const report = checkCoherence(gcodeMencionaCoracao, state)

      // Não deve bloquear (sem `; Geometry:` só warning)
      expect(report.isBlocking).toBe(false)

      // Deve avisar (cube escolhido, coração detectado no header)
      const warn = report.issues.find(
        (i) => i.code === "geometria-possivelmente-divergente",
      )
      expect(warn).toBeDefined()
      expect(warn?.level).toBe("warning")
    })
  })

  describe("Padrão de infill não vaza como geometryHint", () => {
    it("`; Infill: gyroid_tpms` NÃO adiciona 'gyroid' a geometryHints", () => {
      const state = makeEarGelmaLinesState()
      const report = checkCoherence(GCODE_EAR_WITH_GYROID_INFILL, state)

      // Gyroid não é mais tratado como geometria — só como infill hint
      expect(report.detected.geometryHints).not.toContain("gyroid")
      expect(report.detected.infillHints).toContain("gyroid")
    })

    it("`; Infill: honeycomb` NÃO adiciona 'honeycomb' a geometryHints", () => {
      const state = makeEarGelmaLinesState()
      const report = checkCoherence(GCODE_EAR_WITH_HONEYCOMB, state)
      expect(report.detected.geometryHints).not.toContain("honeycomb")
      expect(report.detected.infillHints).toContain("honeycomb")
    })

    it("`; Infill: voronoi_3d` NÃO adiciona 'voronoi' a geometryHints", () => {
      const state = makeEarGelmaLinesState()
      const report = checkCoherence(GCODE_EAR_WITH_VORONOI, state)
      expect(report.detected.geometryHints).not.toContain("voronoi")
      expect(report.detected.infillHints).toContain("voronoi")
    })
  })

  describe("Match de padrão de infill (padrão configurado vs emitido)", () => {
    it("state pede 'classic-lines' mas G-code tem gyroid → warning (não bloqueia)", () => {
      const state = makeEarGelmaLinesState({ infillPatternId: "classic-lines" })
      const report = checkCoherence(GCODE_EAR_WITH_GYROID_INFILL, state)

      expect(report.isBlocking).toBe(false)

      const infillWarn = report.issues.find(
        (i) => i.code === "padrao-infill-divergente",
      )
      expect(infillWarn).toBeDefined()
      expect(infillWarn?.level).toBe("warning")
    })

    it("state pede gyroid_tpms e G-code emite gyroid_tpms → nenhum warning de padrão", () => {
      const state = makeEarGelmaLinesState({ infillPatternId: "gyroid_tpms" })
      const report = checkCoherence(GCODE_EAR_WITH_GYROID_INFILL, state)
      const infillWarn = report.issues.find(
        (i) => i.code === "padrao-infill-divergente",
      )
      expect(infillWarn).toBeUndefined()
    })
  })

  describe("Integração emitter → coherence (pipeline completo)", () => {
    // Constrói bioink e job "reais" pra passar ao emitHeader
    function buildBioink(): Bioink {
      return {
        id: "test_gelma",
        material: "GelMA",
        concentration: 10,
        hasCells: false,
        temperature_c: 25,
        pressure_kpa: 80,
        nozzleDiameter_um: 410,
        flowMultiplier: 1,
        retraction_mm: 0,
        printSpeed_mms: 8,
        travelSpeed_mms: 30,
        viscosity_cP: 5000,
      }
    }

    function buildJob(geometryId: string, infillAlgo: PrintJob["infillAlgorithm"]): PrintJob {
      return {
        id: `job_${Date.now()}`,
        name: `bia_${geometryId}_${infillAlgo}`,
        bioprinter: getBioprinter("cellink_biox"),
        bioink: buildBioink(),
        layerHeight: 0.2,
        skirtLoops: 2,
        walls: 2,
        infillPercent: 30,
        infillAlgorithm: infillAlgo,
        tissue: "rigid-tissue",
        application: "scaffold",
        geometryId,
      }
    }

    it("emitHeader emite `; JobName:` e `; Geometry:` quando job.geometryId presente", () => {
      const job = buildJob("ear", "gyroid_tpms")
      const headerLines = emitHeader(job.bioprinter, job.bioink, {
        jobMetadata: job,
      })
      const header = headerLines.join("\n")

      expect(header).toMatch(/; JobName:\s*bia_ear_gyroid_tpms/)
      expect(header).toMatch(/; Geometry:\s*ear/)
    })

    it("emitHeader não quebra quando job.geometryId ausente (backward compat)", () => {
      const jobSemGeom = buildJob("ear", "gyroid_tpms")
      delete jobSemGeom.geometryId
      const headerLines = emitHeader(jobSemGeom.bioprinter, jobSemGeom.bioink, {
        jobMetadata: jobSemGeom,
      })
      const header = headerLines.join("\n")

      // JobName ainda emitido
      expect(header).toMatch(/; JobName:/)
      // Geometry ausente é OK — não deve estourar
      expect(header).not.toMatch(/; Geometry:/)
    })

    it("Pipeline completo: emitHeader(ear+gyroid) + checkCoherence(state=ear) → NÃO bloqueia", () => {
      // Cenário exato do bug: usuária escolhe ear, seleciona gyroid infill
      const job = buildJob("ear", "gyroid_tpms")
      const headerLines = emitHeader(job.bioprinter, job.bioink, {
        jobMetadata: job,
      })
      // G-code fake: header real + um G1 pra passar `hasG1` check
      const fakeGcode = headerLines.join("\n") + "\nG1 X10 Y10 Z0.2 E0.5 F480\n"

      const state = makeEarGelmaLinesState({ infillPatternId: "gyroid_tpms" })
      const report = checkCoherence(fakeGcode, state)

      // R12.61: com `; Geometry: ear` explícito no header, não bloqueia
      // mesmo com "gyroid" mencionado em outros lugares
      expect(report.isBlocking).toBe(false)
    })

    it("Pipeline completo: emitHeader(cube) + checkCoherence(state=ear) → BLOQUEIA corretamente", () => {
      const job = buildJob("cube", "gyroid_tpms")
      const headerLines = emitHeader(job.bioprinter, job.bioink, {
        jobMetadata: job,
      })
      const fakeGcode = headerLines.join("\n") + "\nG1 X10 Y10 Z0.2 E0.5 F480\n"

      const state = makeEarGelmaLinesState()  // pede "ear"
      const report = checkCoherence(fakeGcode, state)

      // Divergência confirmada por tag explícita → BLOQUEIA
      expect(report.isBlocking).toBe(true)
      const geomBlock = report.issues.find((i) => i.code === "geometria-divergente")
      expect(geomBlock).toBeDefined()
      expect(geomBlock?.expected).toBe("ear")
      expect(geomBlock?.found).toBe("cube")
    })
  })

  describe("Robustez", () => {
    it("G-code com `; Geometry: EAR` (uppercase) bate com state.geometryId=ear", () => {
      const state = makeEarGelmaLinesState()
      const gcodeUpper = GCODE_EAR_WITH_GYROID_INFILL.replace(
        "; Geometry: ear",
        "; Geometry: EAR",
      )
      const report = checkCoherence(gcodeUpper, state)
      expect(report.isBlocking).toBe(false)
    })

    it("G-code com espaços extras em `;  Geometry:  ear  ` ainda bate", () => {
      const state = makeEarGelmaLinesState()
      const gcodeSpaces = GCODE_EAR_WITH_GYROID_INFILL.replace(
        "; Geometry: ear",
        ";  Geometry:  ear  ",
      )
      const report = checkCoherence(gcodeSpaces, state)
      expect(report.isBlocking).toBe(false)
    })

    it("state sem geometryId (usuária não escolheu) não bloqueia nada", () => {
      const state = makeEarGelmaLinesState()
      state.model.geometryId = null
      const report = checkCoherence(GCODE_EAR_WITH_GYROID_INFILL, state)
      const geomBlock = report.issues.find(
        (i) => i.level === "blocking" && i.code.includes("geometria"),
      )
      expect(geomBlock).toBeUndefined()
    })
  })
})
