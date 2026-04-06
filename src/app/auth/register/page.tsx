"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Dna, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"

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
    setLoading(true)
    setError("")

    // Basic validations
    if (!form.terms) {
      setError("Você precisa aceitar os Termos de Uso para continuar.")
      setLoading(false)
      return
    }
    if (form.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.")
      setLoading(false)
      return
    }

    try {
      // 1. Register
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro ao criar conta. Tente novamente.")
        return
      }

      // 2. Auto sign-in after registration
      const signInResult = await signIn("credentials", {
        email: form.email.toLowerCase(),
        password: form.password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Registration OK but auto-login failed → redirect to login
        router.push("/auth/login?registered=true")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50"

  return (
    <div className="min-h-screen bg-[#030a04] flex items-center justify-center p-6 grid-bg">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 py-8">
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
          <p className="text-gray-400 text-sm">Comece a usar BIA v3 — 50 créditos grátis</p>
        </div>

        {/* Perks */}
        <div className="flex flex-wrap justify-center gap-4 mb-6 text-xs text-gray-400">
          {["50 créditos grátis", "7 dias de trial", "Sem cartão de crédito"].map((perk) => (
            <div key={perk} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <div className="bg-white/2 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Nome</label>
                <input
                  name="firstName"
                  type="text"
                  required
                  placeholder="João"
                  value={form.firstName}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Sobrenome</label>
                <input
                  name="lastName"
                  type="text"
                  required
                  placeholder="Silva"
                  value={form.lastName}
                  onChange={handleChange}
                  disabled={loading}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="seu@email.com"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Senha</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {form.password && (
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3, 4].map((level) => {
                    const strength = Math.min(Math.floor(form.password.length / 3), 4)
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= strength
                            ? strength <= 1 ? "bg-red-500"
                              : strength <= 2 ? "bg-amber-500"
                              : strength <= 3 ? "bg-blue-500"
                              : "bg-emerald-500"
                            : "bg-white/10"
                        }`}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">
                Instituição <span className="text-gray-600">(opcional)</span>
              </label>
              <input
                name="institution"
                type="text"
                placeholder="USP, UNICAMP, startup biotech..."
                value={form.institution}
                onChange={handleChange}
                disabled={loading}
                className={inputClass}
              />
            </div>

            {/* Research Area */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Área de pesquisa</label>
              <select
                name="researchArea"
                value={form.researchArea}
                onChange={handleChange}
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all disabled:opacity-50 [&>option]:bg-[#0a1a10]"
              >
                {RESEARCH_AREAS.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                checked={form.terms}
                onChange={handleChange}
                disabled={loading}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                Concordo com os{" "}
                <Link href="/terms" className="text-emerald-400 hover:underline">Termos de Uso</Link>
                {" "}e{" "}
                <Link href="/privacy" className="text-emerald-400 hover:underline">Política de Privacidade</Link>
                . Entendo que receberei 50 créditos gratuitos para explorar a plataforma.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !form.terms}
              className="w-full bia-button-primary py-3 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando sua conta...
                </>
              ) : (
                "Criar conta e começar grátis →"
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-400">
            Já tem uma conta?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
