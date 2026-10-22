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
