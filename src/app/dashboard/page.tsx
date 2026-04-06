import { 
  TrendingUp, 
  Zap, 
  GitBranch, 
  FlaskConical, 
  MessageSquare, 
  BookOpen,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

export default function DashboardPage() {
  const stats = [
    { label: "Créditos disponíveis", value: "500", icon: Zap, color: "emerald", change: "100% do plano" },
    { label: "Projetos ativos", value: "3", icon: GitBranch, color: "blue", change: "+1 esta semana" },
    { label: "Formulações geradas", value: "12", icon: FlaskConical, color: "purple", change: "este mês" },
    { label: "Mensagens de chat", value: "47", icon: MessageSquare, color: "teal", change: "com IA" },
  ]

  const recentActivity = [
    { type: "pipeline", desc: "Pipeline 'Cartilagem Hialina' - Etapa 4 concluída", time: "2h atrás", status: "success" },
    { type: "formulation", desc: "Nova formulação de Gelatin Methacryloyl gerada", time: "5h atrás", status: "success" },
    { type: "chat", desc: "Consulta sobre biocompatibilidade de PLGA", time: "1d atrás", status: "info" },
    { type: "protocol", desc: "Protocolo de cultura 3D exportado", time: "2d atrás", status: "success" },
    { type: "knowledge", desc: "3 artigos adicionados à base de conhecimento", time: "3d atrás", status: "info" },
  ]

  const quickActions = [
    { 
      title: "Novo Pipeline", 
      desc: "Iniciar design de tecido", 
      href: "/dashboard/pipeline",
      icon: GitBranch,
      color: "emerald"
    },
    { 
      title: "Formular Biomaterial", 
      desc: "Buscar formulação ideal", 
      href: "/dashboard/biomaterials",
      icon: FlaskConical,
      color: "blue"
    },
    { 
      title: "Chat com IA", 
      desc: "Tire dúvidas científicas", 
      href: "/dashboard/chat",
      icon: MessageSquare,
      color: "purple"
    },
    { 
      title: "Base de Conhecimento", 
      desc: "Pesquisar artigos", 
      href: "/dashboard/knowledge",
      icon: BookOpen,
      color: "amber"
    },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Bom dia, Pesquisador! 👋
          </h1>
          <p className="text-gray-400 text-sm">
            Aqui está o resumo das suas atividades em BIA v3
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-emerald-400 font-medium">Discovery Plan</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/2 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 border border-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-xs text-gray-400 leading-tight">{stat.label}</div>
            <div className={`text-xs text-${stat.color}-400 mt-2`}>{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <a
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
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Atividade Recente</h2>
          <div className="bg-white/2 border border-white/8 rounded-2xl divide-y divide-white/5">
            {recentActivity.map((item, index) => (
              <div key={index} className="flex items-start gap-4 p-4 hover:bg-white/2 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  item.status === "success" 
                    ? "bg-emerald-500/10 border border-emerald-500/20" 
                    : "bg-blue-500/10 border border-blue-500/20"
                }`}>
                  {item.status === "success" 
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <AlertCircle className="w-4 h-4 text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{item.desc}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-gray-600" />
                    <span className="text-xs text-gray-500">{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Progress Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Pipelines em Andamento</h2>
          <a href="/dashboard/pipeline" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: "Cartilagem Hialina", stage: 4, total: 12, status: "in_progress" },
            { name: "Pele Dérmico-Epidérmica", stage: 7, total: 12, status: "in_progress" },
            { name: "Cornea Artificial", stage: 2, total: 12, status: "draft" },
          ].map((project) => (
            <div key={project.name} className="bg-white/2 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-white">{project.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Etapa {project.stage} de {project.total}
                  </p>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${
                  project.status === "in_progress" ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                }`} />
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                  style={{ width: `${(project.stage / project.total) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{Math.round((project.stage / project.total) * 100)}% completo</span>
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span className="text-xs text-emerald-400">
                    {project.status === "in_progress" ? "Ativo" : "Rascunho"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
