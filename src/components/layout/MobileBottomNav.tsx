"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, GitBranch, MessageSquare, FlaskConical,
  BookOpen, FileText, MoreHorizontal, Printer, CircleDot, Microscope, Box,
  X, CreditCard, ClipboardCheck, BookMarked
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils/helpers"

const PRIMARY_TABS = [
  { href: "/dashboard",              label: "Home",      icon: LayoutDashboard, exact: true },
  { href: "/dashboard/pipeline",     label: "Pipeline",  icon: GitBranch },
  { href: "/dashboard/chat",         label: "Chat IA",   icon: MessageSquare },
  { href: "/dashboard/biomaterials", label: "Bio",       icon: FlaskConical },
]

const MORE_TABS = [
  { href: "/dashboard/bioprinting",    label: "Bioimpressão",       icon: Printer },
  { href: "/dashboard/organoids",      label: "Organoides",         icon: CircleDot },
  { href: "/dashboard/protocols",      label: "Protocolos",         icon: FileText },
  { href: "/dashboard/analyses",       label: "Análises",           icon: Microscope },
  { href: "/dashboard/knowledge",      label: "Base de Conhecimento", icon: BookOpen },
  { href: "/dashboard/stl",            label: "Gerador STL/OBJ",    icon: Box },
  { href: "/dashboard/protocol-total", label: "Protocolo Total",    icon: ClipboardCheck },
  { href: "/dashboard/notebook",       label: "Notebook",           icon: BookMarked },
  { href: "/dashboard/billing",        label: "Assinatura",         icon: CreditCard },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    if (href === "/dashboard") return false
    return pathname.startsWith(href)
  }

  const isMoreActive = MORE_TABS.some(t => pathname.startsWith(t.href))

  // Close on route change
  useEffect(() => { setShowMore(false) }, [pathname])

  // Close on outside click
  useEffect(() => {
    if (!showMore) return
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showMore])

  return (
    <>
      {/* More popup — sheet style from bottom */}
      {showMore && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMore(false)}
          />
          <div ref={moreRef}
            className="md:hidden fixed bottom-[68px] inset-x-0 z-50 mx-3 mb-2 bg-[#0d0720] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mais Módulos</span>
              <button onClick={() => setShowMore(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-500 active:scale-95">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grid of modules */}
            <div className="grid grid-cols-3 gap-0.5 p-2">
              {MORE_TABS.map(tab => {
                const active = pathname.startsWith(tab.href)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95",
                      active
                        ? "bg-violet-500/15 text-violet-300"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      active ? "bg-violet-500/20 border border-violet-500/25" : "bg-white/[0.04] border border-white/[0.08]"
                    )}>
                      <tab.icon className={cn("w-[18px] h-[18px]", active ? "text-violet-400" : "text-gray-500")} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium leading-tight text-center",
                      active ? "text-violet-300" : "text-gray-500"
                    )}>
                      {tab.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav bar — glassmorphism */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 safe-area-bottom">
        <div className="h-[68px] bg-[#080412]/95 backdrop-blur-2xl border-t border-white/[0.07]">
          <div className="flex h-full items-center justify-around px-2">
            {PRIMARY_TABS.map(tab => {
              const active = isActive(tab.href, tab.exact)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 min-w-[56px]",
                    active
                      ? "text-violet-400"
                      : "text-gray-600 hover:text-gray-400"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                    active ? "bg-violet-500/15 shadow-sm shadow-violet-500/20" : ""
                  )}>
                    <tab.icon className={cn("w-[18px] h-[18px]", active ? "text-violet-400" : "text-gray-500")} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-semibold tracking-tight leading-none",
                    active ? "text-violet-400" : "text-gray-600"
                  )}>
                    {tab.label}
                  </span>
                </Link>
              )
            })}

            {/* More button with pulse when active child */}
            <button
              onClick={() => setShowMore(s => !s)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 min-w-[56px]",
                isMoreActive || showMore ? "text-violet-400" : "text-gray-600"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all relative",
                isMoreActive || showMore ? "bg-violet-500/15 shadow-sm shadow-violet-500/20" : ""
              )}>
                <MoreHorizontal className={cn("w-[18px] h-[18px]", isMoreActive || showMore ? "text-violet-400" : "text-gray-500")} />
                {isMoreActive && !showMore && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-semibold tracking-tight leading-none",
                isMoreActive || showMore ? "text-violet-400" : "text-gray-600"
              )}>
                Mais
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
