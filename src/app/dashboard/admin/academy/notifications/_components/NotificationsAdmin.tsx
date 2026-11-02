"use client"

/**
 * BIA · Academy · Admin · R28 — Avisos para a turma
 * Formulário (tipo, aula, título, texto, e-mail sim/não, teste para 1 e-mail)
 * + histórico com contagem de e-mails enviados e de leituras no sininho.
 */
import { useEffect, useMemo, useState } from "react"
import { Bell, Send, Loader2, AlertTriangle, CheckCircle2, Mail, Eye, FlaskConical } from "lucide-react"

type Kind = "NEW_MATERIAL" | "NEW_LESSON" | "ANNOUNCEMENT"
type LessonOpt = { id: string; label: string; moduleSlug: string; slug: string }
type Row = { id: string; kind: Kind; title: string; body: string; url: string | null; createdAt: string; lesson: string | null; emailSent: number; emailFailed: number; emailSkipped: number; emailedAt: string | null; reads: number }

const KIND_LABEL: Record<Kind, string> = { NEW_MATERIAL: "Material novo", NEW_LESSON: "Aula publicada", ANNOUNCEMENT: "Aviso" }
const KIND_TONE: Record<Kind, string> = { NEW_MATERIAL: "text-amber-200 border-amber-400/30 bg-amber-500/10", NEW_LESSON: "text-fuchsia-200 border-fuchsia-400/30 bg-fuchsia-500/10", ANNOUNCEMENT: "text-cyan-200 border-cyan-400/30 bg-cyan-500/10" }

const inp = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-sm text-white outline-none focus:border-fuchsia-500/50 disabled:opacity-40"

