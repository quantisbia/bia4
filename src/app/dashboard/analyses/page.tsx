"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Microscope, FlaskConical, Activity, Dna, ShieldCheck,
  Stethoscope, FileText, Plus, Loader2, Download, ChevronLeft,
  AlertCircle, CheckCircle2, RefreshCw, X, ChevronRight, Clock,
  Sparkles, Lock, Zap, Crown, Info, ChevronDown, ChevronUp,
  Brain, TestTube, Package, Globe,
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

// ─── Analysis Type Definitions ────────────────────────────────────────────────
const ANALYSIS_CATEGORIES = [
  {
    group: "Análises Laboratoriais",
    icon: Microscope,
    color: "violet",
    items: [
      {
        value: "MOLECULAR",
        label: "Molecular & Genômica",
        icon: Dna,
        color: "violet",
        credits: 12,
        plan: "ADVANCED",
        desc: "qRT-PCR, RNA-seq, Western Blot, ELISA, Proteômica",
        detail: "Protocolos completos de análise molecular com primers, controles e análise estatística",
      },
      {
        value: "BIOCHEMICAL",
        label: "Bioquímica & Caracterização",
        icon: FlaskConical,
        color: "blue",
        credits: 10,
        plan: "ADVANCED",
        desc: "FTIR, NMR, GPC, DSC/TGA, MTS/CCK-8, ALP",
        detail: "Caracterização físico-química de biomateriais e ensaios de viabilidade celular",
      },
      {
        value: "CELLULAR",
        label: "Análise Celular",
        icon: Microscope,
        color: "emerald",
        credits: 10,
        plan: "ADVANCED",
        desc: "Live/Dead, Citometria, Ki-67, MEV, F-actina",
        detail: "Viabilidade, proliferação, migração e morfologia celular em scaffolds 3D",
      },
      {
        value: "IN_VITRO",
        label: "Ensaios In Vitro",
        icon: TestTube,
        color: "cyan",
        credits: 12,
        plan: "ADVANCED",
        desc: "ISO 10993, Biocompatibilidade, Degradação, Diferenciação",
        detail: "Plano completo de ensaios in vitro seguindo normas ISO 10993 e FDA",
      },
    ],
  },
  {
    group: "Estudos Pré-Clínicos & Clínicos",
    icon: Activity,
    color: "amber",
    items: [
      {
        value: "IN_VIVO",
        label: "Estudo In Vivo",
        icon: Activity,
        color: "amber",
        credits: 20,
        plan: "ENTERPRISE",
        desc: "Roedores, Coelho, Suíno — Modelos cirúrgicos, MicroCT",
        detail: "Protocolos completos com delineamento experimental, cirurgia, endpoints e estatística",
      },
      {
        value: "PRECLINICAL",
        label: "Pacote Pré-Clínico",
        icon: Package,
        color: "orange",
        credits: 20,
        plan: "ENTERPRISE",
        desc: "ISO 10993 completo, Genotox, Toxicidade sistêmica",
        detail: "Pacote regulatório completo ISO 10993 para registro FDA/ANVISA/EMA",
      },
      {
        value: "CLINICAL",
        label: "Ensaio Clínico",
        icon: Stethoscope,
        color: "rose",
        credits: 20,
        plan: "ENTERPRISE",
        desc: "Design Fase I/II/III, Power Analysis, CONEP/FDA",
        detail: "Protocolo clínico completo com bioestatística, TCLE e submissão regulatória",
      },
    ],
  },
  {
    group: "Dossiês Regulatórios",
    icon: ShieldCheck,
    color: "purple",
    items: [
      {
        value: "REG_POP",
        label: "POP Regulatório",
        icon: FileText,
        color: "purple",
        credits: 12,
        plan: "ADVANCED",
        desc: "Procedimento Operacional Padrão formato ANVISA/GMP",
        detail: "POP completo com cabeçalho, responsabilidades, CCPs e formulários de registro",
      },
      {
        value: "REG_510K",
        label: "Dossiê FDA 510(k)",
        icon: Globe,
        color: "blue",
        credits: 20,
        plan: "ENTERPRISE",
        desc: "Dossiê completo para dispositivos médicos FDA",
        detail: "510(k) com equivalência substancial, biocompatibilidade e performance testing",
      },
      {
        value: "REG_ANVISA",
        label: "Dossiê ANVISA",
        icon: ShieldCheck,
        color: "emerald",
        credits: 20,
        plan: "ENTERPRISE",
        desc: "Registro ANVISA RDC 185/2010 e RDC 204/2017",
        detail: "Dossiê técnico completo para registro de dispositivos médicos no Brasil",
      },
      {
        value: "REG_CTD",
        label: "Dossiê CTD/EMA",
        icon: Crown,
        color: "amber",
        credits: 20,
        plan: "ENTERPRISE",
        desc: "Common Technical Document EMA/ICH — 5 Módulos",
        detail: "CTD completo com módulos 1–5 para ATMP e dispositivos médicos na Europa",
      },
    ],
  },
]

