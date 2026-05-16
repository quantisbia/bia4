"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA — Etapa 2 / 4 · Biotinta (formulação + reologia + catálogo)
 *  ───────────────────────────────────────────────────────────────────────
 *  Unifica em uma única tela:
 *    A. FORMULAR  — material + concentração + crosslinker + células + aditivos
 *    B. CATÁLOGO  — DB com biomateriais validados (807 formulações)
 *    C. REOLOGIA  — simulação Hagen-Poiseuille + warnings de viabilidade
 *
 *  Substitui /dashboard/biomaterials + tabs bioink/db/rheology de /bioprinting.
 *  Escreve em state.bioink do BioprintProcessContext.
 *
 *  Pré-requisito: state.model.status === "ready"
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Droplets, Database, BarChart3, Search, Loader2, FlaskConical,
  Microscope, Star, ArrowRight, AlertTriangle, CheckCircle2, ChevronDown,
  ChevronUp, Info, Beaker, Sparkles, Filter, X, ChevronRight, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useBioprintProcess } from "@/lib/bioprint/process-context"

// ─── Constantes da biotinta (importadas da página antiga, agora aqui) ─────

interface MatPreset {
  id: string
  label: string
  conc: string
  concDefault: number      // valor inicial do slider
  temp: number              // °C
  note: string
  defaultCrosslinker: string
  defaultCrosslinkerConc: number
}

const BIOINK_MATERIALS: MatPreset[] = [
  { id: "gelma",    label: "GelMA",              conc: "5–15%",       concDefault: 8,    temp: 37, note: "Fotocrosslink UV 365 nm 30–60s",      defaultCrosslinker: "UV 365 nm + LAP",   defaultCrosslinkerConc: 0.3  },
  { id: "alginate", label: "Alginato de Sódio",  conc: "2–4%",        concDefault: 3,    temp: 25, note: "CaCl₂ 50–200 mM crosslink iônico",    defaultCrosslinker: "CaCl₂",             defaultCrosslinkerConc: 100  },
  { id: "fibrin",   label: "Fibrina",            conc: "10–30 mg/mL", concDefault: 20,   temp: 37, note: "Trombina 1–5 U/mL · gelifica 5–10 min", defaultCrosslinker: "Trombina",          defaultCrosslinkerConc: 2    },
  { id: "collagen", label: "Colágeno Tipo I",    conc: "1–5 mg/mL",   concDefault: 3,    temp: 4,  note: "Imprimir a 4 °C · gelifica a 37 °C",  defaultCrosslinker: "Térmico 37 °C",     defaultCrosslinkerConc: 0    },
  { id: "chitosan", label: "Quitosana",          conc: "1–3%",        concDefault: 2,    temp: 25, note: "Crosslink pH ou TPP",                  defaultCrosslinker: "TPP",               defaultCrosslinkerConc: 1    },
  { id: "hama",     label: "HA-MA (Hialuronato)", conc: "2–4%",       concDefault: 3,    temp: 25, note: "UV crosslink · G' 100–2000 Pa",        defaultCrosslinker: "UV 365 nm + LAP",   defaultCrosslinkerConc: 0.3  },
  { id: "pegda",    label: "PEGDA",              conc: "10–30%",      concDefault: 15,   temp: 25, note: "Fotocrosslink UV · rígido",            defaultCrosslinker: "UV 365 nm + LAP",   defaultCrosslinkerConc: 0.3  },
  { id: "decm",     label: "dECM",               conc: "1–3%",        concDefault: 2,    temp: 4,  note: "Matriz descelularizada · gelifica 37 °C", defaultCrosslinker: "Térmico 37 °C",  defaultCrosslinkerConc: 0    },
  { id: "pcl",      label: "PCL",                conc: "100%",        concDefault: 100,  temp: 90, note: "Extrusão 90–100 °C · scaffolds rígidos", defaultCrosslinker: "Solidificação",   defaultCrosslinkerConc: 0    },
  { id: "pluronic", label: "Pluronic F127",      conc: "20–40%",      concDefault: 30,   temp: 4,  note: "Suporte sacrificial · gel reversível",  defaultCrosslinker: "Lavagem 4 °C",     defaultCrosslinkerConc: 0    },
  { id: "custom",   label: "Formulação Custom",  conc: "—",           concDefault: 5,    temp: 25, note: "Parâmetros personalizados",            defaultCrosslinker: "—",                 defaultCrosslinkerConc: 0    },
]

