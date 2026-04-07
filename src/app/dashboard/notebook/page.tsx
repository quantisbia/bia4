"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BookMarked, Plus, Loader2, Search, Pin, PinOff, Trash2,
  ChevronRight, X, Check, FileText, FlaskConical, Microscope,
  BookOpen, Scroll, Award, BookCopy, FileCheck2, Tag,
  Sparkles, Download, Printer, Copy, ChevronDown, ChevronUp,
  GitBranch, Atom, Star, Filter, RefreshCw, AlertCircle,
  Newspaper, Lightbulb, GraduationCap, ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { BiaMarkdown } from "@/components/ui/BiaMarkdown"

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotebookEntry {
  id: string
  title: string
  content?: string
  entryType: string
  category?: string
  tags: string[]
  sourceType?: string
  sourceId?: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  generatedDoc?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

interface GeneratedDoc {
  type?: string
  label?: string
  content?: string
  generatedAt?: string
  [key: string]: unknown
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ENTRY_TYPES = [
  { value: "ALL",              label: "Todas",                icon: BookMarked,  color: "indigo" },
  { value: "NOTE",             label: "Nota",                 icon: FileText,    color: "gray"   },
  { value: "PROTOCOL",         label: "Protocolo",            icon: FileCheck2,  color: "violet" },
  { value: "FORMULATION",      label: "Formulação",           icon: FlaskConical,color: "blue"   },
  { value: "PIPELINE_SUMMARY", label: "Pipeline",             icon: GitBranch,   color: "emerald"},
  { value: "ARTICLE_DRAFT",    label: "Artigo",               icon: Newspaper,   color: "amber"  },
  { value: "PATENT_DRAFT",     label: "Patente",              icon: Award,       color: "orange" },
  { value: "BOOK_CHAPTER",     label: "Cap. Livro",           icon: BookCopy,    color: "purple" },
  { value: "RESEARCH_LOG",     label: "Log Pesquisa",         icon: Scroll,      color: "teal"   },
  { value: "REFERENCE",        label: "Referência",           icon: BookOpen,    color: "pink"   },
  { value: "STL_GEOMETRY",     label: "Geometria 3D",         icon: Atom,        color: "cyan"   },
]

const GEN_TYPES = [
  { key: "ARTICLE",    label: "Artigo Científico",      icon: Newspaper,    cost: 20, desc: "Formato IMRaD completo para periódico Q1-Q2" },
  { key: "PATENT",     label: "Rascunho de Patente",    icon: Award,        cost: 20, desc: "Estrutura INPI/USPTO com reivindicações" },
  { key: "CHAPTER",    label: "Capítulo de Livro",      icon: BookCopy,     cost: 12, desc: "Texto acadêmico de nível universitário" },
  { key: "ABSTRACT",   label: "Resumo p/ Congresso",    icon: GraduationCap,cost: 8,  desc: "TERMIS, SBB, ISBF — 300 palavras" },
  { key: "REVIEW",     label: "Artigo de Revisão",      icon: Scroll,       cost: 20, desc: "Revisão sistemática com tabela comparativa" },
  { key: "METHODS",    label: "Seção Metodologia",      icon: Microscope,   cost: 8,  desc: "Materiais e métodos reprodutíveis" },
  { key: "INTRO",      label: "Introdução Científica",  icon: Lightbulb,    cost: 8,  desc: "Formato funil com gap identification" },
  { key: "DISCUSSION", label: "Discussão e Conclusões", icon: Star,         cost: 8,  desc: "Interpretação crítica dos resultados" },
]

const TYPE_STYLE: Record<string, { bg: string; border: string; text: string; pill: string }> = {
  gray:   { bg: "bg-gray-500/10",    border: "border-gray-500/20",    text: "text-gray-400",    pill: "bg-gray-500/15 text-gray-300 border-gray-500/25"    },
  indigo: { bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  text: "text-indigo-400",  pill: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25"  },
  violet: { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  pill: "bg-violet-500/15 text-violet-300 border-violet-500/25"  },
  blue:   { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    pill: "bg-blue-500/15 text-blue-300 border-blue-500/25"    },
  emerald:{ bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"},
  amber:  { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   pill: "bg-amber-500/15 text-amber-300 border-amber-500/25"   },
  orange: { bg: "bg-orange-500/10",  border: "border-orange-500/20",  text: "text-orange-400",  pill: "bg-orange-500/15 text-orange-300 border-orange-500/25"  },
  purple: { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400",  pill: "bg-purple-500/15 text-purple-300 border-purple-500/25"  },
  teal:   { bg: "bg-teal-500/10",    border: "border-teal-500/20",    text: "text-teal-400",    pill: "bg-teal-500/15 text-teal-300 border-teal-500/25"    },
  pink:   { bg: "bg-pink-500/10",    border: "border-pink-500/20",    text: "text-pink-400",    pill: "bg-pink-500/15 text-pink-300 border-pink-500/25"    },
  cyan:   { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    pill: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25"    },
}

function entryStyle(type: string) {
  const t = ENTRY_TYPES.find(e => e.value === type)
  return TYPE_STYLE[t?.color ?? "gray"] ?? TYPE_STYLE.gray
}

function EntryIcon({ type, className }: { type: string; className?: string }) {
  const t = ENTRY_TYPES.find(e => e.value === type)
  const Icon = t?.icon ?? FileText
  return <Icon className={className} />
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NotebookPage() {
  const [entries, setEntries]         = useState<NotebookEntry[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(false)
  const [selected, setSelected]       = useState<NotebookEntry | null>(null)
  const [loadingEntry, setLoadingEntry] = useState(false)
  const [view, setView]               = useState<"list"|"create"|"generate"|"viewer">("list")
  const [typeFilter, setTypeFilter]   = useState("ALL")
  const [search, setSearch]           = useState("")
  const [error, setError]             = useState("")
  const [success, setSuccess]         = useState("")
  const [copied, setCopied]           = useState(false)

  // ── New entry form ──────────────────────────────────────────────────────────
  const [newForm, setNewForm] = useState({
    title: "",
    content: "",
    entryType: "NOTE",
    category: "",
    tags: "",
  })
  const [saving, setSaving] = useState(false)

  // ── Generate form ───────────────────────────────────────────────────────────
  const [genForm, setGenForm] = useState({
    genType: "ARTICLE",
    title: "",
    journal: "",
    style: "Vancouver",
    language: "pt-BR",
    keywords: "",
    extraNotes: "",
    selectedEntryIds: [] as string[],
  })
  const [generating, setGenerating]   = useState(false)
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDoc | null>(null)
  const [showDocFull, setShowDocFull] = useState(false)

  // ── Load entries ────────────────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== "ALL") params.set("type", typeFilter)
      if (search.trim()) params.set("q", search.trim())
      const res = await fetch(`/api/notebook?${params}`)
      if (!res.ok) { setError("Erro ao carregar notebook"); return }
      const data = await res.json()
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
    } catch { setError("Erro de conexão") }
    finally { setLoading(false) }
  }, [typeFilter, search])

  useEffect(() => { loadEntries() }, [loadEntries])

  // ── Load full entry ─────────────────────────────────────────────────────────
  async function openEntry(e: NotebookEntry) {
    if (e.content) { setSelected(e); setView("viewer"); return }
    setLoadingEntry(true)
    try {
      const res = await fetch(`/api/notebook?id=${e.id}`)
      if (res.ok) {
        const full = await res.json()
        setSelected(full)
        setEntries(prev => prev.map(x => x.id === full.id ? { ...x, content: full.content } : x))
      } else { setSelected(e) }
    } catch { setSelected(e) }
    finally { setLoadingEntry(false); setView("viewer") }
  }

  // ── Toggle pin ──────────────────────────────────────────────────────────────
  async function togglePin(e: NotebookEntry, ev: React.MouseEvent) {
    ev.stopPropagation()
    await fetch(`/api/notebook?id=${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !e.isPinned }),
    })
    setEntries(prev => prev.map(x => x.id === e.id ? { ...x, isPinned: !e.isPinned } : x))
    if (selected?.id === e.id) setSelected(s => s ? { ...s, isPinned: !e.isPinned } : s)
  }

  // ── Delete entry ────────────────────────────────────────────────────────────
  async function deleteEntry(e: NotebookEntry) {
    if (!confirm(`Excluir "${e.title}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/notebook?id=${e.id}`, { method: "DELETE" })
    setEntries(prev => prev.filter(x => x.id !== e.id))
    if (selected?.id === e.id) { setSelected(null); setView("list") }
  }

  // ── Save new entry ──────────────────────────────────────────────────────────
  async function saveNewEntry() {
    if (!newForm.title.trim() || !newForm.content.trim()) {
      setError("Título e conteúdo são obrigatórios.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newForm.title,
          content: newForm.content,
          entryType: newForm.entryType,
          category: newForm.category || undefined,
          tags: newForm.tags ? newForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        }),
      })
      if (!res.ok) { setError("Erro ao salvar entrada"); return }
      setSuccess("Entrada salva no notebook!")
      setNewForm({ title: "", content: "", entryType: "NOTE", category: "", tags: "" })
      setView("list")
      await loadEntries()
    } catch { setError("Erro ao salvar") }
    finally { setSaving(false) }
  }

  // ── Generate document ───────────────────────────────────────────────────────
  async function generateDocument() {
    if (genForm.selectedEntryIds.length === 0) {
      setError("Selecione ao menos uma entrada do notebook para gerar o documento.")
      return
    }
    setGenerating(true)
    setGeneratedDoc(null)
    setError("")
    try {
      const res = await fetch("/api/notebook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryIds: genForm.selectedEntryIds,
          genType: genForm.genType,
          title: genForm.title || undefined,
          journal: genForm.journal || undefined,
          style: genForm.style,
          language: genForm.language,
          keywords: genForm.keywords ? genForm.keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
          extraNotes: genForm.extraNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Erro ao gerar documento"); return }
      setGeneratedDoc({ type: data.genType, label: data.label, content: data.document, generatedAt: data.generatedAt })
      setSuccess(`${data.label} gerado com sucesso! (${data.creditsUsed} créditos)`)
    } catch { setError("Erro de conexão") }
    finally { setGenerating(false) }
  }

  function downloadDoc(content: string, ext: "md" | "txt") {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bia_doc_${Date.now()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printDoc(content: string, label: string) {
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${label}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.7; color: #111827; padding: 2cm; }
    .header { background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; padding: 18px 24px; margin: -2cm -2cm 28px; }
    .header h1 { font-size: 15pt; }
    .header p { font-size: 9pt; color: #a5b4fc; margin-top: 4px; }
    h1 { font-size: 17pt; color: #1e1b4b; border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin: 22px 0 10px; }
    h2 { font-size: 14pt; color: #1e3a8a; margin: 18px 0 8px; }
    h3 { font-size: 12pt; color: #2563eb; margin: 14px 0 6px; }
    p { margin: 7px 0; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    thead { background: #1e3a8a; color: white; }
    th { padding: 8px 12px; text-align: left; font-weight: 600; }
    td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f0f4ff; }
    blockquote { border-left: 4px solid #f59e0b; padding: 8px 16px; background: #fffbeb; margin: 10px 0; }
    code { font-family: monospace; background: #f3f4f6; padding: 1px 5px; border-radius: 3px; font-size: 9.5pt; }
    ul, ol { margin: 6px 0 6px 20px; }
    li { margin-bottom: 4px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    strong { color: #1e3a8a; font-weight: 700; }
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 9pt; color: #9ca3af; text-align: center; }
    @media print { @page { margin: 1.5cm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧬 BIA v4 — ${label}</h1>
    <p>Gerado em ${new Date().toLocaleString("pt-BR")} | Notebook do Pesquisador</p>
  </div>
  <pre style="white-space: pre-wrap; font-family: inherit; font-size: 11pt; line-height: 1.7;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  <div class="footer">Documento gerado por BIA v4 — Plataforma de Biofabricação | ${new Date().toLocaleDateString("pt-BR")}</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`)
    win.document.close()
  }

  const pinnedEntries   = entries.filter(e => e.isPinned)
  const regularEntries  = entries.filter(e => !e.isPinned)
  const totalEntries    = total

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#0a0a1a]/95 backdrop-blur border-b border-white/[0.06] px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button onClick={() => { setView("list"); setGeneratedDoc(null) }}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                <BookMarked className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Notebook do Pesquisador</h1>
                <p className="text-[10px] text-gray-500">{totalEntries} {totalEntries === 1 ? "entrada" : "entradas"} · Histórico de Elite em Biofabricação</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setView("generate"); setGeneratedDoc(null) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gerar Artigo / Patente</span>
              <span className="sm:hidden">Gerar</span>
            </button>
            <button onClick={() => setView("create")}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.10] text-gray-300 rounded-xl text-xs font-semibold transition-all border border-white/[0.08]">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Nota</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">

        {/* Alerts */}
        {error && (
          <div className="mb-4 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-300">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── VIEW: LIST ─────────────────────────────────────────────────────── */}
        {view === "list" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar no notebook..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                {ENTRY_TYPES.slice(0, 6).map(t => (
                  <button key={t.value}
                    onClick={() => setTypeFilter(t.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border",
                      typeFilter === t.value
                        ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                        : "bg-white/[0.03] border-white/[0.07] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"
                    )}>
                    <t.icon className="w-3 h-3" />
                    {t.label}
                  </button>
                ))}
                <button onClick={loadEntries} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 shrink-0">
                  <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Total de Entradas",   value: total,                                                   icon: BookMarked, color: "indigo" },
                { label: "Protocolos Salvos",   value: entries.filter(e => e.entryType === "PROTOCOL").length,  icon: FileCheck2, color: "violet" },
                { label: "Artigos / Patentes",  value: entries.filter(e => ["ARTICLE_DRAFT","PATENT_DRAFT"].includes(e.entryType)).length, icon: Award, color: "amber" },
                { label: "Itens Fixados",        value: entries.filter(e => e.isPinned).length,                 icon: Pin,        color: "emerald" },
              ].map((s, i) => {
                const style = TYPE_STYLE[s.color] ?? TYPE_STYLE.gray
                return (
                  <div key={i} className={cn("rounded-xl p-3 border flex items-center gap-3", style.bg, style.border)}>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", style.bg)}>
                      <s.icon className={cn("w-4 h-4", style.text)} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {loading && entries.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm text-gray-400">Carregando notebook...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <BookMarked className="w-10 h-10 text-indigo-400/60" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Notebook vazio</h3>
                  <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                    Salve protocolos, formulações e análises aqui para criar seu histórico de elite em biofabricação e gerar artigos científicos, patentes e livros com IA.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setView("create")}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all">
                    <Plus className="w-4 h-4" /> Nova Nota
                  </button>
                  <a href="/dashboard/protocols"
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-gray-300 rounded-xl text-sm font-semibold transition-all border border-white/[0.08]">
                    <FileCheck2 className="w-4 h-4" /> Ir para Protocolos
                  </a>
                </div>
              </div>
            ) : (
              <>
                {/* Pinned entries */}
                {pinnedEntries.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Pin className="w-3 h-3 text-amber-400" /> Fixados
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {pinnedEntries.map(e => (
                        <EntryCard key={e.id} entry={e} onOpen={openEntry} onPin={togglePin} onDelete={deleteEntry} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular entries */}
                {regularEntries.length > 0 && (
                  <div>
                    {pinnedEntries.length > 0 && (
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Todas as Entradas</h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {regularEntries.map(e => (
                        <EntryCard key={e.id} entry={e} onOpen={openEntry} onPin={togglePin} onDelete={deleteEntry} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── VIEW: CREATE ───────────────────────────────────────────────────── */}
        {view === "create" && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Nova Entrada no Notebook
            </h2>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Título *</label>
              <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Formulação GelMA 8% - Teste 1"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Tipo de Entrada</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {ENTRY_TYPES.slice(1).map(t => {
                  const s = TYPE_STYLE[t.color] ?? TYPE_STYLE.gray
                  const sel = newForm.entryType === t.value
                  return (
                    <button key={t.value} onClick={() => setNewForm(f => ({ ...f, entryType: t.value }))}
                      className={cn("flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all",
                        sel ? `${s.bg} ${s.border}` : "border-white/[0.06] bg-white/[0.02] hover:border-white/15")}>
                      <t.icon className={cn("w-4 h-4", sel ? s.text : "text-gray-600")} />
                      <span className={cn("text-[10px] font-medium leading-tight", sel ? "text-white" : "text-gray-500")}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Categoria</label>
                <input value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="ex: GelMA, Osso, Pele"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tags (separadas por vírgula)</label>
                <input value={newForm.tags} onChange={e => setNewForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="ex: GLP, cartilagem, bioink"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Conteúdo * (suporta Markdown)</label>
              <textarea
                value={newForm.content}
                onChange={e => setNewForm(f => ({ ...f, content: e.target.value }))}
                rows={10}
                placeholder="Escreva suas notas, resultados, observações, parâmetros, referências...

# Titulo da nota
## Seção

| Parâmetro | Valor |
|-----------|-------|
| Temperatura | 37°C |

**Resultado:** Viabilidade > 85%"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all resize-none font-mono leading-relaxed"
              />
              <p className="text-[10px] text-gray-600 mt-1">{newForm.content.length} caracteres · Markdown suportado</p>
            </div>

            <button onClick={saveNewEntry} disabled={saving || !newForm.title.trim() || !newForm.content.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar no Notebook"}
            </button>
          </div>
        )}

        {/* ── VIEW: GENERATE ─────────────────────────────────────────────────── */}
        {view === "generate" && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Gerador de Documentos Científicos
              </h2>
              <p className="text-sm text-gray-400">
                Selecione entradas do seu notebook e gere artigos, patentes e capítulos com IA BIA.
              </p>
            </div>

            {/* Tipo de documento */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                Tipo de Documento
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GEN_TYPES.map(g => {
                  const sel = genForm.genType === g.key
                  return (
                    <button key={g.key} onClick={() => setGenForm(f => ({ ...f, genType: g.key }))}
                      className={cn(
                        "flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all",
                        sel ? "bg-indigo-500/15 border-indigo-500/30" : "bg-white/[0.02] border-white/[0.07] hover:border-indigo-500/20 hover:bg-indigo-500/5"
                      )}>
                      <div className="flex items-center gap-2 w-full">
                        <g.icon className={cn("w-4 h-4", sel ? "text-indigo-300" : "text-gray-500")} />
                        <span className={cn("text-xs font-semibold", sel ? "text-white" : "text-gray-400")}>{g.label}</span>
                        <span className={cn("ml-auto text-[10px] font-bold", sel ? "text-indigo-300" : "text-gray-600")}>{g.cost}cr</span>
                      </div>
                      <p className="text-[10px] text-gray-600 leading-tight">{g.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selecionar entradas */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Entradas do Notebook (base de dados para a IA)
              </label>
              {entries.length === 0 ? (
                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
                  Seu notebook está vazio. Salve protocolos e notas primeiro.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.08] divide-y divide-white/[0.05]">
                  {entries.map(e => {
                    const sel = genForm.selectedEntryIds.includes(e.id)
                    const s = entryStyle(e.entryType)
                    return (
                      <button key={e.id}
                        onClick={() => setGenForm(f => ({
                          ...f,
                          selectedEntryIds: sel
                            ? f.selectedEntryIds.filter(id => id !== e.id)
                            : [...f.selectedEntryIds, e.id]
                        }))}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all",
                          sel ? "bg-indigo-500/10" : "bg-white/[0.02] hover:bg-white/[0.04]"
                        )}>
                        <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0", sel ? "bg-indigo-500 border-indigo-500" : "border-white/20 bg-transparent")}>
                          {sel && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <EntryIcon type={e.entryType} className={cn("w-3.5 h-3.5 flex-shrink-0", s.text)} />
                        <span className="text-xs text-gray-300 flex-1 truncate">{e.title}</span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", s.pill)}>
                          {ENTRY_TYPES.find(t => t.value === e.entryType)?.label ?? e.entryType}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              {genForm.selectedEntryIds.length > 0 && (
                <p className="text-[11px] text-indigo-300 mt-1.5">{genForm.selectedEntryIds.length} entrada(s) selecionada(s)</p>
              )}
            </div>

            {/* Opções */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Título do Documento (opcional)</label>
                <input value={genForm.title} onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Deixe em branco para IA sugerir"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Periódico / Congresso (opcional)</label>
                <input value={genForm.journal} onChange={e => setGenForm(f => ({ ...f, journal: e.target.value }))}
                  placeholder="ex: Biofabrication, TERMIS 2025"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Estilo de Referências</label>
                <select value={genForm.style} onChange={e => setGenForm(f => ({ ...f, style: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-all">
                  <option value="Vancouver">Vancouver</option>
                  <option value="ABNT">ABNT</option>
                  <option value="APA">APA</option>
                  <option value="Chicago">Chicago</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Idioma</label>
                <select value={genForm.language} onChange={e => setGenForm(f => ({ ...f, language: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/40 transition-all">
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Palavras-chave (separadas por vírgula)</label>
              <input value={genForm.keywords} onChange={e => setGenForm(f => ({ ...f, keywords: e.target.value }))}
                placeholder="ex: bioprinting, hydrogel, tissue engineering, GelMA"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all" />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Instruções Adicionais (opcional)</label>
              <textarea value={genForm.extraNotes} onChange={e => setGenForm(f => ({ ...f, extraNotes: e.target.value }))}
                rows={3} placeholder="Ex: Focar em aspectos de translação clínica, incluir comparação com literaturas específicas..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all resize-none" />
            </div>

            <button onClick={generateDocument}
              disabled={generating || genForm.selectedEntryIds.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA BIA...</> : (
                <><Sparkles className="w-4 h-4" /> Gerar {GEN_TYPES.find(g => g.key === genForm.genType)?.label ?? "Documento"} ({GEN_TYPES.find(g => g.key === genForm.genType)?.cost ?? 0} créditos)</>
              )}
            </button>

            {generating && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Gerando documento científico completo — pode levar 30–60 segundos...</p>
                <div className="flex justify-center gap-1 mt-2">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i*0.12}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Resultado da geração */}
            {generatedDoc && (
              <div className="rounded-2xl border border-indigo-500/20 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-indigo-900/20 border-b border-indigo-500/15">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">{generatedDoc.label} gerado!</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => { navigator.clipboard.writeText(generatedDoc.content ?? ""); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] text-gray-300 rounded-lg text-[11px] transition-all border border-white/[0.07]">
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                    <button onClick={() => downloadDoc(generatedDoc.content ?? "", "md")}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[11px] transition-all border border-blue-500/20 hover:bg-blue-500/20">
                      <Download className="w-3 h-3" /> .md
                    </button>
                    <button onClick={() => downloadDoc(generatedDoc.content ?? "", "txt")}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[11px] transition-all border border-blue-500/20 hover:bg-blue-500/20">
                      <Download className="w-3 h-3" /> .txt
                    </button>
                    <button onClick={() => printDoc(generatedDoc.content ?? "", generatedDoc.label ?? "Documento")}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg text-[11px] transition-all border border-purple-500/20 hover:bg-purple-500/20">
                      <Printer className="w-3 h-3" /> PDF
                    </button>
                  </div>
                </div>
                <div className={cn("relative overflow-hidden transition-all", !showDocFull && "max-h-[500px]")}>
                  <div className="px-6 py-5">
                    <BiaMarkdown content={generatedDoc.content ?? ""} />
                  </div>
                  {!showDocFull && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a1a] to-transparent" />
                  )}
                </div>
                <button onClick={() => setShowDocFull(v => !v)}
                  className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors mx-auto py-3">
                  {showDocFull ? <><ChevronUp className="w-4 h-4" /> Recolher</> : <><ChevronDown className="w-4 h-4" /> Ler documento completo</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: VIEWER ───────────────────────────────────────────────────── */}
        {view === "viewer" && selected && (
          <div className="max-w-4xl mx-auto">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white/[0.02] border border-white/[0.07] rounded-t-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full border", entryStyle(selected.entryType).pill)}>
                  {ENTRY_TYPES.find(t => t.value === selected.entryType)?.label ?? selected.entryType}
                </span>
                {selected.category && (
                  <span className="text-[10px] text-gray-500 bg-white/[0.05] px-2 py-1 rounded-full border border-white/[0.07]">
                    {selected.category}
                  </span>
                )}
                {selected.tags.map(tag => (
                  <span key={tag} className="text-[10px] text-gray-600 bg-white/[0.03] px-2 py-0.5 rounded-full border border-white/[0.05]">
                    #{tag}
                  </span>
                ))}
                <span className="text-[10px] text-gray-600">
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {new Date(selected.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={e => togglePin(selected, e)}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all",
                    selected.isPinned
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                      : "bg-white/[0.04] text-gray-500 border-white/[0.07] hover:text-amber-400")}>
                  {selected.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  {selected.isPinned ? "Desafixar" : "Fixar"}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(selected.content ?? ""); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] text-gray-400 rounded-lg text-[11px] border border-white/[0.07] hover:text-white transition-all">
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <button onClick={() => { if (selected.content) { const b = new Blob([selected.content], {type:"text/plain"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download=`${selected.title.replace(/\s+/g,"_")}.md`; a.click(); URL.revokeObjectURL(u) }}}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[11px] border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                  <Download className="w-3 h-3" /> .md
                </button>
                <button onClick={() => deleteEntry(selected)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-[11px] border border-rose-500/20 hover:bg-rose-500/20 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Header entry */}
            <div className="bg-white/[0.02] border-x border-white/[0.07] px-5 py-4">
              <h1 className="text-lg font-bold text-white">{selected.title}</h1>
            </div>

            {/* Content */}
            {loadingEntry ? (
              <div className="bg-white/[0.02] border-x border-b border-white/[0.07] rounded-b-2xl p-8 text-center">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">Carregando...</p>
              </div>
            ) : (
              <div className="bg-white/[0.02] border-x border-b border-white/[0.07] rounded-b-2xl px-5 sm:px-7 py-6">
                {selected.content ? (
                  <BiaMarkdown content={selected.content} />
                ) : (
                  <p className="text-sm text-gray-500">Conteúdo não disponível.</p>
                )}
              </div>
            )}

            {/* Documento gerado (se existir) */}
            {selected.generatedDoc && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/8 border-b border-amber-500/15">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-300">
                    {(selected.generatedDoc as unknown as GeneratedDoc).label ?? "Documento Gerado por IA"}
                  </p>
                  <span className="text-[10px] text-amber-400/60 ml-1">
                    {(selected.generatedDoc as unknown as GeneratedDoc).generatedAt
                      ? new Date(String((selected.generatedDoc as unknown as GeneratedDoc).generatedAt)).toLocaleDateString("pt-BR")
                      : ""}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <BiaMarkdown content={String((selected.generatedDoc as unknown as GeneratedDoc).content ?? "")} />
                </div>
              </div>
            )}

            {/* CTA gerar documento */}
            <div className="mt-4 flex items-center justify-end">
              <button onClick={() => { setGenForm(f => ({ ...f, selectedEntryIds: [selected.id] })); setView("generate") }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/15 border border-indigo-500/25">
                <Sparkles className="w-3.5 h-3.5" />
                Gerar Artigo / Patente com esta nota
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Entry Card Component ─────────────────────────────────────────────────────
function EntryCard({
  entry, onOpen, onPin, onDelete,
}: {
  entry: NotebookEntry
  onOpen: (e: NotebookEntry) => void
  onPin: (e: NotebookEntry, ev: React.MouseEvent) => void
  onDelete: (e: NotebookEntry) => void
}) {
  const s = entryStyle(entry.entryType)
  const typeInfo = ENTRY_TYPES.find(t => t.value === entry.entryType)
  const hasDoc = !!entry.generatedDoc

  return (
    <div
      onClick={() => onOpen(entry)}
      className={cn(
        "group relative rounded-xl border p-3.5 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg",
        entry.isPinned
          ? "border-amber-500/25 bg-amber-500/5 hover:border-amber-500/40"
          : "border-white/[0.07] bg-white/[0.02] hover:border-indigo-500/25 hover:bg-white/[0.04]"
      )}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", s.bg, s.border, "border")}>
            <EntryIcon type={entry.entryType} className={cn("w-3 h-3", s.text)} />
          </div>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", s.pill)}>
            {typeInfo?.label ?? entry.entryType}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => onPin(entry, e)} title={entry.isPinned ? "Desafixar" : "Fixar"}
            className="p-1 rounded hover:bg-white/[0.08] transition-colors">
            {entry.isPinned ? <PinOff className="w-3 h-3 text-amber-400" /> : <Pin className="w-3 h-3 text-gray-500" />}
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(entry) }} title="Excluir"
            className="p-1 rounded hover:bg-rose-500/10 transition-colors">
            <Trash2 className="w-3 h-3 text-gray-600 hover:text-rose-400" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-1.5">{entry.title}</h3>

      {/* Category & tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {entry.category && (
          <span className="text-[10px] text-gray-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
            {entry.category}
          </span>
        )}
        {entry.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-[10px] text-gray-600">#{tag}</span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/[0.04]">
        <span className="text-[10px] text-gray-600">
          {new Date(entry.updatedAt).toLocaleDateString("pt-BR")}
        </span>
        <div className="flex items-center gap-2">
          {hasDoc && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400/80">
              <Sparkles className="w-2.5 h-2.5" /> Doc IA
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
        </div>
      </div>
    </div>
  )
}

// Hack para Clock no viewer inline
function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
