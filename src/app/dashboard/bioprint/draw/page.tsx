"use client"

/**
 * BIA v4 · R23 · Desenhar & Imprimir (Draw & Print)
 * ─────────────────────────────────────────────────────────────────────
 * Caminho alternativo para a MESMA base BioSlicer: em vez de STL, a usuária
 * DESENHA (touch, caneta ou mouse) linhas, círculos e retângulos sobre a
 * mesa; cada traço é um caminho de extrusão do cabeçote escolhido; o
 * desenho vira volume por repetição de camadas. Mesmo writer, mesmo alvo
 * (Petri/placa), mesmos cabeçotes T0..T3, mesma cobrança (6 créditos).
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Pencil, Layers, Download, Send, AlertTriangle, ShieldCheck, X as XIcon, Target, Palette, RefreshCw, Gauge } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { BASIC_PROFILES, SYRINGE_CATALOG, NEEDLE_GAUGES, defaultLineWidth, defaultLayerHeight, type SliceParams, type ExtrusionModel, type InfillPattern } from "@/lib/slicer"
import { type PrintTarget, DEFAULT_TARGET, describeTarget, targetUsableDiameter } from "@/lib/slicer/target"
import { type ToolsConfig, singleTool, describeTools } from "@/lib/slicer/tools"
import { type Stroke, type DrawVolume, DEFAULT_DRAW_VOLUME, drawToGCode, describeDrawing, strokesBBox, drawingLayerCount } from "@/lib/slicer/draw-print"
import { INFILL_PATTERN_LABELS, BASIC_INFILL_PATTERNS } from "@/lib/slicer/infill-advanced"
import { DrawCanvas } from "@/components/slicer/DrawCanvas"
import { TargetPanel } from "@/components/slicer/TargetPanel"
import { ToolsPanel, type BioinkOption } from "@/components/slicer/ToolsPanel"
import { LayerPreview } from "@/components/slicer/LayerPreview"
import { sendToExecute } from "@/lib/bioprint/execute-handoff"
import { pendingAdjustments, applyLearned, markConsumed } from "@/lib/bioprint/print-feedback"
import type { SlicedLayer } from "@/lib/slicer/types"

const HOST_HANDOFF = "bia.host.gcode.handoff"
const DRAW_KEY = "bia:draw-strokes"
const inp = "rounded-md bg-black/30 border border-white/10 focus:border-emerald-400/50 px-2 py-1 text-sm w-full"

export default function DrawPrintPage() {
  return <Suspense fallback={<div className="p-6 text-sm text-gray-400">Carregando…</div>}><DrawPrintInner /></Suspense>
}

function DrawPrintInner() {
  const { state, updateSlice } = useBioprintProcess()
  const prof = BASIC_PROFILES[0]
  const [P, setP] = useState<SliceParams>({ ...prof.params })
  const [X, setX] = useState<ExtrusionModel>({ ...prof.extrusion })
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [vol, setVol] = useState<DrawVolume>({ ...DEFAULT_DRAW_VOLUME, layers: 3 })
  const [fillClosed, setFillClosed] = useState(true)
  const [activeTool, setActiveTool] = useState(0)
  const [target, setTarget] = useState<PrintTarget>(DEFAULT_TARGET)
  const [tools, setTools] = useState<ToolsConfig>(() => singleTool(prof.extrusion, state.bioink.material ?? "Biotinta"))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ gcode: string; layers: SlicedLayer[]; stats: ReturnType<typeof drawToGCode>["result"]["stats"]; warnings: string[] } | null>(null)
  const [charged, setCharged] = useState<null | { ok: boolean; msg: string }>(null)

  // persistência leve do desenho
  useEffect(() => { try { const raw = sessionStorage.getItem(DRAW_KEY); if (raw) setStrokes(JSON.parse(raw)) } catch { /* noop */ } }, [])
  useEffect(() => { try { sessionStorage.setItem(DRAW_KEY, JSON.stringify(strokes)) } catch { /* noop */ } }, [strokes])
  // T0 acompanha a extrusão base
  useEffect(() => { setTools((t) => t.heads.length === 1 ? { ...t, heads: [{ ...t.heads[0], extrusion: X }] } : t) }, [X])

  const bioinkOptions: BioinkOption[] = useMemo(() => {
    const f: BioinkOption[] = state.bioink.formulations?.length ? state.bioink.formulations.map((x) => ({ label: x.label ?? x.material ?? "Biotinta", materialId: x.materialId ?? undefined, role: x.role })) : []
    if (!f.length && state.bioink.material) f.push({ label: state.bioink.material })
    return f
  }, [state.bioink.formulations, state.bioink.material])

  const bed = targetUsableDiameter(target) ?? 60
  const bb = strokesBBox(strokes)
  const footprint = bb ? Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY, Math.abs(bb.minX) * 2, Math.abs(bb.maxX) * 2, Math.abs(bb.minY) * 2, Math.abs(bb.maxY) * 2) : 0
  const fits = footprint <= bed
  const learned = useMemo(() => pendingAdjustments({ materialId: state.bioink.material ?? null, geometryId: "draw" }), [state.bioink.material])
  const [useLearned, setUseLearned] = useState(true)
  const gauge = NEEDLE_GAUGES.find((g) => Math.abs(g.id_mm - P.nozzleDiameter_mm) < 0.005)

  const generate = useCallback(async () => {
    if (strokes.length === 0) { setError("Desenhe pelo menos um traço."); return }
    setError(null); setBusy(true); setCharged(null)
    await new Promise((r) => setTimeout(r, 20))
    try {
      let params = { ...P, skirtLoops: 0 }; let Xeff = X; let notes: string[] = []
      if (useLearned && learned.adjustments.length) { const ap = applyLearned({ params, extrusion: X }, learned.adjustments); params = ap.out.params as SliceParams; Xeff = ap.out.extrusion as ExtrusionModel; notes = ap.notes }
      const { layers, result: r, warnings } = drawToGCode({
        strokes, params, extrusion: Xeff, volume: vol,
        write: { jobName: `desenho_${strokes.length}tracos`, profileId: "draw", profileName: "Desenhar & Imprimir", target, tools, meta: { material: state.bioink.material ?? null } },
      })
      let gcode = r.gcode
      if (notes.length) { gcode = gcode.replace(/\n(;\s*BIA_META)/, `\n${notes.join("\n")}\n$1`); if (learned.feedback) markConsumed(learned.feedback.id) }
      setResult({ gcode, layers, stats: r.stats, warnings })
      try {
        const res = await fetch("/api/gcode/charge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: {
          jobName: "draw-print", profileId: "draw", infill: vol.fillPattern, infillDensity: vol.fillDensity, layerCount: layers.length, volume_uL: Math.round(r.stats.volume_uL), time_s: r.stats.estimatedTime_s,
          target: target.kind, wells: r.stats.wells, tools: tools.heads.length, geometryId: "draw", gcodeLines: gcode.split("\n").length,
        } }) })
        if (res.ok) { const j = await res.json(); setCharged({ ok: true, msg: j.charged ? `${j.charged} créditos debitados` : "sem cobrança (admin)" }) }
        else if (res.status === 402) setCharged({ ok: false, msg: "Créditos insuficientes — recarregue para baixar/enviar." })
        else setCharged({ ok: false, msg: "Não foi possível registrar a cobrança." })
      } catch { setCharged({ ok: false, msg: "Sem conexão para registrar a cobrança." }) }
      updateSlice({ status: "ready", gcode, layerHeightMm: params.layerHeight_mm, printSpeedMmS: params.speedPerimeter_mms, nozzleDiameterUm: Math.round(params.nozzleDiameter_mm * 1000), infillPatternId: vol.fillPattern, infillPercent: vol.fillDensity, skirtLoops: 0, estimate: { totalLayers: layers.length, estimatedTimeMin: Math.round(r.stats.estimatedTime_s / 60), estimatedVolumeMl: Math.round(r.stats.volume_uL) / 1000 } })
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao gerar") }
    finally { setBusy(false) }
  }, [strokes, P, X, vol, target, tools, state.bioink.material, updateSlice, learned, useLearned])

  const gated = () => { if (charged && !charged.ok) { setError(charged.msg); return false } return true }
  const download = () => { if (!result || !gated()) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([result.gcode], { type: "text/plain" })); a.download = "bia_desenho.gcode"; a.click(); URL.revokeObjectURL(a.href) }
  const toHost = () => { if (!result || !gated()) return; try { sessionStorage.setItem(HOST_HANDOFF, JSON.stringify({ gcode: result.gcode, name: "bia_desenho.gcode", from: "draw", syringe: X.syringe ?? null })) } catch { /* noop */ } window.location.href = "/dashboard/bioprint/host" }
  const toStep4 = () => { if (!result || !gated()) return; sendToExecute({ gcode: result.gcode, name: "bia_desenho.gcode", from: "draw" }) }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80 font-semibold mb-1">Fase 3 / 6 · Bioimpressão · caminho alternativo do Fatiamento</div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Pencil className="w-5 h-5 text-emerald-300" /> Desenhar & Imprimir</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">
            Desenhe com o dedo, caneta ou mouse sobre a mesa. <b className="text-gray-200">Cada traço é um caminho de extrusão</b> do cabeçote escolhido
            (três linhas = três caminhos). Repita por camadas para criar volume. Mesma base BioSlicer: ponto zero no bico, alvo Petri/placa, 1–4 cabeçotes, 6 créditos por G-code.
          </p>
        </div>
        <Link href="/dashboard/bioprint/slice" className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-400/40 text-gray-300 text-xs">← Fatiar um STL</Link>
      </header>

      {learned.feedback && learned.adjustments.length > 0 && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.07] p-3 text-xs">
          <div className="flex items-center justify-between gap-3"><div className="text-emerald-200 font-semibold">🧠 Aprendi com a sua última impressão (nota {learned.feedback.rating}/5)</div><label className="flex items-center gap-1.5 text-gray-300"><input type="checkbox" checked={useLearned} onChange={(e) => setUseLearned(e.target.checked)} /> aplicar</label></div>
          <ul className="list-disc pl-5 text-gray-300 mt-1">{learned.adjustments.map((a, i) => <li key={i}>{a.reason}</li>)}</ul>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-5">
          <Panel title="1 · Desenhe sobre a mesa" icon={<Pencil className="w-4 h-4" />} subtitle={`Ø útil ${bed.toFixed(0)} mm · ${strokes.length} traço(s)`}>
            <DrawCanvas strokes={strokes} onChange={(s) => { setStrokes(s); setResult(null) }} activeTool={activeTool} toolCount={tools.heads.length} onActiveTool={setActiveTool} bedDiameter_mm={bed} fillClosed={fillClosed} onFillClosed={setFillClosed} defaultLayers={vol.layers} layerHeight_mm={P.layerHeight_mm} />
            {strokes.length > 0 && (
              <div className={cn("mt-2 text-xs rounded-lg border px-3 py-2", fits ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100" : "border-rose-500/40 bg-rose-500/10 text-rose-100")}>
                {describeDrawing(strokes, vol, P.layerHeight_mm)} · {fits ? "✓ cabe no alvo" : `✗ passa do alvo (${footprint.toFixed(0)} mm > ${bed.toFixed(0)} mm)`}
              </div>
            )}
          </Panel>

          {result && (
            <>
              <Panel title="Preview por camada" icon={<Layers className="w-4 h-4" />}>
                <LayerPreview layers={result.layers} bbox={{ minX: -bed / 2, maxX: bed / 2, minY: -bed / 2, maxY: bed / 2, minZ: 0, maxZ: drawingLayerCount(strokes, vol) * P.layerHeight_mm }} lineWidth_mm={P.lineWidth_mm} />
              </Panel>
              <div className="grid sm:grid-cols-4 gap-2 text-xs">
                <Stat label="Camadas" value={String(result.layers.length)} /><Stat label="Tempo est." value={`${(result.stats.estimatedTime_s / 60).toFixed(1)} min`} /><Stat label="Volume" value={`${result.stats.volume_uL.toFixed(0)} µL`} /><Stat label="Êmbolo" value={`${result.stats.plungerTravel_mm.toFixed(1)} mm`} />
              </div>
              {result.warnings.map((w, i) => <div key={i} className="text-xs text-amber-200 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{w}</div>)}
              <div className="flex flex-wrap gap-2">
                <button onClick={download} className="px-4 py-2 rounded-lg border border-white/15 hover:border-emerald-400/40 text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Baixar .gcode</button>
                <button onClick={toHost} className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 hover:bg-emerald-500/30 text-sm flex items-center gap-2"><Send className="w-4 h-4" /> Enviar ao Host</button>
                <button onClick={toStep4} className="px-4 py-2 rounded-lg border border-white/15 hover:border-white/30 text-sm">Fase 4 (Bioimpressão · Host) →</button>
                {charged && <span className={cn("text-xs self-center px-2 py-1 rounded border", charged.ok ? "text-emerald-200 border-emerald-400/30 bg-emerald-500/10" : "text-rose-200 border-rose-400/30 bg-rose-500/10")}>{charged.msg}</span>}
              </div>
              <pre className="text-[11px] font-mono max-h-60 overflow-auto bg-black/40 rounded-lg p-3 text-gray-300 whitespace-pre">{result.gcode.slice(0, 12000)}{result.gcode.length > 12000 ? "\n… (truncado)" : ""}</pre>
            </>
          )}
        </div>

        <div className="space-y-5">
          <Panel title="2 · Volume a partir do desenho" icon={<Layers className="w-4 h-4" />}>
            <div className="space-y-3 text-sm">
              <Row label={`Camadas padrão para linhas e novas formas (${vol.layers} × ${P.layerHeight_mm} mm = ${(vol.layers * P.layerHeight_mm).toFixed(2)} mm)`}><input type="range" min={1} max={60} value={vol.layers} onChange={(e) => setVol({ ...vol, layers: +e.target.value })} className="w-full accent-emerald-400" /></Row>
              {strokes.some((s) => s.closed) && (
                <div className="rounded-lg border border-white/10 bg-black/20 p-2 space-y-1">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Camadas por forma fechada</div>
                  {strokes.map((s, i) => s.closed ? (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-gray-400 w-14">{i + 1}·T{s.tool}</span>
                      <span className="text-gray-300 flex-1">{s.kind === "circle" ? "círculo" : s.kind === "rect" ? "retângulo" : "laço"}{s.fill ? " · preenchido" : ""}</span>
                      <input type="number" min={1} max={200} value={s.layers ?? vol.layers} onChange={(e) => { const n = Math.max(1, Math.min(200, Math.round(+e.target.value || 1))); setStrokes(strokes.map((x) => x.id === s.id ? { ...x, layers: n } : x)); setResult(null) }} className="w-16 rounded bg-black/30 border border-white/10 px-1.5 py-0.5 font-mono text-xs" />
                      <span className="text-gray-500 w-16 text-right">{(((s.layers ?? vol.layers)) * P.layerHeight_mm).toFixed(2)} mm</span>
                    </div>
                  ) : null)}
                  <div className="text-[10px] text-gray-500">Altura total do desenho: {(drawingLayerCount(strokes, vol) * P.layerHeight_mm).toFixed(2)} mm ({drawingLayerCount(strokes, vol)} camadas)</div>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={vol.alternate90} onChange={(e) => setVol({ ...vol, alternate90: e.target.checked })} /> alternar 90° a cada camada (woodpile — para linhas)</label>
              <Row label="Preenchimento das formas fechadas"><select value={vol.fillPattern} onChange={(e) => setVol({ ...vol, fillPattern: e.target.value as InfillPattern })} className={inp}>{BASIC_INFILL_PATTERNS.filter((p) => p !== "none").map((p) => <option key={p} value={p}>{INFILL_PATTERN_LABELS[p].label}</option>)}</select></Row>
              <Row label={`Densidade do preenchimento · ${vol.fillDensity} %`}><input type="range" min={5} max={100} step={5} value={vol.fillDensity} onChange={(e) => setVol({ ...vol, fillDensity: +e.target.value })} className="w-full accent-emerald-400" /></Row>
            </div>
          </Panel>

          <Panel title="3 · Agulha, camada e velocidade" icon={<Gauge className="w-4 h-4" />}>
            <div className="space-y-3 text-sm">
              <Row label="Agulha / bico"><select value={P.nozzleDiameter_mm} onChange={(e) => { const d = +e.target.value; setP({ ...P, nozzleDiameter_mm: d, lineWidth_mm: defaultLineWidth(d), layerHeight_mm: defaultLayerHeight(d), firstLayerHeight_mm: Math.round(defaultLayerHeight(d) * 0.9 * 100) / 100 }) }} className={inp}>{NEEDLE_GAUGES.map((g) => <option key={g.gauge} value={g.id_mm}>{g.gauge} · {g.id_mm} mm</option>)}{!gauge && <option value={P.nozzleDiameter_mm}>{P.nozzleDiameter_mm} mm</option>}</select></Row>
              <Row label="Seringa"><select value={X.syringe ? `${X.syringe.volume_mL}|${X.syringe.innerDiameter_mm}` : "pneumatic"} onChange={(e) => { if (e.target.value === "pneumatic") setX({ ...X, kind: "pneumatic", syringe: undefined }); else { const [v, d] = e.target.value.split("|").map(Number); setX({ ...X, kind: "syringe_stepper", syringe: { volume_mL: v, innerDiameter_mm: d } }) } }} className={inp}>{SYRINGE_CATALOG.map((s) => <option key={s.label} value={`${s.volume_mL}|${s.innerDiameter_mm}`}>{s.label}</option>)}<option value="pneumatic">Pneumático (pressão)</option></select></Row>
              <Row label={`Altura de camada · ${P.layerHeight_mm} mm (${Math.round(P.layerHeight_mm / P.nozzleDiameter_mm * 100)} % do bico)`}><input type="range" min={0.1} max={1.2} step={0.01} value={P.layerHeight_mm} onChange={(e) => setP({ ...P, layerHeight_mm: +e.target.value, firstLayerHeight_mm: Math.round(+e.target.value * 0.9 * 100) / 100 })} className="w-full accent-emerald-400" /></Row>
              <Row label={`Velocidade · ${P.speedPerimeter_mms} mm/s`}><input type="range" min={1} max={20} step={0.5} value={P.speedPerimeter_mms} onChange={(e) => { const v = +e.target.value; setP({ ...P, speedPerimeter_mms: v, speedInfill_mms: Math.round(v * 1.2 * 10) / 10, speedFirstLayer_mms: Math.max(1, Math.round(v * 0.7 * 10) / 10) }) }} className="w-full accent-emerald-400" /></Row>
              <Row label={`Fluxo · ×${X.flowMultiplier.toFixed(2)}`}><input type="range" min={0.5} max={2} step={0.05} value={X.flowMultiplier} onChange={(e) => setX({ ...X, flowMultiplier: +e.target.value })} className="w-full accent-emerald-400" /></Row>
            </div>
          </Panel>

          <Panel title="4 · Onde imprimir (ponto zero)" icon={<Target className="w-4 h-4" />}><TargetPanel target={target} onChange={setTarget} footprint_mm={footprint || null} /></Panel>
          <Panel title="5 · Cabeçotes e biotintas" icon={<Palette className="w-4 h-4" />}><ToolsPanel tools={tools} onChange={(t) => { setTools(t); if (activeTool >= t.heads.length) setActiveTool(0) }} bioinks={bioinkOptions} baseExtrusion={X} /></Panel>

          <button onClick={() => setConfirmOpen(true)} disabled={!strokes.length || busy} className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-black disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando…</> : <><Layers className="w-4 h-4" /> Gerar G-code do desenho (6 créditos)</>}
          </button>
          {error && <div className="text-sm text-red-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-emerald-400/30 bg-[#0b1412] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between"><div className="flex items-center gap-2 text-white font-semibold"><ShieldCheck className="w-5 h-5 text-emerald-300" /> Confirme antes de gerar</div><button onClick={() => setConfirmOpen(false)} className="p-1 rounded hover:bg-white/10 text-gray-400"><XIcon className="w-4 h-4" /></button></div>
            <div className="p-5 space-y-2 text-sm">
              <KV k="Desenho" v={describeDrawing(strokes, vol, P.layerHeight_mm)} />
              <KV k="Agulha / camada" v={`${P.nozzleDiameter_mm} mm · ${P.layerHeight_mm} mm · ${P.speedPerimeter_mms} mm/s · fluxo ×${X.flowMultiplier.toFixed(2)}`} />
              <KV k="Onde" v={describeTarget(target)} />
              <KV k="Cabeçotes" v={describeTools(tools)} />
              <KV k="Ponto zero" v="Bico no centro do desenho — o 1º traço nasce ali, sem deslocamento seco." />
              {useLearned && learned.adjustments.length > 0 && <KV k="Aprendido" v={`${learned.adjustments.length} ajuste(s) da última impressão serão aplicados`} />}
              <div className="text-[11px] text-gray-500 pt-1">Serão debitados <b className="text-gray-300">6 créditos</b> ao gerar.</div>
            </div>
            <div className="px-5 py-3.5 border-t border-white/10 flex justify-end gap-2"><button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10">Ajustar</button><button onClick={() => { setConfirmOpen(false); void generate() }} className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-400 text-black hover:bg-emerald-300">Confirmar e gerar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function Panel({ title, icon, subtitle, children }: { title: string; icon?: React.ReactNode; subtitle?: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4"><header className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold flex items-center gap-2 text-gray-100">{icon}{title}</h3>{subtitle && <span className="text-[11px] text-gray-500">{subtitle}</span>}</header>{children}</section>
}
function Row({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><div className="text-xs text-gray-400 mb-1">{label}</div>{children}</label> }
function KV({ k, v }: { k: string; v: string }) { return <div className="flex gap-3"><span className="w-28 shrink-0 text-gray-500">{k}</span><span className="text-gray-100">{v}</span></div> }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2"><div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div><div className="text-sm font-semibold text-gray-100">{value}</div></div> }
