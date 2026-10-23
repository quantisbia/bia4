/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R25 · Ciência do fluxo — extrusão mecânica (seringa + fuso)
 *  ─────────────────────────────────────────────────────────────────────
 *  POR QUE A BIOTINTA NÃO SAÍA
 *  ───────────────────────────
 *  O modelo volumétrico puro (E = V_cordão / A_seringa) está matematicamente
 *  correto, mas para uma seringa BD 10 mL (A ≈ 165 mm²) ele pede ao êmbolo
 *  **0,004 mm/s (0,24 mm/min)** — um deslocamento abaixo do backlash do fuso,
 *  da folga do êmbolo e da compressibilidade do hidrogel. Além disso, o
 *  G-code começava a imprimir sem **encher a agulha** (dead volume de uma
 *  agulha 22G de 25 mm ≈ 3,3 µL + luer ≈ 30–60 µL). Resultado: a cabeça anda,
 *  nada sai; e “+25 % de M221” sobre 0,004 mm/s continua sendo quase nada.
 *
 *  O QUE A LITERATURA FAZ (extrusão mecânica, hidrogéis)
 *  ─────────────────────────────────────────────────────
 *  · Vazões volumétricas típicas: 0,5–5 µL/s para agulhas 22–27G e
 *    5–40 µL/s para 18–20G (Ouyang 2016 — alginato/gelatina 0,2–1 µL/s a
 *    8 mm/s; Paxton 2017 — alginato 1–3 µL/s; Schwab 2020 revisão: Q ∝ v·A).
 *  · Razão de alimentação (fator de extrusão) = Q_real / Q_teórico. Na prática
 *    1,2–2,5× para hidrogéis moles (die-swell, escorregamento na parede,
 *    compressibilidade, recuperação elástica) — Ribeiro 2017; Lee 2020 (GelMA);
 *    Cordova 2024 (Enderstruder: relata multiplicadores ≥ 1,5 em BD 10 mL).
 *  · Pré-carga (“priming”): extrudar até o filamento aparecer na ponta antes
 *    do primeiro cordão — universal em protocolos (CELLINK, Allevi, FRESH).
 *  · Velocidade mínima de êmbolo para fuso M8/8 mm por volta com Nema17:
 *    ≥ 0,02 mm/s para sair da zona de stick-slip (Cordova 2024; Pusch 2018).
 *
 *  Este módulo materializa isso: classes de biotinta com fator de extrusão
 *  e vazão-alvo, diagnóstico de um perfil (vai sair ou não?) e os volumes de
 *  enchimento (dead volume) por agulha/seringa.
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { ExtrusionModel, SliceParams, SyringeSpec } from "./types"
import { beadArea_mm2, syringeArea_mm2, flowRate_uLs } from "./extrusion"

export type BioinkClass =
  | "soft_hydrogel"      // alginato 2–4 %, gelatina 5–10 %, GelMA 5–10 %, colágeno — baixa viscosidade (1–50 Pa·s)
  | "shear_thinning"     // alginato-gelatina blends, Pluronic 25–40 %, nanocelulose, biotintas comerciais (50–500 Pa·s)
  | "paste"              // pastas cerâmicas / HAp, PCL-HAp frio, alta carga de sólidos (> 500 Pa·s)
  | "support_bath"       // FRESH em gelatina/Carbopol — a tinta é fluida (colágeno/alginato) e o banho segura
  | "sacrificial"        // Pluronic F127, gelatina sacrificial, carboidrato

export interface BioinkClassSpec {
  id: BioinkClass
  label: string
  /** Fator de extrusão (Q_real/Q_teórico) recomendado — ponto de partida. */
  extrusionFactor: number
  /** Faixa aceitável do fator para o ajuste em campo. */
  factorRange: [number, number]
  /** Vazão volumétrica alvo (µL/s) na agulha típica da classe. */
  flowTarget_uLs: [number, number]
  /** Velocidade mínima de êmbolo (mm/s) para vencer stick-slip/backlash do fuso. */
  minPlunger_mms: number
  /** Pré-carga extra (µL) além do dead volume ao iniciar o job. */
  extraPrime_uL: number
  refs: string
  hint: string
}

