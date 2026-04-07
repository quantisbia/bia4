"use client"

import { useState, useEffect } from "react"
import { FileText, Plus, Loader2, Zap, Download, Clock, X, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface Protocol {
  id: string; title: string; type: string; status: string
  version: string; content?: string; createdAt: string
}

const PROTOCOL_TYPES = [
  { value: "CULTURE",          label: "Cultura Celular",    desc: "SOPs de cultura, passagem, manutenção" },
  { value: "SYNTHESIS",        label: "Síntese",            desc: "Preparação de biomateriais e reagentes" },
  { value: "CHARACTERIZATION", label: "Caracterização",     desc: "Análise mecânica, bioquímica" },
  { value: "QUALITY_CONTROL",  label: "Controle Qualidade", desc: "QC/QA, liberação de lotes" },
  { value: "BIOPRINTING",      label: "Bioimpressão",       desc: "Calibração, parâmetros, pós-proc." },
  { value: "STERILIZATION",    label: "Esterilização",      desc: "Autoclavagem, filtração, UV" },
]

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    "text-gray-400 bg-gray-500/10",
  REVIEW:   "text-amber-400 bg-amber-500/10",
  APPROVED: "text-emerald-400 bg-emerald-500/10",
  ARCHIVED: "text-gray-600 bg-gray-700/10",
}

