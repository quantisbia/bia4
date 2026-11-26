"use client"

/**
 * BIA · Impressão Básica (R35) — wizard em 6 passos com o racional da MIA Print 2:
 *   1 Superfície → 2 Objetos → 3 Camadas → 4 Cabeçotes (3) → 5 Impressora → 6 Resumo & G-code
 * Tudo roda no browser; o servidor só cobra créditos (/api/gcode/charge).
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, ArrowRight, Check, Circle, Download, Grid3X3, Layers, Minus, Plus, Printer, Settings2,
  Square, Trash2, Zap, AlertTriangle, Info, Gamepad2, RefreshCw, Target, FlaskConical, Pencil, Usb, Shapes, Route,
} from "lucide-react"
import {
  type BasicState, type Shape, type ShapeType, type Head, type SurfaceKind, type ToolLayer, type InfillPattern,
  defaultState, defaultShape, describeShape, surfaceExtent, wellOffsets, allWells, MULTIWELL, PETRI, SLIDES, shapePts,
  BED_ROUND, BED_SQUARE, GAUGES, HEAD_TYPES, INFILL, PLATE_W, PLATE_H, validate, buildToolpaths, generateGcode,
  layerCount, syncBed, fmtDot, lineWidthOf, firstLayerH, summarize, type GcodeStats, type InfillZone, sandwichPreset, uid,
  type PathStrategy, DEFAULT_STRATEGY,
} from "@/lib/print-basic/engine"
import { sendToExecute } from "@/lib/bioprint/execute-handoff"
import { DrawCanvas, ShapeThumb } from "./_components/DrawCanvas"
import { PrintStep } from "./_components/PrintStep"
import { View3D } from "./_components/View3D"

const STORAGE_KEY = "bia.print-basic.state.v1"
const STEPS = [
  { id: "surface", label: "Superfície", desc: "Onde imprimir", icon: Target },
  { id: "objects", label: "Desenho", desc: "O que imprimir", icon: Pencil },
  { id: "layers", label: "Camadas", desc: "Preenchimento", icon: Layers },
  { id: "heads", label: "Cabeçotes", desc: "Biotinta & firmware", icon: FlaskConical },
  { id: "printer", label: "Impressora", desc: "Ajustes gerais", icon: Settings2 },
  { id: "summary", label: "G-code", desc: "Revisar & gerar", icon: Zap },
  { id: "print", label: "Imprimir", desc: "USB & joystick", icon: Usb },
] as const
type StepId = (typeof STEPS)[number]["id"]

/* ─────────────── Estratégia de trajetória (R40) ─────────────── */
function StrategyPreview({ continuous }: { continuous: boolean }) {
  // mini-diagrama: padrão (linhas soltas com saltos) vs contínuo (meandro + perímetro emendado)
  const W = 96, H = 64, m = 8
  const rows = [0, 1, 2, 3, 4].map((i) => m + 6 + i * 9)
  if (!continuous) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-24 h-16 shrink-0" aria-hidden>
        <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} rx="3" fill="none" stroke="#a78bfa" strokeWidth="1.6" />
        {rows.map((y, i) => <line key={i} x1={m + 5} x2={W - m - 5} y1={y} y2={y} stroke="#67e8f9" strokeWidth="1.6" strokeLinecap="round" />)}
        {rows.slice(0, -1).map((y, i) => <path key={"t" + i} d={`M ${i % 2 === 0 ? W - m - 5 : m + 5} ${y} q ${i % 2 === 0 ? 6 : -6} 4.5 0 9`} fill="none" stroke="#f87171" strokeWidth="1" strokeDasharray="2 1.5" />)}
      </svg>
    )
  }
  let d = `M ${m} ${m} H ${W - m} V ${H - m} H ${m} V ${rows[0]}`
  rows.forEach((y, i) => { const left = m + 5, right = W - m - 5; if (i === 0) d += ` H ${right}`; else d += ` V ${y} H ${i % 2 === 0 ? right : left}` })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-24 h-16 shrink-0" aria-hidden>
      <path d={d} fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={m} cy={m} r="2.2" fill="#fbbf24" />
    </svg>
  )
}

