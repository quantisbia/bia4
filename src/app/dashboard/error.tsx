"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Dashboard Error Boundary (R12.17)
 *  ───────────────────────────────────────────────────────────────────────
 *  Boundary global das rotas /dashboard/*. Anteriormente escondia a mensagem
 *  do erro em produção, deixando o usuário sem nenhuma pista do que falhou.
 *
 *  R12.17 — mudanças importantes:
 *    • Mensagem do erro SEMPRE visível (não só em dev).
 *    • Caixa expansível com stack trace para suporte técnico.
 *    • Botão "Tentar novamente" agora usa reset() do Next + window.location.reload()
 *      como fallback, porque reset() sozinho não desmonta os módulos que
 *      tiverem quebrado em tempo de import (ex.: TDZ em hooks).
 *    • Botão "Copiar diagnóstico" para o usuário enviar ao suporte.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react"
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp, RotateCw, Check } from "lucide-react"
import Link from "next/link"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Log estruturado pro console (útil quando o usuário abre DevTools)
    // eslint-disable-next-line no-console
    console.error("[BIA Error Boundary]", {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      route: typeof window !== "undefined" ? window.location.pathname : "?",
    })
  }, [error])

  // Diagnóstico textual (copiável)
  const diagnostic = [
    `BIA · Diagnóstico de Erro`,
    `Data: ${new Date().toISOString()}`,
    `Rota: ${typeof window !== "undefined" ? window.location.pathname : "?"}`,
    `Erro: ${error.name}: ${error.message}`,
    error.digest ? `Ref: ${error.digest}` : "",
    "",
    "Stack trace:",
    error.stack ?? "(sem stack)",
  ].filter(Boolean).join("\n")

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(diagnostic)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: seleciona o texto
      // eslint-disable-next-line no-alert
      alert("Não foi possível copiar — copie manualmente o texto da caixa de detalhes.")
    }
  }

  // Hard reload: alguns erros (especialmente de import / TDZ) precisam de
  // reload completo porque reset() não destrói o módulo já carregado.
  const handleHardReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  // Try soft first, hard as fallback after 800 ms se nada acontecer
  const handleSoftRetry = () => {
    try {
      reset()
      // Se o erro voltar imediatamente (TDZ etc.), reset() vai disparar de
      // novo. Damos 800 ms e fazemos hard reload se nada se renderizou.
      setTimeout(() => {
        if (typeof window !== "undefined") {
          // Se ainda estamos nesta página de erro depois de 800 ms,
          // provavelmente o reset não funcionou — força reload completo.
          const errEl = document.querySelector("[data-bia-error-root]")
          if (errEl) window.location.reload()
        }
      }, 800)
    } catch {
      handleHardReload()
    }
  }

  return (
    <div
      data-bia-error-root
      className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full flex items-center justify-center min-h-[60vh]"
    >
      <div className="text-center space-y-5 animate-fadeIn w-full">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        {/* Message */}
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Algo deu errado neste módulo</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            Capturamos o erro e você pode tentar de novo, recarregar a página por completo
            ou enviar o diagnóstico ao suporte.
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-600 mt-2 font-mono">
              Ref: {error.digest}
            </p>
          )}
        </div>

        {/* Caixa do erro — SEMPRE visível (não só em dev) */}
        <div className="bg-red-500/[0.05] border border-red-500/20 rounded-xl p-4 text-left max-w-2xl mx-auto">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-[10px] text-red-300 font-semibold uppercase tracking-wider shrink-0 mt-0.5">
              {error.name || "Error"}
            </span>
            <p className="text-xs text-red-100 font-mono break-words leading-relaxed flex-1">
              {error.message || "(sem mensagem)"}
            </p>
          </div>

          {/* Stack trace expansível */}
          {error.stack && (
            <>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-[10px] text-red-300/70 hover:text-red-200 flex items-center gap-1 transition-colors mt-1"
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? "Ocultar stack trace" : "Ver stack trace (para suporte)"}
              </button>
              {showDetails && (
                <pre className="mt-2 max-h-48 overflow-auto bg-black/40 rounded-md p-2 text-[10px] text-red-200/70 font-mono leading-relaxed whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 flex-wrap">
          <button
            onClick={handleSoftRetry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-900/40 active:scale-[0.97]"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
          <button
            onClick={handleHardReload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all shadow-lg shadow-cyan-900/40 active:scale-[0.97]"
            title="Recarrega a página inteira — recomendado se 'Tentar novamente' não resolver"
          >
            <RotateCw className="w-4 h-4" />
            Recarregar página
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-gray-200 hover:bg-white/[0.05] text-sm font-medium transition-all"
            title="Copia mensagem + stack trace para enviar ao suporte"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar diagnóstico"}
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/[0.05] text-sm font-medium transition-all"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        {/* Support hint */}
        <p className="text-[11px] text-gray-600 pt-3">
          Se o problema persistir, copie o diagnóstico acima e envie ao suporte Quantis.
        </p>
      </div>
    </div>
  )
}
