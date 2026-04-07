"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Microscope, FlaskConical, Dna, Activity, Heart, FileSearch,
  ClipboardList, ShieldCheck, Plus, Loader2, Zap, Download,
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, RefreshCw,
  X, Clock, Sparkles, Lock, BookOpen, Beaker, TestTube,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Analysis {
  id: string
  title: string
  type: string
  typeName: string
  content?: string
  description?: string
  creditsUsed: number
  createdAt: string
}

// ─── Analysis categories ──────────────────────────────────────────────────────
const ANALYSIS_CATEGORIES = [
  {
    group: "Análises Laboratoriais",
    color: "violet",
    items: [
      { value: "MOLECULAR",    label: "Molecular",     icon: Dna,          color: "violet",  credits: 12, plan: "ADVANCED",  desc: "qRT-PCR, Western Blot, RNA-seq, ELISA, proteômica" },
      { value: "BIOCHEMICAL",  label: "Bioquímica",    icon: FlaskConical, color: "blue",    credits: 10, plan: "ADVANCED",  desc: "FTIR, NMR, GPC, TGA, DSC, MTS/CCK-8, LDH" },
      { value: "CELLULAR",     label: "Celular",       icon: Microscope,   color: "emerald", credits: 10, plan: "ADVANCED",  desc: "Viabilidade, proliferação, morfologia, MEV, confocal" },
      { value: "IN_VITRO",     label: "In Vitro",      icon: TestTube,     color: "cyan",    credits: 12, plan: "ADVANCED",  desc: "ISO 10993, biocompatibilidade, degradação, diferenciação" },
    ],
  },
  {
    group: "Estudos Pré-Clínicos e Clínicos",
    color: "purple",
    items: [
      { value: "IN_VIVO",      label: "In Vivo",       icon: Activity,     color: "amber",   credits: 20, plan: "ENTERPRISE", desc: "Modelos roedores/lagomorfos, histologia, microCT, biomecânica" },
      { value: "PRECLINICAL",  label: "Pré-Clínico",   icon: Beaker,       color: "orange",  credits: 20, plan: "ENTERPRISE", desc: "Pacote ISO 10993 completo, genotoxicidade, toxicologia" },
      { value: "CLINICAL",     label: "Ensaio Clínico",icon: Heart,        color: "rose",    credits: 20, plan: "ENTERPRISE", desc: "Design fase I/II/III, cálculo amostral, CONEP/ANVISA" },
    ],
  },
  {
    group: "Dossiês Regulatórios",
    color: "indigo",
    items: [
      { value: "REG_POP",      label: "POP Regulatório",     icon: ClipboardList, color: "indigo", credits: 12, plan: "ADVANCED",  desc: "Procedimento Operacional Padrão — formato GMP/ANVISA" },
      { value: "REG_510K",     label: "Dossiê FDA 510(k)",   icon: ShieldCheck,   color: "blue",   credits: 20, plan: "ENTERPRISE", desc: "Preenchimento completo 510(k)/De Novo para FDA" },
      { value: "REG_ANVISA",   label: "Dossiê ANVISA",       icon: ShieldCheck,   color: "green",  credits: 20, plan: "ENTERPRISE", desc: "RDC 185/2010, RDC 204/2017 — registro completo" },
      { value: "REG_CTD",      label: "Dossiê CTD/EMA",      icon: BookOpen,      color: "purple", credits: 20, plan: "ENTERPRISE", desc: "Common Technical Document — Módulos 1-5 completos" },
      { value: "REG_DOSSIER",  label: "Dossiê Integrado",    icon: FileSearch,    color: "violet", credits: 20, plan: "ENTERPRISE", desc: "FDA + ANVISA + EMA — estratégia regulatória global" },
    ],
  },
]

const ALL_TYPES = ANALYSIS_CATEGORIES.flatMap(cat => cat.items)

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  badge: "bg-violet-500/15 text-violet-300"  },
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    badge: "bg-blue-500/15 text-blue-300"    },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-300" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    badge: "bg-cyan-500/15 text-cyan-300"    },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-300"   },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/20",  text: "text-orange-400",  badge: "bg-orange-500/15 text-orange-300"  },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-400",    badge: "bg-rose-500/15 text-rose-300"    },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  text: "text-indigo-400",  badge: "bg-indigo-500/15 text-indigo-300"  },
  green:   { bg: "bg-green-500/10",   border: "border-green-500/20",   text: "text-green-400",   badge: "bg-green-500/15 text-green-300"   },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400",  badge: "bg-purple-500/15 text-purple-300"  },
}

