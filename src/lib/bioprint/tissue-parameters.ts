/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Tissue Parameter Engine (R10)
 *  ─────────────────────────────────────────────────────────────────────
 *  Algoritmos cientificamente embasados para sugerir parâmetros de
 *  bioimpressão por TIPO DE TECIDO BIOLÓGICO. Cada perfil mapeia:
 *    · Família mecânica (rígido / esponjoso / conjuntivo / elástico / parenquimatoso)
 *    · Tamanho de poro recomendado (µm) — baseado em literatura
 *    · Padrão de preenchimento biomimetico
 *    · % de densidade (infill)
 *    · Anisotropia (alinhamento de fibras)
 *    · Bioink recomendado + concentração
 *    · Densidade celular (10^6 cells/mL)
 *    · Módulo elástico alvo (kPa ou MPa)
 *
 *  Referências científicas:
 *    · Karageorgiou & Kaplan (2005) — Biomaterials 26: porosity & osteogenesis
 *    · Frontiers (2024) — Optimizing scaffold pore size for tissue engineering
 *    · PMC12470888 (2024) — Porous scaffolds review (poros gradiente)
 *    · MDPI Sustainable Bioprinting 2025 — pore geometry
 *    · Blaeser et al. (2016) — Shear stress & cell viability
 *    · Murphy & Atala (2014) — Bioprinting tissues (Nature Biotechnology)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── Tipos ──────────────────────────────────────────────────────────────

/** Família mecânica do tecido — determina lógica de preenchimento */
export type TissueFamily =
  | "rigid"               // Osso cortical, dente, hidroxiapatita
  | "spongy-rigid"        // Osso trabecular, esponjoso mineralizado
  | "cartilage"           // Cartilagem hialina/elástica
  | "connective-dense"    // Tendão, ligamento (alinhamento fibroso)
  | "connective-loose"    // Derme, hipoderme (estrutural frouxo)
  | "elastic-vascular"    // Vaso sanguíneo, válvula (elastina + colágeno)
  | "elastic-muscle"      // Cardíaco, esquelético (contrátil)
  | "parenchymal"         // Fígado, rim, pâncreas (lóbulos esponjosos)
  | "epithelial"          // Pele superficial, mucosa (camadas finas)
  | "neural"              // Cérebro, nervo periférico (muito mole)

/** Padrão biomimetico de preenchimento — algoritmo de toolpath */
export type BiomimeticPattern =
  | "hexagonal-dense"     // Favo de mel denso — osso cortical
  | "gyroid-tpms"         // Gyroid TPMS — osso esponjoso / cartilagem
  | "voronoi-3d"          // Voronoi orgânico — fígado, parenquima
  | "voronoi-anisotropic" // Voronoi alongado — tendão direcionado
  | "parallel-aligned"    // Linhas paralelas — músculo, fibra alinhada
  | "concentric-spiral"   // Espiral concêntrica — vaso (camadas anulares)
  | "grid-orthogonal"     // Grade 0/90 — derme básica
  | "schwarz-p-tpms"      // Schwarz Primitive TPMS — osso load-bearing
  | "diamond-tpms"        // Diamond TPMS — cartilagem articular
  | "alveolar"            // Câmaras alveolares — pulmão, hepático
  | "honeycomb-cardiac"   // Hexagonal anisotrópico cardíaco
  | "fascicular"          // Feixes paralelos — nervo periférico

/** Perfil de bioimpressão completo para um tecido */
export interface TissueProfile {
  id: string
  label: string
  family: TissueFamily
  description: string
  emoji: string

  // ── PORO & MICROESTRUTURA ──
  poreSize: {
    min: number      // µm
    max: number      // µm
    optimal: number  // µm
  }
  porosity: {        // % de vazio (volume void / volume total)
    min: number
    max: number
    optimal: number
  }

  // ── PREENCHIMENTO ──
  recommendedPatterns: BiomimeticPattern[]
  defaultPattern: BiomimeticPattern
  infillDensity: {   // %
    min: number
    max: number
    optimal: number
  }
  anisotropy: {
    enabled: boolean
    angleDeg?: number      // 0 = X-axis, 90 = Y-axis
    ratio?: number         // 1 = isotrópico, >1 = alongado
  }

  // ── MECÂNICA ALVO ──
  elasticModulus: {
    min: number    // valor
    max: number    // valor
    unit: "kPa" | "MPa" | "GPa"
  }
  compressiveStrength?: {
    min: number
    max: number
    unit: "kPa" | "MPa"
  }

