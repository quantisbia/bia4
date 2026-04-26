"use client"

/**
 * BIA — Motor GCODE + Multi-Well Orchestrator
 * Interface de criação e download de G-code para bioimpressão em placas de poços.
 */

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Printer, Layers, Zap, Sparkles, Download, Play, ChevronLeft,
  FlaskConical, Microscope, Target, CheckCircle2, AlertTriangle,
  Activity, Loader2, Wand2, Box, Waves, Grid3x3, Route,
  AlertCircle, Ruler, Move3d, Info, Power, Usb, Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { WellPlateSelector, type WellPlateFormat } from "@/components/bioprinting/WellPlateSelector"
import { BioinkFormulator, type BioinkComponent } from "@/components/bioprinting/BioinkFormulator"
import { PrinterConnection } from "@/components/bioprinting/PrinterConnection"
import { GCodeViewer2D } from "@/components/bioprinting/GCodeViewer2D"
import { BIOPRINTERS as BIOPRINTERS_CATALOG, getBioprinterById, supportsWebSerial } from "@/lib/bioprinting/bioprinters"
import { BIOMATERIALS } from "@/lib/bioprinting/biomaterials"
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

// BIOPRINTERS agora vem do catálogo completo em /lib/bioprinting/bioprinters.ts
// com tamanho de mesa, firmware, baud, drivers e compatibilidade Web Serial
const BIOPRINTERS = BIOPRINTERS_CATALOG.map((bp) => ({
  id: bp.id,
  name: bp.model,
  fullName: bp.fullName,
  brand: bp.brand,
  heads: bp.numHeads,
  uv: bp.hasUVcuring,
  buildVolume: bp.buildVolume,
  baud: bp.baud,
  firmware: bp.firmwareCompatibility,
  supportsUSB: supportsWebSerial(bp),
  icon: bp.icon,
}))

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

  // Step 3: Well Plate / Superfície de impressão
  // surfaceType: "well_plate" (SBS 6-384), "unit_dish" (placa unitária redonda 30/60/100mm), "bed" (direto na mesa)
  const [surfaceType, setSurfaceType] = useState<"well_plate" | "unit_dish" | "bed">("well_plate")
  const [unitDishDiameter, setUnitDishDiameter] = useState<30 | 60 | 100>(60)
  const [plateFormat, setPlateFormat] = useState<WellPlateFormat>(24)
  const [selectedWells, setSelectedWells] = useState<string[]>(["A1"])
  const [replicationMode, setReplicationMode] = useState<"same" | "different" | "gradient">("same")
  const [zHop, setZHop] = useState(5)
  const [pauseBetween, setPauseBetween] = useState(2)
  const [purgeVolume, setPurgeVolume] = useState(1)
  const [trajectory, setTrajectory] = useState<string[] | undefined>(undefined)

  // Bed leveling / Z-offset confirmação
  const [levelingConfirmed, setLevelingConfirmed] = useState(false)
  const [zOffset, setZOffset] = useState(0.0) // offset adicional sobre mesa (mm)

  // Step 4: Bioink + Printer
  const [bioprinterId, setBioprinterId] = useState("cellink_biox")
  // Modo de entrega do G-code à impressora (conexão USB é OPCIONAL)
  //  - "download": só baixa o .gcode (padrão, funciona com SD/USB/software do fabricante)
  //  - "usb":      conecta via Web Serial para streaming direto (avançado, requer Marlin/Klipper)
  const [deliveryMode, setDeliveryMode] = useState<"download" | "usb">("download")
  // Exibir painel de conexão USB (só quando usuário escolhe modo "usb")
  const [showPrinterConnection, setShowPrinterConnection] = useState(false)
  // Visualizador 2D do G-code (estilo Pronterface)
  const [show2DViewer, setShow2DViewer] = useState(false)
  // Formulação MULTI-MATERIAL (até 10 biomateriais) — integra o Formulador Bio
  const [bioinkComponents, setBioinkComponents] = useState<BioinkComponent[]>([
    { biomaterialId: "gelma", concentration: 10, unit: "% m/v", role: "Estrutura reticulável" },
  ])
  const [hasCells, setHasCells] = useState(true)
  const [cellDensity, setCellDensity] = useState(2)
  const [nozzleUm, setNozzleUm] = useState(410)
  const [tempC, setTempC] = useState(22)
  const [pressureKpa, setPressureKpa] = useState(80)
  const [printSpeed, setPrintSpeed] = useState(8)
  const [layerHeight, setLayerHeight] = useState(0.25)
  const [walls, setWalls] = useState(2)

  // Derived — material principal (primeiro componente) para payload compatível com API legada
  const mainMaterial = useMemo(() => {
    if (bioinkComponents.length === 0) return { name: "GelMA", concentration: 10 }
    const first = bioinkComponents[0]
    const bm = BIOMATERIALS.find((m) => m.id === first.biomaterialId)
    return {
      name: bm?.shortName ?? bm?.name ?? "Custom",
      concentration: first.concentration,
    }
  }, [bioinkComponents])
  const material = mainMaterial.name
  const concentration = mainMaterial.concentration

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
  const currentPrinter = useMemo(() => {
    const bp = getBioprinterById(bioprinterId)
    if (!bp) return null
    return {
      ...bp,
      firmware: bp.firmwareCompatibility,
      supportsUSB: supportsWebSerial(bp),
    }
  }, [bioprinterId])

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
          // Formulação multi-material (até 10 biomateriais)
          formulation: bioinkComponents.map((c) => ({
            biomaterialId: c.biomaterialId,
            concentration: c.concentration,
            unit: c.unit,
            role: c.role,
          })),
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

  /**
   * Monta o G-code final com cabeçalho de segurança BIA:
   *  - Alerta e mensagens de nivelamento
   *  - G92 X0 Y0 Z0 E0  → zera posições (após homing manual na impressora)
   *  - G1 Z{0.4 + zOffset} F300 → subida inicial antes do primeiro movimento
   * O G-code original gerado pelo servidor vem logo após este cabeçalho.
   */
  function buildFinalGCode(): string {
    if (!result) return ""
    const z0 = (0.4 + zOffset).toFixed(3)
    const header = [
      "; ═══════════════════════════════════════════════════════════",
      "; BIA — Motor GCODE  |  Cabeçalho de Segurança",
      "; ═══════════════════════════════════════════════════════════",
      "; ⚠️  ANTES DE INICIAR:",
      ";   1) NIVELE A MESA (parafusos + teste da folha de papel)",
      ";   2) Calibre Z-offset (bico ~0.1-0.3 mm da mesa)",
      ";   3) Faça homing: G28  (ou botão HOME na impressora)",
      ";   4) Confirme que o bico não está entupido e bioink carregado",
      ";",
      `; Superfície: ${surfaceType === "well_plate" ? `Placa SBS ${plateFormat} poços`
        : surfaceType === "unit_dish" ? `Placa unitária Ø ${unitDishDiameter} mm`
        : "Direto na mesa da impressora"}`,
      `; Z-offset extra: +${zOffset.toFixed(3)} mm`,
      "; ═══════════════════════════════════════════════════════════",
      "",
      "M82                      ; extrusão absoluta",
      "G21                      ; milímetros",
      "G90                      ; coordenadas absolutas",
      "G92 X0 Y0 Z0 E0          ; ZERA POSIÇÕES (após homing)",
      `G1 Z${z0} F300            ; SOBE o bico ${z0} mm antes de começar`,
      "G4 P500                  ; pausa 0.5s para estabilização",
      "",
      "; ═══════════════════════════════════════════════════════════",
      "; INÍCIO DA IMPRESSÃO",
      "; ═══════════════════════════════════════════════════════════",
      "",
    ].join("\n")
    return header + result.gcode
  }

  function downloadGCode() {
    if (!result) return
    if (!levelingConfirmed) {
      const ok = confirm(
        "⚠️ ATENÇÃO: Você ainda não confirmou que a mesa foi nivelada e o Z-offset calibrado.\n\n" +
        "Imprimir sem nivelamento pode:\n" +
        "  • AMASSAR/ENTUPIR O BICO (dano no equipamento)\n" +
        "  • Causar falha de adesão da bioink\n" +
        "  • Gerar camadas desiguais\n\n" +
        "Deseja baixar o G-code mesmo assim?"
      )
      if (!ok) return
    }
    const blob = new Blob([buildFinalGCode()], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${result.jobName}.gcode`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * "Iniciar impressão": prepara download + abre instruções de envio
   * para a bioimpressora (via Octoprint, cartão SD, USB, etc.)
   */
  function startPrint() {
    if (!result) return
    if (!levelingConfirmed) {
      alert(
        "⛔ NIVELAMENTO NÃO CONFIRMADO\n\n" +
        "Volte ao Passo 3 e marque a caixa:\n" +
        "\"Confirmo que a mesa está nivelada e Z-offset calibrado\"\n\n" +
        "Este é um passo crítico para não danificar o bico da sua bioimpressora."
      )
      return
    }
    const proceed = confirm(
      "🚀 INICIAR IMPRESSÃO\n\n" +
      "Checklist final:\n" +
      "  ✅ Mesa nivelada (teste da folha de papel)\n" +
      "  ✅ Z-offset calibrado (bico a ~0.1–0.3 mm)\n" +
      "  ✅ Bioink carregada e sem bolhas\n" +
      "  ✅ Homing executado na impressora (G28)\n" +
      "  ✅ Placa/recipiente posicionado corretamente\n\n" +
      "Ao clicar OK você receberá:\n" +
      "  1. O download do G-code final (com G92 + Z0.4 de segurança)\n" +
      "  2. Instruções para enviar à sua bioimpressora\n\n" +
      "Prosseguir?"
    )
    if (!proceed) return
    downloadGCode()
    alert(
      "✅ G-code baixado!\n\n" +
      "COMO ENVIAR À BIOIMPRESSORA:\n\n" +
      "• CELLINK BIO X / INKREDIBLE+: carregue o arquivo pelo software DNA Studio ou HeartOS\n" +
      "• Allevi: envie pelo Allevi Bioprint Online\n" +
      "• Regemat BIO V1: use o BioCAD\n" +
      "• EnvisionTEC: Perfactory Software\n" +
      "• Cartão SD / USB: copie o .gcode e insira na impressora\n" +
      "• Octoprint: arraste o arquivo na interface web\n\n" +
      "⚠️ O arquivo já contém G92 X0 Y0 Z0 E0 + G1 Z0.4 no cabeçalho.\n" +
      "Certifique-se de fazer HOMING (G28) antes de iniciar."
    )
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
            <span className="text-lg font-bold">BIA — Motor GCODE</span>
            <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-700">Bioimpressão Especial</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/bioprinting/dual-porosity">
              <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
                <Layers className="w-4 h-4 mr-1" /> Dual-Porosity
              </Button>
            </Link>
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

        {/* STEP 3 — WELL PLATE / UNIT DISH / BED */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Grid3x3 className="w-5 h-5" /> 3. Superfície de Impressão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Tipo de superfície */}
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Tipo de Superfície</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSurfaceType("well_plate")}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      surfaceType === "well_plate"
                        ? "bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/40"
                        : "bg-gray-800/50 border-gray-700 hover:border-emerald-500/50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1"><Grid3x3 className="w-4 h-4 text-emerald-400" /><span className="font-bold">Placa de Poços (SBS)</span></div>
                    <div className="text-xs text-gray-400">6, 12, 24, 48, 96 ou 384 poços padronizados</div>
                  </button>
                  <button
                    onClick={() => setSurfaceType("unit_dish")}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      surfaceType === "unit_dish"
                        ? "bg-cyan-600/20 border-cyan-500 ring-2 ring-cyan-500/40"
                        : "bg-gray-800/50 border-gray-700 hover:border-cyan-500/50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-cyan-400" /><span className="font-bold">Placa Unitária</span></div>
                    <div className="text-xs text-gray-400">Petri circular: Ø 30, 60 ou 100 mm</div>
                  </button>
                  <button
                    onClick={() => setSurfaceType("bed")}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      surfaceType === "bed"
                        ? "bg-amber-600/20 border-amber-500 ring-2 ring-amber-500/40"
                        : "bg-gray-800/50 border-gray-700 hover:border-amber-500/50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1"><Ruler className="w-4 h-4 text-amber-400" /><span className="font-bold">Mesa Direta</span></div>
                    <div className="text-xs text-gray-400">Imprimir direto na mesa da impressora (sem recipiente)</div>
                  </button>
                </div>
              </div>

              {/* ALERTA CRÍTICO: NIVELAMENTO + Z-OFFSET */}
              <div className="rounded-xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/10 to-red-500/10 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
                      ⚠️ NIVELAMENTO DA MESA + Z-OFFSET — Crítico antes de imprimir
                    </h4>
                    <div className="space-y-2 text-sm text-gray-200">
                      <p className="leading-relaxed">
                        <b className="text-amber-300">Nivelar a mesa</b> significa ajustar os 3 ou 4 parafusos sob a mesa para que
                        <b> a distância entre o bico do extrusor e a mesa seja uniforme em todos os pontos</b>.
                        Se não nivelar corretamente:
                      </p>
                      <ul className="text-xs space-y-1 pl-4">
                        <li>❌ <b>Bico muito baixo:</b> amassa/entope o bico, pode quebrar — <b>risco de dano ao equipamento</b></li>
                        <li>❌ <b>Bico muito alto:</b> material não adere → impressão falha e descola</li>
                        <li>❌ <b>Nível desigual:</b> camadas finas em um lado, grossas em outro</li>
                      </ul>
                      <div className="mt-3 p-3 rounded-lg bg-black/40 border border-white/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Move3d className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Z-OFFSET (deslocamento Z da primeira camada)</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          É a <b>altura exata do bico em relação à mesa</b> no momento de iniciar a impressão.
                          Tipicamente entre <b>0,1 e 0,3 mm</b> (espessura de uma folha de papel).
                          Na BIA, usamos <b>G92 X0 Y0 Z0 E0</b> para zerar as posições e um <b>G1 Z0.4</b> para subir o bico antes de começar.
                        </p>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <label className="text-xs text-gray-400">Z-offset extra (mm):</label>
                        <input
                          type="number" step={0.05} min={0} max={2}
                          value={zOffset}
                          onChange={(e) => setZOffset(parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 rounded-md bg-black/40 border border-white/20 text-sm text-white focus:border-cyan-500 outline-none"
                        />
                        <span className="text-[10px] text-gray-500">default 0.0 — adicionado ao G1 Z0.4 inicial</span>
                      </div>
                      <label className="mt-3 flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
                        <input
                          type="checkbox"
                          checked={levelingConfirmed}
                          onChange={(e) => setLevelingConfirmed(e.target.checked)}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmo que a mesa está nivelada e Z-offset calibrado
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* PLACA DE POÇOS (SBS) */}
              {surfaceType === "well_plate" && (
                <>
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

                  <WellPlateSelector
                    format={plateFormat}
                    selected={selectedWells}
                    onChange={setSelectedWells}
                    trajectory={trajectory}
                  />
                </>
              )}

              {/* PLACA UNITÁRIA (PETRI 30/60/100 mm) */}
              {surfaceType === "unit_dish" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Diâmetro da placa (mm)</label>
                    <div className="flex flex-wrap gap-2">
                      {([30, 60, 100] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setUnitDishDiameter(d)}
                          className={cn(
                            "px-5 py-3 rounded-lg border text-sm transition",
                            unitDishDiameter === d
                              ? "bg-cyan-600 border-cyan-500 text-white"
                              : "bg-gray-800/50 border-gray-700 hover:border-cyan-500/50",
                          )}
                        >
                          <div className="font-bold text-base">Ø {d} mm</div>
                          <div className="text-[10px] text-gray-400">
                            {d === 30 && "área útil 7 cm² (micro)"}
                            {d === 60 && "área útil 28 cm² (padrão)"}
                            {d === 100 && "área útil 78 cm² (grande)"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-center bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                    <svg width="220" height="220" viewBox="-110 -110 220 220" className="overflow-visible">
                      {/* mesa */}
                      <rect x="-105" y="-105" width="210" height="210" fill="rgba(30,30,40,0.5)" stroke="#444" strokeWidth="1" strokeDasharray="4,2" rx="8" />
                      {/* placa circular */}
                      <circle cx="0" cy="0" r={unitDishDiameter} fill="rgba(6,182,212,0.1)" stroke="#06b6d4" strokeWidth="2" />
                      <text x="0" y="5" textAnchor="middle" className="fill-cyan-400 font-bold text-sm">Ø {unitDishDiameter} mm</text>
                      <text x="0" y={unitDishDiameter + 15} textAnchor="middle" className="fill-gray-500 text-[10px]">construto no centro da placa</text>
                    </svg>
                  </div>
                </div>
              )}

              {/* MESA DIRETA */}
              {surfaceType === "bed" && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/40 p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-100">
                      <p className="font-semibold mb-1">Imprimindo direto na mesa</p>
                      <p className="text-xs text-amber-200/80">
                        Sem recipiente — o construto é impresso diretamente sobre a mesa da bioimpressora.
                        Use <b>filme de transferência</b> (parafilm, papel-alumínio, PET tratado) para facilitar o destacamento.
                        Indicado para: patches grandes, membranas, experimentos de aderência.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                    <svg width="260" height="180" viewBox="0 0 260 180">
                      <rect x="10" y="10" width="240" height="160" fill="rgba(251,191,36,0.08)" stroke="#f59e0b" strokeWidth="2" rx="4" />
                      <text x="130" y="92" textAnchor="middle" className="fill-amber-400 font-bold text-base">Mesa da impressora</text>
                      <text x="130" y="112" textAnchor="middle" className="fill-gray-500 text-xs">construto livre</text>
                      {/* Construto centralizado */}
                      <rect x="100" y="70" width="60" height="40" fill="rgba(16,185,129,0.3)" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,2" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Replication mode (só para well_plate) */}
              {surfaceType === "well_plate" && (
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
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>← Voltar</Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={surfaceType === "well_plate" && selectedWells.length === 0}
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
              {/* Bioprinter select — com tamanho de mesa */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 block">Bioimpressora (com tamanho de mesa)</label>
                  <a href="/dashboard/bioprinting/connection-guide" target="_blank" rel="noopener"
                     className="text-[11px] text-gray-500 hover:text-cyan-400 hover:underline flex items-center gap-1">
                    <Info className="w-3 h-3" /> Guia de conexão USB (opcional)
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{bp.icon}</span>
                        <span className="font-semibold">{bp.name}</span>
                        {bp.supportsUSB && (
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-cyan-900/50 text-cyan-300 rounded border border-cyan-700">USB</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Mesa <strong className="text-gray-200">{bp.buildVolume.x}×{bp.buildVolume.y}×{bp.buildVolume.z} mm</strong>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {bp.heads} head{bp.heads > 1 ? "s" : ""} {bp.uv && "• UV"} • {bp.firmware[0]} • {bp.baud} baud
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ═══ MODO DE ENTREGA DO G-CODE — escolha explícita e opcional ═══ */}
              {currentPrinter && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 mb-1 block">
                    Como você quer enviar o G-code para a impressora? <span className="text-gray-500">(a conexão USB é <b>opcional</b>)</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* OPÇÃO 1 — Download (padrão, sem conexão) */}
                    <button
                      onClick={() => { setDeliveryMode("download"); setShowPrinterConnection(false) }}
                      className={cn(
                        "p-3 rounded-lg border text-left transition",
                        deliveryMode === "download"
                          ? "bg-emerald-600/20 border-emerald-500"
                          : "bg-gray-800/40 border-gray-700 hover:border-emerald-500/50",
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Download className="w-4 h-4 text-emerald-400" />
                        Apenas baixar .gcode
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 rounded border border-emerald-700">Recomendado</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        Salva o arquivo no seu computador. Você envia pela impressora via SD/USB-drive,
                        ou pelo software do fabricante (Cellink HeartWare, Allevi, Regemat…). <b>Não precisa conectar</b>.
                      </div>
                    </button>

                    {/* OPÇÃO 2 — Conectar via USB (avançado, opt-in) */}
                    <button
                      onClick={() => {
                        if (!currentPrinter.supportsUSB) return
                        setDeliveryMode("usb")
                      }}
                      disabled={!currentPrinter.supportsUSB}
                      className={cn(
                        "p-3 rounded-lg border text-left transition",
                        deliveryMode === "usb" && currentPrinter.supportsUSB
                          ? "bg-cyan-600/20 border-cyan-500"
                          : "bg-gray-800/40 border-gray-700 hover:border-cyan-500/50",
                        !currentPrinter.supportsUSB && "opacity-40 cursor-not-allowed hover:border-gray-700",
                      )}
                      title={!currentPrinter.supportsUSB ? "Esta impressora usa protocolo proprietário — use o software do fabricante" : ""}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <Usb className="w-4 h-4 text-cyan-400" />
                        Conectar via USB (avançado)
                        {!currentPrinter.supportsUSB && (
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">Indisponível</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        {currentPrinter.supportsUSB
                          ? <>Envia o G-code em <b>streaming direto</b> pela porta USB (Chrome/Edge). Requer firmware Marlin/Klipper — {currentPrinter.baud} baud.</>
                          : <>Impressora com firmware proprietário. Use o software oficial do fabricante ({currentPrinter.firmware.join(", ")}).</>
                        }
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Painel de conexão USB — SÓ aparece se o usuário escolheu modo "usb" */}
              {deliveryMode === "usb" && currentPrinter?.supportsUSB && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-300 flex items-center gap-1">
                      <Usb className="w-3.5 h-3.5" /> Painel de streaming USB — {currentPrinter.fullName}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPrinterConnection((v) => !v)}
                    >
                      {showPrinterConnection ? "Ocultar" : "Abrir"} painel
                    </Button>
                  </div>
                  {showPrinterConnection && (
                    <PrinterConnection
                      gcode={result?.gcode ?? ""}
                      defaultBaud={currentPrinter.baud}
                      printerName={currentPrinter.fullName}
                    />
                  )}
                </div>
              )}

              {/* ============ FORMULADOR BIO MULTI-MATERIAL (1–10) ============ */}
              <div className="rounded-lg border border-emerald-800 bg-emerald-950/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-emerald-300">Formulação da Bioink (multi-material)</h3>
                  <span className="text-[11px] text-gray-400 ml-2">Selecione até 10 biomateriais — combine hidrogéis, polímeros sintéticos, matriz dECM, crosslinkers…</span>
                </div>
                <BioinkFormulator
                  value={bioinkComponents}
                  onChange={setBioinkComponents}
                  maxComponents={10}
                />
              </div>

              {/* Parâmetros de impressão */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                {/* Status de nivelamento */}
                {!levelingConfirmed && (
                  <div className="rounded-lg bg-red-950/40 border-2 border-red-500/60 p-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-bold text-red-300 mb-1">⛔ Nivelamento NÃO confirmado</p>
                      <p className="text-xs text-red-200/80 mb-2">
                        Volte ao Passo 3 e confirme que a mesa foi nivelada e o Z-offset calibrado.
                        Imprimir sem nivelamento pode <b>danificar o bico</b> da sua bioimpressora.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setStep(3)} className="text-xs">
                        ← Voltar ao Passo 3 para confirmar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={startPrint}
                    disabled={!levelingConfirmed}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 font-bold shadow-lg shadow-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Power className="w-4 h-4 mr-2" /> 🚀 Iniciar Impressão
                  </Button>
                  <Button onClick={downloadGCode} variant="outline" className="border-emerald-600 text-emerald-300 hover:bg-emerald-600/20">
                    <Download className="w-4 h-4 mr-2" /> Baixar .gcode ({result.totalLines.toLocaleString()} linhas)
                  </Button>
                  <Button variant="outline" onClick={() => setShowGcode(!showGcode)}>
                    {showGcode ? "Ocultar" : "Ver"} prévia do G-code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShow2DViewer(!show2DViewer)}
                    className="border-violet-700 text-violet-300 hover:bg-violet-700/20"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {show2DViewer ? "Ocultar" : "Abrir"} Visualizador 2D (Pronterface-style)
                  </Button>
                  {/* Botão USB só aparece se o usuário OPTOU pelo modo "usb" no Passo 4 */}
                  {deliveryMode === "usb" && currentPrinter?.supportsUSB && (
                    <Button
                      variant="outline"
                      onClick={() => setShowPrinterConnection(!showPrinterConnection)}
                      className="border-cyan-700 text-cyan-300 hover:bg-cyan-700/20"
                    >
                      <Usb className="w-4 h-4 mr-1" />
                      {showPrinterConnection ? "Ocultar" : "Enviar via"} USB
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { setStep(1); setResult(null) }}>
                    Novo G-code
                  </Button>
                </div>

                {/* Dica quando usuário está no modo download (padrão) */}
                {deliveryMode === "download" && (
                  <div className="rounded-lg bg-emerald-950/20 border border-emerald-700/40 p-3 text-xs text-emerald-100/80 flex items-start gap-2">
                    <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-emerald-300">Modo download (sem conexão)</b> —
                      Baixe o arquivo <code className="bg-black/30 px-1 rounded">.gcode</code> e transfira para a impressora por
                      <b> SD card</b>, <b>pen-drive</b>, ou pelo <b>software do fabricante</b>
                      {currentPrinter && ` (${currentPrinter.firmware[0]}${currentPrinter.supportsUSB ? " / Pronterface / OctoPrint" : ""})`}.
                      Se quiser streaming direto via USB, volte ao Passo 4 e escolha &ldquo;Conectar via USB&rdquo;.
                    </div>
                  </div>
                )}

                {/* Visualizador 2D estilo Pronterface */}
                {show2DViewer && result && (
                  <GCodeViewer2D
                    gcode={buildFinalGCode()}
                    buildPlate={currentPrinter ? { x: currentPrinter.buildVolume.x, y: currentPrinter.buildVolume.y } : undefined}
                  />
                )}

                {/* Painel de conexão USB direto na revisão — SÓ se optou pelo modo USB */}
                {deliveryMode === "usb" && showPrinterConnection && currentPrinter?.supportsUSB && (
                  <PrinterConnection
                    gcode={buildFinalGCode()}
                    defaultBaud={currentPrinter.baud}
                    printerName={currentPrinter.fullName}
                  />
                )}

                {/* Cabeçalho de segurança informativo */}
                <div className="rounded-lg bg-cyan-950/30 border border-cyan-500/30 p-3 text-xs text-cyan-100/90">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-cyan-300 uppercase tracking-wider">Cabeçalho de Segurança BIA (incluído no .gcode)</span>
                  </div>
                  <pre className="text-[10px] font-mono text-cyan-200/70 leading-relaxed overflow-x-auto">
{`M82                      ; extrusão absoluta
G21                      ; milímetros
G90                      ; coordenadas absolutas
G92 X0 Y0 Z0 E0          ; ZERA POSIÇÕES
G1 Z${(0.4 + zOffset).toFixed(3)} F300            ; SOBE bico ${(0.4 + zOffset).toFixed(3)} mm (Z-offset)`}
                  </pre>
                </div>

                {showGcode && (
                  <div className="bg-black/60 border border-gray-800 rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-[11px] text-green-400 font-mono whitespace-pre">
                      {buildFinalGCode().split("\n").slice(0, 300).join("\n")}
                      {buildFinalGCode().split("\n").length > 300 && "\n\n; ... [truncado para preview, baixe o arquivo completo] ..."}
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
