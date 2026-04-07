"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText, Plus, Loader2, Zap, Download, ChevronLeft,
  AlertCircle, CheckCircle2, RefreshCw, BookOpen, Beaker,
  Shield, Microscope, Printer, FlaskConical, X, ChevronRight,
  Clock, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Protocol {
  id: string
  title: string
  type: string
  typeName: string
  status: string
  version: string
  content?: string
  description?: string
  creditsUsed: number
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PROTOCOL_TYPES = [
  { value: "CULTURE",          label: "Cultura Celular",      icon: Microscope,   color: "violet", desc: "SOPs de cultura, passagem, manutenção celular" },
  { value: "SYNTHESIS",        label: "Síntese de Biomaterial",icon: FlaskConical, color: "blue",   desc: "Preparação de hidrogéis, scaffolds, bioinks" },
  { value: "CHARACTERIZATION", label: "Caracterização",       icon: Beaker,       color: "emerald",desc: "Análise mecânica, reológica, bioquímica" },
  { value: "QUALITY_CONTROL",  label: "Controle de Qualidade",icon: CheckCircle2, color: "amber",  desc: "QC/QA, critérios de liberação de lotes" },
  { value: "BIOPRINTING",      label: "Bioimpressão 3D",      icon: Printer,      color: "indigo", desc: "Calibração, parâmetros, pós-processamento" },
  { value: "STERILIZATION",    label: "Esterilização",        icon: Shield,       color: "rose",   desc: "Autoclavagem, filtração, UV, ETO" },
  { value: "ELECTROSPINNING",  label: "Eletrofiação",         icon: Zap,          color: "amber",  desc: "Fibras nanométricas para scaffolds" },
  { value: "REGULATORY",       label: "Documentação Regulatória", icon: BookOpen, color: "purple", desc: "Dossiês FDA, ANVISA, EMA — GLP/GMP" },
]

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", badge: "bg-violet-500/15 text-violet-300" },
  blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",   badge: "bg-blue-500/15 text-blue-300"   },
  emerald:{ bg: "bg-emerald-500/10",border: "border-emerald-500/20",text: "text-emerald-400",badge: "bg-emerald-500/15 text-emerald-300"},
  amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/20",  text: "text-amber-400",  badge: "bg-amber-500/15 text-amber-300"  },
  indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/20", text: "text-indigo-400", badge: "bg-indigo-500/15 text-indigo-300" },
  rose:   { bg: "bg-rose-500/10",   border: "border-rose-500/20",   text: "text-rose-400",   badge: "bg-rose-500/15 text-rose-300"    },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400", badge: "bg-purple-500/15 text-purple-300" },
}