  // ── BIOINK ──
  recommendedBioinks: string[]     // labels (gelMA, alginate, etc)
  bioinkConcentration: {           // %w/v
    min: number
    max: number
    optimal: number
  }
  crosslinkStrategy: string         // "UV 365nm + LAP 0.1%", "CaCl2 100mM", etc

  // ── CÉLULAS ──
  recommendedCellTypes: string[]
  cellDensity: {                    // 10^6 cells/mL
    min: number
    max: number
    optimal: number
  }

  // ── IMPRESSÃO ──
  nozzleDiameter: {                 // µm
    min: number
    max: number
    optimal: number
  }
  printSpeed: {                     // mm/s
    min: number
    max: number
    optimal: number
  }
  pressure: {                       // kPa (pneumático)
    min: number
    max: number
    optimal: number
  }
  layerHeight: {                    // mm
    min: number
    max: number
    optimal: number
  }
  temperature: {
    cartridgeC: number              // °C
    bedC: number                    // °C
    chamberC: number                // °C
  }

  // ── PÓS-IMPRESSÃO ──
  postProcessing: {
    crosslinkTimeS?: number          // segundos
    crosslinkPowerMwCm2?: number     // mW/cm²
    cultureMedium?: string
    cultureDaysToMaturation?: number
    bioreactorRequired?: boolean
  }

