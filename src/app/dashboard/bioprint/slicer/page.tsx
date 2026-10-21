"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R15 · /dashboard/bioprint/slicer — BioSlicer
 *  ─────────────────────────────────────────────────────────────────────
 *  1. Modelo: STL da Etapa 1 (IndexedDB), upload direto, ou primitiva.
 *  2. Objetivo: texto/voz → auto-profile com decisões explicadas — ou
 *     perfil manual Básico / Avançado.
 *  3. Parâmetros: Básico (poucos campos) ou Avançado (todos + dicas).
 *  4. Fatiar → preview por camada, estatísticas bio, avisos.
 *  5. Exportar .gcode / enviar ao Host / Etapa 4.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  Upload, Mic, MicOff, Wand2, Layers, Download, Send, Settings2, Sparkles, AlertTriangle,
  CheckCircle2, Info, Box, Cylinder, Circle, RefreshCw, Lightbulb, Gauge, FlaskConical,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import {
  type TriMesh, type SliceParams, type ExtrusionModel, type SliceResult, type SliceProfile, type InfillPattern,
  parseSTL, sliceMesh, parseIntent, INTENT_EXAMPLES, BASIC_PROFILES, ADVANCED_PROFILES, PARAM_TIPS,
  SYRINGE_CATALOG, NEEDLE_GAUGES, defaultLayerHeight, defaultLineWidth, PRIMITIVE_CATALOG, type IntentResult,
} from "@/lib/slicer"
import { getMesh, getLastMeshId, listMeshes, putMesh, newMeshId, triMeshToSTL } from "@/lib/slicer/mesh-store"
import { LayerPreview } from "@/components/slicer/LayerPreview"

type Mode = "basic" | "advanced"
type Rheo = { viscosity_PaS?: number; powerLawN?: number }
const HANDOFF_KEY = "bia.host.gcode.handoff"

