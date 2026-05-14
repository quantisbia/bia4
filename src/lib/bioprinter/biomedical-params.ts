/**
 * BIA — Biomedical Bioprinting Parameters Knowledge Base
 *
 * Base de conhecimento científica para o Bioprinter Control Center.
 * Pensado por engenharia de tecidos: cada parâmetro tem racional biológico
 * e referência bibliográfica.
 *
 * Refs:
 *  - Ouyang et al. 2016, Biofabrication — shear stress cell death
 *  - Blaeser et al. 2016, Adv Healthcare Mater — viability prediction
 *  - Kolesky et al. 2014, Adv Mater — sacrificial vasculature
 *  - Bertassoni et al. 2014, Biofabrication — perfusable tissue
 *  - Murphy & Atala 2014, Nat Biotechnol — 3D bioprinting review
 *  - Ozbolat 2016, Trends Biotechnol — bioink classification
 *  - Schwab et al. 2020, Chem Rev — bioink rheology
 *  - Mandrycky et al. 2016, Biotechnol Adv — extrusion bioprinting
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. MECANISMOS DE EXTRUSÃO
// ═══════════════════════════════════════════════════════════════════════════

export type ExtrusionMechanism =
  | "pneumatic"       // Pressão de ar — Allevi 2/3, Cellink BioX, RegenHU 3DDiscovery
  | "mechanical"      // Pistão passo-a-passo — Inkredible, BIO X6 piston
  | "screw"           // Rosca/parafuso — Allevi 6 micro-extruder, 3D-Bioplotter

export interface ExtrusionConfig {
  mechanism: ExtrusionMechanism
  label: string
  unit: string
  min: number
  max: number
  default: number
  fineStep: number   // Passo fino (botão +/-)
  coarseStep: number // Passo grosso (botão ++/--)
  warnAbove: number  // Acima disto = risco celular
  criticalAbove: number // Acima disto = morte celular >50%
  description: string
  printerExamples: string[]
}

export const EXTRUSION_CONFIGS: Record<ExtrusionMechanism, ExtrusionConfig> = {
  pneumatic: {
    mechanism: "pneumatic",
    label: "Pressão pneumática",
    unit: "kPa",
    min: 0,
    max: 200,
    default: 30,
    fineStep: 1,
    coarseStep: 5,
    warnAbove: 80,      // shear stress começa a estressar células
    criticalAbove: 150, // viabilidade cai <60% (Ouyang 2016)
    description:
      "Ar comprimido pressuriza o cartucho. Mais barato e versátil, mas pressão alta gera shear stress que pode matar células (Ouyang 2016).",
    printerExamples: ["Allevi 2/3", "Cellink BioX", "RegenHU 3DDiscovery", "ROKIT INVIVO"],
  },
  mechanical: {
    mechanism: "mechanical",
    label: "Vazão pistão",
    unit: "µL/s",
    min: 0,
    max: 5,
    default: 0.3,
    fineStep: 0.01,
    coarseStep: 0.1,
    warnAbove: 2,
    criticalAbove: 4,
    description:
      "Pistão de passo controla volume com precisão sub-microlitro. Ideal para bioinks caros (terapia celular). Limitado em viscosidade alta.",
    printerExamples: ["Inkredible+", "BIO X6 piston head", "Custom syringe pumps"],
  },
  screw: {
    mechanism: "screw",
    label: "Rotação rosca",
    unit: "rpm",
    min: 0,
    max: 30,
    default: 5,
    fineStep: 0.5,
    coarseStep: 2,
    warnAbove: 12,    // aquecimento por atrito começa
    criticalAbove: 20, // >40°C local = desnaturação
    description:
      "Parafuso sem-fim empurra material viscoso. Único modo viável para hidrogéis >50 Pa·s e materiais sintéticos quentes. Cuidado: atrito aquece.",
    printerExamples: ["Allevi 6 micro", "EnvisionTEC 3D-Bioplotter", "Cellink BioX Thermoplastic"],
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. JANELAS DE TEMPERATURA (cartucho × cama × câmara)
// ═══════════════════════════════════════════════════════════════════════════

export interface TempProfile {
  bioinkType: string
  cartridgeTempC: { min: number; max: number; ideal: number }
  bedTempC: { min: number; max: number; ideal: number }
  chamberTempC: { min: number; max: number; ideal: number }
  humidityPercent: { min: number; ideal: number }
  rationale: string
  ref: string
}

export const TEMPERATURE_PROFILES: TempProfile[] = [
  {
    bioinkType: "Gelatina/GelMA",
    cartridgeTempC: { min: 22, max: 32, ideal: 25 },
    bedTempC: { min: 4, max: 10, ideal: 6 },
    chamberTempC: { min: 18, max: 25, ideal: 20 },
    humidityPercent: { min: 70, ideal: 85 },
    rationale:
      "Gelatina é líquida >30°C, sólida <22°C. Cartucho a 25°C mantém viscosidade fluida; cama fria gelifica imediatamente após deposição.",
    ref: "Schuurman 2013, Biofabrication",
  },
  {
    bioinkType: "Alginato",
    cartridgeTempC: { min: 18, max: 37, ideal: 25 },
    bedTempC: { min: 18, max: 30, ideal: 22 },
    chamberTempC: { min: 22, max: 28, ideal: 25 },
    humidityPercent: { min: 75, ideal: 90 },
    rationale:
      "Alginato não muda com temperatura — depende de Ca²⁺. Cuidado com evaporação: UR alta evita formação de pele.",
    ref: "Axpe & Oyen 2016, Int J Mol Sci",
  },
  {
    bioinkType: "Colágeno",
    cartridgeTempC: { min: 4, max: 12, ideal: 8 },
    bedTempC: { min: 32, max: 37, ideal: 37 },
    chamberTempC: { min: 32, max: 37, ideal: 37 },
    humidityPercent: { min: 80, ideal: 90 },
    rationale:
      "Colágeno gelifica a 37°C (auto-assembly de fibrilas). Cartucho frio mantém líquido; cama quente cura imediatamente. UR alta evita ressecamento.",
    ref: "Drzewiecki 2017, Biophys J",
  },
  {
    bioinkType: "Fibrina",
    cartridgeTempC: { min: 18, max: 25, ideal: 22 },
    bedTempC: { min: 22, max: 37, ideal: 30 },
    chamberTempC: { min: 25, max: 37, ideal: 30 },
    humidityPercent: { min: 75, ideal: 85 },
    rationale:
      "Fibrinogênio + trombina formam rede de fibrina em segundos. Pré-mistura em câmara dupla; cura rápida no leito quente.",
    ref: "Janmey 2009, J Roy Soc Interface",
  },
  {
    bioinkType: "PEGDA / PEGMA",
    cartridgeTempC: { min: 18, max: 25, ideal: 22 },
    bedTempC: { min: 18, max: 25, ideal: 22 },
    chamberTempC: { min: 18, max: 25, ideal: 22 },
    humidityPercent: { min: 50, ideal: 70 },
    rationale:
      "Sintético, cura por UV 405nm. Não precisa controle térmico, mas atmosfera N₂ melhora cura (sem inibição por O₂).",
    ref: "Lin 2013, Biomaterials",
  },
  {
    bioinkType: "dECM (decellularizada)",
    cartridgeTempC: { min: 4, max: 10, ideal: 6 },
    bedTempC: { min: 32, max: 37, ideal: 37 },
    chamberTempC: { min: 32, max: 37, ideal: 37 },
    humidityPercent: { min: 85, ideal: 95 },
    rationale:
      "ECM tecido-específica. Líquida a 4°C, gelifica a 37°C. Imita matriz nativa = maior viabilidade e diferenciação celular.",
    ref: "Pati 2014, Nat Commun",
  },
  {
    bioinkType: "Pluronic F127 (sacrificial)",
    cartridgeTempC: { min: 18, max: 25, ideal: 22 },
    bedTempC: { min: 18, max: 25, ideal: 22 },
    chamberTempC: { min: 18, max: 25, ideal: 22 },
    humidityPercent: { min: 60, ideal: 75 },
    rationale:
      "Inverso da gelatina: sólido a 22°C, líquido a 4°C. Imprime sólido, depois lava com PBS gelado para criar canais vasculares.",
    ref: "Kolesky 2014, Adv Mater",
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// 3. ENCOLHIMENTO (SHRINKAGE) PÓS-CROSSLINKING
// ═══════════════════════════════════════════════════════════════════════════

export interface ShrinkageProfile {
  bioink: string
  crosslinker: string
  linearShrinkagePercent: number  // encolhimento linear %
  volumetricShrinkagePercent: number // V% = (1-(1-L/100)^3)*100
  timeToFinishHours: number
  compensationFactor: number  // multiplicar dim CAD por isto
  ref: string
}

export const SHRINKAGE_DATA: ShrinkageProfile[] = [
  { bioink: "GelMA 10%",     crosslinker: "UV 365nm 30s",       linearShrinkagePercent: 12, volumetricShrinkagePercent: 32, timeToFinishHours: 0.5, compensationFactor: 1.14, ref: "Yue 2015, Biomaterials" },
  { bioink: "Alginato 2%",   crosslinker: "CaCl₂ 100mM 5min",   linearShrinkagePercent: 5,  volumetricShrinkagePercent: 14, timeToFinishHours: 0.1, compensationFactor: 1.05, ref: "Axpe 2016" },
  { bioink: "Colágeno 4mg/mL", crosslinker: "Térmico 37°C 30min", linearShrinkagePercent: 18, volumetricShrinkagePercent: 45, timeToFinishHours: 0.5, compensationFactor: 1.22, ref: "Drzewiecki 2017" },
  { bioink: "Fibrina 10mg/mL", crosslinker: "Trombina 2U/mL",    linearShrinkagePercent: 8,  volumetricShrinkagePercent: 22, timeToFinishHours: 0.05, compensationFactor: 1.09, ref: "Janmey 2009" },
  { bioink: "PEGDA 20%",     crosslinker: "UV 405nm 60s",       linearShrinkagePercent: 6,  volumetricShrinkagePercent: 17, timeToFinishHours: 0.1, compensationFactor: 1.06, ref: "Lin 2013" },
  { bioink: "dECM 2%",       crosslinker: "Térmico 37°C 30min", linearShrinkagePercent: 15, volumetricShrinkagePercent: 39, timeToFinishHours: 0.5, compensationFactor: 1.18, ref: "Pati 2014" },
  { bioink: "Pluronic 30%",  crosslinker: "(sacrificial, removido)", linearShrinkagePercent: 0, volumetricShrinkagePercent: 0, timeToFinishHours: 0, compensationFactor: 1.0, ref: "Kolesky 2014" },
]

// ═══════════════════════════════════════════════════════════════════════════
// 4. SENSIBILIDADE CELULAR AO SHEAR STRESS
// ═══════════════════════════════════════════════════════════════════════════

export interface CellSensitivity {
  cellType: string
  shearTolerancePa: number      // Pa — acima disto, viabilidade < 80%
  shearLethalPa: number          // Pa — viabilidade < 20%
  decayConstant: number          // k em V = 100*exp(-k*τ*t)
  optimalNozzleUm: { min: number; max: number }
  ref: string
}

export const CELL_SENSITIVITY: CellSensitivity[] = [
  { cellType: "Fibroblastos (NIH-3T3)",       shearTolerancePa: 5000, shearLethalPa: 20000, decayConstant: 0.0008, optimalNozzleUm: { min: 200, max: 410 }, ref: "Blaeser 2016" },
  { cellType: "Condrócitos",                  shearTolerancePa: 3000, shearLethalPa: 12000, decayConstant: 0.0015, optimalNozzleUm: { min: 250, max: 410 }, ref: "Nair 2009" },
  { cellType: "Osteoblastos (MG-63)",         shearTolerancePa: 4000, shearLethalPa: 15000, decayConstant: 0.0012, optimalNozzleUm: { min: 200, max: 410 }, ref: "Chang 2008" },
  { cellType: "Hepatócitos",                  shearTolerancePa: 2000, shearLethalPa: 8000,  decayConstant: 0.0025, optimalNozzleUm: { min: 410, max: 600 }, ref: "Snyder 2011" },
  { cellType: "Cardiomiócitos (iPSC-CM)",     shearTolerancePa: 1500, shearLethalPa: 6000,  decayConstant: 0.0035, optimalNozzleUm: { min: 410, max: 600 }, ref: "Bertassoni 2014" },
  { cellType: "Neurônios (primários)",        shearTolerancePa: 800,  shearLethalPa: 3000,  decayConstant: 0.0080, optimalNozzleUm: { min: 600, max: 840 }, ref: "Lozano 2015" },
  { cellType: "Células-tronco (hMSC)",        shearTolerancePa: 4000, shearLethalPa: 14000, decayConstant: 0.0010, optimalNozzleUm: { min: 250, max: 410 }, ref: "Aguado 2012" },
  { cellType: "Endoteliais (HUVEC)",          shearTolerancePa: 3500, shearLethalPa: 12000, decayConstant: 0.0014, optimalNozzleUm: { min: 250, max: 410 }, ref: "Bertassoni 2014" },
  { cellType: "Queratinócitos",               shearTolerancePa: 4500, shearLethalPa: 16000, decayConstant: 0.0011, optimalNozzleUm: { min: 250, max: 410 }, ref: "Lee 2014" },
  { cellType: "Esferóides tumorais (organoides)", shearTolerancePa: 1000, shearLethalPa: 4000, decayConstant: 0.0055, optimalNozzleUm: { min: 600, max: 1000 }, ref: "Ayan 2020" },
]

// ═══════════════════════════════════════════════════════════════════════════
// 5. CÁLCULO DE VIABILIDADE EM TEMPO REAL
// ═══════════════════════════════════════════════════════════════════════════

export interface ViabilityInput {
  pressureKPa: number       // pressão pneumática
  nozzleDiameterUm: number  // diâmetro bico em µm
  viscosityPaS: number      // viscosidade aparente Pa·s
  printSpeedMmS: number     // velocidade impressão mm/s
  cellType: string          // nome do tipo celular (lookup em CELL_SENSITIVITY)
}

export interface ViabilityResult {
  shearStressPa: number      // tensão de cisalhamento na parede do bico
  shearRate1S: number        // taxa de cisalhamento 1/s
  residenceTimeS: number     // tempo de passagem pelo bico
  predictedViabilityPercent: number // V% previsto
  warning: "ok" | "warn" | "critical"
  message: string
  recommendation: string
}

/**
 * Modelo de viabilidade baseado em Blaeser 2016 e Ouyang 2016.
 *
 * Shear stress na parede (Hagen-Poiseuille):
 *   τ = (4 × Q × η) / (π × r³)  para fluido newtoniano
 *
 * Para bioink (power-law n≈0.5):
 *   τ_wall ≈ ΔP × r / (2 × L)  ← simplificado
 *
 * Aqui usamos aproximação prática:
 *   τ ≈ P × d / (2 × η_efetiva × tempo_residência)
 */
