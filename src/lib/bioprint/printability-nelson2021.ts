/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Printability Predictor — Nelson et al. 2021 (Int. J. Mol. Sci.)
 *  ───────────────────────────────────────────────────────────────────────────
 *  Implementa o conhecimento quantitativo de:
 *
 *    Nelson, C.; Tuladhar, S.; Launen, L.; Habib, A.
 *    "3D Bio-Printability of Hybrid Pre-Crosslinked Hydrogels"
 *    Int. J. Mol. Sci. 2021, 22, 13481.
 *    doi: 10.3390/ijms222413481
 *
 *  O paper testou 5 formulações de Alginato/CMC pré-crosslinked com CaCl₂ e
 *  CaSO₄ e mediu QUANTITATIVAMENTE:
 *    • Reologia (Power-Law: η = K · γ^(n−1))
 *    • Yield stress / Flow point (amplitude sweep)
 *    • Recovery thixotrópico (3iTT)
 *    • Pr index (printability) = L² / (16·A)
 *    • Filament uniformity (% deviation do nozzle Ø)
 *    • Collapse rate em pillars 1-20 mm
 *    • Wall shear stress (Hagen-Poiseuille para Power-Law)
 *
 *  Este módulo expõe:
 *    • Constantes das 5 formulações de referência
 *    • Janelas ótimas (yield, viscosity, K, n) derivadas do paper
 *    • Calculadora Pr ideal e ranges aceitáveis
 *    • Estimador de wall shear stress para um bioink genérico
 *    • Score de imprimibilidade 0-100 baseado em proximidade às janelas
 *    • Rationale em PT explicando cada análise
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Tipos ────────────────────────────────────────────────────────────────

export interface NelsonFormulation {
  id: string
  label: string
  /** Alginato low-viscosity (% w/v) */
  alg_lv_pct: number
  /** Alginato medium-viscosity (% w/v) */
  alg_mv_pct: number
  /** Carboxymethyl Cellulose (% w/v) */
  cmc_pct: number
  /** CaSO4 (% w/v) — pre-crosslinker lento */
  caso4_pct: number
  /** CaCl2 (% w/v) — pre-crosslinker rápido */
  cacl2_pct: number
  /** Power-Law K (consistency index, mPa·s^n) */
  K_mPaSn: number
  /** Power-Law n (shear thinning index; n<1 = shear thinning) */
  n: number
  /** Yield stress at LVR (Pa) — onde G' começa a cair */
  yieldStress_Pa: number
  /** G'' loss modulus at LVR (Pa) */
  loss_modulus_Pa: number
  /** Strain (%) onde ocorre o yield point */
  yield_strain_pct: number
  /** Pr index medido para poro 2.5 mm */
  Pr: number
  /** % desvio do diâmetro do filamento vs nozzle (610 µm) */
  filament_deviation_pct: number
  /** Wall shear stress estimado (Pa) */
  wallShearStress_Pa: number
  /** Initial viscosity at γ̇ = 1 s⁻¹ (Pa·s) */
  initialViscosity_PaS: number
  /** Recovery % após 5 s do 3iTT */
  recovery_5s_pct: number
  /** Recovery % após 120 s do 3iTT */
  recovery_120s_pct: number
  /** Collapse a 20 mm pillar distance (%) */
  collapse_20mm_pct: number
  /** Collapse a 6 mm pillar distance (%) */
  collapse_6mm_pct: number
  /** Max build height ensaiado com sucesso (mm) */
  maxBuildHeight_mm: number
  /** Recomendação textual do paper */
  recommendation: string
}

// ─── As 5 formulações do paper Nelson 2021, Table 4-5 ──────────────────────

