"use client"

/**
 * BIA v4 · R17 · "Está saindo biotinta?" — painel de fluxo em tempo real
 * ───────────────────────────────────────────────────────────────────────
 * Aparece em destaque logo que a impressão começa (e fica acessível antes).
 * Botões grandes: "+10 %", "+25 %", "Não está saindo!" (bump inteligente),
 * "Saiu ✓" (grava o fluxo que funcionou na memória por biotinta).
 */

import { Droplet, Check, Plus, Minus, AlertTriangle, Sparkles, Brain } from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { FLOW_MAX, FLOW_MIN, flowAdvice, nextFlowBump, type FlowMemoryEntry } from "@/lib/bioprint/flow-memory"

export interface FlowBoostPanelProps {
  flowPercent: number
  appliedPercent: number | null
  connected: boolean
  streaming: boolean
  materialLabel: string
  memory: FlowMemoryEntry | null
  startPercent: number
  onChange: (next: number) => void
  onConfirmGood: () => void
  compact?: boolean
}

export function FlowBoostPanel(p: FlowBoostPanelProps) {
  const { flowPercent, appliedPercent, connected, streaming, materialLabel, memory, onChange, onConfirmGood } = p
  const applied = appliedPercent === flowPercent
  const tone = flowPercent < 80 ? "amber" : flowPercent <= 160 ? "emerald" : "violet"
  const bump = nextFlowBump(flowPercent)

  return (
    <section
      id="flow-boost-panel"
      className={cn(
        "rounded-2xl border overflow-hidden",
        streaming ? "border-emerald-400/50 shadow-lg shadow-emerald-900/30 bg-gradient-to-br from-emerald-500/10 via-black/30 to-cyan-500/5" : "border-white/10 bg-white/[0.02]",
      )}
    >
      <header className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 bg-black/40">
        <Droplet className="w-4 h-4 text-cyan-300" />
        <h3 className="text-sm font-bold text-white">{streaming ? "Está saindo biotinta?" : "Fluxo da biotinta (M221)"}</h3>
        <span className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full border font-semibold", !connected ? "border-white/10 text-gray-500" : applied ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10" : "border-amber-400/40 text-amber-200 bg-amber-500/10 animate-pulse")}>
          {!connected ? "desconectado" : applied ? "aplicado" : "aplicando…"}
        </span>
      </header>

      <div className="p-4 space-y-3">
        {/* valor grande */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-5xl font-black tabular-nums leading-none", tone === "amber" ? "text-amber-300" : tone === "emerald" ? "text-emerald-200" : "text-violet-200")}>{flowPercent}</span>
            <span className="text-lg text-gray-400">%</span>
          </div>
          <div className="text-right text-[11px] text-gray-400 leading-snug max-w-[55%]">
            <div className="text-gray-300 font-medium truncate">{materialLabel}</div>
            {memory ? (
              <div className="flex items-center gap-1 justify-end text-cyan-300"><Brain className="w-3 h-3" /> última vez funcionou em {memory.lastGoodPercent} % ({memory.samples}×)</div>
            ) : (
              <div>sem histórico — comece generoso</div>
            )}
          </div>
        </div>

        {/* botões grandes */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChange(bump)}
            disabled={!connected || flowPercent >= FLOW_MAX}
            className="col-span-2 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-black hover:from-amber-300 hover:to-orange-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30"
            title={`Sobe o fluxo para ${bump} % imediatamente (M221)`}
          >
            <AlertTriangle className="w-5 h-5" /> Não está saindo — aumentar para {bump} %
          </button>
          <button onClick={() => onChange(Math.min(FLOW_MAX, flowPercent + 10))} disabled={!connected} className="py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> 10 %</button>
          <button onClick={() => onChange(Math.min(FLOW_MAX, flowPercent + 25))} disabled={!connected} className="py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> 25 %</button>
          <button onClick={() => onChange(Math.max(FLOW_MIN, flowPercent - 10))} disabled={!connected} className="py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-gray-300 hover:border-white/25 disabled:opacity-40 flex items-center justify-center gap-1.5"><Minus className="w-3.5 h-3.5" /> 10 % (saindo demais)</button>
          <button
            onClick={onConfirmGood}
            disabled={!connected}
            className="py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 border border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-40 flex items-center justify-center gap-1.5"
            title="Grava este fluxo como o que funciona para esta biotinta — o próximo print já começa nele"
          >
            <Check className="w-3.5 h-3.5" /> Saiu bem — lembrar {flowPercent} %
          </button>
        </div>

        {/* slider fino */}
        <input type="range" min={FLOW_MIN} max={FLOW_MAX} step={1} value={flowPercent} onChange={(e) => onChange(parseInt(e.target.value, 10))} disabled={!connected} className="w-full accent-emerald-400 disabled:opacity-40" />
        <div className="flex justify-between text-[9px] text-gray-500 font-mono"><span>{FLOW_MIN}%</span><span>100</span><span>150</span><span>200</span><span>{FLOW_MAX}%</span></div>

        <p className="text-[11px] text-gray-300 bg-black/30 rounded-lg px-3 py-2 flex gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" /> {flowAdvice(flowPercent, materialLabel)}</p>
      </div>
    </section>
  )
}
