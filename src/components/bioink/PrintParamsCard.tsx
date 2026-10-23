"use client"

/**
 * BIA v4 · R26 · PrintParamsCard — "Com esta biotinta, imprima assim"
 * Mostra o pacote completo de parâmetros de fatiamento recomendados a partir
 * da biotinta (literatura) + correções da tabela de aprendizado, e envia
 * tudo para a Fase 3 (BioSlicer) com um clique.
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Brain, ChevronDown, Info, Layers, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { recommendPrintParams, describeRecommendation, applicationFromText, SLICER_RECIPE_KEY, type BioinkFacts, type SlicerRecipeHandoff, type Application } from "@/lib/bioprint/print-recommend"
import { suggestFromLearning, syncLearning, type LearnedSuggestion } from "@/lib/bioprint/learning-table"
import { BIOINK_CLASSES } from "@/lib/slicer/flow-science"

const APPS: Array<{ id: Application; label: string }> = [
  { id: "skin", label: "Pele" }, { id: "cartilage", label: "Cartilagem" }, { id: "bone", label: "Osso" }, { id: "vascular", label: "Vascular" },
  { id: "cardiac", label: "Cardíaco" }, { id: "liver", label: "Hepático" }, { id: "neural", label: "Neural" }, { id: "organoid", label: "Organoide" },
  { id: "calibration", label: "Teste de imprimibilidade" }, { id: "generic", label: "Genérico" },
]

export function PrintParamsCard({ facts, source, compact, onBeforeGo }: {
  facts: BioinkFacts
  /** origem para rastreabilidade ("recipes" | "lab" | "free" | "pro") */
  source: string
  compact?: boolean
  /** chamado antes de navegar (ex.: gravar a biotinta no estado do processo) */
  onBeforeGo?: () => void
}) {
  const router = useRouter()
  const [app, setApp] = useState<Application>(facts.application ?? applicationFromText(facts.material))
  const [open, setOpen] = useState(!compact)
  const [learned, setLearned] = useState<LearnedSuggestion | null>(null)
  useEffect(() => { setApp(facts.application ?? applicationFromText(facts.material)) }, [facts.application, facts.material])
  useEffect(() => { void syncLearning().then(() => setLearned(suggestFromLearning({ material: facts.material, application: app }))) }, [facts.material, app])

  const rec = useMemo(() => recommendPrintParams({ ...facts, application: app }), [facts, app])
  // aplica aprendizado por cima da literatura
  const final = useMemo(() => {
    const p = { ...rec.params }; const x = { ...rec.extrusion }; const notes: string[] = []
    if (learned?.params) {
      const L = learned.params
      if (L.flowFactor) { x.flowMultiplier = L.flowFactor; notes.push(`fator ${L.flowFactor.toFixed(2)}× (aprendido)`) }
      if (L.speed_mms) { p.speedPerimeter_mms = L.speed_mms; p.speedInfill_mms = Math.round(L.speed_mms * 1.15 * 2) / 2; p.speedFirstLayer_mms = Math.max(2, Math.round(L.speed_mms * 0.7 * 2) / 2); notes.push(`velocidade ${L.speed_mms} mm/s (aprendido)`) }
      if (L.layerHeight_mm) { p.layerHeight_mm = L.layerHeight_mm; p.firstLayerHeight_mm = Math.round(L.layerHeight_mm * 0.9 * 100) / 100 }
      if (L.infillDensity) p.infillDensity = L.infillDensity
      if (L.wallCount) p.wallCount = L.wallCount
    } else if (learned?.flowFactorThatWorked && learned.flowFactorThatWorked > x.flowMultiplier) {
      x.flowMultiplier = Math.round(learned.flowFactorThatWorked * 100) / 100; notes.push(`fator ${x.flowMultiplier}× — o que fez fluir da última vez`)
    }
    for (const a of learned?.adjustments ?? []) {
      if (a.target === "flowMultiplier") x.flowMultiplier = Math.round((a.op === "mul" ? x.flowMultiplier * a.value : a.op === "add" ? x.flowMultiplier + a.value : a.value) * 100) / 100
      else if (a.target === "primeVolume_uL") x.primeVolume_uL = Math.round((a.op === "mul" ? x.primeVolume_uL * a.value : a.op === "add" ? x.primeVolume_uL + a.value : a.value) * 10) / 10
      else if (a.target === "speedPerimeter_mms") { const v = a.op === "mul" ? p.speedPerimeter_mms * a.value : a.op === "add" ? p.speedPerimeter_mms + a.value : a.value; p.speedPerimeter_mms = Math.round(v * 2) / 2; p.speedInfill_mms = Math.round(v * 1.15 * 2) / 2 }
      else if (a.target === "wallCount") p.wallCount = Math.max(0, Math.round(a.op === "add" ? p.wallCount + a.value : a.value))
      else if (a.target === "infillDensity") p.infillDensity = Math.max(5, Math.min(100, Math.round(a.op === "mul" ? p.infillDensity * a.value : a.op === "add" ? p.infillDensity + a.value : a.value)))
      else if (a.target === "layerHeight_mm") p.layerHeight_mm = Math.round((a.op === "mul" ? p.layerHeight_mm * a.value : a.op === "add" ? p.layerHeight_mm + a.value : a.value) * 100) / 100
      notes.push(a.reason)
    }
    return { params: p, extrusion: x, notes }
  }, [rec, learned])

  const rows = useMemo(() => describeRecommendation({ ...rec, params: final.params, extrusion: final.extrusion }), [rec, final])

  const go = () => {
    onBeforeGo?.()
    const h: SlicerRecipeHandoff = { source, material: facts.material, application: app, params: final.params, extrusion: final.extrusion, rheology: { viscosity_PaS: facts.viscosity_PaS ?? undefined, powerLawN: facts.powerLawN ?? undefined }, why: rec.why }
    try { sessionStorage.setItem(SLICER_RECIPE_KEY, JSON.stringify(h)) } catch { /* noop */ }
    router.push("/dashboard/bioprint/slice?recipe=1")
  }

  return (
    <section className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-cyan-500/5 p-4 space-y-3" aria-label="Parâmetros de impressão recomendados">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300/80 font-semibold">Com esta biotinta, imprima assim</div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5"><Layers className="w-4 h-4 text-violet-300" /> Parâmetros de fatiamento recomendados</h3>
          <div className="text-[11px] text-gray-400 mt-0.5">{BIOINK_CLASSES[rec.bioinkClass].label} · {facts.material}</div>
        </div>
        <label className="text-[11px] text-gray-400 flex items-center gap-1.5">Aplicação
          <select value={app} onChange={(e) => setApp(e.target.value as Application)} className="px-2 py-1 rounded bg-black/30 border border-white/10 text-gray-100">
            {APPS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </label>
      </header>

      {learned && learned.samples > 0 && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/8 px-3 py-2 text-[11px] text-emerald-100 flex gap-2">
          <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-300" />
          <div><b>A BIA já aprendeu com {learned.samples} impressão(ões) desta biotinta</b> ({learned.gold} boa{learned.gold === 1 ? "" : "s"}). {learned.notes.join(" ")}{final.notes.length ? ` Ajustes aplicados: ${final.notes.join("; ")}.` : ""}</div>
        </div>
      )}
      {rec.cautions.map((c, i) => <div key={i} className="rounded-lg border border-amber-400/30 bg-amber-500/8 px-3 py-2 text-[11px] text-amber-100 flex gap-2"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />{c}</div>)}

      <div className={cn("grid gap-1.5", compact && !open ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
        {(compact && !open ? rows.slice(0, 6) : rows).map((r) => (
          <div key={r.k} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2"><span className="text-[10px] uppercase tracking-wider text-gray-500">{r.k}</span><span className="text-sm text-gray-100 font-mono text-right">{r.v}</span></div>
            {(!compact || open) && <div className="text-[11px] text-gray-400 mt-1 leading-snug">{r.why}</div>}
          </div>
        ))}
      </div>
      {compact && (
        <button onClick={() => setOpen(!open)} className="text-[11px] text-gray-400 hover:text-gray-200 inline-flex items-center gap-1"><ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} /> {open ? "Ocultar justificativas" : "Ver todos os parâmetros e por quê"}</button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="text-[10px] text-gray-500">Referências: {rec.refs.join(" · ")}</div>
        <button onClick={go} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-black font-semibold text-sm hover:opacity-90">
          <Sparkles className="w-4 h-4" /> Ir ao Fatiamento com estes parâmetros <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  )
}
