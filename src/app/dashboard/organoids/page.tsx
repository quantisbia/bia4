"use client"

import { useState, useEffect } from "react"
import { CircleDot, Loader2, Zap, CheckCircle2, ChevronDown, History, Plus, X,
  ArrowRight, Beaker, Clock, AlertCircle, Target, FlaskConical, MessageCircle, ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

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
  { value: "intestinal",   label: "Intestinal",   icon: "🫁", desc: "Cripta-vilo, absorção, barreira" },
  { value: "hepatico",     label: "Hepático",     icon: "🫀", desc: "Metabolismo, detox, bile" },
  { value: "neural",       label: "Neural",       icon: "🧠", desc: "Córtex cerebral, mini-brain" },
  { value: "cardiaco",     label: "Cardíaco",     icon: "❤️", desc: "Cardiomiócitos, contratilidade" },
  { value: "renal",        label: "Renal",        icon: "🫘", desc: "Néfrons, filtração glomerular" },
  { value: "pancreatico",  label: "Pancreático",  icon: "🔬", desc: "Ilhotas, insulina, glucagon" },
  { value: "pulmonar",     label: "Pulmonar",     icon: "🌬️", desc: "Alvéolos, surfactante, barreira" },
]

const CELL_SOURCES = [
  { value: "iPSC",         label: "iPSC (Pluripotentes Induzidas)" },
  { value: "ESC",          label: "ESC (Embrionárias)" },
  { value: "Adult_Stem",   label: "Células-Tronco Adultas" },
  { value: "Primary",      label: "Células Primárias" },
]

