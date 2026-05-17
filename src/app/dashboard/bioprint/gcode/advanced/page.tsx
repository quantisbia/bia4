"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — G-code Avançado · NAATIV3 (R12.14)
 *  ───────────────────────────────────────────────────────────────────────
 *  Nível AVANÇADO: vector field NAATIV3, helicoidal transmural real,
 *  multi-material, canais sacrificiais, vascularização Murray.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  Brain, Eye, Play, Download, ArrowRight, ChevronRight,
  Sparkles, BookOpen, Layers as LayersIcon, FileCode, Clock,
  Droplets, AlertTriangle, CheckCircle2, Info, Network,
  Workflow, Heart, Zap, GitBranch, Plus, Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  TISSUE_STRATEGIES, getTissueStrategy, crosslinkingLabel,
  type TissueId,
} from "@/lib/bioprint/tissue-strategies"
import {
  generateAdvancedGcode, generateAdvancedConceptualPreview,
  strategyLabel, strategyDescription, fieldPresetLabel,
  ADVANCED_STRATEGIES, VECTOR_FIELD_PRESETS, NAATIV3_CITATION,
  type AdvancedStrategy, type VectorFieldPreset, type MaterialSlot,
  type AdvancedGcodeInput, type AdvancedGcodeResult, type AdvancedConceptualPreview,
} from "@/lib/bioprint/advanced-gcode"
import { verdictColor, NELSON_2021_CITATION } from "@/lib/bioprint/printability-nelson2021"
import { parseGcode, type ParsedGcode } from "@/lib/bioprint/toolpath-engine"
import { GcodeViewer3D } from "@/components/bioprinter/GcodeViewer3D"

// ─── Default material ─────────────────────────────────────────────────────

function defaultMaterial(idx: 0 | 1 | 2 | 3, label: string, isSacrificial = false): MaterialSlot {
  return {
    toolIndex: idx,
    label,
    bioink: {
      materialLabel: isSacrificial ? "Pluronic F-127 30%" : "GelMA 10% + LAP 0.3%",
      nozzleDiameter_mm: 0.41,
      viscosity_PaS: isSacrificial ? 15 : 5,
      printSpeed_mms: 8,
      travelSpeed_mms: 25,
      pressure_kpa: 80,
      hasCells: !isSacrificial,
      cellType: isSacrificial ? null : "iPSC-CMs",
      cellDensity_M_per_mL: isSacrificial ? null : 20,
      crosslinker: isSacrificial ? "Dissolução 4°C" : "UV 365nm + LAP",
    },
    uiColor: isSacrificial ? "#94a3b8" : ["#f97316", "#06b6d4", "#a855f7", "#ec4899"][idx],
  }
}

