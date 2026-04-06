"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import {
  Zap, Star, CheckCircle2, Clock, TrendingDown, TrendingUp,
  CreditCard, RefreshCw, ArrowUpRight, Calendar, Crown
} from "lucide-react"
import { CreditProgressBar, CreditBadge } from "@/components/credits/CreditWidgets"
import { useToast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils/helpers"

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    credits: 50,
    color: "gray",
    features: ["50 créditos/mês", "Pipeline básico", "Chat IA (limitado)", "1 projeto ativo"],
  },
  {
    id: "DISCOVERY",
    name: "Discovery",
    price: 270,
    credits: 500,
    color: "emerald",
    features: ["500 créditos/mês", "Pipeline de 12 etapas", "Formulador básico", "Chat IA", "5 projetos ativos"],
  },
  {
    id: "ADVANCED",
    name: "Advanced",
    price: 490,
    credits: 1500,
    color: "blue",
    popular: true,
    features: ["1.500 créditos/mês", "Todos os módulos", "Formulador avançado", "Organoid Builder", "Protocolos ilimitados", "20 projetos"],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 990,
    credits: 5000,
    color: "purple",
    features: ["5.000 créditos/mês", "Tudo do Advanced", "807+ formulações", "RAG avançado", "API access", "Projetos ilimitados"],
  },
  {
    id: "ACADEMY",
    name: "Academy",
    price: 4970,
    credits: 20000,
    color: "amber",
    features: ["20.000 créditos/mês", "Tudo do Enterprise", "Treinamento dedicado", "Personalização de IA", "SLA 99.9%", "Gerente dedicado"],
  },
]

const PLAN_COLORS: Record<string, string> = {
  gray: "border-gray-500/30 bg-gray-500/5",
  emerald: "border-emerald-500/30 bg-emerald-500/5",
  blue: "border-blue-500/30 bg-blue-500/5",
  purple: "border-purple-500/30 bg-purple-500/5",
  amber: "border-amber-500/30 bg-amber-500/5",
}

const PLAN_TEXT: Record<string, string> = {
  gray: "text-gray-400", emerald: "text-emerald-400",
  blue: "text-blue-400", purple: "text-purple-400", amber: "text-amber-400",
}

const PLAN_CREDITS_MAX: Record<string, number> = {
  FREE: 50, DISCOVERY: 500, ADVANCED: 1500, ENTERPRISE: 5000, ACADEMY: 20000,
}

interface BillingClientProps {
  currentPlan: string
  balance: number
  totalEarned: number
  totalSpent: number
  history: { id: string; type: string; amount: number; balance: number; description: string; createdAt: string }[]
  periodEnd?: string
}

