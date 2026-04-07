"use client"

import { useState, useEffect, useRef } from "react"
import {
  FileText, Download, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, AlertTriangle, Beaker, Printer, BookOpen,
  FlaskConical, Microscope, Shield, ClipboardList, ArrowRight,
  Copy, Check
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface PipelineProject {
  id: string
  name: string
  tissueType: string
  targetApplication?: string
  cellSource?: string
  currentStage: number
  status: string
  stages: Array<{
    stageNumber: number
    name: string
    status: string
  }>
}

interface ProtocolResult {
  protocol: string
  projectName: string
  tissueType: string
  application?: string
  stagesCompleted: number
  generatedAt: string
  creditsUsed: number
}

// ─── Markdown renderer simples ─────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-indigo-300 mt-6 mb-3 border-b border-white/10 pb-2">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-indigo-400 mt-5 mb-2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-indigo-300/80 mt-4 mb-2">$1</h3>')
    // Bold/italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-indigo-200">$1</em>')
    // Code inline
    .replace(/`(.+?)`/g, '<code class="bg-indigo-900/40 text-indigo-200 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-yellow-500 pl-4 py-1 my-2 bg-yellow-500/5 text-yellow-200/80 italic text-sm">$1</blockquote>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      if (match.includes('---')) return '<tr class="border-b border-white/5"></tr>'
      const cells = match.slice(1, -1).split('|').map(c => c.trim())
      return '<tr class="border-b border-white/5">' +
        cells.map(c => `<td class="px-3 py-2 text-sm text-gray-300 whitespace-nowrap">${c}</td>`).join('') +
        '</tr>'
    })
    // Checkboxes
    .replace(/- \[ \] (.+)/g, '<li class="flex items-center gap-2 text-gray-300 text-sm py-0.5"><span class="w-4 h-4 border border-gray-500 rounded inline-block flex-shrink-0"></span>$1</li>')
    .replace(/- \[x\] (.+)/gi, '<li class="flex items-center gap-2 text-green-400 text-sm py-0.5"><span class="w-4 h-4 bg-green-500 rounded inline-block flex-shrink-0">✓</span>$1</li>')
    // Lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-gray-300 text-sm py-0.5 ml-4" style="list-style-type:decimal">$2</li>')
    .replace(/^- (.+)$/gm, '<li class="text-gray-300 text-sm py-0.5 ml-4 list-disc">$1</li>')
    // HR
    .replace(/^---$/gm, '<hr class="border-white/10 my-4"/>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-gray-300 text-sm leading-relaxed my-2">')
    .replace(/^/, '<p class="text-gray-300 text-sm leading-relaxed my-2">')
    .replace(/$/, '</p>')
}

