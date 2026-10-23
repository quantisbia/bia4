/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R26 · Recomendação de parâmetros de impressão a partir da biotinta
 *  ─────────────────────────────────────────────────────────────────────
 *  Entrada: o que se sabe da biotinta (material, classe, viscosidade,
 *  agulha, células, aplicação). Saída: o pacote completo que todo mundo
 *  precisa saber antes de fatiar — agulha, altura de camada, largura de
 *  linha, velocidades, fator de extrusão, retração/prime, preenchimento
 *  (padrão + %), paredes, skirt, temperaturas, seringa e pré-carga — com
 *  a justificativa de cada escolha e as referências.
 *
 *  A tabela de aprendizado (learning-table.ts) aplica correções por cima
 *  destes valores quando já existe histórico para material × geometria.
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { SliceParams, ExtrusionModel, InfillPattern, SyringeSpec } from "@/lib/slicer/types"
import { BIOINK_CLASSES, classifyBioink, needleDeadVolume_uL, type BioinkClass } from "@/lib/slicer/flow-science"
import { NEEDLE_GAUGES } from "@/lib/slicer/extrusion"

export type Application =
  | "skin" | "cartilage" | "bone" | "vascular" | "cardiac" | "liver" | "neural" | "organoid" | "calibration" | "generic"

export interface BioinkFacts {
  /** nome livre (ex.: "Alginato 3% + Gelatina 7%") */
  material: string
  bioinkClass?: BioinkClass
  /** viscosidade aparente a baixo cisalhamento (Pa·s), se conhecida */
  viscosity_PaS?: number | null
  /** índice power-law n (1 = newtoniano) */
  powerLawN?: number | null
  /** tensão de escoamento (Pa) */
  yieldStress_Pa?: number | null
  /** método de reticulação */
  crosslink?: "ionic" | "photo" | "thermal" | "enzymatic" | "none" | string | null
  /** temperatura de impressão sugerida pela receita (°C) */
  printTemp_C?: number | null
  hasCells?: boolean
  application?: Application
  /** agulha preferida pelo usuário (mm). Se ausente, a BIA escolhe. */
  nozzle_mm?: number | null
}

export interface PrintRecommendation {
  bioinkClass: BioinkClass
  application: Application
  nozzle_mm: number
  nozzleGauge: string
  syringe: SyringeSpec & { label: string }
  params: Partial<SliceParams> & Pick<SliceParams, "nozzleDiameter_mm" | "lineWidth_mm" | "layerHeight_mm" | "firstLayerHeight_mm" | "speedPerimeter_mms" | "speedInfill_mms" | "speedFirstLayer_mms" | "speedTravel_mms" | "wallCount" | "infillPattern" | "infillDensity" | "skirtLoops" | "zHop_mm" | "retractMinTravel_mm" | "cartridgeTemp_C" | "bedTemp_C" | "hasCells">
  extrusion: Pick<ExtrusionModel, "flowMultiplier" | "primeVolume_uL" | "retractVolume_uL" | "retractSpeed_mms" | "primeDwell_ms" | "startPrime_uL" | "bioinkClass" | "syringe">
  /** justificativa por parâmetro (pt-BR) */
  why: Record<string, string>
  refs: string[]
  /** avisos (ex.: viscosidade incompatível com agulha) */
  cautions: string[]
}

const SYRINGES: Record<1 | 3 | 5 | 10, SyringeSpec & { label: string }> = {
  1: { label: "BD 1 mL", volume_mL: 1, innerDiameter_mm: 4.78 },
  3: { label: "BD 3 mL / cartucho 3 cc", volume_mL: 3, innerDiameter_mm: 8.66 },
  5: { label: "BD 5 mL", volume_mL: 5, innerDiameter_mm: 12.06 },
  10: { label: "BD 10 mL", volume_mL: 10, innerDiameter_mm: 14.5 },
}

