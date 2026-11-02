"use client"

/**
 * BIA · Academy · Admin · R28 — Upload de PDF direto na aula
 *
 * Fatia o arquivo em partes de 3 MB (limite de 4,5 MB/req na Vercel) e envia
 * em sequência para /api/admin/academy/files. Barra de progresso, renomear,
 * remover, e botão "Avisar alunos" que abre a página de avisos já com a aula.
 */
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FileText, Upload, Trash2, Loader2, AlertTriangle, Bell, Pencil, Check, X } from "lucide-react"

export type AcademyFileRow = { id: string; title: string; fileName: string; sizeBytes: number; ready: boolean; createdAt: string | Date }

const CHUNK = 3 * 1024 * 1024
const MAX = 40 * 1024 * 1024
const fmt = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export function FilesManager({ lessonId, moduleSlug, lessonSlug, files: initial }: { lessonId: string; moduleSlug: string; lessonSlug: string; files: AcademyFileRow[] }) {
  const router = useRouter()
  const [files, setFiles] = useState<AcademyFileRow[]>(initial)
  const [title, setTitle] = useState("")
  const [picked, setPicked] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [removing, setRemoving] = useState<string | null>(null)
  const [lastUploaded, setLastUploaded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onPick(f: File | null) {
    setErr(null); setPicked(f)
    if (f && !title.trim()) setTitle(f.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " "))
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    if (!picked) return
    if (picked.size > MAX) { setErr(`Arquivo de ${fmt(picked.size)} — máximo ${fmt(MAX)}. Comprima o PDF (ex.: ilovepdf.com/compress).`); return }
    if (!/\.pdf$/i.test(picked.name) && picked.type !== "application/pdf") { setErr("Só PDF por enquanto."); return }
    setBusy(true); setErr(null); setProgress(0)
    try {
      const count = Math.max(1, Math.ceil(picked.size / CHUNK))
      let fileId: string | null = null
      let last: AcademyFileRow | null = null
      for (let i = 0; i < count; i++) {
        const part = picked.slice(i * CHUNK, Math.min(picked.size, (i + 1) * CHUNK))
        const fd = new FormData()
        fd.set("lessonId", lessonId); fd.set("title", title.trim()); fd.set("file", part, picked.name)
        fd.set("chunkIndex", String(i)); fd.set("chunkCount", String(count)); fd.set("fileName", picked.name); fd.set("totalSize", String(picked.size))
        if (fileId) fd.set("fileId", fileId)
        const res = await fetch("/api/admin/academy/files", { method: "POST", body: fd })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(j?.message ?? j?.error ?? `Falha ${res.status}`)
        fileId = j.file.id; last = j.file
        setProgress(Math.round(((i + 1) / count) * 100))
      }
      if (last) { setFiles((p) => [...p.filter((f) => f.id !== last!.id), last!]); setLastUploaded(last.id) }
      setTitle(""); setPicked(null); if (inputRef.current) inputRef.current.value = ""
      router.refresh()
    } catch (e) { setErr((e as Error).message) }
    setBusy(false); setProgress(null)
  }

  async function rename(id: string) {
    const t = editTitle.trim(); if (!t) return
    const res = await fetch(`/api/admin/academy/files/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t }) })
    if (res.ok) { setFiles((p) => p.map((f) => (f.id === id ? { ...f, title: t } : f))); router.refresh() }
    setEditing(null)
  }

  async function remove(f: AcademyFileRow) {
    if (!confirm(`Remover "${f.title}"? Os alunos deixam de ver o arquivo.`)) return
    setRemoving(f.id)
    const res = await fetch(`/api/admin/academy/files/${f.id}`, { method: "DELETE" })
    if (res.ok) { setFiles((p) => p.filter((x) => x.id !== f.id)); router.refresh() } else setErr("Não consegui remover.")
    setRemoving(null)
  }

  const notifyHref = `/dashboard/admin/academy/notifications?lessonId=${lessonId}&kind=NEW_MATERIAL`

  return (
    <div className="space-y-4" data-testid="files-manager">
      {files.length === 0 && <p className="text-xs text-gray-500 text-center py-3">Nenhum PDF ainda. Envie o primeiro abaixo — os alunos veem em "Materiais em PDF" na aula.</p>}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${f.id === lastUploaded ? "border-emerald-400/40 bg-emerald-500/[0.06]" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center shrink-0"><FileText className="w-3.5 h-3.5 text-amber-200" /></div>
              <div className="flex-1 min-w-0">
                {editing === f.id ? (
                  <div className="flex items-center gap-1">
                    <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void rename(f.id); if (e.key === "Escape") setEditing(null) }} className="flex-1 px-2 py-1 rounded bg-black/40 border border-white/15 text-sm text-white outline-none" />
                    <button onClick={() => rename(f.id)} className="p-1 text-emerald-300"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditing(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <p className="text-sm text-white truncate flex items-center gap-1.5">{f.title}<button onClick={() => { setEditing(f.id); setEditTitle(f.title) }} title="Renomear" className="text-gray-500 hover:text-fuchsia-300"><Pencil className="w-3 h-3" /></button></p>
                )}
                <p className="text-[10px] text-gray-500">{f.fileName} · {fmt(f.sizeBytes)}{!f.ready && <span className="text-amber-300"> · upload incompleto</span>}</p>
              </div>
              <a href={`/api/academy/files/${f.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-fuchsia-300 hover:text-fuchsia-200 px-2 py-1 rounded border border-fuchsia-500/30">Abrir</a>
              <button onClick={() => remove(f)} disabled={removing === f.id} className="p-1.5 text-gray-500 hover:text-red-300 disabled:opacity-40" title="Remover">{removing === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>
            </li>
          ))}
        </ul>
      )}

      {lastUploaded && (
        <Link href={notifyHref} className="flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20">
          <Bell className="w-4 h-4" /> PDF enviado. <b>Avisar os alunos agora</b> (sininho + e-mail) →
        </Link>
      )}

      <form onSubmit={upload} className="rounded-xl border border-dashed border-white/15 p-4 space-y-3">
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Título do material</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: Reforço · Biotintas (PDF, 4 págs.)" disabled={busy} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-sm text-white outline-none focus:border-fuchsia-500/50 disabled:opacity-40" />
          </div>
          <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${picked ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10" : "border-white/15 text-gray-300 hover:border-fuchsia-500/40"} ${busy ? "opacity-40 pointer-events-none" : ""}`}>
            <Upload className="w-4 h-4" /> {picked ? `${picked.name} (${fmt(picked.size)})` : "Escolher PDF"}
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" disabled={busy} onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        {progress !== null && (
          <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all" style={{ width: `${progress}%` }} /></div>
        )}
        {err && <p className="text-xs text-red-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {err}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-500">Só PDF · até 40 MB · enviado em partes de 3 MB · fica disponível só para alunos com matrícula ativa.</p>
          <button type="submit" disabled={busy || !picked || !title.trim()} className="px-4 py-2 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress ?? 0} %</> : <><Upload className="w-4 h-4" /> Enviar PDF</>}
          </button>
        </div>
      </form>
      <p className="text-[11px] text-gray-500">Aula sem vídeo? Deixe a URL do YouTube vazia em "Dados da aula" — ela vira <b>aula de leitura</b> e os alunos veem estes PDFs em destaque.</p>
    </div>
  )
}
