import { describe, it, expect, beforeAll } from "vitest"
import * as fs from "node:fs"
import * as path from "node:path"
import { parseBinaryStl } from "@/lib/stl/binary-stl-parser"
import { registerMesh, clearMeshCache, hasMesh, STL_FILE_MAP } from "@/lib/stl/mesh-bounds"
import { generateGCodeForJob } from "@/lib/gcode/engine"
import { BIOPRINTER_PROFILES } from "@/lib/gcode/profiles/bioprinters"
import type { PrintJob, Bioink } from "@/lib/gcode/core/types"

// ═══════════════════════════════════════════════════════════════════
// R12.51 SMOKE: gerar G-code REAL ponta-a-ponta para heart e kidney
// usando os STLs anatômicos novos. Mede tempo de slicing.
// ═══════════════════════════════════════════════════════════════════

function loadStlFromDisk(fileName: string) {
  const p = path.resolve(process.cwd(), "public/stl", fileName)
  const buf = fs.readFileSync(p)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return parseBinaryStl(ab)
}

const smokeBioink: Bioink = {
  id: "smoke-gelma-10",
  material: "GelMA",
  concentration: 10,
  hasCells: false,
  viscosity_cP: 5000,
  crosslinker: "UV",
  temperature_c: 25,
  pressure_kpa: 80,
  shearStressMax_Pa: 200,
  nozzleDiameter_um: 410,
  flowMultiplier: 1.0,
  retraction_mm: 0,
  printSpeed_mms: 8,
  travelSpeed_mms: 30,
}

// Job mínimo viável p/ engine usando perfil real CELLINK BIO X
const minimalJob = (name: string): PrintJob => ({
  id: `smoke-${name}`,
  name,
  bioprinter: BIOPRINTER_PROFILES.cellink_biox,
  bioink: smokeBioink,
  layerHeight: 0.4,         // 0.4 mm pra reduzir nº camadas (perf)
  skirtLoops: 0,
  walls: 2,
  infillPercent: 20,
  infillAlgorithm: "linear",
  tissue: "anatômico",
  application: "smoke-test",
})

describe("smoke: G-code real do RIM com STL anatômico (R12.51)", () => {
  beforeAll(() => {
    clearMeshCache()
    const mesh = loadStlFromDisk("kidney-real.stl")
    registerMesh("kidney-real.stl", mesh)
    expect(hasMesh("kidney-real.stl")).toBe(true)
    expect(STL_FILE_MAP["kidney"]).toBe("kidney-real.stl")
  })

  it("gera G-code do rim com sucesso e mede tempo de slicing", () => {
    const t0 = performance.now()
    const result = generateGCodeForJob({
      job: minimalJob("rim-smoke"),
      geometryId: "kidney",
      geometryParams: { width: 60, height: 110, depth: 35 },
    })
    const elapsedMs = performance.now() - t0

    expect(result.gcode).toBeDefined()
    expect(result.gcode.length).toBeGreaterThan(100)
    expect(result.gcode).toMatch(/G1\b/)  // tem movimentos

    console.log(`\n  ⏱  RIM: ${elapsedMs.toFixed(0)}ms | ${result.gcode.split("\n").length} linhas | ${(result.gcode.length / 1024).toFixed(1)} KB`)

    // Performance budget: rim é leve (7960 tri), deve fatiar em <3s
    expect(elapsedMs).toBeLessThan(5000)
  })
})

describe("smoke: G-code real do CORAÇÃO com STL anatômico (R12.51)", () => {
  beforeAll(() => {
    clearMeshCache()
    const mesh = loadStlFromDisk("heart-real.stl")
    registerMesh("heart-real.stl", mesh)
    expect(hasMesh("heart-real.stl")).toBe(true)
    expect(STL_FILE_MAP["heart"]).toBe("heart-real.stl")
  })

  it("gera G-code do coração com sucesso e mede tempo de slicing (447k tri!)", () => {
    const t0 = performance.now()
    const result = generateGCodeForJob({
      job: minimalJob("coracao-smoke"),
      geometryId: "heart",
      geometryParams: { width: 80, height: 100, depth: 95 },
    })
    const elapsedMs = performance.now() - t0

    expect(result.gcode).toBeDefined()
    expect(result.gcode.length).toBeGreaterThan(100)
    expect(result.gcode).toMatch(/G1\b/)

    console.log(`\n  ⏱  CORAÇÃO: ${elapsedMs.toFixed(0)}ms | ${result.gcode.split("\n").length} linhas | ${(result.gcode.length / 1024).toFixed(1)} KB`)

    // Coração tem 447378 triângulos — performance budget mais generoso.
    // Se passar de 30s, certamente não roda em CF Workers (max 30ms paid).
    // Se passar de 60s, é proibitivo até em serverless tradicional.
    expect(elapsedMs).toBeLessThan(60000)
  }, 90000)  // timeout 90s pro vitest
})
