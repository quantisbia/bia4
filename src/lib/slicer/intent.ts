/**
 * BIA v4 · R15 · BioSlicer — Intent Parser pt-BR (texto ou voz → auto-profile)
 *
 *   1. tecido/objetivo → perfil base
 *   2. regras explícitas do usuário (bico, camada, poro, velocidade, infill,
 *      paredes, temperaturas, células, seringa, dimensões, firmware)
 *   3. REGRAS DE DOMÍNIO (células → ≤10 mm/s; Matrigel → cartucho frio/mesa 37;
 *      HAp → bico ≥ 0,6 mm; PCL → 90 °C e 3 mm/s; …)
 *   4. params + extrusão + decisões explicadas
 */

import type { SliceParams, ExtrusionModel, InfillPattern, SliceProfile } from "./types"
import { ADVANCED_PROFILES, BASIC_PROFILES, getProfile } from "./profiles"
import { NEEDLE_GAUGES, SYRINGE_CATALOG, defaultLayerHeight, defaultLineWidth } from "./extrusion"

export interface IntentDecision {
  field: string
  value: string | number | boolean | null
  reason: string
  source: "user" | "rule" | "profile"
}

export interface IntentResult {
  profile: SliceProfile
  params: SliceParams
  extrusion: ExtrusionModel
  decisions: IntentDecision[]
  targetSize_mm?: { x?: number; y?: number; z?: number }
  tissue: string | null
  material: string | null
  confidence: number
  warnings: string[]
  rheology?: { viscosity_PaS?: number; powerLawN?: number }
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/,/g, ".").replace(/\s+/g, " ").trim()

const TISSUE_RULES: Array<{ re: RegExp; profileId: string; tissue: string }> = [
  { re: /\b(osso|osse[oa]|bone|osteo|craniano|calota|mandib|femur|tibia|alveolar)\b/, profileId: "adv_bone_scaffold", tissue: "osso" },
  { re: /\b(cartilag|menisco|condr|articular|nariz|nasal|orelha|auricul|traquei)/, profileId: "adv_cartilage_concentric", tissue: "cartilagem" },
  { re: /\b(pele|derme|epiderme|skin|membrana|curativo|patch|ferida|queimadur)/, profileId: "adv_skin_patch", tissue: "pele" },
  { re: /\b(vas[oc]|vascular|canal|capilar|arteri|veia|perfus|sacrific)/, profileId: "adv_vascular_channel", tissue: "vascular" },
  { re: /\b(fresh|banho de suporte|suspens|embedded|carbopol|gelatina de suporte|coracao|cardiac|ventric|valva)/, profileId: "adv_fresh_support_bath", tissue: "cardíaco/FRESH" },
  { re: /\b(imprimibilidade|printabil|teste de grade|pr de ouyang)/, profileId: "adv_printability_grid", tissue: "teste" },
  { re: /\b(organoide|organoid|esferoide|domo|matrigel|bme|intestin|tumor|hepat|figado|rim|renal)/, profileId: "adv_organoid_dome", tissue: "organoide" },
  { re: /\b(teste|calibra|pasta|creme|nutella|primeir[ao])/, profileId: "basic_first_print", tissue: "teste" },
]

