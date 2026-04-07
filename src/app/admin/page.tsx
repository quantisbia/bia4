"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Users, Activity, Zap, GitBranch, MessageSquare,
  FlaskConical, TrendingUp, Crown,
  Search, RefreshCw, Shield,
  BarChart3, AlertTriangle, CheckCircle,
  X, Edit3,
} from "lucide-react"

interface OverviewData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalPipelines: number
    totalChats: number
    totalProtocols: number
    totalCreditsSpent: number
  }
  planDistribution: { plan: string; _count: { plan: number } }[]
  recentUsers: {
    id: string
    name: string | null
    email: string
    role: string
    createdAt: string
    subscription: { plan: string; status: string } | null
    creditBalance: { balance: number } | null
    _count: { pipelineProjects: number; chatSessions: number; protocols: number }
  }[]
  recentActivity: {
    id: string
    action: string
    entity: string | null
    metadata: Record<string, unknown> | null
    createdAt: string
    userId: string | null
  }[]
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  DISCOVERY: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  ADVANCED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  ENTERPRISE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  ACADEMY: "text-amber-400 bg-amber-500/10 border-amber-500/20",
}

const ROLE_COLORS: Record<string, string> = {
  USER: "text-gray-400 bg-gray-500/10",
  ADMIN: "text-red-400 bg-red-500/10",
  RESEARCHER: "text-green-400 bg-green-500/10",
}

interface UserEditModal {
  userId: string
  userName: string
  currentPlan: string
  currentRole: string
}

