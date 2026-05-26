"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  /auth/reset-password?token=... (R12.30)
 *  ─────────────────────────────────────────────────────────────────────
 *  Página de redefinição efetiva.
 *
 *  Fluxo:
 *    1. Lê ?token do query string
 *    2. GET /api/auth/reset-password?token=... → valida e pega email mascarado
 *    3. Mostra form com nova senha (+ confirmação)
 *    4. POST /api/auth/reset-password → troca senha
 *    5. Redireciona para /auth/login?reset=ok
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft,
  CheckCircle2, ShieldCheck, KeyRound,
} from "lucide-react"
import { FloatingThemeLocale } from "@/components/ui/FloatingThemeLocale"

interface ValidateResponse {
  ok: boolean
  email?: string
  expiresAt?: string
  reason?: "invalid_format" | "not_found" | "used" | "expired" | "server_error"
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

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [validating, setValidating] = useState(true)
  const [validation, setValidation] = useState<ValidateResponse | null>(null)

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Pré-valida token ao montar
  useEffect(() => {
    if (!token) {
      setValidation({ ok: false, reason: "invalid_format", error: "Link inválido — token ausente." })
      setValidating(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
        const data = (await res.json()) as ValidateResponse
        if (!cancelled) setValidation(data)
      } catch {
        if (!cancelled) {
          setValidation({ ok: false, reason: "server_error", error: "Erro ao validar o link." })
        }
      } finally {
        if (!cancelled) setValidating(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const passwordOk = password.length >= 8
  const passwordsMatch = password.length > 0 && password === confirm
  const canSubmit = passwordOk && passwordsMatch && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || "Não foi possível redefinir a senha.")
      } else {
        setSuccess(true)
        // Redireciona após 2s
        setTimeout(() => {
          router.push("/auth/login?reset=ok")
        }, 1800)
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-2xl font-bold text-white">Nova senha</h1>
          <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">
            Defina uma nova senha para sua conta na BIA.
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8">
          {/* Estado: validando token */}
          {validating && (
            <div className="flex items-center justify-center gap-3 py-6 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Validando link…
            </div>
          )}

          {/* Estado: token inválido / expirado / usado */}
          {!validating && validation && !validation.ok && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                <div className="text-sm text-rose-200 leading-relaxed">
                  {validation.error || "Link de redefinição inválido."}
                </div>
              </div>

              <Link
                href="/auth/forgot-password"
                className="w-full bia-button-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Solicitar novo link
              </Link>

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

          {/* Estado: sucesso */}
          {!validating && validation?.ok && success && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-sm text-emerald-200 leading-relaxed">
                  Senha redefinida com sucesso! Redirecionando para o login…
                </div>
              </div>
            </div>
          )}

          {/* Estado: form ativo */}
          {!validating && validation?.ok && !success && (
            <>
              {validation.email && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-sm text-violet-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Redefinindo a senha de{" "}
                    <span className="font-mono font-semibold">{validation.email}</span>
                  </span>
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300" htmlFor="password">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Mínimo 8 caracteres"
                      disabled={submitting}
                      autoComplete="new-password"
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && !passwordOk && (
                    <div className="text-xs text-amber-300">
                      A senha precisa ter pelo menos 8 caracteres.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300" htmlFor="confirm">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Digite a senha novamente"
                    disabled={submitting}
                    autoComplete="new-password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50"
                  />
                  {confirm.length > 0 && !passwordsMatch && (
                    <div className="text-xs text-rose-300">As senhas não conferem.</div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full bia-button-primary py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redefinindo…
                    </>
                  ) : (
                    <>
                      Redefinir senha
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
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-700 hover:text-gray-500 transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0514] flex items-center justify-center text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando…
      </div>
    }>
      <ResetPasswordInner />
    </Suspense>
  )
}
