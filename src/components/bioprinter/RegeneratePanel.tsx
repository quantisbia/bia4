"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · RegeneratePanel — Regenerador de G-code na pré-execução (R12.65)
 *  ─────────────────────────────────────────────────────────────────────
 *  Painel embutido no /execute que permite à usuária alterar, SEM SAIR
 *  da tela de pré-execução:
 *    - Dimensões do STL (escala X/Y/Z em %)
 *    - Parâmetros de fatiamento (layer height, infill %, print speed,
 *      extrusion multiplier, walls, temperatura do cartucho)
 *
 *  ...e clicar "Regerar G-code" — R20: refatia LOCALMENTE com a base
 *  BioSlicer (mesma malha salva pela Etapa 3 no IndexedDB + overrides),
 *  cobra 6 créditos via /api/gcode/charge e substitui o gcodeText
 *  atual pelo novo. O GcodeValidatorPanel + Viewer3D imediatamente
 *  refletem o novo G-code (com marcador destacado do ponto inicial
 *  G92 X0 Y0 Z0 E0 e do 1º filamento).
 *
 *  Racional (mandato Janaina R12.65):
 *  "para regenerar um gcode, precisa ser feito no painel Validação
 *   visual do G-code · pré-execução, onde podemos alterar dimensões
 *   do STL e Parâmetros de GCode para visualizar depois de uma
 *   regeneracao e antes de bioimpimir. deixe no painel a vista onde
 *   está o ponto inicial da impressão, onde está o G92 x0 y0 z0 e0
 *   para facilitar termos um resultado magnifico e todo conseguirem
 *   imprimir sem dificuldade."
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect } from "react"
import {
  sliceMesh, parseSTL, finalizeMesh, baseParams, singleTool, DEFAULT_TARGET,
  DEFAULT_EXTRUSION_SYRINGE_10ML, type TriMesh, type InfillPattern,
} from "@/lib/slicer"
import { getMesh, getLastMeshId } from "@/lib/slicer/mesh-store"

