import Link from "next/link"
import { Home, Search, ArrowLeft } from "lucide-react"
import { FloatingThemeLocale } from "@/components/ui/FloatingThemeLocale"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0514] flex items-center justify-center px-4">
      <FloatingThemeLocale position="top-right" />
      <div className="text-center space-y-6 max-w-md mx-auto animate-fadeIn">
        {/* 404 number with glow */}
        <div className="relative">
          <div className="text-[120px] sm:text-[160px] font-bold leading-none bia-gradient-text opacity-20 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Search className="w-10 h-10 text-violet-400" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Página não encontrada</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            A página que você procura não existe ou foi movida. 
            Verifique o URL ou volte ao dashboard.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/40 active:scale-[0.97] w-full sm:w-auto justify-center"
          >
            <Home className="w-4 h-4" />
            Ir ao Dashboard
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/[0.05] text-sm font-medium transition-all w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Página inicial
          </Link>
        </div>
      </div>
    </div>
  )
}
