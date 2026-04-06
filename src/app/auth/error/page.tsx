"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Dna, AlertTriangle, ArrowLeft } from "lucide-react"

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Erro de configuração do servidor. Contate o suporte.",
  AccessDenied: "Acesso negado. Você não tem permissão para acessar esta página.",
  Verification: "Link de verificação inválido ou expirado.",
  OAuthSignin: "Erro ao iniciar autenticação OAuth.",
  OAuthCallback: "Erro no retorno do OAuth.",
  OAuthCreateAccount: "Não foi possível criar uma conta via OAuth.",
  EmailCreateAccount: "Não foi possível criar uma conta com este email.",
  Callback: "Erro no processo de autenticação.",
  OAuthAccountNotLinked: "Este email já está associado a outra conta.",
  EmailSignin: "Erro ao enviar email de login.",
  CredentialsSignin: "Email ou senha incorretos.",
  SessionRequired: "Você precisa estar logado para acessar esta página.",
  Default: "Ocorreu um erro de autenticação. Tente novamente.",
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "Default"
  const message = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default

  return (
    <div className="min-h-screen bg-[#030a04] flex items-center justify-center p-6 grid-bg">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 group mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
            <Dna className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">
            BIA <span className="text-emerald-400">v3</span>
          </span>
        </Link>

        <div className="bg-white/2 border border-red-500/20 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>

          <h1 className="text-xl font-bold mb-3">Erro de Autenticação</h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">{message}</p>

          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="bia-button-primary w-full py-3 rounded-xl text-sm font-medium text-center"
            >
              Tentar novamente
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-4">
          Código do erro: <span className="text-gray-500 font-mono">{error}</span>
        </p>
      </div>
    </div>
  )
}
