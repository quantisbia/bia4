"use client"

/**
 * FloatingThemeLocale — controles flutuantes de tema + idioma
 *
 * Para uso em páginas que NÃO têm DashboardSidebar/Header:
 * - Landing page (/)
 * - Auth (login/register/error)
 * - Not-found, terms, privacy
 *
 * Posicionado fixed no canto superior direito com z-index alto.
 */

import { ThemeToggle } from "./ThemeToggle"
import { LocaleSwitcher } from "./LocaleSwitcher"
import { cn } from "@/lib/utils/helpers"

interface FloatingThemeLocaleProps {
  /** Posição do container. Default: top-right */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left"
  className?: string
}

const POSITION_CLASSES: Record<NonNullable<FloatingThemeLocaleProps["position"]>, string> = {
  "top-right": "top-3 right-3 sm:top-4 sm:right-4",
  "top-left": "top-3 left-3 sm:top-4 sm:left-4",
  "bottom-right": "bottom-3 right-3 sm:bottom-4 sm:right-4",
  "bottom-left": "bottom-3 left-3 sm:bottom-4 sm:left-4",
}

export function FloatingThemeLocale({
  position = "top-right",
  className,
}: FloatingThemeLocaleProps) {
  return (
    <div
      className={cn(
        "fixed z-[60] flex items-center gap-2",
        "rounded-xl border border-border bg-background/70 p-1.5 backdrop-blur-xl",
        "shadow-lg shadow-black/30",
        POSITION_CLASSES[position],
        className
      )}
    >
      <LocaleSwitcher />
      <ThemeToggle />
    </div>
  )
}
