"use client"

/**
 * BIA · Academy · R13.14.1 · Modal de captura de lead para brinde
 *
 * Substitui o botão "Baixar PDF gratuito" por: botão → modal com form
 * (nome, email, instituição, cargo opcional, consent LGPD) → POST para
 * /api/library/lead → ao receber downloadUrl, dispara o download e
 * fecha o modal.
 *
 * UX:
 *   - Modal com overlay escuro, fechável por X / ESC / clique fora
 *   - Loading state no submit, mensagens de erro inline
 *   - Após sucesso: toast de agradecimento + download automático
 *   - Mantém o CTA secundário do Asaas visível por baixo (não oculta)
 *   - Mobile-first: cresce para fullscreen em telas pequenas
 *
 * Acessibilidade: role=dialog, aria-labelledby, foco no primeiro input,
 * fecha com ESC, tecla Enter submete o form.
 */
import { useEffect, useRef, useState } from "react"
import { Download, Gift, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react"

interface Props {
  resourceId: string
  resourceTitle: string
  pdfUrl: string
  pages: number
  sizeMb: number
  /** Classe tailwind do botão primário (para integrar com o design da landing) */
  buttonClassName?: string
  /** Texto do botão */
  buttonLabel?: string
  /** Opcional: callback para disparar analytics quando o download acontece */
  onDownloaded?: () => void
  testIdPrefix?: string
}

const ROLE_OPTIONS = [
  { value: "pesquisador",   label: "Pesquisador(a) / Cientista" },
  { value: "docente",       label: "Docente / Professor(a)" },
  { value: "aluno",         label: "Aluno(a) / Estudante" },
  { value: "profissional",  label: "Profissional de saúde" },
  { value: "industria",     label: "Indústria / Startup" },
  { value: "outro",         label: "Outro" },
] as const

export function BrindeDownloadGate({
  resourceId,
  resourceTitle,
  pdfUrl,
  pages,
  sizeMb,
  buttonClassName = "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold text-sm transition-all shadow-lg shadow-amber-500/20",
  buttonLabel = "Baixar PDF gratuito",
  onDownloaded,
  testIdPrefix = "brinde",
}: Props) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const firstInputRef = useRef<HTMLInputElement | null>(null)

  // UTM / referrer capturados no cliente (sem persistir no state de form)
  const [utms, setUtms] = useState<{
    referrer: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
  }>({ referrer: null, utmSource: null, utmMedium: null, utmCampaign: null })

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setUtms({
      referrer:    document.referrer || null,
      utmSource:   params.get("utm_source"),
      utmMedium:   params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
    })
  }, [])

  // Fecha com ESC + foco inicial
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKey)
    // Foco no primeiro input (depois de o modal aparecer)
    setTimeout(() => firstInputRef.current?.focus(), 50)
    // Trava scroll do body
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleOpen() {
    setError(null)
    setSuccess(false)
    setOpen(true)
  }

  function handleClose() {
    if (submitting) return
    setOpen(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)

    const form = e.currentTarget
    const fd = new FormData(form)
    const payload = {
      resourceId,
      name:        String(fd.get("name") ?? "").trim(),
      email:       String(fd.get("email") ?? "").trim().toLowerCase(),
      institution: String(fd.get("institution") ?? "").trim(),
      role:        String(fd.get("role") ?? "") || null,
      consentMarketing: fd.get("consent") === "on",
      referrer:    utms.referrer,
      utmSource:   utms.utmSource,
      utmMedium:   utms.utmMedium,
      utmCampaign: utms.utmCampaign,
    }

    // Validação cliente mínima (o server valida de novo via zod)
    if (payload.name.length < 2)        { setError("Informe seu nome completo.");  setSubmitting(false); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
      setError("E-mail inválido."); setSubmitting(false); return
    }
    if (payload.institution.length < 2) { setError("Informe sua instituição."); setSubmitting(false); return }

    try {
      const res = await fetch("/api/library/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Falha ao registrar o download. Tente novamente.")
        setSubmitting(false)
        return
      }

      setSuccess(true)
      onDownloaded?.()

      // Dispara o download real do PDF
      const a = document.createElement("a")
      a.href = data.downloadUrl ?? pdfUrl
      a.download = pdfUrl.split("/").pop() ?? "white-paper.pdf"
      a.rel = "noopener"
      document.body.appendChild(a)
      a.click()
      a.remove()

      // Fecha o modal depois de 2.5s para o usuário ver o agradecimento
      setTimeout(() => {
        setOpen(false)
        setSubmitting(false)
      }, 2500)
    } catch (err) {
      console.error("[BrindeDownloadGate] erro:", err)
      setError("Erro de conexão. Verifique sua internet e tente de novo.")
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Botão gatilho */}
      <button
        type="button"
        onClick={handleOpen}
        className={buttonClassName}
        data-testid={`${testIdPrefix}-open-modal`}
      >
        <Download className="w-4 h-4" />
        {buttonLabel}
      </button>

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="brinde-gate-title"
          data-testid={`${testIdPrefix}-modal`}
          className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
        >
          {/* Overlay */}
          <button
            type="button"
            aria-label="Fechar"
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Conteúdo */}
          <div className="relative z-10 w-full max-w-md sm:max-w-lg bg-slate-950 border border-white/10 sm:rounded-2xl shadow-2xl my-0 sm:my-8">
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-white/10 bg-gradient-to-r from-amber-500/[0.08] to-fuchsia-500/[0.06]">
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar"
                className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                disabled={submitting}
              >
                <X className="w-4 h-4" />
              </button>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 text-[10px] font-semibold uppercase tracking-wider mb-3">
                <Gift className="w-3 h-3" />
                Brinde · Acesso gratuito
              </div>
              <h2 id="brinde-gate-title" className="text-base sm:text-lg font-bold leading-tight pr-6">
                {resourceTitle}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {pages} páginas · {sizeMb} MB · PDF
              </p>
            </div>

            {/* Mensagem de sucesso ou form */}
            {success ? (
              <div
                className="px-6 py-10 text-center"
                data-testid={`${testIdPrefix}-success`}
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                </div>
                <h3 className="text-lg font-bold mb-2">Obrigada! Download iniciado 📥</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  O PDF está sendo baixado no seu navegador.
                  Se não começou automaticamente,{" "}
                  <a
                    href={pdfUrl}
                    download
                    className="text-fuchsia-300 hover:text-fuchsia-200 underline"
                  >
                    clique aqui
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" data-testid={`${testIdPrefix}-form`}>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Preencha para receber o material. Usamos seus dados apenas para
                  entender o perfil dos leitores da Quantis.
                </p>

                {/* Nome */}
                <div>
                  <label htmlFor="brinde-name" className="block text-xs font-medium text-gray-300 mb-1.5">
                    Nome completo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    id="brinde-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    maxLength={120}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 focus:border-fuchsia-500/60 focus:bg-white/[0.07] text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    placeholder="Ex: Maria Silva"
                    data-testid={`${testIdPrefix}-input-name`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="brinde-email" className="block text-xs font-medium text-gray-300 mb-1.5">
                    E-mail profissional <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="brinde-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 focus:border-fuchsia-500/60 focus:bg-white/[0.07] text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    placeholder="voce@instituicao.br"
                    data-testid={`${testIdPrefix}-input-email`}
                  />
                </div>

                {/* Instituição */}
                <div>
                  <label htmlFor="brinde-institution" className="block text-xs font-medium text-gray-300 mb-1.5">
                    Instituição / Empresa <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="brinde-institution"
                    name="institution"
                    type="text"
                    required
                    autoComplete="organization"
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 focus:border-fuchsia-500/60 focus:bg-white/[0.07] text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    placeholder="Ex: USP, Fiocruz, Startup XYZ"
                    data-testid={`${testIdPrefix}-input-institution`}
                  />
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="brinde-role" className="block text-xs font-medium text-gray-300 mb-1.5">
                    Sua atuação (opcional)
                  </label>
                  <select
                    id="brinde-role"
                    name="role"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 focus:border-fuchsia-500/60 focus:bg-white/[0.07] text-sm text-white outline-none transition-colors"
                    data-testid={`${testIdPrefix}-input-role`}
                    defaultValue=""
                  >
                    <option value="" className="bg-slate-900">— selecionar —</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value} className="bg-slate-900">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Consent */}
                <label className="flex items-start gap-2 cursor-pointer text-xs text-gray-400 leading-relaxed">
                  <input
                    type="checkbox"
                    name="consent"
                    className="mt-0.5 shrink-0 w-4 h-4 rounded border-white/20 bg-white/[0.04] text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/40"
                    data-testid={`${testIdPrefix}-input-consent`}
                  />
                  <span>
                    Aceito receber da Quantis Biotechnology comunicados sobre a
                    BIA Academy e materiais técnicos. Posso descadastrar quando quiser.
                  </span>
                </label>

                {/* Erro */}
                {error && (
                  <div
                    className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs"
                    data-testid={`${testIdPrefix}-error`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid={`${testIdPrefix}-submit`}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Receber o PDF
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-gray-500 leading-relaxed pt-1">
                  Em conformidade com a LGPD. Seus dados ficam apenas na Quantis Biotechnology,
                  não são compartilhados com terceiros.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