// 10 tipos celulares do biomedical-params (chaves de CELL_SENSITIVITY)
const CELL_TYPES = [
  { id: "hMSC",         label: "hMSC (mesênquimal)",        note: "Tolerante · ideal para osso/cartilagem" },
  { id: "iPSC",         label: "iPSC (pluripotente)",        note: "Sensível ao cisalhamento · viabilidade crítica" },
  { id: "Hepatocyte",   label: "Hepatócito",                 note: "Muito sensível · prefere encapsulamento" },
  { id: "Cardiomyocyte",label: "Cardiomiócito",              note: "Sensível · viabilidade ≥85% pós-bio" },
  { id: "Chondrocyte",  label: "Condrócito",                 note: "Tolerante · ideal para cartilagem articular" },
  { id: "Osteoblast",   label: "Osteoblasto",                note: "Tolerante · osso e dental" },
  { id: "Fibroblast",   label: "Fibroblasto",                note: "Muito tolerante · padrão para pele" },
  { id: "Keratinocyte", label: "Queratinócito",              note: "Tolerante · pele superficial" },
  { id: "Endothelial",  label: "Endotelial (HUVEC)",         note: "Tolerante · vascularização" },
  { id: "Neuron",       label: "Neurônio",                   note: "Muito sensível · cisalhamento mínimo" },
]

// Categorias do catálogo de 807 biomateriais
const DB_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "HYDROGEL",       label: "Hidrogel" },
  { value: "SCAFFOLD",       label: "Scaffold / Polímero" },
  { value: "BIOINK",         label: "Bioink Formulada" },
  { value: "COMPOSITE",      label: "Compósito" },
  { value: "DECELLULARIZED", label: "MEC Descelularizada" },
  { value: "COATING",        label: "Coating / Peptídeo" },
  { value: "MEMBRANE",       label: "Membrana" },
  { value: "NANOPARTICLE",   label: "Nanopartícula" },
]
const DB_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DB_CATEGORIES.map(c => [c.value, c.label])
)
const DB_CATEGORY_COLORS: Record<string, string> = {
  HYDROGEL:       "text-blue-400 bg-blue-500/10 border-blue-500/20",
  SCAFFOLD:       "text-purple-400 bg-purple-500/10 border-purple-500/20",
  BIOINK:         "text-teal-400 bg-teal-500/10 border-teal-500/20",
  COMPOSITE:      "text-amber-400 bg-amber-500/10 border-amber-500/20",
  DECELLULARIZED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  COATING:        "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  MEMBRANE:       "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  NANOPARTICLE:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
}

// ─── Types do DB de 807 ──────────────────────────────────────────────────

type CompositionJson = Record<string, unknown>
interface Biomaterial {
  id: string
  name: string
  category: string
  composition: string | CompositionJson
  concentration?: string
  applications: string[]
  biocompatibility: string
  crosslinking?: string
  tissueTypes?: string[]
  tags?: string[]
}

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

// ─── Reologia (cópia simplificada de bioprinting/page.tsx) ───────────────

interface RheologyInput {
  materialId: string
  concentration: number
  hasCells: boolean
  cellDensityM: number      // milhões/mL
  nozzleUm: number
  printSpeedMmS: number
}

interface RheologyResult {
  viscosityPaS: number      // valor numérico para gravar no context
  yieldStressPa: number
  gPrime: number
  shearStressPa: number
  shearRate: number
  printability: "excellent" | "moderate" | "high-shear"
  recommendation: string
  warnings: string[]
}

