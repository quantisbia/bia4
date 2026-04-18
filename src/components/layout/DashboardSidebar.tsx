"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard, GitBranch, FlaskConical, CircleDot,
  FileText, BookOpen, MessageSquare, CreditCard, Settings,
  LogOut, Zap, ChevronRight, Menu, X, Printer, Microscope, Box, ClipboardCheck, BookMarked,
  Crown,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { isSuperAdmin } from "@/lib/auth/admin-shared"

export function BiaLogoIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-label="BIA Logo">
      <path d="M60 8 A52 52 0 1 1 59.99 8" stroke="white" strokeWidth="9"
        strokeLinecap="round" fill="none" opacity="0.95" />
      <rect x="53" y="4" width="14" height="11" fill="#2d0a6e" />
      <rect x="53" y="105" width="14" height="11" fill="#2d0a6e" />
      <rect x="57" y="28" width="6" height="64" rx="3" fill="white" />
      <rect x="26" y="28" width="6" height="64" rx="3" fill="white" />
      <path d="M32 28 Q52 28 52 42 Q52 56 32 56" stroke="white" strokeWidth="6"
        strokeLinecap="round" fill="none" />
      <path d="M32 56 Q54 56 54 70 Q54 84 32 84" stroke="white" strokeWidth="6"
        strokeLinecap="round" fill="none" />
      <path d="M63 84 L75 28 L87 84" stroke="white" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="67" y1="66" x2="83" y2="66" stroke="white" strokeWidth="5.5"
        strokeLinecap="round" />
    </svg>
  )
}

export const NAV_ITEMS = [
  { href: "/dashboard",               label: "Visão Geral",         icon: LayoutDashboard, exact: true },
  { href: "/dashboard/pipeline",      label: "Pipeline",            icon: GitBranch,        exact: false },
  { href: "/dashboard/biomaterials",  label: "Formulador Bio",      icon: FlaskConical,     exact: false },
  { href: "/dashboard/bioprinting",   label: "Bioimpressão 3D",     icon: Printer,          exact: false },
  { href: "/dashboard/organoids",     label: "Organoid Builder",    icon: CircleDot,        exact: false },
  { href: "/dashboard/protocols",     label: "Protocolos GLP/GMP",  icon: FileText,         exact: false },
  { href: "/dashboard/analyses",      label: "Análises & Dossiês",  icon: Microscope,       exact: false },
  { href: "/dashboard/knowledge",     label: "Base de Conhecimento",icon: BookOpen,         exact: false },
  { href: "/dashboard/chat",          label: "Chat IA",             icon: MessageSquare,    exact: false },
  { href: "/dashboard/stl",            label: "Gerador STL/OBJ",     icon: Box,              exact: false },
  { href: "/dashboard/protocol-total", label: "Protocolo Total",      icon: ClipboardCheck,   exact: false },
  { href: "/dashboard/notebook",       label: "Notebook Científico",   icon: BookMarked,       exact: false },
]

const BOTTOM_ITEMS = [
  { href: "/dashboard/billing",  label: "Assinatura", icon: CreditCard,  exact: false },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings, exact: false },
]

const PLAN_CREDITS: Record<string, number> = {
  FREE: 30, ORGANOID_LAB: 300, DISCOVERY: 500, ADVANCED: 1500, ENTERPRISE: 5000, ACADEMY: 20000,
}

const PLAN_COLORS: Record<string, string> = {
  FREE:         "bg-gray-500/10 border-gray-500/20 text-gray-400",
  ORGANOID_LAB: "bg-teal-500/10 border-teal-500/20 text-teal-400",
  DISCOVERY:    "bg-violet-500/10 border-violet-500/20 text-violet-400",
  ADVANCED:     "bg-blue-500/10 border-blue-500/20 text-blue-400",
  ENTERPRISE:   "bg-purple-500/10 border-purple-500/20 text-purple-400",
  ACADEMY:      "bg-amber-500/10 border-amber-500/20 text-amber-400",
}