export function calculateViability(input: ViabilityInput): ViabilityResult {
  const { pressureKPa, nozzleDiameterUm, viscosityPaS, printSpeedMmS, cellType } = input

  const cell = CELL_SENSITIVITY.find((c) => c.cellType === cellType) ?? CELL_SENSITIVITY[0]

  // Conversões
  const P = pressureKPa * 1000 // Pa
  const d = nozzleDiameterUm / 1e6 // m
  const r = d / 2

  // Comprimento típico do bico cônico/cilíndrico ~ 10mm
  const L = 0.01 // m

  // Wall shear stress (Hagen-Poiseuille modificado)
  const tauWall = (P * r) / (2 * L) // Pa

  // Shear rate
  const shearRate = tauWall / viscosityPaS // 1/s

  // Tempo de residência: filamento de comprimento L viajando a v
  const v = printSpeedMmS / 1000 // m/s
  const residenceTime = L / Math.max(v, 0.001) // s

  // Modelo exponencial Blaeser 2016: V% = 100 × exp(-k × τ × t)
  const exposure = tauWall * residenceTime
  let viability = 100 * Math.exp(-cell.decayConstant * exposure)
  viability = Math.max(0, Math.min(100, viability))

  let warning: "ok" | "warn" | "critical" = "ok"
  let message = "Parâmetros seguros para a viabilidade celular."
  let recommendation = ""

  if (tauWall > cell.shearLethalPa) {
    warning = "critical"
    message = `CRÍTICO: shear stress ${(tauWall / 1000).toFixed(1)} kPa > limite letal ${(cell.shearLethalPa / 1000).toFixed(1)} kPa para ${cell.cellType}`
    recommendation =
      "Reduzir pressão ou aumentar diâmetro do bico. Use bico ≥ " +
      cell.optimalNozzleUm.min +
      " µm."
  } else if (tauWall > cell.shearTolerancePa) {
    warning = "warn"
    message = `Atenção: shear stress ${(tauWall / 1000).toFixed(1)} kPa próximo do limite (${(cell.shearTolerancePa / 1000).toFixed(1)} kPa)`
    recommendation =
      "Considerar reduzir pressão em 20% ou usar bico maior. Bico recomendado: " +
      cell.optimalNozzleUm.min +
      "–" +
      cell.optimalNozzleUm.max +
      " µm."
  }

  if (nozzleDiameterUm < cell.optimalNozzleUm.min) {
    warning = warning === "critical" ? "critical" : "warn"
    if (!recommendation) {
      recommendation =
        "Bico " +
        nozzleDiameterUm +
        " µm é muito fino para " +
        cell.cellType +
        ". Use bico ≥ " +
        cell.optimalNozzleUm.min +
        " µm."
    }
  }

  return {
    shearStressPa: tauWall,
    shearRate1S: shearRate,
    residenceTimeS: residenceTime,
    predictedViabilityPercent: viability,
    warning,
    message,
    recommendation,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PADRÕES DE PREENCHIMENTO BIO (não são zigue-zague de plástico!)
// ═══════════════════════════════════════════════════════════════════════════

export interface InfillPattern {
  id: string
  name: string
  category: "structural" | "vascular" | "porous" | "multimaterial" | "zonal"
  description: string
  targetTissue: string[]
  filamentSpacingUm: { min: number; ideal: number; max: number }
  porosityPercent: { min: number; max: number }
  gcodeStrategy: string
  postProcessing?: string
  ref: string
}

export const INFILL_PATTERNS: InfillPattern[] = [
  {
    id: "parallel-lines",
    name: "Linhas paralelas (0°/90°)",
    category: "structural",
    description: "Padrão básico cross-hatched. Camadas alternadas em 0° e 90° formam grade.",
    targetTissue: ["testes iniciais", "calibração", "constructs simples"],
    filamentSpacingUm: { min: 400, ideal: 800, max: 1500 },
    porosityPercent: { min: 30, max: 70 },
    gcodeStrategy: "G1 X linhas paralelas; G1 Y linhas paralelas na camada seguinte.",
    ref: "Ozbolat 2016",
  },
  {
    id: "sacrificial-vascular",
    name: "Vascularização sacrificial (Pluronic)",
    category: "vascular",
    description:
      "Filamentos de Pluronic F127 (30%) imprimem em paralelo dentro do bioink estrutural. Após cura, lavagem com PBS frio dissolve o Pluronic, deixando canais vasculares perfundíveis.",
    targetTissue: ["fígado", "pâncreas", "tecidos espessos >3mm"],
    filamentSpacingUm: { min: 500, ideal: 1000, max: 2000 },
    porosityPercent: { min: 5, max: 15 },
    gcodeStrategy:
      "Dual-extrusor: T0 imprime bioink estrutural em padrão grade; T1 imprime Pluronic em paralelo como 'venulas'.",
    postProcessing:
      "Após print: aguardar cura do bioink estrutural. Banhar em PBS a 4°C por 15 min — Pluronic se liquefaz e sai pelos canais. Perfundir com meio de cultura.",
    ref: "Kolesky et al. 2014, Adv Mater",
  },
  {
    id: "hex-macropores",
    name: "Macroporos hexagonais (osso/cartilagem)",
    category: "porous",
    description:
      "Padrão hexagonal com poros 500-800 µm para permitir infiltração celular vascular óssea. Geometria favorece formação de novo tecido.",
    targetTissue: ["osso", "cartilagem", "scaffolds de regeneração"],
    filamentSpacingUm: { min: 500, ideal: 700, max: 900 },
    porosityPercent: { min: 50, max: 80 },
    gcodeStrategy:
      "Padrão hex: para cada camada, deslocar X em sqrt(3)/2 × spacing e Y em spacing/2 em camadas alternadas.",
    ref: "Bose et al. 2013, Mater Today",
  },
  {
    id: "gradient-micropores",
    name: "Microporos gradiente (pele/cornea)",
    category: "porous",
    description:
      "Porosidade variando de 100 µm (superfície) a 300 µm (base). Imita estrutura nativa pele e córnea.",
    targetTissue: ["pele", "córnea", "membranas finas"],
    filamentSpacingUm: { min: 100, ideal: 200, max: 300 },
    porosityPercent: { min: 20, max: 50 },
    gcodeStrategy:
      "Calcular spacing = spacing_base + (z / z_max) × (spacing_top - spacing_base). Aplicar a cada camada.",
    ref: "Ng et al. 2018, Biofabrication",
  },
  {
    id: "zonal-multimaterial",
    name: "Multi-material zonal (cartilagem)",
    category: "zonal",
    description:
      "Cada região do construct usa bioink diferente. Ex: cartilagem zonal — superficial fibrocartilaginosa, média hialina, profunda calcificada.",
    targetTissue: ["cartilagem", "interface osso-cartilagem", "pele 3 camadas"],
    filamentSpacingUm: { min: 300, ideal: 500, max: 800 },
    porosityPercent: { min: 30, max: 60 },
    gcodeStrategy:
      "Tool change (T0/T1/T2) por faixa de Z. Pausa entre trocas para limpar bico com purge tower.",
    ref: "Mouser et al. 2017, Biofabrication",
  },
  {
    id: "embedded-spheroids",
    name: "Esferóides embarcados (organoides)",
    category: "multimaterial",
    description:
      "Posiciona esferóides pré-formados em coordenadas específicas dentro de matriz suporte. Não-extrusão = picking robótico ou suspensão.",
    targetTissue: ["mini-órgãos", "modelos tumorais", "estudos farmacêuticos"],
    filamentSpacingUm: { min: 800, ideal: 1500, max: 3000 },
    porosityPercent: { min: 60, max: 80 },
    gcodeStrategy:
      "G-code aspirativo: G1 desce, M601 aspira esferóide, G0 move XY, M602 dispensa, sobe. Ou: M608 pause-pick-resume.",
    ref: "Ayan et al. 2020, Sci Adv",
  },
  {
    id: "freeform-suspension",
    name: "FRESH (suspensão Carbopol/gelatina)",
    category: "structural",
    description:
      "Bioink macio imprime DENTRO de banho suporte (gel granular). Permite geometrias impossíveis em ar (ex: válvula cardíaca).",
    targetTissue: ["válvula cardíaca", "vasos complexos", "tecidos macios"],
    filamentSpacingUm: { min: 200, ideal: 400, max: 800 },
    porosityPercent: { min: 0, max: 30 },
    gcodeStrategy: "G-code 3D verdadeiro (sem necessidade de suporte). Z livre.",
    postProcessing:
      "Após print: aquecer banho de gelatina a 37°C — funde e libera o construct. Lavar PBS.",
    ref: "Hinton et al. 2015, Sci Adv (FRESH)",
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// 7. PROTOCOLOS DE CROSSLINKING / CURA
// ═══════════════════════════════════════════════════════════════════════════

export interface CrosslinkProtocol {
  bioink: string
  method: "uv" | "ionic" | "thermal" | "enzymatic" | "chemical"
  agent: string
  intensityOrConc: string
  durationPerLayerS?: number
  durationFinalMin: number
  cellSafe: boolean
  rationale: string
  warnings: string[]
  ref: string
}

export const CROSSLINK_PROTOCOLS: CrosslinkProtocol[] = [
  {
    bioink: "GelMA",
    method: "uv",
    agent: "LAP photoinitiator + UV 365nm",
    intensityOrConc: "10 mW/cm² × 30s",
    durationPerLayerS: 5,
    durationFinalMin: 5,
    cellSafe: true,
    rationale:
      "LAP é mais cell-friendly que Irgacure-2959. UV 365nm penetra ~1mm. Cura entre camadas para constructs altos.",
    warnings: [
      "UV >50 mW/cm² gera radicais livres = morte celular",
      "Tempo total UV cumulativo deve ser <10 min",
    ],
    ref: "Yue 2015, Biomaterials",
  },
  {
    bioink: "Alginato",
    method: "ionic",
    agent: "CaCl₂",
    intensityOrConc: "100 mM em água deionizada",
    durationPerLayerS: 2,
    durationFinalMin: 10,
    cellSafe: true,
    rationale:
      "Ca²⁺ liga blocos guluronato do alginato formando estrutura 'egg-box'. Pode ser por spray entre camadas ou banho final.",
    warnings: [
      "[Ca²⁺] >200mM causa estresse osmótico nas células",
      "Reversível com EDTA — útil para liberar células no fim",
    ],
    ref: "Axpe 2016",
  },
  {
    bioink: "Colágeno",
    method: "thermal",
    agent: "Auto-assembly a 37°C",
    intensityOrConc: "Temperatura 37°C",
    durationFinalMin: 30,
    cellSafe: true,
    rationale:
      "Fibrilas de colágeno auto-organizam quando aquecidas. pH neutro (7.4) facilita. Pré-incubar cama a 37°C antes do print.",
    warnings: ["pH ácido (gel comercial) pode estressar células — neutralizar antes"],
    ref: "Drzewiecki 2017",
  },
  {
    bioink: "Fibrina",
    method: "enzymatic",
    agent: "Trombina",
    intensityOrConc: "2 U/mL de trombina mistura com fibrinogênio 10 mg/mL",
    durationFinalMin: 5,
    cellSafe: true,
    rationale:
      "Trombina cliva fibrinogênio em fibrina, que polimeriza espontaneamente. Mistura no bico (dual-channel) ou pré-misturar imediatamente.",
    warnings: ["Cura muito rápida — pode entupir o bico se misturado cedo"],
    ref: "Janmey 2009",
  },
  {
    bioink: "PEGDA",
    method: "uv",
    agent: "Irgacure-2959 + UV 365nm",
    intensityOrConc: "5 mW/cm² × 60s",
    durationPerLayerS: 8,
    durationFinalMin: 10,
    cellSafe: false,
    rationale:
      "PEGDA puro é não-bioativo. Pode ser modificado com RGD para adesão celular. UV é necessário mas Irgacure-2959 é tóxico em >0.5%.",
    warnings: [
      "Irgacure-2959 >0.5% mata 50% das células em 1h",
      "Preferir LAP se células presentes",
    ],
    ref: "Lin 2013",
  },
  {
    bioink: "Quitosana",
    method: "chemical",
    agent: "Glutaraldeído OU genipina",
    intensityOrConc: "Genipina 1 mg/mL × 24h (cell-friendly)",
    durationFinalMin: 1440, // 24h
    cellSafe: true,
    rationale:
      "Genipina é alternativa natural ao glutaraldeído (tóxico). Cor azul indica grau de crosslinking visualmente.",
    warnings: ["Glutaraldeído é citotóxico — usar apenas em scaffolds acelulares"],
    ref: "Muzzarelli 2009",
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// 8. PÓS-PROCESSAMENTO BIOLÓGICO (cultura + maturação)
// ═══════════════════════════════════════════════════════════════════════════

export interface PostProcessingProtocol {
  tissueType: string
  // Etapa 1: cultura imediata
  cultureMedium: string
  cultureCO2Percent: number
  cultureTempC: number
  mediumChangeSchedule: string // "dia 1, 3, 5, 7"
  // Etapa 2: maturação dinâmica (biorreator)
  bioreactorStimulus?: {
    type: "electrical" | "mechanical-compression" | "perfusion-flow" | "stretch" | "torsion" | "static"
    parameters: string
    durationDays: number
  }
  // Etapa 3: validação
  validationAssays: string[]
  expectedTimeline: string
  ref: string
}

export const POST_PROCESSING: PostProcessingProtocol[] = [
  {
    tissueType: "Cardíaco (patch)",
    cultureMedium: "RPMI + B27 + 10% FBS + 1% P/S",
    cultureCO2Percent: 5,
    cultureTempC: 37,
    mediumChangeSchedule: "diária nos primeiros 3 dias, depois 2x/semana",
    bioreactorStimulus: {
      type: "electrical",
      parameters: "1 Hz pulse, 5 V/cm, 2ms width",
      durationDays: 7,
    },
    validationAssays: [
      "Imunofluorescência: α-actinina sarcomérica, cTnT",
      "Contração espontânea (vídeo + análise ImageJ MUSCLEMOTION)",
      "Western: conexina-43 (gap junctions)",
      "MEA: potenciais de ação",
    ],
    expectedTimeline: "Contração espontânea: dia 5-7. Maturação: dia 14-21.",
    ref: "Bertassoni 2014; Ronaldson-Bouchard 2018",
  },
  {
    tissueType: "Ósseo",
    cultureMedium: "α-MEM + 10% FBS + 50 µM ácido ascórbico + 10 mM β-glicerofosfato + 10 nM dexametasona",
    cultureCO2Percent: 5,
    cultureTempC: 37,
    mediumChangeSchedule: "2x/semana",
    bioreactorStimulus: {
      type: "mechanical-compression",
      parameters: "0.5 MPa cíclico, 1 Hz, 1h/dia",
      durationDays: 14,
    },
    validationAssays: [
      "Atividade ALP (fosfatase alcalina)",
      "Coloração von Kossa / Alizarin Red (mineralização)",
      "µCT para densidade óssea",
      "qPCR: RUNX2, OCN, OPN, COL1A1",
    ],
    expectedTimeline: "Diferenciação: dia 7. Mineralização visível: dia 14-21.",
    ref: "Bose 2013; Grayson 2010",
  },
  {
    tissueType: "Cartilagem",
    cultureMedium: "DMEM-HG + ITS+ + 10 ng/mL TGF-β3 + 100 nM dexametasona + 50 µM ascorbato",
    cultureCO2Percent: 5,
    cultureTempC: 37,
    mediumChangeSchedule: "2x/semana",
    bioreactorStimulus: {
      type: "mechanical-compression",
      parameters: "10% strain, 1 Hz, 1h/dia",
      durationDays: 21,
    },
    validationAssays: [
      "Coloração Alcian Blue / Safranina O (GAGs)",
      "Coloração Picrosirius Red (colágeno)",
      "qPCR: COL2A1, ACAN, SOX9",
      "Análise mecânica: módulo equilíbrio compressivo",
    ],
    expectedTimeline: "Deposição GAG: dia 7-14. Tecido cartilaginoso maduro: dia 28-42.",
    ref: "Mouser 2017",
  },
  {
    tissueType: "Vaso sanguíneo",
    cultureMedium: "EGM-2 (CC-3162 Lonza) ou DMEM + 10% FBS + ECGS + heparina",
    cultureCO2Percent: 5,
    cultureTempC: 37,
    mediumChangeSchedule: "diária",
    bioreactorStimulus: {
      type: "perfusion-flow",
      parameters: "Fluxo pulsátil 60 bpm, shear 10 dyn/cm², pressão 80/120 mmHg",
      durationDays: 21,
    },
    validationAssays: [
      "Imunofluorescência: CD31, VE-caderina, vWF, αSMA",
      "Permeabilidade: FITC-dextran",
      "Resposta vasomotora: histamina, acetilcolina",
      "Burst pressure test",
    ],
    expectedTimeline: "Endotelização: dia 7. Vaso funcional: dia 21-28.",
    ref: "Kolesky 2014; L'Heureux 2006",
  },
  {
    tissueType: "Pele",
    cultureMedium:
      "Fase submersa: DMEM + 10% FBS + 1% P/S; Fase ar-líquido: KGM + CaCl₂ 1.8 mM",
    cultureCO2Percent: 5,
    cultureTempC: 37,
    mediumChangeSchedule: "2x/semana",
    bioreactorStimulus: {
      type: "static",
      parameters: "Cultura ar-líquido em insert Transwell — exposição direta ao ar a partir do dia 7",
      durationDays: 21,
    },
    validationAssays: [
      "H&E: arquitetura epi/derme",
      "IF: keratina-14 (basal), keratina-10 (suprabasal), involucrina (granuloso), filagrina (córneo)",
      "Função barreira: TEWL (transepidermal water loss)",
      "Permeação de moléculas-teste",
    ],
    expectedTimeline: "Cornificação: dia 14-21 sob ar-líquido.",
    ref: "Ng 2018",
  },
  {
    tissueType: "Nervo periférico",
    cultureMedium:
      "Neurobasal + B27 + L-glutamina + 50 ng/mL NGF + 1 µM forskolina",
    cultureCO2Percent: 5,
    cultureTempC: 37,
    mediumChangeSchedule: "metade troca 2x/semana",
    bioreactorStimulus: {
      type: "stretch",
      parameters: "Estiramento longitudinal 5%, 0.1 Hz, 2h/dia",
      durationDays: 14,
    },
    validationAssays: [
      "IF: βIII-tubulina (axônios), S100β (células de Schwann)",
      "Comprimento axonal (ImageJ NeuronJ)",
      "Mielinização: MBP",
    ],
    expectedTimeline: "Extensão axonal: dia 3-7. Mielinização: dia 14-21.",
    ref: "Petcu 2018",
  },
  {
    tissueType: "Hepático (mini-fígado)",
    cultureMedium:
      "Williams' E + 10% FBS + 100 nM dexametasona + 1× ITS + 10 ng/mL HGF + 20 ng/mL EGF",
    cultureCO2Percent: 5,
    cultureTempC: 37,
    mediumChangeSchedule: "diária",
    bioreactorStimulus: {
      type: "perfusion-flow",
      parameters: "Perfusão contínua 0.5 mL/min através de canal vascular impresso",
      durationDays: 14,
    },
    validationAssays: [
      "ALB, urea no sobrenadante",
      "CYP3A4 atividade (luciferase ou LC-MS)",
      "IF: HNF4α, ALB, CK18",
    ],
    expectedTimeline: "Função hepatocitária: dia 7-14.",
    ref: "Bhise 2016",
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// 9. CONEXÃO COM IMPRESSORA — GUIA DE PORTAS SERIAIS
// ═══════════════════════════════════════════════════════════════════════════

export interface PrinterConnectionProfile {
  brand: string
  model: string
  protocol: "serial-USB" | "WiFi-HTTP" | "ethernet-OctoPrint" | "G-code-file-only"
  baudRate?: number
  firmware: string
  gcodeFlavor: "marlin" | "klipper" | "reprap" | "custom"
  supportsRealtime: boolean
  notes: string
}

export const PRINTER_PROFILES: PrinterConnectionProfile[] = [
  { brand: "Cellink",    model: "BIO X / BIO X6", protocol: "WiFi-HTTP",        firmware: "DNA Studio",     gcodeFlavor: "custom",  supportsRealtime: false, notes: "Software proprietário. Importa .gcode via USB stick." },
  { brand: "Allevi",     model: "Allevi 2/3",     protocol: "serial-USB", baudRate: 115200, firmware: "Marlin custom", gcodeFlavor: "marlin", supportsRealtime: true, notes: "Aceita Marlin G-code. Conecta via Web Serial API ou USB direto." },
  { brand: "RegenHU",    model: "3DDiscovery",    protocol: "ethernet-OctoPrint", firmware: "HMI-Pro",   gcodeFlavor: "custom",  supportsRealtime: true,  notes: "Conexão via OctoPrint plugin. Suporta múltiplas cabeças." },
  { brand: "EnvisionTEC",model: "3D-Bioplotter",  protocol: "serial-USB", baudRate: 250000, firmware: "Visual Machines", gcodeFlavor: "custom", supportsRealtime: false, notes: "Usa software próprio com export para .bpl. Não G-code padrão." },
  { brand: "ROKIT",      model: "INVIVO",         protocol: "WiFi-HTTP",        firmware: "Marlin-fork",   gcodeFlavor: "marlin",  supportsRealtime: true,  notes: "Painel web interno. API REST para enviar G-code." },
  { brand: "BIA-DIY",    model: "Genérica Marlin", protocol: "serial-USB", baudRate: 115200, firmware: "Marlin 2.x", gcodeFlavor: "marlin", supportsRealtime: true, notes: "Qualquer impressora 3D Marlin pode rodar bioink com extrusora pneumática DIY." },
]
