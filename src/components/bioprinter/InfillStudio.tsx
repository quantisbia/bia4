/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  InfillStudio — Gerador proprietário BIA de infills biomiméticos (R12.8)
 *
 *  Permite ao bioengenheiro gerar G-code de scaffolds com:
 *    - Gyroid (TPMS · Enneper-Weierstrass)
 *    - Voronoi (Lloyd relaxation)
 *    - Concentric (CHIPS-inspired)
 *    - Vector-field (NAATIV3-inspired): radial, circular, helical, linear
 *
 *  Cada preset tem fundamentação científica + parâmetros editáveis.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState, useCallback } from "react"
import {
  Sparkles, Box, GitBranch, Network, Wind, Play,
  Hexagon, Compass, Spline, Move,
} from "lucide-react"
import {
  generateGyroidGcode,
  generateVoronoiGcode,
  generateConcentricGcode,
  generateVectorFieldGcode,
  biaHeader,
  FIELD_RADIAL,
  FIELD_CIRCULAR,
  FIELD_HELICAL,
  FIELD_LINEAR,
  type VectorFieldFn,
  type InfillParams,
} from "@/lib/bioprint/toolpath-engine"
import { cn } from "@/lib/utils/helpers"
import { InfoButton } from "@/components/ui/InfoButton"

export type InfillPreset =
  | "gyroid"
  | "voronoi"
  | "concentric"
  | "vector-radial"
  | "vector-circular"
  | "vector-helical"
  | "vector-linear"

const PRESETS: Array<{
  id: InfillPreset
  name: string
  desc: string
  icon: React.ComponentType<{ className?: string }>
  refLabel: string
  category: "TPMS" | "Stochastic" | "Channel" | "Vector"
  applicationHint: string
}> = [
  {
    id: "gyroid",
    name: "Gyroid TPMS",
    desc: "Superfície mínima triplamente periódica — alta área superficial, perfusão homogênea.",
    icon: Hexagon,
    refLabel: "van der Valk 2025",
    category: "TPMS",
    applicationHint: "ósseo · cartilagem · hepático",
  },
  {
    id: "voronoi",
    name: "Voronoi Bio",
    desc: "Padrão estocástico inspirado em tecido trabecular ósseo, com células randomizadas.",
    icon: Network,
    refLabel: "van der Valk 2025",
    category: "Stochastic",
    applicationHint: "ósseo trabecular · scaffold poroso",
  },
  {
    id: "concentric",
    name: "Concentric Perimeter",
    desc: "Perímetros concêntricos com infill 35% — alta fidelidade de canal interno.",
    icon: Compass,
    refLabel: "Shiwarski 2025 (CHIPS)",
    category: "Channel",
    applicationHint: "vascular · perfusion · organ-on-a-chip",
  },
  {
    id: "vector-radial",
    name: "Streamlines Radiais",
    desc: "Toolpaths radiais a partir do centro — vasos saindo de um hilo (NAATIV3 simplificado).",
    icon: Move,
    refLabel: "Griffin 2025 (NAATIV3)",
    category: "Vector",
    applicationHint: "fígado · rim · próstata",
  },
  {
    id: "vector-circular",
    name: "Streamlines Circulares",
    desc: "Fibras concêntricas (campo tangencial) — anisotropia rotacional.",
    icon: Compass,
    refLabel: "Griffin 2025 (NAATIV3)",
    category: "Vector",
    applicationHint: "íris · anular fibroso · esfíncter",
  },
  {
    id: "vector-helical",
    name: "Streamlines Helicoidais",
    desc: "Ângulo helical progressivo em Z (+60° a -60° transmural) — miocárdio.",
    icon: Spline,
    refLabel: "Griffin 2025 (NAATIV3)",
    category: "Vector",
    applicationHint: "miocárdio · ventrículo · músculo",
  },
  {
    id: "vector-linear",
    name: "Streamlines Lineares",
    desc: "Fibras paralelas unidirecionais — anisotropia muscular.",
    icon: GitBranch,
    refLabel: "Griffin 2025 (NAATIV3)",
    category: "Vector",
    applicationHint: "músculo esquelético · tendão · ligamento",
  },
]

export interface InfillStudioProps {
  /** Callback quando G-code é gerado (para load no viewer) */
  onGenerate: (gcode: string, preset: InfillPreset) => void
}