/** Aplicação → padrão de preenchimento, densidade, paredes (literatura de scaffolds). */
const APP: Record<Application, { pattern: InfillPattern; density: number; walls: number; hint: string }> = {
  skin:        { pattern: "rectilinear", density: 40, walls: 1, hint: "Pele: grade 0/90 aberta (poros 300–500 µm) favorece difusão e migração de queratinócitos/fibroblastos (Cubo 2017; Albanna 2019)." },
  cartilage:   { pattern: "concentric", density: 60, walls: 2, hint: "Cartilagem: concêntrico denso mimetiza a orientação lamelar; 50–70 % para resistência à compressão (Daly 2017)." },
  bone:        { pattern: "grid", density: 50, walls: 2, hint: "Osso: grade 0/90 com poros 400–600 µm e 50–60 % de preenchimento equilibra osteocondução e rigidez (Karageorgiou 2005)." },
  vascular:    { pattern: "concentric", density: 100, walls: 2, hint: "Canal vascular: paredes concêntricas 100 % para estanqueidade; a luz vem da geometria (tubo)." },
  cardiac:     { pattern: "rectilinear", density: 45, walls: 1, hint: "Miocárdio: linhas alinhadas (0/0 ou 0/15) orientam cardiomiócitos; 40–50 % mantém difusão (Noor 2019)." },
  liver:       { pattern: "honeycomb", density: 50, walls: 1, hint: "Hepático: hexagonal lembra o lóbulo; 50 % para perfusão (Ma 2016)." },
  neural:      { pattern: "rectilinear", density: 30, walls: 1, hint: "Neural: canais paralelos de baixa densidade guiam axônios (Joung 2018)." },
  organoid:    { pattern: "concentric", density: 100, walls: 1, hint: "Domo/organoide: sólido concêntrico pequeno; o volume é a própria geometria." },
  calibration: { pattern: "rectilinear", density: 50, walls: 1, hint: "Teste de imprimibilidade: grade 0/90 a 50 % — padrão Ouyang 2016 (Pf)." },
  generic:     { pattern: "rectilinear", density: 40, walls: 1, hint: "Scaffold genérico: grade 0/90 a 40 %, o padrão mais tolerante." },
}

export function applicationFromText(t?: string | null): Application {
  const s = (t ?? "").toLowerCase()
  if (/pele|skin|derm|cutân|cicatriz|wound/.test(s)) return "skin"
  if (/cartil|menisc|condr/.test(s)) return "cartilage"
  if (/osso|óss|bone|alveol|hap|hidroxiap/.test(s)) return "bone"
  if (/vasc|vaso|vessel|canal|perfus/.test(s)) return "vascular"
  if (/card|mioc|heart/.test(s)) return "cardiac"
  if (/hep|fíg|liver/.test(s)) return "liver"
  if (/neur|nerv|axôn/.test(s)) return "neural"
  if (/organoid|esfer|spheroid|domo/.test(s)) return "organoid"
  if (/teste|calibr|print(a|i)bil|pf\b|linha/.test(s)) return "calibration"
  return "generic"
}

/** Agulha recomendada pela viscosidade/classe (Schwab 2020; Paxton 2017). */
function pickNozzle(cls: BioinkClass, visc?: number | null, hasCells?: boolean): number {
  if (cls === "paste") return 0.84                     // 18G
  if (cls === "support_bath") return 0.26              // 25G (FRESH, tinta fluida)
  if (visc != null) {
    if (visc > 300) return 0.6                          // 20G
    if (visc > 50) return 0.41                          // 22G
    return hasCells ? 0.41 : 0.33                       // 22G com células (shear), 23G sem
  }
  return cls === "soft_hydrogel" && !hasCells ? 0.33 : 0.41
}

function gaugeFor(mm: number): string {
  const g = NEEDLE_GAUGES.reduce((a, b) => (Math.abs(b.id_mm - mm) < Math.abs(a.id_mm - mm) ? b : a))
  return Math.abs(g.id_mm - mm) < 0.03 ? g.gauge : `${mm} mm`
}

