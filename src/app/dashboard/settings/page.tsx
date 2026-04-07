"use client"

import { useState } from "react"
import { Settings, User, Bell, Shield, Key, Save, Loader2, ChevronRight } from "lucide-react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils/helpers"

const TABS = [
  { key: "profile",       label: "Perfil",         icon: User   },
  { key: "notifications", label: "Notificações",    icon: Bell   },
  { key: "security",      label: "Segurança",       icon: Shield },
  { key: "api",           label: "API Keys",        icon: Key    },
]

const PLAN_BADGE: Record<string, string> = {
  ACADEMY:    "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  ENTERPRISE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  ADVANCED:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  DISCOVERY:  "text-violet-400 bg-violet-500/10 border-violet-500/20",
  FREE:       "text-gray-400 bg-gray-500/10 border-gray-500/20",
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [activeTab, setActiveTab] = useState("profile")
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [form, setForm] = useState({
    name:            session?.user?.name ?? "",
    email:           session?.user?.email ?? "",
    institution:     "",
    role:            "",
    notifications:   true,
    marketingEmails: false,
  })

  async function saveProfile() {
    setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 800))
      await update({ name: form.name })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    } finally { setSaving(false) }
  }

  const plan = (session?.user?.plan as string) ?? "FREE"

  const inputClass = cn(
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white",
    "placeholder:text-gray-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10",
    "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  )

  return (
    <div className="flex flex-col sm:flex-row h-full overflow-hidden">

      {/* ── Tab navigation ── */}
      <div className="sm:w-52 lg:w-64 border-b sm:border-b-0 sm:border-r border-white/5 shrink-0 bg-black/5">
        {/* Desktop header */}
        <div className="hidden sm:flex items-center gap-2 p-4 border-b border-white/5">
          <Settings className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-white">Configurações</h2>
        </div>

        {/* Tab list — horizontal on mobile, vertical on desktop */}
        <nav className="flex sm:flex-col gap-1 overflow-x-auto p-2 sm:p-3 scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 sm:w-full",
                "active:scale-[0.98]",
                activeTab === tab.key
                  ? "bg-white/8 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              )}>
              <tab.icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              <ChevronRight className={cn("w-3.5 h-3.5 ml-auto hidden sm:block",
                activeTab === tab.key ? "text-gray-400" : "text-gray-700")} />
            </button>
          ))}
        </nav>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-md mx-auto sm:mx-0">

          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Perfil do Pesquisador</h3>
                <p className="text-xs text-gray-500 mt-0.5">Informações básicas da sua conta</p>
              </div>

              {/* Avatar card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-lg shadow-violet-900/40">
                  {(form.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{form.name || "Usuário"}</p>
                  <p className="text-xs text-gray-500 truncate">{form.email}</p>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block border",
                    PLAN_BADGE[plan] ?? PLAN_BADGE.FREE)}>
                    {plan}
                  </span>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3.5">
                {[
                  { key: "name",        label: "Nome completo",   type: "text",  placeholder: "Dr. João Silva" },
                  { key: "email",       label: "Email",           type: "email", placeholder: "email@lab.com.br", disabled: true },
                  { key: "institution", label: "Instituição",     type: "text",  placeholder: "USP, UNICAMP..." },
                  { key: "role",        label: "Cargo / Área",    type: "text",  placeholder: "Pesquisador, Pós-doc..." },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-gray-400 block mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={form[field.key as keyof typeof form] as string}
                      onChange={e => !field.disabled && setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      className={inputClass}
                    />
                  </div>
                ))}

                <button onClick={saveProfile} disabled={saving}
                  className={cn(
                    "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
                    saved
                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                      : "bg-emerald-500 text-white hover:bg-emerald-400"
                  )}>
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />}
                  {saved ? "✓ Salvo!" : "Salvar alterações"}
                </button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Notificações</h3>
                <p className="text-xs text-gray-500 mt-0.5">Escolha como deseja ser notificado</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { key: "notifications",   label: "Notificações do sistema", desc: "Alertas de créditos, análises e erros" },
                  { key: "marketingEmails", label: "Emails de marketing",      desc: "Novidades e atualizações da plataforma" },
                ].map(pref => (
                  <label key={pref.key}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8 cursor-pointer hover:border-white/12 transition-all active:scale-[0.99]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{pref.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pref.desc}</p>
                    </div>
                    <div
                      onClick={e => {
                        e.preventDefault()
                        setForm(prev => ({ ...prev, [pref.key]: !prev[pref.key as keyof typeof prev] }))
                      }}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0",
                        form[pref.key as keyof typeof form] ? "bg-violet-500" : "bg-white/15"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                        form[pref.key as keyof typeof form] ? "translate-x-[22px]" : "translate-x-1"
                      )} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === "security" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Segurança</h3>
                <p className="text-xs text-gray-500 mt-0.5">Gerencie sua senha e sessões</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-0.5">Alterar Senha</h4>
                  <p className="text-xs text-gray-500">Use uma senha forte com 12+ caracteres</p>
                </div>
                {["Senha atual", "Nova senha", "Confirmar nova senha"].map((label) => (
                  <input key={label} type="password" placeholder={label} className={inputClass} />
                ))}
                <button className="px-4 py-2.5 rounded-xl bg-white/8 text-sm text-gray-300 hover:bg-white/12 transition-colors active:scale-[0.98] w-full sm:w-auto">
                  Atualizar senha
                </button>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                <h4 className="text-sm font-semibold text-amber-300 mb-1">Sessões Ativas</h4>
                <p className="text-xs text-gray-400">Sessão atual: {new Date().toLocaleDateString("pt-BR")}</p>
                <button className="mt-2.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                  Encerrar todas as sessões
                </button>
              </div>
            </div>
          )}

          {/* ── API ── */}
          {activeTab === "api" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">API Keys</h3>
                <p className="text-xs text-gray-500 mt-0.5">Integre a BIA v4 com suas ferramentas</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-3">
                <p className="text-xs sm:text-sm text-gray-300">
                  Integre a BIA v4 com seus pipelines de análise e ferramentas de laboratório.
                </p>
                <div className="bg-black/30 rounded-xl p-3.5 font-mono text-xs text-emerald-300 break-all border border-white/5">
                  bia_key_••••••••••••••••••••••
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 hover:bg-violet-500/20 transition-colors active:scale-[0.98] text-center">
                    Gerar nova chave
                  </button>
                  <button className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/8 transition-colors active:scale-[0.98] text-center">
                    Copiar
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <p className="text-xs text-blue-300 font-medium mb-1">📚 Documentação</p>
                <p className="text-xs text-gray-500">Documentação da API disponível em breve.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
