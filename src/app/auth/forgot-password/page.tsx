"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  /auth/forgot-password (R12.30)
 *  ─────────────────────────────────────────────────────────────────────
 *  Formulário simples: usuário digita email → POST /api/auth/forgot-password
 *  → tela de sucesso com instruções claras.
 *
 *  Se a infra de email não estiver configurada (resposta vier com
 *  `fallbackResetUrl`), exibimos o link direto na tela como fallback
 *  para o usuário conseguir prosseguir.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle, Loader2, ArrowRight, ArrowLeft, Mail, CheckCircle2, ExternalLink, Copy } from "lucide-react"
import { FloatingThemeLocale } from "@/components/ui/FloatingThemeLocale"

interface ForgotResponse {
  ok: boolean
  message?: string
  emailDelivered?: boolean
  fallbackResetUrl?: string
  notice?: string
  expiresInMin?: number
  error?: string
}

function BiaLogoIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-label="BIA Logo">
      <path d="M60 8 A52 52 0 1 1 59.99 8" stroke="white" strokeWidth="9"
        strokeLinecap="round" fill="none" opacity="0.95" />
      <rect x="53" y="4" width="14" height="11" fill="#2d0a6e" />
      <rect x="53" y="105" width="14" height="11" fill="#2d0a6e" />
      <rect x="57" y="28" width="6" height="64" rx="3" fill="white" />
      <rect x="26" y="28" width="6" height="64" rx="3" fill="white" />
      <path d="M32 28 Q52 28 52 42 Q52 56 32 56" stroke="white" strokeWidth="6"
        strokeLinecap="round" fill="none" />
      <path d="M32 56 Q54 56 54 70 Q54 84 32 84" stroke="white" strokeWidth="6"
        strokeLinecap="round" fill="none" />
      <path d="M63 84 L75 28 L87 84" stroke="white" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="67" y1="66" x2="83" y2="66" stroke="white" strokeWidth="5.5"
        strokeLinecap="round" />
    </svg>
  )
}

function ForgotPasswordInner() {
  const searchParams = useSearchParams()
  // R12.30: pré-preenche email se veio do login (?email=...)
  const initialEmail = searchParams.get("email") ?? ""

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ForgotResponse | null>(null)
  const [copied, setCopied] = useState(false)

  // Mantém o email sincronizado caso o query string mude (cliente)
  useEffect(() => {
    if (initialEmail && !email) setEmail(initialEmail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = (await res.json()) as ForgotResponse
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível processar o pedido. Tente novamente.")
      } else {
        setResult(data)
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!result?.fallbackResetUrl) return
    try {
      await navigator.clipboard.writeText(result.fallbackResetUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#0a0514] flex flex-col items-center justify-center px-4 py-8 grid-bg">
      <FloatingThemeLocale position="top-right" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center shadow-lg shadow-violet-900/40 mb-3">
            <BiaLogoIcon size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Recuperar acesso</h1>
          <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">
            Digite seu email para receber um link de redefinição de senha.
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8">
          {!result ? (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300" htmlFor="email">
                    Email da conta
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    disabled={loading}
                    autoComplete="email"
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bia-button-primary py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Enviar link de redefinição
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/5 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao login
                </Link>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-sm text-emerald-200 leading-relaxed">
                  {result.message ||
                    "Se este email tem uma conta, você receberá o link de redefinição em alguns instantes."}
                </div>
              </div>

              {/* Fallback: link direto na tela quando email não está configurado */}
              {result.fallbackResetUrl && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-start gap-2 text-sm text-amber-200">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      {result.notice ||
                        "Envio automático de email indisponível. Use o link abaixo:"}
                    </span>
                  </div>
                  <div className="bg-black/40 border border-amber-500/20 rounded-lg p-2.5 font-mono text-[11px] text-amber-100 break-all">
                    {result.fallbackResetUrl}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={result.fallbackResetUrl}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/25 hover:bg-amber-500/40 border border-amber-500/40 text-amber-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir link de redefinição
                    </a>
                    <button
                      onClick={copyLink}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 leading-relaxed space-y-1">
                <div>
                  <strong className="text-gray-400">Expira em:</strong>{" "}
                  {result.expiresInMin ?? 30} minutos
                </div>
                <div>
                  <strong className="text-gray-400">Não recebeu?</strong> Verifique a
                  pasta de spam, ou{" "}
                  <button
                    onClick={() => {
                      setResult(null)
                      setEmail("")
                    }}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                  >
                    tente novamente
                  </button>
                  .
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 text-center">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao login
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0514] flex items-center justify-center text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando…
      </div>
    }>
      <ForgotPasswordInner />
    </Suspense>
  )
}
