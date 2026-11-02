"use client"

/**
 * BIA · Academy · R28 — Sininho de notificações (sidebar)
 * Busca /api/academy/notifications ao montar e a cada 2 min; badge com não lidas;
 * popover com as 6 mais recentes; "marcar todas como lidas"; link para a página.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, Check, FileText, PlayCircle, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

type Item = { id: string; kind: string; title: string; body: string; url: string | null; createdAt: string; read: boolean; lesson: { title: string; moduleTitle: string } | null }

const ICON: Record<string, typeof Bell> = { NEW_MATERIAL: FileText, NEW_LESSON: PlayCircle, ANNOUNCEMENT: Megaphone }
const LABEL: Record<string, string> = { NEW_MATERIAL: "Material novo", NEW_LESSON: "Aula publicada", ANNOUNCEMENT: "Aviso" }

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`
  if (s < 86400) return `${Math.round(s / 3600)} h`
  if (s < 7 * 86400) return `${Math.round(s / 86400)} d`
  return new Date(iso).toLocaleDateString("pt-BR")
}

export function NotificationBell({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/academy/notifications", { cache: "no-store" })
      if (!r.ok) return
      const j = (await r.json()) as { items: Item[]; unread: number }
      setItems(j.items ?? []); setUnread(j.unread ?? 0)
    } catch { /* offline — mantém estado */ }
  }, [])

  useEffect(() => { void load(); const t = setInterval(load, 120000); return () => clearInterval(t) }, [load])
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  async function markAll() {
    setItems((p) => p.map((i) => ({ ...i, read: true }))); setUnread(0)
    await fetch("/api/academy/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markRead: "all" }) }).catch(() => {})
  }
  async function markOne(id: string) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, read: true } : i))); setUnread((u) => Math.max(0, u - 1))
    await fetch("/api/academy/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markRead: [id] }) }).catch(() => {})
  }

  return (
    <div ref={ref} className="relative" data-testid="academy-notification-bell">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `${unread} notificações não lidas` : "Notificações"}
        className={cn(
          "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all w-full",
          compact ? "p-2 justify-center" : "px-3 py-2.5",
          open || unread ? "text-cyan-200 bg-cyan-500/10 border border-cyan-500/20" : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200 border border-transparent",
        )}
      >
        <span className="relative shrink-0">
          <Bell className={cn("w-4 h-4", unread && "animate-[wiggle_1s_ease-in-out_1]")} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-fuchsia-500 text-[9px] font-black text-white flex items-center justify-center shadow-lg shadow-fuchsia-900/50" data-testid="academy-notification-badge">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        {!compact && <span className="flex-1 text-left">Notificações</span>}
        {!compact && unread > 0 && <span className="text-[10px] font-bold text-fuchsia-300">{unread} nova{unread > 1 ? "s" : ""}</span>}
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 md:left-full md:right-auto md:ml-2 md:top-0 md:w-80 mt-1 md:mt-0 rounded-2xl border border-white/10 bg-[#0d0818] shadow-2xl shadow-black/60 overflow-hidden">
          <header className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-cyan-300" />
            <span className="text-xs font-bold text-white">Notificações</span>
            {unread > 0 && <button onClick={markAll} className="ml-auto text-[10px] text-cyan-300 hover:text-white inline-flex items-center gap-1"><Check className="w-3 h-3" /> marcar todas lidas</button>}
          </header>
          <ul className="max-h-80 overflow-auto divide-y divide-white/[0.04]">
            {items.length === 0 && <li className="px-3 py-6 text-center text-xs text-gray-500">Nenhum aviso ainda. Quando houver material novo, aparece aqui.</li>}
            {items.slice(0, 6).map((n) => {
              const Icon = ICON[n.kind] ?? Bell
              const href = n.url ?? "/academy/dashboard"
              return (
                <li key={n.id}>
                  <Link href={href} onClick={() => { void markOne(n.id); setOpen(false); onNavigate?.() }} className={cn("flex gap-3 px-3 py-2.5 hover:bg-white/[0.04]", !n.read && "bg-cyan-500/[0.05]")}>
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", n.read ? "bg-white/[0.04] border-white/10 text-gray-500" : "bg-cyan-500/15 border-cyan-400/30 text-cyan-200")}><Icon className="w-3.5 h-3.5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{LABEL[n.kind] ?? n.kind} · {ago(n.createdAt)}</p>
                      <p className={cn("text-xs leading-snug line-clamp-2", n.read ? "text-gray-300" : "text-white font-medium")}>{n.title}</p>
                      {n.lesson && <p className="text-[10px] text-gray-500 truncate">{n.lesson.moduleTitle} · {n.lesson.title}</p>}
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 mt-2 shrink-0" />}
                  </Link>
                </li>
              )
            })}
          </ul>
          <footer className="px-3 py-2 border-t border-white/[0.06]">
            <Link href="/academy/notifications" onClick={() => { setOpen(false); onNavigate?.() }} className="text-[11px] text-fuchsia-300 hover:text-white font-semibold">Ver todas e ajustar e-mails →</Link>
          </footer>
        </div>
      )}
    </div>
  )
}
