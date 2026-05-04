"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  FlaskConical, Search, Loader2, ChevronDown, ChevronUp,
  Filter, Sparkles, X, SlidersHorizontal, Atom, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// composition pode vir como string (legado) ou objeto JSON (novo catálogo de 31 biomateriais)
type CompositionJson = Record<string, unknown>
interface Biomaterial {
  id: string; name: string; category: string
  composition: string | CompositionJson
  concentration?: string; applications: string[]; biocompatibility: string
  gelTime?: string; crosslinking?: string
  tissueTypes?: string[]; tags?: string[]
}

interface FormulationResult {
  name: string; category: string; composition: string; concentration: string
  crosslinking?: string; mechanicalProps: Record<string, string>
  biologicalProps: Record<string, string>; applications: string[]
  preparation: string; considerations: string[]; references: string[]
}

// Enum do Prisma → label legível (em PT-BR)
const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "HYDROGEL",       label: "Hidrogel" },
  { value: "SCAFFOLD",       label: "Scaffold / Polímero" },
  { value: "BIOINK",         label: "Bioink Formulada" },
  { value: "COMPOSITE",      label: "Compósito (cerâmica/nano)" },
  { value: "DECELLULARIZED", label: "MEC Descelularizada" },
  { value: "COATING",        label: "Coating / Peptídeo" },
  { value: "MEMBRANE",       label: "Membrana" },
  { value: "NANOPARTICLE",   label: "Nanopartícula" },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
)