// ── Organoid Protocol Viewer Component ───────────────────────────────────────
function OrganoidProtocolViewer({ protocol, organoidType }: { protocol: string; organoidType: string }) {
  // Parse protocolo em seções
  const sections = protocol.split(/\n\n+/).filter(Boolean)
  
  // Detectar seções por palavras-chave
  const parseSection = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes("objetivo") || lower.includes("fundamento")) return { type: "objective", icon: Target, color: "blue" }
    if (lower.includes("materiais") || lower.includes("reagentes")) return { type: "materials", icon: FlaskConical, color: "violet" }
    if (lower.includes("preparo") || lower.includes("preparação")) return { type: "prep", icon: Beaker, color: "amber" }
    if (lower.includes("etapa") || lower.includes("passo") || lower.includes("dia")) return { type: "steps", icon: ArrowRight, color: "emerald" }
    if (lower.includes("crítico") || lower.includes("parâmetro")) return { type: "critical", icon: AlertCircle, color: "rose" }
    if (lower.includes("checkpoint") || lower.includes("qualidade") || lower.includes("controle")) return { type: "quality", icon: CheckCircle2, color: "cyan" }
    if (lower.includes("timeline") || lower.includes("tempo")) return { type: "timeline", icon: Clock, color: "indigo" }
    return { type: "general", icon: ArrowRight, color: "gray" }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <CircleDot className="w-4 h-4 text-teal-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Protocolo de Diferenciação — {organoidType.charAt(0).toUpperCase() + organoidType.slice(1)} Organoid</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Protocolo assistido por IA para formação e maturação de organoides. Siga rigorosamente os parâmetros críticos e checkpoints de qualidade.
        </p>
      </div>

      {/* Seções dinâmicas */}
      <div className="space-y-3">
        {sections.map((sec, i) => {
          const parsed = parseSection(sec)
          const colorMap = {
            blue:    { bg: "bg-blue-500/8",    border: "border-blue-500/15",    icon: "text-blue-400",    title: "text-blue-300" },
            violet:  { bg: "bg-violet-500/8",  border: "border-violet-500/15",  icon: "text-violet-400",  title: "text-violet-300" },
            amber:   { bg: "bg-amber-500/8",   border: "border-amber-500/15",   icon: "text-amber-400",   title: "text-amber-300" },
            emerald: { bg: "bg-emerald-500/8", border: "border-emerald-500/15", icon: "text-emerald-400", title: "text-emerald-300" },
            rose:    { bg: "bg-rose-500/8",    border: "border-rose-500/15",    icon: "text-rose-400",    title: "text-rose-300" },
            cyan:    { bg: "bg-cyan-500/8",    border: "border-cyan-500/15",    icon: "text-cyan-400",    title: "text-cyan-300" },
            indigo:  { bg: "bg-indigo-500/8",  border: "border-indigo-500/15",  icon: "text-indigo-400",  title: "text-indigo-300" },
            gray:    { bg: "bg-white/[0.02]",  border: "border-white/8",        icon: "text-gray-400",    title: "text-white" },
          }
          const colors = colorMap[parsed.color as keyof typeof colorMap] ?? colorMap.gray
          
          const Icon = parsed.icon

          return (
            <div key={i} className={cn("rounded-xl border p-4", colors.bg, colors.border)}>
              <div className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
                  <Icon className={cn("w-4 h-4", colors.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">{sec}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* QMatrix Section */}
      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/8 to-blue-500/10 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Bioativar com QMatrix™</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Acelere formação de esferoides, melhore adesão celular e organização tecidual com o peptídeo bioativo patenteado Quantis.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {[
              { title: "Revestimento de Superfície", desc: "10–25 µg/mL — pré-cobertura de placas ultra-low attachment" },
              { title: "Aditivo de Adesão", desc: "5–15 µg/mL — adicionar no meio de agregação (Dia 0–3)" },
              { title: "Biotinta / Hidrogel", desc: "50–100 µg/mL — melhor adesão e proliferação em scaffolds 3D" },
              { title: "Maturação Avançada", desc: "2–5 µg/mL — meio de diferenciação (Dia 7+) para organização" },
            ].map((item, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                <div className="text-[11px] font-semibold text-violet-300 mb-0.5">{item.title}</div>
                <div className="text-[10px] text-gray-500 leading-tight">{item.desc}</div>
              </div>
            ))}
          </div>
          <a href="https://www.quantis.bio/product-page/qmatrix-bioactive?lang=pt"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-violet-500/25 active:scale-[0.98]">
            <Beaker className="w-4 h-4" />
            Usar QMatrix™ neste Protocolo
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Acelere com especialistas */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/8 to-cyan-500/10 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Acelere com Especialistas Quantis</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              A IA <span className="text-white font-semibold">guia, explica e gera protocolos</span> para direcionar sua pesquisa.
              Entregamos dossiês técnicos e estratégias regulatórias.
            </p>
            <p className="text-[11px] text-emerald-300 leading-relaxed">
              💡 Porém, a <span className="font-semibold">validação experimental e otimização avançada</span> podem ser feitas com nossa equipe especializada em biofabricação.
            </p>
          </div>
        </div>
        <a href="https://wa.me/5511968632231"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98]">
          <MessageCircle className="w-4 h-4" />
          Falar com Especialistas da Quantis
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

export default function OrganoidsPage() {
  const [designs, setDesigns]         = useState<OrganoidDesign[]>([])
  const [selectedType, setSelectedType] = useState("")
  const [purpose, setPurpose]         = useState("")
  const [cellSource, setCellSource]   = useState("iPSC")
  const [designing, setDesigning]     = useState(false)
  const [result, setResult]           = useState<OrganoidDesign | null>(null)
  const [showHistory, setShowHistory] = useState(false)  // mobile history drawer
  const [showTypeMenu, setShowTypeMenu] = useState(false) // mobile type picker

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

  const selectedTypeObj = ORGANOID_TYPES.find(t => t.value === selectedType)

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex w-72 border-r border-white/5 bg-black/10 flex-col shrink-0">
        <SidebarContent
          designs={designs}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          onSelectDesign={(d) => setResult(d)}
        />
      </div>

      {/* ── Mobile: history drawer ── */}
      {showHistory && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHistory(false)} />
          <div className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[#0d0720] border-l border-white/8 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-teal-400" />
                Histórico
              </h3>
              <button onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {designs.length === 0 ? (
                <div className="py-8 text-center">
                  <CircleDot className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Nenhum design criado</p>
                </div>
              ) : (
                designs.map((d) => (
                  <button key={d.id} onClick={() => { setResult(d); setShowHistory(false) }}
                    className="w-full text-left p-3 rounded-xl border border-white/5 hover:border-teal-500/20 bg-white/2 transition-all active:scale-[0.98]">
                    <p className="text-xs font-medium text-white capitalize">{d.organoidType}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{d.purpose}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {d.createdAt && new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
          <CircleDot className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-sm font-semibold text-white flex-1">Organoid Builder</span>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 transition-all"
          >
            <History className="w-3.5 h-3.5 text-teal-400" />
            Histórico {designs.length > 0 && `(${designs.length})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!result ? (
            <div className="max-w-xl mx-auto">
              <div className="hidden md:block mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                  <CircleDot className="w-5 h-5 text-teal-400" />
                  Organoid Builder
                </h2>
                <p className="text-sm text-gray-400">
                  Design assistido por IA para protocolos de diferenciação
                </p>
              </div>

              <div className="space-y-4 sm:space-y-5">

                {/* Type selector — mobile uses dropdown, desktop uses full list in sidebar */}
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-2 uppercase tracking-wide">
                    Tipo de Organoide
                  </label>

                  {/* Mobile: dropdown button */}
                  <div className="md:hidden">
                    <button
                      onClick={() => setShowTypeMenu(!showTypeMenu)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                        selectedType
                          ? "border-teal-500/30 bg-teal-500/5"
                          : "border-white/10 bg-white/5"
                      )}
                    >
                      {selectedTypeObj ? (
                        <>
                          <span className="text-lg">{selectedTypeObj.icon}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{selectedTypeObj.label}</p>
                            <p className="text-[10px] text-gray-500">{selectedTypeObj.desc}</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 flex-1">Selecione o tipo...</span>
                      )}
                      <ChevronDown className={cn("w-4 h-4 text-gray-500 shrink-0 transition-transform", showTypeMenu && "rotate-180")} />
                    </button>

                    {showTypeMenu && (
                      <div className="mt-1 rounded-xl border border-white/10 bg-[#0d0720] overflow-hidden shadow-xl">
                        {ORGANOID_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => { setSelectedType(type.value); setShowTypeMenu(false) }}
                            className={cn(
                              "w-full text-left flex items-center gap-3 px-4 py-3 transition-all",
                              selectedType === type.value
                                ? "bg-teal-500/10 text-teal-300"
                                : "text-gray-300 hover:bg-white/5"
                            )}
                          >
                            <span className="text-base">{type.icon}</span>
                            <div>
                              <p className="text-xs font-medium">{type.label}</p>
                              <p className="text-[10px] text-gray-500">{type.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Desktop: type grid */}
                  <div className="hidden md:grid grid-cols-2 gap-2">
                    {ORGANOID_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={cn(
                          "text-left p-3 rounded-xl border transition-all active:scale-[0.98]",
                          selectedType === type.value
                            ? "bg-teal-500/10 border-teal-500/20"
                            : "border-white/5 bg-white/2 hover:border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{type.icon}</span>
                          <div>
                            <p className="text-xs font-medium text-white">{type.label}</p>
                            <p className="text-[10px] text-gray-500">{type.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose textarea */}
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5 uppercase tracking-wide">
                    Finalidade / Propósito
                  </label>
                  <textarea
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="ex: Modelagem de doença de Crohn para triagem de drogas; Estudo de infecção por SARS-CoV-2"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none leading-relaxed"
                  />
                </div>

                {/* Cell source */}
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-2 uppercase tracking-wide">
                    Fonte Celular
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {CELL_SOURCES.map((cs) => (
                      <label key={cs.value}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-xl cursor-pointer border transition-all",
                          cellSource === cs.value
                            ? "border-teal-500/25 bg-teal-500/5"
                            : "border-white/5 bg-white/2 hover:border-white/10"
                        )}>
                        <input type="radio" value={cs.value} checked={cellSource === cs.value}
                          onChange={() => setCellSource(cs.value)} className="accent-teal-500" />
                        <span className="text-xs text-gray-300 leading-tight">{cs.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={designOrganoid}
                  disabled={designing || !selectedType || !purpose}
                  className="w-full py-3.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
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
            /* ── Result ── */
            <div className="max-w-2xl mx-auto">
              <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white capitalize">
                    {result.organoidType} Organoid
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{result.purpose}</p>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-xl border border-white/10 shrink-0 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo design
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {result.protocol && (
                  <OrganoidProtocolViewer protocol={result.protocol} organoidType={result.organoidType} />
                )}

                {result.timeline && (
                  <div className="rounded-xl border border-teal-500/15 bg-teal-500/[0.03] p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-teal-300 mb-2">⏱️ Timeline</h3>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{result.timeline}</p>
                  </div>
                )}

                {result.materials && result.materials.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">🧪 Materiais</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.materials.map((m, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.expectedMarkers && result.expectedMarkers.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                      <h3 className="text-xs font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Marcadores Esperados</h3>
                      <div className="space-y-1.5">
                        {result.expectedMarkers.map((m, i) => (
                          <div key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                            <span className="text-teal-500 shrink-0">•</span>{m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.qualityMetrics && result.qualityMetrics.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                      <h3 className="text-xs font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Métricas de Qualidade</h3>
                      <div className="space-y-1.5">
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
    </div>
  )
}

/* ── Desktop sidebar content ── */
function SidebarContent({
  designs, selectedType, onSelectType, onSelectDesign,
}: {
  designs: OrganoidDesign[]
  selectedType: string
  onSelectType: (v: string) => void
  onSelectDesign: (d: OrganoidDesign) => void
}) {
  const [tab, setTab] = useState<"new" | "history">("new")

  return (
    <>
      <div className="p-4 border-b border-white/5">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {[{ key: "new", label: "Novo Design" }, { key: "history", label: "Histórico" }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as "new" | "history")}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                tab === t.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "new" ? (
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-2 px-1">
              Tipo de Organoide
            </p>
            <div className="space-y-1">
              {ORGANOID_TYPES.map((type) => (
                <button key={type.value} onClick={() => onSelectType(type.value)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all active:scale-[0.98]",
                    selectedType === type.value
                      ? "bg-teal-500/10 border border-teal-500/20"
                      : "hover:bg-white/3 border border-transparent"
                  )}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{type.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-white">{type.label}</p>
                      <p className="text-[10px] text-gray-500">{type.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
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
                <button key={d.id} onClick={() => onSelectDesign(d)}
                  className="w-full text-left p-3 rounded-xl border border-white/5 hover:border-teal-500/20 bg-white/2 transition-all active:scale-[0.98]">
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
    </>
  )
}