  // ── REFERÊNCIA CIENTÍFICA ──
  references: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
//  BIBLIOTECA DE PERFIS DE TECIDO
// ═══════════════════════════════════════════════════════════════════════════

export const TISSUE_PROFILES: Record<string, TissueProfile> = {
  // ─────────────── OSSO ───────────────
  "bone-cortical": {
    id: "bone-cortical",
    label: "Osso Cortical (denso)",
    family: "rigid",
    description: "Osso compacto da diáfise — alta carga mecânica, baixa porosidade",
    emoji: "🦴",
    poreSize:    { min: 100, max: 300, optimal: 200 },
    porosity:    { min: 5, max: 30, optimal: 15 },
    recommendedPatterns: ["hexagonal-dense", "schwarz-p-tpms"],
    defaultPattern: "hexagonal-dense",
    infillDensity: { min: 60, max: 90, optimal: 75 },
    anisotropy:    { enabled: true, angleDeg: 0, ratio: 1.5 }, // Osteons alinhados ao eixo longo
    elasticModulus:      { min: 10, max: 20, unit: "GPa" },
    compressiveStrength: { min: 100, max: 200, unit: "MPa" },
    recommendedBioinks: ["PCL", "PLA", "PCL + nHA (nanohidroxiapatita)", "GelMA + nHA"],
    bioinkConcentration: { min: 10, max: 30, optimal: 20 },
    crosslinkStrategy: "Termopolimerização (PCL 60°C) ou UV 365nm 30s",
    recommendedCellTypes: ["Osteoblastos (HOB)", "hMSC + BMP-2"],
    cellDensity: { min: 1, max: 5, optimal: 2 },
    nozzleDiameter: { min: 250, max: 600, optimal: 400 },
    printSpeed:     { min: 3, max: 10, optimal: 5 },
    pressure:       { min: 100, max: 400, optimal: 200 },
    layerHeight:    { min: 0.2, max: 0.4, optimal: 0.3 },
    temperature:    { cartridgeC: 60, bedC: 22, chamberC: 24 },
    postProcessing: { cultureMedium: "α-MEM + 10% FBS + osteogênico", cultureDaysToMaturation: 21, bioreactorRequired: true },
    references: ["Karageorgiou 2005", "Frontiers Bioeng 2024", "PMC9035802"],
  },

  "bone-trabecular": {
    id: "bone-trabecular",
    label: "Osso Trabecular (esponjoso)",
    family: "spongy-rigid",
    description: "Osso esponjoso (epífise) — porosidade alta, trabéculas conectadas, vascularização",
    emoji: "🦴",
    poreSize:    { min: 300, max: 600, optimal: 450 },
    porosity:    { min: 50, max: 80, optimal: 65 },
    recommendedPatterns: ["gyroid-tpms", "voronoi-3d", "schwarz-p-tpms"],
    defaultPattern: "gyroid-tpms",
    infillDensity: { min: 20, max: 50, optimal: 35 },
    anisotropy:    { enabled: false },
    elasticModulus:      { min: 0.1, max: 2, unit: "GPa" },
    compressiveStrength: { min: 2, max: 12, unit: "MPa" },
    recommendedBioinks: ["GelMA + nHA", "Colágeno + HA", "Alginato + β-TCP"],
    bioinkConcentration: { min: 8, max: 15, optimal: 10 },
    crosslinkStrategy: "UV 365nm 60s + CaCl2 100mM 5min",
    recommendedCellTypes: ["hMSC", "Osteoblastos", "Pré-osteoblastos MC3T3"],
    cellDensity: { min: 2, max: 10, optimal: 5 },
    nozzleDiameter: { min: 300, max: 600, optimal: 410 },
    printSpeed:     { min: 5, max: 12, optimal: 8 },
    pressure:       { min: 30, max: 100, optimal: 60 },
    layerHeight:    { min: 0.2, max: 0.4, optimal: 0.3 },
    temperature:    { cartridgeC: 30, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 60, crosslinkPowerMwCm2: 15, cultureMedium: "DMEM + osteogênico", cultureDaysToMaturation: 28, bioreactorRequired: true },
    references: ["Frontiers Bioeng 2024", "Karageorgiou 2005", "MDPI 2025"],
  },

  // ─────────────── CARTILAGEM ───────────────
  "cartilage-hyaline": {
    id: "cartilage-hyaline",
    label: "Cartilagem Hialina (articular)",
    family: "cartilage",
    description: "Cartilagem articular — superfície lisa, condrócitos em lacunas, matriz colágena tipo II",
    emoji: "🦵",
    poreSize:    { min: 200, max: 500, optimal: 350 },
    porosity:    { min: 30, max: 60, optimal: 45 },
    recommendedPatterns: ["gyroid-tpms", "diamond-tpms", "hexagonal-dense"],
    defaultPattern: "gyroid-tpms",
    infillDensity: { min: 30, max: 60, optimal: 45 },
    anisotropy:    { enabled: false },
    elasticModulus:      { min: 1, max: 10, unit: "MPa" },
    compressiveStrength: { min: 1, max: 5, unit: "MPa" },
    recommendedBioinks: ["GelMA + HAMA (ácido hialurônico)", "Alginato + Condroitin", "dECM cartilaginosa"],
    bioinkConcentration: { min: 8, max: 15, optimal: 10 },
    crosslinkStrategy: "UV 365nm 45s + LAP 0.1%",
    recommendedCellTypes: ["Condrócitos", "hMSC + TGF-β3"],
    cellDensity: { min: 5, max: 20, optimal: 10 },
    nozzleDiameter: { min: 250, max: 500, optimal: 410 },
    printSpeed:     { min: 5, max: 12, optimal: 8 },
    pressure:       { min: 20, max: 80, optimal: 40 },
    layerHeight:    { min: 0.2, max: 0.3, optimal: 0.25 },
    temperature:    { cartridgeC: 22, bedC: 6, chamberC: 20 },
    postProcessing: { crosslinkTimeS: 45, crosslinkPowerMwCm2: 12, cultureMedium: "DMEM + ITS + TGF-β3", cultureDaysToMaturation: 21, bioreactorRequired: true },
    references: ["AccScience IJB 2024", "MDPI 2020 cartilage SA-GEL"],
  },

  // ─────────────── CONJUNTIVO DENSO ───────────────
  "tendon-ligament": {
    id: "tendon-ligament",
    label: "Tendão / Ligamento",
    family: "connective-dense",
    description: "Tecido conjuntivo denso modelado — fibras de colágeno tipo I alinhadas paralelamente",
    emoji: "💪",
    poreSize:    { min: 50, max: 200, optimal: 100 },
    porosity:    { min: 20, max: 40, optimal: 30 },
    recommendedPatterns: ["parallel-aligned", "voronoi-anisotropic", "fascicular"],
    defaultPattern: "parallel-aligned",
    infillDensity: { min: 50, max: 80, optimal: 65 },
    anisotropy:    { enabled: true, angleDeg: 0, ratio: 3.0 }, // Fortemente alinhado
    elasticModulus:      { min: 0.5, max: 1.5, unit: "GPa" },
    compressiveStrength: { min: 50, max: 100, unit: "MPa" },
    recommendedBioinks: ["Colágeno tipo I", "GelMA + Colágeno", "PCL + GelMA"],
    bioinkConcentration: { min: 5, max: 12, optimal: 8 },
    crosslinkStrategy: "UV 365nm 60s + tratamento térmico (ribose 37°C)",
    recommendedCellTypes: ["Tenócitos", "hMSC + estímulo mecânico"],
    cellDensity: { min: 1, max: 5, optimal: 2 },
    nozzleDiameter: { min: 200, max: 410, optimal: 300 },
    printSpeed:     { min: 8, max: 20, optimal: 12 },
    pressure:       { min: 30, max: 80, optimal: 50 },
    layerHeight:    { min: 0.1, max: 0.25, optimal: 0.2 },
    temperature:    { cartridgeC: 22, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 60, crosslinkPowerMwCm2: 12, cultureMedium: "DMEM + 10% FBS", cultureDaysToMaturation: 28, bioreactorRequired: true },
    references: ["Tissue Eng Part B 2013", "Springer Bioprinting 2024"],
  },

  // ─────────────── CONJUNTIVO FROUXO / PELE ───────────────
  "skin-dermis": {
    id: "skin-dermis",
    label: "Pele (derme)",
    family: "connective-loose",
    description: "Derme — tecido conjuntivo frouxo com fibroblastos, vasos capilares e matriz hidratada",
    emoji: "🩹",
    poreSize:    { min: 50, max: 150, optimal: 100 },
    porosity:    { min: 60, max: 85, optimal: 75 },
    recommendedPatterns: ["grid-orthogonal", "gyroid-tpms", "voronoi-3d"],
    defaultPattern: "grid-orthogonal",
    infillDensity: { min: 15, max: 40, optimal: 25 },
    anisotropy:    { enabled: false },
    elasticModulus:      { min: 50, max: 500, unit: "kPa" },
    recommendedBioinks: ["GelMA", "Colágeno tipo I", "Fibrina", "dECM dérmica"],
    bioinkConcentration: { min: 5, max: 10, optimal: 7 },
    crosslinkStrategy: "UV 365nm 30s + LAP 0.1%",
    recommendedCellTypes: ["Fibroblastos (NIH-3T3, NHDF)", "Queratinócitos (na superfície)"],
    cellDensity: { min: 2, max: 10, optimal: 5 },
    nozzleDiameter: { min: 250, max: 500, optimal: 410 },
    printSpeed:     { min: 5, max: 15, optimal: 10 },
    pressure:       { min: 15, max: 50, optimal: 25 },
    layerHeight:    { min: 0.15, max: 0.3, optimal: 0.2 },
    temperature:    { cartridgeC: 25, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 30, crosslinkPowerMwCm2: 10, cultureMedium: "DMEM + 10% FBS", cultureDaysToMaturation: 14 },
    references: ["Murphy Atala Nat Biotech 2014", "Frontiers 2024"],
  },

  // ─────────────── ELÁSTICO VASCULAR ───────────────
  "vascular-vessel": {
    id: "vascular-vessel",
    label: "Vaso Sanguíneo",
    family: "elastic-vascular",
    description: "Vaso tubular — íntima (endotélio) + média (músculo liso) + adventícia, alta elasticidade",
    emoji: "🩸",
    poreSize:    { min: 50, max: 200, optimal: 100 },
    porosity:    { min: 30, max: 60, optimal: 45 },
    recommendedPatterns: ["concentric-spiral", "parallel-aligned"],
    defaultPattern: "concentric-spiral",
    infillDensity: { min: 30, max: 60, optimal: 45 },
    anisotropy:    { enabled: true, angleDeg: 90, ratio: 2.0 }, // Circular (camadas anulares)
    elasticModulus:      { min: 100, max: 1500, unit: "kPa" },
    recommendedBioinks: ["GelMA + Fibrinogênio", "Alginato + Colágeno", "dECM vascular"],
    bioinkConcentration: { min: 5, max: 10, optimal: 7 },
    crosslinkStrategy: "UV 365nm 45s + Trombina (Fibrinogênio→Fibrina)",
    recommendedCellTypes: ["HUVEC (endotelial)", "SMC (músculo liso)", "iPSC-derived"],
    cellDensity: { min: 5, max: 20, optimal: 10 },
    nozzleDiameter: { min: 250, max: 410, optimal: 300 },
    printSpeed:     { min: 5, max: 15, optimal: 10 },
    pressure:       { min: 20, max: 60, optimal: 35 },
    layerHeight:    { min: 0.15, max: 0.25, optimal: 0.2 },
    temperature:    { cartridgeC: 22, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 45, crosslinkPowerMwCm2: 12, cultureMedium: "EGM-2 + VEGF", cultureDaysToMaturation: 14, bioreactorRequired: true },
    references: ["Springer Vascular 2024", "Science Adv 2025 CHIPS"],
  },

  // ─────────────── ELÁSTICO MUSCULAR ───────────────
  "cardiac-muscle": {
    id: "cardiac-muscle",
    label: "Músculo Cardíaco (patch)",
    family: "elastic-muscle",
    description: "Patch cardíaco — cardiomiócitos alinhados, contrátil, anisotropia funcional",
    emoji: "❤️",
    poreSize:    { min: 50, max: 200, optimal: 100 },
    porosity:    { min: 40, max: 70, optimal: 55 },
    recommendedPatterns: ["honeycomb-cardiac", "parallel-aligned", "voronoi-anisotropic"],
    defaultPattern: "honeycomb-cardiac",
    infillDensity: { min: 30, max: 60, optimal: 45 },
    anisotropy:    { enabled: true, angleDeg: 0, ratio: 2.5 },
    elasticModulus:      { min: 10, max: 100, unit: "kPa" },
    recommendedBioinks: ["GelMA + Fibrinogênio", "dECM cardíaca", "Colágeno + HA"],
    bioinkConcentration: { min: 5, max: 10, optimal: 7 },
    crosslinkStrategy: "UV 365nm 30s + estimulação elétrica pós (1Hz, 4V/cm)",
    recommendedCellTypes: ["Cardiomiócitos (iPSC-CM)", "Fibroblastos cardíacos", "HUVEC"],
    cellDensity: { min: 5, max: 30, optimal: 15 },
    nozzleDiameter: { min: 250, max: 410, optimal: 300 },
    printSpeed:     { min: 5, max: 12, optimal: 8 },
    pressure:       { min: 20, max: 60, optimal: 35 },
    layerHeight:    { min: 0.15, max: 0.25, optimal: 0.2 },
    temperature:    { cartridgeC: 22, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 30, crosslinkPowerMwCm2: 12, cultureMedium: "RPMI + B27", cultureDaysToMaturation: 14, bioreactorRequired: true },
    references: ["IOP Adv Bioprinting 2024", "Penn State Spheroids 2024"],
  },

  // ─────────────── PARENQUIMATOSO ───────────────
  "liver-parenchyma": {
    id: "liver-parenchyma",
    label: "Hepático (parênquima)",
    family: "parenchymal",
    description: "Tecido hepático — lóbulos hexagonais, hepatócitos em cordões, vascularização sinusoidal",
    emoji: "🫀",
    poreSize:    { min: 100, max: 400, optimal: 250 },
    porosity:    { min: 40, max: 70, optimal: 55 },
    recommendedPatterns: ["voronoi-3d", "alveolar", "honeycomb-cardiac"],
    defaultPattern: "voronoi-3d",
    infillDensity: { min: 20, max: 50, optimal: 35 },
    anisotropy:    { enabled: false },
    elasticModulus: { min: 1, max: 10, unit: "kPa" },
    recommendedBioinks: ["GelMA + Colágeno", "dECM hepática", "Alginato + colágeno"],
    bioinkConcentration: { min: 5, max: 10, optimal: 7 },
    crosslinkStrategy: "UV 365nm 30s + perfusão pós",
    recommendedCellTypes: ["Hepatócitos primários", "HepG2", "iPSC-derived hepatocyte-like", "HUVEC para sinusóides"],
    cellDensity: { min: 5, max: 20, optimal: 10 },
    nozzleDiameter: { min: 250, max: 500, optimal: 410 },
    printSpeed:     { min: 5, max: 12, optimal: 8 },
    pressure:       { min: 20, max: 60, optimal: 35 },
    layerHeight:    { min: 0.2, max: 0.3, optimal: 0.25 },
    temperature:    { cartridgeC: 22, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 30, crosslinkPowerMwCm2: 12, cultureMedium: "Williams E + ITS + dexametasona", cultureDaysToMaturation: 14, bioreactorRequired: true },
    references: ["IOP Adv Bioprinting 2024", "MDPI 2025"],
  },

  // ─────────────── NEURAL ───────────────
  "neural-conduit": {
    id: "neural-conduit",
    label: "Nervo Periférico (conduit)",
    family: "neural",
    description: "Conduit para regeneração nervosa — canais longitudinais orientados, muito mole",
    emoji: "🧠",
    poreSize:    { min: 20, max: 100, optimal: 50 },
    porosity:    { min: 60, max: 85, optimal: 75 },
    recommendedPatterns: ["fascicular", "parallel-aligned"],
    defaultPattern: "fascicular",
    infillDensity: { min: 15, max: 35, optimal: 25 },
    anisotropy: { enabled: true, angleDeg: 0, ratio: 4.0 }, // Máximo alinhamento (axônios)
    elasticModulus: { min: 0.1, max: 5, unit: "kPa" },
    recommendedBioinks: ["GelMA + HA (baixa conc)", "Colágeno tipo I", "Fibrina + HA"],
    bioinkConcentration: { min: 3, max: 7, optimal: 5 },
    crosslinkStrategy: "UV 365nm 20s (suave para neurônios)",
    recommendedCellTypes: ["Células de Schwann", "iPSC-derived neurons", "Astrócitos"],
    cellDensity: { min: 1, max: 10, optimal: 5 },
    nozzleDiameter: { min: 200, max: 410, optimal: 300 },
    printSpeed: { min: 3, max: 10, optimal: 6 },
    pressure: { min: 10, max: 40, optimal: 20 },
    layerHeight: { min: 0.1, max: 0.25, optimal: 0.2 },
    temperature: { cartridgeC: 22, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 20, crosslinkPowerMwCm2: 8, cultureMedium: "Neurobasal + B27 + GDNF", cultureDaysToMaturation: 21, bioreactorRequired: false },
    references: ["Springer Bioprinting 2024"],
  },

  // ─────────────── EPITELIAL ───────────────
  "epithelial-mucosa": {
    id: "epithelial-mucosa",
    label: "Epitélio / Mucosa",
    family: "epithelial",
    description: "Camada superficial fina — células justapostas, baixa porosidade, função de barreira",
    emoji: "🟡",
    poreSize:    { min: 5, max: 50, optimal: 20 },
    porosity:    { min: 10, max: 30, optimal: 20 },
    recommendedPatterns: ["grid-orthogonal", "concentric-spiral"],
    defaultPattern: "grid-orthogonal",
    infillDensity: { min: 60, max: 95, optimal: 85 },
    anisotropy: { enabled: false },
    elasticModulus: { min: 10, max: 100, unit: "kPa" },
    recommendedBioinks: ["GelMA", "Colágeno tipo IV", "Matrigel-like"],
    bioinkConcentration: { min: 5, max: 12, optimal: 8 },
    crosslinkStrategy: "UV 365nm 30s",
    recommendedCellTypes: ["Queratinócitos (HaCaT)", "Células epiteliais intestinais (Caco-2)"],
    cellDensity: { min: 5, max: 30, optimal: 15 },
    nozzleDiameter: { min: 200, max: 410, optimal: 300 },
    printSpeed: { min: 5, max: 12, optimal: 8 },
    pressure: { min: 15, max: 50, optimal: 25 },
    layerHeight: { min: 0.1, max: 0.2, optimal: 0.15 },
    temperature: { cartridgeC: 25, bedC: 6, chamberC: 22 },
    postProcessing: { crosslinkTimeS: 30, crosslinkPowerMwCm2: 10, cultureMedium: "KGM + CaCl2 2mM (diferenciação)", cultureDaysToMaturation: 7 },
    references: ["MDPI 2025"],
  },
}

// ═══════════════════════════════════════════════════════════════════════════
//  ALGORITMOS — Lógica inteligente de sugestão
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtém perfil por ID com fallback seguro
 */
export function getTissueProfile(id: string): TissueProfile | null {
  return TISSUE_PROFILES[id] ?? null
}

/**
 * Lista todos os perfis agrupados por família
 */
export function getProfilesByFamily(): Record<TissueFamily, TissueProfile[]> {
  const grouped: Record<string, TissueProfile[]> = {}
  for (const profile of Object.values(TISSUE_PROFILES)) {
    if (!grouped[profile.family]) grouped[profile.family] = []
    grouped[profile.family].push(profile)
  }
  return grouped as Record<TissueFamily, TissueProfile[]>
}

/**
 * Mapa de família → label legível em português
 */
export const FAMILY_LABELS: Record<TissueFamily, { label: string; description: string; icon: string }> = {
  "rigid":               { label: "Rígido",                  description: "Osso cortical, dente — alta carga",                 icon: "🦴" },
  "spongy-rigid":        { label: "Esponjoso Rígido",        description: "Osso trabecular — porosidade alta",                  icon: "🦴" },
  "cartilage":           { label: "Cartilagem",              description: "Articular, elástica — viscoelástico",                icon: "🦵" },
  "connective-dense":    { label: "Conjuntivo Denso",        description: "Tendão, ligamento — fibras alinhadas",               icon: "💪" },
  "connective-loose":    { label: "Conjuntivo Frouxo",       description: "Derme — matriz hidratada, fibroblastos",             icon: "🩹" },
  "elastic-vascular":    { label: "Elástico Vascular",       description: "Vasos, válvulas — camadas anulares",                 icon: "🩸" },
  "elastic-muscle":      { label: "Elástico Muscular",       description: "Cardíaco, esquelético — contrátil anisotrópico",     icon: "❤️" },
  "parenchymal":         { label: "Parenquimatoso",          description: "Fígado, rim — lóbulos esponjosos",                   icon: "🫀" },
  "epithelial":          { label: "Epitelial",               description: "Pele superficial, mucosa — camadas finas",           icon: "🟡" },
  "neural":              { label: "Neural",                  description: "Nervo, cérebro — muito mole, alinhado",              icon: "🧠" },
}

/**
 * Calcula a "biomimicidade score" — quão próximo um conjunto de parâmetros
 * está do perfil ideal de um tecido. Retorna 0-100.
 *
 * Útil para feedback ao usuário: "Seu setup está 78% otimizado para osso trabecular"
 */
export function calculateBiomimicScore(
  profile: TissueProfile,
  current: {
    poreSize?: number
    infillDensity?: number
    nozzleDiameter?: number
    printSpeed?: number
    pressure?: number
    layerHeight?: number
    bioinkConc?: number
    cellDensity?: number
  }
): {
  score: number
  breakdown: Record<string, { value: number; ideal: { min: number; optimal: number; max: number }; status: "low" | "ok" | "high"; weight: number }>
  recommendations: string[]
} {
  const checks: Array<{ key: string; cur: number; min: number; max: number; opt: number; weight: number }> = []

  if (current.poreSize !== undefined)        checks.push({ key: "poreSize",       cur: current.poreSize,       min: profile.poreSize.min,         max: profile.poreSize.max,         opt: profile.poreSize.optimal,         weight: 2 })
  if (current.infillDensity !== undefined)   checks.push({ key: "infillDensity",  cur: current.infillDensity,  min: profile.infillDensity.min,    max: profile.infillDensity.max,    opt: profile.infillDensity.optimal,    weight: 2 })
  if (current.nozzleDiameter !== undefined)  checks.push({ key: "nozzleDiameter", cur: current.nozzleDiameter, min: profile.nozzleDiameter.min,   max: profile.nozzleDiameter.max,   opt: profile.nozzleDiameter.optimal,   weight: 1.5 })
  if (current.printSpeed !== undefined)      checks.push({ key: "printSpeed",     cur: current.printSpeed,     min: profile.printSpeed.min,       max: profile.printSpeed.max,       opt: profile.printSpeed.optimal,       weight: 1 })
  if (current.pressure !== undefined)        checks.push({ key: "pressure",       cur: current.pressure,       min: profile.pressure.min,         max: profile.pressure.max,         opt: profile.pressure.optimal,         weight: 1 })
  if (current.layerHeight !== undefined)     checks.push({ key: "layerHeight",    cur: current.layerHeight,    min: profile.layerHeight.min,      max: profile.layerHeight.max,      opt: profile.layerHeight.optimal,      weight: 1 })
  if (current.bioinkConc !== undefined)      checks.push({ key: "bioinkConc",     cur: current.bioinkConc,     min: profile.bioinkConcentration.min, max: profile.bioinkConcentration.max, opt: profile.bioinkConcentration.optimal, weight: 1.5 })
  if (current.cellDensity !== undefined)     checks.push({ key: "cellDensity",    cur: current.cellDensity,    min: profile.cellDensity.min,      max: profile.cellDensity.max,      opt: profile.cellDensity.optimal,      weight: 1 })

  let totalScore = 0
  let totalWeight = 0
  const breakdown: Record<string, any> = {}
  const recommendations: string[] = []

  for (const check of checks) {
    let subScore = 0
    let status: "low" | "ok" | "high" = "ok"
    const { cur, min, max, opt, weight, key } = check

    if (cur < min) {
      // Abaixo do mínimo — penalidade proporcional
      subScore = Math.max(0, 50 * (cur / min))
      status = "low"
      recommendations.push(`${humanLabel(key)}: ${cur} está abaixo do mínimo ${min}. Aumente para ~${opt}.`)
    } else if (cur > max) {
      subScore = Math.max(0, 50 * (max / cur))
      status = "high"
      recommendations.push(`${humanLabel(key)}: ${cur} excede o máximo ${max}. Reduza para ~${opt}.`)
    } else {
      // Dentro do range — quanto mais próximo do ótimo, melhor
      const distance = Math.abs(cur - opt)
      const range = (max - min) / 2
      subScore = 100 - (distance / range) * 30 // 70 mínimo dentro do range, 100 no ótimo
    }

    breakdown[key] = {
      value: cur,
      ideal: { min, optimal: opt, max },
      status,
      weight,
    }
    totalScore += subScore * weight
    totalWeight += weight
  }

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0
  return { score: finalScore, breakdown, recommendations }
}

function humanLabel(key: string): string {
  return ({
    poreSize:       "Tamanho de poro",
    infillDensity:  "Densidade de preenchimento",
    nozzleDiameter: "Diâmetro do bico",
    printSpeed:     "Velocidade",
    pressure:       "Pressão",
    layerHeight:    "Altura de camada",
    bioinkConc:     "Concentração de bioink",
    cellDensity:    "Densidade celular",
  } as Record<string, string>)[key] ?? key
}

/**
 * Sugere a melhor geometria STL para um perfil de tecido
 */
export function suggestGeometryForTissue(profile: TissueProfile): string {
  const map: Partial<Record<TissueFamily, string>> = {
    "rigid":            "bone_block",
    "spongy-rigid":     "tpms_gyroid",
    "cartilage":        "tpms_diamond",
    "connective-dense": "vessel",
    "connective-loose": "membrane",
    "elastic-vascular": "vessel",
    "elastic-muscle":   "membrane",
    "parenchymal":      "hexagonal_liver",
    "neural":           "vessel",
    "epithelial":       "membrane",
  }
  return map[profile.family] ?? "disk"
}

/**
 * Detecta possíveis problemas e devolve avisos contextuais
 * Usado por componentes para mostrar "atenção" sem ser intrusivo
 */
export function detectIssues(
  profile: TissueProfile,
  current: {
    pressure?: number
    printSpeed?: number
    nozzleDiameter?: number
    cellDensity?: number
    hasCells?: boolean
  }
): Array<{ severity: "info" | "warning" | "error"; message: string; suggestion?: string }> {
  const issues: Array<{ severity: "info" | "warning" | "error"; message: string; suggestion?: string }> = []
  const hasCells = current.hasCells ?? false

  // Pressão alta com células: alto shear stress
  if (hasCells && current.pressure !== undefined && current.pressure > 80) {
    issues.push({
      severity: "warning",
      message: `Pressão ${current.pressure} kPa pode causar shear stress excessivo (>5 kPa) e reduzir viabilidade celular.`,
      suggestion: `Reduza para 30-60 kPa para preservar viabilidade >80%.`,
    })
  }

  // Velocidade alta com células
  if (hasCells && current.printSpeed !== undefined && current.printSpeed > 20) {
    issues.push({
      severity: "warning",
      message: `Velocidade ${current.printSpeed} mm/s é elevada para construtos celulares.`,
      suggestion: `Reduza para 5-15 mm/s.`,
    })
  }

  // Nozzle muito pequeno com células
  if (hasCells && current.nozzleDiameter !== undefined && current.nozzleDiameter < 250) {
    issues.push({
      severity: "warning",
      message: `Bico ${current.nozzleDiameter} µm é pequeno demais para células (entupimento + shear).`,
      suggestion: `Use ≥250µm (idealmente 410µm) com biotinta celular.`,
    })
  }

  // Densidade celular fora de range
  if (hasCells && current.cellDensity !== undefined) {
    if (current.cellDensity > profile.cellDensity.max * 1.5) {
      issues.push({
        severity: "warning",
        message: `Densidade ${current.cellDensity} ×10⁶/mL é muito alta para ${profile.label}.`,
        suggestion: `Recomendado: ${profile.cellDensity.optimal} ×10⁶/mL (máx ${profile.cellDensity.max}).`,
      })
    }
  }

  return issues
}