export function InfillStudio({ onGenerate }: InfillStudioProps) {
  const [preset, setPreset] = useState<InfillPreset>("gyroid")
  const [bounds, setBounds] = useState({ width: 30, depth: 30, height: 10 })
  const [density, setDensity] = useState(0.4)
  const [layerHeight, setLayerHeight] = useState(0.2)
  const [feedrate, setFeedrate] = useState(900)
  const [extrusionWidth, setExtrusionWidth] = useState(0.41)
  const [voronoiSites, setVoronoiSites] = useState(40)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = useCallback(() => {
    setGenerating(true)
    setTimeout(() => {
      const params: InfillParams = {
        bounds,
        density,
        layerHeight,
        feedrate,
        extrusionWidth,
      }
      const header = biaHeader({
        jobName: `${preset}-scaffold`,
        bioink: "GelMA 10%",
        nozzleId: extrusionWidth,
      })

      let body = ""
      switch (preset) {
        case "gyroid":
          body = generateGyroidGcode(params)
          break
        case "voronoi":
          body = generateVoronoiGcode(params, voronoiSites)
          break
        case "concentric":
          body = generateConcentricGcode(params)
          break
        case "vector-radial":
          body = generateVectorFieldGcode(params, FIELD_RADIAL)
          break
        case "vector-circular":
          body = generateVectorFieldGcode(params, FIELD_CIRCULAR)
          break
        case "vector-helical":
          body = generateVectorFieldGcode(params, FIELD_HELICAL)
          break
        case "vector-linear":
          body = generateVectorFieldGcode(params, FIELD_LINEAR)
          break
      }
      onGenerate(header + body, preset)
      setGenerating(false)
    }, 50)
  }, [preset, bounds, density, layerHeight, feedrate, extrusionWidth, voronoiSites, onGenerate])

  return (
    <div className="space-y-3">
      {/* ─── HEADER ─── */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-cyan-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            Infill Studio
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-semibold uppercase tracking-wider">
              BIA proprietary
            </span>
            <InfoButton title="Infill Studio BIA" align="left">
              <p>Geradores proprietários BIA baseados em literatura científica:</p>
              <ul className="list-disc list-inside text-[10.5px] mt-1 space-y-0.5">
                <li><strong>TPMS Gyroid</strong> — Enneper-Weierstrass (van der Valk 2025)</li>
                <li><strong>Voronoi</strong> — Lloyd relaxation (estocástico ósseo)</li>
                <li><strong>Concentric</strong> — CHIPS perfusable (Shiwarski 2025)</li>
                <li><strong>Vector-field</strong> — NAATIV3 streamlines RK4 (Griffin 2025)</li>
              </ul>
              <p className="mt-1.5 text-amber-200">
                G-code 100% sem G28 (home) — compatível bioimpressão.
              </p>
            </InfoButton>
          </h3>
          <p className="text-[10px] text-gray-500">
            Gera G-code biomimético · TPMS · Voronoi · Vector-field NAATIV3
          </p>
        </div>
      </div>

      {/* ─── PRESET GRID ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {PRESETS.map((p) => {
          const Icon = p.icon
          const active = preset === p.id
          return (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "text-left rounded-xl border p-2.5 transition-all",
                active
                  ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-400/30"
                  : "border-white/10 bg-black/30 hover:border-white/25 hover:bg-white/[0.02]",
              )}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <Icon className={cn("w-4 h-4", active ? "text-cyan-300" : "text-gray-400")} />
                <span className={cn(
                  "text-[8.5px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                  active
                    ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-200"
                    : "bg-white/[0.04] border border-white/10 text-gray-500",
                )}>
                  {p.category}
                </span>
              </div>
              <h4 className={cn("text-[11.5px] font-semibold", active ? "text-white" : "text-gray-200")}>
                {p.name}
              </h4>
              <p className="text-[9.5px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                {p.desc}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[8.5px] text-cyan-200/60">📚 {p.refLabel}</span>
              </div>
              <p className="text-[8.5px] text-emerald-300/70 mt-0.5">🎯 {p.applicationHint}</p>
            </button>
          )
        })}
      </div>

      {/* ─── PARAMETERS ─── */}
      <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Box className="w-3 h-3" /> Parâmetros geométricos
        </h4>

        <div className="grid grid-cols-3 gap-2">
          <NumField label="Largura (mm)" value={bounds.width} onChange={(v) => setBounds({ ...bounds, width: v })} min={5} max={200} step={1} />
          <NumField label="Profundidade (mm)" value={bounds.depth} onChange={(v) => setBounds({ ...bounds, depth: v })} min={5} max={200} step={1} />
          <NumField label="Altura (mm)" value={bounds.height} onChange={(v) => setBounds({ ...bounds, height: v })} min={1} max={100} step={0.5} />
        </div>

        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pt-1">
          <Wind className="w-3 h-3" /> Extrusão & deposição
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <NumField label="Layer height (mm)" value={layerHeight} onChange={setLayerHeight} min={0.05} max={2} step={0.05} />
          <NumField label="Nozzle ID (mm)" value={extrusionWidth} onChange={setExtrusionWidth} min={0.1} max={2} step={0.01} />
          <NumField label="Feedrate (mm/min)" value={feedrate} onChange={setFeedrate} min={60} max={6000} step={60} />
          <SliderField label={`Densidade infill: ${(density * 100).toFixed(0)}%`} value={density} onChange={setDensity} min={0.05} max={1} step={0.05} />
        </div>

        {preset === "voronoi" && (
          <SliderField
            label={`Voronoi sites: ${voronoiSites}`}
            value={voronoiSites}
            onChange={(v) => setVoronoiSites(Math.round(v))}
            min={10}
            max={200}
            step={5}
          />
        )}
      </div>

      {/* ─── ACTION ─── */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/20"
      >
        {generating ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin" />
            Gerando G-code...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Gerar G-code · {PRESETS.find(p => p.id === preset)?.name}
          </>
        )}
      </button>
    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function NumField({
  label, value, onChange, min, max, step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-400 block mb-1">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:border-cyan-500/50 outline-none"
      />
    </label>
  )
}

function SliderField({
  label, value, onChange, min, max, step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-400 block mb-1">{label}</span>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full accent-cyan-500"
      />
    </label>
  )
}