const ALL_TYPES = ANALYSIS_CATEGORIES.flatMap(c => c.items)

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; btn: string }> = {
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  badge: "bg-violet-500/15 text-violet-300",  btn: "bg-violet-600 hover:bg-violet-500" },
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    badge: "bg-blue-500/15 text-blue-300",      btn: "bg-blue-600 hover:bg-blue-500"    },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-500" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    badge: "bg-cyan-500/15 text-cyan-300",      btn: "bg-cyan-600 hover:bg-cyan-500"    },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-300",   btn: "bg-amber-600 hover:bg-amber-500"  },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/20",  text: "text-orange-400",  badge: "bg-orange-500/15 text-orange-300", btn: "bg-orange-600 hover:bg-orange-500" },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-400",    badge: "bg-rose-500/15 text-rose-300",     btn: "bg-rose-600 hover:bg-rose-500"    },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400",  badge: "bg-purple-500/15 text-purple-300", btn: "bg-purple-600 hover:bg-purple-500" },
}

function getTypeConfig(type: string) {
  return ALL_TYPES.find(t => t.value === type)
}

function getColors(type: string) {
  const cfg = getTypeConfig(type)
  return COLOR_MAP[cfg?.color ?? "violet"] ?? COLOR_MAP.violet
}

// ─── PLAN INFO ────────────────────────────────────────────────────────────────
const PLAN_INFO = {
  ADVANCED:   { label: "Advanced",   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20"   },
  ENTERPRISE: { label: "Enterprise", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  ACADEMY:    { label: "Academy",    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AnalysesPage() {
  const [analyses, setAnalyses]           = useState<Analysis[]>([])
  const [loading, setLoading]             = useState(false)
  const [generating, setGenerating]       = useState(false)
  const [selected, setSelected]           = useState<Analysis | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [showCreate, setShowCreate]       = useState(false)
  const [showList, setShowList]           = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [success, setSuccess]             = useState<string | null>(null)
  const [planError, setPlanError]         = useState<{ plan: string } | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>("Análises Laboratoriais")

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

  // ── Load analyses ──────────────────────────────────────────────────────────
  const loadAnalyses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/analyses")
      if (!res.ok) return
      const data = await res.json()
      setAnalyses(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAnalyses() }, [loadAnalyses])

  // ── Load content ───────────────────────────────────────────────────────────
  async function loadContent(a: Analysis) {
    if (a.content) { setSelected(a); return }
    setLoadingContent(true)
    try {
      const res = await fetch(`/api/analyses?id=${a.id}`)
      if (res.ok) {
        const full = await res.json()
        setSelected(full)
        setAnalyses(prev => prev.map(x => x.id === full.id ? { ...x, content: full.content } : x))
      }
    } catch { setSelected(a) }
    finally { setLoadingContent(false) }
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  async function generate() {
    setError(null)
    setPlanError(null)
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
        if (res.status === 403 && data.code === "PLAN_REQUIRED") {
          setPlanError({ plan: data.requiredPlan })
          return
        }
        if (res.status === 402) { setError(`Créditos insuficientes: ${data.error}`); return }
        if (res.status === 401) { setError("Sessão expirada — faça login novamente."); return }
        setError(data.error ?? "Erro ao gerar análise.")
        return
      }

      setAnalyses(prev => [data, ...prev])
      setSelected(data)
      setShowCreate(false)
      setShowList(false)
      resetForm()
      setSuccess("✅ Análise gerada com sucesso!")
      setTimeout(() => setSuccess(null), 5000)
    } catch {
      setError("Erro de conexão. Verifique sua internet.")
    } finally {
      setGenerating(false)
    }
  }

  function resetForm() {
    setForm({ type: "MOLECULAR", title: "", context: "", objective: "", material: "", tissueType: "", species: "", regulatoryTarget: "" })
  }

  // ── Download ───────────────────────────────────────────────────────────────
  function download(a: Analysis) {
    const typeCfg = getTypeConfig(a.type)
    const md = `# ${a.title}\n\n**Tipo:** ${a.typeName ?? a.type}\n**Créditos usados:** ${a.creditsUsed}\n**Gerado em:** ${new Date(a.createdAt).toLocaleDateString("pt-BR")}\n\n---\n\n${a.content ?? ""}`
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const anchor = document.createElement("a")
    anchor.href = URL.createObjectURL(blob)
    anchor.download = `BIA_${typeCfg?.label?.replace(/\s+/g, "_") ?? a.type}_${a.title.replace(/\s+/g, "_").substring(0, 40)}.md`
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }

  const selectedTypeCfg = getTypeConfig(form.type)
  const selectedColors  = COLOR_MAP[selectedTypeCfg?.color ?? "violet"] ?? COLOR_MAP.violet

  return (
    <div className="flex h-full overflow-hidden bg-[#0d0d1a]">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-72 lg:w-80 border-r border-white/[0.06] bg-black/20 flex-col shrink-0">
        <AnalysisList
          analyses={analyses} loading={loading} selected={selected}
          onSelect={loadContent}
          onNew={() => { setShowCreate(true); setSelected(null) }}
          onRefresh={loadAnalyses}
        />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {showList && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowList(false)} />
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[88vw] bg-[#0d0720] border-r border-white/[0.08] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <span className="font-semibold text-white text-sm">Minhas Análises</span>
              <button onClick={() => setShowList(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06]">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <AnalysisList
              analyses={analyses} loading={loading} selected={selected}
              onSelect={(a) => { loadContent(a); setShowList(false) }}
              onNew={() => { setShowCreate(true); setSelected(null); setShowList(false) }}
              onRefresh={loadAnalyses}
              compact
            />
          </div>
        </>
      )}

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          <button onClick={() => setShowList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] text-gray-400 hover:text-white text-xs font-medium">
            <Microscope className="w-3.5 h-3.5" />
            Análises ({analyses.length})
          </button>
          <button onClick={() => { setShowCreate(true); setSelected(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/80 text-white text-xs font-semibold hover:bg-violet-500">
            <Plus className="w-3.5 h-3.5" /> Nova
          </button>
        </div>

        {/* Alerts */}
        <div className="shrink-0 px-4 sm:px-6">
          {error && (
            <div className="mt-3 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </div>
          )}
          {success && (
            <div className="mt-3 flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{success}
            </div>
          )}
          {planError && (
            <div className="mt-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">Plano {planError.plan} necessário</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Esta análise requer o plano {planError.plan} ou superior.</p>
              <a href="/dashboard/billing"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-500 transition-all">
                <Crown className="w-3.5 h-3.5" /> Ver planos de assinatura
              </a>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ── CREATE FORM ─────────────────────────────────────────────────── */}
          {showCreate && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowCreate(false); setError(null); setPlanError(null) }}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white">Nova Análise Científica</h2>
                  <p className="text-xs text-gray-400">Guia de biofabricação inteligente — dossiês POP/CTD e análises especializadas</p>
                </div>
              </div>

              {/* Type selector by groups */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-gray-400 block">Tipo de Análise *</label>
                {ANALYSIS_CATEGORIES.map(cat => {
                  const isOpen = expandedGroup === cat.group
                  return (
                    <div key={cat.group} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedGroup(isOpen ? null : cat.group)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors text-left"
                      >
                        <cat.icon className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-semibold text-white flex-1">{cat.group}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>
                      {isOpen && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 pb-4 border-t border-white/[0.04]">
                          {cat.items.map(item => {
                            const c = COLOR_MAP[item.color] ?? COLOR_MAP.violet
                            const sel = form.type === item.value
                            const planInfo = PLAN_INFO[item.plan as keyof typeof PLAN_INFO]
                            return (
                              <button key={item.value}
                                onClick={() => setForm(f => ({ ...f, type: item.value }))}
                                className={cn(
                                  "flex flex-col gap-2 p-3 rounded-xl border text-left transition-all mt-2",
                                  sel ? `${c.bg} ${c.border}` : "border-white/[0.05] bg-white/[0.01] hover:border-white/[0.10]"
                                )}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <item.icon className={cn("w-3.5 h-3.5", sel ? c.text : "text-gray-500")} />
                                    <span className={cn("text-xs font-semibold", sel ? "text-white" : "text-gray-400")}>{item.label}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {planInfo && item.plan !== "ADVANCED" && (
                                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", planInfo.color, planInfo.bg, planInfo.border)}>
                                        {planInfo.label}
                                      </span>
                                    )}
                                    <span className="text-[9px] text-gray-600">{item.credits} cr</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-gray-600 leading-tight">{item.desc}</p>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Selected type detail */}
              {selectedTypeCfg && (
                <div className={cn("rounded-xl border p-3 flex gap-3", selectedColors.bg, selectedColors.border)}>
                  <Info className={cn("w-4 h-4 shrink-0 mt-0.5", selectedColors.text)} />
                  <div>
                    <p className={cn("text-xs font-semibold mb-0.5", selectedColors.text)}>{selectedTypeCfg.label}</p>
                    <p className="text-xs text-gray-400">{selectedTypeCfg.detail}</p>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Título *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Caracterização bioquímica do GelMA 8% para cartilagem articular"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {/* Context */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                  Contexto e Descrição * <span className="text-gray-600">(min. 20 caracteres)</span>
                </label>
                <textarea
                  value={form.context}
                  onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                  rows={4}
                  placeholder="Descreva o produto, material, aplicação clínica, estágio de desenvolvimento, requisitos regulatórios e qualquer informação relevante para a análise..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
                />
                <p className="text-[10px] text-gray-600 mt-1">{form.context.length} chars</p>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Objetivo Específico</label>
                  <input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                    placeholder="ex: validar biocompatibilidade para registro FDA"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Biomaterial / Produto</label>
                  <input value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}
                    placeholder="ex: GelMA 8%, scaffold PCL-HA, Qmatrix"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Tecido / Órgão Alvo</label>
                  <input value={form.tissueType} onChange={e => setForm(f => ({ ...f, tissueType: e.target.value }))}
                    placeholder="ex: cartilagem articular, pele, osso alveolar"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                </div>
                {(form.type === "IN_VIVO" || form.type === "PRECLINICAL") && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Espécie Animal</label>
                    <input value={form.species} onChange={e => setForm(f => ({ ...f, species: e.target.value }))}
                      placeholder="ex: Rattus norvegicus Wistar, New Zealand White Rabbit"
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50" />
                  </div>
                )}
                {(form.type.startsWith("REG_") || form.type === "PRECLINICAL" || form.type === "CLINICAL") && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Agência Regulatória Alvo</label>
                    <select value={form.regulatoryTarget} onChange={e => setForm(f => ({ ...f, regulatoryTarget: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50">
                      <option value="">Selecionar...</option>
                      <option value="FDA (EUA)">FDA (EUA)</option>
                      <option value="ANVISA (Brasil)">ANVISA (Brasil)</option>
                      <option value="EMA (Europa)">EMA (Europa)</option>
                      <option value="FDA + ANVISA">FDA + ANVISA</option>
                      <option value="FDA + ANVISA + EMA">FDA + ANVISA + EMA (Global)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Info card */}
              <div className="bg-violet-500/[0.05] border border-violet-500/15 rounded-xl p-3 flex gap-3">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  A IA BIA v4 gerará um documento técnico completo baseado em literatura científica 2024–2026,
                  normas ISO/ASTM/FDA/ANVISA e nos 807+ estudos validados da base de conhecimento.
                  {selectedTypeCfg && (
                    <span className={cn("font-semibold ml-1", selectedColors.text)}>
                      Custo: {selectedTypeCfg.credits} créditos.
                    </span>
                  )}
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={generate}
                disabled={generating || !form.title.trim() || form.context.trim().length < 20}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 active:scale-[0.99]">
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Gerando análise com IA BIA...</>
                ) : (
                  <><Zap className="w-4 h-4" />Gerar Análise ({selectedTypeCfg?.credits ?? "?"} créditos)</>
                )}
              </button>
              {generating && (
                <div className="text-center">
                  <p className="text-xs text-gray-500">Consultando base científica 2024–2026... 20–60 segundos</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VIEWER ──────────────────────────────────────────────────────── */}
          {!showCreate && selected && (
            <div className="max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", getColors(selected.type).badge)}>
                      {selected.typeName ?? selected.type}
                    </span>
                    <span className="text-[10px] text-gray-500 bg-white/[0.05] px-2 py-0.5 rounded-full">{selected.creditsUsed} cr</span>
                    <span className="text-[10px] text-gray-600">
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {new Date(selected.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-snug">{selected.title}</h2>
                </div>
                <button onClick={() => download(selected)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/20 shrink-0">
                  <Download className="w-3.5 h-3.5" /> Baixar .md
                </button>
              </div>

              {loadingContent ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-400 mx-auto animate-spin mb-2" />
                  <p className="text-sm text-gray-400">Carregando análise...</p>
                </div>
              ) : selected.content ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-6">
                  <AnalysisContent content={selected.content} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Conteúdo não disponível</p>
                </div>
              )}
            </div>
          )}

          {/* ── EMPTY STATE ─────────────────────────────────────────────────── */}
          {!showCreate && !selected && (
            <div className="max-w-4xl mx-auto">
              {/* Hero */}
              <div className="text-center py-8 mb-6">
                <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-10 h-10 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Guia de Biofabricação Inteligente</h2>
                <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
                  Gere análises científicas completas, protocolos laboratoriais e dossiês regulatórios
                  (POP, CTD, FDA 510(k), ANVISA, EMA) com suporte de IA especializada em biofabricação.
                </p>
              </div>

              {/* Category grid */}
              <div className="space-y-4 mb-6">
                {ANALYSIS_CATEGORIES.map(cat => (
                  <div key={cat.group} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <cat.icon className="w-5 h-5 text-gray-400" />
                      <h3 className="text-sm font-bold text-white">{cat.group}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {cat.items.map(item => {
                        const c = COLOR_MAP[item.color] ?? COLOR_MAP.violet
                        const planInfo = PLAN_INFO[item.plan as keyof typeof PLAN_INFO]
                        return (
                          <button key={item.value}
                            onClick={() => { setForm(f => ({ ...f, type: item.value })); setShowCreate(true); setExpandedGroup(cat.group) }}
                            className={cn(
                              "flex flex-col gap-1.5 p-3 rounded-xl border text-left transition-all hover:scale-[1.02]",
                              c.bg, c.border
                            )}>
                            <div className="flex items-center justify-between">
                              <item.icon className={cn("w-4 h-4", c.text)} />
                              {planInfo && item.plan !== "ADVANCED" ? (
                                <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded", planInfo.color, planInfo.bg)}>
                                  {planInfo.label}
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-600">{item.credits} cr</span>
                              )}
                            </div>
                            <p className={cn("text-xs font-semibold leading-tight", c.text)}>{item.label}</p>
                            <p className="text-[10px] text-gray-600 leading-tight line-clamp-2">{item.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center">
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all mx-auto">
                  <Plus className="w-4 h-4" />
                  Iniciar Nova Análise
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function AnalysisList({ analyses, loading, selected, onSelect, onNew, onRefresh, compact = false }: {
  analyses: Analysis[]; loading: boolean; selected: Analysis | null
  onSelect: (a: Analysis) => void; onNew: () => void; onRefresh: () => void; compact?: boolean
}) {
  return (
    <>
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">Análises</h2>
          <p className="text-[10px] text-gray-500">{analyses.length} geradas</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-white/[0.06]" title="Atualizar">
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
            const c = getColors(a.type)
            const cfg = getTypeConfig(a.type)
            const isSelected = selected?.id === a.id
            return (
              <button key={a.id} onClick={() => onSelect(a)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-white/[0.04] hover:bg-white/[0.04] transition-all",
                  isSelected && "bg-violet-500/[0.08] border-l-2 border-l-violet-500"
                )}>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border", c.bg, c.border)}>
                  {cfg ? <cfg.icon className={cn("w-3.5 h-3.5", c.text)} /> : <FileText className={cn("w-3.5 h-3.5", c.text)} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{a.title}</p>
                  {!compact && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", c.badge)}>{a.typeName ?? a.type}</span>
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

        if (firstLine.startsWith("### ")) {
          return (
            <div key={i} className="ml-3">
              <h4 className="text-xs font-bold text-violet-200 mb-1 flex items-center gap-1.5">
                <span className="w-1 h-3 rounded-full bg-violet-500/60 shrink-0" />
                {firstLine.replace(/^### /, "")}
              </h4>
              <div className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap pl-2.5">{rest}</div>
            </div>
          )
        }
        if (firstLine.startsWith("## ")) {
          return (
            <div key={i}>
              <h3 className="text-sm font-bold text-violet-300 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-violet-500 shrink-0" />
                {firstLine.replace(/^## /, "")}
              </h3>
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap pl-3">{rest}</div>
            </div>
          )
        }
        if (firstLine.startsWith("# ")) {
          return (
            <div key={i} className="border-b border-white/[0.06] pb-4 mb-4">
              <h2 className="text-base font-bold text-white">{firstLine.replace(/^# /, "")}</h2>
              {rest && <p className="text-sm text-gray-400 mt-1">{rest}</p>}
            </div>
          )
        }
        return <div key={i} className="text-gray-300 leading-relaxed whitespace-pre-wrap">{section}</div>
      })}
    </div>
  )
}
