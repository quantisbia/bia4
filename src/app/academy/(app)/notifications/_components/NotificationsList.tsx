"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Check, FileText, PlayCircle, Megaphone, Mail, MailX, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

type Item = { id: string; kind: string; title: string; body: string; url: string | null; createdAt: string; read: boolean; lesson: { title: string; moduleTitle: string } | null }
const ICON: Record<string, typeof Bell> = { NEW_MATERIAL: FileText, NEW_LESSON: PlayCircle, ANNOUNCEMENT: Megaphone }
const LABEL: Record<string, string> = { NEW_MATERIAL: "Material novo", NEW_LESSON: "Aula publicada", ANNOUNCEMENT: "Aviso" }
const TONE: Record<string, string> = { NEW_MATERIAL: "text-amber-200 border-amber-400/30 bg-amber-500/10", NEW_LESSON: "text-fuchsia-200 border-fuchsia-400/30 bg-fuchsia-500/10", ANNOUNCEMENT: "text-cyan-200 border-cyan-400/30 bg-cyan-500/10" }

export function NotificationsList({ initialItems, initialUnread, initialNotifyEmail }: { initialItems: Item[]; initialUnread: number; initialNotifyEmail: boolean }) {
  const [items, setItems] = useState(initialItems)
  const [unread, setUnread] = useState(initialUnread)
  const [notifyEmail, setNotifyEmail] = useState(initialNotifyEmail)
  const [saving, setSaving] = useState(false)

  async function patch(body: Record<string, unknown>) {
    return fetch("/api/academy/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null)
  }
  async function markAll() { setItems((p) => p.map((i) => ({ ...i, read: true }))); setUnread(0); await patch({ markRead: "all" }) }
  async function markOne(id: string) { setItems((p) => p.map((i) => (i.id === id ? { ...i, read: true } : i))); setUnread((u) => Math.max(0, u - 1)); await patch({ markRead: [id] }) }
  async function toggleEmail() { setSaving(true); const next = !notifyEmail; setNotifyEmail(next); await patch({ notifyEmail: next }); setSaving(false) }

  return (
    <div className="space-y-5">
      {/* preferência de e-mail */}
      <section className={cn("rounded-2xl border p-4 flex items-start gap-3", notifyEmail ? "border-emerald-400/25 bg-emerald-500/[0.05]" : "border-white/10 bg-white/[0.02]")} data-testid="notify-email-pref">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", notifyEmail ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200" : "bg-white/[0.04] border-white/10 text-gray-400")}>
          {notifyEmail ? <Mail className="w-5 h-5" /> : <MailX className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">E-mail quando houver material novo</p>
          <p className="text-xs text-gray-400 mt-0.5">{notifyEmail ? "Ativado — você recebe um e-mail curto a cada PDF, aula ou aviso publicado." : "Desativado — os avisos continuam aqui e no sininho, mas não por e-mail."}</p>
        </div>
        <button onClick={toggleEmail} disabled={saving} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-40 inline-flex items-center gap-1.5", notifyEmail ? "border-white/15 text-gray-200 hover:bg-white/10" : "bg-emerald-400 text-black border-emerald-300 hover:bg-emerald-300")}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}{notifyEmail ? "Desativar" : "Ativar"}
        </button>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{items.length} aviso{items.length === 1 ? "" : "s"}{unread ? ` · ${unread} não lido${unread > 1 ? "s" : ""}` : ""}</p>
        {unread > 0 && <button onClick={markAll} className="text-xs text-cyan-300 hover:text-white inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Marcar todas como lidas</button>}
      </div>

      {items.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center">
          <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum aviso ainda. Quando a equipe publicar material novo, ele aparece aqui.</p>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((n) => {
          const Icon = ICON[n.kind] ?? Bell
          return (
            <li key={n.id} className={cn("rounded-xl border px-4 py-3 flex gap-3", n.read ? "border-white/[0.06] bg-white/[0.015]" : "border-cyan-400/25 bg-cyan-500/[0.05]")}>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", TONE[n.kind] ?? "border-white/10 text-gray-400")}><Icon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{LABEL[n.kind] ?? n.kind}</span>
                  <span className="text-[10px] text-gray-600">{new Date(n.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  {!n.read && <span className="text-[9px] font-bold text-fuchsia-300">novo</span>}
                </div>
                <p className={cn("text-sm mt-0.5", n.read ? "text-gray-200" : "text-white font-semibold")}>{n.title}</p>
                {n.lesson && <p className="text-[11px] text-gray-500">{n.lesson.moduleTitle} · {n.lesson.title}</p>}
                <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">{n.body}</p>
                <div className="flex items-center gap-3 mt-2">
                  {n.url && <Link href={n.url} onClick={() => markOne(n.id)} className="text-xs font-semibold text-fuchsia-300 hover:text-white">Abrir →</Link>}
                  {!n.read && <button onClick={() => markOne(n.id)} className="text-xs text-gray-500 hover:text-gray-200">marcar como lida</button>}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