export default function AdvancedGcodePage() {
  // ─── Estado ────────────────────────────────────────────────────────────
  const [strategy, setStrategy] = useState<AdvancedStrategy>("vector-field-naativ3")
  const [tissue, setTissue] = useState<TissueId>("myocardium")
  const [fieldPreset, setFieldPreset] = useState<VectorFieldPreset>("helical-myocard")
  const [dims, setDims] = useState({ width: 20, depth: 20, height: 3 })
  const [layerHeight, setLayerHeight] = useState(0.25)
  const [infillPct, setInfillPct] = useState(80)
  const [helicalStart, setHelicalStart] = useState(60)
  const [helicalEnd, setHelicalEnd] = useState(-60)
  const [channelPitch, setChannelPitch] = useState(2.5)
  const [channelDiameter, setChannelDiameter] = useState(0.8)
  const [vascularLevels, setVascularLevels] = useState(3)
  const [latticePitch, setLatticePitch] = useState(2.0)
  const [materials, setMaterials] = useState<MaterialSlot[]>([
    defaultMaterial(0, "Principal"),
  ])

  const [preview, setPreview] = useState<AdvancedConceptualPreview | null>(null)
  const [result, setResult] = useState<AdvancedGcodeResult | null>(null)
  const [parsedViz, setParsedViz] = useState<ParsedGcode | null>(null)
  const [stage, setStage] = useState<"config" | "previewed" | "generated">("config")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ─── Sugere materiais conforme estratégia muda ─────────────────────────
  useEffect(() => {
    if (strategy === "vascular-murray" || strategy === "sacrificial-channels") {
      // Garantir que tem material sacrificial
      setMaterials((curr) => {
        if (curr.find((m) => m.label.toLowerCase().includes("sacrif"))) return curr
        return [
          curr[0] ?? defaultMaterial(0, "Matriz hidrogel"),
          defaultMaterial(1, "Sacrificial Pluronic", true),
        ]
      })
    } else if (strategy === "multi-material-stack") {
      setMaterials((curr) => {
        if (curr.length >= 2) return curr
        return [
          defaultMaterial(0, "Zona inferior"),
          defaultMaterial(1, "Zona superior"),
        ]
      })
    }
  }, [strategy])

  // ─── Build input ───────────────────────────────────────────────────────
  const buildInput = useCallback((): AdvancedGcodeInput => ({
    strategy,
    tissue,
    dimensions: { ...dims },
    layerHeight_mm: layerHeight,
    infillDensity_pct: infillPct,
    materials,
    fieldPreset,
    helicalAngleStart_deg: helicalStart,
    helicalAngleEnd_deg: helicalEnd,
    channelPitch_mm: channelPitch,
    channelDiameter_mm: channelDiameter,
    vascularLevels,
    latticePitch_mm: latticePitch,
    jobName: `${strategy}_${tissue}`,
  }), [strategy, tissue, dims, layerHeight, infillPct, materials, fieldPreset, helicalStart, helicalEnd, channelPitch, channelDiameter, vascularLevels, latticePitch])

  // ─── Preview ───────────────────────────────────────────────────────────
  const handlePreview = useCallback(() => {
    setErrorMsg(null)
    try {
      const t0 = performance.now()
      const p = generateAdvancedConceptualPreview(buildInput())
      const dt = performance.now() - t0
      setPreview(p)
      setStage("previewed")
      setResult(null)
      setParsedViz(null)
      console.log(`[advanced-gcode] preview ${dt.toFixed(1)} ms · ${p.layerCount} camadas · ${p.streamlineCount} streamlines · ${p.criticalZones.length} zonas`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setPreview(null)
    }
  }, [buildInput])

  // ─── Generate ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    setErrorMsg(null)
    try {
      const t0 = performance.now()
      const r = generateAdvancedGcode(buildInput())
      const dt = performance.now() - t0
      setResult(r)
      setStage("generated")
      try {
        const parsed = parseGcode(r.gcode)
        setParsedViz(parsed)
      } catch (e) {
        setParsedViz(null)
      }
      console.log(`[advanced-gcode] gcode ${dt.toFixed(1)} ms · ${r.moveCount} moves`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setResult(null)
    }
  }, [buildInput])

  const handleDownload = useCallback(() => {
    if (!result) return
    const blob = new Blob([result.gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${strategy}_${tissue}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, strategy, tissue])

  // ─── Material ops ──────────────────────────────────────────────────────
  const addMaterial = () => {
    if (materials.length >= 4) return
    const nextIdx = materials.length as 0 | 1 | 2 | 3
    setMaterials([...materials, defaultMaterial(nextIdx, `Material ${nextIdx + 1}`)])
  }
  const removeMaterial = (i: number) => {
    if (materials.length <= 1) return
    setMaterials(materials.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, toolIndex: idx as 0 | 1 | 2 | 3 })))
  }
  const updateMaterial = (i: number, patch: Partial<MaterialSlot>) => {
    setMaterials(materials.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  }
  const updateMaterialBioink = (i: number, patch: Partial<MaterialSlot["bioink"]>) => {
    setMaterials(materials.map((m, idx) => idx === i ? { ...m, bioink: { ...m.bioink, ...patch } } : m))
  }

  // ─── Sugere fieldPreset por strategy ───────────────────────────────────
  const showFieldPreset = strategy === "vector-field-naativ3"
  const showHelicalControls = strategy === "helical-transmural" || (strategy === "vector-field-naativ3" && fieldPreset === "helical-myocard")
  const showVascularControls = strategy === "vascular-murray"
  const showChannelControls = strategy === "sacrificial-channels"
  const showLatticeControls = strategy === "lattice-3d-naativ3"

  // ═══════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-fuchsia-500/[0.04] to-cyan-500/[0.04] p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <Link href="/dashboard/bioprint/gcode"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-gray-300 hover:text-white transition"
            title="Voltar ao hub">
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
                Nível Avançado · NAATIV3 · R12.14
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-200 font-semibold uppercase tracking-wider">
                Vector Field
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-0.5">
              NAATIV3 · Toolpath alinhado à arquitetura do tecido
            </h1>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed max-w-3xl">
              <strong className="text-violet-200">Nonplanar Architecture-Aligned Toolpathing for In Vitro 3D Bioprinting</strong>.
              Cada filamento integra um campo vetorial f(x,y,z) — axial, radial, helicoidal miocárdico, axonal —
              e respeita a anisotropia REAL do tecido. Suporta multi-material, canais sacrificiais e vascularização Murray.
            </p>
            <p className="text-[10.5px] text-violet-300/70 mt-2 italic">
              Inspirado em: {NAATIV3_CITATION.short} — {NAATIV3_CITATION.inspiration}
            </p>
          </div>
        </div>
      </header>

      {/* ─── Grid 2 colunas ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-5 items-start">
        {/* ════════════ COLUNA ESQUERDA — Inputs ═════════════════════════ */}
        <div className="space-y-5">

          {/* ─── PASSO 1: ESTRATÉGIA ─────────────────────────────────── */}
          <section className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-violet-500/15 bg-violet-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Workflow className="w-4 h-4 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
                  Passo 1
                </div>
                <h2 className="text-sm font-bold text-white">Estratégia NAATIV3</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-200">
                {strategyLabel(strategy)}
              </span>
            </header>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ADVANCED_STRATEGIES.map((s) => (
                  <button key={s} onClick={() => setStrategy(s)}
                    className={cn(
                      "text-left rounded-xl border px-3 py-2.5 transition-all",
                      strategy === s
                        ? "border-violet-400 bg-violet-500/15"
                        : "border-white/10 bg-white/[0.02] hover:border-violet-500/30",
                    )}>
                    <div className="text-[12px] font-bold text-white flex items-center gap-1.5">
                      {s === "vector-field-naativ3" && <Network className="w-3.5 h-3.5 text-violet-300" />}
                      {s === "helical-transmural" && <Heart className="w-3.5 h-3.5 text-rose-300" />}
                      {s === "vascular-murray" && <GitBranch className="w-3.5 h-3.5 text-red-300" />}
                      {s === "sacrificial-channels" && <Zap className="w-3.5 h-3.5 text-amber-300" />}
                      {s === "multi-material-stack" && <LayersIcon className="w-3.5 h-3.5 text-cyan-300" />}
                      {s === "lattice-3d-naativ3" && <Sparkles className="w-3.5 h-3.5 text-emerald-300" />}
                      {strategyLabel(s)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 leading-snug">
                      {strategyDescription(s)}
                    </div>
                  </button>
                ))}
              </div>

              {/* Tissue context */}
              <div className="rounded-lg bg-black/20 border border-white/8 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                  Tecido de referência (informa biologia)
                </div>
                <select value={tissue} onChange={(e) => setTissue(e.target.value as TissueId)}
                  className="w-full rounded-md bg-black/30 border border-white/10 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50">
                  {TISSUE_STRATEGIES.map((t) => (
                    <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ─── PASSO 2: PARÂMETROS POR STRATEGY ───────────────────── */}
          <section className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-fuchsia-500/15 bg-fuchsia-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-fuchsia-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-fuchsia-300/80 font-semibold">Passo 2</div>
                <h2 className="text-sm font-bold text-white">Parâmetros específicos</h2>
              </div>
            </header>
            <div className="p-4 space-y-3">
              {/* Vector field preset */}
              {showFieldPreset && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">
                    Preset de campo vetorial
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VECTOR_FIELD_PRESETS.map((p) => (
                      <button key={p} onClick={() => setFieldPreset(p)}
                        className={cn(
                          "rounded-lg border px-2 py-1.5 text-left transition-all",
                          fieldPreset === p
                            ? "border-fuchsia-400 bg-fuchsia-500/15"
                            : "border-white/10 bg-white/[0.02] hover:border-fuchsia-500/30",
                        )}>
                        <div className="text-[11px] font-semibold text-white">{fieldPresetLabel(p)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Helical angles */}
              {showHelicalControls && (
                <div className="grid grid-cols-2 gap-2.5">
                  <LabeledSlider label={`Ângulo inicial (endo): ${helicalStart.toFixed(0)}°`}
                    value={helicalStart} onChange={setHelicalStart}
                    min={-90} max={90} step={5}
                    hint="+60° típico para miocárdio (endocárdio)" />
                  <LabeledSlider label={`Ângulo final (epi): ${helicalEnd.toFixed(0)}°`}
                    value={helicalEnd} onChange={setHelicalEnd}
                    min={-90} max={90} step={5}
                    hint="−60° típico para miocárdio (epicárdio)" />
                </div>
              )}

              {/* Channels */}
              {showChannelControls && (
                <div className="grid grid-cols-2 gap-2.5">
                  <LabeledSlider label={`Pitch entre canais: ${channelPitch.toFixed(1)} mm`}
                    value={channelPitch} onChange={setChannelPitch}
                    min={0.8} max={6} step={0.1} />
                  <LabeledSlider label={`Ø canal: ${channelDiameter.toFixed(2)} mm`}
                    value={channelDiameter} onChange={setChannelDiameter}
                    min={0.3} max={2} step={0.05} />
                </div>
              )}

              {/* Vascular levels */}
              {showVascularControls && (
                <LabeledSlider label={`Níveis de bifurcação Murray: ${vascularLevels}`}
                  value={vascularLevels}
                  onChange={(v) => setVascularLevels(Math.round(v))}
                  min={1} max={5} step={1}
                  hint="Cada nível bifurca seguindo r³ = r₁³ + r₂³" />
              )}

              {/* Lattice pitch */}
              {showLatticeControls && (
                <LabeledSlider label={`Pitch da treliça: ${latticePitch.toFixed(1)} mm`}
                  value={latticePitch} onChange={setLatticePitch}
                  min={0.5} max={6} step={0.1} />
              )}

              {/* Dimensões */}
              <div className="pt-2 border-t border-white/8">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Dimensões</div>
                <div className="grid grid-cols-3 gap-2.5">
                  <LabeledSlider label="Largura X (mm)" value={dims.width}
                    onChange={(v) => setDims({ ...dims, width: v })}
                    min={5} max={80} step={0.5} />
                  <LabeledSlider label="Profund. Y (mm)" value={dims.depth}
                    onChange={(v) => setDims({ ...dims, depth: v })}
                    min={5} max={80} step={0.5} />
                  <LabeledSlider label="Altura Z (mm)" value={dims.height}
                    onChange={(v) => setDims({ ...dims, height: v })}
                    min={0.3} max={25} step={0.1} />
                </div>
              </div>

              {/* Layer & infill */}
              <div className="grid grid-cols-2 gap-2.5">
                <LabeledSlider label={`Altura camada: ${layerHeight.toFixed(2)} mm`}
                  value={layerHeight} onChange={setLayerHeight}
                  min={0.1} max={0.6} step={0.05} />
                <LabeledSlider label={`Infill: ${infillPct}%`}
                  value={infillPct}
                  onChange={(v) => setInfillPct(Math.round(v))}
                  min={20} max={100} step={5} />
              </div>
            </div>
          </section>

          {/* ─── PASSO 3: MATERIAIS ──────────────────────────────────── */}
          <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-cyan-500/15 bg-cyan-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold">Passo 3</div>
                <h2 className="text-sm font-bold text-white">Materiais ({materials.length}/4)</h2>
              </div>
              {materials.length < 4 && (
                <button onClick={addMaterial}
                  className="text-[10px] px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 transition flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              )}
            </header>
            <div className="p-4 space-y-2">
              {materials.map((m, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold"
                      style={{ background: m.uiColor + "30", color: m.uiColor, border: `1px solid ${m.uiColor}80` }}>
                      T{m.toolIndex}
                    </span>
                    <input type="text" value={m.label}
                      onChange={(e) => updateMaterial(i, { label: e.target.value })}
                      className="flex-1 bg-transparent border-b border-white/10 px-1 py-0.5 text-[11px] text-white font-semibold focus:outline-none focus:border-cyan-400" />
                    {materials.length > 1 && (
                      <button onClick={() => removeMaterial(i)}
                        className="text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <LabeledInput dense label="Bioink" value={m.bioink.materialLabel}
                    onChange={(v) => updateMaterialBioink(i, { materialLabel: v })} />
                  <div className="grid grid-cols-3 gap-1.5">
                    <LabeledNumber dense label="Bico (mm)" value={m.bioink.nozzleDiameter_mm}
                      onChange={(v) => updateMaterialBioink(i, { nozzleDiameter_mm: v })}
                      min={0.1} max={2} step={0.05} />
                    <LabeledNumber dense label="Visc. (Pa·s)" value={m.bioink.viscosity_PaS}
                      onChange={(v) => updateMaterialBioink(i, { viscosity_PaS: v })}
                      min={0.1} max={500} step={0.5} />
                    <LabeledNumber dense label="Vel. (mm/s)" value={m.bioink.printSpeed_mms}
                      onChange={(v) => updateMaterialBioink(i, { printSpeed_mms: v })}
                      min={0.5} max={50} step={0.5} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-[10.5px]">
                    <input type="checkbox" checked={m.bioink.hasCells ?? false}
                      onChange={(e) => updateMaterialBioink(i, { hasCells: e.target.checked })}
                      className="accent-emerald-500" />
                    <span className="text-emerald-200">Contém células</span>
                    {m.bioink.hasCells && (
                      <input type="text" value={m.bioink.cellType ?? ""}
                        placeholder="tipo celular"
                        onChange={(e) => updateMaterialBioink(i, { cellType: e.target.value || null })}
                        className="ml-2 flex-1 bg-black/30 border border-white/10 rounded px-1.5 py-0.5 text-[10.5px] text-white" />
                    )}
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* ─── BOTÕES ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button onClick={handlePreview}
              className="rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 font-bold text-sm px-5 py-3.5 transition-all flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" /> 1️⃣ Preview conceitual
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
            <button onClick={handleGenerate} disabled={stage === "config"}
              className={cn(
                "rounded-2xl font-bold text-sm px-5 py-3.5 transition-all flex items-center justify-center gap-2",
                stage === "config"
                  ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 hover:from-violet-400 hover:via-fuchsia-400 hover:to-cyan-400 text-white shadow-lg shadow-violet-500/20",
              )}>
              <Play className="w-4 h-4" /> 2️⃣ Gerar G-code NAATIV3
              <ChevronRight className="w-4 h-4 opacity-80" />
            </button>
          </div>

          {stage === "config" && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.06] p-3 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-blue-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-100 leading-relaxed">
                <strong>Fluxo NAATIV3:</strong> primeiro o <strong>Preview</strong> (rápido) mostra ângulos das fibras camada por camada e volumes por material.
                Depois o <strong>G-code</strong> integra os streamlines do campo vetorial.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-100">
                <div className="font-semibold">Erro</div>
                <div className="text-[11px] text-rose-200/80 mt-0.5">{errorMsg}</div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════ COLUNA DIREITA — Preview / Resultado ═════════════ */}
        <div className="space-y-4 lg:sticky lg:top-4">

          {/* Preview conceitual */}
          {preview && (
            <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
              <h3 className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Preview NAATIV3 · conceitual
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <StatCard icon={<LayersIcon className="w-3 h-3" />} label="Camadas" value={String(preview.layerCount)} />
                <StatCard icon={<Network className="w-3 h-3" />} label="Streamlines" value={String(preview.streamlineCount)} />
                <StatCard icon={<Droplets className="w-3 h-3" />} label="Materiais" value={String(preview.materialCount)} />
                <StatCard icon={<Clock className="w-3 h-3" />} label="Tempo (min)" value={preview.estimatedTime_min.toFixed(1)} />
              </div>

              {/* Angle profile */}
              {preview.angleProfile.length > 0 && Math.abs(preview.angleProfile[0].angle_deg - preview.angleProfile[preview.angleProfile.length - 1].angle_deg) > 0.5 && (
                <div className="rounded-lg bg-rose-500/[0.06] border border-rose-500/25 p-2.5 mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-rose-300/80 font-semibold mb-1.5 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Perfil angular transmural
                  </div>
                  <div className="flex items-end gap-0.5 h-12">
                    {preview.angleProfile.map((p, i) => {
                      const norm = (p.angle_deg + 90) / 180 // -90..90 → 0..1
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full bg-rose-500/40 border-t border-rose-300/60 rounded-t"
                            style={{ height: `${Math.max(8, norm * 100)}%` }}
                            title={`${p.z_mm.toFixed(2)} mm → ${p.angle_deg.toFixed(0)}°`} />
                          <span className="text-[8px] text-rose-200/70 font-mono">{p.angle_deg.toFixed(0)}°</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-[9.5px] text-rose-200/80 mt-1">
                    Camada de baixo: {preview.angleProfile[0].angle_deg.toFixed(0)}° → Camada do topo: {preview.angleProfile[preview.angleProfile.length - 1].angle_deg.toFixed(0)}°
                  </div>
                </div>
              )}

              {/* Volumes por material */}
              {preview.volumePerMaterial_uL.length > 1 && (
                <div className="rounded-lg bg-black/20 border border-white/8 p-2.5 mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
                    Volumes por material
                  </div>
                  <div className="space-y-1">
                    {preview.volumePerMaterial_uL.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10.5px]">
                        <span className="font-mono font-bold" style={{ color: materials[i]?.uiColor }}>T{i}</span>
                        <span className="text-gray-300 truncate flex-1">{materials[i]?.label}</span>
                        <span className="text-white font-mono">{v.toFixed(1)} µL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical zones */}
              {preview.criticalZones.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Zonas críticas</div>
                  {preview.criticalZones.map((z, i) => {
                    const sev = {
                      info:     "border-blue-500/30 bg-blue-500/[0.05] text-blue-200",
                      warning:  "border-amber-500/30 bg-amber-500/[0.05] text-amber-200",
                      critical: "border-rose-500/40 bg-rose-500/[0.06] text-rose-200",
                    }[z.severity]
                    const ic = z.severity === "critical" ? "🔴" : z.severity === "warning" ? "🟡" : "🔵"
                    return (
                      <div key={i} className={cn("rounded-lg border px-2.5 py-1.5", sev)}>
                        <div className="text-[10.5px] font-semibold">{ic} {z.zone}</div>
                        <div className="text-[10px] text-gray-300 mt-0.5">{z.reason}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Narrative */}
              <details className="rounded-lg bg-black/20 border border-white/8 overflow-hidden" open>
                <summary className="px-2.5 py-1.5 cursor-pointer text-[10.5px] font-semibold text-gray-300 hover:text-white flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" /> O que vai ser impresso
                </summary>
                <ul className="px-2.5 pb-2.5 pt-1 space-y-1">
                  {preview.narrative.map((n, i) => (
                    <li key={i} className="text-[10.5px] text-gray-200 leading-snug flex gap-1.5">
                      <span className="text-gray-500 font-mono">{(i + 1).toString().padStart(2, "0")}.</span>
                      <span className="flex-1">{n}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </section>
          )}

          {/* Viewer 3D */}
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <header className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
              <Eye className="w-3.5 h-3.5 text-violet-300" />
              <span className="text-[11px] font-semibold text-white">Visualização 3D NAATIV3</span>
              {result && (
                <span className="ml-auto text-[10px] text-gray-400">
                  {result.moveCount.toLocaleString("pt-BR")} moves · {result.streamlineCount} streamlines
                </span>
              )}
            </header>
            <div className="h-[360px] sm:h-[420px] relative">
              {parsedViz ? (
                <GcodeViewer3D parsed={parsedViz} initialColorMode="layer" className="h-full" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
                  <Sparkles className="w-6 h-6 opacity-40" />
                  <p className="text-xs">
                    {stage === "config" && "Configure os 3 passos e gere preview"}
                    {stage === "previewed" && "Preview pronto. Clique Gerar G-code para visualizar 3D"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* G-code final */}
          {result && (
            <>
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                <h3 className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> G-code NAATIV3 pronto
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatCard icon={<LayersIcon className="w-3 h-3" />} label="Camadas" value={String(result.layerCount)} />
                  <StatCard icon={<FileCode className="w-3 h-3" />} label="Moves" value={result.moveCount.toLocaleString("pt-BR")} />
                  <StatCard icon={<Droplets className="w-3 h-3" />} label="Vol. total (µL)" value={result.totalVolume_uL.toFixed(1)} />
                  <StatCard icon={<Clock className="w-3 h-3" />} label="Tempo (min)" value={result.estimatedTime_min.toFixed(1)} />
                </div>
                <button onClick={handleDownload}
                  className="mt-3 w-full rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 text-xs font-semibold px-4 py-2.5 transition-colors flex items-center justify-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Baixar .gcode ({(result.gcode.length / 1024).toFixed(1)} kB)
                </button>
              </div>

              {/* Nelson 2021 */}
              {result.printability && (() => {
                const p = result.printability
                const c = verdictColor(p.verdict)
                return (
                  <div className={cn("rounded-2xl border p-4", c.border, c.bg)}>
                    <h3 className={cn("text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5", c.text)}>
                      Imprimibilidade material principal
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center", c.border, c.bg)}>
                        <span className={cn("text-xl font-bold leading-none", c.text)}>{p.score}</span>
                        <span className="text-[8px] text-gray-400 mt-0.5">/100</span>
                      </div>
                      <div className="flex-1">
                        <div className={cn("text-[11px] font-semibold", c.text)}>{c.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{p.closestReference.label}</div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Rationale */}
              {result.rationale.length > 0 && (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
                  <h3 className="text-[11px] font-semibold text-violet-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Racional NAATIV3
                  </h3>
                  <ol className="space-y-1.5">
                    {result.rationale.map((r, i) => (
                      <li key={i} className="text-[11.5px] text-violet-50/90 leading-relaxed flex gap-2">
                        <span className="text-violet-300/70 font-mono text-[10px] pt-0.5">{(i + 1).toString().padStart(2, "0")}.</span>
                        <span className="flex-1">{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
                  <h3 className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Avisos
                  </h3>
                  <ul className="space-y-1.5">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-amber-100/90 leading-relaxed flex gap-2">
                        <span className="text-amber-300">⚠</span>
                        <span className="flex-1">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//   Sub-componentes (idênticos ao medical)
// ═══════════════════════════════════════════════════════════════════════

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/8 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] text-gray-400 uppercase tracking-wide">
        {icon} {label}
      </div>
      <div className="text-xs text-white font-mono font-semibold mt-0.5">{value}</div>
    </div>
  )
}

function LabeledInput({
  label, value, onChange, hint, dense = false,
}: { label: string; value: string; onChange: (v: string) => void; hint?: string; dense?: boolean }) {
  return (
    <label className="block">
      <span className={cn("block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5", dense && "text-[9px]")}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-md bg-black/30 border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono",
          "focus:outline-none focus:border-violet-500/50 focus:bg-black/40",
          dense && "py-1 text-[11px]",
        )} />
      {hint && <span className="block text-[9.5px] text-gray-500 mt-0.5">{hint}</span>}
    </label>
  )
}

function LabeledNumber({
  label, value, onChange, min, max, step, hint, dense = false,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; hint?: string; dense?: boolean }) {
  return (
    <label className="block">
      <span className={cn("block text-[10px] text-gray-400 uppercase tracking-wider mb-0.5", dense && "text-[9px]")}>{label}</span>
      <input type="number" value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min} max={max} step={step}
        className={cn(
          "w-full rounded-md bg-black/30 border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono",
          "focus:outline-none focus:border-violet-500/50 focus:bg-black/40",
          dense && "py-1 text-[11px]",
        )} />
      {hint && <span className="block text-[9.5px] text-gray-500 mt-0.5">{hint}</span>}
    </label>
  )
}

function LabeledSlider({
  label, value, onChange, min, max, step, hint,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-white font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input type="range" value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        className="w-full accent-violet-500 mt-1" />
      {hint && <span className="block text-[9.5px] text-gray-500">{hint}</span>}
    </label>
  )
}