export default function BioSlicerPage() {
  const { state, updateSlice } = useBioprintProcess()

  const [mesh, setMesh] = useState<TriMesh | null>(null)
  const [meshSource, setMeshSource] = useState<string>("")
  const [stored, setStored] = useState<Array<{ id: string; name: string; sizeKb: number; source: string }>>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<Mode>("basic")
  const [profile, setProfile] = useState<SliceProfile>(BASIC_PROFILES[0])
  const [P, setP] = useState<SliceParams>({ ...BASIC_PROFILES[0].params })
  const [X, setX] = useState<ExtrusionModel>({ ...BASIC_PROFILES[0].extrusion })
  const [rheology, setRheology] = useState<Rheo | undefined>({ viscosity_PaS: 2 })

  const [intentText, setIntentText] = useState("")
  const [intent, setIntent] = useState<IntentResult | null>(null)
  const [listening, setListening] = useState(false)
  const recRef = useRef<{ stop: () => void } | null>(null)

  const [result, setResult] = useState<SliceResult | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshStored = useCallback(async () => {
    try { setStored((await listMeshes()).map((m) => ({ id: m.id, name: m.name, sizeKb: m.sizeKb, source: m.source }))) } catch { /* noop */ }
  }, [])

  useEffect(() => {
    (async () => {
      await refreshStored()
      try {
        const last = getLastMeshId()
        if (last) {
          const m = await getMesh(last)
          if (m) { setMesh(parseSTL(m.bytes, m.name)); setMeshSource(`${m.source}: ${m.name}`) }
        }
      } catch { /* noop */ }
    })()
  }, [refreshStored])

  const loadStored = useCallback(async (id: string) => {
    const m = await getMesh(id)
    if (m) { setMesh(parseSTL(m.bytes, m.name)); setMeshSource(`${m.source}: ${m.name}`); setResult(null) }
  }, [])

  const onFile = useCallback(async (file: File) => {
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      const m = parseSTL(buf, file.name)
      if (m.triangleCount === 0) throw new Error("STL sem triângulos válidos.")
      setMesh(m); setMeshSource(`upload: ${file.name}`); setResult(null)
      await putMesh({ id: newMeshId("upload"), name: file.name, bytes: buf, format: "stl", createdAt: Date.now(), source: "upload" })
      await refreshStored()
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao ler STL") }
  }, [refreshStored])

  const makePrimitive = useCallback(async (id: string, p: Record<string, number>) => {
    const prim = PRIMITIVE_CATALOG.find((c) => c.id === id)
    if (!prim) return
    const m = prim.make(p)
    setMesh(m); setMeshSource(`primitiva: ${prim.label}`); setResult(null)
    try {
      await putMesh({ id: newMeshId("prim"), name: `${m.name}.stl`, bytes: triMeshToSTL(m.vertices, m.triangleCount, `BIA ${prim.label}`), format: "stl", createdAt: Date.now(), source: "primitive", meta: p })
      await refreshStored()
    } catch { /* noop */ }
  }, [refreshStored])

  const applyProfile = useCallback((pf: SliceProfile) => {
    setProfile(pf)
    setP({ ...pf.params })
    setX({ ...pf.extrusion, syringe: pf.extrusion.syringe ? { ...pf.extrusion.syringe } : undefined })
    setResult(null)
  }, [])

  const runIntent = useCallback((text: string) => {
    if (!text.trim()) return
    const r = parseIntent(text)
    setIntent(r); setProfile(r.profile); setP({ ...r.params }); setX({ ...r.extrusion })
    if (r.rheology) setRheology(r.rheology)
    if (r.profile.tier === "advanced") setMode("advanced")
    setResult(null)
  }, [])

  // R16: hint vindo do Laboratório de Biotintas (receita → objetivo + parâmetros iniciais)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bia:slicer-hint")
      if (!raw) return
      sessionStorage.removeItem("bia:slicer-hint")
      const h = JSON.parse(raw) as { text?: string; startParams?: { nozzle_mm: number; speed_mms: number; layerHeight_mm: number; flowPercent: number } }
      if (h.text) { setIntentText(h.text); runIntent(h.text) }
      if (h.startParams) {
        const sp = h.startParams
        setP((p) => ({
          ...p,
          nozzleDiameter_mm: sp.nozzle_mm,
          lineWidth_mm: Math.round(sp.nozzle_mm * 1.15 * 100) / 100,
          layerHeight_mm: sp.layerHeight_mm,
          firstLayerHeight_mm: Math.min(p.firstLayerHeight_mm, sp.layerHeight_mm),
          speedPerimeter_mms: sp.speed_mms,
          speedInfill_mms: sp.speed_mms,
          speedFirstLayer_mms: Math.max(1, Math.round(sp.speed_mms * 0.7 * 10) / 10),
        }))
        setX((x) => ({ ...x, flowMultiplier: sp.flowPercent / 100 }))
      }
    } catch { /* noop */ }
  }, [runIntent])

  const toggleVoice = useCallback(() => {
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) { setError("Reconhecimento de voz não suportado neste navegador (use Chrome/Edge)."); return }
    const rec = new Ctor()
    rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false
    let finalText = ""
    rec.onresult = (ev) => {
      let interim = ""
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript
        if (ev.results[i].isFinal) finalText += t; else interim += t
      }
      setIntentText(finalText || interim)
    }
    rec.onend = () => { setListening(false); if (finalText) runIntent(finalText) }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [listening, runIntent])

  const doSlice = useCallback(async () => {
    if (!mesh) { setError("Carregue um STL ou gere uma primitiva primeiro."); return }
    setError(null); setBusy("Preparando…")
    await new Promise((r) => setTimeout(r, 20))
    try {
      let params = P
      if (intent?.targetSize_mm && P.scale === 1) {
        const bb = mesh.bbox
        const sx = bb.maxX - bb.minX, sy = bb.maxY - bb.minY, sz = bb.maxZ - bb.minZ
        const c: number[] = []
        if (intent.targetSize_mm.x && sx > 0) c.push(intent.targetSize_mm.x / sx)
        if (intent.targetSize_mm.y && sy > 0) c.push(intent.targetSize_mm.y / sy)
        if (intent.targetSize_mm.z && sz > 0) c.push(intent.targetSize_mm.z / sz)
        if (c.length) { params = { ...P, scale: Math.min(...c) }; setP(params) }
      }
      const r = sliceMesh({
        mesh, params, extrusion: X, profileId: profile.id, profileName: profile.name, rheology,
        jobName: mesh.name ?? "bia-print",
        meta: { geometryId: state.model.geometryId ?? mesh.name ?? "stl", tissue: intent?.tissue ?? state.control.tissueType ?? null, material: intent?.material ?? state.bioink.material ?? null, intent: intentText || null },
        onProgress: (f, s) => setBusy(`${s} (${Math.round(f * 100)}%)`),
      })
      setResult(r)
      updateSlice({
        status: r.warnings.some((w) => w.level === "error") ? "draft" : "ready",
        gcode: r.gcode,
        layerHeightMm: params.layerHeight_mm, printSpeedMmS: params.speedPerimeter_mms, nozzleDiameterUm: Math.round(params.nozzleDiameter_mm * 1000),
        infillPatternId: params.infillPattern, infillPercent: params.infillDensity, skirtLoops: params.skirtLoops,
        cartridgeTempC: params.cartridgeTemp_C, bedTempC: params.bedTemp_C,
        estimate: { totalLayers: r.stats.layerCount, estimatedTimeMin: Math.round(r.stats.estimatedTime_s / 60), estimatedVolumeMl: Math.round(r.stats.volume_uL) / 1000 },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fatiar")
    } finally { setBusy(null) }
  }, [mesh, P, X, profile, rheology, intent, intentText, state, updateSlice])

  const download = useCallback(() => {
    if (!result) return
    const blob = new Blob([result.gcode], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${(mesh?.name ?? "bia").replace(/\.stl$/i, "")}_${profile.id}.gcode`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [result, mesh, profile])

  const sendToHost = useCallback(() => {
    if (!result) return
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ gcode: result.gcode, name: `${mesh?.name ?? "bia"}.gcode`, from: "slicer", syringe: X.syringe ?? null })) } catch { /* noop */ }
    window.location.href = "/dashboard/bioprint/host"
  }, [result, mesh, X])

  const meshSize = mesh ? { x: mesh.bbox.maxX - mesh.bbox.minX, y: mesh.bbox.maxY - mesh.bbox.minY, z: mesh.bbox.maxZ - mesh.bbox.minZ } : null
  const errors = result?.warnings.filter((w) => w.level === "error") ?? []

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-300" /> BioSlicer — fatiamento para bioimpressão</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-3xl">
            Fatiador real de STL com extrusão volumétrica por seringa, infills de scaffold (woodpile 0/90, gyroid, concêntrico…) e G-code Marlin/Klipper
            sem <code>G28</code>. Descreva o objetivo por texto ou voz e a BIA monta o perfil; ou ajuste tudo no modo Avançado.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <ModeToggle mode={mode} onChange={setMode} />
          <Link href="/dashboard/bioprint/host" className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-400/40 text-gray-300">Host →</Link>
        </div>
      </header>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <div className="space-y-5">
          <Panel title="1 · Modelo 3D" icon={<Box className="w-4 h-4" />}>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
              className="rounded-lg border border-dashed border-white/15 hover:border-emerald-400/40 p-4 text-center cursor-pointer text-sm text-gray-300"
            >
              <Upload className="w-5 h-5 mx-auto mb-1 text-emerald-300" />
              Arraste um <b>.stl</b> (binário ou ASCII) ou clique
              <input ref={fileRef} type="file" accept=".stl" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
            </div>
            {stored.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Malhas salvas (Etapa 1 / Studio / uploads)</div>
                <div className="flex flex-col gap-1 max-h-32 overflow-auto">
                  {stored.slice(0, 8).map((m) => (
                    <button key={m.id} onClick={() => loadStored(m.id)} className="text-left text-xs px-2 py-1 rounded hover:bg-white/5 flex justify-between gap-2">
                      <span className="truncate">{m.name}</span><span className="text-gray-500 shrink-0">{m.sizeKb} kB · {m.source}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Ou gere uma primitiva</div>
              <div className="grid grid-cols-2 gap-1.5">
                <PrimBtn icon={<Box className="w-3.5 h-3.5" />} label="Bloco 10×10×3" onClick={() => makePrimitive("box", { x: 10, y: 10, z: 3 })} />
                <PrimBtn icon={<Circle className="w-3.5 h-3.5" />} label="Disco Ø10×2" onClick={() => makePrimitive("cylinder", { d: 10, z: 2 })} />
                <PrimBtn icon={<Cylinder className="w-3.5 h-3.5" />} label="Tubo Ø8/5×5" onClick={() => makePrimitive("tube", { d: 8, di: 5, z: 5 })} />
                <PrimBtn icon={<Sparkles className="w-3.5 h-3.5" />} label="Domo Ø6×2.5" onClick={() => makePrimitive("dome", { d: 6, z: 2.5 })} />
              </div>
            </div>
            {mesh && meshSize && (
              <div className="mt-3 text-xs rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5">
                <div className="flex items-center gap-1.5 text-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> {meshSource}</div>
                <div className="text-gray-400 mt-1 font-mono">{mesh.triangleCount.toLocaleString("pt-BR")} tri · {meshSize.x.toFixed(1)} × {meshSize.y.toFixed(1)} × {meshSize.z.toFixed(1)} mm</div>
              </div>
            )}
          </Panel>

          <Panel title="2 · Objetivo (texto ou voz)" icon={<Wand2 className="w-4 h-4" />}>
            <div className="flex gap-2">
              <textarea
                value={intentText} onChange={(e) => setIntentText(e.target.value)}
                placeholder="Ex.: scaffold ósseo 10x10x4 mm, poro 400 µm, alginato com HAp, agulha 18G"
                rows={3}
                className="flex-1 text-sm rounded-lg bg-black/30 border border-white/10 focus:border-emerald-400/50 p-2 resize-none"
              />
              <div className="flex flex-col gap-1.5">
                <button onClick={toggleVoice} title="Falar objetivo (pt-BR)" className={cn("p-2 rounded-lg border", listening ? "bg-red-500/20 border-red-400/40 animate-pulse" : "border-white/10 hover:border-emerald-400/40")}>
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button onClick={() => runIntent(intentText)} title="Montar perfil" className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 hover:bg-emerald-500/30"><Wand2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {INTENT_EXAMPLES.slice(0, 4).map((ex) => (
                <button key={ex} onClick={() => { setIntentText(ex); runIntent(ex) }} className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 hover:border-emerald-400/40 text-gray-300 truncate max-w-full">{ex}</button>
              ))}
            </div>
            {intent && (
              <div className="mt-3 text-xs rounded-lg bg-violet-500/5 border border-violet-500/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-violet-200 font-medium">Perfil: {intent.profile.name}</span>
                  <span className="text-gray-500">confiança {Math.round(intent.confidence * 100)}%</span>
                </div>
                {(intent.tissue || intent.material) && <div className="text-gray-400">{intent.tissue && <>tecido: <b className="text-gray-200">{intent.tissue}</b> · </>}{intent.material && <>material: <b className="text-gray-200">{intent.material}</b></>}</div>}
                <details className="text-gray-400">
                  <summary className="cursor-pointer text-gray-300">{intent.decisions.length} decisões explicadas</summary>
                  <ul className="mt-1 space-y-1">
                    {intent.decisions.map((d, i) => (
                      <li key={i} className="flex gap-1.5"><span className={cn("mt-1 w-1.5 h-1.5 rounded-full shrink-0", d.source === "user" ? "bg-emerald-400" : d.source === "rule" ? "bg-amber-400" : "bg-gray-500")} /><span><b className="text-gray-300">{d.field}</b> = {String(d.value)} — {d.reason}</span></li>
                    ))}
                  </ul>
                </details>
                {intent.warnings.map((w, i) => <div key={i} className="text-amber-300 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</div>)}
              </div>
            )}
          </Panel>

          <Panel title={`3 · Perfil ${mode === "basic" ? "Básico" : "Avançado"}`} icon={<Settings2 className="w-4 h-4" />}>
            <div className="grid grid-cols-1 gap-1.5">
              {(mode === "basic" ? BASIC_PROFILES : [...BASIC_PROFILES, ...ADVANCED_PROFILES]).map((pf) => (
                <button key={pf.id} onClick={() => applyProfile(pf)} className={cn("text-left rounded-lg border p-2 text-xs transition", profile.id === pf.id ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 hover:border-white/25")}>
                  <div className="flex items-center justify-between"><span className="font-medium text-gray-100">{pf.name}</span><span className={cn("text-[10px] px-1.5 rounded", pf.tier === "basic" ? "bg-sky-500/20 text-sky-200" : "bg-violet-500/20 text-violet-200")}>{pf.tier === "basic" ? "básico" : "avançado"}</span></div>
                  <div className="text-gray-400 mt-0.5 line-clamp-2">{pf.description}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="4 · Parâmetros" icon={<Gauge className="w-4 h-4" />}>
            {mode === "basic"
              ? <BasicParams P={P} setP={setP} X={X} setX={setX} />
              : <AdvancedParams P={P} setP={setP} X={X} setX={setX} rheology={rheology} setRheology={setRheology} />}
          </Panel>

          <button onClick={doSlice} disabled={!mesh || !!busy} className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-black disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <><RefreshCw className="w-4 h-4 animate-spin" /> {busy}</> : <><Layers className="w-4 h-4" /> Fatiar e gerar G-code</>}
          </button>
          {error && <div className="text-sm text-red-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        </div>

        <div className="space-y-5">
          {!result && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-gray-400 text-sm">
              <Layers className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              Carregue um modelo, descreva o objetivo (ou escolha um perfil) e clique em <b>Fatiar</b>.<br />
              O preview mostra camada a camada: paredes, infill e skirt — com a camada anterior sobreposta para conferir o alinhamento 0/90.
              <TipsBox tips={profile.tips} title={`Dicas do perfil "${profile.name}"`} />
            </div>
          )}
          {result && (
            <>
              <Panel title="Preview por camada" icon={<Layers className="w-4 h-4" />}>
                <LayerPreview layers={result.layers} bbox={result.meshBBox} lineWidth_mm={P.lineWidth_mm} />
              </Panel>

              <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <Stat label="Camadas" value={String(result.stats.layerCount)} />
                <Stat label="Tempo est." value={fmtTime(result.stats.estimatedTime_s)} />
                <Stat label="Volume" value={`${(result.stats.volume_uL / 1000).toFixed(2)} mL`} sub={`${result.stats.volume_uL.toFixed(0)} µL`} />
                <Stat label="Êmbolo" value={`${result.stats.plungerTravel_mm.toFixed(1)} mm`} sub={X.syringe ? `seringa ${X.syringe.volume_mL} mL` : "E total"} />
                <Stat label="Extrusão" value={`${(result.stats.extrudeLength_mm / 1000).toFixed(2)} m`} sub={`travel ${(result.stats.travelLength_mm / 1000).toFixed(2)} m`} />
                <Stat label="Vazão média" value={`${result.stats.avgFlow_uLs.toFixed(2)} µL/s`} />
                <Stat label="Shear (bico)" value={result.stats.wallShear_Pa !== null ? `${(result.stats.wallShear_Pa / 1000).toFixed(1)} kPa` : "–"} tone={result.stats.wallShear_Pa !== null ? (result.stats.wallShear_Pa > 10000 ? "bad" : result.stats.wallShear_Pa > 5000 ? "warn" : "ok") : undefined} />
                <Stat label="Viabilidade est." value={result.stats.viability_pct !== null ? `${result.stats.viability_pct}%` : "– (sem células)"} tone={result.stats.viability_pct !== null ? (result.stats.viability_pct < 80 ? "bad" : result.stats.viability_pct < 90 ? "warn" : "ok") : undefined} />
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {result.warnings.map((w, i) => (
                    <div key={i} className={cn("rounded-lg border p-2.5 text-xs flex gap-2", w.level === "error" ? "border-red-500/40 bg-red-500/10 text-red-200" : w.level === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-100" : "border-sky-500/30 bg-sky-500/5 text-sky-100")}>
                      {w.level === "info" ? <Info className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                      <div><b>{w.message}</b>{w.hint && <div className="opacity-80 mt-0.5">{w.hint}</div>}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button onClick={download} className="px-4 py-2 rounded-lg border border-white/15 hover:border-emerald-400/40 text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Baixar .gcode</button>
                <button onClick={sendToHost} disabled={errors.length > 0} className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/40 hover:bg-emerald-500/30 text-sm flex items-center gap-2 disabled:opacity-40"><Send className="w-4 h-4" /> Enviar ao Host (imprimir)</button>
                <Link href="/dashboard/bioprint/control" className="px-4 py-2 rounded-lg border border-white/15 hover:border-white/30 text-sm">Etapa 4 (Execução) →</Link>
              </div>
              {errors.length > 0 && <div className="text-xs text-red-300">Resolva os erros acima antes de enviar ao host.</div>}

              <TipsBox tips={profile.tips} title={`Dicas do perfil "${profile.name}"`} />

              <Panel title="G-code" icon={<FlaskConical className="w-4 h-4" />} subtitle={`${result.gcode.split("\n").length.toLocaleString("pt-BR")} linhas`}>
                <pre className="text-[11px] leading-relaxed font-mono max-h-72 overflow-auto bg-black/40 rounded-lg p-3 text-gray-300 whitespace-pre">{result.gcode.slice(0, 20000)}{result.gcode.length > 20000 ? "\n… (truncado no preview — o download contém tudo)" : ""}</pre>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Painéis de parâmetros
// ═══════════════════════════════════════════════════════════════════════════

function BasicParams({ P, setP, X, setX }: { P: SliceParams; setP: (p: SliceParams) => void; X: ExtrusionModel; setX: (x: ExtrusionModel) => void }) {
  const gauge = NEEDLE_GAUGES.find((g) => Math.abs(g.id_mm - P.nozzleDiameter_mm) < 0.005)
  return (
    <div className="space-y-3 text-sm">
      <Field label="Agulha / bico" tip={PARAM_TIPS.nozzleDiameter_mm}>
        <select value={gauge?.gauge ?? "custom"} onChange={(e) => {
          const g = NEEDLE_GAUGES.find((x) => x.gauge === e.target.value)
          if (g) setP({ ...P, nozzleDiameter_mm: g.id_mm, lineWidth_mm: defaultLineWidth(g.id_mm), layerHeight_mm: defaultLayerHeight(g.id_mm), firstLayerHeight_mm: Math.round(defaultLayerHeight(g.id_mm) * 0.9 * 100) / 100 })
        }} className={inp}>
          {NEEDLE_GAUGES.map((g) => <option key={g.gauge} value={g.gauge}>{g.gauge} — Ø {g.id_mm} mm ({g.color})</option>)}
          {!gauge && <option value="custom">Personalizado ({P.nozzleDiameter_mm} mm)</option>}
        </select>
      </Field>
      <Field label="Seringa" tip="Define a conversão µL → mm de êmbolo (E). Confira o diâmetro interno real da sua seringa.">
        <select value={X.kind === "pneumatic" ? "pneumatic" : X.syringe ? `${X.syringe.volume_mL}|${X.syringe.innerDiameter_mm}` : "10|14.5"} onChange={(e) => {
          if (e.target.value === "pneumatic") { setX({ ...X, kind: "pneumatic", pressure_kPa: X.pressure_kPa ?? 75 }); return }
          const [v, d] = e.target.value.split("|").map(Number)
          setX({ ...X, kind: "syringe_stepper", syringe: { volume_mL: v, innerDiameter_mm: d } })
        }} className={inp}>
          {SYRINGE_CATALOG.map((s) => <option key={s.label} value={`${s.volume_mL}|${s.innerDiameter_mm}`}>{s.label}</option>)}
          <option value="pneumatic">Pneumático (pressão)</option>
        </select>
      </Field>
      <Range label="Altura de camada" tip={PARAM_TIPS.layerHeight_mm} value={P.layerHeight_mm} min={0.1} max={1.2} step={0.01} unit="mm" onChange={(v) => setP({ ...P, layerHeight_mm: v, firstLayerHeight_mm: Math.round(v * 0.9 * 100) / 100 })} hint={`${Math.round((P.layerHeight_mm / P.nozzleDiameter_mm) * 100)} % do bico`} />
      <Field label="Padrão de infill" tip={PARAM_TIPS.infillPattern}>
        <select value={P.infillPattern} onChange={(e) => setP({ ...P, infillPattern: e.target.value as InfillPattern })} className={inp}>
          <option value="rectilinear">Woodpile 0/90 (scaffold clássico)</option>
          <option value="zigzag">Zigzag contínuo (menos gotas)</option>
          <option value="grid">Grade cruzada</option>
          <option value="gyroid">Gyroid (isotrópico)</option>
          <option value="concentric">Concêntrico (discos)</option>
          <option value="honeycomb">Favo (hexagonal)</option>
          <option value="none">Sem infill (só paredes)</option>
        </select>
      </Field>
      {P.infillPattern !== "none" && <Range label="Densidade do infill" tip={PARAM_TIPS.infillDensity} value={P.infillDensity} min={5} max={100} step={5} unit="%" onChange={(v) => setP({ ...P, infillDensity: v, strandSpacing_mm: undefined })} hint={`porosidade ≈ ${100 - P.infillDensity} %`} />}
      <Range label="Velocidade" tip={PARAM_TIPS.speedPerimeter_mms} value={P.speedPerimeter_mms} min={1} max={20} step={0.5} unit="mm/s" onChange={(v) => setP({ ...P, speedPerimeter_mms: v, speedInfill_mms: Math.round(v * 1.2 * 10) / 10, speedFirstLayer_mms: Math.max(1, Math.round(v * 0.7 * 10) / 10) })} />
      <Range label="Paredes" tip={PARAM_TIPS.wallCount} value={P.wallCount} min={0} max={4} step={1} unit="" onChange={(v) => setP({ ...P, wallCount: v })} />
      <Field label="Temperatura do cartucho" tip={PARAM_TIPS.cartridgeTemp_C}>
        <div className="flex gap-2 items-center">
          <input type="checkbox" checked={P.cartridgeTemp_C !== null} onChange={(e) => setP({ ...P, cartridgeTemp_C: e.target.checked ? 23 : null })} />
          <input type="number" disabled={P.cartridgeTemp_C === null} value={P.cartridgeTemp_C ?? ""} onChange={(e) => setP({ ...P, cartridgeTemp_C: +e.target.value })} className={cn(inp, "w-24")} /> °C
        </div>
      </Field>
      <Field label="Biotinta com células?" tip={PARAM_TIPS.hasCells}>
        <label className="flex items-center gap-2 text-gray-300"><input type="checkbox" checked={P.hasCells} onChange={(e) => setP({ ...P, hasCells: e.target.checked })} /> sim — calcular shear/viabilidade</label>
      </Field>
    </div>
  )
}

function AdvancedParams({ P, setP, X, setX, rheology, setRheology }: {
  P: SliceParams; setP: (p: SliceParams) => void; X: ExtrusionModel; setX: (x: ExtrusionModel) => void
  rheology?: Rheo; setRheology: (r?: Rheo) => void
}) {
  const num = (k: keyof SliceParams, step = 0.01, min?: number, max?: number) => (
    <input type="number" step={step} min={min} max={max} value={(P[k] as number | null) ?? ""} onChange={(e) => setP({ ...P, [k]: e.target.value === "" ? null : +e.target.value })} className={inp} />
  )
  return (
    <div className="space-y-4 text-sm">
      <Group title="Geometria de camada">
        <F k="nozzleDiameter_mm" label="Bico (mm)">{num("nozzleDiameter_mm", 0.01, 0.05, 2)}</F>
        <F k="lineWidth_mm" label="Largura de linha (mm)">{num("lineWidth_mm", 0.01, 0.05, 3)}</F>
        <F k="layerHeight_mm" label="Camada (mm)">{num("layerHeight_mm", 0.01, 0.05, 2)}</F>
        <F k="firstLayerHeight_mm" label="1ª camada (mm)">{num("firstLayerHeight_mm", 0.01, 0.05, 2)}</F>
      </Group>
      <Group title="Paredes">
        <F k="wallCount" label="Paredes">{num("wallCount", 1, 0, 8)}</F>
        <F k="wallOrder" label="Ordem"><select value={P.wallOrder} onChange={(e) => setP({ ...P, wallOrder: e.target.value as SliceParams["wallOrder"] })} className={inp}><option value="outside_in">fora → dentro</option><option value="inside_out">dentro → fora</option></select></F>
        <F k="seam" label="Costura"><select value={P.seam} onChange={(e) => setP({ ...P, seam: e.target.value as SliceParams["seam"] })} className={inp}><option value="nearest">mais próxima</option><option value="aligned">alinhada</option><option value="rear">traseira</option><option value="random">aleatória</option></select></F>
        <F k="infillOverlap" label="Overlap infill↔parede">{num("infillOverlap", 0.05, 0, 0.6)}</F>
      </Group>
      <Group title="Infill">
        <F k="infillPattern" label="Padrão"><select value={P.infillPattern} onChange={(e) => setP({ ...P, infillPattern: e.target.value as InfillPattern })} className={inp}>
          {(["rectilinear", "zigzag", "grid", "triangles", "honeycomb", "gyroid", "concentric", "none"] as InfillPattern[]).map((p) => <option key={p} value={p}>{p}</option>)}
        </select></F>
        <F k="infillDensity" label="Densidade (%)">{num("infillDensity", 1, 0, 100)}</F>
        <F k="strandSpacing_mm" label="Espaçamento (mm, opcional)"><input type="number" step={0.05} value={P.strandSpacing_mm ?? ""} placeholder="auto" onChange={(e) => setP({ ...P, strandSpacing_mm: e.target.value === "" ? undefined : +e.target.value })} className={inp} /></F>
        <F k="infillAngle_deg" label="Ângulo base (°)">{num("infillAngle_deg", 5, -180, 180)}</F>
        <F k="infillAngleStep_deg" label="Rotação/camada (°)">{num("infillAngleStep_deg", 5, 0, 180)}</F>
        <F k="infillEveryNLayers" label="Infill a cada N camadas">{num("infillEveryNLayers", 1, 0, 10)}</F>
        {P.strandSpacing_mm && <div className="col-span-2 text-xs text-sky-200">poro ≈ {Math.max(0, (P.strandSpacing_mm - P.lineWidth_mm) * 1000).toFixed(0)} µm</div>}
      </Group>
      <Group title="Velocidades (mm/s)">
        <F k="speedPerimeter_mms" label="Perímetro">{num("speedPerimeter_mms", 0.5, 0.5, 60)}</F>
        <F k="speedInfill_mms" label="Infill">{num("speedInfill_mms", 0.5, 0.5, 60)}</F>
        <F k="speedFirstLayer_mms" label="1ª camada">{num("speedFirstLayer_mms", 0.5, 0.5, 60)}</F>
        <F k="speedTravel_mms" label="Travel">{num("speedTravel_mms", 1, 1, 150)}</F>
        <F k="speedZ_mms" label="Z">{num("speedZ_mms", 0.5, 0.5, 20)}</F>
      </Group>
      <Group title="Travel / skirt">
        <F k="zHop_mm" label="Z-hop (mm)">{num("zHop_mm", 0.1, 0, 10)}</F>
        <F k="retractMinTravel_mm" label="Travel mín. p/ retrair (mm)">{num("retractMinTravel_mm", 0.5, 0, 50)}</F>
        <F k="skirtLoops" label="Skirt (voltas)">{num("skirtLoops", 1, 0, 5)}</F>
        <F k="skirtDistance_mm" label="Distância skirt (mm)">{num("skirtDistance_mm", 0.5, 0, 20)}</F>
        <F k="purgeLine_mm" label="Linha de purga (mm)">{num("purgeLine_mm", 1, 0, 100)}</F>
        <F k="layerPause_s" label="Pausa entre camadas (s)">{num("layerPause_s", 1, 0, 120)}</F>
      </Group>
      <Group title="Temperaturas (vazio = não emitir)">
        <F k="cartridgeTemp_C" label="Cartucho (°C)">{num("cartridgeTemp_C", 0.5, 0, 250)}</F>
        <F k="bedTemp_C" label="Mesa (°C)">{num("bedTemp_C", 0.5, 0, 120)}</F>
        <F k="waitForTemps" label="Esperar atingir (M109/M190)"><input type="checkbox" checked={P.waitForTemps} onChange={(e) => setP({ ...P, waitForTemps: e.target.checked })} /></F>
      </Group>
      <Group title="Posicionamento">
        <F k="originX_mm" label="Centro X (mm)">{num("originX_mm", 0.5, -200, 200)}</F>
        <F k="originY_mm" label="Centro Y (mm)">{num("originY_mm", 0.5, -200, 200)}</F>
        <F k="zOffset_mm" label="Z-offset inicial (mm)">{num("zOffset_mm", 0.05, -5, 20)}</F>
        <F k="scale" label="Escala">{num("scale", 0.01, 0.01, 100)}</F>
        <F k="rotationZ_deg" label="Rotação Z (°)">{num("rotationZ_deg", 5, -180, 180)}</F>
        <F k="hasCells" label="Com células"><input type="checkbox" checked={P.hasCells} onChange={(e) => setP({ ...P, hasCells: e.target.checked })} /></F>
      </Group>
      <Group title="Extrusão (seringa / pneumático)">
        <F k="extrusion" label="Tipo"><select value={X.kind} onChange={(e) => setX({ ...X, kind: e.target.value as ExtrusionModel["kind"] })} className={inp}><option value="syringe_stepper">seringa (motor de passo)</option><option value="pneumatic">pneumático</option><option value="filament_eq">filamento equivalente</option></select></F>
        {X.kind === "syringe_stepper" && <F k="syringe" label="Seringa"><select value={X.syringe ? `${X.syringe.volume_mL}|${X.syringe.innerDiameter_mm}` : ""} onChange={(e) => { const [v, d] = e.target.value.split("|").map(Number); setX({ ...X, syringe: { volume_mL: v, innerDiameter_mm: d } }) }} className={inp}>{SYRINGE_CATALOG.map((s) => <option key={s.label} value={`${s.volume_mL}|${s.innerDiameter_mm}`}>{s.label}</option>)}</select></F>}
        {X.kind === "syringe_stepper" && <F k="syringeId" label="Ø interno (mm)"><input type="number" step={0.01} value={X.syringe?.innerDiameter_mm ?? 14.5} onChange={(e) => setX({ ...X, syringe: { volume_mL: X.syringe?.volume_mL ?? 10, innerDiameter_mm: +e.target.value } })} className={inp} /></F>}
        {X.kind === "pneumatic" && <F k="pressure_kPa" label="Pressão (kPa)"><input type="number" step={1} value={X.pressure_kPa ?? 75} onChange={(e) => setX({ ...X, pressure_kPa: +e.target.value })} className={inp} /></F>}
        <F k="flowMultiplier" label="Multiplicador de fluxo"><input type="number" step={0.05} value={X.flowMultiplier} onChange={(e) => setX({ ...X, flowMultiplier: +e.target.value })} className={inp} /></F>
        <F k="primeVolume_uL" label="Prime (µL)"><input type="number" step={0.1} value={X.primeVolume_uL} onChange={(e) => setX({ ...X, primeVolume_uL: +e.target.value })} className={inp} /></F>
        <F k="retractVolume_uL" label="Retração (µL)"><input type="number" step={0.1} value={X.retractVolume_uL} onChange={(e) => setX({ ...X, retractVolume_uL: +e.target.value })} className={inp} /></F>
        <F k="retractSpeed_mms" label="Vel. êmbolo retr. (mm/s)"><input type="number" step={0.5} value={X.retractSpeed_mms} onChange={(e) => setX({ ...X, retractSpeed_mms: +e.target.value })} className={inp} /></F>
        <F k="primeDwell_ms" label="Dwell pós-prime (ms)"><input type="number" step={50} value={X.primeDwell_ms} onChange={(e) => setX({ ...X, primeDwell_ms: +e.target.value })} className={inp} /></F>
      </Group>
      <Group title="Reologia (para shear/viabilidade)">
        <F k="viscosity" label="Viscosidade (Pa·s)"><input type="number" step={0.1} value={rheology?.viscosity_PaS ?? ""} placeholder="ex. 2.5" onChange={(e) => setRheology({ ...rheology, viscosity_PaS: e.target.value === "" ? undefined : +e.target.value })} className={inp} /></F>
        <F k="n" label="Índice power-law n"><input type="number" step={0.05} min={0.1} max={1} value={rheology?.powerLawN ?? ""} placeholder="1 = newtoniano" onChange={(e) => setRheology({ ...rheology, powerLawN: e.target.value === "" ? undefined : +e.target.value })} className={inp} /></F>
      </Group>
      <Group title="Firmware e G-code customizado">
        <F k="firmware" label="Firmware"><select value={P.firmware} onChange={(e) => setP({ ...P, firmware: e.target.value as SliceParams["firmware"] })} className={inp}><option value="marlin">Marlin (Ender/BioEnder)</option><option value="klipper">Klipper</option><option value="reprap">RepRap/Duet</option></select></F>
        <F k="verboseComments" label="Comentários detalhados"><input type="checkbox" checked={P.verboseComments} onChange={(e) => setP({ ...P, verboseComments: e.target.checked })} /></F>
        <div className="col-span-2"><label className="text-xs text-gray-400">Start G-code extra</label><textarea rows={2} value={P.customStart} onChange={(e) => setP({ ...P, customStart: e.target.value })} className={cn(inp, "w-full font-mono text-xs")} /></div>
        <div className="col-span-2"><label className="text-xs text-gray-400">Troca de camada</label><textarea rows={1} value={P.customLayerChange} onChange={(e) => setP({ ...P, customLayerChange: e.target.value })} className={cn(inp, "w-full font-mono text-xs")} /></div>
        <div className="col-span-2"><label className="text-xs text-gray-400">End G-code extra</label><textarea rows={2} value={P.customEnd} onChange={(e) => setP({ ...P, customEnd: e.target.value })} className={cn(inp, "w-full font-mono text-xs")} /></div>
      </Group>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Átomos
// ═══════════════════════════════════════════════════════════════════════════

const inp = "rounded-md bg-black/30 border border-white/10 focus:border-emerald-400/50 px-2 py-1 text-sm w-full"

function Panel({ title, icon, subtitle, children }: { title: string; icon?: React.ReactNode; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-100">{icon}{title}</h3>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </header>
      {children}
    </section>
  )
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
      <button onClick={() => onChange("basic")} className={cn("px-3 py-1.5", mode === "basic" ? "bg-sky-500/20 text-sky-100" : "text-gray-400 hover:text-white")}>Básico</button>
      <button onClick={() => onChange("advanced")} className={cn("px-3 py-1.5", mode === "advanced" ? "bg-violet-500/20 text-violet-100" : "text-gray-400 hover:text-white")}>Avançado</button>
    </div>
  )
}

function PrimBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="text-xs px-2 py-1.5 rounded-lg border border-white/10 hover:border-emerald-400/40 flex items-center gap-1.5 text-gray-300">{icon}{label}</button>
}

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">{label}{tip && <span title={tip} className="cursor-help text-gray-600 hover:text-sky-300"><Info className="w-3 h-3" /></span>}</div>
      {children}
    </div>
  )
}

function Range({ label, tip, value, min, max, step, unit, onChange, hint }: { label: string; tip?: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void; hint?: string }) {
  return (
    <Field label={label} tip={tip}>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="flex-1 accent-emerald-400" />
        <input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className={cn(inp, "w-20")} />
        <span className="text-xs text-gray-500 w-10">{unit}</span>
      </div>
      {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
    </Field>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-white/10 p-3">
      <legend className="px-1 text-xs uppercase tracking-wide text-gray-400">{title}</legend>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>
    </fieldset>
  )
}

function F({ k, label, children }: { k: string; label: string; children: React.ReactNode }) {
  const tip = PARAM_TIPS[k]
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-0.5">{label}{tip && <span title={tip} className="cursor-help text-gray-600 hover:text-sky-300"><Info className="w-3 h-3" /></span>}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className={cn("rounded-lg border p-2.5", tone === "bad" ? "border-red-500/40 bg-red-500/5" : tone === "warn" ? "border-amber-500/40 bg-amber-500/5" : tone === "ok" ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]")}>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-base font-semibold text-gray-100">{value}</div>
      {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
    </div>
  )
}

function TipsBox({ tips, title }: { tips: string[]; title: string }) {
  return (
    <div className="mt-4 text-left rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="text-xs font-semibold text-amber-200 flex items-center gap-1.5 mb-1.5"><Lightbulb className="w-3.5 h-3.5" /> {title}</div>
      <ul className="text-xs text-amber-100/80 space-y-1 list-disc pl-4">{tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  )
}

function fmtTime(s: number): string {
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60), r = s % 60
  if (m < 60) return `${m} min ${r} s`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

interface SR {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null; onerror: (() => void) | null
  start(): void; stop(): void
}
