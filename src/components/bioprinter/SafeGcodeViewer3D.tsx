"use client"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · SafeGcodeViewer3D — wrapper com ErrorBoundary (R12.17)
 *  ───────────────────────────────────────────────────────────────────────
 *  Envolve o GcodeViewer3D em um ErrorBoundary local. Se o viewer falhar
 *  (por exemplo: G-code malformado, parsed inesperado, canvas indisponível),
 *  o resto da página NÃO é destruído — em vez disso, mostramos um cartão
 *  de erro claro com a mensagem real e botão para tentar novamente.
 *
 *  Por que isso importa: a página /execute tem MUITOS sub-painéis (terminal,
 *  joystick, conexão USB). Se o viewer 3D quebrar, o usuário ainda
 *  consegue executar a impressão sem o preview.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { GcodeViewer3D, type GcodeViewer3DProps } from "./GcodeViewer3D"

interface State {
  hasError: boolean
  error: Error | null
  resetKey: number
}

export class SafeGcodeViewer3D extends Component<GcodeViewer3DProps, State> {
  state: State = { hasError: false, error: null, resetKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // eslint-disable-next-line no-console
    console.error("[SafeGcodeViewer3D] viewer crashed:", error, info)
  }

  reset = () => {
    this.setState((s) => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }))
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const e = this.state.error
      return (
        <div className={`relative w-full h-full bg-[#05050c] rounded-xl overflow-hidden border border-rose-500/30 flex items-center justify-center ${this.props.className ?? ""}`}>
          <div className="text-center p-6 max-w-md">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <h4 className="text-sm font-bold text-rose-100 mb-1">Preview 3D indisponível</h4>
            <p className="text-xs text-rose-200/70 leading-relaxed mb-3">
              O renderizador do toolpath falhou ao processar este G-code.
              O resto da página continua funcionando — você ainda pode validar
              e enviar à bioimpressora.
            </p>
            {e?.message && (
              <pre className="text-[10px] text-rose-200/60 bg-black/40 rounded p-2 font-mono text-left max-h-24 overflow-auto whitespace-pre-wrap break-words mb-3">
                {e.name}: {e.message}
              </pre>
            )}
            <button
              onClick={this.reset}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-100 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Tentar renderizar de novo
            </button>
          </div>
        </div>
      )
    }
    // resetKey força remount completo após "Tentar de novo"
    return <GcodeViewer3D key={this.state.resetKey} {...this.props} />
  }
}
