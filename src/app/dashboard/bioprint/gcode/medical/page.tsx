"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — G-code Médico (R12.14)
 *  ───────────────────────────────────────────────────────────────────────
 *  Fluxo profissional de geração de G-code baseado em TECIDO-ALVO.
 *
 *  Pipeline:
 *    1. Escolher tecido (16 opções) + nível (safe/advanced/experimental)
 *    2. Definir escala (peça única ou placa SBS 6/12/24/96)
 *    3. Ajustar bioink (opcional — vem do Formulator Pro ou tem default)
 *    4. Ver PREVIEW CONCEITUAL em ~10 ms (sem gerar G-code completo)
 *    5. Se OK → GERAR G-code final → viewer 3D → download
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  Microscope, Eye, Play, Download, ArrowRight, ChevronRight,
  Activity, BookOpen, Layers as LayersIcon, FileCode, Clock,
  Droplets, AlertTriangle, CheckCircle2, Info, Sparkles,
  ShieldCheck, FlaskConical, Workflow, Heart, Brain as BrainIcon,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import {
  TISSUE_STRATEGIES, getTissueStrategy, toolpathLabel, logicLabel,
  crosslinkingLabel, toolpathComplexity,
  type TissueId, type ToolpathStrategyId,
} from "@/lib/bioprint/tissue-strategies"
import {
  generateMedicalGcode, generateConceptualPreview, WELL_PLATE_SPECS,
  type MedicalScale, type ProposalLevel, type MedicalGcodeInput,
  type MedicalGcodeResult, type ConceptualPreview,
} from "@/lib/bioprint/medical-gcode"
import { verdictColor, NELSON_2021_CITATION } from "@/lib/bioprint/printability-nelson2021"
import { parseGcode, type ParsedGcode } from "@/lib/bioprint/toolpath-engine"
import { GcodeViewer3D } from "@/components/bioprinter/GcodeViewer3D"

