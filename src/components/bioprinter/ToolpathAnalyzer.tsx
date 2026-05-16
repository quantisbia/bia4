/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ToolpathAnalyzer — Painel de métricas científicas BIA (R12.8)
 *
 *  Apresenta análises do BTIE (Biofabrication Toolpath Intelligence Engine):
 *    - Shear stress + viabilidade prevista (Hagen-Poiseuille + Blaeser)
 *    - Continuidade do path (AERO-inspired)
 *    - Predição de falhas (van der Valk 2025)
 *    - Estatísticas globais
 *
 *  Cada métrica é citável e tem fundamentação no painel de refs.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useMemo } from "react"
import type {
  ParsedGcode,
  ShearAnalysis,
  ContinuityAnalysis,
  FailurePrediction,
} from "@/lib/bioprint/toolpath-engine"
import {
  Activity, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck,
  Zap, GitBranch, Layers, Clock, Ruler, Beaker,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { InfoButton } from "@/components/ui/InfoButton"

export interface ToolpathAnalyzerProps {
  parsed: ParsedGcode
  shear: ShearAnalysis
  continuity: ContinuityAnalysis
  failures: FailurePrediction
  nozzleId: number
  viscosity: number
  yieldStress: number
}

export function ToolpathAnalyzer({
  parsed,
  shear,
  continuity,
  failures,
  nozzleId,
  viscosity,
  yieldStress,
}: ToolpathAnalyzerProps) {
  const { stats } = parsed
  const timeStr = useMemo(() => {
    const m = stats.estimatedTimeMin
    const h = Math.floor(m / 60)
    const min = Math.round(m % 60)
    return h > 0 ? `${h}h ${min}m` : `${min} min`
  }, [stats.estimatedTimeMin])

  return (
    <div className="space-y-4">
      {/* ─── HEADER ─── */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
          <Activity className="w-4 h-4 text-violet-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Toolpath Intelligence Engine
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-200 font-semibold uppercase tracking-wider">
              BTIE
            </span>
          </h3>
          <p className="text-[10px] text-gray-500">
            Análise científica do G-code · Hagen-Poiseuille · Blaeser · AERO · van der Valk
          </p>
        </div>
      </div>

      {/* ─── PRINTABILITY SCORE ─── */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/[0.06] to-violet-500/[0.01] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span className="text-xs font-semibold text-white">Printability Score</span>
            <InfoButton title="Printability Score (BIA)" align="left">
              <p>Score 0–100 calculado a partir de 4 fatores:</p>
              <ul className="list-disc list-inside mt-1 text-[10.5px]">
                <li>Shear máximo (penaliza &gt;500 Pa)</li>
                <li>Continuidade Eulerian (van der Valk 2025)</li>
                <li>Layer height vs yield stress</li>
                <li>Resolução em Z (efeito escada)</li>
              </ul>
            </InfoButton>
          </div>
          <ScoreBadge score={failures.score} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat
            icon={<Zap className="w-3 h-3" />}
            label="Viabilidade"
            value={`${shear.predictedViability.toFixed(1)}%`}
            color={shear.predictedViability > 85 ? "emerald" : shear.predictedViability > 70 ? "amber" : "rose"}
          />
          <Stat
            icon={<TrendingUp className="w-3 h-3" />}
            label="Eulerian"
            value={`${(continuity.eulerianScore * 100).toFixed(0)}/100`}
            color={continuity.eulerianScore > 0.6 ? "emerald" : continuity.eulerianScore > 0.3 ? "amber" : "rose"}
          />
          <Stat
            icon={<AlertTriangle className="w-3 h-3" />}
            label="Riscos"
            value={`${failures.risks.length}`}
            color={failures.risks.length === 0 ? "emerald" : failures.risks.length < 3 ? "amber" : "rose"}
          />
        </div>
      </div>

      {/* ─── SHEAR / FLOW ─── */}
      <CollapsibleBlock
        icon={<Activity className="w-4 h-4 text-cyan-300" />}
        title="Análise de Shear & Fluxo"
        subtitle="Hagen-Poiseuille + Herschel-Bulkley"
        refLabel="van der Valk 2025"
      >
        <div className="grid grid-cols-2 gap-2.5 text-[11px]">
          <KV label="Nozzle ID" value={`${nozzleId} mm`} />
          <KV label="Viscosidade" value={`${viscosity} Pa·s`} />
          <KV label="Yield stress" value={`${yieldStress} Pa`} />
          <KV label="Shear máx" value={`${shear.maxShear.toFixed(1)} Pa`} highlight={shear.maxShear > 500} />
          <KV label="Shear médio" value={`${shear.meanShear.toFixed(1)} Pa`} />
          <KV label="Viabilidade" value={`${shear.predictedViability.toFixed(1)}%`} />
        </div>

        <div className="mt-3 rounded-lg bg-black/30 border border-white/5 p-2">
          <p className="text-[10px] text-gray-400 mb-1">
            <strong className="text-cyan-300">Fórmula aplicada:</strong>
          </p>
          <code className="text-[10.5px] text-cyan-200 font-mono">
            τ = τ₀ + μ·(4Q/πR³) &nbsp;·&nbsp; Q = v·πR²
          </code>
          <p className="text-[9.5px] text-gray-500 mt-1.5 leading-relaxed">
            Onde μ é viscosidade, τ₀ é yield, Q é vazão volumétrica, R é raio do nozzle.
            Para hidrogel não-Newtoniano (Herschel-Bulkley com n=1, k=μ).
          </p>
        </div>
      </CollapsibleBlock>

      {/* ─── CONTINUITY ─── */}
      <CollapsibleBlock
        icon={<GitBranch className="w-4 h-4 text-emerald-300" />}
        title="Continuidade do Path"
        subtitle="AERO-inspired Eulerian analysis"
        refLabel="van der Valk 2025"
      >
        <div className="grid grid-cols-2 gap-2.5 text-[11px]">
          <KV label="Sub-paths" value={`${continuity.continuousSubpaths}`} />
          <KV label="Lifts Z" value={`${continuity.liftCount}`} />
          <KV label="Sub-path médio" value={`${continuity.meanSubpathLen.toFixed(1)} mm`} />
          <KV label="Razão extrude" value={`${(continuity.extrudeRatio * 100).toFixed(1)}%`} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
              style={{ width: `${continuity.eulerianScore * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/70 font-mono w-12 text-right">
            {(continuity.eulerianScore * 100).toFixed(0)}/100
          </span>
        </div>

        <p className="text-[9.5px] text-gray-500 mt-2 leading-relaxed">
          Score Eulerian alto = poucos travels desnecessários. AERO (Automated Eulerian Route
          Optimization) busca caminhos contínuos que minimizam retrações — preserva precisão
          em hidrogéis com retraction artifacts.
        </p>
      </CollapsibleBlock>

      {/* ─── FAILURE PREDICTIONS ─── */}
      <CollapsibleBlock
        icon={<AlertTriangle className="w-4 h-4 text-amber-300" />}
        title="Predição de Falhas"
        subtitle={`${failures.risks.length} risco(s) detectado(s)`}
        refLabel="van der Valk 2025"
      >
        {failures.risks.length === 0 ? (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center gap-2 text-[11px] text-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Nenhum risco crítico detectado. Toolpath aprovado para execução.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {failures.risks.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-2.5 text-[10.5px] leading-relaxed",
                  r.severity === "high" && "bg-rose-500/10 border-rose-500/30 text-rose-200",
                  r.severity === "med" && "bg-amber-500/10 border-amber-500/30 text-amber-200",
                  r.severity === "low" && "bg-white/5 border-white/10 text-white/80",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold uppercase tracking-wider text-[9px]">
                    {r.type.replace(/-/g, " ")}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 uppercase">
                    {r.severity}
                  </span>
                </div>
                <p>{r.explanation}</p>
                {r.location && (
                  <p className="mt-1 text-[9.5px] text-white/50 font-mono">📍 {r.location}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleBlock>

      {/* ─── GLOBAL STATS ─── */}
      <CollapsibleBlock
        icon={<Beaker className="w-4 h-4 text-violet-300" />}
        title="Estatísticas Globais"
        subtitle="Geometria + tempo"
      >
        <div className="grid grid-cols-2 gap-2.5 text-[11px]">
          <KV label={<><Layers className="w-2.5 h-2.5 inline mr-1" />Camadas</>} value={`${stats.layerCount}`} />
          <KV label={<><Clock className="w-2.5 h-2.5 inline mr-1" />Tempo estimado</>} value={timeStr} />
          <KV label={<><Ruler className="w-2.5 h-2.5 inline mr-1" />Extrude total</>} value={`${stats.totalExtrudeLength.toFixed(0)} mm`} />
          <KV label="Travel total" value={`${stats.totalTravelLength.toFixed(0)} mm`} />
          <KV label="Volume E" value={`${stats.totalExtrudeVolume.toFixed(2)} mm`} />
          <KV label="Moves" value={`${stats.moveCount}`} />
          <KV
            label="Bounding"
            value={`${(stats.bounds.max.x - stats.bounds.min.x).toFixed(1)}×${(stats.bounds.max.y - stats.bounds.min.y).toFixed(1)}×${(stats.bounds.max.z - stats.bounds.min.z).toFixed(1)} mm`}
          />
          <KV label="Z range" value={`${stats.bounds.min.z.toFixed(1)} → ${stats.bounds.max.z.toFixed(1)} mm`} />
        </div>
      </CollapsibleBlock>

      {/* ─── WARNINGS (G28 etc) ─── */}
      {parsed.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-semibold text-amber-200">
              {parsed.warnings.length} aviso(s) no G-code
            </span>
          </div>
          <ul className="text-[10px] text-amber-200/80 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
            {parsed.warnings.slice(0, 10).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {parsed.warnings.length > 10 && (
              <li className="text-amber-200/50">... +{parsed.warnings.length - 10}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────

function Stat({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: "emerald" | "amber" | "rose"
}) {
  const colorMap = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  }
  return (
    <div className={cn("rounded-lg border p-2 text-center", colorMap[color])}>
      <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider opacity-70 mb-0.5">
        {icon} {label}
      </div>
      <div className="text-lg font-bold leading-none">{value}</div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "from-emerald-500 to-teal-500" :
    score >= 60 ? "from-amber-500 to-orange-500" :
    "from-rose-500 to-red-500"
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r", color)}>
      <span className="text-lg font-black text-white">{score}</span>
      <span className="text-[10px] text-white/80 font-semibold">/100</span>
    </div>
  )
}

function KV({
  label, value, highlight = false,
}: {
  label: React.ReactNode
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0">
      <span className="text-gray-400 truncate">{label}</span>
      <span className={cn(
        "font-mono font-semibold",
        highlight ? "text-rose-300" : "text-white",
      )}>
        {value}
      </span>
    </div>
  )
}

function CollapsibleBlock({
  icon, title, subtitle, refLabel, children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  refLabel?: string
  children: React.ReactNode
}) {
  return (
    <details className="rounded-xl border border-white/10 bg-black/30 group" open>
      <summary className="px-3 py-2.5 cursor-pointer flex items-center justify-between hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <span className="text-xs font-semibold text-white">{title}</span>
            {subtitle && (
              <span className="text-[10px] text-gray-500 ml-1.5">· {subtitle}</span>
            )}
          </div>
        </div>
        {refLabel && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-200 font-medium">
            {refLabel}
          </span>
        )}
      </summary>
      <div className="px-3 pb-3 pt-1">
        {children}
      </div>
    </details>
  )
}
