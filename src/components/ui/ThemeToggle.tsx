"use client"

/**
 * ThemeToggle — botão segmentado light / dark / system
 *
 * Versão compacta (icon-only) para uso em headers.
 * Estilizado com paleta Quantis.
 */

import { Sun, Moon, Monitor } from "lucide-react"
import { useTheme, type Theme } from "@/components/providers/ThemeProvider"
import { useT } from "@/components/providers/LocaleProvider"
import { cn } from "@/lib/utils/helpers"

interface ThemeToggleProps {
  className?: string
  /** "compact" = só ícones; "labeled" = ícones + texto */
  variant?: "compact" | "labeled"
}

const OPTIONS: { value: Theme; icon: React.ComponentType<{ className?: string }>; key: "common.light" | "common.dark" | "common.system" }[] = [
  { value: "light", icon: Sun, key: "common.light" },
  { value: "dark", icon: Moon, key: "common.dark" },
  { value: "system", icon: Monitor, key: "common.system" },
]

export function ThemeToggle({ className, variant = "compact" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const t = useT()

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-card/50 p-0.5",
        "backdrop-blur",
        className
      )}
      role="radiogroup"
      aria-label={t("common.theme")}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = theme === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.value)}
            title={t(opt.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              active
                ? "bg-gradient-to-br from-quantis-purple-600 to-quantis-lilac-500 text-white shadow-sm shadow-quantis-purple-500/30"
                : "text-muted-foreground hover:bg-quantis-purple-500/10 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {variant === "labeled" && <span>{t(opt.key)}</span>}
          </button>
        )
      })}
    </div>
  )
}
