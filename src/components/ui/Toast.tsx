"use client"

import { useState, useCallback, createContext, useContext } from "react"
import { X, CheckCircle2, AlertTriangle, XCircle, Info, Zap } from "lucide-react"
import { cn } from "@/lib/utils/helpers"

type ToastType = "success" | "error" | "warning" | "info" | "credit"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (opts: Omit<Toast, "id">) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  creditSpent: (amount: number, action: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (opts: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2)
      const duration = opts.duration ?? 4000
      setToasts((prev) => [...prev.slice(-4), { ...opts, id }])
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss]
  )

  const success = useCallback(
    (title: string, message?: string) => toast({ type: "success", title, message }),
    [toast]
  )
  const error = useCallback(
    (title: string, message?: string) => toast({ type: "error", title, message, duration: 6000 }),
    [toast]
  )
  const warning = useCallback(
    (title: string, message?: string) => toast({ type: "warning", title, message }),
    [toast]
  )
  const info = useCallback(
    (title: string, message?: string) => toast({ type: "info", title, message }),
    [toast]
  )
  const creditSpent = useCallback(
    (amount: number, action: string) =>
      toast({
        type: "credit",
        title: `−${amount} créditos`,
        message: action,
        duration: 3000,
      }),
    [toast]
  )

  return (
    <ToastContext.Provider
      value={{ toasts, toast, success, error, warning, info, creditSpent, dismiss }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}

// ── Toast Container ────────────────────────
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 min-w-[280px] max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

const TOAST_STYLES: Record<ToastType, { border: string; bg: string; icon: React.ReactNode }> = {
  success: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  },
  error: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    icon: <XCircle className="w-4 h-4 text-red-400" />,
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  },
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
    icon: <Info className="w-4 h-4 text-blue-400" />,
  },
  credit: {
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
    icon: <Zap className="w-4 h-4 text-purple-400" />,
  },
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const style = TOAST_STYLES[toast.type]

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm",
        "bg-[#0d1a10]/90 animate-in slide-in-from-right-5 fade-in duration-200",
        style.border
      )}
    >
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", style.bg)}>
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-600 hover:text-gray-400 transition-colors shrink-0 mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
