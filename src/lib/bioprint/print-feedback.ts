/**
 * BIA v4 · R23 · Laço fechado de aprendizado pós-impressão
 * ─────────────────────────────────────────────────────────────────────
 * Mandato Janaina: "incluir uma pergunta final após a bioimpressão — o
 * usuário escreve como foi e dá uma nota de 1 a 5; todas as notas 3, 2 e 1
 * você aprenderá a melhorar: nota 3 + 'saiu muito volume de biotinta' →
 * próximo G-code sai com menos; nota 2 + 'começou longe do ponto zero' →
 * corrigir rapidamente a lógica de início."
 *
 * Inspirado no "closed-loop / AI-native" (Zdravković 2025; Zhang 2025):
 * cada impressão vira dado; o sinal (nota + relato) realimenta os
 * parâmetros do próximo fatiamento. Aqui o "modelo" é determinístico e
 * explicável: regras pt-BR → ajustes com justificativa, acumulados por
 * (biotinta, geometria) e aplicados pelo BioSlicer com um banner visível.
 *
 * Persistência: localStorage (chave abaixo). Sem rede, sem custo.
 */

export const FEEDBACK_KEY = "bia.print-feedback.v1"

export type Rating = 1 | 2 | 3 | 4 | 5

/** Ajuste aprendido — aplicado sobre SliceParams/ExtrusionModel do BioSlicer. */
export interface LearnedAdjustment {
  /** alvo do ajuste */
  target:
    | "flowMultiplier"        // × (ExtrusionModel.flowMultiplier)
    | "speedPerimeter_mms"    // mm/s (e infill proporcional)
    | "layerHeight_mm"        // mm
    | "firstLayerHeight_mm"   // mm
    | "retractVolume_uL"      // µL
    | "primeVolume_uL"        // µL
    | "wallCount"             // n
    | "infillDensity"         // %
    | "zHop_mm"               // mm
    | "cartridgeTemp_C"       // °C
    | "originCheck"           // flag: reforçar G92/pré-flight e validador de origem
    | "skirtLoops"            // n
  op: "mul" | "add" | "set"
  value: number
  /** por quê (pt-BR, mostrado no banner e gravado no G-code) */
  reason: string
  /** sintoma detectado no relato */
  symptom: string
}

export interface PrintFeedback {
  id: string
  createdAt: number
  rating: Rating
  text: string
  /** contexto da impressão */
  materialId?: string | null
  geometryId?: string | null
  profileId?: string | null
  /** parâmetros em vigor (resumo) — para auditoria */
  params?: { flow?: number; speed?: number; layer?: number; infill?: string; density?: number }
  /** ajustes derivados (vazio para 4–5 ★) */
  adjustments: LearnedAdjustment[]
}

// ─── Interpretação do relato (pt-BR, determinística e explicável) ────────
interface Rule { test: RegExp; symptom: string; make: (severity: number) => LearnedAdjustment[] }

/** severidade: nota 3 → 1 (suave), nota 2 → 2 (médio), nota 1 → 3 (forte) */
const sev = (rating: Rating) => (rating >= 4 ? 0 : rating === 3 ? 1 : rating === 2 ? 2 : 3)

