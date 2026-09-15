"use client"

/**
 * BIA · Academy · Admin — Form de nova aula (R13.10.1)
 *
 * Form compacto para criar aula rápido. Depois de criada, redireciona pra
 * página de edição completa da aula (onde tem anexos, biaHook, etc).
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, AlertTriangle, Video } from "lucide-react"

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80)
}

export function NewLessonForm({
  moduleId,
  moduleSlug,
  nextOrder,
}: {
  moduleId: string
  moduleSlug: string
  nextOrder: number
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [order, setOrder] = useState(String(nextOrder))
  const [youtubeInput, setYoutubeInput] = useState("")
  const [durationMin, setDurationMin] = useState("10")
  const [level, setLevel] = useState<"basic" | "intermediate" | "advanced">("intermediate")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function onTitleChange(v: string) {
    setTitle(v)
    // Auto-fill slug ao digitar título (se aluno não editou slug ainda)
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(v))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch("/api/admin/academy/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          slug: slug.trim() || slugify(title),
          order: Number(order),
          title: title.trim(),
          youtubeInput: youtubeInput.trim(),
          durationMin: Number(durationMin) || 0,
          level,
          isPublished: false, // sempre nasce como rascunho
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
      // Vai pra edição completa da aula recém-criada
      router.push(`/dashboard/admin/academy/${moduleSlug}/${j.lesson.slug}`)
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" data-testid="new-lesson-form">

      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <div className="sm:col-span-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
            Order
          </label>
          <input
            type="number"
            min={1}
            max={99}
            value={order}
            onChange={e => setOrder(e.target.value)}
            required
            data-testid="new-lesson-order"
            className={INPUT_CLASS}
          />
        </div>
        <div className="sm:col-span-5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
            Título da aula
          </label>
          <input
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            required
            placeholder="ex: O que é biofabricação?"
            data-testid="new-lesson-title"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
          Slug (kebab-case · usado na URL)
        </label>
        <input
          type="text"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          required
          placeholder="ex: o-que-e-biofabricacao (gerado do título)"
          data-testid="new-lesson-slug"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-1.5">
          <Video className="w-3 h-3 text-red-400" />
          URL do YouTube (ou ID de 11 caracteres)
        </label>
        <input
          type="text"
          value={youtubeInput}
          onChange={e => setYoutubeInput(e.target.value)}
          required
          placeholder="ex: https://youtu.be/dQw4w9WgXcQ  ou  https://youtube.com/watch?v=…  ou  dQw4w9WgXcQ"
          data-testid="new-lesson-youtube"
          className={`${INPUT_CLASS} font-mono text-xs`}
        />
        <p className="text-[10px] text-gray-500 mt-1">
          Aceita várias formas: URL curta, URL de watch, /embed, /shorts, ou o ID puro. Também aceita placeholders (PLACEHOLDER_M02_L01).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
            Duração (min)
          </label>
          <input
            type="number"
            min={0}
            max={600}
            value={durationMin}
            onChange={e => setDurationMin(e.target.value)}
            data-testid="new-lesson-duration"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">
            Nível
          </label>
          <select
            value={level}
            onChange={e => setLevel(e.target.value as "basic" | "intermediate" | "advanced")}
            data-testid="new-lesson-level"
            className={INPUT_CLASS}
          >
            <option value="basic">Básico</option>
            <option value="intermediate">Intermediário</option>
            <option value="advanced">Avançado</option>
          </select>
        </div>
      </div>

      {err && (
        <div className="text-xs rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/25 text-red-200 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{err}</span>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={busy || !title.trim() || !slug.trim() || !youtubeInput.trim()}
          data-testid="new-lesson-submit"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-4 py-2 rounded-xl shadow-lg shadow-fuchsia-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar aula (rascunho)
        </button>
      </div>
    </form>
  )
}

const INPUT_CLASS = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30 transition-all"
