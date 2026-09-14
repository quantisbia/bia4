"use client"

/**
 * BIA · Academy · Sidebar próprio da plataforma educacional — R13.03
 *
 * Sidebar dedicado para a área logada da Academy (/academy/dashboard,
 * /academy/journey, /academy/modules/*, etc). NÃO é usado na landing
 * pública /academy nem em /academy/welcome (essas rotas têm layouts
 * próprios definidos no R13.02).
 *
 * Paleta: gradient violet→fuchsia (identidade visual Academy).
 * Comportamento: idêntico ao DashboardSidebar (desktop + mobile drawer),
 * mas com navegação própria e um botão explícito "Voltar para a BIA".
 *
 * Decisão travada: Opção B (sidebar próprio para /academy — a plataforma
 * educacional é um universo próprio, com nav de 7 itens: Dashboard,
 * Minha Jornada, Módulos, Biblioteca, Meu Projeto, Encontros, Certificado).
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard, Map, BookOpen, Library, FolderKanban,
  Video, Award, User, LogOut, Menu, X, ArrowLeft, GraduationCap,
  ChevronRight, Info,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

export const ACADEMY_NAV_ITEMS = [
  { href: "/academy/dashboard",  label: "Dashboard",     icon: LayoutDashboard, exact: true,
    info: "Sua central: continue de onde parou, próxima aula recomendada, progresso geral e próximo encontro ao vivo." },
  { href: "/academy/journey",    label: "Minha Jornada", icon: Map,             exact: false,
    info: "Os 12 módulos do programa em linha do tempo, com progresso individual e selo de conclusão. Veja tudo o que vem pela frente." },
  { href: "/academy/modules",    label: "Módulos",       icon: BookOpen,        exact: false,
    info: "Lista completa dos módulos publicados. Cada módulo tem um conjunto de aulas em vídeo, quiz opcional e biaHook para abrir a BIA." },
  { href: "/academy/library",    label: "Biblioteca",    icon: Library,         exact: false,
    info: "Todos os anexos das aulas (PDFs, protocolos, arquivos STL/G-code, links) reunidos e filtrados pela sua área de interesse. Chega em R13.05." },
  { href: "/academy/project",    label: "Meu Projeto",   icon: FolderKanban,    exact: false,
    info: "Seu \"Projeto de Biofabricação\" — vive num NotebookEntry do R12.66, com versionamento V1/V2/V3 automático conforme você responde os desafios. Chega em R13.07." },
  { href: "/academy/live",       label: "Encontros",     icon: Video,           exact: false,
    info: "Os 3 encontros online ao vivo do programa. Datas, links do Zoom/YT Live e gravações depois. Chega em R13.10." },
  { href: "/academy/certificate",label: "Certificado",   icon: Award,           exact: false,
    info: "Seu certificado de conclusão — desbloqueia quando você completa 100% das aulas E entrega o projeto final. Emissão em PDF (jspdf reusado do R12.67). Chega em R13.09." },
]

const BOTTOM_ITEMS = [
  { href: "/academy/profile", label: "Perfil", icon: User, exact: false },
]

// ─────────────────────────────────────────────────────────────────
//   InfoTooltip (mesma UX do DashboardSidebar — hover desktop / clique mobile)
// ─────────────────────────────────────────────────────────────────
function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    const t = setTimeout(() => document.addEventListener("click", handler), 50)
    return () => {
      clearTimeout(t)
      document.removeEventListener("click", handler)
    }
  }, [open])

  return (
    <div className="relative shrink-0 group/info">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(o => !o)
        }}
        aria-label={`O que é ${label}?`}
        className={cn(
          "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
          "text-gray-600 hover:text-fuchsia-300 hover:bg-fuchsia-500/10",
          open && "text-fuchsia-300 bg-fuchsia-500/15"
        )}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      <div
        className={cn(
          "absolute right-0 top-full mt-1.5 z-[60]",
          "w-64 rounded-xl border border-fuchsia-500/25 bg-[#0c0820] backdrop-blur-xl",
          "p-3 shadow-2xl shadow-fuchsia-900/50",
          "transition-all duration-150 origin-top-right pointer-events-none",
          "group-hover/info:opacity-100 group-hover/info:scale-100 group-hover/info:pointer-events-auto",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95"
        )}
      >
        <div className="flex items-start gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-md bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
            <Info className="w-3 h-3 text-fuchsia-300" />
          </div>
          <span className="text-xs font-bold text-fuchsia-200 leading-tight">{label}</span>
        </div>
        <p className="text-[11px] text-gray-300 leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//   Sidebar Content (compartilhado desktop + drawer mobile)
// ─────────────────────────────────────────────────────────────────
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user     = session?.user
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "A"

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Logo Academy ── */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <Link href="/academy/dashboard" onClick={onNavigate}
          className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-900/50 shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-sm leading-none block">Academy</span>
            <span className="text-[9px] text-fuchsia-300 tracking-[0.15em] uppercase leading-none block mt-0.5">
              BIA · Biofabrication
            </span>
          </div>
        </Link>
      </div>

      {/* ── Voltar para a BIA ── */}
      <div className="px-3 pt-3 pb-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          data-testid="academy-sidebar-back-to-bia"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.06] transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
          <span className="flex-1">Voltar para a BIA</span>
        </Link>
      </div>

      {/* ── Nav Academy ── */}
      <nav className="flex-1 px-2 pb-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600/80 px-3 pt-1 pb-2">
          Programa
        </p>
        {ACADEMY_NAV_ITEMS.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <div key={item.href} className="flex items-center gap-1">
              <Link
                href={item.href}
                onClick={onNavigate}
                data-testid={`academy-sidebar-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group min-w-0",
                  active
                    ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/25"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0 transition-colors",
                  active ? "text-fuchsia-300" : "text-gray-500 group-hover:text-gray-300"
                )} />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 text-fuchsia-400/50 shrink-0" />}
              </Link>
              {item.info && <InfoTooltip label={item.label} text={item.info} />}
            </div>
          )
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="px-2 pb-3 border-t border-white/[0.06] pt-2 space-y-0.5">
        {BOTTOM_ITEMS.map(item => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              data-testid={`academy-sidebar-link-${item.label.toLowerCase()}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/15"
                  : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* User row */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-all mt-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate leading-none mb-0.5">{user?.name ?? "Aluno"}</p>
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

// ─────────────────────────────────────────────────────────────────
//   Desktop sidebar
// ─────────────────────────────────────────────────────────────────
function DesktopSidebar() {
  return (
    <aside
      data-testid="academy-desktop-sidebar"
      className="hidden md:flex w-64 shrink-0 h-full border-r border-white/[0.06] bg-[#080412]/70 flex-col"
    >
      <SidebarContent />
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────
//   Mobile header + drawer
// ─────────────────────────────────────────────────────────────────
function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const allItems = [...ACADEMY_NAV_ITEMS, ...BOTTOM_ITEMS]
  const currentItem = allItems.find(item =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  ) ?? allItems[0]

  return (
    <>
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center px-3 gap-2 bg-[#080412]/95 backdrop-blur-2xl border-b border-white/[0.06]">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-300 active:scale-95 transition-all"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {currentItem?.label ?? "Academy"}
          </span>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 active:scale-95 transition-all border shrink-0 bg-white/[0.06] border-white/10 text-gray-300"
          data-testid="academy-mobile-back-to-bia"
        >
          <ArrowLeft className="w-3 h-3" />
          <span className="text-xs font-medium">BIA</span>
        </Link>
      </header>

      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

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

// ─────────────────────────────────────────────────────────────────
//   Main export
// ─────────────────────────────────────────────────────────────────
export function AcademySidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileHeader />
    </>
  )
}
