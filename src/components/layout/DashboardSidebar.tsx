"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import {
  LayoutDashboard, GitBranch, FlaskConical, CircleDot,
  FileText, BookOpen, MessageSquare, CreditCard, Settings,
  LogOut, Zap, ChevronRight, Menu, X, Printer, Box, ClipboardCheck, BookMarked,
  Crown, Wrench, Info, Map, Atom, Library,
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
  { href: "/dashboard",                    label: "Visão Geral",          icon: LayoutDashboard, exact: true,
    info: "Painel inicial da BIA: resumo dos seus projetos, créditos e atalhos rápidos para os módulos principais. Comece sempre por aqui." },
  { href: "/dashboard/roadmap",            label: "Roteiro Profissional", icon: Map,             exact: false,
    info: "Guia passo-a-passo: do problema clínico ao tecido funcional impresso. Use este roteiro se for sua primeira vez ou se quiser seguir o caminho recomendado pela equipe Quantis." },
  { href: "/dashboard/pipeline",           label: "Pipeline",             icon: GitBranch,       exact: false,
    info: "Pipeline de Engenharia de Tecidos em 12 etapas — da definição do problema clínico até pré-clínico/clínico. Use para guiar o seu projeto do zero ao protocolo validado. Custo: 5 créditos/etapa." },
  { href: "/dashboard/biomaterials",       label: "Formulador Bio",       icon: FlaskConical,    exact: false,
    info: "Banco de 31 biomateriais (GelMA, Alginato, PCL, dECM…) e formulador IA. Insira aplicação + tecido + requisitos e a BIA recomenda formulação, concentração, crosslinker e parâmetros de impressão. Custo: 10 créditos." },
  { href: "/dashboard/formulator-pro",     label: "Formulador Pro",       icon: Atom,            exact: false,
    info: "Versão profissional: monte formulações multi-componente livremente (até 8 biomateriais — catálogo OU customizados), defina objetivo clínico (cicatrização, osso, gengiva, implante mamário…), especificações viscoelásticas e a IA gera análise científica completa: score, incompatibilidades, protocolo, ISO/ANVISA. Custo: 10 créditos." },
  { href: "/dashboard/bioprinting",        label: "Bioimpressão 3D",      icon: Printer,         exact: false,
    info: "Especialista em bioimpressão (extrusão, inkjet, DLP, FRESH, laser, coaxial). Diga sua bioink + tecido alvo e a BIA gera parâmetros otimizados (pressão, velocidade, temperatura, layer height)." },
  { href: "/dashboard/stl",                label: "Gerador STL",          icon: Box,             exact: false,
    info: "Crie modelos 3D (STL/OBJ) prontos para fatiar: scaffolds porosos, organoides, vasos, tecidos anatômicos (orelha, coração, rim, fígado, mão). Pronto para o Motor GCODE." },
  { href: "/dashboard/bioprinting/engine", label: "Motor GCODE",          icon: Zap,             exact: false,
    info: "Motor BIA v4.2: gera G-code completo a partir de STL com infills paramétricos (Voronoi 3D, Gyroid, dual-porosity macro+micro), multi-material, multi-well, conexão USB Web Serial (Marlin/Klipper) e visualizador 2D. Coração da plataforma." },
  { href: "/dashboard/organoids",          label: "Organoid Builder",     icon: CircleDot,       exact: false,
    info: "Desenhe esferoides e organoides (intestinal, hepático, neural, cardíaco, renal, pancreático, pulmonar) com protocolo QMicroNiche™ integrado e moldes não-adesivos QMatrix™." },
  { href: "/dashboard/protocols",          label: "Protocolos GLP/GMP",   icon: FileText,        exact: false,
    info: "Geração de POPs em formato ABNT NBR ISO/IEC 17025 e ANVISA RDC: cultura celular, esterilização, criopreservação, controle de qualidade. Exporta PDF assinável. Custo: 8 créditos." },
  { href: "/dashboard/protocol-total",     label: "Protocolo Total",      icon: ClipboardCheck,  exact: false,
    info: "Síntese executiva: a BIA consolida TODAS as 12 etapas do seu pipeline em UM dossiê unificado pronto para publicação ou submissão regulatória." },
  { href: "/dashboard/manual",             label: "Manual do Usuário",    icon: Library,         exact: false,
    info: "Tutoriais passo-a-passo com racional científico fácil para cada módulo: Formulador Pro, Formulador Bio, Gerador STL, Bioimpressão. Comece aqui se for sua primeira vez!" },
  { href: "/dashboard/knowledge",          label: "Base de Conhecimento", icon: BookOpen,        exact: false,
    info: "Busca científica curada: 100+ artigos, 100+ patentes e 12 casos regulatórios FDA/ANVISA/EMA. Use para fundamentar suas decisões com referências reais." },
  { href: "/dashboard/chat",               label: "Chat IA",              icon: MessageSquare,   exact: false,
    info: "Converse com a BIA em linguagem natural. Tire dúvidas técnicas, valide hipóteses, peça revisão de protocolos. Treinada em biofabricação avançada. Custo: 2 créditos/mensagem." },
  { href: "/dashboard/notebook",           label: "Notebook",             icon: BookMarked,      exact: false,
    info: "Caderno digital do pesquisador: anote experimentos, gere papers e métodos científicos com IA, mantenha rastreabilidade GLP de cada decisão." },
  { href: "/dashboard/tools",              label: "Ferramentas",          icon: Wrench,          exact: false,
    info: "Caixa de ferramentas: comparador de até 4 biomateriais lado-a-lado, calculadora de custos do projeto e exportação PDF profissional." },
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
   InfoTooltip — ícone (ⓘ) que mostra a descrição da ferramenta.
   Desktop: hover. Mobile: clique abre/fecha.
