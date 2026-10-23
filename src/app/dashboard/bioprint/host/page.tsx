"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R15 · /dashboard/bioprint/host — BIA Host (bioimpressora)
 *  ─────────────────────────────────────────────────────────────────────
 *  Host profissional para Ender/BioEnder/Enderstruder (Marlin) e Klipper:
 *  USB (Web Serial) ou simulador · N-line+checksum+Resend · janela de envio ·
 *  temperaturas (M105/M155) · posição (M114) · progresso por camada · ETA ·
 *  jog XYZ+E · macros de seringa · zerar origem (G92, sem G28) · M221/M220 ·
 *  Start/Pause/Resume/Cancel/M112.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Usb, Plug, PlugZap, Play, Pause, Square, AlertOctagon, Thermometer, Crosshair, Terminal, Upload,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, Syringe, Gauge, Layers, Activity, Settings2, Cpu,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  MarlinHost, type HostState, type HostProgress, type HostTemps, type HostPosition,
  macroPrimeUl, macroRetractUl, macroPurge, MACRO_SET_ORIGIN, MACRO_GO_ORIGIN, MACRO_COLD_EXTRUSION, MACRO_ESTEP_TEST, MACRO_READ_SETTINGS, macroSetEsteps, macroPlungerLimits, plungerMaxFeed,
} from "@/lib/host/marlin-host"
import { PrinterMock } from "@/lib/bioprint/printer-mock"
import { PrinterConnection, type PrinterTransport } from "@/lib/bioprint/printer-connection"
import { SYRINGE_CATALOG, syringeArea_mm2 } from "@/lib/slicer/extrusion"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { FlowBoostPanel } from "@/components/bioprint/FlowBoostPanel"
import { suggestStartFlow, rememberGoodFlow, clampFlow, type FlowMemoryEntry } from "@/lib/bioprint/flow-memory"
import { PrintFeedbackModal } from "@/components/bioprint/PrintFeedbackModal"
import { inferTissueFromGeometry, type PresetParams } from "@/lib/bioprint/tissue-presets"

const HANDOFF_KEY = "bia.host.gcode.handoff"
type LogLine = { k: "tx" | "rx" | "info" | "warn" | "error"; t: string; ts: number }

