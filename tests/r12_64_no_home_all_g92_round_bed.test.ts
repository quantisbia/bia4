/**
 * BIA — R12.64 · Zero G28 + G92 X0 Y0 Z0 E0 em TODO fatiamento + Mesa REDONDA
 * ══════════════════════════════════════════════════════════════════════════════════
 *
 * Feedback da usuária (verbatim):
 *   "retirar todo home all - e sempre zerar as coordenadas, G92 X0 Y0 Z0 E0,
 *    e a mesa ser redonda . sejá criterioso, em todo fatiamento gcode,
 *    colocar no sistema o G92 x0 y0 z0 e0"
 *
 * Cobertura (crítica):
 *
 * A. NENHUM G28 (home mecânico) em NENHUM G-code gerado:
 *    · emitHeader (emitter.ts) — pipeline principal
 *    · quick-gcode (bioprint/quick-gcode.ts)
 *    · toolpath-engine (testes simples e infills)
 *
 * B. TODO G-code começa com `G92 X0 Y0 Z0 E0` (zerar TODAS as coordenadas,
 *    não só o extrusor):
 *    · emitter.ts header
 *    · quick-gcode
 *    · testes simples (hello square, cross, spiral, dots)
 *    · infills TPMS/Voronoi/Concentric
 *
 * C. Mesa REDONDA — TODOS os perfis de bioimpressora têm:
 *    · bedShape === "circular"
 *    · bedDiameter_mm > 0
 *
 * D. mcodes.startPrint NUNCA emite G28 em nenhum perfil.
 *
 * Racional biológico:
 *   Bioimpressora NUNCA faz home mecânico. A bandeja tem células vivas,
 *   Petri dishes, wells, scaffolds — um G28 destruiria tudo isso. O
 *   referencial em bioimpressão vem da BIOLOGIA (o alvo: poço, tecido,
 *   hidrogel), não da mecânica dos endstops.
 */

import { describe, it, expect } from "vitest"
import { emitHeader, emitFooter } from "@/lib/gcode/core/emitter"
import { getBioprinter, listBioprinters, BIOPRINTER_PROFILES } from "@/lib/gcode/profiles/bioprinters"
import { generateQuickGcode } from "@/lib/bioprint/quick-gcode"
import {
  generateTestHelloSquare,
  generateTestCross,
  generateTestSpiral,
  generateTestDotArray,
  generateGyroidGcode,
  generateVoronoiGcode,
  generateConcentricGcode,
} from "@/lib/bioprint/toolpath-engine"
import type { Bioink, PrintJob, BioprinterProfile } from "@/lib/gcode/core/types"

// ═══════════════════════════════════════════════════════════════════════
// Fixtures compartilhadas
// ═══════════════════════════════════════════════════════════════════════

function makeBioink(): Bioink {
  return {
    id: "test_bioink",
    material: "GelMA",
    concentration: 8,
    hasCells: false,
    temperature_c: 25,
    pressure_kpa: 40,
    nozzleDiameter_um: 410,
    flowMultiplier: 0.6,
    retraction_mm: 0,
    printSpeed_mms: 8,
    travelSpeed_mms: 30,
    viscosity_cP: 2000,
  }
}

function makeJob(bp: BioprinterProfile, bioink: Bioink): PrintJob {
  return {
    id: "job_r12_64",
    name: "r12_64_no_g28_round_bed_test",
    bioprinter: bp,
    bioink,
    layerHeight: 0.2,
    printSpeed: 8,
    infillPercent: 30,
    infillAlgorithm: "linear",
    walls: 2,
    geometryId: "cube",
    tissue: "test",
    application: "calibration",
  }
}

// ═══════════════════════════════════════════════════════════════════════
// A. ZERO G28 EM QUALQUER GERADOR DE G-CODE
// ═══════════════════════════════════════════════════════════════════════