export const NELSON_FORMULATIONS: NelsonFormulation[] = [
  {
    id: "A2.5C2CS1",
    label: "A2.5C2CS1 (alg 2.5% + CMC 2% + CaSO4 1%)",
    alg_lv_pct: 1, alg_mv_pct: 1.5, cmc_pct: 2,
    caso4_pct: 1, cacl2_pct: 0,
    K_mPaSn: 212_330, n: 0.23,
    yieldStress_Pa: 1.083, loss_modulus_Pa: 0.637, yield_strain_pct: 20,
    Pr: 0.80, filament_deviation_pct: 141,
    wallShearStress_Pa: 1376.913,
    initialViscosity_PaS: 212.33,
    recovery_5s_pct: 83, recovery_120s_pct: 99.5,
    collapse_6mm_pct: 4.17, collapse_20mm_pct: 41.67,
    maxBuildHeight_mm: 10,
    recommendation: "Bom para scaffolds finos (<10 mm). Recovery rápido mas baixa fidelidade em altura.",
  },
  {
    id: "A2.5C2.5CS1",
    label: "A2.5C2.5CS1 (alg 2.5% + CMC 2.5% + CaSO4 1%)",
    alg_lv_pct: 1, alg_mv_pct: 1.5, cmc_pct: 2.5,
    caso4_pct: 1, cacl2_pct: 0,
    K_mPaSn: 249_760, n: 0.24,
    yieldStress_Pa: 0.848, loss_modulus_Pa: 0.572, yield_strain_pct: 30,
    Pr: 0.82, filament_deviation_pct: 84,
    wallShearStress_Pa: 1537.522,
    initialViscosity_PaS: 249.76,
    recovery_5s_pct: 85, recovery_120s_pct: 99.5,
    collapse_6mm_pct: 2.78, collapse_20mm_pct: 33.33,
    maxBuildHeight_mm: 15,
    recommendation: "Versão melhorada de A2.5C2CS1 — mais CMC eleva K e melhora filamento.",
  },
  {
    id: "A3C3CS1.5",
    label: "A3C3CS1.5 (alg 3% + CMC 3% + CaSO4 1.5%) ⭐ MELHOR",
    alg_lv_pct: 1, alg_mv_pct: 2, cmc_pct: 3,
    caso4_pct: 1.5, cacl2_pct: 0,
    K_mPaSn: 608_257, n: 0.03,
    yieldStress_Pa: 2.789, loss_modulus_Pa: 1.243, yield_strain_pct: 65,
    Pr: 0.84, filament_deviation_pct: 67,
    wallShearStress_Pa: 800.590,
    initialViscosity_PaS: 608.26,
    recovery_5s_pct: 64, recovery_120s_pct: 94,
    collapse_6mm_pct: 0, collapse_20mm_pct: 20.83,
    maxBuildHeight_mm: 50,
    recommendation: "★ Vencedora: imprimiu pirâmide 50 mm (132 camadas). Use CaSO4 puro para grandes estruturas.",
  },
  {
    id: "A3C3CL0.5",
    label: "A3C3CL0.5 (alg 3% + CMC 3% + CaCl2 0.5%)",
    alg_lv_pct: 1, alg_mv_pct: 2, cmc_pct: 3,
    caso4_pct: 0, cacl2_pct: 0.5,
    K_mPaSn: 603_397, n: 0.07,
    yieldStress_Pa: 1.785, loss_modulus_Pa: 0.853, yield_strain_pct: 64,
    Pr: 0.85, filament_deviation_pct: 68,
    wallShearStress_Pa: 1115.859,
    initialViscosity_PaS: 603.40,
    recovery_5s_pct: 66, recovery_120s_pct: 98,
    collapse_6mm_pct: 0, collapse_20mm_pct: 21,
    maxBuildHeight_mm: 20,
    recommendation: "CaCl2 dá crosslinking mais rápido, mas extrusão intermitente — filamento menos liso.",
  },
  {
    id: "A3C3CS0.5CL0.5",
    label: "A3C3CS0.5CL0.5 (alg 3% + CMC 3% + CaSO4 0.5% + CaCl2 0.5%)",
    alg_lv_pct: 1, alg_mv_pct: 2, cmc_pct: 3,
    caso4_pct: 0.5, cacl2_pct: 0.5,
    K_mPaSn: 775_660, n: 0.02,
    yieldStress_Pa: 2.453, loss_modulus_Pa: 1.120, yield_strain_pct: 70,
    Pr: 0.86, filament_deviation_pct: 64,
    wallShearStress_Pa: 935.665,
    initialViscosity_PaS: 775.66,
    recovery_5s_pct: 70, recovery_120s_pct: 98.5,
    collapse_6mm_pct: 0, collapse_20mm_pct: 22,
    maxBuildHeight_mm: 30,
    recommendation: "Pr mais próximo de 1 (0.86). Mistura híbrida CaSO4+CaCl2 equilibra fidelidade e velocidade de gelificação.",
  },
]

// ─── Janelas ótimas derivadas do paper ─────────────────────────────────────

/**
 * Faixas práticas extraídas do estudo Nelson 2021.
 * Estes números delimitam a "janela de imprimibilidade" para hidrogéis tipo
 * Alginato/CMC pré-crosslinked, mas servem como heurística para qualquer
 * hidrogel shear-thinning.
 */