────────────────────────────────────────────────────────────────────────── */
function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false)

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    // pequeno delay pra não fechar imediatamente após o clique de abrir
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
          "text-gray-600 hover:text-violet-300 hover:bg-violet-500/10",
          open && "text-violet-300 bg-violet-500/15"
        )}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip — hover (desktop) OU click (mobile) */}
      <div
        className={cn(
          "absolute right-0 top-full mt-1.5 z-[60]",
          "w-64 rounded-xl border border-violet-500/25 bg-[#0c0820] backdrop-blur-xl",
          "p-3 shadow-2xl shadow-violet-900/50",
          "transition-all duration-150 origin-top-right pointer-events-none",
          // desktop hover OR mobile open
          "group-hover/info:opacity-100 group-hover/info:scale-100 group-hover/info:pointer-events-auto",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95"
        )}
      >
        <div className="flex items-start gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Info className="w-3 h-3 text-violet-300" />
          </div>
          <span className="text-xs font-bold text-violet-200 leading-tight">{label}</span>
        </div>
        <p className="text-[11px] text-gray-300 leading-relaxed">{text}</p>
      </div>
    </div>
  )
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
            <div key={item.href} className="flex items-center gap-1">
              <Link href={item.href} onClick={onNavigate}
                className={cn(
                  "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group min-w-0",
                  active
                    ? "bg-violet-500/12 text-violet-300 border border-violet-500/20"
                    : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
                )}>
                <item.icon className={cn("w-4 h-4 shrink-0 transition-colors",
                  active ? "text-violet-400" : "text-gray-500 group-hover:text-gray-300")} />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 text-violet-400/50 shrink-0" />}
              </Link>
              {item.info && (
                <InfoTooltip label={item.label} text={item.info} />
              )}
            </div>
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
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center px-3 gap-2 bg-[#080412]/95 backdrop-blur-2xl border-b border-white/[0.06]">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-300 active:scale-95 transition-all"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shrink-0">
            <BiaLogoIcon size={15} />
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {currentItem?.label ?? "BIA"}
          </span>
        </div>

        <Link href="/dashboard/billing"
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 active:scale-95 transition-all border shrink-0",
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
