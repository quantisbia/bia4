"use client"

/**
 * LocaleSwitcher — dropdown para trocar idioma (pt/en/es)
 *
 * Compact: botão com flag + código (PT/EN/ES) que abre menu
 */

import { useState, useRef, useEffect } from "react"
import { Globe, Check } from "lucide-react"
import { useLocale } from "@/components/providers/LocaleProvider"
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils/helpers"

interface LocaleSwitcherProps {
  className?: string
  /** "compact" = só código; "labeled" = código + nome */
  variant?: "compact" | "labeled"
}

export function LocaleSwitcher({ className, variant = "compact" }: LocaleSwitcherProps) {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleSelect = (next: Locale) => {
    setLocale(next)
    setOpen(false)
  }

  const current = LOCALE_LABELS[locale]

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("common.language")}
        title={t("common.language")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1.5",
          "text-xs font-medium text-foreground backdrop-blur transition-all",
          "hover:border-quantis-purple-400/50 hover:bg-quantis-purple-500/10"
        )}
      >
        <Globe className="h-3.5 w-3.5 text-quantis-lilac-400" />
        <span className="uppercase tracking-wider">{locale}</span>
        {variant === "labeled" && (
          <span className="hidden sm:inline text-muted-foreground">{current.nativeName}</span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden",
            "rounded-lg border border-border bg-popover shadow-lg shadow-black/20",
            "backdrop-blur-xl"
          )}
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            {t("common.language")}
          </div>
          {LOCALES.map((loc) => {
            const info = LOCALE_LABELS[loc]
            const active = loc === locale
            return (
              <button
                key={loc}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleSelect(loc)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-quantis-purple-500/15 text-foreground"
                    : "text-foreground/85 hover:bg-quantis-purple-500/10"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{info.flag}</span>
                  <span className="font-medium">{info.nativeName}</span>
                  <span className="text-xs uppercase text-muted-foreground">{loc}</span>
                </span>
                {active && <Check className="h-4 w-4 text-quantis-lilac-400" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
