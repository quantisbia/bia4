"use client"

/**
 * BIA — Painel de Tecido Vivo (Viabilidade Live)
 *
 * Núcleo científico do Control Center: pega os parâmetros de extrusão
 * (pressão, bico, viscosidade, velocidade, célula) e calcula em tempo real:
 *  - Shear stress na parede do bico (Hagen-Poiseuille)
 *  - Tempo de residência
 *  - Viabilidade prevista (modelo Blaeser 2016 exp-decay)
 *  - Encolhimento pós-cura (compensação dimensional)
 *  - Protocolo de crosslinking sugerido
 *  - Padrão de infill BIO recomendado
 *
 * Toda a matemática vem de biomedical-params.ts. Aqui só é UI + interação.
 */

import { useMemo } from "react"
import {
  Activity, AlertTriangle, CheckCircle2, Microscope, Sparkles,
  Maximize2, Zap, Layers, FlaskConical, Info,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  CELL_SENSITIVITY, SHRINKAGE_DATA, CROSSLINK_PROTOCOLS, INFILL_PATTERNS,
  calculateViability,
  type ViabilityResult,
} from "@/lib/bioprinter/biomedical-params"

// ─── State exportável ───────────────────────────────────────────────────

export interface TissueState {
  cellType: string            // chave em CELL_SENSITIVITY
  cellDensityMillionMl: number
  pressureKPa: number         // copiada do ExtrusionPanel (pode ser editada aqui)
  nozzleDiameterUm: number    // 200/250/410/600/840/1000
  viscosityPaS: number        // viscosidade aparente do bioink
  printSpeedMmS: number
  bioink: string              // chave em SHRINKAGE_DATA / CROSSLINK_PROTOCOLS
  targetDimensionMm: number   // ex.: 10mm (para mostrar compensação)
  infillPatternId: string     // chave em INFILL_PATTERNS
}

export interface TissueViabilityPanelProps {
  state: TissueState
  onChange: (next: TissueState) => void
  onGcode: (line: string) => void
}

// ─── Componente principal ────────────────────────────────────────────────

