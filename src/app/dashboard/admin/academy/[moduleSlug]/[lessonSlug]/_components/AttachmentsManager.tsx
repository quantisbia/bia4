"use client"

/**
 * BIA · Academy · Admin — Gerenciador de anexos da aula (R13.10.1)
 *
 * Nessa sprint aceita apenas URL (não upload real). Upload de arquivo
 * fica para R13.10.2 (integração com R2/S3).
 */
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Trash2, Loader2, AlertTriangle, FileText, Link as LinkIcon,
  Box, Cog, Image as ImageIcon, ExternalLink,
} from "lucide-react"

type Attachment = {
  id: string
  kind: string
  title: string
  url: string
  sizeBytes: number | null
}

const KIND_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  LINK: LinkIcon,
  STL: Box,
  GCODE: Cog,
  IMAGE: ImageIcon,
}

const KIND_OPTIONS = [
  { value: "PDF", label: "PDF (protocolo, paper, ficha técnica)" },
  { value: "LINK", label: "LINK (site externo, PubMed, DOI, GitHub)" },
  { value: "STL", label: "STL (modelo 3D para bioimpressão)" },
  { value: "GCODE", label: "G-CODE (caminho de bioimpressão)" },
  { value: "IMAGE", label: "IMAGE (imagem/diagrama)" },
]

export function AttachmentsManager({
  lessonId,
  attachments: initialAttachments,
}: {
  lessonId: string
  attachments: Attachment[]
}) {
  const router = useRouter()
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)

  const [kind, setKind] = useState("LINK")
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setErr(null)
    try {
      const res = await fetch("/api/admin/academy/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          kind,
          title: title.trim(),
          url: url.trim(),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
      // Adiciona localmente para UX rápida
      setAttachments(prev => [...prev, j.attachment])
      setTitle("")
      setUrl("")
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    }
    setAdding(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o anexo "${name}"?`)) return
    setRemovingId(id)
    setErr(null)
    try {
      const res = await fetch(`/api/admin/academy/attachments/${id}`, { method: "DELETE" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
      setAttachments(prev => prev.filter(a => a.id !== id))
      router.refresh()
    } catch (e) {
      setErr((e as Error).message)
    }
    setRemovingId(null)
  }

  return (
    <div className="space-y-4" data-testid="attachments-manager">

      {/* Lista atual */}
      {attachments.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          Nenhum anexo ainda. Adicione links, PDFs, STL ou G-code abaixo.
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2" data-testid="attachments-list">
          {attachments.map(a => {
            const Icon = KIND_ICONS[a.kind] ?? FileText
            return (
              <li
                key={a.id}
                data-testid={`attachment-item-${a.id}`}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-fuchsia-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.title}</p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <span className="uppercase tracking-wider font-bold">{a.kind}</span>
                    <span className="text-gray-700">·</span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-400 hover:text-fuchsia-300 truncate max-w-md inline-flex items-center gap-0.5"
                    >
                      {a.url}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id, a.title)}
                  disabled={removingId === a.id}
                  data-testid={`attachment-delete-${a.id}`}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-all disabled:opacity-50"
                  title="Remover"
                >
                  {removingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Form de adicionar */}
      <form onSubmit={handleAdd} className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4 space-y-3" data-testid="attachments-add-form">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Adicionar novo anexo
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Tipo</label>
            <select
              value={kind}
              onChange={e => setKind(e.target.value)}
              className={INPUT}
              data-testid="attachment-field-kind"
            >
              {KIND_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Título (nome amigável)</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex: Protocolo GelMA 5%"
              required
              className={INPUT}
              data-testid="attachment-field-title"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">
            URL (https://…)
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="ex: https://drive.google.com/file/d/xxx/view · https://doi.org/… · https://cdn.quantis.bio/protocolos/gelma-5.pdf"
            required
            className={`${INPUT} font-mono text-xs`}
            data-testid="attachment-field-url"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            URL pública direta (Drive público, S3, PubMed, GitHub, etc). Upload de arquivo direto chegará em R13.10.2.
          </p>
        </div>

        {err && (
          <div className="text-xs rounded-lg px-3 py-2 bg-red-500/10 border border-red-500/25 text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={adding || !title.trim() || !url.trim()}
            data-testid="attachment-submit"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-4 py-2 rounded-xl shadow-lg shadow-fuchsia-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Adicionar anexo
          </button>
        </div>
      </form>
    </div>
  )
}

const INPUT = "w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30 transition-all"
