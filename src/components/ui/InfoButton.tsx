"use client"

/**
 * InfoButton — botão (i) com popover de informação detalhada (R12.3)
 *
 * UX: parâmetros com nome curto + ícone (i) → clique abre popup com explicação.
 * Mantém a UI limpa, mas a informação acessível sob demanda.
 */

import { useState, useRef, useEffect } from "react"
import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface InfoButtonProps {
  title?: string
  children: React.ReactNode
  className?: string
  size?: "sm" | "md"
  /** posicionamento do popover relativo ao botão */
  align?: "left" | "right" | "center"
}

export function InfoButton({
  title,
  children,
  className,
  size = "sm",
  align = "right",
}: InfoButtonProps) {
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
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", escHandler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", escHandler)
    }
  }, [open])

  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5"
  const iconClass = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"

  return (
    <span ref={ref} className={cn("inline-flex relative", className)}>
      <button
        type="button"
        aria-label="Mais informações"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={cn(
          sizeClass,
          "inline-flex items-center justify-center rounded-full border transition-all shrink-0",
          open
            ? "border-violet-400/60 bg-violet-500/25 text-violet-200"
            : "border-white/15 bg-white/[0.04] text-gray-400 hover:border-violet-400/40 hover:text-violet-300 hover:bg-violet-500/10"
        )}
      >
        <Info className={iconClass} />
      </button>

      {open && (
        <div
          role="dialog"
          className={cn(
            "absolute z-50 top-full mt-2 min-w-[260px] max-w-[340px] rounded-xl",
            "border border-violet-500/30 bg-quantis-ink-900/98 backdrop-blur-xl",
            "shadow-2xl shadow-violet-900/40 p-3.5",
            align === "right" && "right-0",
            align === "left" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-xs font-semibold text-violet-100 leading-tight">{title}</h4>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-gray-400 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="text-[11px] text-gray-200 leading-relaxed space-y-1.5">
            {children}
          </div>
        </div>
      )}
    </span>
  )
}
