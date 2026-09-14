"use client"

/**
 * BIA · Academy · Admin — Form de edição de módulo (R13.10.1)
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Trash2, AlertTriangle } from "lucide-react"

type ModuleData = {
  id: string
  slug: string
  order: number
  title: string
  description: string | null
  isPublished: boolean
  coverImage: string | null
}

export function ModuleEditForm({ moduleData }: { moduleData: ModuleData }) {
  const router = useRouter()
  const [slug, setSlug] = useState(moduleData.slug)
  const [order, setOrder] = useState(String(moduleData.order))
  const [title, setTitle] = useState(moduleData.title)
  const [description, setDescription] = useState(moduleData.description ?? "")
  const [coverImage, setCoverImage] = useState(moduleData.coverImage ?? "")
  const [isPublished, setIsPublished] = useState(moduleData.isPublished)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/academy/modules/${moduleData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim() !== moduleData.slug ? slug.trim() : undefined,
          order: Number(order),
          title: title.trim(),
          description: description.trim() || null,
          coverImage: coverImage.trim() || null,
          isPublished,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
      setMsg({ type: "ok", text: "Módulo atualizado." })
      // Se slug mudou, navegar pra nova URL
      if (j.module?.slug && j.module.slug !== moduleData.slug) {
        router.replace(`/dashboard/admin/academy/${j.module.slug}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Apagar o módulo "${title}"?\n\nSó funciona se o módulo NÃO tiver aulas. Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/academy/modules/${moduleData.id}`, {
        method: "DELETE",
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
      router.replace("/dashboard/admin/academy")
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message })
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4" data-testid="module-edit-form">

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Field label="Order" hint="1-99">
          <input
            type="number"
            min={1}
            max={99}
            value={order}
            onChange={e => setOrder(e.target.value)}
            className={INPUT_CLASS}
            data-testid="module-field-order"
          />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Slug (kebab-case · usado na URL)">
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="ex: introducao-biofabricacao"
              className={INPUT_CLASS}
              data-testid="module-field-slug"
            />
          </Field>
        </div>
      </div>

      <Field label="Título">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className={INPUT_CLASS}
          data-testid="module-field-title"
        />
      </Field>

      <Field label="Descrição (markdown)">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          className={`${INPUT_CLASS} font-mono text-xs`}
          data-testid="module-field-description"
        />
      </Field>

      <Field label="URL da imagem de capa (opcional)">
        <input
          type="url"
          value={coverImage}
          onChange={e => setCoverImage(e.target.value)}
          placeholder="https://..."
          className={INPUT_CLASS}
          data-testid="module-field-cover"
        />
      </Field>

      <label className="flex items-center gap-3 py-3 border-y border-white/[0.06] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={e => setIsPublished(e.target.checked)}
          data-testid="module-field-published"
          className="w-4 h-4 rounded border-white/20 bg-white/[0.06] text-fuchsia-500 focus:ring-fuchsia-500/30 focus:ring-offset-0"
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-white">Publicado</span>
          <p className="text-[11px] text-gray-500">
            Apenas módulos publicados aparecem para alunos (aulas dentro precisam estar publicadas individualmente).
          </p>
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

      <div className="flex gap-2 justify-between pt-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          data-testid="module-btn-delete"
          className="inline-flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Apagar módulo
        </button>

        <button
          type="submit"
          disabled={saving || deleting}
          data-testid="module-btn-save"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-4 py-2 rounded-xl shadow-lg shadow-fuchsia-900/20 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </button>
      </div>
    </form>
  )
}

const INPUT_CLASS = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30 transition-all"

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </span>
        {hint && <span className="text-[10px] text-gray-600">{hint}</span>}
      </label>
      {children}
    </div>
  )
}
