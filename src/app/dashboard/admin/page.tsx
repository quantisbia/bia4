"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Users, CreditCard, TrendingUp, Activity, Search, Filter,
  ChevronDown, ChevronUp, RefreshCw, Shield, Zap, Star,
  MoreVertical, Edit2, Plus, ArrowUpRight, ArrowDownRight,
  Crown, Lock, AlertTriangle, CheckCircle2, Clock, X,
  BarChart3, Database, BookOpen, MessageSquare, Layers,
  Eye, Loader2, Check, Terminal, AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { isSuperAdmin } from "@/lib/auth/admin-shared"

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserAdmin {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  institution: string | null
  researchArea: string | null
  createdAt: string
  updatedAt: string
  lastLogin: string | null
  lastActivity: { type: string; amount: number; description: string; createdAt: string } | null
  subscription: {
    plan: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    monthlyCredits: number
    externalId: string | null
  } | null
  creditBalance: {
    balance: number
    totalEarned: number
    totalSpent: number
  } | null
  _count: {
    pipelineProjects: number
    protocols: number
    chatSessions: number
    notebookEntries: number
  }
}

interface StatsData {
  overview: {
    totalUsers: number
    newUsersThisMonth: number
    newUsersThisWeek: number
    newUsersToday: number
    activeUsersThisWeek: number
  }
  plans: {
    breakdown: { plan: string; status: string; _count: { id: number } }[]
    freeImplicit: number
  }
  credits: { totalIssued: number; totalSpent: number; issuedThisMonth: number }
  usage: { totalPipelines: number; totalProtocols: number; totalChatSessions: number; totalNotebookEntries: number }
  revenue: { mrr: number; byPlan: Record<string, number> }
  recentTransactions: {
    id: string; type: string; amount: number; balance: number
    description: string; createdAt: string
    user: { name: string | null; email: string } | null
  }[]
  dailySignups: { date: string; count: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  FREE:       { label: "Free",       color: "text-gray-400",   bg: "bg-gray-500/10",    border: "border-gray-500/20",    icon: "⚪" },
  DISCOVERY:  { label: "Discovery",  color: "text-blue-400",   bg: "bg-blue-500/10",    border: "border-blue-500/20",    icon: "🔵" },
  ADVANCED:   { label: "Advanced",   color: "text-violet-400", bg: "bg-violet-500/10",  border: "border-violet-500/20",  icon: "🟣" },
  ENTERPRISE: { label: "Enterprise", color: "text-amber-400",  bg: "bg-amber-500/10",   border: "border-amber-500/20",   icon: "🟡" },
  ACADEMY:    { label: "Academy",    color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "🟢" },
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE:    { label: "Ativo",     color: "text-emerald-400", dot: "bg-emerald-400" },
  INACTIVE:  { label: "Inativo",   color: "text-gray-400",    dot: "bg-gray-400" },
  CANCELLED: { label: "Cancelado", color: "text-rose-400",    dot: "bg-rose-400" },
  PAST_DUE:  { label: "Inadimpl.", color: "text-amber-400",   dot: "bg-amber-400" },
  TRIALING:  { label: "Trial",     color: "text-cyan-400",    dot: "bg-cyan-400" },
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  USER:       { label: "Usuário",    color: "text-gray-400" },
  RESEARCHER: { label: "Pesquisador",color: "text-blue-400" },
  ADMIN:      { label: "Admin",      color: "text-amber-400" },
}

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n)
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(d))
}

function fmtDateShort(d: string | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d))
}