const RULES: Rule[] = [
  {
    test: /(muito|excesso|demais|exager).*(volume|biotinta|material|tinta|fluxo)|(volume|biotinta|material|fluxo).*(muito|excesso|demais|exager)|super.?extru|borr|espalh|achatad|transbord|grossa demais|linha(s)? (muito )?larga/i,
    symptom: "excesso de biotinta (superextrusão)",
    make: (s) => [
      { target: "flowMultiplier", op: "mul", value: [1, 0.9, 0.8, 0.7][s], reason: `Fluxo reduzido ${Math.round((1 - [1, 0.9, 0.8, 0.7][s]) * 100)} % — você relatou excesso de biotinta.`, symptom: "excesso de biotinta (superextrusão)" },
      ...(s >= 2 ? [{ target: "speedPerimeter_mms", op: "mul", value: 1.15, reason: "Velocidade +15 % — menos material por mm de cordão.", symptom: "excesso de biotinta (superextrusão)" } as LearnedAdjustment] : []),
    ],
  },
  {
    test: /(pouc|falt|não sa|nao sa|sem sa|quase nad|nada de|insuficien).*(biotinta|material|tinta|volume|fluxo|cordão|cordao)|sub.?extru|linha(s)? (muito )?fina|falh(a|ou|ando)|intermitent|pingo|gotej/i,
    symptom: "falta de biotinta (subextrusão)",
    make: (s) => [
      { target: "flowMultiplier", op: "mul", value: [1, 1.15, 1.3, 1.5][s], reason: `Fluxo aumentado ${Math.round(([1, 1.15, 1.3, 1.5][s] - 1) * 100)} % — você relatou pouca biotinta / cordão falhando.`, symptom: "falta de biotinta (subextrusão)" },
      { target: "primeVolume_uL", op: "add", value: [0, 1, 2, 3][s], reason: "Prime maior ao iniciar cada trecho — evita começo seco.", symptom: "falta de biotinta (subextrusão)" },
      ...(s >= 2 ? [{ target: "speedPerimeter_mms", op: "mul", value: 0.85, reason: "Velocidade −15 % — dá tempo para o gel sair.", symptom: "falta de biotinta (subextrusão)" } as LearnedAdjustment] : []),
    ],
  },
  {
    test: /longe.*(zero|origem|ponto|centro)|(zero|origem).*(longe|errad|fora|deslocad)|começ(ou)? (longe|fora|errad|em outro)|comecou (longe|fora|errad)|fora do (lugar|poço|poco|centro|petri)|deslocad|andou (antes|seco)|viaj(ou)? (antes|seco)|bateu|colid/i,
    symptom: "início fora do ponto zero",
    make: () => [
      { target: "originCheck", op: "set", value: 1, reason: "Reforço do ponto zero: validador exige G92 antes do 1º movimento, bloqueia deslocamento inicial > 5 mm e o pré-flight pede confirmação do bico no ponto zero.", symptom: "início fora do ponto zero" },
      { target: "skirtLoops", op: "set", value: 0, reason: "Skirt desligado — o 1º cordão nasce exatamente no ponto zero.", symptom: "início fora do ponto zero" },
    ],
  },
  {
    test: /desmoron|colaps|afund|cedeu|escorr|derret|mole demais|perdeu (a )?forma|não segur|nao segur|deform/i,
    symptom: "colapso / perda de forma",
    make: (s) => [
      { target: "layerHeight_mm", op: "mul", value: [1, 0.9, 0.85, 0.8][s], reason: "Camada mais fina — cada cordão apoia melhor no anterior.", symptom: "colapso / perda de forma" },
      { target: "speedPerimeter_mms", op: "mul", value: [1, 0.9, 0.85, 0.8][s], reason: "Velocidade menor — menos arrasto na parede.", symptom: "colapso / perda de forma" },
      ...(s >= 2 ? [{ target: "wallCount", op: "add", value: 1, reason: "+1 parede — mais sustentação.", symptom: "colapso / perda de forma" } as LearnedAdjustment] : []),
    ],
  },
  {
    test: /não (grud|ader|fix|col)|nao (grud|ader|fix|col)|solt(ou|a)|descol|arrast(ou|a)|primeira camada/i,
    symptom: "má aderência da 1ª camada",
    make: (s) => [
      { target: "firstLayerHeight_mm", op: "mul", value: [1, 0.9, 0.85, 0.8][s], reason: "1ª camada mais baixa — cordão esmaga e adere.", symptom: "má aderência da 1ª camada" },
      { target: "speedPerimeter_mms", op: "mul", value: 0.9, reason: "Velocidade −10 % — mais tempo de contato.", symptom: "má aderência da 1ª camada" },
    ],
  },
  {
    test: /fio|fiapo|teia|string|puxou|arrast(ou|a) (gel|biotinta|material) (entre|no)|pingou (no|entre)/i,
    symptom: "fios/teias entre trechos",
    make: (s) => [
      { target: "retractVolume_uL", op: "add", value: [0, 1, 2, 3][s], reason: "Retração maior ao terminar cada trecho.", symptom: "fios/teias entre trechos" },
      { target: "zHop_mm", op: "add", value: 0.5, reason: "Z-hop +0,5 mm nos deslocamentos.", symptom: "fios/teias entre trechos" },
    ],
  },
  {
    test: /entup|obstru|travou|parou de sair|secou|ressec/i,
    symptom: "entupimento / secagem do bico",
    make: (s) => [
      { target: "speedPerimeter_mms", op: "mul", value: [1, 1.1, 1.2, 1.3][s], reason: "Mais rápido — menos tempo para o gel secar no bico.", symptom: "entupimento / secagem do bico" },
      { target: "retractVolume_uL", op: "mul", value: 0.5, reason: "Menos retração — evita puxar ar para o bico.", symptom: "entupimento / secagem do bico" },
    ],
  },
  {
    test: /poro(s)? (fechad|pequen|tapad)|muito denso|cheio demais|sem poro/i,
    symptom: "poros fechados / infill denso demais",
    make: (s) => [
      { target: "infillDensity", op: "mul", value: [1, 0.85, 0.75, 0.65][s], reason: "Densidade de infill menor — poros maiores.", symptom: "poros fechados / infill denso demais" },
    ],
  },
  {
    test: /poro(s)? (grande|abert)|muito aberto|pouco denso|frágil|fragil|quebr/i,
    symptom: "estrutura frágil / poros grandes demais",
    make: (s) => [
      { target: "infillDensity", op: "mul", value: [1, 1.15, 1.25, 1.35][s], reason: "Densidade de infill maior.", symptom: "estrutura frágil / poros grandes demais" },
      ...(s >= 2 ? [{ target: "wallCount", op: "add", value: 1, reason: "+1 parede.", symptom: "estrutura frágil / poros grandes demais" } as LearnedAdjustment] : []),
    ],
  },
  {
    test: /(muito )?(quente|aquec|derret)|temperatura (alta|muito)/i,
    symptom: "temperatura alta",
    make: () => [{ target: "cartridgeTemp_C", op: "add", value: -2, reason: "Cartucho −2 °C.", symptom: "temperatura alta" }],
  },
  {
    test: /(muito )?(fri|rígid|rigid|duro)|temperatura (baixa|pouca)/i,
    symptom: "temperatura baixa / gel rígido",
    make: () => [{ target: "cartridgeTemp_C", op: "add", value: 2, reason: "Cartucho +2 °C.", symptom: "temperatura baixa / gel rígido" }],
  },
]

