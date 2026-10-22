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
  /**
   * R25 · Empurra um volume (µL) AGORA via G1 E volumétrico — independe do
   * M221 e funciona durante o stream (inject). É o que faz a biotinta aparecer
   * na ponta quando o M221 sozinho não resolve (seringa 10 mL = 165 mm²).
   */
  onPushNow?: (uL: number) => void
  /** Área da seringa (mm²) para mostrar quanto o êmbolo vai andar. */
  syringeArea_mm2?: number
}

export function FlowBoostPanel(p: FlowBoostPanelProps) {
  const { flowPercent, appliedPercent, connected, streaming, materialLabel, memory, onChange, onConfirmGood, onPushNow, syringeArea_mm2 } = p
  const mmFor = (uL: number) => (syringeArea_mm2 ? ` (${(uL / syringeArea_mm2).toFixed(2)} mm de êmbolo)` : "")
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

        {/* R25 · empurrar volume AGORA (G1 E) — o que de fato faz sair */}
        {onPushNow && (
          <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 space-y-2">
            <div className="text-xs font-semibold text-rose-100">Nada saindo? Empurre biotinta agora (volume real, G1 E)</div>
            <div className="grid grid-cols-3 gap-2">
              {[20, 50, 100].map((uL) => (
                <button key={uL} onClick={() => onPushNow(uL)} disabled={!connected}
                  title={`Extruda ${uL} µL imediatamente${mmFor(uL)} — independe do M221`}
                  className="py-2.5 rounded-lg text-sm font-bold bg-rose-500/20 border border-rose-400/50 text-rose-50 hover:bg-rose-500/30 disabled:opacity-40">
                  +{uL} µL
                </button>
              ))}
            </div>
            <p className="text-[10.5px] text-rose-200/80 leading-snug">
              Agulha 22G + luer têm ~45 µL de volume morto: até encher, nada aparece. O M221 só multiplica o E das próximas linhas —
              em seringa de 10 mL isso é quase nada por mm. Empurre 50 µL e observe a ponta; repita até o filamento aparecer, depois imprima.
            </p>
          </div>
        )}

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
        <div className="flex justify-between text-[9px] text-gray-500 font-mono"><span>{FLOW_MIN}%</span><span>100</span><span>250</span><span>500</span><span>{FLOW_MAX}%</span></div>

        <p className="text-[11px] text-gray-300 bg-black/30 rounded-lg px-3 py-2 flex gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" /> {flowAdvice(flowPercent, materialLabel)}</p>
      </div>
    </section>
  )
}