export const BIOINK_CLASSES: Record<BioinkClass, BioinkClassSpec> = {
  soft_hydrogel: {
    id: "soft_hydrogel", label: "Hidrogel mole (alginato, gelatina, GelMA, colágeno)",
    extrusionFactor: 1.6, factorRange: [1.2, 2.2], flowTarget_uLs: [0.8, 3.0], minPlunger_mms: 0.02, extraPrime_uL: 8,
    refs: "Ouyang 2016 · Lee 2020 · Ribeiro 2017",
    hint: "Hidrogéis moles comprimem e escorregam na parede; o volume real extrudado fica 20–60 % abaixo do teórico. Comece em 1,6× e ajuste pela largura do cordão.",
  },
  shear_thinning: {
    id: "shear_thinning", label: "Pseudoplástica (blends alginato-gelatina, Pluronic, nanocelulose, biotintas comerciais)",
    extrusionFactor: 1.35, factorRange: [1.1, 1.8], flowTarget_uLs: [1.0, 4.0], minPlunger_mms: 0.02, extraPrime_uL: 6,
    refs: "Paxton 2017 · Schwab 2020 · CELLINK/Allevi protocolos",
    hint: "Fluem bem sob cisalhamento e mantêm forma; fator moderado. Prime até ver o filamento na ponta.",
  },
  paste: {
    id: "paste", label: "Pasta (HAp, cerâmicas, PCL-HAp, alta carga de sólidos)",
    extrusionFactor: 1.15, factorRange: [1.0, 1.4], flowTarget_uLs: [4.0, 30.0], minPlunger_mms: 0.03, extraPrime_uL: 15,
    refs: "Compaired 2025 · Cordova 2024",
    hint: "Quase incompressível; fator próximo de 1. Exige agulha ≥ 18G e velocidade de êmbolo mais alta.",
  },
  support_bath: {
    id: "support_bath", label: "FRESH (tinta fluida em banho de suporte)",
    extrusionFactor: 1.8, factorRange: [1.4, 2.5], flowTarget_uLs: [0.4, 2.0], minPlunger_mms: 0.015, extraPrime_uL: 5,
    refs: "Hinton 2015 · Lee 2019 (FRESH v2) · Tashman 2021",
    hint: "A tinta é muito fluida (colágeno 10–20 mg/mL, alginato 2 %): fator alto e retração para evitar gotejamento no banho.",
  },
  sacrificial: {
    id: "sacrificial", label: "Sacrificial (Pluronic F127 30–40 %, gelatina)",
    extrusionFactor: 1.3, factorRange: [1.1, 1.7], flowTarget_uLs: [1.0, 5.0], minPlunger_mms: 0.02, extraPrime_uL: 6,
    refs: "Kolesky 2014 · Wu 2011",
    hint: "Pluronic é gel acima de ~15 °C; mantenha o cartucho frio se precisar fluir e quente para manter forma.",
  },
}

/** Mapeia o nome livre do material (Fase 2) para uma classe. */
export function classifyBioink(material: string | null | undefined, hints?: { isSacrificial?: boolean; isFresh?: boolean }): BioinkClass {
  if (hints?.isFresh) return "support_bath"
  if (hints?.isSacrificial) return "sacrificial"
  const m = (material ?? "").toLowerCase()
  if (/pluronic|f127|sacrific|carboidrato|carbohydrate/.test(m)) return "sacrificial"
  if (/fresh|banho|support bath|carbopol/.test(m)) return "support_bath"
  if (/hap|hidroxiapatita|hydroxyapatite|cer[aâ]mic|pcl|tcp|fosfato|bioglass|pasta|paste/.test(m)) return "paste"
  if (/cellink|bioink\b|nanocel|cnf|celulose|cellulose|blend|alg.*gel|gel.*alg|laponite|xantana|xanthan|skin|bone|start/.test(m)) return "shear_thinning"
  if (/alginat|gelatin|gelma|col[aá]gen|collagen|fibrin|fibrina|agarose|hialur|hyaluron|ha\b|decm|matrigel|pegda|peg/.test(m)) return "soft_hydrogel"
  return "shear_thinning"
}

/** Volume morto típico (µL) de agulha + luer: V = π(d/2)²·L + luer. */
export function needleDeadVolume_uL(nozzleDiameter_mm: number, needleLength_mm = 25, luer_uL = 40): number {
  const v = Math.PI * (nozzleDiameter_mm / 2) ** 2 * needleLength_mm
  return Math.round((v + luer_uL) * 10) / 10
}