/** Interpreta nota + texto → lista de ajustes (vazia para 4–5 ★ ou sem sintoma reconhecido). */
export function interpretFeedback(rating: Rating, text: string): { symptoms: string[]; adjustments: LearnedAdjustment[] } {
  const s = sev(rating)
  if (s === 0) return { symptoms: [], adjustments: [] }
  const t = (text || "").normalize("NFC")
  const symptoms: string[] = []
  const adjustments: LearnedAdjustment[] = []
  for (const r of RULES) {
    if (r.test.test(t)) {
      symptoms.push(r.symptom)
      adjustments.push(...r.make(s))
    }
  }
  // nota baixa sem sintoma reconhecido → ajuste conservador genérico
  if (adjustments.length === 0 && s >= 2) {
    adjustments.push({ target: "speedPerimeter_mms", op: "mul", value: 0.9, reason: "Nota baixa sem sintoma específico — velocidade −10 % como medida conservadora. Descreva o que aconteceu para eu ajustar melhor.", symptom: "não especificado" })
    symptoms.push("não especificado")
  }
  return { symptoms, adjustments: dedupe(adjustments) }
}

function dedupe(list: LearnedAdjustment[]): LearnedAdjustment[] {
  // Se dois ajustes miram o mesmo alvo com ops opostas (fluxo ↑ e ↓), o relato é ambíguo → mantém o primeiro.
  const seen = new Map<string, LearnedAdjustment>()
  for (const a of list) if (!seen.has(a.target)) seen.set(a.target, a)
  return Array.from(seen.values())
}

// ─── Persistência ─────────────────────────────────────────────────────────
function load(): PrintFeedback[] {
  try { const raw = localStorage.getItem(FEEDBACK_KEY); return raw ? (JSON.parse(raw) as PrintFeedback[]) : [] } catch { return [] }
}
function store(list: PrintFeedback[]) { try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list.slice(-200))) } catch { /* noop */ } }

