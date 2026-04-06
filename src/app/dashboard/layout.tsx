import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-[#030a04] overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar />
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

// Inline Sidebar Component
function DashboardSidebar() {
  const navItems = [
    { href: "/dashboard", label: "Visão Geral", icon: "LayoutDashboard" },
    { href: "/dashboard/pipeline", label: "Pipeline de Design", icon: "GitBranch" },
    { href: "/dashboard/biomaterials", label: "Formulador Bio", icon: "FlaskConical" },
    { href: "/dashboard/organoids", label: "Organoid Builder", icon: "CircleDashed" },
    { href: "/dashboard/protocols", label: "Protocolos", icon: "FileText" },
    { href: "/dashboard/knowledge", label: "Base de Conhecimento", icon: "BookOpen" },
    { href: "/dashboard/chat", label: "Chat IA", icon: "MessageSquare" },
  ]

  return (
    <aside className="w-64 border-r border-white/5 bg-black/20 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white text-xs font-bold">BIA</span>
          </div>
          <span className="font-semibold text-white">
            BIA <span className="text-emerald-400">v3</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bia-sidebar-item bia-sidebar-item-inactive group"
          >
            <span className="text-xs font-mono text-gray-600 group-hover:text-emerald-400/60">
              {String(navItems.indexOf(item) + 1).padStart(2, "0")}
            </span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/5 space-y-1">
        <a href="/dashboard/billing" className="bia-sidebar-item bia-sidebar-item-inactive">
          <span className="text-xs font-mono text-gray-600">08</span>
          <span>Assinatura</span>
        </a>
        <a href="/dashboard/settings" className="bia-sidebar-item bia-sidebar-item-inactive">
          <span className="text-xs font-mono text-gray-600">09</span>
          <span>Configurações</span>
        </a>

        {/* Credits */}
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Créditos</span>
            <span className="text-xs font-semibold text-emerald-400">500/500</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer group mt-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">Usuário Demo</p>
            <p className="text-xs text-gray-500 truncate">Discovery</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