export interface FlowDiagnosis {
  bioinkClass: BioinkClass
  /** Vazão teórica (geometria × velocidade) e com fator aplicado */
  flowTheoretical_uLs: number
  flowEffective_uLs: number
  /** Velocidade do êmbolo em mm/s e mm/min com o fator aplicado */
  plungerSpeed_mms: number
  plungerSpeed_mmmin: number
  /** E por mm de trajetória (mm de êmbolo) com fator */
  ePerMm: number
  /** Volume de pré-carga recomendado no START (dead volume + extra) */
  startPrime_uL: number
  startPrime_Emm: number
  /** Veredito */
  status: "ok" | "low" | "very_low" | "high"
  issues: string[]
  recommendations: string[]
}

/**
 * Diagnostica se um perfil vai produzir extrusão perceptível numa seringa real.
 * `factor` = multiplicador efetivamente aplicado no G-code (flowMultiplier).
 */
export function diagnoseFlow(P: Pick<SliceParams, "lineWidth_mm" | "layerHeight_mm" | "speedPerimeter_mms" | "nozzleDiameter_mm">, X: ExtrusionModel, material?: string | null, cls?: BioinkClass): FlowDiagnosis {
  const bioinkClass = cls ?? classifyBioink(material)
  const spec = BIOINK_CLASSES[bioinkClass]
  const syringe: SyringeSpec = X.syringe ?? { volume_mL: 10, innerDiameter_mm: 14.5 }
  const A = syringeArea_mm2(syringe)
  const factor = X.flowMultiplier
  const qTheo = flowRate_uLs(P.lineWidth_mm, P.layerHeight_mm, P.speedPerimeter_mms, 1)
  const qEff = qTheo * factor
  const plunger = qEff / A
  const ePerMm = (beadArea_mm2(P.lineWidth_mm, P.layerHeight_mm) * factor) / A
  const dead = needleDeadVolume_uL(P.nozzleDiameter_mm)
  const startPrime = Math.round((dead + spec.extraPrime_uL) * 10) / 10

  const issues: string[] = []; const rec: string[] = []
  let status: FlowDiagnosis["status"] = "ok"
  if (factor < spec.factorRange[0]) { issues.push(`Fator de extrusão ${factor.toFixed(2)}× abaixo do mínimo da classe (${spec.factorRange[0]}×).`); rec.push(`Use fator ${spec.extrusionFactor}× (${spec.label}).`); status = "low" }
  if (factor > spec.factorRange[1]) { issues.push(`Fator ${factor.toFixed(2)}× acima do máximo da classe (${spec.factorRange[1]}×) — risco de sobre-extrusão.`); status = "high" }
  if (qEff < spec.flowTarget_uLs[0]) {
    issues.push(`Vazão efetiva ${qEff.toFixed(2)} µL/s abaixo do alvo da classe (${spec.flowTarget_uLs[0]}–${spec.flowTarget_uLs[1]} µL/s).`)
    const vNeeded = spec.flowTarget_uLs[0] / (beadArea_mm2(P.lineWidth_mm, P.layerHeight_mm) * factor)
    rec.push(`Aumente a velocidade para ~${Math.ceil(vNeeded)} mm/s, ou a largura/altura do cordão, ou use seringa menor (3–5 mL).`)
    status = status === "high" ? "high" : "low"
  }
  if (plunger < spec.minPlunger_mms) {
    issues.push(`Êmbolo a ${plunger.toFixed(4)} mm/s (${(plunger * 60).toFixed(2)} mm/min) — abaixo de ${spec.minPlunger_mms} mm/s: zona de stick-slip/backlash do fuso. A biotinta pode não sair.`)
    rec.push(`Seringa de ${syringe.volume_mL} mL tem área ${A.toFixed(0)} mm². Troque para 3 mL (59 mm²) ou 5 mL (114 mm²) para o êmbolo andar ${(A / 59).toFixed(1)}–${(A / 114).toFixed(1)}× mais por µL.`)
    status = "very_low"
  }
  if (issues.length === 0) rec.push("Parâmetros dentro das faixas da literatura. Faça a pré-carga até ver o filamento e imprima a linha de teste.")
  return { bioinkClass, flowTheoretical_uLs: qTheo, flowEffective_uLs: qEff, plungerSpeed_mms: plunger, plungerSpeed_mmmin: plunger * 60, ePerMm, startPrime_uL: startPrime, startPrime_Emm: startPrime / A, status, issues, recommendations: rec }
}