/** Pacote completo de parâmetros a partir da biotinta. */
export function recommendPrintParams(f: BioinkFacts): PrintRecommendation {
  const cls = f.bioinkClass ?? classifyBioink(f.material, { isFresh: /fresh|banho/i.test(f.material) })
  const spec = BIOINK_CLASSES[cls]
  const app = f.application ?? "generic"
  const A = APP[app]
  const why: Record<string, string> = {}; const cautions: string[] = []

  const nozzle = f.nozzle_mm && f.nozzle_mm > 0 ? f.nozzle_mm : pickNozzle(cls, f.viscosity_PaS, f.hasCells)
  why.nozzle = f.nozzle_mm ? "Agulha definida por você." : `Agulha ${gaugeFor(nozzle)} para ${spec.label.split(" (")[0].toLowerCase()}${f.viscosity_PaS != null ? ` a ~${f.viscosity_PaS} Pa·s` : ""}${f.hasCells ? " — ≥ 22G para manter o cisalhamento < 5 kPa com células (Blaeser 2016)" : ""}.`
  if (f.viscosity_PaS != null && f.viscosity_PaS > 300 && nozzle < 0.5) cautions.push(`Viscosidade ${f.viscosity_PaS} Pa·s com agulha ${gaugeFor(nozzle)} exige pressão/torque alto — considere 20G ou aquecer o cartucho.`)

  // camada e largura (hidrogel: 70–90 % do bico; largura ~1,15× por die-swell)
  const layer = Math.round(nozzle * (cls === "paste" ? 0.8 : cls === "support_bath" ? 0.75 : 0.8) * 100) / 100
  const line = Math.round(nozzle * (cls === "soft_hydrogel" ? 1.2 : 1.15) * 1000) / 1000
  why.layerHeight = `Camada = ${Math.round((layer / nozzle) * 100)} % do diâmetro da agulha — o cordão achata e adere à camada anterior sem ser esmagado (Ribeiro 2017).`
  why.lineWidth = `Largura ${line} mm ≈ ${(line / nozzle).toFixed(2)}× a agulha (die-swell de hidrogel).`

  // velocidade: alvo de vazão da classe
  const bead = (line - layer) * layer + Math.PI * (layer / 2) ** 2
  const qTarget = (spec.flowTarget_uLs[0] + spec.flowTarget_uLs[1]) / 2 * (f.hasCells ? 0.8 : 1)
  let speed = qTarget / (bead * spec.extrusionFactor)
  speed = Math.max(3, Math.min(cls === "paste" ? 12 : 15, Math.round(speed * 2) / 2))
  why.speed = `Velocidade ${speed} mm/s produz ~${(bead * speed * spec.extrusionFactor).toFixed(1)} µL/s — meio da faixa da literatura para ${cls} (${spec.flowTarget_uLs[0]}–${spec.flowTarget_uLs[1]} µL/s)${f.hasCells ? ", reduzida 20 % para proteger células" : ""}.`

  // seringa: menor volume → êmbolo anda mais; pastas em 10 mL
  const syringe = cls === "paste" ? SYRINGES[10] : app === "organoid" ? SYRINGES[1] : SYRINGES[3]
  why.syringe = cls === "paste" ? "Pasta quase incompressível: 10 mL funciona." : `${syringe.label}: êmbolo anda ${(165.1 / (Math.PI * (syringe.innerDiameter_mm / 2) ** 2)).toFixed(1)}× mais por µL que a de 10 mL — sai da zona de stick-slip do fuso.`

  // retração: fluidas retraem mais; pastas quase nada
  const retract = cls === "support_bath" ? 0.8 : cls === "soft_hydrogel" ? 0.4 : cls === "paste" ? 1.0 : 0.3
  const prime = cls === "paste" ? 3 : 1.5
  why.retraction = cls === "support_bath" ? "FRESH: retração maior para não gotejar no banho (Tashman 2021)." : `Retração ${retract} µL + prime ${prime} µL — suficiente para cortar o fio sem introduzir ar.`

  const startPrime = Math.round((needleDeadVolume_uL(nozzle) + spec.extraPrime_uL) * 10) / 10
  why.startPrime = `Pré-carga ${startPrime} µL enche agulha + luer (volume morto) e faz o filamento aparecer antes do primeiro cordão.`

  why.flow = `Fator de extrusão ${spec.extrusionFactor}× (Q_real/Q_teórico) — faixa ${spec.factorRange[0]}–${spec.factorRange[1]}× para ${cls} (${spec.refs}).`
  why.infill = A.hint
  why.walls = `${A.walls} parede(s): ${A.walls >= 2 ? "duas paredes seguram a forma de hidrogéis moles" : "uma parede basta e mantém os poros abertos"}.`
  why.skirt = "Skirt desligado: o primeiro cordão nasce no ponto zero (racional BIA R19). Use a pré-carga em vez de skirt."

  // temperaturas
  const cart = f.printTemp_C ?? (cls === "soft_hydrogel" ? (/gelat|gelma/i.test(f.material) ? 24 : null) : cls === "sacrificial" ? 8 : null)
  const bed = /gelat|gelma|colág|collagen/i.test(f.material) ? 10 : cls === "sacrificial" ? 25 : null
  why.temps = cart != null || bed != null ? `Cartucho ${cart ?? "—"} °C · mesa ${bed ?? "—"} °C: ${/gelat/i.test(f.material) ? "gelatina/GelMA imprimem a 22–26 °C e gelificam na mesa fria (Lee 2020)" : cls === "sacrificial" ? "Pluronic flui frio (< 10 °C) e gela na mesa a 25 °C" : "controle térmico conforme a receita"}.` : "Sem controle térmico necessário."

  const refs = Array.from(new Set([spec.refs, "Schwab 2020 (Chem. Rev.)", "Ouyang 2016 (Pf)", "Blaeser 2016 (shear × viabilidade)", A.hint.match(/\(([^)]+)\)/)?.[1] ?? ""].filter(Boolean)))

  return {
    bioinkClass: cls, application: app, nozzle_mm: nozzle, nozzleGauge: gaugeFor(nozzle), syringe,
    params: {
      nozzleDiameter_mm: nozzle, lineWidth_mm: line, layerHeight_mm: layer, firstLayerHeight_mm: Math.round(layer * 0.9 * 100) / 100,
      speedPerimeter_mms: speed, speedInfill_mms: Math.round(speed * 1.15 * 2) / 2, speedFirstLayer_mms: Math.max(2, Math.round(speed * 0.7 * 2) / 2), speedTravel_mms: 40,
      wallCount: A.walls, infillPattern: A.pattern, infillDensity: A.density, skirtLoops: 0,
      zHop_mm: cls === "support_bath" ? 1.5 : 0.8, retractMinTravel_mm: 2,
      cartridgeTemp_C: cart, bedTemp_C: bed, hasCells: !!f.hasCells,
    },
    extrusion: { flowMultiplier: spec.extrusionFactor, primeVolume_uL: prime, retractVolume_uL: retract, retractSpeed_mms: cls === "support_bath" ? 4 : 2, primeDwell_ms: 150, startPrime_uL: startPrime, bioinkClass: cls, syringe: { volume_mL: syringe.volume_mL, innerDiameter_mm: syringe.innerDiameter_mm } },
    why, refs, cautions,
  }
}

