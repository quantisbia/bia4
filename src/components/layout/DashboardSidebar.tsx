"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard,
  GitBranch,
  FlaskConical,
  CircleDot,
  FileText,
  BookOpen,
  MessageSquare,
  CreditCard,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

/* ─── Logo SVG Branco ──────────────────────────────────────────────────── */
function BiaLogoIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BIA Logo"
    >
      <circle cx="50" cy="50" r="44" stroke="white" strokeWidth="5" strokeLinecap="round"
        strokeDasharray="240 40" strokeDashoffset="20" />
      <path
        d="M22 30 L22 70 M22 30 L38 30 Q48 30 48 40 Q48 50 38 50 L22 50 M22 50 L40 50 Q52 50 52 60 Q52 70 40 70 L22 70"
        stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M56 70 L68 30 L80 70 M61 55 L75 55"
        stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/pipeline", label: "Pipeline de Design", icon: GitBranch },
  { href: "/dashboard/biomaterials", label: "Formulador Bio", icon: FlaskConical },
  { href: "/dashboard/organoids", label: "Organoid Builder", icon: CircleDot },
  { href: "/dashboard/protocols", label: "Protocolos", icon: FileText },
  { href: "/dashboard/knowledge", label: "Base de Conhecimento", icon: BookOpen },
  { href: "/dashboard/chat", label: "Chat IA", icon: MessageSquare },
]

const BOTTOM_ITEMS = [
  { href: "/dashboard/billing", label: "Assinatura", icon: CreditCard },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
]

const PLAN_CREDITS: Record<string, number> = {
  FREE: 10,
  DISCOVERY: 500,
  ADVANCED: 1500,
  ENTERPRISE: 5000,
  ACADEMY: 20000,
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const user = session?.user
  const plan = (user?.plan as string) ?? "FREE"
  const credits = (user?.credits as number) ?? 0
  const maxCredits = PLAN_CREDITS[plan] ?? 10
  const creditPct = Math.min((credits / maxCredits) * 100, 100)
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href) && href !== "/dashboard"
  }

  return (
    <aside className="w-64 border-r border-white/5 bg-[#0a0514]/60 flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          {/* Quadrado roxo escuro + ícone branco */}
          <div className="w-9 h-9 rounded-xl bg-[#2d0a6e] flex items-center justify-center shadow-lg shadow-violet-900/60 group-hover:shadow-violet-900/80 transition-shadow shrink-0">
            <BiaLogoIcon size={22} />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight leading-tight block">BIA</span>
            <span className="text-[9px] text-purple-400/70 tracking-widest uppercase leading-tight block">
              Biofabrication AI
            </span>
          </div>
        </Link>
      </div>

      {/* Plan badge */}
      <div className="px-4 pt-3 pb-1">
        <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
          plan === "FREE" ? "bg-gray-500/10 border-gray-500/20 text-gray-400" :
          plan === "DISCOVERY" ? "bg-violet-500/10 border-violet-500/20 text-violet-400" :
          plan === "ADVANCED" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
          plan === "ENTERPRISE" ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
          "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {plan}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-3 py-2 mt-1">
          Módulos
        </p>
        {NAV_ITEMS.map((item, idx) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-violet-400" : "text-gray-500 group-hover:text-gray-300")} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 text-violet-400/60" />}
              {!active && (
                <span className="text-[10px] text-gray-700 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/5 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-violet-500/10 text-violet-300 border border-violet-500/15"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Credits Widget */}
        <div className="mt-3 mx-1 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-gray-400 font-medium">Créditos</span>
            </div>
            <span className="text-xs font-bold text-violet-400">
              {credits.toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-700"
              style={{ width: `${creditPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-600">{creditPct.toFixed(0)}% do plano</span>
            <Link href="/dashboard/billing" className="text-[10px] text-violet-500 hover:text-violet-400">
              Upgrade →
            </Link>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-all mt-1">
          <div className="w-8 h-8 rounded-full bg-[#2d0a6e] flex items-center justify-center text-xs font-bold text-white shrink-0 shadow shadow-violet-900/60">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">
              {user?.name ?? "Usuário"}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            title="Sair"
            className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