export function saveFeedback(fb: Omit<PrintFeedback, "id" | "createdAt" | "adjustments">): PrintFeedback {
  const { adjustments } = interpretFeedback(fb.rating, fb.text)
  const full: PrintFeedback = { ...fb, id: `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now(), adjustments }
  const list = load(); list.push(full); store(list)
  return full
}
export function listFeedback(): PrintFeedback[] { return load() }
export function clearFeedback() { try { localStorage.removeItem(FEEDBACK_KEY) } catch { /* noop */ } }

/**
 * Ajustes PENDENTES para o próximo fatiamento: pega o último feedback com
 * nota ≤ 3 que ainda não foi "consumido" (aplicado num G-code). Prioriza o
 * mesmo material/geometria; se não houver, usa o último global (o sintoma
 * "fora do ponto zero" ou "muito volume" costuma ser da impressora, não da peça).
 */
export function pendingAdjustments(ctx: { materialId?: string | null; geometryId?: string | null }): { feedback: PrintFeedback | null; adjustments: LearnedAdjustment[] } {
  const list = load().filter((f) => f.rating <= 3 && f.adjustments.length > 0 && !consumed().has(f.id))
  if (list.length === 0) return { feedback: null, adjustments: [] }
  const same = list.filter((f) => (ctx.materialId && f.materialId === ctx.materialId) || (ctx.geometryId && f.geometryId === ctx.geometryId))
  const pick = (same.length ? same : list).slice(-1)[0]
  return { feedback: pick, adjustments: pick.adjustments }
}

const CONSUMED_KEY = "bia.print-feedback.consumed.v1"
function consumed(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(CONSUMED_KEY) ?? "[]") as string[]) } catch { return new Set() } }
/** Marca um feedback como aplicado (chamado quando o G-code é gerado com os ajustes). */
export function markConsumed(id: string) { try { const s = consumed(); s.add(id); localStorage.setItem(CONSUMED_KEY, JSON.stringify(Array.from(s).slice(-200))) } catch { /* noop */ } }

// ─── Aplicação sobre os parâmetros do BioSlicer ───────────────────────────
export interface ApplyTarget {
  params: {
    speedPerimeter_mms: number; speedInfill_mms: number; speedFirstLayer_mms: number
    layerHeight_mm: number; firstLayerHeight_mm: number; wallCount: number; infillDensity: number
    zHop_mm: number; cartridgeTemp_C: number | null; skirtLoops: number
  }
  extrusion: { flowMultiplier: number; retractVolume_uL: number; primeVolume_uL: number }
}

/** Aplica ajustes (imutável) e devolve também as linhas de comentário para o G-code. */
export function applyLearned<T extends ApplyTarget>(t: T, adjustments: LearnedAdjustment[]): { out: T; notes: string[]; originCheck: boolean } {
  const P = { ...t.params }; const X = { ...t.extrusion }
  const notes: string[] = []
  let originCheck = false
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const r2 = (v: number) => Math.round(v * 100) / 100
  for (const a of adjustments) {
    switch (a.target) {
      case "flowMultiplier": X.flowMultiplier = clamp(r2(a.op === "mul" ? X.flowMultiplier * a.value : a.op === "add" ? X.flowMultiplier + a.value : a.value), 0.3, 3); break
      case "speedPerimeter_mms": {
        const k = a.op === "mul" ? a.value : a.op === "add" ? (P.speedPerimeter_mms + a.value) / P.speedPerimeter_mms : a.value / P.speedPerimeter_mms
        P.speedPerimeter_mms = clamp(r2(P.speedPerimeter_mms * k), 0.5, 40)
        P.speedInfill_mms = clamp(r2(P.speedInfill_mms * k), 0.5, 50)
        P.speedFirstLayer_mms = clamp(r2(P.speedFirstLayer_mms * k), 0.5, 30)
        break
      }
      case "layerHeight_mm": P.layerHeight_mm = clamp(r2(a.op === "mul" ? P.layerHeight_mm * a.value : a.op === "add" ? P.layerHeight_mm + a.value : a.value), 0.05, 2); break
      case "firstLayerHeight_mm": P.firstLayerHeight_mm = clamp(r2(a.op === "mul" ? P.firstLayerHeight_mm * a.value : a.op === "add" ? P.firstLayerHeight_mm + a.value : a.value), 0.05, 2); break
      case "retractVolume_uL": X.retractVolume_uL = clamp(r2(a.op === "mul" ? X.retractVolume_uL * a.value : a.op === "add" ? X.retractVolume_uL + a.value : a.value), 0, 20); break
      case "primeVolume_uL": X.primeVolume_uL = clamp(r2(a.op === "mul" ? X.primeVolume_uL * a.value : a.op === "add" ? X.primeVolume_uL + a.value : a.value), 0, 20); break
      case "wallCount": P.wallCount = clamp(Math.round(a.op === "mul" ? P.wallCount * a.value : a.op === "add" ? P.wallCount + a.value : a.value), 0, 6); break
      case "infillDensity": P.infillDensity = clamp(Math.round(a.op === "mul" ? P.infillDensity * a.value : a.op === "add" ? P.infillDensity + a.value : a.value), 0, 100); break
      case "zHop_mm": P.zHop_mm = clamp(r2(a.op === "mul" ? P.zHop_mm * a.value : a.op === "add" ? P.zHop_mm + a.value : a.value), 0, 5); break
      case "cartridgeTemp_C": if (P.cartridgeTemp_C !== null) P.cartridgeTemp_C = clamp(Math.round(a.op === "mul" ? P.cartridgeTemp_C * a.value : a.op === "add" ? P.cartridgeTemp_C + a.value : a.value), 4, 60); break
      case "skirtLoops": P.skirtLoops = Math.max(0, Math.round(a.value)); break
      case "originCheck": originCheck = true; break
    }
    notes.push(`; APRENDIDO (${a.symptom}): ${a.reason}`)
  }
  return { out: { ...t, params: P, extrusion: X } as T, notes, originCheck }
}

export const RATING_LABELS: Record<Rating, string> = {
  1: "Péssima — não saiu nada aproveitável",
  2: "Ruim — saiu, mas com problemas sérios",
  3: "Regular — imprimiu, precisa ajustar",
  4: "Boa — pequenos detalhes",
  5: "Excelente — repetir igual",
}