const INFILL_IDS: InfillPattern[] = ["rectilinear", "grid", "triangles", "honeycomb", "concentric", "gyroid", "zigzag", "none"]
function toInfill(id: string | null | undefined): InfillPattern {
  if (!id) return "rectilinear"
  if ((INFILL_IDS as string[]).includes(id)) return id as InfillPattern
  if (id === "hexagonal" || id === "honeycomb_hex") return "honeycomb"
  if (id === "triangular") return "triangles"
  if (id === "lines" || id === "linear") return "rectilinear"
  return "rectilinear"
}
/** Escala não uniforme X/Y/Z (%) sobre a malha — BioSlicer só tem escala uniforme em params. */
function scaleMesh(m: TriMesh, sx: number, sy: number, sz: number): TriMesh {
  if (sx === 1 && sy === 1 && sz === 1) return m
  const v = new Float32Array(m.vertices.length)
  for (let i = 0; i < m.vertices.length; i += 3) {
    v[i] = m.vertices[i] * sx; v[i + 1] = m.vertices[i + 1] * sy; v[i + 2] = m.vertices[i + 2] * sz
  }
  return finalizeMesh(v, m.triangleCount, m.name)
}
import {
  Wand2, RefreshCw, Sliders, Ruler, Layers, Droplet, Gauge,
  AlertTriangle, CheckCircle2, Loader2, Info,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import type { BioprintProcessState } from "@/lib/bioprint/process-context"

// ─── Props ─────────────────────────────────────────────────────────────

export interface RegeneratePanelProps {
  /** Estado global do processo (model + bioink + slice). O regenerador
   *  usa state.slice.* como base dos parâmetros e refatia a última malha
   *  salva pela Etapa 3 (BioSlicer) com os overrides feitos aqui. */
  bioprintState: BioprintProcessState
  /** Callback disparado quando o novo G-code chega — atualiza o
   *  gcodeText do /execute para que o viewer + validador reflitam. */
  onRegenerated: (gcode: string, meta: { source: string; params: RegenerateOverrides }) => void
  /** Callback opcional para log — quando presente, o painel escreve
   *  info/ok/warn no logger da /execute. */
  onLog?: (severity: "info" | "ok" | "warn" | "error", message: string) => void
  className?: string
}

/**
 * Overrides = deltas aplicados sobre o estado global. Todos opcionais.
 * Quando `null`, o painel usa o valor do state.slice.* (default do
 * fatiamento original). Quando != null, força o valor no payload.
 */
export interface RegenerateOverrides {
  // Dimensões do STL
  scaleXPct: number  // 100 = tamanho original
  scaleYPct: number
  scaleZPct: number
  // Parâmetros de fatiamento
  layerHeightMm: number
  infillPercent: number
  printSpeedMmS: number
  extrusionMultiplier: number
  walls: number
  cartridgeTempC: number
}

// ─── Componente principal ──────────────────────────────────────────────

export function RegeneratePanel({
  bioprintState,
  onRegenerated,
  onLog,
  className,
}: RegeneratePanelProps) {
  // ─── Estado inicial dos overrides — puxa do state.slice se existir ──
  const initial: RegenerateOverrides = useMemo(
    () => ({
      scaleXPct: 100,
      scaleYPct: 100,
      scaleZPct: 100,
      layerHeightMm: bioprintState.slice.layerHeightMm ?? 0.3,
      infillPercent: bioprintState.slice.infillPercent ?? 20,
      printSpeedMmS: bioprintState.slice.printSpeedMmS ?? 8,
      extrusionMultiplier: bioprintState.slice.extrusionMultiplier ?? 1.0,
      walls: 2,
      cartridgeTempC: bioprintState.slice.cartridgeTempC ?? 25,
    }),
    [bioprintState.slice],
  )

  const [overrides, setOverrides] = useState<RegenerateOverrides>(initial)
  const [expanded, setExpanded] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSuccess, setLastSuccess] = useState<string | null>(null)

  // Alguma dimensão foi alterada?
  const hasScaleChange =
    overrides.scaleXPct !== 100 ||
    overrides.scaleYPct !== 100 ||
    overrides.scaleZPct !== 100

  const hasParamChange =
    overrides.layerHeightMm !== initial.layerHeightMm ||
    overrides.infillPercent !== initial.infillPercent ||
    overrides.printSpeedMmS !== initial.printSpeedMmS ||
    overrides.extrusionMultiplier !== initial.extrusionMultiplier ||
    overrides.walls !== 2 ||
    overrides.cartridgeTempC !== initial.cartridgeTempC

  const hasChanges = hasScaleChange || hasParamChange

  // R20: precisa da malha salva pela Etapa 3 (IndexedDB) + biotinta
  const [meshId, setMeshId] = useState<string | null>(null)
  useEffect(() => { setMeshId(getLastMeshId()) }, [])
  const canRegenerate =
    !!meshId &&
    (!!bioprintState.bioink.material ||
     (bioprintState.bioink.formulations?.length ?? 0) > 0)

  // ─── Regeneração (R20: base BioSlicer, local) ───────────────────────
  const handleRegenerate = async () => {
    if (!canRegenerate) {
      setLastError("Malha da Etapa 3 ou biotinta ausente. Fatie na Etapa 3 (BioSlicer) antes de regerar.")
      onLog?.("warn", "Regeneração cancelada: falta malha fatiada ou biotinta no processo.")
      return
    }

    setRegenerating(true)
    setLastError(null)
    setLastSuccess(null)
    onLog?.("info", "Regerando G-code (BioSlicer) com novos parâmetros/dimensões…")

    try {
      const stored = meshId ? await getMesh(meshId) : null
      if (!stored) throw new Error("Malha da Etapa 3 não encontrada neste navegador. Refaça o fatiamento na Etapa 3.")
      const base = parseSTL(stored.bytes, stored.name)
      const mesh = scaleMesh(base, overrides.scaleXPct / 100, overrides.scaleYPct / 100, overrides.scaleZPct / 100)

      const sl = bioprintState.slice
      const nozzle = (sl.nozzleDiameterUm ?? 410) / 1000
      const P = baseParams(nozzle)
      P.layerHeight_mm = overrides.layerHeightMm
      P.firstLayerHeight_mm = Math.round(overrides.layerHeightMm * 0.9 * 100) / 100
      P.wallCount = Math.max(1, overrides.walls)
      P.infillPattern = toInfill(sl.infillPatternId)
      P.infillDensity = overrides.infillPercent
      P.speedPerimeter_mms = overrides.printSpeedMmS
      P.speedInfill_mms = overrides.printSpeedMmS
      P.speedFirstLayer_mms = Math.max(2, overrides.printSpeedMmS * 0.7)
      P.skirtLoops = sl.skirtLoops ?? 0
      P.cartridgeTemp_C = overrides.cartridgeTempC
      P.hasCells = !!bioprintState.bioink.cellType

      const X = {
        ...DEFAULT_EXTRUSION_SYRINGE_10ML,
        flowMultiplier: overrides.extrusionMultiplier,
        pressure_kPa: sl.pressureKPa ?? undefined,
      }
      const material = bioprintState.bioink.material ?? bioprintState.bioink.formulations?.[0]?.material ?? "Biotinta"
      const r = sliceMesh({
        mesh, params: P, extrusion: X,
        profileId: "regenerate", profileName: "Regenerado (pré-execução)",
        jobName: `bia_regen_${bioprintState.model.geometryId ?? stored.name}_${Date.now()}`,
        rheology: { viscosity_PaS: bioprintState.bioink.rheology?.viscosityPaS },
        meta: { material, regenerated: true },
        target: DEFAULT_TARGET,
        tools: singleTool(X, material),
      })
      const fatal = r.warnings.find((w) => w.level === "error")
      if (fatal) throw new Error(fatal.message)

      // R20: todo G-code gerado cobra 6 créditos (admin isento)
      const res = await fetch("/api/gcode/charge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: {
          jobName: "regenerate", profileId: "regenerate", infill: P.infillPattern, infillDensity: P.infillDensity,
          layerCount: r.stats.layerCount, volume_uL: Math.round(r.stats.volume_uL), time_s: r.stats.estimatedTime_s,
          target: "petri", wells: 1, tools: 1, meshName: stored.name,
          geometryId: bioprintState.model.geometryId ?? undefined, gcodeLines: r.gcode.split("\n").length,
        } }),
      })
      if (!res.ok) {
        let msg = res.status === 402 ? "Créditos insuficientes para gerar G-code." : `Falha na cobrança (HTTP ${res.status})`
        try { const j = await res.json(); msg = j.error ?? msg } catch { /* keep */ }
        throw new Error(msg)
      }

      const nLines = r.gcode.split("\n").length
      setLastSuccess(`✓ Novo G-code (${nLines.toLocaleString()} linhas · ${r.stats.layerCount} camadas) — visualize acima.`)
      onLog?.("ok", `Regeneração OK — ${nLines} linhas, ${r.stats.layerCount} camadas.`)
      onRegenerated(r.gcode, {
        source: "RegeneratePanel(execute)",
        params: { ...overrides },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setLastError(msg)
      onLog?.("error", `Regeneração falhou: ${msg}`)
    } finally {
      setRegenerating(false)
    }
  }

  const reset = () => {
    setOverrides(initial)
    setLastError(null)
    setLastSuccess(null)
  }

  // ─── UI ────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all",
        hasChanges
          ? "border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 to-violet-500/5"
          : "border-white/10 bg-white/[0.02]",
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border",
            hasChanges
              ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200"
              : "bg-white/5 border-white/15 text-gray-400",
          )}>
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              Regenerar G-code
              {hasChanges && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-bold">
                  parâmetros alterados
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Ajuste dimensões do STL e parâmetros — visualize antes de imprimir.
            </p>
          </div>
        </div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">
          {expanded ? "recolher" : "expandir"}
        </div>
      </button>

      {/* Pré-check */}
      {!canRegenerate && expanded && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2 text-xs text-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Falta malha fatiada ou biotinta no fluxo.</div>
            <div className="text-amber-200/80 text-[11px] mt-0.5">
              Para regerar aqui, você precisa ter fatiado na Etapa 3 (BioSlicer)
              e definido a biotinta na Etapa 2 antes. Se você importou um G-code direto (upload/paste
              no /execute), pode alterar os parâmetros no próprio arquivo.
            </div>
          </div>
        </div>
      )}

      {expanded && canRegenerate && (
        <div className="mt-4 space-y-4">
          {/* ── Dimensões do STL ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-3.5 h-3.5 text-violet-300" />
              <h4 className="text-xs font-semibold text-violet-200 uppercase tracking-wider">
                Dimensões do STL (escala %)
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Slider
                label="Escala X"
                value={overrides.scaleXPct}
                min={25}
                max={200}
                step={5}
                unit="%"
                onChange={(v) => setOverrides({ ...overrides, scaleXPct: v })}
                tone="rose"
              />
              <Slider
                label="Escala Y"
                value={overrides.scaleYPct}
                min={25}
                max={200}
                step={5}
                unit="%"
                onChange={(v) => setOverrides({ ...overrides, scaleYPct: v })}
                tone="emerald"
              />
              <Slider
                label="Escala Z"
                value={overrides.scaleZPct}
                min={25}
                max={200}
                step={5}
                unit="%"
                onChange={(v) => setOverrides({ ...overrides, scaleZPct: v })}
                tone="cyan"
              />
            </div>
            {hasScaleChange && (
              <div className="mt-2 text-[10px] text-cyan-300 italic flex items-center gap-1">
                <Info className="w-3 h-3" />
                A escala é aplicada aos parâmetros numéricos da geometria
                (width/depth/height/diameter etc). Geometrias importadas
                de STL puro preservam o mesh original.
              </div>
            )}
          </div>

          {/* ── Parâmetros de G-code ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-300" />
              <h4 className="text-xs font-semibold text-cyan-200 uppercase tracking-wider">
                Parâmetros de G-code
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Slider
                label="Layer height"
                value={overrides.layerHeightMm}
                min={0.1}
                max={0.8}
                step={0.05}
                unit="mm"
                decimals={2}
                onChange={(v) => setOverrides({ ...overrides, layerHeightMm: v })}
                icon={<Layers className="w-3 h-3" />}
                tone="violet"
              />
              <Slider
                label="Infill"
                value={overrides.infillPercent}
                min={0}
                max={100}
                step={5}
                unit="%"
                onChange={(v) => setOverrides({ ...overrides, infillPercent: v })}
                tone="amber"
              />
              <Slider
                label="Print speed"
                value={overrides.printSpeedMmS}
                min={2}
                max={30}
                step={1}
                unit="mm/s"
                onChange={(v) => setOverrides({ ...overrides, printSpeedMmS: v })}
                icon={<Gauge className="w-3 h-3" />}
                tone="cyan"
              />
              <Slider
                label="Flow"
                value={overrides.extrusionMultiplier}
                min={0.2}
                max={2.0}
                step={0.1}
                unit="×"
                decimals={1}
                onChange={(v) => setOverrides({ ...overrides, extrusionMultiplier: v })}
                icon={<Droplet className="w-3 h-3" />}
                tone="emerald"
              />
              <Slider
                label="Walls"
                value={overrides.walls}
                min={1}
                max={5}
                step={1}
                unit=""
                onChange={(v) => setOverrides({ ...overrides, walls: v })}
                tone="rose"
              />
              <Slider
                label="Temp cartucho"
                value={overrides.cartridgeTempC}
                min={4}
                max={60}
                step={1}
                unit="°C"
                onChange={(v) => setOverrides({ ...overrides, cartridgeTempC: v })}
                tone="amber"
              />
            </div>
          </div>

          {/* ── Ações ── */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating || !hasChanges}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                regenerating
                  ? "bg-white/5 border border-white/10 text-gray-400 cursor-wait"
                  : hasChanges
                    ? "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-lg shadow-cyan-500/30"
                    : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed",
              )}
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Regerando…
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Regerar G-code
                </>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={regenerating || !hasChanges}
              className="px-3 py-2 rounded-lg text-xs bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Resetar
            </button>
            <div className="flex-1" />
            {hasChanges && (
              <span className="text-[10px] text-gray-400 italic">
                {(hasScaleChange ? 1 : 0) + (hasParamChange ? 1 : 0)} grupo(s) alterado(s)
              </span>
            )}
          </div>

          {/* ── Feedback ── */}
          {lastError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2 text-xs text-rose-100">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Erro ao regerar</div>
                <div className="text-rose-200/80 text-[11px]">{lastError}</div>
              </div>
            </div>
          )}
          {lastSuccess && !lastError && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-2 text-xs text-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>{lastSuccess}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Slider auxiliar ───────────────────────────────────────────────────

function Slider({
  label, value, min, max, step, unit, onChange, tone = "cyan", icon, decimals = 0,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  tone?: "cyan" | "violet" | "emerald" | "amber" | "rose"
  icon?: React.ReactNode
  decimals?: number
}) {
  const tones = {
    cyan:    { bg: "accent-cyan-400", label: "text-cyan-200" },
    violet:  { bg: "accent-violet-400", label: "text-violet-200" },
    emerald: { bg: "accent-emerald-400", label: "text-emerald-200" },
    amber:   { bg: "accent-amber-400", label: "text-amber-200" },
    rose:    { bg: "accent-rose-400", label: "text-rose-200" },
  }
  const t = tones[tone]
  return (
    <div className="rounded-lg bg-black/30 border border-white/10 px-2 py-1.5">
      <div className="flex items-center justify-between mb-1">
        <div className={cn("text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1", t.label)}>
          {icon}
          {label}
        </div>
        <div className="text-[11px] font-mono text-white font-bold">
          {value.toFixed(decimals)}{unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("w-full h-1", t.bg)}
      />
    </div>
  )
}
