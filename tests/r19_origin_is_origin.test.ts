/**
 * R19 — Etapa A: PONTO ZERO É PONTO ZERO
 *  · peça única centrada em (0,0) = posição do bico no G92
 *  · placa multi-poços: 1º poço (superior-esquerdo) = origem; demais = offsets
 *  · sem skirt por padrão; sem park no fim; só Z+5 relativo
 *  · validador: NO_G92_ORIGIN, FIRST_MOVE_FAR, PARK_MOVE, raio útil
 */
import { describe, it, expect } from "vitest"
import { validateGcode } from "@/lib/bioprint/gcode-validator"
import { sliceMesh } from "@/lib/slicer/slice"
import { boxMesh } from "@/lib/slicer/primitives"
import { BASIC_PROFILES } from "@/lib/slicer/profiles"

const cmds = (g: string) => g.split("\n").map((l) => l.replace(/;.*$/, "").trim()).filter(Boolean)

/** primeiro comando de movimento XY DEPOIS do G92 — deve ser G1 com E>0 (sair extrudando), nunca G0 seco */
function firstXYLineAfterG92(gcode: string): string | null {
  let seen = false
  for (const l of cmds(gcode)) {
    if (/^G92\b/.test(l)) { seen = true; continue }
    if (!seen) continue
    if (/^G[01]\b/.test(l) && /[XY]-?\d/.test(l)) return l
  }
  return null
}

/** primeiro G0/G1 com X ou Y */


describe("R19.1 · o PRIMEIRO cordão nasce no ponto zero (sem deslocamento seco)", () => {
  it("BioSlicer (STL): 1º movimento XY após G92 é G1 com E>0; skirt desligado nos perfis básicos", () => {
    const mesh = boxMesh(12, 12, 1.0)
    const prof = BASIC_PROFILES[0]
    expect(prof.params.skirtLoops).toBe(0)
    const res = sliceMesh({ mesh, params: { ...prof.params }, extrusion: prof.extrusion, profileId: prof.id, profileName: prof.name })
    const l = firstXYLineAfterG92(res.gcode)!
    expect(l).toMatch(/^G1\b.*E/)
    expect(res.gcode).toMatch(/aproximação extrudada a partir do ponto zero/)
  })
})

describe("R19 · Etapa A · validador", () => {
  const head = "G21\nG90\nM83\nG92 X0 Y0 Z0 E0\n"
  it("aceita coordenadas negativas (peça centrada no bico)", () => {
    const g = head + "G1 X-5 Y-5 Z0.3 F600\nG1 X5 Y-5 E0.1\nG1 X5 Y5 E0.1\nG1 X-5 Y5 E0.1\n"
    const v = validateGcode(g)
    expect(v.issues.filter((i) => i.code.startsWith("OUT_OF_VOLUME")).length).toBe(0)
  })
  it("bloqueia primeiro movimento longe da origem (diagonal após G92)", () => {
    const g = head + "G0 X60 Y45 Z0.3 F3000\nG1 X70 Y45 E0.2\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "FIRST_MOVE_FAR")).toBe(true)
    expect(v.verdict).toBe("blocked")
  })
  it("bloqueia sem G92 antes do primeiro movimento", () => {
    const g = "G21\nG90\nM83\nG1 X1 Y1 Z0.3 F600\nG1 X5 Y1 E0.1\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "NO_G92_ORIGIN")).toBe(true)
  })
  it("bloqueia park no fim (movimento longo sem extrusão após extrudar)", () => {
    const g = head + "G1 X-5 Y0 Z0.3 F600\nG1 X5 Y0 E0.2\nG91\nG1 Z10\nG90\nG1 X0 Y200 F3000\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "PARK_MOVE")).toBe(true)
  })
  it("bloqueia ponto fora do raio útil (90 mm)", () => {
    const g = head + "G1 X-5 Y0 Z0.3 F600\nG1 X95 Y0 E2\n"
    const v = validateGcode(g)
    expect(v.issues.some((i) => i.code === "OUT_OF_VOLUME_X")).toBe(true)
  })
})