/** Fator de extrusão sugerido para um material (ponto de partida do perfil). */
export function suggestedFactor(material?: string | null, cls?: BioinkClass): number {
  return BIOINK_CLASSES[cls ?? classifyBioink(material)].extrusionFactor
}

/* ═══════════════════════════════════════════════════════════════════════
 *  R27 · Limites de movimento do eixo E para SERINGA (por que o motor trava)
 *  ─────────────────────────────────────────────────────────────────────
 *  O firmware vem configurado para FILAMENTO: E-steps ≈ 93–400 steps/mm,
 *  jerk E = 5 mm/s, aceleração E = 3 000–10 000 mm/s², feed máx. E = 25 mm/s.
 *  Um extrusor de seringa com fuso + redução tem 2 000–9 000 steps/mm. Um
 *  `G1 E1 F200` (3,3 mm/s) pede 6 600–30 000 steps/s DE UMA VEZ (jerk > v):
 *  o driver perde passos, o Marlin responde "ok" e o êmbolo não anda — a
 *  impressão segue "seca". Isto acontecia na pré-carga, no prime/retração
 *  (F120) e na purga do joystick (F200).
 *
 *  Regra prática (Cordova 2024 · Pusch 2018 · fóruns Marlin 8 bits):
 *  taxa de passos segura ≈ 4 000 steps/s em placas 8 bits com outros eixos
 *  em movimento; aceleração para atingir o máximo em ~0,25 s; jerk ≤ 0,2 mm/s.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Taxa de passos segura para o eixo E (steps/s) — 8 bits com XY em movimento. */
export const SAFE_E_STEP_RATE = 4000
/** E-steps assumidos quando o firmware não informa (conservador = alto). */
export const ASSUMED_SYRINGE_ESTEPS = 3000

export interface PlungerLimits {
  /** steps/mm usados (lidos via M503 ou assumidos) */
  eSteps: number
  /** true quando usamos o valor assumido (não lido do firmware) */
  assumed: boolean
  /** velocidade máxima do êmbolo (mm/s) → M203 E */
  maxFeed_mms: number
  /** aceleração do êmbolo (mm/s²) → M201 E / M204 R */
  accel_mms2: number
  /** jerk do êmbolo (mm/s) → M205 E */
  jerk_mms: number
  /** taxa de passos resultante (steps/s) */
  stepRate: number
}

/**
 * Limites do êmbolo a partir dos E-steps. `maxOverride_mms` força um teto
 * (perfil/usuário); nunca ultrapassa a taxa de passos segura.
 */
export function plungerLimits(eSteps?: number | null, maxOverride_mms?: number | null): PlungerLimits {
  const assumed = !(eSteps && eSteps > 0)
  const steps = assumed ? ASSUMED_SYRINGE_ESTEPS : (eSteps as number)
  let maxFeed = SAFE_E_STEP_RATE / steps
  maxFeed = Math.max(0.3, Math.min(5, maxFeed))
  if (maxOverride_mms && maxOverride_mms > 0) maxFeed = Math.min(maxFeed, maxOverride_mms)
  const r = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d
  return {
    eSteps: steps, assumed,
    maxFeed_mms: r(maxFeed),
    accel_mms2: r(Math.max(1, maxFeed * 4), 1),
    jerk_mms: r(Math.min(0.2, maxFeed / 4)),
    stepRate: Math.round(maxFeed * steps),
  }
}

/** Linhas G-code (Marlin/RepRap) que aplicam os limites — sem M500 (não grava EEPROM). */
export function plungerLimitsGcode(L: PlungerLimits, withComments = true): string[] {
  const c = (s: string, k: string) => (withComments ? `${s.padEnd(22)} ; ${k}` : s)
  return [
    c(`M203 E${L.maxFeed_mms}`, `êmbolo máx ${L.maxFeed_mms} mm/s (${L.stepRate} steps/s @ ${L.eSteps}${L.assumed ? " assumidos" : ""} steps/mm)`),
    c(`M201 E${L.accel_mms2}`, `aceleração do êmbolo`),
    c(`M204 R${L.accel_mms2}`, `aceleração de movimentos só-E (prime/retração/purga)`),
    c(`M205 E${L.jerk_mms}`, `jerk do êmbolo (sem solavanco → sem perda de passos)`),
  ]
}

