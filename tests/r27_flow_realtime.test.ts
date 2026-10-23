/**
 * R27 · Fluxo de biotinta: contínuo durante a impressão e responsivo em tempo real
 * ─────────────────────────────────────────────────────────────────────────────
 * Três causas do "fluxo baixo/lento" e do "aumentei e não mudou nada":
 *   1. O G-code escrevia `M221 S100` no START → zerava o fluxo que o Host tinha
 *      aplicado da memória da biotinta. Agora o arquivo não redefine M220/M221
 *      e o host IGNORA essas linhas se vierem de slicers externos.
 *   2. Prime/retração/purga com feed FIXO (F120 = 2 mm/s; joystick F200) → com
 *      2 000–9 000 steps/mm de seringa o motor perdia passos e o êmbolo não
 *      andava ("ok" sem movimento). Agora: limites do êmbolo (M203/M201/M204/
 *      M205) a partir dos E-steps, e todo movimento só-E respeita o teto.
 *   3. Cada caminho fazia prime → G4 150 ms → cordão → des-prime: puxa-empurra
 *      que não repõe pressão em gel e cria pausa seca a cada linha. Agora o
 *      fluxo é contínuo; prime só quando a pressão realmente caiu.
 */
import { describe, it, expect } from "vitest"
import {
  plungerLimits, plungerLimitsGcode, parseEsteps, safePlungerFeed_mmmin, pushVolumePlan, purgePlan, isFlowOverrideLine,
  SAFE_E_STEP_RATE, ASSUMED_SYRINGE_ESTEPS,
} from "../src/lib/slicer/flow-science"
import { sliceMesh } from "../src/lib/slicer/slice"
import { BASIC_PROFILES, baseParams } from "../src/lib/slicer/profiles"
import { PRIMITIVE_CATALOG } from "../src/lib/slicer/primitives"
import { syringeArea_mm2 } from "../src/lib/slicer/extrusion"
import { MarlinHost, macroPlungerLimits, plungerMaxFeed, macroPrimeUl, MACRO_ESTEP_TEST, MACRO_COLD_EXTRUSION } from "../src/lib/host/marlin-host"
import { PrinterMock } from "../src/lib/bioprint/printer-mock"
import { PrinterController } from "../src/lib/bioprint/printer-controller"
import { PrintLogger } from "../src/lib/bioprint/print-logger"

const makeBox = (p: Record<string, number>) => PRIMITIVE_CATALOG.find((c) => c.id === "box")!.make(p)
const cmds = (g: string) => g.split("\n").map((l) => l.replace(/;.*$/, "").trim()).filter(Boolean)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe("R27 · limites do êmbolo a partir dos E-steps", () => {
  it("3000 steps/mm (assumido) → ~1,33 mm/s; 93 steps/mm (filamento) → teto 5 mm/s; 9000 → 0,44 mm/s", () => {
    const a = plungerLimits(null)
    expect(a.assumed).toBe(true); expect(a.eSteps).toBe(ASSUMED_SYRINGE_ESTEPS)
    expect(a.maxFeed_mms).toBeCloseTo(SAFE_E_STEP_RATE / 3000, 2)
    expect(a.stepRate).toBeLessThanOrEqual(SAFE_E_STEP_RATE + 1)
    expect(plungerLimits(93).maxFeed_mms).toBe(5)
    expect(plungerLimits(9000).maxFeed_mms).toBeCloseTo(0.444, 2)
    expect(plungerLimits(2000, 0.5).maxFeed_mms).toBe(0.5) // override manual
  })
  it("gera M203/M201/M204/M205 do eixo E (sem M500) com jerk ≤ 0,2", () => {
    const g = plungerLimitsGcode(plungerLimits(2000), false)
    expect(g).toHaveLength(4)
    expect(g[0]).toMatch(/^M203 E2$/)
    expect(g[1]).toMatch(/^M201 E8$/)
    expect(g[2]).toMatch(/^M204 R8$/)
    expect(g[3]).toMatch(/^M205 E0\.2$/)
    expect(g.join("\n")).not.toMatch(/M500/)
    expect(macroPlungerLimits(2000)).toEqual(g)
    expect(plungerMaxFeed(2000)).toBe(2)
  })
  it("parseEsteps lê o echo do M503/M92", () => {
    expect(parseEsteps("echo:  M92 X80.00 Y80.00 Z400.00 E2800.00")).toBe(2800)
    expect(parseEsteps("echo: M92 X80 Y80 Z400 E93.0")).toBe(93)
    expect(parseEsteps("ok")).toBeNull()
    expect(parseEsteps("echo:  M203 X500.00 Y500.00 Z5.00 E25.00")).toBeNull()
  })
  it("safePlungerFeed respeita o teto e o piso anti stick-slip", () => {
    const L = plungerLimits(3000)
    expect(safePlungerFeed_mmmin(10, 1, L)).toBe(Math.round(L.maxFeed_mms * 60)) // pediu 10 mm/s → teto
    expect(safePlungerFeed_mmmin(0.001, 10, L)).toBe(3) // 0,0001 mm/s → piso 0,05 mm/s = F3
  })
})

