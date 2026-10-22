"use client"

/**
 * BIA v4 · R25 · FlowCheck — "Vai sair biotinta?"
 * Diagnóstico ao vivo do fluxo (fator de extrusão, vazão, velocidade do
 * êmbolo, pré-carga) com base na literatura de extrusão mecânica.
 * Usado na Fase 3 (BioSlicer e Desenhar & Imprimir).
 */

import { useMemo } from "react"
import { AlertTriangle, CheckCircle2, Droplets, Info } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import type { ExtrusionModel, SliceParams } from "@/lib/slicer/types"
import { BIOINK_CLASSES, classifyBioink, diagnoseFlow, type BioinkClass } from "@/lib/slicer/flow-science"

export function FlowCheck({ P, X, setX, material }: {
  P: Pick<SliceParams, "lineWidth_mm" | "layerHeight_mm" | "speedPerimeter_mms" | "nozzleDiameter_mm">
  X: ExtrusionModel
  setX: (x: ExtrusionModel) => void
  material?: string | null
}) {
  const cls = (X.bioinkClass as BioinkClass | undefined) ?? classifyBioink(material)
  const spec = BIOINK_CLASSES[cls]
  const d = useMemo(() => diagnoseFlow(P, X, material, cls), [P, X, material, cls])
  if (X.kind !== "syringe_stepper") return null

  const tone = d.status === "ok" ? "emerald" : d.status === "very_low" ? "rose" : "amber"
  const box = { emerald: "border-emerald-400/40 bg-emerald-500/8", amber: "border-amber-400/40 bg-amber-500/8", rose: "border-rose-400/50 bg-rose-500/10" }[tone]
  const Icon = d.status === "ok" ? CheckCircle2 : AlertTriangle

  return (
    <section className={cn("rounded-xl border p-3 text-xs space-y-2", box)} aria-label="Diagnóstico de fluxo">
      <div className="flex items-start gap-2">
        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", tone === "emerald" ? "text-emerald-300" : tone === "rose" ? "text-rose-300" : "text-amber-300")} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-100 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" /> Vai sair biotinta? {d.status === "ok" ? "Sim — dentro da literatura." : d.status === "very_low" ? "Provavelmente NÃO." : d.status === "low" ? "Pouco — abaixo da faixa." : "Sim, talvez em excesso."}</div>
          <div className="text-gray-400 mt-0.5">{spec.label} · fator {X.flowMultiplier.toFixed(2)}× (faixa {spec.factorRange[0]}–{spec.factorRange[1]}×, ref. {spec.refs})</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[11px]">
        <Stat k="Vazão" v={`${d.flowEffective_uLs.toFixed(2)} µL/s`} sub={`alvo ${spec.flowTarget_uLs[0]}–${spec.flowTarget_uLs[1]}`} bad={d.flowEffective_uLs < spec.flowTarget_uLs[0]} />
        <Stat k="Êmbolo" v={`${d.plungerSpeed_mmmin.toFixed(2)} mm/min`} sub={`mín. ${(spec.minPlunger_mms * 60).toFixed(1)}`} bad={d.plungerSpeed_mms < spec.minPlunger_mms} />
        <Stat k="E por mm" v={d.ePerMm.toFixed(4)} sub="mm êmbolo/mm" />
        <Stat k="Pré-carga" v={`${d.startPrime_uL.toFixed(0)} µL`} sub={`${d.startPrime_Emm.toFixed(2)} mm no START`} />
      </div>

      {d.issues.length > 0 && (
        <ul className="list-disc pl-5 text-gray-300 space-y-0.5">{d.issues.map((t, i) => <li key={i}>{t}</li>)}</ul>
      )}
      <div className="text-gray-400 flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{d.recommendations.join(" ")}</span></div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <label className="text-gray-400">Classe:</label>
        <select value={cls} onChange={(e) => { const c = e.target.value as BioinkClass; setX({ ...X, bioinkClass: c, flowMultiplier: BIOINK_CLASSES[c].extrusionFactor }) }} className="px-2 py-1 rounded bg-black/30 border border-white/10 text-gray-100 text-xs">
          {Object.values(BIOINK_CLASSES).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        {X.flowMultiplier !== spec.extrusionFactor && (
          <button onClick={() => setX({ ...X, bioinkClass: cls, flowMultiplier: spec.extrusionFactor })} className="px-2 py-1 rounded border border-white/15 hover:border-emerald-400/40 text-gray-200">Aplicar fator {spec.extrusionFactor}×</button>
        )}
        {(X.syringe?.volume_mL ?? 10) >= 10 && d.status === "very_low" && (
          <button onClick={() => setX({ ...X, syringe: { volume_mL: 3, innerDiameter_mm: 8.66 } })} className="px-2 py-1 rounded border border-rose-400/40 hover:bg-rose-500/15 text-rose-100">Usar seringa 3 mL</button>
        )}
      </div>
    </section>
  )
}

function Stat({ k, v, sub, bad }: { k: string; v: string; sub?: string; bad?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-2 py-1.5", bad ? "border-rose-400/40 bg-rose-500/10" : "border-white/10 bg-black/20")}>
      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-sans">{k}</div>
      <div className={cn("text-gray-100", bad && "text-rose-200")}>{v}</div>
      {sub && <div className="text-[9px] text-gray-500">{sub}</div>}
    </div>
  )
}