function typeColor(type: string) {
  const t = PROTOCOL_TYPES.find(p => p.value === type)
  return TYPE_COLORS[t?.color ?? "violet"] ?? TYPE_COLORS.violet
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProtocolsPage() {
  const [protocols, setProtocols]   = useState<Protocol[]>([])
  const [loading, setLoading]       = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected]     = useState<Protocol | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showList, setShowList]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    type: "CULTURE",
    context: "",
    tissueType: "",
    application: "",
    specialRequirements: "",
  })

  // ── Load protocols ──────────────────────────────────────────────────────────
  const loadProtocols = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/protocols")
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 401) setError("Sessão expirada — faça login novamente.")
        else setError(data.error ?? "Erro ao carregar protocolos")
        return
      }
      const data = await res.json()
      setProtocols(Array.isArray(data) ? data : [])
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProtocols() }, [loadProtocols])

  // ── Load full protocol content ──────────────────────────────────────────────
  async function loadProtocolContent(p: Protocol) {
    if (p.content) { setSelected(p); return }
    setLoadingContent(true)
    try {
      const res = await fetch(`/api/protocols?id=${p.id}`)
      if (res.ok) {
        const full = await res.json()
        setSelected(full)
        setProtocols(prev => prev.map(pp => pp.id === full.id ? { ...pp, content: full.content } : pp))
      }
    } catch { /* use cached */ setSelected(p) }
    finally { setLoadingContent(false) }
  }

  // ── Generate protocol ───────────────────────────────────────────────────────
  async function generateProtocol() {
    setError(null)
    setSuccess(null)

    if (!form.title.trim()) { setError("Preencha o título do protocolo."); return }
    if (!form.type)          { setError("Selecione o tipo de protocolo."); return }
    if (form.context.trim().length < 10) { setError("Descreva o contexto (mínimo 10 caracteres)."); return }

    setGenerating(true)
    try {
      const res = await fetch("/api/protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setError(`Créditos insuficientes (necessário: 8). ${data.error}`)
        } else if (res.status === 401) {
          setError("Sessão expirada — faça login novamente.")
        } else {
          setError(data.error ?? "Erro ao gerar protocolo. Tente novamente.")
        }
        return
      }

      // Success
      setProtocols(prev => [data, ...prev])
      setSelected(data)
      setShowCreate(false)
      setShowList(false)
      setForm({ title: "", type: "CULTURE", context: "", tissueType: "", application: "", specialRequirements: "" })
      setSuccess("✅ Protocolo gerado com sucesso!")
      setTimeout(() => setSuccess(null), 4000)
    } catch {
      setError("Erro de conexão. Verifique sua internet.")
    } finally {
      setGenerating(false)
    }
  }

  // ── Download ────────────────────────────────────────────────────────────────
  function downloadProtocol(p: Protocol) {
    const md = `# ${p.title}\n\n**Tipo:** ${p.typeName ?? p.type}\n**Versão:** ${p.version}\n**Status:** ${p.status}\n**Gerado em:** ${new Date(p.createdAt).toLocaleDateString("pt-BR")}\n\n---\n\n${p.content ?? ""}`
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${p.title.replace(/\s+/g, "_")}_v${p.version}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-[#0d0d1a]">

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-72 lg:w-80 border-r border-white/[0.06] bg-black/20 flex-col shrink-0">
        <ProtocolList
          protocols={protocols} loading={loading} selected={selected}
          onSelect={loadProtocolContent}
          onNew={() => { setShowCreate(true); setSelected(null) }}
          onRefresh={loadProtocols}
        />
      </aside>

      {/* ── Mobile: floating drawer ──────────────────────────────────────────── */}
      {showList && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowList(false)} />
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[88vw] bg-[#0d0720] border-r border-white/[0.08] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <span className="font-semibold text-white text-sm">Meus Protocolos</span>
              <button onClick={() => setShowList(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <ProtocolList
              protocols={protocols} loading={loading} selected={selected}
              onSelect={(p) => { loadProtocolContent(p); setShowList(false) }}
              onNew={() => { setShowCreate(true); setSelected(null); setShowList(false) }}
              onRefresh={loadProtocols}
              compact
            />
          </div>
        </>
      )}

      {/* ── Main content area ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
          <button onClick={() => setShowList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] text-gray-400 hover:text-white text-xs font-medium transition-colors">
            <FileText className="w-3.5 h-3.5" />
            Protocolos ({protocols.length})
          </button>
          <button onClick={() => { setShowCreate(true); setSelected(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/80 text-white text-xs font-semibold hover:bg-violet-500 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Novo
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ── CREATE FORM ─────────────────────────────────────────────────── */}
          {showCreate && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white">Novo Protocolo</h2>
                  <p className="text-xs text-gray-400">IA gera protocolo completo em formato GLP/GMP · 8 créditos</p>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Título do Protocolo *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Preparação de GelMA 8% para bioimpressão de cartilagem"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">Tipo de Protocolo *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROTOCOL_TYPES.map(pt => {
                    const c = TYPE_COLORS[pt.color] ?? TYPE_COLORS.violet
                    const sel = form.type === pt.value
                    return (
                      <button key={pt.value}
                        onClick={() => setForm(f => ({ ...f, type: pt.value }))}
                        className={cn(
                          "flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all",
                          sel ? `${c.bg} ${c.border}` : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                        )}>
                        <div className="flex items-center gap-1.5">
                          <pt.icon className={cn("w-3.5 h-3.5", sel ? c.text : "text-gray-500")} />
                          <span className={cn("text-xs font-semibold leading-tight", sel ? "text-white" : "text-gray-400")}>{pt.label}</span>
                        </div>
                        <span className="text-[10px] text-gray-600 leading-tight">{pt.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Context */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                  Contexto e Objetivo * <span className="text-gray-600">(descreva detalhadamente o que precisa)</span>
                </label>
                <textarea
                  value={form.context}
                  onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                  rows={4}
                  placeholder="Descreva o objetivo do protocolo, materiais disponíveis, condições específicas, requisitos de biossegurança, equipamentos no laboratório, etc. Quanto mais detalhe, melhor o resultado da IA."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                />
                <p className="text-[10px] text-gray-600 mt-1">{form.context.length}/500 — mín. 10 caracteres</p>
              </div>

              {/* Optional extras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tecido/Material Alvo (opcional)</label>
                  <input
                    value={form.tissueType}
                    onChange={e => setForm(f => ({ ...f, tissueType: e.target.value }))}
                    placeholder="ex: cartilagem, GelMA 8%, osso"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Aplicação Clínica (opcional)</label>
                  <input
                    value={form.application}
                    onChange={e => setForm(f => ({ ...f, application: e.target.value }))}
                    placeholder="ex: regeneração óssea, ensaio in vitro"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Requisitos especiais */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Requisitos Especiais (opcional)</label>
                <input
                  value={form.specialRequirements}
                  onChange={e => setForm(f => ({ ...f, specialRequirements: e.target.value }))}
                  placeholder="ex: GLP obrigatório, sala limpa ISO 7, animais in vivo, regulatório FDA"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>

              {/* Info box */}
              <div className="bg-violet-500/[0.05] border border-violet-500/15 rounded-xl p-3 flex gap-3">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  A IA gerará um protocolo completo no formato GLP/GMP com: objetivo, materiais, equipamentos, procedimento passo-a-passo, pontos críticos de controle, troubleshooting e referências normativas (ISO, ASTM, ANVISA, FDA).
                  <span className="text-violet-300 font-semibold"> Custo: 8 créditos.</span>
                </p>
              </div>

              {/* Submit button */}
              <button
                onClick={generateProtocol}
                disabled={generating || !form.title.trim() || !form.context.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando protocolo com IA BIA...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Gerar Protocolo (8 créditos)
                  </>
                )}
              </button>

              {generating && (
                <div className="text-center">
                  <p className="text-xs text-gray-500">Isso pode levar 20–40 segundos...</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROTOCOL VIEWER ──────────────────────────────────────────────── */}
          {!showCreate && selected && (
            <div className="max-w-3xl mx-auto">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", typeColor(selected.type).badge)}>
                      {selected.typeName ?? selected.type}
                    </span>
                    <span className="text-[10px] text-gray-500 bg-white/[0.05] px-2 py-0.5 rounded-full">v{selected.version}</span>
                    <span className="text-[10px] text-gray-500">{selected.creditsUsed} créditos</span>
                    <span className="text-[10px] text-gray-600">
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {new Date(selected.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-snug">{selected.title}</h2>
                </div>
                <button
                  onClick={() => downloadProtocol(selected)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/20 transition-all shrink-0">
                  <Download className="w-3.5 h-3.5" /> Baixar .md
                </button>
              </div>

              {/* Loading content */}
              {loadingContent ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-400 mx-auto animate-spin mb-2" />
                  <p className="text-sm text-gray-400">Carregando protocolo...</p>
                </div>
              ) : selected.content ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-6">
                  <ProtocolContent content={selected.content} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Conteúdo não disponível</p>
                  <button onClick={() => loadProtocolContent(selected)} className="mt-2 text-xs text-violet-400 hover:underline">
                    Tentar carregar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
          {!showCreate && !selected && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                {protocols.length === 0 ? "Nenhum protocolo ainda" : "Selecione um protocolo"}
              </h3>
              <p className="text-sm text-gray-500 mb-5 max-w-sm">
                {protocols.length === 0
                  ? "Gere protocolos laboratoriais completos em formato GLP/GMP usando a IA BIA especializada em biofabricação."
                  : "Escolha um protocolo na lista ou crie um novo."}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all">
                <Plus className="w-4 h-4" />
                {protocols.length === 0 ? "Criar Primeiro Protocolo" : "Novo Protocolo"}
              </button>
              {protocols.length === 0 && (
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl">
                  {PROTOCOL_TYPES.slice(0, 4).map(pt => {
                    const c = TYPE_COLORS[pt.color] ?? TYPE_COLORS.violet
                    return (
                      <button key={pt.value}
                        onClick={() => { setForm(f => ({ ...f, type: pt.value })); setShowCreate(true) }}
                        className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all hover:scale-105", c.bg, c.border)}>
                        <pt.icon className={cn("w-5 h-5", c.text)} />
                        <span className="text-[10px] font-semibold text-gray-300 leading-tight">{pt.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Protocol List Sidebar ────────────────────────────────────────────────────
function ProtocolList({
  protocols, loading, selected, onSelect, onNew, onRefresh, compact = false,
}: {
  protocols: Protocol[]; loading: boolean; selected: Protocol | null
  onSelect: (p: Protocol) => void; onNew: () => void; onRefresh: () => void
  compact?: boolean
}) {
  return (
    <>
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">Protocolos</h2>
          <p className="text-[10px] text-gray-500">{protocols.length} gerados</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Atualizar">
            <RefreshCw className={cn("w-3.5 h-3.5 text-gray-500", loading && "animate-spin")} />
          </button>
          <button onClick={onNew}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/80 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all">
            <Plus className="w-3 h-3" /> Novo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading && protocols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            <p className="text-xs text-gray-500">Carregando...</p>
          </div>
        ) : protocols.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Nenhum protocolo ainda</p>
            <button onClick={onNew} className="mt-2 text-xs text-violet-400 hover:underline">Criar primeiro</button>
          </div>
        ) : (
          protocols.map(p => {
            const c = typeColor(p.type)
            const isSelected = selected?.id === p.id
            return (
              <button key={p.id} onClick={() => onSelect(p)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b border-white/[0.04] hover:bg-white/[0.04]",
                  isSelected && "bg-violet-500/[0.08] border-l-2 border-l-violet-500"
                )}>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", c.bg, c.border, "border")}>
                  <FileText className={cn("w-3.5 h-3.5", c.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{p.title}</p>
                  {!compact && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", c.badge)}>{p.typeName ?? p.type}</span>
                      <span className="text-[9px] text-gray-600">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>
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

// ─── Protocol Content Renderer ────────────────────────────────────────────────
function ProtocolContent({ content }: { content: string }) {
  // Renderiza Markdown simples como HTML estilizado
  const sections = content.split(/\n(?=#{1,3} )/)

  return (
    <div className="prose prose-invert prose-sm max-w-none space-y-5 text-sm leading-relaxed">
      {sections.map((section, i) => {
        const lines = section.split("\n")
        const firstLine = lines[0] ?? ""
        const rest = lines.slice(1).join("\n").trim()

        if (firstLine.startsWith("## ")) {
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
