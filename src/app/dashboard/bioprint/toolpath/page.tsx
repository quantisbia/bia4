/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  /dashboard/bioprint/toolpath — Painel Profissional Pro (R12.10)
 *
 *  Toolpath Intelligence Engine + Multi-material Formulator + Microfluídica
 *
 *  Layout "Painel Profissional":
 *    ┌─ Header ────────────────────────────────────────────────────────────┐
 *    │  BIA · Toolpath Intelligence · R12.10                               │
 *    └─────────────────────────────────────────────────────────────────────┘
 *    ┌─ Tabs: Painel Pro · Infill Studio · Refs Científicas ──────────────┐
 *    └─────────────────────────────────────────────────────────────────────┘
 *    ┌──── BIOTINTA (LEFT) ─────┐  ┌──── 3D VIEWER (CENTER, GRANDE) ────┐
 *    │  Multi-material          │  │  Canvas 3D rotativo                 │
 *    │  formulator              │  │  Legend overlay multi-material       │
 *    │  T0..T3 cards            │  │  Layer slider · color modes          │
 *    │  Status: pronto/incompl  │  │                                       │
 *    │  Templates: vasc/osteo/  │  │  ↓ Carga / Testes Simples / Demo    │
 *    │   fresh-card/skin-tri    │  │                                       │
 *    └──────────────────────────┘  └──────────────────────────────────────┘
 *    ┌──── PARÂMETROS LIVE (RIGHT) ──────────────────────────────────────┐
 *    │  Sliders: nozzleId · μ · τ₀ · feedrate                              │
 *    │  ↓ Recalcula shear/viability em tempo real (useMemo)                │
 *    │  ToolpathAnalyzer cards · resumo científico                          │
 *    └─────────────────────────────────────────────────────────────────────┘
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  Brain, Upload, FileCode, Download, Layers,
  ArrowLeft, Eye, EyeOff, Sparkles, BookOpen,
  Sliders, Activity, FlaskConical, Square, Plus, RotateCw, Grid3x3,
  Droplets, Beaker, AlertTriangle, CheckCircle2, Cpu, ChevronRight,
} from "lucide-react"
import { GcodeViewer3D } from "@/components/bioprinter/GcodeViewer3D"
import { ToolpathAnalyzer } from "@/components/bioprinter/ToolpathAnalyzer"
import { InfillStudio, type InfillPreset } from "@/components/bioprinter/InfillStudio"
import { ScientificRefsPanel } from "@/components/bioprinter/ScientificRefsPanel"
import { BioinkMultiMaterialFormulator } from "@/components/bioprinter/BioinkMultiMaterialFormulator"
import { InfoButton } from "@/components/ui/InfoButton"
import {
  parseGcode, computeShear, analyzeContinuity, predictFailures,
  biaHeader, generateGyroidGcode,
  generateTestHelloSquare, generateTestCross, generateTestSpiral, generateTestDotArray,
} from "@/lib/bioprint/toolpath-engine"
import {
  useBioprintProcess, isBioinkReady, getPrimaryFormulation,
  type BioinkFormulation,
} from "@/lib/bioprint/process-context"
import { cn } from "@/lib/utils/helpers"

type Tab = "panel" | "studio" | "refs"

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — Painel Profissional Pro
// ═══════════════════════════════════════════════════════════════════════════

