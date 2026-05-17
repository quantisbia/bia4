/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · execute-handoff — Passa G-code entre páginas via sessionStorage
 *  ─────────────────────────────────────────────────────────────────────
 *  Permite que páginas de geração de G-code (/quick-gcode, /gcode/medical,
 *  /gcode/advanced, /slice, etc.) enviem um G-code direto para /execute
 *  sem precisar de gating ou roteamento via context global.
 *
 *  Uso:
 *    sendToExecute({ gcode: "...", name: "ear.gcode", from: "medical" })
 *    → redireciona para /dashboard/bioprint/execute
 *    → /execute lê o handoff no useEffect inicial e popula o campo
 *
 *  R12.15
 * ═══════════════════════════════════════════════════════════════════════
 */

const HANDOFF_KEY = "bia.execute.gcode.handoff"

export interface ExecuteHandoff {
  gcode: string
  name?: string
  from?: string
}

/**
 * Grava o handoff e navega para /dashboard/bioprint/execute.
 * Deve ser chamado dentro de um click handler (uso de window.location).
 */
export function sendToExecute(payload: ExecuteHandoff): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload))
  } catch {
    /* sessionStorage cheio ou bloqueado — fallback abaixo */
  }
  if (typeof window !== "undefined") {
    window.location.href = "/dashboard/bioprint/execute"
  }
}

/** Lê (e consome) o handoff, se existir. */
export function consumeExecuteHandoff(): ExecuteHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    sessionStorage.removeItem(HANDOFF_KEY)
    return JSON.parse(raw) as ExecuteHandoff
  } catch {
    return null
  }
}
