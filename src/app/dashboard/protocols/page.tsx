"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText, Plus, Loader2, Zap, Download, ChevronLeft,
  AlertCircle, CheckCircle2, RefreshCw, BookOpen, Beaker,
  Shield, Microscope, Printer, FlaskConical, X, ChevronRight,
  Clock, Sparkles, BookMarked, Copy, Check, ExternalLink,
  PenLine, Save,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { BiaMarkdown } from "@/components/ui/BiaMarkdown"

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
  { value: "CULTURE",          label: "Cultura Celular",           icon: Microscope,   color: "violet",  desc: "SOPs de cultura, passagem, manutenção celular" },
  { value: "SYNTHESIS",        label: "Síntese de Biomaterial",    icon: FlaskConical, color: "blue",    desc: "Preparação de hidrogéis, scaffolds, bioinks" },
  { value: "CHARACTERIZATION", label: "Caracterização",            icon: Beaker,       color: "emerald", desc: "Análise mecânica, reológica, bioquímica" },
  { value: "QUALITY_CONTROL",  label: "Controle de Qualidade",     icon: CheckCircle2, color: "amber",   desc: "QC/QA, critérios de liberação de lotes" },
  { value: "BIOPRINTING",      label: "Bioimpressão 3D",           icon: Printer,      color: "indigo",  desc: "Calibração, parâmetros, pós-processamento" },
  { value: "STERILIZATION",    label: "Esterilização",             icon: Shield,       color: "rose",    desc: "Autoclavagem, filtração, UV, ETO" },
  { value: "ELECTROSPINNING",  label: "Eletrofiação",              icon: Zap,          color: "amber",   desc: "Fibras nanométricas para scaffolds" },
  { value: "REGULATORY",       label: "Documentação Regulatória",  icon: BookOpen,     color: "purple",  desc: "Dossiês FDA, ANVISA, EMA — GLP/GMP" },
]

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  violet: { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  badge: "bg-violet-500/15 text-violet-300 border-violet-500/25",  dot: "bg-violet-400" },
  blue:   { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    badge: "bg-blue-500/15 text-blue-300 border-blue-500/25",          dot: "bg-blue-400" },
  emerald:{ bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", dot: "bg-emerald-400" },
  amber:  { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/25",       dot: "bg-amber-400" },
  indigo: { bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  text: "text-indigo-400",  badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25",    dot: "bg-indigo-400" },
  rose:   { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-400",    badge: "bg-rose-500/15 text-rose-300 border-rose-500/25",          dot: "bg-rose-400" },
  purple: { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-400",  badge: "bg-purple-500/15 text-purple-300 border-purple-500/25",    dot: "bg-purple-400" },
}

function typeColor(type: string) {
  const t = PROTOCOL_TYPES.find(p => p.value === type)
  return TYPE_COLORS[t?.color ?? "violet"] ?? TYPE_COLORS.violet
}

// ─── Toolbar de ações do protocolo ───────────────────────────────────────────
function ProtocolToolbar({
  protocol,
  onDownloadMD,
  onDownloadTXT,
  onPrint,
  onCopy,
  onSaveNotebook,
  copied,
  saving,
  saved,
}: {
  protocol: Protocol
  onDownloadMD: () => void
  onDownloadTXT: () => void
  onPrint: () => void
  onCopy: () => void
  onSaveNotebook: () => void
  copied: boolean
  saving: boolean
  saved: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-3 bg-white/[0.02] border-b border-white/[0.06] rounded-t-2xl">
      {/* Badge tipo */}
      <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full border", typeColor(protocol.type).badge)}>
        {protocol.typeName ?? protocol.type}
      </span>
      <span className="text-[10px] text-gray-500 bg-white/[0.05] px-2 py-1 rounded-full border border-white/[0.06]">
        v{protocol.version}
      </span>
      <span className="text-[10px] text-gray-500 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {new Date(protocol.createdAt).toLocaleDateString("pt-BR")}
      </span>
      <span className="text-[10px] text-gray-600">{protocol.creditsUsed} créditos</span>

      <div className="ml-auto flex items-center gap-1.5 flex-wrap">
        {/* Copiar */}
        <button
          onClick={onCopy}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] text-gray-400 hover:text-white rounded-lg text-[11px] font-medium transition-all border border-white/[0.06]"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>

        {/* Download .md */}
        <button
          onClick={onDownloadMD}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[11px] font-medium transition-all border border-blue-500/20"
        >
          <Download className="w-3 h-3" /> .md
        </button>

        {/* Download .txt */}
        <button
          onClick={onDownloadTXT}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[11px] font-medium transition-all border border-blue-500/20"
        >
          <Download className="w-3 h-3" /> .txt
        </button>

        {/* Imprimir/PDF */}
        <button
          onClick={onPrint}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-[11px] font-medium transition-all border border-purple-500/20"
        >
          <Printer className="w-3 h-3" /> PDF
        </button>

        {/* Salvar no Notebook */}
        <button
          onClick={onSaveNotebook}
          disabled={saving || saved}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border",
            saved
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/25"
          )}
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saved ? (
            <Check className="w-3 h-3" />
          ) : (
            <BookMarked className="w-3 h-3" />
          )}
          {saved ? "Salvo!" : "Salvar no Notebook"}
        </button>
      </div>
    </div>
  )
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
  const [copied, setCopied]         = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)

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
    if (p.content) { setSelected(p); setSaved(false); return }
    setLoadingContent(true)
    try {
      const res = await fetch(`/api/protocols?id=${p.id}`)
      if (res.ok) {
        const full = await res.json()
        setSelected(full)
        setSaved(false)
        setProtocols(prev => prev.map(pp => pp.id === full.id ? { ...pp, content: full.content } : pp))
      }
    } catch { setSelected(p) }
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
      if (!res.ok) { setError(data.error ?? "Erro ao gerar protocolo"); return }
      setSuccess(`Protocolo "${data.title}" gerado com sucesso!`)
      setShowCreate(false)
      setForm({ title: "", type: "CULTURE", context: "", tissueType: "", application: "", specialRequirements: "" })
      await loadProtocols()
      await loadProtocolContent(data)
    } catch { setError("Erro ao conectar com o servidor.") }
    finally { setGenerating(false) }
  }

  // ── Download ────────────────────────────────────────────────────────────────
  function downloadProtocol(p: Protocol, ext: "md" | "txt" = "md") {
    if (!p.content) return
    const blob = new Blob([p.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `protocolo_${p.title.toLowerCase().replace(/\s+/g, "_").substring(0, 40)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Print / PDF ─────────────────────────────────────────────────────────────
  function printProtocol(p: Protocol) {
    if (!p.content) return
    const win = window.open("", "_blank")
    if (!win) return
    const typeInfo = PROTOCOL_TYPES.find(t => t.value === p.type)
    
    // Simple markdown to HTML converter
    function md2html(md: string): string {
      let html = md
        .replace(/</g, "&lt;").replace(/>/g, "&gt;")
        // Headers
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold and italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Blockquotes
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
        // Horizontal rules
        .replace(/^---+$/gm, '<hr/>')
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.replace(/```\w*\n?/, '').replace(/\n?```$/, '')
          return `<pre><code>${code}</code></pre>`
        })
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Unordered lists
        .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Tables (basic)
        .replace(/\|(.+)\|/g, (match) => {
          const cells = match.split('|').filter(c => c.trim())
          if (cells.every(c => /^[\s\-:]+$/.test(c))) return ''
          const isHeader = cells.some(c => /^\s*\*\*/.test(c))
          const tag = isHeader ? 'th' : 'td'
          return `<tr>${cells.map(c => `<${tag}>${c.trim().replace(/\*\*/g, '')}</${tag}>`).join('')}</tr>`
        })
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>')
      
      // Wrap in paragraphs
      html = `<p>${html}</p>`
      
      // Clean up consecutive list items
      html = html.replace(/(<li>.*?<\/li>(<br\/>)?)+/g, (match) => {
        return `<ul>${match.replace(/<br\/>/g, '')}</ul>`
      })
      
      // Wrap table rows
      html = html.replace(/(<tr>.*?<\/tr>(<br\/>)?)+/g, (match) => {
        return `<table>${match.replace(/<br\/>/g, '')}</table>`
      })
      
      return html
    }
    
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Protocolo — ${p.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.65; color: #1a1a2e; background: white; }
    .page { max-width: 800px; margin: 0 auto; padding: 2cm; }
    .header { background: linear-gradient(135deg, #1a1a5e, #312e81); color: white; padding: 20px 28px; margin: -2cm -2cm 28px; border-bottom: 3px solid #4338ca; }
    .header h1 { font-size: 16pt; font-weight: 700; margin-bottom: 4px; }
    .header .meta { font-size: 9pt; color: #a5b4fc; display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
    .header .badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 99px; font-size: 9pt; font-weight: 600; }
    h1 { font-size: 18pt; color: #1a1a5e; margin: 24px 0 10px; border-bottom: 2px solid #4338ca; padding-bottom: 6px; }
    h2 { font-size: 14pt; color: #1e3a8a; margin: 20px 0 8px; display: flex; align-items: center; gap: 6px; }
    h2::before { content: ""; display: inline-block; width: 4px; height: 18px; background: #4338ca; border-radius: 2px; }
    h3 { font-size: 12pt; color: #2563eb; margin: 14px 0 6px; }
    h4 { font-size: 11pt; color: #3730a3; margin: 10px 0 4px; }
    p { margin: 6px 0; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 6px; overflow: hidden; }
    thead tr, tr:first-child { background: #1e3a8a; color: white; }
    th { padding: 8px 12px; text-align: left; font-weight: 600; font-size: 10pt; }
    tr:nth-child(even) { background: #f0f4ff; }
    tr:nth-child(odd) { background: white; }
    td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    blockquote { border-left: 4px solid #f59e0b; padding: 8px 16px; background: #fffbeb; margin: 10px 0; color: #92400e; font-style: italic; border-radius: 0 6px 6px 0; }
    code { font-family: 'Consolas', monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 9.5pt; color: #1e40af; border: 1px solid #e5e7eb; }
    pre { background: #0f172a; color: #a5f3fc; padding: 12px 16px; border-radius: 6px; font-size: 9pt; font-family: 'Consolas', monospace; overflow-x: auto; margin: 10px 0; }
    pre code { background: none; border: none; padding: 0; color: inherit; }
    ul, ol { margin: 6px 0 6px 24px; }
    li { margin-bottom: 4px; color: #374151; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    strong { color: #1e3a8a; }
    em { color: #4338ca; }
    .content { margin-top: 8px; }
    .footer { margin-top: 36px; padding-top: 12px; border-top: 2px solid #4338ca; font-size: 9pt; color: #9ca3af; text-align: center; }
    .footer .disclaimer { color: #f59e0b; font-weight: 600; margin-bottom: 4px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 1.5cm; } .header { margin: -1.5cm -1.5cm 24px; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>${p.title}</h1>
    <div class="meta">
      <span class="badge">${typeInfo?.label ?? p.type}</span>
      <span>Versao ${p.version}</span>
      <span>Gerado em ${new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>
      <span>BIA v4 — Biofabrication Intelligent Assistant</span>
    </div>
  </div>
  <div class="content">${md2html(p.content)}</div>
  <div class="footer">
    <p class="disclaimer">Protocolo gerado por IA — Validacao por profissional habilitado obrigatoria</p>
    <p>BIA v4 — Biofabrication Intelligent Assistant | Quantis Biotecnologia | ${new Date().toLocaleDateString("pt-BR")}</p>
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`)
    win.document.close()
  }

  // ── Copy ────────────────────────────────────────────────────────────────────
  function copyProtocol(p: Protocol) {
    if (!p.content) return
    navigator.clipboard.writeText(p.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Save to Notebook ────────────────────────────────────────────────────────
  async function saveToNotebook(p: Protocol) {
    if (!p.content) return
    setSaving(true)
    try {
      const res = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: p.title,
          content: p.content,
          entryType: "PROTOCOL",
          category: PROTOCOL_TYPES.find(t => t.value === p.type)?.label ?? p.type,
          tags: [p.type, "GLP/GMP", "Protocolo"],
          sourceType: "protocol",
          sourceId: p.id,
        }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch { /* silenciar */ }
    finally { setSaving(false) }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a1a] text-white">

      {/* ── Sidebar lista (desktop) ──────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 xl:w-72 shrink-0 border-r border-white/[0.06] bg-[#0d0d20]">
        <ProtocolList
          protocols={protocols}
          loading={loading}
          selected={selected}
          onSelect={p => { setShowCreate(false); loadProtocolContent(p) }}
          onNew={() => { setShowCreate(true); setSelected(null) }}
          onRefresh={loadProtocols}
        />
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────────── */}
      {showList && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setShowList(false)} />
          <div className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#0d0d20] z-50 flex flex-col border-r border-white/[0.06] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <span className="text-sm font-bold text-white">Protocolos</span>
              <button onClick={() => setShowList(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ProtocolList
              protocols={protocols} loading={loading} selected={selected}
              onSelect={p => { setShowCreate(false); loadProtocolContent(p); setShowList(false) }}
              onNew={() => { setShowCreate(true); setSelected(null); setShowList(false) }}
              onRefresh={loadProtocols}
              compact
            />
          </div>
        </>
      )}

      {/* ── Main content area ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06] shrink-0 bg-[#0d0d20]">
          <button onClick={() => setShowList(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] text-gray-400 hover:text-white text-xs font-medium transition-colors border border-white/[0.06]">
            <FileText className="w-3.5 h-3.5" />
            Protocolos ({protocols.length})
          </button>
          <button onClick={() => { setShowCreate(true); setSelected(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/80 text-white text-xs font-semibold hover:bg-violet-500 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>
        </div>

        {/* Alerts */}
        <div className="shrink-0 px-4 sm:px-5">
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
              <button onClick={() => setSuccess(null)} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Content scroll area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">

          {/* ── CREATE FORM ──────────────────────────────────────────────────── */}
          {showCreate && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-white">Novo Protocolo GLP/GMP</h2>
                  <p className="text-xs text-gray-400">BIA gera protocolo completo · 8 créditos</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Título *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Preparação de GelMA 8% para bioimpressão de cartilagem articular"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all"
                />
              </div>

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
                          sel ? `${c.bg} ${c.border} shadow-sm` : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
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

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                  Contexto e Objetivo * <span className="text-gray-600 font-normal">(descreva detalhadamente)</span>
                </label>
                <textarea
                  value={form.context}
                  onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                  rows={4}
                  placeholder="Descreva o objetivo do protocolo, materiais disponíveis, condições específicas, requisitos de biossegurança, equipamentos no laboratório, etc."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all resize-none"
                />
                <p className="text-[10px] text-gray-600 mt-1">{form.context.length} caracteres — mín. 10</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tecido/Material Alvo</label>
                  <input value={form.tissueType} onChange={e => setForm(f => ({ ...f, tissueType: e.target.value }))}
                    placeholder="ex: cartilagem, GelMA 8%"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Aplicação Clínica</label>
                  <input value={form.application} onChange={e => setForm(f => ({ ...f, application: e.target.value }))}
                    placeholder="ex: regeneração óssea"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Requisitos Especiais</label>
                <input value={form.specialRequirements} onChange={e => setForm(f => ({ ...f, specialRequirements: e.target.value }))}
                  placeholder="ex: GLP obrigatório, sala limpa ISO 7, animais in vivo"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
              </div>

              <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-3.5 flex gap-3">
                <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Protocolo completo GLP/GMP: objetivo, materiais, EPIs, equipamentos, procedimento passo-a-passo, pontos críticos, troubleshooting e referências normativas (ISO, ASTM, ANVISA, FDA).
                  <span className="text-violet-300 font-semibold"> 8 créditos.</span>
                </p>
              </div>

              <button
                onClick={generateProtocol}
                disabled={generating || !form.title.trim() || !form.context.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] shadow-lg shadow-violet-500/20"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gerando com IA BIA...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Gerar Protocolo (8 créditos)</>
                )}
              </button>

              {generating && (
                <div className="text-center pt-1">
                  <p className="text-xs text-gray-500">Aguarde 20–40 segundos...</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROTOCOL VIEWER ─────────────────────────────────────────────── */}
          {!showCreate && selected && (
            <div className="max-w-4xl mx-auto">
              {/* Toolbar de ações */}
              <ProtocolToolbar
                protocol={selected}
                onDownloadMD={() => downloadProtocol(selected, "md")}
                onDownloadTXT={() => downloadProtocol(selected, "txt")}
                onPrint={() => printProtocol(selected)}
                onCopy={() => copyProtocol(selected)}
                onSaveNotebook={() => saveToNotebook(selected)}
                copied={copied}
                saving={saving}
                saved={saved}
              />

              {/* Cabeçalho do protocolo */}
              <div className="bg-white/[0.02] border-x border-white/[0.06] px-5 py-4">
                <h1 className="text-lg font-bold text-white leading-snug">{selected.title}</h1>
                {selected.description && (
                  <p className="text-sm text-gray-400 mt-1">{selected.description}</p>
                )}
              </div>

              {/* Conteúdo com BiaMarkdown */}
              {loadingContent ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-b-2xl p-8 text-center">
                  <Loader2 className="w-8 h-8 text-violet-400 mx-auto animate-spin mb-3" />
                  <p className="text-sm text-gray-400">Carregando protocolo...</p>
                </div>
              ) : selected.content ? (
                <div className="bg-white/[0.02] border-x border-b border-white/[0.06] rounded-b-2xl px-5 sm:px-7 py-6">
                  <BiaMarkdown content={selected.content} />
                </div>
              ) : (
                <div className="bg-white/[0.02] border-x border-b border-white/[0.06] rounded-b-2xl p-8 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-gray-500">Conteúdo não disponível</p>
                  <button onClick={() => loadProtocolContent(selected)} className="mt-2 text-xs text-violet-400 hover:underline flex items-center gap-1 mx-auto">
                    <RefreshCw className="w-3 h-3" /> Tentar carregar
                  </button>
                </div>
              )}

              {/* Link para notebook */}
              <div className="mt-3 flex items-center justify-end gap-2">
                <a href="/dashboard/notebook" className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  <BookMarked className="w-3.5 h-3.5" />
                  Ver Notebook do Pesquisador
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
          {!showCreate && !selected && (
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
                <PenLine className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {protocols.length === 0 ? "Nenhum protocolo ainda" : "Selecione um protocolo"}
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm leading-relaxed">
                {protocols.length === 0
                  ? "Gere protocolos laboratoriais completos em formato GLP/GMP com tabelas profissionais, SOPs e referências normativas."
                  : "Escolha um protocolo na lista à esquerda ou crie um novo."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/20">
                  <Plus className="w-4 h-4" />
                  {protocols.length === 0 ? "Criar Primeiro Protocolo" : "Novo Protocolo"}
                </button>
                <a href="/dashboard/notebook"
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 rounded-xl font-semibold text-sm transition-all border border-indigo-500/25">
                  <BookMarked className="w-4 h-4" />
                  Abrir Notebook
                </a>
              </div>
              {protocols.length === 0 && (
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl">
                  {PROTOCOL_TYPES.slice(0, 4).map(pt => {
                    const c = TYPE_COLORS[pt.color] ?? TYPE_COLORS.violet
                    return (
                      <button key={pt.value}
                        onClick={() => { setForm(f => ({ ...f, type: pt.value })); setShowCreate(true) }}
                        className={cn("flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all hover:scale-105", c.bg, c.border)}>
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
  const [filter, setFilter] = useState("")
  const filtered = filter
    ? protocols.filter(p => p.title.toLowerCase().includes(filter.toLowerCase()) || p.type.toLowerCase().includes(filter.toLowerCase()))
    : protocols

  return (
    <>
      <div className="p-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h2 className="text-xs font-bold text-white">Protocolos GLP/GMP</h2>
            <p className="text-[10px] text-gray-500">{protocols.length} gerado{protocols.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Atualizar">
              <RefreshCw className={cn("w-3.5 h-3.5 text-gray-500", loading && "animate-spin")} />
            </button>
            <button onClick={onNew} className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600/80 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all">
              <Plus className="w-3 h-3" /> Novo
            </button>
          </div>
        </div>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar protocolo..."
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/40 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading && protocols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            <p className="text-xs text-gray-500">Carregando...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-500">{filter ? "Nenhum resultado" : "Nenhum protocolo ainda"}</p>
            {!filter && <button onClick={onNew} className="mt-2 text-xs text-violet-400 hover:underline">Criar primeiro</button>}
          </div>
        ) : (
          filtered.map(p => {
            const c = typeColor(p.type)
            const isSelected = selected?.id === p.id
            return (
              <button key={p.id} onClick={() => onSelect(p)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all border-b border-white/[0.04] hover:bg-white/[0.04]",
                  isSelected && "bg-violet-500/[0.08] border-l-2 border-l-violet-500 pl-2.5"
                )}>
                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5", c.bg, c.border, "border")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-white leading-snug line-clamp-2">{p.title}</p>
                  {!compact && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border", c.badge)}>
                        {p.typeName ?? p.type}
                      </span>
                      <span className="text-[9px] text-gray-600">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-3 h-3 text-gray-600 shrink-0 mt-1" />
              </button>
            )
          })
        )}
      </div>

      {/* Link para notebook */}
      <div className="p-3 border-t border-white/[0.06] shrink-0">
        <a href="/dashboard/notebook"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-300 text-xs font-semibold transition-all">
          <BookMarked className="w-3.5 h-3.5" />
          Notebook do Pesquisador
          <Save className="w-3 h-3 ml-auto opacity-60" />
        </a>
      </div>
    </>
  )
}
