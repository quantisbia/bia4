"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Zap, Star, CheckCircle2, Clock, TrendingDown, TrendingUp,
  CreditCard, RefreshCw, ExternalLink, Calendar, Crown,
  ChevronDown, ChevronUp, CircleDot, Layers, FlaskConical,
  Brain, Microscope, Dna, Package, Gift, Percent, ArrowRight,
  ShieldCheck, Tag, Timer, Info,
} from "lucide-react"
import { CreditProgressBar, CreditBadge } from "@/components/credits/CreditWidgets"
import { useToast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils/helpers"

/* ─────────────────────────────────────────────────────────────────────────
   PLANOS  (sem FREE — 10 créditos ficam no Discovery)
───────────────────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "ORGANOID_LAB",
    name: "Organoid Lab",
    price: 150,
    annualPrice: 120,       // 20% desconto
    credits: 300,
    color: "teal",
    badge: "ESPECIALISTA",
    paymentUrl: "https://www.asaas.com/c/24p0skdjkpacozta",
    annualPaymentUrl: "https://www.asaas.com/c/24p0skdjkpacozta",
    features: [
      "300 créditos/mês",
      "Organoid Builder completo",
      "Protocolo QMicroNiche™ integrado",
      "7 tipos de organoides por IA",
      "QMatrix™ + moldes não-adesivos",
      "Chat IA BIA (contexto organoides)",
    ],
  },
  {
    id: "DISCOVERY",
    name: "BIA Discovery",
    price: 270,
    annualPrice: 216,
    credits: 500,
    color: "violet",
    badge: null,
    paymentUrl: "https://www.asaas.com/c/rneusgbvs6mvm2kg",
    annualPaymentUrl: "https://www.asaas.com/c/rneusgbvs6mvm2kg",
    features: [
      "500 créditos/mês",
      "10 créditos iniciais grátis",
      "Pipeline de 12 etapas",
      "Formulador básico",
      "Chat IA",
      "5 projetos ativos",
    ],
  },
  {
    id: "ADVANCED",
    name: "BIA Advanced",
    price: 490,
    annualPrice: 392,
    credits: 1500,
    color: "blue",
    badge: "POPULAR",
    paymentUrl: "https://www.asaas.com/c/qsnp08rvpuwlj8ip",
    annualPaymentUrl: "https://www.asaas.com/c/qsnp08rvpuwlj8ip",
    features: [
      "1.500 créditos/mês",
      "Todos os módulos",
      "Formulador avançado",
      "Organoid Builder",
      "Protocolos ilimitados",
      "20 projetos ativos",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "BIA Enterprise / Global Pharma",
    name_short: "Enterprise",
    price: 990,
    annualPrice: 792,
    credits: 5000,
    color: "purple",
    badge: null,
    paymentUrl: "https://www.asaas.com/c/j983il0upnkiab2w",
    annualPaymentUrl: "https://www.asaas.com/c/j983il0upnkiab2w",
    features: [
      "5.000 créditos/mês",
      "Tudo do Advanced",
      "807+ formulações validadas",
      "RAG científico avançado",
      "Acesso à API",
      "Projetos ilimitados",
    ],
  },
  {
    id: "ACADEMY",
    name: "BIA Academy",
    price: 4970,
    annualPrice: 3976,
    credits: 20000,
    color: "amber",
    badge: "PREMIUM",
    paymentUrl: "https://www.asaas.com/c/9nvzkrlezi7ht2u5",
    annualPaymentUrl: "https://www.asaas.com/c/9nvzkrlezi7ht2u5",
    features: [
      "20.000 créditos/mês",
      "Tudo do Enterprise",
      "Treinamento dedicado",
      "Personalização de IA",
      "SLA 99,9% garantido",
      "Gerente de conta exclusivo",
    ],
  },
]

/* ─────────────────────────────────────────────────────────────────────────
   PACOTES DE CRÉDITOS AVULSOS
───────────────────────────────────────────────────────────────────────── */
const CREDIT_PACKS = [
  {
    id: "pack_50",
    name: "Starter",
    credits: 50,
    price: 29,
    pricePerCredit: 0.58,
    color: "gray",
    icon: Package,
    popular: false,
    bonus: null,
    paymentUrl: "https://www.asaas.com/c/24p0skdjkpacozta",
  },
  {
    id: "pack_150",
    name: "Researcher",
    credits: 150,
    price: 79,
    pricePerCredit: 0.53,
    color: "violet",
    icon: FlaskConical,
    popular: false,
    bonus: "+10 bônus",
    paymentUrl: "https://www.asaas.com/c/24p0skdjkpacozta",
  },
  {
    id: "pack_500",
    name: "Lab Pro",
    credits: 500,
    price: 229,
    pricePerCredit: 0.46,
    color: "blue",
    icon: Microscope,
    popular: true,
    bonus: "+50 bônus",
    paymentUrl: "https://www.asaas.com/c/24p0skdjkpacozta",
  },
  {
    id: "pack_1500",
    name: "Institute",
    credits: 1500,
    price: 599,
    pricePerCredit: 0.40,
    color: "purple",
    icon: Brain,
    popular: false,
    bonus: "+200 bônus",
    paymentUrl: "https://www.asaas.com/c/24p0skdjkpacozta",
  },
  {
    id: "pack_5000",
    name: "Enterprise",
    credits: 5000,
    price: 1799,
    pricePerCredit: 0.36,
    color: "amber",
    icon: Crown,
    popular: false,
    bonus: "+750 bônus",
    paymentUrl: "https://www.asaas.com/c/24p0skdjkpacozta",
  },
]

/* ─────────────────────────────────────────────────────────────────────────
   Estilos por cor
───────────────────────────────────────────────────────────────────────── */
const COLOR: Record<string, { border: string; bg: string; ring: string; text: string; badgeBg: string; btn: string; glow: string }> = {
  teal: {
    border:   "border-teal-500/25",
    bg:       "bg-teal-500/5",
    ring:     "ring-teal-500/30",
    text:     "text-teal-400",
    badgeBg:  "bg-teal-600",
    btn:      "bg-teal-600 hover:bg-teal-500 shadow-teal-900/40",
    glow:     "shadow-teal-500/20",
  },
  violet: {
    border:   "border-violet-500/25",
    bg:       "bg-violet-500/5",
    ring:     "ring-violet-500/30",
    text:     "text-violet-400",
    badgeBg:  "bg-violet-500",
    btn:      "bg-violet-600 hover:bg-violet-500 shadow-violet-900/40",
    glow:     "shadow-violet-500/20",
  },
  blue: {
    border:   "border-blue-500/25",
    bg:       "bg-blue-500/5",
    ring:     "ring-blue-500/30",
    text:     "text-blue-400",
    badgeBg:  "bg-blue-500",
    btn:      "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40",
    glow:     "shadow-blue-500/20",
  },
  purple: {
    border:   "border-purple-500/25",
    bg:       "bg-purple-500/5",
    ring:     "ring-purple-500/30",
    text:     "text-purple-400",
    badgeBg:  "bg-purple-600",
    btn:      "bg-purple-600 hover:bg-purple-500 shadow-purple-900/40",
    glow:     "shadow-purple-500/20",
  },
  amber: {
    border:   "border-amber-500/25",
    bg:       "bg-amber-500/5",
    ring:     "ring-amber-500/30",
    text:     "text-amber-400",
    badgeBg:  "bg-amber-500",
    btn:      "bg-amber-600 hover:bg-amber-500 shadow-amber-900/40",
    glow:     "shadow-amber-500/20",
  },
  gray: {
    border:   "border-gray-500/25",
    bg:       "bg-gray-500/5",
    ring:     "ring-gray-500/30",
    text:     "text-gray-400",
    badgeBg:  "bg-gray-600",
    btn:      "bg-gray-600 hover:bg-gray-500 shadow-gray-900/40",
    glow:     "shadow-gray-500/20",
  },
}

const PLAN_CREDITS_MAX: Record<string, number> = {
  FREE: 30, ORGANOID_LAB: 300, DISCOVERY: 500, ADVANCED: 1500, ENTERPRISE: 5000, ACADEMY: 20000,
}

/* ─────────────────────────────────────────────────────────────────────────
   Annual Savings Calculator
───────────────────────────────────────────────────────────────────────── */
function AnnualSavingsBanner({ billingCycle }: { billingCycle: "monthly" | "annual" }) {
  if (billingCycle !== "annual") return null

  return (
    <div className="flex items-center gap-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl px-4 py-3 mb-4 animate-fadeIn">
      <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
        <Percent className="w-4 h-4 text-emerald-400" />
      </div>
      <div>
        <p className="text-sm text-emerald-300 font-semibold">Economize 20% com plano anual</p>
        <p className="text-[11px] text-gray-400">Pague 10 meses e ganhe 12. Cancele quando quiser.</p>
      </div>
      <Tag className="w-5 h-5 text-emerald-400/50 shrink-0 ml-auto" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Billing Cycle Toggle
───────────────────────────────────────────────────────────────────────── */
function BillingCycleToggle({
  billingCycle, setBillingCycle,
}: {
  billingCycle: "monthly" | "annual"
  setBillingCycle: (v: "monthly" | "annual") => void
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-5">
      <button
        onClick={() => setBillingCycle("monthly")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
          billingCycle === "monthly"
            ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
            : "text-gray-500 hover:text-gray-300"
        )}
      >
        Mensal
      </button>
      <button
        onClick={() => setBillingCycle("annual")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
          billingCycle === "annual"
            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
            : "text-gray-500 hover:text-gray-300"
        )}
      >
        Anual
        <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
          -20%
        </span>
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Credit Packs Section
───────────────────────────────────────────────────────────────────────── */
function CreditPacksSection() {
  const [selectedPack, setSelectedPack] = useState<string | null>(null)

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Package className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Pacotes de Créditos Avulsos</h3>
          <p className="text-[11px] text-gray-500">Compre créditos extras sem mudar de plano</p>
        </div>
      </div>

      {/* Packs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {CREDIT_PACKS.map(pack => {
          const c = COLOR[pack.color] ?? COLOR.gray
          const isSelected = selectedPack === pack.id
          return (
            <div
              key={pack.id}
              onClick={() => setSelectedPack(isSelected ? null : pack.id)}
              className={cn(
                "relative rounded-2xl border p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                isSelected
                  ? `${c.border} ${c.bg} ring-2 ${c.ring} shadow-lg`
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
              )}
            >
              {/* Popular badge */}
              {pack.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                  MAIS VENDIDO
                </span>
              )}

              {/* Bonus badge */}
              {pack.bonus && (
                <span className={cn(
                  "absolute -top-2 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full",
                  "bg-emerald-500 text-white shadow-lg"
                )}>
                  {pack.bonus}
                </span>
              )}

              <div className="flex flex-col items-center text-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  c.bg, c.border
                )}>
                  <pack.icon className={cn("w-5 h-5", c.text)} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-300">{pack.name}</p>
                  <p className={cn("text-2xl font-bold mt-1", c.text)}>
                    {pack.credits.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-gray-500">créditos</p>
                </div>
                <div className="w-full pt-2 border-t border-white/[0.05]">
                  <p className="text-lg font-bold text-white">
                    R$ {pack.price.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    R$ {pack.pricePerCredit.toFixed(2)}/crédito
                  </p>
                </div>

                {/* CTA */}
                <a
                  href={pack.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all",
                    "flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.97]",
                    c.btn
                  )}
                >
                  <Zap className="w-3 h-3" />
                  Comprar
                </a>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-500/[0.04] border border-blue-500/10 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-blue-300 font-medium">Créditos avulsos não expiram</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Créditos comprados em pacotes são adicionados ao saldo e nunca expiram. 
            Diferente dos créditos mensais do plano, que renovam a cada ciclo.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Organoid Lab — Proposta de Valor Detalhada
───────────────────────────────────────────────────────────────────────── */
function OrganoidLabValueCard({ currentPlan }: { currentPlan: string }) {
  const isActive = currentPlan === "ORGANOID_LAB"

  const benefits = [
    {
      icon: Layers,
      color: "text-teal-400",
      bg: "bg-teal-500/10 border-teal-500/20",
      title: "QMicroNiche™ integrado ao protocolo",
      desc: "Metodologia publicada na JoVE (2022) por Janaína Dernowsek — moldes não-adesivos de agarose 2% para geração de até 4.716 esferoides por placa, com diâmetro homogêneo (123 ± 3 µm) e viabilidade >95%. Sem precisar de equipamentos caros.",
    },
    {
      icon: Brain,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
      title: "Protocolos de diferenciação gerados por IA",
      desc: "A IA BIA gera protocolos completos com objetivo, materiais, etapas, parâmetros críticos e checkpoints de qualidade para intestinal, hepático, neural, cardíaco, renal, pancreático e pulmonar — adaptados à sua célula-fonte (iPSC, ESC, primária, tronco adulta).",
    },
    {
      icon: Microscope,
      color: "text-violet-400",
      bg: "bg-violet-500/10 border-violet-500/20",
      title: "Redução de custo e tempo no desenvolvimento",
      desc: "Esferoides e organoides substituem modelos animais e culturas 2D com maior relevância biológica. Com o Organoid Lab você acelera triagem de drogas, modelagem de doenças e testes de toxicidade com custo até 10× menor que serviços terceirizados.",
    },
    {
      icon: Dna,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      title: "QMatrix™ + ECM para maturação acelerada",
      desc: "Inclui guias de bioativação com QMatrix™ — peptídeo patenteado Quantis — para revestimento de superfície, aditivo de adesão celular e integração em hidrogéis. Concentrações e janelas temporais validadas para cada fase do protocolo.",
    },
    {
      icon: FlaskConical,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      title: "Agilidade sem complexidade operacional",
      desc: "Elimina a necessidade de equipamentos de hanging drop ou placas U-bottom de alto custo. O dispositivo QMicroNiche é reutilizável, autoclavável e compatível com placas de Petri 35–150 mm e placas 6-, 12-, 24- e 96-well — já disponíveis em qualquer laboratório.",
    },
    {
      icon: CircleDot,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
      title: "Acesso focado — sem pagar pelo que não usa",
      desc: "Plano desenhado para pesquisadores, startups e laboratórios que trabalham especificamente com esferoides e organoides. Acesso exclusivo ao Organoid Builder + Chat IA contextualizado + Base de conhecimento científica — R$ 150/mês, 300 créditos.",
    },
  ]

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-cyan-500/3 to-[#060f1a] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
            <CircleDot className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Plano Organoid Lab</h3>
              {isActive && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> SEU PLANO
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                ESPECIALISTA
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Acesso focado ao Organoid Builder — R$ 150/mês · 300 créditos
            </p>
          </div>
        </div>

        {/* Destaque proposta */}
        <div className="rounded-xl bg-teal-500/8 border border-teal-500/15 p-3 mb-4">
          <p className="text-xs text-teal-200 leading-relaxed">
            <span className="font-bold text-teal-300">Para quem:</span>{" "}
            pesquisadores, startups de biotecnologia, laboratórios universitários e
            empresas de cosméticos/farmacêuticos que desenvolvem{" "}
            <span className="font-semibold">esferoides e organoides</span> e
            precisam de agilidade, baixo custo e reprodutibilidade sem complexidade operacional.
          </p>
        </div>

        {/* 3 métricas de impacto */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: "4.716", label: "esferoides/placa", sub: "produção em larga escala" },
            { v: ">95%", label: "viabilidade", sub: "metodologia validada" },
            { v: "10×", label: "menor custo", sub: "vs. serviços terceirizados" },
          ].map((m, i) => (
            <div key={i} className="text-center py-3 px-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <div className="text-lg font-bold text-teal-300">{m.v}</div>
              <div className="text-[10px] font-semibold text-gray-300">{m.label}</div>
              <div className="text-[9px] text-gray-600 mt-0.5 leading-tight">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits grid */}
      <div className="p-5">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-3">
          O que você recebe com o Organoid Lab
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {benefits.map((b, i) => (
            <div key={i} className={cn("rounded-xl border p-3.5 flex gap-3", b.bg)}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-black/20 border", b.bg)}>
                <b.icon className={cn("w-4 h-4", b.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[11px] font-bold mb-1", b.color)}>{b.title}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Comparação rápida */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-3">
            Organoid Lab vs. métodos tradicionais
          </p>
          <div className="space-y-2">
            {[
              { item: "Hanging drop (96-well comprado)", trad: "~R$ 450/placa", lab: "Agarose 2% — ~R$ 12/placa" },
              { item: "Tempo para protocolo completo", trad: "2–4 semanas (literatura)", lab: "Gerado em segundos pela IA" },
              { item: "Esferoide homogêneo garantido", trad: "Alta variabilidade", lab: "123 ± 3 µm (validado JoVE)" },
              { item: "Bioativação com ECM", trad: "Não inclusa", lab: "QMatrix™ integrado" },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="text-gray-400 font-medium">{row.item}</div>
                <div className="text-red-400 text-center">{row.trad}</div>
                <div className="text-teal-300 font-semibold text-center">{row.lab}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[9px] text-gray-600 mt-2 pt-2 border-t border-white/5">
            <div />
            <div className="text-center">Tradicional</div>
            <div className="text-center text-teal-500">Organoid Lab</div>
          </div>
        </div>

        {/* CTA */}
        {!isActive ? (
          <a
            href="https://www.asaas.com/c/24p0skdjkpacozta"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-teal-900/40 active:scale-[0.98]"
          >
            <ExternalLink className="w-4 h-4" />
            Assinar Organoid Lab — R$ 150/mês
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 w-full py-3 border border-teal-500/25 text-teal-400 text-sm font-semibold rounded-xl bg-teal-500/5">
            <CheckCircle2 className="w-4 h-4" /> Plano Organoid Lab ativo
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Usage Insights - Quick Analytics
───────────────────────────────────────────────────────────────────────── */
function UsageInsights({
  balance, totalSpent, plan,
}: {
  balance: number; totalEarned?: number; totalSpent: number; plan: string
}) {
  const maxCredits = PLAN_CREDITS_MAX[plan] ?? 30
  const usagePercent = maxCredits > 0 ? Math.min(((maxCredits - balance) / maxCredits) * 100, 100) : 0
  const burnRate = totalSpent > 0 ? Math.round(totalSpent / Math.max(1, Math.ceil((Date.now() - new Date("2026-01-01").getTime()) / (1000 * 60 * 60 * 24)))) : 0
  const daysRemaining = burnRate > 0 ? Math.round(balance / burnRate) : balance > 0 ? 99 : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-violet-400" />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">Uso do ciclo</span>
        </div>
        <p className="text-xl font-bold text-white">{usagePercent.toFixed(0)}%</p>
        <div className="w-full h-1 bg-white/[0.06] rounded-full mt-2 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-amber-500" : "bg-emerald-500"
            )}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Timer className="w-3 h-3 text-blue-400" />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">Créditos/dia</span>
        </div>
        <p className="text-xl font-bold text-white">{burnRate}</p>
        <p className="text-[10px] text-gray-600 mt-1">taxa de consumo</p>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Calendar className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">Dias restantes</span>
        </div>
        <p className={cn("text-xl font-bold", daysRemaining < 5 ? "text-red-400" : "text-white")}>
          {daysRemaining > 90 ? "90+" : daysRemaining}
        </p>
        <p className="text-[10px] text-gray-600 mt-1">no ritmo atual</p>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Zap className="w-3 h-3 text-amber-400" />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">Eficiência</span>
        </div>
        <p className="text-xl font-bold text-white">
          {totalSpent > 0 ? `R$ ${((plan === "FREE" ? 0 : (PLANS.find(p => p.id === plan)?.price ?? 0)) / Math.max(1, totalSpent)).toFixed(2)}` : "—"}
        </p>
        <p className="text-[10px] text-gray-600 mt-1">custo/crédito</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────────────────── */
interface BillingClientProps {
  currentPlan: string
  balance: number
  totalEarned: number
  totalSpent: number
  history: {
    id: string; type: string; amount: number
    balance: number; description: string; createdAt: string
  }[]
  periodEnd?: string
}

/* ─────────────────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────────────────── */
export function BillingClient({
  currentPlan, balance, totalEarned, totalSpent, history, periodEnd,
}: BillingClientProps) {
  const { update } = useSession()
  const { success, error: toastError, info } = useToast()
  const [upgrading, setUpgrading]           = useState<string | null>(null)
  const [activeTab, setActiveTab]           = useState<"plans" | "packs" | "history" | "insights">("plans")
  const [expandedPlan, setExpandedPlan]     = useState<string | null>(null)
  const [billingCycle, setBillingCycle]     = useState<"monthly" | "annual">("monthly")

  // Animated counter for balance
  const [displayBalance, setDisplayBalance] = useState(0)
  const animateBalance = useCallback(() => {
    const start = 0
    const end = balance
    const duration = 1200
    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayBalance(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [balance])

  useEffect(() => { animateBalance() }, [animateBalance])

  const maxCredits = PLAN_CREDITS_MAX[currentPlan] ?? 10

  /* Internal upgrade (for FREE users being auto-moved to DISCOVERY) */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleInternalUpgrade = async (planId: string) => {
    if (planId === currentPlan) { info("Plano atual", "Você já está neste plano."); return }
    setUpgrading(planId)
    try {
      const res  = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!res.ok) { toastError("Erro ao atualizar plano", data.error); return }
      await update({ plan: planId })
      success(`Plano ${planId} ativado!`, "Seus créditos foram atualizados.")
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      toastError("Erro de conexão", "Tente novamente.")
    } finally {
      setUpgrading(null)
    }
  }

  /* For paid plans: redirect to Asaas payment */
  const handlePaymentRedirect = (planId: string, plan: typeof PLANS[0]) => {
    if (planId === currentPlan) { info("Plano atual", "Você já está neste plano."); return }
    const url = billingCycle === "annual" ? plan.annualPaymentUrl : plan.paymentUrl
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const planIndex = (id: string) => PLANS.findIndex(p => p.id === id)
  const currentIdx = planIndex(currentPlan)

  const getPrice = (plan: typeof PLANS[0]) =>
    billingCycle === "annual" ? plan.annualPrice : plan.price

  const getAnnualSavings = (plan: typeof PLANS[0]) =>
    (plan.price - plan.annualPrice) * 12

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-7 max-w-5xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">Assinatura & Créditos</h1>
          <p className="text-xs sm:text-sm text-gray-400">Gerencie seu plano, compre créditos e acompanhe o uso</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Saldo</span>
          <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-sm font-bold text-violet-300">{displayBalance.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>

      {/* ── Current plan card + stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Plan overview */}
        <div className="col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          {/* Subtle gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plano Atual</span>
            </div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white">{currentPlan}</p>
                {periodEnd && (
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>Renova em {new Date(periodEnd).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>
              <CreditBadge balance={balance} size="md" />
            </div>
            <CreditProgressBar balance={balance} maxCredits={maxCredits} showLabels />
          </div>
        </div>

        {/* Stats */}
        {[
          { label: "Saldo",  value: displayBalance,  icon: Zap,         color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
          { label: "Ganho",  value: totalEarned,  icon: TrendingUp,  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Gasto",  value: totalSpent,   icon: TrendingDown,color: "text-red-400 bg-red-500/10 border-red-500/20" },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between hover:border-white/15 transition-colors">
            <div className={cn("w-8 h-8 rounded-xl border flex items-center justify-center mb-2.5", s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-white">{s.value.toLocaleString("pt-BR")}</p>
              <p className="text-[10px] sm:text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-white/[0.08] overflow-x-auto scrollbar-hide">
        {([
          { id: "plans",    label: "Planos",               icon: Star },
          { id: "packs",    label: "Pacotes de Créditos",  icon: Package },
          { id: "insights", label: "Insights",             icon: TrendingUp },
          { id: "history",  label: "Histórico",            icon: Clock },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PLANS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "plans" && (
        <>
          {/* Billing cycle toggle */}
          <BillingCycleToggle billingCycle={billingCycle} setBillingCycle={setBillingCycle} />

          {/* Annual savings banner */}
          <AnnualSavingsBanner billingCycle={billingCycle} />

          {/* Desktop: grid */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PLANS.map(plan => {
              const c       = COLOR[plan.color as keyof typeof COLOR]
              const isCur   = plan.id === currentPlan
              const isDown  = planIndex(plan.id) < currentIdx
              const isUp    = upgrading === plan.id
              const price   = getPrice(plan)
              const savings = getAnnualSavings(plan)

              return (
                <div key={plan.id}
                  className={cn(
                    "relative rounded-2xl border flex flex-col transition-all hover:scale-[1.01]",
                    isCur ? `${c.border} ${c.bg} ring-1 ${c.ring}` : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
                  )}>
                  {/* Badge */}
                  {plan.badge && (
                    <span className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-lg z-10",
                      c.badgeBg
                    )}>
                      {plan.badge}
                    </span>
                  )}
                  {isCur && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-10">
                      <CheckCircle2 className="w-2.5 h-2.5" /> ATUAL
                    </span>
                  )}

                  <div className="p-4 sm:p-5 flex flex-col flex-1 gap-3">
                    {/* Plan name + price */}
                    <div>
                      <div className={cn("flex items-center gap-1.5 mb-1", c.text)}>
                        <Star className="w-3.5 h-3.5" />
                        <span className="text-sm font-bold">{plan.name_short ?? plan.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-2xl font-bold text-white">
                          R$ {price.toLocaleString("pt-BR")}
                        </p>
                        <span className="text-xs text-gray-500 font-normal">/mês</span>
                      </div>
                      {billingCycle === "annual" && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] line-through text-gray-600">
                            R$ {plan.price.toLocaleString("pt-BR")}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            -20%
                          </span>
                        </div>
                      )}
                      {billingCycle === "annual" && savings > 0 && (
                        <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          Economize R$ {savings.toLocaleString("pt-BR")}/ano
                        </p>
                      )}
                      <p className={cn("text-xs mt-1 font-medium", c.text)}>
                        <Zap className="w-3 h-3 inline mr-0.5" />
                        {plan.credits.toLocaleString("pt-BR")} créditos/mês
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-gray-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isCur ? (
                      <div className={cn("w-full py-2.5 rounded-xl text-xs font-semibold text-center border flex items-center justify-center gap-1.5", `${c.text} border-current/20 bg-white/[0.03]`)}>
                        <CheckCircle2 className="w-3 h-3" /> Plano atual
                      </div>
                    ) : isDown ? (
                      <div className="w-full py-2.5 rounded-xl text-xs font-semibold text-center border border-white/[0.06] text-gray-600 cursor-not-allowed">
                        Downgrade
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePaymentRedirect(plan.id, plan)}
                        disabled={isUp}
                        className={cn(
                          "w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98]",
                          c.btn
                        )}>
                        {isUp
                          ? <><RefreshCw className="w-3 h-3 animate-spin" /> Processando...</>
                          : <><ExternalLink className="w-3 h-3" /> Assinar agora</>
                        }
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile: accordion list */}
          <div className="sm:hidden space-y-3">
            {PLANS.map(plan => {
              const c       = COLOR[plan.color as keyof typeof COLOR]
              const isCur   = plan.id === currentPlan
              const isDown  = planIndex(plan.id) < currentIdx
              const price   = getPrice(plan)
              const savings = getAnnualSavings(plan)
              const isExp   = expandedPlan === plan.id

              return (
                <div key={plan.id}
                  className={cn(
                    "relative rounded-2xl border overflow-hidden transition-all",
                    isCur ? `${c.border} ${c.bg} ring-1 ${c.ring}` : "border-white/[0.08] bg-white/[0.02]"
                  )}>
                  {/* Badges */}
                  {plan.badge && !isCur && (
                    <div className={cn("absolute top-0 right-0 text-white text-[9px] font-bold px-2.5 py-1 rounded-bl-xl z-10", c.badgeBg)}>
                      {plan.badge}
                    </div>
                  )}
                  {isCur && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-bl-xl flex items-center gap-1 z-10">
                      <CheckCircle2 className="w-2.5 h-2.5" /> ATUAL
                    </div>
                  )}

                  {/* Collapsed header row */}
                  <button
                    onClick={() => setExpandedPlan(isExp ? null : plan.id)}
                    className="w-full flex items-center gap-3 px-4 py-4"
                  >
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border", c.bg, c.border)}>
                      <Star className={cn("w-4 h-4", c.text)} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-white leading-none truncate pr-6">
                        {plan.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={cn("text-xs font-medium", c.text)}>
                          R$ {price.toLocaleString("pt-BR")}/mês
                        </p>
                        {billingCycle === "annual" && (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            -20%
                          </span>
                        )}
                        <span className="text-gray-600">·</span>
                        <span className={cn("text-xs", c.text)}>{plan.credits.toLocaleString("pt-BR")} cr</span>
                      </div>
                    </div>
                    {isExp
                      ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    }
                  </button>

                  {/* Expanded content */}
                  {isExp && (
                    <div className={cn("px-4 pb-4 border-t border-white/[0.05]", c.bg)}>
                      {billingCycle === "annual" && savings > 0 && (
                        <div className="flex items-center gap-2 mt-3 mb-2 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-lg px-3 py-2">
                          <Gift className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-[11px] text-emerald-300 font-medium">
                            Economize R$ {savings.toLocaleString("pt-BR")}/ano
                          </span>
                        </div>
                      )}
                      <ul className="space-y-2 mt-3 mb-4">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {isCur ? (
                        <div className={cn("w-full py-3 rounded-xl text-sm font-semibold text-center border flex items-center justify-center gap-2", `${c.text} border-current/20 bg-white/[0.03]`)}>
                          <CheckCircle2 className="w-4 h-4" /> Seu plano atual
                        </div>
                      ) : isDown ? (
                        <div className="w-full py-3 rounded-xl text-sm text-center border border-white/[0.06] text-gray-600">
                          Downgrade não disponível
                        </div>
                      ) : (
                        <a
                          href={billingCycle === "annual" ? plan.annualPaymentUrl : plan.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]",
                            c.btn
                          )}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Assinar {plan.name_short ?? plan.name} agora
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Organoid Lab — Proposta de valor detalhada ── */}
          <OrganoidLabValueCard currentPlan={currentPlan} />

          {/* Payment info notice */}
          <div className="bg-violet-500/[0.05] border border-violet-500/15 rounded-xl px-4 py-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-violet-300 font-semibold mb-1">Pagamento seguro via Asaas</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ao clicar em &quot;Assinar agora&quot;, você será redirecionado para o checkout seguro do Asaas.
                Após a confirmação do pagamento, seu plano será ativado automaticamente em até 24h.
                {billingCycle === "annual" && " Planos anuais são cobrados em uma única parcela com 20% de desconto."}
                {" "}Em caso de dúvidas, entre em contato pelo suporte.
              </p>
            </div>
          </div>

          {/* Quick link to credit packs */}
          <button
            onClick={() => setActiveTab("packs")}
            className="w-full flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3.5 hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Package className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">Precisa de mais créditos?</p>
                <p className="text-[11px] text-gray-500">Compre pacotes avulsos a partir de R$ 29</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors" />
          </button>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CREDIT PACKS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "packs" && (
        <CreditPacksSection />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          INSIGHTS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "insights" && (
        <UsageInsights
          balance={balance}
          totalSpent={totalSpent}
          plan={currentPlan}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          HISTORY TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl overflow-hidden animate-fadeIn">
          {history.length === 0 ? (
            <div className="py-12 sm:py-16 text-center">
              <CreditCard className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhuma transação encontrada</p>
              <p className="text-xs text-gray-600 mt-1">Use os módulos de IA para ver o histórico</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {/* Desktop header */}
              <div className="hidden sm:grid grid-cols-4 gap-4 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-2">Descrição</div>
                <div className="text-right">Valor</div>
                <div className="text-right">Saldo</div>
              </div>

              {history.map(txn => (
                <div key={txn.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-4 gap-4 px-5 py-3.5 items-center">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                        txn.type === "CREDIT"
                          ? "bg-emerald-500/10 border border-emerald-500/20"
                          : "bg-red-500/10 border border-red-500/20"
                      )}>
                        {txn.type === "CREDIT"
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-sm text-gray-200 truncate max-w-[200px]">{txn.description}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(txn.createdAt).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                    <div className={cn("text-right text-sm font-bold",
                      txn.type === "CREDIT" ? "text-emerald-400" : "text-red-400")}>
                      {txn.type === "CREDIT" ? "+" : ""}{txn.amount.toLocaleString("pt-BR")}
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      {txn.balance.toLocaleString("pt-BR")}
                    </div>
                  </div>

                  {/* Mobile row */}
                  <div className="sm:hidden flex items-center gap-3 px-4 py-3.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      txn.type === "CREDIT"
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "bg-red-500/10 border border-red-500/20"
                    )}>
                      {txn.type === "CREDIT"
                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate">{txn.description}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(txn.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className={cn("text-xs font-bold",
                        txn.type === "CREDIT" ? "text-emerald-400" : "text-red-400")}>
                        {txn.type === "CREDIT" ? "+" : ""}{txn.amount.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-[10px] text-gray-600">{txn.balance.toLocaleString("pt-BR")} cr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
