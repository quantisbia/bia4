/**
 * BIA — R15 · MarlinHost: checksum/N-line/Resend, janela, polling, pausa/retomada
 * contra o PrinterMock (que valida checksum e emite Resend).
 */
import { describe, it, expect } from "vitest"
import { MarlinHost, marlinChecksum, parseTemps, parsePosition, stripComment, macroPrimeUl, macroPurge } from "@/lib/host/marlin-host"
import { PrinterMock } from "@/lib/bioprint/printer-mock"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// feedrates altos para o mock (tempo de movimento ∝ distância/F) não atrasar os testes
const SAMPLE = `; header
G21
G90
M83
G92 X0 Y0 Z0 E0
;LAYER:0
G0 Z0.3 F30000
G1 X10 Y0 E0.05 F30000
G1 X10 Y10 E0.05
G1 X0 Y10 E0.05
G1 X0 Y0 E0.05
;LAYER:1
G0 Z0.6 F30000
G1 X10 Y0 E0.05 F30000
G1 X10 Y10 E0.05
G1 X0 Y10 E0.05
G1 X0 Y0 E0.05
; end
`

describe("R15 · utilitários do host", () => {
  it("checksum Marlin (XOR) — N0 M110 N0 → 125", () => {
    expect(marlinChecksum("N0 M110 N0")).toBe(125)
  })
  it("parseTemps lê T e B com alvos", () => {
    const t = parseTemps("ok T:23.4 /0.0 B:37.0 /37.0 @:0 B@:0")!
    expect(t.hotend_C).toBeCloseTo(23.4)
    expect(t.bed_C).toBe(37)
    expect(t.bedTarget_C).toBe(37)
    expect(parseTemps("ok")).toBeNull()
  })
  it("parsePosition lê M114", () => {
    const p = parsePosition("X:1.50 Y:-2.00 Z:0.30 E:12.5 Count X:0 Y:0 Z:0")!
    expect(p.x).toBe(1.5); expect(p.y).toBe(-2); expect(p.z).toBe(0.3); expect(p.e).toBe(12.5)
  })
  it("stripComment", () => {
    expect(stripComment("G1 X1 ; move")).toBe("G1 X1")
    expect(stripComment("; só comentário")).toBe("")
  })
  it("macros de seringa convertem µL → mm de êmbolo (R27: feed limitado pelo êmbolo, nunca F fixo)", () => {
    const ctx = { syringeArea_mm2: 165.13, plungerSpeed_mms: 2 }
    // 16,5 µL a ~10 µL/s = 1,65 s → 0,1 mm / 1,65 s = 0,06 mm/s → F4 (não mais F120 = 2 mm/s)
    expect(macroPrimeUl(16.513, ctx)[1]).toMatch(/^G1 E0\.1000 F\d+$/)
    const f = +(/F(\d+)/.exec(macroPrimeUl(16.513, ctx)[1])![1])
    expect(f).toBeLessThanOrEqual(ctx.plungerSpeed_mms * 60)
    expect(f).toBeGreaterThanOrEqual(3)
    expect(macroPurge(1, 10, ctx)[1]).toMatch(/^G1 E0\.0606/)
    // compensação do M221: a 200 % o E comandado cai pela metade (volume real igual)
    expect(macroPrimeUl(16.513, { ...ctx, flowPercent: 200 })[1]).toMatch(/^G1 E0\.0500/)
  })
})