export function NotificationsAdmin({ lessons, initialLessonId, initialKind }: { lessons: LessonOpt[]; initialLessonId?: string; initialKind?: Kind }) {
  const [kind, setKind] = useState<Kind>(initialKind ?? "NEW_MATERIAL")
  const [lessonId, setLessonId] = useState<string>(initialLessonId ?? "")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [sendEmail, setSendEmail] = useState(true)
  const [testEmail, setTestEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [students, setStudents] = useState<{ total: number; withEmail: number } | null>(null)
  const [emailConfigured, setEmailConfigured] = useState(true)

  const lesson = useMemo(() => lessons.find((l) => l.id === lessonId) ?? null, [lessons, lessonId])

  async function load() {
    const r = await fetch("/api/admin/academy/notifications").then((x) => x.json()).catch(() => null)
    if (r) { setRows(r.notifications ?? []); setStudents(r.students ?? null); setEmailConfigured(!!r.emailConfigured) }
  }
  useEffect(() => { void load() }, [])

  // sugestão de título/texto ao escolher aula + tipo
  useEffect(() => {
    if (!lesson || title) return
    if (kind === "NEW_MATERIAL") { setTitle(`Novo material: ${lesson.label.split(" · ")[1] ?? lesson.label}`); setBody(`Publicamos um novo PDF na aula "${lesson.label}". Leia, faça o teste de aprendizagem e traga as dúvidas para o próximo encontro.`) }
    if (kind === "NEW_LESSON") { setTitle(`Aula publicada: ${lesson.label.split(" · ")[1] ?? lesson.label}`); setBody(`A aula "${lesson.label}" já está disponível na BIA Academy.`) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, kind])

  async function submit(e: React.FormEvent, onlyTest = false) {
    e.preventDefault()
    setBusy(true); setErr(null); setOk(null)
    try {
      const payload: Record<string, unknown> = { kind, title: title.trim(), body: body.trim(), lessonId: lessonId || null, sendEmail }
      if (onlyTest) { if (!testEmail.trim()) throw new Error("Informe o e-mail de teste."); payload.onlyEmails = [testEmail.trim()]; payload.sendEmail = true }
      const res = await fetch("/api/admin/academy/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.message ?? (j?.issues ? j.issues.map((i: { message: string }) => i.message).join("; ") : j?.error) ?? `Falha ${res.status}`)
      const r = j.result as { recipients: number; emailSent: number; emailFailed: number; emailSkipped: number; errors: string[]; emailConfigured: boolean }
      setOk(onlyTest
        ? `Teste enviado para ${testEmail} (${r.emailSent} ok · ${r.emailFailed} falha). O aviso também ficou no sininho de ${r.recipients} alunos.`
        : `Aviso publicado para ${r.recipients} alunos · e-mails: ${r.emailSent} enviados · ${r.emailSkipped} sem e-mail/desligado · ${r.emailFailed} falhas${!r.emailConfigured ? " · RESEND_API_KEY ausente" : ""}.`)
      if (r.errors?.length) setErr(r.errors.join(" | "))
      if (!onlyTest) { setTitle(""); setBody("") }
      await load()
    } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
      <form onSubmit={(e) => submit(e)} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 h-fit">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><Bell className="w-4 h-4 text-cyan-300" /> Novo aviso</h2>
        {students && (
          <p className="text-[11px] text-gray-400">Vai para <b className="text-white">{students.total}</b> alunos com matrícula ativa (sininho) · <b className="text-white">{students.withEmail}</b> aceitam e-mail.
            {!emailConfigured && <span className="text-amber-300"> RESEND_API_KEY não configurada — só sininho.</span>}</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`py-2 rounded-lg border text-xs font-semibold ${kind === k ? KIND_TONE[k] : "border-white/10 text-gray-400 hover:border-white/25"}`}>{KIND_LABEL[k]}</button>
          ))}
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Aula relacionada (opcional — vira o link do aviso)</label>
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className={inp} disabled={busy}>
            <option value="">— sem aula (link para o dashboard) —</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} className={inp} disabled={busy} placeholder="ex.: Novo material: Reforço de Biotintas (PDF)" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Mensagem</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} className={inp} disabled={busy} placeholder="O que foi publicado, o que o aluno deve fazer, até quando…" />
          <p className="text-[10px] text-gray-500 mt-1">{body.length}/2000 · texto simples; o e-mail inclui botão "Abrir na BIA Academy" e link de descadastro.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-200"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} disabled={busy} className="accent-fuchsia-500" /> <Mail className="w-4 h-4 text-gray-400" /> Enviar e-mail (além do sininho)</label>
        {err && <p className="text-xs text-red-300 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {err}</p>}
        {ok && <p className="text-xs text-emerald-200 flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {ok}</p>}
        <div className="flex flex-wrap gap-2 items-center pt-1">
          <button type="submit" disabled={busy || title.trim().length < 3 || body.trim().length < 3} className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold disabled:opacity-40 inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publicar para a turma</button>
          <div className="flex items-center gap-1 ml-auto">
            <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="seu@email" className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs text-white outline-none w-40" disabled={busy} />
            <button type="button" onClick={(e) => submit(e, true)} disabled={busy || title.trim().length < 3 || body.trim().length < 3} title="Grava o aviso e envia e-mail só para este endereço" className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs text-gray-200 hover:border-fuchsia-400/40 disabled:opacity-40 inline-flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> Testar</button>
          </div>
        </div>
      </form>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h2 className="text-sm font-bold text-white mb-3">Histórico ({rows.length})</h2>
        {rows.length === 0 && <p className="text-xs text-gray-500 py-6 text-center">Nenhum aviso enviado ainda.</p>}
        <ul className="space-y-2 max-h-[70vh] overflow-auto pr-1">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${KIND_TONE[r.kind] ?? ""}`}>{KIND_LABEL[r.kind] ?? r.kind}</span>
                <span className="text-sm text-white font-medium flex-1 min-w-0 truncate">{r.title}</span>
                <span className="text-[10px] text-gray-500">{new Date(r.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              {r.lesson && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{r.lesson}</p>}
              <p className="text-xs text-gray-300 mt-1 line-clamp-2">{r.body}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {r.emailSent} enviados{r.emailFailed ? <span className="text-red-300"> · {r.emailFailed} falhas</span> : null}{r.emailSkipped ? ` · ${r.emailSkipped} pulados` : ""}</span>
                <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {r.reads} leram</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
