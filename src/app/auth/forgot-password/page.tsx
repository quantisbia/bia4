"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  /auth/forgot-password (R12.31 — revisado)
 *  ─────────────────────────────────────────────────────────────────────
 *  R12.31 muda a UX: o link de redefinição agora aparece em DESTAQUE
 *  na tela após o submit, sem depender do email chegar. O email continua
 *  sendo enviado quando configurado, mas o usuário tem acesso imediato.
 *
 *  Isso resolve o caso do usuário em que "o email não chega" — pode ser
 *  spam, infra de email não configurada, domínio sem DNS verificado, etc.
 *  O usuário nunca mais fica preso esperando algo que pode não chegar.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle, Loader2, ArrowRight, ArrowLeft, Mail, CheckCircle2,
  ExternalLink, Copy, KeyRound, ShieldCheck,
} from "lucide-react"
import { FloatingThemeLocale } from "@/components/ui/FloatingThemeLocale"

interface ForgotResponse {
  ok: boolean
  accountExists?: boolean
  emailDelivered?: boolean
  emailProvider?: "resend" | "none"
  resetUrl?: string
  message?: string
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get("email") ?? ""

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ForgotResponse | null>(null)
  const [copied, setCopied] = useState(false)

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
    if (!result?.resetUrl) return
    try {
      await navigator.clipboard.writeText(result.resetUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const openLink = () => {
    if (!result?.resetUrl) return
    router.push(result.resetUrl.replace(/^https?:\/\/[^/]+/, ""))
  }

  // ─── ESTADO: conta existe → mostra link de reset em DESTAQUE ──
  const hasResetUrl = result?.ok && result.accountExists && result.resetUrl

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
            Digite seu email e geramos um link instantâneo para você criar uma nova senha.
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8">
          {/* ═══ FORMULÁRIO (estado inicial) ═══ */}
          {!result && (
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
                      Gerando link…
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Gerar link de redefinição
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

          {/* ═══ SUCESSO COM LINK (conta existe) ═══ */}
          {hasResetUrl && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-sm text-emerald-200 leading-relaxed">
                  <strong className="text-emerald-100">Pronto!</strong> Seu link
                  de redefinição está abaixo. Use-o imediatamente — não precisa
                  esperar email.
                </div>
              </div>

              {/* ─── BOTÃO PRINCIPAL: abrir o link agora ─── */}
              <button
                onClick={openLink}
                className="w-full bia-button-primary py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-900/40"
              >
                <ShieldCheck className="w-5 h-5" />
                Criar nova senha agora
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* ─── Link em texto + copiar ─── */}
              <div className="space-y-2">
                <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  Ou copie o link:
                </div>
                <div className="bg-black/40 border border-white/10 rounded-lg p-2.5 font-mono text-[10px] text-violet-200 break-all leading-relaxed">
                  {result.resetUrl}
                </div>
                <button
                  onClick={copyLink}
                  className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? "✓ Copiado para a área de transferência" : "Copiar link"}
                </button>
              </div>

              {/* ─── Status do email (informativo) ─── */}
              {result.emailDelivered ? (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs leading-relaxed">
                  <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    Também enviamos o link por email para você ter no histórico.
                    Verifique a caixa de entrada (e o spam).
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    Envio de email indisponível no momento — mas o link acima
                    funciona perfeitamente. Use ele agora.
                  </span>
                </div>
              )}

              <div className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-400">Validade:</strong>{" "}
                {result.expiresInMin ?? 30} minutos · uso único
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

          {/* ═══ EMAIL NÃO CADASTRADO (anti-enumeração — mensagem genérica) ═══ */}
          {result?.ok && !result.accountExists && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
                <CheckCircle2 className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
                <div className="text-sm text-violet-200 leading-relaxed">
                  {result.message ||
                    "Se este email tem uma conta na BIA, você receberá o link em alguns instantes."}
                </div>
              </div>

              <div className="text-xs text-gray-500 leading-relaxed space-y-2">
                <p>
                  <strong className="text-gray-400">Não tem conta?</strong>{" "}
                  <Link href="/auth/register" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                    Criar uma agora →
                  </Link>
                </p>
                <p>
                  <strong className="text-gray-400">Digitou outro email?</strong>{" "}
                  <button
                    onClick={() => { setResult(null); setEmail("") }}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                  >
                    Tentar novamente
                  </button>
                </p>
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
          <Link href="/" className="text-xs text-gray-700 hover:text-gray-500 transition-colors">
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