export default function MedicalGcodePage() {
  // ─── Estado ────────────────────────────────────────────────────────────
  const [tissue, setTissue] = useState<TissueId>("myocardium")
  const [level, setLevel] = useState<ProposalLevel>("advanced")
  const [scale, setScale] = useState<MedicalScale>("single")
  const [dims, setDims] = useState({ width: 15, depth: 15, height: 2 })

  const strategy = useMemo(() => getTissueStrategy(tissue), [tissue])

  // Bioink (alinhado ao tecido)
  const [bioink, setBioink] = useState({
    materialLabel: strategy.recommendedBioink.family,
    nozzleDiameter_mm: strategy.printingParams.nozzleDiameter_mm.ideal,
    viscosity_PaS: 5,
    printSpeed_mms: strategy.printingParams.printSpeed_mms.ideal,
    travelSpeed_mms: 25,
    pressure_kpa: strategy.printingParams.pressure_kpa.ideal,
    hasCells: true,
    cellType: strategy.recommendedCells[0] ?? null,
    cellDensity_M_per_mL: strategy.cellDensity_M_per_mL.ideal,
    crosslinker: crosslinkingLabel(strategy.crosslinking),
  })
  const [layerHeight, setLayerHeight] = useState(strategy.printingParams.layerHeight_mm.ideal)
  const [infillPct, setInfillPct] = useState(strategy.printingParams.infill_pct.ideal)

  const [preview, setPreview] = useState<ConceptualPreview | null>(null)
  const [result, setResult] = useState<MedicalGcodeResult | null>(null)
  const [parsedViz, setParsedViz] = useState<ParsedGcode | null>(null)
  const [stage, setStage] = useState<"config" | "previewed" | "generated">("config")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ─── Quando troca tecido, sincronizar defaults ─────────────────────────
  useEffect(() => {
    const s = getTissueStrategy(tissue)
    setBioink((b) => ({
      ...b,
      materialLabel: s.recommendedBioink.family,
      nozzleDiameter_mm: s.printingParams.nozzleDiameter_mm.ideal,
      printSpeed_mms: s.printingParams.printSpeed_mms.ideal,
      pressure_kpa: s.printingParams.pressure_kpa.ideal,
      cellType: s.recommendedCells[0] ?? null,
      cellDensity_M_per_mL: s.cellDensity_M_per_mL.ideal,
      crosslinker: crosslinkingLabel(s.crosslinking),
    }))
    setLayerHeight(s.printingParams.layerHeight_mm.ideal)
    setInfillPct(s.printingParams.infill_pct.ideal)
    // limpa resultados antigos
    setPreview(null)
    setResult(null)
    setParsedViz(null)
    setStage("config")
  }, [tissue])

  // ─── Inputs do engine ──────────────────────────────────────────────────
  const buildInput = useCallback((): MedicalGcodeInput => ({
    tissue,
    proposalLevel: level,
    dimensions: { ...dims },
    scale,
    bioink: { ...bioink },
    layerHeight_mm: layerHeight,
    infillDensity_pct: infillPct,
    jobName: `${tissue}_${level}_${scale.replace("well-plate-", "wp")}`,
  }), [tissue, level, dims, scale, bioink, layerHeight, infillPct])

  // ─── Preview conceitual ────────────────────────────────────────────────
  const handlePreview = useCallback(() => {
    setErrorMsg(null)
    try {
      const t0 = performance.now()
      const p = generateConceptualPreview(buildInput())
      const dt = performance.now() - t0
      setPreview(p)
      setStage("previewed")
      // limpa resultado antigo se as condições mudaram
      setResult(null)
      setParsedViz(null)
      // eslint-disable-next-line no-console
      console.log(`[medical-gcode] preview ${dt.toFixed(1)} ms · ${p.layerCount} camadas · ${p.criticalZones.length} zonas críticas`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(msg)
      setPreview(null)
    }
  }, [buildInput])

  // ─── Gerar G-code final ────────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    setErrorMsg(null)
    try {
      const t0 = performance.now()
      const r = generateMedicalGcode(buildInput())
      const dt = performance.now() - t0
      setResult(r)
      setStage("generated")
      try {
        const parsed = parseGcode(r.gcode)
        setParsedViz(parsed)
      } catch (e) {
        setParsedViz(null)
        console.warn("parseGcode falhou (não-crítico):", e)
      }
      // eslint-disable-next-line no-console
      console.log(`[medical-gcode] gcode ${dt.toFixed(1)} ms · ${r.moveCount} moves · ${r.layerCount} camadas`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrorMsg(msg)
      setResult(null)
      setParsedViz(null)
    }
  }, [buildInput])

  // ─── Download ──────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!result) return
    const blob = new Blob([result.gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${tissue}_${level}_${scale}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }, [result, tissue, level, scale])

  const toolpathChosen: ToolpathStrategyId = strategy.toolpaths[level]
  const wellSpec = WELL_PLATE_SPECS[scale]

  // ═══════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.08] via-blue-500/[0.04] to-emerald-500/[0.04] p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <Link
            href="/dashboard/bioprint/gcode"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-gray-300 hover:text-white transition"
            title="Voltar ao hub"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Microscope className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold">
              Nível Médico · R12.14
            </span>
            <h1 className="text-lg font-bold text-white mt-0.5">
              G-code por Tecido-Alvo · 16 tecidos · Preview conceitual
            </h1>
            <p className="text-xs text-gray-300 mt-1.5 leading-relaxed max-w-3xl">
              Escolha o <strong className="text-cyan-200">tecido</strong>, o <strong className="text-cyan-200">nível</strong> de
              proposta (segura / avançada / experimental) e a <strong className="text-cyan-200">escala</strong> (peça única ou placa SBS).
              A BIA monta o toolpath biologicamente correto, mostra um <strong className="text-emerald-200">preview conceitual em ~10 ms</strong> e
              só então gera o G-code final.
            </p>
          </div>
        </div>
      </header>

      {/* ─── Grid 2 colunas ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-5 items-start">
        {/* ════════════ COLUNA ESQUERDA — Inputs ═════════════════════════ */}
        <div className="space-y-5">

          {/* ─── PASSO 1: TECIDO ─────────────────────────────────────────── */}
          <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-cyan-500/15 bg-cyan-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Microscope className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold">
                  Passo 1
                </div>
                <h2 className="text-sm font-bold text-white">Tecido-alvo</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                {strategy.emoji} {strategy.label}
              </span>
            </header>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {TISSUE_STRATEGIES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTissue(t.id)}
                    className={cn(
                      "text-left rounded-lg border px-2 py-1.5 transition-all",
                      tissue === t.id
                        ? "border-cyan-400 bg-cyan-500/15"
                        : "border-white/10 bg-white/[0.02] hover:border-cyan-500/30 hover:bg-cyan-500/[0.05]",
                    )}
                  >
                    <div className="text-[11px] font-semibold text-white flex items-center gap-1">
                      <span className="text-sm">{t.emoji}</span>
                      <span className="truncate">{t.label.split(" ")[0]}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 leading-snug line-clamp-2 mt-0.5">
                      {t.shortDescription}
                    </div>
                  </button>
                ))}
              </div>

              {/* Strategy summary */}
              <div className="rounded-xl bg-black/20 border border-white/8 p-3 space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Lógica biológica dominante
                </div>
                <div className="flex flex-wrap gap-1">
                  {strategy.dominantLogic.map((l) => (
                    <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                      {logicLabel(l)}
                    </span>
                  ))}
                </div>
                <div className="text-[10.5px] text-gray-300 mt-2 leading-snug">
                  <strong className="text-emerald-200">Biotinta sugerida:</strong> {strategy.recommendedBioink.notes}
                </div>
                <div className="text-[10.5px] text-gray-300 leading-snug">
                  <strong className="text-violet-200">Células:</strong> {strategy.recommendedCells.slice(0, 3).join(" · ")}
                </div>
                <div className="text-[10.5px] text-gray-300 leading-snug">
                  <strong className="text-amber-200">Crosslinking:</strong> {crosslinkingLabel(strategy.crosslinking)}
                </div>
              </div>
            </div>
          </section>

          {/* ─── PASSO 2: NÍVEL DE PROPOSTA ──────────────────────────────── */}
          <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-emerald-500/15 bg-emerald-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Workflow className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
                  Passo 2
                </div>
                <h2 className="text-sm font-bold text-white">Nível de proposta</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                {level} · {toolpathLabel(toolpathChosen)}
              </span>
            </header>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["safe", "advanced", "experimental"] as ProposalLevel[]).map((l) => {
                const tp = strategy.toolpaths[l]
                const labels = { safe: "🛡️ Segura", advanced: "🚀 Avançada", experimental: "🧪 Experimental" }
                const subs = {
                  safe: "Maior probabilidade de sucesso · alto reuso",
                  advanced: "Compromisso função/risco · estado da arte",
                  experimental: "Máximo desempenho biológico · maior risco",
                }
                return (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "text-left rounded-xl border px-3 py-2.5 transition-all",
                      level === l
                        ? "border-emerald-400 bg-emerald-500/15"
                        : "border-white/10 bg-white/[0.02] hover:border-emerald-500/30",
                    )}
                  >
                    <div className="text-[12px] font-bold text-white">{labels[l]}</div>
                    <div className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">{subs[l]}</div>
                    <div className="text-[10px] text-emerald-200 mt-1.5">
                      <strong>Toolpath:</strong> {toolpathLabel(tp)}
                    </div>
                    <div className="text-[9.5px] text-gray-500 mt-0.5">
                      Complexidade: {toolpathComplexity(tp)}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ─── PASSO 3: ESCALA ────────────────────────────────────────── */}
          <section className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-violet-500/15 bg-violet-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                <LayersIcon className="w-4 h-4 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-violet-300/80 font-semibold">
                  Passo 3
                </div>
                <h2 className="text-sm font-bold text-white">Escala / dimensões</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-200">
                {wellSpec ? wellSpec.label : `${dims.width}×${dims.depth}×${dims.height} mm`}
              </span>
            </header>
            <div className="p-4 space-y-3">
              {/* Escala */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {(["single", "well-plate-6", "well-plate-12", "well-plate-24", "well-plate-96"] as MedicalScale[]).map((s) => {
                  const ws = WELL_PLATE_SPECS[s]
                  return (
                    <button
                      key={s}
                      onClick={() => setScale(s)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-left transition-all",
                        scale === s
                          ? "border-violet-400 bg-violet-500/15"
                          : "border-white/10 bg-white/[0.02] hover:border-violet-500/30",
                      )}
                    >
                      <div className="text-[11px] font-semibold text-white">
                        {s === "single" ? "🟦 Peça única" : `🧪 ${ws?.wells}`}
                      </div>
                      <div className="text-[9px] text-gray-400 leading-snug mt-0.5">
                        {s === "single" ? "Construto livre" : `${ws?.wellDiameter_mm} mm wells`}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Dimensões */}
              {scale === "single" && (
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <LabeledSlider
                    label="Largura X (mm)"
                    value={dims.width}
                    onChange={(v) => setDims({ ...dims, width: v })}
                    min={2} max={80} step={0.5}
                  />
                  <LabeledSlider
                    label="Profund. Y (mm)"
                    value={dims.depth}
                    onChange={(v) => setDims({ ...dims, depth: v })}
                    min={2} max={80} step={0.5}
                  />
                  <LabeledSlider
                    label="Altura Z (mm)"
                    value={dims.height}
                    onChange={(v) => setDims({ ...dims, height: v })}
                    min={0.3} max={20} step={0.1}
                  />
                </div>
              )}
              {wellSpec && (
                <div className="rounded-lg bg-violet-500/[0.06] border border-violet-500/20 p-2.5">
                  <p className="text-[10.5px] text-violet-100 leading-snug">
                    <strong>SBS {wellSpec.wells} wells</strong> ({wellSpec.rows}×{wellSpec.cols}) · pitch {wellSpec.pitch_mm} mm ·
                    Ø {wellSpec.wellDiameter_mm} mm — usado tipicamente para drug screening, HCS, organoid arrays.
                  </p>
                </div>
              )}

              {/* Layer & infill */}
              <div className="grid grid-cols-2 gap-2.5">
                <LabeledSlider
                  label={`Altura camada: ${layerHeight.toFixed(2)} mm`}
                  value={layerHeight}
                  onChange={setLayerHeight}
                  min={strategy.printingParams.layerHeight_mm.min}
                  max={strategy.printingParams.layerHeight_mm.max}
                  step={0.05}
                  hint={`Janela do tecido: ${strategy.printingParams.layerHeight_mm.min}–${strategy.printingParams.layerHeight_mm.max} mm`}
                />
                <LabeledSlider
                  label={`Infill: ${infillPct}%`}
                  value={infillPct}
                  onChange={(v) => setInfillPct(Math.round(v))}
                  min={strategy.printingParams.infill_pct.min}
                  max={strategy.printingParams.infill_pct.max}
                  step={5}
                  hint={`Janela do tecido: ${strategy.printingParams.infill_pct.min}–${strategy.printingParams.infill_pct.max}%`}
                />
              </div>
            </div>
          </section>

          {/* ─── PASSO 4: BIOINK (resumido / expansível) ─────────────────── */}
          <section className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.03] overflow-hidden">
            <header className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/15 bg-amber-500/[0.04]">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-amber-300/80 font-semibold">
                  Passo 4
                </div>
                <h2 className="text-sm font-bold text-white">Biotinta · ajustar se quiser</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-200">
                {bioink.materialLabel.substring(0, 30)}{bioink.materialLabel.length > 30 ? "…" : ""}
              </span>
            </header>
            <details className="overflow-hidden">
              <summary className="px-4 py-2.5 cursor-pointer text-[11px] text-amber-200 hover:bg-white/[0.02] flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5" /> Mostrar parâmetros reológicos / celulares
              </summary>
              <div className="p-4 pt-0 space-y-2.5">
                <LabeledInput
                  label="Material" value={bioink.materialLabel}
                  onChange={(v) => setBioink({ ...bioink, materialLabel: v })}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <LabeledNumber label="Bico Ø (mm)" value={bioink.nozzleDiameter_mm}
                    onChange={(v) => setBioink({ ...bioink, nozzleDiameter_mm: v })}
                    min={0.1} max={2} step={0.05} />
                  <LabeledNumber label="Viscosidade (Pa·s)" value={bioink.viscosity_PaS}
                    onChange={(v) => setBioink({ ...bioink, viscosity_PaS: v })}
                    min={0.1} max={500} step={0.5} />
                  <LabeledNumber label="Velocidade impressão (mm/s)" value={bioink.printSpeed_mms}
                    onChange={(v) => setBioink({ ...bioink, printSpeed_mms: v })}
                    min={0.5} max={50} step={0.5} />
                  <LabeledNumber label="Pressão (kPa)" value={bioink.pressure_kpa ?? 0}
                    onChange={(v) => setBioink({ ...bioink, pressure_kpa: v || undefined })}
                    min={0} max={600} step={10} />
                </div>
                <div className="rounded-lg bg-emerald-500/[0.04] border border-emerald-500/20 p-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={bioink.hasCells ?? false}
                      onChange={(e) => setBioink({ ...bioink, hasCells: e.target.checked })}
                      className="accent-emerald-500" />
                    <span className="text-[11px] text-emerald-200 font-medium">Contém células</span>
                  </label>
                  {bioink.hasCells && (
                    <div className="grid grid-cols-2 gap-2.5 mt-2">
                      <LabeledInput label="Tipo celular"
                        value={bioink.cellType ?? ""}
                        onChange={(v) => setBioink({ ...bioink, cellType: v || null })}
                        dense />
                      <LabeledNumber label="Densidade (×10⁶/mL)"
                        value={bioink.cellDensity_M_per_mL ?? 0}
                        onChange={(v) => setBioink({ ...bioink, cellDensity_M_per_mL: v || null })}
                        min={0} max={100} step={0.5} dense />
                    </div>
                  )}
                </div>
              </div>
            </details>
          </section>

          {/* ─── BOTÕES ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handlePreview}
              className="rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 font-bold text-sm px-5 py-3.5 transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> 1️⃣ Preview conceitual
              <ChevronRight className="w-4 h-4 opacity-70" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={stage === "config"}
              className={cn(
                "rounded-2xl font-bold text-sm px-5 py-3.5 transition-all flex items-center justify-center gap-2",
                stage === "config"
                  ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 hover:from-cyan-400 hover:via-violet-400 hover:to-fuchsia-400 text-white shadow-lg shadow-violet-500/20",
              )}
            >
              <Play className="w-4 h-4" /> 2️⃣ Gerar G-code final
              <ChevronRight className="w-4 h-4 opacity-80" />
            </button>
          </div>

          {stage === "config" && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.06] p-3 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-blue-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-100 leading-relaxed">
                <strong>Fluxo:</strong> primeiro clique em <strong>Preview conceitual</strong> para ver
                o que vai ser impresso (camadas, direção, zonas críticas, células totais). Só então gere o G-code final.
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

          {/* ─── RISKS DO TECIDO ───────────────────────────────────────── */}
          {strategy.risks.length > 0 && (
            <section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.03] p-4">
              <h3 className="text-[11px] font-semibold text-rose-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Riscos típicos deste tecido
              </h3>
              <ul className="space-y-2">
                {strategy.risks.map((r, i) => {
                  const sevColor = {
                    info: "border-blue-500/30 bg-blue-500/[0.04] text-blue-200",
                    warning: "border-amber-500/30 bg-amber-500/[0.04] text-amber-200",
                    critical: "border-rose-500/40 bg-rose-500/[0.06] text-rose-200",
                  }[r.level]
                  return (
                    <li key={i} className={cn("rounded-lg border px-2.5 py-1.5", sevColor)}>
                      <div className="text-[11px] font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> {r.title}
                      </div>
                      <div className="text-[10px] text-gray-200/90 mt-0.5">{r.detail}</div>
                      <div className="text-[10px] text-emerald-200/80 mt-0.5">
                        <strong>Mitigação:</strong> {r.mitigation}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>

        {/* ════════════ COLUNA DIREITA — Preview / Resultado ═════════════ */}
        <div className="space-y-4 lg:sticky lg:top-4">

          {/* ─── PREVIEW CONCEITUAL ────────────────────────────────────── */}
          {preview && (
            <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
              <h3 className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Preview conceitual · antes do G-code
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <StatCard icon={<LayersIcon className="w-3 h-3" />} label="Camadas" value={String(preview.layerCount)} />
                <StatCard icon={<Workflow className="w-3 h-3" />} label="Toolpath" value={toolpathLabel(preview.toolpathId).split(" ")[0]} />
                <StatCard icon={<Droplets className="w-3 h-3" />} label="Vol. (µL)" value={preview.totalVolume_uL.toFixed(1)} />
                <StatCard icon={<Clock className="w-3 h-3" />} label="Tempo (min)" value={preview.estimatedTime_min.toFixed(1)} />
              </div>

              {/* Cell count */}
              {preview.totalCellCount_M !== undefined && (
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/25 p-2.5 mb-3 text-[11px] text-violet-100">
                  <strong>Células totais:</strong> ~{preview.totalCellCount_M.toFixed(2)} × 10⁶ ({bioink.cellType ?? "tipo não especificado"})
                </div>
              )}

              {/* Direction */}
              <div className="rounded-lg bg-cyan-500/[0.06] border border-cyan-500/20 p-2.5 mb-3">
                <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold mb-0.5">
                  Direção predominante
                </div>
                <div className="text-[11.5px] text-cyan-100">{preview.primaryDirection}</div>
              </div>

              {/* Critical zones */}
              {preview.criticalZones.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Zonas críticas detectadas
                  </div>
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
                  <BookOpen className="w-3 h-3" /> O que vai ser impresso ({preview.narrative.length} pontos)
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

          {/* ─── Viewer 3D ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <header className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
              <Eye className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-[11px] font-semibold text-white">Visualização 3D</span>
              {result && (
                <span className="ml-auto text-[10px] text-gray-400">
                  {result.moveCount.toLocaleString("pt-BR")} moves · {result.layerCount} camadas
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
                    {stage === "config" && "Configure os 4 passos e gere preview"}
                    {stage === "previewed" && "Preview pronto. Clique Gerar G-code para visualizar 3D"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── G-code final ──────────────────────────────────────────── */}
          {result && (
            <>
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                <h3 className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> G-code pronto
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatCard icon={<LayersIcon className="w-3 h-3" />} label="Camadas" value={String(result.layerCount)} />
                  <StatCard icon={<FileCode className="w-3 h-3" />} label="Moves" value={result.moveCount.toLocaleString("pt-BR")} />
                  <StatCard icon={<Droplets className="w-3 h-3" />} label="Biotinta (µL)" value={result.bioinkVolume_uL.toFixed(1)} />
                  <StatCard icon={<Clock className="w-3 h-3" />} label="Tempo (min)" value={result.estimatedTime_min.toFixed(1)} />
                </div>
                <button
                  onClick={handleDownload}
                  className="mt-3 w-full rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 text-xs font-semibold px-4 py-2.5 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar .gcode ({(result.gcode.length / 1024).toFixed(1)} kB)
                </button>
              </div>

              {/* Nelson 2021 score */}
              {result.printability && (() => {
                const p = result.printability
                const c = verdictColor(p.verdict)
                return (
                  <div className={cn("rounded-2xl border p-4", c.border, c.bg)}>
                    <header className="flex items-center justify-between gap-2 mb-3">
                      <h3 className={cn("text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5", c.text)}>
                        <Microscope className="w-3.5 h-3.5" /> Imprimibilidade Nelson 2021
                      </h3>
                      <span className={cn("text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider", c.border, c.bg, c.text)}>
                        {c.label}
                      </span>
                    </header>
                    <div className="flex items-center gap-4 mb-2">
                      <div className={cn("w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center", c.border, c.bg)}>
                        <span className={cn("text-2xl font-bold leading-none", c.text)}>{p.score}</span>
                        <span className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">/100</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-xs font-semibold", c.text)}>{p.closestReference.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Wall shear: {(p.wallShearStress_Pa / 1000).toFixed(2)} kPa · risco celular:{" "}
                          <span className={cn(
                            p.cellShearRisk === "safe" ? "text-emerald-200"
                            : p.cellShearRisk === "warning" ? "text-amber-200"
                            : "text-rose-200",
                          )}>
                            {p.cellShearRisk === "safe" ? "seguro" : p.cellShearRisk === "warning" ? "atenção" : "crítico"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[9.5px] text-gray-500 leading-relaxed">
                      Baseado em <a href={`https://doi.org/${NELSON_2021_CITATION.doi}`} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline font-mono">
                        {NELSON_2021_CITATION.short}
                      </a>
                    </p>
                  </div>
                )
              })()}

              {/* Rationale */}
              {result.rationale.length > 0 && (
                <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-4">
                  <h3 className="text-[11px] font-semibold text-violet-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Por que esse toolpath?
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

              {/* Warnings */}
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
//   Sub-componentes
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
          "focus:outline-none focus:border-cyan-500/50 focus:bg-black/40",
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
          "focus:outline-none focus:border-cyan-500/50 focus:bg-black/40",
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
        className="w-full accent-cyan-500 mt-1" />
      {hint && <span className="block text-[9.5px] text-gray-500">{hint}</span>}
    </label>
  )
}
