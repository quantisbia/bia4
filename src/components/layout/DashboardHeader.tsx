"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Zap, Bell, HelpCircle } from "lucide-react"
import { CreditBadge } from "@/components/credits/CreditWidgets"
import { cn } from "@/lib/utils/helpers"

interface DashboardHeaderProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function DashboardHeader({
  title,
  description,
  actions,
  className,
}: DashboardHeaderProps) {
  const { data: session } = useSession()
  const credits = (session?.user?.credits as number) ?? 0
  const isLow = credits <= 50

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between px-8 py-4",
        "bg-[#030a04]/80 backdrop-blur-xl border-b border-white/5",
        className
      )}
    >
      {/* Left: title */}
      <div>
        {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>

      {/* Right: credits + actions */}
      <div className="flex items-center gap-3">
        {/* Credits pill */}
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Ver detalhes de créditos"
        >
          <CreditBadge balance={credits} size="sm" />
          {isLow && (
            <span className="text-xs text-amber-400 animate-pulse font-medium">
              Saldo baixo!
            </span>
          )}
        </Link>

        {/* Quick upgrade */}
        {credits <= 20 && (
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 px-3 py-1.5 rounded-lg transition-all font-medium"
          >
            <Zap className="w-3 h-3" />
            Upgrade
          </Link>
        )}

        {actions}

        {/* Help */}
        <button
          className="w-8 h-8 rounded-lg border border-white/8 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
          title="Ajuda"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          className="w-8 h-8 rounded-lg border border-white/8 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all relative"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