/** Lê E-steps de uma linha do M503 / M92 do Marlin: `echo:  M92 X80.00 Y80.00 Z400.00 E2000.00`. */
export function parseEsteps(line: string): number | null {
  const m = line.match(/\bM92\b[^\n]*?\bE(-?[\d.]+)/)
  if (!m) return null
  const v = parseFloat(m[1])
  return Number.isFinite(v) && v > 0 ? v : null
}

/**
 * Feed (mm/min) para mover `e_mm` de êmbolo em ~`seconds`, limitado pelos
 * limites da seringa e com piso de 0,05 mm/s (fora do stick-slip).
 */
export function safePlungerFeed_mmmin(e_mm: number, seconds: number, L: PlungerLimits): number {
  const v = Math.abs(e_mm) / Math.max(0.2, seconds)
  const clamped = Math.max(0.05, Math.min(L.maxFeed_mms, v))
  return Math.max(3, Math.round(clamped * 60))
}

export interface PushPlan { lines: string[]; e_mm: number; f_mmmin: number; seconds: number; flowCompensated: boolean }

/**
 * Empurra `uL` REAIS pela agulha com M83 e G1 E, compensando o M221 ativo
 * (o Marlin multiplica TODO movimento de E pelo fluxo %, inclusive só-E).
 * `rate_uLs` = vazão desejada (padrão 10 µL/s — agulha 22G a ~75 mm/s de jato).
 */
export function pushVolumePlan(uL: number, syringeArea_mm2: number, L: PlungerLimits, flowPercent = 100, rate_uLs = 10): PushPlan {
  const fp = flowPercent > 0 ? flowPercent / 100 : 1
  const eReal = uL / syringeArea_mm2
  const eCmd = eReal / fp
  const seconds = Math.max(0.5, uL / Math.max(0.5, rate_uLs))
  const f = safePlungerFeed_mmmin(eCmd, seconds, L)
  const actualSeconds = Math.abs(eCmd) / (f / 60)
  return {
    lines: ["M83", `G1 E${eCmd.toFixed(4)} F${f}`],
    e_mm: Math.round(eCmd * 1e4) / 1e4, f_mmmin: f,
    seconds: Math.round(actualSeconds * 10) / 10,
    flowCompensated: Math.abs(fp - 1) > 1e-6,
  }
}

/** Purga contínua: `rate_uLs` por `seconds` (volume = rate × s), com M221 compensado. */
export function purgePlan(rate_uLs: number, seconds: number, syringeArea_mm2: number, L: PlungerLimits, flowPercent = 100): PushPlan {
  return pushVolumePlan(rate_uLs * seconds, syringeArea_mm2, L, flowPercent, rate_uLs)
}

/* ═══════════════════════════════════════════════════════════════════════
 *  R27.2 · Calibração de E-steps (pedi 10 mm, andou 1 mm)
 *  ─────────────────────────────────────────────────────────────────────
 *  O Marlin vem com E-steps de FILAMENTO (Ender: 93; BMG: 415). Um extrusor
 *  de seringa com fuso trapezoidal (2–8 mm/volta) e redução 1:1 a 5:1 num
 *  Nema17 a 16 µsteps precisa de 400–8 000 steps/mm:
 *      steps/mm = 200 × µsteps × redução / passo_do_fuso
 *  Com 93 steps/mm configurados, `G1 E10` manda 930 passos — que no fuso
 *  M8 (1,25 mm/volta, 3 200 steps/mm) são apenas 0,29 mm. Daí "10 → 1 mm".
 *  Regra: novo = atual × pedido / medido. Grava com M92 E<novo> + M500.
 * ═══════════════════════════════════════════════════════════════════════ */

export interface EstepsCalibration {
  current: number
  requested_mm: number
  measured_mm: number
  /** novo valor de M92 E */
  newEsteps: number
  /** quanto o eixo estava errado (×) */
  ratio: number
  /** limites recalculados para o novo valor */
  limits: PlungerLimits
  /** linhas a enviar: M92 + M500 (R27.3: NÃO altera M203/M201/M205 do firmware) */
  gcode: string[]
  /** opcional, para quem quiser: limites M203/M201/M204/M205 sugeridos para o novo valor */
  limitsGcode: string[]
  /** faixa plausível para seringa (400–20 000)? */
  plausible: boolean
  note: string
}

