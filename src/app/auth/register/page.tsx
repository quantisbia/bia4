import Link from "next/link"
import { Dna, CheckCircle2 } from "lucide-react"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#030a04] flex items-center justify-center p-6 grid-bg">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Dna className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">
              BIA <span className="text-emerald-400">v3</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Criar sua conta</h1>
          <p className="text-gray-400 text-sm">Comece a usar BIA v3 gratuitamente</p>
        </div>

        {/* Perks */}
        <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs text-gray-400">
          {["7 dias grátis", "Sem cartão de crédito", "Cancele quando quiser"].map((perk) => (
            <div key={perk} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white/2 border border-white/10 rounded-2xl p-8">
          <form className="space-y-5" action="/api/auth/register" method="POST">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300" htmlFor="firstName">
                  Nome
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  placeholder="João"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300" htmlFor="lastName">
                  Sobrenome
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  placeholder="Silva"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300" htmlFor="email">
                Email profissional
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
              <label className="text-sm font-medium text-gray-300" htmlFor="institution">
                Instituição / Empresa
              </label>
              <input
                id="institution"
                name="institution"
                type="text"
                placeholder="USP, UNICAMP, startup..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Área de pesquisa
              </label>
              <select
                name="researchArea"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              >
                <option value="" className="bg-[#030a04]">Selecione sua área...</option>
                <option value="tissue_engineering" className="bg-[#030a04]">Engenharia de Tecidos</option>
                <option value="biomaterials" className="bg-[#030a04]">Biomateriais</option>
                <option value="organoids" className="bg-[#030a04]">Organoides</option>
                <option value="bioprinting" className="bg-[#030a04]">Bioimpressão</option>
                <option value="regenerative_medicine" className="bg-[#030a04]">Medicina Regenerativa</option>
                <option value="drug_discovery" className="bg-[#030a04]">Drug Discovery</option>
                <option value="other" className="bg-[#030a04]">Outra</option>
              </select>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                required
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500"
              />
              <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed">
                Concordo com os{" "}
                <Link href="/terms" className="text-emerald-400 hover:underline">Termos de Uso</Link>
                {" "}e{" "}
                <Link href="/privacy" className="text-emerald-400 hover:underline">Política de Privacidade</Link>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bia-button-primary py-3 rounded-xl text-sm font-semibold"
            >
              Criar conta e começar grátis
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
