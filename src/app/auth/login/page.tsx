import Link from "next/link"
import { Dna } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#030a04] flex items-center justify-center p-6 grid-bg">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
              <Dna className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">
              BIA <span className="text-emerald-400">v3</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Bem-vindo de volta</h1>
          <p className="text-gray-400 text-sm">Entre na sua conta BIA v3</p>
        </div>

        {/* Form Card */}
        <div className="bg-white/2 border border-white/10 rounded-2xl p-8">
          <form className="space-y-5" action="/api/auth/signin/credentials" method="POST">
            <input type="hidden" name="callbackUrl" value="/dashboard" />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300" htmlFor="password">
                  Senha
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300">
                  Esqueceu a senha?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bia-button-primary py-3 rounded-xl text-sm font-semibold mt-2"
            >
              Entrar na plataforma
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Não tem conta?{" "}
            <Link href="/auth/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Criar conta gratuita
            </Link>
          </div>
        </div>

        {/* Demo Access */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-600">
            Demo: <span className="text-gray-500">demo@bia.com / demo1234</span>
          </p>
        </div>
      </div>
    </div>
  )
}
