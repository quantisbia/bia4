"use client"

/**
 * BIA · Academy · R13.14 · Botões de download de certificado (client)
 *
 * Fazem fetch da API e disparam download via blob — isso evita
 * recarregar a página e permite mostrar loading state.
 */
import { useState } from "react"
import { Download, Loader2, Lock, Trophy, FileText } from "lucide-react"

async function downloadPdf(url: string, filename: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Erro ao gerar PDF" }))
    throw new Error(err.message ?? `Falha ${res.status}`)
  }
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

export function CertificateDownloadButton({
  lessonId,
  label,
  testid,
}: {
  lessonId: string
  label: string
  testid?: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleClick() {
    setBusy(true)
    setErr(null)
    try {
      await downloadPdf(
        `/api/academy/certificates/lesson/${lessonId}`,
        `certificado-aula.pdf`,
      )
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        data-testid={testid ?? "cert-download-btn"}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-900/20"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {label}
      </button>
      {err && (
        <p className="text-[10px] text-rose-300 text-center">{err}</p>
      )}
    </div>
  )
}

export function ProgramDownloadButton({
  variant,
  disabled,
  label,
  testid,
}: {
  variant: "partial" | "full"
  disabled: boolean
  label: string
  testid?: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleClick() {
    if (disabled) return
    setBusy(true)
    setErr(null)
    try {
      const url = variant === "partial"
        ? "/api/academy/certificates/program?partial=1"
        : "/api/academy/certificates/program"
      await downloadPdf(url, variant === "partial" ? "declaracao-progresso.pdf" : "certificado-conclusao.pdf")
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }

  const Icon = disabled ? Lock : variant === "full" ? Trophy : FileText
  const colorClasses = disabled
    ? "bg-white/[0.04] text-gray-500 cursor-not-allowed border border-white/[0.08]"
    : variant === "full"
      ? "bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white shadow-lg shadow-amber-900/30"
      : "bg-gradient-to-r from-fuchsia-600 to-pink-500 hover:from-fuchsia-500 hover:to-pink-400 text-white shadow-lg shadow-fuchsia-900/30"

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || disabled}
        data-testid={testid ?? "program-download-btn"}
        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${colorClasses}`}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
        {label}
      </button>
      {err && (
        <p className="text-xs text-rose-300 text-center">{err}</p>
      )}
    </div>
  )
}
