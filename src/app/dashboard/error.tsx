"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[BIA Error]", error)
  }, [error])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-5 animate-fadeIn">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        {/* Message */}
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            Ocorreu um erro inesperado ao carregar este módulo. 
            Tente novamente ou volte ao dashboard.
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-600 mt-2 font-mono">
              Ref: {error.digest}
            </p>
          )}
        </div>

        {/* Error details (dev only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-red-500/[0.05] border border-red-500/15 rounded-xl p-4 text-left max-w-md mx-auto">
            <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">
              Detalhes (dev)
            </p>
            <p className="text-xs text-red-300 font-mono break-all">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/40 active:scale-[0.97]"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/[0.05] text-sm font-medium transition-all"
          >
            <Home className="w-4 h-4" />
            Voltar ao Dashboard
          </Link>
        </div>

        {/* Support hint */}
        <p className="text-[11px] text-gray-600 pt-3">
          Se o problema persistir, entre em contato com o suporte Quantis.
        </p>
      </div>
    </div>
  )
}
