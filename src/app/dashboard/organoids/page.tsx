"use client"

import { useState, useEffect } from "react"
import { CircleDot, Loader2, Zap, CheckCircle2 } from "lucide-react"

interface OrganoidDesign {
  id?: string
  organoidType: string
  purpose: string
  cellSource: string
  protocol?: string
  materials?: string[]
  timeline?: string
  expectedMarkers?: string[]
  qualityMetrics?: string[]
  createdAt?: string
}

const ORGANOID_TYPES = [
  { value: "intestinal", label: "Intestinal", icon: "🫁", desc: "Cripta-vilo, absorção, barreira" },
  { value: "hepatico", label: "Hepático", icon: "🫀", desc: "Metabolismo, detox, bile" },
  { value: "neural", label: "Neural", icon: "🧠", desc: "Córtex cerebral, mini-brain" },
  { value: "cardiaco", label: "Cardíaco", icon: "❤️", desc: "Cardiomiócitos, contratilidade" },
  { value: "renal", label: "Renal", icon: "🫘", desc: "Néfrons, filtração glomerular" },
  { value: "pancreatico", label: "Pancreático", icon: "🔬", desc: "Ilhotas, insulina, glucagon" },
  { value: "pulmonar", label: "Pulmonar", icon: "🫁", desc: "Alvéolos, surfactante, barreira" },
]

const CELL_SOURCES = [
  { value: "iPSC", label: "iPSC (Células-Tronco Pluripotentes Induzidas)" },
  { value: "ESC", label: "ESC (Células-Tronco Embrionárias)" },
  { value: "Adult_Stem", label: "Células-Tronco Adultas" },
  { value: "Primary", label: "Células Primárias" },
]

export default function OrganoidsPage() {
  const [designs, setDesigns] = useState<OrganoidDesign[]>([])
  const [selectedType, setSelectedType] = useState("")
  const [purpose, setPurpose] = useState("")
  const [cellSource, setCellSource] = useState("iPSC")
  const [designing, setDesigning] = useState(false)
  const [result, setResult] = useState<OrganoidDesign | null>(null)
  const [activeSection, setActiveSection] = useState<"new" | "history">("new")

  useEffect(() => { loadDesigns() }, [])

  async function loadDesigns() {
    const res = await fetch("/api/organoids")
    if (res.ok) setDesigns(await res.json())
  }

  async function designOrganoid() {
    if (!selectedType || !purpose) return
    setDesigning(true)
    setResult(null)
    try {
      const res = await fetch("/api/organoids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organoidType: selectedType, purpose, cellSource }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        loadDesigns()
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } finally { setDesigning(false) }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-white/5 bg-black/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5">
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
            {[
              { key: "new", label: "Novo Design" },
              { key: "history", label: "Histórico" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key as "new" | "history")}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeSection === tab.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {activeSection === "new" ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Tipo de Organoide</p>
                <div className="space-y-1">
                  {ORGANOID_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`w-full text-left p-3 rounded-xl transition-all ${
                        selectedType === type.value
                          ? "bg-teal-500/10 border border-teal-500/20"
                          : "hover:bg-white/3 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-white">{type.label}</p>
                          <p className="text-[10px] text-gray-500">{type.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {designs.length === 0 ? (
                <div className="py-8 text-center">
                  <CircleDot className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Nenhum design criado</p>
                </div>
              ) : (
                designs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setResult(d)}
                    className="w-full text-left p-3 rounded-xl border border-white/5 hover:border-white/10 bg-white/2 transition-all"
                  >
                    <p className="text-xs font-medium text-white capitalize">{d.organoidType}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{d.purpose}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {d.createdAt && new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-6">
        {!result ? (
          <div className="max-w-xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                <CircleDot className="w-5 h-5 text-teal-400" />
                Organoid Builder
              </h2>
              <p className="text-sm text-gray-400">
                Design assistido por IA para protocolos de diferenciação de organoides
              </p>
            </div>

            {selectedType && (
              <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/15 mb-6">
                <p className="text-xs text-teal-300 font-medium mb-1">
                  Organoide selecionado: {ORGANOID_TYPES.find(t => t.value === selectedType)?.label}
                </p>
                <p className="text-xs text-gray-400">{ORGANOID_TYPES.find(t => t.value === selectedType)?.desc}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">
                  Finalidade / Propósito
                </label>
                <textarea
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="ex: Modelagem de doença de Crohn para triagem de drogas; Estudo de infecção por SARS-CoV-2"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">Fonte Celular</label>
                <div className="space-y-1">
                  {CELL_SOURCES.map((cs) => (
                    <label key={cs.value} className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer hover:bg-white/3 transition-colors">
                      <input
                        type="radio"
                        value={cs.value}
                        checked={cellSource === cs.value}
                        onChange={() => setCellSource(cs.value)}
                        className="accent-teal-500"
                      />
                      <span className="text-sm text-gray-300">{cs.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={designOrganoid}
                disabled={designing || !selectedType || !purpose}
                className="w-full py-3 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {designing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gerando protocolo com IA...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Gerar Design (15 créditos)</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white capitalize">
                  Organoide {result.organoidType}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">{result.purpose}</p>
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg border border-white/10"
              >
                Novo design
              </button>
            </div>

            <div className="space-y-4">
              {result.protocol && (
                <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">📋 Protocolo de Diferenciação</h3>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{result.protocol}</p>
                </div>
              )}

              {result.timeline && (
                <div className="rounded-xl border border-teal-500/15 bg-teal-500/3 p-5">
                  <h3 className="text-sm font-semibold text-teal-300 mb-2">⏱️ Timeline</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{result.timeline}</p>
                </div>
              )}

              {result.materials && result.materials.length > 0 && (
                <div className="rounded-xl border border-white/8 bg-white/2 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">🧪 Materiais</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {result.materials.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {result.expectedMarkers && result.expectedMarkers.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-4">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Marcadores Esperados</h3>
                    <div className="space-y-1">
                      {result.expectedMarkers.map((m, i) => (
                        <div key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                          <span className="text-teal-500 shrink-0">•</span>{m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.qualityMetrics && result.qualityMetrics.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/2 p-4">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Métricas de Qualidade</h3>
                    <div className="space-y-1">
                      {result.qualityMetrics.map((m, i) => (
                        <div key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