type Rheo = { viscosity_PaS?: number; powerLawN?: number }
const MATERIAL_RULES: Array<{ re: RegExp; material: string; apply: (p: SliceParams, x: ExtrusionModel, d: IntentDecision[]) => Rheo | void }> = [
  { re: /\bgelma\b|metacril/, material: "GelMA", apply: (p, _x, d) => { p.cartridgeTemp_C = p.cartridgeTemp_C ?? 23; d.push({ field: "cartridgeTemp_C", value: p.cartridgeTemp_C, reason: "GelMA imprime na janela 21–25 °C (Allevi; Compaired 2025).", source: "rule" }); return { viscosity_PaS: 2.5, powerLawN: 0.6 } } },
  { re: /\balginat|alginate\b/, material: "Alginato", apply: (_p, x, d) => { x.retractVolume_uL = Math.min(x.retractVolume_uL, 0.3); d.push({ field: "retractVolume_uL", value: x.retractVolume_uL, reason: "Alginato fluido: retração grande puxa ar; usamos ≤ 0,3 µL.", source: "rule" }); return { viscosity_PaS: 1.5, powerLawN: 0.7 } } },
  { re: /\bgelatin/, material: "Gelatina", apply: (p, _x, d) => { p.cartridgeTemp_C = p.cartridgeTemp_C ?? 26; d.push({ field: "cartridgeTemp_C", value: p.cartridgeTemp_C, reason: "Gelatina: 24–28 °C mantém gel imprimível.", source: "rule" }); return { viscosity_PaS: 8, powerLawN: 0.45 } } },
  { re: /\bpluronic|f127|poloxam/, material: "Pluronic F127", apply: (p, _x, d) => { p.cartridgeTemp_C = p.cartridgeTemp_C ?? 23; p.speedPerimeter_mms = Math.max(p.speedPerimeter_mms, 8); d.push({ field: "speedPerimeter_mms", value: p.speedPerimeter_mms, reason: "Pluronic tem yield stress alto: aceita 8–15 mm/s.", source: "rule" }); return { viscosity_PaS: 40, powerLawN: 0.3 } } },
  { re: /\bmatrigel|bme|geltrex|membrana basal/, material: "Matrigel/BME", apply: (p, x, d) => { p.cartridgeTemp_C = 8; p.bedTemp_C = 37; p.waitForTemps = true; x.retractVolume_uL = Math.min(x.retractVolume_uL, 0.15); d.push({ field: "cartridgeTemp_C", value: 8, reason: "Matrigel gelifica > 10 °C: cartucho frio obrigatório.", source: "rule" }); d.push({ field: "bedTemp_C", value: 37, reason: "Mesa a 37 °C fixa o domo ao poço.", source: "rule" }); return { viscosity_PaS: 0.5, powerLawN: 0.9 } } },
  { re: /\bcolagen|collagen|fibrina|fibrin/, material: "Colágeno/Fibrina", apply: (p, _x, d) => { if (p.infillPattern !== "none") p.speedInfill_mms = Math.min(p.speedInfill_mms, 8); d.push({ field: "speedInfill_mms", value: p.speedInfill_mms, reason: "Colágeno/fibrina de baixa viscosidade: preferir FRESH ou velocidades baixas.", source: "rule" }); return { viscosity_PaS: 0.3, powerLawN: 0.95 } } },
  { re: /\bhidroxiapatit|hap\b|tcp\b|fosfato de calcio|bioglass|ceramic/, material: "Compósito cerâmico", apply: (p, _x, d) => { if (p.nozzleDiameter_mm < 0.6) { p.nozzleDiameter_mm = 0.6; p.lineWidth_mm = defaultLineWidth(0.6); p.layerHeight_mm = defaultLayerHeight(0.6); d.push({ field: "nozzleDiameter_mm", value: 0.6, reason: "Partículas cerâmicas entopem agulhas < 20G; bico ≥ 0,6 mm.", source: "rule" }) } return { viscosity_PaS: 30, powerLawN: 0.35 } } },
  { re: /\bpcl\b|policaprolactona|termoplast/, material: "PCL", apply: (p, x, d) => { p.cartridgeTemp_C = 90; p.waitForTemps = true; p.speedPerimeter_mms = Math.min(p.speedPerimeter_mms, 3); p.speedInfill_mms = Math.min(p.speedInfill_mms, 3); x.retractVolume_uL = 0; d.push({ field: "cartridgeTemp_C", value: 90, reason: "PCL fundido a 80–110 °C; velocidade 1–3 mm/s.", source: "rule" }); return { viscosity_PaS: 400, powerLawN: 0.5 } } },
  { re: /\bnanocelulos|cnf|nfc|celulose/, material: "Nanocelulose", apply: () => ({ viscosity_PaS: 20, powerLawN: 0.3 }) },
]

const INFILL_WORDS: Array<{ re: RegExp; pattern: InfillPattern }> = [
  { re: /\bgyroid|giroide\b/, pattern: "gyroid" },
  { re: /\bconcentric|anel|aneis\b/, pattern: "concentric" },
  { re: /\bhexagon|honeycomb|colmeia|favo\b/, pattern: "honeycomb" },
  { re: /\bzigzag|zig-zag|continu[oa]\b/, pattern: "zigzag" },
  { re: /\bgrade cruzada|grid\b|cruzad/, pattern: "grid" },
  { re: /\btriangul/, pattern: "triangles" },
  { re: /\bwoodpile|0\/90|zero noventa|grade|grelha|retilin|linhas paralelas|log pile\b/, pattern: "rectilinear" },
  { re: /\bsem infill|so paredes|apenas paredes|oco|vase|vaso\b/, pattern: "none" },
]

function num(re: RegExp, text: string): number | null {
  const m = text.match(re)
  if (!m) return null
  const v = parseFloat(m[1])
  return Number.isFinite(v) ? v : null
}

