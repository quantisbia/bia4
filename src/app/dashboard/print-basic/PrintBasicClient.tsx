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
  Square, Trash2, Zap, AlertTriangle, Info, Gamepad2, RefreshCw, Target, FlaskConical,
} from "lucide-react"
import {
  type BasicState, type Shape, type ShapeType, type Head, type SurfaceKind, type ToolLayer,
  defaultState, defaultShape, describeShape, surfaceExtent, wellOffsets, allWells, MULTIWELL, PETRI, SLIDES,
  BED_ROUND, BED_SQUARE, GAUGES, HEAD_TYPES, INFILL, PLATE_W, PLATE_H, validate, buildToolpaths, generateGcode,
  layerCount, syncBed, fmtDot, lineWidthOf, firstLayerH, summarize, type GcodeStats,
} from "@/lib/print-basic/engine"
import { sendToExecute } from "@/lib/bioprint/execute-handoff"

const STORAGE_KEY = "bia.print-basic.state.v1"
const STEPS = [
  { id: "surface", label: "Superfície", icon: Target },
  { id: "objects", label: "Objetos", icon: Square },
  { id: "layers", label: "Camadas", icon: Layers },
  { id: "heads", label: "Cabeçotes", icon: FlaskConical },
  { id: "printer", label: "Impressora", icon: Settings2 },
  { id: "summary", label: "G-code", icon: Zap },
] as const
type StepId = (typeof STEPS)[number]["id"]

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

