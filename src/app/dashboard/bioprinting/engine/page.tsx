"use client"

/**
 * BIA v4.2 — Motor GCODE + Multi-Well Orchestrator
 * Interface de criação e download de G-code para bioimpressão em placas de poços.
 */

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Printer, Layers, Zap, Sparkles, Download, Play, ChevronLeft,
  FlaskConical, Microscope, Target, CheckCircle2, AlertTriangle,
  Activity, Loader2, Wand2, Box, Waves, Grid3x3, Route,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { WellPlateSelector, type WellPlateFormat } from "@/components/bioprinting/WellPlateSelector"
import { cn } from "@/lib/utils/helpers"

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════
interface InfillAlgo {
  id: string
  name: string
  category: "paramétrico" | "não-paramétrico"
  description: string
  bestFor: string[]
  icon: string
}

interface GeometryOption {
  id: string
  label: string
  icon: string
  tissue: string
  defaultParams: Record<string, number>
  paramLabels: Record<string, string>
}

interface GCodeResponse {
  success: boolean
  jobName: string
  jobId: string
  gcode: string
  totalLines: number
  estimatedTime_min: number
  bioinkVolume_uL: number
  totalDistance_mm: number
  layerCount: number
  wellsUsed: string[]
  warnings: string[]
  stats: {
    travelDistance_mm: number
    extrudeDistance_mm: number
    avgShearStress_Pa?: number
    peakShearStress_Pa?: number
    viabilityEstimate_pct?: number
  }
  summary: {
    bioprinter: string
    bioink: string
    algorithm: string
    wellsCount: number
    layerCount: number
    estimatedTime: string
    volume: string
    viability: string
  }
  creditsUsed: number
}

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const GEOMETRIES: GeometryOption[] = [
  { id: "disk", label: "Disco/Bolacha", icon: "🥏", tissue: "Pele / Cartilagem",
    defaultParams: { radius: 4, thickness: 1.5 },
    paramLabels: { radius: "Raio (mm)", thickness: "Espessura (mm)" } },
  { id: "membrane", label: "Membrana", icon: "⬜", tissue: "Pele / Barreira",
    defaultParams: { width: 6, height: 6, depth: 1 },
    paramLabels: { width: "Largura (mm)", height: "Comprimento (mm)", depth: "Espessura (mm)" } },
  { id: "cube_tissue", label: "Cubo Tecido", icon: "🧊", tissue: "Genérico",
    defaultParams: { width: 5, height: 5, depth: 3 },
    paramLabels: { width: "Largura (mm)", height: "Profundidade (mm)", depth: "Altura (mm)" } },
  { id: "bone_block", label: "Bloco Ósseo", icon: "🦴", tissue: "Osso",
    defaultParams: { width: 5, height: 5, depth: 3 },
    paramLabels: { width: "Largura (mm)", height: "Profundidade (mm)", depth: "Altura (mm)" } },
  { id: "vessel", label: "Vaso (Tubo)", icon: "🩸", tissue: "Vascular",
    defaultParams: { outerRadius: 3, innerRadius: 2, tubeLength: 5 },
    paramLabels: { outerRadius: "Raio externo (mm)", innerRadius: "Raio interno (mm)", tubeLength: "Comprimento (mm)" } },
  { id: "hexagonal_liver", label: "Hexágono Hepático", icon: "⬡", tissue: "Fígado",
    defaultParams: { radius: 3, thickness: 2 },
    paramLabels: { radius: "Raio (mm)", thickness: "Altura (mm)" } },
  { id: "organoid_sphere", label: "Esfera Organóide", icon: "🟡", tissue: "Organoide",
    defaultParams: { radius: 2 },
    paramLabels: { radius: "Raio (mm)" } },
  { id: "meniscus", label: "Menisco", icon: "🌙", tissue: "Cartilagem",
    defaultParams: { outerR: 4, innerR: 2, thickness: 2, arcAngle: 180 },
    paramLabels: { outerR: "Raio externo", innerR: "Raio interno", thickness: "Espessura", arcAngle: "Arco (°)" } },
  { id: "cornea", label: "Córnea", icon: "👁️", tissue: "Córnea",
    defaultParams: { outerR: 3, innerR: 1.5, thickness: 0.8, arcAngle: 200 },
    paramLabels: { outerR: "Raio externo", innerR: "Raio interno", thickness: "Espessura", arcAngle: "Arco (°)" } },
  { id: "lens", label: "Cristalino", icon: "🔵", tissue: "Cristalino",
    defaultParams: { radiusA: 3, radiusB: 2, thickness: 2 },
    paramLabels: { radiusA: "Semi-eixo A", radiusB: "Semi-eixo B", thickness: "Altura" } },
]

