/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 — Formulador Profissional Pro
 *  ───────────────────────────────────────────────────────────────────────
 *  Permite ao usuário montar uma formulação multi-componente (catálogo OU
 *  custom), definir objetivo clínico, especificações viscoelásticas e
 *  receber análise científica completa da IA com:
 *    • Score multi-dimensional
 *    • Protocolo de preparação passo a passo
 *    • Alertas de incompatibilidade química
 *    • Parâmetros de bioimpressão
 *    • Considerações regulatórias (ISO/ANVISA)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FlaskConical, Sparkles, Plus, Trash2, Loader2, AlertTriangle,
  CheckCircle2, Info, Beaker, Target, ChevronRight, ChevronDown,
  Search, Wand2, Save, RefreshCw, Activity, ShieldCheck,
  BookOpen, Printer, Atom,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─────────────────────────────────────────────────────────────────────────
// TIPOS (espelham formulator-pro.ts)
// ─────────────────────────────────────────────────────────────────────────

type Role =
  | "STRUCTURAL" | "BIOACTIVE" | "RHEOLOGY" | "CROSSLINKER"
  | "POROGEN" | "ADDITIVE" | "SOLVENT"

type ClinicalGoal =
  | "WOUND_HEALING" | "BONE_REGENERATION" | "GINGIVAL_REGENERATION"
  | "CARTILAGE_REPAIR" | "BREAST_IMPLANT" | "VASCULAR_GRAFT"
  | "NEURAL_REGENERATION" | "DRUG_DELIVERY" | "ORGANOID_SCAFFOLD" | "GENERIC"

interface Component {
  id: string
  name: string
  concentration: string
  role?: Role
  catalogId?: string
  knownProps?: {
    family?: string
    modulusKPa?: number
    chargedAt7?: "anionic" | "cationic" | "neutral" | "amphoteric"
    notes?: string
  }
}

interface CatalogItem {
  id: string
  name: string
  category: string
}

interface ProFormulation {
  name: string
  goalCategory: ClinicalGoal
  rationale: string
  scientificScore: { overall: number; mechanical: number; biological: number; manufacturability: number; regulatory: number }
  components: Array<{ name: string; role: Role; concentration: string; rationale: string; safetyClass?: string }>
  crosslinking: { method: string; parameters: Record<string, string>; rationale: string }
  predictedProperties: Record<string, string | undefined>
  preparationProtocol: Array<{ step: number; title: string; description: string; timeMin?: number; temperature?: string; criticalPoint?: boolean }>
  warnings: Array<{ severity: "info" | "warning" | "critical"; type: string; message: string; suggestion?: string }>
  printingParameters?: Record<string, unknown>
  characterization: string[]
  regulatory: { estimatedClass: string; relevantStandards: string[]; notes: string }
  references: Array<{ doi?: string; title: string; year?: number }>
  alternatives?: Array<{ name: string; summary: string; swapFromOriginal: string; tradeoff: string }>
}

// ─────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE OBJETIVOS CLÍNICOS
// ─────────────────────────────────────────────────────────────────────────

const GOALS: Array<{ value: ClinicalGoal; label: string; emoji: string; hint: string }> = [
  { value: "WOUND_HEALING",         label: "Cicatrização cutânea",            emoji: "🩹", hint: "Hidrogel macio, exsudato, fatores de crescimento" },
  { value: "BONE_REGENERATION",     label: "Regeneração / diferenciação óssea", emoji: "🦴", hint: "Scaffold rígido, fase mineral, BMP-2" },
  { value: "GINGIVAL_REGENERATION", label: "Regeneração gengival / periodontal", emoji: "🦷", hint: "Membrana barreira reabsorvível" },
  { value: "CARTILAGE_REPAIR",      label: "Cartilagem articular",            emoji: "🔵", hint: "Viscoelástico, retenção de água" },
  { value: "BREAST_IMPLANT",        label: "Implante mamário elástico biodegradável", emoji: "💗", hint: "Elastômero biodegradável longo prazo" },
  { value: "VASCULAR_GRAFT",        label: "Enxerto vascular",                emoji: "🩸", hint: "Tubular, anti-trombogênico" },
  { value: "NEURAL_REGENERATION",   label: "Regeneração nervosa",             emoji: "🧠", hint: "Conduit alinhado, NGF" },
  { value: "DRUG_DELIVERY",         label: "Entrega controlada de fármaco",   emoji: "💊", hint: "Cinética de liberação otimizada" },
  { value: "ORGANOID_SCAFFOLD",     label: "Suporte para organoide",          emoji: "🧫", hint: "Hidrogel macio defined" },
  { value: "GENERIC",               label: "Outro / Genérico",                emoji: "🧪", hint: "Definir manualmente" },
]