/* ──────────────────────────────────────────────────────────────────────────
   Sidebar Content (shared desktop + drawer)
────────────────────────────────────────────────────────────────────────── */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user     = session?.user
  const plan     = (user?.plan as string) ?? "FREE"
  const credits  = (user?.credits as number) ?? 0
  const maxCr    = PLAN_CREDITS[plan] ?? 500
  const pct      = Math.min((credits / maxCr) * 100, 100)
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    if (href === "/dashboard") return false
    return pathname.startsWith(href)
  }

  const isLowCredits = credits < maxCr * 0.15

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Logo ── */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <Link href="/dashboard" onClick={onNavigate}
          className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50 shrink-0">
            <BiaLogoIcon size={22} />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-sm leading-none block">BIA</span>
            <span className="text-[9px] text-violet-400/60 tracking-[0.15em] uppercase leading-none block mt-0.5">
              Biofabrication AI
            </span>
          </div>
        </Link>
      </div>

      {/* ── Plan badge ── */}
      <div className="px-4 pt-3 pb-2">
        <div className={cn(
          "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
          PLAN_COLORS[plan] ?? PLAN_COLORS.DISCOVERY
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {plan === "FREE" ? "Discovery (Trial)" : plan}
        </div>
      </div>

      {/* ── Main nav ── */}
      <nav className="flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600/80 px-3 pt-1 pb-2">
          Módulos
        </p>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                active
                  ? "bg-violet-500/12 text-violet-300 border border-violet-500/20"
                  : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
              )}>
              <item.icon className={cn("w-4 h-4 shrink-0 transition-colors",
                active ? "text-violet-400" : "text-gray-500 group-hover:text-gray-300")} />
              <span className="flex-1 truncate">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 text-violet-400/50 shrink-0" />}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-2 pb-3 border-t border-white/[0.06] pt-2 space-y-0.5">

        {/* Admin / SuperAdmin link */}
        {(isSuperAdmin(user?.email) || (user as { role?: string })?.role === "ADMIN") && (
          <Link href="/dashboard/admin" onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1",
              "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20",
              "text-amber-300 hover:from-amber-500/15 hover:to-orange-500/15 hover:border-amber-500/35"
            )}>
            <Crown className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="flex-1 font-semibold">Admin Dashboard</span>
            <span className="text-[9px] bg-amber-500/25 text-amber-300 px-1.5 py-0.5 rounded-full font-bold tracking-wide">ELITE</span>
          </Link>
        )}

        {BOTTOM_ITEMS.map(item => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-violet-500/10 text-violet-300 border border-violet-500/15"
                  : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
              )}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Credits widget */}
        <div className={cn(
          "mt-1.5 p-3 rounded-xl border",
          isLowCredits
            ? "bg-red-500/[0.06] border-red-500/15"
            : "bg-violet-500/[0.06] border-violet-500/10"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className={cn("w-3.5 h-3.5", isLowCredits ? "text-red-400" : "text-violet-400")} />
              <span className="text-xs text-gray-400 font-medium">Créditos</span>
            </div>
            <span className={cn("text-xs font-bold", isLowCredits ? "text-red-400" : "text-violet-400")}>
              {credits.toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className={cn(
              "h-full rounded-full transition-all duration-700",
              isLowCredits
                ? "bg-gradient-to-r from-red-500 to-orange-400"
                : "bg-gradient-to-r from-violet-500 to-purple-400"
            )} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-600">{pct.toFixed(0)}% restante</span>
            <Link href="/dashboard/billing" onClick={onNavigate}
              className={cn(
                "text-[10px] font-medium transition-colors",
                isLowCredits ? "text-red-400 hover:text-red-300" : "text-violet-500 hover:text-violet-300"
              )}>
              {isLowCredits ? "⚡ Recarregar →" : "Upgrade →"}
            </Link>
          </div>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-all mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate leading-none mb-0.5">{user?.name ?? "Usuário"}</p>
            <p className="text-[10px] text-gray-600 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            title="Sair"
            className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Desktop sidebar
────────────────────────────────────────────────────────────────────────── */
function DesktopSidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 h-full border-r border-white/[0.06] bg-[#080412]/70 flex-col">
      <SidebarContent />
    </aside>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Mobile: top header + slide-in drawer
────────────────────────────────────────────────────────────────────────── */
function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user
  const credits = (user?.credits as number) ?? 0
  const plan = (user?.plan as string) ?? "FREE"
  const maxCr = PLAN_CREDITS[plan] ?? 500
  const isLow = credits < maxCr * 0.15

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const allItems = [...NAV_ITEMS, ...BOTTOM_ITEMS]
  const currentItem = allItems.find(item =>
    item.exact
      ? pathname === item.href
      : item.href !== "/dashboard" && pathname.startsWith(item.href)
  ) ?? allItems[0]

  return (
    <>
      {/* ── Top bar ── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center px-4 bg-[#080412]/95 backdrop-blur-2xl border-b border-white/[0.06]">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-300 active:scale-95 transition-all"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
            <BiaLogoIcon size={15} />
          </div>
          <span className="text-sm font-semibold text-white">
            {currentItem?.label ?? "BIA"}
          </span>
        </div>

        <Link href="/dashboard/billing"
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 active:scale-95 transition-all border",
            isLow
              ? "bg-red-500/10 border-red-500/25 text-red-400"
              : "bg-violet-500/10 border-violet-500/20 text-violet-400"
          )}>
          <Zap className="w-3 h-3" />
          <span className="text-xs font-bold">{credits.toLocaleString("pt-BR")}</span>
        </Link>
      </header>

      {/* ── Backdrop ── */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

      {/* ── Drawer ── */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-[#080412] border-r border-white/[0.08] flex flex-col shadow-2xl",
        "transition-transform duration-300 ease-out will-change-transform",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white z-10 active:scale-95 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Main export
────────────────────────────────────────────────────────────────────────── */
export function DashboardSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileHeader />
    </>
  )
}
