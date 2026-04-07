"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, GitBranch, MessageSquare, FlaskConical,
  BookOpen, FileText, MoreHorizontal
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils/helpers"

const PRIMARY_TABS = [
  { href: "/dashboard",              label: "Home",     icon: LayoutDashboard, exact: true },
  { href: "/dashboard/pipeline",     label: "Pipeline", icon: GitBranch },
  { href: "/dashboard/chat",         label: "Chat IA",  icon: MessageSquare },
  { href: "/dashboard/biomaterials", label: "Bio",      icon: FlaskConical },
  { href: "/dashboard/knowledge",    label: "Artigos",  icon: BookOpen },
]

const MORE_TABS = [
  { href: "/dashboard/organoids",  label: "Organoides",  icon: FlaskConical },
  { href: "/dashboard/protocols",  label: "Protocolos",  icon: FileText },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    if (href === "/dashboard") return false
    return pathname.startsWith(href)
  }

  const isMoreActive = MORE_TABS.some(t => pathname.startsWith(t.href))

  return (
    <>
      {/* More popup */}
      {showMore && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setShowMore(false)}
          />
          <div className="md:hidden fixed bottom-[68px] right-3 z-50 bg-[#0d0720] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-48">
            {MORE_TABS.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors",
                  pathname.startsWith(tab.href)
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-[68px] bg-[#080412]/95 backdrop-blur-2xl border-t border-white/[0.07] safe-bottom">
        <div className="flex h-full items-center justify-around px-1">
          {PRIMARY_TABS.map(tab => {
            const active = isActive(tab.href, tab.exact)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 min-w-[52px]",
                  active
                    ? "text-violet-400"
                    : "text-gray-600 hover:text-gray-400"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                  active ? "bg-violet-500/15" : ""
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

          {/* More button */}
          <button
            onClick={() => setShowMore(s => !s)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 min-w-[52px]",
              isMoreActive || showMore ? "text-violet-400" : "text-gray-600"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
              isMoreActive || showMore ? "bg-violet-500/15" : ""
            )}>
              <MoreHorizontal className={cn("w-[18px] h-[18px]", isMoreActive || showMore ? "text-violet-400" : "text-gray-500")} />
            </div>
            <span className={cn(
              "text-[9px] font-semibold tracking-tight leading-none",
              isMoreActive || showMore ? "text-violet-400" : "text-gray-600"
            )}>
              Mais
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