function StrategyCard({ strat, setStrat }: { strat: PathStrategy; setStrat: (p: Partial<PathStrategy>) => void }) {
  return (
    <div className={cardCls + " space-y-3"} data-testid="pb-strategy">
      <div className="flex items-start gap-3">
        <StrategyPreview continuous={strat.continuous} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold flex items-center gap-2"><Route className="w-4 h-4 text-emerald-300" /> Estratégia de trajetória</div>
            <button type="button" data-testid="pb-strategy-toggle" onClick={() => setStrat({ continuous: !strat.continuous })} className={`relative w-11 h-6 rounded-full transition shrink-0 ${strat.continuous ? "bg-emerald-400" : "bg-white/15"}`} aria-pressed={strat.continuous} aria-label="Trajetória contínua"><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${strat.continuous ? "left-[22px]" : "left-0.5"}`} /></button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {strat.continuous
              ? <>Contínua: o cabeçote começa num ponto e percorre a peça inteira <b className="text-gray-200">sem levantar, sem retrair, sem pausa e numa velocidade só</b>. Grade e linhas viram um meandro (zigue-zague) emendado ao perímetro; a troca de camada sobe em Z andando. Só levanta/retrai onde você permitir abaixo.</>
              : <>Padrão: cada linha é uma trajetória separada — entre elas o cabeçote para, retrai (ou fecha o ar), levanta e desloca. Mais paradas, mais tempo, mais “fios” de biotinta.</>}
          </p>
        </div>
      </div>

      {strat.continuous && (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-1 border-t border-white/5">
          <div className="space-y-2.5">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Dentro da peça</div>
            <Num label="Maior emenda extrudando" suffix="mm" value={strat.maxBridge} onChange={(x) => setStrat({ maxBridge: Math.max(0, x) })} step={0.5} min={0} max={50} testId="pb-strategy-maxbridge" />
            <p className="text-[11px] text-gray-500 -mt-1">{strat.maxBridge > 0 ? `Saltos maiores que ${fmtDot(strat.maxBridge, 1)} mm levantam/retraem; menores são feitos extrudando.` : "0 = nunca levantar nem retrair dentro do mesmo objeto (todas as emendas extrudando)."} Entre objetos diferentes o cabeçote sempre levanta.</p>
            <Toggle label="Emendar perímetro ao preenchimento" hint="O contorno termina exatamente onde o meandro começa (emenda ≈ 1 largura de linha)." checked={strat.joinPerimeter} onChange={(x) => setStrat({ joinPerimeter: x })} />
            <Toggle label="Troca de camada sem parar (Z contínuo)" hint="Sobe para a próxima camada enquanto anda e extruda — sem retração nem pausa." checked={strat.continuousZ} onChange={(x) => setStrat({ continuousZ: x })} />
            <Toggle label="Uma velocidade só" hint="Perímetro, preenchimento e emendas na velocidade do cabeçote. Desligado: perímetro externo a 80 %." checked={strat.singleSpeed} onChange={(x) => setStrat({ singleSpeed: x })} />
            <Toggle label="Levantar (Z-hop) nos deslocamentos longos" hint="Quando precisar deslocar (salto > limite, outro objeto, fim), usa o Z-hop do cabeçote. Desligado: desloca rente." checked={strat.liftOnLongTravel} onChange={(x) => setStrat({ liftOnLongTravel: x })} />
          </div>
          <div className="space-y-2.5">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">Saia de escorva (skirt)</div>
            <Toggle label="Imprimir saia antes da peça" hint="Volta(s) ao redor da peça na 1ª camada para a biotinta chegar uniforme na agulha." checked={strat.skirt} onChange={(x) => setStrat({ skirt: x })} />
            {strat.skirt && (<>
              <div className="grid grid-cols-2 gap-2">
                <Num label="Distância da peça" suffix="mm" value={strat.skirtGap} onChange={(x) => setStrat({ skirtGap: Math.max(0.5, x) })} step={0.5} min={0.5} max={20} testId="pb-strategy-skirt-gap" />
                <Num label="Voltas" value={strat.skirtLoops} onChange={(x) => setStrat({ skirtLoops: Math.max(1, Math.min(5, Math.round(x))) })} min={1} max={5} testId="pb-strategy-skirt-loops" />
              </div>
              <Toggle label="Levantar e retrair ao terminar a saia" hint="O único levantamento obrigatório do modo contínuo: fecha a saia, retrai, sobe e vai ao início da peça." checked={strat.liftAfterSkirt} onChange={(x) => setStrat({ liftAfterSkirt: x })} />
            </>)}
          </div>
        </div>
      )}
      {!strat.continuous && (
        <div className="pt-1 border-t border-white/5 space-y-2">
          <Toggle label="Imprimir saia (skirt) antes da peça" hint="Volta(s) ao redor da peça na 1ª camada para escorvar a agulha." checked={strat.skirt} onChange={(x) => setStrat({ skirt: x })} />
          {strat.skirt && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><Num label="Distância da peça" suffix="mm" value={strat.skirtGap} onChange={(x) => setStrat({ skirtGap: Math.max(0.5, x) })} step={0.5} min={0.5} max={20} /><Num label="Voltas" value={strat.skirtLoops} onChange={(x) => setStrat({ skirtLoops: Math.max(1, Math.min(5, Math.round(x))) })} min={1} max={5} /></div>}
        </div>
      )}
    </div>
  )
}

/* ─────────────── UI helpers ─────────────── */
const inputCls = "w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-violet-400/60"
const labelCls = "block text-[11px] uppercase tracking-wider text-gray-400 mb-1"
const cardCls = "rounded-2xl border border-white/10 bg-white/[0.03] p-4"

function Num({ label, value, onChange, step = 1, min, max, suffix, testId }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; testId?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}{suffix && <span className="text-gray-500 normal-case tracking-normal"> ({suffix})</span>}</span>
      <input data-testid={testId} type="number" className={inputCls} value={Number.isFinite(value) ? value : ""} step={step} min={min} max={max}
        onChange={(e) => { const v = parseFloat(e.target.value.replace(",", ".")); if (Number.isFinite(v)) onChange(v) }} />
    </label>
  )
}
function Sel<T extends string | number>({ label, value, onChange, options, testId }: { label: string; value: T; onChange: (v: string) => void; options: { v: T; l: string }[]; testId?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select data-testid={testId} className={inputCls} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={String(o.v)} value={String(o.v)}>{o.l}</option>)}
      </select>
    </label>
  )
}
function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`mt-0.5 w-9 h-5 rounded-full relative transition-colors ${checked ? "bg-violet-500" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
      <span className="text-sm text-gray-200">{label}{hint && <span className="block text-xs text-gray-500">{hint}</span>}</span>
    </label>
  )
}

/* ─────────────── Página ─────────────── */
export function PrintBasicClient({ initialStep }: { initialStep?: string } = {}) {
  const [state, setState] = useState<BasicState>(() => defaultState())
  const [step, setStep] = useState<StepId>(() => (STEPS.some((s) => s.id === initialStep) ? (initialStep as StepId) : "surface"))
  const [curHead, setCurHead] = useState(1)
  const [drawHead, setDrawHead] = useState(1)
  const [drawHeight, setDrawHeight] = useState(2)
  const [layers, setLayers] = useState<ToolLayer[] | null>(null)
  const [layerIdx, setLayerIdx] = useState(0)
  const [result, setResult] = useState<{ gcode: string; stats: GcodeStats } | null>(null)
  const [busy, setBusy] = useState(false)
  const [charged, setCharged] = useState<{ ok: boolean; msg: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // persistência local
  useEffect(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const s = JSON.parse(raw) as BasicState; if (s?.heads?.length === 3 && s.surface && s.shapes) setState(s) } } catch { /* noop */ }
    setHydrated(true)
  }, [])
  useEffect(() => { if (hydrated) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* noop */ } } }, [state, hydrated])

  const upd = useCallback((fn: (s: BasicState) => BasicState) => { setState((s) => fn(s)); setLayers(null); setResult(null); setCharged(null) }, [])
  const setSurface = (patch: Partial<BasicState["surface"]>) => upd((s) => { const ns = { ...s, surface: { ...s.surface, ...patch } }; return { ...ns, bed: syncBed(ns) } })
  const setLS = (patch: Partial<BasicState["layerSettings"]>) => upd((s) => ({ ...s, layerSettings: { ...s.layerSettings, ...patch } }))
  const setPrinter = (patch: Partial<BasicState["printer"]>) => upd((s) => ({ ...s, printer: { ...s.printer, ...patch } }))
  const strat: PathStrategy = { ...DEFAULT_STRATEGY, ...(state.printer.strategy ?? {}) }
  const setStrat = (patch: Partial<PathStrategy>) => upd((s) => ({ ...s, printer: { ...s.printer, strategy: { ...DEFAULT_STRATEGY, ...(s.printer.strategy ?? {}), ...patch } } }))
  const setHead = (id: number, patch: Partial<Head>) => upd((s) => ({ ...s, heads: s.heads.map((h) => (h.id === id ? { ...h, ...patch } : h)) }))
  const setShape = (id: string, patch: Partial<Shape>) => upd((s) => ({ ...s, shapes: s.shapes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
  const addShape = (type: ShapeType) => upd((s) => ({ ...s, shapes: [...s.shapes, defaultShape(type, 1)] }))
  const removeShape = (id: string) => upd((s) => ({ ...s, shapes: s.shapes.filter((x) => x.id !== id) }))

  const ext = surfaceExtent(state.surface)
  const offs = wellOffsets(state.surface)
  const v = useMemo(() => validate(state), [state])
  const nLayers = layerCount(state)
  const stepIdx = STEPS.findIndex((s) => s.id === step)
  const go = (d: number) => { const n = STEPS[stepIdx + d]; if (n) setStep(n.id) }

  const slice = useCallback(async () => {
    if (v.errors.length) { setError(v.errors[0]); return }
    setError(null); setBusy(true); setCharged(null)
    await new Promise((r) => setTimeout(r, 20))
    try {
      const tp = buildToolpaths(state)
      const r = generateGcode(state, tp)
      setLayers(tp); setLayerIdx(0); setResult({ gcode: r.gcode, stats: r.stats })
      try {
        const res = await fetch("/api/gcode/charge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: {
          jobName: state.protocolName.slice(0, 200), profileId: "print-basic", infill: state.layerSettings.infillPattern, infillDensity: state.layerSettings.infillDensity,
          layerCount: tp.length, volume_uL: Math.round(r.stats.volumeMM3), time_s: Math.round(r.stats.seconds), target: state.surface.kind, wells: r.stats.wells,
          tools: Math.max(1, Object.keys(r.stats.perHead).length), geometryId: "print-basic", gcodeLines: r.lines.length,
        } }) })
        if (res.ok) { const j = await res.json(); setCharged({ ok: true, msg: j.charged ? `${j.charged} créditos debitados` : "sem cobrança (admin)" }) }
        else if (res.status === 402) setCharged({ ok: false, msg: "Créditos insuficientes — recarregue para baixar/enviar." })
        else setCharged({ ok: false, msg: "Não foi possível registrar a cobrança." })
      } catch { setCharged({ ok: false, msg: "Sem conexão para registrar a cobrança." }) }
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao gerar") }
    finally { setBusy(false) }
  }, [state, v.errors])

  const gated = () => { if (charged && !charged.ok) { setError(charged.msg); return false } return true }
  const fileName = () => (state.protocolName || "bia_basico").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") + ".gcode"
  const download = () => { if (!result || !gated()) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([result.gcode], { type: "text/plain" })); a.download = fileName(); a.click(); URL.revokeObjectURL(a.href) }
  const toExecute = () => { if (!result || !gated()) return; sendToExecute({ gcode: result.gcode, name: fileName(), from: "print-basic" }) }
  const reset = () => { if (confirm("Restaurar configurações padrão? O protocolo atual será perdido.")) { setState(defaultState()); setLayers(null); setResult(null); setCharged(null); setStep("surface") } }

  // preview da camada atual (só computa quando necessário e leve)
  const previewLayers = useMemo(() => {
    if (layers) return layers
    if (step === "layers" || step === "objects" || step === "heads") { try { if (v.errors.length) return null; const n = layerCount(state); const tp = buildToolpaths(state); return n > 60 ? tp.slice(0, 60) : tp } catch { return null } }
    return null
  }, [layers, step, state, v.errors.length])

  return (
    <div className="min-h-full bg-[#0a0a0f] text-white">
      <header className="border-b border-white/5 bg-black/40 backdrop-blur sticky top-0 z-20">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 max-w-7xl mx-auto">
          <Link href="/dashboard" className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
          <span className="text-white/20">/</span>
          <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2"><Printer className="w-5 h-5 text-violet-300" /> Impressão Básica</h1>
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-violet-400/30 text-violet-200">3 cabeçotes · MIA rationale</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/dashboard/bioprint" data-testid="pb-advanced-path" className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/40 text-gray-300">Caminho avançado (6 fases) →</Link>
            <button onClick={reset} title="Restaurar padrões" className="text-xs px-2 py-1.5 rounded-lg border border-white/10 hover:border-red-400/40 text-gray-400"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <nav aria-label="Etapas" className="px-4 sm:px-6 pb-3 max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {STEPS.map((s, i) => { const Icon = s.icon; const done = i < stepIdx; const active = s.id === step
            return <button key={s.id} data-testid={`pb-step-${s.id}`} onClick={() => setStep(s.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left whitespace-nowrap transition-colors border ${active ? "bg-violet-500/20 border-violet-400/40 text-white" : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"}`}>
              <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold border shrink-0 ${done ? "bg-emerald-500 border-emerald-500 text-white" : active ? "bg-violet-500 border-violet-500 text-white" : "border-white/20"}`}>{done ? <Check className="w-3.5 h-3.5" /> : i + 1}</span>
              <span className="leading-tight"><span className="text-xs font-semibold flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{s.label}</span><span className="block text-[10px] text-gray-500">{s.desc}</span></span></button> })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4 min-w-0">
          {/* ───── 1 SUPERFÍCIE ───── */}
          {step === "surface" && (
            <div className="space-y-4">
              <div><h2 className="text-xl font-bold">1 · Superfície de impressão</h2><p className="text-sm text-gray-400">Onde o construto será depositado. A origem (0,0) fica no centro da superfície — e no centro de cada poço, em placas multiwell.</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([["bed", "Só a mesa", Grid3X3], ["petri", "Placa de Petri", Circle], ["slide", "Lâmina", Minus], ["multiwell", "Placa multiwell", Grid3X3]] as [SurfaceKind, string, typeof Circle][]).map(([k, l, Icon]) => (
                  <button key={k} data-testid={`pb-surface-${k}`} onClick={() => setSurface({ kind: k })} className={`rounded-xl border p-3 text-left text-sm flex items-center gap-2 transition-colors ${state.surface.kind === k ? "border-violet-400/70 bg-violet-500/15 text-white" : "border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/25"}`}><Icon className="w-4 h-4 text-violet-300" />{l}</button>
                ))}
              </div>
              <div className={cardCls + " grid sm:grid-cols-2 gap-3"}>
                {state.surface.kind === "bed" && (<>
                  <Sel label="Formato da mesa" value={state.surface.bedShape} onChange={(x) => setSurface({ bedShape: x as "round" | "square", bedSize: x === "round" ? "220" : "220" })} options={[{ v: "square", l: "Quadrada / retangular" }, { v: "round", l: "Redonda (delta)" }]} />
                  <Sel label="Tamanho" value={state.surface.bedSize} onChange={(x) => setSurface({ bedSize: x })} options={[...(state.surface.bedShape === "round" ? BED_ROUND : BED_SQUARE).map((b) => ({ v: b.id, l: b.label })), { v: "custom", l: "Personalizado…" }]} />
                  {state.surface.bedSize === "custom" && (<>
                    <Num label={state.surface.bedShape === "round" ? "Diâmetro" : "Largura X"} suffix="mm" value={state.surface.customW} onChange={(x) => setSurface({ customW: x })} min={20} max={1000} />
                    {state.surface.bedShape === "square" && <Num label="Profundidade Y" suffix="mm" value={state.surface.customH} onChange={(x) => setSurface({ customH: x })} min={20} max={1000} />}
                  </>)}
                </>)}
                {state.surface.kind === "petri" && <Sel label="Placa de Petri" value={state.surface.petri} onChange={(x) => setSurface({ petri: x })} options={PETRI.map((p) => ({ v: p.id, l: `${p.label} (útil Ø ${p.inner} mm)` }))} testId="pb-petri" />}
                {state.surface.kind === "slide" && <Sel label="Lâmina" value={state.surface.slide} onChange={(x) => setSurface({ slide: x })} options={SLIDES.map((p) => ({ v: p.id, l: p.label }))} />}
                {state.surface.kind === "multiwell" && (<>
                  <Sel label="Placa" value={state.surface.wells} onChange={(x) => setSurface({ wells: +x, selectedWells: [] })} options={MULTIWELL.map((m) => ({ v: m.id, l: `${m.id} poços · Ø ${m.wellD} mm · passo ${m.pitch} mm` }))} testId="pb-wells" />
                  <div className="sm:col-span-2">
                    <span className={labelCls}>Poços a imprimir <span className="text-gray-500 normal-case tracking-normal">(clique para alternar · vazio = todos · {offs.length} selecionado{offs.length > 1 ? "s" : ""})</span></span>
                    <WellPicker wells={state.surface.wells} selected={state.surface.selectedWells} onChange={(sel) => setSurface({ selectedWells: sel })} />
                  </div>
                </>)}
                <Num label="Margem não imprimível" suffix="mm" value={state.surface.margin} onChange={(x) => setSurface({ margin: x })} min={0} max={50} step={0.5} />
                {state.surface.kind !== "bed" && (<div className="sm:col-span-2 grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                  <div className="col-span-3 text-xs text-gray-400 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Mesa da impressora (para posicionar a superfície no centro): {state.bed.x} × {state.bed.y} mm · centro X{state.bed.cx} Y{state.bed.cy}</div>
                  <Num label="Largura da mesa X" suffix="mm" value={state.bed.x} onChange={(x) => upd((s) => ({ ...s, bed: { ...s.bed, x, cx: +(x / 2).toFixed(2) }, surface: { ...s.surface, bedSize: "custom", customW: x } }))} />
                  <Num label="Profundidade Y" suffix="mm" value={state.bed.y} onChange={(y) => upd((s) => ({ ...s, bed: { ...s.bed, y, cy: +(y / 2).toFixed(2) }, surface: { ...s.surface, bedSize: "custom", customH: y } }))} />
                  <Num label="Z offset (altura da superfície)" suffix="mm" value={state.bed.zOffset} onChange={(z) => upd((s) => ({ ...s, bed: { ...s.bed, zOffset: z } }))} step={0.1} />
                </div>)}
              </div>
              <p className="text-xs text-gray-500">Área útil: <b className="text-gray-300">{ext.usableRound ? `Ø ${fmtDot(ext.usableW, 1)}` : `${fmtDot(ext.usableW, 1)} × ${fmtDot(ext.usableH, 1)}`} mm</b>{state.surface.kind === "multiwell" && " por poço"}. Centro da superfície = X{state.bed.cx} Y{state.bed.cy} da mesa.</p>
            </div>
          )}

          {/* ───── 2 DESENHO / OBJETOS ───── */}
          {step === "objects" && (
            <div className="space-y-4">
              <div><h2 className="text-xl font-bold">2 · Desenhe ou escolha objetos</h2><p className="text-sm text-gray-400">Desenhe direto sobre a área útil (contorno fechado vira peça sólida com altura) ou adicione formas prontas. Cada objeto é atribuído a um cabeçote. Em placas multiwell, o conjunto é replicado em cada poço selecionado.</p></div>
              <div className={cardCls + " space-y-3"}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-gray-400">Novos objetos vão para:</span>
                  <div className="flex gap-1">{state.heads.map((h) => <button key={h.id} data-testid={`pb-draw-head-${h.id}`} onClick={() => setDrawHead(h.id)} className={`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 ${drawHead === h.id ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-gray-400"} ${h.enabled ? "" : "opacity-50"}`}><span className="w-2 h-2 rounded-full" style={{ background: h.color }} />T{h.id - 1} · {h.label}</button>)}</div>
                  <label className="flex items-center gap-2 text-xs text-gray-400 ml-auto">Altura <input data-testid="pb-draw-height" type="number" step={0.1} min={0} value={drawHeight} onChange={(e) => setDrawHeight(Math.max(0, parseFloat(e.target.value) || 0))} className="w-16 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-sm text-gray-100" /> mm</label>
                </div>
                <DrawCanvas state={state} head={drawHead} height={drawHeight} onAdd={(sh) => upd((st) => ({ ...st, shapes: [...st.shapes, sh] }))} onRemoveLast={() => upd((st) => ({ ...st, shapes: st.shapes.slice(0, -1) }))} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1.5 mr-1"><Shapes className="w-3.5 h-3.5" /> Formas prontas:</span>
                {([["disc", "Disco"], ["square", "Quadrado"], ["ring", "Anel"], ["curve", "Meia curva (anatômica)"], ["lattice", "Malha (scaffold)"], ["lines", "Linhas"]] as [ShapeType, string][]).map(([t, l]) => (
                  <button key={t} data-testid={`pb-add-${t}`} onClick={() => upd((st) => ({ ...st, shapes: [...st.shapes, { ...defaultShape(t, drawHead), height: t === "lines" ? 0 : drawHeight }] }))} className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/50 text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />{l}</button>
                ))}
              </div>
              {state.shapes.length === 0 && <div className={cardCls + " text-sm text-gray-400"}>Nenhum objeto ainda. Desenhe acima ou adicione uma forma pronta.</div>}
              <div className="space-y-2">
              {state.shapes.map((s) => {
                const hd = state.heads[s.head - 1]
                const drawn = s.type === "polygon" || s.type === "path"
                return (
                  <details key={s.id} data-testid="pb-shape" className={cardCls + " group"} open={!drawn}>
                    <summary className="flex items-center gap-3 cursor-pointer list-none">
                      <ShapeThumb s={s} color={hd?.color ?? "#fff"} />
                      <div className="flex-1 min-w-0">
                        <input className="bg-transparent border-b border-transparent hover:border-white/10 focus:border-violet-400/60 focus:outline-none text-sm font-semibold w-full" value={s.name} onClick={(e) => e.preventDefault()} onChange={(e) => setShape(s.id, { name: e.target.value })} />
                        <div className="text-[11px] text-gray-500 truncate">{describeShape(s)} · <span style={{ color: hd?.color }}>T{s.head - 1}</span></div>
                      </div>
                      {(s.type === "disc" || s.type === "square" || s.type === "ring" || s.type === "polygon" || s.type === "curve") && <button type="button" onClick={(e) => { e.preventDefault(); setShape(s.id, { solid: !s.solid }) }} className={`px-2 py-1 rounded-md text-[10px] border ${s.solid ? "border-violet-400/50 bg-violet-500/15 text-violet-100" : "border-white/10 text-gray-400"}`}>{s.solid ? "Sólido" : "Só contorno"}</button>}
                      <button type="button" onClick={(e) => { e.preventDefault(); removeShape(s.id) }} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                    </summary>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-white/5">
                      <Sel label="Cabeçote" value={s.head} onChange={(x) => setShape(s.id, { head: +x })} options={state.heads.map((h) => ({ v: h.id, l: `T${h.id - 1} · ${h.label}${h.enabled ? "" : " (off)"}` }))} />
                      {!drawn && <Num label={s.type === "disc" || s.type === "ring" ? "Ø externo" : s.type === "lines" ? "Comprimento" : "Lado"} suffix="mm" value={s.size} onChange={(x) => setShape(s.id, { size: x })} step={0.5} min={0.5} />}
                      {s.type === "ring" && <Num label="Ø interno" suffix="mm" value={s.size2} onChange={(x) => setShape(s.id, { size2: x })} step={0.5} min={0.2} />}
                      {s.type === "curve" && (<><Num label="Curvatura" suffix="0–0,95" value={s.size2} onChange={(x) => setShape(s.id, { size2: Math.max(0, Math.min(0.95, x)) })} step={0.05} min={0} max={0.95} /><Num label="Variação (semente)" value={s.count} onChange={(x) => setShape(s.id, { count: Math.max(1, Math.round(x)) })} min={1} max={99} /></>)}
                      {s.type === "lattice" && <Num label="Passo dos filetes" suffix="mm" value={s.size2} onChange={(x) => setShape(s.id, { size2: x })} step={0.1} min={0.1} />}
                      {s.type === "lines" && (<><Num label="Espaçamento" suffix="mm" value={s.size2} onChange={(x) => setShape(s.id, { size2: x })} step={0.5} min={0.1} /><Num label="Nº de linhas" value={s.count} onChange={(x) => setShape(s.id, { count: Math.max(1, Math.round(x)) })} min={1} max={50} /></>)}
                      {s.type !== "lines" && s.type !== "path" && <Num label="Altura" suffix="mm" value={s.height} onChange={(x) => setShape(s.id, { height: x })} step={0.1} min={0} />}
                      <Num label="Deslocar X" suffix="mm" value={s.x} onChange={(x) => setShape(s.id, { x })} step={0.5} />
                      <Num label="Deslocar Y" suffix="mm" value={s.y} onChange={(y) => setShape(s.id, { y })} step={0.5} />
                    </div>
                  </details>
                )
              })}
              </div>
            </div>
          )}

          {/* ───── 3 CAMADAS ───── */}
          {step === "layers" && (
            <div className="space-y-4">
              <div><h2 className="text-xl font-bold">3 · Camadas e preenchimento</h2><p className="text-sm text-gray-400">Altura de camada ≈ diâmetro interno da agulha. Primeira camada mais baixa melhora a adesão.</p></div>
              <div className={cardCls + " grid grid-cols-2 sm:grid-cols-3 gap-3"}>
                <Num label="Altura de camada" suffix="mm" value={state.layerSettings.layerHeight} onChange={(x) => setLS({ layerHeight: x })} step={0.01} min={0.05} max={3} testId="pb-layer-height" />
                <Num label={`Primeira camada (${fmtDot(firstLayerH(state.layerSettings), 3)} mm)`} suffix="%" value={state.layerSettings.firstLayerPct} onChange={(x) => setLS({ firstLayerPct: x })} min={20} max={200} />
                <Num label="Perímetros" value={state.layerSettings.perimeters} onChange={(x) => setLS({ perimeters: Math.max(0, Math.round(x)) })} min={0} max={10} />
              </div>
              <div className={cardCls + " space-y-3"}>
                <div><span className={labelCls}>Padrão de preenchimento</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="pb-infill">
                    {INFILL.map((i) => { const on = state.layerSettings.infillPattern === i.id
                      return <button key={i.id} data-testid={`pb-infill-${i.id}`} onClick={() => setLS({ infillPattern: i.id })} title={i.hint} className={`rounded-xl border p-2.5 text-left transition-colors ${on ? "border-violet-400/70 bg-violet-500/15" : "border-white/10 bg-white/[0.02] hover:border-white/25"}`}>
                        <InfillIcon id={i.id} active={on} />
                        <div className="text-xs font-semibold mt-1.5">{i.label}</div></button> })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">{INFILL.find((i) => i.id === state.layerSettings.infillPattern)?.hint}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Num label="Densidade" suffix="%" value={state.layerSettings.infillDensity} onChange={(x) => setLS({ infillDensity: x })} min={0} max={100} />
                  <Num label="Ângulo" suffix="°" value={state.layerSettings.infillAngle} onChange={(x) => setLS({ infillAngle: x })} min={0} max={180} step={5} />
                  <div className="flex items-end pb-1"><Toggle label="Alternar 90° a cada camada" checked={state.layerSettings.alternate} onChange={(x) => setLS({ alternate: x })} /></div>
                </div>
              </div>
              <ZonesPanel state={state} setLS={setLS} />
              <p className="text-xs text-gray-500"><b className="text-gray-300">{nLayers}</b> camada(s) físicas para a altura máxima de {fmtDot(state.shapes.reduce((h, s) => Math.max(h, s.height), 0), 2)} mm. Use o controle deslizante do painel ao lado para inspecionar camada por camada.</p>
            </div>
          )}

          {/* ───── 4 CABEÇOTES ───── */}
          {step === "heads" && <HeadsStep state={state} curHead={curHead} setCurHead={setCurHead} setHead={setHead} />}

          {/* ───── 5 IMPRESSORA ───── */}
          {step === "printer" && (
            <div className="space-y-4">
              <div><h2 className="text-xl font-bold">5 · Impressora</h2><p className="text-sm text-gray-400">Ajustes gerais do firmware Marlin (Ender/Creality e similares adaptados).</p></div>
              <StrategyCard strat={strat} setStrat={setStrat} />
              <div className={cardCls + " space-y-4"}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Num label="Velocidade de deslocamento" suffix="mm/s" value={state.printer.travelSpeed} onChange={(x) => setPrinter({ travelSpeed: x })} min={1} max={300} />
                  <label className="block"><span className={labelCls}>Nome do protocolo</span><input className={inputCls} value={state.protocolName} onChange={(e) => upd((s) => ({ ...s, protocolName: e.target.value }))} data-testid="pb-protocol-name" /></label>
                </div>
                <Toggle label="Fazer home (G28) no início" checked={state.printer.homeFirst} onChange={(x) => setPrinter({ homeFirst: x })} />
                <Toggle label="Luzes da câmara (M355)" checked={state.printer.chamberLights} onChange={(x) => setPrinter({ chamberLights: x })} />
                <div className="grid sm:grid-cols-[auto_1fr] gap-3 items-end"><Toggle label="Controle de temperatura da mesa" checked={state.printer.bedTempControl} onChange={(x) => setPrinter({ bedTempControl: x })} />{state.printer.bedTempControl && <Num label="Temperatura da mesa" suffix="°C" value={state.printer.bedTemp} onChange={(x) => setPrinter({ bedTemp: x })} min={0} max={120} />}</div>
                <div className="space-y-3">
                  <Toggle label="Fotorreticulação (UV)" hint="Aciona o LED UV via pino (M42) no fim ou a cada camada." checked={state.printer.photocrosslinking} onChange={(x) => setPrinter({ photocrosslinking: x })} />
                  {state.printer.photocrosslinking && (<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Num label="Comprimento de onda" suffix="nm" value={state.printer.uvNm} onChange={(x) => setPrinter({ uvNm: x })} />
                    <Num label="Tempo" suffix="s" value={state.printer.uvSeconds} onChange={(x) => setPrinter({ uvSeconds: x })} min={1} />
                    <Sel label="Quando" value={state.printer.uvEvery} onChange={(x) => setPrinter({ uvEvery: x as "end" | "layer" })} options={[{ v: "end", l: "No fim" }, { v: "layer", l: "A cada camada" }]} />
                    <label className="block"><span className={labelCls}>Cmd ligar</span><input className={inputCls + " font-mono"} value={state.printer.uvOnCmd} onChange={(e) => setPrinter({ uvOnCmd: e.target.value })} /></label>
                    <label className="block"><span className={labelCls}>Cmd desligar</span><input className={inputCls + " font-mono"} value={state.printer.uvOffCmd} onChange={(e) => setPrinter({ uvOffCmd: e.target.value })} /></label>
                  </div>)}
                </div>
              </div>
            </div>
          )}

          {/* ───── 6 RESUMO / G-CODE ───── */}
          {step === "summary" && <SummaryStep state={state} v={v} result={result} busy={busy} charged={charged} error={error} slice={slice} download={download} toExecute={toExecute} />}

          {/* ───── 7 IMPRIMIR ───── */}
          {step === "print" && <PrintStep state={state} gcode={result && (!charged || charged.ok) ? result.gcode : null} hasGcode={!!result && (!charged || charged.ok)} onApplyState={(fn) => upd(fn)} />}

          <footer className="flex items-center justify-between pt-2">
            <button onClick={() => go(-1)} disabled={stepIdx === 0} className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-30 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Anterior</button>
            {stepIdx < STEPS.length - 1
              ? <button data-testid="pb-next" onClick={() => go(1)} className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold flex items-center gap-2">{STEPS[stepIdx + 1].label} <ArrowRight className="w-4 h-4" /></button>
              : <span />}
          </footer>
        </section>

        {/* ───── painel lateral: preview + status ───── */}
        <aside className="space-y-3 lg:sticky lg:top-[112px] self-start">
          <View3D state={state} layers={previewLayers} layerIdx={layerIdx} onLayerIdx={setLayerIdx} />
          {step !== "print" && (
            <div className={cardCls + " space-y-2.5"} data-testid="pb-key-params">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5"><Settings2 className="w-3 h-3" /> Parâmetros principais <span className="text-gray-600 normal-case tracking-normal">· editáveis aqui</span></div>
              <div className="grid grid-cols-2 gap-2">
                <Num label="Altura de camada" suffix="mm" value={state.layerSettings.layerHeight} onChange={(x) => setLS({ layerHeight: x })} step={0.01} min={0.05} max={3} testId="pb-key-layer-height" />
                <Num label="Densidade" suffix="%" value={state.layerSettings.infillDensity} onChange={(x) => setLS({ infillDensity: x })} min={0} max={100} testId="pb-key-density" />
                <div className="col-span-2"><Sel label="Preenchimento" value={state.layerSettings.infillPattern} onChange={(x) => setLS({ infillPattern: x as InfillPattern })} options={INFILL.map((i) => ({ v: i.id, l: i.label }))} testId="pb-key-infill" /></div>
              </div>
              <button type="button" data-testid="pb-key-continuous" onClick={() => setStrat({ continuous: !strat.continuous })} className={`w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${strat.continuous ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-black/20 text-gray-400 hover:border-white/20"}`}>
                <Route className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1"><b className="font-semibold">Trajetória contínua</b> <span className="opacity-70">· {strat.continuous ? (strat.maxBridge > 0 ? `emendas ≤ ${fmtDot(strat.maxBridge, 1)} mm` : "sem levantar na peça") : "padrão (levanta/retrai entre linhas)"}</span></span>
                <span className={`w-8 h-4 rounded-full relative transition ${strat.continuous ? "bg-emerald-400" : "bg-white/15"}`}><span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition ${strat.continuous ? "left-4" : "left-0.5"}`} /></span>
              </button>
              <div>
                <span className={labelCls}>Velocidade de impressão <span className="text-gray-500 normal-case tracking-normal">(mm/s · por cabeçote)</span></span>
                <div className="space-y-1.5">
                  {state.heads.filter((h) => h.enabled).map((h) => (
                    <div key={h.id} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: h.color }} /><span className="text-[11px] text-gray-400 w-24 truncate">T{h.id - 1} · {h.label}</span>
                      <input data-testid={`pb-key-speed-${h.id}`} type="number" step={0.5} min={0.5} max={200} value={h.speed} onChange={(e) => { const v = parseFloat(e.target.value.replace(",", ".")); if (Number.isFinite(v)) setHead(h.id, { speed: v }) }} className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-sm text-gray-100 text-right" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className={cardCls + " text-xs space-y-1.5"}>
            <div className="flex justify-between"><span className="text-gray-400">Superfície</span><span className="text-gray-200 text-right">{ext.label}</span></div>
            {state.surface.kind === "multiwell" && <div className="flex justify-between"><span className="text-gray-400">Poços</span><span className="text-gray-200">{offs.length} ({offs.slice(0, 6).map((w) => w.name).join(", ")}{offs.length > 6 ? "…" : ""})</span></div>}
            <div className="flex justify-between"><span className="text-gray-400">Objetos</span><span className="text-gray-200">{state.shapes.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Camadas</span><span className="text-gray-200">{nLayers}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Cabeçotes ativos</span><span className="flex gap-1">{state.heads.filter((h) => h.enabled).map((h) => <span key={h.id} className="px-1.5 rounded text-[10px] font-semibold text-white" style={{ background: h.color }}>T{h.id - 1} · {h.extrusionMode === "pneumatic" ? "pneu" : h.extrusionMode === "volumetric" ? "vol" : "fil"}</span>)}</span></div>
          </div>
          {(v.errors.length > 0 || v.warnings.length > 0) && (
            <div className="space-y-1.5" data-testid="pb-validation">
              {v.errors.map((e, i) => <div key={"e" + i} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{e}</div>)}
              {v.warnings.map((w, i) => <div key={"w" + i} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex gap-2"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</div>)}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

/* ─────────────── Zonas de preenchimento ("sanduíche") ─────────────── */
function ZonesPanel({ state, setLS }: { state: BasicState; setLS: (p: Partial<BasicState["layerSettings"]>) => void }) {
  const zones = state.layerSettings.zones ?? []
  const H = Math.max(state.layerSettings.layerHeight, state.shapes.reduce((h, s) => Math.max(h, s.height), 0))
  const setZone = (id: string, patch: Partial<InfillZone>) => setLS({ zones: zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })
  const remove = (id: string) => setLS({ zones: zones.filter((z) => z.id !== id) })
  const add = () => { const last = zones[zones.length - 1]; const from = last ? Math.min(last.zTo, H) : 0; setLS({ zones: [...zones, { id: uid(), zFrom: +from.toFixed(2), zTo: +Math.max(from + state.layerSettings.layerHeight, H).toFixed(2), pattern: "grid", density: 25, label: `Zona ${zones.length + 1}` }] }) }
  const sorted = zones.slice().sort((a, b) => a.zFrom - b.zFrom)
  const colors = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899", "#22c55e", "#f97316"]
  return (
    <div className={cardCls + " space-y-3"} data-testid="pb-zones">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-sm font-semibold flex items-center gap-2"><Layers className="w-4 h-4 text-violet-300" /> Preenchimento por altura <span className="text-[10px] font-normal text-gray-500">(sanduíche)</span></h3>
          <p className="text-[11px] text-gray-500">Divida a altura em zonas com padrões/densidades diferentes — ex.: base densa, núcleo poroso, topo denso. Fora das zonas vale o padrão acima.</p></div>
        <div className="flex flex-wrap gap-1.5">
          <button data-testid="pb-zone-preset-dpd" onClick={() => setLS({ zones: sandwichPreset("dense-porous-dense", H, state.layerSettings) })} className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/50 text-[11px]">Denso · poroso · denso</button>
          <button onClick={() => setLS({ zones: sandwichPreset("gradient", H, state.layerSettings) })} className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/50 text-[11px]">Gradiente 45→15%</button>
          <button onClick={() => setLS({ zones: sandwichPreset("two-materials", H, state.layerSettings) })} className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/50 text-[11px]">2 materiais (T0/T1)</button>
          <button data-testid="pb-zone-add" onClick={add} className="px-2.5 py-1.5 rounded-lg border border-violet-400/40 bg-violet-500/10 text-violet-100 text-[11px] flex items-center gap-1"><Plus className="w-3 h-3" /> Zona</button>
          {zones.length > 0 && <button onClick={() => setLS({ zones: [] })} className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-red-400/40 text-[11px] text-gray-400">Limpar</button>}
        </div>
      </div>
      {sorted.length > 0 && (
        <div className="grid sm:grid-cols-[80px_1fr] gap-3">
          {/* barra vertical da altura */}
          <div className="relative h-full min-h-[140px] rounded-lg bg-black/30 border border-white/5 overflow-hidden" title="Altura total">
            {sorted.map((z, i) => { const top = Math.max(0, Math.min(H, z.zFrom)), bot = Math.max(0, Math.min(H, z.zTo)); if (bot <= top) return null
              return <div key={z.id} className="absolute left-0 right-0 flex items-center justify-center text-[9px] font-semibold text-white/90" style={{ bottom: `${(top / H) * 100}%`, height: `${((bot - top) / H) * 100}%`, background: colors[i % colors.length] + "aa", borderTop: "1px solid rgba(255,255,255,.25)" }}>{INFILL.find((p) => p.id === z.pattern)?.label} {z.density}%</div> })}
            <div className="absolute top-1 right-1 text-[9px] text-gray-400">{H.toFixed(1)} mm</div><div className="absolute bottom-1 right-1 text-[9px] text-gray-400">0</div>
          </div>
          <div className="space-y-2">
            {sorted.map((z, i) => (
              <div key={z.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                <label className="block sm:col-span-6 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colors[i % colors.length] }} /><input className="bg-transparent border-b border-white/10 focus:border-violet-400/60 focus:outline-none text-xs font-semibold flex-1" value={z.label ?? ""} placeholder="Nome da zona" onChange={(e) => setZone(z.id, { label: e.target.value })} /><button onClick={() => remove(z.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></label>
                <Num label="De" suffix="mm" value={z.zFrom} onChange={(x) => setZone(z.id, { zFrom: x })} step={0.1} min={0} />
                <Num label="Até" suffix="mm" value={z.zTo} onChange={(x) => setZone(z.id, { zTo: x })} step={0.1} min={0} />
                <div className="col-span-2"><Sel label="Padrão" value={z.pattern} onChange={(x) => setZone(z.id, { pattern: x as InfillPattern })} options={INFILL.map((p) => ({ v: p.id, l: p.label }))} /></div>
                <Num label="Densidade" suffix="%" value={z.density} onChange={(x) => setZone(z.id, { density: x })} min={0} max={100} />
                <Sel label="Cabeçote do infill" value={z.head ?? 0} onChange={(x) => setZone(z.id, { head: +x || undefined })} options={[{ v: 0, l: "= do objeto" }, ...state.heads.map((h) => ({ v: h.id, l: `T${h.id - 1} · ${h.label}` }))]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Ícones dos padrões de preenchimento ─────────────── */
function InfillIcon({ id, active }: { id: InfillPattern; active: boolean }) {
  const c = active ? "#c4b5fd" : "#8b8ba7"
  const common = { fill: "none", stroke: c, strokeWidth: 1.2, strokeLinecap: "round" as const }
  return (
    <svg viewBox="0 0 40 40" className="w-full h-10">
      <rect x={2} y={2} width={36} height={36} rx={4} fill={active ? "#7c3aed22" : "#ffffff08"} stroke={c} strokeWidth={0.8} />
      {id === "grid" && <g {...common}>{[10, 20, 30].map((v) => <g key={v}><line x1={v} y1={5} x2={v} y2={35} /><line x1={5} y1={v} x2={35} y2={v} /></g>)}</g>}
      {id === "linear" && <g {...common}>{[8, 14, 20, 26, 32].map((v) => <line key={v} x1={6} y1={v} x2={34} y2={v} />)}</g>}
      {id === "meandering" && <path {...common} d="M6 8 H34 V14 H6 V20 H34 V26 H6 V32 H34" />}
      {id === "gyroid" && <g {...common}>{[0, 1].map((r) => <path key={r} d={Array.from({ length: 41 }, (_, i) => { const x = 5 + (i / 40) * 30; const y = 20 + (r ? -1 : 1) * 6 * Math.sin((x - 5) / 30 * Math.PI * 2) + (r ? -7 : 7); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}` }).join(" ")} />)}<path d={Array.from({ length: 41 }, (_, i) => { const x = 5 + (i / 40) * 30; const y = 20 + 5 * Math.cos((x - 5) / 30 * Math.PI * 2); return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}` }).join(" ")} /></g>}
      {id === "honeycomb" && <g {...common}>{[[12, 12], [28, 12], [20, 26]].map(([x, y], i) => <polygon key={i} points={Array.from({ length: 6 }, (_, k) => { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; return `${x + 7 * Math.cos(a)},${y + 7 * Math.sin(a)}` }).join(" ")} />)}</g>}
      {id === "concentric" && <g {...common}>{[15, 10, 5].map((r) => <circle key={r} cx={20} cy={20} r={r} />)}</g>}
      {id === "spiral" && <path {...common} d={Array.from({ length: 80 }, (_, i) => { const t = i / 79; const a = t * Math.PI * 7; const r = 2 + t * 13; return `${i ? "L" : "M"}${(20 + r * Math.cos(a)).toFixed(1)} ${(20 + r * Math.sin(a)).toFixed(1)}` }).join(" ")} />}
      {id === "none" && <circle {...common} cx={20} cy={20} r={13} strokeDasharray="3 2" />}
    </svg>
  )
}

/* ─────────────── Seletor de poços ─────────────── */
function WellPicker({ wells, selected, onChange }: { wells: number; selected: string[]; onChange: (s: string[]) => void }) {
  const sp = MULTIWELL.find((m) => m.id === wells) ?? MULTIWELL[2]
  const all = allWells(sp)
  const set = new Set(selected.map((s) => s.toUpperCase()))
  const toggle = (n: string) => { const ns = new Set(set); if (ns.has(n)) ns.delete(n); else ns.add(n); onChange(Array.from(ns)) }
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${sp.cols}, minmax(0,1fr))`, maxWidth: sp.cols * 44 }}>
        {all.map((w) => <button key={w.name} data-testid={`pb-well-${w.name}`} onClick={() => toggle(w.name)} className={`aspect-square rounded-full text-[10px] font-semibold border transition-colors ${set.has(w.name) ? "bg-violet-500 border-violet-400 text-white" : "bg-white/[0.04] border-white/10 text-gray-400 hover:border-white/30"}`}>{sp.id <= 48 ? w.name : ""}</button>)}
      </div>
      <div className="flex gap-2 mt-2 text-xs">
        <button onClick={() => onChange([])} className="text-violet-300 hover:underline">Todos</button>
        <button onClick={() => onChange([all[0].name])} className="text-violet-300 hover:underline">Só A1</button>
        <button onClick={() => onChange(all.filter((_, i) => i % sp.cols === 0).map((w) => w.name))} className="text-violet-300 hover:underline">Coluna 1</button>
        <button onClick={() => onChange(all.filter((_, i) => i < sp.cols).map((w) => w.name))} className="text-violet-300 hover:underline">Linha A</button>
      </div>
    </div>
  )
}