function parseDims(t: string): { x?: number; y?: number; z?: number } | undefined {
  let m = t.match(/(\d+(?:\.\d+)?)\s*(?:x|×|por)\s*(\d+(?:\.\d+)?)\s*(?:x|×|por)\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/)
  if (m) { const k = m[4] === "cm" ? 10 : 1; return { x: +m[1] * k, y: +m[2] * k, z: +m[3] * k } }
  m = t.match(/(\d+(?:\.\d+)?)\s*(?:x|×|por)\s*(\d+(?:\.\d+)?)\s*(mm|cm)/)
  if (m) { const k = m[3] === "cm" ? 10 : 1; return { x: +m[1] * k, y: +m[2] * k } }
  const out: { x?: number; y?: number; z?: number } = {}
  const d = t.match(/diametro\s*(?:de\s*)?(\d+(?:\.\d+)?)\s*(mm|cm)?/)
  if (d) { const k = d[2] === "cm" ? 10 : 1; out.x = +d[1] * k; out.y = +d[1] * k }
  const h = t.match(/(?:altura|espessura)\s*(?:de\s*)?(\d+(?:\.\d+)?)\s*(mm|cm)?/)
  if (h) { const k = h[2] === "cm" ? 10 : 1; out.z = +h[1] * k }
  return Object.keys(out).length ? out : undefined
}