export const NELSON_OPTIMAL_WINDOWS = {
  /** Viscosidade inicial @ γ̇=1 s⁻¹ (Pa·s) — paper recomenda 200-800 */
  initialViscosity_PaS: { min: 200, ideal: 600, max: 800 },
  /** Power-Law n: quanto MENOR melhor para shear thinning (paper: 0.02-0.24) */
  n: { min: 0.02, ideal: 0.05, max: 0.30 },
  /** Power-Law K (mPa·s^n): consistency. Paper: 212k-775k */
  K_mPaSn: { min: 200_000, ideal: 600_000, max: 800_000 },
  /** Yield strain % onde G' começa a cair. Paper: 20-70 (mais alto = mais estável) */
  yieldStrain_pct: { min: 20, ideal: 65, max: 100 },
  /** Pr index — Paper define 1.0 como ideal. Faixa aceitável 0.80-1.20 */
  Pr: { min: 0.80, ideal: 1.0, max: 1.20 },
  /** Recovery após 120s (%) — paper: 94-99.5 */
  recovery_120s_pct: { min: 90, ideal: 98, max: 100 },
  /** Wall shear stress (Pa) que ainda preserva células viáveis (paper [48-51]) */
  wallShearStress_Pa: { safe: 2000, warning: 5000, critical: 10_000 },
  /** % desvio do filamento vs nozzle Ø — quanto menor melhor */
  filamentDeviation_pct: { min: 0, ideal: 30, max: 80 },
} as const

// ─── Funções científicas ───────────────────────────────────────────────────

/**
 * Estima Pr index usando a fórmula do paper:
 *   Pr = (π/4) / Circularidade  =  L² / (16·A)
 * onde L=perímetro do poro, A=área do poro.
 *
 * Para um poro QUADRADO ideal: Pr = 1
 * Para um poro CIRCULAR: Pr = π/4 ≈ 0.785 (under-gelation)
 * Pr > 1 ⇒ over-gelation (poros com cantos arredondados aparecem encolhidos)
 */
export function computePrIndex(perimeter_mm: number, area_mm2: number): number {
  if (area_mm2 <= 0) return NaN
  return (perimeter_mm * perimeter_mm) / (16 * area_mm2)
}

/**
 * Calcula wall shear stress no nozzle usando Power-Law fluid em capilar
 * (Hagen-Poiseuille generalizado).
 *
 * γ̇_wall = ((3 + 1/n) / 4) · (8·v / D)     [shear rate aparente corrigido]
 * τ_wall = K · γ̇_wall^n                     [Power-Law]
 *
 * @param flowSpeed_mms     velocidade média do fluido no bico (mm/s)
 * @param nozzleDiameter_mm Ø interno do bico (mm)
 * @param K_PaSn            consistency index em Pa·s^n
 * @param n                 shear thinning index (sem unidade)
 * @returns shear stress na parede em Pa
 */
export function computeWallShearStress_PowerLaw(
  flowSpeed_mms: number,
  nozzleDiameter_mm: number,
  K_PaSn: number,
  n: number,
): number {
  if (nozzleDiameter_mm <= 0 || n <= 0 || K_PaSn <= 0) return NaN
  // Apparent wall shear rate (Newtonian) corrigida para Power-Law (Weissenberg-Rabinowitsch)
  const gammaDot_apparent_1s = (8 * flowSpeed_mms) / nozzleDiameter_mm
  const gammaDot_wall_1s = ((3 + 1 / n) / 4) * gammaDot_apparent_1s
  return K_PaSn * Math.pow(gammaDot_wall_1s, n)
}

/**
 * Estima K e n para um material genérico a partir de viscosidade @ shear rate
 * conhecido e assumindo um n típico.
 *
 * Se o usuário diz "viscosidade = 5 Pa·s" mas não sabe K/n, assumimos uma
 * medição @ γ̇ = 10 s⁻¹ (típico de teste de viscosímetro Brookfield) e n=0.3
 * para um shear thinning moderado.
 *
 *   η = K · γ̇^(n−1)  ⇒  K = η · γ̇^(1−n)
 */
export function estimatePowerLawFromViscosity(
  viscosity_PaS: number,
  shearRate_ref_1s = 10,
  n_assumed = 0.3,
): { K_PaSn: number; n: number } {
  const K = viscosity_PaS * Math.pow(shearRate_ref_1s, 1 - n_assumed)
  return { K_PaSn: K, n: n_assumed }
}

// ─── Avaliação de imprimibilidade (score 0-100) ───────────────────────────

export type PrintabilityVerdict = "excellent" | "good" | "marginal" | "poor"

