/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Learning Store (R12.54)
 *  ─────────────────────────────────────────────────────────────────────
 *  Camada de persistência dos RESULTADOS DE BIOIMPRESSÃO da BIA.
 *
 *  Cada vez que o usuário valida uma impressão pós-fato no /execute,
 *  um `PrintResult` é gravado aqui. Da próxima vez que ele escolher o
 *  mesmo `(tissue, bioink)`, a BIA puxa o histórico e:
 *    · Se tem ≥ 1 resultado EXCELENTE → propõe ESSES parâmetros
 *    · Se só tem resultados RUINS → propõe ajuste contrário (R12.54
 *      faz heurística: subextrusão → +10% fluxo; superextrusão → -10%)
 *    · Sem histórico → usa o preset científico do tissue-presets.ts
 *
 *  Arquitetura: API agnóstica de backend. A implementação atual usa
 *  localStorage (sandbox, offline, instantânea). Migração futura para
 *  Cloudflare D1 substitui só a implementação do `Backend` — a API
 *  pública permanece IDÊNTICA, então código que consome o store
 *  (slice page, execute page) NÃO PRECISA mudar.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { PresetParams } from "./tissue-presets"

// ─── Tipos públicos ────────────────────────────────────────────────────

/**
 * Qualidade auto-avaliada pelo usuário pós-impressão.
 *
 *  · "excelente"  → forma boa, viabilidade boa, repetível, salvar como ouro
 *  · "aceitavel"  → deu pra usar mas com ressalvas (ajustar próxima vez)
 *  · "ruim"       → precisa refazer; salvar pra evitar repetir os mesmos params
 */
export type PrintQuality = "excelente" | "aceitavel" | "ruim"

/**
 * Issues comuns que o usuário pode marcar via checkboxes. Lista fechada
 * (pra permitir agregação estatística); observações livres vão em `notes`.
 */
export type PrintIssue =
  | "subextrusao"           // linhas finas, fragmentadas → aumentar fluxo
  | "superextrusao"         // borramento horizontal → diminuir fluxo
  | "colapso"               // peça desmorona → mais perímetros / crosslink mais forte
  | "ma_aderencia"          // primeira camada não fixa → bed temp / altura
  | "desidratacao"          // bioink seca durante print → velocidade / câmara
  | "obstrucao_bico"        // bocal entupiu → temperatura / viscosidade
  | "forma_ok_fragil"       // shape correto mas quebra fácil → crosslink
  | "forma_ok_otima"        // tudo perfeito (associada a "excelente")
  | "viabilidade_baixa"     // shape OK mas células morreram → shear/pressão
  | "geometria_perdida"     // não saiu nem com a forma → params drásticos errados

/** Resultado de uma impressão registrado pelo usuário */
export interface PrintResult {
  /** ID único — gerado automaticamente (timestamp + random) */
  id: string
  /** ID do tecido (membrana, vaso, musculo, nervo, …) */
  tissueId: string
  /** ID do bioink (alginate, gelma, …) */
  bioinkId: string
  /** ID da geometria impressa (heart, kidney, nose, …) */
  geometryId: string
  /** Parâmetros usados na impressão (snapshot completo) */
  params: PresetParams
  /** Auto-avaliação do usuário */
  quality: PrintQuality
  /** Issues marcadas via checkboxes (pode ser vazio) */
  issues: PrintIssue[]
  /** Observações livres do usuário (opcional) */
  notes: string
  /** Quando foi registrado (epoch ms) */
  createdAt: number
}

/** Estatísticas agregadas pra um `(tissueId, bioinkId)` */
export interface CombinationStats {
  tissueId: string
  bioinkId: string
  total: number
  excelente: number
  aceitavel: number
  ruim: number
  /**
   * Issues mais frequentes (das gravações ruins/aceitáveis) — sugere
   * o que está dando errado historicamente.
   */
  topIssues: Array<{ issue: PrintIssue; count: number }>
}

// ─── Backend abstrato ──────────────────────────────────────────────────

/**
 * Interface mínima que qualquer backend (localStorage, D1, REST API)
 * precisa implementar. Trocar de localStorage pra D1 é só fornecer uma
 * implementação alternativa desta interface.
 */
interface LearningBackend {
  save(result: PrintResult): Promise<void>
  list(): Promise<PrintResult[]>
  listByCombination(tissueId: string, bioinkId: string): Promise<PrintResult[]>
  clear(): Promise<void>
}