export default function BioHostPage() {
  const { state, updateControl } = useBioprintProcess()
  // R24.5 · Fase 5 começa aqui: ao terminar, perguntar "ficou bom? nota? o que mudar?"
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [lastFinished, setLastFinished] = useState<{ ok: boolean; at: number } | null>(null)
  const fbTissueId = inferTissueFromGeometry(state.model.geometryId) ?? "membrana"
  const fbBioinkId = (() => { const f = state.bioink.formulations?.[0]; if (f?.materialId) return f.materialId; const m = (state.bioink.material ?? "").toLowerCase(); return m.includes("gelma") ? "gelma" : "alginate" })()
  const fbParams: PresetParams = {
    layerHeightMm: state.slice.layerHeightMm ?? 0.25, printSpeedMmS: state.slice.printSpeedMmS ?? 8, pressureKPa: state.slice.pressureKPa ?? 80,
    flowPercent: Math.round((state.slice.extrusionMultiplier ?? 1) * 100), infillPercent: state.slice.infillPercent ?? 30, infillPatternId: state.slice.infillPatternId ?? "classic-lines",
    walls: 2, skirtLoops: state.slice.skirtLoops ?? 0, retractionMm: state.slice.retractionMm ?? 0, cartridgeTempC: state.slice.cartridgeTempC ?? 25, bedTempC: state.slice.bedTempC ?? 20, chamberTempC: state.slice.chamberTempC ?? null, perimeterOnly: state.slice.perimeterOnly ?? false,
  }
  const hostRef = useRef<MarlinHost | null>(null)

  const [transport, setTransport] = useState<"serial" | "mock">("serial")
  const [baud, setBaud] = useState(115200)
  const [firmware, setFirmware] = useState<"marlin" | "klipper">("marlin")
  const [windowN, setWindowN] = useState(2)
  const [hs, setHs] = useState<HostState>("disconnected")
  const [temps, setTemps] = useState<HostTemps | null>(null)
  const [pos, setPos] = useState<HostPosition | null>(null)
  const [prog, setProg] = useState<HostProgress | null>(null)
  const [log, setLog] = useState<LogLine[]>([])
  const [showTx, setShowTx] = useState(false)
  const showTxRef = useRef(showTx)
  useEffect(() => { showTxRef.current = showTx }, [showTx])
  const [cmd, setCmd] = useState("")
  const [gcode, setGcode] = useState<string>("")
  const [gcodeName, setGcodeName] = useState<string>("")
  const [err, setErr] = useState<string | null>(null)
  const [jogStep, setJogStep] = useState(1)
  const [jogF, setJogF] = useState(1200)
  const [eStep, setEStep] = useState(1)
  const [syringe, setSyringe] = useState(SYRINGE_CATALOG[3])
  const [flow, setFlow] = useState(100)
  const [flowApplied, setFlowApplied] = useState<number | null>(null)
  const [flowMemory, setFlowMemory] = useState<FlowMemoryEntry | null>(null)
  const flowStartRef = useRef(100)
  const [speed, setSpeed] = useState(100)
  const [esteps, setEsteps] = useState(2000)
  // R27 · E-steps lidos do firmware (M503) — null = assumidos 3000
  const [estepsRead, setEstepsRead] = useState<number | null>(null)
  const estepsReadRef = useRef<number | null>(null)
  const flowRef = useRef(100)
  useEffect(() => { flowRef.current = flow }, [flow])
  const logEnd = useRef<HTMLDivElement>(null)
  const serialSupported = typeof navigator !== "undefined" && !!navigator.serial

  // R17: fluxo inicial = memória por biotinta (ou default generoso ≥ 100 %)
  const flowMaterialLabel = state.bioink.formulations?.[0]?.label ?? state.bioink.material ?? "biotinta genérica"
  const flowMaterialKey = state.bioink.formulations?.[0]?.materialId ?? flowMaterialLabel
  useEffect(() => {
    const sgt = suggestStartFlow(flowMaterialKey)
    setFlowMemory(sgt.entry); setFlow(sgt.percent); flowStartRef.current = sgt.percent
  }, [flowMaterialKey])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY)
      if (raw) {
        const h = JSON.parse(raw) as { gcode: string; name?: string; syringe?: { volume_mL: number; innerDiameter_mm: number } | null }
        setGcode(h.gcode); setGcodeName(h.name ?? "handoff.gcode")
        if (h.syringe) { const s = SYRINGE_CATALOG.find((c) => c.volume_mL === h.syringe!.volume_mL); if (s) setSyringe(s) }
        sessionStorage.removeItem(HANDOFF_KEY)
        return
      }
    } catch { /* noop */ }
    if (state.slice.gcode) { setGcode(state.slice.gcode); setGcodeName("etapa-3.gcode") }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // R18: rola só o console (scrollTop) — scrollIntoView rolava a página inteira
  useEffect(() => { const b = logEnd.current?.parentElement; if (b) b.scrollTop = b.scrollHeight }, [log])

  const pushLog = useCallback((k: LogLine["k"], t: string) => {
    setLog((l) => { const n = [...l, { k, t, ts: Date.now() }]; return n.length > 600 ? n.slice(-600) : n })
  }, [])

  const connect = useCallback(async () => {
    setErr(null)
    try {
      let tr: PrinterTransport
      if (transport === "mock") {
        tr = new PrinterMock({ latencyMs: 20, busyRate: 0.02, corruptRate: 0.01 })
      } else {
        if (!serialSupported) throw new Error("Web Serial indisponível — use Chrome/Edge em HTTPS, ou o simulador.")
        const real = new PrinterConnection({ baudRate: baud })
        await real.requestAndOpen()
        tr = real
      }
      const host = new MarlinHost(tr, {
        onState: (s, r) => { setHs(s); if (r) pushLog("info", `estado: ${s} (${r})`) },
        onTemps: setTemps,
        onPosition: setPos,
        onProgress: setProg,
        onLog: (k, t) => {
          // R27 · captura E-steps do echo do M503/M92
          if (k === "rx") { const m = t.match(/\bM92\b[^\n]*?\bE(-?[\d.]+)/); const v = m ? parseFloat(m[1]) : NaN; if (Number.isFinite(v) && v > 0 && v !== estepsReadRef.current) { estepsReadRef.current = v; setEstepsRead(v); setEsteps(v); pushLog("info", `E-steps lidos: ${v} steps/mm → êmbolo máx ${plungerMaxFeed(v)} mm/s`) } }
          if (k === "tx" && !showTxRef.current) return; if (k === "rx" && /^ok\s*$/.test(t)) return; pushLog(k, t)
        },
        onFinished: (ok, r) => {
          pushLog(ok ? "info" : "warn", ok ? "✅ Impressão concluída" : `⏹ ${r}`)
          setLastFinished({ ok, at: Date.now() })
          // Fase 4 pronta → desbloqueia Fases 5 e 6; e pergunta como ficou (laço fechado)
          try { updateControl({ status: "ready", connected: true, tissueType: state.control.tissueType ?? fbTissueId }) } catch { /* noop */ }
          if (ok) setTimeout(() => setFeedbackOpen(true), 900)
          else pushLog("info", "Quer registrar o que aconteceu? Use o botão “Avaliar impressão” para a BIA ajustar o próximo G-code.")
        },
      }, { window: windowN, firmware, tempPoll_ms: 3000, tryAutoreport: true, okTimeout_ms: 45000 })
      hostRef.current = host
      await host.connect()
      pushLog("info", `conectado (${transport === "mock" ? "simulador" : `USB ${baud} baud`}) · janela ${windowN} · ${firmware}`)
      // R27 · prepara o eixo E para seringa: E relativo, extrusão a frio, lê E-steps e aplica limites do êmbolo
      if (firmware !== "klipper") {
        try {
          await host.inject("M83"); await host.inject("M302 S0 P1")
          try { await host.inject("M503") } catch { /* alguns firmwares não respondem */ }
          for (const l of macroPlungerLimits(estepsReadRef.current)) await host.inject(l)
          pushLog("info", `limites do êmbolo aplicados (R27): máx ${plungerMaxFeed(estepsReadRef.current)} mm/s${estepsReadRef.current ? ` (${estepsReadRef.current} steps/mm)` : " (3000 steps/mm assumidos — calibre abaixo)"}`)
        } catch (e) { pushLog("warn", `preparação do eixo E falhou: ${(e as Error).message}`) }
      }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
  }, [transport, baud, firmware, windowN, serialSupported, pushLog, updateControl, state.control.tissueType, fbTissueId])

  const disconnect = useCallback(async () => {
    try { await hostRef.current?.disconnect() } catch { /* noop */ }
    hostRef.current?.destroy(); hostRef.current = null
    setHs("disconnected"); setProg(null)
  }, [])

  useEffect(() => () => { hostRef.current?.destroy() }, [])

  const send = useCallback(async (lines: string | string[]) => {
    const h = hostRef.current
    if (!h) { setErr("Conecte primeiro."); return }
    for (const l of Array.isArray(lines) ? lines : [lines]) {
      try { pushLog("tx", l); await h.inject(l) } catch (e) { pushLog("error", `${l} → ${(e as Error).message}`) }
    }
  }, [pushLog])

  const start = useCallback(async () => {
    const h = hostRef.current
    if (!h) { setErr("Conecte primeiro."); return }
    if (!gcode.trim()) { setErr("Carregue um G-code."); return }
    setErr(null)
    try {
      await h.inject(`M221 S${clampFlow(flow)}`); setFlowApplied(clampFlow(flow)); flowStartRef.current = flow
      await h.start(gcode)
    } catch (e) { setErr((e as Error).message) }
  }, [gcode, flow])

  const applyFlow = useCallback((v: number) => {
    const c = clampFlow(v); setFlow(c)
    void send(`M221 S${c}`).then(() => setFlowApplied(c))
  }, [send])
  // R25/R27 · empurra volume REAL (G1 E em M83) — compensa o M221 ativo e respeita o teto do êmbolo
  const ctx = useMemo(() => ({ syringeArea_mm2: syringeArea_mm2(syringe), plungerSpeed_mms: plungerMaxFeed(estepsRead), flowPercent: flow }), [syringe, estepsRead, flow])
  const pushNow = useCallback((uL: number) => {
    const m = macroPrimeUl(uL, ctx, 10)
    m[1] += `  ; R27 empurrar ${uL} µL (M221 ${flowRef.current} % compensado)`
    void send(m)
  }, [send, ctx])
  const confirmGoodFlow = useCallback(() => {
    setFlowMemory(rememberGoodFlow(flowMaterialKey, flowMaterialLabel, flow, flowStartRef.current))
  }, [flowMaterialKey, flowMaterialLabel, flow])

  const onFile = useCallback(async (f: File) => { setGcode(await f.text()); setGcodeName(f.name) }, [])

  const connected = hs !== "disconnected"
  const printing = hs === "printing" || hs === "pausing" || hs === "resuming"
  const gLines = useMemo(() => gcode ? gcode.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith(";")).length : 0, [gcode])

  const jog = (axis: "X" | "Y" | "Z", d: number) => send(["G91", `G0 ${axis}${d} F${jogF}`, "G90"])
  // R27 · jog do êmbolo com feed limitado (antes F120 = 2 mm/s fixo → perdia passos)
  const jogE = (d: number) => send(["M83", `G1 E${d} F${Math.max(3, Math.round(Math.min(ctx.plungerSpeed_mms, 0.5) * 60))}`])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300/80 font-semibold mb-1">Fase 4 / 6 · Bioimpressão · modo avançado (host serial)</div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Cpu className="w-5 h-5 text-emerald-300" /> BIA Host — controle da bioimpressora</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">Host serial profissional (linhas numeradas + checksum + reenvio, janela de envio, autoreport de temperatura, pausa com script). Compatível com Ender/BioEnder (Marlin) e Klipper via USB.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/dashboard/bioprint/slice" className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-400/40 text-gray-300">← Fase 3 · Fatiar</Link>
          <Link href="/dashboard/bioprint/execute" className="px-3 py-1.5 rounded-lg border border-amber-400/30 hover:border-amber-400/60 text-amber-200">Fase 4 · modo guiado (validador + viewer 3D)</Link>
          <StatePill s={hs} />
        </div>
      </header>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <div className="space-y-4">
          <Panel title="Conexão" icon={<Usb className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2 flex gap-2">
                <button onClick={() => setTransport("serial")} className={cn("flex-1 py-1.5 rounded-lg border", transport === "serial" ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10")}>USB (Web Serial)</button>
                <button onClick={() => setTransport("mock")} className={cn("flex-1 py-1.5 rounded-lg border", transport === "mock" ? "border-violet-400/50 bg-violet-500/10" : "border-white/10")}>Simulador</button>
              </div>
              <Field label="Baud"><select value={baud} onChange={(e) => setBaud(+e.target.value)} className={inp} disabled={connected}>{[115200, 250000, 57600, 230400].map((b) => <option key={b} value={b}>{b}</option>)}</select></Field>
              <Field label="Firmware"><select value={firmware} onChange={(e) => setFirmware(e.target.value as "marlin" | "klipper")} className={inp} disabled={connected}><option value="marlin">Marlin (Ender/BioEnder)</option><option value="klipper">Klipper</option></select></Field>
              <Field label="Janela de envio" tip="Linhas em voo sem 'ok'. 1 = ping-pong (mais seguro); 2–4 evita micro-pausas em curvas."><select value={windowN} onChange={(e) => setWindowN(+e.target.value)} className={inp} disabled={connected}>{[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
              <div className="flex items-end">
                {!connected
                  ? <button onClick={connect} className="w-full py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center gap-1.5"><Plug className="w-3.5 h-3.5" /> Conectar</button>
                  : <button onClick={disconnect} className="w-full py-1.5 rounded-lg border border-white/15 flex items-center justify-center gap-1.5"><PlugZap className="w-3.5 h-3.5" /> Desconectar</button>}
              </div>
            </div>
            {!serialSupported && transport === "serial" && <div className="mt-2 text-[11px] text-amber-300">Web Serial não disponível neste navegador — use Chrome/Edge (desktop) em HTTPS, ou escolha o Simulador.</div>}
            {err && <div className="mt-2 text-xs text-red-300">{err}</div>}
          </Panel>

          <Panel title="G-code" icon={<Upload className="w-4 h-4" />} subtitle={gcode ? `${gcodeName} · ${gLines.toLocaleString("pt-BR")} linhas` : undefined}>
            <label className="block rounded-lg border border-dashed border-white/15 hover:border-emerald-400/40 p-3 text-center text-xs text-gray-300 cursor-pointer">
              {gcode ? "Trocar arquivo .gcode" : "Carregar .gcode (ou venha do BioSlicer)"}
              <input type="file" accept=".gcode,.gco,.g,.nc" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            </label>
            {gcode && (
              <div className="mt-2 flex gap-2">
                <button onClick={start} disabled={!connected || printing || hs === "paused"} className="flex-1 py-2 rounded-lg bg-emerald-500 text-black font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"><Play className="w-4 h-4" /> Iniciar</button>
                {hs === "paused"
                  ? <button onClick={() => hostRef.current?.resume()} className="px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-400/40"><Play className="w-4 h-4" /></button>
                  : <button onClick={() => hostRef.current?.pause()} disabled={!printing} className="px-3 py-2 rounded-lg border border-white/15 disabled:opacity-40"><Pause className="w-4 h-4" /></button>}
                <button onClick={() => hostRef.current?.cancel()} disabled={!printing && hs !== "paused"} className="px-3 py-2 rounded-lg border border-white/15 disabled:opacity-40"><Square className="w-4 h-4" /></button>
                <button onClick={() => hostRef.current?.emergency()} disabled={!connected} title="M112 — parada de emergência" className="px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 disabled:opacity-40"><AlertOctagon className="w-4 h-4" /></button>
              </div>
            )}
            <div className="mt-2 text-[11px] text-gray-500">Antes de iniciar: posicione o bico sobre a origem (centro do alvo) com o jog e clique em <b>Zerar origem</b>. O G-code BIA não faz home.</div>
          </Panel>

          <Panel title="Movimentação manual e origem" icon={<Crosshair className="w-4 h-4" />}>
            <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
              <div className="grid grid-cols-3 gap-1">
                <span />
                <JogBtn onClick={() => jog("Y", jogStep)} disabled={!connected}><ArrowUp className="w-4 h-4" /></JogBtn>
                <span />
                <JogBtn onClick={() => jog("X", -jogStep)} disabled={!connected}><ArrowLeft className="w-4 h-4" /></JogBtn>
                <JogBtn onClick={() => send(MACRO_GO_ORIGIN)} disabled={!connected} title="Ir à origem (sem G28)"><Home className="w-4 h-4" /></JogBtn>
                <JogBtn onClick={() => jog("X", jogStep)} disabled={!connected}><ArrowRight className="w-4 h-4" /></JogBtn>
                <span />
                <JogBtn onClick={() => jog("Y", -jogStep)} disabled={!connected}><ArrowDown className="w-4 h-4" /></JogBtn>
                <span />
              </div>
              <div className="space-y-1.5">
                <div className="flex gap-1"><JogBtn onClick={() => jog("Z", jogStep)} disabled={!connected} wide>Z +{jogStep}</JogBtn><JogBtn onClick={() => jog("Z", -jogStep)} disabled={!connected} wide>Z −{jogStep}</JogBtn></div>
                <div className="flex gap-1 text-[11px]">{[0.1, 0.5, 1, 5, 10].map((s) => <button key={s} onClick={() => setJogStep(s)} className={cn("flex-1 py-1 rounded border", jogStep === s ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10")}>{s}</button>)}</div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400">F <input type="number" value={jogF} onChange={(e) => setJogF(+e.target.value)} className={cn(inp, "w-20")} /> mm/min</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
              <button onClick={() => send(MACRO_SET_ORIGIN)} disabled={!connected} className="py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 disabled:opacity-40 font-medium">Zerar origem (G92)</button>
              <button onClick={() => send("M114")} disabled={!connected} className="py-1.5 rounded-lg border border-white/10 disabled:opacity-40">Ler posição (M114)</button>
              <button onClick={() => send(MACRO_COLD_EXTRUSION)} disabled={!connected} className="py-1.5 rounded-lg border border-white/10 disabled:opacity-40">Extrusão a frio (M302)</button>
              <button onClick={() => send(["M18"])} disabled={!connected} className="py-1.5 rounded-lg border border-white/10 disabled:opacity-40">Soltar motores (M18)</button>
            </div>
            {pos && <div className="mt-2 font-mono text-xs text-gray-300">X {pos.x.toFixed(2)} · Y {pos.y.toFixed(2)} · Z {pos.z.toFixed(2)} · E {pos.e.toFixed(2)}</div>}
          </Panel>

          <Panel title="Seringa e extrusão" icon={<Syringe className="w-4 h-4" />}>
            <Field label="Seringa"><select value={syringe.label} onChange={(e) => setSyringe(SYRINGE_CATALOG.find((s) => s.label === e.target.value) ?? syringe)} className={inp}>{SYRINGE_CATALOG.map((s) => <option key={s.label}>{s.label}</option>)}</select></Field>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
              <button onClick={() => send(macroPrimeUl(5, ctx))} disabled={!connected} className="py-1.5 rounded-lg border border-white/10 disabled:opacity-40">Prime 5 µL</button>
              <button onClick={() => send(macroRetractUl(2, ctx))} disabled={!connected} className="py-1.5 rounded-lg border border-white/10 disabled:opacity-40">Retrair 2 µL</button>
              <button onClick={() => send(macroPurge(10, 3, ctx))} disabled={!connected} className="py-1.5 rounded-lg border border-white/10 disabled:opacity-40">Purgar 30 µL (3 s)</button>
            </div>
            <div className="mt-1.5 text-[10.5px] text-gray-500">Êmbolo máx {ctx.plungerSpeed_mms} mm/s {estepsRead ? `(${estepsRead} steps/mm lidos)` : "(3000 steps/mm assumidos)"} · volumes compensam o M221 atual ({flow} %).</div>
            <div className="mt-2 flex items-center gap-1 text-xs flex-wrap">
              <span className="text-gray-400">Êmbolo</span>
              {[0.1, 0.5, 1, 5].map((s) => <button key={s} onClick={() => setEStep(s)} className={cn("px-2 py-1 rounded border", eStep === s ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10")}>{s} mm</button>)}
              <button onClick={() => jogE(eStep)} disabled={!connected} className="px-2 py-1 rounded border border-white/10 disabled:opacity-40">E+</button>
              <button onClick={() => jogE(-eStep)} disabled={!connected} className="px-2 py-1 rounded border border-white/10 disabled:opacity-40">E−</button>
            </div>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-gray-300">Calibrar E-steps (seringa)</summary>
              <ol className="mt-1 text-gray-400 list-decimal pl-4 space-y-1">
                <li>Marque o êmbolo e clique <b>Mover 10 mm</b>.</li>
                <li>Meça quanto andou (d). Novo = atual × 10 / d.</li>
                <li>Digite e aplique (M92 + M500).</li>
              </ol>
              <div className="mt-1.5 flex gap-1.5 flex-wrap">
                <button onClick={() => send(MACRO_READ_SETTINGS)} disabled={!connected} className="px-2 py-1 rounded border border-white/10 disabled:opacity-40">Ler (M503)</button>
                <button onClick={() => send(MACRO_ESTEP_TEST)} disabled={!connected} className="px-2 py-1 rounded border border-white/10 disabled:opacity-40">Mover 10 mm (20 s)</button>
                <input type="number" value={esteps} onChange={(e) => setEsteps(+e.target.value)} className={cn(inp, "w-24")} />
                <button onClick={() => { void send([...macroSetEsteps(esteps), ...macroPlungerLimits(esteps)]); estepsReadRef.current = esteps; setEstepsRead(esteps) }} disabled={!connected} className="px-2 py-1 rounded bg-amber-500/20 border border-amber-400/40 disabled:opacity-40">Aplicar M92 + limites</button>
              </div>
            </details>
          </Panel>

          <FlowBoostPanel
            flowPercent={flow} appliedPercent={flowApplied} connected={connected} streaming={printing}
            materialLabel={flowMaterialLabel} memory={flowMemory} startPercent={flowStartRef.current}
            onChange={applyFlow} onConfirmGood={confirmGoodFlow}
            onPushNow={pushNow} syringeArea_mm2={syringeArea_mm2(syringe)}
            eSteps={estepsRead} plungerMax_mms={ctx.plungerSpeed_mms}
          />
          <Panel title="Velocidade de impressão" icon={<Gauge className="w-4 h-4" />}>
            <Slider label="Velocidade (M220)" value={speed} min={20} max={200} onChange={setSpeed} onCommit={(v) => send(`M220 S${v}`)} disabled={!connected} />
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-2">
            <Stat icon={<Thermometer className="w-3.5 h-3.5" />} label="Cartucho" value={temps?.hotend_C != null ? `${temps.hotend_C.toFixed(1)} °C` : "–"} sub={temps?.hotendTarget_C ? `alvo ${temps.hotendTarget_C} °C` : undefined} />
            <Stat icon={<Thermometer className="w-3.5 h-3.5" />} label="Mesa" value={temps?.bed_C != null ? `${temps.bed_C.toFixed(1)} °C` : "–"} sub={temps?.bedTarget_C ? `alvo ${temps.bedTarget_C} °C` : undefined} />
            <Stat icon={<Layers className="w-3.5 h-3.5" />} label="Camada" value={prog ? `${prog.layer + 1}${prog.layerCount ? ` / ${prog.layerCount}` : ""}` : "–"} />
            <Stat icon={<Activity className="w-3.5 h-3.5" />} label="ETA" value={prog?.eta_s != null ? fmtTime(prog.eta_s) : "–"} sub={prog ? `${prog.lps} linhas/s · ${prog.resends} resend` : undefined} />
          </div>
          {prog && (
            <div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${prog.percent.toFixed(1)}%` }} /></div>
              <div className="mt-1 text-[11px] text-gray-400 flex justify-between"><span>{prog.acked.toLocaleString("pt-BR")} / {prog.total.toLocaleString("pt-BR")} linhas ({prog.percent.toFixed(1)} %)</span><span>decorrido {fmtTime(prog.elapsed_s)} · em voo {prog.inFlight}</span></div>
            </div>
          )}

          <Panel title="Console" icon={<Terminal className="w-4 h-4" />} subtitle={<label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={showTx} onChange={(e) => setShowTx(e.target.checked)} /> mostrar TX do stream</label>}>
            <div className="h-80 overflow-auto overscroll-contain rounded-lg bg-black/50 p-2 font-mono text-[11px] leading-relaxed">
              {log.length === 0 && <div className="text-gray-600">— sem mensagens —</div>}
              {log.map((l, i) => (
                <div key={i} className={cn(l.k === "tx" ? "text-emerald-300/80" : l.k === "rx" ? "text-gray-300" : l.k === "info" ? "text-sky-300" : l.k === "warn" ? "text-amber-300" : "text-red-300")}>
                  <span className="text-gray-600 mr-1">{new Date(l.ts).toLocaleTimeString("pt-BR", { hour12: false })}</span>{l.k === "tx" ? "→ " : l.k === "rx" ? "← " : "• "}{l.t}
                </div>
              ))}
              <div ref={logEnd} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (cmd.trim()) { send(cmd.trim()); setCmd("") } }} className="mt-2 flex gap-2">
              <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Comando G-code (ex.: M105, M114, G1 X10 F600)" className={cn(inp, "font-mono")} disabled={!connected} />
              <button type="submit" disabled={!connected} className="px-3 rounded-md bg-emerald-500/20 border border-emerald-400/40 disabled:opacity-40">Enviar</button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
              {["M105", "M114", "M115", "M503", "M400", "M18", "M220 S100", "M221 S100"].map((c) => <button key={c} onClick={() => send(c)} disabled={!connected} className="px-2 py-0.5 rounded border border-white/10 hover:border-emerald-400/40 disabled:opacity-40 font-mono">{c}</button>)}
            </div>
          </Panel>

          <Panel title="Lista de verificação pré-impressão" icon={<Settings2 className="w-4 h-4" />}>
            <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4">
              <li><b>Extrusão a frio</b> habilitada (M302 S0) — bioimpressoras não têm hotend a 170 °C.</li>
              <li><b>E-steps</b> calibrados para a seringa (tipicamente 2000–9000 steps/mm em redução 4:1).</li>
              <li>Seringa <b>sem bolhas</b>; purgue até sair cordão contínuo.</li>
              <li>Bico posicionado sobre o alvo e <b>origem zerada (G92)</b> — nunca G28 com bandeja/poço montados.</li>
              <li>Temperaturas estáveis (GelMA 21–25 °C · Matrigel 4–10 °C / mesa 37 °C).</li>
              <li>Janela de envio 2–3 em Marlin de 8 bits é segura; use 1 se houver muitos <i>Resend</i>.</li>
            </ul>
          </Panel>
        </div>
      </div>

      {/* R24.5 · Pós-impressão: ficou bom? nota + o que mudar (Fase 5) */}
      {(lastFinished || hs === "finished") && (
        <div className="rounded-xl border border-sky-400/40 bg-sky-500/[0.08] p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="text-[10px] uppercase tracking-wider text-sky-300/90 font-semibold">Fase 5 · Análise da bioimpressão</div>
            <div className="text-sm font-semibold text-white">A impressão terminou. Ficou como você esperava?</div>
            <div className="text-xs text-gray-300 mt-0.5">Dê uma nota de 1 a 5 e conte o que viu — a BIA interpreta e ajusta fluxo, velocidade, camada, retração ou paredes no próximo G-code.</div>
          </div>
          <button type="button" onClick={() => setFeedbackOpen(true)} className="px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-400 hover:bg-sky-500/30 text-sky-100 text-xs font-semibold">⭐ Avaliar impressão</button>
          <Link href="/dashboard/bioprint/review" className="px-3 py-2 rounded-xl border border-white/15 hover:border-white/30 text-xs text-gray-200">Ver histórico (Fase 5) →</Link>
        </div>
      )}
      <PrintFeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        tissueId={fbTissueId}
        bioinkId={fbBioinkId}
        geometryId={state.model.geometryId ?? (gcodeName ? "draw" : null)}
        params={fbParams}
        materialId={state.bioink.material ?? null}
        learn={{ material: state.bioink.material, application: state.model.brief?.tissue ?? state.control.tissueType, nozzle_mm: (state.slice.nozzleDiameterUm ?? 410) / 1000, flowFactor: state.slice.extrusionMultiplier ?? 1, infillPattern: state.slice.infillPatternId ?? undefined, wallCount: state.slice.walls ?? undefined, syringe_mL: syringe.volume_mL }}
        onSaved={() => pushLog("info", "📝 Análise registrada — a Fase 3 vai aplicar os ajustes no próximo G-code.")}
      />
    </div>
  )
}

const inp = "rounded-md bg-black/30 border border-white/10 focus:border-emerald-400/50 px-2 py-1 text-sm w-full disabled:opacity-50"

function Panel({ title, icon, subtitle, children }: { title: string; icon?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold flex items-center gap-2 text-gray-100">{icon}{title}</h3>{subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}</header>
      {children}
    </section>
  )
}
function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return <div><div className="text-[11px] text-gray-400 mb-0.5" title={tip}>{label}</div>{children}</div>
}
function JogBtn({ onClick, disabled, children, title, wide }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; title?: string; wide?: boolean }) {
  return <button onClick={onClick} disabled={disabled} title={title} className={cn("rounded-lg border border-white/10 hover:border-emerald-400/40 disabled:opacity-40 flex items-center justify-center text-xs", wide ? "flex-1 py-1.5" : "w-10 h-10")}>{children}</button>
}
function Stat({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-1">{icon}{label}</div>
      <div className="text-base font-semibold text-gray-100">{value}</div>
      {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
    </div>
  )
}
function Slider({ label, value, min, max, onChange, onCommit, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; onCommit: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] text-gray-400"><span>{label}</span><span className="font-mono text-gray-200">{value} %</span></div>
      <input type="range" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(+e.target.value)} onMouseUp={() => onCommit(value)} onTouchEnd={() => onCommit(value)} onKeyUp={() => onCommit(value)} className="w-full accent-emerald-400" />
    </div>
  )
}
function StatePill({ s }: { s: HostState }) {
  const map: Record<HostState, string> = {
    disconnected: "bg-gray-600/40 text-gray-300", connected: "bg-emerald-500/20 text-emerald-200", printing: "bg-cyan-500/20 text-cyan-100 animate-pulse",
    pausing: "bg-amber-500/20 text-amber-100", paused: "bg-amber-500/20 text-amber-100", resuming: "bg-cyan-500/20 text-cyan-100", cancelling: "bg-red-500/20 text-red-100",
    finished: "bg-emerald-500/30 text-emerald-100", error: "bg-red-600/30 text-red-100",
  }
  return <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium", map[s])}>{s}</span>
}
function fmtTime(s: number): string {
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60), r = s % 60
  if (m < 60) return `${m} min ${r} s`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}