const INFILL_ALGOS: InfillAlgo[] = [
  { id: "gyroid_tpms", name: "Gyroid TPMS", category: "paramétrico", icon: "🌀",
    description: "Superfície periódica mínima triplamente definida — ótima para osso trabecular",
    bestFor: ["osso", "cartilagem", "vascularização"] },
  { id: "voronoi_3d", name: "Voronoi 3D", category: "não-paramétrico", icon: "🕸️",
    description: "Tesselação biomimética com poros irregulares (como osso real)",
    bestFor: ["osso trabecular", "cartilagem", "scaffolds biomiméticos"] },
  { id: "gradient", name: "Gradient", category: "paramétrico", icon: "📈",
    description: "Densidade variável em Z/X/Y ou radial — simula gradiente cortical-trabecular",
    bestFor: ["pele", "osso cortical-trabecular", "vascularização radial"] },
  { id: "rectilinear", name: "Rectilinear", category: "paramétrico", icon: "┼",
    description: "Linhas paralelas alternadas (padrão clássico)",
    bestFor: ["scaffolds simples", "MVP rápido", "cartilagem zonal"] },
  { id: "linear", name: "Linear", category: "paramétrico", icon: "≡",
    description: "Linhas unidirecionais — alinhamento colágeno",
    bestFor: ["pele fina", "córnea", "tendão"] },
]