export function TissueViabilityPanel({ state, onChange, onGcode }: TissueViabilityPanelProps) {
  // Cálculo de viabilidade em tempo real
  const viability: ViabilityResult = useMemo(
    () =>
      calculateViability({
        pressureKPa: state.pressureKPa,
        nozzleDiameterUm: state.nozzleDiameterUm,
        viscosityPaS: state.viscosityPaS,
        printSpeedMmS: state.printSpeedMmS,
        cellType: state.cellType,
      }),
    [state.pressureKPa, state.nozzleDiameterUm, state.viscosityPaS, state.printSpeedMmS, state.cellType]
  )

  const cellInfo = CELL_SENSITIVITY.find((c) => c.cellType === state.cellType) ?? CELL_SENSITIVITY[0]
  const shrinkage = SHRINKAGE_DATA.find((s) => s.bioink.startsWith(state.bioink)) ?? SHRINKAGE_DATA[0]
  const crosslink = CROSSLINK_PROTOCOLS.find((c) => c.bioink === state.bioink) ?? CROSSLINK_PROTOCOLS[0]
  const infill = INFILL_PATTERNS.find((p) => p.id === state.infillPatternId) ?? INFILL_PATTERNS[0]

  // Dimensão compensada (precisa imprimir maior pra acabar do tamanho certo)
  const compensatedMm = state.targetDimensionMm * shrinkage.compensationFactor

  // Cor da viabilidade
  const viabilityColor =
    viability.predictedViabilityPercent >= 85
      ? "emerald"
      : viability.predictedViabilityPercent >= 70
        ? "amber"
        : "rose"

  // Emite G-code do crosslinking sugerido
  const applyCrosslink = () => {
    onGcode(`; ── Crosslinking sugerido: ${crosslink.bioink} (${crosslink.method}) ──`)
    onGcode(`; Agente: ${crosslink.agent}`)
    onGcode(`; Intensidade/conc: ${crosslink.intensityOrConc}`)
    if (crosslink.method === "uv") {
      onGcode(`M355 S1 ; UV ON`)
      onGcode(`G4 S${crosslink.durationFinalMin * 60} ; aguarda cura ${crosslink.durationFinalMin} min`)
      onGcode(`M355 S0 ; UV OFF`)
    } else if (crosslink.method === "ionic") {
      onGcode(`; Aplicar banho de ${crosslink.agent} ${crosslink.intensityOrConc} por ${crosslink.durationFinalMin} min`)
    } else if (crosslink.method === "thermal") {
      onGcode(`M141 S37 ; câmara para 37°C`)
      onGcode(`G4 S${crosslink.durationFinalMin * 60} ; auto-assembly`)
    } else {
      onGcode(`; Aplicar ${crosslink.agent} ${crosslink.intensityOrConc} por ${crosslink.durationFinalMin} min`)
    }
  }

  return (
    <div className="space-y-5">
      {/* ─── PARÂMETROS DE ENTRADA ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo celular */}
        <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3">
          <Label icon={Microscope} text="Tipo celular" tone="emerald" />
          <select
            value={state.cellType}
            onChange={(e) => onChange({ ...state, cellType: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500/50 focus:outline-none"
          >
            {CELL_SENSITIVITY.map((c) => (
              <option key={c.cellType} value={c.cellType} className="bg-[#0a0a0f]">
                {c.cellType}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-gray-500 space-y-0.5">
            <div>
              Tolerância: <span className="text-emerald-300">{(cellInfo.shearTolerancePa / 1000).toFixed(1)} kPa</span>
              {" · "}
              Letal: <span className="text-rose-300">{(cellInfo.shearLethalPa / 1000).toFixed(1)} kPa</span>
            </div>
            <div>
              Bico ideal: <span className="text-cyan-300">{cellInfo.optimalNozzleUm.min}–{cellInfo.optimalNozzleUm.max} µm</span>
            </div>
            <div className="text-gray-600">Ref: {cellInfo.ref}</div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">
              Densidade celular ({state.cellDensityMillionMl}M céls/mL)
            </label>
            <input
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={state.cellDensityMillionMl}
              onChange={(e) => onChange({ ...state, cellDensityMillionMl: +e.target.value })}
              className="w-full accent-emerald-500 mt-1"
            />
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>0.5M</span><span>20M céls/mL</span>
            </div>
          </div>
        </div>

        {/* Bico e velocidade */}
        <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3">
          <Label icon={Activity} text="Bico + impressão" tone="cyan" />

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">
              Diâmetro do bico
            </label>
            <div className="grid grid-cols-6 gap-1 mt-1">
              {[200, 250, 410, 600, 840, 1000].map((d) => {
                const isOptimal = d >= cellInfo.optimalNozzleUm.min && d <= cellInfo.optimalNozzleUm.max
                const isCurrent = state.nozzleDiameterUm === d
                return (
                  <button
                    key={d}
                    onClick={() => onChange({ ...state, nozzleDiameterUm: d })}
                    className={cn(
                      "px-1 py-1.5 rounded text-[10px] font-mono border transition-all",
                      isCurrent
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-100"
                        : isOptimal
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10"
                          : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05]"
                    )}
                    title={isOptimal ? "Ideal para esta célula" : undefined}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
            <div className="text-[9px] text-gray-500 mt-1">
              <span className="text-emerald-400">●</span> ideal para {cellInfo.cellType.split(" ")[0]}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">
              Velocidade ({state.printSpeedMmS} mm/s)
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={state.printSpeedMmS}
              onChange={(e) => onChange({ ...state, printSpeedMmS: +e.target.value })}
              className="w-full accent-cyan-500 mt-1"
            />
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>1 mm/s (lento)</span><span>30 mm/s (rápido)</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">
              Viscosidade ({state.viscosityPaS.toFixed(1)} Pa·s)
            </label>
            <input
              type="range"
              min={0.1}
              max={50}
              step={0.1}
              value={state.viscosityPaS}
              onChange={(e) => onChange({ ...state, viscosityPaS: +e.target.value })}
              className="w-full accent-cyan-500 mt-1"
            />
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>água-like</span><span>pasta densa</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">
              Pressão ({state.pressureKPa} kPa)
            </label>
            <input
              type="range"
              min={5}
              max={200}
              step={1}
              value={state.pressureKPa}
              onChange={(e) => onChange({ ...state, pressureKPa: +e.target.value })}
              className="w-full accent-cyan-500 mt-1"
            />
          </div>
        </div>
      </div>

      {/* ─── RESULTADO DE VIABILIDADE (CALCULADO AO VIVO) ───────────── */}
      <div
        className={cn(
          "rounded-xl border p-5",
          viabilityColor === "emerald" && "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30",
          viabilityColor === "amber" && "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/30",
          viabilityColor === "rose" && "bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/30"
        )}
      >
        <div className="flex items-start gap-4">
          {/* Big viability number */}
          <div className="shrink-0 text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Viabilidade prevista</div>
            <div
              className={cn(
                "text-5xl font-bold tabular-nums",
                viabilityColor === "emerald" && "text-emerald-300",
                viabilityColor === "amber" && "text-amber-300",
                viabilityColor === "rose" && "text-rose-300"
              )}
            >
              {viability.predictedViabilityPercent.toFixed(1)}<span className="text-2xl text-gray-400 ml-1">%</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              Modelo Blaeser 2016 · k={cellInfo.decayConstant}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Metric
                label="Shear stress"
                value={`${(viability.shearStressPa / 1000).toFixed(2)} kPa`}
                tone={
                  viability.shearStressPa > cellInfo.shearLethalPa
                    ? "rose"
                    : viability.shearStressPa > cellInfo.shearTolerancePa
                      ? "amber"
                      : "emerald"
                }
              />
              <Metric
                label="Shear rate"
                value={`${viability.shearRate1S.toFixed(0)} 1/s`}
                tone="cyan"
              />
              <Metric
                label="Tempo bico"
                value={`${viability.residenceTimeS.toFixed(3)} s`}
                tone="cyan"
              />
            </div>

            {/* Status message */}
            <div
              className={cn(
                "flex items-start gap-2 text-xs rounded-lg p-2.5 border",
                viability.warning === "critical" && "bg-rose-500/10 border-rose-500/30 text-rose-200",
                viability.warning === "warn" && "bg-amber-500/10 border-amber-500/30 text-amber-200",
                viability.warning === "ok" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              )}
            >
              {viability.warning === "ok" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-semibold">{viability.message}</div>
                {viability.recommendation && (
                  <div className="text-[11px] opacity-90">→ {viability.recommendation}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ENCOLHIMENTO / COMPENSAÇÃO DIMENSIONAL ─────────────────── */}
      <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3">
        <Label icon={Maximize2} text="Encolhimento pós-cura (compensação dimensional)" tone="purple" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">
              Dimensão alvo ({state.targetDimensionMm} mm)
            </label>
            <input
              type="range"
              min={1}
              max={50}
              step={0.5}
              value={state.targetDimensionMm}
              onChange={(e) => onChange({ ...state, targetDimensionMm: +e.target.value })}
              className="w-full accent-purple-500 mt-1"
            />
          </div>

          <div className="rounded-lg bg-purple-500/5 border border-purple-500/15 p-2.5 text-center">
            <div className="text-[10px] text-purple-300 uppercase tracking-wider mb-0.5">Imprimir com</div>
            <div className="text-xl font-bold text-purple-200 tabular-nums">{compensatedMm.toFixed(2)} mm</div>
            <div className="text-[9px] text-gray-500 mt-0.5">
              Fator: ×{shrinkage.compensationFactor}
            </div>
          </div>

          <div className="rounded-lg bg-black/30 border border-white/10 p-2.5 text-[10px] text-gray-400 space-y-0.5">
            <div>Linear: <span className="text-amber-300">{shrinkage.linearShrinkagePercent}%</span></div>
            <div>Volume: <span className="text-rose-300">{shrinkage.volumetricShrinkagePercent}%</span></div>
            <div>Tempo: <span className="text-cyan-300">{shrinkage.timeToFinishHours}h</span></div>
            <div className="text-gray-600 pt-1">Ref: {shrinkage.ref}</div>
          </div>
        </div>
      </div>

      {/* ─── CROSSLINKING SUGERIDO ──────────────────────────────────── */}
      <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3">
        <Label icon={Zap} text="Crosslinking (cura)" tone="amber" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Bioink (cura)</label>
            <select
              value={state.bioink}
              onChange={(e) => onChange({ ...state, bioink: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:border-amber-500/50 focus:outline-none"
            >
              {CROSSLINK_PROTOCOLS.map((c) => (
                <option key={c.bioink} value={c.bioink} className="bg-[#0a0a0f]">
                  {c.bioink} — {c.method}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={applyCrosslink}
              className="w-full px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Emitir G-code de cura
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Info2 label="Método" value={crosslink.method.toUpperCase()} />
          <Info2 label="Agente" value={crosslink.agent} />
          <Info2 label="Intensidade" value={crosslink.intensityOrConc} />
          <Info2 label="Duração final" value={`${crosslink.durationFinalMin} min`} />
        </div>

        <div className="text-[10px] text-gray-400 bg-black/40 rounded-lg p-2 border border-white/5">
          <div className="flex items-start gap-1.5">
            <Info className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-200 mb-0.5">Racional</div>
              <div className="leading-relaxed">{crosslink.rationale}</div>
            </div>
          </div>
          {crosslink.warnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5 space-y-0.5">
              {crosslink.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1 text-rose-300/80">
                  <span>⚠</span><span>{w}</span>
                </div>
              ))}
            </div>
          )}
          <div className="text-gray-600 mt-1">Ref: {crosslink.ref}</div>
        </div>

        {!crosslink.cellSafe && (
          <div className="text-[10px] text-rose-200 bg-rose-500/10 border border-rose-500/25 rounded-lg p-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>
              <strong>Atenção:</strong> este protocolo NÃO é considerado cell-safe na concentração padrão.
              Use apenas em scaffold acelular ou ajuste o fotoinitiator.
            </span>
          </div>
        )}
      </div>

      {/* ─── PADRÃO DE INFILL BIO ───────────────────────────────────── */}
      <div className="rounded-xl bg-black/30 border border-white/5 p-4 space-y-3">
        <Label icon={Layers} text="Padrão de preenchimento (BIO)" tone="cyan" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {INFILL_PATTERNS.map((p) => {
            const isSelected = state.infillPatternId === p.id
            return (
              <button
                key={p.id}
                onClick={() => onChange({ ...state, infillPatternId: p.id })}
                className={cn(
                  "text-left rounded-lg border p-2.5 transition-all",
                  isSelected
                    ? "bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400/30"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CategoryDot category={p.category} />
                  <div className={cn("text-[11px] font-semibold", isSelected ? "text-cyan-100" : "text-white")}>
                    {p.name}
                  </div>
                </div>
                <div className="text-[9px] text-gray-400 leading-tight line-clamp-2">
                  {p.description}
                </div>
              </button>
            )
          })}
        </div>

        {/* Detalhe do infill selecionado */}
        <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/15 p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <CategoryDot category={infill.category} />
              <div className="text-xs font-semibold text-cyan-100">{infill.name}</div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 uppercase tracking-wider">
              {infill.category}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <Info2 label="Espaçamento" value={`${infill.filamentSpacingUm.ideal} µm`} />
            <Info2 label="Porosidade" value={`${infill.porosityPercent.min}–${infill.porosityPercent.max}%`} />
            <Info2 label="Tecidos alvo" value={infill.targetTissue.slice(0, 2).join(", ")} />
            <Info2 label="Estratégia" value={infill.gcodeStrategy.substring(0, 24) + (infill.gcodeStrategy.length > 24 ? "…" : "")} />
          </div>
          {infill.postProcessing && (
            <div className="text-[10px] text-cyan-200/80 bg-black/30 rounded p-1.5">
              <strong>Pós-processo:</strong> {infill.postProcessing}
            </div>
          )}
          <div className="text-[9px] text-gray-500">Ref: {infill.ref}</div>
        </div>
      </div>

      {/* ─── SUMÁRIO CIENTÍFICO ─────────────────────────────────────── */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/[0.04] to-cyan-500/[0.04] border border-white/10 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FlaskConical className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <h4 className="text-xs font-semibold text-white">Resumo do construct</h4>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              <strong className="text-emerald-200">{cellInfo.cellType}</strong> a{" "}
              <strong className="text-emerald-200">{state.cellDensityMillionMl}M céls/mL</strong>{" "}
              em <strong className="text-cyan-200">{state.bioink}</strong>, extrusão por bico{" "}
              <strong className="text-cyan-200">{state.nozzleDiameterUm} µm</strong> a{" "}
              <strong className="text-cyan-200">{state.pressureKPa} kPa</strong> /{" "}
              <strong className="text-cyan-200">{state.printSpeedMmS} mm/s</strong>.{" "}
              Padrão <strong className="text-purple-200">{infill.name}</strong>.{" "}
              Cura por <strong className="text-amber-200">{crosslink.method}</strong>{" "}
              ({crosslink.intensityOrConc}). Compensação dimensional:{" "}
              <strong className="text-purple-200">×{shrinkage.compensationFactor}</strong>.
            </p>
            <p className="text-[10px] text-gray-500">
              Viabilidade prevista: <strong className={cn(
                viabilityColor === "emerald" && "text-emerald-300",
                viabilityColor === "amber" && "text-amber-300",
                viabilityColor === "rose" && "text-rose-300"
              )}>{viability.predictedViabilityPercent.toFixed(1)}%</strong>
              {" · "}
              Total de células no construct (10mL):{" "}
              <strong className="text-white">
                ~{(state.cellDensityMillionMl * 10 * (viability.predictedViabilityPercent / 100)).toFixed(1)}M vivas
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────

function Label({
  icon: Icon, text, tone = "emerald",
}: {
  icon: React.ElementType
  text: string
  tone?: "emerald" | "cyan" | "amber" | "purple" | "rose"
}) {
  const toneMap = {
    emerald: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", icon: "text-emerald-300", text: "text-emerald-100" },
    cyan:    { bg: "bg-cyan-500/15",    border: "border-cyan-500/30",    icon: "text-cyan-300",    text: "text-cyan-100" },
    amber:   { bg: "bg-amber-500/15",   border: "border-amber-500/30",   icon: "text-amber-300",   text: "text-amber-100" },
    purple:  { bg: "bg-purple-500/15",  border: "border-purple-500/30",  icon: "text-purple-300",  text: "text-purple-100" },
    rose:    { bg: "bg-rose-500/15",    border: "border-rose-500/30",    icon: "text-rose-300",    text: "text-rose-100" },
  }[tone]
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center", toneMap.bg, toneMap.border)}>
        <Icon className={cn("w-3.5 h-3.5", toneMap.icon)} />
      </div>
      <span className={cn("text-xs font-semibold", toneMap.text)}>{text}</span>
    </div>
  )
}

function Metric({
  label, value, tone,
}: {
  label: string
  value: string
  tone: "emerald" | "amber" | "rose" | "cyan"
}) {
  const toneMap = {
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
    amber:   "text-amber-300 bg-amber-500/10 border-amber-500/25",
    rose:    "text-rose-300 bg-rose-500/10 border-rose-500/25",
    cyan:    "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
  }[tone]
  return (
    <div className={cn("rounded-lg border px-2 py-1.5 text-center", toneMap)}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  )
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/30 rounded px-2 py-1 border border-white/5">
      <div className="text-[9px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-[10px] text-white truncate" title={value}>{value}</div>
    </div>
  )
}

function CategoryDot({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    structural:    "bg-gray-400",
    vascular:      "bg-rose-400",
    porous:        "bg-cyan-400",
    multimaterial: "bg-amber-400",
    zonal:         "bg-purple-400",
  }
  return (
    <span
      className={cn("w-2 h-2 rounded-full shrink-0", colorMap[category] ?? "bg-gray-400")}
      title={category}
    />
  )
}