export function calibrateEsteps(current: number | null | undefined, requested_mm: number, measured_mm: number): EstepsCalibration {
  const cur = current && current > 0 ? current : ASSUMED_SYRINGE_ESTEPS
  const req = Math.max(0.1, requested_mm), meas = Math.max(0.01, measured_mm)
  const newE = Math.round((cur * req / meas) * 100) / 100
  const ratio = Math.round((req / meas) * 100) / 100
  const limits = plungerLimits(newE)
  const plausible = newE >= 400 && newE <= 20000
  let note = ""
  if (ratio > 1.05) note = `O êmbolo andou ${meas} mm em vez de ${req} mm (${ratio}× menos): os E-steps estavam ${ratio}× baixos — provavelmente ainda de filamento. Novo valor: ${newE} steps/mm.`
  else if (ratio < 0.95) note = `O êmbolo andou ${meas} mm em vez de ${req} mm (${(1 / ratio).toFixed(2)}× mais): E-steps ${(1 / ratio).toFixed(2)}× altos. Novo valor: ${newE} steps/mm.`
  else note = `Dentro de 5 % — E-steps já calibrados (${newE} steps/mm).`
  if (!plausible) note += ` Atenção: ${newE} steps/mm está fora da faixa típica de seringa (400–20 000) — confira a medição e a redução do extrusor.`
  return {
    current: cur, requested_mm: req, measured_mm: meas, newEsteps: newE, ratio, limits,
    gcode: [`M92 E${newE}`, "M500"],
    limitsGcode: plungerLimitsGcode(limits, false),
    plausible, note,
  }
}

/** E-steps teóricos de um extrusor de seringa: motor × microsteps × redução ÷ passo do fuso. */
export function theoreticalEsteps(opts: { motorSteps?: number; microsteps?: number; gearRatio?: number; leadscrewPitch_mm: number }): number {
  const { motorSteps = 200, microsteps = 16, gearRatio = 1 } = opts
  return Math.round((motorSteps * microsteps * gearRatio) / Math.max(0.1, opts.leadscrewPitch_mm) * 100) / 100
}

/** Presets de extrusores de seringa comuns (fuso em mm/volta, redução). */
export const SYRINGE_EXTRUDER_PRESETS: Array<{ id: string; label: string; leadscrewPitch_mm: number; gearRatio: number; esteps: number }> = [
  { id: "enderstruder", label: "Enderstruder (fuso M5 0,8 mm/volta, direto)", leadscrewPitch_mm: 0.8, gearRatio: 1, esteps: theoreticalEsteps({ leadscrewPitch_mm: 0.8 }) },
  { id: "replistruder4", label: "Replistruder 4 (fuso M5, redução 1:1)", leadscrewPitch_mm: 0.8, gearRatio: 1, esteps: theoreticalEsteps({ leadscrewPitch_mm: 0.8 }) },
  { id: "t8_2mm", label: "Fuso T8 2 mm/volta (1 entrada), direto", leadscrewPitch_mm: 2, gearRatio: 1, esteps: theoreticalEsteps({ leadscrewPitch_mm: 2 }) },
  { id: "t8_8mm", label: "Fuso T8 8 mm/volta (4 entradas), direto", leadscrewPitch_mm: 8, gearRatio: 1, esteps: theoreticalEsteps({ leadscrewPitch_mm: 8 }) },
  { id: "t8_8mm_5_1", label: "Fuso T8 8 mm/volta + redução 5,18:1 (Nema17 planetário)", leadscrewPitch_mm: 8, gearRatio: 5.18, esteps: theoreticalEsteps({ leadscrewPitch_mm: 8, gearRatio: 5.18 }) },
  { id: "m8_125", label: "Rosca M8 1,25 mm/volta, direto", leadscrewPitch_mm: 1.25, gearRatio: 1, esteps: theoreticalEsteps({ leadscrewPitch_mm: 1.25 }) },
]

/** Remove overrides de fluxo/velocidade (M220/M221) de um G-code — o host aplica os seus. */
export function isFlowOverrideLine(cmd: string): boolean {
  return /^\s*M22[01]\b/i.test(cmd)
}