const ROLES: Array<{ value: Role; label: string; color: string }> = [
  { value: "STRUCTURAL",  label: "Estrutural (backbone)",         color: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  { value: "BIOACTIVE",   label: "Bioativo (sinalização)",        color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  { value: "RHEOLOGY",    label: "Modificador reológico",         color: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  { value: "CROSSLINKER", label: "Reticulante",                   color: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  { value: "POROGEN",     label: "Gerador de poros",              color: "bg-rose-500/10 text-rose-300 border-rose-500/30" },
  { value: "ADDITIVE",    label: "Aditivo",                       color: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  { value: "SOLVENT",     label: "Solvente / tampão",             color: "bg-slate-500/10 text-slate-300 border-slate-500/30" },
]

const ROLE_COLOR = Object.fromEntries(ROLES.map(r => [r.value, r.color]))
const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]))

// ─────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────

export default function FormulatorProPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: objetivo
  const [goal, setGoal] = useState("")
  const [goalCategory, setGoalCategory] = useState<ClinicalGoal>("GENERIC")
  const [targetTissue, setTargetTissue] = useState("")

  // Step 2: componentes
  const [components, setComponents] = useState<Component[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [catalogQuery, setCatalogQuery] = useState("")
  const [showCatalog, setShowCatalog] = useState(false)

  // Step 3: especificações
  const [specs, setSpecs] = useState({
    targetModulusMin: "" as string,
    targetModulusMax: "" as string,
    porosityMin: "" as string,
    porosityMax: "" as string,
    poreSizeMin: "" as string,
    poreSizeMax: "" as string,
    degradationMin: "" as string,
    degradationMax: "" as string,
    swellingMin: "" as string,
    swellingMax: "" as string,
    viscoelastic: "any" as "elastic" | "viscoelastic" | "plastic" | "any",
    biodegradable: false,
    printable: false,
    cellLaden: false,
    sterilizable: false,
    transparent: false,
    injectable: false,
    pHMin: "" as string,
    pHMax: "" as string,
  })
  const [constraints, setConstraints] = useState({
    avoidAnimalDerived: false,
    avoidPhotoinitiator: false,
    fdaApprovedOnly: false,
    costSensitive: false,
    notes: "",
  })
  const [mode, setMode] = useState<"single" | "alternatives">("single")

  // Step 4: resultado
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProFormulation | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [expandedProtocol, setExpandedProtocol] = useState(true)

  // Buscar catálogo (lazy, quando abre)
  const loadCatalog = useCallback(async () => {
    try {
      const url = `/api/biomaterials?limit=100${catalogQuery ? `&search=${encodeURIComponent(catalogQuery)}` : ""}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCatalog(data.biomaterials)
      }
    } catch {
      /* no-op */
    }
  }, [catalogQuery])

  useEffect(() => {
    if (showCatalog) loadCatalog()
  }, [showCatalog, loadCatalog])

  // ─── Handlers ───────────────────────────────────────────────────────────
  const addComponent = (preset?: Partial<Component>) => {
    if (components.length >= 8) return
    setComponents(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        name: preset?.name ?? "",
        concentration: preset?.concentration ?? "",
        role: preset?.role,
        catalogId: preset?.catalogId,
      },
    ])
  }

  const updateComponent = (id: string, patch: Partial<Component>) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id))
  }

  const addFromCatalog = (item: CatalogItem) => {
    if (components.some(c => c.catalogId === item.id)) return
    addComponent({ name: item.name, catalogId: item.id })
    setShowCatalog(false)
  }

  // ─── Submit ─────────────────────────────────────────────────────────────
  const submit = async () => {
    setErrorMsg(null)
    if (!goal.trim() || components.length === 0) {
      setErrorMsg("Defina o objetivo e adicione ao menos 1 biomaterial.")
      return
    }
    setLoading(true)
    setResult(null)
    setStep(4)

    const range = (a: string, b: string) => {
      const min = a ? parseFloat(a) : undefined
      const max = b ? parseFloat(b) : undefined
      return min === undefined && max === undefined ? undefined : { min, max }
    }

    const payload = {
      goal,
      goalCategory,
      targetTissue: targetTissue || undefined,
      components: components.map(c => ({
        name: c.name.trim(),
        concentration: c.concentration?.trim() || undefined,
        role: c.role,
        catalogId: c.catalogId,
        knownProps: c.knownProps,
      })).filter(c => c.name.length > 0),
      specs: {
        targetModulusKPa: range(specs.targetModulusMin, specs.targetModulusMax),
        porosityPercent: range(specs.porosityMin, specs.porosityMax),
        poreSizeUm: range(specs.poreSizeMin, specs.poreSizeMax),
        degradationDays: range(specs.degradationMin, specs.degradationMax),
        swellingPercent: range(specs.swellingMin, specs.swellingMax),
        pHRange: range(specs.pHMin, specs.pHMax),
        viscoelasticBehavior: specs.viscoelastic === "any" ? undefined : specs.viscoelastic,
        biodegradable: specs.biodegradable || undefined,
        printable: specs.printable || undefined,
        cellLaden: specs.cellLaden || undefined,
        sterilizable: specs.sterilizable || undefined,
        transparent: specs.transparent || undefined,
        injectable: specs.injectable || undefined,
      },
      constraints: {
        avoidAnimalDerived: constraints.avoidAnimalDerived || undefined,
        avoidPhotoinitiator: constraints.avoidPhotoinitiator || undefined,
        fdaApprovedOnly: constraints.fdaApprovedOnly || undefined,
        costSensitive: constraints.costSensitive || undefined,
        notes: constraints.notes || undefined,
      },
      mode,
    }

    try {
      const res = await fetch("/api/biomaterials/formulate-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Falha ao gerar formulação.")
      } else {
        setResult(data)
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro inesperado.")
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1); setResult(null); setErrorMsg(null)
    setGoal(""); setTargetTissue(""); setGoalCategory("GENERIC")
    setComponents([])
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/5 shrink-0 bg-gradient-to-r from-blue-500/[0.04] to-purple-500/[0.04]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
              <Atom className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Formulador Profissional Pro
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded font-mono uppercase tracking-wide">v4.3</span>
              </h1>
              <p className="text-[11px] text-gray-400">
                Combine catálogo + biomateriais customizados • Análise científica com IA
              </p>
            </div>
          </div>
          {result && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova formulação</span>
            </button>
          )}
        </div>

        {/* Stepper */}
        {!result && (
          <div className="mt-4 flex items-center gap-1.5 sm:gap-3">
            {[
              { n: 1, label: "Objetivo" },
              { n: 2, label: "Componentes" },
              { n: 3, label: "Especificações" },
              { n: 4, label: "Resultado" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-1.5 sm:gap-3 flex-1">
                <button
                  onClick={() => !loading && setStep(s.n as 1 | 2 | 3 | 4)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all",
                    step === s.n
                      ? "bg-blue-500/20 border border-blue-500/40 text-blue-200"
                      : step > s.n
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      : "bg-white/5 border border-white/10 text-gray-500"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    step === s.n ? "bg-blue-500 text-white" : step > s.n ? "bg-emerald-500/40 text-emerald-200" : "bg-white/5"
                  )}>
                    {step > s.n ? <CheckCircle2 className="w-3 h-3" /> : s.n}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < 3 && <ChevronRight className="w-3 h-3 text-gray-700 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">

          {/* ════ STEP 1 — OBJETIVO ════ */}
          {step === 1 && !result && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.02] to-blue-500/[0.02] p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">1. Qual o objetivo da sua formulação?</h2>
                    <p className="text-[11px] text-gray-400">A IA usa templates científicos por categoria para guiar a análise.</p>
                  </div>
                </div>

                <label className="block mb-1.5 text-[11px] font-medium text-gray-400">Categoria clínica</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                  {GOALS.map(g => (
                    <button
                      key={g.value}
                      onClick={() => setGoalCategory(g.value)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all",
                        goalCategory === g.value
                          ? "border-blue-500/50 bg-blue-500/10 ring-2 ring-blue-500/20"
                          : "border-white/8 bg-white/[0.02] hover:border-white/20"
                      )}
                      title={g.hint}
                    >
                      <div className="text-lg mb-1">{g.emoji}</div>
                      <div className={cn("text-[10px] sm:text-[11px] font-medium leading-tight", goalCategory === g.value ? "text-blue-200" : "text-gray-300")}>
                        {g.label}
                      </div>
                    </button>
                  ))}
                </div>

                <label className="block mb-1.5 text-[11px] font-medium text-gray-400">Descrição livre do objetivo *</label>
                <textarea
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="Ex: Hidrogel injetável para regeneração de defeito gengival pós-extração de molar, com liberação de PDGF e degradação em 8 semanas."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
                />

                <label className="block mt-3 mb-1.5 text-[11px] font-medium text-gray-400">Tecido alvo (opcional)</label>
                <input
                  type="text"
                  value={targetTissue}
                  onChange={e => setTargetTissue(e.target.value)}
                  placeholder="ex: gengiva queratinizada, osso esponjoso da maxila, tecido mamário subcutâneo..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!goal.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo: Componentes <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 2 — COMPONENTES ════ */}
          {step === 2 && !result && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.02] to-purple-500/[0.02] p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Beaker className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      2. Quais biomateriais você quer usar? <span className="text-[10px] text-gray-500 font-normal">({components.length}/8)</span>
                    </h2>
                    <p className="text-[11px] text-gray-400">Adicione livremente — qualquer material (catálogo, custom, novo). A IA analisará incompatibilidades.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => addComponent()}
                    disabled={components.length >= 8}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/25 transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar custom
                  </button>
                  <button
                    onClick={() => setShowCatalog(!showCatalog)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/25 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" /> Buscar no catálogo BIA
                  </button>
                  <span className="text-[10px] text-gray-600 self-center ml-auto">
                    💡 Dica: misture catálogo + custom à vontade
                  </span>
                </div>

                {/* Catálogo dropdown */}
                {showCatalog && (
                  <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-3 max-h-72 overflow-y-auto">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="text"
                        value={catalogQuery}
                        onChange={e => setCatalogQuery(e.target.value)}
                        placeholder="Filtrar catálogo (ex: GelMA, alginato, PCL...)"
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {catalog.length === 0 ? (
                        <p className="text-xs text-gray-500 col-span-2 text-center py-4">
                          Nenhum biomaterial encontrado. Carregando…
                        </p>
                      ) : (
                        catalog.slice(0, 30).map(item => {
                          const already = components.some(c => c.catalogId === item.id)
                          return (
                            <button
                              key={item.id}
                              onClick={() => addFromCatalog(item)}
                              disabled={already}
                              className={cn(
                                "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs",
                                already
                                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 cursor-default"
                                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-blue-500/10 hover:border-blue-500/30"
                              )}
                            >
                              <span className="truncate">{item.name}</span>
                              {already
                                ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                                : <Plus className="w-3 h-3 shrink-0 opacity-50" />}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Lista componentes */}
                {components.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                    <FlaskConical className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 mb-1">Nenhum componente ainda</p>
                    <p className="text-xs text-gray-600">Adicione 1 a 8 biomateriais (catálogo ou customizados).</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {components.map((c, idx) => (
                      <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[10px] text-purple-200 font-bold shrink-0">
                            {idx + 1}
                          </div>
                          {c.catalogId ? (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-300 rounded font-mono">CATÁLOGO</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 text-purple-300 rounded font-mono">CUSTOM</span>
                          )}
                          <button
                            onClick={() => removeComponent(c.id)}
                            className="ml-auto w-7 h-7 rounded-lg hover:bg-rose-500/15 text-gray-500 hover:text-rose-300 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] text-gray-500 mb-0.5">Nome do biomaterial</label>
                            <input
                              type="text"
                              value={c.name}
                              onChange={e => updateComponent(c.id, { name: e.target.value })}
                              placeholder="ex: GelMA, Quitosana, Meu polímero X"
                              disabled={!!c.catalogId}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 disabled:opacity-70"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-gray-500 mb-0.5">Concentração</label>
                            <input
                              type="text"
                              value={c.concentration}
                              onChange={e => updateComponent(c.id, { concentration: e.target.value })}
                              placeholder="5% w/v"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-gray-500 mb-0.5">Papel funcional (opcional)</label>
                            <select
                              value={c.role ?? ""}
                              onChange={e => updateComponent(c.id, { role: (e.target.value || undefined) as Role | undefined })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500/40 cursor-pointer"
                            >
                              <option value="">— deixar IA decidir —</option>
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Custom only: known props */}
                        {!c.catalogId && (
                          <details className="mt-2 group">
                            <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-300 select-none">
                              + Adicionar propriedades conhecidas (família, módulo, carga, notas)
                            </summary>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              <input
                                type="text"
                                placeholder="Família (ex: polissacarídeo)"
                                value={c.knownProps?.family ?? ""}
                                onChange={e => updateComponent(c.id, { knownProps: { ...c.knownProps, family: e.target.value } })}
                                className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                              />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Módulo kPa"
                                value={c.knownProps?.modulusKPa ?? ""}
                                onChange={e => updateComponent(c.id, { knownProps: { ...c.knownProps, modulusKPa: e.target.value ? parseFloat(e.target.value) : undefined } })}
                                className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                              />
                              <select
                                value={c.knownProps?.chargedAt7 ?? ""}
                                onChange={e => updateComponent(c.id, { knownProps: { ...c.knownProps, chargedAt7: (e.target.value || undefined) as "anionic" | "cationic" | "neutral" | "amphoteric" | undefined } })}
                                className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-gray-300 focus:outline-none focus:border-blue-500/40"
                              >
                                <option value="">Carga em pH 7</option>
                                <option value="anionic">Aniônico</option>
                                <option value="cationic">Catiônico</option>
                                <option value="neutral">Neutro</option>
                                <option value="amphoteric">Anfotérico</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Notas"
                                value={c.knownProps?.notes ?? ""}
                                onChange={e => updateComponent(c.id, { knownProps: { ...c.knownProps, notes: e.target.value } })}
                                className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                              />
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={components.length === 0 || components.some(c => !c.name.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo: Especificações <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 3 — ESPECIFICAÇÕES ════ */}
          {step === 3 && !result && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.02] to-emerald-500/[0.02] p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">3. Especificações desejadas (todas opcionais)</h2>
                    <p className="text-[11px] text-gray-400">Quanto mais informação, melhor a IA otimiza. Deixe em branco para a IA decidir baseada no objetivo.</p>
                  </div>
                </div>

                {/* Ranges numéricos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <RangeField label="Módulo de Young (kPa)" hint="Ex: 8–15 para osso esponjoso humano"
                    minValue={specs.targetModulusMin} maxValue={specs.targetModulusMax}
                    onMin={v => setSpecs(s => ({ ...s, targetModulusMin: v }))}
                    onMax={v => setSpecs(s => ({ ...s, targetModulusMax: v }))} />
                  <RangeField label="Porosidade (%)" hint="Recomendado >70% para infiltração celular"
                    minValue={specs.porosityMin} maxValue={specs.porosityMax}
                    onMin={v => setSpecs(s => ({ ...s, porosityMin: v }))}
                    onMax={v => setSpecs(s => ({ ...s, porosityMax: v }))} />
                  <RangeField label="Tamanho de poros (µm)" hint="200–500 µm para osso, 50–150 para pele"
                    minValue={specs.poreSizeMin} maxValue={specs.poreSizeMax}
                    onMin={v => setSpecs(s => ({ ...s, poreSizeMin: v }))}
                    onMax={v => setSpecs(s => ({ ...s, poreSizeMax: v }))} />
                  <RangeField label="Degradação (dias)" hint="Tempo até 50% massa restante"
                    minValue={specs.degradationMin} maxValue={specs.degradationMax}
                    onMin={v => setSpecs(s => ({ ...s, degradationMin: v }))}
                    onMax={v => setSpecs(s => ({ ...s, degradationMax: v }))} />
                  <RangeField label="Swelling (%)" hint="% de absorção em equilíbrio"
                    minValue={specs.swellingMin} maxValue={specs.swellingMax}
                    onMin={v => setSpecs(s => ({ ...s, swellingMin: v }))}
                    onMax={v => setSpecs(s => ({ ...s, swellingMax: v }))} />
                  <RangeField label="pH" hint="7.4 fisiológico, 5.5 cutâneo"
                    minValue={specs.pHMin} maxValue={specs.pHMax}
                    onMin={v => setSpecs(s => ({ ...s, pHMin: v }))}
                    onMax={v => setSpecs(s => ({ ...s, pHMax: v }))} />
                </div>

                {/* Comportamento viscoelástico */}
                <div className="mb-4">
                  <label className="block text-[11px] text-gray-400 mb-1.5">Comportamento viscoelástico</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["any", "elastic", "viscoelastic", "plastic"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setSpecs(s => ({ ...s, viscoelastic: v }))}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                          specs.viscoelastic === v
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                            : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                        )}
                      >
                        {v === "any" ? "Sem preferência" : v === "elastic" ? "Elástico" : v === "viscoelastic" ? "Viscoelástico" : "Plástico"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Switches */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {[
                    { key: "biodegradable", label: "Biodegradável" },
                    { key: "printable", label: "Bioimprimível" },
                    { key: "cellLaden", label: "Cell-laden" },
                    { key: "injectable", label: "Injetável" },
                    { key: "sterilizable", label: "Esterilizável" },
                    { key: "transparent", label: "Transparente" },
                  ].map(s => (
                    <ToggleChip
                      key={s.key}
                      label={s.label}
                      checked={specs[s.key as keyof typeof specs] as boolean}
                      onChange={v => setSpecs(p => ({ ...p, [s.key]: v }))}
                    />
                  ))}
                </div>

                {/* Restrições */}
                <div className="rounded-xl bg-white/[0.02] border border-white/8 p-3">
                  <p className="text-[11px] font-medium text-gray-400 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Restrições éticas / regulatórias
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {[
                      { key: "avoidAnimalDerived", label: "Sem origem animal" },
                      { key: "avoidPhotoinitiator", label: "Sem fotoiniciador" },
                      { key: "fdaApprovedOnly", label: "Apenas FDA-cleared" },
                      { key: "costSensitive", label: "Custo sensível" },
                    ].map(s => (
                      <ToggleChip
                        key={s.key}
                        label={s.label}
                        checked={constraints[s.key as keyof typeof constraints] as boolean}
                        onChange={v => setConstraints(p => ({ ...p, [s.key]: v }))}
                        compact
                      />
                    ))}
                  </div>
                  <textarea
                    value={constraints.notes}
                    onChange={e => setConstraints(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Notas adicionais (ex: paciente alérgico a sulfato, compatibilidade com cimento ósseo X...)"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 resize-none"
                  />
                </div>

                {/* Modo */}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/8 p-3">
                  <div>
                    <p className="text-xs font-medium text-white">Gerar variantes alternativas?</p>
                    <p className="text-[10px] text-gray-500">Gera 2 alternativas adicionais com trade-offs (custa créditos extras na IA).</p>
                  </div>
                  <button
                    onClick={() => setMode(mode === "single" ? "alternatives" : "single")}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-all flex-shrink-0",
                      mode === "alternatives" ? "bg-purple-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                      mode === "alternatives" ? "left-5" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  onClick={submit}
                  disabled={loading || !goal.trim() || components.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:from-blue-400 hover:to-purple-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Formulando…</> : <><Wand2 className="w-4 h-4" /> Gerar Formulação Profissional</>}
                </button>
              </div>
            </div>
          )}

          {/* ════ STEP 4 — RESULTADO ════ */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              {loading && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-12 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 mb-4">
                    <Loader2 className="w-6 h-6 text-blue-300 animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">Analisando combinação…</p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Verificando incompatibilidades químicas, calculando propriedades preditas e gerando protocolo profissional.
                  </p>
                </div>
              )}

              {errorMsg && !loading && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-rose-200">Erro na formulação</p>
                    <p className="text-xs text-rose-300/80 mt-1">{errorMsg}</p>
                    <button onClick={() => setStep(3)} className="mt-3 text-xs text-rose-200 underline hover:text-white">
                      Voltar e ajustar
                    </button>
                  </div>
                </div>
              )}

              {result && !loading && (
                <ResultView result={result} expandedProtocol={expandedProtocol} setExpandedProtocol={setExpandedProtocol} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────────────────────

function RangeField({
  label, hint, minValue, maxValue, onMin, onMax,
}: {
  label: string; hint?: string
  minValue: string; maxValue: string
  onMin: (v: string) => void; onMax: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-[11px] text-gray-400 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="any"
          value={minValue}
          onChange={e => onMin(e.target.value)}
          placeholder="min"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40"
        />
        <span className="text-gray-600 text-xs">–</span>
        <input
          type="number"
          step="any"
          value={maxValue}
          onChange={e => onMax(e.target.value)}
          placeholder="max"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40"
        />
      </div>
      {hint && <p className="text-[10px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
  )
}

function ToggleChip({
  label, checked, onChange, compact,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; compact?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1.5",
        compact ? "px-2 py-1" : "px-3 py-2",
        checked
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
          : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
      )}
    >
      <div className={cn("w-3 h-3 rounded border flex items-center justify-center transition-all", checked ? "bg-emerald-500 border-emerald-500" : "border-white/30")}>
        {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
      </div>
      {label}
    </button>
  )
}

function ResultView({
  result, expandedProtocol, setExpandedProtocol,
}: {
  result: ProFormulation
  expandedProtocol: boolean
  setExpandedProtocol: (v: boolean) => void
}) {
  const score = result.scientificScore ?? { overall: 0, mechanical: 0, biological: 0, manufacturability: 0, regulatory: 0 }

  return (
    <div className="space-y-4">
      {/* Header da formulação */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <span className="text-[10px] text-blue-300 font-mono uppercase tracking-wide">Formulação gerada</span>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1 leading-tight">{result.name}</h2>
          </div>
          <ScoreBadge score={score.overall} />
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">{result.rationale}</p>

        {/* Sub-scores */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <SubScore label="Mecânico" value={score.mechanical} />
          <SubScore label="Biológico" value={score.biological} />
          <SubScore label="Manufatura" value={score.manufacturability} />
          <SubScore label="Regulatório" value={score.regulatory} />
        </div>
      </div>

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h3 className="text-xs font-semibold text-white mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" /> Análise de incompatibilidades & alertas ({result.warnings.length})
          </h3>
          <div className="space-y-2">
            {result.warnings.map((w, i) => (
              <div key={i} className={cn(
                "rounded-lg border p-2.5 flex items-start gap-2",
                w.severity === "critical" ? "border-rose-500/30 bg-rose-500/5"
                  : w.severity === "warning" ? "border-amber-500/30 bg-amber-500/5"
                  : "border-blue-500/30 bg-blue-500/5"
              )}>
                <div className={cn(
                  "w-5 h-5 rounded shrink-0 flex items-center justify-center mt-0.5",
                  w.severity === "critical" ? "bg-rose-500/20" : w.severity === "warning" ? "bg-amber-500/20" : "bg-blue-500/20"
                )}>
                  {w.severity === "info"
                    ? <Info className="w-3 h-3 text-blue-300" />
                    : <AlertTriangle className={cn("w-3 h-3", w.severity === "critical" ? "text-rose-300" : "text-amber-300")} />}
                </div>
                <div className="flex-1">
                  <p className={cn("text-xs font-medium", w.severity === "critical" ? "text-rose-200" : w.severity === "warning" ? "text-amber-200" : "text-blue-200")}>
                    [{w.type}] {w.message}
                  </p>
                  {w.suggestion && <p className="text-[11px] text-gray-400 mt-1">→ {w.suggestion}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Componentes finais */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
          <Beaker className="w-3.5 h-3.5 text-purple-300" /> Componentes da formulação ({result.components.length})
        </h3>
        <div className="space-y-2">
          {result.components.map((c, i) => (
            <div key={i} className="rounded-lg border border-white/8 bg-black/10 p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{c.name}</span>
                  <span className="text-xs text-blue-300 font-mono">{c.concentration}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", ROLE_COLOR[c.role] ?? "")}>
                    {ROLE_LABEL[c.role] ?? c.role}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">{c.rationale}</p>
              {c.safetyClass && (
                <p className="text-[10px] text-emerald-400/70 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {c.safetyClass}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Crosslinking */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
          <Atom className="w-3.5 h-3.5 text-amber-300" /> Método de Crosslinking
        </h3>
        <p className="text-sm text-amber-200 font-medium mb-1">{result.crosslinking?.method}</p>
        <p className="text-[11px] text-gray-400 mb-2">{result.crosslinking?.rationale}</p>
        {result.crosslinking?.parameters && Object.keys(result.crosslinking.parameters).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {Object.entries(result.crosslinking.parameters).map(([k, v]) => (
              <div key={k} className="rounded-md bg-amber-500/5 border border-amber-500/15 px-2 py-1">
                <p className="text-[9px] text-amber-400/70 uppercase">{k.replace(/_/g, " ")}</p>
                <p className="text-[11px] text-amber-200 font-mono">{String(v)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Propriedades preditas */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-300" /> Propriedades preditas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(result.predictedProperties ?? {}).filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-black/20 border border-white/8 p-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{labelize(k)}</p>
              <p className="text-xs text-white font-mono mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Protocolo */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => setExpandedProtocol(!expandedProtocol)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-300" /> Protocolo de preparação ({result.preparationProtocol?.length ?? 0} passos)
          </h3>
          <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", expandedProtocol && "rotate-180")} />
        </button>
        {expandedProtocol && (
          <div className="px-4 pb-4 space-y-2">
            {result.preparationProtocol?.map((p) => (
              <div key={p.step} className={cn(
                "rounded-lg border p-3 flex gap-3",
                p.criticalPoint ? "border-rose-500/30 bg-rose-500/5" : "border-white/8 bg-black/10"
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold",
                  p.criticalPoint ? "bg-rose-500/20 text-rose-200 border border-rose-500/30" : "bg-blue-500/15 text-blue-200 border border-blue-500/30"
                )}>
                  {p.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-white">{p.title}</p>
                    {p.criticalPoint && <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded font-mono">CCP</span>}
                    {p.timeMin !== undefined && <span className="text-[10px] text-gray-500">⏱ {p.timeMin} min</span>}
                    {p.temperature && <span className="text-[10px] text-gray-500">🌡 {p.temperature}</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bioimpressão */}
      {result.printingParameters && Object.keys(result.printingParameters).length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-cyan-300" /> Parâmetros de bioimpressão
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(result.printingParameters).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
              <div key={k} className="rounded-lg bg-black/20 border border-white/8 p-2">
                <p className="text-[10px] text-gray-500 uppercase">{labelize(k)}</p>
                <p className="text-xs text-cyan-200 font-mono mt-0.5">
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caracterização */}
      {result.characterization && result.characterization.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-purple-300" /> Caracterização recomendada
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.characterization.map((c, i) => (
              <span key={i} className="text-[11px] px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-200 rounded-md">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Regulatório */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
        <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Considerações regulatórias
        </h3>
        <p className="text-xs text-emerald-200 mb-1">
          <strong>Classe estimada:</strong> {result.regulatory?.estimatedClass}
        </p>
        {result.regulatory?.relevantStandards && result.regulatory.relevantStandards.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {result.regulatory.relevantStandards.map((s, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md font-mono">
                {s}
              </span>
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400">{result.regulatory?.notes}</p>
      </div>

      {/* Alternativas */}
      {result.alternatives && result.alternatives.length > 0 && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.03] p-4">
          <h3 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-purple-300" /> Alternativas ({result.alternatives.length})
          </h3>
          <div className="space-y-2">
            {result.alternatives.map((a, i) => (
              <div key={i} className="rounded-lg bg-black/20 border border-white/8 p-3">
                <p className="text-sm font-semibold text-white">{a.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">{a.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                  <span className="text-purple-300">↔ {a.swapFromOriginal}</span>
                  <span className="text-amber-300">⚖ trade-off: {a.tradeoff}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referências */}
      {result.references && result.references.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <h3 className="text-xs font-semibold text-white mb-2">Referências sugeridas</h3>
          <ul className="space-y-1.5">
            {result.references.map((r, i) => (
              <li key={i} className="text-[11px] text-gray-400">
                • {r.title} {r.year ? `(${r.year})` : ""} {r.doi && (
                  <a href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer"
                     className="text-blue-400 hover:text-blue-300 font-mono">{r.doi}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA salvar/exportar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${result.name.replace(/[^a-z0-9]+/gi, "_")}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
        >
          <Save className="w-3.5 h-3.5" /> Baixar JSON
        </button>
        <button
          onClick={() => {
            const txt = formatAsMarkdown(result)
            navigator.clipboard.writeText(txt)
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition-colors"
        >
          📋 Copiar Markdown
        </button>
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose"
  return (
    <div className={cn(
      "shrink-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center",
      color === "emerald" ? "border-emerald-500/40 bg-emerald-500/10"
      : color === "amber" ? "border-amber-500/40 bg-amber-500/10"
      : "border-rose-500/40 bg-rose-500/10"
    )}>
      <span className={cn(
        "text-2xl font-bold leading-none",
        color === "emerald" ? "text-emerald-300" : color === "amber" ? "text-amber-300" : "text-rose-300"
      )}>{score}</span>
      <span className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">Score</span>
    </div>
  )
}

function SubScore({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500"
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/8 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400">{label}</span>
        <span className="text-xs font-bold text-white">{pct}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function labelize(k: string): string {
  return k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, c => c.toUpperCase()).trim()
}

function formatAsMarkdown(r: ProFormulation): string {
  const lines: string[] = []
  lines.push(`# ${r.name}\n`)
  lines.push(`**Score: ${r.scientificScore.overall}/100**\n`)
  lines.push(`## Racional\n${r.rationale}\n`)
  lines.push(`## Componentes`)
  r.components.forEach(c => lines.push(`- **${c.name}** (${c.concentration}) — ${c.rationale}`))
  lines.push(`\n## Crosslinking\n${r.crosslinking?.method}\n`)
  lines.push(`## Protocolo`)
  r.preparationProtocol?.forEach(p => lines.push(`${p.step}. **${p.title}** — ${p.description}`))
  lines.push(`\n## Regulatório\n${r.regulatory?.estimatedClass} | ${r.regulatory?.relevantStandards?.join(", ")}`)
  return lines.join("\n")
}