export default function ToolpathPage() {
  const { state, updateBioink } = useBioprintProcess()
  const [gcode, setGcode] = useState<string>("")
  const [activeTab, setActiveTab] = useState<Tab>("panel")

  // Parâmetros físicos em tempo real (sliders)
  const [nozzleId, setNozzleId] = useState(0.41)
  const [viscosity, setViscosity] = useState(5)
  const [yieldStress, setYieldStress] = useState(0)
  const [feedrate, setFeedrate] = useState(900)

  // Viewer state
  const [layerRange, setLayerRange] = useState<[number, number] | null>(null)
  const [showTravels, setShowTravels] = useState(false)

  // Sync inicial: se houver bioink primária, popula μ/τ₀
  const primaryBioink = getPrimaryFormulation(state.bioink)
  useEffect(() => {
    if (primaryBioink?.rheology?.viscosityPaS != null) {
      setViscosity(primaryBioink.rheology.viscosityPaS)
    }
    if (primaryBioink?.rheology?.yieldStressPa != null) {
      setYieldStress(primaryBioink.rheology.yieldStressPa)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryBioink?.materialId])

  // ─── Parse + métricas (memoizado · recalcula em tempo real) ──────────
  const parsed = useMemo(() => {
    if (!gcode) return null
    return parseGcode(gcode)
  }, [gcode])

  const shear = useMemo(() => {
    if (!parsed) return null
    return computeShear(parsed, nozzleId, viscosity, yieldStress)
  }, [parsed, nozzleId, viscosity, yieldStress])

  const continuity = useMemo(() => {
    if (!parsed) return null
    return analyzeContinuity(parsed)
  }, [parsed])

  const failures = useMemo(() => {
    if (!parsed || !shear || !continuity) return null
    return predictFailures(parsed, shear, continuity, yieldStress)
  }, [parsed, shear, continuity, yieldStress])

  // ─── Bioink ready? (gate) ───────────────────────────────────────────
  const bioinkReady = isBioinkReady(state.bioink)
  const formulations = state.bioink.formulations ?? []

  // ─── Handlers de formulações ─────────────────────────────────────────
  const handleFormulationsChange = useCallback((next: BioinkFormulation[]) => {
    updateBioink({
      formulations: next,
      strategy: next.length === 1 ? "single" : next.length === 2 ? "dual" : "multi",
      status: next.length > 0 && next.every((f) => !!f.material && f.concentration > 0)
        ? "ready"
        : "draft",
      // Sync legacy fields p/ retrocompat
      material: next[0]?.material ?? null,
      concentration: next[0]?.concentration ?? null,
      crosslinker: next[0]?.crosslinker ?? null,
      cellType: next[0]?.cellType ?? null,
    })
  }, [updateBioink])

  // ─── Handlers de carga de G-code ─────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setGcode(ev.target?.result as string)
    reader.readAsText(file)
  }, [])

  const handleLoadFromSlice = useCallback(() => {
    if (state.slice.gcode) setGcode(state.slice.gcode)
  }, [state.slice.gcode])

  const handleLoadDemo = useCallback(() => {
    const bioinkLabel = primaryBioink ? `${primaryBioink.material} ${primaryBioink.concentration}%` : "GelMA 10%"
    const demo = biaHeader({ jobName: "demo-gyroid", bioink: bioinkLabel, nozzleId }) +
      generateGyroidGcode({
        bounds: { width: 30, depth: 30, height: 10 },
        density: 0.4,
        layerHeight: 0.2,
        feedrate,
        extrusionWidth: nozzleId,
      })
    setGcode(demo)
  }, [primaryBioink, nozzleId, feedrate])

  // Testes simples
  const simpleHeader = useCallback((testName: string) => {
    return [
      "; ═══════════════════════════════════════════════════════════════",
      "; BIA · TESTE SIMPLES — sem temperatura · sem home (G28)",
      `; Test:       ${testName}`,
      `; Generated:  ${new Date().toISOString()}`,
      "; ─────────────────────────────────────────────────────────────",
      "; ⚠️ Posicione o bico MANUALMENTE sobre o bed antes de iniciar.",
      "; ⚠️ NENHUM aquecimento de cartucho/bed/chamber é enviado.",
      "; ⚠️ NENHUM G28 (home) é enviado — preserva bandeja/cartucho.",
      "; ═══════════════════════════════════════════════════════════════",
      "",
    ].join("\n")
  }, [])

  const handleTestSquare = useCallback(() => setGcode(simpleHeader("Hello Square 20mm") + generateTestHelloSquare()), [simpleHeader])
  const handleTestCross  = useCallback(() => setGcode(simpleHeader("Cross Test 20mm") + generateTestCross()), [simpleHeader])
  const handleTestSpiral = useCallback(() => setGcode(simpleHeader("Spiral Test 5 turns") + generateTestSpiral()), [simpleHeader])
  const handleTestDots   = useCallback(() => setGcode(simpleHeader("Dot Array 4×4") + generateTestDotArray()), [simpleHeader])

  const handleGenerate = useCallback((g: string, _preset: InfillPreset) => {
    setGcode(g)
    setActiveTab("panel")
  }, [])

  const handleDownload = useCallback(() => {
    if (!gcode) return
    const blob = new Blob([gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bia-toolpath-${Date.now()}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }, [gcode])

  const layers = parsed?.layers ?? []
  const layerFrom = layerRange?.[0] ?? layers[0] ?? 0
  const layerTo = layerRange?.[1] ?? layers[layers.length - 1] ?? 0

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col min-h-full bg-[#0a0a0f]">
      {/* ═══ Header ═══ */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300/80 font-semibold mb-1 flex items-center gap-2">
              <Brain className="w-3 h-3" />
              Toolpath Intelligence Engine · Painel Profissional · R12.10
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
              <Sparkles className="w-5 h-5 text-violet-300" />
              Painel Profissional de Bioimpressão 3D
              <InfoButton title="O que é o Painel Profissional Pro?" align="left">
                <p>Painel unificado da BIA com:</p>
                <ul className="list-disc list-inside text-[10.5px] mt-1.5 space-y-0.5">
                  <li><strong>Formulação multi-material</strong> (até 4 cabeças T0..T3)</li>
                  <li><strong>Viewer 3D científico</strong> rotativo com cor por tool/shear/layer</li>
                  <li><strong>Parâmetros em tempo real</strong> (μ, τ₀, nozzle Ø) que recalculam shear/viability instantaneamente</li>
                  <li><strong>Análise científica</strong> Hagen-Poiseuille + Herschel-Bulkley</li>
                  <li><strong>Predição de falhas</strong> sag/clog/fusion/staircase</li>
                </ul>
                <p className="mt-1.5 text-amber-200">⚠️ Formule a biotinta primeiro — toolpath ferramenta segue regras físicas do material.</p>
              </InfoButton>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Formulação multi-material · Viewer 3D · Análise em tempo real · 5 papers canônicos.
              Engine proprietária BIA Quantis.
            </p>
          </div>

          <Link
            href="/dashboard/bioprint"
            className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar para Hub
          </Link>
        </div>

        {/* Status de prontidão da biotinta */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <BioinkStatusChip ready={bioinkReady} formulations={formulations} />
          {gcode && parsed && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
              <FileCode className="w-3 h-3" />
              {parsed.stats.moveCount} moves · {parsed.layers.length} layers
            </span>
          )}
          {shear && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] bg-violet-500/10 border border-violet-500/30 text-violet-200">
              <Activity className="w-3 h-3" />
              τ_w ≈ {shear.wallShearStressPa.toFixed(1)} Pa · viab {(shear.estimatedViability * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </header>

      {/* ═══ Tabs ═══ */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/5 flex gap-1.5 flex-wrap">
        <TabButton active={activeTab === "panel"} onClick={() => setActiveTab("panel")} icon={<Cpu className="w-3.5 h-3.5" />}>
          Painel Profissional
        </TabButton>
        <TabButton active={activeTab === "studio"} onClick={() => setActiveTab("studio")} icon={<Sparkles className="w-3.5 h-3.5" />}>
          Infill Studio
        </TabButton>
        <TabButton active={activeTab === "refs"} onClick={() => setActiveTab("refs")} icon={<BookOpen className="w-3.5 h-3.5" />}>
          Base Científica
          <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200">5</span>
        </TabButton>
      </div>

      {/* ═══ Content ═══ */}
      <main className="flex-1 p-4 sm:p-6">
        {activeTab === "panel" && (
          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr_360px] gap-4">
            {/* ─── LEFT: Multi-material Bioink Formulator ─── */}
            <aside className="xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto pb-3">
              <BioinkMultiMaterialFormulator
                formulations={formulations}
                onChange={handleFormulationsChange}
                compact
              />
            </aside>

            {/* ─── CENTER: 3D Viewer (centerpiece) + carga ─── */}
            <div className="space-y-3 min-w-0">
              {/* Carga de G-code */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-wrap items-center gap-2">
                <label className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                  bioinkReady
                    ? "bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-100 cursor-pointer"
                    : "bg-white/[0.03] border border-white/10 text-gray-500 cursor-not-allowed",
                )}>
                  <Upload className="w-3.5 h-3.5" />
                  Upload .gcode
                  <input type="file" accept=".gcode,.g,.txt" onChange={handleFileUpload} className="hidden" disabled={!bioinkReady} />
                </label>
                <button
                  onClick={handleLoadFromSlice}
                  disabled={!state.slice.gcode || !bioinkReady}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-100 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Da Etapa 3 (slicer)
                </button>
                <button
                  onClick={handleLoadDemo}
                  disabled={!bioinkReady}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Demo Gyroid
                </button>
                {gcode && (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 text-[11px] transition-colors ml-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                )}
              </div>

              {/* Gate visual: biotinta obrigatória */}
              {!bioinkReady && (
                <div className="rounded-xl border-2 border-dashed border-amber-500/40 bg-gradient-to-br from-amber-500/[0.06] to-amber-500/[0.02] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[13px] sm:text-sm font-bold text-amber-100 mb-1">
                        Formule a biotinta primeiro
                      </h3>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        Antes de carregar G-code ou gerar toolpath, defina ao menos uma formulação no
                        painel à esquerda. Toolpath depende de propriedades do material
                        (viscosidade μ, yield stress τ₀, tipo celular) para calcular shear e viabilidade.
                      </p>
                      <p className="text-[10.5px] text-amber-300/60 mt-2 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> Use um template (Vascular Dual, Cardíaco FRESH, Osteocondral, Pele) ou adicione um material manualmente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3D Viewer — CENTERPIECE GRANDE */}
              {bioinkReady && (
                <div className="rounded-xl border border-violet-500/20 bg-black/40 h-[70vh] min-h-[520px] relative shadow-lg shadow-violet-500/5">
                  <GcodeViewer3D
                    parsed={parsed}
                    shearValues={shear?.perMove}
                    layerFrom={layerRange ? layers[layerFrom] : undefined}
                    layerTo={layerRange ? layers[layerTo] : undefined}
                    showTravels={showTravels}
                    formulations={formulations}
                    initialColorMode={formulations.length > 1 ? "tool" : "layer"}
                  />
                </div>
              )}

              {/* Testes simples */}
              {bioinkReady && (
                <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.05] to-amber-500/[0.01] p-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
                      </div>
                      <div>
                        <h3 className="text-[12px] font-bold text-white flex items-center gap-1.5">
                          Testes Simples
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold uppercase tracking-wider">
                            sem temp · sem home
                          </span>
                        </h3>
                        <p className="text-[10px] text-amber-200/60">
                          G-code mínimo · valida comandos · posicione o bico manualmente
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <TestButton icon={<Square className="w-3.5 h-3.5" />}  label="Hello Square" desc="Quadrado 20mm" onClick={handleTestSquare} />
                    <TestButton icon={<Plus className="w-3.5 h-3.5" />}    label="Cross Test"   desc="Cruz X+Y · 20mm" onClick={handleTestCross} />
                    <TestButton icon={<RotateCw className="w-3.5 h-3.5" />} label="Spiral"       desc="Espiral · 5 voltas" onClick={handleTestSpiral} />
                    <TestButton icon={<Grid3x3 className="w-3.5 h-3.5" />} label="Dot Array"    desc="Matriz 4×4" onClick={handleTestDots} />
                  </div>
                </div>
              )}

              {/* Layer filter */}
              {bioinkReady && parsed && parsed.layers.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      <Layers className="w-3 h-3" />
                      Filtro de camadas ({parsed.layers.length})
                    </div>
                    <button
                      onClick={() => setShowTravels(!showTravels)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors",
                        showTravels
                          ? "bg-violet-500/30 text-white border border-violet-500/50"
                          : "bg-white/[0.04] text-gray-400 border border-white/10",
                      )}
                    >
                      {showTravels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      Travels (G0)
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-12 text-right font-mono">{layers[layerFrom]?.toFixed(2)}</span>
                    <input
                      type="range" min={0} max={parsed.layers.length - 1} value={layerFrom}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        setLayerRange([v, Math.max(v, layerTo)])
                      }}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="text-[10px] text-gray-400 w-12 text-left font-mono">{layers[layerTo]?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-12 text-right font-mono">até</span>
                    <input
                      type="range" min={0} max={parsed.layers.length - 1} value={layerTo}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        setLayerRange([Math.min(layerFrom, v), v])
                      }}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="text-[10px] text-gray-400 w-12 text-left font-mono">layer {layerTo + 1}/{parsed.layers.length}</span>
                  </div>
                  <button onClick={() => setLayerRange(null)} className="text-[10px] text-gray-500 hover:text-white transition-colors">
                    Resetar filtro (mostrar todas)
                  </button>
                </div>
              )}
            </div>

            {/* ─── RIGHT: Live Parameters + Análise científica ─── */}
            <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto pb-3">
              {/* Parâmetros físicos em tempo real (SLIDERS) */}
              <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.05] to-cyan-500/[0.02] p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                    <Sliders className="w-3.5 h-3.5 text-violet-300" />
                  </div>
                  <div>
                    <h3 className="text-[12px] font-bold text-white">Parâmetros em Tempo Real</h3>
                    <p className="text-[9.5px] text-violet-200/60">
                      Recalcula shear/viability instantaneamente
                    </p>
                  </div>
                </div>

                <LiveSlider
                  label="Nozzle Ø"
                  unit="mm"
                  value={nozzleId} onChange={setNozzleId}
                  min={0.1} max={2} step={0.01}
                  color="violet"
                  hint="Diâmetro do bico (Hagen-Poiseuille)"
                />
                <LiveSlider
                  label="Viscosidade μ"
                  unit="Pa·s"
                  value={viscosity} onChange={setViscosity}
                  min={0.1} max={500} step={0.5}
                  color="cyan"
                  hint="Propriedade newtoniana base"
                />
                <LiveSlider
                  label="Yield stress τ₀"
                  unit="Pa"
                  value={yieldStress} onChange={setYieldStress}
                  min={0} max={500} step={1}
                  color="amber"
                  hint="Tensão de escoamento (Herschel-Bulkley)"
                />
                <LiveSlider
                  label="Feedrate F"
                  unit="mm/min"
                  value={feedrate} onChange={setFeedrate}
                  min={100} max={3000} step={50}
                  color="emerald"
                  hint="Velocidade de impressão"
                />

                <p className="text-[9.5px] text-violet-300/60 italic pt-1 border-t border-white/5">
                  💡 Mexa os sliders — os cards abaixo atualizam em tempo real
                </p>
              </div>

              {/* Análise científica */}
              {parsed && shear && continuity && failures ? (
                <ToolpathAnalyzer
                  parsed={parsed}
                  shear={shear}
                  continuity={continuity}
                  failures={failures}
                  nozzleId={nozzleId}
                  viscosity={viscosity}
                  yieldStress={yieldStress}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
                  <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-[12px] text-gray-400 font-semibold">Sem G-code carregado</p>
                  <p className="text-[10.5px] text-gray-500 mt-1">
                    {bioinkReady
                      ? "Faça upload, carregue da Etapa 3 ou clique em Demo Gyroid."
                      : "Defina a biotinta primeiro à esquerda."}
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}

        {activeTab === "studio" && (
          <div className="max-w-4xl mx-auto">
            <InfillStudio onGenerate={handleGenerate} />
          </div>
        )}

        {activeTab === "refs" && (
          <div className="max-w-4xl mx-auto">
            <ScientificRefsPanel />
          </div>
        )}
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all",
        active
          ? "bg-violet-500/25 border border-violet-500/50 text-white"
          : "bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:border-white/20",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function TestButton({
  icon, label, desc, onClick,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-amber-500/30 bg-black/30 hover:bg-amber-500/10 hover:border-amber-400/50 p-2 transition-all group"
    >
      <div className="flex items-center gap-1.5 text-amber-200 group-hover:text-amber-100">
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="text-[9.5px] text-gray-400 mt-0.5 leading-snug">{desc}</p>
    </button>
  )
}

/**
 * Slider profissional com label, valor numérico + input editável.
 * Recompõe métricas em tempo real via React state → useMemo cascade.
 */
function LiveSlider({
  label, unit, value, onChange, min, max, step, color, hint,
}: {
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  color: "violet" | "cyan" | "amber" | "emerald"
  hint?: string
}) {
  const colorMap = {
    violet:  { accent: "accent-violet-500",  text: "text-violet-200",  border: "border-violet-500/30",  bg: "bg-violet-500/5" },
    cyan:    { accent: "accent-cyan-500",    text: "text-cyan-200",    border: "border-cyan-500/30",    bg: "bg-cyan-500/5" },
    amber:   { accent: "accent-amber-500",   text: "text-amber-200",   border: "border-amber-500/30",   bg: "bg-amber-500/5" },
    emerald: { accent: "accent-emerald-500", text: "text-emerald-200", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
  }[color]
  return (
    <div className={cn("rounded-lg border p-2 space-y-1.5", colorMap.border, colorMap.bg)}>
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[10.5px] font-semibold text-gray-200">
          {label} <span className="text-gray-500 font-normal">({unit})</span>
        </label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min} max={max} step={step}
          className={cn(
            "w-20 bg-black/50 border rounded px-1.5 py-0.5 text-[11px] text-white font-mono text-right focus:outline-none",
            colorMap.border,
          )}
        />
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        className={cn("w-full", colorMap.accent)}
      />
      <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono">
        <span>{min}</span>
        {hint && <span className={cn("italic", colorMap.text)}>{hint}</span>}
        <span>{max}</span>
      </div>
    </div>
  )
}

function BioinkStatusChip({
  ready, formulations,
}: {
  ready: boolean
  formulations: BioinkFormulation[]
}) {
  if (!ready) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] bg-amber-500/10 border border-amber-500/40 text-amber-200 font-semibold">
        <AlertTriangle className="w-3 h-3" />
        Biotinta não formulada
      </span>
    )
  }
  const count = formulations.length || 1
  const cellCount = formulations.filter((f) => f.cellType).length
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 font-semibold">
      <CheckCircle2 className="w-3 h-3" />
      Biotinta · {count} {count === 1 ? "material" : "materiais"}
      {cellCount > 0 && <span className="text-emerald-300">· {cellCount} c/ células</span>}
    </span>
  )
}
