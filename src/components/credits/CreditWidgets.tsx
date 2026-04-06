"use client"

import { Zap, TrendingDown, AlertTriangle, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils/helpers"

// ──────────────────────────────────────────
// CreditBadge — exibe saldo em linha
// ──────────────────────────────────────────
interface CreditBadgeProps {
  balance: number
  className?: string
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

export function CreditBadge({
  balance,
  className,
  size = "md",
  showIcon = true,
}: CreditBadgeProps) {
  const isLow = balance <= 20
  const isCritical = balance <= 5

  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-3 py-1 gap-1.5",
    lg: "text-sm px-4 py-1.5 gap-2",
  }

  const iconSizes = { sm: "w-2.5 h-2.5", md: "w-3.5 h-3.5", lg: "w-4 h-4" }

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full border transition-colors",
        isCritical
          ? "bg-red-500/10 border-red-500/30 text-red-400"
          : isLow
          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        sizes[size],
        className
      )}
    >
      {showIcon && <Zap className={iconSizes[size]} />}
      {balance.toLocaleString("pt-BR")} créditos
    </span>
  )
}

// ──────────────────────────────────────────
// CreditCost — mostra custo de uma ação
// ──────────────────────────────────────────
interface CreditCostProps {
  cost: number
  label?: string
  className?: string
}

export function CreditCost({ cost, label, className }: CreditCostProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs text-gray-500",
        className
      )}
    >
      <Zap className="w-3 h-3 text-emerald-500" />
      <span className="text-emerald-400 font-semibold">{cost}</span>
      {label && <span>{label}</span>}
    </span>
  )
}

// ──────────────────────────────────────────
// LowCreditsAlert — banner de alerta
// ──────────────────────────────────────────
interface LowCreditsAlertProps {
  balance: number
  threshold?: number
  className?: string
}

export function LowCreditsAlert({
  balance,
  threshold = 50,
  className,
}: LowCreditsAlertProps) {
  if (balance > threshold) return null

  const isCritical = balance <= 5

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border px-4 py-3",
        isCritical
          ? "bg-red-500/5 border-red-500/20"
          : "bg-amber-500/5 border-amber-500/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle
          className={cn(
            "w-4 h-4 shrink-0",
            isCritical ? "text-red-400" : "text-amber-400"
          )}
        />
        <p className={cn("text-sm", isCritical ? "text-red-300" : "text-amber-300")}>
          {isCritical
            ? `Apenas ${balance} créditos restantes! Ações de IA serão bloqueadas.`
            : `Saldo baixo: ${balance} créditos. Considere fazer upgrade.`}
        </p>
      </div>
      <Link
        href="/dashboard/billing"
        className={cn(
          "flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-colors shrink-0",
          isCritical
            ? "text-red-400 hover:text-red-300"
            : "text-amber-400 hover:text-amber-300"
        )}
      >
        Fazer upgrade <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

// ──────────────────────────────────────────
// InsufficientCreditsModal — popup
// ──────────────────────────────────────────
interface InsufficientCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  required: number
  balance: number
  action?: string
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  required,
  balance,
  action,
}: InsufficientCreditsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-[#0a1a10] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Créditos Insuficientes</h3>
            <p className="text-sm text-gray-400">
              {action ?? "Esta ação"} requer mais créditos
            </p>
          </div>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-5 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Seu saldo</span>
            <CreditBadge balance={balance} size="sm" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Custo da ação</span>
            <CreditCost cost={required} />
          </div>
          <div className="h-px bg-white/8" />
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-gray-300">Faltam</span>
            <span className="text-red-400">{(required - balance).toLocaleString("pt-BR")} créditos</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all"
          >
            Cancelar
          </button>
          <Link
            href="/dashboard/billing"
            className="flex-1 bia-button-primary flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm"
            onClick={onClose}
          >
            <Zap className="w-4 h-4" />
            Fazer Upgrade
          </Link>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// CreditProgressBar — barra de consumo
// ──────────────────────────────────────────
interface CreditProgressBarProps {
  balance: number
  maxCredits: number
  className?: string
  showLabels?: boolean
}

export function CreditProgressBar({
  balance,
  maxCredits,
  className,
  showLabels = true,
}: CreditProgressBarProps) {
  const pct = Math.min((balance / maxCredits) * 100, 100)
  const isLow = pct <= 20
  const isCritical = pct <= 5

  return (
    <div className={className}>
      {showLabels && (
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="text-gray-500">Créditos disponíveis</span>
          <span className={cn(
            "font-semibold",
            isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-emerald-400"
          )}>
            {balance.toLocaleString("pt-BR")} / {maxCredits.toLocaleString("pt-BR")}
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isCritical
              ? "bg-red-500"
              : isLow
              ? "bg-amber-500"
              : "bg-gradient-to-r from-emerald-500 to-teal-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabels && (
        <p className="text-[10px] text-gray-600 mt-1">
          {pct.toFixed(0)}% do plano utilizado
        </p>
      )}
    </div>
  )
}