export default function ProtocolsPage() {
  const [protocols, setProtocols]   = useState<Protocol[]>([])
  const [loading, setLoading]       = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected]     = useState<Protocol | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showList, setShowList]     = useState(false)   // mobile drawer
  const [form, setForm] = useState({ title: "", type: "", context: "" })

  useEffect(() => { loadProtocols() }, [])

  async function loadProtocols() {
    setLoading(true)
    const res = await fetch("/api/protocols")
    if (res.ok) setProtocols(await res.json())
    setLoading(false)
  }

  async function generateProtocol() {
    if (!form.title || !form.type || !form.context) return
    setGenerating(true)
    try {
      const res = await fetch("/api/protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const protocol = await res.json()
        setProtocols(prev => [protocol, ...prev])
        setSelected(protocol)
        setShowCreate(false)
        setShowList(false)
        setForm({ title: "", type: "", context: "" })
      } else {
        const err = await res.json(); alert(err.error)
      }
    } finally { setGenerating(false) }
  }

  function downloadProtocol(protocol: Protocol) {
    const content = `# ${protocol.title}\n\nVersão: ${protocol.version}\nStatus: ${protocol.status}\nGerado em: ${new Date(protocol.createdAt).toLocaleDateString("pt-BR")}\n\n---\n\n${protocol.content ?? ""}`
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${protocol.title.replace(/\s+/g, "_")}_v${protocol.version}.md`; a.click()
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500/40 transition-colors"

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex w-72 lg:w-80 border-r border-white/5 bg-black/10 flex-col shrink-0">
        <ProtocolList
          protocols={protocols} loading={loading} selected={selected}
          onSelect={(p) => { setSelected(p); setShowCreate(false) }}
          onNew={() => { setShowCreate(true); setSelected(null) }}
        />
      </div>

      {/* ── Mobile: protocols drawer ── */}
      {showList && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowList(false)} />
          <div className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[#0d0720] border-r border-white/8 flex flex-col shadow-2xl">
            <ProtocolList
              protocols={protocols} loading={loading} selected={selected}
              onSelect={(p) => { setSelected(p); setShowCreate(false); setShowList(false) }}
              onNew={() => { setShowCreate(true); setSelected(null); setShowList(false) }}
              onClose={() => setShowList(false)}
            />
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
          {selected || showCreate ? (
            <button onClick={() => { setSelected(null); setShowCreate(false) }}
              className="text-gray-400 hover:text-white transition-colors p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : null}
          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-sm font-semibold text-white flex-1 truncate">
            {showCreate ? "Novo Protocolo" : selected ? selected.title : "Protocolos"}
          </span>
          {!showCreate && !selected && (
            <>
              <button onClick={() => setShowList(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 transition-all">
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                Lista {protocols.length > 0 && `(${protocols.length})`}
              </button>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-2.5 py-1.5 hover:bg-rose-500/20 transition-all">
                <Plus className="w-3.5 h-3.5" /> Novo
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {showCreate ? (
            /* ── Create form ── */
            <div className="p-4 sm:p-6 max-w-xl mx-auto">
              <div className="hidden md:block mb-5">
                <h3 className="text-lg font-bold text-white mb-1">Gerar Protocolo com IA</h3>
                <p className="text-sm text-gray-400">A IA gerará um protocolo no formato científico padrão</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5">Título do protocolo *</label>
                  <input type="text" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="ex: Protocolo de Cultura 3D em Hidrogel de GelMA"
                    className={inputClass} />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-2">Tipo de protocolo *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROTOCOL_TYPES.map(t => (
                      <button key={t.value} onClick={() => setForm(p => ({ ...p, type: t.value }))}
                        className={cn(
                          "text-left p-3 rounded-xl border transition-all active:scale-[0.98]",
                          form.type === t.value
                            ? "bg-rose-500/10 border-rose-500/20"
                            : "bg-white/[0.02] border-white/5 hover:border-white/10"
                        )}>
                        <p className="text-xs font-medium text-white">{t.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5">Contexto / Descrição *</label>
                  <textarea value={form.context}
                    onChange={e => setForm(p => ({ ...p, context: e.target.value }))}
                    placeholder="Descreva detalhadamente o objetivo, materiais, condições especiais e escopo do protocolo..."
                    rows={4}
                    className={`${inputClass} resize-none`} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setShowCreate(false); setSelected(null) }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all active:scale-[0.98]">
                    Cancelar
                  </button>
                  <button onClick={generateProtocol}
                    disabled={generating || !form.title || !form.type || !form.context}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]">
                    {generating
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                      : <><Zap className="w-4 h-4" /> Gerar (8 créditos)</>}
                  </button>
                </div>
              </div>
            </div>
          ) : selected ? (
            /* ── Protocol viewer ── */
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-white leading-tight">{selected.title}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", STATUS_COLORS[selected.status])}>
                      {selected.status}
                    </span>
                    <span className="text-xs text-gray-500">v{selected.version}</span>
                    <span className="text-xs text-gray-500">{selected.type}</span>
                  </div>
                </div>
                <button onClick={() => downloadProtocol(selected)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-gray-300 hover:border-white/20 transition-all shrink-0 active:scale-[0.98]">
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:p-6">
                <pre className="whitespace-pre-wrap text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                  {selected.content ?? "Conteúdo não disponível"}
                </pre>
              </div>
            </div>
          ) : (
            /* ── Empty state ── */
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-rose-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Gerador de Protocolos</h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto mb-5">
                  Gere protocolos laboratoriais completos com formatação científica usando IA.
                </p>
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition-all mx-auto active:scale-[0.98]">
                  <Plus className="w-4 h-4" /> Novo Protocolo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProtocolList({
  protocols, loading, selected, onSelect, onNew, onClose,
}: {
  protocols: Protocol[]; loading: boolean; selected: Protocol | null
  onSelect: (p: Protocol) => void; onNew: () => void; onClose?: () => void
}) {
  return (
    <>
      <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-rose-400" />
          Protocolos
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={onNew}
            className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 active:scale-95 transition-all">
            <Plus className="w-3.5 h-3.5 text-rose-400" />
          </button>
          {onClose && (
            <button onClick={onClose}
              className="md:hidden w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 active:scale-95 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : protocols.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Nenhum protocolo</p>
            <p className="text-xs text-gray-600 mt-0.5">Crie seu primeiro</p>
          </div>
        ) : (
          protocols.map((p) => (
            <button key={p.id} onClick={() => onSelect(p)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all active:scale-[0.98]",
                selected?.id === p.id
                  ? "bg-rose-500/10 border border-rose-500/15"
                  : "hover:bg-white/3 border border-transparent"
              )}>
              <p className="text-xs font-medium text-white truncate">{p.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md font-medium", STATUS_COLORS[p.status] ?? STATUS_COLORS.DRAFT)}>
                  {p.status}
                </span>
                <span className="text-[10px] text-gray-600 truncate">{p.type}</span>
              </div>
              <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {new Date(p.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </button>
          ))
        )}
      </div>
    </>
  )
}
