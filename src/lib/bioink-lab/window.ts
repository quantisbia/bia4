/**
 * BIA v4 · R16 · Janela de Biofabricação
 * ───────────────────────────────────────
 * Modelo simples e explicável do trade-off clássico fidelidade × viabilidade
 * (Malda 2013; Schwab 2020 "Printability and shape fidelity"; Elango 2025).
 *
 *  · Fidelidade cresce com yield stress, G' e tan δ baixo (Gao 2018: 0,25–0,45).
 *  · Viabilidade cai com shear na agulha (Blaeser 2016: ≤ 5 kPa ótimo, > 10 kPa danoso),
 *    com viscosidade alta e com géis muito rígidos (G' > 10 kPa restringe células).
 *  · Sensibilidade celular desloca o limiar aceitável.
 */
import type { CellTypeId, Recipe, RheologyEstimate, WindowPoint } from "./types"
import { CELL_LABELS } from "./recipes"

export interface WindowInput {
  rheology: RheologyEstimate
  cell: CellTypeId
  nozzle_mm: number
  speed_mms: number
  /** se a receita tem suporte externo (banho FRESH / sacrificial), a fidelidade não depende só do gel */
  supportBath?: boolean
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))
const log10 = (v: number) => Math.log10(Math.max(v, 1e-6))

/**
 * Tensão de cisalhamento na parede da agulha para fluido lei-de-potência
 * aproximada: τw ≈ K·γ̇^n com γ̇ ≈ (3n+1)/(4n) · 8v/d. Usamos viscosidade
 * aparente ~10 s⁻¹ e corrigimos pela potência n.
 */
export function wallShear_kPa(rh: RheologyEstimate, nozzle_mm: number, speed_mms: number): number {
  const d = Math.max(nozzle_mm, 0.05) / 1000 // m
  const v = Math.max(speed_mms, 0.1) / 1000  // m/s (velocidade média de saída ≈ velocidade de deslocamento)
  const n = Math.min(Math.max(rh.powerLawN, 0.15), 1)
  const gammaNewton = (8 * v) / d
  const gamma = gammaNewton * ((3 * n + 1) / (4 * n))
  // viscosidade aparente η(γ̇) = η10 · (γ̇/10)^(n-1)
  const etaApp = rh.viscosity_PaS * Math.pow(gamma / 10, n - 1)
  const tau = etaApp * gamma + rh.yieldStress_Pa // Herschel-Bulkley: τ = τy + K γ̇^n
  return tau / 1000
}