/* ─────────────── 4 · Cabeçotes (racional MIA: tipo → modo de extrusão → firmware) ─────────────── */
function HeadsStep({ state, curHead, setCurHead, setHead }: { state: BasicState; curHead: number; setCurHead: (n: number) => void; setHead: (id: number, p: Partial<Head>) => void }) {
  const h = state.heads[curHead - 1] ?? state.heads[0]
  const usedInDesign = state.shapes.some((s) => s.head === h.id)
  const type = HEAD_TYPES.find((t) => t.id === h.type) ?? HEAD_TYPES[0]
  const onType = (id: string) => { const t = HEAD_TYPES.find((x) => x.id === id); if (t) setHead(h.id, { type: id, extrusionMode: t.ext }) }
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold">4 · Cabeçotes de impressão</h2><p className="text-sm text-gray-400">Até 3 cabeçotes (T0, T1, T2). Para cada um, defina a agulha, os parâmetros de impressão e <b className="text-gray-200">como o firmware aciona a extrusão</b>: pneumática (válvula), mecânica/volumétrica (bomba de seringa, E em mm³) ou filamento (E em mm).</p></div>
      <div className="flex gap-1" data-testid="pb-head-tabs">
        {state.heads.map((x) => (
          <button key={x.id} data-testid={`pb-head-tab-${x.id}`} onClick={() => setCurHead(x.id)} className={`px-3 py-2 rounded-t-xl text-sm flex items-center gap-2 border border-b-0 ${x.id === curHead ? "bg-white/[0.06] border-white/15 text-white" : "border-transparent text-gray-400 hover:text-gray-200"} ${x.enabled ? "" : "opacity-60"}`}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: x.color }} />T{x.id - 1} · {x.label}{!x.enabled && <span className="text-[10px] text-gray-500">(off)</span>}
          </button>
        ))}
      </div>
      <div className="rounded-2xl rounded-tl-none border border-white/10 bg-white/[0.03] p-4 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="block flex-1 min-w-[180px]"><span className={labelCls}>Nome / biotinta</span><input className={inputCls} value={h.label} onChange={(e) => setHead(h.id, { label: e.target.value })} placeholder="ex.: GelMA 7% + células" /></label>
          <Toggle label={h.enabled ? "Ativo" : "Desativado"} checked={h.enabled} onChange={(x) => setHead(h.id, { enabled: x })} />
        </div>
        {usedInDesign && !h.enabled && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5" /> Este cabeçote é usado por um objeto — ative-o.</div>}

        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-2">Configuração do cabeçote</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3"><Sel label="Tipo de cabeçote" value={h.type} onChange={onType} options={HEAD_TYPES.map((t) => ({ v: t.id, l: t.label }))} testId="pb-head-type" /><p className="text-xs text-gray-500 mt-1">{type.hint}</p></div>
            <Sel label="Agulha" value={h.gauge} onChange={(g) => setHead(h.id, { gauge: +g, lineWidth: GAUGES[+g] })} options={Object.keys(GAUGES).map((g) => ({ v: +g, l: `${g} G (Ø ${fmtDot(GAUGES[+g], 2)} mm)` }))} testId="pb-head-gauge" />
            <Num label="Largura do filete" suffix="mm" value={h.lineWidth} onChange={(x) => setHead(h.id, { lineWidth: x })} step={0.01} min={0.05} />
            <Num label="Velocidade de impressão" suffix="mm/s" value={h.speed} onChange={(x) => setHead(h.id, { speed: x })} step={0.5} min={0.5} max={200} />
            {h.extrusionMode === "pneumatic" && <Num label="Pressão" suffix="kPa" value={h.pressure} onChange={(x) => setHead(h.id, { pressure: x })} step={0.5} min={0} max={700} />}
            <Num label="Temperatura (0 = off)" suffix="°C" value={h.temp} onChange={(x) => setHead(h.id, { temp: x })} min={0} max={300} />
            {h.extrusionMode === "pneumatic" && <Num label="Atraso de fluxo" suffix="s" value={h.flowDelay} onChange={(x) => setHead(h.id, { flowDelay: x })} step={0.05} min={0} max={5} />}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-200 mb-1">Extrusão (firmware)</h3>
          <p className="text-xs text-gray-500 mb-2">Como o firmware (Marlin) deve acionar este cabeçote — copiado do racional MIA.</p>
          <div className="grid sm:grid-cols-3 gap-2 mb-3" data-testid="pb-ext-mode">
            {([["pneumatic", "Pneumático", "válvula on/off · sem eixo E"], ["volumetric", "Mecânico · volumétrico", "bomba de seringa · E em mm³ (M200 D0)"], ["filament", "Filamento", "E em mm de filamento (M83)"]] as [Head["extrusionMode"], string, string][]).map(([m, l, d]) => (
              <button key={m} data-testid={`pb-ext-${m}`} onClick={() => setHead(h.id, { extrusionMode: m })} className={`rounded-xl border p-3 text-left ${h.extrusionMode === m ? "border-violet-400/70 bg-violet-500/15" : "border-white/10 hover:border-white/25"}`}><div className="text-sm font-semibold">{l}</div><div className="text-[11px] text-gray-400">{d}</div></button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {h.extrusionMode === "pneumatic" ? (<>
              <label className="block"><span className={labelCls}>Comando ligar</span><input className={inputCls + " font-mono"} value={h.onCmd} onChange={(e) => setHead(h.id, { onCmd: e.target.value })} data-testid="pb-on-cmd" /></label>
              <label className="block"><span className={labelCls}>Comando desligar</span><input className={inputCls + " font-mono"} value={h.offCmd} onChange={(e) => setHead(h.id, { offCmd: e.target.value })} /></label>
              <label className="block"><span className={labelCls}>Comando de pressão <span className="normal-case tracking-normal text-gray-500">({"{kPa} {head}"})</span></span><input className={inputCls + " font-mono"} placeholder="ex.: M42 P{head} S{kPa}" value={h.pressureCmd} onChange={(e) => setHead(h.id, { pressureCmd: e.target.value })} /></label>
            </>) : (<>
              {h.extrusionMode === "filament" && <Num label="Ø do filamento" suffix="mm" value={h.filamentD} onChange={(x) => setHead(h.id, { filamentD: x })} step={0.05} min={0.5} testId="pb-filament-d" />}
              <Num label="Fluxo" suffix="%" value={h.flow} onChange={(x) => setHead(h.id, { flow: x })} min={10} max={300} />
              <Num label="Retração" suffix={h.extrusionMode === "filament" ? "mm" : "mm³"} value={h.retract} onChange={(x) => setHead(h.id, { retract: x })} step={0.1} min={0} />
            </>)}
            <Num label="Z-hop" suffix="mm" value={h.zHop} onChange={(x) => setHead(h.id, { zHop: x })} step={0.1} min={0} />
            <Num label="Offset X" suffix="mm" value={h.offsetX} onChange={(x) => setHead(h.id, { offsetX: x })} step={0.01} />
            <Num label="Offset Y" suffix="mm" value={h.offsetY} onChange={(x) => setHead(h.id, { offsetY: x })} step={0.01} />
          </div>
          <div className="mt-3 rounded-lg bg-black/30 border border-white/5 p-3 text-[11px] font-mono text-gray-400 leading-relaxed" data-testid="pb-ext-explain">
            {h.extrusionMode === "pneumatic" && <>T{h.id - 1} → {h.pressureCmd ? h.pressureCmd.replace("{kPa}", String(h.pressure)).replace("{head}", String(h.id - 1)) + " · " : ""}<span className="text-emerald-300">{h.onCmd || "?"}</span> antes de cada filete · <span className="text-red-300">{h.offCmd || "?"}</span> ao final · G1 X Y F{Math.round(h.speed * 60)} sem E.</>}
            {h.extrusionMode === "volumetric" && <>T{h.id - 1} → <span className="text-emerald-300">M200 D0</span> + <span className="text-emerald-300">M83</span> · cada G1 leva E = comprimento × {fmtDot(lineWidthOf(h), 2)} mm × altura da camada × {h.flow}% (mm³) · retração {fmtDot(h.retract, 2)} mm³.</>}
            {h.extrusionMode === "filament" && <>T{h.id - 1} → <span className="text-emerald-300">M83</span> · E = volume ÷ (π·({fmtDot(h.filamentD, 2)}/2)²) mm de filamento · retração {fmtDot(h.retract, 2)} mm{h.temp > 0 ? ` · M104/M109 T${h.id - 1} S${h.temp}` : ""}.</>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── 6 · Resumo + G-code ─────────────── */
function SummaryStep({ state, v, result, busy, charged, error, slice, download, toExecute }: {
  state: BasicState; v: { errors: string[]; warnings: string[] }; result: { gcode: string; stats: GcodeStats } | null; busy: boolean
  charged: { ok: boolean; msg: string } | null; error: string | null; slice: () => void; download: () => void; toExecute: () => void
}) {
  const sum = result ? summarize(state, result.stats) : null
  const strat: PathStrategy = { ...DEFAULT_STRATEGY, ...(state.printer.strategy ?? {}) }
  const used = state.heads.filter((h) => h.enabled && state.shapes.some((s) => s.head === h.id))
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold">6 · Resumo e G-code</h2><p className="text-sm text-gray-400">Revise e gere o G-code Marlin. 6 créditos por G-code (mesma regra do BioSlicer).</p></div>
      <div className={cardCls + " grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm"}>
        <div><span className="text-gray-500 text-xs block">Protocolo</span>{state.protocolName}</div>
        <div><span className="text-gray-500 text-xs block">Superfície</span>{surfaceExtent(state.surface).label}{state.surface.kind === "multiwell" && ` · ${wellOffsets(state.surface).length} poço(s)`}</div>
        <div className="sm:col-span-2"><span className="text-gray-500 text-xs block">Objetos</span><ul className="list-disc pl-5">{state.shapes.map((s) => <li key={s.id}>{s.name || s.type}: {describeShape(s)} <span className="text-gray-500">· T{s.head - 1}</span></li>)}</ul></div>
        <div><span className="text-gray-500 text-xs block">Camadas</span>{fmtDot(state.layerSettings.layerHeight, 3)} mm · {layerCount(state)} camadas · {INFILL.find((i) => i.id === state.layerSettings.infillPattern)?.label} {state.layerSettings.infillPattern !== "none" && `${state.layerSettings.infillDensity}%`} · {state.layerSettings.perimeters} perímetro(s)</div>
        <div><span className="text-gray-500 text-xs block">Trajetória</span>{strat.continuous ? <span className="text-emerald-300">Contínua · {strat.maxBridge > 0 ? `emendas até ${fmtDot(strat.maxBridge, 1)} mm` : "nunca levanta dentro da peça"}{strat.joinPerimeter ? " · perímetro emendado" : ""}{strat.continuousZ ? " · Z contínuo" : ""}</span> : "Padrão (levanta/retrai entre linhas)"}{strat.skirt ? ` · saia ${strat.skirtLoops}× a ${fmtDot(strat.skirtGap, 1)} mm${strat.liftAfterSkirt ? " (levanta + retrai após)" : ""}` : ""}</div>
        <div className="sm:col-span-2"><span className="text-gray-500 text-xs block">Cabeçotes</span>
          <ul className="space-y-0.5">{used.map((h) => <li key={h.id} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: h.color }} />T{h.id - 1} · {h.label} · {HEAD_TYPES.find((t) => t.id === h.type)?.label} · {h.gauge} G · {h.speed} mm/s · <b className="text-gray-200">{h.extrusionMode === "pneumatic" ? `pneumático ${h.pressure} kPa` : h.extrusionMode === "volumetric" ? "mecânico/volumétrico (mm³)" : `filamento Ø ${h.filamentD} mm`}</b></li>)}</ul>
        </div>
      </div>

      {v.errors.length > 0 && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">Corrija antes de gerar: {v.errors.join(" · ")}</div>}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <button data-testid="pb-generate" onClick={slice} disabled={busy || v.errors.length > 0} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center gap-2"><Zap className="w-4 h-4" />{busy ? "Gerando…" : result ? "Gerar novamente" : "Gerar G-code"}</button>
        {result && (<>
          <button data-testid="pb-download" onClick={download} className="px-4 py-2 rounded-lg border border-white/15 hover:border-emerald-400/40 text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Baixar .gcode</button>
          <button data-testid="pb-to-execute" onClick={toExecute} className="px-4 py-2 rounded-lg border border-white/15 hover:border-cyan-400/40 text-sm flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> Enviar para Fase 4 · Bioimpressão (USB)</button>
        </>)}
        {charged && <span className={`text-xs ${charged.ok ? "text-emerald-300" : "text-amber-300"}`}>{charged.msg}</span>}
      </div>

      {result && sum && (
        <div className="space-y-3" data-testid="pb-result">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center" data-testid="pb-stats">
            {[["Camadas", String(sum.layers)], ["Tempo est.", `${sum.minutes} min`], ["Volume", `${sum.volume_uL} µL`], ["Trajeto", `${sum.path_m} m`], ["Levantamentos", String(sum.travels)], ["Emendas contínuas", String(sum.bridges)]].map(([l, x]) => <div key={l} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="text-[10px] uppercase tracking-wider text-gray-500">{l}</div><div className={`text-lg font-bold ${l === "Emendas contínuas" && Number(x) > 0 ? "text-emerald-300" : ""}`}>{x}</div></div>)}
          </div>
          {result.stats.travels > 0 && !strat.continuous && <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><Route className="w-3 h-3" /> Quer menos paradas? Ative <b className="text-gray-300">Trajetória contínua</b> na etapa Impressora (ou no painel lateral) e gere de novo.</p>}
          <details className="rounded-xl border border-white/10 bg-black/30">
            <summary className="cursor-pointer px-4 py-2 text-sm text-gray-300">Ver G-code ({result.gcode.split("\n").length} linhas)</summary>
            <pre className="px-4 pb-4 text-[11px] font-mono text-gray-400 max-h-80 overflow-auto whitespace-pre">{result.gcode.split("\n").slice(0, 400).join("\n")}{result.gcode.split("\n").length > 400 ? "\n; … (baixe o arquivo para ver tudo)" : ""}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
