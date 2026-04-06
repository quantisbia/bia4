import { auth } from "@/lib/auth/config"
import { getUserStats } from "@/lib/db/queries"
import { redirect } from "next/navigation"
import {
  TrendingUp, Zap, GitBranch, FlaskConical,
  MessageSquare, BookOpen, ArrowRight, Activity,
  Clock, CheckCircle2, AlertCircle
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  // Try to get real stats, fallback to defaults if DB not connected
  let stats = {
    credits: session.user.credits ?? 0,
    creditsSpent: 0,
    pipelineCount: 0,
    chatCount: 0,
    protocolCount: 0,
    recentTransactions: [] as { type: string; description: string; amount: number; createdAt: Date }[],
  }

  try {
    stats = await getUserStats(session.user.id)
    // override credits from session (more fresh)
    stats.credits = session.user.credits ?? stats.credits
  } catch {
    // DB not connected yet — show defaults
  }

  const userName = session.user.name?.split(" ")[0] ?? "Pesquisador"
  const plan = (session.user.plan as string) ?? "FREE"

  const planColors: Record<string, string> = {
    FREE: "text-gray-400 bg-gray-500/10 border-gray-500/20",
    DISCOVERY: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    ADVANCED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    ENTERPRISE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    ACADEMY: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  }

  const quickActions = [
    { title: "Novo Pipeline", desc: "Iniciar design de tecido", href: "/dashboard/pipeline", icon: GitBranch, color: "emerald" },
    { title: "Formular Biomaterial", desc: "Buscar formulação ideal", href: "/dashboard/biomaterials", icon: FlaskConical, color: "blue" },
    { title: "Chat com IA", desc: "Tire dúvidas científicas", href: "/dashboard/chat", icon: MessageSquare, color: "purple" },
    { title: "Base de Conhecimento", desc: "Pesquisar artigos", href: "/dashboard/knowledge", icon: BookOpen, color: "amber" },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Olá, {userName}! 👋
          </h1>
          <p className="text-gray-400 text-sm">
            Bem-vindo à plataforma BIA v3 — sua IA para biofabricação
          </p>
        </div>
        <div className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-semibold ${planColors[plan] ?? planColors.FREE}`}>
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {plan} Plan
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Créditos disponíveis", value: stats.credits.toLocaleString("pt-BR"), icon: Zap, color: "emerald", sub: `${stats.creditsSpent} gastos` },
          { label: "Projetos pipeline", value: stats.pipelineCount.toString(), icon: GitBranch, color: "blue", sub: "projetos" },
          { label: "Sessões de chat", value: stats.chatCount.toString(), icon: MessageSquare, color: "purple", sub: "conversas" },
          { label: "Protocolos gerados", value: stats.protocolCount.toString(), icon: FlaskConical, color: "teal", sub: "protocolos" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/2 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
              <TrendingUp className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className={`text-xs text-${stat.color}-400 mt-1.5`}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Ações Rápidas</h2>
          <div className="space-y-2.5">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/2 border border-white/8 hover:border-emerald-500/20 hover:bg-emerald-500/3 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-${action.color}-500/10 border border-${action.color}-500/20 flex items-center justify-center shrink-0`}>
                  <action.icon className={`w-5 h-5 text-${action.color}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{action.title}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Atividade Recente</h2>
          <div className="bg-white/2 border border-white/8 rounded-2xl divide-y divide-white/5">
            {stats.recentTransactions.length > 0 ? (
              stats.recentTransactions.map((txn, i) => (
                <div key={i} className="flex items-start gap-4 p-4 hover:bg-white/2 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    txn.type === "CREDIT"
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-blue-500/10 border border-blue-500/20"
                  }`}>
                    {txn.type === "CREDIT"
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <AlertCircle className="w-4 h-4 text-blue-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{txn.description}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-gray-600" />
                      <span className="text-xs text-gray-500">
                        {new Date(txn.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${txn.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                    {txn.type === "CREDIT" ? "+" : ""}{txn.amount}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-16 text-center">
                <Activity className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Nenhuma atividade ainda</p>
                <p className="text-xs text-gray-600 mt-1">
                  Comece usando os módulos da plataforma
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Getting Started (shown when user is new) */}
      {stats.pipelineCount === 0 && (
        <div className="relative rounded-2xl border border-emerald-500/15 bg-emerald-500/3 p-6 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                🚀 Comece seu primeiro projeto
              </h3>
              <p className="text-sm text-gray-400">
                Use o Pipeline de Design para criar seu primeiro projeto de engenharia de tecidos assistido por IA.
              </p>
            </div>
            <Link
              href="/dashboard/pipeline"
              className="bia-button-primary flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm"
            >
              Criar Pipeline <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
