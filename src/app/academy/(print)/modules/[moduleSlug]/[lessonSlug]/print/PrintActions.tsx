"use client"

/**
 * Barra de ações da versão para impressão — R30.
 * Só aparece em tela (oculta via @media print). `auto` dispara o diálogo
 * de impressão após o carregamento (link "Baixar PDF" usa ?auto=1).
 */
import { useEffect } from "react"
import { ArrowLeft, Printer } from "lucide-react"

export function PrintActions({ backHref, auto }: { backHref: string; auto: boolean }) {
  useEffect(() => {
    if (!auto) return
    const t = window.setTimeout(() => window.print(), 600)
    return () => window.clearTimeout(t)
  }, [auto])

  return (
    <div className="print-actions" data-testid="print-actions">
      <a href={backHref}><ArrowLeft size={14} /> Voltar à aula</a>
      <span className="hint">Versão integral do material · use &quot;Salvar como PDF&quot; no diálogo de impressão.</span>
      <span className="spacer" />
      <button type="button" className="primary" onClick={() => window.print()} data-testid="print-button">
        <Printer size={14} /> Imprimir / Salvar PDF
      </button>
    </div>
  )
}
