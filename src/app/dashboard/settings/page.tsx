"use client"

import { useState } from "react"
import { Settings, User, Bell, Shield, Key, Save, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [activeTab, setActiveTab] = useState("profile")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    institution: "",
    role: "",
    notifications: true,
    marketingEmails: false,
  })

  async function saveProfile() {
    setSaving(true)
    try {
      // API call para atualizar perfil
      await new Promise(r => setTimeout(r, 1000)) // Simular
      await update({ name: form.name })
      alert("Perfil atualizado com sucesso!")
    } finally { setSaving(false) }
  }

  const TABS = [
    { key: "profile", label: "Perfil", icon: User },
    { key: "notifications", label: "Notificações", icon: Bell },
    { key: "security", label: "Segurança", icon: Shield },
    { key: "api", label: "API Keys", icon: Key },
  ]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tab sidebar */}
      <div className="w-64 border-r border-white/5 bg-black/10 flex flex-col shrink-0 p-3">
        <div className="p-3 mb-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            Configurações
          </h2>
        </div>
        <nav className="space-y-0.5">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white/8 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg">
          {activeTab === "profile" && (
            <div>
              <h3 className="text-lg font-bold text-white mb-6">Perfil do Pesquisador</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xl font-bold text-white">
                    {form.name.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{form.name || "Usuário"}</p>
                    <p className="text-xs text-gray-500">{form.email}</p>
                    <p className="text-[10px] text-emerald-400 mt-1">Plano {(session?.user?.plan as string) ?? "FREE"}</p>
                  </div>
                </div>

                {[
                  { key: "name", label: "Nome completo", type: "text", placeholder: "Dr. João Silva" },
                  { key: "email", label: "Email", type: "email", placeholder: "email@lab.com.br", disabled: true },
                  { key: "institution", label: "Instituição", type: "text", placeholder: "USP, UNICAMP, FIOCRUZ..." },
                  { key: "role", label: "Cargo / Área", type: "text", placeholder: "Pesquisador, Pós-doutorando..." },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs font-medium text-gray-400 block mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={form[field.key as keyof typeof form] as string}
                      onChange={e => !field.disabled && setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      disabled={field.disabled}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 disabled:opacity-50"
                    />
                  </div>
                ))}

                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar alterações
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h3 className="text-lg font-bold text-white mb-6">Preferências de Notificação</h3>
              <div className="space-y-4">
                {[
                  { key: "notifications", label: "Notificações do sistema", desc: "Alertas de créditos, conclusão de análises" },
                  { key: "marketingEmails", label: "Emails de marketing", desc: "Novidades, recursos e atualizações da plataforma" },
                ].map(pref => (
                  <label key={pref.key} className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/2 border border-white/5 cursor-pointer hover:border-white/10 transition-all">
                    <div>
                      <p className="text-sm font-medium text-white">{pref.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pref.desc}</p>
                    </div>
                    <div className="relative shrink-0">
                      <input
                        type="checkbox"
                        checked={form[pref.key as keyof typeof form] as boolean}
                        onChange={e => setForm(prev => ({ ...prev, [pref.key]: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors ${form[pref.key as keyof typeof form] ? "bg-emerald-500" : "bg-white/15"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${form[pref.key as keyof typeof form] ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div>
              <h3 className="text-lg font-bold text-white mb-6">Segurança da Conta</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/2 border border-white/5">
                  <h4 className="text-sm font-medium text-white mb-1">Alterar Senha</h4>
                  <p className="text-xs text-gray-500 mb-3">Recomendamos usar uma senha forte com 12+ caracteres</p>
                  <div className="space-y-2">
                    {["Senha atual", "Nova senha", "Confirmar nova senha"].map((label) => (
                      <input
                        key={label}
                        type="password"
                        placeholder={label}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40"
                      />
                    ))}
                    <button className="px-4 py-2 rounded-xl bg-white/8 text-sm text-gray-300 hover:bg-white/12 transition-colors">
                      Atualizar senha
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <h4 className="text-sm font-medium text-amber-300 mb-1">Sessões Ativas</h4>
                  <p className="text-xs text-gray-400">Sessão atual: {new Date().toLocaleDateString("pt-BR")}</p>
                  <button className="mt-2 text-xs text-red-400 hover:text-red-300">
                    Encerrar todas as sessões
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div>
              <h3 className="text-lg font-bold text-white mb-6">API Keys</h3>
              <div className="p-4 rounded-xl bg-white/2 border border-white/5 mb-4">
                <p className="text-sm text-gray-300 mb-3">
                  Use as API keys para integrar a BIA v3 com suas ferramentas e pipelines de análise.
                </p>
                <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-emerald-300">
                  bia_key_••••••••••••••••
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    Gerar nova chave
                  </button>
                  <button className="px-4 py-2 rounded-xl bg-white/5 text-xs text-gray-400 hover:bg-white/8 transition-colors">
                    Copiar
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Documentação da API disponível em breve. As API keys são vinculadas ao seu plano de assinatura.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