const BIOPRINTERS = [
  { id: "cellink_biox", name: "CELLINK BIO X", heads: 3, uv: true },
  { id: "cellink_inkredible", name: "INKREDIBLE+", heads: 2, uv: true },
  { id: "allevi_2", name: "Allevi 2", heads: 2, uv: true },
  { id: "allevi_3", name: "Allevi 3", heads: 3, uv: true },
  { id: "regemat_bio_v1", name: "REGEMAT 3D V1", heads: 2, uv: true },
  { id: "generic_marlin", name: "Generic Marlin", heads: 1, uv: false },
]

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function GCodeEnginePage() {
  // Step management
  const [step, setStep] = useState(1)

  // Step 1: Geometry
  const [geomId, setGeomId] = useState("disk")
  const [geomParams, setGeomParams] = useState<Record<string, number>>(GEOMETRIES[0].defaultParams)

  // Step 2: Infill
  const [algo, setAlgo] = useState("gyroid_tpms")
  const [infillPercent, setInfillPercent] = useState(30)
  const [macroPoreSize, setMacroPoreSize] = useState(450)
  const [useMicroPoros, setUseMicroPoros] = useState(false)
  const [microPoreSize, setMicroPoreSize] = useState(50)

  // Step 3: Well Plate
  const [plateFormat, setPlateFormat] = useState<WellPlateFormat>(24)
  const [selectedWells, setSelectedWells] = useState<string[]>(["A1"])
  const [replicationMode, setReplicationMode] = useState<"same" | "different" | "gradient">("same")
  const [zHop, setZHop] = useState(5)
  const [pauseBetween, setPauseBetween] = useState(2)
  const [purgeVolume, setPurgeVolume] = useState(1)
  const [trajectory, setTrajectory] = useState<string[] | undefined>(undefined)

  // Step 4: Bioink + Printer
  const [bioprinterId, setBioprinterId] = useState("cellink_biox")
  const [material, setMaterial] = useState("GelMA")
  const [concentration, setConcentration] = useState(10)
  const [hasCells, setHasCells] = useState(true)
  const [cellDensity, setCellDensity] = useState(2)
  const [nozzleUm, setNozzleUm] = useState(410)
  const [tempC, setTempC] = useState(22)
  const [pressureKpa, setPressureKpa] = useState(80)
  const [printSpeed, setPrintSpeed] = useState(8)
  const [layerHeight, setLayerHeight] = useState(0.25)
  const [walls, setWalls] = useState(2)

  // Tissue context
  const [tissue, setTissue] = useState("Cartilagem articular")
  const [application, setApplication] = useState("Scaffold para reparo condral")

  // Result
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GCodeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showGcode, setShowGcode] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRec, setAiRec] = useState<Record<string, unknown> | null>(null)

  const currentGeom = useMemo(() => GEOMETRIES.find((g) => g.id === geomId) ?? GEOMETRIES[0], [geomId])

  // Reset params when geometry changes
  useEffect(() => {
    setGeomParams(currentGeom.defaultParams)
  }, [geomId, currentGeom])

  // Reset wells when plate format changes
  useEffect(() => {
    setSelectedWells(["A1"])
    setTrajectory(undefined)
  }, [plateFormat])

  // ──────────────────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────────────────
  async function computeTrajectory() {
    // Simple frontend trajectory: nearest neighbor by row/col coords
    // (também vem do backend quando gera o G-code, mas aqui preview rápido)
    if (selectedWells.length < 2) {
      setTrajectory(undefined)
      return
    }
    // preview client-side: raster order (backend recalcula ótimo)
    const ordered = [...selectedWells].sort((a, b) => {
      const ra = a.charCodeAt(0), rb = b.charCodeAt(0)
      if (ra !== rb) return ra - rb
      return parseInt(a.slice(1)) - parseInt(b.slice(1))
    })
    setTrajectory(ordered)
  }

  useEffect(() => {
    computeTrajectory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWells])

  async function askAI() {
    setAiLoading(true)
    setAiRec(null)
    try {
      const res = await fetch("/api/gcode/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tissue,
          application,
          bioink: { material, hasCells, concentration },
          geometry: geomId,
          wellPlateFormat: plateFormat,
          numberOfWells: selectedWells.length,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro IA")
      setAiRec(data.recommendation)
      // Apply recommendation
      if (data.recommendation?.recommendedAlgorithm) setAlgo(data.recommendation.recommendedAlgorithm)
      if (data.recommendation?.infillPercent) setInfillPercent(data.recommendation.infillPercent)
      if (data.recommendation?.macroPorosity?.poreSize_um) setMacroPoreSize(data.recommendation.macroPorosity.poreSize_um)
      if (data.recommendation?.microPorosity) {
        setUseMicroPoros(true)
        setMicroPoreSize(data.recommendation.microPorosity.poreSize_um || 50)
      }
      if (data.recommendation?.nozzle_um) setNozzleUm(data.recommendation.nozzle_um)
      if (data.recommendation?.bioprinterRecommendation?.id) setBioprinterId(data.recommendation.bioprinterRecommendation.id)
      if (data.recommendation?.wellPlateRecommendation?.zHop_mm) setZHop(data.recommendation.wellPlateRecommendation.zHop_mm)
      if (data.recommendation?.walls) setWalls(data.recommendation.walls)
      if (data.recommendation?.layerHeight_mm) setLayerHeight(data.recommendation.layerHeight_mm)
      if (data.recommendation?.printSpeed_mms) setPrintSpeed(data.recommendation.printSpeed_mms)
      if (data.recommendation?.pressure_kpa) setPressureKpa(data.recommendation.pressure_kpa)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado")
    } finally {
      setAiLoading(false)
    }
  }

  async function generateGCode() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const body = {
        geometry: { id: geomId, params: geomParams },
        infill: {
          algorithm: algo,
          infillPercent,
          macroPorosity: { density: 1 - infillPercent / 100, poreSize_um: macroPoreSize },
          microPorosity: useMicroPoros ? { density: 0.3, poreSize_um: microPoreSize } : undefined,
        },
        bioink: {
          material, concentration, hasCells,
          cellDensity: hasCells ? cellDensity : undefined,
          viscosity_cP: material.toLowerCase().includes("pcl") ? 8000 : 1500,
          temperature_c: tempC,
          pressure_kpa: pressureKpa,
          nozzleDiameter_um: nozzleUm,
          flowMultiplier: 1.0,
          retraction_mm: hasCells ? 0 : 0.3,
          printSpeed_mms: printSpeed,
          travelSpeed_mms: 50,
          shearStressMax_Pa: 50,
        },
        bioprinterId,
        layerHeight_mm: layerHeight,
        walls,
        skirtLoops: 0,
        wellPlate: {
          format: plateFormat,
          selectedWells,
          replicationMode,
          zHopBetweenWells_mm: zHop,
          pauseBetweenWells_s: pauseBetween,
          purgeVolume_uL: purgeVolume,
          wipeTowerEnabled: false,
        },
        tissue, application,
        jobName: `${tissue}_${geomId}_${plateFormat}well`,
      }

      const res = await fetch("/api/gcode/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro no servidor")
      setResult(data)
      setStep(5)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }

  function downloadGCode() {
    if (!result) return
    const blob = new Blob([result.gcode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.jobName}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* HEADER */}
      <div className="border-b border-gray-800 bg-gray-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard/bioprinting" className="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400">
            <ChevronLeft className="w-4 h-4" /> Bioprinting
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="text-lg font-bold">BIA v4.2 — Motor GCODE</span>
            <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-700">Bioimpressão Especial</Badge>
          </div>
          <Button
            onClick={askAI}
            disabled={aiLoading}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wand2 className="w-4 h-4 mr-1" />}
            Pedir à BIA
          </Button>
        </div>

        {/* Progress steps */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex items-center gap-1 overflow-x-auto">
          {[
            { n: 1, label: "Geometria", icon: Box },
            { n: 2, label: "Infill & Porosidade", icon: Waves },
            { n: 3, label: "Placa de Poços", icon: Grid3x3 },
            { n: 4, label: "Bioink & Printer", icon: FlaskConical },
            { n: 5, label: "G-Code", icon: Download },
          ].map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.n}
                onClick={() => setStep(s.n)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition",
                  step === s.n
                    ? "bg-emerald-600 text-white"
                    : step > s.n
                      ? "bg-emerald-900/40 text-emerald-300"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300",
                )}
              >
                <Icon className="w-3 h-3" />
                <span className="font-semibold">{s.n}.</span>
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* AI Recommendation banner */}
        {aiRec && (
          <Card className="mb-4 bg-gradient-to-r from-purple-950/40 to-pink-950/30 border-purple-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-300">
                <Wand2 className="w-5 h-5" /> Recomendação da BIA v4.2
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-gray-200"><strong className="text-purple-300">Justificativa:</strong> {String(aiRec.justification ?? "—")}</p>
              {Array.isArray(aiRec.references) && aiRec.references.length > 0 && (
                <p className="text-xs text-gray-400">📚 Refs: {(aiRec.references as string[]).join(" • ")}</p>
              )}
              {Array.isArray(aiRec.criticalWarnings) && (aiRec.criticalWarnings as string[]).length > 0 && (
                <div className="text-xs text-amber-400">
                  ⚠️ {(aiRec.criticalWarnings as string[]).join(" | ")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 1 — GEOMETRIA */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Box className="w-5 h-5" /> 1. Escolha a geometria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {GEOMETRIES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGeomId(g.id)}
                      className={cn(
                        "p-3 rounded-lg border transition text-left",
                        geomId === g.id
                          ? "bg-emerald-600/20 border-emerald-500 text-white"
                          : "bg-gray-800/50 border-gray-700 hover:border-emerald-500/50",
                      )}
                    >
                      <div className="text-2xl mb-1">{g.icon}</div>
                      <div className="text-sm font-semibold">{g.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{g.tissue}</div>
                    </button>
                  ))}
                </div>

                {/* Geometry params */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span>{currentGeom.icon}</span> {currentGeom.label} — parâmetros
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(currentGeom.paramLabels).map(([key, label]) => (
                      <div key={key}>
                        <label className="text-xs text-gray-400">{label}</label>
                        <input
                          type="number"
                          value={geomParams[key] ?? 0}
                          onChange={(e) => setGeomParams({ ...geomParams, [key]: parseFloat(e.target.value) || 0 })}
                          step={0.1}
                          className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded focus:border-emerald-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    💡 Dica: mantenha o diâmetro do construto ≤ 85% do diâmetro do poço selecionado.
                  </div>
                </div>

                {/* Tissue context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Tecido-alvo</label>
                    <input
                      value={tissue}
                      onChange={(e) => setTissue(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Aplicação</label>
                    <input
                      value={application}
                      onChange={(e) => setApplication(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} className="bg-emerald-600 hover:bg-emerald-500">
                    Próximo: Infill →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2 — INFILL */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Waves className="w-5 h-5" /> 2. Algoritmo de Infill & Porosidade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {INFILL_ALGOS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAlgo(a.id)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition",
                      algo === a.id
                        ? "bg-emerald-600/15 border-emerald-500"
                        : "bg-gray-800/40 border-gray-700 hover:border-emerald-500/50",
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{a.icon}</span>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          a.category === "paramétrico"
                            ? "bg-blue-600/20 text-blue-300 border-blue-700"
                            : "bg-orange-600/20 text-orange-300 border-orange-700",
                        )}
                      >
                        {a.category}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold">{a.name}</div>
                    <div className="text-xs text-gray-400 mt-1 leading-snug">{a.description}</div>
                    <div className="text-[10px] text-gray-500 mt-2">
                      Ideal: {a.bestFor.join(", ")}
                    </div>
                  </button>
                ))}
              </div>

              {/* Porosity controls */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm">
                    <span>Infill (%) = estrutura sólida</span>
                    <span className="text-emerald-400 font-mono">{infillPercent}%</span>
                  </label>
                  <input
                    type="range" min={10} max={90} value={infillPercent}
                    onChange={(e) => setInfillPercent(parseInt(e.target.value))}
                    className="w-full mt-2 accent-emerald-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">Porosidade efetiva: {100 - infillPercent}%</div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm">
                    <span>Macroporosidade — tamanho de poro</span>
                    <span className="text-emerald-400 font-mono">{macroPoreSize} µm</span>
                  </label>
                  <input
                    type="range" min={100} max={1000} step={50} value={macroPoreSize}
                    onChange={(e) => setMacroPoreSize(parseInt(e.target.value))}
                    className="w-full mt-2 accent-emerald-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {macroPoreSize < 300 && "⚠️ Pequeno — dificulta vascularização"}
                    {macroPoreSize >= 300 && macroPoreSize <= 600 && "✅ Ótimo para osteogênese e vascularização"}
                    {macroPoreSize > 600 && "⚠️ Grande — perda de resistência mecânica"}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={useMicroPoros} onChange={(e) => setUseMicroPoros(e.target.checked)} className="accent-emerald-500" />
                    <span>Ativar <strong>microporosidade dual</strong> (overlay de microcanais)</span>
                  </label>
                  {useMicroPoros && (
                    <div className="mt-3">
                      <label className="flex items-center justify-between text-sm">
                        <span>Microporos — tamanho</span>
                        <span className="text-emerald-400 font-mono">{microPoreSize} µm</span>
                      </label>
                      <input
                        type="range" min={10} max={100} value={microPoreSize}
                        onChange={(e) => setMicroPoreSize(parseInt(e.target.value))}
                        className="w-full mt-2 accent-emerald-500"
                      />
                      <div className="text-xs text-gray-500 mt-1">Para ancoragem celular e difusão de O₂/nutrientes</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>← Voltar</Button>
                <Button onClick={() => setStep(3)} className="bg-emerald-600 hover:bg-emerald-500">
                  Próximo: Placa de Poços →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — WELL PLATE */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Grid3x3 className="w-5 h-5" /> 3. Placa de Cultura — selecione os poços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Plate selector buttons */}
              <div className="flex flex-wrap gap-2">
                {([6, 12, 24, 48, 96, 384] as WellPlateFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPlateFormat(f)}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm transition",
                      plateFormat === f
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "bg-gray-800/50 border-gray-700 hover:border-emerald-500/50",
                    )}
                  >
                    <div className="font-bold">{f}</div>
                    <div className="text-[10px] text-gray-400">poços</div>
                  </button>
                ))}
              </div>

              {/* Well selector SVG */}
              <WellPlateSelector
                format={plateFormat}
                selected={selectedWells}
                onChange={setSelectedWells}
                trajectory={trajectory}
              />

              {/* Replication mode */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Route className="w-4 h-4" /> Modo de Replicação</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { id: "same", label: "Mesma geometria", desc: "N réplicas idênticas (estatística)" },
                    { id: "different", label: "Designs diferentes", desc: "N grupos experimentais (DoE)" },
                    { id: "gradient", label: "Gradiente paramétrico", desc: "Varia um parâmetro entre poços" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setReplicationMode(opt.id as typeof replicationMode)}
                      className={cn(
                        "p-3 rounded-lg border text-left text-sm transition",
                        replicationMode === opt.id
                          ? "bg-emerald-600/20 border-emerald-500"
                          : "bg-gray-800/50 border-gray-700 hover:border-emerald-500/50",
                      )}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Inter-well params */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-xs text-gray-400">Z-hop entre poços (mm)</label>
                    <input type="number" value={zHop} onChange={(e) => setZHop(parseFloat(e.target.value) || 0)} step={0.5}
                      className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Pausa entre poços (s)</label>
                    <input type="number" value={pauseBetween} onChange={(e) => setPauseBetween(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Purga (µL)</label>
                    <input type="number" value={purgeVolume} onChange={(e) => setPurgeVolume(parseFloat(e.target.value) || 0)} step={0.5}
                      className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={selectedWells.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Próximo: Bioink & Printer →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — BIOINK & PRINTER */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FlaskConical className="w-5 h-5" /> 4. Bioink & Bioimpressora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bioprinter select */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Bioimpressora</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {BIOPRINTERS.map((bp) => (
                    <button
                      key={bp.id}
                      onClick={() => setBioprinterId(bp.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left text-sm transition",
                        bioprinterId === bp.id
                          ? "bg-emerald-600/20 border-emerald-500"
                          : "bg-gray-800/50 border-gray-700 hover:border-emerald-500/50",
                      )}
                    >
                      <div className="font-semibold">{bp.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {bp.heads} head{bp.heads > 1 ? "s" : ""} {bp.uv && "• UV"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bioink */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Material</label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded"
                  >
                    {["GelMA", "Alginate", "Collagen", "PCL", "dECM", "Fibrinogen", "Hyaluronic Acid", "Gelatin", "PEGDA"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Concentração (%)</label>
                  <input type="number" value={concentration} onChange={(e) => setConcentration(parseFloat(e.target.value) || 0)} step={0.5}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Nozzle (µm)</label>
                  <input type="number" value={nozzleUm} onChange={(e) => setNozzleUm(parseInt(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Layer (mm)</label>
                  <input type="number" value={layerHeight} onChange={(e) => setLayerHeight(parseFloat(e.target.value) || 0)} step={0.05}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Temperatura (°C)</label>
                  <input type="number" value={tempC} onChange={(e) => setTempC(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Pressão (kPa)</label>
                  <input type="number" value={pressureKpa} onChange={(e) => setPressureKpa(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Velocidade (mm/s)</label>
                  <input type="number" value={printSpeed} onChange={(e) => setPrintSpeed(parseFloat(e.target.value) || 0)} step={0.5}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Paredes (walls)</label>
                  <input type="number" value={walls} onChange={(e) => setWalls(parseInt(e.target.value) || 1)} min={1}
                    className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded" />
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasCells} onChange={(e) => setHasCells(e.target.checked)} className="accent-emerald-500" />
                  <span>Bioink contém <strong>células vivas</strong></span>
                </label>
                {hasCells && (
                  <div>
                    <label className="text-xs text-gray-400">Densidade celular (×10⁶ cel/mL)</label>
                    <input type="number" value={cellDensity} onChange={(e) => setCellDensity(parseFloat(e.target.value) || 0)} step={0.5}
                      className="w-full mt-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded max-w-xs" />
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>← Voltar</Button>
                <Button
                  onClick={generateGCode}
                  disabled={loading || selectedWells.length === 0}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Gerar G-Code
                </Button>
              </div>

              {error && (
                <div className="bg-red-950/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 5 — RESULT */}
        {step === 5 && result && (
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-emerald-950/40 to-teal-950/40 border-emerald-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" /> G-Code Gerado com Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat icon={<Layers />} label="Camadas" value={String(result.layerCount)} />
                  <Stat icon={<Grid3x3 />} label="Poços" value={String(result.summary.wellsCount)} />
                  <Stat icon={<Activity />} label="Tempo" value={result.summary.estimatedTime} />
                  <Stat icon={<FlaskConical />} label="Volume" value={result.summary.volume} />
                  <Stat icon={<Printer />} label="Bioprinter" value={result.summary.bioprinter} />
                  <Stat icon={<Waves />} label="Algoritmo" value={result.summary.algorithm} />
                  <Stat icon={<Zap />} label="Shear" value={`${result.stats.peakShearStress_Pa ?? 0} Pa`} />
                  <Stat icon={<Microscope />} label="Viabilidade" value={result.summary.viability} color={
                    result.stats.viabilityEstimate_pct && result.stats.viabilityEstimate_pct >= 85 ? "green" :
                    result.stats.viabilityEstimate_pct && result.stats.viabilityEstimate_pct >= 70 ? "yellow" : "red"
                  } />
                </div>

                {result.warnings.length > 0 && (
                  <div className="bg-amber-950/30 border border-amber-700 rounded-lg p-3 text-amber-300 text-sm space-y-1">
                    {result.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={downloadGCode} className="bg-emerald-600 hover:bg-emerald-500">
                    <Download className="w-4 h-4 mr-2" /> Download .gcode ({result.totalLines.toLocaleString()} linhas)
                  </Button>
                  <Button variant="outline" onClick={() => setShowGcode(!showGcode)}>
                    {showGcode ? "Ocultar" : "Ver"} prévia do G-code
                  </Button>
                  <Button variant="outline" onClick={() => { setStep(1); setResult(null) }}>
                    Novo G-code
                  </Button>
                </div>

                {showGcode && (
                  <div className="bg-black/60 border border-gray-800 rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-[11px] text-green-400 font-mono whitespace-pre">
                      {result.gcode.split("\n").slice(0, 300).join("\n")}
                      {result.gcode.split("\n").length > 300 && "\n\n; ... [truncado para preview, baixe o arquivo completo] ..."}
                    </pre>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                  <Target className="w-3 h-3" /> Job ID: <code className="text-emerald-400">{result.jobId}</code>
                  <span>• Créditos usados: {result.creditsUsed}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// STAT COMPONENT
// ═══════════════════════════════════════════════════════════════
function Stat({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color?: "green" | "yellow" | "red"
}) {
  const valueColor =
    color === "green" ? "text-emerald-300"
    : color === "yellow" ? "text-amber-300"
    : color === "red" ? "text-red-300"
    : "text-white"
  return (
    <div className="bg-black/30 rounded-lg p-3 border border-gray-800">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        <span className="w-3 h-3">{icon}</span>
        {label}
      </div>
      <div className={cn("text-sm font-bold", valueColor)}>{value}</div>
    </div>
  )
}
