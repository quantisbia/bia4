"use client"

import { useState, useEffect } from "react"
import {
  GitBranch, Plus, CheckCircle2, Circle, Clock,
  Loader2, Zap, ArrowRight, ChevronLeft, X, Box, ExternalLink
} from "lucide-react"
import { PIPELINE_STAGES } from "@/lib/ai/pipeline"

interface PipelineProject {
  id: string; name: string; tissueType: string; targetApplication: string
  currentStage: number; completionRate: number; status: string; createdAt: string
}
interface StageAnalysis {
  stage: number; stageName: string; recommendation: string
  parameters: Record<string, string | number>; warnings: string[]; nextSteps: string[]; creditsUsed: number
}

export default function PipelinePage() {
  const [projects, setProjects]             = useState<PipelineProject[]>([])
  const [selectedProject, setSelectedProject] = useState<PipelineProject | null>(null)
  const [analysis, setAnalysis]             = useState<StageAnalysis | null>(null)
  const [loading, setLoading]               = useState(false)
  const [analyzing, setAnalyzing]           = useState(false)
  const [showCreate, setShowCreate]         = useState(false)
  const [showList, setShowList]             = useState(false) // mobile panel
  const [form, setForm] = useState({ name: "", tissueType: "", application: "", cellSource: "" })

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoading(true)
    try {
      const res = await fetch("/api/pipeline")
      if (res.ok) setProjects(await res.json())
    } catch { /* */ } finally { setLoading(false) }
  }

  async function createProject() {
    if (!form.name || !form.tissueType || !form.application) return
    setLoading(true)
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      })
      if (res.ok) {
        const project = await res.json()
        setProjects(prev => [project, ...prev])
        setSelectedProject(project)
        setShowCreate(false)
        setShowList(false)
        setForm({ name: "", tissueType: "", application: "", cellSource: "" })
      }
    } finally { setLoading(false) }
  }

  async function analyzeStage(stageNum: number) {
    if (!selectedProject) return
    setAnalyzing(true); setAnalysis(null)
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze_stage", projectId: selectedProject.id, stageNum }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnalysis(data)
        setSelectedProject(prev => prev ? { ...prev, currentStage: Math.max(prev.currentStage, stageNum) } : null)
      } else {
        const err = await res.json(); alert(err.error)
      }
    } finally { setAnalyzing(false) }
  }

  const currentStage = selectedProject?.currentStage ?? 0
  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"

  /* ── Create form ─────────────────────────────────────────── */
  if (showCreate) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start sm:items-center justify-center">
        <div className="w-full max-w-md bg-white/2 border border-white/8 rounded-2xl p-5 sm:p-6 mt-4 sm:mt-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Novo Pipeline</h3>
            <button onClick={() => setShowCreate(false)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-5">Configure os parâmetros do seu projeto de design de tecido</p>
          <div className="space-y-3.5">
            {[
              { key: "name",        label: "Nome do projeto",       placeholder: "ex: Cartilagem Articular v1" },
              { key: "tissueType",  label: "Tipo de tecido alvo",   placeholder: "ex: Cartilagem Hialina"      },
              { key: "application", label: "Aplicação clínica",     placeholder: "ex: Reparo articular joelho" },
              { key: "cellSource",  label: "Fonte celular (opt.)",  placeholder: "ex: iPSC humana"             },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">{field.label}</label>
                <input type="text" value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder} className={inputClass} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all">
                Cancelar
              </button>
              <button onClick={createProject}
                disabled={loading || !form.name || !form.tissueType || !form.application}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Criar Projeto"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Main layout ─────────────────────────────────────────── */
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Desktop projects panel ─────────────────────────── */}
      <div className="hidden md:flex w-60 lg:w-72 border-r border-white/5 bg-black/10 flex-col shrink-0">
        <ProjectsPanel
          projects={projects} loading={loading} selectedProject={selectedProject}
          onSelect={(p) => { setSelectedProject(p); setAnalysis(null) }}
          onNew={() => setShowCreate(true)}
        />
      </div>

      {/* ── Mobile projects drawer ─────────────────────────── */}
      {showList && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowList(false)} />
          <div className="relative w-72 max-w-[80vw] h-full bg-[#0d0720] border-r border-white/8 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <ProjectsPanel
              projects={projects} loading={loading} selectedProject={selectedProject}
              onSelect={(p) => { setSelectedProject(p); setAnalysis(null); setShowList(false) }}
              onNew={() => { setShowList(false); setShowCreate(true) }}
              onClose={() => setShowList(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar for pipeline */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
          <button onClick={() => setShowList(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 transition-all">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            Projetos {projects.length > 0 && `(${projects.length})`}
          </button>
          <div className="flex-1" />
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 hover:bg-emerald-500/20 transition-all">
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>
        </div>

        {selectedProject ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
            {/* Project header */}
            <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => { setSelectedProject(null); setAnalysis(null) }}
                    className="md:hidden text-gray-500 hover:text-gray-300 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-lg sm:text-xl font-bold text-white truncate">{selectedProject.name}</h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-400">
                  {selectedProject.tissueType} • {selectedProject.targetApplication}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                  {selectedProject.completionRate.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">concluído</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden mb-5 sm:mb-6">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${selectedProject.completionRate}%` }} />
            </div>

            {/* Stages grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-5 sm:mb-6">
              {PIPELINE_STAGES.map((stage) => {
                const isCompleted = currentStage >= stage.num
                const isCurrent   = currentStage + 1 === stage.num
                return (
                  <div key={stage.num} className={`relative rounded-xl border p-3.5 sm:p-4 transition-all ${
                    isCompleted ? "border-emerald-500/20 bg-emerald-500/5"
                    : isCurrent ? "border-blue-500/30 bg-blue-500/5 ring-1 ring-blue-500/15"
                    : "border-white/5 bg-white/1 opacity-50"
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isCompleted ? "bg-emerald-500/20" : isCurrent ? "bg-blue-500/20" : "bg-white/5"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : isCurrent ? <Circle className="w-4 h-4 text-blue-400" />
                          : <Clock className="w-4 h-4 text-gray-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-600 font-mono shrink-0">
                            {String(stage.num).padStart(2, "0")}
                          </span>
                          <p className={`text-xs sm:text-sm font-medium truncate ${
                            isCompleted ? "text-emerald-300" : isCurrent ? "text-blue-300" : "text-gray-500"
                          }`}>{stage.name}</p>
                        </div>
                        {isCurrent && (
                          <button onClick={() => analyzeStage(stage.num)} disabled={analyzing}
                            className="mt-2 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors active:scale-[0.98]">
                            {analyzing
                              ? <><Loader2 className="w-3 h-3 animate-spin" />Analisando...</>
                              : <><Zap className="w-3 h-3" />Analisar com IA (5 créditos)</>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Analysis result */}
            {analysis && (
              <div className="rounded-xl sm:rounded-2xl border border-blue-500/20 bg-blue-500/3 p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Análise IA — Etapa {analysis.stage}: {analysis.stageName}
                    </h3>
                    <p className="text-[11px] text-gray-500">{analysis.creditsUsed} créditos utilizados</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">{analysis.recommendation}</p>
                {Object.keys(analysis.parameters).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Parâmetros</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(analysis.parameters).map(([k, v]) => (
                        <div key={k} className="bg-white/3 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500">{k}</p>
                          <p className="text-xs text-white font-medium">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.warnings.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-amber-400/70 mb-2 uppercase tracking-wide">⚠ Atenção</h4>
                    <ul className="space-y-1">
                      {analysis.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-300/80 flex items-start gap-1.5">
                          <span className="text-amber-500 shrink-0">•</span>{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.nextSteps.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Próximos Passos</h4>
                    <ol className="space-y-1">
                      {analysis.nextSteps.map((s, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                          <span className="text-emerald-500 font-mono shrink-0">{i+1}.</span>{s}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* STL Generator shortcut — sempre visível após análise */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Box className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">Geometria 3D para Bioimpressão</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                    {analysis.stage === 6
                      ? "Esta é a etapa de Bioimpressão/Fabricação. Gere o arquivo STL/OBJ da geometria do seu tecido agora."
                      : "Gere o arquivo STL/OBJ 3D do seu tecido para usar no slicer de bioimpressão."}
                  </p>
                  <a
                    href="/dashboard/bioprint/model"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
                  >
                    <Box className="w-4 h-4" />
                    Abrir Bioimpressão · Etapa 1 (Modelo 3D)
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-7 h-7 sm:w-8 sm:h-8 text-gray-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Pipeline de Design</h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto mb-6">
                Selecione um projeto ou crie um novo para começar o pipeline de 12 etapas com IA.
              </p>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 active:scale-[0.98] transition-all mx-auto">
                <Plus className="w-4 h-4" /> Novo Projeto <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectsPanel({
  projects, loading, selectedProject, onSelect, onNew, onClose,
}: {
  projects: PipelineProject[]; loading: boolean; selectedProject: PipelineProject | null
  onSelect: (p: PipelineProject) => void; onNew: () => void; onClose?: () => void
}) {
  return (
    <>
      <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-400" />
          Projetos
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={onNew}
            className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 active:scale-95 transition-all"
            aria-label="Novo projeto">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all md:hidden">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="py-8 text-center">
            <GitBranch className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Nenhum projeto</p>
            <p className="text-xs text-gray-600 mt-0.5">Crie seu primeiro</p>
          </div>
        ) : (
          projects.map((p) => (
            <button key={p.id} onClick={() => onSelect(p)}
              className={`w-full text-left p-3 rounded-xl transition-all active:scale-[0.98] ${
                selectedProject?.id === p.id
                  ? "bg-emerald-500/10 border border-emerald-500/15"
                  : "hover:bg-white/3 border border-transparent"
              }`}>
              <p className="text-xs sm:text-sm font-medium text-white truncate">{p.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.tissueType}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${p.completionRate}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{p.completionRate.toFixed(0)}%</span>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  )
}