export function evaluateWindow(input: WindowInput): WindowPoint {
  const { rheology: rh, cell, nozzle_mm, speed_mms, supportBath } = input
  const notes: string[] = []

  // ── Fidelidade (0–100) ───────────────────────────────────────────────
  // yield stress: 10 Pa → 20 ; 100 Pa → 60 ; 1000 Pa → 95
  const fy = clamp(20 + 37.5 * (log10(rh.yieldStress_Pa) - 1), 0, 95)
  // G': 100 Pa → 30 ; 1 kPa → 65 ; 10 kPa → 95
  const fg = clamp(30 + 32.5 * (log10(rh.gPrime_Pa) - 2), 0, 95)
  // tan δ: ótimo 0,25–0,45 (Gao 2018); penaliza > 0,7 fortemente
  let ft: number
  if (rh.tanDelta <= 0.45 && rh.tanDelta >= 0.2) ft = 95
  else if (rh.tanDelta < 0.2) ft = 80
  else ft = clamp(95 - (rh.tanDelta - 0.45) * 120, 10, 95)
  let fidelity = 0.4 * fy + 0.3 * fg + 0.3 * ft
  if (supportBath) {
    fidelity = Math.max(fidelity, 78)
    notes.push("Banho de suporte sustenta o cordão: fidelidade vem do banho, não do gel.")
  }

  // ── Viabilidade (0–100) ──────────────────────────────────────────────
  const sens = CELL_LABELS[cell]?.sensitivity ?? "mid"
  const shear = wallShear_kPa(rh, nozzle_mm, speed_mms)
  // shear: ≤ 2 kPa → 100 ; 5 kPa → 85 ; 10 kPa → 55 ; 20 kPa → 20
  let vs: number
  if (shear <= 2) vs = 100
  else if (shear <= 5) vs = 100 - (shear - 2) * 5
  else if (shear <= 10) vs = 85 - (shear - 5) * 6
  else vs = clamp(55 - (shear - 10) * 3.5, 5, 55)
  // rigidez da rede: G' 100 Pa → 100 ; 3 kPa → 85 ; 10 kPa → 60 ; 30 kPa → 35
  const vg = clamp(100 - Math.max(0, log10(rh.gPrime_Pa) - 2) * 32, 20, 100)
  // viscosidade de manuseio (mistura de células homogênea): > 50 Pa·s dificulta
  const vv = rh.viscosity_PaS > 50 ? clamp(100 - (rh.viscosity_PaS - 50) * 0.6, 40, 100) : 100
  let viability = 0.55 * vs + 0.3 * vg + 0.15 * vv
  const sensFactor = sens === "high" ? 0.85 : sens === "mid" ? 0.93 : 1
  if (cell !== "none") viability = viability * sensFactor
  else viability = 100

  fidelity = Math.round(clamp(fidelity))
  viability = Math.round(clamp(viability))

  // ── Zona ─────────────────────────────────────────────────────────────
  const vMin = cell === "none" ? 0 : sens === "high" ? 75 : sens === "mid" ? 65 : 55
  const fMin = supportBath ? 50 : 45
  let zone: WindowPoint["zone"] = "sweet"
  if (shear > 10 && cell !== "none") {
    zone = "too_fast"
    notes.push(`Shear na agulha ≈ ${shear.toFixed(1)} kPa (> 10 kPa). Use agulha maior ou reduza a velocidade.`)
  } else if (fidelity < fMin) {
    zone = "too_soft"
    notes.push("Gel mole demais para empilhar camadas: aumente concentração/gelatina, resfrie a seringa, ou use banho de suporte.")
  } else if (viability < vMin && cell !== "none") {
    zone = rh.gPrime_Pa > 5000 ? "too_stiff" : "too_fast"
    notes.push(zone === "too_stiff"
      ? "Rede rígida demais para estas células: reduza a concentração ou troque por versão 'soft'."
      : "Viabilidade limitada pelo shear/viscosidade: agulha maior, velocidade menor, temperatura 1–2 °C acima.")
  } else if (fidelity >= 60 && viability >= 80) {
    zone = "sweet"
  } else {
    zone = "ok"
  }
  const inWindow = zone === "sweet" || zone === "ok"

  if (shear <= 5 && cell !== "none") notes.push(`Shear ≈ ${shear.toFixed(1)} kPa — dentro da faixa segura (Blaeser 2016 ≤ 5 kPa).`)
  if (rh.tanDelta >= 0.25 && rh.tanDelta <= 0.45) notes.push(`tan δ = ${rh.tanDelta} — faixa ótima de impressão (Gao 2018: 0,25–0,45).`)

  return { fidelity, viability, inWindow, zone, notes }
}

/** Conveniência: avalia receita com parâmetros iniciais e célula escolhida */
export function evaluateRecipeWindow(recipe: Recipe, cell: CellTypeId, overrides?: Partial<Pick<WindowInput, "nozzle_mm" | "speed_mms">>): WindowPoint {
  const supportBath = recipe.id === "collagen_fresh" || recipe.crosslink === "sacrificial"
  return evaluateWindow({
    rheology: recipe.rheology,
    cell,
    nozzle_mm: overrides?.nozzle_mm ?? recipe.startParams.nozzle_mm,
    speed_mms: overrides?.speed_mms ?? recipe.startParams.speed_mms,
    supportBath,
  })
}

export const ZONE_LABELS: Record<WindowPoint["zone"], { label: string; tone: "good" | "warn" | "bad" }> = {
  sweet: { label: "Janela ideal", tone: "good" },
  ok: { label: "Dentro da janela", tone: "good" },
  too_soft: { label: "Mole demais (perde forma)", tone: "warn" },
  too_stiff: { label: "Rígido demais (células presas)", tone: "warn" },
  too_fast: { label: "Shear alto (dano celular)", tone: "bad" },
}