// Transforma o composition (string OU objeto JSON) em string legível
function formatComposition(c: string | CompositionJson | null | undefined): string {
  if (!c) return "—"
  if (typeof c === "string") return c
  // Composition rica do novo catálogo: destacamos os campos mais importantes
  const parts: string[] = []
  if (c.shortName) parts.push(String(c.shortName))
  if (c.family) parts.push(`família ${String(c.family)}`)
  if (c.modulus_kPa) parts.push(`módulo ${String(c.modulus_kPa)}`)
  if (c.poreSize_um) parts.push(`poros ${String(c.poreSize_um)}`)
  if (parts.length === 0) {
    // fallback: mostra primeiros 3 pares chave-valor
    return Object.entries(c).slice(0, 3).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? v.join("/") : String(v)}`
    ).join(" • ")
  }
  return parts.join(" • ")
}

// Extrai a concentração legível — prioriza campo explícito, senão olha composition.concentration
function getConcentration(bm: Biomaterial): string {
  if (bm.concentration) return bm.concentration
  if (typeof bm.composition === "object" && bm.composition && "concentration" in bm.composition) {
    return String(bm.composition.concentration)
  }
  return "—"
}

const CATEGORY_COLORS: Record<string, string> = {
  HYDROGEL:       "text-blue-400 bg-blue-500/10 border-blue-500/20",
  SCAFFOLD:       "text-purple-400 bg-purple-500/10 border-purple-500/20",
  BIOINK:         "text-teal-400 bg-teal-500/10 border-teal-500/20",
  COMPOSITE:      "text-amber-400 bg-amber-500/10 border-amber-500/20",
  DECELLULARIZED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  COATING:        "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  MEMBRANE:       "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  NANOPARTICLE:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
}

export default function BiomaterialsPage() {
  const [biomaterials, setBiomaterials] = useState<Biomaterial[]>([])
  const [total, setTotal]               = useState(0)
  const [search, setSearch]             = useState("")
  const [category, setCategory]         = useState("")
  const [loading, setLoading]           = useState(false)
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [showFilter, setShowFilter]     = useState(false)  // mobile filter drawer
  const [showFormulate, setShowFormulate] = useState(false)
  const [formulationForm, setFormulationForm] = useState({
    application: "", tissueType: "", biodegradable: false, printable: false, cellLaden: false,
  })
  const [formulating, setFormulating]     = useState(false)
  const [formulationResult, setFormulationResult] = useState<FormulationResult | null>(null)

  const loadBiomaterials = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (category) params.set("category", category)
      params.set("limit", "100")
      const res = await fetch(`/api/biomaterials?${params}`)
      if (res.ok) {
        const data = await res.json()
        setBiomaterials(data.biomaterials)
        setTotal(data.total)
      }
    } finally { setLoading(false) }
  }, [search, category])

  useEffect(() => {
    const t = setTimeout(loadBiomaterials, 300)
    return () => clearTimeout(t)
  }, [loadBiomaterials])

  async function formulateWithAI() {
    if (!formulationForm.application || !formulationForm.tissueType) return
    setFormulating(true); setFormulationResult(null)
    try {
      const res = await fetch("/api/biomaterials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formulationForm,
          requirements: {
            biodegradable: formulationForm.biodegradable,
            printable: formulationForm.printable,
            cellLaden: formulationForm.cellLaden,
          },
        }),
      })
      if (res.ok) setFormulationResult(await res.json())
      else { const e = await res.json(); alert(e.error) }
    } finally { setFormulating(false) }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="p-4 sm:p-5 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              Formulador Bio
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{total.toLocaleString("pt-BR")} formulações validadas</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/dashboard/formulator-pro"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-200 hover:from-purple-500/30 hover:to-blue-500/30 text-xs sm:text-sm font-medium transition-all active:scale-[0.98]"
              title="Versão profissional: multi-componente, custom + catálogo, análise científica completa"
            >
              <Atom className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Formulador </span>Pro
              <ArrowRight className="w-3 h-3 hidden sm:inline" />
            </Link>
            <button
              onClick={() => setShowFormulate(!showFormulate)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-all active:scale-[0.98]",
                showFormulate
                  ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">IA </span>Rápida
            </button>
          </div>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar biomaterial..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40 transition-colors"
            />
          </div>

          {/* Mobile: filter button */}
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={cn(
              "sm:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs transition-all",
              category
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                : "border-white/10 bg-white/5 text-gray-400"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Desktop: filter select */}
          <div className="relative hidden sm:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <select
              value={category} onChange={e => setCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-300 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/40"
            >
              <option value="">Todas categorias</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Mobile filter dropdown */}
        {showFilter && (
          <div className="sm:hidden mt-2 grid grid-cols-3 gap-1.5">
            <button
              onClick={() => { setCategory(""); setShowFilter(false) }}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                !category ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-white/8 text-gray-500"
              )}
            >
              Todas
            </button>
            {CATEGORIES.map(c => (
              <button key={c.value}
                onClick={() => { setCategory(c.value); setShowFilter(false) }}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                  category === c.value
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                    : "border-white/8 text-gray-500 hover:text-gray-300"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── AI Formulation panel ── */}
      {showFormulate && (
        <div className="border-b border-white/5 bg-blue-500/[0.03] shrink-0">
          <div className="p-4 sm:p-5">
            {!formulationResult ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    🧪 Formular Biomaterial com IA
                  </h3>
                  <button onClick={() => setShowFormulate(false)}
                    className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Aplicação clínica *</label>
                    <input
                      type="text" value={formulationForm.application}
                      onChange={e => setFormulationForm(p => ({ ...p, application: e.target.value }))}
                      placeholder="ex: Reparo de cartilagem articular"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Tipo de tecido *</label>
                    <input
                      type="text" value={formulationForm.tissueType}
                      onChange={e => setFormulationForm(p => ({ ...p, tissueType: e.target.value }))}
                      placeholder="ex: Cartilagem hialina"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-5 mb-4">
                  {[
                    { key: "biodegradable", label: "Biodegradável" },
                    { key: "printable", label: "Bioimprimível" },
                    { key: "cellLaden", label: "Cell-laden" },
                  ].map((req) => (
                    <label key={req.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formulationForm[req.key as keyof typeof formulationForm] as boolean}
                        onChange={e => setFormulationForm(p => ({ ...p, [req.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-500"
                      />
                      <span className="text-sm text-gray-300">{req.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={formulateWithAI}
                  disabled={formulating || !formulationForm.application || !formulationForm.tissueType}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  {formulating ? <><Loader2 className="w-4 h-4 animate-spin" /> Formulando...</> : <><Sparkles className="w-4 h-4" /> Gerar Formulação</>}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">✅ Formulação Gerada pela IA</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFormulationResult(null)}
                      className="text-xs text-gray-500 hover:text-gray-300 px-2.5 py-1 rounded-lg border border-white/10 transition-colors">
                      Nova formulação
                    </button>
                    <button onClick={() => setShowFormulate(false)}
                      className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">{formulationResult.name}</h4>
                    <span className={cn("text-xs px-2 py-1 rounded-lg border inline-block mb-3", CATEGORY_COLORS[formulationResult.category] ?? "text-gray-400")}>
                      {CATEGORY_LABELS[formulationResult.category] ?? formulationResult.category}
                    </span>
                    <p className="text-xs text-gray-300 mb-1"><strong className="text-gray-400">Composição:</strong> {formulationResult.composition}</p>
                    <p className="text-xs text-gray-300 mb-1"><strong className="text-gray-400">Concentração:</strong> {formulationResult.concentration}</p>
                    {formulationResult.crosslinking && (
                      <p className="text-xs text-gray-300 mb-3"><strong className="text-gray-400">Crosslinking:</strong> {formulationResult.crosslinking}</p>
                    )}
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Propriedades mecânicas</p>
                      {Object.entries(formulationResult.mechanicalProps).map(([k, v]) => (
                        <p key={k} className="text-xs text-gray-300"><span className="text-gray-500">{k}:</span> {v}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Preparação</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{formulationResult.preparation.substring(0, 300)}...</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Considerações</p>
                      <ul className="space-y-1">
                        {formulationResult.considerations.slice(0, 3).map((c, i) => (
                          <li key={i} className="text-xs text-amber-300/70 flex items-start gap-1">
                            <span className="text-amber-500 shrink-0">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Biomaterials grid ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
          </div>
        ) : biomaterials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FlaskConical className="w-8 h-8 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">Nenhum biomaterial encontrado</p>
            <p className="text-xs text-gray-600 mt-1">Tente um termo diferente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {biomaterials.map((bm) => (
              <div key={bm.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all">
                <button
                  onClick={() => setExpanded(expanded === bm.id ? null : bm.id)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-start gap-3 active:scale-[0.99]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-medium text-white leading-tight">{bm.name}</p>
                      {expanded === bm.id
                        ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                        : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      }
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-md border inline-block mt-1.5", CATEGORY_COLORS[bm.category] ?? "text-gray-400")}>
                      {CATEGORY_LABELS[bm.category] ?? bm.category}
                    </span>
                  </div>
                </button>

                {expanded === bm.id && (
                  <div className="px-3.5 sm:px-4 pb-4 border-t border-white/5 pt-3 space-y-1.5">
                    <InfoRow label="Composição" value={formatComposition(bm.composition)} />
                    <InfoRow label="Concentração" value={getConcentration(bm)} />
                    {bm.crosslinking && <InfoRow label="Crosslinking" value={bm.crosslinking} />}
                    {bm.gelTime && <InfoRow label="Gel time" value={bm.gelTime} />}
                    {bm.biocompatibility && <InfoRow label="Biocompat." value={bm.biocompatibility} />}
                    {bm.applications?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {bm.applications.slice(0, 4).map((app, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 rounded-md text-gray-400">
                            {app}
                          </span>
                        ))}
                      </div>
                    )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-gray-400">
      <span className="text-gray-500">{label}: </span>{value}
    </p>
  )
}
