"use client"

/**
 * BIA · Academy · Admin — Form de edição de aula (R13.10.1)
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Trash2, AlertTriangle, Sparkles, Video } from "lucide-react"

type BiaHook = { tool: string; label: string; params?: Record<string, unknown> } | null

type LessonData = {
  id: string
  slug: string
  order: number
  title: string
  youtubeId: string
  objective: string | null
  summary: string | null
  durationMin: number
  level: string
  biaHook: BiaHook
  isPublished: boolean
}

const BIA_TOOLS = [
  { value: "", label: "— sem biaHook —" },
  { value: "formulator-pro", label: "Formulador Pro" },
  { value: "bioprint/model", label: "Bioimpressão · Modelo 3D" },
  { value: "bioprint/bioink", label: "Bioimpressão · Biotinta" },
  { value: "bioprint/slice", label: "Bioimpressão · Fatiamento" },
  { value: "bioprint/control", label: "Bioimpressão · Execução" },
  { value: "organoids", label: "Organoid Builder" },
  { value: "pipeline", label: "Pipeline (12 etapas)" },
  { value: "protocols", label: "Protocolos GLP/GMP" },
  { value: "chat", label: "Chat IA" },
  { value: "notebook", label: "Notebook" },
  { value: "knowledge", label: "Motor de Conhecimento" },
]

export function LessonEditForm({ lesson, moduleSlug }: { lesson: LessonData; moduleSlug: string }) {
  const router = useRouter()

  const [slug, setSlug] = useState(lesson.slug)
  const [order, setOrder] = useState(String(lesson.order))
  const [title, setTitle] = useState(lesson.title)
  const [youtubeInput, setYoutubeInput] = useState(lesson.youtubeId)
  const [objective, setObjective] = useState(lesson.objective ?? "")
  const [summary, setSummary] = useState(lesson.summary ?? "")
  const [durationMin, setDurationMin] = useState(String(lesson.durationMin))
  const [level, setLevel] = useState(lesson.level)
  const [isPublished, setIsPublished] = useState(lesson.isPublished)

  // biaHook — editado por partes
  const [biaTool, setBiaTool] = useState(lesson.biaHook?.tool ?? "")
  const [biaLabel, setBiaLabel] = useState(lesson.biaHook?.label ?? "")
  const [biaParamsJson, setBiaParamsJson] = useState(
    lesson.biaHook?.params ? JSON.stringify(lesson.biaHook.params, null, 2) : ""
  )

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    // Monta biaHook (opcional)
    let biaHook: BiaHook = null
    if (biaTool.trim()) {
      let params: Record<string, unknown> | undefined
      if (biaParamsJson.trim()) {
        try {
          params = JSON.parse(biaParamsJson)
        } catch {
          setSaving(false)
          setMsg({ type: "err", text: "JSON dos params inválido. Deixe vazio ou consertar antes de salvar." })
          return
        }
      }
      biaHook = { tool: biaTool.trim(), label: biaLabel.trim() || "Abrir na BIA", params }
    }

    try {
      const res = await fetch(`/api/admin/academy/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim() !== lesson.slug ? slug.trim() : undefined,
          order: Number(order),
          title: title.trim(),
          youtubeInput: youtubeInput.trim() !== lesson.youtubeId ? youtubeInput.trim() : undefined,
          objective: objective.trim() || null,
          summary: summary.trim() || null,
          durationMin: Number(durationMin) || 0,
          level,
          biaHook,
          isPublished,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
      setMsg({ type: "ok", text: "Aula atualizada." })
      // Se slug mudou, navegar
      if (j.lesson?.slug && j.lesson.slug !== lesson.slug) {
        router.replace(`/dashboard/admin/academy/${moduleSlug}/${j.lesson.slug}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Apagar a aula "${title}"?\n\nSó funciona se a aula estiver como RASCUNHO (isPublished=false). Anexos e quiz são apagados junto.`)) return
    setDeleting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/academy/lessons/${lesson.id}`, {
        method: "DELETE",
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
      router.replace(`/dashboard/admin/academy/${moduleSlug}`)
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message })
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4" data-testid="lesson-edit-form">

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <div>
          <Label>Order</Label>
          <input type="number" min={1} max={99} value={order} onChange={e => setOrder(e.target.value)} className={INPUT} data-testid="lesson-field-order" />
        </div>
        <div className="sm:col-span-5">
          <Label>Slug (kebab-case)</Label>
          <input type="text" value={slug} onChange={e => setSlug(e.target.value)} className={INPUT} data-testid="lesson-field-slug" />
        </div>
      </div>

      <div>
        <Label>Título</Label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={INPUT} data-testid="lesson-field-title" required />
      </div>

      <div>
        <Label icon={<Video className="w-3 h-3 text-red-400" />}>URL do YouTube ou ID</Label>
        <input
          type="text"
          value={youtubeInput}
          onChange={e => setYoutubeInput(e.target.value)}
          className={`${INPUT} font-mono text-xs`}
          data-testid="lesson-field-youtube"
          placeholder="https://youtu.be/… ou dQw4w9WgXcQ"
        />
        <p className="text-[10px] text-gray-500 mt-1">Aceita várias formas: URL curta, watch?v=, /embed, /shorts, ou o ID puro.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Duração (min)</Label>
          <input type="number" min={0} max={600} value={durationMin} onChange={e => setDurationMin(e.target.value)} className={INPUT} data-testid="lesson-field-duration" />
        </div>
        <div>
          <Label>Nível</Label>
          <select value={level} onChange={e => setLevel(e.target.value)} className={INPUT} data-testid="lesson-field-level">
            <option value="basic">Básico</option>
            <option value="intermediate">Intermediário</option>
            <option value="advanced">Avançado</option>
          </select>
        </div>
      </div>

      <div>
        <Label>Objetivo (markdown, aparece em destaque na aula)</Label>
        <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3} className={`${INPUT} font-mono text-xs`} data-testid="lesson-field-objective" placeholder="Ao final desta aula, o aluno será capaz de…" />
      </div>

      <div>
        <Label>Resumo (markdown, aparece após o vídeo)</Label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={6} className={`${INPUT} font-mono text-xs`} data-testid="lesson-field-summary" placeholder="Conceitos-chave, referências, etc." />
      </div>

      {/* biaHook */}
      <div className="rounded-xl border border-fuchsia-500/15 bg-fuchsia-500/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
          <span className="text-xs font-bold text-fuchsia-200 uppercase tracking-wider">biaHook · Integração com a BIA</span>
        </div>
        <p className="text-[11px] text-gray-500">
          Se a aula tem prática na BIA, escolha a ferramenta e o rótulo do botão. Deixe &quot;sem biaHook&quot; para aulas puramente teóricas.
        </p>

        <div>
          <Label>Ferramenta</Label>
          <select value={biaTool} onChange={e => setBiaTool(e.target.value)} className={INPUT} data-testid="lesson-field-bia-tool">
            {BIA_TOOLS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {biaTool && (
          <>
            <div>
              <Label>Rótulo do botão (o que aparece no botão &quot;Abrir na BIA&quot;)</Label>
              <input
                type="text"
                value={biaLabel}
                onChange={e => setBiaLabel(e.target.value)}
                placeholder="ex: Criar formulação de GelMA para pele"
                className={INPUT}
                data-testid="lesson-field-bia-label"
              />
            </div>
            <div>
              <Label>Parâmetros (JSON opcional — passados na URL da BIA)</Label>
              <textarea
                value={biaParamsJson}
                onChange={e => setBiaParamsJson(e.target.value)}
                rows={4}
                placeholder='{"template": "gelma_5", "targetTissue": "skin"}'
                className={`${INPUT} font-mono text-xs`}
                data-testid="lesson-field-bia-params"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Formato JSON. Deixe vazio se não há parâmetros pré-preenchidos.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Publicar */}
      <label className="flex items-center gap-3 py-3 border-y border-white/[0.06] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={e => setIsPublished(e.target.checked)}
          data-testid="lesson-field-published"
          className="w-4 h-4 rounded border-white/20 bg-white/[0.06] text-fuchsia-500 focus:ring-fuchsia-500/30 focus:ring-offset-0"
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-white">Publicada</span>
          <p className="text-[11px] text-gray-500">Aulas publicadas aparecem imediatamente para os alunos matriculados.</p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          isPublished ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/[0.06] text-gray-500 border border-white/[0.08]"
        }`}>
          {isPublished ? "Visível" : "Rascunho"}
        </span>
      </label>

      {msg && (
        <div className={`text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${
          msg.type === "ok"
            ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-200"
            : "bg-red-500/10 border border-red-500/25 text-red-200"
        }`}>
          {msg.type === "err" && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          data-testid="lesson-btn-delete"
          className="inline-flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Apagar aula
        </button>

        <button
          type="submit"
          disabled={saving || deleting}
          data-testid="lesson-btn-save"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-4 py-2 rounded-xl shadow-lg shadow-fuchsia-900/20 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar aula
        </button>
      </div>
    </form>
  )
}

const INPUT = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30 transition-all"

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1.5">
      {icon}
      {children}
    </label>
  )
}
