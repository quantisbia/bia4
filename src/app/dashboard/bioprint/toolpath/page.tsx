/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  /dashboard/bioprint/toolpath — Toolpath Intelligence (R12.8)
 *
 *  Página única que reúne:
 *    1. Upload/colagem de G-code OU geração via Infill Studio
 *    2. Visualizador 3D camada-por-camada (Canvas2D rotativo)
 *    3. Análise científica (shear, viabilidade, continuidade, falhas)
 *    4. Base de conhecimento (5 papers canônicos)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Brain, Upload, FileCode, Download, Layers,
  ArrowLeft, Eye, EyeOff, Sparkles, BookOpen,
  Sliders, Activity,
} from "lucide-react"
import { GcodeViewer3D } from "@/components/bioprinter/GcodeViewer3D"
import { ToolpathAnalyzer } from "@/components/bioprinter/ToolpathAnalyzer"
import { InfillStudio, type InfillPreset } from "@/components/bioprinter/InfillStudio"
import { ScientificRefsPanel } from "@/components/bioprinter/ScientificRefsPanel"
import { InfoButton } from "@/components/ui/InfoButton"
import {
  parseGcode, computeShear, analyzeContinuity, predictFailures,
  biaHeader, generateGyroidGcode,
  generateTestHelloSquare, generateTestCross, generateTestSpiral, generateTestDotArray,
} from "@/lib/bioprint/toolpath-engine"
import { useBioprintProcess } from "@/lib/bioprint/process-context"
import { cn } from "@/lib/utils/helpers"

type Tab = "view" | "studio" | "refs"