/** Linhas legíveis (label, valor, porquê) para exibir em cards. */
export function describeRecommendation(r: PrintRecommendation): Array<{ k: string; v: string; why: string }> {
  const P = r.params, X = r.extrusion
  return [
    { k: "Agulha", v: `${r.nozzleGauge} (Ø ${P.nozzleDiameter_mm} mm)`, why: r.why.nozzle },
    { k: "Seringa", v: r.syringe.label, why: r.why.syringe },
    { k: "Altura de camada", v: `${P.layerHeight_mm} mm (1ª: ${P.firstLayerHeight_mm})`, why: r.why.layerHeight },
    { k: "Largura de linha", v: `${P.lineWidth_mm} mm`, why: r.why.lineWidth },
    { k: "Velocidade", v: `${P.speedPerimeter_mms} mm/s (infill ${P.speedInfill_mms} · 1ª camada ${P.speedFirstLayer_mms})`, why: r.why.speed },
    { k: "Fator de extrusão", v: `${X.flowMultiplier.toFixed(2)}×`, why: r.why.flow },
    { k: "Pré-carga (START)", v: `${X.startPrime_uL} µL`, why: r.why.startPrime },
    { k: "Retração / prime", v: `${X.retractVolume_uL} µL / ${X.primeVolume_uL} µL`, why: r.why.retraction },
    { k: "Preenchimento", v: `${P.infillPattern} · ${P.infillDensity} %`, why: r.why.infill },
    { k: "Paredes", v: String(P.wallCount), why: r.why.walls },
    { k: "Skirt", v: P.skirtLoops ? `${P.skirtLoops} volta(s)` : "desligado", why: r.why.skirt },
    { k: "Temperaturas", v: `cartucho ${P.cartridgeTemp_C ?? "—"} °C · mesa ${P.bedTemp_C ?? "—"} °C`, why: r.why.temps },
  ]
}

/** Payload que a Fase 3 (BioSlicer) consome via sessionStorage "bia:slicer-recipe". */
export const SLICER_RECIPE_KEY = "bia:slicer-recipe"
export interface SlicerRecipeHandoff {
  source: string
  material: string
  application: Application
  params: PrintRecommendation["params"]
  extrusion: PrintRecommendation["extrusion"]
  rheology?: { viscosity_PaS?: number; powerLawN?: number }
  why: Record<string, string>
}