function calculateRheology(input: RheologyInput): RheologyResult {
  const { materialId, concentration: conc, hasCells, cellDensityM, nozzleUm, printSpeedMmS } = input

  // Wall shear rate via Hagen-Poiseuille simplificado:
  // γ̇_wall = 4Q / (π R³); Q ≈ v · A (área da seção)
  const R = (nozzleUm / 2) / 1_000_000  // µm → m
  const A = Math.PI * R * R
  const v = printSpeedMmS / 1000        // mm/s → m/s
  const Q = v * A
  const shear = (4 * Q) / (Math.PI * R * R * R)  // 1/s

  // Estimativas material-específicas (mPa·s, Pa, Pa)
  let viscosity_mPaS = 500
  let yieldStress = 20
  let gPrime = 300

  switch (materialId) {
    case "gelma":
      viscosity_mPaS = 50 + conc * 80
      yieldStress = conc * 3
      gPrime = conc * 200
      break
    case "alginate":
      viscosity_mPaS = conc * 400
      yieldStress = conc * 8
      gPrime = conc * 500
      break
    case "collagen":
      viscosity_mPaS = conc * 120
      yieldStress = conc * 2
      gPrime = conc * 80
      break
    case "fibrin":
      viscosity_mPaS = conc * 30
      yieldStress = conc * 1
      gPrime = conc * 60
      break
    case "chitosan":
      viscosity_mPaS = conc * 350
      yieldStress = conc * 6
      gPrime = conc * 400
      break
    case "hama":
      viscosity_mPaS = conc * 600
      yieldStress = conc * 5
      gPrime = conc * 350
      break
    case "pegda":
      viscosity_mPaS = conc * 50
      yieldStress = conc * 1
      gPrime = conc * 30
      break
    case "decm":
      viscosity_mPaS = conc * 200
      yieldStress = conc * 3
      gPrime = conc * 150
      break
    case "pcl":
      viscosity_mPaS = 5000
      yieldStress = 200
      gPrime = 100000
      break
    case "pluronic":
      viscosity_mPaS = conc * 1500
      yieldStress = conc * 30
      gPrime = conc * 800
      break
  }

  const viscosityPaS = viscosity_mPaS / 1000
  const shearStressPa = viscosityPaS * shear

  const printability: RheologyResult["printability"] =
    shearStressPa < 50  ? "excellent" :
    shearStressPa < 100 ? "moderate" : "high-shear"

  const warnings: string[] = []
  if (hasCells && shearStressPa > 50)
    warnings.push("Shear > 50 Pa pode comprometer viabilidade celular (Blaeser et al. 2016)")
  if (nozzleUm < 200 && hasCells)
    warnings.push("Nozzle < 200 µm + células: risco de lise por obstrução do bico")
  if (hasCells && cellDensityM > 10)
    warnings.push("Densidade > 10×10⁶ cel/mL: monitorar agregação e sedimentação")
  if (materialId === "collagen" && input.nozzleUm > 0)
    warnings.push("Colágeno: imprimir a 4 °C; cabeça aquecida >10 °C causa gelificação prematura")
  if (materialId === "pluronic" && hasCells)
    warnings.push("Pluronic é sacrificial — destinado a canais vasculares, não para encapsulamento celular")

  const recommendation = gPrime > 500
    ? "Material adequado para extrusão — boa retenção de forma pós-impressão."
    : gPrime > 100
      ? "Limítrofe: considere aumentar concentração ou pré-crosslink leve para melhorar fidelidade."
      : "Módulo elástico baixo — risco de colapso. Aumentar concentração ou trocar de material."

  return {
    viscosityPaS,
    yieldStressPa: yieldStress,
    gPrime,
    shearStressPa,
    shearRate: shear,
    printability,
    recommendation,
    warnings,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function BioprintBioinkPage() {
  const { state, updateBioink } = useBioprintProcess()
  const [tab, setTab] = useState<"formulate" | "catalog" | "rheology">("formulate")

  // ─── Estado da formulação (default vem do context, se houver) ──────────
  const [materialId, setMaterialId] = useState<string>(
    state.bioink.material ?? "gelma"
  )
  const matPreset = BIOINK_MATERIALS.find(m => m.id === materialId) ?? BIOINK_MATERIALS[0]

  const [concentration, setConcentration]       = useState<number>(state.bioink.concentration ?? matPreset.concDefault)
  const [crosslinker, setCrosslinker]            = useState<string>(state.bioink.crosslinker ?? matPreset.defaultCrosslinker)
  const [crosslinkerConc, setCrosslinkerConc]    = useState<number>(state.bioink.crosslinkerConc ?? matPreset.defaultCrosslinkerConc)
  const [hasCells, setHasCells]                  = useState<boolean>(state.bioink.cellType !== null)
  const [cellType, setCellType]                  = useState<string>(state.bioink.cellType ?? "Fibroblast")
  const [cellDensity, setCellDensity]            = useState<number>(state.bioink.cellDensityMillionMl ?? 2)
  const [additivesText, setAdditivesText]        = useState<string>(state.bioink.additives.join(", "))

  // Para reologia + warnings: precisa de um nozzleUm e printSpeedMmS chutados
  // (a etapa de fatiamento vai sobrescrever — aqui usamos defaults razoáveis)
  const [nozzleUm, setNozzleUm]         = useState<number>(300)
  const [printSpeedMmS, setPrintSpeedMmS] = useState<number>(15)

  // Reologia derivada
  const rheology = useMemo<RheologyResult>(() => calculateRheology({
    materialId, concentration, hasCells, cellDensityM: cellDensity, nozzleUm, printSpeedMmS,
  }), [materialId, concentration, hasCells, cellDensity, nozzleUm, printSpeedMmS])

  // Pre-requisito visual (etapa 1 não pronta?)
  const isUnlocked = state.model.status === "ready"

  // ─── Quando trocar de material: aplicar preset ─────────────────────────
  const handleMaterialChange = useCallback((id: string) => {
    setMaterialId(id)
    const p = BIOINK_MATERIALS.find(m => m.id === id)
    if (p) {
      setConcentration(p.concDefault)
      setCrosslinker(p.defaultCrosslinker)
      setCrosslinkerConc(p.defaultCrosslinkerConc)
    }
  }, [])

  // ─── Persistir no context (debounced via useEffect) ────────────────────
  useEffect(() => {
    if (!matPreset) return
    const additives = additivesText
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // Status: ready se tem material + concentração > 0
    const status = (materialId && concentration > 0) ? "ready" : "draft"

    updateBioink({
      status,
      material: matPreset.label,
      concentration,
      crosslinker,
      crosslinkerConc,
      cellType: hasCells ? cellType : null,
      cellDensityMillionMl: hasCells ? cellDensity : null,
      additives,
      rheology: {
        viscosityPaS: rheology.viscosityPaS,
        yieldStressPa: rheology.yieldStressPa,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, concentration, crosslinker, crosslinkerConc, hasCells, cellType, cellDensity, additivesText, rheology.viscosityPaS, rheology.yieldStressPa])

  return (
    <div className="bia-bioink-page flex flex-col min-h-full bg-[#0a0a0f]">
      {/* Cabeçalho */}
      <header className="px-4 sm:px-6 py-5 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80 font-semibold mb-1">
              Etapa 2 / 4 · Bioimpressão
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              Biotinta
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
              Defina o material, concentração, agente de crosslinking e células — as propriedades reológicas
              são calculadas em tempo real para alertar sobre cisalhamento e viabilidade.
            </p>
          </div>

          {state.bioink.status === "ready" && (
            <Link
              href="/dashboard/bioprint/slice"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25
                border border-cyan-500/40 text-cyan-200 text-sm font-medium rounded-xl transition-colors"
            >
              Continuar para Fatiamento <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1.5 bg-white/3 border border-white/8 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          <SourceTab label="Formular" icon={FlaskConical} active={tab === "formulate"} onClick={() => setTab("formulate")} />
          <SourceTab label="Catálogo (807)" icon={Database} active={tab === "catalog"} onClick={() => setTab("catalog")} />
          <SourceTab label="Reologia" icon={BarChart3} active={tab === "rheology"} onClick={() => setTab("rheology")} dot={rheology.warnings.length > 0 ? "amber" : null} />
        </div>
      </header>

      {/* Aviso se etapa 1 não pronta */}
      {!isUnlocked && (
        <div className="mx-4 sm:mx-6 mt-4 rounded-xl bg-amber-500/8 border border-amber-500/30 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-amber-200">Etapa 1 (Modelo 3D) ainda não foi concluída</div>
            <div className="text-xs text-amber-100/70 mt-0.5">
              Você pode preparar a formulação aqui, mas para avançar é necessário ter um modelo 3D pronto.
            </div>
          </div>
          <Link
            href="/dashboard/bioprint/model"
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 transition-colors"
          >
            Voltar à Etapa 1
          </Link>
        </div>
      )}

      {/* Conteúdo */}
      <main className="flex-1 px-4 sm:px-6 py-6">
        {tab === "formulate" && (
          <FormulatePanel
            materialId={materialId}        onMaterialChange={handleMaterialChange}
            matPreset={matPreset}
            concentration={concentration}  onConcentrationChange={setConcentration}
            crosslinker={crosslinker}      onCrosslinkerChange={setCrosslinker}
            crosslinkerConc={crosslinkerConc} onCrosslinkerConcChange={setCrosslinkerConc}
            hasCells={hasCells}            onHasCellsChange={setHasCells}
            cellType={cellType}            onCellTypeChange={setCellType}
            cellDensity={cellDensity}      onCellDensityChange={setCellDensity}
            additivesText={additivesText}  onAdditivesChange={setAdditivesText}
            rheology={rheology}
          />
        )}
        {tab === "catalog" && (
          <CatalogPanel
            onPickMaterial={(name) => {
              // Heurística para mapear nome do DB → preset
              const map: Record<string, string> = {
                "gelma": "gelma", "alginate": "alginate", "alginato": "alginate",
                "fibrin": "fibrin", "fibrina": "fibrin", "fibrinogen": "fibrin",
                "collagen": "collagen", "colágeno": "collagen", "colageno": "collagen",
                "chitosan": "chitosan", "quitosana": "chitosan",
                "hyaluronic": "hama", "hialur": "hama", "ha-ma": "hama",
                "pegda": "pegda", "decm": "decm", "pcl": "pcl", "pluronic": "pluronic",
              }
              const lower = name.toLowerCase()
              const matched = Object.entries(map).find(([k]) => lower.includes(k))?.[1] ?? "custom"
              handleMaterialChange(matched)
              setTab("formulate")
            }}
          />
        )}
        {tab === "rheology" && (
          <RheologyPanel
            rheology={rheology}
            nozzleUm={nozzleUm}            onNozzleChange={setNozzleUm}
            printSpeedMmS={printSpeedMmS}  onPrintSpeedChange={setPrintSpeedMmS}
            materialLabel={matPreset.label}
            concentration={concentration}
          />
        )}
      </main>

      {/* Rodapé sticky com CTA */}
      {state.bioink.status === "ready" && (
        <footer className="sticky bottom-0 z-10 bg-[#0a0a0f]/95 backdrop-blur border-t border-cyan-500/20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-cyan-300 font-medium shrink-0">Biotinta:</span>
            <span className="text-gray-300 truncate">
              {matPreset.label} {concentration}%
              {hasCells && ` · ${cellType} ${cellDensity}×10⁶/mL`}
            </span>
          </div>
          <Link
            href="/dashboard/bioprint/slice"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 text-sm font-semibold rounded-lg transition-colors"
          >
            Etapa 3 · Fatiamento <ArrowRight className="w-4 h-4" />
          </Link>
        </footer>
      )}
    </div>
  )
}

// ─── Tab da fonte ─────────────────────────────────────────────────────────
function SourceTab({
  label, icon: Icon, active, onClick, dot,
}: {
  label: string; icon: typeof Droplets; active: boolean; onClick: () => void; dot?: "amber" | "cyan" | null
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
        active
          ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dot === "amber" ? "bg-amber-400" : "bg-cyan-400")} />}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL A — FORMULAR
// ═══════════════════════════════════════════════════════════════════════════
interface FormulateProps {
  materialId: string;            onMaterialChange: (id: string) => void
  matPreset: MatPreset
  concentration: number;         onConcentrationChange: (n: number) => void
  crosslinker: string;            onCrosslinkerChange: (s: string) => void
  crosslinkerConc: number;        onCrosslinkerConcChange: (n: number) => void
  hasCells: boolean;              onHasCellsChange: (b: boolean) => void
  cellType: string;               onCellTypeChange: (s: string) => void
  cellDensity: number;            onCellDensityChange: (n: number) => void
  additivesText: string;          onAdditivesChange: (s: string) => void
  rheology: RheologyResult
}

function FormulatePanel(p: FormulateProps) {
  const {
    materialId, onMaterialChange, matPreset,
    concentration, onConcentrationChange,
    crosslinker, onCrosslinkerChange,
    crosslinkerConc, onCrosslinkerConcChange,
    hasCells, onHasCellsChange,
    cellType, onCellTypeChange,
    cellDensity, onCellDensityChange,
    additivesText, onAdditivesChange,
    rheology,
  } = p

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* ── Material ── */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan-400" />
          Material da biotinta
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {BIOINK_MATERIALS.map(mat => (
            <button
              key={mat.id}
              onClick={() => onMaterialChange(mat.id)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                materialId === mat.id
                  ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
              )}
            >
              <div className={cn(
                "text-xs font-semibold leading-tight",
                materialId === mat.id ? "text-cyan-200" : "text-white"
              )}>
                {mat.label}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{mat.conc}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <p className="text-xs text-cyan-100/90">{matPreset.note}</p>
        </div>
      </section>

      {/* ── Concentração + crosslinker ── */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Concentração & crosslinking</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={`Concentração (${matPreset.id === "pcl" ? "%, w/w" : matPreset.id === "fibrin" || matPreset.id === "collagen" ? "mg/mL" : "%, w/v"})`}>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0.5} max={matPreset.id === "pcl" ? 100 : matPreset.id === "fibrin" ? 30 : 40}
                step={0.5}
                value={concentration}
                onChange={e => onConcentrationChange(parseFloat(e.target.value))}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-sm font-mono text-cyan-300 w-14 text-right">{concentration}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">Faixa típica: {matPreset.conc}</div>
          </Field>

          <Field label="Agente de crosslinking">
            <input
              type="text"
              value={crosslinker}
              onChange={e => onCrosslinkerChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
            />
          </Field>

          <Field label="Conc. crosslinker">
            <input
              type="number" step={0.05} min={0}
              value={crosslinkerConc}
              onChange={e => onCrosslinkerConcChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
            />
          </Field>

          <Field label="Aditivos / fatores">
            <input
              type="text"
              value={additivesText}
              onChange={e => onAdditivesChange(e.target.value)}
              placeholder="TGF-β1, BMP-2, VEGF..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
            />
            <div className="text-[10px] text-gray-500 mt-1">Separe por vírgula</div>
          </Field>
        </div>
      </section>

      {/* ── Células ── */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Microscope className="w-4 h-4 text-violet-400" />
            Incorporação celular
          </h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => onHasCellsChange(!hasCells)}
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors",
                hasCells ? "bg-violet-600" : "bg-white/15"
              )}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: hasCells ? "22px" : "2px" }}
              />
            </button>
            <span className="text-xs text-gray-300">Biotinta com células</span>
          </label>
        </div>

        {hasCells && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo celular">
                <select
                  value={cellType}
                  onChange={e => onCellTypeChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white
                    focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
                >
                  {CELL_TYPES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <div className="text-[10px] text-gray-500 mt-1">
                  {CELL_TYPES.find(c => c.id === cellType)?.note}
                </div>
              </Field>

              <Field label="Densidade (×10⁶ cel/mL)">
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={0.5} max={30} step={0.5}
                    value={cellDensity}
                    onChange={e => onCellDensityChange(parseFloat(e.target.value))}
                    className="flex-1 accent-violet-500"
                  />
                  <span className="text-sm font-mono text-violet-300 w-16 text-right">{cellDensity}×10⁶</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">Padrão: 1–10 · alta densidade: 20</div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Pill color="violet" title="Viabilidade alvo" value="≥ 80% pós-impressão (Live/Dead AO/PI)" />
              <Pill color="amber"  title="Tempo máximo"     value="< 2h fora de incubadora" />
              <Pill color="rose"   title="pH alvo"          value="7.2 – 7.4" />
            </div>
          </div>
        )}
      </section>

      {/* ── Preview reologia / alertas inline ── */}
      <section className={cn(
        "rounded-2xl border p-5",
        rheology.printability === "excellent" ? "bg-emerald-500/[0.04] border-emerald-500/20" :
        rheology.printability === "moderate"  ? "bg-amber-500/[0.04] border-amber-500/30" :
                                                 "bg-rose-500/[0.04] border-rose-500/30"
      )}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Reologia estimada
          </h3>
          <PrintabilityBadge p={rheology.printability} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Stat label="Viscosidade"     value={`${(rheology.viscosityPaS * 1000).toFixed(0)} mPa·s`} />
          <Stat label="Yield stress"    value={`${rheology.yieldStressPa.toFixed(1)} Pa`} />
          <Stat label="Módulo G'"        value={`${rheology.gPrime.toFixed(0)} Pa`} />
          <Stat label="Shear stress"     value={`${rheology.shearStressPa.toFixed(1)} Pa`} highlight={rheology.shearStressPa > 50} />
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">{rheology.recommendation}</p>

        {rheology.warnings.length > 0 && (
          <div className="mt-3 space-y-2 pt-3 border-t border-white/5">
            {rheology.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-amber-200/90">{w}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL B — CATÁLOGO (DB de 807)
// ═══════════════════════════════════════════════════════════════════════════
function CatalogPanel({ onPickMaterial }: { onPickMaterial: (name: string) => void }) {
  const [biomaterials, setBiomaterials] = useState<Biomaterial[]>([])
  const [total, setTotal]     = useState(0)
  const [search, setSearch]   = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tissueQuery, setTissueQuery]   = useState("")
  const [suggestions, setSuggestions]   = useState<DBSuggestion[]>([])
  const [sugLoading, setSugLoading]     = useState(false)

  // Carrega lista do DB
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search) params.set("search", search)
        if (category) params.set("category", category)
        params.set("limit", "60")
        const res = await fetch(`/api/biomaterials?${params}`)
        if (res.ok) {
          const data = await res.json()
          setBiomaterials(data.biomaterials)
          setTotal(data.total)
        }
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [search, category])

  // Sugestões por tecido
  useEffect(() => {
    if (!tissueQuery || tissueQuery.length < 3) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      setSugLoading(true)
      try {
        const res = await fetch(`/api/bioprint/suggest?tissue=${encodeURIComponent(tissueQuery)}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.suggestions ?? [])
        }
      } catch { /* ignore */ }
      finally { setSugLoading(false) }
    }, 500)
    return () => clearTimeout(t)
  }, [tissueQuery])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Cabeçalho do catálogo */}
      <div className="rounded-2xl bg-cyan-500/5 border border-cyan-500/15 p-4 flex gap-3">
        <Database className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">Catálogo CECT — {total > 0 ? `${total} de ` : ""}807 formulações validadas</div>
          <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            Banco de dados peer-reviewed. Busque pelo tecido alvo para ver materiais mais usados, ou navegue por categoria.
          </div>
        </div>
      </div>

      {/* Sugestões por tecido (rápido) */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          Sugestão por tipo de tecido
        </h3>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={tissueQuery}
            onChange={e => setTissueQuery(e.target.value)}
            placeholder="ex: cartilagem, osso, pele, cardíaco, hepático…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white
              placeholder:text-gray-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
          />
        </div>

        {sugLoading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 text-violet-400 mx-auto animate-spin" /></div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.slice(0, 5).map((s, idx) => (
              <div key={s.material}
                className="bg-white/[0.03] border border-white/8 rounded-xl p-3 flex items-start gap-3 hover:border-cyan-500/30 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 font-bold text-xs text-cyan-400">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-semibold text-white truncate">{s.material}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: Math.min(5, Math.round(s.score / 2)) }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                      ))}
                      <span className="text-[9px] text-gray-600 ml-1">{s.n} estudos</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-400">
                    {s.typicalPressure && <span>💧 {s.typicalPressure} kPa</span>}
                    {s.typicalTemp     && <span>🌡️ {s.typicalTemp} °C</span>}
                    {s.typicalSpeed    && <span>⚡ {s.typicalSpeed} mm/s</span>}
                    {s.typicalNeedle   && <span>🎯 {s.typicalNeedle} µm</span>}
                  </div>
                  {s.cellFriendly > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Microscope className="w-3 h-3 text-violet-400" />
                      <span className="text-[10px] text-violet-300">{s.cellFriendly}% com células</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onPickMaterial(s.material)}
                  className="shrink-0 px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  Usar <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : tissueQuery.length >= 3 ? (
          <div className="text-center py-4 text-xs text-gray-500">
            Nenhuma sugestão para &quot;{tissueQuery}&quot;
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-gray-600">
            Digite o tipo de tecido para ver materiais ranqueados por adequação
          </div>
        )}
      </div>

      {/* Lista completa do DB */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Navegar catálogo
        </h3>

        {/* Search + filter */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar biomaterial..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white
                placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <select
              value={category} onChange={e => setCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-300 appearance-none cursor-pointer focus:outline-none focus:border-cyan-500/40"
            >
              <option value="">Todas</option>
              {DB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 text-cyan-400 mx-auto animate-spin" />
          </div>
        ) : biomaterials.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nenhum biomaterial encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {biomaterials.map(bm => (
              <div key={bm.id} className="rounded-xl border border-white/8 bg-white/[0.02]">
                <button
                  onClick={() => setExpanded(expanded === bm.id ? null : bm.id)}
                  className="w-full p-3 text-left flex items-start gap-3 hover:bg-white/5 transition-colors rounded-xl"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-white leading-tight">{bm.name}</p>
                      {expanded === bm.id
                        ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                        : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      }
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-md border inline-block mt-1.5",
                      DB_CATEGORY_COLORS[bm.category] ?? "text-gray-400"
                    )}>
                      {DB_CATEGORY_LABELS[bm.category] ?? bm.category}
                    </span>
                  </div>
                </button>
                {expanded === bm.id && (
                  <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-1">
                    <DetailRow label="Composição"     value={formatComposition(bm.composition)} />
                    <DetailRow label="Concentração"   value={getConcentration(bm)} />
                    {bm.crosslinking && <DetailRow label="Crosslinking" value={bm.crosslinking} />}
                    {bm.biocompatibility && <DetailRow label="Biocompat."  value={bm.biocompatibility} />}
                    {bm.applications?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {bm.applications.slice(0, 4).map((app, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-md text-gray-400">{app}</span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => onPickMaterial(bm.name)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold rounded-lg transition-colors"
                    >
                      Usar este material <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAINEL C — REOLOGIA
// ═══════════════════════════════════════════════════════════════════════════
interface RheologyPanelProps {
  rheology: RheologyResult
  nozzleUm: number;              onNozzleChange: (n: number) => void
  printSpeedMmS: number;         onPrintSpeedChange: (n: number) => void
  materialLabel: string
  concentration: number
}

function RheologyPanel({ rheology, nozzleUm, onNozzleChange, printSpeedMmS, onPrintSpeedChange, materialLabel, concentration }: RheologyPanelProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Sliders de calibragem */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Parâmetros de extrusão (preview)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ajustáveis aqui só para ver o impacto reológico. Os valores reais serão definidos na Etapa 3 (Fatiamento).
            </p>
          </div>
          <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-full">preview</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Diâmetro do bico (µm)">
            <div className="flex items-center gap-2">
              <input
                type="range" min={100} max={1000} step={10}
                value={nozzleUm} onChange={e => onNozzleChange(parseInt(e.target.value, 10))}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-sm font-mono text-cyan-300 w-14 text-right">{nozzleUm}</span>
            </div>
          </Field>
          <Field label="Velocidade de impressão (mm/s)">
            <div className="flex items-center gap-2">
              <input
                type="range" min={1} max={60} step={1}
                value={printSpeedMmS} onChange={e => onPrintSpeedChange(parseInt(e.target.value, 10))}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-sm font-mono text-cyan-300 w-14 text-right">{printSpeedMmS}</span>
            </div>
          </Field>
        </div>
      </section>

      {/* Resultado reológico detalhado */}
      <section className={cn(
        "rounded-2xl border p-5",
        rheology.printability === "excellent" ? "bg-emerald-500/[0.04] border-emerald-500/20" :
        rheology.printability === "moderate"  ? "bg-amber-500/[0.04] border-amber-500/30" :
                                                 "bg-rose-500/[0.04] border-rose-500/30"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            {materialLabel} {concentration}% — propriedades reológicas
          </h3>
          <PrintabilityBadge p={rheology.printability} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <Stat label="Viscosidade η"   value={`${(rheology.viscosityPaS * 1000).toFixed(0)} mPa·s`} />
          <Stat label="Yield τ₀"         value={`${rheology.yieldStressPa.toFixed(1)} Pa`} />
          <Stat label="Módulo G' (elástico)"  value={`${rheology.gPrime.toFixed(0)} Pa`} />
          <Stat label="Módulo G'' (viscoso)"  value={`${(rheology.gPrime * 0.4).toFixed(0)} Pa`} />
          <Stat label="Shear rate γ̇"     value={`${rheology.shearRate.toFixed(1)} 1/s`} mono />
          <Stat label="Shear stress τ"   value={`${rheology.shearStressPa.toFixed(1)} Pa`} highlight={rheology.shearStressPa > 50} />
        </div>

        <div className="rounded-xl bg-white/3 border border-white/8 p-3 mb-3">
          <p className="text-xs text-gray-300 leading-relaxed">{rheology.recommendation}</p>
        </div>

        {rheology.warnings.length > 0 && (
          <div className="space-y-2">
            {rheology.warnings.map((w, i) => (
              <div key={i} className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-200/90">{w}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modelos CFD aplicáveis */}
      <section className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Modelos CFD aplicáveis
        </h3>
        <div className="space-y-1.5 text-xs">
          <ModelRow name="Herschel-Bulkley" formula="τ = τ₀ + K·γ̇ⁿ" detail="fluidos com yield stress (alginato, GelMA)" />
          <ModelRow name="Casson"            formula="√τ = √τ₀ + √(η∞·γ̇)" detail="biotintas fibrínicas e sangue" />
          <ModelRow name="Power Law (Cross)" formula="η = K·γ̇ⁿ⁻¹" detail="pseudoplásticos (n<1 = ideal)" />
          <ModelRow name="Hagen-Poiseuille"   formula="ΔP = 8ηLQ/πR⁴" detail="queda de pressão no bico" />
          <ModelRow name="Reynolds"           formula="Re < 1" detail="fluxo laminar (típico na bioimpressão)" />
        </div>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE UI
// ═══════════════════════════════════════════════════════════════════════════

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 block mb-1.5 font-medium">{label}</label>
      {children}
    </div>
  )
}

function Stat({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={cn(
        "text-sm font-semibold",
        mono && "font-mono text-xs",
        highlight ? "text-amber-300" : "text-white"
      )}>{value}</div>
    </div>
  )
}

function Pill({ color, title, value }: { color: "violet" | "amber" | "rose"; title: string; value: string }) {
  const c = {
    violet: "bg-violet-500/5 border-violet-500/20 text-violet-300",
    amber:  "bg-amber-500/5 border-amber-500/20 text-amber-300",
    rose:   "bg-rose-500/5 border-rose-500/20 text-rose-300",
  }[color]
  return (
    <div className={cn("rounded-xl border p-3", c)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 opacity-80">{title}</div>
      <div className="text-xs text-gray-200">{value}</div>
    </div>
  )
}

function PrintabilityBadge({ p }: { p: RheologyResult["printability"] }) {
  if (p === "excellent")
    return <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">✓ Imprimibilidade excelente</span>
  if (p === "moderate")
    return <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">⚠ Moderada</span>
  return <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">✗ Cisalhamento alto</span>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-gray-400">
      <span className="text-gray-500">{label}: </span>
      {value}
    </p>
  )
}

function ModelRow({ name, formula, detail }: { name: string; formula: string; detail: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="text-gray-300 font-medium min-w-[140px]">{name}</span>
      <span className="font-mono text-blue-300 text-[11px]">{formula}</span>
      <span className="text-gray-500 text-[11px]">— {detail}</span>
    </div>
  )
}

// ─── Helpers compartilhados com biomaterials antigo ───────────────────────

function formatComposition(c: string | CompositionJson | null | undefined): string {
  if (!c) return "—"
  if (typeof c === "string") return c
  const parts: string[] = []
  if (c.shortName) parts.push(String(c.shortName))
  if (c.family) parts.push(`família ${String(c.family)}`)
  if (c.modulus_kPa) parts.push(`módulo ${String(c.modulus_kPa)}`)
  if (c.poreSize_um) parts.push(`poros ${String(c.poreSize_um)}`)
  if (parts.length === 0) {
    return Object.entries(c).slice(0, 3).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? v.join("/") : String(v)}`
    ).join(" • ")
  }
  return parts.join(" • ")
}

function getConcentration(bm: Biomaterial): string {
  if (bm.concentration) return bm.concentration
  if (typeof bm.composition === "object" && bm.composition && "concentration" in bm.composition) {
    return String((bm.composition as Record<string, unknown>).concentration)
  }
  return "—"
}
