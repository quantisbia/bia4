"use client"

/**
 * R36 · Etapa "Imprimir" do módulo básico.
 *  • Conexão USB (Web Serial / Marlin) reaproveitando PrinterConnection + PrinterController da Fase 4
 *  • Modo simulador (mock) para treinar sem impressora
 *  • Joystick XY + Z com passos 0,1 / 1 / 10 mm, botão ZERAR (G92 X0 Y0 Z0) e "ir ao zero"
 *  • Ajustes em tempo real: fluxo (M221), velocidade (M220), altura do cabeçote (baby-step Z)
 *  • Extrusão manual / válvula on-off conforme o modo do cabeçote
 *  • Stream do G-code com progresso, pausa, retomar, cancelar e PARADA DE EMERGÊNCIA (M112)
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Usb, Unplug, Play, Pause, Square, OctagonX, Home, Crosshair, LocateFixed, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ChevronUp, ChevronDown, Gauge, Droplets, MoveVertical, Syringe, Power, Terminal, FlaskConical, CheckCircle2, AlertTriangle, Beaker,
} from "lucide-react"
import type { BasicState, Head } from "@/lib/print-basic/engine"
import { PrinterConnection, handshakeM115, type PrinterTransport, type FirmwareInfo } from "@/lib/bioprint/printer-connection"
import { PrinterMock } from "@/lib/bioprint/printer-mock"
import { PrinterController, type ControllerState, type StreamProgress } from "@/lib/bioprint/printer-controller"
import { PrintLogger, type LogEntry } from "@/lib/bioprint/print-logger"

type Mode = "usb" | "mock"
type Pos = { x: number; y: number; z: number }

export function PrintStep({ state, gcode, hasGcode }: { state: BasicState; gcode: string | null; hasGcode: boolean }) {
  const loggerRef = useRef<PrintLogger>(new PrintLogger())
  const transportRef = useRef<PrinterTransport | null>(null)
  const ctrlRef = useRef<PrinterController | null>(null)

  const [mode, setMode] = useState<Mode>("usb")
  const [baud, setBaud] = useState(115200)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [firmware, setFirmware] = useState<FirmwareInfo | null>(null)
  const [ctrlState, setCtrlState] = useState<ControllerState>("idle")
  const [progress, setProgress] = useState<StreamProgress | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0, z: 0 })
  const [zeroed, setZeroed] = useState(false)
  const [step, setStep] = useState(1)
  const [flow, setFlow] = useState(100)
  const [speed, setSpeed] = useState(100)
  const [zBaby, setZBaby] = useState(0)
  const [curHead, setCurHead] = useState(1)
  const [supported, setSupported] = useState(true)
  const [extruding, setExtruding] = useState(false)
  const [showLog, setShowLog] = useState(false)

  useEffect(() => { setSupported(PrinterConnection.isSupported()); if (!PrinterConnection.isSupported()) setMode("mock") }, [])
  useEffect(() => loggerRef.current.subscribe((e) => setLog(e.slice(-120))), [])

  const head: Head = state.heads[curHead - 1] ?? state.heads[0]
  const streaming = ctrlState === "streaming" || ctrlState === "paused"
  const canJog = connected && !streaming && !busy

  const send = useCallback(async (cmd: string, wait = true) => {
    const c = ctrlRef.current; if (!c) return
    try { if (streaming) c.inject(cmd, "basic"); else if (wait) await c.sendAndWait(cmd, 15000); else await c.sendOnce(cmd) }
    catch (e) { loggerRef.current.warn(e instanceof Error ? e.message : String(e), "basic") }
  }, [streaming])

  const connect = useCallback(async () => {
    setErr(null); setBusy(true)
    try {
      let t: PrinterTransport
      if (mode === "mock") { t = new PrinterMock({ latencyMs: 20 }); await t.connect() }
      else {
        if (!supported) throw new Error("Web Serial não suportado — use Chrome, Edge ou Brave no desktop (HTTPS).")
        const real = new PrinterConnection({ baudRate: baud })
        await real.requestAndOpen()
        t = real
      }
      transportRef.current = t
      const ctrl = new PrinterController(t, loggerRef.current, { onState: setCtrlState, onProgress: setProgress }, { okTimeoutMs: 30000, maxRetries: 2 })
      ctrlRef.current = ctrl
      setConnected(true)
      try { const fw = await handshakeM115(t, 4000); setFirmware(fw); loggerRef.current.ok(`Firmware: ${fw.name ?? fw.family}`, "basic") }
      catch { setFirmware({ raw: "", family: "unknown", caps: {} }); loggerRef.current.warn("Sem resposta ao M115 — continuando.", "basic") }
      await ctrl.sendAndWait("G21", 5000).catch(() => {})
      await ctrl.sendAndWait("G90", 5000).catch(() => {})
      await ctrl.sendAndWait("M83", 5000).catch(() => {})
      await ctrl.sendAndWait("M18 S0", 5000).catch(() => {})
      await ctrl.sendAndWait(`M221 S${flow}`, 5000).catch(() => {})
      await ctrl.sendAndWait(`M220 S${speed}`, 5000).catch(() => {})
      loggerRef.current.ok("Conectado. Mova o cabeçote até o centro da superfície, encoste a agulha e clique ZERAR.", "basic")
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e)
      setErr(m.includes("No port selected") ? "Nenhuma porta selecionada. Verifique o cabo USB e o driver (CH340/CP210x)." : m)
      transportRef.current = null; ctrlRef.current = null; setConnected(false)
    } finally { setBusy(false) }
  }, [mode, baud, supported, flow, speed])

  const disconnect = useCallback(async () => {
    try { ctrlRef.current?.destroy(); await transportRef.current?.disconnect() } catch { /* noop */ }
    ctrlRef.current = null; transportRef.current = null
    setConnected(false); setCtrlState("idle"); setProgress(null); setZeroed(false); setExtruding(false)
    loggerRef.current.info("Desconectado.", "basic")
  }, [])

  const jog = useCallback(async (dx: number, dy: number, dz: number) => {
    if (!canJog) return
    const f = dz ? 600 : 3000
    await send("G91", true); await send(`G1 ${dx ? `X${dx}` : ""}${dy ? ` Y${dy}` : ""}${dz ? ` Z${dz}` : ""} F${f}`.replace(/\s+/g, " "), true); await send("G90", true)
    setPos((p) => ({ x: +(p.x + dx).toFixed(2), y: +(p.y + dy).toFixed(2), z: +(p.z + dz).toFixed(2) }))
  }, [canJog, send])

  const zero = useCallback(async () => {
    if (!canJog) return
    await send("G92 X0 Y0 Z0", true)
    setPos({ x: 0, y: 0, z: 0 }); setZeroed(true)
    loggerRef.current.ok("✓ Zero definido na agulha (G92 X0 Y0 Z0). Pronto para imprimir.", "basic")
  }, [canJog, send])
  const goZero = useCallback(async () => { if (!canJog) return; await send("G1 Z5 F600"); await send("G1 X0 Y0 F3000"); await send("G1 Z0 F600"); setPos({ x: 0, y: 0, z: 0 }) }, [canJog, send])
  const home = useCallback(async () => { if (!canJog) return; await send("G28", true); setZeroed(false); setPos({ x: 0, y: 0, z: 0 }) }, [canJog, send])

  const applyFlow = useCallback(async (v: number) => { setFlow(v); await send(`M221 S${v}`, false) }, [send])
  const applySpeed = useCallback(async (v: number) => { setSpeed(v); await send(`M220 S${v}`, false) }, [send])
  const babyZ = useCallback(async (d: number) => {
    const nv = +(zBaby + d).toFixed(2); setZBaby(nv)
    // M290 (baby-step) se o firmware suportar; fallback: movimento relativo em Z durante idle
    if (streaming) await send(`M290 Z${d}`, false)
    else { await send("G91"); await send(`G1 Z${d} F300`); await send("G90"); setPos((p) => ({ ...p, z: +(p.z + d).toFixed(2) })) }
  }, [zBaby, streaming, send])

  const extrude = useCallback(async (sign: 1 | -1) => {
    if (!connected || busy) return
    await send(`T${head.id - 1}`, true)
    if (head.extrusionMode === "pneumatic") { const on = sign > 0; setExtruding(on); await send(on ? head.onCmd : head.offCmd, true); return }
    const e = head.extrusionMode === "volumetric" ? 5 : 2 // 5 mm³ ou 2 mm de filamento
    await send("M83", true); await send(`G1 E${sign * e} F${head.extrusionMode === "volumetric" ? 120 : 180}`, true)
  }, [connected, busy, head, send])

  const start = useCallback(async () => {
    if (!gcode || !ctrlRef.current) return
    if (!zeroed && state.printer.origin === "needle" && !confirm("Você ainda não clicou em ZERAR. A impressão vai começar onde a agulha está agora. Continuar?")) return
    setErr(null)
    try { await ctrlRef.current.start(gcode) } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
  }, [gcode, zeroed, state.printer.origin])
  const emergency = useCallback(async () => { try { await ctrlRef.current?.emergency() } catch { /* noop */ } setCtrlState("error"); loggerRef.current.error("PARADA DE EMERGÊNCIA (M112) enviada.", "basic") }, [])

  const stateLabel: Record<ControllerState, string> = { idle: "Ocioso", connecting: "Conectando…", ready: "Pronto", streaming: "Imprimindo", paused: "Pausado", aborting: "Cancelando…", completed: "Concluído", error: "Erro / parado" }
  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4"

  return (
    <div className="space-y-4" data-testid="pb-print">
      <div><h2 className="text-xl font-bold">7 · Imprimir</h2><p className="text-sm text-gray-400">Conecte a bioimpressora, leve a agulha ao centro da superfície encostando no substrato, clique <b className="text-gray-200">ZERAR</b> e inicie. Fluxo, velocidade e altura podem ser ajustados durante a impressão.</p></div>

      {/* ── conexão ── */}
      <div className={card + " flex flex-wrap items-center gap-3"}>
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          <button data-testid="pb-mode-usb" onClick={() => setMode("usb")} disabled={connected || !supported} className={`px-3 py-2 text-xs flex items-center gap-1.5 ${mode === "usb" ? "bg-violet-500/25 text-white" : "text-gray-400"} disabled:opacity-40`}><Usb className="w-3.5 h-3.5" /> USB (Web Serial)</button>
          <button data-testid="pb-mode-mock" onClick={() => setMode("mock")} disabled={connected} className={`px-3 py-2 text-xs flex items-center gap-1.5 ${mode === "mock" ? "bg-violet-500/25 text-white" : "text-gray-400"} disabled:opacity-40`}><Beaker className="w-3.5 h-3.5" /> Simulador</button>
        </div>
        {mode === "usb" && !connected && <select value={baud} onChange={(e) => setBaud(+e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200">{[115200, 250000, 57600, 9600].map((b) => <option key={b} value={b}>{b} baud</option>)}</select>}
        {!connected
          ? <button data-testid="pb-connect" onClick={connect} disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Usb className="w-4 h-4" />{busy ? "Conectando…" : "Conectar"}</button>
          : <button data-testid="pb-disconnect" onClick={disconnect} disabled={streaming} className="px-4 py-2 rounded-xl border border-white/15 hover:border-red-400/50 text-sm flex items-center gap-2 disabled:opacity-40"><Unplug className="w-4 h-4" /> Desconectar</button>}
        <div className="flex items-center gap-2 text-xs ml-auto">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? (streaming ? "bg-cyan-400 animate-pulse" : "bg-emerald-400") : "bg-gray-600"}`} />
          <span className="text-gray-300">{connected ? stateLabel[ctrlState] : "Desconectado"}</span>
          {firmware && connected && <span className="text-gray-500 hidden sm:inline">· {firmware.name ?? firmware.family}</span>}
          {zeroed && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> zerado</span>}
        </div>
        {!supported && <p className="w-full text-[11px] text-amber-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Este navegador não tem Web Serial — use Chrome/Edge/Brave no desktop. O simulador está disponível.</p>}
        {err && <p className="w-full text-[11px] text-red-300">{err}</p>}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
        {/* ── joystick ── */}
        <div className={card + " space-y-3"} data-testid="pb-joystick">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold flex items-center gap-2"><Crosshair className="w-4 h-4 text-violet-300" /> Joystick</h3>
            <div className="flex gap-1">{[0.1, 1, 10].map((s) => <button key={s} data-testid={`pb-step-${s}`} onClick={() => setStep(s)} className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${step === s ? "bg-violet-500 border-violet-400 text-white" : "border-white/10 text-gray-400"}`}>{s} mm</button>)}</div></div>
          <div className="flex items-center justify-center gap-4">
            {/* XY pad */}
            <div className="relative w-40 h-40 rounded-full bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 shadow-inner">
              <JogBtn className="top-1 left-1/2 -translate-x-1/2" onClick={() => jog(0, step, 0)} disabled={!canJog} label="Y+"><ArrowUp className="w-5 h-5" /></JogBtn>
              <JogBtn className="bottom-1 left-1/2 -translate-x-1/2" onClick={() => jog(0, -step, 0)} disabled={!canJog} label="Y−"><ArrowDown className="w-5 h-5" /></JogBtn>
              <JogBtn className="left-1 top-1/2 -translate-y-1/2" onClick={() => jog(-step, 0, 0)} disabled={!canJog} label="X−"><ArrowLeft className="w-5 h-5" /></JogBtn>
              <JogBtn className="right-1 top-1/2 -translate-y-1/2" onClick={() => jog(step, 0, 0)} disabled={!canJog} label="X+"><ArrowRight className="w-5 h-5" /></JogBtn>
              <button data-testid="pb-zero" onClick={zero} disabled={!canJog} title="Definir zero aqui (G92 X0 Y0 Z0)" className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white text-[11px] font-bold tracking-wider shadow-lg shadow-fuchsia-500/30 hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100 flex flex-col items-center justify-center gap-0.5"><LocateFixed className="w-4 h-4" />ZERAR</button>
            </div>
            {/* Z column */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Z</span>
              <button onClick={() => jog(0, 0, step)} disabled={!canJog} className="w-12 h-12 rounded-xl bg-white/[0.06] hover:bg-violet-500/30 border border-white/10 flex items-center justify-center disabled:opacity-30" title="Z+ (sobe)"><ChevronUp className="w-5 h-5" /></button>
              <div className="text-xs font-mono text-gray-300 tabular-nums">{pos.z.toFixed(2)}</div>
              <button onClick={() => jog(0, 0, -step)} disabled={!canJog} className="w-12 h-12 rounded-xl bg-white/[0.06] hover:bg-violet-500/30 border border-white/10 flex items-center justify-center disabled:opacity-30" title="Z− (desce)"><ChevronDown className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
            {(["x", "y", "z"] as const).map((k) => <div key={k} className="rounded-lg bg-black/30 border border-white/5 py-1.5"><div className="text-[9px] uppercase text-gray-500">{k}</div><div className="text-gray-200 tabular-nums">{pos[k].toFixed(2)}</div></div>)}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button data-testid="pb-go-zero" onClick={goZero} disabled={!canJog} className="px-2 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/40 text-xs flex items-center justify-center gap-1.5 disabled:opacity-30"><Crosshair className="w-3.5 h-3.5" /> Ir ao zero</button>
            <button onClick={home} disabled={!canJog} className="px-2 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/40 text-xs flex items-center justify-center gap-1.5 disabled:opacity-30"><Home className="w-3.5 h-3.5" /> Home (G28)</button>
          </div>
          <p className="text-[11px] text-gray-500">Mesa de referência: {state.printer.origin === "needle" ? "ponto zero na agulha — o G-code começa em (0,0,0) onde você zerar." : "coordenadas absolutas da mesa (G28 no início)."}</p>
        </div>

        {/* ── ajustes em tempo real + extrusão + stream ── */}
        <div className="space-y-4">
          <div className={card + " space-y-4"} data-testid="pb-live">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Gauge className="w-4 h-4 text-cyan-300" /> Ajustes em tempo real <span className="text-[10px] text-gray-500 font-normal">(valem durante a impressão)</span></h3>
            <LiveSlider icon={Droplets} label="Fluxo da biotinta" unit="%" value={flow} min={20} max={300} step={5} onChange={applyFlow} disabled={!connected} testId="pb-flow" marks={[50, 100, 150, 200]} hint="M221 — multiplica a extrusão (E). Suba se o filete falhar, desça se escorrer." />
            <LiveSlider icon={Gauge} label="Velocidade" unit="%" value={speed} min={10} max={200} step={5} onChange={applySpeed} disabled={!connected} testId="pb-speed" marks={[25, 50, 100, 150]} hint="M220 — multiplica todas as velocidades F. Reduza para depositar com mais precisão." />
            <div>
              <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-gray-300 flex items-center gap-1.5"><MoveVertical className="w-3.5 h-3.5 text-violet-300" /> Altura do cabeçote (ajuste fino Z)</span><span className="font-mono text-xs text-gray-200">{zBaby >= 0 ? "+" : ""}{zBaby.toFixed(2)} mm</span></div>
              <div className="grid grid-cols-4 gap-1.5">
                {[-0.1, -0.02, 0.02, 0.1].map((d) => <button key={d} data-testid={`pb-babyz-${d}`} onClick={() => babyZ(d)} disabled={!connected} className={`py-2 rounded-lg border text-xs font-semibold disabled:opacity-30 ${d < 0 ? "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"}`}>{d < 0 ? "▼" : "▲"} {Math.abs(d)}</button>)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">▼ aproxima a agulha do substrato · ▲ afasta. Durante a impressão usa M290 (baby-step).</p>
            </div>
          </div>

          <div className={card + " space-y-3"} data-testid="pb-extrude">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Syringe className="w-4 h-4 text-fuchsia-300" /> Extrusão manual</h3>
              <div className="flex gap-1">{state.heads.filter((h) => h.enabled).map((h) => <button key={h.id} onClick={() => setCurHead(h.id)} className={`px-2 py-1 rounded-md text-[11px] border flex items-center gap-1 ${curHead === h.id ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-gray-400"}`}><span className="w-2 h-2 rounded-full" style={{ background: h.color }} />T{h.id - 1}</button>)}</div>
            </div>
            {head.extrusionMode === "pneumatic" ? (
              <div className="flex gap-2">
                <button onClick={() => extrude(1)} disabled={!connected || busy} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border ${extruding ? "bg-emerald-500/30 border-emerald-400 text-white" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"} disabled:opacity-30`}><Power className="w-4 h-4" /> Ligar válvula ({head.onCmd})</button>
                <button onClick={() => extrude(-1)} disabled={!connected || busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 text-red-200 disabled:opacity-30"><Power className="w-4 h-4" /> Desligar ({head.offCmd})</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => extrude(1)} disabled={!connected || busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 disabled:opacity-30"><Syringe className="w-4 h-4" /> Extrudar {head.extrusionMode === "volumetric" ? "5 mm³" : "2 mm"}</button>
                <button onClick={() => extrude(-1)} disabled={!connected || busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-amber-500/30 bg-amber-500/10 text-amber-200 disabled:opacity-30"><Syringe className="w-4 h-4 rotate-180" /> Retrair</button>
              </div>
            )}
            <p className="text-[11px] text-gray-500">Cabeçote T{head.id - 1} · {head.label} · modo {head.extrusionMode === "pneumatic" ? "pneumático" : head.extrusionMode === "volumetric" ? "mecânico/volumétrico" : "filamento"}. Use para escorvar a agulha antes de zerar.</p>
          </div>

          <div className={card + " space-y-3"} data-testid="pb-stream">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 mr-auto"><FlaskConical className="w-4 h-4 text-emerald-300" /> Impressão</h3>
              {!streaming
                ? <button data-testid="pb-start" onClick={start} disabled={!connected || !hasGcode || busy} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"><Play className="w-4 h-4" /> Iniciar impressão</button>
                : ctrlState === "paused"
                  ? <button onClick={() => ctrlRef.current?.resume()} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2"><Play className="w-4 h-4" /> Retomar</button>
                  : <button onClick={() => ctrlRef.current?.pause()} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold flex items-center gap-2"><Pause className="w-4 h-4" /> Pausar</button>}
              {streaming && <button onClick={() => ctrlRef.current?.cancel()} className="px-3 py-2.5 rounded-xl border border-white/15 text-sm flex items-center gap-2"><Square className="w-4 h-4" /> Cancelar</button>}
              <button data-testid="pb-emergency" onClick={emergency} disabled={!connected} className="px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-30"><OctagonX className="w-4 h-4" /> PARAR</button>
            </div>
            {!hasGcode && <p className="text-xs text-amber-300">Gere o G-code na etapa anterior antes de imprimir.</p>}
            {progress && (
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1"><span>Linha {progress.current}/{progress.total} · camada {progress.currentLayer}</span><span>{progress.percent.toFixed(0)}%{progress.remainingMsEst != null && ` · ~${Math.ceil(progress.remainingMsEst / 60000)} min restantes`}</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${progress.percent}%` }} /></div>
              </div>
            )}
            <button onClick={() => setShowLog((v) => !v)} className="text-[11px] text-gray-400 flex items-center gap-1.5 hover:text-gray-200"><Terminal className="w-3.5 h-3.5" /> {showLog ? "Ocultar" : "Mostrar"} console ({log.length})</button>
            {showLog && <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 border border-white/5 p-2 text-[10.5px] font-mono leading-relaxed">{log.map((e) => <div key={e.seq} className={e.severity === "error" ? "text-red-300" : e.severity === "warn" ? "text-amber-300" : e.severity === "ok" ? "text-emerald-300" : e.severity === "tx" ? "text-cyan-200" : "text-gray-400"}>{e.severity === "tx" ? "→ " : e.severity === "rx" || e.severity === "ok" ? "← " : "· "}{e.text}</div>)}</pre>}
          </div>
        </div>
      </div>
    </div>
  )
}

function JogBtn({ className, onClick, disabled, label, children }: { className: string; onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return <button onClick={onClick} disabled={disabled} title={label} aria-label={label} className={`absolute ${className} w-12 h-12 rounded-full bg-white/[0.06] hover:bg-violet-500/40 active:scale-95 border border-white/10 flex items-center justify-center text-gray-100 transition disabled:opacity-30 disabled:hover:bg-white/[0.06]`}>{children}</button>
}

function LiveSlider({ icon: Icon, label, unit, value, min, max, step, onChange, disabled, testId, marks, hint }: { icon: typeof Gauge; label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; disabled: boolean; testId: string; marks: number[]; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-gray-300 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-cyan-300" /> {label}</span><span className="font-mono text-sm text-white tabular-nums">{value}{unit}</span></div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - step))} disabled={disabled} className="w-8 h-8 rounded-lg border border-white/10 hover:bg-white/10 text-sm disabled:opacity-30">−</button>
        <input data-testid={testId} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(+e.target.value)} className="flex-1 accent-cyan-400 disabled:opacity-30" />
        <button onClick={() => onChange(Math.min(max, value + step))} disabled={disabled} className="w-8 h-8 rounded-lg border border-white/10 hover:bg-white/10 text-sm disabled:opacity-30">+</button>
      </div>
      <div className="flex gap-1 mt-1.5">{marks.map((m) => <button key={m} onClick={() => onChange(m)} disabled={disabled} className={`px-2 py-0.5 rounded-md text-[10px] border ${value === m ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-100" : "border-white/10 text-gray-400"} disabled:opacity-30`}>{m}{unit}</button>)}</div>
      <p className="text-[11px] text-gray-500 mt-1">{hint}</p>
    </div>
  )
}