describe("R27 · empurrar/purgar volume REAL compensando o M221", () => {
  const A = syringeArea_mm2({ volume_mL: 3, innerDiameter_mm: 8.66 })
  const L = plungerLimits(3000)
  it("50 µL em seringa 3 mL = 0,849 mm; a 200 % o E comandado cai pela metade", () => {
    const p1 = pushVolumePlan(50, A, L, 100)
    expect(p1.lines[0]).toBe("M83")
    expect(p1.e_mm).toBeCloseTo(50 / A, 3)
    expect(p1.flowCompensated).toBe(false)
    const p2 = pushVolumePlan(50, A, L, 200)
    expect(p2.e_mm).toBeCloseTo(50 / A / 2, 3)
    expect(p2.flowCompensated).toBe(true)
  })
  it("~10 µL/s e nunca acima do teto do êmbolo; 50 µL leva ~5 s", () => {
    const p = pushVolumePlan(50, A, L, 100, 10)
    expect(p.f_mmmin / 60).toBeLessThanOrEqual(L.maxFeed_mms + 1e-9)
    expect(p.seconds).toBeGreaterThanOrEqual(4.5); expect(p.seconds).toBeLessThanOrEqual(6)
    const q = purgePlan(10, 3, A, L, 100)
    expect(q.e_mm).toBeCloseTo(30 / A, 3)
  })
  it("seringa 10 mL com E-steps altos: o movimento ainda acontece dentro do teto (não trava)", () => {
    const A10 = syringeArea_mm2({ volume_mL: 10, innerDiameter_mm: 14.5 })
    const p = pushVolumePlan(100, A10, plungerLimits(8000), 150)
    expect(p.e_mm).toBeGreaterThan(0.3)
    expect(p.f_mmmin / 60).toBeLessThanOrEqual(0.5 + 1e-9)
  })
})

