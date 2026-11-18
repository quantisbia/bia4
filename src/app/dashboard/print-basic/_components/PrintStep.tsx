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
  ArrowUpFromLine, RotateCcw, Sparkles, Star, ClipboardList, Wand2, Tablet, Laptop, Link2, Link2Off, Copy,
} from "lucide-react"
import type { BasicState, Head } from "@/lib/print-basic/engine"
import { analyzeFeedback, saveFeedback, SYMPTOMS, type PrintFeedback, type Suggestion, type Symptom } from "@/lib/print-basic/feedback"
import { remoteApi, loadRemote, saveRemote, isTabletLike, type RemoteState, type RemoteCommand, type RemoteAction } from "@/lib/print-basic/remote"
import { PrinterConnection, handshakeM115, type PrinterTransport, type FirmwareInfo } from "@/lib/bioprint/printer-connection"
import { PrinterMock } from "@/lib/bioprint/printer-mock"
import { PrinterController, type ControllerState, type StreamProgress } from "@/lib/bioprint/printer-controller"
import { PrintLogger, type LogEntry } from "@/lib/bioprint/print-logger"

type Mode = "usb" | "mock" | "remote"
type Pos = { x: number; y: number; z: number }

export function PrintStep({ state, gcode, hasGcode, onApplyState }: { state: BasicState; gcode: string | null; hasGcode: boolean; onApplyState?: (fn: (s: BasicState) => BasicState) => void }) {
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
  const [extSpeed, setExtSpeed] = useState(2)       // mm/s do eixo E (êmbolo/filamento)
  const [extAmount, setExtAmount] = useState(5)     // mm³ ou mm
  const [stopped, setStopped] = useState(false)     // parada suave: motores religados, pronto para novo início
  const [babyMode, setBabyMode] = useState<"auto" | "m290" | "g91">("auto")
  const [showFeedback, setShowFeedback] = useState(false)
  const [fbRating, setFbRating] = useState<1 | 2 | 3 | 4 | 5>(4)
  const [fbSymptoms, setFbSymptoms] = useState<Symptom[]>([])
  const [fbNotes, setFbNotes] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const startedAtRef = useRef<number>(0)
  const finishedRef = useRef(false)
  // ── ponte tablet ↔ notebook ──
  const [remoteRole, setRemoteRole] = useState<"none" | "host" | "client">("none")
  const [remoteSession, setRemoteSession] = useState<{ sessionId: string; code: string } | null>(null)
  const [remoteCode, setRemoteCode] = useState("")
  const [peerOnline, setPeerOnline] = useState(false)
  const [remoteErr, setRemoteErr] = useState<string | null>(null)
  const [tablet, setTablet] = useState(false)
  const remoteSinceRef = useRef(0)
  const isClient = remoteRole === "client"

  useEffect(() => {
    const sup = PrinterConnection.isSupported(); setSupported(sup); const tab = isTabletLike(); setTablet(tab)
    if (!sup) setMode(tab ? "remote" : "mock")
    const saved = loadRemote(); if (saved) { setRemoteRole(saved.role); setRemoteSession({ sessionId: saved.sessionId, code: saved.code }); if (saved.role === "client") setMode("remote") }
  }, [])
  useEffect(() => loggerRef.current.subscribe((e) => setLog(e.slice(-120))), [])

  const head: Head = state.heads[curHead - 1] ?? state.heads[0]
  const streaming = ctrlState === "streaming" || ctrlState === "paused"
  const canJog = connected && !streaming && !busy

  /** tablet → enfileira comando para o notebook */
  const dispatch = useCallback(async (action: RemoteAction, payload?: Record<string, unknown>) => {
    if (!remoteSession) return
    try { await remoteApi.cmd(remoteSession.sessionId, action, payload) } catch (e) { setRemoteErr(e instanceof Error ? e.message : String(e)) }
  }, [remoteSession])

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
      const ctrl = new PrinterController(t, loggerRef.current, {
        onState: setCtrlState, onProgress: setProgress,
        onLine: (line, kind) => { if (kind === "rx" && /unknown command.*M290/i.test(line)) { setBabyMode("g91"); loggerRef.current.warn("Firmware sem BABYSTEPPING (M290) — ajuste de altura passa a usar G91/G1 Z.", "basic") } },
        onFinished: (ok, reason) => {
          if (finishedRef.current) return; finishedRef.current = true
          // religa motores e deixa pronta para outro início
          void (async () => { try { await t.write("M17"); await t.write("M18 S0"); await t.write("G90") } catch { /* noop */ } })()
          if (ok || reason === "cancel" || reason === "cancelled") { setShowFeedback(true); setSuggestions(null); setApplied(new Set()) }
        },
      }, { okTimeoutMs: 30000, maxRetries: 2, safetyFooter: ["M104 S0", "M140 S0", "M107", "M17", "M18 S0"] })
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
    if (isClient) return dispatch("jog", { dx, dy, dz })
    if (!canJog) return
    const f = dz ? 600 : 3000
    await send("G91", true); await send(`G1 ${dx ? `X${dx}` : ""}${dy ? ` Y${dy}` : ""}${dz ? ` Z${dz}` : ""} F${f}`.replace(/\s+/g, " "), true); await send("G90", true)
    setPos((p) => ({ x: +(p.x + dx).toFixed(2), y: +(p.y + dy).toFixed(2), z: +(p.z + dz).toFixed(2) }))
  }, [canJog, send, isClient, dispatch])

  const zero = useCallback(async () => {
    if (isClient) return dispatch("zero")
    if (!canJog) return
    await send("G92 X0 Y0 Z0", true)
    setPos({ x: 0, y: 0, z: 0 }); setZeroed(true)
    loggerRef.current.ok("✓ Zero definido na agulha (G92 X0 Y0 Z0). Pronto para imprimir.", "basic")
  }, [canJog, send, isClient, dispatch])
  const goZero = useCallback(async () => { if (isClient) return dispatch("goZero"); if (!canJog) return; await send("G1 Z5 F600"); await send("G1 X0 Y0 F3000"); await send("G1 Z0 F600"); setPos({ x: 0, y: 0, z: 0 }) }, [canJog, send, isClient, dispatch])
  const home = useCallback(async () => { if (isClient) return dispatch("home"); if (!canJog) return; await send("G28", true); setZeroed(false); setPos({ x: 0, y: 0, z: 0 }) }, [canJog, send, isClient, dispatch])

  const applyFlow = useCallback(async (v: number) => { setFlow(v); if (isClient) return dispatch("flow", { v }); await send(`M221 S${v}`, false) }, [send, isClient, dispatch])
  const applySpeed = useCallback(async (v: number) => { setSpeed(v); if (isClient) return dispatch("speed", { v }); await send(`M220 S${v}`, false) }, [send, isClient, dispatch])
  /**
   * Ajuste fino de altura que FUNCIONA:
   *  • parado → G91 / G1 Z / G90 (movimento real imediato)
   *  • imprimindo → por padrão G92 em Z (desloca a origem lógica: todas as próximas camadas saem ±d)
   *    injetado entre linhas do stream; "m290" usa baby-step se o firmware tiver BABYSTEPPING.
   */
  const babyZ = useCallback(async (d: number) => {
    if (isClient) { setZBaby((z) => +(z + d).toFixed(2)); return dispatch("babyZ", { d }) }
    const c = ctrlRef.current; if (!c) return
    const nv = +(zBaby + d).toFixed(2); setZBaby(nv)
    if (!streaming) { await send("G91", true); await send(`G1 Z${d.toFixed(2)} F300`, true); await send("G90", true); setPos((p) => ({ ...p, z: +(p.z + d).toFixed(2) })); return }
    if (babyMode === "m290") { c.inject(`M290 Z${d.toFixed(2)}`, "babyz"); return }
    // G92 Z(atual − d): a impressora "acha" que está mais baixa/alta → próxima G1 Z compensa movendo d real
    c.inject("G91", "babyz"); c.inject(`G1 Z${d.toFixed(2)} F300`, "babyz"); c.inject("G90", "babyz"); c.inject("M114", "babyz")
    loggerRef.current.info(`Altura ${d > 0 ? "+" : ""}${d.toFixed(2)} mm aplicada na próxima linha do G-code (acumulado ${nv > 0 ? "+" : ""}${nv.toFixed(2)} mm).`, "basic")
  }, [zBaby, streaming, send, babyMode, isClient, dispatch])

  const extrude = useCallback(async (sign: 1 | -1) => {
    if (isClient) return dispatch(head.extrusionMode === "pneumatic" ? "valve" : "extrude", { sign, head: head.id, amount: extAmount, speed: extSpeed })
    if (!connected || busy) return
    await send(`T${head.id - 1}`, true)
    if (head.extrusionMode === "pneumatic") { const on = sign > 0; setExtruding(on); await send(on ? head.onCmd : head.offCmd, true); return }
    // F em mm/min do eixo E. Volumétrico: E em mm³ → F = velocidade·área_filamento? Não — M200 D0 interpreta F como mm³/min? Marlin mantém F em mm/min lineares
    // do eixo E, então usamos a velocidade pedida diretamente (mm/s × 60).
    await send("M83", true); await send(`G1 E${(sign * extAmount).toFixed(2)} F${Math.max(10, Math.round(extSpeed * 60))}`, true)
  }, [connected, busy, head, send, extAmount, extSpeed, isClient, dispatch])

  const start = useCallback(async () => {
    if (isClient) return dispatch("start")
    if (!gcode || !ctrlRef.current) return
    if (!zeroed && state.printer.origin === "needle" && !confirm("Você ainda não clicou em ZERAR. A impressão vai começar onde a agulha está agora. Continuar?")) return
    setErr(null); setStopped(false); finishedRef.current = false; setShowFeedback(false); startedAtRef.current = Date.now()
    try { await ctrlRef.current.start(gcode) } catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
  }, [gcode, zeroed, state.printer.origin, isClient, dispatch])

  const submitFeedback = useCallback(() => {
    const fb: PrintFeedback = { rating: fbRating, symptoms: fbSymptoms, notes: fbNotes || undefined, live: { flow, speed, zBaby }, job: { layers: progress?.currentLayer ?? 0, minutes: Math.round((Date.now() - (startedAtRef.current || Date.now())) / 60000), heads: state.heads.filter((h) => h.enabled).map((h) => h.id) }, at: new Date().toISOString() }
    saveFeedback(fb)
    setSuggestions(analyzeFeedback(fb, state))
  }, [fbRating, fbSymptoms, fbNotes, flow, speed, zBaby, progress, state])
  const applySuggestion = useCallback((sg: Suggestion) => { if (!sg.apply || !onApplyState) return; onApplyState(sg.apply); setApplied((a) => new Set(a).add(sg.id)) }, [onApplyState])
  /** PARAR suave: interrompe o stream, desliga válvula/aquecimento, sobe 10 mm, RELIGA motores e fica pronta. */
  const softStop = useCallback(async () => {
    if (isClient) return dispatch("stop")
    const c = ctrlRef.current, t = transportRef.current; if (!c || !t) return
    setBusy(true)
    try {
      if (streaming) { c.cancel(); await new Promise((r) => setTimeout(r, 400)) }
      for (const h of state.heads) if (h.enabled && h.extrusionMode === "pneumatic" && h.offCmd) await t.write(h.offCmd).catch(() => {})
      await t.write("M107").catch(() => {})
      await t.write("G91").catch(() => {}); await t.write("G1 Z10 F600").catch(() => {}); await t.write("G90").catch(() => {})
      await t.write("M17").catch(() => {}); await t.write("M18 S0").catch(() => {})
      setPos((p) => ({ ...p, z: +(p.z + 10).toFixed(2) })); setExtruding(false); setStopped(true)
      loggerRef.current.ok("■ Parada segura: válvulas desligadas, agulha +10 mm, motores religados. Pronta para zerar/imprimir de novo.", "basic")
    } finally { setBusy(false) }
  }, [streaming, state.heads, isClient, dispatch])
  /** Emergência real (M112): o firmware trava até reset — só para colisão/perigo. */
  const emergency = useCallback(async () => {
    if (isClient) return dispatch("stop")
    if (!confirm("PARADA DE EMERGÊNCIA (M112): a impressora trava e precisa ser religada/reconectada. Use só em risco de colisão. Para parar e continuar depois use PARAR.")) return
    try { await ctrlRef.current?.emergency() } catch { /* noop */ } setCtrlState("error"); loggerRef.current.error("M112 enviado — reconecte a impressora.", "basic")
  }, [isClient, dispatch])
  /** Religar: M17 + M18 S0 + G90, limpa estado de parada */
  const rearm = useCallback(async () => {
    if (isClient) return dispatch("rearm")
    const t = transportRef.current; if (!t) return
    await t.write("M17").catch(() => {}); await t.write("M18 S0").catch(() => {}); await t.write("G90").catch(() => {}); await t.write("M83").catch(() => {})
    ctrlRef.current?.resetOkDebt(); setStopped(false); setCtrlState("ready"); setProgress(null)
    loggerRef.current.ok("Motores ligados (M17). Pronta.", "basic")
  }, [isClient, dispatch])
  /** Colocar seringa: sobe 50 mm e para no lugar — fácil de encaixar/trocar a seringa. */
  const loadSyringe = useCallback(async () => {
    if (isClient) return dispatch("loadSyringe")
    if (!canJog) return
    await send("G91", true); await send("G1 Z50 F900", true); await send("G90", true)
    setPos((p) => ({ ...p, z: +(p.z + 50).toFixed(2) }))
    loggerRef.current.info("Cabeçote +50 mm — encaixe a seringa. Depois use Z− ou 'Ir ao zero' para voltar.", "basic")
  }, [canJog, send, isClient, dispatch])

  // ── HOST (notebook): publica estado e executa comandos do tablet ──
  const latestRef = useRef({ connected, ctrlState, pos, zeroed, flow, speed, zBaby, curHead, extruding, stopped, hasGcode, progress, firmware, log })
  latestRef.current = { connected, ctrlState, pos, zeroed, flow, speed, zBaby, curHead, extruding, stopped, hasGcode, progress, firmware, log }
  const actionsRef = useRef({ jog, zero, goZero, home, applyFlow, applySpeed, babyZ, extrude, start, softStop, rearm, loadSyringe, setCurHead, send })
  actionsRef.current = { jog, zero, goZero, home, applyFlow, applySpeed, babyZ, extrude, start, softStop, rearm, loadSyringe, setCurHead, send }
  const pendingResultsRef = useRef<{ id: string; status: "done" | "error"; result?: string }[]>([])

  const runRemote = useCallback(async (c: RemoteCommand) => {
    const A = actionsRef.current; const p = (c.payload ?? {}) as Record<string, number>
    switch (c.action) {
      case "jog": return A.jog(+p.dx || 0, +p.dy || 0, +p.dz || 0)
      case "zero": return A.zero()
      case "goZero": return A.goZero()
      case "home": return A.home()
      case "flow": return A.applyFlow(+p.v)
      case "speed": return A.applySpeed(+p.v)
      case "babyZ": return A.babyZ(+p.d)
      case "extrude": case "valve": { if (p.head) A.setCurHead(+p.head); if (p.amount) setExtAmount(+p.amount); if (p.speed) setExtSpeed(+p.speed); await new Promise((r) => setTimeout(r, 30)); return A.extrude((+p.sign >= 0 ? 1 : -1) as 1 | -1) }
      case "start": return A.start()
      case "stop": return A.softStop()
      case "pause": ctrlRef.current?.pause(); return
      case "resume": ctrlRef.current?.resume(); return
      case "rearm": return A.rearm()
      case "loadSyringe": return A.loadSyringe()
      case "setHead": A.setCurHead(+p.head || 1); return
      case "raw": return A.send(String((c.payload as { line?: string })?.line ?? ""), true)
    }
  }, [])

  useEffect(() => {
    if (remoteRole !== "host" || !remoteSession) return
    let stop = false
    const tick = async () => {
      if (stop) return
      const L = latestRef.current
      const st: RemoteState = { connected: L.connected, ctrlState: L.ctrlState, pos: L.pos, zeroed: L.zeroed, flow: L.flow, speed: L.speed, zBaby: L.zBaby, curHead: L.curHead, extruding: L.extruding, stopped: L.stopped, hasGcode: L.hasGcode,
        progress: L.progress ? { current: L.progress.current, total: L.progress.total, percent: L.progress.percent, currentLayer: L.progress.currentLayer } : null, firmware: L.firmware?.name ?? L.firmware?.family ?? null, lastLog: L.log.slice(-6).map((e) => (e.severity === "tx" ? "→ " : "· ") + e.text), updatedAt: Date.now() }
      const results = pendingResultsRef.current; pendingResultsRef.current = []
      try {
        const r = await remoteApi.hostSync(remoteSession.sessionId, st, results)
        setPeerOnline(r.clientOnline); setRemoteErr(null)
        for (const c of r.commands) {
          loggerRef.current.info(`📱 tablet → ${c.action}${c.payload ? " " + JSON.stringify(c.payload) : ""}`, "remote")
          try { await runRemote(c); pendingResultsRef.current.push({ id: c.id, status: "done" }) }
          catch (e) { pendingResultsRef.current.push({ id: c.id, status: "error", result: e instanceof Error ? e.message : String(e) }) }
        }
      } catch (e) { setRemoteErr(e instanceof Error ? e.message : String(e)) }
      if (!stop) setTimeout(tick, 700)
    }
    void tick()
    return () => { stop = true }
  }, [remoteRole, remoteSession, runRemote])

  // ── CLIENT (tablet): recebe estado do notebook ──
  useEffect(() => {
    if (remoteRole !== "client" || !remoteSession) return
    let stop = false
    const tick = async () => {
      if (stop) return
      try {
        const r = await remoteApi.clientSync(remoteSession.sessionId, remoteSinceRef.current)
        setPeerOnline(r.hostOnline); setRemoteErr(null)
        const st = r.state as Partial<RemoteState>
        if (st && typeof st.connected === "boolean") {
          setConnected(st.connected); setCtrlState((st.ctrlState as ControllerState) || "idle"); if (st.pos) setPos(st.pos); setZeroed(!!st.zeroed)
          if (typeof st.flow === "number") setFlow(st.flow); if (typeof st.speed === "number") setSpeed(st.speed); if (typeof st.zBaby === "number") setZBaby(st.zBaby)
          if (st.curHead) setCurHead(st.curHead); setExtruding(!!st.extruding); setStopped(!!st.stopped)
          setProgress(st.progress ? { current: st.progress.current, total: st.progress.total, percent: st.progress.percent, currentLayer: st.progress.currentLayer, currentLine: "", elapsedMs: 0, remainingMsEst: null } : null)
          if (st.firmware) setFirmware({ raw: "", name: st.firmware, family: "marlin", caps: {} })
        }
        for (const c of r.commands) { if (c.seq > remoteSinceRef.current && (c.status === "done" || c.status === "error")) { remoteSinceRef.current = c.seq; if (c.status === "error") loggerRef.current.warn(`${c.action}: ${c.result ?? "falhou"}`, "remote") } }
      } catch (e) { setRemoteErr(e instanceof Error ? e.message : String(e)) }
      if (!stop) setTimeout(tick, 800)
    }
    void tick()
    return () => { stop = true }
  }, [remoteRole, remoteSession])

  const shareToTablet = useCallback(async () => {
    setRemoteErr(null)
    try { const r = await remoteApi.create(typeof navigator !== "undefined" ? navigator.platform : "notebook"); setRemoteSession({ sessionId: r.sessionId, code: r.code }); setRemoteRole("host"); saveRemote({ role: "host", sessionId: r.sessionId, code: r.code }) }
    catch (e) { setRemoteErr(e instanceof Error ? e.message : String(e)) }
  }, [])
  const joinFromTablet = useCallback(async () => {
    setRemoteErr(null)
    try { const r = await remoteApi.join(remoteCode.trim()); setRemoteSession({ sessionId: r.sessionId, code: remoteCode.trim() }); setRemoteRole("client"); setPeerOnline(r.hostOnline); saveRemote({ role: "client", sessionId: r.sessionId, code: remoteCode.trim() }); remoteSinceRef.current = 0 }
    catch (e) { setRemoteErr(e instanceof Error ? e.message : String(e)) }
  }, [remoteCode])
  const leaveRemote = useCallback(async () => {
    if (remoteSession && remoteRole === "host") { try { await remoteApi.close(remoteSession.sessionId) } catch { /* noop */ } }
    setRemoteRole("none"); setRemoteSession(null); saveRemote(null); setPeerOnline(false)
    if (remoteRole === "client") { setConnected(false); setCtrlState("idle"); setProgress(null) }
  }, [remoteSession, remoteRole])

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
          <button data-testid="pb-mode-remote" onClick={() => setMode("remote")} disabled={connected && !isClient} className={`px-3 py-2 text-xs flex items-center gap-1.5 ${mode === "remote" ? "bg-violet-500/25 text-white" : "text-gray-400"} disabled:opacity-40`}><Tablet className="w-3.5 h-3.5" /> Tablet (remoto)</button>
        </div>
        {mode === "usb" && !connected && <select value={baud} onChange={(e) => setBaud(+e.target.value)} className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200">{[115200, 250000, 57600, 9600].map((b) => <option key={b} value={b}>{b} baud</option>)}</select>}
        {mode === "remote" ? (
          remoteRole === "client"
            ? <button onClick={leaveRemote} className="px-4 py-2 rounded-xl border border-white/15 hover:border-red-400/50 text-sm flex items-center gap-2"><Link2Off className="w-4 h-4" /> Sair do remoto</button>
            : <div className="flex items-center gap-2">
                <input data-testid="pb-remote-code" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="código de 6 dígitos" value={remoteCode} onChange={(e) => setRemoteCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-40 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-base tracking-[0.3em] font-mono text-center text-white focus:outline-none focus:border-violet-400/60" />
                <button data-testid="pb-remote-join" onClick={joinFromTablet} disabled={remoteCode.length !== 6} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Link2 className="w-4 h-4" /> Controlar</button>
              </div>
        ) : !connected
          ? <button data-testid="pb-connect" onClick={connect} disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Usb className="w-4 h-4" />{busy ? "Conectando…" : "Conectar"}</button>
          : <button data-testid="pb-disconnect" onClick={disconnect} disabled={streaming} className="px-4 py-2 rounded-xl border border-white/15 hover:border-red-400/50 text-sm flex items-center gap-2 disabled:opacity-40"><Unplug className="w-4 h-4" /> Desconectar</button>}
        {connected && mode !== "remote" && remoteRole === "none" && <button data-testid="pb-share-tablet" onClick={shareToTablet} className="px-3 py-2 rounded-xl border border-violet-400/40 bg-violet-500/10 text-violet-100 text-sm flex items-center gap-2"><Tablet className="w-4 h-4" /> Compartilhar com tablet</button>}
        <div className="flex items-center gap-2 text-xs ml-auto">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? (streaming ? "bg-cyan-400 animate-pulse" : "bg-emerald-400") : "bg-gray-600"}`} />
          <span className="text-gray-300">{connected ? stateLabel[ctrlState] : "Desconectado"}</span>
          {firmware && connected && <span className="text-gray-500 hidden sm:inline">· {firmware.name ?? firmware.family}</span>}
          {zeroed && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> zerado</span>}
        </div>
        {!supported && mode !== "remote" && <p className="w-full text-[11px] text-amber-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Este navegador não tem Web Serial — use Chrome/Edge/Brave no desktop, ou o modo <b>Tablet (remoto)</b>.</p>}
        {err && <p className="w-full text-[11px] text-red-300">{err}</p>}
        {remoteErr && <p className="w-full text-[11px] text-red-300">{remoteErr}</p>}

        {/* ── painel do HOST (notebook) ── */}
        {remoteRole === "host" && remoteSession && (
          <div className="w-full rounded-xl border border-violet-400/30 bg-violet-500/10 p-3 flex flex-wrap items-center gap-3" data-testid="pb-host-panel">
            <Laptop className="w-5 h-5 text-violet-300" />
            <div className="flex-1 min-w-[200px]"><div className="text-xs text-violet-200">Este notebook está compartilhando a impressora. No iPad, abra <b>Impressão Básica → Imprimir → Tablet (remoto)</b> (mesma conta) e digite:</div></div>
            <div className="flex items-center gap-2"><span data-testid="pb-host-code" className="font-mono text-2xl tracking-[0.35em] text-white bg-black/40 rounded-lg px-3 py-1">{remoteSession.code}</span><button onClick={() => navigator.clipboard?.writeText(remoteSession.code)} className="p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white" title="Copiar"><Copy className="w-4 h-4" /></button></div>
            <span className={`text-[11px] flex items-center gap-1.5 ${peerOnline ? "text-emerald-300" : "text-gray-400"}`}><span className={`w-2 h-2 rounded-full ${peerOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />{peerOnline ? "tablet conectado" : "aguardando tablet"}</span>
            <button onClick={leaveRemote} className="text-[11px] text-gray-400 hover:text-red-300 flex items-center gap-1"><Link2Off className="w-3.5 h-3.5" /> encerrar</button>
          </div>
        )}
        {/* ── painel do CLIENT (tablet) ── */}
        {remoteRole === "client" && (
          <div className="w-full rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 flex flex-wrap items-center gap-3" data-testid="pb-client-panel">
            <Tablet className="w-5 h-5 text-cyan-300" />
            <div className="flex-1 min-w-[200px] text-xs text-cyan-100">Controlando a impressora do notebook <span className="font-mono">{remoteSession?.code}</span>. Todos os botões desta tela enviam comandos ao notebook.</div>
            <span className={`text-[11px] flex items-center gap-1.5 ${peerOnline ? "text-emerald-300" : "text-amber-300"}`}><span className={`w-2 h-2 rounded-full ${peerOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />{peerOnline ? "notebook online" : "notebook sem resposta — mantenha a aba da BIA aberta nele"}</span>
          </div>
        )}
        {mode === "remote" && remoteRole === "none" && (
          <div className="w-full text-[11px] text-gray-400 leading-relaxed">
            <b className="text-gray-200">Como funciona:</b> 1) no <b>notebook</b> (Chrome/Edge) com a impressora na USB, conecte e clique <i>Compartilhar com tablet</i>; 2) aqui no {tablet ? "tablet" : "outro dispositivo"}, digite o código de 6 dígitos. A mesma conta BIA deve estar logada nos dois. O joystick, ZERAR, fluxo, velocidade, altura, extrusão e Iniciar/PARAR passam a controlar a impressora pelo notebook.
          </div>
        )}
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
          <button data-testid="pb-load-syringe" onClick={loadSyringe} disabled={!canJog} className="w-full py-2.5 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-100 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-30"><ArrowUpFromLine className="w-4 h-4" /> Colocar seringa <span className="text-[10px] font-normal text-fuchsia-200/70">(sobe 50 mm)</span></button>
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
              <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                <p className="text-[11px] text-gray-500">▼ aproxima a agulha do substrato · ▲ afasta. Parado: move na hora. Imprimindo: aplica na próxima linha do G-code.</p>
                <label className="text-[10px] text-gray-500 flex items-center gap-1">método ao imprimir
                  <select value={babyMode} onChange={(e) => setBabyMode(e.target.value as typeof babyMode)} className="bg-black/30 border border-white/10 rounded px-1 py-0.5 text-[10px] text-gray-300"><option value="auto">G91/G1 Z (universal)</option><option value="m290">M290 baby-step</option></select></label>
              </div>
            </div>
          </div>

          <div className={card + " space-y-3"} data-testid="pb-extrude">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Syringe className="w-4 h-4 text-fuchsia-300" /> Extrusão manual</h3>
              <div className="flex gap-1">{state.heads.filter((h) => h.enabled).map((h) => <button key={h.id} onClick={() => setCurHead(h.id)} className={`px-2 py-1 rounded-md text-[11px] border flex items-center gap-1 ${curHead === h.id ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-gray-400"}`}><span className="w-2 h-2 rounded-full" style={{ background: h.color }} />T{h.id - 1}</button>)}</div>
            </div>
            {head.extrusionMode !== "pneumatic" && (
              <div className="grid grid-cols-2 gap-3" data-testid="pb-ext-controls">
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1">Velocidade do extrusor <span className="normal-case tracking-normal text-gray-500">(mm/s)</span></span>
                  <div className="flex gap-1">{[0.5, 1, 2, 5, 10].map((v) => <button key={v} data-testid={`pb-ext-speed-${v}`} onClick={() => setExtSpeed(v)} className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold border ${extSpeed === v ? "bg-fuchsia-500 border-fuchsia-400 text-white" : "border-white/10 text-gray-400"}`}>{v}</button>)}</div>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1">Quantidade <span className="normal-case tracking-normal text-gray-500">({head.extrusionMode === "volumetric" ? "mm³ ≈ µL" : "mm"})</span></span>
                  <div className="flex gap-1">{[1, 2, 5, 10, 25].map((v) => <button key={v} onClick={() => setExtAmount(v)} className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold border ${extAmount === v ? "bg-fuchsia-500 border-fuchsia-400 text-white" : "border-white/10 text-gray-400"}`}>{v}</button>)}</div>
                </div>
              </div>
            )}
            {head.extrusionMode === "pneumatic" ? (
              <div className="flex gap-2">
                <button onClick={() => extrude(1)} disabled={!connected || busy} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border ${extruding ? "bg-emerald-500/30 border-emerald-400 text-white" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"} disabled:opacity-30`}><Power className="w-4 h-4" /> Ligar válvula ({head.onCmd})</button>
                <button onClick={() => extrude(-1)} disabled={!connected || busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 text-red-200 disabled:opacity-30"><Power className="w-4 h-4" /> Desligar ({head.offCmd})</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button data-testid="pb-extrude" onClick={() => extrude(1)} disabled={!connected || busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30"><Syringe className="w-4 h-4" /> Extrudar {extAmount} {head.extrusionMode === "volumetric" ? "mm³" : "mm"} <span className="text-[10px] font-normal opacity-70">a {extSpeed} mm/s</span></button>
                <button onClick={() => extrude(-1)} disabled={!connected || busy} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 disabled:opacity-30"><Syringe className="w-4 h-4 rotate-180" /> Retrair {extAmount}</button>
              </div>
            )}
            <p className="text-[11px] text-gray-500">Cabeçote T{head.id - 1} · {head.label} · modo {head.extrusionMode === "pneumatic" ? "pneumático" : head.extrusionMode === "volumetric" ? "mecânico/volumétrico" : "filamento"}. {head.extrusionMode !== "pneumatic" && "Se o êmbolo demorar, suba a velocidade (5–10 mm/s) para escorvar e volte a 1–2 mm/s para o ajuste fino. "}Escorve até o hidrogel sair uniforme, limpe a ponta e depois zere.</p>
          </div>

          <div className={card + " space-y-3"} data-testid="pb-stream">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 mr-auto"><FlaskConical className="w-4 h-4 text-emerald-300" /> Impressão</h3>
              {!streaming
                ? <button data-testid="pb-start" onClick={start} disabled={!connected || (!hasGcode && !isClient) || busy} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40"><Play className="w-4 h-4" /> Iniciar impressão</button>
                : ctrlState === "paused"
                  ? <button onClick={() => (isClient ? dispatch("resume") : ctrlRef.current?.resume())} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2"><Play className="w-4 h-4" /> Retomar</button>
                  : <button onClick={() => (isClient ? dispatch("pause") : ctrlRef.current?.pause())} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold flex items-center gap-2"><Pause className="w-4 h-4" /> Pausar</button>}
              <button data-testid="pb-stop" onClick={softStop} disabled={!connected || busy} className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-30" title="Para com segurança: desliga válvulas, sobe 10 mm e religa os motores — pronta para recomeçar"><Square className="w-4 h-4" /> PARAR</button>
              {(stopped || ctrlState === "error" || ctrlState === "completed") && <button data-testid="pb-rearm" onClick={rearm} disabled={!connected} className="px-3 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 text-sm font-semibold flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Religar motores</button>}
              <button data-testid="pb-emergency" onClick={emergency} disabled={!connected} className="px-2.5 py-2.5 rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30" title="M112 — só em risco de colisão; a impressora trava até reconectar"><OctagonX className="w-4 h-4" /> Emergência</button>
            </div>
            {stopped && <p className="text-xs text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Parada segura concluída — motores ligados. Ajuste o que precisar, zere se necessário e clique Iniciar impressão.</p>}
            {!hasGcode && !isClient && <p className="text-xs text-amber-300">Gere o G-code na etapa anterior antes de imprimir.</p>}
            {isClient && <p className="text-[11px] text-gray-500">O G-code usado é o que está carregado no notebook.</p>}
            {progress && (
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1"><span>Linha {progress.current}/{progress.total} · camada {progress.currentLayer}</span><span>{progress.percent.toFixed(0)}%{progress.remainingMsEst != null && ` · ~${Math.ceil(progress.remainingMsEst / 60000)} min restantes`}</span></div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${progress.percent}%` }} /></div>
              </div>
            )}
            <button onClick={() => setShowLog((v) => !v)} className="text-[11px] text-gray-400 flex items-center gap-1.5 hover:text-gray-200"><Terminal className="w-3.5 h-3.5" /> {showLog ? "Ocultar" : "Mostrar"} console ({log.length})</button>
            {showLog && <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 border border-white/5 p-2 text-[10.5px] font-mono leading-relaxed">{log.map((e) => <div key={e.seq} className={e.severity === "error" ? "text-red-300" : e.severity === "warn" ? "text-amber-300" : e.severity === "ok" ? "text-emerald-300" : e.severity === "tx" ? "text-cyan-200" : "text-gray-400"}>{e.severity === "tx" ? "→ " : e.severity === "rx" || e.severity === "ok" ? "← " : "· "}{e.text}</div>)}</pre>}
            {!showFeedback && (ctrlState === "completed" || stopped) && <button onClick={() => { setShowFeedback(true); setSuggestions(null) }} className="text-xs text-violet-300 hover:text-violet-200 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Avaliar esta impressão</button>}
          </div>

          {/* ── feedback pós-impressão ── */}
          {showFeedback && (
            <div className={card + " space-y-4 border-violet-400/30"} data-testid="pb-feedback">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-300" /> Como foi a impressão?</h3><p className="text-[11px] text-gray-500">A BIA lê suas respostas e os ajustes que você fez ao vivo (fluxo {flow} % · velocidade {speed} % · altura {zBaby >= 0 ? "+" : ""}{zBaby.toFixed(2)} mm) e sugere o que mudar na próxima.</p></div>
                <button onClick={() => setShowFeedback(false)} className="text-gray-500 hover:text-gray-300 text-xs">fechar</button>
              </div>
              {!suggestions ? (<>
                <div className="flex items-center gap-1" data-testid="pb-fb-rating">{([1, 2, 3, 4, 5] as const).map((n) => <button key={n} onClick={() => setFbRating(n)} className={`w-9 h-9 rounded-lg border flex items-center justify-center ${fbRating >= n ? "bg-amber-400/20 border-amber-400/60 text-amber-300" : "border-white/10 text-gray-600"}`}><Star className="w-4 h-4" fill={fbRating >= n ? "currentColor" : "none"} /></button>)}<span className="text-xs text-gray-400 ml-2">{["", "Falhou", "Ruim", "Regular", "Boa", "Excelente"][fbRating]}</span></div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">O que você observou? <span className="normal-case tracking-normal text-gray-500">(marque todos)</span></span>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {SYMPTOMS.map((sy) => { const on = fbSymptoms.includes(sy.id)
                      return <button key={sy.id} data-testid={`pb-fb-${sy.id}`} onClick={() => setFbSymptoms((a) => sy.id === "ok" ? (on ? [] : ["ok"]) : (on ? a.filter((x) => x !== sy.id) : [...a.filter((x) => x !== "ok"), sy.id]))} title={sy.hint} className={`text-left px-3 py-2 rounded-lg border text-xs ${on ? "border-violet-400/60 bg-violet-500/15 text-white" : "border-white/10 text-gray-300 hover:border-white/25"}`}>{sy.label}</button> })}
                  </div>
                </div>
                <textarea value={fbNotes} onChange={(e) => setFbNotes(e.target.value)} placeholder="Observações livres (opcional): ex. 'saiu bem só a partir da 3ª camada', 'hidrogel muito líquido hoje'…" rows={2} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-violet-400/60" />
                <button data-testid="pb-fb-submit" onClick={submitFeedback} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4" /> Pedir sugestões à BIA</button>
              </>) : (
                <div className="space-y-2" data-testid="pb-suggestions">
                  {suggestions.length === 0 && <p className="text-sm text-gray-300">Nada a corrigir — parâmetros registrados como referência.</p>}
                  {suggestions.map((sg) => (
                    <div key={sg.id} className={`rounded-xl border p-3 ${sg.priority === 1 ? "border-violet-400/40 bg-violet-500/10" : "border-white/10 bg-white/[0.02]"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div><div className="text-sm font-semibold text-white">{sg.title}</div><p className="text-xs text-gray-300 mt-0.5">{sg.detail}</p></div>
                        {sg.apply && onApplyState && (applied.has(sg.id)
                          ? <span className="text-[11px] text-emerald-300 flex items-center gap-1 shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /> aplicado</span>
                          : <button onClick={() => applySuggestion(sg)} className="shrink-0 px-2.5 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 text-[11px] font-semibold">{sg.applyLabel ?? "Aplicar"}</button>)}
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-gray-500">Ajustes aplicados mudam os parâmetros do protocolo — gere o G-code de novo na etapa anterior antes da próxima impressão.</p>
                  <button onClick={() => { setSuggestions(null) }} className="text-xs text-gray-400 hover:text-gray-200">← editar respostas</button>
                </div>
              )}
            </div>
          )}
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
