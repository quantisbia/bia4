/**
 * BIA v4 · R17 · Memória de fluxo (M221) por biotinta
 * ───────────────────────────────────────────────────
 * Problema real de bancada: ao clicar em "Bioimprimir", o fluxo calculado
 * quase sempre é POUCO e não sai biotinta — a usuária precisa subir o
 * fator de extrusão em tempo real (M221). Esta lib:
 *   · sugere um fluxo INICIAL por material (ponto de partida generoso,
 *     não 50 %);
 *   · lembra o último fluxo que FUNCIONOU para cada biotinta (localStorage),
 *     para o próximo print já começar certo;
 *   · fornece passos de ajuste rápidos (+10 %, +25 %) e limites seguros.
 *
 * Lib pura — sem DOM além de localStorage guardado por try/catch.
 */

export interface FlowMemoryEntry {
  materialKey: string
  materialLabel: string
  /** último M221 confirmado como "saiu biotinta" */
  lastGoodPercent: number
  /** fluxo com que a impressão começou (para medir o quanto subiu) */
  startPercent: number
  /** quantas vezes foi confirmado */
  samples: number
  updatedAt: number
}

const KEY = "bia.flow-memory.v1"
export const FLOW_MIN = 10
export const FLOW_MAX = 300
export const FLOW_STEPS = [10, 25] as const

/**
 * Ponto de partida por material quando NÃO há memória.
 * Valores baseados em bancada BioEnder/seringa 3–5 mL: hidrogéis viscosos
 * (alginato-gelatina, CNF, Pluronic) precisam de 100–150 %; GelMA/colágeno
 * ~100 %; só pastas de calibração ou FDM ficam em 60–80 %.
 */
export function defaultFlowFor(materialKey: string): number {
  const m = materialKey.toLowerCase()
  if (/nivea|creme|pasta|paste|calib/.test(m)) return 80
  if (/pluronic|f127|cnf|nanocel|hap|hidroxi|cerami|pcl/.test(m)) return 130
  if (/alginat|gelatin|alg_gel|fibrin|hama|chitos|quitos/.test(m)) return 120
  if (/gelma|colag|collag|decm|matrigel|bme/.test(m)) return 100
  return 110
}

export function normalizeMaterialKey(materialIdOrLabel: string | null | undefined): string {
  return (materialIdOrLabel ?? "generic").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "generic"
}

function readAll(): Record<string, FlowMemoryEntry> {
  try {
    if (typeof window === "undefined") return {}
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, FlowMemoryEntry>) : {}
  } catch { return {} }
}
function writeAll(all: Record<string, FlowMemoryEntry>) {
  try { if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* noop */ }
}

export function getFlowMemory(materialKey: string): FlowMemoryEntry | null {
  return readAll()[normalizeMaterialKey(materialKey)] ?? null
}

/** Fluxo inicial recomendado: memória (se houver) ou default por material. */
export function suggestStartFlow(materialKey: string): { percent: number; source: "memory" | "default"; entry: FlowMemoryEntry | null } {
  const entry = getFlowMemory(materialKey)
  if (entry && entry.lastGoodPercent >= FLOW_MIN) return { percent: clampFlow(entry.lastGoodPercent), source: "memory", entry }
  return { percent: defaultFlowFor(materialKey), source: "default", entry: null }
}

/** Registra que `percent` funcionou para este material. */
export function rememberGoodFlow(materialKey: string, materialLabel: string, percent: number, startPercent: number): FlowMemoryEntry {
  const key = normalizeMaterialKey(materialKey)
  const all = readAll()
  const prev = all[key]
  const entry: FlowMemoryEntry = {
    materialKey: key,
    materialLabel: materialLabel || key,
    // média ponderada leve: 70 % novo, 30 % histórico — converge rápido mas não oscila
    lastGoodPercent: prev ? Math.round(percent * 0.7 + prev.lastGoodPercent * 0.3) : Math.round(percent),
    startPercent: Math.round(startPercent),
    samples: (prev?.samples ?? 0) + 1,
    updatedAt: Date.now(),
  }
  all[key] = entry
  writeAll(all)
  return entry
}

export function forgetFlow(materialKey: string) {
  const all = readAll(); delete all[normalizeMaterialKey(materialKey)]; writeAll(all)
}

export function listFlowMemory(): FlowMemoryEntry[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function clampFlow(v: number): number {
  return Math.max(FLOW_MIN, Math.min(FLOW_MAX, Math.round(v)))
}

/** Próximo passo sugerido quando "não está saindo": sobe agressivo no começo, fino depois. */
export function nextFlowBump(current: number): number {
  if (current < 100) return clampFlow(current + 25)
  if (current < 160) return clampFlow(current + 15)
  return clampFlow(current + 10)
}

/**
 * Mensagem de orientação pt-BR para o painel "Está saindo biotinta?".
 */
export function flowAdvice(current: number, material: string): string {
  if (current < 80) return `Fluxo ${current} % é baixo para ${material}. Suba para ≥ 100 % — quase sempre o motivo de não sair biotinta.`
  if (current < 120) return `Se o cordão está fino ou falhando, suba +10–25 %. Hidrogéis viscosos costumam pedir 120–150 %.`
  if (current < 200) return `Fluxo alto já aplicado. Se ainda não sai, o problema é outro: ar na seringa (purgue 5–10 mm), agulha entupida ou gel frio demais.`
  return `Acima de 200 % — verifique agulha/entupimento antes de subir mais; risco de superextrusão quando destravar.`
}