export interface PrintabilityAssessment {
  /** Score consolidado 0-100 (Nelson-style) */
  score: number
  /** Veredito qualitativo */
  verdict: PrintabilityVerdict
  /** Wall shear stress calculado (Pa) */
  wallShearStress_Pa: number
  /** Risco celular pelo shear */
  cellShearRisk: "safe" | "warning" | "critical"
  /** Lista de mensagens de análise (PT) */
  rationale: string[]
  /** Avisos críticos */
  warnings: string[]
  /** Formulação Nelson mais parecida — referência para o usuário */
  closestReference: NelsonFormulation
  /** Distância normalizada (0=idêntico, 1=muito longe) */
  referenceDistance: number
}

/**
 * Avalia imprimibilidade de um bioink dado:
 *  - viscosidade (Pa·s)
 *  - velocidade de impressão (mm/s)
 *  - diâmetro do bico (mm)
 *
 * Usa as janelas Nelson 2021 e devolve score+rationale+warnings.
 */
export function assessPrintability(input: {
  viscosity_PaS: number
  printSpeed_mms: number
  nozzleDiameter_mm: number
  hasCells?: boolean
  materialLabel?: string
}): PrintabilityAssessment {
  const { viscosity_PaS, printSpeed_mms, nozzleDiameter_mm, hasCells, materialLabel } = input

  // 1. Estimar Power-Law params
  const { K_PaSn, n } = estimatePowerLawFromViscosity(viscosity_PaS)

  // 2. Wall shear stress
  const wallShear_Pa = computeWallShearStress_PowerLaw(printSpeed_mms, nozzleDiameter_mm, K_PaSn, n)

  // 3. Achar formulação Nelson mais próxima (por viscosidade inicial)
  let closest = NELSON_FORMULATIONS[0]
  let minDist = Number.POSITIVE_INFINITY
  for (const f of NELSON_FORMULATIONS) {
    const d = Math.abs(Math.log10(f.initialViscosity_PaS) - Math.log10(viscosity_PaS))
    if (d < minDist) { minDist = d; closest = f }
  }
  const refDistance = Math.min(1, minDist / 2)  // normalizado

  // 4. Score por dimensão (0-100)
  const W = NELSON_OPTIMAL_WINDOWS
  const visc_score = scoreInWindow(viscosity_PaS, W.initialViscosity_PaS.min, W.initialViscosity_PaS.ideal, W.initialViscosity_PaS.max)
  const shear_score = scoreShearStress(wallShear_Pa, hasCells ?? false)
  const refSim_score = (1 - refDistance) * 100

  // Score consolidado (média ponderada)
  const score = Math.round(
    visc_score * 0.40 +
    shear_score * 0.40 +
    refSim_score * 0.20
  )

  // 5. Verdict
  const verdict: PrintabilityVerdict =
    score >= 80 ? "excellent"
    : score >= 65 ? "good"
    : score >= 45 ? "marginal"
    : "poor"

  // 6. Risco celular
  const cellShearRisk: "safe" | "warning" | "critical" =
    wallShear_Pa <= W.wallShearStress_Pa.safe ? "safe"
    : wallShear_Pa <= W.wallShearStress_Pa.warning ? "warning"
    : "critical"

  // 7. Rationale em PT
  const rationale: string[] = []
  const warnings: string[] = []

  rationale.push(
    `Power-Law estimado (Nelson 2021): K ≈ ${(K_PaSn / 1000).toFixed(1)} Pa·sⁿ · n ≈ ${n.toFixed(2)} (shear thinning ${n < 0.5 ? "forte" : "moderado"}).`
  )

  rationale.push(
    `Wall shear stress no bico (Hagen-Poiseuille p/ fluido Power-Law): τ ≈ ${(wallShear_Pa / 1000).toFixed(2)} kPa.`
  )

  // Viscosidade
  if (viscosity_PaS < W.initialViscosity_PaS.min) {
    rationale.push(`⚠ Viscosidade ${viscosity_PaS.toFixed(1)} Pa·s ABAIXO da janela ideal (${W.initialViscosity_PaS.min}-${W.initialViscosity_PaS.max} Pa·s). Filamentos vão espalhar e perder fidelidade.`)
    warnings.push("Viscosidade insuficiente — adicione CMC, aumente concentração ou pre-crosslink.")
  } else if (viscosity_PaS > W.initialViscosity_PaS.max) {
    rationale.push(`⚠ Viscosidade ${viscosity_PaS.toFixed(1)} Pa·s ACIMA da janela ideal. Vai exigir pressão alta e estressar as células.`)
    warnings.push("Viscosidade excessiva — reduza concentração ou aqueça o material.")
  } else {
    rationale.push(`✓ Viscosidade ${viscosity_PaS.toFixed(1)} Pa·s dentro da janela ótima (Nelson: 200-800 Pa·s).`)
  }

  // Shear cells
  if (hasCells) {
    if (cellShearRisk === "safe") {
      rationale.push(`✓ Shear ${(wallShear_Pa / 1000).toFixed(2)} kPa é SEGURO para células (< ${W.wallShearStress_Pa.safe / 1000} kPa). Esperar viabilidade > 85% (Blaeser 2016).`)
    } else if (cellShearRisk === "warning") {
      rationale.push(`⚠ Shear ${(wallShear_Pa / 1000).toFixed(2)} kPa em zona de ATENÇÃO (${W.wallShearStress_Pa.safe / 1000}-${W.wallShearStress_Pa.warning / 1000} kPa). Viabilidade pode cair para 70-85%.`)
      warnings.push("Reduza velocidade ou aumente bico Ø para baixar shear sobre células.")
    } else {
      rationale.push(`🛑 Shear ${(wallShear_Pa / 1000).toFixed(2)} kPa CRÍTICO (> ${W.wallShearStress_Pa.warning / 1000} kPa). Risco alto de lise celular.`)
      warnings.push("CRÍTICO: shear muito alto. Use bico maior (Ø 0.5+ mm) e velocidade < 5 mm/s.")
    }
  }

  // Comparação com formulação Nelson
  rationale.push(
    `Formulação Nelson mais próxima: ${closest.label} (Pr=${closest.Pr.toFixed(2)}, altura máx testada=${closest.maxBuildHeight_mm} mm).`
  )

  // Recomendação prática
  if (verdict === "excellent" || verdict === "good") {
    rationale.push(`✓ Parâmetros viáveis. Recomendação: ${closest.recommendation}`)
  } else if (verdict === "marginal") {
    rationale.push(`⚠ Parâmetros aceitáveis mas longe do ideal. Considere: ${closest.recommendation}`)
  } else {
    warnings.push(`Configuração fora das janelas Nelson 2021. Sugerimos espelhar ${closest.id}: ${closest.recommendation}`)
  }

  return {
    score,
    verdict,
    wallShearStress_Pa: wallShear_Pa,
    cellShearRisk,
    rationale,
    warnings,
    closestReference: closest,
    referenceDistance: refDistance,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Score 0-100 baseado em proximidade do valor ideal dentro de uma janela */
function scoreInWindow(value: number, min: number, ideal: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < min) {
    // Fora abaixo: penalidade gradual
    const dist = (min - value) / min
    return Math.max(0, 60 - dist * 100)
  }
  if (value > max) {
    const dist = (value - max) / max
    return Math.max(0, 60 - dist * 100)
  }
  // Dentro da janela: 80-100 baseado em proximidade do ideal
  const span = Math.max(ideal - min, max - ideal, 1)
  const dist = Math.abs(value - ideal) / span
  return 100 - dist * 20
}

/** Score do shear stress 0-100, sendo penalizado mais agressivamente p/ células */
function scoreShearStress(wallShear_Pa: number, hasCells: boolean): number {
  const W = NELSON_OPTIMAL_WINDOWS.wallShearStress_Pa
  if (!Number.isFinite(wallShear_Pa)) return 0
  if (wallShear_Pa <= W.safe) return 100
  if (wallShear_Pa <= W.warning) {
    // Decaimento linear de 100 → 60 dentro da zona warning
    const t = (wallShear_Pa - W.safe) / (W.warning - W.safe)
    return 100 - t * 40
  }
  if (wallShear_Pa <= W.critical) {
    const t = (wallShear_Pa - W.warning) / (W.critical - W.warning)
    const base = 60 - t * 40   // 60 → 20
    return hasCells ? base * 0.5 : base  // células sofrem mais
  }
  return hasCells ? 5 : 15
}

// ─── Util: cor para verdict ────────────────────────────────────────────────

export function verdictColor(v: PrintabilityVerdict): {
  border: string
  bg: string
  text: string
  label: string
} {
  switch (v) {
    case "excellent":
      return { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-200", label: "Excelente" }
    case "good":
      return { border: "border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-200", label: "Bom" }
    case "marginal":
      return { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-200", label: "Marginal" }
    case "poor":
      return { border: "border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-200", label: "Ruim" }
  }
}

// ─── Citação científica ───────────────────────────────────────────────────

export const NELSON_2021_CITATION = {
  id: "nelson2021",
  doi: "10.3390/ijms222413481",
  title: "3D Bio-Printability of Hybrid Pre-Crosslinked Hydrogels",
  authors: "Nelson C., Tuladhar S., Launen L., Habib A.",
  journal: "Int. J. Mol. Sci.",
  year: 2021,
  short: "Nelson et al., 2021",
}