// ─── Implementação localStorage ────────────────────────────────────────

const STORAGE_KEY = "bia.print-results.v1"

/**
 * Backend localStorage. Síncrono internamente mas exposto como Promise
 * pra ficar drop-in compatível com a futura impl D1 (que é fetch-based).
 *
 * Limites do localStorage: ~5-10 MB por origin. Cada PrintResult tem
 * ~1-2 KB → cabem 2500-5000 registros antes de saturar. Quando aproximar
 * isso (ainda longe), a gente migra pra D1.
 */
class LocalStorageBackend implements LearningBackend {
  private readAll(): PrintResult[] {
    if (typeof window === "undefined") return []
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed as PrintResult[]
    } catch {
      return []
    }
  }

  private writeAll(results: PrintResult[]): void {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
    } catch (e) {
      // QuotaExceededError — localStorage cheio. Drop dos mais antigos.
      // Mantém só os 1000 mais recentes.
      const recent = results.slice(-1000)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
      } catch {
        // Se mesmo assim não cabe, falha silenciosa (usuário precisa
        // de console / clear cache).
        console.error("BIA learning store: localStorage cheio, mesmo após poda.", e)
      }
    }
  }

  async save(result: PrintResult): Promise<void> {
    const all = this.readAll()
    all.push(result)
    this.writeAll(all)
  }

  async list(): Promise<PrintResult[]> {
    return this.readAll()
  }

  async listByCombination(tissueId: string, bioinkId: string): Promise<PrintResult[]> {
    return this.readAll().filter(
      (r) => r.tissueId === tissueId && r.bioinkId === bioinkId,
    )
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

// ─── Futuro: implementação D1 (R12.55, comentada por enquanto) ─────────

/**
 * R12.55 (futuro): backend Cloudflare D1.
 *
 * Quando o D1 estiver bindado no projeto:
 *   1) Criar `/api/learning/save` (POST) e `/api/learning/list` (GET)
 *      que falam direto com `env.DB.prepare(...).run() / .all()`.
 *   2) Implementar `D1Backend` abaixo (fetch pras 2 rotas).
 *   3) Trocar `defaultBackend = new LocalStorageBackend()` →
 *      `new D1Backend()` (ou estratégia híbrida: D1 + cache local).
 *   4) Adicionar migration de dados existentes: ler do localStorage,
 *      enviar pra D1 em batch, marcar como migrado.
 */
// class D1Backend implements LearningBackend {
//   async save(result: PrintResult): Promise<void> {
//     await fetch("/api/learning/save", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(result),
//     })
//   }
//   async list(): Promise<PrintResult[]> {
//     const res = await fetch("/api/learning/list")
//     return res.json()
//   }
//   async listByCombination(tissueId: string, bioinkId: string): Promise<PrintResult[]> {
//     const res = await fetch(`/api/learning/list?tissue=${tissueId}&bioink=${bioinkId}`)
//     return res.json()
//   }
//   async clear(): Promise<void> { await fetch("/api/learning/clear", { method: "POST" }) }
// }

// ─── Backend default + estratégia híbrida (R12.54 → R12.55) ────────────

const defaultBackend: LearningBackend = new LocalStorageBackend()

// ─── API pública ───────────────────────────────────────────────────────

/**
 * Gera um ID único pra novo PrintResult.
 * Formato: `pr_<timestamp>_<random>` — legível e ordenável por timestamp.
 */
export function generateResultId(): string {
  const ts = Date.now().toString(36)
  const rnd = Math.random().toString(36).slice(2, 8)
  return `pr_${ts}_${rnd}`
}

/**
 * Grava o resultado de uma impressão. Use após o usuário fechar o modal
 * de feedback no /execute.
 */
export async function savePrintResult(
  result: Omit<PrintResult, "id" | "createdAt"> & Partial<Pick<PrintResult, "id" | "createdAt">>,
): Promise<PrintResult> {
  const full: PrintResult = {
    id: result.id ?? generateResultId(),
    createdAt: result.createdAt ?? Date.now(),
    tissueId: result.tissueId,
    bioinkId: result.bioinkId,
    geometryId: result.geometryId,
    params: result.params,
    quality: result.quality,
    issues: result.issues,
    notes: result.notes,
  }
  await defaultBackend.save(full)
  return full
}

/**
 * Lista todos os resultados gravados (uso: tela de histórico/admin).
 */
export async function listAllResults(): Promise<PrintResult[]> {
  return defaultBackend.list()
}

/**
 * Lista resultados de uma combinação específica.
 *
 * Use no /slice quando o usuário escolhe (tissue, bioink) — usado pela
 * adaptação inteligente.
 */
export async function listResultsForCombination(
  tissueId: string,
  bioinkId: string,
): Promise<PrintResult[]> {
  return defaultBackend.listByCombination(tissueId, bioinkId)
}

/**
 * Limpa TODOS os resultados (botão "Resetar histórico" — uso administrativo).
 */
export async function clearAllResults(): Promise<void> {
  return defaultBackend.clear()
}

// ─── Estatísticas e adaptação inteligente ──────────────────────────────

/**
 * Computa estatísticas agregadas pra um `(tissueId, bioinkId)`. Use no
 * card "Recomendado pela BIA" pra mostrar:
 *   "📊 Histórico: 3 excelentes, 1 aceitável, 0 ruins"
 */
export async function getCombinationStats(
  tissueId: string,
  bioinkId: string,
): Promise<CombinationStats> {
  const results = await listResultsForCombination(tissueId, bioinkId)
  const stats: CombinationStats = {
    tissueId,
    bioinkId,
    total: results.length,
    excelente: 0,
    aceitavel: 0,
    ruim: 0,
    topIssues: [],
  }
  const issueCounts = new Map<PrintIssue, number>()
  for (const r of results) {
    if (r.quality === "excelente") stats.excelente++
    else if (r.quality === "aceitavel") stats.aceitavel++
    else if (r.quality === "ruim") stats.ruim++
    for (const issue of r.issues) {
      issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1)
    }
  }
  stats.topIssues = Array.from(issueCounts.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  return stats
}

/**
 * Recomendação inteligente baseada em histórico.
 *
 * Lógica de decisão (em ordem de preferência):
 *
 *   1. Se existe ≥ 1 resultado EXCELENTE → propõe os params do MAIS RECENTE
 *      excelente (assume que o usuário pode ter melhorado a técnica).
 *
 *   2. Se só tem ACEITÁVEL → propõe params do mais recente aceitável
 *      (já funciona, talvez melhore com pequenos ajustes).
 *
 *   3. Se só tem RUIM → aplica ajuste heurístico contra as issues mais
 *      frequentes em cima dos params do PRESET CIENTÍFICO BASE (não usa os
 *      params ruins — eles são tóxicos como ponto de partida).
 *
 *   4. Sem histórico → retorna `null` (signal pro caller usar o preset
 *      científico padrão de tissue-presets.ts).
 *
 * IMPORTANTE: este função NÃO conhece o preset base — só sabe trabalhar
 * com o histórico. O caller (/slice page) é responsável por aplicar o
 * preset base quando isso retorna null OU quando retorna `mode: "adjusted"`
 * (caso onde precisa do baseline pra aplicar o delta).
 */
export interface AdaptationResult {
  /** Tipo da adaptação aplicada */
  mode: "from_excellent" | "from_acceptable" | "adjusted_from_bad" | "no_history"
  /**
   * Parâmetros recomendados (após heurística).
   * - Em "from_excellent" / "from_acceptable": params do resultado histórico
   * - Em "adjusted_from_bad": params SUGGESTED (delta) — caller deve aplicar
   *   em cima do preset base via `applyAdjustments()`.
   * - Em "no_history": null (caller usa preset base direto)
   */
  params: PresetParams | null
  /**
   * Ajustes sugeridos quando mode === "adjusted_from_bad". O caller
   * aplica esses deltas sobre o preset base.
   */
  adjustments?: ParamAdjustment[]
  /** Mensagem humana pra mostrar no card de recomendação */
  message: string
  /** Estatísticas do histórico (sempre disponível) */
  stats: CombinationStats
}

/**
 * Ajuste sugerido a aplicar em cima do preset base. Cada ajuste descreve
 * UMA mudança e a razão dela (rastreabilidade no UI).
 */
export interface ParamAdjustment {
  param: keyof PresetParams
  /** Operação a aplicar */
  op: "delta" | "set"
  /** Valor (delta) — número pra delta, qualquer pra set */
  value: number | string | boolean
  /** Justificativa em pt-BR */
  reason: string
}

/**
 * Aplica uma lista de ajustes sobre um preset base. Imutável (retorna
 * cópia).
 */
export function applyAdjustments(
  base: PresetParams,
  adjustments: ParamAdjustment[],
): PresetParams {
  const out: PresetParams = { ...base }
  for (const adj of adjustments) {
    if (adj.op === "set") {
      // Type assertion necessária — TS não consegue provar que o tipo
      // do valor combina com o tipo do campo dinâmico. Confiamos na
      // construção via `buildAdjustmentsFromIssues`.
      (out as Record<string, unknown>)[adj.param] = adj.value
    } else if (adj.op === "delta" && typeof adj.value === "number") {
      const cur = (out as Record<string, unknown>)[adj.param]
      if (typeof cur === "number") {
        (out as Record<string, unknown>)[adj.param] = cur + adj.value
      }
    }
  }
  return out
}

/**
 * Heurísticas issue → ajuste. Mapeia cada issue conhecida pra UM ajuste
 * que tem boa chance de resolver na próxima impressão.
 *
 * Esses números vêm de:
 *   - Nelson et al. 2021 (printability matrix) — deltas de fluxo/speed
 *   - Blaeser et al. 2016 — shear vs viabilidade
 *   - Experiência prática do Cura/PrusaSlicer adaptada pra hidrogéis
 *
 * IMPORTANTE: aplicar TODOS os ajustes simultaneamente pode ser
 * contraproducente (mudança grande demais → impossível debugar). Por
 * isso `buildAdjustmentsFromIssues` retorna NO MÁXIMO 2 ajustes — os
 * mais frequentes no histórico — pra dar o passo certo na direção certa.
 */
const ISSUE_TO_ADJUSTMENT: Record<PrintIssue, ParamAdjustment | null> = {
  subextrusao: {
    param: "flowPercent",
    op: "delta",
    value: 10,
    reason: "Subextrusão recorrente → aumentar fluxo +10% (M221 vai compensar a falta de material).",
  },
  superextrusao: {
    param: "flowPercent",
    op: "delta",
    value: -10,
    reason: "Superextrusão recorrente → diminuir fluxo -10% (reduz borramento horizontal).",
  },
  colapso: {
    param: "walls",
    op: "delta",
    value: 1,
    reason: "Colapso recorrente → adicionar 1 perímetro (mais casca = mais estrutura pré-crosslinking).",
  },
  ma_aderencia: {
    param: "bedTempC",
    op: "delta",
    value: 5,
    reason: "Má aderência da primeira camada → aumentar bed temp +5°C (melhora gelificação no contato com a mesa).",
  },
  desidratacao: {
    param: "printSpeedMmS",
    op: "delta",
    value: 2,
    reason: "Desidratação recorrente → aumentar velocidade +2 mm/s (menos tempo exposto ao ar).",
  },
  obstrucao_bico: {
    param: "cartridgeTempC",
    op: "delta",
    value: 2,
    reason: "Obstrução do bocal → aumentar cartridge temp +2°C (reduz viscosidade, fluxo melhora).",
  },
  forma_ok_fragil: {
    param: "skirtLoops",
    op: "delta",
    value: 1,
    reason: "Peça frágil → adicionar 1 loop de saia (estabiliza fluxo na borda externa).",
  },
  viabilidade_baixa: {
    param: "pressureKPa",
    op: "delta",
    value: -10,
    reason: "Viabilidade baixa → reduzir pressão -10 kPa (menor shear stress nas células).",
  },
  forma_ok_otima: null, // sem ajuste — tudo OK
  geometria_perdida: {
    param: "printSpeedMmS",
    op: "delta",
    value: -2,
    reason: "Geometria totalmente perdida → reduzir velocidade -2 mm/s (mais tempo pra cada deposição).",
  },
}

/**
 * Constrói ajustes a partir das issues mais frequentes do histórico.
 * Retorna no máximo 2 ajustes (os mais frequentes) pra não fazer mudança
 * drástica demais.
 */
export function buildAdjustmentsFromIssues(
  topIssues: Array<{ issue: PrintIssue; count: number }>,
): ParamAdjustment[] {
  const out: ParamAdjustment[] = []
  for (const { issue } of topIssues) {
    const adj = ISSUE_TO_ADJUSTMENT[issue]
    if (adj) out.push(adj)
    if (out.length >= 2) break
  }
  return out
}

/**
 * MAIN: recomendação adaptativa de parâmetros baseada em histórico.
 *
 * @param tissueId  ID do tecido escolhido
 * @param bioinkId  ID do bioink escolhido
 * @param basePreset  Parâmetros do preset científico padrão (de tissue-presets.ts).
 *                    Usado como fallback e como base pra ajustes heurísticos.
 *
 * @returns AdaptationResult com mode, params e mensagem.
 */
export async function recommendParams(
  tissueId: string,
  bioinkId: string,
  basePreset: PresetParams,
): Promise<AdaptationResult> {
  const stats = await getCombinationStats(tissueId, bioinkId)
  const results = await listResultsForCombination(tissueId, bioinkId)

  // Sem histórico → usa preset base
  if (results.length === 0) {
    return {
      mode: "no_history",
      params: null,
      message: "Primeira impressão dessa combinação — usando o preset científico padrão da BIA.",
      stats,
    }
  }

  // Tem excelente → propõe params do mais recente excelente
  const excellents = results
    .filter((r) => r.quality === "excelente")
    .sort((a, b) => b.createdAt - a.createdAt)

  if (excellents.length > 0) {
    return {
      mode: "from_excellent",
      params: excellents[0].params,
      message: `Você já teve ${excellents.length} resultado(s) EXCELENTE(s) com essa combinação — propondo os parâmetros do mais recente.`,
      stats,
    }
  }

  // Tem aceitável → propõe params do mais recente aceitável
  const acceptables = results
    .filter((r) => r.quality === "aceitavel")
    .sort((a, b) => b.createdAt - a.createdAt)

  if (acceptables.length > 0) {
    return {
      mode: "from_acceptable",
      params: acceptables[0].params,
      message: `Você teve ${acceptables.length} resultado(s) ACEITÁVEL(is) — propondo os parâmetros do mais recente. Considere pequenos ajustes pra melhorar.`,
      stats,
    }
  }

  // Só tem ruim → ajuste heurístico
  const adjustments = buildAdjustmentsFromIssues(stats.topIssues)
  if (adjustments.length === 0) {
    return {
      mode: "no_history",
      params: null,
      message: `${stats.ruim} resultado(s) ruim(ns) sem issues claras — voltando ao preset científico padrão.`,
      stats,
    }
  }

  const adjusted = applyAdjustments(basePreset, adjustments)
  return {
    mode: "adjusted_from_bad",
    params: adjusted,
    adjustments,
    message: `${stats.ruim} resultado(s) ruim(ns) anteriores. BIA propôs ${adjustments.length} ajuste(s) heurístico(s) — vide rationale abaixo.`,
    stats,
  }
}

// ─── Utilitários de UI (rótulos pt-BR) ─────────────────────────────────

export const QUALITY_LABELS: Record<PrintQuality, { label: string; emoji: string; color: string }> = {
  excelente: { label: "Excelente", emoji: "✅", color: "emerald" },
  aceitavel: { label: "Aceitável", emoji: "⚠️", color: "amber" },
  ruim: { label: "Ruim", emoji: "❌", color: "rose" },
}

export const ISSUE_LABELS: Record<PrintIssue, string> = {
  subextrusao: "Subextrusão (linhas finas/fragmentadas)",
  superextrusao: "Superextrusão (borramento horizontal)",
  colapso: "Colapso (peça desmoronou)",
  ma_aderencia: "Má aderência da primeira camada",
  desidratacao: "Desidratação durante a impressão",
  obstrucao_bico: "Bocal entupiu",
  forma_ok_fragil: "Forma OK mas peça frágil",
  forma_ok_otima: "Forma e integridade ótimas",
  viabilidade_baixa: "Viabilidade celular baixa pós-print",
  geometria_perdida: "Geometria totalmente perdida",
}

/**
 * Lista de issues a mostrar nos checkboxes do modal de feedback, em ordem
 * de frequência prática (mais comuns primeiro).
 */
export const ISSUE_CHECKLIST_ORDER: PrintIssue[] = [
  "subextrusao",
  "superextrusao",
  "ma_aderencia",
  "colapso",
  "desidratacao",
  "obstrucao_bico",
  "forma_ok_fragil",
  "viabilidade_baixa",
  "geometria_perdida",
  "forma_ok_otima",
]