describe("R12.64.A — NENHUM G28 (home) em nenhum G-code gerado", () => {
  const bp = getBioprinter("cellink_biox")
  const bioink = makeBioink()
  const job = makeJob(bp, bioink)

  it("emitHeader NÃO emite G28 no pipeline principal", () => {
    const lines = emitHeader(bp, bioink, { jobMetadata: job })
    const gcode = lines.join("\n")
    // Não pode ter linha começando com G28 (nenhuma variante)
    expect(gcode).not.toMatch(/^\s*G28\b/m)
  })

  it("emitHeader coloca aviso explícito 'NENHUM G28'", () => {
    const lines = emitHeader(bp, bioink, { jobMetadata: job })
    const gcode = lines.join("\n")
    // Header deve explicar por que não tem G28
    expect(gcode).toMatch(/NENHUM G28/i)
    expect(gcode).toMatch(/preserva bandeja/i)
  })

  it("emitFooter NÃO emite G28", () => {
    const lines = emitFooter(bp, bioink)
    const gcode = lines.join("\n")
    expect(gcode).not.toMatch(/^\s*G28\b/m)
  })

  it("Todos os perfis de extrusão: emitHeader nunca produz G28", () => {
    // Para cada bioprinter de extrusão, confirma que o header sai limpo.
    // (DLP usa dlp-emitter.ts separado, testado em outro spec.)
    for (const profile of listBioprinters()) {
      if (profile.technology === "dlp_sla") continue
      const lines = emitHeader(profile, bioink, { jobMetadata: makeJob(profile, bioink) })
      const gcode = lines.join("\n")
      expect(gcode, `Profile ${profile.id} não pode emitir G28`).not.toMatch(/^\s*G28\b/m)
    }
  })

  it("quick-gcode NÃO emite G28 (bandeja com células preservada)", () => {
    const result = generateQuickGcode(
      // QuickGeometry
      { id: "cube", width: 20, depth: 20, height: 3 },
      // QuickBioinkParams
      {
        materialLabel: "GelMA 8%",
        nozzleDiameter_mm: 0.41,
        viscosity_PaS: 2.0,
        printSpeed_mms: 8,
        travelSpeed_mms: 30,
        pressure_kpa: 40,
        hasCells: false,
      },
      // QuickGcodeOptions
      {
        layerHeight_mm: 0.2,
        infillPattern: "rectilinear",
        infillDensity_pct: 30,
        walls: 2,
      },
    )
    expect(result.gcode).not.toMatch(/^\s*G28\b/m)
  })

  it("Testes simples (helloSquare, cross, spiral, dots) NÃO emitem G28", () => {
    const sources = [
      { name: "helloSquare", src: generateTestHelloSquare() },
      { name: "cross", src: generateTestCross() },
      { name: "spiral", src: generateTestSpiral() },
      { name: "dots", src: generateTestDotArray() },
    ]
    for (const { name, src } of sources) {
      expect(src, `${name} não pode ter G28`).not.toMatch(/^\s*G28\b/m)
    }
  })

  it("Infills TPMS/Voronoi/Concentric NÃO emitem G28", () => {
    const infillParams = {
      bounds: { width: 20, depth: 20, height: 3 },
      density: 0.35,
      layerHeight: 0.3,
      feedrate: 600,
      extrusionWidth: 0.4,
    }
    const gyroid = generateGyroidGcode(infillParams)
    const voronoi = generateVoronoiGcode(infillParams, 20, 42)
    const concentric = generateConcentricGcode(infillParams)

    expect(gyroid).not.toMatch(/^\s*G28\b/m)
    expect(voronoi).not.toMatch(/^\s*G28\b/m)
    expect(concentric).not.toMatch(/^\s*G28\b/m)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// B. TODO G-CODE COMEÇA COM G92 X0 Y0 Z0 E0 (não apenas G92 E0)
// ═══════════════════════════════════════════════════════════════════════

describe("R12.64.B — G92 X0 Y0 Z0 E0 em TODO fatiamento (não só G92 E0)", () => {
  const bp = getBioprinter("cellink_biox")
  const bioink = makeBioink()
  const job = makeJob(bp, bioink)

  it("emitHeader emite G92 X0 Y0 Z0 E0 completo", () => {
    const lines = emitHeader(bp, bioink, { jobMetadata: job })
    const gcode = lines.join("\n")
    // Deve conter G92 com TODAS as coordenadas zeradas
    expect(gcode).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)
  })

  it("emitHeader NÃO tem G92 solto que zere só E (bug antigo)", () => {
    const lines = emitHeader(bp, bioink, { jobMetadata: job })
    const gcode = lines.join("\n")
    // Não pode ter uma linha "G92 E0" isolada — deve ser G92 X0 Y0 Z0 E0
    const lonelyG92E0 = /^G92\s+E0\s*(?:;|$)/m
    expect(gcode).not.toMatch(lonelyG92E0)
  })

  it("quick-gcode header tem G92 X0 Y0 Z0 E0", () => {
    const result = generateQuickGcode(
      { id: "cube", width: 20, depth: 20, height: 3 },
      {
        materialLabel: "GelMA 8%",
        nozzleDiameter_mm: 0.41,
        viscosity_PaS: 2.0,
        printSpeed_mms: 8,
        travelSpeed_mms: 30,
        pressure_kpa: 40,
        hasCells: false,
      },
      {
        layerHeight_mm: 0.2,
        infillPattern: "rectilinear",
        infillDensity_pct: 30,
        walls: 2,
      },
    )
    expect(result.gcode).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)
  })

  it("Testes simples (helloSquare) têm G92 X0 Y0 Z0 E0 no header", () => {
    const gcode = generateTestHelloSquare()
    expect(gcode).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)
  })

  it("Testes simples (cross, spiral, dots) todos têm G92 X0 Y0 Z0 E0", () => {
    for (const [name, src] of [
      ["cross", generateTestCross()],
      ["spiral", generateTestSpiral()],
      ["dots", generateTestDotArray()],
    ] as const) {
      expect(src, `${name} precisa ter G92 X0 Y0 Z0 E0`).toMatch(
        /G92\s+X0\s+Y0\s+Z0\s+E0/,
      )
    }
  })

  it("Infills TPMS/Voronoi/Concentric emitem G92 X0 Y0 Z0 E0", () => {
    const infillParams = {
      bounds: { width: 20, depth: 20, height: 3 },
      density: 0.35,
      layerHeight: 0.3,
      feedrate: 600,
      extrusionWidth: 0.4,
    }
    const gyroid = generateGyroidGcode(infillParams)
    const voronoi = generateVoronoiGcode(infillParams, 20, 42)
    const concentric = generateConcentricGcode(infillParams)

    expect(gyroid).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)
    expect(voronoi).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)
    expect(concentric).toMatch(/G92\s+X0\s+Y0\s+Z0\s+E0/)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// C. MESA REDONDA — todos os perfis são circulares
// ═══════════════════════════════════════════════════════════════════════

describe("R12.64.C — Mesa REDONDA em todos os perfis", () => {
  it("Todos os bioprinters têm bedShape === 'circular'", () => {
    for (const profile of listBioprinters()) {
      expect(
        profile.bedShape,
        `Profile ${profile.id} deve ter bedShape='circular'`,
      ).toBe("circular")
    }
  })

  it("Todos os bioprinters têm bedDiameter_mm > 0", () => {
    for (const profile of listBioprinters()) {
      expect(
        profile.bedDiameter_mm,
        `Profile ${profile.id} precisa de bedDiameter_mm`,
      ).toBeDefined()
      expect(profile.bedDiameter_mm!).toBeGreaterThan(0)
    }
  })

  it("bedDiameter_mm coerente com buildVolume (≤ menor dimensão XY)", () => {
    // O diâmetro da mesa redonda tem que caber no buildVolume mecânico:
    // NUNCA maior que a menor das dimensões X ou Y do bounding box.
    for (const profile of listBioprinters()) {
      const bvX = profile.buildVolume.max.x - profile.buildVolume.min.x
      const bvY = profile.buildVolume.max.y - profile.buildVolume.min.y
      const minXY = Math.min(bvX, bvY)
      expect(
        profile.bedDiameter_mm!,
        `Profile ${profile.id}: bedDiameter (${profile.bedDiameter_mm}) > min(X,Y) (${minXY})`,
      ).toBeLessThanOrEqual(minXY)
    }
  })

  it("Perfis específicos: valores conhecidos (âncoras de regressão)", () => {
    expect(BIOPRINTER_PROFILES.cellink_biox.bedDiameter_mm).toBe(90)
    expect(BIOPRINTER_PROFILES.generic_marlin.bedDiameter_mm).toBe(200)
    expect(BIOPRINTER_PROFILES.regemat_bio_v1.bedDiameter_mm).toBe(150)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// D. startPrint dos perfis: NUNCA emite G28
// ═══════════════════════════════════════════════════════════════════════

describe("R12.64.D — mcodes.startPrint nunca emite G28", () => {
  it("Nenhum profile tem startPrint iniciando com 'G28'", () => {
    for (const profile of listBioprinters()) {
      const sp = profile.mcodes.startPrint ?? ""
      expect(
        sp.startsWith("G28"),
        `Profile ${profile.id}: startPrint='${sp}' começa com G28`,
      ).toBe(false)
    }
  })

  it("emitHeader filtra defensivamente startPrint que começar com G28", () => {
    // Se algum profile fantasma tiver "G28" no startPrint, o emitter deve
    // filtrar isso — testamos aqui que o filtro funciona.
    const bp = getBioprinter("cellink_biox")
    const bioink = makeBioink()
    const modifiedBp: BioprinterProfile = {
      ...bp,
      mcodes: { ...bp.mcodes, startPrint: "G28 ; malicious" },
    }
    const lines = emitHeader(modifiedBp, bioink, {
      jobMetadata: makeJob(modifiedBp, bioink),
    })
    const gcode = lines.join("\n")
    // Mesmo forçando startPrint="G28", o emitter tem que filtrar.
    expect(gcode).not.toMatch(/^G28\s+;\s*malicious/m)
  })
})
