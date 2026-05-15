"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Zap, Bell, HelpCircle } from "lucide-react"
import { CreditBadge } from "@/components/credits/CreditWidgets"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher"
import { useT } from "@/components/providers/LocaleProvider"
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
  const t = useT()

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between px-8 py-4",
        // Adaptativo light/dark via variáveis CSS
        "bg-background/80 backdrop-blur-xl border-b border-border",
        className
      )}
    >
      {/* Left: title */}
      <div>
        {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>

      {/* Right: credits + actions */}
      <div className="flex items-center gap-3">
        {/* Credits pill */}
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title={t("common.credits")}
        >
          <CreditBadge balance={credits} size="sm" />
          {isLow && (
            <span className="text-xs text-quantis-gold-400 animate-pulse font-medium">
              {t("common.low_balance")}
            </span>
          )}
        </Link>

        {/* Quick upgrade */}
        {credits <= 20 && (
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1.5 text-xs bg-quantis-gold-500/10 border border-quantis-gold-500/30 text-quantis-gold-400 hover:bg-quantis-gold-500/20 px-3 py-1.5 rounded-lg transition-all font-medium"
          >
            <Zap className="w-3 h-3" />
            {t("common.upgrade")}
          </Link>
        )}

        {actions}

        {/* Language switcher */}
        <LocaleSwitcher />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Help */}
        <button
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-quantis-purple-500/10 transition-all"
          title={t("common.help")}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-quantis-purple-500/10 transition-all relative"
          title={t("common.notifications")}
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
