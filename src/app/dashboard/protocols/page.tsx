"use client"

import { useState, useEffect } from "react"
import { FileText, Plus, Loader2, Zap, Download, Clock } from "lucide-react"

interface Protocol {
  id: string
  title: string
  type: string
  status: string
  version: string
  content?: string
  createdAt: string
}

const PROTOCOL_TYPES = [
  { value: "CULTURE", label: "Cultura Celular", desc: "SOPs de cultura, passagem, manutenção" },
  { value: "SYNTHESIS", label: "Síntese", desc: "Preparação de biomateriais e reagentes" },
  { value: "CHARACTERIZATION", label: "Caracterização", desc: "Análise mecânica, bioquímica, morfológica" },
  { value: "QUALITY_CONTROL", label: "Controle de Qualidade", desc: "QC/QA, liberação de lotes, auditorias" },
  { value: "BIOPRINTING", label: "Bioimpressão", desc: "Calibração, parâmetros, pós-processamento" },
  { value: "STERILIZATION", label: "Esterilização", desc: "Autoclavagem, filtração, raios UV" },
]

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-gray-400 bg-gray-500/10",
  REVIEW: "text-amber-400 bg-amber-500/10",
  APPROVED: "text-emerald-400 bg-emerald-500/10",
  ARCHIVED: "text-gray-600 bg-gray-700/10",
}

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected] = useState<Protocol | null>(null)
  const [showCreate, setShowCreate] = useState(false)
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
        setForm({ title: "", type: "", context: "" })
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } finally { setGenerating(false) }
  }

  function downloadProtocol(protocol: Protocol) {
    const content = `# ${protocol.title}\n\nVersão: ${protocol.version}\nStatus: ${protocol.status}\nGerado em: ${new Date(protocol.createdAt).toLocaleDateString("pt-BR")}\n\n---\n\n${protocol.content ?? ""}`
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${protocol.title.replace(/\s+/g, "_")}_v${protocol.version}.md`
    a.click()
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Lista de protocolos */}
      <div className="w-80 border-r border-white/5 bg-black/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-400" />
            Protocolos
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-rose-400" />
          </button>
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
            </div>
          ) : (
            protocols.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  selected?.id === p.id
                    ? "bg-rose-500/10 border border-rose-500/15"
                    : "hover:bg-white/3 border border-transparent"
                }`}
              >
                <p className="text-xs font-medium text-white truncate">{p.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${STATUS_COLORS[p.status] ?? STATUS_COLORS.DRAFT}`}>
                    {p.status}
                  </span>
                  <span className="text-[10px] text-gray-600">{p.type}</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Visualizador / Criador */}
      <div className="flex-1 overflow-y-auto">
        {showCreate ? (
          <div className="p-6 max-w-xl mx-auto">
            <h3 className="text-lg font-bold text-white mb-1">Gerar Protocolo com IA</h3>
            <p className="text-sm text-gray-400 mb-6">A IA gerará um protocolo no formato científico padrão</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">Título do protocolo</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="ex: Protocolo de Cultura 3D em Hidrogel de GelMA"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500/40"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">Tipo de protocolo</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROTOCOL_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm(prev => ({ ...prev, type: t.value }))}
                      className={`text-left p-3 rounded-xl transition-all ${
                        form.type === t.value
                          ? "bg-rose-500/10 border border-rose-500/20"
                          : "bg-white/3 border border-white/5 hover:border-white/10"
                      }`}
                    >
                      <p className="text-xs font-medium text-white">{t.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">Contexto / Descrição</label>
                <textarea
                  value={form.context}
                  onChange={e => setForm(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="Descreva detalhadamente o objetivo, materiais específicos, condições especiais e escopo do protocolo..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-rose-500/40 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={generateProtocol}
                  disabled={generating || !form.title || !form.type || !form.context}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Gerar (8 créditos)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${STATUS_COLORS[selected.status]}`}>
                    {selected.status}
                  </span>
                  <span className="text-xs text-gray-500">v{selected.version}</span>
                  <span className="text-xs text-gray-500">{selected.type}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadProtocol(selected)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:border-white/20 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-white/2 p-6">
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-xs text-gray-300 leading-relaxed font-sans">
                  {selected.content ?? "Conteúdo não disponível"}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Gerador de Protocolos</h3>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
                Gere protocolos laboratoriais completos com formatação científica usando IA
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Novo Protocolo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
