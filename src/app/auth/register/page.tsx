"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, Zap, ArrowRight, FlaskConical } from "lucide-react"

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

const RESEARCH_AREAS = [
  { value: "", label: "Selecione sua área..." },
  { value: "tissue_engineering", label: "Engenharia de Tecidos" },
  { value: "biomaterials", label: "Biomateriais" },
  { value: "organoids", label: "Organoides" },
  { value: "bioprinting", label: "Bioimpressão" },
  { value: "regenerative_medicine", label: "Medicina Regenerativa" },
  { value: "drug_discovery", label: "Drug Discovery" },
  { value: "bioinformatics", label: "Bioinformática" },
  { value: "cell_biology", label: "Biologia Celular" },
  { value: "other", label: "Outra" },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    institution: "",
    researchArea: "",
    terms: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.terms) { setError("Aceite os Termos de Uso para continuar."); return }
    if (form.password.length < 8) { setError("Senha deve ter pelo menos 8 caracteres."); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Erro ao criar conta."); return }
      const signInResult = await signIn("credentials", {
        email: form.email.toLowerCase(),
        password: form.password,
        redirect: false,
      })
      if (signInResult?.error) {
        router.push("/auth/login?registered=true")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet.")
    } finally {
      setLoading(false)
    }
  }

  const strength = Math.min(Math.floor(form.password.length / 3), 4)
  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50"

  return (
    <div className="min-h-screen bg-[#0a0514] flex flex-col items-center justify-center px-4 py-8 grid-bg">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 py-4">

        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl bg-[#2d0a6e] flex items-center justify-center shadow-xl shadow-violet-900/60">
              <BiaLogoIcon size={36} />
            </div>
            <div>
              <span className="text-xl font-bold leading-tight block">
                BIA <span className="text-violet-400">v4</span>
              </span>
              <span className="text-[10px] text-purple-400/70 tracking-widest uppercase block">
                Biofabrication AI
              </span>
            </div>
          </Link>
          <h1 className="text-xl font-bold mt-5 mb-1">Criar sua conta</h1>
          <p className="text-gray-400 text-sm">Acesso à plataforma de biofabricação com IA</p>
        </div>

        {/* Discovery intro badge */}
        <div className="flex items-center justify-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2.5 mb-5 text-sm text-violet-300">
          <Zap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span>Plano <strong className="text-violet-200">Discovery</strong> — 10 créditos de boas-vindas</span>
        </div>

        {/* Perks */}
        <div className="flex justify-center gap-4 mb-5 flex-wrap">
          {["Sem cartão", "Acesso imediato", "IA Científica"].map((p) => (
            <div key={p} className="flex items-center gap-1.5 text-xs text-gray-500">
              <CheckCircle2 className="w-3 h-3 text-violet-400 shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nome *</label>
                <input name="firstName" type="text" required placeholder="João"
                  value={form.firstName} onChange={handleChange} disabled={loading}
                  autoComplete="given-name" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Sobrenome *</label>
                <input name="lastName" type="text" required placeholder="Silva"
                  value={form.lastName} onChange={handleChange} disabled={loading}
                  autoComplete="family-name" className={inp} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email *</label>
              <input name="email" type="email" required placeholder="seu@email.com"
                value={form.email} onChange={handleChange} disabled={loading}
                autoComplete="email" className={inp} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Senha *</label>
              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"}
                  required minLength={8} placeholder="Mínimo 8 caracteres"
                  value={form.password} onChange={handleChange} disabled={loading}
                  autoComplete="new-password" className={`${inp} pr-11`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((l) => (
                    <div key={l} className={`h-1 flex-1 rounded-full transition-all ${
                      l <= strength
                        ? strength <= 1 ? "bg-red-500"
                          : strength <= 2 ? "bg-amber-500"
                          : strength <= 3 ? "bg-blue-500"
                          : "bg-violet-500"
                        : "bg-white/10"
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Institution */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Instituição <span className="text-gray-600">(opcional)</span>
              </label>
              <input name="institution" type="text" placeholder="USP, UNICAMP, startup..."
                value={form.institution} onChange={handleChange} disabled={loading}
                className={inp} />
            </div>

            {/* Research Area */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Área de pesquisa</label>
              <select name="researchArea" value={form.researchArea} onChange={handleChange}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50 [&>option]:bg-[#0a0514]">
                {RESEARCH_AREAS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-1">
              <input type="checkbox" id="terms" name="terms"
                checked={form.terms} onChange={handleChange} disabled={loading}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-violet-500 cursor-pointer shrink-0" />
              <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                Aceito os{" "}
                <Link href="/terms" className="text-violet-400 hover:underline">Termos de Uso</Link>
                {" "}e{" "}
                <Link href="/privacy" className="text-violet-400 hover:underline">Privacidade</Link>.
                Receberei créditos de boas-vindas ao criar minha conta.
              </label>
            </div>

            <button type="submit" disabled={loading || !form.terms}
              className="w-full bia-button-primary py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Criando conta...</>
              ) : (
                <>Criar conta e começar <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 font-medium">
              Entrar →
            </Link>
          </div>
        </div>

        {/* Plans teaser */}
        <div className="mt-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/8">
          <p className="text-[10px] text-gray-500 text-center mb-2.5 uppercase tracking-wider font-semibold">Planos disponíveis</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Discovery", price: "R$ 270/mês", color: "text-violet-400" },
              { name: "Advanced",  price: "R$ 490/mês", color: "text-blue-400" },
              { name: "Enterprise",price: "R$ 990/mês", color: "text-purple-400" },
              { name: "Academy",   price: "R$ 4.970 · 6 meses",color: "text-amber-400" },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                <FlaskConical className={`w-3 h-3 shrink-0 ${p.color}`} />
                <div>
                  <p className={`text-[10px] font-semibold ${p.color}`}>{p.name}</p>
                  <p className="text-[9px] text-gray-600">{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 text-center">
          <Link href="/" className="text-xs text-gray-700 hover:text-gray-500 transition-colors">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  )
}
