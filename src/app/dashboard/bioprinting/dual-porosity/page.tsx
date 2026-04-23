"use client"

/**
 * BIA v4.2 — DUAL-POROSITY TESTER
 * Interface de teste funcional para arquitetura macro + micro porosidade.
 * Tecidos: Osso Trabecular, Fígado, Cartilagem, Rim.
 */

import { useState } from "react"
import Link from "next/link"
import {
  ChevronLeft, Loader2, Play, Download, AlertTriangle, CheckCircle2,
  Layers, Activity, Droplets, Grid3x3, Waves, Sparkles, Box,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import ToolpathPreview3D, { type PreviewSegment } from "@/components/bioprinting/ToolpathPreview3D"
import { cn } from "@/lib/utils/helpers"

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════
type TissueId = "osso_trabecular" | "figado" | "cartilagem" | "rim"

interface TissueOption {
  id: TissueId
  name: string
  icon: string
  baseStructure: string
  macroDesc: string
  microDesc: string
  expectedPorosity: string
  applications: string[]
  color: string
}

interface DualPorosityResponse {
  success: boolean
  tissue: string
  config: {
    baseStructure: string
    baseDensity: number
    macroEnabled: boolean
    microEnabled: boolean
    macro: {
      pattern: string
      diameter_um: number
      spacing_mm: number
      mode: string
      sacrificialMaterial?: string
    } | null
    micro: {
      pattern: string
      diameter_um: number
      spacing_um: number
      porogenType?: string
    } | null
  }
  summary: {
    totalPorosity_pct: number
    macroPorosity_pct: number
    microPorosity_pct: number
    solidDensity_pct: number
    folkmanCompliant: boolean
    mechanicalCompliant: boolean
    estimatedViability_pct: number
    estimatedPerfusion_mLminKg?: number
    layerCount: number
    totalSegments: number
  }
  previewSegments: Array<{
    ax: number; ay: number; bx: number; by: number; z: number; kind: string
  }>
  previewTruncated: boolean
  macroResult: {
    totalLength_mm: number
    channelCount: number
    avgDiameter_um: number
    perfusion_mLminKg: number
    vascularEfficiency: number
    notes: string[]
  } | null
  microResult: {
    channelCount: number
    density_per_mm2: number
    porosity_pct: number
    diffusionLimit_um: number
    folkmanCompliance: boolean
    surfaceAreaRatio: number
    notes: string[]
  } | null
  voronoi3DStats: {
    cellCount: number
    porosity_pct: number
    avgTrabeculaSize_um: number
    vertConnectivity: number
    lloydIterations: number
  } | null
  notes: string[]
  warnings: string[]
  creditsUsed: number
}

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const TISSUES: TissueOption[] = [
  {
    id: "osso_trabecular",
    name: "Osso Trabecular",
    icon: "🦴",
    baseStructure: "Voronoi 3D + Lloyd Relaxation",
    macroDesc: "Canais de Havers (Ø600µm, cross-hatch)",
    microDesc: "Canais de Volkmann (Ø80µm, porógeno NaCl)",
    expectedPorosity: "75-80%",
    applications: ["Scaffolds ortopédicos", "Defeitos craniofaciais", "Regeneração óssea"],
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40",
  },
  {
    id: "figado",
    name: "Fígado",
    icon: "🫀",
    baseStructure: "Perlin Noise (morfologia orgânica)",
    macroDesc: "Tríade portal (Ø500µm, hexagonal)",
    microDesc: "Espaços de Disse (Ø100µm, poros hexagonais)",
    expectedPorosity: "65-70%",
    applications: ["Organoides hepáticos", "Bioreator detoxificação", "Modelos de doença"],
    color: "from-red-500/20 to-rose-500/20 border-red-500/40",
  },
  {
    id: "cartilagem",
    name: "Cartilagem",
    icon: "🦾",
    baseStructure: "Gyroid TPMS",
    macroDesc: "Avascular (sem macrocanais)",
    microDesc: "Alinhamento direcional (Ø120µm, fibras)",
    expectedPorosity: "40-50%",
    applications: ["Menisco", "Regeneração condral", "Articulações"],
    color: "from-cyan-500/20 to-teal-500/20 border-cyan-500/40",
  },
  {
    id: "rim",
    name: "Rim",
    icon: "🫘",
    baseStructure: "Voronoi 3D + Lloyd Relaxation",
    macroDesc: "Ramos arciformes (Ø700µm, branching Murray)",
    microDesc: "Glomérulo (Ø60µm, capilares radiais)",
    expectedPorosity: "70-75%",
    applications: ["Organoides renais", "Néfron artificial", "Dialysis scaffold"],
    color: "from-purple-500/20 to-indigo-500/20 border-purple-500/40",
  },
]

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function DualPorosityPage() {
  const [tissue, setTissue] = useState<TissueId>("osso_trabecular")
  const [bboxSize, setBboxSize] = useState(10) // mm
  const [zHeight, setZHeight] = useState(3) // mm
  const [layerHeight, setLayerHeight] = useState(0.25) // mm
  const [baseDensity, setBaseDensity] = useState(0.3)
  const [macroEnabled, setMacroEnabled] = useState(true)
  const [microEnabled, setMicroEnabled] = useState(true)
  const [seed, setSeed] = useState(42)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DualPorosityResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedTissue = TISSUES.find((t) => t.id === tissue)!

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/gcode/dual-porosity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tissue,
          bboxXY: {
            minX: -bboxSize / 2,
            minY: -bboxSize / 2,
            maxX: bboxSize / 2,
            maxY: bboxSize / 2,
          },
          zRange: [0, zHeight],
          layerHeight_mm: layerHeight,
          baseDensity,
          macroEnabled,
          microEnabled,
          seed,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data: DualPorosityResponse = await res.json()
      setResult(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleExportJSON = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dual-porosity-${tissue}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Converter previewSegments para o formato do ToolpathPreview3D
  const previewSegments: PreviewSegment[] = result
    ? result.previewSegments.map((s) => ({
        ax: s.ax, ay: s.ay, bx: s.bx, by: s.by, z: s.z,
        kind: (s.kind === "base" || s.kind === "macro" || s.kind === "micro" || s.kind === "perimeter")
          ? s.kind : "base",
      }))
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* HEADER */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/bioprinting" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Bioimpressão</span>
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Layers className="w-6 h-6 text-cyan-400" />
                Teste Dual-Porosity
                <Badge className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/40">BIA v4.2</Badge>
              </h1>
              <p className="text-xs text-slate-400">Macro + Micro porosidade hierárquica biomimética</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/bioprinting/engine">
              <Button variant="outline" size="sm">Motor GCODE →</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* INTRO */}
        <Card className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/20">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-2">Arquitetura Dual-Porosity</h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Combina <span className="text-red-400 font-semibold">macroporos (300-1200 µm)</span> para
                  perfusão e vascularização com <span className="text-blue-400 font-semibold">microporos (20-300 µm)</span>
                  {" "}para difusão e adesão celular — respeitando o limite de Folkman (&lt;200µm até vaso mais próximo)
                  e a densidade trabecular mínima (&gt;15% sólido) para carga mecânica.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Ref: Karageorgiou & Kaplan 2005, Grayson et al. 2008 (PNAS), Miri et al. 2018 (Adv. Mater.)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SELETOR DE TECIDO */}
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-base">1. Selecione o Tecido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TISSUES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTissue(t.id)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 text-left transition-all",
                    "bg-gradient-to-br",
                    t.color,
                    tissue === t.id
                      ? "ring-2 ring-cyan-400 scale-[1.02]"
                      : "opacity-70 hover:opacity-100 border-white/10",
                  )}
                >
                  <div className="text-3xl mb-2">{t.icon}</div>
                  <div className="font-bold text-sm mb-1">{t.name}</div>
                  <div className="text-xs text-slate-400 mb-2">{t.baseStructure}</div>
                  <Badge className="text-[10px] bg-white/10 border-white/20">
                    Porosidade {t.expectedPorosity}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Info do tecido selecionado */}
            <div className="mt-4 p-4 rounded-lg bg-slate-950/50 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-red-400" />
                <span className="text-slate-400">Macro:</span>
                <span className="text-white">{selectedTissue.macroDesc}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Grid3x3 className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">Micro:</span>
                <span className="text-white">{selectedTissue.microDesc}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-slate-400">Aplicações:</span>
                <span className="text-white">{selectedTissue.applications.join(" · ")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PARÂMETROS */}
        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-base">2. Parâmetros da Geometria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Lado do Cubo XY (mm)</label>
                <input
                  type="number" min={3} max={30} step={0.5}
                  value={bboxSize}
                  onChange={(e) => setBboxSize(parseFloat(e.target.value) || 10)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Altura Z (mm)</label>
                <input
                  type="number" min={0.5} max={15} step={0.5}
                  value={zHeight}
                  onChange={(e) => setZHeight(parseFloat(e.target.value) || 3)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Altura de Camada (mm)</label>
                <input
                  type="number" min={0.05} max={0.6} step={0.05}
                  value={layerHeight}
                  onChange={(e) => setLayerHeight(parseFloat(e.target.value) || 0.25)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Densidade Base ({Math.round(baseDensity * 100)}%)
                </label>
                <input
                  type="range" min={0.15} max={0.6} step={0.05}
                  value={baseDensity}
                  onChange={(e) => setBaseDensity(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="text-[10px] text-slate-500 mt-1">Mín. 15% (mecânica) • Máx. 60%</div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Seed (reprodutibilidade)</label>
                <input
                  type="number" min={1} max={9999}
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-sm focus:border-cyan-500 outline-none"
                />
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={macroEnabled}
                    onChange={(e) => setMacroEnabled(e.target.checked)}
                    className="accent-red-500"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-red-400" />
                    Macroporos (vasos)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={microEnabled}
                    onChange={(e) => setMicroEnabled(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Grid3x3 className="w-3.5 h-3.5 text-blue-400" />
                    Microporos (difusão)
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BOTÃO GERAR */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold px-8 py-6 text-base"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando arquitetura…</>
            ) : (
              <><Play className="w-5 h-5 mr-2" /> Gerar Dual-Porosity (6 créditos)</>
            )}
          </Button>
          {result && (
            <Button variant="outline" onClick={handleExportJSON}>
              <Download className="w-4 h-4 mr-2" /> Exportar JSON
            </Button>
          )}
        </div>

        {/* ERRO */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/40">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-300 mb-1">Erro na geração</div>
                <div className="text-sm text-red-200">{error}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RESULTADO */}
        {result && (
          <>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-slate-900/50 border-white/10">
                <CardContent className="pt-4">
                  <div className="text-xs text-slate-400 mb-1">Porosidade Total</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {result.summary.totalPorosity_pct.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Macro {result.summary.macroPorosity_pct.toFixed(1)}% + Micro {result.summary.microPorosity_pct.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-white/10">
                <CardContent className="pt-4">
                  <div className="text-xs text-slate-400 mb-1">Densidade Sólida</div>
                  <div className="text-2xl font-bold text-amber-400">
                    {result.summary.solidDensity_pct.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {result.summary.mechanicalCompliant ? "✓ Carga OK" : "⚠ Baixa"}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-white/10">
                <CardContent className="pt-4">
                  <div className="text-xs text-slate-400 mb-1">Viabilidade Estimada</div>
                  <div className="text-2xl font-bold text-green-400">
                    {result.summary.estimatedViability_pct.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Pós 7 dias cultura
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-white/10">
                <CardContent className="pt-4">
                  <div className="text-xs text-slate-400 mb-1">Folkman Compliance</div>
                  <div className="text-2xl font-bold">
                    {result.summary.folkmanCompliant ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-5 h-5" /> OK
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-5 h-5" /> Falha
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    &lt;200µm até vaso
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* PREVIEW 3D */}
            <Card className="bg-slate-900/50 border-white/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Box className="w-5 h-5 text-cyan-400" />
                  Preview 3D do Toolpath
                  <Badge className="ml-auto bg-slate-800 text-xs">
                    {result.previewSegments.length.toLocaleString()} segmentos
                    {result.previewTruncated && " (truncado)"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ToolpathPreview3D
                  segments={previewSegments}
                  bboxXY={{
                    minX: -bboxSize / 2, minY: -bboxSize / 2,
                    maxX: bboxSize / 2, maxY: bboxSize / 2,
                  }}
                  zRange={[0, zHeight]}
                  height={500}
                  mode="all"
                  showAxes={true}
                />
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-white" /> Estrutura base
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500" /> Macrocanais (vasculatura)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500" /> Microcanais (difusão)
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* DETALHES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MACROPOROSIDADE */}
              {result.macroResult && (
                <Card className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-red-400" />
                      Macroporosidade (Perfusão)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Padrão:</span><span>{result.config.macro?.pattern}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Diâmetro:</span><span>{result.config.macro?.diameter_um} µm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Espaçamento:</span><span>{result.config.macro?.spacing_mm} mm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Canais:</span><span>{result.macroResult.channelCount}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Comprimento total:</span><span>{result.macroResult.totalLength_mm.toFixed(1)} mm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Perfusão estimada:</span><span className="text-red-300">{result.macroResult.perfusion_mLminKg.toFixed(1)} mL/min/kg</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Eficiência vascular:</span><span>{(result.macroResult.vascularEfficiency * 100).toFixed(1)}%</span></div>
                    {result.config.macro?.sacrificialMaterial && (
                      <div className="flex justify-between"><span className="text-slate-400">Material sacrificial:</span><span className="text-amber-300">{result.config.macro.sacrificialMaterial}</span></div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* MICROPOROSIDADE */}
              {result.microResult && (
                <Card className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Grid3x3 className="w-4 h-4 text-blue-400" />
                      Microporosidade (Difusão)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Padrão:</span><span>{result.config.micro?.pattern}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Diâmetro:</span><span>{result.config.micro?.diameter_um} µm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Espaçamento:</span><span>{result.config.micro?.spacing_um} µm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Densidade:</span><span>{result.microResult.density_per_mm2.toFixed(1)} /mm²</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Porosidade:</span><span>{result.microResult.porosity_pct.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Limite difusão:</span><span className="text-blue-300">{result.microResult.diffusionLimit_um} µm</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Área superficial:</span><span>{result.microResult.surfaceAreaRatio.toFixed(2)}x</span></div>
                    {result.config.micro?.porogenType && (
                      <div className="flex justify-between"><span className="text-slate-400">Porógeno:</span><span className="text-cyan-300">{result.config.micro.porogenType}</span></div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* VORONOI 3D STATS */}
            {result.voronoi3DStats && (
              <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Waves className="w-4 h-4 text-purple-400" />
                    Estatísticas Voronoi 3D (Lloyd Relaxation)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Células</div>
                      <div className="font-bold text-purple-300">{result.voronoi3DStats.cellCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Porosidade</div>
                      <div className="font-bold">{result.voronoi3DStats.porosity_pct.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Trabécula Média</div>
                      <div className="font-bold">{result.voronoi3DStats.avgTrabeculaSize_um.toFixed(0)} µm</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Conectividade</div>
                      <div className="font-bold">{result.voronoi3DStats.vertConnectivity.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Lloyd iter.</div>
                      <div className="font-bold">{result.voronoi3DStats.lloydIterations}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NOTAS & WARNINGS */}
            {(result.notes.length > 0 || result.warnings.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.notes.length > 0 && (
                  <Card className="bg-slate-900/50 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Notas Técnicas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {result.notes.map((n, i) => (
                          <li key={i} className="flex gap-2"><span className="text-green-400">•</span>{n}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {result.warnings.length > 0 && (
                  <Card className="bg-amber-500/5 border-amber-500/30">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Warnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5 text-xs text-amber-200">
                        {result.warnings.map((w, i) => (
                          <li key={i} className="flex gap-2"><span className="text-amber-400">⚠</span>{w}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