export function BillingClient({
  currentPlan,
  balance,
  totalEarned,
  totalSpent,
  history,
  periodEnd,
}: BillingClientProps) {
  const { update } = useSession()
  const { success, error: toastError, info } = useToast()
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"plans" | "history">("plans")

  const maxCredits = PLAN_CREDITS_MAX[currentPlan] ?? 50

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) {
      info("Plano atual", "Você já está neste plano.")
      return
    }

    setUpgrading(planId)
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()

      if (!res.ok) {
        toastError("Erro ao atualizar plano", data.error)
        return
      }

      await update({ plan: planId })
      success(`Plano ${planId} ativado!`, "Seus créditos foram atualizados.")
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      toastError("Erro de conexão", "Tente novamente.")
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Assinatura & Créditos</h1>
        <p className="text-gray-400 text-sm">Gerencie seu plano e acompanhe o uso de créditos</p>
      </div>

      {/* Current Plan Card */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Plan info */}
        <div className="md:col-span-1 bg-white/2 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plano Atual</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{currentPlan}</div>
          {periodEnd && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
              <Calendar className="w-3 h-3" />
              <span>Renova em {new Date(periodEnd).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
          <CreditBadge balance={balance} size="md" className="mb-3" />
          <CreditProgressBar balance={balance} maxCredits={maxCredits} showLabels />
        </div>

        {/* Stats */}
        <div className="md:col-span-2 grid grid-cols-3 gap-3">
          {[
            { label: "Saldo atual", value: balance.toLocaleString("pt-BR"), icon: Zap, color: "emerald", sub: "créditos" },
            { label: "Total ganho", value: totalEarned.toLocaleString("pt-BR"), icon: TrendingUp, color: "blue", sub: "créditos" },
            { label: "Total gasto", value: totalSpent.toLocaleString("pt-BR"), icon: TrendingDown, color: "purple", sub: "créditos" },
          ].map((s) => (
            <div key={s.label} className="bg-white/2 border border-white/8 rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-xl bg-${s.color}-500/10 border border-${s.color}-500/20 flex items-center justify-center mb-3`}>
                <s.icon className={`w-4 h-4 text-${s.color}-400`} />
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/8 pb-0">
        {(["plans", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === tab
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            {tab === "plans" ? "Planos disponíveis" : "Histórico de créditos"}
          </button>
        ))}
      </div>

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan
            const isUpgrading = upgrading === plan.id
            const planColor = plan.color
            const isDowngrade =
              PLANS.findIndex((p) => p.id === plan.id) <
              PLANS.findIndex((p) => p.id === currentPlan)

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border p-5 flex flex-col transition-all",
                  isCurrent
                    ? `${PLAN_COLORS[planColor]} ring-1 ring-offset-0`
                    : plan.popular
                    ? "border-blue-500/40 bg-blue-500/3"
                    : "border-white/8 bg-white/2 hover:border-white/15"
                )}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> ATUAL
                  </div>
                )}

                <div className="mb-4">
                  <div className={cn("flex items-center gap-1.5 mb-1", PLAN_TEXT[planColor])}>
                    <Star className="w-3.5 h-3.5" />
                    <span className="text-sm font-bold">{plan.name}</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {plan.price === 0 ? "Grátis" : `R$ ${plan.price.toLocaleString("pt-BR")}`}
                    {plan.price > 0 && <span className="text-xs text-gray-500 font-normal">/mês</span>}
                  </div>
                  <div className={cn("text-xs mt-1 font-medium", PLAN_TEXT[planColor])}>
                    <Zap className="w-3 h-3 inline mr-0.5" />
                    {plan.credits.toLocaleString("pt-BR")} créditos/mês
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-400">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || isUpgrading || isDowngrade}
                  className={cn(
                    "w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                    isCurrent
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default"
                      : isDowngrade
                      ? "bg-white/3 border border-white/8 text-gray-600 cursor-not-allowed"
                      : isUpgrading
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-wait"
                      : "bia-button-primary hover:scale-105"
                  )}
                >
                  {isUpgrading ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> Ativando...</>
                  ) : isCurrent ? (
                    <><CheckCircle2 className="w-3 h-3" /> Plano atual</>
                  ) : isDowngrade ? (
                    "Downgrade"
                  ) : (
                    <><ArrowUpRight className="w-3 h-3" /> Ativar</>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
          {history.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhuma transação encontrada</p>
              <p className="text-xs text-gray-600 mt-1">Use os módulos de IA para ver o histórico</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-2">Descrição</div>
                <div className="text-right">Valor</div>
                <div className="text-right">Saldo</div>
              </div>
              {history.map((txn) => (
                <div key={txn.id} className="grid grid-cols-4 gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors items-center">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      txn.type === "CREDIT"
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    )}>
                      {txn.type === "CREDIT"
                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm text-gray-200 truncate max-w-[180px]">{txn.description}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(txn.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-right text-sm font-bold",
                    txn.type === "CREDIT" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {txn.type === "CREDIT" ? "+" : ""}{txn.amount.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    {txn.balance.toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note about payments */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4">
        <p className="text-sm text-blue-300 font-medium mb-1">💡 Modo demonstração</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          O sistema de pagamento está em modo demo. Ao clicar em &quot;Ativar&quot; um plano será ativado
          imediatamente sem cobrança. Em produção, será integrado ao Stripe para pagamentos reais.
        </p>
      </div>
    </div>
  )
}