describe("R15 · MarlinHost com PrinterMock", () => {
  it("imprime tudo com janela 2, N-lines e checksum; progresso e camadas corretos", async () => {
    const mock = new PrinterMock({ latencyMs: 2 })
    await mock.connect()
    let finished: [boolean, string] | null = null
    const progress: number[] = []
    const layers = new Set<number>()
    const host = new MarlinHost(mock, {
      onFinished: (ok, r) => { finished = [ok, r] },
      onProgress: (p) => { progress.push(p.acked); layers.add(p.layer) },
    }, { window: 2, tempPoll_ms: 0, tryAutoreport: false })
    await host.connect()
    const info = host.load(SAMPLE)
    expect(info.lines).toBe(14)
    expect(info.layers).toBe(2)
    await host.start()
    for (let i = 0; i < 400 && !finished; i++) await sleep(20)
    expect(finished).toEqual([true, "completed"])
    expect(progress[progress.length - 1]).toBe(14)
    expect(layers.has(1)).toBe(true)
    expect(host.getState()).toBe("finished")
    host.destroy()
  })

  it("recupera de corrupção serial via Resend (corruptRate 15 %)", async () => {
    const mock = new PrinterMock({ latencyMs: 1, corruptRate: 0.15 })
    await mock.connect()
    let finished: [boolean, string] | null = null
    let resends = 0
    const host = new MarlinHost(mock, {
      onFinished: (ok, r) => { finished = [ok, r] },
      onProgress: (p) => { resends = p.resends },
    }, { window: 2, tempPoll_ms: 0, tryAutoreport: false, okTimeout_ms: 2000 })
    await host.connect()
    host.load([SAMPLE, SAMPLE, SAMPLE, SAMPLE, SAMPLE].join("\n"))
    await host.start()
    for (let i = 0; i < 1500 && !finished; i++) await sleep(20)
    expect(finished).toEqual([true, "completed"])
    expect(resends).toBeGreaterThanOrEqual(1)
    const st = mock.getState()
    expect(st.x).toBeCloseTo(0, 5)
    expect(st.y).toBeCloseTo(0, 5)
    host.destroy()
  })

  it("Klipper: sem numeração de linhas", async () => {
    const mock = new PrinterMock({ latencyMs: 1 })
    await mock.connect()
    const tx: string[] = []
    let finished = false
    const host = new MarlinHost(mock, { onLog: (k, t) => { if (k === "tx") tx.push(t) }, onFinished: () => { finished = true } }, { firmware: "klipper", tempPoll_ms: 0, tryAutoreport: false })
    await host.connect()
    host.load("G21\nG90\n")
    await host.start()
    for (let i = 0; i < 100 && !finished; i++) await sleep(10)
    expect(tx.some((l) => /^N\d+ /.test(l))).toBe(false)
    host.destroy()
  })

  it("pausa executa script e retoma na mesma posição", async () => {
    const mock = new PrinterMock({ latencyMs: 15 })
    await mock.connect()
    const states: string[] = []
    const tx: string[] = []
    let finished = false
    const host = new MarlinHost(mock, {
      onState: (s) => states.push(s),
      onLog: (k, t) => { if (k === "tx") tx.push(t) },
      onFinished: () => { finished = true },
    }, { window: 1, tempPoll_ms: 0, tryAutoreport: false })
    await host.connect()
    host.load(SAMPLE)
    await host.start()
    await sleep(60)
    host.pause()
    for (let i = 0; i < 100 && host.getState() !== "paused"; i++) await sleep(10)
    expect(host.getState()).toBe("paused")
    expect(tx.some((l) => /M400/.test(l))).toBe(true)
    expect(tx.some((l) => /G1 Z5 F300/.test(l))).toBe(true)
    await host.inject("M105")
    host.resume()
    for (let i = 0; i < 1500 && !finished; i++) await sleep(10)
    expect(finished).toBe(true)
    expect(states).toContain("pausing")
    expect(states).toContain("resuming")
    expect(tx.some((l) => /G1 Z-5 F300/.test(l))).toBe(true)
    host.destroy()
  })

  it("polling de temperatura atualiza onTemps", async () => {
    const mock = new PrinterMock({ latencyMs: 1 })
    await mock.connect()
    let temps: { hotend_C: number | null } | null = null
    const host = new MarlinHost(mock, { onTemps: (t) => { temps = t } }, { tempPoll_ms: 30, tryAutoreport: false })
    await host.connect()
    await sleep(120)
    expect(temps).not.toBeNull()
    expect(temps!.hotend_C).toBeGreaterThan(0)
    host.destroy()
  })

  it("cancel envia footer de segurança e volta a connected", async () => {
    const mock = new PrinterMock({ latencyMs: 20 })
    await mock.connect()
    const tx: string[] = []
    let fin: [boolean, string] | null = null
    const host = new MarlinHost(mock, { onLog: (k, t) => { if (k === "tx") tx.push(t) }, onFinished: (ok, r) => { fin = [ok, r] } }, { tempPoll_ms: 0, tryAutoreport: false })
    await host.connect()
    host.load(SAMPLE)
    await host.start()
    await sleep(50)
    host.cancel()
    for (let i = 0; i < 100 && !fin; i++) await sleep(10)
    expect(fin).toEqual([false, "cancelled"])
    expect(tx.some((l) => /M104 S0/.test(l))).toBe(true)
    expect(host.getState()).toBe("connected")
    host.destroy()
  })
})