function timeAgo(d: string | null) {
  if (!d) return "—"
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return "agora"
  if (mins < 60)  return `${mins}m`
  if (mins < 1440) return `${Math.floor(mins / 60)}h`
  return `${Math.floor(mins / 1440)}d`
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "credits" | "audit">("overview")
  const [stats, setStats]         = useState<StatsData | null>(null)
  const [users, setUsers]         = useState<UserAdmin[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 })
  const [loading, setLoading]     = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)

  // Filtros
  const [search, setSearch]   = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [sortBy, setSortBy]   = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")

  // User selecionado
  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null)
  const [userDetail, setUserDetail]     = useState<{ creditHistory: unknown[]; sessions: unknown[]; pipelines: unknown[]; auditLogs: unknown[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Modais
  const [modal, setModal] = useState<"credits" | "plan" | "role" | null>(null)
  const [modalValues, setModalValues] = useState({ amount: 100, plan: "ADVANCED", role: "RESEARCHER", note: "", reason: "" })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "loading") return
    const email = session?.user?.email
    if (!session || !isSuperAdmin(email)) {
      router.replace("/dashboard")
    }
  }, [session, status, router])

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const r = await fetch("/api/admin/stats")
      if (r.ok) setStats(await r.json())
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // ── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        search,
        plan: planFilter,
        sort: sortBy,
        order: sortOrder,
      })
      const r = await fetch(`/api/admin/users?${params}`)
      if (r.ok) {
        const data = await r.json()
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } finally {
      setLoading(false)
    }
  }, [search, planFilter, sortBy, sortOrder])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    if (activeTab === "users") fetchUsers()
  }, [activeTab, fetchUsers])

  // ── Fetch user detail ──────────────────────────────────────────────────────
  const fetchUserDetail = async (userId: string) => {
    setDetailLoading(true)
    try {
      const r = await fetch(`/api/admin/users/${userId}`)
      if (r.ok) {
        const data = await r.json()
        setUserDetail(data)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  // ── Admin action ───────────────────────────────────────────────────────────
  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selectedUser) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const r = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await r.json()
      if (r.ok) {
        setActionMsg({ type: "ok", text: data.message })
        setModal(null)
        // Refresh
        fetchUsers(pagination.page)
        fetchUserDetail(selectedUser.id)
        // Update selected user inline
        if (action === "add_credits") {
          setSelectedUser(prev => prev ? {
            ...prev,
            creditBalance: prev.creditBalance ? {
              ...prev.creditBalance,
              balance: data.newBalance,
            } : { balance: data.newBalance, totalEarned: data.newBalance, totalSpent: 0 }
          } : prev)
        }
      } else {
        setActionMsg({ type: "err", text: data.error ?? "Erro desconhecido" })
      }
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render guard ───────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdmin(session?.user?.email)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <Lock className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <p className="text-white font-semibold">Acesso Restrito</p>
          <p className="text-gray-500 text-sm mt-1">Área exclusiva para administradores Quantis.</p>
        </div>
      </div>
    )
  }

  // ── Totais rápidos para o plan breakdown ───────────────────────────────────
  const planTotals: Record<string, number> = {}
  stats?.plans.breakdown.forEach(b => {
    planTotals[b.plan] = (planTotals[b.plan] ?? 0) + b._count.id
  })

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
              SUPERADMIN
            </span>
          </div>
          <p className="text-xs text-gray-500 ml-9">
            Controle total da plataforma BIA v4 · Quantis Biofabricação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-gray-500">Logado como</div>
            <div className="text-xs font-semibold text-amber-400">{session?.user?.email}</div>
          </div>
          <button onClick={() => { fetchStats(); if (activeTab === "users") fetchUsers() }}
            className="p-2 bg-white/[0.05] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] transition-all">
            <RefreshCw className={cn("w-4 h-4 text-gray-400", (loading || statsLoading) && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "overview", label: "Visão Geral",    icon: BarChart3 },
          { id: "users",    label: "Usuários",       icon: Users },
          { id: "credits",  label: "Créditos & Txns",icon: Zap },
          { id: "audit",    label: "Audit Log",      icon: Terminal },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0",
              activeTab === tab.id
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.07] hover:text-white"
            )}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════ OVERVIEW ════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Total Usuários",
                value: fmt(stats?.overview.totalUsers ?? 0),
                sub: `+${stats?.overview.newUsersThisMonth ?? 0} este mês`,
                icon: Users, color: "blue", trend: "up",
              },
              {
                label: "Usuários Ativos/7d",
                value: fmt(stats?.overview.activeUsersThisWeek ?? 0),
                sub: `${stats?.overview.newUsersToday ?? 0} cadastros hoje`,
                icon: Activity, color: "emerald", trend: "up",
              },
              {
                label: "MRR Estimado",
                value: `R$ ${fmt(stats?.revenue.mrr ?? 0)}`,
                sub: "Receita mensal recorrente",
                icon: TrendingUp, color: "amber", trend: "up",
              },
              {
                label: "Créditos em Circulação",
                value: fmt((stats?.credits.totalIssued ?? 0) - (stats?.credits.totalSpent ?? 0)),
                sub: `${fmt(stats?.credits.totalSpent ?? 0)} consumidos`,
                icon: Zap, color: "violet", trend: "neutral",
              },
            ].map((kpi, i) => (
              <KpiCard key={i} {...kpi} loading={statsLoading} />
            ))}
          </div>

          {/* Plan breakdown + Usage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Plans */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" /> Usuários por Plano
              </h3>
              <div className="space-y-2">
                {(["FREE", "DISCOVERY", "ADVANCED", "ENTERPRISE", "ACADEMY"] as const).map(plan => {
                  const count = planTotals[plan] ?? 0
                  const total = stats?.overview.totalUsers ?? 1
                  const pct = Math.round((count / total) * 100)
                  const meta = PLAN_META[plan]
                  return (
                    <div key={plan} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn("font-semibold flex items-center gap-1.5", meta.color)}>
                          <span>{meta.icon}</span> {meta.label}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 font-mono">{count}</span>
                          <span className="text-gray-600 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/[0.05] rounded-full h-1.5">
                        <div className={cn("h-1.5 rounded-full transition-all",
                          plan === "FREE" && "bg-gray-500",
                          plan === "DISCOVERY" && "bg-blue-500",
                          plan === "ADVANCED" && "bg-violet-500",
                          plan === "ENTERPRISE" && "bg-amber-500",
                          plan === "ACADEMY" && "bg-emerald-500",
                        )} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Usage */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Uso da Plataforma
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Pipelines", value: stats?.usage.totalPipelines ?? 0, icon: Layers, color: "violet" },
                  { label: "Protocolos", value: stats?.usage.totalProtocols ?? 0, icon: BookOpen, color: "blue" },
                  { label: "Chats IA", value: stats?.usage.totalChatSessions ?? 0, icon: MessageSquare, color: "emerald" },
                  { label: "Notebooks", value: stats?.usage.totalNotebookEntries ?? 0, icon: Database, color: "amber" },
                ].map((item, i) => (
                  <div key={i} className={cn(
                    "rounded-xl p-3 border",
                    item.color === "violet" && "bg-violet-500/8 border-violet-500/15",
                    item.color === "blue" && "bg-blue-500/8 border-blue-500/15",
                    item.color === "emerald" && "bg-emerald-500/8 border-emerald-500/15",
                    item.color === "amber" && "bg-amber-500/8 border-amber-500/15",
                  )}>
                    <item.icon className={cn("w-4 h-4 mb-1",
                      item.color === "violet" && "text-violet-400",
                      item.color === "blue" && "text-blue-400",
                      item.color === "emerald" && "text-emerald-400",
                      item.color === "amber" && "text-amber-400",
                    )} />
                    <div className="text-lg font-bold text-white">{fmt(item.value)}</div>
                    <div className="text-[11px] text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receita por plano */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Receita por Plano (MRR)
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats?.revenue.byPlan ?? {}).filter(([, v]) => v > 0).map(([plan, rev]) => {
                const meta = PLAN_META[plan]
                return (
                  <div key={plan} className={cn("rounded-xl p-3 border flex-1 min-w-[120px]", meta.bg, meta.border)}>
                    <div className={cn("text-[10px] font-semibold mb-1", meta.color)}>{meta.icon} {meta.label}</div>
                    <div className="text-base font-bold text-white">R$ {fmt(rev)}</div>
                    <div className="text-[10px] text-gray-500">{planTotals[plan] ?? 0} usuários</div>
                  </div>
                )
              })}
              {Object.keys(stats?.revenue.byPlan ?? {}).length === 0 && (
                <p className="text-xs text-gray-500">Nenhuma receita registrada ainda.</p>
              )}
            </div>
          </div>

          {/* Últimas transações */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" /> Últimas Transações de Crédito
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/[0.06]">
                    <th className="text-left pb-2 font-medium">Usuário</th>
                    <th className="text-left pb-2 font-medium">Tipo</th>
                    <th className="text-right pb-2 font-medium">Qtd</th>
                    <th className="text-right pb-2 font-medium">Saldo</th>
                    <th className="text-left pb-2 font-medium pl-3">Descrição</th>
                    <th className="text-right pb-2 font-medium">Quando</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {(stats?.recentTransactions ?? []).map(txn => (
                    <tr key={txn.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 text-gray-300">{txn.user?.name ?? txn.user?.email ?? "—"}</td>
                      <td className="py-2">
                        <span className={cn("px-1.5 py-0.5 rounded font-semibold",
                          txn.type === "CREDIT"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400"
                        )}>
                          {txn.type === "CREDIT" ? "+" : "-"}{txn.type}
                        </span>
                      </td>
                      <td className={cn("py-2 text-right font-mono font-bold",
                        txn.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {txn.type === "CREDIT" ? "+" : "-"}{txn.amount}
                      </td>
                      <td className="py-2 text-right font-mono text-gray-300">{txn.balance}</td>
                      <td className="py-2 pl-3 text-gray-500 max-w-[200px] truncate">{txn.description}</td>
                      <td className="py-2 text-right text-gray-600">{timeAgo(txn.createdAt)}</td>
                    </tr>
                  ))}
                  {(stats?.recentTransactions ?? []).length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-600">Nenhuma transação</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ USERS ════════════ */}
      {activeTab === "users" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
          {/* Lista */}
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[180px] relative">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchUsers()}
                  placeholder="Buscar por nome, email, instituição..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
                />
              </div>
              <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); }}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-amber-500/40 cursor-pointer">
                <option value="">Todos os planos</option>
                {["FREE","DISCOVERY","ADVANCED","ENTERPRISE","ACADEMY"].map(p => (
                  <option key={p} value={p}>{PLAN_META[p].label}</option>
                ))}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-amber-500/40 cursor-pointer">
                <option value="createdAt">Cadastro</option>
                <option value="updatedAt">Última atualização</option>
                <option value="credits">Créditos</option>
                <option value="plan">Plano</option>
              </select>
              <button onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                className="p-2 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:bg-white/[0.07] transition-all">
                {sortOrder === "desc"
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
              </button>
              <button onClick={() => fetchUsers()}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 border border-amber-500/25 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-500/25 transition-all">
                <Filter className="w-3.5 h-3.5" /> Buscar
              </button>
            </div>

            {/* Contador */}
            <div className="text-xs text-gray-500">
              {fmt(pagination.total)} usuários encontrados — página {pagination.page} de {pagination.pages}
            </div>

            {/* Tabela */}
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/[0.03] text-gray-500 border-b border-white/[0.06]">
                        <th className="text-left px-4 py-3 font-medium">Usuário</th>
                        <th className="text-left px-3 py-3 font-medium">Plano</th>
                        <th className="text-right px-3 py-3 font-medium">Créditos</th>
                        <th className="text-left px-3 py-3 font-medium">Uso</th>
                        <th className="text-right px-3 py-3 font-medium">Cadastro</th>
                        <th className="text-right px-3 py-3 font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {users.map(user => {
                        const plan = user.subscription?.plan ?? "FREE"
                        const status = user.subscription?.status ?? "INACTIVE"
                        const meta = PLAN_META[plan]
                        const sm = STATUS_META[status]
                        const isSelected = selectedUser?.id === user.id

                        return (
                          <tr key={user.id}
                            onClick={() => { setSelectedUser(user); fetchUserDetail(user.id) }}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isSelected ? "bg-amber-500/8 border-l-2 border-l-amber-500" : "hover:bg-white/[0.02]"
                            )}>
                            {/* User info */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                  {(user.name ?? user.email)?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-white leading-tight">{user.name ?? "—"}</div>
                                  <div className="text-gray-500 text-[10px]">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            {/* Plano */}
                            <td className="px-3 py-3">
                              <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", meta.bg, meta.color, meta.border)}>
                                {meta.icon} {meta.label}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
                                <span className={cn("text-[10px]", sm.color)}>{sm.label}</span>
                              </div>
                            </td>
                            {/* Créditos */}
                            <td className="px-3 py-3 text-right">
                              <div className="font-mono font-bold text-white">{fmt(user.creditBalance?.balance ?? 0)}</div>
                              <div className="text-[10px] text-gray-600">de {fmt(user.creditBalance?.totalEarned ?? 0)}</div>
                            </td>
                            {/* Uso */}
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2 text-gray-500">
                                <span title="Pipelines">🧬{user._count.pipelineProjects}</span>
                                <span title="Protocolos">📋{user._count.protocols}</span>
                                <span title="Chats">💬{user._count.chatSessions}</span>
                              </div>
                            </td>
                            {/* Cadastro */}
                            <td className="px-3 py-3 text-right text-gray-500">
                              {fmtDateShort(user.createdAt)}
                            </td>
                            {/* Ações */}
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedUser(user); fetchUserDetail(user.id) }}
                                className="p-1.5 bg-white/[0.05] rounded-lg hover:bg-amber-500/20 hover:text-amber-400 text-gray-500 transition-all">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {users.length === 0 && !loading && (
                        <tr><td colSpan={6} className="py-8 text-center text-gray-600">Nenhum usuário encontrado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Paginação */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p}
                    onClick={() => fetchUsers(p)}
                    className={cn(
                      "w-7 h-7 rounded-lg text-xs font-mono transition-all",
                      p === pagination.page
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/[0.04] text-gray-500 hover:bg-white/[0.07]"
                    )}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Painel lateral — User Detail */}
          {selectedUser ? (
            <UserDetailPanel
              user={selectedUser}
              detail={userDetail}
              loading={detailLoading}
              actionLoading={actionLoading}
              actionMsg={actionMsg}
              modal={modal}
              modalValues={modalValues}
              onOpenModal={setModal}
              onModalChange={setModalValues}
              onAction={doAction}
              onClose={() => { setSelectedUser(null); setUserDetail(null); setActionMsg(null) }}
            />
          ) : (
            <div className="hidden xl:flex items-center justify-center bg-white/[0.02] border border-white/[0.07] rounded-2xl min-h-[300px]">
              <div className="text-center">
                <Users className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Selecione um usuário para ver detalhes</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ CREDITS ════════════ */}
      {activeTab === "credits" && (
        <CreditsTab stats={stats} statsLoading={statsLoading} />
      )}

      {/* ════════════ AUDIT ════════════ */}
      {activeTab === "audit" && (
        <AuditTab />
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend, loading }: {
  label: string; value: string; sub: string
  icon: React.ElementType; color: string; trend: string; loading: boolean
}) {
  const colors = {
    blue:   { bg: "bg-blue-500/8",   border: "border-blue-500/15",   icon: "text-blue-400",   value: "text-blue-300" },
    emerald:{ bg: "bg-emerald-500/8",border: "border-emerald-500/15",icon: "text-emerald-400",value: "text-emerald-300" },
    amber:  { bg: "bg-amber-500/8",  border: "border-amber-500/15",  icon: "text-amber-400",  value: "text-amber-300" },
    violet: { bg: "bg-violet-500/8", border: "border-violet-500/15", icon: "text-violet-400", value: "text-violet-300" },
  }[color] ?? { bg: "", border: "", icon: "", value: "" }

  return (
    <div className={cn("rounded-2xl p-4 border", colors.bg, colors.border)}>
      <div className="flex items-start justify-between mb-2">
        <Icon className={cn("w-4 h-4", colors.icon)} />
        {trend === "up" && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
        {trend === "down" && <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
      </div>
      {loading ? (
        <div className="h-6 w-20 bg-white/[0.08] rounded animate-pulse mb-1" />
      ) : (
        <div className={cn("text-xl font-bold", colors.value)}>{value}</div>
      )}
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
      <div className="text-[10px] text-gray-600 mt-1">{sub}</div>
    </div>
  )
}

// ── User Detail Panel ─────────────────────────────────────────────────────────
function UserDetailPanel({
  user, detail, loading, actionLoading, actionMsg, modal, modalValues,
  onOpenModal, onModalChange, onAction, onClose
}: {
  user: UserAdmin
  detail: { creditHistory: unknown[]; sessions: unknown[]; pipelines: unknown[]; auditLogs: unknown[] } | null
  loading: boolean
  actionLoading: boolean
  actionMsg: { type: "ok" | "err"; text: string } | null
  modal: string | null
  modalValues: { amount: number; plan: string; role: string; note: string; reason: string }
  onOpenModal: (m: "credits" | "plan" | "role" | null) => void
  onModalChange: React.Dispatch<React.SetStateAction<{ amount: number; plan: string; role: string; note: string; reason: string }>>
  onAction: (a: string, extra?: Record<string, unknown>) => void
  onClose: () => void
}) {
  const plan   = user.subscription?.plan   ?? "FREE"
  const status = user.subscription?.status ?? "INACTIVE"
  const meta   = PLAN_META[plan]
  const sm     = STATUS_META[status]
  const role   = ROLE_META[user.role] ?? ROLE_META.USER

  return (
    <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/50 to-blue-500/50 flex items-center justify-center text-white text-sm font-bold">
            {(user.name ?? user.email)?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{user.name ?? "Sem nome"}</div>
            <div className="text-[11px] text-gray-500">{user.email}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/[0.05] rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 scrollbar-none">
        <div className="p-4 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", meta.bg, meta.color, meta.border)}>
              {meta.icon} {meta.label}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-white/[0.07] text-gray-400">
              <div className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
              {sm.label}
            </span>
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.04] border border-white/[0.07]", role.color)}>
              {role.label}
            </span>
          </div>

          {/* Action message */}
          {actionMsg && (
            <div className={cn("rounded-xl px-3 py-2 flex items-center gap-2 text-xs",
              actionMsg.type === "ok"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
            )}>
              {actionMsg.type === "ok" ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {actionMsg.text}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => onOpenModal("credits")}
              className="flex flex-col items-center gap-1 p-2.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl hover:bg-emerald-500/15 transition-all group">
              <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] text-emerald-300 font-semibold text-center leading-tight">Add<br/>Créditos</span>
            </button>
            <button onClick={() => onOpenModal("plan")}
              className="flex flex-col items-center gap-1 p-2.5 bg-amber-500/8 border border-amber-500/15 rounded-xl hover:bg-amber-500/15 transition-all group">
              <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] text-amber-300 font-semibold text-center leading-tight">Upgrade<br/>Plano</span>
            </button>
            <button onClick={() => onOpenModal("role")}
              className="flex flex-col items-center gap-1 p-2.5 bg-blue-500/8 border border-blue-500/15 rounded-xl hover:bg-blue-500/15 transition-all group">
              <Shield className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] text-blue-300 font-semibold text-center leading-tight">Alterar<br/>Role</span>
            </button>
          </div>

          {/* Inline modal: Add Credits */}
          {modal === "credits" && (
            <InlineModal title="Adicionar Créditos" color="emerald"
              onCancel={() => onOpenModal(null)}
              onConfirm={() => onAction("add_credits", { amount: modalValues.amount, reason: modalValues.reason })}
              loading={actionLoading}>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Quantidade de créditos</label>
                  <input type="number" min={1} max={100000}
                    value={modalValues.amount}
                    onChange={e => onModalChange(v => ({ ...v, amount: +e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Motivo (opcional)</label>
                  <input type="text"
                    value={modalValues.reason}
                    onChange={e => onModalChange(v => ({ ...v, reason: e.target.value }))}
                    placeholder="Ex: Brinde curso avulso, Cortesia Quantis..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-lg p-2.5">
                  <div className="text-[11px] text-gray-400">Saldo atual: <span className="text-white font-bold">{fmt(user.creditBalance?.balance ?? 0)}</span></div>
                  <div className="text-[11px] text-emerald-300 mt-0.5">Novo saldo: <span className="font-bold">{fmt((user.creditBalance?.balance ?? 0) + modalValues.amount)}</span></div>
                </div>
              </div>
            </InlineModal>
          )}

          {/* Inline modal: Upgrade Plan */}
          {modal === "plan" && (
            <InlineModal title="Upgrade de Plano" color="amber"
              onCancel={() => onOpenModal(null)}
              onConfirm={() => onAction("upgrade_plan", { plan: modalValues.plan, note: modalValues.note })}
              loading={actionLoading}>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Novo plano</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {["FREE","DISCOVERY","ADVANCED","ENTERPRISE","ACADEMY"].map(p => {
                      const m = PLAN_META[p]
                      return (
                        <button key={p}
                          onClick={() => onModalChange(v => ({ ...v, plan: p }))}
                          className={cn(
                            "px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all text-left",
                            modalValues.plan === p
                              ? cn(m.bg, m.border, m.color)
                              : "border-white/[0.07] text-gray-500 hover:border-white/10"
                          )}>
                          {m.icon} {m.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Nota interna</label>
                  <input type="text"
                    value={modalValues.note}
                    onChange={e => onModalChange(v => ({ ...v, note: e.target.value }))}
                    placeholder="Ex: Compra curso avulso v3, Brinde evento..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50" />
                </div>
              </div>
            </InlineModal>
          )}

          {/* Inline modal: Change Role */}
          {modal === "role" && (
            <InlineModal title="Alterar Role" color="blue"
              onCancel={() => onOpenModal(null)}
              onConfirm={() => onAction("change_role", { role: modalValues.role })}
              loading={actionLoading}>
              <div className="grid grid-cols-3 gap-1.5">
                {["USER","RESEARCHER","ADMIN"].map(r => {
                  const rm = ROLE_META[r]
                  return (
                    <button key={r}
                      onClick={() => onModalChange(v => ({ ...v, role: r }))}
                      className={cn(
                        "px-2 py-2 rounded-lg border text-[11px] font-semibold transition-all",
                        modalValues.role === r
                          ? cn("bg-blue-500/15 border-blue-500/30", rm.color)
                          : "border-white/[0.07] text-gray-500 hover:border-white/10"
                      )}>
                      {rm.label}
                    </button>
                  )
                })}
              </div>
            </InlineModal>
          )}

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Créditos",   value: fmt(user.creditBalance?.balance ?? 0), sub: `gastos: ${fmt(user.creditBalance?.totalSpent ?? 0)}` },
              { label: "Pipelines",  value: String(user._count.pipelineProjects), sub: `protocolos: ${user._count.protocols}` },
              { label: "Chats IA",   value: String(user._count.chatSessions), sub: `notebook: ${user._count.notebookEntries}` },
              { label: "Instituição",value: user.institution?.slice(0, 16) ?? "—", sub: user.researchArea?.slice(0, 16) ?? "" },
            ].map((s, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5">
                <div className="text-sm font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-gray-500">{s.label}</div>
                <div className="text-[10px] text-gray-600">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Datas */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Cadastro:</span>
              <span className="text-gray-400">{fmtDate(user.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Último login:</span>
              <span className="text-gray-400">{fmtDate(user.lastLogin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Plano expira:</span>
              <span className="text-gray-400">{fmtDate(user.subscription?.currentPeriodEnd ?? null)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ID Ext. (stripe):</span>
              <span className="text-gray-400 font-mono text-[10px]">{user.subscription?.externalId ?? "—"}</span>
            </div>
          </div>

          {/* Histórico de créditos */}
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              <span className="text-xs text-gray-600">Carregando histórico...</span>
            </div>
          ) : detail ? (
            <div>
              <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3 text-violet-400" /> Histórico de Créditos
              </h4>
              <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-none">
                {(detail.creditHistory as { id: string; type: string; amount: number; balance: number; description: string; createdAt: string }[]).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-1 border-b border-white/[0.04] text-[11px]">
                    <span className={cn("font-mono font-bold w-12",
                      txn.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {txn.type === "CREDIT" ? "+" : "-"}{txn.amount}
                    </span>
                    <span className="text-gray-500 flex-1 truncate px-2">{txn.description}</span>
                    <span className="text-gray-600 shrink-0">{timeAgo(txn.createdAt)}</span>
                  </div>
                ))}
                {(detail.creditHistory as unknown[]).length === 0 && (
                  <p className="text-[11px] text-gray-600 py-2">Sem histórico</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── Inline Modal ──────────────────────────────────────────────────────────────
function InlineModal({ title, color, children, onCancel, onConfirm, loading }: {
  title: string; color: string; children: React.ReactNode
  onCancel: () => void; onConfirm: () => void; loading: boolean
}) {
  const c = {
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber:   "border-amber-500/20 bg-amber-500/5",
    blue:    "border-blue-500/20 bg-blue-500/5",
  }[color] ?? "border-white/[0.08] bg-white/[0.03]"

  const btn = {
    emerald: "bg-emerald-600 hover:bg-emerald-500",
    amber:   "bg-amber-600 hover:bg-amber-500",
    blue:    "bg-blue-600 hover:bg-blue-500",
  }[color] ?? "bg-violet-600"

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", c)}>
      <div className="text-xs font-bold text-white">{title}</div>
      {children}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-xs text-gray-400 hover:bg-white/[0.08] transition-all">
          Cancelar
        </button>
        <button onClick={onConfirm} disabled={loading}
          className={cn("flex-1 py-2 rounded-xl text-xs text-white font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50", btn)}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Confirmar
        </button>
      </div>
    </div>
  )
}

// ── Credits Tab ───────────────────────────────────────────────────────────────
function CreditsTab({ stats, statsLoading }: { stats: StatsData | null; statsLoading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Emitido", value: fmt(stats?.credits.totalIssued ?? 0), color: "emerald", icon: ArrowUpRight },
          { label: "Total Consumido", value: fmt(stats?.credits.totalSpent ?? 0), color: "rose", icon: ArrowDownRight },
          { label: "Emitido este mês", value: fmt(stats?.credits.issuedThisMonth ?? 0), color: "blue", icon: TrendingUp },
        ].map((c, i) => (
          <div key={i} className={cn(
            "rounded-2xl p-4 border",
            c.color === "emerald" && "bg-emerald-500/8 border-emerald-500/15",
            c.color === "rose"    && "bg-rose-500/8 border-rose-500/15",
            c.color === "blue"   && "bg-blue-500/8 border-blue-500/15",
          )}>
            <c.icon className={cn("w-4 h-4 mb-2",
              c.color === "emerald" && "text-emerald-400",
              c.color === "rose"    && "text-rose-400",
              c.color === "blue"   && "text-blue-400",
            )} />
            {statsLoading
              ? <div className="h-7 w-24 bg-white/[0.08] rounded animate-pulse mb-1" />
              : <div className="text-2xl font-bold text-white">{c.value}</div>
            }
            <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" /> Fluxo de Créditos (últimas transações)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-white/[0.06]">
                <th className="text-left pb-2 font-medium">Usuário</th>
                <th className="text-left pb-2 font-medium">Tipo</th>
                <th className="text-right pb-2 font-medium">Qtd</th>
                <th className="text-right pb-2 font-medium">Saldo Após</th>
                <th className="text-left pb-2 font-medium pl-3">Descrição</th>
                <th className="text-right pb-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {(stats?.recentTransactions ?? []).map(txn => (
                <tr key={txn.id} className="hover:bg-white/[0.02]">
                  <td className="py-2">
                    <div className="text-gray-300">{txn.user?.name ?? "—"}</div>
                    <div className="text-[10px] text-gray-600">{txn.user?.email}</div>
                  </td>
                  <td className="py-2">
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                      txn.type === "CREDIT" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    )}>
                      {txn.type}
                    </span>
                  </td>
                  <td className={cn("py-2 text-right font-mono font-bold",
                    txn.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {txn.type === "CREDIT" ? "+" : "-"}{txn.amount}
                  </td>
                  <td className="py-2 text-right font-mono text-gray-400">{txn.balance}</td>
                  <td className="py-2 pl-3 text-gray-500 max-w-[220px] truncate">{txn.description}</td>
                  <td className="py-2 text-right text-gray-600">{fmtDate(txn.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Audit Tab ─────────────────────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs]       = useState<{ id: string; action: string; entity: string | null; metadata: unknown; ip: string | null; createdAt: string; userId: string | null; user: { name: string | null; email: string } | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [filterAction, setFilterAction] = useState("")

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: "30", action: filterAction })
      const r = await fetch(`/api/admin/audit?${params}`)
      if (r.ok) {
        const data = await r.json()
        setLogs(data.logs)
        setTotal(data.pagination.total)
        setPage(p)
      }
    } finally {
      setLoading(false)
    }
  }, [filterAction])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const ACTION_COLORS: Record<string, string> = {
    user_login:            "text-blue-400 bg-blue-500/10",
    admin_add_credits:     "text-emerald-400 bg-emerald-500/10",
    admin_upgrade_plan:    "text-amber-400 bg-amber-500/10",
    admin_change_role:     "text-violet-400 bg-violet-500/10",
    admin_change_status:   "text-rose-400 bg-rose-500/10",
    admin_update_profile:  "text-cyan-400 bg-cyan-500/10",
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={filterAction} onChange={e => setFilterAction(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchLogs(1)}
            placeholder="Filtrar por ação (ex: admin_add_credits)..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/40" />
        </div>
        <button onClick={() => fetchLogs(1)}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 border border-amber-500/25 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-500/25 transition-all">
          <Filter className="w-3.5 h-3.5" /> Filtrar
        </button>
      </div>

      <div className="text-xs text-gray-500">{fmt(total)} registros de auditoria</div>

      <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/[0.03] text-gray-500 border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 font-medium">Usuário</th>
                  <th className="text-left px-3 py-3 font-medium">Ação</th>
                  <th className="text-left px-3 py-3 font-medium">Entidade</th>
                  <th className="text-left px-3 py-3 font-medium">Metadata</th>
                  <th className="text-right px-3 py-3 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <div className="text-gray-300">{log.user?.name ?? "Sistema"}</div>
                      <div className="text-[10px] text-gray-600">{log.user?.email ?? log.userId ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", ACTION_COLORS[log.action] ?? "text-gray-400 bg-white/[0.05]")}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{log.entity ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[200px]">
                      <div className="truncate font-mono text-[10px]">
                        {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) + "…" : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{fmtDate(log.createdAt)}</td>
                  </tr>
                ))}
                {logs.length === 0 && !loading && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-600">Nenhum log encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg disabled:opacity-30 hover:bg-white/[0.07] transition-all">
          ← Anterior
        </button>
        <span>Página {page}</span>
        <button onClick={() => fetchLogs(page + 1)} disabled={logs.length < 30}
          className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg disabled:opacity-30 hover:bg-white/[0.07] transition-all">
          Próxima →
        </button>
      </div>
    </div>
  )
}

// fix unused import warning
const _unused = { MoreVertical, Edit2, Star, AlertTriangle, CheckCircle2, Clock, BookOpen }
void _unused
