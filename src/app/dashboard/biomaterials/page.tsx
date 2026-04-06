"use client"

import { useState, useEffect, useCallback } from "react"
import { FlaskConical, Search, Loader2, ChevronDown, ChevronUp, Filter, Sparkles } from "lucide-react"

interface Biomaterial {
  id: string
  name: string
  category: string
  composition: string
  concentration: string
  applications: string[]
  biocompatibility: string
  gelTime?: string
  crosslinking?: string
}

interface FormulationResult {
  name: string
  category: string
  composition: string
  concentration: string
  crosslinking?: string
  mechanicalProps: Record<string, string>
  biologicalProps: Record<string, string>
  applications: string[]
  preparation: string
  considerations: string[]
  references: string[]
}

const CATEGORIES = ["Hidrogel", "Polímero Sintético", "Matriz Natural", "Compósito", "Bioink"]

export default function BiomaterialsPage() {
  const [biomaterials, setBiomaterials] = useState<Biomaterial[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Formulação com IA
  const [showFormulate, setShowFormulate] = useState(false)
  const [formulationForm, setFormulationForm] = useState({
    application: "",
    tissueType: "",
    biodegradable: false,
    printable: false,
    cellLaden: false,
  })
  const [formulating, setFormulating] = useState(false)
  const [formulationResult, setFormulationResult] = useState<FormulationResult | null>(null)

  const loadBiomaterials = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (category) params.set("category", category)
      params.set("limit", "30")
      const res = await fetch(`/api/biomaterials?${params}`)
      if (res.ok) {
        const data = await res.json()
        setBiomaterials(data.biomaterials)
        setTotal(data.total)
      }
    } finally { setLoading(false) }
  }, [search, category])

  useEffect(() => {
    const timer = setTimeout(loadBiomaterials, 300)
    return () => clearTimeout(timer)
  }, [loadBiomaterials])

  async function formulateWithAI() {
    if (!formulationForm.application || !formulationForm.tissueType) return
    setFormulating(true)
    setFormulationResult(null)
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
      if (res.ok) {
        setFormulationResult(await res.json())
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } finally { setFormulating(false) }
  }

  const CATEGORY_COLORS: Record<string, string> = {
    HYDROGEL: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    SYNTHETIC_POLYMER: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    NATURAL_MATRIX: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    COMPOSITE: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    BIOINK: "text-teal-400 bg-teal-500/10 border-teal-500/20",
  }

  return (
    <div className="flex h-full">
      {/* Lista de biomateriais */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-blue-400" />
                Formulário de Biomateriais
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{total.toLocaleString("pt-BR")} formulações validadas</p>
            </div>
            <button
              onClick={() => setShowFormulate(!showFormulate)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Formular com IA
              <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded-md">10 créditos</span>
            </button>
          </div>

          {/* Busca e filtros */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, composição ou aplicação..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-300 appearance-none cursor-pointer focus:outline-none focus:border-blue-500/40"
              >
                <option value="">Todas categorias</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Formulação com IA */}
        {showFormulate && (
          <div className="border-b border-white/5 p-6 bg-blue-500/3">
            {!formulationResult ? (
              <div>
                <h3 className="text-sm font-semibold text-white mb-4">🧪 Formular Biomaterial Ideal com IA</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Aplicação clínica</label>
                    <input
                      type="text"
                      value={formulationForm.application}
                      onChange={e => setFormulationForm(prev => ({ ...prev, application: e.target.value }))}
                      placeholder="ex: Reparo de cartilagem articular"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Tipo de tecido</label>
                    <input
                      type="text"
                      value={formulationForm.tissueType}
                      onChange={e => setFormulationForm(prev => ({ ...prev, tissueType: e.target.value }))}
                      placeholder="ex: Cartilagem hialina"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/40"
                    />
                  </div>
                </div>
                <div className="flex gap-6 mb-4">
                  {[
                    { key: "biodegradable", label: "Biodegradável" },
                    { key: "printable", label: "Imprimível (Bioink)" },
                    { key: "cellLaden", label: "Cell-laden" },
                  ].map((req) => (
                    <label key={req.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formulationForm[req.key as keyof typeof formulationForm] as boolean}
                        onChange={e => setFormulationForm(prev => ({ ...prev, [req.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-500"
                      />
                      <span className="text-sm text-gray-300">{req.label}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={formulateWithAI}
                  disabled={formulating || !formulationForm.application || !formulationForm.tissueType}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-colors disabled:opacity-50"
                >
                  {formulating ? <><Loader2 className="w-4 h-4 animate-spin" /> Formulando...</> : <><Sparkles className="w-4 h-4" /> Gerar Formulação</>}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">✅ Formulação Gerada pela IA</h3>
                  <button onClick={() => setFormulationResult(null)} className="text-xs text-gray-500 hover:text-gray-300">
                    Nova formulação
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">{formulationResult.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${CATEGORY_COLORS[formulationResult.category] ?? "text-gray-400"}`}>
                      {formulationResult.category}
                    </span>
                    <p className="text-sm text-gray-300 mt-3"><strong className="text-gray-400">Composição:</strong> {formulationResult.composition}</p>
                    <p className="text-sm text-gray-300 mt-1"><strong className="text-gray-400">Concentração:</strong> {formulationResult.concentration}</p>
                    {formulationResult.crosslinking && (
                      <p className="text-sm text-gray-300 mt-1"><strong className="text-gray-400">Crosslinking:</strong> {formulationResult.crosslinking}</p>
                    )}
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Propriedades mecânicas</p>
                      {Object.entries(formulationResult.mechanicalProps).map(([k, v]) => (
                        <p key={k} className="text-xs text-gray-300"><span className="text-gray-500">{k}:</span> {v}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Preparação</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{formulationResult.preparation.substring(0, 300)}...</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Considerações</p>
                      <ul className="space-y-0.5">
                        {formulationResult.considerations.slice(0, 3).map((c, i) => (
                          <li key={i} className="text-xs text-amber-300/70 flex items-start gap-1">
                            <span className="text-amber-500 shrink-0">•</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grid de biomateriais */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {biomaterials.map((bm) => (
                <div
                  key={bm.id}
                  className="rounded-xl border border-white/5 bg-white/2 hover:border-white/10 transition-all"
                >
                  <button
                    onClick={() => setExpanded(expanded === bm.id ? null : bm.id)}
                    className="w-full p-4 text-left flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">{bm.name}</p>
                        {expanded === bm.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border inline-block mt-1 ${CATEGORY_COLORS[bm.category] ?? "text-gray-400"}`}>
                        {bm.category}
                      </span>
                    </div>
                  </button>

                  {expanded === bm.id && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                      <p className="text-xs text-gray-400"><span className="text-gray-500">Composição: </span>{bm.composition}</p>
                      <p className="text-xs text-gray-400"><span className="text-gray-500">Concentração: </span>{bm.concentration}</p>
                      {bm.crosslinking && <p className="text-xs text-gray-400"><span className="text-gray-500">Crosslinking: </span>{bm.crosslinking}</p>}
                      {bm.gelTime && <p className="text-xs text-gray-400"><span className="text-gray-500">Gel time: </span>{bm.gelTime}</p>}
                      {bm.biocompatibility && <p className="text-xs text-gray-400"><span className="text-gray-500">Biocompat.: </span>{bm.biocompatibility}</p>}
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
    </div>
  )
}