export default function ProtocolTotalPage() {
  const [projects, setProjects] = useState<PipelineProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ProtocolResult | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const protocolRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch("/api/pipeline")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const stagesCompleted = selectedProject?.stages?.filter(s => s.status === "COMPLETED").length ?? 0
  const canGenerate = selectedProject && stagesCompleted >= 1

  async function handleGenerate() {
    if (!selectedProjectId) return
    setGenerating(true)
    setError("")
    setResult(null)

    try {
      const res = await fetch("/api/protocol-total", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao gerar protocolo")
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    if (!result?.protocol) return
    navigator.clipboard.writeText(result.protocol)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadMD() {
    if (!result?.protocol) return
    const blob = new Blob([result.protocol], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `protocolo_biofabricacao_${result.projectName.toLowerCase().replace(/\s+/g, "_")}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadTXT() {
    if (!result?.protocol) return
    const blob = new Blob([result.protocol], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `protocolo_biofabricacao_${result.projectName.toLowerCase().replace(/\s+/g, "_")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    if (!result?.protocol) return
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Protocolo Total — ${result.projectName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a2e; padding: 2cm; }
          h1 { font-size: 18pt; color: #1a1a5e; border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin: 24px 0 12px; }
          h2 { font-size: 14pt; color: #1e3a8a; margin: 20px 0 8px; }
          h3 { font-size: 12pt; color: #2563eb; margin: 16px 0 6px; }
          p { margin: 8px 0; }
          strong { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
          th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
          th { background: #e8eaf6; font-weight: bold; }
          tr:nth-child(even) { background: #f5f5ff; }
          blockquote { border-left: 4px solid #f59e0b; padding: 8px 16px; background: #fffbeb; margin: 12px 0; font-style: italic; }
          li { margin-left: 24px; margin-bottom: 4px; }
          hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
          code { font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 10pt; }
          @media print { body { padding: 1.5cm; } @page { margin: 1.5cm; } }
          .header-bar { background: #1a1a5e; color: white; padding: 16px 24px; margin: -2cm -2cm 24px; }
          .header-bar h1 { color: white; border-bottom: none; margin: 0; }
          .header-bar p { color: #a5b4fc; font-size: 10pt; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <h1>🧬 BIA v4 — Protocolo Técnico de Biofabricação</h1>
          <p>Gerado em ${new Date().toLocaleString("pt-BR")} | Projeto: ${result.projectName}</p>
        </div>
        <pre style="white-space: pre-wrap; font-family: inherit; font-size: 11pt; line-height: 1.6;">${result.protocol.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const PROTOCOL_SECTIONS = [
    { icon: ClipboardList,  label: "Identificação",        desc: "Código, responsável, vigência" },
    { icon: BookOpen,       label: "Fundamento Científico", desc: "Base teórica e referências" },
    { icon: Beaker,         label: "Materiais",             desc: "Biomateriais, reagentes, EPIs" },
    { icon: FlaskConical,   label: "Parâmetros Críticos",   desc: "Reologia, bioimpressão, células" },
    { icon: ClipboardList,  label: "SOP Completo",          desc: "14 sub-etapas operacionais" },
    { icon: CheckCircle2,   label: "Controle de Qualidade", desc: "Hold points, critérios de aceite" },
    { icon: AlertTriangle,  label: "Desvios & CAPA",        desc: "Ações corretivas e preventivas" },
    { icon: Microscope,     label: "Análises",              desc: "Histologia, bioquímica, segurança" },
    { icon: Shield,         label: "Regulatório",           desc: "ANVISA, FDA, EMA, GMP" },
    { icon: Printer,        label: "Biossegurança",         desc: "Descarte, EPI, emergência" },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900/60 to-purple-900/40 border border-indigo-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-indigo-500/20 p-3 flex-shrink-0">
              <FileText className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Protocolo Total de Biofabricação</h1>
              <p className="text-gray-400 text-sm leading-relaxed">
                Gera o <strong className="text-indigo-300">Protocolo Técnico Completo (SOP)</strong> a partir das 12 etapas concluídas no Pipeline BIA.
                Inclui materiais, parâmetros, procedimentos, controle de qualidade e regulatório.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {PROTOCOL_SECTIONS.map(s => (
                  <span key={s.label} className="flex items-center gap-1 bg-indigo-500/10 text-indigo-300 text-xs px-2 py-1 rounded-full border border-indigo-500/20">
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seleção de projeto */}
        <div className="rounded-2xl bg-white/3 border border-white/8 p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-indigo-400" />
            Selecionar Projeto do Pipeline
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando projetos...
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-300">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Nenhum projeto encontrado. Crie um projeto no <a href="/dashboard/pipeline" className="underline">Pipeline BIA</a> primeiro.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(p => {
                const completed = p.stages?.filter(s => s.status === "COMPLETED").length ?? 0
                const selected = p.id === selectedProjectId
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={cn(
                      "w-full text-left rounded-xl border p-4 transition-all",
                      selected
                        ? "border-indigo-500/60 bg-indigo-500/10"
                        : "border-white/8 bg-white/2 hover:border-indigo-500/30 hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.tissueType} · {p.targetApplication ?? "Aplicação não definida"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{completed}/12 etapas</p>
                          <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${(completed / 12) * 100}%` }}
                            />
                          </div>
                        </div>
                        {selected && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Info + Gerar */}
        {selectedProject && (
          <div className="rounded-2xl bg-white/3 border border-white/8 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Projeto: <span className="text-indigo-300">{selectedProject.name}</span>
                </h3>
                <p className="text-xs text-gray-400">
                  {stagesCompleted} de 12 etapas concluídas
                  {stagesCompleted < 12 && (
                    <span className="text-yellow-400 ml-2">
                      — Protocolo gerado com dados disponíveis
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">Custo: 20 créditos</p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all",
                  canGenerate && !generating
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20"
                    : "bg-white/5 text-gray-500 cursor-not-allowed"
                )}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gerando protocolo...</>
                ) : (
                  <><FileText className="w-4 h-4" /> Gerar Protocolo Total</>
                )}
              </button>
            </div>

            {/* Progresso das etapas */}
            <div className="mt-4 grid grid-cols-6 sm:grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const stage = selectedProject.stages?.find(s => s.stageNumber === i + 1)
                const isDone = stage?.status === "COMPLETED"
                const isPartial = stage?.status === "IN_PROGRESS"
                return (
                  <div
                    key={i}
                    title={`Etapa ${i + 1}${stage ? `: ${stage.name}` : ""}`}
                    className={cn(
                      "h-2 rounded-full",
                      isDone ? "bg-indigo-500" : isPartial ? "bg-indigo-500/50" : "bg-white/10"
                    )}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="rounded-2xl bg-white/3 border border-indigo-500/20 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-white/8 bg-indigo-900/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Protocolo gerado com sucesso</p>
                  <p className="text-xs text-gray-400">
                    {result.stagesCompleted} etapas · {result.creditsUsed} créditos · {new Date(result.generatedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 bg-white/8 hover:bg-white/12 text-gray-300 text-xs px-3 py-2 rounded-lg transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                <button
                  onClick={handleDownloadMD}
                  className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs px-3 py-2 rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  .md
                </button>
                <button
                  onClick={handleDownloadTXT}
                  className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs px-3 py-2 rounded-lg transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  .txt
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs px-3 py-2 rounded-lg transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir/PDF
                </button>
              </div>
            </div>

            {/* Conteúdo do protocolo */}
            <div ref={protocolRef} className="p-6">
              <div
                className={cn(
                  "relative overflow-hidden transition-all duration-300",
                  !showAll && "max-h-[600px]"
                )}
              >
                <div
                  className="prose prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(result.protocol) }}
                />
                {!showAll && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0d0d20] to-transparent" />
                )}
              </div>
              <button
                onClick={() => setShowAll(v => !v)}
                className="mt-4 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors mx-auto"
              >
                {showAll ? (
                  <><ChevronUp className="w-4 h-4" /> Recolher protocolo</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Ver protocolo completo</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Preview das seções */}
        {!result && !generating && (
          <div className="rounded-2xl bg-white/2 border border-white/6 p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              O que o Protocolo Total inclui
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROTOCOL_SECTIONS.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/6">
                  <div className="rounded-lg bg-indigo-500/15 p-2 flex-shrink-0">
                    <s.icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
