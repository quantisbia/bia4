"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Printer, Layers, Zap, Settings2, FlaskConical, ChevronDown, ChevronUp,
  Play, Download, RefreshCw, Info, AlertTriangle, CheckCircle2, Loader2,
  Sliders, Droplets, Thermometer, Wind, BarChart3, FileCode2, Microscope,
  Activity, Target, Shield, BookOpen, Database, Star, TrendingUp,
  ArrowRight, Beaker,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─── DB Suggestion Types ─────────────────────────────────────────────────────
interface DBSuggestion {
  material: string
  score: number
  n: number
  cellFriendly: number
  typicalPressure: number | null
  typicalTemp: number | null
  typicalSpeed: number | null
  typicalNeedle: number | null
  concentrations: string[]
  sampleFormulation: string
}

interface DBMaterialDetails {
  found: boolean
  material: string
  n: number
  parameters: {
    pressure_kpa: { min: number | null; max: number | null; typical: number | null }
    temp_c: { min: number | null; max: number | null; typical: number | null }
    speed_mms: { min: number | null; max: number | null; typical: number | null }
    needle_um: { min: number | null; max: number | null; typical: number | null }
  }
  withCellsCount: number
  cellFriendly: number
  concentrations: string[]
  sampleFormulations: string[]
  dois: string[]
  recommended: {
    pressure_kpa: number
    temp_c: number
    speed_mms: number
    needle_um: number
    infill_percent: number
    layer_height_um: number
    skirt_loops: number
    retraction_mm: number
    notes: string[]
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SlicerParams {
  technology: string
  layerHeight: number
  printSpeed: number
  nozzleTemp: number
  platformTemp: number
  pressure: number
  nozzleDiameter: number
  infillPattern: string
  infillPercent: number
  walls: number
  skirtLoops: number
  retraction: number
  supportEnabled: boolean
}

interface BioinkParams {
  material: string
  concentration: number
  crosslinker: string
  crosslinkerConc: number
  cellDensity: number
  hasCells: boolean
  additives: string
}

interface RheologyResult {
  viscosity: string
  yieldStress: string
  elasticModulus: string
  viscousModulus: string
  printability: string
  shearStress: string
  recommendation: string
  warnings: string[]
  gcode: string
}

interface AIAnalysis {
  summary: string
  slicerRecommendations: string[]
  bioinkNotes: string[]
  cellViabilityPrediction: string
  structuralFidelity: string
  crosslinkingProtocol: string
  postPrintingSteps: string[]
  regulatoryNotes: string
  creditsUsed: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TECHNOLOGIES = [
  { id: "EXTRUSION", label: "Extrusão (EBB)", icon: "🖨️", desc: "Pressão 10–600 kPa · Res. 100–1000 µm" },
  { id: "INKJET",    label: "Inkjet",         icon: "💧", desc: "Gotículas 1–100 pL · Res. 20–100 µm" },
  { id: "DLP_SLA",   label: "DLP / SLA",      icon: "💡", desc: "Irradiância UV · Res. XY 25–100 µm" },
  { id: "FRESH",     label: "FRESH",          icon: "🧊", desc: "Suporte gelatina · Estruturas moles" },
  { id: "LASER",     label: "Laser (LIFT)",   icon: "⚡", desc: "Energia 10–100 mJ/cm² · Res. <1 µm" },
  { id: "COAXIAL",   label: "Coaxial",        icon: "🎯", desc: "Núcleo+Casca · Vascularização in situ" },
]

const INFILL_PATTERNS = [
  "Rectilinear", "Grid", "Gyroid", "Honeycomb", "Lines", "Hilbert", "Concentric", "Stars"
]

const BIOINK_MATERIALS = [
  { id: "gelma",     label: "GelMA",              conc: "5–15%",   temp: 37,  note: "Fotocrosslink UV 365nm 30–60s" },
  { id: "alginate",  label: "Alginato de Sódio",  conc: "2–4%",   temp: 25,  note: "CaCl₂ 50–200 mM crosslink iônico" },
  { id: "fibrin",    label: "Fibrina",             conc: "10–30 mg/mL", temp: 37, note: "Trombina 1–5 U/mL · gelifica 5–10 min" },
  { id: "collagen",  label: "Colágeno Tipo I",     conc: "1–5 mg/mL",  temp: 4,  note: "Imprimir a 4°C · gelifica a 37°C" },
  { id: "chitosan",  label: "Quitosana",           conc: "1–3%",   temp: 25,  note: "Crosslink pH ou TPP" },
  { id: "hama",      label: "HA-MA (Hialuronato)", conc: "2–4%",   temp: 25,  note: "UV crosslink · G' 100–2000 Pa" },
  { id: "pcl",       label: "PCL",                 conc: "100%",   temp: 90,  note: "Extrusão 90–100°C · scaffolds rígidos" },
  { id: "custom",    label: "Formulação Custom",   conc: "—",      temp: 25,  note: "Parâmetros personalizados" },
]

const SECTION_COLORS = {
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",   icon: "text-blue-400" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", icon: "text-violet-400" },
  emerald:{ bg: "bg-emerald-500/10",border: "border-emerald-500/20",text: "text-emerald-400",icon: "text-emerald-400" },
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  text: "text-amber-400",  icon: "text-amber-400" },
  rose:   { bg: "bg-rose-500/10",   border: "border-rose-500/20",   text: "text-rose-400",   icon: "text-rose-400" },
}

// ─── Rheology Estimator ───────────────────────────────────────────────────────
function estimateRheology(bioink: BioinkParams, slicer: SlicerParams): RheologyResult {
  const mat = BIOINK_MATERIALS.find(m => m.id === bioink.material) ?? BIOINK_MATERIALS[0]
  const conc = bioink.concentration
  const R = 0.5 * slicer.nozzleDiameter / 1000 // radius in m
  const Q = (slicer.printSpeed / 1000) * Math.PI * R * R // volumetric flow m³/s
  const shear = (4 * Q) / (Math.PI * R * R * R) // wall shear rate (1/s)

  let viscosity = 500
  let yieldStress = 20
  let gPrime = 300

  // Material-specific estimates
  if (bioink.material === "gelma") {
    viscosity = 50 + conc * 80
    yieldStress = conc * 3
    gPrime = conc * 200
  } else if (bioink.material === "alginate") {
    viscosity = conc * 400
    yieldStress = conc * 8
    gPrime = conc * 500
  } else if (bioink.material === "collagen") {
    viscosity = conc * 120
    yieldStress = conc * 2
    gPrime = conc * 80
  } else if (bioink.material === "pcl") {
    viscosity = 5000
    yieldStress = 200
    gPrime = 100000
  }

  const shearStressPa = (viscosity / 1000) * shear
  const printability = shearStressPa < 50 ? "✅ Excelente" : shearStressPa < 100 ? "⚠️ Moderada" : "❌ Alto cisalhamento"

  const warnings: string[] = []
  if (bioink.hasCells && shearStressPa > 50) warnings.push("⚠️ Shear stress > 50 Pa pode comprometer viabilidade celular")
  if (slicer.nozzleDiameter < 200 && bioink.hasCells) warnings.push("⚠️ Nozzle < 200 µm: risco de lise celular por obstrução")
  if (bioink.hasCells && bioink.cellDensity > 10e6) warnings.push("⚠️ Densidade > 10×10⁶ cel/mL: monitorar agregação")
  if (bioink.material === "collagen" && slicer.nozzleTemp > 10) warnings.push("⚠️ Colágeno: impressão a 4°C obrigatória para fidelidade")

  // Simple G-code snippet
  const gcode = `; BIA v4 GCode — ${mat.label} ${conc}%
; Technology: ${slicer.technology}
G28 ; Home all axes
G1 F${slicer.printSpeed * 60} ; Set print speed
M104 S${slicer.nozzleTemp} ; Set nozzle temp
M109 S${slicer.nozzleTemp} ; Wait nozzle temp
M140 S${slicer.platformTemp} ; Set platform temp
; Skirt — ${slicer.skirtLoops} loop(s)
G1 X5 Y5 Z${slicer.layerHeight / 1000} E0.5
; --- Layer 1 ---
; Infill: ${slicer.infillPattern} ${slicer.infillPercent}%
; Pressure: ${slicer.pressure} kPa
; Nozzle: ${slicer.nozzleDiameter} µm`

  return {
    viscosity: `~${Math.round(viscosity)} mPa·s`,
    yieldStress: `~${Math.round(yieldStress)} Pa`,
    elasticModulus: `G' ~${Math.round(gPrime)} Pa`,
    viscousModulus: `G'' ~${Math.round(gPrime * 0.4)} Pa`,
    printability,
    shearStress: `~${shearStressPa.toFixed(1)} Pa (τ_wall)`,
    recommendation: gPrime > 0
      ? `Material ${gPrime > 500 ? "adequado" : "limítrofe"} para impressão — considere ${conc > 5 ? "reduzir" : "aumentar"} concentração para otimizar impressão`
      : "Ajustar parâmetros",
    warnings,
    gcode,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BioprintingPage() {
  const [activeTab, setActiveTab] = useState<"slicer" | "bioink" | "db" | "rheology" | "ai" | "regulatory">("slicer")
  const [loading, setLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysis | null>(null)
  const [rheoResult, setRheoResult] = useState<RheologyResult | null>(null)
  const [gcodeVisible, setGcodeVisible] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const [slicer, setSlicer] = useState<SlicerParams>({
    technology: "EXTRUSION",
    layerHeight: 200,
    printSpeed: 15,
    nozzleTemp: 37,
    platformTemp: 25,
    pressure: 80,
    nozzleDiameter: 300,
    infillPattern: "Grid",
    infillPercent: 70,
    walls: 2,
    skirtLoops: 2,
    retraction: 0,
    supportEnabled: false,
  })

  const [bioink, setBioink] = useState<BioinkParams>({
    material: "gelma",
    concentration: 8,
    crosslinker: "UV 365nm",
    crosslinkerConc: 0.3,
    cellDensity: 2,
    hasCells: false,
    additives: "",
  })

  const [tissue, setTissue] = useState("")
  const [application, setApplication] = useState("")

  // DB suggestions state
  const [dbSuggestions, setDbSuggestions] = useState<DBSuggestion[]>([])
  const [dbDetails, setDbDetails]         = useState<DBMaterialDetails | null>(null)
  const [dbLoading, setDbLoading]         = useState(false)

  // Auto-fetch suggestions when tissue changes
  useEffect(() => {
    if (!tissue || tissue.length < 3) { setDbSuggestions([]); return }
    const t = setTimeout(async () => {
      setDbLoading(true)
      try {
        const res = await fetch(`/api/bioprint/suggest?tissue=${encodeURIComponent(tissue)}&cells=${bioink.hasCells}`)
        if (res.ok) {
          const data = await res.json()
          setDbSuggestions(data.suggestions ?? [])
        }
      } catch { /* ignore */ }
      finally { setDbLoading(false) }
    }, 600)
    return () => clearTimeout(t)
  }, [tissue, bioink.hasCells])

  // Fetch details when material changes
  useEffect(() => {
    if (!bioink.material || bioink.material === "custom") { setDbDetails(null); return }
    const matMap: Record<string, string> = {
      gelma: "gelma", alginate: "alginate", fibrin: "fibrinogen",
      collagen: "collagen", chitosan: "chitosan", hama: "hama",
      pcl: "pcl",
    }
    const q = matMap[bioink.material] ?? bioink.material
    fetch(`/api/bioprint/suggest?material=${encodeURIComponent(q)}&tech=${slicer.technology}&cells=${bioink.hasCells}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.found) setDbDetails(data) })
      .catch(() => {})
  }, [bioink.material, bioink.hasCells, slicer.technology])

  // Apply DB recommended parameters
  const applyRecommended = useCallback(() => {
    if (!dbDetails?.recommended) return
    const r = dbDetails.recommended
    setSlicer(s => ({
      ...s,
      pressure: r.pressure_kpa,
      nozzleTemp: r.temp_c,
      printSpeed: r.speed_mms,
      nozzleDiameter: r.needle_um,
      infillPercent: r.infill_percent,
      layerHeight: r.layer_height_um,
      skirtLoops: r.skirt_loops,
      retraction: r.retraction_mm,
    }))
  }, [dbDetails])

  const runRheology = useCallback(() => {
    const result = estimateRheology(bioink, slicer)
    setRheoResult(result)
    setActiveTab("rheology")
  }, [bioink, slicer])

  const runAIAnalysis = async () => {
    if (!tissue || !application) {
      alert("Preencha Tipo de Tecido e Aplicação Clínica antes de analisar com IA.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/bioprinting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slicer, bioink, tissue, application }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro na análise")
      setAiResult(data)
      setActiveTab("ai")
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const selectedMat = BIOINK_MATERIALS.find(m => m.id === bioink.material)
  // selectedTech available for future use

  const toggleSection = (id: string) => setExpandedSection(prev => prev === id ? null : id)

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-8 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Printer className="w-6 h-6 text-blue-400" />
              Bioimpressão 3D
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Parâmetros de fatiamento · STL/GCode · Reologia · Análise IA · Regulatório
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={runRheology}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition-all">
              <Activity className="w-3.5 h-3.5" /> Simular Reologia
            </button>
            <button onClick={runAIAnalysis} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold hover:bg-violet-500 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Analisar com IA (10 cr)
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "slicer",     label: "Fatiamento",  icon: Sliders },
            { id: "bioink",     label: "Biotinta",    icon: Droplets },
            { id: "db",         label: "DB 807",      icon: Database },
            { id: "rheology",   label: "Reologia",    icon: BarChart3 },
            { id: "ai",         label: "Análise IA",  icon: Zap },
            { id: "regulatory", label: "Regulatório", icon: Shield },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                activeTab === tab.id
                  ? "bg-violet-600 text-white"
                  : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.07] hover:text-white"
              )}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === "ai" && aiResult && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
              {tab.id === "rheology" && rheoResult && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" />}
              {tab.id === "db" && dbSuggestions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-0.5" />}
            </button>
          ))}
        </div>

        {/* ── SLICER TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "slicer" && (
          <div className="space-y-4">
            {/* Technology selector */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" /> Tecnologia de Impressão
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TECHNOLOGIES.map(tech => (
                  <button key={tech.id}
                    onClick={() => setSlicer(s => ({ ...s, technology: tech.id }))}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      slicer.technology === tech.id
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                    )}>
                    <div className="text-lg mb-1">{tech.icon}</div>
                    <div className="text-xs font-semibold text-white leading-tight">{tech.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{tech.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Context inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Tipo de Tecido Alvo *</label>
                <input value={tissue} onChange={e => setTissue(e.target.value)}
                  placeholder="ex: cartilagem articular, pele, osso"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Aplicação Clínica *</label>
                <input value={application} onChange={e => setApplication(e.target.value)}
                  placeholder="ex: regeneração, modelo in vitro, implante"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
              </div>
            </div>

            {/* Slicer parameters */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-violet-400" /> Parâmetros de Fatiamento
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Layer Height */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Altura de Camada
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={50} max={400} step={25}
                      value={slicer.layerHeight}
                      onChange={e => setSlicer(s => ({ ...s, layerHeight: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.layerHeight} µm</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">50–400 µm (padrão 200)</p>
                </div>

                {/* Print Speed */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block flex items-center gap-1">
                    <Wind className="w-3 h-3" /> Velocidade Impressão
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={1} max={30} step={1}
                      value={slicer.printSpeed}
                      onChange={e => setSlicer(s => ({ ...s, printSpeed: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.printSpeed} mm/s</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">Moles ≤5kPa: 5–15 mm/s</p>
                </div>

                {/* Pressure */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Pressão Extrusão
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={10} max={600} step={10}
                      value={slicer.pressure}
                      onChange={e => setSlicer(s => ({ ...s, pressure: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.pressure} kPa</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">Hidrogéis 10–120 kPa</p>
                </div>

                {/* Nozzle Temp */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Temp. Bico
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={4} max={200} step={1}
                      value={slicer.nozzleTemp}
                      onChange={e => setSlicer(s => ({ ...s, nozzleTemp: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.nozzleTemp}°C</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">4°C cold · 37°C biológico</p>
                </div>

                {/* Nozzle Diameter */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block flex items-center gap-1">
                    <Target className="w-3 h-3" /> Diâmetro Bico
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={100} max={1000} step={50}
                      value={slicer.nozzleDiameter}
                      onChange={e => setSlicer(s => ({ ...s, nozzleDiameter: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.nozzleDiameter} µm</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">Bio: 200–400 µm padrão</p>
                </div>

                {/* Infill % */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" /> Preenchimento
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={10} max={100} step={5}
                      value={slicer.infillPercent}
                      onChange={e => setSlicer(s => ({ ...s, infillPercent: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.infillPercent}%</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">Scaffolds: 60–80%</p>
                </div>

                {/* Infill Pattern */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[11px] text-gray-400 mb-1 block">Padrão Preenchimento</label>
                  <select value={slicer.infillPattern}
                    onChange={e => setSlicer(s => ({ ...s, infillPattern: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
                    {INFILL_PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Skirt */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Saia (Skirt)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={5} step={1}
                      value={slicer.skirtLoops}
                      onChange={e => setSlicer(s => ({ ...s, skirtLoops: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.skirtLoops} loops</span>
                  </div>
                </div>

                {/* Retraction */}
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Retração</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={2} step={0.1}
                      value={slicer.retraction}
                      onChange={e => setSlicer(s => ({ ...s, retraction: +e.target.value }))}
                      className="flex-1 accent-violet-500" />
                    <span className="text-xs text-violet-300 font-mono w-16 text-right">{slicer.retraction} mm</span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">Hidrogéis: 0–0.5 mm</p>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setSlicer(s => ({ ...s, supportEnabled: !s.supportEnabled }))}
                    className={cn("w-9 h-5 rounded-full relative transition-colors",
                      slicer.supportEnabled ? "bg-violet-600" : "bg-white/10")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                      slicer.supportEnabled ? "left-4.5" : "left-0.5")} style={{ left: slicer.supportEnabled ? "18px" : "2px" }} />
                  </div>
                  <span className="text-xs text-gray-300">Suporte (&gt;45°)</span>
                </label>
              </div>
            </div>

            {/* STL tip */}
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-400 leading-relaxed">
                <span className="text-blue-300 font-semibold">Preparação STL:</span> exporte como mesh manifold sólido · sem normais invertidas ·
                resolução ≥ 0.01 mm · tolerância ≤ 0.001 mm · recomendar escala 1:1 em mm.
                Para bioimpressão use <span className="text-blue-300">BioCAD</span> ou <span className="text-blue-300">Mimics</span> para segmentação médica.
              </div>
            </div>
          </div>
        )}

        {/* ── BIOINK TAB ──────────────────────────────────────────────────────── */}
        {activeTab === "bioink" && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-emerald-400" /> Material da Biotinta
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {BIOINK_MATERIALS.map(mat => (
                  <button key={mat.id}
                    onClick={() => setBioink(b => ({ ...b, material: mat.id, concentration: parseFloat(mat.conc) || b.concentration }))}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      bioink.material === mat.id
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                    )}>
                    <div className="text-xs font-semibold text-white leading-tight">{mat.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{mat.conc}</div>
                  </button>
                ))}
              </div>

              {selectedMat && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 mb-4">
                  <p className="text-xs text-emerald-300">{selectedMat.note}</p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Concentração (%)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0.5} max={30} step={0.5}
                      value={bioink.concentration}
                      onChange={e => setBioink(b => ({ ...b, concentration: +e.target.value }))}
                      className="flex-1 accent-emerald-500" />
                    <span className="text-xs text-emerald-300 font-mono w-12 text-right">{bioink.concentration}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Agente de Crosslinking</label>
                  <input value={bioink.crosslinker}
                    onChange={e => setBioink(b => ({ ...b, crosslinker: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Conc. Crosslinker</label>
                  <input value={bioink.crosslinkerConc}
                    onChange={e => setBioink(b => ({ ...b, crosslinkerConc: +e.target.value }))}
                    type="number" step={0.05}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block flex items-center gap-1">
                    <Microscope className="w-3 h-3" /> Aditivos / Fatores de Crescimento
                  </label>
                  <input value={bioink.additives}
                    onChange={e => setBioink(b => ({ ...b, additives: e.target.value }))}
                    placeholder="TGF-β1, BMP-2, VEGF..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
            </div>

            {/* Cell incorporation */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Microscope className="w-4 h-4 text-violet-400" /> Incorporação Celular
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setBioink(b => ({ ...b, hasCells: !b.hasCells }))}
                    className={cn("w-9 h-5 rounded-full relative transition-colors",
                      bioink.hasCells ? "bg-violet-600" : "bg-white/10")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all")}
                      style={{ left: bioink.hasCells ? "18px" : "2px" }} />
                  </div>
                  <span className="text-xs text-gray-300">Biotinta com células</span>
                </label>
              </div>

              {bioink.hasCells && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">
                      Densidade Celular (×10⁶ cel/mL)
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={0.5} max={20} step={0.5}
                        value={bioink.cellDensity}
                        onChange={e => setBioink(b => ({ ...b, cellDensity: +e.target.value }))}
                        className="flex-1 accent-violet-500" />
                      <span className="text-xs text-violet-300 font-mono w-24 text-right">
                        {bioink.cellDensity}×10⁶/mL
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">Padrão: 1–10×10⁶ · Alta densidade: 20×10⁶</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
                      <p className="text-[10px] text-violet-300 font-semibold mb-1">Viabilidade mínima</p>
                      <p className="text-xs text-gray-300">≥ 80% pós-impressão (AO/PI ou Live/Dead)</p>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                      <p className="text-[10px] text-amber-300 font-semibold mb-1">Tempo máximo</p>
                      <p className="text-xs text-gray-300">&lt; 2 horas fora de incubadora</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Electrospinning section */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection("electro")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Eletrofiação (Electrospinning)</span>
                  <span className="text-[10px] text-gray-500 bg-white/[0.05] px-2 py-0.5 rounded-full">fibras nanométricas</span>
                </div>
                {expandedSection === "electro" ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>
              {expandedSection === "electro" && (
                <div className="px-4 pb-4 border-t border-white/[0.06]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-amber-400">Parâmetros de Processo</h4>
                      <InfoRow label="Tensão aplicada" value="10–30 kV" />
                      <InfoRow label="Distância agulha-coletor" value="10–25 cm" />
                      <InfoRow label="Taxa de fluxo" value="0.1–3 mL/h" />
                      <InfoRow label="Temperatura" value="25–40°C (controlar umidade <50% UR)" />
                      <InfoRow label="Concentração polimérica" value="5–25% (ajustar viscosidade)" />
                      <InfoRow label="Solventes comuns" value="HFP, DMF, DMSO, ácido acético glacial" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-amber-400">Materiais &amp; Resultados</h4>
                      <InfoRow label="PCL (policaprolactona)" value="Fibras 200 nm–5 µm · Degradação lenta" />
                      <InfoRow label="PLGA" value="Fibras 500 nm–2 µm · Degradação 2–12 semanas" />
                      <InfoRow label="Colágeno + PCL" value="Fibras híbridas · Mimetiza ECM nativa" />
                      <InfoRow label="Diâmetro de fibra" value="50 nm–10 µm (controla porosidade)" />
                      <InfoRow label="Porosidade" value="70–90% (essencial para infiltração celular)" />
                    </div>
                  </div>
                  <div className="mt-3 bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                    <p className="text-xs text-amber-300 font-semibold mb-1">Aplicações na Biofabricação</p>
                    <p className="text-xs text-gray-400">Scaffolds para pele, tendão, ligamento, vascular · Membranas de filtração · Sistemas de liberação controlada · Camadas de revestimento para implantes bioativos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DB SUGGESTIONS TAB ──────────────────────────────────────────────── */}
        {activeTab === "db" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-2xl p-4 flex gap-3">
              <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-0.5">Banco de Dados CECT — 807 Formulações Validadas</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Parâmetros reais extraídos de literatura científica peer-reviewed.
                  Preencha o <span className="text-cyan-300 font-semibold">Tipo de Tecido</span> na aba Fatiamento para ver sugestões ranqueadas por adequação.
                </p>
              </div>
            </div>

            {/* DB details para material selecionado */}
            {dbDetails && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-cyan-400" />
                    {dbDetails.material} — Dados do DB
                    <span className="text-[10px] text-gray-500 bg-white/[0.05] px-2 py-0.5 rounded-full">{dbDetails.n} estudos</span>
                  </h3>
                  <button
                    onClick={applyRecommended}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/20 transition-all">
                    <ArrowRight className="w-3.5 h-3.5" /> Aplicar Parâmetros
                  </button>
                </div>

                {/* Parameter ranges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Pressão", val: dbDetails.parameters.pressure_kpa, unit: "kPa" },
                    { label: "Temperatura", val: dbDetails.parameters.temp_c, unit: "°C" },
                    { label: "Velocidade", val: dbDetails.parameters.speed_mms, unit: "mm/s" },
                    { label: "Bico (nozzle)", val: dbDetails.parameters.needle_um, unit: "µm" },
                  ].map(item => (
                    <div key={item.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 mb-1">{item.label}</p>
                      <p className="text-xs font-bold text-cyan-300">{item.val.typical ?? "—"} {item.unit}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {item.val.min ?? "?"} – {item.val.max ?? "?"} {item.unit}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Cell friendliness + concentrations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3">
                    <p className="text-[10px] text-violet-400 font-semibold mb-1">Estudos com células</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${dbDetails.cellFriendly}%` }} />
                      </div>
                      <span className="text-xs font-bold text-violet-300">{dbDetails.cellFriendly}%</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">{dbDetails.withCellsCount}/{dbDetails.n} estudos</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 font-semibold mb-1">Concentrações encontradas</p>
                    <div className="flex flex-wrap gap-1">
                      {dbDetails.concentrations.slice(0, 5).map((c, i) => (
                        <span key={i} className="text-[10px] bg-white/[0.05] text-gray-300 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {dbDetails.recommended.notes.length > 0 && (
                  <div className="space-y-1.5">
                    {dbDetails.recommended.notes.map((note, i) => (
                      <p key={i} className="text-xs text-gray-300">{note}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tissue-based suggestions */}
            {tissue ? (
              dbLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 text-cyan-400 mx-auto animate-spin mb-2" />
                  <p className="text-xs text-gray-400">Consultando banco de 807 formulações...</p>
                </div>
              ) : dbSuggestions.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Materiais Recomendados para: <span className="text-cyan-300">{tissue}</span>
                  </h3>
                  <div className="space-y-2">
                    {dbSuggestions.map((s, idx) => (
                      <div key={s.material}
                        className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 flex items-start gap-3 hover:border-cyan-500/30 transition-all">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 font-bold text-xs text-cyan-400">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-white">{s.material}</span>
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: Math.min(5, Math.round(s.score / 2)) }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                              ))}
                              <span className="text-[9px] text-gray-600 ml-1">{s.n} estudos</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                            {s.typicalPressure && <span className="text-gray-400">💧 {s.typicalPressure} kPa</span>}
                            {s.typicalTemp     && <span className="text-gray-400">🌡️ {s.typicalTemp}°C</span>}
                            {s.typicalSpeed    && <span className="text-gray-400">⚡ {s.typicalSpeed} mm/s</span>}
                            {s.typicalNeedle   && <span className="text-gray-400">🎯 {s.typicalNeedle} µm</span>}
                          </div>
                          {s.cellFriendly > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Microscope className="w-3 h-3 text-violet-400" />
                              <span className="text-[10px] text-violet-300">{s.cellFriendly}% estudos com células</span>
                            </div>
                          )}
                          {s.sampleFormulation && (
                            <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">Ex: {s.sampleFormulation}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const matMap: Record<string, string> = {
                              "GelMA": "gelma", "Alginate": "alginate", "Gelatin": "gelatin",
                              "PCL": "pcl", "Chitosan": "chitosan", "Collagen": "collagen",
                              "Fibrinogen": "fibrin", "Hyaluronic Acid": "hama", "dECM": "custom",
                            }
                            const matId = matMap[s.material] ?? "custom"
                            setBioink(b => ({ ...b, material: matId }))
                            if (s.typicalPressure) setSlicer(sl => ({ ...sl, pressure: s.typicalPressure! }))
                            if (s.typicalTemp) setSlicer(sl => ({ ...sl, nozzleTemp: s.typicalTemp! }))
                            if (s.typicalSpeed) setSlicer(sl => ({ ...sl, printSpeed: s.typicalSpeed! }))
                            if (s.typicalNeedle) setSlicer(sl => ({ ...sl, nozzleDiameter: s.typicalNeedle! }))
                            setActiveTab("slicer")
                          }}
                          className="shrink-0 px-2.5 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-semibold hover:bg-cyan-500/20 transition-all">
                          Usar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhuma sugestão encontrada para &quot;{tissue}&quot;
                </div>
              )
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-center">
                <Database className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-2">
                  Preencha o <span className="text-cyan-400 font-semibold">Tipo de Tecido Alvo</span> na aba Fatiamento
                </p>
                <p className="text-xs text-gray-600">
                  A IA buscará nos 807 estudos validados os melhores materiais para seu tecido específico
                </p>
                <button
                  onClick={() => setActiveTab("slicer")}
                  className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/20 transition-all mx-auto">
                  <ArrowRight className="w-3.5 h-3.5" /> Ir para Fatiamento
                </button>
              </div>
            )}

            {/* Reference info */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex gap-2">
              <Info className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-600 leading-relaxed">
                Dados do <span className="text-gray-400">CECT 3D Printing Materials Database</span> —
                807 estudos peer-reviewed compilados por pesquisadores europeus.
                Parâmetros típicos calculados a partir da mediana dos estudos disponíveis.
                Sempre valide com ensaio reológico antes de produção.
              </p>
            </div>
          </div>
        )}

        {/* ── RHEOLOGY TAB ────────────────────────────────────────────────────── */}
        {activeTab === "rheology" && (
          <div className="space-y-4">
            {!rheoResult ? (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Clique em <span className="text-emerald-400 font-semibold">Simular Reologia</span> para calcular as propriedades reológicas estimadas</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Viscosidade", value: rheoResult.viscosity, color: "blue" },
                    { label: "Yield Stress", value: rheoResult.yieldStress, color: "violet" },
                    { label: "Módulo Elástico (G')", value: rheoResult.elasticModulus, color: "emerald" },
                    { label: "Módulo Viscoso (G'')", value: rheoResult.viscousModulus, color: "amber" },
                    { label: "Shear Stress (τ_wall)", value: rheoResult.shearStress, color: "rose" },
                    { label: "Imprimibilidade", value: rheoResult.printability, color: "emerald" },
                  ].map(item => {
                    const c = SECTION_COLORS[item.color as keyof typeof SECTION_COLORS]
                    return (
                      <div key={item.label} className={cn("rounded-2xl border p-3", c.bg, c.border)}>
                        <p className="text-[10px] text-gray-500 mb-0.5">{item.label}</p>
                        <p className={cn("text-sm font-semibold", c.text)}>{item.value}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Recomendação</h4>
                  <p className="text-sm text-gray-300">{rheoResult.recommendation}</p>
                </div>

                {rheoResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    {rheoResult.warnings.map((w, i) => (
                      <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">{w}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* CFD Models info */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" /> Modelos CFD Aplicáveis
                  </h4>
                  <div className="space-y-2">
                    <InfoRow label="Herschel-Bulkley" value="τ = τ₀ + K·γ̇ⁿ — fluidos com yield stress (alginato, GelMA)" />
                    <InfoRow label="Casson" value="√τ = √τ₀ + √(η∞·γ̇) — biotintas fibrínicos e sangue" />
                    <InfoRow label="Power Law (Cross)" value="η = K·γ̇ⁿ⁻¹ — pseudoplásticos (n&lt;1 = ideal)" />
                    <InfoRow label="Hagen-Poiseuille" value="ΔP = 8ηLQ/πR⁴ — estimativa de queda de pressão no bico" />
                    <InfoRow label="Re (Reynolds)" value="Re &lt; 1 = fluxo laminar (típico na bioimpressão)" />
                  </div>
                </div>

                {/* G-code viewer */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
                  <button onClick={() => setGcodeVisible(!gcodeVisible)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white">G-code Estimado</span>
                    </div>
                    {gcodeVisible ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {gcodeVisible && (
                    <div className="border-t border-white/[0.06]">
                      <pre className="p-4 text-[11px] text-green-400 font-mono overflow-x-auto leading-relaxed bg-black/30">
                        {rheoResult.gcode}
                      </pre>
                      <div className="px-4 pb-3">
                        <button onClick={() => {
                          const blob = new Blob([rheoResult.gcode], { type: "text/plain" })
                          const a = document.createElement("a")
                          a.href = URL.createObjectURL(blob)
                          a.download = "bia_bioprint.gcode"
                          a.click()
                        }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-500/20 transition-all">
                          <Download className="w-3 h-3" /> Baixar GCode
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── AI ANALYSIS TAB ─────────────────────────────────────────────────── */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            {loading && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
                <Loader2 className="w-10 h-10 text-violet-400 mx-auto mb-3 animate-spin" />
                <p className="text-gray-400 text-sm">Analisando com IA BIA v4...</p>
                <p className="text-xs text-gray-600 mt-1">Consultando base científica 2024–2026</p>
              </div>
            )}
            {!loading && !aiResult && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
                <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-4">Configure o tecido alvo e aplicação na aba <span className="text-violet-400 font-semibold">Fatiamento</span>, depois clique em <span className="text-violet-400 font-semibold">Analisar com IA</span></p>
                <button onClick={runAIAnalysis}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-500 transition-all mx-auto">
                  <Zap className="w-4 h-4" /> Analisar Agora (10 créditos)
                </button>
              </div>
            )}
            {!loading && aiResult && (
              <>
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-white">Análise IA BIA v4</span>
                    <span className="ml-auto text-[10px] text-gray-500 bg-white/[0.05] px-2 py-0.5 rounded-full">
                      {aiResult.creditsUsed} créditos usados
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{aiResult.summary}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Slicer Recommendations */}
                  {aiResult.slicerRecommendations?.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-4">
                      <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
                        <Settings2 className="w-3.5 h-3.5" /> Parâmetros de Fatiamento
                      </h4>
                      <ul className="space-y-1.5">
                        {aiResult.slicerRecommendations.map((r, i) => (
                          <li key={i} className="text-xs text-gray-300 flex gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Bioink Notes */}
                  {aiResult.bioinkNotes?.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4">
                      <h4 className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5" /> Biotinta
                      </h4>
                      <ul className="space-y-1.5">
                        {aiResult.bioinkNotes.map((n, i) => (
                          <li key={i} className="text-xs text-gray-300 flex gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />{n}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {aiResult.cellViabilityPrediction && (
                  <div className="bg-violet-500/5 border border-violet-500/15 rounded-2xl p-4">
                    <h4 className="text-xs font-semibold text-violet-400 mb-1 flex items-center gap-1">
                      <Microscope className="w-3.5 h-3.5" /> Predição de Viabilidade Celular
                    </h4>
                    <p className="text-xs text-gray-300">{aiResult.cellViabilityPrediction}</p>
                  </div>
                )}

                {aiResult.crosslinkingProtocol && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4">
                    <h4 className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5" /> Protocolo de Crosslinking
                    </h4>
                    <p className="text-xs text-gray-300">{aiResult.crosslinkingProtocol}</p>
                  </div>
                )}

                {aiResult.postPrintingSteps?.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                    <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-1">
                      <Play className="w-3.5 h-3.5 text-emerald-400" /> Pós-Processamento
                    </h4>
                    <ol className="space-y-1.5">
                      {aiResult.postPrintingSteps.map((s, i) => (
                        <li key={i} className="text-xs text-gray-300 flex gap-2">
                          <span className="text-emerald-400 font-mono shrink-0">{i + 1}.</span>{s}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <button onClick={() => { setAiResult(null); runAIAnalysis() }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerar análise
                </button>
              </>
            )}
          </div>
        )}

        {/* ── REGULATORY TAB ──────────────────────────────────────────────────── */}
        {activeTab === "regulatory" && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-semibold text-white">Jornada Regulatória — FDA · ANVISA · EMA</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Produtos de biofabricação (tecidos impressos em 3D, implantes bioativos, organoides para transplante)
                são classificados como <span className="text-rose-300 font-semibold">dispositivos médicos de Classe III</span> e/ou
                <span className="text-rose-300 font-semibold"> terapias avançadas (ATMPs)</span>, exigindo aprovação rigorosa.
              </p>
            </div>

            {/* FDA */}
            <RegulatoryCard
              agency="FDA (EUA)"
              flag="🇺🇸"
              color="blue"
              stages={[
                {
                  phase: "Pré-IND / Pre-Sub",
                  duration: "6–12 meses",
                  desc: "Reunião com FDA, definição de classificação (510(k), PMA ou HCT/P), estratégia regulatória, identificação de controles especiais. Documentar: fabricação, testes pré-clínicos iniciais, qualidade do produto.",
                },
                {
                  phase: "Estudos Pré-Clínicos",
                  duration: "12–24 meses",
                  desc: "In vitro: ISO 10993 (biocompatibilidade), citotoxicidade, genotoxicidade, hemólise. In vivo (roedores): implante subcutâneo, análise histológica. Farmacocinética de degradação. GLP obrigatório para IND/PMA.",
                },
                {
                  phase: "IND (Investigational New Drug) / IDE",
                  duration: "3–6 meses análise",
                  desc: "Dossiê CMC (Chemistry, Manufacturing, Controls): caracterização de matérias-primas, processo GMP, controle de qualidade, testes de esterilidade, endotoxinas (USP <85>). Protocolo clínico Fase I.",
                },
                {
                  phase: "Fase I Clínica",
                  duration: "12–24 meses",
                  desc: "5–20 pacientes, segurança primária, dose-escalation. GMP obrigatório para produto clínico. DSMB (Data Safety Monitoring Board). Relatórios anuais ao FDA.",
                },
                {
                  phase: "Fase II/III Clínica",
                  duration: "2–5 anos",
                  desc: "Eficácia e segurança. Endpoints primários de regeneração (histologia, função, imagem). Placebo ou SOC (standard of care). Registros em clinicaltrials.gov. BLA ou PMA submission.",
                },
                {
                  phase: "PMA / BLA Submission",
                  duration: "180 dias FDA review",
                  desc: "Dossiê completo: módulos CTD (Common Technical Document). Taxa de submissão: ~$400k. Possibilidade de Priority Review, Breakthrough Therapy, Regenerative Medicine Advanced Therapy (RMAT) designation.",
                },
              ]}
            />

            {/* ANVISA */}
            <RegulatoryCard
              agency="ANVISA (Brasil)"
              flag="🇧🇷"
              color="emerald"
              stages={[
                {
                  phase: "Enquadramento Regulatório",
                  duration: "3–6 meses",
                  desc: "ANVISA RDC 204/2017 (dispositivos médicos implantáveis), RDC 67/2009 (terapias celulares). Classificação: Classe I–IV. Reunião de alinhamento técnico com GGMED/GGTEC.",
                },
                {
                  phase: "Registro INCA/HCFMRP",
                  duration: "Paralelo",
                  desc: "Para estudos clínicos: registro no ClinicalTrials + CONEP (Conselho Nacional de Ética em Pesquisa) via Plataforma Brasil. Aprovação local do CEP (Comitê de Ética em Pesquisa) em 30–60 dias.",
                },
                {
                  phase: "Estudos Pré-Clínicos BR",
                  duration: "12–24 meses",
                  desc: "NBR ISO 10993 adaptada + resolução CONCEA. CEUA aprovação para estudos animais. BPL (Boas Práticas de Laboratório) — INMETRO. Ensaios: biocompatibilidade, degradação in vivo, resposta imune.",
                },
                {
                  phase: "Fase Clínica — CONEP",
                  duration: "18–36 meses",
                  desc: "Ensaio clínico patrocinado ou cooperado. GGCTS/ANVISA para aprovação de produto investigacional (IND equivalente: AIFA — Autorização de Importação para Fins de Avaliação). BPC (ICH E6 R2).",
                },
                {
                  phase: "Registro ANVISA",
                  duration: "365 dias (prioridade) · 730 dias padrão",
                  desc: "Dossiê técnico: Módulo 1 (adm/regulatório), Módulo 2 (qualidade/CMC), Módulo 3 (pré-clínico), Módulo 4 (clínico). Taxa: R$ 50k–500k. BPF (GMP) obrigatório. Possibilidade de análise prioritária (Art. 14).",
                },
              ]}
            />

            {/* EMA */}
            <RegulatoryCard
              agency="EMA (Europa)"
              flag="🇪🇺"
              color="violet"
              stages={[
                {
                  phase: "Classificação ATMP",
                  duration: "2–3 meses",
                  desc: "Directive 2001/83/EC + Regulation 1394/2007. Tipos: CTMP (Cell Therapy), GTMP (Gene Therapy), TEP (Tissue Engineering Product). Comitê CAT (Committee for Advanced Therapies) classifica. Hospitality exemption para uso autólogo local.",
                },
                {
                  phase: "Scientific Advice (SA)",
                  duration: "3–6 meses",
                  desc: "Reunião de aconselhamento científico com EMA/CAT. Protocolo assistido por CAT. Produto investigacional: IMP (Investigational Medicinal Product). CTA (Clinical Trial Authorisation) — autoridade nacional.",
                },
                {
                  phase: "Estudos Pré-Clínicos EU",
                  duration: "12–24 meses",
                  desc: "EU Guideline on human cell-based medicinal products (EMEA/CHMP/410869/2008). EN ISO 10993 series. ATMP: guideline específico (EMA/CAT/600280/2010). Produção GMP (Annex 2A).",
                },
                {
                  phase: "Fase Clínica EU",
                  duration: "2–4 anos",
                  desc: "EU CTR (Clinical Trial Regulation 536/2014). CTIS portal. GMP Annex 13 para IMP. Farmacovigilância EUDRAVIGILANCE. Possibilidade PRIME designation (acesso acelerado para unmet medical needs).",
                },
                {
                  phase: "MAA (Marketing Authorisation Application)",
                  duration: "210 dias EMA review",
                  desc: "CTD format completo. Avaliação centralizada para ATMPs. CAT + CHMP. Taxa EUR ~300k. PIC/S GMP certificação. Post-marketing: PASS (Post-Authorisation Safety Study), REMS equivalente (Risk Management Plan).",
                },
              ]}
            />

            {/* Tips */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" /> Estratégia Regulatória Inteligente
              </h4>
              <div className="space-y-2">
                <InfoRow label="Design Freeze" value="Congele o design antes de estudos pré-clínicos GLP — mudanças exigem nova aprovação" />
                <InfoRow label="Design Controls (QSR)" value="FDA 21 CFR 820 / ISO 13485 obrigatórios desde o início do desenvolvimento" />
                <InfoRow label="Risk Management" value="ISO 14971 — FMEA detalhado de falha para cada componente do produto biofabricado" />
                <InfoRow label="Rastreabilidade" value="Rastreie células, biomateriais e lotes desde doador até paciente (cadeia de custódia)" />
                <InfoRow label="ATMP Incentivos" value="EMA PRIME, FDA RMAT, ANVISA prioridade: podem reduzir timeline em 30–50%" />
                <InfoRow label="DMPQ" value="Plano de gerenciamento de pós-mercado — vigiância de falhas · PMS Plan" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-500 shrink-0 min-w-[120px]">{label}</span>
      <span className="text-gray-300 flex-1" dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  )
}

function RegulatoryCard({ agency, flag, color, stages }: {
  agency: string; flag: string; color: string
  stages: { phase: string; duration: string; desc: string }[]
}) {
  const [open, setOpen] = useState(false)
  const c = SECTION_COLORS[color as keyof typeof SECTION_COLORS]

  return (
    <div className={cn("rounded-2xl border overflow-hidden", c.border, c.bg)}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xl">{flag}</span>
          <span className={cn("text-sm font-semibold", c.text)}>{agency}</span>
          <span className="text-[10px] text-gray-500 bg-white/[0.05] px-2 py-0.5 rounded-full">{stages.length} etapas</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.06] space-y-3 mt-1">
          {stages.map((stage, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0", c.border, c.text)}>
                  {i + 1}
                </div>
                {i < stages.length - 1 && <div className="w-0.5 flex-1 bg-white/[0.06] mt-1" />}
              </div>
              <div className="pb-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-white">{stage.phase}</span>
                  <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full", c.bg, c.text)}>{stage.duration}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{stage.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