export default function ToolpathPage() {
  const [gcode, setGcode] = useState<string>("")
  const [activeTab, setActiveTab] = useState<Tab>("view")
  const [nozzleId, setNozzleId] = useState(0.41)
  const [viscosity, setViscosity] = useState(5)
  const [yieldStress, setYieldStress] = useState(0)
  const [layerRange, setLayerRange] = useState<[number, number] | null>(null)
  const [showTravels, setShowTravels] = useState(false)
  const { state } = useBioprintProcess()

  // Parse + métricas (memoizado)
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

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const txt = ev.target?.result as string
      setGcode(txt)
    }
    reader.readAsText(file)
  }, [])

  const handleLoadFromSlice = useCallback(() => {
    if (state.slice.gcode) {
      setGcode(state.slice.gcode)
    }
  }, [state.slice.gcode])

  const handleLoadDemo = useCallback(() => {
    const demo = biaHeader({ jobName: "demo-gyroid", bioink: "GelMA 10%", nozzleId: 0.41 }) +
      generateGyroidGcode({
        bounds: { width: 30, depth: 30, height: 10 },
        density: 0.4,
        layerHeight: 0.2,
        feedrate: 900,
        extrusionWidth: 0.41,
      })
    setGcode(demo)
  }, [])

  // ─── Testes simples (R12.9) ───────────────────────────────────────────
  // G-code mínimos, sem temperatura, sem home — para validar comandos.
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

  const handleTestSquare = useCallback(() => {
    setGcode(simpleHeader("Hello Square 20mm") + generateTestHelloSquare())
  }, [simpleHeader])

  const handleTestCross = useCallback(() => {
    setGcode(simpleHeader("Cross Test 20mm") + generateTestCross())
  }, [simpleHeader])

  const handleTestSpiral = useCallback(() => {
    setGcode(simpleHeader("Spiral Test 5 turns") + generateTestSpiral())
  }, [simpleHeader])

  const handleTestDots = useCallback(() => {
    setGcode(simpleHeader("Dot Array 4×4") + generateTestDotArray())
  }, [simpleHeader])

  const handleGenerate = useCallback((g: string, _preset: InfillPreset) => {
    setGcode(g)
    setActiveTab("view")
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

  // ─── Layer range setup ────────────────────────────────────────────────
  const layers = parsed?.layers ?? []
  const layerFrom = layerRange?.[0] ?? layers[0] ?? 0
  const layerTo = layerRange?.[1] ?? layers[layers.length - 1] ?? 0

  return (
    <div className="flex flex-col min-h-full bg-[#0a0a0f]">
      {/* ═══ Header ═══ */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-violet-300/80 font-semibold mb-1 flex items-center gap-2">
              <Brain className="w-3 h-3" />
              Toolpath Intelligence Engine · R12.8
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-300" />
              Biofabrication Toolpath Intelligence
              <InfoButton title="O que é o BTIE?" align="left">
                <p>O <strong>Biofabrication Toolpath Intelligence Engine</strong> da BIA é o módulo proprietário Quantis
                para geração, análise e otimização de toolpaths de bioimpressão.</p>
                <p className="mt-1.5"><strong>Fundamentação científica:</strong> 5 papers canônicos cobrindo T-code,
                vector-field NAATIV3, FRESH, ML bioprinting e printability Pr=L²/16A.</p>
                <p className="mt-1.5"><strong>Diferenciais vs slicers genéricos:</strong></p>
                <ul className="list-disc list-inside text-[10.5px] mt-1">
                  <li>Hagen-Poiseuille shear + viabilidade celular</li>
                  <li>Predição de falhas (sag/clog/fusion/staircase)</li>
                  <li>Streamlines RK4 (vector-field guided)</li>
                  <li>TPMS Gyroid, Voronoi, Concentric perfusable</li>
                  <li>Nunca usa G28 (preserva bandeja/cartucho)</li>
                </ul>
              </InfoButton>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Visualização 3D · análise de shear · predição de falhas · geração de scaffolds biomiméticos.
              Engine proprietária BIA fundamentada em 5 papers de bioimpressão de ponta.
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
      </header>

      {/* ═══ Tab bar ═══ */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/5 flex gap-1.5 flex-wrap">
        <TabButton
          active={activeTab === "view"}
          onClick={() => setActiveTab("view")}
          icon={<Eye className="w-3.5 h-3.5" />}
        >
          Visualizar & Analisar
        </TabButton>
        <TabButton
          active={activeTab === "studio"}
          onClick={() => setActiveTab("studio")}
          icon={<Sparkles className="w-3.5 h-3.5" />}
        >
          Infill Studio
        </TabButton>
        <TabButton
          active={activeTab === "refs"}
          onClick={() => setActiveTab("refs")}
          icon={<BookOpen className="w-3.5 h-3.5" />}
        >
          Base Científica
          <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200">
            5
          </span>
        </TabButton>
      </div>

      {/* ═══ Content ═══ */}
      <main className="flex-1 p-4 sm:p-6">
        {activeTab === "view" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
            {/* Coluna 1: Viewer + controles de carga */}
            <div className="space-y-3">
              {/* Carga */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-100 text-[11px] font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Upload .gcode
                  <input type="file" accept=".gcode,.g,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
                <button
                  onClick={handleLoadFromSlice}
                  disabled={!state.slice.gcode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-100 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Da Etapa 3 (slicer)
                </button>
                <button
                  onClick={handleLoadDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-100 text-[11px] font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Carregar demo Gyroid
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

              {/* ─── Testes Simples (sem temperatura · sem home) ─── */}
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
                        G-code mínimo para validar comandos da bioimpressora · posicione o bico manualmente antes de iniciar
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <TestButton
                    icon={<Square className="w-3.5 h-3.5" />}
                    label="Hello Square"
                    desc="Quadrado 20mm · 1 camada"
                    onClick={handleTestSquare}
                  />
                  <TestButton
                    icon={<Plus className="w-3.5 h-3.5" />}
                    label="Cross Test"
                    desc="Cruz X+Y · 20mm"
                    onClick={handleTestCross}
                  />
                  <TestButton
                    icon={<RotateCw className="w-3.5 h-3.5" />}
                    label="Spiral"
                    desc="Espiral · 5 voltas · fluxo contínuo"
                    onClick={handleTestSpiral}
                  />
                  <TestButton
                    icon={<Grid3x3 className="w-3.5 h-3.5" />}
                    label="Dot Array"
                    desc="Matriz 4×4 · testa extrusor"
                    onClick={handleTestDots}
                  />
                </div>
              </div>

              {/* Viewer 3D */}
              <div className="rounded-xl border border-white/10 bg-black/40 h-[600px] relative">
                <GcodeViewer3D
                  parsed={parsed}
                  shearValues={shear?.perMove}
                  layerFrom={layerRange ? layers[layerFrom] : undefined}
                  layerTo={layerRange ? layers[layerTo] : undefined}
                  showTravels={showTravels}
                />
              </div>

              {/* Controles de visualização */}
              {parsed && parsed.layers.length > 0 && (
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
                    <span className="text-[10px] text-gray-400 w-12 text-right font-mono">
                      {layers[layerFrom]?.toFixed(2)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={parsed.layers.length - 1}
                      value={layerFrom}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        setLayerRange([v, Math.max(v, layerTo)])
                      }}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="text-[10px] text-gray-400 w-12 text-left font-mono">
                      {layers[layerTo]?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-12 text-right font-mono">
                      até
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={parsed.layers.length - 1}
                      value={layerTo}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        setLayerRange([Math.min(layerFrom, v), v])
                      }}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="text-[10px] text-gray-400 w-12 text-left font-mono">
                      layer {layerTo + 1}/{parsed.layers.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setLayerRange(null)}
                    className="text-[10px] text-gray-500 hover:text-white transition-colors"
                  >
                    Resetar filtro (mostrar todas)
                  </button>
                </div>
              )}
            </div>

            {/* Coluna 2: Análise científica */}
            <div className="space-y-3">
              {/* Parâmetros físicos do bioink */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Sliders className="w-3 h-3" /> Parâmetros físicos do bioink
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <PhysParam label="Nozzle ID (mm)" value={nozzleId} onChange={setNozzleId} min={0.1} max={2} step={0.01} />
                  <PhysParam label="μ (Pa·s)" value={viscosity} onChange={setViscosity} min={0.1} max={500} step={0.5} />
                  <PhysParam label="τ₀ yield (Pa)" value={yieldStress} onChange={setYieldStress} min={0} max={500} step={5} />
                </div>
                <p className="text-[9px] text-gray-500 mt-1">
                  Hagen-Poiseuille + Herschel-Bulkley · ajuste para recalcular shear/viabilidade
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
                    Faça upload, carregue da Etapa 3 ou clique em "demo Gyroid".
                  </p>
                </div>
              )}
            </div>
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

// ─── Subcomponentes ─────────────────────────────────────────────────────────

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

function PhysParam({
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
      <span className="text-[9.5px] text-gray-500 block mb-0.5">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono focus:border-cyan-500/50 outline-none"
      />
    </label>
  )
}
