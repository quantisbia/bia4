import { auth } from "@/lib/auth/config"
import { getUserStats } from "@/lib/db/queries"
import { redirect } from "next/navigation"
import {
  TrendingUp, Zap, GitBranch, FlaskConical,
  MessageSquare, BookOpen, ArrowRight, Activity,
  Clock, CheckCircle2, AlertCircle, CircleDot, FileText, Printer, Microscope, Box
} from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

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
    stats.credits = session.user.credits ?? stats.credits
  } catch { /* fallback */ }

  const userName = session.user.name?.split(" ")[0] ?? "Pesquisador"
  const plan = (session.user.plan as string) ?? "FREE"

  const planColors: Record<string, string> = {
    FREE:       "text-gray-400 bg-gray-500/10 border-gray-500/20",
    DISCOVERY:  "text-violet-400 bg-violet-500/10 border-violet-500/20",
    ADVANCED:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
    ENTERPRISE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    ACADEMY:    "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  }

  const quickActions = [
    { title: "Novo Pipeline",        desc: "Design de tecido",       href: "/dashboard/pipeline",      icon: GitBranch,    color: "violet" },
    { title: "Formular Biomaterial", desc: "Buscar formulação",      href: "/dashboard/biomaterials",  icon: FlaskConical, color: "blue"   },
    { title: "Bioimpressão 3D",      desc: "STL · GCode · Reologia", href: "/dashboard/bioprinting",   icon: Printer,      color: "indigo" },
    { title: "Organoid Builder",     desc: "Design de organoide",    href: "/dashboard/organoids",     icon: CircleDot,    color: "purple" },
    { title: "Protocolos GLP/GMP",   desc: "Protocolo laboratorial", href: "/dashboard/protocols",     icon: FileText,     color: "violet" },
    { title: "Análises & Dossiês",   desc: "Molecular, celular, FDA",href: "/dashboard/analyses",      icon: Microscope,   color: "rose"   },
    { title: "Chat com IA",          desc: "Dúvidas científicas",    href: "/dashboard/chat",          icon: MessageSquare,color: "indigo" },
    { title: "Gerador STL/OBJ",      desc: "12 geometrias 3D",        href: "/dashboard/stl",           icon: Box,          color: "violet" },
    { title: "Base de Conhecimento", desc: "Pesquisar artigos",      href: "/dashboard/knowledge",     icon: BookOpen,     color: "blue"   },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
            Olá, {userName}! 👋
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Bem-vindo à plataforma BIA v4
          </p>
        </div>
        <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs font-semibold shrink-0 ${planColors[plan] ?? planColors.FREE}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          {plan}
        </div>
      </div>

      {/* Stats — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Créditos",   value: stats.credits.toLocaleString("pt-BR"), icon: Zap,          color: "violet", sub: `${stats.creditsSpent} gastos` },
          { label: "Pipelines",  value: stats.pipelineCount.toString(),         icon: GitBranch,    color: "blue",   sub: "projetos" },
          { label: "Chats IA",   value: stats.chatCount.toString(),             icon: MessageSquare,color: "purple", sub: "conversas" },
          { label: "Protocolos", value: stats.protocolCount.toString(),         icon: FlaskConical, color: "indigo", sub: "gerados" },
        ].map((stat) => (
          <div key={stat.label}
            className="bg-white/2 border border-white/8 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${stat.color}-400`} />
              </div>
              <TrendingUp className="w-3.5 h-3.5 text-gray-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className={`text-xs text-${stat.color}-400 mt-1`}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions grid — 2 cols mobile, 3 cols md */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}
              className="flex flex-col gap-3 p-4 rounded-xl bg-white/2 border border-white/8 hover:border-violet-500/20 hover:bg-violet-500/3 transition-all group active:scale-[0.98]">
              <div className={`w-9 h-9 rounded-xl bg-${action.color}-500/10 border border-${action.color}-500/20 flex items-center justify-center shrink-0`}>
                <action.icon className={`w-4 h-4 text-${action.color}-400`} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-white leading-tight">{action.title}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Atividade Recente
        </h2>
        <div className="bg-white/2 border border-white/8 rounded-xl sm:rounded-2xl divide-y divide-white/5">
          {stats.recentTransactions.length > 0 ? (
            stats.recentTransactions.map((txn, i) => (
              <div key={i} className="flex items-center gap-3 p-4 hover:bg-white/2 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  txn.type === "CREDIT"
                    ? "bg-violet-500/10 border border-violet-500/20"
                    : "bg-blue-500/10 border border-blue-500/20"
                }`}>
                  {txn.type === "CREDIT"
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                    : <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-200 truncate">{txn.description}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <span className="text-[10px] text-gray-500">
                      {new Date(txn.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${txn.type === "CREDIT" ? "text-violet-400" : "text-red-400"}`}>
                  {txn.type === "CREDIT" ? "+" : ""}{txn.amount}
                </span>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <Activity className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhuma atividade ainda</p>
              <p className="text-xs text-gray-600 mt-1">Use os módulos para começar</p>
            </div>
          )}
        </div>
      </div>

      {/* Getting started banner */}
      {stats.pipelineCount === 0 && (
        <div className="relative rounded-xl sm:rounded-2xl border border-violet-500/15 bg-violet-500/3 p-5 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                🚀 Comece seu primeiro projeto
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Use o Pipeline de Design para criar seu primeiro projeto com IA.
              </p>
            </div>
            <Link href="/dashboard/pipeline"
              className="bia-button-primary flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm shrink-0 w-full sm:w-auto justify-center">
              Criar Pipeline <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