const PLAN_BADGE_COLORS: Record<string, string> = {
  ADVANCED:   "bg-blue-500/10 border-blue-500/25 text-blue-400",
  ENTERPRISE: "bg-purple-500/10 border-purple-500/25 text-purple-400",
  ACADEMY:    "bg-amber-500/10 border-amber-500/25 text-amber-400",
}

function typeColor(type: string) {
  const t = ALL_TYPES.find(a => a.value === type)
  return TYPE_COLORS[t?.color ?? "violet"] ?? TYPE_COLORS.violet
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalysesPage() {
  const [analyses, setAnalyses]   = useState<Analysis[]>([])
  const [loading, setLoading]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected]   = useState<Analysis | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showList, setShowList]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  const [form, setForm] = useState({
    type: "MOLECULAR",
    title: "",
    context: "",
    objective: "",
    material: "",
    tissueType: "",
    species: "",
    regulatoryTarget: "",
  })

  const selectedTypeConfig = ALL_TYPES.find(t => t.value === form.type)

  // ── Load analyses ──────────────────────────────────────────────────────────
  const loadAnalyses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analyses")
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 401) setError("Sessão expirada — faça login novamente.")
        else setError(data.error ?? "Erro ao carregar análises")
        return
      }
      const data = await res.json()
      setAnalyses(Array.isArray(data) ? data : [])
    } catch {
      setError("Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAnalyses() }, [loadAnalyses])

  // ── Load full content ──────────────────────────────────────────────────────
  async function loadContent(a: Analysis) {
    if (a.content) { setSelected(a); return }
    setLoadingContent(true)
    try {
      const res = await fetch(`/api/analyses?id=${a.id}`)
      if (res.ok) {
        const full = await res.json()
        setSelected(full)
        setAnalyses(prev => prev.map(aa => aa.id === full.id ? { ...aa, content: full.content } : aa))
      }
    } catch { setSelected(a) }
    finally { setLoadingContent(false) }
  }

  // ── Generate analysis ──────────────────────────────────────────────────────
  async function generateAnalysis() {
    setError(null)
    setSuccess(null)
    if (!form.title.trim()) { setError("Preencha o título."); return }
    if (form.context.trim().length < 20) { setError("Descreva o contexto (mínimo 20 caracteres)."); return }

    setGenerating(true)
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setError(`⚠️ Plano insuficiente. Esta análise requer ${data.requiredPlan}. Faça upgrade em Assinatura.`)
        } else if (res.status === 402) {
          setError(`Créditos insuficientes. ${data.error}`)
        } else if (res.status === 401) {
          setError("Sessão expirada — faça login novamente.")
        } else {
          setError(data.error ?? "Erro ao gerar análise.")
        }
        return
      }

      setAnalyses(prev => [data, ...prev])
      setSelected(data)
      setShowCreate(false)
      setShowList(false)
      setForm({ type: "MOLECULAR", title: "", context: "", objective: "", material: "", tissueType: "", species: "", regulatoryTarget: "" })
      setSuccess(`✅ ${data.typeName} gerada com sucesso!`)
      setTimeout(() => setSuccess(null), 5000)
    } catch {
      setError("Erro de conexão.")
    } finally {
      setGenerating(false)
    }
  }

  // ── Download ──────────────────────────────────────────────────────────────
  function downloadAnalysis(a: Analysis) {
    const md = `# ${a.title}\n\n**Tipo:** ${a.typeName}\n**Gerado em:** ${new Date(a.createdAt).toLocaleDateString("pt-BR")}\n**Créditos usados:** ${a.creditsUsed}\n\n---\n\n${a.content ?? ""}`
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const anchor = document.createElement("a")
    anchor.href = URL.createObjectURL(blob)
    anchor.download = `${a.title.replace(/\s+/g, "_")}_BIA_v4.md`
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-[#0d0d1a]">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-72 lg:w-80 border-r border-white/[0.06] bg-black/20 flex-col shrink-0">
        <AnalysesList
          analyses={analyses} loading={loading} selected={selected}
          onSelect={loadContent}
          onNew={() => { setShowCreate(true); setSelected(null) }}
          onRefresh={loadAnalyses}
        />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {showList && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowList(false)} />
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[88vw] bg-[#0d0720] border-r border-white/[0.08] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <span className="font-semibold text-white text-sm">Análises</span>
              <button onClick={() => setShowList(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06]">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <AnalysesList
              analyses={analyses} loading={loading} selected={selected}
              onSelect={(a) => { loadContent(a); setShowList(false) }}
              onNew={() => { setShowCreate(true); setSelected(null); setShowList(false) }}
              onRefresh={loadAnalyses}
              compact
            />
          </div>
        </>
      )}

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          <button onClick={() => setShowList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] text-gray-400 text-xs font-medium">
            <Microscope className="w-3.5 h-3.5" />
            Análises ({analyses.length})
          </button>
          <button onClick={() => { setShowCreate(true); setSelected(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/80 text-white text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Nova
          </button>
        </div>

        {/* Alerts */}
        <div className="shrink-0 px-4 sm:px-6">
          {error && (
            <div className="mt-3 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}
          {success && (
            <div className="mt-3 flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ── CREATE FORM ──────────────────────────────────────────────── */}
          {showCreate && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white">Nova Análise / Dossiê</h2>
                  <p className="text-xs text-gray-400">IA BIA gera análise científica especializada com protocolos, controles e referências</p>
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">Tipo de Análise / Documento *</label>
                {ANALYSIS_CATEGORIES.map(cat => (
                  <div key={cat.group} className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1.5">{cat.group}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {cat.items.map(item => {
                        const c = TYPE_COLORS[item.color] ?? TYPE_COLORS.violet
                        const sel = form.type === item.value
                        return (
                          <button key={item.value}
                            onClick={() => setForm(f => ({ ...f, type: item.value }))}
                            className={cn(
                              "flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all",
                              sel ? `${c.bg} ${c.border}` : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                            )}>
                            <div className="flex items-center justify-between w-full gap-1">
                              <div className="flex items-center gap-1.5">
                                <item.icon className={cn("w-3.5 h-3.5", sel ? c.text : "text-gray-500")} />
                                <span className={cn("text-xs font-semibold", sel ? "text-white" : "text-gray-400")}>{item.label}</span>
                              </div>
                              {item.plan !== "ADVANCED" && (
                                <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", PLAN_BADGE_COLORS[item.plan] ?? "")}>
                                  {item.plan === "ENTERPRISE" ? "ENT" : item.plan}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-600 leading-tight">{item.desc}</span>
                            <span className={cn("text-[9px] font-semibold", sel ? c.text : "text-gray-600")}>
                              {item.credits} créditos
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Título da Análise *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={
                    form.type === "REG_POP" ? "ex: POP-001 — Síntese de GelMA 8% para bioimpressão" :
                    form.type.startsWith("REG_") ? "ex: Dossiê Regulatório — Qmatrix Scaffold Ósseo" :
                    "ex: Análise de citotoxicidade do GelMA 10% em células MSC"
                  }
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Context */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                  Contexto e Objetivo * <span className="text-gray-600">(quanto mais detalhe, melhor o resultado)</span>
                </label>
                <textarea
                  value={form.context}
                  onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                  rows={4}
                  placeholder={
                    form.type === "MOLECULAR" ? "Descreva: qual gene/proteína analisar, tipo celular, condição experimental, hipótese científica..." :
                    form.type === "IN_VIVO" ? "Descreva: espécie, modelo cirúrgico, duração, endpoints, aprovação CEUA existente..." :
                    form.type.startsWith("REG_") ? "Descreva: nome do produto, composição, indicação de uso, classificação desejada, dados disponíveis..." :
                    "Descreva o objetivo, material em estudo, tipo celular, condições experimentais, equipamentos disponíveis..."
                  }
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
                <p className="text-[10px] text-gray-600 mt-1">{form.context.length}/2000</p>
              </div>

              {/* Optional extras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["IN_VITRO", "BIOCHEMICAL", "CELLULAR", "MOLECULAR", "PRECLINICAL"].includes(form.type) && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Material/Biomaterial</label>
                    <input
                      value={form.material}
                      onChange={e => setForm(f => ({ ...f, material: e.target.value }))}
                      placeholder="ex: GelMA 10%, alginato 2%, PCL scaffold"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}
                {["MOLECULAR", "CELLULAR", "IN_VITRO", "BIOCHEMICAL", "PRECLINICAL"].includes(form.type) && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tecido/Órgão Alvo</label>
                    <input
                      value={form.tissueType}
                      onChange={e => setForm(f => ({ ...f, tissueType: e.target.value }))}
                      placeholder="ex: cartilagem, osso, pele, neural"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}
                {["IN_VIVO", "PRECLINICAL"].includes(form.type) && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Espécie Animal</label>
                    <input
                      value={form.species}
                      onChange={e => setForm(f => ({ ...f, species: e.target.value }))}
                      placeholder="ex: Rattus norvegicus, camundongo C57BL/6"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}
                {form.type.startsWith("REG_") && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Agência Regulatória Alvo</label>
                    <select
                      value={form.regulatoryTarget}
                      onChange={e => setForm(f => ({ ...f, regulatoryTarget: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    >
                      <option value="">Selecione...</option>
                      <option value="FDA">FDA (EUA)</option>
                      <option value="ANVISA">ANVISA (Brasil)</option>
                      <option value="EMA">EMA (Europa)</option>
                      <option value="FDA+ANVISA">FDA + ANVISA</option>
                      <option value="Todos">FDA + ANVISA + EMA</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Objetivo Específico (opcional)</label>
                  <input
                    value={form.objective}
                    onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                    placeholder="ex: validar para GMP, publicação paper, submissão regulatória"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Info box */}
              <div className={cn(
                "border rounded-xl p-3 flex gap-3",
                selectedTypeConfig?.plan === "ENTERPRISE"
                  ? "bg-purple-500/[0.05] border-purple-500/15"
                  : "bg-violet-500/[0.05] border-violet-500/15"
              )}>
                <Sparkles className={cn("w-4 h-4 shrink-0 mt-0.5", selectedTypeConfig?.plan === "ENTERPRISE" ? "text-purple-400" : "text-violet-400")} />
                <div>
                  <p className="text-xs text-gray-300 leading-relaxed mb-1">
                    A IA BIA gerará um documento científico completo com protocolo detalhado,
                    controles, análise estatística e referências DOI atualizadas (2022-2026).
                  </p>
                  <p className="text-xs">
                    <span className={cn("font-bold", selectedTypeConfig?.plan === "ENTERPRISE" ? "text-purple-300" : "text-violet-300")}>
                      Custo: {selectedTypeConfig?.credits ?? 12} créditos
                    </span>
                    {selectedTypeConfig && selectedTypeConfig.plan !== "ADVANCED" && (
                      <span className="ml-2 text-gray-500">
                        · Requer plano {selectedTypeConfig.plan}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Enterprise notice */}
              {selectedTypeConfig?.plan === "ENTERPRISE" && (
                <div className="flex items-start gap-2.5 bg-purple-500/[0.06] border border-purple-500/20 rounded-xl p-3">
                  <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-300">
                    Esta análise está disponível a partir do plano <strong>Enterprise (R$ 990/mês)</strong>.
                    Acesse em <strong>Assinatura → Upgrade</strong>.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={generateAnalysis}
                disabled={generating || !form.title.trim() || form.context.trim().length < 20}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]",
                  selectedTypeConfig?.plan === "ENTERPRISE"
                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                    : "bg-violet-600 hover:bg-violet-500 text-white"
                )}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando análise científica com BIA...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Gerar {selectedTypeConfig?.label ?? "Análise"} ({selectedTypeConfig?.credits ?? 12} créditos)
                  </>
                )}
              </button>

              {generating && (
                <div className="text-center">
                  <p className="text-xs text-gray-500">Analisando e gerando documento completo — pode levar 30–60 segundos...</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ANALYSIS VIEWER ────────────────────────────────────────── */}
          {!showCreate && selected && (
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", typeColor(selected.type).badge)}>
                      {selected.typeName ?? selected.type}
                    </span>
                    <span className="text-[10px] text-gray-500">{selected.creditsUsed} créditos</span>
                    <span className="text-[10px] text-gray-600">
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {new Date(selected.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-snug">{selected.title}</h2>
                </div>
                <button
                  onClick={() => downloadAnalysis(selected)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/20 transition-all shrink-0">
                  <Download className="w-3.5 h-3.5" /> Baixar .md
                </button>
              </div>

              {loadingContent ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-400 mx-auto animate-spin mb-2" />
                  <p className="text-sm text-gray-400">Carregando...</p>
                </div>
              ) : selected.content ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-6">
                  <AnalysisContent content={selected.content} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Microscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Conteúdo não disponível</p>
                  <button onClick={() => loadContent(selected)} className="mt-2 text-xs text-violet-400 hover:underline">Carregar</button>
                </div>
              )}
            </div>
          )}

          {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
          {!showCreate && !selected && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                <Microscope className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                {analyses.length === 0 ? "Análises e Dossiês" : "Selecione uma análise"}
              </h3>
              <p className="text-sm text-gray-500 mb-5 max-w-md">
                {analyses.length === 0
                  ? "Gere protocolos de análise molecular, bioquímica, celular, ensaios in vitro/vivo e dossiês regulatórios completos (FDA, ANVISA, EMA) com IA científica BIA."
                  : "Escolha uma análise na lista ou crie uma nova."}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all mb-6">
                <Plus className="w-4 h-4" />
                Nova Análise / Dossiê
              </button>

              {/* Quick grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl w-full">
                {ALL_TYPES.slice(0, 8).map(item => {
                  const c = TYPE_COLORS[item.color] ?? TYPE_COLORS.violet
                  return (
                    <button key={item.value}
                      onClick={() => { setForm(f => ({ ...f, type: item.value })); setShowCreate(true) }}
                      className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:scale-105 relative", c.bg, c.border)}>
                      <item.icon className={cn("w-5 h-5", c.text)} />
                      <span className="text-[10px] font-semibold text-gray-300 leading-tight">{item.label}</span>
                      {item.plan !== "ADVANCED" && (
                        <span className="absolute top-1 right-1 text-[8px] font-bold bg-purple-500/20 text-purple-400 px-1 rounded">
                          ENT
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Analyses List ────────────────────────────────────────────────────────────
function AnalysesList({
  analyses, loading, selected, onSelect, onNew, onRefresh, compact = false,
}: {
  analyses: Analysis[]; loading: boolean; selected: Analysis | null
  onSelect: (a: Analysis) => void; onNew: () => void; onRefresh: () => void
  compact?: boolean
}) {
  return (
    <>
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">Análises</h2>
          <p className="text-[10px] text-gray-500">{analyses.length} geradas</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-white/[0.06]">
            <RefreshCw className={cn("w-3.5 h-3.5 text-gray-500", loading && "animate-spin")} />
          </button>
          <button onClick={onNew}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/80 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold">
            <Plus className="w-3 h-3" /> Nova
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading && analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            <p className="text-xs text-gray-500">Carregando...</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Microscope className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Nenhuma análise ainda</p>
            <button onClick={onNew} className="mt-2 text-xs text-violet-400 hover:underline">Criar primeira</button>
          </div>
        ) : (
          analyses.map(a => {
            const c = typeColor(a.type)
            const isSelected = selected?.id === a.id
            return (
              <button key={a.id} onClick={() => onSelect(a)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-white/[0.04] hover:bg-white/[0.04]",
                  isSelected && "bg-violet-500/[0.08] border-l-2 border-l-violet-500"
                )}>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", c.bg, c.border, "border")}>
                  <Microscope className={cn("w-3.5 h-3.5", c.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{a.title}</p>
                  {!compact && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", c.badge)}>{a.typeName}</span>
                      <span className="text-[9px] text-gray-600">{new Date(a.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

// ─── Content Renderer ─────────────────────────────────────────────────────────
function AnalysisContent({ content }: { content: string }) {
  const sections = content.split(/\n(?=#{1,3} )/)
  return (
    <div className="prose prose-invert prose-sm max-w-none space-y-5 text-sm leading-relaxed">
      {sections.map((section, i) => {
        const lines = section.split("\n")
        const firstLine = lines[0] ?? ""
        const rest = lines.slice(1).join("\n").trim()

        if (firstLine.startsWith("## ") || firstLine.startsWith("### ")) {
          return (
            <div key={i}>
              <h3 className="text-sm font-bold text-violet-300 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-violet-500 shrink-0" />
                {firstLine.replace(/^#{1,3} /, "")}
              </h3>
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap pl-3">{rest}</div>
            </div>
          )
        }
        if (firstLine.startsWith("# ")) {
          return (
            <div key={i} className="border-b border-white/[0.06] pb-3 mb-4">
              <h2 className="text-base font-bold text-white">{firstLine.replace(/^# /, "")}</h2>
              {rest && <p className="text-sm text-gray-400 mt-1">{rest}</p>}
            </div>
          )
        }
        return (
          <div key={i} className="text-gray-300 leading-relaxed whitespace-pre-wrap">{section}</div>
        )
      })}
    </div>
  )
}