describe("R27 · G-code: sem reset de M221, limites do êmbolo no START, fluxo contínuo", () => {
  const pf = BASIC_PROFILES[0]
  const mesh = makeBox({ x: 10, y: 10, z: 1 })
  const r = sliceMesh({ mesh, params: { ...baseParams(0.41), ...pf.params }, extrusion: pf.extrusion, profileId: pf.id, profileName: pf.name, jobName: "t" })
  const c = cmds(r.gcode)

  it("não escreve M220/M221 (o Host é dono do fluxo)", () => {
    expect(c.some((l) => /^M22[01]\b/.test(l))).toBe(false)
    expect(isFlowOverrideLine("M221 S150")).toBe(true); expect(isFlowOverrideLine("M220 S80")).toBe(true); expect(isFlowOverrideLine("M2210")).toBe(false)
  })
  it("START tem M203 E / M201 E / M204 R / M205 E antes da pré-carga", () => {
    const i203 = c.findIndex((l) => /^M203 E/.test(l))
    const iPrime = c.findIndex((l, i) => i > 0 && /^G1 E[\d.]+ F\d+$/.test(l))
    expect(i203).toBeGreaterThan(0)
    expect(c.some((l) => /^M205 E0\.\d+$/.test(l))).toBe(true)
    expect(iPrime).toBeGreaterThan(i203)
  })
  it("pré-carga em 2 etapas com feed limitado (não mais F9 fixo), total = dead volume + extra", () => {
    const lines = r.gcode.split("\n")
    const i = lines.findIndex((l) => l.includes("PRÉ-CARGA"))
    const e1 = /G1 E([\d.]+) F(\d+)/.exec(lines[i + 1])!, e2 = /G1 E([\d.]+) F(\d+)/.exec(lines[i + 2])!
    const A = syringeArea_mm2(pf.extrusion.syringe!)
    const L = plungerLimits(pf.extrusion.eSteps)
    expect((+e1[1] + +e2[1]) * A).toBeGreaterThan(45) // ≈ 51 µL
    expect(+e1[2]).toBeLessThanOrEqual(Math.round(L.maxFeed_mms * 60))
    expect(+e1[2]).toBeGreaterThan(9)
  })
  it("nenhum G1 só-E tem feed acima do teto do êmbolo", () => {
    const L = plungerLimits(pf.extrusion.eSteps)
    const maxF = Math.round(L.maxFeed_mms * 60)
    for (const l of c) {
      const m = /^G1 E-?[\d.]+ F(\d+)$/.exec(l)
      if (m) expect(+m[1], l).toBeLessThanOrEqual(maxF)
    }
  })
  it("fluxo contínuo: sem G4 por caminho e sem 'des-prime' (E negativo) após cada cordão", () => {
    const g4 = c.filter((l) => /^G4\b/.test(l)).length
    expect(g4).toBeLessThanOrEqual(2) // só os do START/1º cordão
    const negE = c.filter((l) => /^G1 E-/.test(l)).length
    // perfil tem retractVolume_uL = 0 → nenhuma retração; antes havia 1 des-prime por caminho (~70)
    expect(negE).toBe(0)
    // mais linhas de cordão do que de E-only: a maior parte do tempo o êmbolo está empurrando junto com XY
    const xy = c.filter((l) => /^G1 X[-\d.]+ Y[-\d.]+ E/.test(l)).length
    const eOnly = c.filter((l) => /^G1 E/.test(l)).length
    expect(xy).toBeGreaterThan(eOnly * 3)
  })
  it("1ª camada recebe fluxo extra (1,15×) em relação à 2ª", () => {
    const seg = (layer: number) => {
      const block = r.gcode.split(`;LAYER:${layer}\n`)[1].split(";LAYER:")[0]
      const m = [...block.matchAll(/^G1 X([-\d.]+) Y([-\d.]+) E([\d.]+)/gm)]
      // razão E/distância da 2ª linha em diante (1ª pode ser aproximação)
      let best = 0
      for (let i = 1; i < m.length; i++) { const d = Math.hypot(+m[i][1] - +m[i - 1][1], +m[i][2] - +m[i - 1][2]); if (d > 5) { best = +m[i][3] / d; break } }
      return best
    }
    const h0 = pf.params.firstLayerHeight_mm, h1 = pf.params.layerHeight_mm
    // normaliza pela altura de camada (área do cordão ∝ h aproximadamente)
    expect((seg(0) / h0) / (seg(1) / h1)).toBeGreaterThan(1.08)
  })
  it("volume e tempo estimados continuam coerentes (sem pausas falsas)", () => {
    expect(r.stats.volume_uL).toBeGreaterThan(50) // caixa 10×10×1 mm, 3 camadas
    // sem os 150 ms de G4 por caminho + des-primes, o tempo estimado cai
    const starts = r.stats.extrusionStarts
    expect(r.stats.estimatedTime_s).toBeLessThan(60 + starts * 0.05)
  })
})

describe("R27 · host ignora M220/M221 do arquivo; macros seguras", () => {
  const G = `G21\nG90\nM83\nM221 S100\nM220 S100\nG92 X0 Y0 Z0 E0\n;LAYER:0\nG1 X10 Y0 E0.05 F30000\nM221 S100\nG1 X10 Y10 E0.05\n`
  it("MarlinHost.load remove M220/M221", () => {
    const mock = new PrinterMock({ latencyMs: 1 })
    const host = new MarlinHost(mock, {}, { tempPoll_ms: 0, tryAutoreport: false })
    const info = host.load(G)
    expect(info.lines).toBe(6) // 9 comandos − 3 overrides
    host.destroy()
  })
  it("PrinterController ignora M220/M221 do arquivo e o M221 injetado pela UI prevalece", async () => {
    const mock = new PrinterMock({ latencyMs: 1 })
    await mock.connect()
    const tx: string[] = []
    const ctrl = new PrinterController(mock, new PrintLogger(), { onLine: (l, k) => { if (k === "tx") tx.push(l) } }, { okTimeoutMs: 2000 })
    await ctrl.sendAndWait("M221 S150")
    const done = ctrl.start(G)
    ctrl.inject("M221 S180", "flow")
    await done
    await sleep(10)
    expect(tx.filter((l) => /^M221 S100/.test(l))).toHaveLength(0)
    expect(tx).toContain("M221 S150"); expect(tx).toContain("M221 S180")
    ctrl.destroy()
  })
  it("macros: teste de E-steps lento (F30), cold extrusion com P1, prime com teto", () => {
    expect(MACRO_ESTEP_TEST[1]).toBe("G1 E10 F30")
    expect(MACRO_COLD_EXTRUSION[0]).toBe("M302 S0 P1")
    const m = macroPrimeUl(5, { syringeArea_mm2: 58.9, plungerSpeed_mms: plungerMaxFeed(3000) })
    expect(+(/F(\d+)/.exec(m[1])![1])).toBeLessThanOrEqual(80)
  })
})