export function parseIntent(input: string, nozzleDefault_mm = 0.41): IntentResult {
  const t = norm(input)
  const decisions: IntentDecision[] = []
  const warnings: string[] = []
  let confidence = 0.3

  let profile: SliceProfile = getProfile("basic_first_print")!
  let tissue: string | null = null
  for (const r of TISSUE_RULES) {
    if (r.re.test(t)) { profile = getProfile(r.profileId) ?? profile; tissue = r.tissue; confidence += 0.25; break }
  }
  decisions.push({ field: "profile", value: profile.id, reason: tissue ? `Objetivo "${tissue}" → perfil ${profile.name}.` : "Nenhum tecido identificado → perfil básico conservador.", source: tissue ? "user" : "profile" })

  const P: SliceParams = { ...profile.params }
  const X: ExtrusionModel = { ...profile.extrusion, syringe: profile.extrusion.syringe ? { ...profile.extrusion.syringe } : undefined }

  let material: string | null = null
  let rheology: Rheo | undefined
  for (const r of MATERIAL_RULES) {
    if (r.re.test(t)) {
      material = material ? `${material} + ${r.material}` : r.material
      const rh = r.apply(P, X, decisions)
      if (rh) rheology = rheology ? { ...rheology, ...rh } : rh
      confidence += 0.1
    }
  }

  const gauge = t.match(/\b(\d{2})\s*g\b/)
  const nozzleMm = num(/(?:bico|agulha|nozzle)\s*(?:de\s*)?(\d(?:\.\d+)?)\s*mm/, t) ?? num(/(\d(?:\.\d+)?)\s*mm\s*(?:de\s*)?(?:bico|agulha|nozzle)/, t)
  const setNozzle = (d: number, reason: string) => {
    P.nozzleDiameter_mm = d; P.lineWidth_mm = defaultLineWidth(d); P.layerHeight_mm = defaultLayerHeight(d)
    P.firstLayerHeight_mm = Math.round(P.layerHeight_mm * 0.9 * 100) / 100
    decisions.push({ field: "nozzleDiameter_mm", value: d, reason, source: "user" }); confidence += 0.1
  }
  if (gauge) {
    const g = NEEDLE_GAUGES.find((n) => n.gauge === `${gauge[1]}G`)
    if (g) setNozzle(g.id_mm, `Agulha ${g.gauge} → Ø interno ${g.id_mm} mm; camada 80 % e linha 115 % do bico.`)
  } else if (nozzleMm) {
    setNozzle(nozzleMm, "Bico informado pelo usuário.")
  } else if (!P.nozzleDiameter_mm) {
    P.nozzleDiameter_mm = nozzleDefault_mm
  }

  const layer = num(/camada\s*(?:de\s*)?(\d(?:\.\d+)?)\s*mm/, t) ?? num(/(\d(?:\.\d+)?)\s*mm\s*(?:de\s*)?camada/, t)
  if (layer) { P.layerHeight_mm = layer; P.firstLayerHeight_mm = layer; decisions.push({ field: "layerHeight_mm", value: layer, reason: "Altura de camada informada.", source: "user" }) }

  const poreUm = num(/poro[s]?\s*(?:de\s*)?(?:~|≈|cerca de\s*)?(\d{2,4})\s*(?:µm|um|micr)/, t)
  const poreMm = num(/poro[s]?\s*(?:de\s*)?(\d(?:\.\d+)?)\s*mm/, t)
  const spacing = num(/espacament[oa]\s*(?:de\s*)?(\d(?:\.\d+)?)\s*mm/, t)
  if (spacing) {
    P.strandSpacing_mm = spacing
    decisions.push({ field: "strandSpacing_mm", value: spacing, reason: "Espaçamento centro-a-centro informado.", source: "user" })
  } else if (poreUm || poreMm) {
    const pore = poreUm ? poreUm / 1000 : (poreMm as number)
    P.strandSpacing_mm = Math.round((pore + P.lineWidth_mm) * 100) / 100
    if (P.infillPattern === "none" || P.infillPattern === "concentric" || P.infillPattern === "gyroid") P.infillPattern = "rectilinear"
    decisions.push({ field: "strandSpacing_mm", value: P.strandSpacing_mm, reason: `Poro alvo ${Math.round(pore * 1000)} µm + largura do cordão ${P.lineWidth_mm} mm = espaçamento.`, source: "rule" })
    confidence += 0.1
  }

  const poros = num(/porosidade\s*(?:de\s*)?(\d{1,3})\s*%/, t)
  const dens = num(/(?:densidade|infill|preenchimento)\s*(?:de\s*)?(\d{1,3})\s*%/, t)
  if (dens !== null) { P.infillDensity = dens; P.strandSpacing_mm = undefined; decisions.push({ field: "infillDensity", value: dens, reason: "Densidade informada.", source: "user" }) }
  else if (poros !== null) { P.infillDensity = Math.max(5, 100 - poros); decisions.push({ field: "infillDensity", value: P.infillDensity, reason: `Porosidade ${poros} % → densidade ${P.infillDensity} %.`, source: "rule" }) }

  for (const w of INFILL_WORDS) {
    if (w.re.test(t)) { P.infillPattern = w.pattern; decisions.push({ field: "infillPattern", value: w.pattern, reason: "Padrão de infill pedido pelo usuário.", source: "user" }); break }
  }
  if (/\b(0\/60|triangular|60 graus)\b/.test(t)) P.infillAngleStep_deg = 60

  const walls = num(/(\d)\s*paredes?/, t) ?? num(/paredes?\s*(?:de\s*)?(\d)/, t)
  if (walls !== null) { P.wallCount = walls; decisions.push({ field: "wallCount", value: walls, reason: "Número de paredes informado.", source: "user" }) }

  const speed = num(/(\d{1,2}(?:\.\d+)?)\s*mm\s*\/\s*s/, t)
  if (speed) {
    P.speedPerimeter_mms = speed; P.speedInfill_mms = Math.round(speed * 1.2 * 10) / 10; P.speedFirstLayer_mms = Math.max(2, Math.round(speed * 0.7 * 10) / 10)
    decisions.push({ field: "speedPerimeter_mms", value: speed, reason: "Velocidade informada (infill +20 %, 1ª camada −30 %).", source: "user" })
  } else if (/\b(rapid[oa]|veloz|depressa)\b/.test(t)) {
    P.speedPerimeter_mms = Math.min(12, P.speedPerimeter_mms * 1.5); P.speedInfill_mms = Math.min(15, P.speedInfill_mms * 1.5)
    decisions.push({ field: "speedPerimeter_mms", value: P.speedPerimeter_mms, reason: "\"Rápido\" → +50 % limitado a 12/15 mm/s (limite típico de hidrogel).", source: "rule" })
  } else if (/\b(lent[oa]|devagar|cuidad|alta resoluc|fino|fina)\b/.test(t)) {
    P.speedPerimeter_mms = Math.max(2, P.speedPerimeter_mms * 0.7); P.speedInfill_mms = Math.max(2, P.speedInfill_mms * 0.7)
    decisions.push({ field: "speedPerimeter_mms", value: P.speedPerimeter_mms, reason: "\"Lento/fino\" → −30 % velocidade.", source: "rule" })
  }

  if (/\b(celula|celulas|cell|cells|carregad[ao]|fibroblast|condrocit|osteoblast|msc|hepatocit|queratinocit|celular)/.test(t)) {
    P.hasCells = true
    if (P.speedPerimeter_mms > 10) { P.speedPerimeter_mms = 10; decisions.push({ field: "speedPerimeter_mms", value: 10, reason: "Com células: velocidade ≤ 10 mm/s para limitar shear.", source: "rule" }) }
    if (P.speedInfill_mms > 12) P.speedInfill_mms = 12
    if (P.nozzleDiameter_mm < 0.25) warnings.push("Agulha < 25G com células aumenta shear acima de 5 kPa — considere 22G ou maior.")
    decisions.push({ field: "hasCells", value: true, reason: "Biotinta celularizada → ativa viabilidade/shear e limite de tempo.", source: "user" })
    confidence += 0.05
  }
  if (/\bsem celula|acelular|sem cel\b/.test(t)) P.hasCells = false

  const tCart = num(/(?:cartucho|seringa|bico)\s*(?:a|em)?\s*(\d{1,3})\s*(?:°|graus|c\b)/, t)
  const tBed = num(/(?:mesa|cama|bed|plataforma)\s*(?:a|em)?\s*(\d{1,3})\s*(?:°|graus|c\b)/, t)
  if (tCart !== null) { P.cartridgeTemp_C = tCart; decisions.push({ field: "cartridgeTemp_C", value: tCart, reason: "Temperatura do cartucho informada.", source: "user" }) }
  if (tBed !== null) { P.bedTemp_C = tBed; decisions.push({ field: "bedTemp_C", value: tBed, reason: "Temperatura da mesa informada.", source: "user" }) }
  if (/\bsem aquec|sem temperatura|temperatura ambiente|frio\b/.test(t) && tCart === null) { P.cartridgeTemp_C = null; P.bedTemp_C = null }

  const syr = num(/seringa\s*(?:de\s*)?(\d{1,2})\s*ml/, t) ?? num(/(\d{1,2})\s*ml/, t)
  if (syr) {
    const s = SYRINGE_CATALOG.find((c) => c.volume_mL === syr)
    if (s) { X.kind = "syringe_stepper"; X.syringe = { volume_mL: s.volume_mL, innerDiameter_mm: s.innerDiameter_mm }; decisions.push({ field: "syringe", value: `${s.volume_mL} mL`, reason: `Seringa ${s.label} → Ø ${s.innerDiameter_mm} mm.`, source: "user" }) }
  }
  if (/\bpneumat|pressao|kpa|psi\b/.test(t)) {
    X.kind = "pneumatic"
    const kpa = num(/(\d{2,3})\s*kpa/, t)
    const psi = num(/(\d{1,3})\s*psi/, t)
    X.pressure_kPa = kpa ?? (psi ? Math.round(psi * 6.895) : 75)
    decisions.push({ field: "extrusion", value: "pneumatic", reason: `Extrusão pneumática a ${X.pressure_kPa} kPa.`, source: "user" })
  }

  if (/\bpoco|placa de \d+|well|petri\b/.test(t)) {
    P.skirtLoops = 0
    decisions.push({ field: "skirtLoops", value: 0, reason: "Impressão em poço/Petri → sem skirt (não há espaço).", source: "rule" })
  }

  if (/\bklipper\b/.test(t)) P.firmware = "klipper"
  if (/\breprap|duet\b/.test(t)) P.firmware = "reprap"

  const targetSize_mm = parseDims(t)
  if (targetSize_mm) { decisions.push({ field: "targetSize_mm", value: JSON.stringify(targetSize_mm), reason: "Dimensões alvo → o STL será escalado para caber.", source: "user" }); confidence += 0.1 }

  const pause = num(/pausa\s*(?:de\s*)?(\d{1,3})\s*s/, t)
  if (pause) { P.layerPause_s = pause; decisions.push({ field: "layerPause_s", value: pause, reason: "Pausa entre camadas para gelificação.", source: "user" }) }

  if (P.infillPattern === "none") P.infillDensity = 0
  if (P.wallCount === 0 && P.infillPattern === "none") warnings.push("Sem paredes e sem infill — nada será impresso. Ajuste um dos dois.")
  if (P.strandSpacing_mm && P.strandSpacing_mm <= P.lineWidth_mm) warnings.push("Espaçamento ≤ largura do cordão: cordões vão fundir (poro = 0).")

  return { profile, params: P, extrusion: X, decisions, targetSize_mm, tissue, material, confidence: Math.min(1, confidence), warnings, rheology }
}

export const INTENT_EXAMPLES = [
  "Scaffold ósseo 10x10x4 mm, poro 400 µm, alginato com HAp, agulha 18G",
  "Menisco em GelMA 10% com condrócitos, 3 paredes, gyroid 45%, lento",
  "Patch de pele 20x20x1.5 mm, grade 90°, alginato gelatina com fibroblastos, 22G",
  "Canal vascular com Pluronic, só paredes, seringa 5 mL, 10 mm/s",
  "Teste de imprimibilidade, espaçamento 2 mm, 2 paredes, 22G",
  "Domo de organoide em Matrigel no poço de placa de 48, 1 mL, 27G",
  "FRESH colágeno 25G, camada 0.2 mm, densidade 50%, rápido",
]

export { BASIC_PROFILES, ADVANCED_PROFILES }