export default function AdminDashboardPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity">("overview")
  const [search, setSearch] = useState("")
  const [users, setUsers] = useState<OverviewData["recentUsers"]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [editModal, setEditModal] = useState<UserEditModal | null>(null)
  const [editForm, setEditForm] = useState({ role: "", plan: "", addCredits: 0, note: "" })
  const [saving, setSaving] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    fetchOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status])

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Auto-setup: garante que o admin tem plano ACADEMY + 20k créditos
  const handleAutoSetup = async () => {
    setSetupLoading(true)
    try {
      const res = await fetch("/api/admin/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ensure_admin_setup" }),
      })
      if (res.ok) {
        await update() // Força refresh do JWT
        showToast("✅ Admin configurado: ACADEMY + 20.000 créditos!", "success")
        fetchOverview()
      } else {
        showToast("Erro no setup automático", "error")
      }
    } catch {
      showToast("Erro de conexão", "error")
    } finally {
      setSetupLoading(false)
    }
  }

  const fetchOverview = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/stats?type=overview")
      const json = await res.json()
      setData(json)
    } catch {
      showToast("Erro ao carregar dados", "error")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (searchQuery = "") => {
    setUsersLoading(true)
    try {
      const res = await fetch(`/api/admin/stats?type=users&search=${encodeURIComponent(searchQuery)}`)
      const json = await res.json()
      setUsers(json.users ?? [])
    } catch {
      showToast("Erro ao buscar usuários", "error")
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers(search)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(search)
  }

  const openEditModal = (user: OverviewData["recentUsers"][0]) => {
    setEditModal({
      userId: user.id,
      userName: user.name ?? user.email,
      currentPlan: user.subscription?.plan ?? "FREE",
      currentRole: user.role,
    })
    setEditForm({
      role: user.role,
      plan: user.subscription?.plan ?? "FREE",
      addCredits: 0,
      note: "",
    })
  }

  const handleSaveUser = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (editForm.role !== editModal.currentRole) body.role = editForm.role
      if (editForm.plan !== editModal.currentPlan) body.plan = editForm.plan
      if (editForm.addCredits > 0) {
        body.addCredits = editForm.addCredits
        body.note = editForm.note || "Créditos adicionados pelo admin"
      }

      const res = await fetch(`/api/admin/users/${editModal.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        showToast(`Usuário ${editModal.userName} atualizado com sucesso!`)
        setEditModal(null)
        fetchOverview()
        if (activeTab === "users") fetchUsers(search)
      } else {
        showToast("Erro ao atualizar usuário", "error")
      }
    } catch {
      showToast("Erro de conexão", "error")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0d0118] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-gray-400 text-sm">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  const stats = data?.overview
  const planDist = data?.planDistribution ?? []
  const planTotal = planDist.reduce((sum, p) => sum + p._count.plan, 0)

  return (
    <div className="min-h-screen bg-[#0d0118] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 ${
          toast.type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/8 bg-[#0d0118]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">BIA Admin</h1>
              <p className="text-xs text-gray-500">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {session?.user?.email}
            </span>
            <button
              onClick={handleAutoSetup}
              disabled={setupLoading}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-50"
              title="Garante plano ACADEMY + 20.000 créditos para o admin"
            >
              {setupLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Auto-Setup
            </button>
            <button
              onClick={fetchOverview}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/15"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors px-3 py-1.5 rounded-lg border border-violet-500/20 hover:border-violet-500/40"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Usuários", value: stats?.totalUsers ?? 0, icon: Users, color: "violet", sub: `+${stats?.activeUsers ?? 0} este mês` },
            { label: "Pipelines", value: stats?.totalPipelines ?? 0, icon: GitBranch, color: "blue", sub: "projetos criados" },
            { label: "Chats", value: stats?.totalChats ?? 0, icon: MessageSquare, color: "purple", sub: "sessões" },
            { label: "Protocolos", value: stats?.totalProtocols ?? 0, icon: FlaskConical, color: "indigo", sub: "gerados" },
            { label: "Créditos Usados", value: (stats?.totalCreditsSpent ?? 0).toLocaleString("pt-BR"), icon: Zap, color: "amber", sub: "total consumido" },
            { label: "Planos Ativos", value: planTotal, icon: Crown, color: "green", sub: "assinantes" },
          ].map((card) => (
            <div key={card.label} className="bg-white/2 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-colors">
              <div className={`w-8 h-8 rounded-lg bg-${card.color}-500/10 border border-${card.color}-500/20 flex items-center justify-center mb-3`}>
                <card.icon className={`w-4 h-4 text-${card.color}-400`} />
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
              <div className={`text-xs text-${card.color}-400 mt-1`}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Plan Distribution */}
        <div className="bg-white/2 border border-white/8 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            Distribuição de Planos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["FREE", "DISCOVERY", "ADVANCED", "ENTERPRISE", "ACADEMY"].map((plan) => {
              const found = planDist.find((p) => p.plan === plan)
              const count = found?._count.plan ?? 0
              const pct = planTotal > 0 ? Math.round((count / planTotal) * 100) : 0
              return (
                <div key={plan} className={`p-3 rounded-xl border ${PLAN_COLORS[plan]}`}>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs font-medium">{plan}</div>
                  <div className="text-xs opacity-70">{pct}% do total</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {[
            { id: "overview", label: "Visão Geral", icon: TrendingUp },
            { id: "users", label: "Usuários", icon: Users },
            { id: "activity", label: "Atividade", icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-violet-500 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview — Recent Users */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                Usuários Recentes (últimos 10)
              </h2>
              <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-gray-500 text-xs uppercase">
                      <th className="text-left p-4">Usuário</th>
                      <th className="text-left p-4">Plano</th>
                      <th className="text-left p-4">Créditos</th>
                      <th className="text-left p-4">Atividade</th>
                      <th className="text-left p-4">Cadastro</th>
                      <th className="text-left p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(data?.recentUsers ?? []).map((user) => (
                      <tr key={user.id} className="hover:bg-white/2 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-semibold text-violet-300">
                              {(user.name ?? user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-200">{user.name ?? "—"}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${PLAN_COLORS[user.subscription?.plan ?? "FREE"]}`}>
                            {user.subscription?.plan ?? "FREE"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-violet-400 font-semibold">
                            {user.creditBalance?.balance?.toLocaleString("pt-BR") ?? 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span title="Pipelines"><GitBranch className="w-3.5 h-3.5 inline mr-0.5" />{user._count.pipelineProjects}</span>
                            <span title="Chats"><MessageSquare className="w-3.5 h-3.5 inline mr-0.5" />{user._count.chatSessions}</span>
                            <span title="Protocolos"><FlaskConical className="w-3.5 h-3.5 inline mr-0.5" />{user._count.protocols}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => openEditModal(user)}
                            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg border border-violet-500/20 hover:border-violet-500/40"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Auditoria Recente (20 últimas ações)
              </h2>
              <div className="bg-white/2 border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
                {(data?.recentActivity ?? []).slice(0, 20).map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-white/2 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 font-medium">{log.action}</p>
                      <p className="text-xs text-gray-500">
                        {log.entity && <span className="mr-2 text-gray-400">/{log.entity}</span>}
                        {log.userId && <span className="text-gray-600">userId: {log.userId.slice(0, 8)}...</span>}
                      </p>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Users */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-violet-500/40">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou instituição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium transition-colors">
                Buscar
              </button>
            </form>

            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              </div>
            ) : (
              <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-gray-500 text-xs uppercase">
                      <th className="text-left p-4">Usuário</th>
                      <th className="text-left p-4">Role</th>
                      <th className="text-left p-4">Plano</th>
                      <th className="text-left p-4">Créditos</th>
                      <th className="text-left p-4">Atividade</th>
                      <th className="text-left p-4">Cadastro</th>
                      <th className="text-left p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-white/2 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-semibold text-violet-300">
                              {(user.name ?? user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-200">{user.name ?? "—"}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${PLAN_COLORS[user.subscription?.plan ?? "FREE"]}`}>
                            {user.subscription?.plan ?? "FREE"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-violet-400 font-semibold">
                            {user.creditBalance?.balance?.toLocaleString("pt-BR") ?? 0}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span><GitBranch className="w-3.5 h-3.5 inline mr-0.5" />{user._count.pipelineProjects}</span>
                            <span><MessageSquare className="w-3.5 h-3.5 inline mr-0.5" />{user._count.chatSessions}</span>
                            <span><FlaskConical className="w-3.5 h-3.5 inline mr-0.5" />{user._count.protocols}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => openEditModal(user)}
                            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg border border-violet-500/20 hover:border-violet-500/40 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-500 text-sm">
                          Nenhum usuário encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === "activity" && (
          <div className="bg-white/2 border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {(data?.recentActivity ?? []).map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-white/2 transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium">{log.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {log.entity && <span className="mr-2 text-gray-400 font-mono">/{log.entity}</span>}
                    {log.metadata && (
                      <span className="text-gray-600 font-mono text-xs">
                        {JSON.stringify(log.metadata ?? {}).slice(0, 80)}...
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {log.userId && `User: ${log.userId.slice(0, 8)}...`}
                  </p>
                </div>
                <span className="text-xs text-gray-600 shrink-0">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0d0118] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Editar Usuário</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editModal.userName}</p>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/40"
                >
                  <option value="USER">USER</option>
                  <option value="RESEARCHER">RESEARCHER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Plano de Assinatura</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/40"
                >
                  <option value="FREE">FREE (10 créditos)</option>
                  <option value="DISCOVERY">DISCOVERY (500 créditos)</option>
                  <option value="ADVANCED">ADVANCED (1.500 créditos)</option>
                  <option value="ENTERPRISE">ENTERPRISE (5.000 créditos)</option>
                  <option value="ACADEMY">ACADEMY (20.000 créditos)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                  Adicionar Créditos Extras
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.addCredits}
                  onChange={(e) => setEditForm({ ...editForm, addCredits: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40"
                />
              </div>

              {editForm.addCredits > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Motivo</label>
                  <input
                    type="text"
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder="Ex: Créditos bônus por parceria"
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/40"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-sm text-gray-400 hover:border-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