/* ─────────────── Preview SVG (vista superior) ─────────────── */
function SurfacePreview({ state, layers, layerIdx }: { state: BasicState; layers: ToolLayer[] | null; layerIdx: number }) {
  const ext = surfaceExtent(state.surface)
  const W = ext.w, Hh = ext.h
  const pad = 6
  const offs = wellOffsets(state.surface)
  const sp = state.surface.kind === "multiwell" ? MULTIWELL.find((m) => m.id === state.surface.wells) : null
  const toSvg = (x: number, y: number) => ({ x: x + W / 2, y: Hh / 2 - y })
  const L = layers?.[Math.min(layerIdx, (layers?.length ?? 1) - 1)]
  return (
    <svg data-testid="pb-preview" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${Hh + 2 * pad}`} className="w-full h-auto bg-[#0b0b14] rounded-xl border border-white/10" style={{ maxHeight: 360 }}>
      {/* contorno da superfície */}
      {ext.round
        ? <circle cx={W / 2} cy={Hh / 2} r={W / 2} fill="#141425" stroke="#5b5b7a" strokeWidth={0.6} />
        : <rect x={0} y={0} width={W} height={Hh} rx={state.surface.kind === "multiwell" ? 3 : 1} fill="#141425" stroke="#5b5b7a" strokeWidth={0.6} />}
      {/* poços (todos, destacando selecionados) */}
      {sp && allWells(sp).map((w) => {
        const c = toSvg(w.x, w.y); const sel = offs.some((o) => o.name === w.name)
        return <g key={w.name}><circle cx={c.x} cy={c.y} r={sp.wellD / 2} fill={sel ? "#1f1f3a" : "#10101c"} stroke={sel ? "#8b5cf6" : "#33334d"} strokeWidth={sel ? 0.5 : 0.3} />
          {sp.id <= 24 && <text x={c.x} y={c.y - sp.wellD / 2 + 3} fontSize={sp.id <= 12 ? 3 : 2.2} fill="#6b6b8a" textAnchor="middle">{w.name}</text>}</g>
      })}
      {/* área útil (quando não multiwell) */}
      {!sp && (ext.usableRound
        ? <circle cx={W / 2} cy={Hh / 2} r={ext.usableW / 2} fill="none" stroke="#8b5cf6" strokeWidth={0.3} strokeDasharray="1.5 1" />
        : <rect x={(W - ext.usableW) / 2} y={(Hh - ext.usableH) / 2} width={ext.usableW} height={ext.usableH} fill="none" stroke="#8b5cf6" strokeWidth={0.3} strokeDasharray="1.5 1" />)}
      {/* objetos / trajetórias replicados por poço */}
      {offs.map((o) => (
        <g key={o.name || "c"}>
          {L ? L.paths.map((p, i) => {
            const hd = state.heads[p.head - 1]
            const d = p.pts.map((q, k) => { const c = toSvg(q.x + o.x, q.y + o.y); return `${k ? "L" : "M"}${c.x.toFixed(2)} ${c.y.toFixed(2)}` }).join(" ") + (p.closed ? " Z" : "")
            return <path key={i} d={d} fill="none" stroke={hd?.color ?? "#fff"} strokeWidth={Math.max(0.15, lineWidthOf(hd) * 0.9)} strokeLinecap="round" opacity={0.9} />
          }) : state.shapes.map((s) => {
            const hd = state.heads[s.head - 1]; const c = toSvg(s.x + o.x, s.y + o.y)
            const col = hd?.color ?? "#fff"
            if (s.type === "disc" || s.type === "ring") return <g key={s.id}><circle cx={c.x} cy={c.y} r={s.size / 2} fill={s.type === "disc" ? col + "33" : "none"} stroke={col} strokeWidth={0.4} />{s.type === "ring" && <circle cx={c.x} cy={c.y} r={s.size2 / 2} fill="none" stroke={col} strokeWidth={0.4} />}</g>
            if (s.type === "lines") return <g key={s.id}>{Array.from({ length: s.count }).map((_, i) => { const y = c.y - ((-((s.count - 1) * s.size2) / 2) + i * s.size2); return <line key={i} x1={c.x - s.size / 2} x2={c.x + s.size / 2} y1={y} y2={y} stroke={col} strokeWidth={0.4} /> })}</g>
            return <rect key={s.id} x={c.x - s.size / 2} y={c.y - s.size / 2} width={s.size} height={s.size} fill={s.type === "square" ? col + "33" : "none"} stroke={col} strokeWidth={0.4} strokeDasharray={s.type === "lattice" ? "1 0.6" : undefined} />
          })}
        </g>
      ))}
      {/* origem */}
      <g opacity={0.5}><line x1={W / 2 - 3} x2={W / 2 + 3} y1={Hh / 2} y2={Hh / 2} stroke="#aaa" strokeWidth={0.2} /><line x1={W / 2} x2={W / 2} y1={Hh / 2 - 3} y2={Hh / 2 + 3} stroke="#aaa" strokeWidth={0.2} /></g>
    </svg>
  )
}

/* ─────────────── Página ─────────────── */
export function PrintBasicClient({ initialStep }: { initialStep?: string } = {}) {
  const [state, setState] = useState<BasicState>(() => defaultState())
  const [step, setStep] = useState<StepId>(() => (STEPS.some((s) => s.id === initialStep) ? (initialStep as StepId) : "surface"))
  const [curHead, setCurHead] = useState(1)
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
    if (step === "layers" || step === "objects") { try { return v.errors.length ? null : buildToolpaths(state).slice(0, 2) } catch { return null } }
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
            <Link href="/dashboard/bioprint/slice" className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/40 text-gray-300">Modo avançado (BioSlicer) →</Link>
            <button onClick={reset} title="Restaurar padrões" className="text-xs px-2 py-1.5 rounded-lg border border-white/10 hover:border-red-400/40 text-gray-400"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <nav aria-label="Etapas" className="px-4 sm:px-6 pb-3 max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {STEPS.map((s, i) => { const Icon = s.icon; const done = i < stepIdx; const active = s.id === step
            return <button key={s.id} data-testid={`pb-step-${s.id}`} onClick={() => setStep(s.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${active ? "bg-violet-500/20 text-violet-100 font-semibold" : "text-gray-400 hover:text-gray-200"}`}>
              <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold border ${done ? "bg-emerald-500 border-emerald-500 text-white" : active ? "bg-violet-500 border-violet-500 text-white" : "border-white/20"}`}>{done ? <Check className="w-3 h-3" /> : i + 1}</span>
              <Icon className="w-3.5 h-3.5" />{s.label}</button> })}
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

          {/* ───── 2 OBJETOS ───── */}
          {step === "objects" && (
            <div className="space-y-4">
              <div><h2 className="text-xl font-bold">2 · Objetos</h2><p className="text-sm text-gray-400">Formas simples, cada uma atribuída a um cabeçote. Em placas multiwell, o conjunto é replicado em cada poço selecionado.</p></div>
              <div className="flex flex-wrap gap-2">
                {([["disc", "Disco"], ["square", "Quadrado"], ["ring", "Anel"], ["lattice", "Malha (scaffold)"], ["lines", "Linhas"]] as [ShapeType, string][]).map(([t, l]) => (
                  <button key={t} data-testid={`pb-add-${t}`} onClick={() => addShape(t)} className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-violet-400/50 text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />{l}</button>
                ))}
              </div>
              {state.shapes.length === 0 && <div className={cardCls + " text-sm text-gray-400"}>Nenhum objeto. Adicione um disco, quadrado, anel, malha ou linhas.</div>}
              {state.shapes.map((s) => {
                const hd = state.heads[s.head - 1]
                return (
                  <div key={s.id} data-testid="pb-shape" className={cardCls + " space-y-3"}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: hd?.color }} />
                      <input className="bg-transparent border-b border-white/10 focus:border-violet-400/60 focus:outline-none text-sm font-semibold flex-1 min-w-0" value={s.name} onChange={(e) => setShape(s.id, { name: e.target.value })} />
                      <span className="text-xs text-gray-500 hidden sm:inline">{describeShape(s)}</span>
                      <button onClick={() => removeShape(s.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Sel label="Cabeçote" value={s.head} onChange={(x) => setShape(s.id, { head: +x })} options={state.heads.map((h) => ({ v: h.id, l: `${h.id} · ${h.label}${h.enabled ? "" : " (desativado)"}` }))} />
                      <Num label={s.type === "disc" || s.type === "ring" ? "Ø externo" : s.type === "lines" ? "Comprimento" : "Lado"} suffix="mm" value={s.size} onChange={(x) => setShape(s.id, { size: x })} step={0.5} min={0.5} />
                      {s.type === "ring" && <Num label="Ø interno" suffix="mm" value={s.size2} onChange={(x) => setShape(s.id, { size2: x })} step={0.5} min={0.2} />}
                      {s.type === "lattice" && <Num label="Passo dos filetes" suffix="mm" value={s.size2} onChange={(x) => setShape(s.id, { size2: x })} step={0.1} min={0.1} />}
                      {s.type === "lines" && (<><Num label="Espaçamento" suffix="mm" value={s.size2} onChange={(x) => setShape(s.id, { size2: x })} step={0.5} min={0.1} /><Num label="Nº de linhas" value={s.count} onChange={(x) => setShape(s.id, { count: Math.max(1, Math.round(x)) })} min={1} max={50} /></>)}
                      {s.type !== "lines" && <Num label="Altura" suffix="mm" value={s.height} onChange={(x) => setShape(s.id, { height: x })} step={0.1} min={0} />}
                      <Num label="Posição X" suffix="mm" value={s.x} onChange={(x) => setShape(s.id, { x })} step={0.5} />
                      <Num label="Posição Y" suffix="mm" value={s.y} onChange={(y) => setShape(s.id, { y })} step={0.5} />
                      {(s.type === "disc" || s.type === "square" || s.type === "ring") && <div className="flex items-end pb-1"><Toggle label="Preencher" checked={s.solid} onChange={(x) => setShape(s.id, { solid: x })} /></div>}
                    </div>
                  </div>
                )
              })}
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
                <Sel label="Preenchimento" value={state.layerSettings.infillPattern} onChange={(x) => setLS({ infillPattern: x as BasicState["layerSettings"]["infillPattern"] })} options={INFILL.map((i) => ({ v: i.id, l: i.label }))} testId="pb-infill" />
                <Num label="Densidade" suffix="%" value={state.layerSettings.infillDensity} onChange={(x) => setLS({ infillDensity: x })} min={0} max={100} />
                <Num label="Ângulo" suffix="°" value={state.layerSettings.infillAngle} onChange={(x) => setLS({ infillAngle: x })} min={0} max={180} step={5} />
                <div className="sm:col-span-3"><Toggle label="Alternar 90° a cada camada" checked={state.layerSettings.alternate} onChange={(x) => setLS({ alternate: x })} /></div>
              </div>
              <p className="text-xs text-gray-500"><b className="text-gray-300">{nLayers}</b> camada(s) físicas para a altura máxima de {fmtDot(state.shapes.reduce((h, s) => Math.max(h, s.height), 0), 2)} mm. Use o controle deslizante do painel ao lado para inspecionar camada por camada.</p>
            </div>
          )}

          {/* ───── 4 CABEÇOTES ───── */}
          {step === "heads" && <HeadsStep state={state} curHead={curHead} setCurHead={setCurHead} setHead={setHead} />}

          {/* ───── 5 IMPRESSORA ───── */}
          {step === "printer" && (
            <div className="space-y-4">
              <div><h2 className="text-xl font-bold">5 · Impressora</h2><p className="text-sm text-gray-400">Ajustes gerais do firmware Marlin (Ender/Creality e similares adaptados).</p></div>
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

          <footer className="flex items-center justify-between pt-2">
            <button onClick={() => go(-1)} disabled={stepIdx === 0} className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-30 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Anterior</button>
            {stepIdx < STEPS.length - 1
              ? <button data-testid="pb-next" onClick={() => go(1)} className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold flex items-center gap-2">Próximo <ArrowRight className="w-4 h-4" /></button>
              : <span />}
          </footer>
        </section>

        {/* ───── painel lateral: preview + status ───── */}
        <aside className="space-y-3 lg:sticky lg:top-[112px] self-start">
          <SurfacePreview state={state} layers={previewLayers} layerIdx={layerIdx} />
          {previewLayers && previewLayers.length > 1 && (
            <label className="block text-xs text-gray-400">Camada {Math.min(layerIdx, previewLayers.length - 1) + 1} / {layers ? previewLayers.length : `${nLayers} (prévia das 2 primeiras)`}
              <input type="range" min={0} max={previewLayers.length - 1} value={Math.min(layerIdx, previewLayers.length - 1)} onChange={(e) => setLayerIdx(+e.target.value)} className="w-full accent-violet-400" /></label>
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
  const used = state.heads.filter((h) => h.enabled && state.shapes.some((s) => s.head === h.id))
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold">6 · Resumo e G-code</h2><p className="text-sm text-gray-400">Revise e gere o G-code Marlin. 6 créditos por G-code (mesma regra do BioSlicer).</p></div>
      <div className={cardCls + " grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm"}>
        <div><span className="text-gray-500 text-xs block">Protocolo</span>{state.protocolName}</div>
        <div><span className="text-gray-500 text-xs block">Superfície</span>{surfaceExtent(state.surface).label}{state.surface.kind === "multiwell" && ` · ${wellOffsets(state.surface).length} poço(s)`}</div>
        <div className="sm:col-span-2"><span className="text-gray-500 text-xs block">Objetos</span><ul className="list-disc pl-5">{state.shapes.map((s) => <li key={s.id}>{s.name || s.type}: {describeShape(s)} <span className="text-gray-500">· T{s.head - 1}</span></li>)}</ul></div>
        <div><span className="text-gray-500 text-xs block">Camadas</span>{fmtDot(state.layerSettings.layerHeight, 3)} mm · {layerCount(state)} camadas · {INFILL.find((i) => i.id === state.layerSettings.infillPattern)?.label} {state.layerSettings.infillPattern !== "none" && `${state.layerSettings.infillDensity}%`} · {state.layerSettings.perimeters} perímetro(s)</div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[["Camadas", String(sum.layers)], ["Tempo est.", `${sum.minutes} min`], ["Volume", `${sum.volume_uL} µL`], ["Trajeto", `${sum.path_m} m`]].map(([l, x]) => <div key={l} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="text-[10px] uppercase tracking-wider text-gray-500">{l}</div><div className="text-lg font-bold">{x}</div></div>)}
          </div>
          <details className="rounded-xl border border-white/10 bg-black/30">
            <summary className="cursor-pointer px-4 py-2 text-sm text-gray-300">Ver G-code ({result.gcode.split("\n").length} linhas)</summary>
            <pre className="px-4 pb-4 text-[11px] font-mono text-gray-400 max-h-80 overflow-auto whitespace-pre">{result.gcode.split("\n").slice(0, 400).join("\n")}{result.gcode.split("\n").length > 400 ? "\n; … (baixe o arquivo para ver tudo)" : ""}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
