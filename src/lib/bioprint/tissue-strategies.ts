/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Tissue Strategies — Biologia → Toolpath (R12.14)
 *  ───────────────────────────────────────────────────────────────────────────
 *  Frase-guia da BIA:
 *    "A BIA não deve apenas gerar G-code.
 *     Ela deve transformar biologia em trajetória imprimível."
 *
 *  Este módulo é o "cérebro biológico" do G-code engine. Dado um TECIDO-ALVO,
 *  decidimos:
 *    1. Lógica biológica dominante (anisotropia, perfusão, niche)
 *    2. Estratégia de toolpath ideal (helicoidal, grid alinhado, organoid array)
 *    3. Janela de parâmetros de impressão (nozzle, speed, layer height, infill)
 *    4. Bioink recomendado (família + concentração inicial)
 *    5. Estratégia de crosslinking
 *    6. Riscos críticos a alertar o usuário
 *
 *  Inspirado em:
 *    • NAATIV3 framework (Nonplanar Architecture-Aligned Toolpathing)
 *    • Shiwarski FRESH 2025 (collagen perfusable CHIPS)
 *    • Nelson 2021 (printability janelas reológicas)
 *    • van der Valk 2025 (non-planar AM hidrogéis)
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Tipos ────────────────────────────────────────────────────────────────

export type TissueId =
  | "skin"           // pele
  | "dermis"         // derme
  | "cartilage"      // cartilagem
  | "bone"           // osso
  | "muscle"         // músculo esquelético
  | "myocardium"     // miocárdio
  | "cornea"         // córnea
  | "nerve"          // nervo
  | "vessel"         // vaso
  | "liver"          // fígado
  | "intestine"      // intestino
  | "tumor"          // tumor
  | "organoid"       // organoide genérico
  | "spheroid"       // esferoide
  | "scaffold"       // scaffold genérico
  | "custom"         // outro

export type BiologyLogic =
  | "cell-alignment"           // alinhamento celular direcional
  | "mechanical-anisotropy"    // mecânica direcional (miocárdio)
  | "perfusion"                // canais vasculares
  | "nutrient-diffusion"       // poros para difusão
  | "stiffness-gradient"       // gradiente de rigidez
  | "cell-migration"           // migração celular
  | "ecm-deposition"           // deposição de matriz
  | "niche-formation"          // formação de nicho (organoide)
  | "tissue-maturation"        // maturação
  | "organoid-fusion"          // fusão de organoides
  | "temporary-support"        // suporte sacrificial
  | "bioreactor-interface"     // interface biorreator
  | "well-plate-interface"     // placa de cultura

export type ToolpathStrategyId =
  | "planar-rectilinear"       // tradicional cross-hatch
  | "planar-concentric"        // spiral concêntrico
  | "non-planar"               // 3D não planar
  | "helical"                  // helicoidal (miocárdio)
  | "radial"                   // radial saindo do centro
  | "serpentine"               // serpentina
  | "gyroid-tpms"              // gyroid (TPMS biomimético)
  | "voronoi"                  // voronoi (osso)
  | "lattice"                  // treliça regular
  | "anisotropic-grid"         // grid alinhado a direção (córnea, lamelas)
  | "vector-field"             // campo vetorial NAATIV3
  | "vascular-branching"       // ramificação fractal
  | "shell-core"               // casca + núcleo
  | "multi-material"           // multi-tinta
  | "sacrificial-channel"      // canal sacrificial (Pluronic)
  | "organoid-niche-array"     // matriz de microcavidades p/ organoides

export type CrosslinkingMethod =
  | "uv-light"          // UV+LAP/Irgacure (GelMA)
  | "ionic"             // CaCl2/CaSO4 (alginato)
  | "thermal"           // 37°C (colágeno, gelatina)
  | "enzymatic"         // transglutaminase, trombina
  | "chemical"          // genipina, EDC/NHS
  | "physical"          // hidrofóbico (Pluronic)
  | "dual"              // múltiplos

export type RiskLevel = "info" | "warning" | "critical"

export interface TissueRisk {
  level: RiskLevel
  title: string
  detail: string
  mitigation: string
}

export interface TissueStrategy {
  id: TissueId
  emoji: string
  label: string
  shortDescription: string

  /** Lógicas biológicas dominantes (em ordem de importância) */
  dominantLogic: BiologyLogic[]

  /** 3 propostas: segura / avançada / experimental */
  toolpaths: {
    safe: ToolpathStrategyId
    advanced: ToolpathStrategyId
    experimental: ToolpathStrategyId
  }

  /** Bioink recomendado (família + range de concentração) */
  recommendedBioink: {
    family: string                    // ex: "GelMA + colágeno"
    concentration_pct_min: number     // 5
    concentration_pct_max: number     // 15
    notes: string                     // "GelMA 10% + colágeno tipo I 1 mg/mL"
  }

  /** Crosslinking */
  crosslinking: CrosslinkingMethod

  /** Janela de parâmetros de impressão */
  printingParams: {
    nozzleDiameter_mm: { min: number; ideal: number; max: number }
    layerHeight_mm: { min: number; ideal: number; max: number }
    printSpeed_mms: { min: number; ideal: number; max: number }
    pressure_kpa: { min: number; ideal: number; max: number }
    infill_pct: { min: number; ideal: number; max: number }
  }

  /** Células recomendadas (tipos) */
  recommendedCells: string[]

  /** Densidade celular típica (×10⁶/mL) */
  cellDensity_M_per_mL: { min: number; ideal: number; max: number }

  /** Riscos típicos deste tecido */
  risks: TissueRisk[]

  /** Notas científicas / referências */
  scientificNotes: string[]

  /** Cor de UI */
  uiColor: "rose" | "amber" | "emerald" | "cyan" | "blue" | "violet" | "fuchsia" | "slate" | "orange"
}

// ─── Catálogo de 16 estratégias ────────────────────────────────────────────

export const TISSUE_STRATEGIES: TissueStrategy[] = [
  // ═════════════════ EPITELIAL ═════════════════
  {
    id: "skin",
    emoji: "🩹",
    label: "Pele (epiderme + derme)",
    shortDescription: "Multi-camada com queratinócitos + fibroblastos. Vascularização opcional.",
    dominantLogic: ["cell-migration", "ecm-deposition", "stiffness-gradient"],
    toolpaths: {
      safe: "planar-rectilinear",
      advanced: "shell-core",
      experimental: "multi-material",
    },
    recommendedBioink: {
      family: "Colágeno I + GelMA",
      concentration_pct_min: 3,
      concentration_pct_max: 10,
      notes: "Derme: colágeno I 3-5 mg/mL · Epiderme: GelMA 5-10% + queratinócitos",
    },
    crosslinking: "thermal",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.1, ideal: 0.2, max: 0.3 },
      printSpeed_mms: { min: 5, ideal: 8, max: 15 },
      pressure_kpa: { min: 30, ideal: 60, max: 100 },
      infill_pct: { min: 60, ideal: 80, max: 100 },
    },
    recommendedCells: ["Fibroblastos dérmicos", "Queratinócitos", "Melanócitos"],
    cellDensity_M_per_mL: { min: 1, ideal: 5, max: 10 },
    risks: [
      {
        level: "warning",
        title: "Contração da derme",
        detail: "Colágeno + fibroblastos contraem 30-50% em 7-14 dias.",
        mitigation: "Imprima 1.3-1.5× maior que o tamanho final desejado.",
      },
      {
        level: "info",
        title: "Diferenciação da epiderme",
        detail: "Queratinócitos precisam de air-liquid interface para estratificar.",
        mitigation: "Após 7 dias submerso, exponha a superfície ao ar.",
      },
    ],
    scientificNotes: [
      "Pele bilaminar: derme (1-2 mm) + epiderme (50-100 µm)",
      "Vascularização requer HUVECs co-cultivadas",
    ],
    uiColor: "rose",
  },

  {
    id: "dermis",
    emoji: "🟫",
    label: "Derme (camada única)",
    shortDescription: "Matriz fibroblástica densa com colágeno alinhado.",
    dominantLogic: ["ecm-deposition", "cell-migration", "stiffness-gradient"],
    toolpaths: {
      safe: "planar-rectilinear",
      advanced: "anisotropic-grid",
      experimental: "vector-field",
    },
    recommendedBioink: {
      family: "Colágeno I + fibrina",
      concentration_pct_min: 2,
      concentration_pct_max: 6,
      notes: "Colágeno I 3-5 mg/mL + fibroblastos 1-3×10⁶/mL",
    },
    crosslinking: "thermal",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.15, ideal: 0.25, max: 0.4 },
      printSpeed_mms: { min: 5, ideal: 8, max: 12 },
      pressure_kpa: { min: 20, ideal: 50, max: 80 },
      infill_pct: { min: 70, ideal: 90, max: 100 },
    },
    recommendedCells: ["Fibroblastos dérmicos primários", "HUVECs (vascular)"],
    cellDensity_M_per_mL: { min: 1, ideal: 3, max: 8 },
    risks: [
      {
        level: "warning",
        title: "Sineresia do colágeno",
        detail: "Colágeno expulsa água conforme polimeriza — encolhimento ~20%.",
        mitigation: "Use cassete maior, ou colágeno modificado MA-Col.",
      },
    ],
    scientificNotes: ["Espessura típica: 1-2 mm"],
    uiColor: "rose",
  },

  // ═════════════════ CONECTIVO ═════════════════
  {
    id: "cartilage",
    emoji: "🔵",
    label: "Cartilagem articular",
    shortDescription: "Matriz viscoelástica avascular com condrócitos isolados em lacunas.",
    dominantLogic: ["ecm-deposition", "stiffness-gradient", "nutrient-diffusion"],
    toolpaths: {
      safe: "planar-concentric",
      advanced: "gyroid-tpms",
      experimental: "vector-field",
    },
    recommendedBioink: {
      family: "Alginato + GelMA + agarose",
      concentration_pct_min: 4,
      concentration_pct_max: 15,
      notes: "Alginato 2% + GelMA 5% + condrócitos 10×10⁶/mL · ou MeHA 3%",
    },
    crosslinking: "dual",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.2, ideal: 0.3, max: 0.5 },
      printSpeed_mms: { min: 4, ideal: 8, max: 15 },
      pressure_kpa: { min: 60, ideal: 100, max: 200 },
      infill_pct: { min: 80, ideal: 100, max: 100 },
    },
    recommendedCells: ["Condrócitos articulares", "MSCs diferenciados", "iPSC-chondrocytes"],
    cellDensity_M_per_mL: { min: 5, ideal: 10, max: 30 },
    risks: [
      {
        level: "warning",
        title: "Desdiferenciação de condrócitos",
        detail: "Condrócitos viram fibroblastos em monolayer — devem ser usados em <P3.",
        mitigation: "Bioimprima direto após digestão e mantenha em GelMA/HA.",
      },
      {
        level: "info",
        title: "Difusão limitada",
        detail: "Tecido avascular — espessura máx ~3 mm sem perfusão.",
        mitigation: "Use porosidade gyroid para difusão de nutrientes.",
      },
    ],
    scientificNotes: ["Módulo Young: 0.5-1.5 MPa", "GAG/colágeno II é assinatura de condrócito"],
    uiColor: "cyan",
  },

  {
    id: "bone",
    emoji: "🦴",
    label: "Osso (trabecular ou cortical)",
    shortDescription: "Scaffold mineralizado com vascularização, BMP-2 e osteoblastos.",
    dominantLogic: ["mechanical-anisotropy", "perfusion", "stiffness-gradient"],
    toolpaths: {
      safe: "lattice",
      advanced: "voronoi",
      experimental: "gyroid-tpms",
    },
    recommendedBioink: {
      family: "GelMA + nano-hidroxiapatita (nHA)",
      concentration_pct_min: 10,
      concentration_pct_max: 20,
      notes: "GelMA 10% + nHA 5-15% + BMP-2 100 ng/mL + hMSCs 5×10⁶/mL",
    },
    crosslinking: "uv-light",
    printingParams: {
      nozzleDiameter_mm: { min: 0.41, ideal: 0.5, max: 0.84 },
      layerHeight_mm: { min: 0.2, ideal: 0.3, max: 0.5 },
      printSpeed_mms: { min: 3, ideal: 6, max: 12 },
      pressure_kpa: { min: 80, ideal: 150, max: 300 },
      infill_pct: { min: 40, ideal: 60, max: 80 },
    },
    recommendedCells: ["hMSCs", "Osteoblastos primários", "HUVECs (vasc)", "Osteoclastos (remodelação)"],
    cellDensity_M_per_mL: { min: 2, ideal: 5, max: 15 },
    risks: [
      {
        level: "critical",
        title: "Necrose central por hipóxia",
        detail: "Sem vasos, células no centro morrem em scaffolds > 3 mm.",
        mitigation: "Use Voronoi com poros 200-500 µm + co-cultivo HUVEC para vascularização.",
      },
      {
        level: "warning",
        title: "Mineralização demorada",
        detail: "Osteogênese leva 21-28 dias in vitro.",
        mitigation: "Use β-glicerofosfato + ácido ascórbico + dexametasona no meio.",
      },
    ],
    scientificNotes: [
      "Porosidade óssea: trabecular 50-90%, cortical 5-30%",
      "Tamanho de poro ideal: 300-500 µm (Karageorgiou 2005)",
    ],
    uiColor: "amber",
  },

  // ═════════════════ MUSCULAR ═════════════════
  {
    id: "muscle",
    emoji: "💪",
    label: "Músculo esquelético",
    shortDescription: "Fibras paralelas alinhadas, alta densidade celular, fusão miotubular.",
    dominantLogic: ["cell-alignment", "mechanical-anisotropy", "tissue-maturation"],
    toolpaths: {
      safe: "anisotropic-grid",
      advanced: "vector-field",
      experimental: "multi-material",
    },
    recommendedBioink: {
      family: "GelMA + fibrina",
      concentration_pct_min: 4,
      concentration_pct_max: 10,
      notes: "GelMA 5% + fibrinogênio 5 mg/mL + mioblastos 10-20×10⁶/mL",
    },
    crosslinking: "dual",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.15, ideal: 0.25, max: 0.4 },
      printSpeed_mms: { min: 5, ideal: 10, max: 18 },
      pressure_kpa: { min: 40, ideal: 80, max: 150 },
      infill_pct: { min: 60, ideal: 80, max: 100 },
    },
    recommendedCells: ["C2C12 mioblastos", "Mioblastos primários humanos", "iPSC-myocytes"],
    cellDensity_M_per_mL: { min: 5, ideal: 15, max: 30 },
    risks: [
      {
        level: "warning",
        title: "Falha de alinhamento",
        detail: "Sem orientação, mioblastos não se fundem em miotubos.",
        mitigation: "Use vector-field paralelo ou microsulcos no scaffold.",
      },
      {
        level: "info",
        title: "Estimulação elétrica",
        detail: "Maturação acelera com estimulação elétrica 1 Hz após dia 7.",
        mitigation: "Use placa MEA ou eletrodos C-Pace.",
      },
    ],
    scientificNotes: ["Comprimento de sarcômero ideal: 2.2 µm", "Fusão miotubular: dia 5-10"],
    uiColor: "orange",
  },

  {
    id: "myocardium",
    emoji: "❤️",
    label: "Miocárdio (cardíaco)",
    shortDescription: "Anisotropia helicoidal transmural, condução elétrica, contractilidade.",
    dominantLogic: ["mechanical-anisotropy", "cell-alignment", "perfusion"],
    toolpaths: {
      safe: "anisotropic-grid",
      advanced: "helical",
      experimental: "vector-field",
    },
    recommendedBioink: {
      family: "GelMA + dECM cardíaca + colágeno",
      concentration_pct_min: 5,
      concentration_pct_max: 12,
      notes: "GelMA 7% + dECM cardíaca 2 mg/mL + iPSC-cardiomyocytes 20-40×10⁶/mL",
    },
    crosslinking: "uv-light",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.5 },
      layerHeight_mm: { min: 0.15, ideal: 0.25, max: 0.35 },
      printSpeed_mms: { min: 3, ideal: 6, max: 12 },
      pressure_kpa: { min: 50, ideal: 90, max: 150 },
      infill_pct: { min: 80, ideal: 100, max: 100 },
    },
    recommendedCells: ["iPSC-cardiomyocytes", "Cardiomyocytes neonatais", "Fibroblastos cardíacos", "HUVECs"],
    cellDensity_M_per_mL: { min: 10, ideal: 30, max: 50 },
    risks: [
      {
        level: "critical",
        title: "Sem orientação = sem batimento",
        detail: "Cardiomyócitos não alinhados batem assincronamente, sem força.",
        mitigation: "ESSENCIAL: use helical (60° base→ápice) ou vector-field.",
      },
      {
        level: "critical",
        title: "Hipóxia em >2 mm",
        detail: "CMs têm metabolismo aeróbico estrito.",
        mitigation: "Co-cultivo HUVEC + canais sacrificiais Pluronic.",
      },
    ],
    scientificNotes: [
      "Helicoidal transmural: ângulo +60° (endocárdio) → −60° (epicárdio)",
      "Batimento espontâneo a partir do dia 5-7",
      "Frequência fisiológica: 1-2 Hz",
    ],
    uiColor: "rose",
  },

  // ═════════════════ NEURO / ÓPTICO ═════════════════
  {
    id: "cornea",
    emoji: "👁️",
    label: "Córnea",
    shortDescription: "Estroma lamelar transparente com colágeno ortogonalmente alinhado.",
    dominantLogic: ["cell-alignment", "ecm-deposition", "mechanical-anisotropy"],
    toolpaths: {
      safe: "anisotropic-grid",
      advanced: "vector-field",
      experimental: "multi-material",
    },
    recommendedBioink: {
      family: "Colágeno I + GelMA transparente",
      concentration_pct_min: 5,
      concentration_pct_max: 15,
      notes: "Colágeno I 10 mg/mL + queratócitos 2×10⁶/mL · lamelas ortogonais 90°",
    },
    crosslinking: "uv-light",
    printingParams: {
      nozzleDiameter_mm: { min: 0.2, ideal: 0.33, max: 0.5 },
      layerHeight_mm: { min: 0.1, ideal: 0.15, max: 0.25 },
      printSpeed_mms: { min: 5, ideal: 10, max: 15 },
      pressure_kpa: { min: 40, ideal: 70, max: 120 },
      infill_pct: { min: 80, ideal: 100, max: 100 },
    },
    recommendedCells: ["Queratócitos do estroma", "Endotélio corneano", "Epitélio corneano"],
    cellDensity_M_per_mL: { min: 1, ideal: 2, max: 5 },
    risks: [
      {
        level: "critical",
        title: "Perda de transparência",
        detail: "Densidade celular alta ou colágeno desordenado torna opaco.",
        mitigation: "≤2×10⁶/mL + colágeno alinhado ortogonal.",
      },
    ],
    scientificNotes: ["~200 lamelas com 90° entre cada", "Espessura: ~500 µm"],
    uiColor: "blue",
  },

  {
    id: "nerve",
    emoji: "🧠",
    label: "Nervo periférico",
    shortDescription: "Conduit longitudinal com canais axonais e fatores de crescimento.",
    dominantLogic: ["cell-alignment", "cell-migration"],
    toolpaths: {
      safe: "anisotropic-grid",
      advanced: "vector-field",
      experimental: "sacrificial-channel",
    },
    recommendedBioink: {
      family: "GelMA + ácido hialurônico",
      concentration_pct_min: 3,
      concentration_pct_max: 8,
      notes: "GelMA 5% + HA 1% + NGF 100 ng/mL + Schwann cells 3×10⁶/mL",
    },
    crosslinking: "uv-light",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.15, ideal: 0.25, max: 0.4 },
      printSpeed_mms: { min: 5, ideal: 8, max: 12 },
      pressure_kpa: { min: 30, ideal: 60, max: 100 },
      infill_pct: { min: 30, ideal: 50, max: 70 },
    },
    recommendedCells: ["Células de Schwann", "iPSC-neurons", "Astrócitos"],
    cellDensity_M_per_mL: { min: 1, ideal: 3, max: 8 },
    risks: [
      {
        level: "warning",
        title: "Falta de orientação axonal",
        detail: "Sem canais paralelos, axônios crescem em direções aleatórias.",
        mitigation: "Use canais sacrificiais Pluronic 200-400 µm paralelos.",
      },
    ],
    scientificNotes: ["Velocidade de regeneração axonal: ~1 mm/dia"],
    uiColor: "violet",
  },

  // ═════════════════ VASCULAR / TUBULAR ═════════════════
  {
    id: "vessel",
    emoji: "🩸",
    label: "Vaso sanguíneo",
    shortDescription: "Estrutura tubular com endotélio + músculo liso + fibroblastos.",
    dominantLogic: ["perfusion", "cell-alignment", "mechanical-anisotropy"],
    toolpaths: {
      safe: "shell-core",
      advanced: "vascular-branching",
      experimental: "sacrificial-channel",
    },
    recommendedBioink: {
      family: "Alginato + colágeno + fibrina",
      concentration_pct_min: 3,
      concentration_pct_max: 8,
      notes: "Casca: alginato 3% · Lúmen: HUVECs · Mídia: SMCs em colágeno",
    },
    crosslinking: "ionic",
    printingParams: {
      nozzleDiameter_mm: { min: 0.41, ideal: 0.6, max: 0.84 },
      layerHeight_mm: { min: 0.2, ideal: 0.3, max: 0.5 },
      printSpeed_mms: { min: 4, ideal: 8, max: 15 },
      pressure_kpa: { min: 50, ideal: 100, max: 180 },
      infill_pct: { min: 0, ideal: 0, max: 30 },  // oco!
    },
    recommendedCells: ["HUVECs (endotélio)", "SMCs vasculares", "Fibroblastos adventícios"],
    cellDensity_M_per_mL: { min: 5, ideal: 10, max: 20 },
    risks: [
      {
        level: "critical",
        title: "Colapso do lúmen",
        detail: "Tubos finos colapsam pós-impressão.",
        mitigation: "Use Pluronic sacrificial ou banho FRESH (Shiwarski 2025).",
      },
    ],
    scientificNotes: ["Diâmetro aorta: ~25 mm · Capilar: 5-10 µm", "Endotélio precisa de shear flow para maturar"],
    uiColor: "rose",
  },

  // ═════════════════ ÓRGÃOS PARENQUIMATOSOS ═════════════════
  {
    id: "liver",
    emoji: "🫀",
    label: "Fígado (lobular)",
    shortDescription: "Lóbulos hexagonais com hepatócitos, sinusoides e células de Kupffer.",
    dominantLogic: ["perfusion", "niche-formation", "ecm-deposition"],
    toolpaths: {
      safe: "lattice",
      advanced: "shell-core",
      experimental: "multi-material",
    },
    recommendedBioink: {
      family: "GelMA + dECM hepática",
      concentration_pct_min: 5,
      concentration_pct_max: 12,
      notes: "GelMA 7% + dECM hepática 2 mg/mL + hepatócitos 20×10⁶/mL",
    },
    crosslinking: "uv-light",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.2, ideal: 0.3, max: 0.4 },
      printSpeed_mms: { min: 4, ideal: 8, max: 12 },
      pressure_kpa: { min: 50, ideal: 90, max: 150 },
      infill_pct: { min: 60, ideal: 80, max: 100 },
    },
    recommendedCells: ["Hepatócitos primários", "HepG2", "iPSC-hepatocytes", "HUVECs sinusoidais"],
    cellDensity_M_per_mL: { min: 10, ideal: 20, max: 40 },
    risks: [
      {
        level: "critical",
        title: "Perda de função hepática",
        detail: "Hepatócitos perdem CYP450 em 48-72 h sem ECM correta.",
        mitigation: "Use dECM hepática + co-cultivo com NPCs.",
      },
    ],
    scientificNotes: ["Lóbulo hepático: ~1 mm hexágono", "Sinusoides: 7-15 µm diâmetro"],
    uiColor: "amber",
  },

  {
    id: "intestine",
    emoji: "🧫",
    label: "Intestino (vilosidades)",
    shortDescription: "Epitélio em vilosidades 3D com cripta + lúmen.",
    dominantLogic: ["niche-formation", "cell-migration", "perfusion"],
    toolpaths: {
      safe: "shell-core",
      advanced: "organoid-niche-array",
      experimental: "non-planar",
    },
    recommendedBioink: {
      family: "Matrigel + colágeno",
      concentration_pct_min: 3,
      concentration_pct_max: 8,
      notes: "Matrigel 50% + colágeno I 2 mg/mL + organoides intestinais",
    },
    crosslinking: "thermal",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.2, ideal: 0.3, max: 0.4 },
      printSpeed_mms: { min: 3, ideal: 6, max: 10 },
      pressure_kpa: { min: 20, ideal: 40, max: 80 },
      infill_pct: { min: 40, ideal: 60, max: 80 },
    },
    recommendedCells: ["Organoides intestinais (LGR5+)", "Células de Paneth"],
    cellDensity_M_per_mL: { min: 0.5, ideal: 1, max: 3 },
    risks: [
      {
        level: "warning",
        title: "Matrigel sensível à temperatura",
        detail: "Polimeriza > 10°C — entope bico facilmente.",
        mitigation: "Mantenha cartucho a 4°C e bed a 37°C.",
      },
    ],
    scientificNotes: ["Altura vilosidade: 200-500 µm", "Cripta: 100-200 µm profundidade"],
    uiColor: "amber",
  },

  // ═════════════════ ONCOLOGIA / DROGAS ═════════════════
  {
    id: "tumor",
    emoji: "🦠",
    label: "Tumor (modelo de câncer)",
    shortDescription: "Massa heterogênea com núcleo hipóxico + borda proliferativa.",
    dominantLogic: ["niche-formation", "stiffness-gradient", "perfusion"],
    toolpaths: {
      safe: "planar-rectilinear",
      advanced: "shell-core",
      experimental: "multi-material",
    },
    recommendedBioink: {
      family: "GelMA + colágeno + dECM tumoral",
      concentration_pct_min: 5,
      concentration_pct_max: 15,
      notes: "GelMA 10% + linhagens tumorais 5-10×10⁶/mL + CAFs (estroma)",
    },
    crosslinking: "uv-light",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.2, ideal: 0.3, max: 0.5 },
      printSpeed_mms: { min: 5, ideal: 10, max: 18 },
      pressure_kpa: { min: 50, ideal: 100, max: 180 },
      infill_pct: { min: 80, ideal: 100, max: 100 },
    },
    recommendedCells: ["Linhagens tumorais (MCF7, HCT116)", "CAFs", "TILs (imuno)"],
    cellDensity_M_per_mL: { min: 2, ideal: 8, max: 20 },
    risks: [
      {
        level: "info",
        title: "Heterogeneidade desejada",
        detail: "Núcleo hipóxico simula real — 1-2 mm é ótimo.",
        mitigation: "Não tente vascularizar se for modelo de drug screening.",
      },
    ],
    scientificNotes: ["Stiffness tumoral: 1-10 kPa (4× mais rígido que tecido normal)"],
    uiColor: "slate",
  },

  // ═════════════════ ORGANOIDES / ESFEROIDES ═════════════════
  {
    id: "organoid",
    emoji: "🔬",
    label: "Organoide (array em microcavidades)",
    shortDescription: "Matriz de microcavidades baixa-adesão para auto-organização.",
    dominantLogic: ["niche-formation", "well-plate-interface", "organoid-fusion"],
    toolpaths: {
      safe: "organoid-niche-array",
      advanced: "organoid-niche-array",
      experimental: "multi-material",
    },
    recommendedBioink: {
      family: "Agarose + alginato (low-adhesion)",
      concentration_pct_min: 1,
      concentration_pct_max: 4,
      notes: "Agarose 2% (low-melt) ou alginato 2% · sem RGD",
    },
    crosslinking: "thermal",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.6 },
      layerHeight_mm: { min: 0.2, ideal: 0.3, max: 0.5 },
      printSpeed_mms: { min: 5, ideal: 10, max: 18 },
      pressure_kpa: { min: 30, ideal: 60, max: 100 },
      infill_pct: { min: 100, ideal: 100, max: 100 },
    },
    recommendedCells: ["iPSC", "ESC", "Células tumorais (CTOs)", "Hepatócitos"],
    cellDensity_M_per_mL: { min: 0.1, ideal: 0.5, max: 2 },
    risks: [
      {
        level: "warning",
        title: "Tamanho desigual",
        detail: "Variação no número de células por microcavidade.",
        mitigation: "Use centrifugação suave (300 g, 3 min) após semear.",
      },
      {
        level: "info",
        title: "Fusão de organoides",
        detail: "Microcavidades < 200 µm de distância podem fundir.",
        mitigation: "Distância centro-a-centro > 600 µm para isolamento.",
      },
    ],
    scientificNotes: [
      "Microcavidade típica: 400-800 µm diâmetro × 400 µm profundidade",
      "Array padrão: 6, 12, 24, 96, 384 cavidades por placa SBS",
    ],
    uiColor: "fuchsia",
  },

  {
    id: "spheroid",
    emoji: "⚪",
    label: "Esferoide (formação rápida)",
    shortDescription: "Pequenos esferoides homogêneos para drug screening.",
    dominantLogic: ["niche-formation", "well-plate-interface"],
    toolpaths: {
      safe: "organoid-niche-array",
      advanced: "organoid-niche-array",
      experimental: "organoid-niche-array",
    },
    recommendedBioink: {
      family: "Agarose 2% low-adhesion",
      concentration_pct_min: 1.5,
      concentration_pct_max: 3,
      notes: "Agarose 2% (low-melt) · sem ECM · semeio direto",
    },
    crosslinking: "thermal",
    printingParams: {
      nozzleDiameter_mm: { min: 0.41, ideal: 0.6, max: 0.84 },
      layerHeight_mm: { min: 0.3, ideal: 0.4, max: 0.5 },
      printSpeed_mms: { min: 8, ideal: 15, max: 25 },
      pressure_kpa: { min: 30, ideal: 60, max: 100 },
      infill_pct: { min: 100, ideal: 100, max: 100 },
    },
    recommendedCells: ["Tumor cell lines", "MSCs", "iPSC"],
    cellDensity_M_per_mL: { min: 0.5, ideal: 1, max: 5 },
    risks: [],
    scientificNotes: ["Tamanho típico de esferoide: 100-300 µm"],
    uiColor: "fuchsia",
  },

  // ═════════════════ GENÉRICO ═════════════════
  {
    id: "scaffold",
    emoji: "🧱",
    label: "Scaffold acelular genérico",
    shortDescription: "Estrutura sem células para semeio posterior ou caracterização.",
    dominantLogic: ["nutrient-diffusion", "stiffness-gradient"],
    toolpaths: {
      safe: "lattice",
      advanced: "gyroid-tpms",
      experimental: "voronoi",
    },
    recommendedBioink: {
      family: "PCL, alginato, GelMA, PEGDA",
      concentration_pct_min: 5,
      concentration_pct_max: 30,
      notes: "Sem células — qualquer biomaterial compatível com extrusão",
    },
    crosslinking: "physical",
    printingParams: {
      nozzleDiameter_mm: { min: 0.25, ideal: 0.41, max: 0.84 },
      layerHeight_mm: { min: 0.15, ideal: 0.3, max: 0.5 },
      printSpeed_mms: { min: 5, ideal: 15, max: 30 },
      pressure_kpa: { min: 40, ideal: 100, max: 250 },
      infill_pct: { min: 20, ideal: 50, max: 100 },
    },
    recommendedCells: ["Semeio posterior — qualquer tipo"],
    cellDensity_M_per_mL: { min: 0, ideal: 0, max: 0 },
    risks: [],
    scientificNotes: ["Tamanho de poro 200-500 µm para osso, 100-200 µm para pele"],
    uiColor: "slate",
  },

  {
    id: "custom",
    emoji: "🧪",
    label: "Outro / customizado",
    shortDescription: "Tecido não listado — defina parâmetros manualmente.",
    dominantLogic: ["tissue-maturation"],
    toolpaths: {
      safe: "planar-rectilinear",
      advanced: "planar-concentric",
      experimental: "lattice",
    },
    recommendedBioink: {
      family: "Customizado",
      concentration_pct_min: 1,
      concentration_pct_max: 30,
      notes: "Defina o material e a concentração com base na literatura.",
    },
    crosslinking: "dual",
    printingParams: {
      nozzleDiameter_mm: { min: 0.2, ideal: 0.41, max: 0.84 },
      layerHeight_mm: { min: 0.1, ideal: 0.25, max: 0.5 },
      printSpeed_mms: { min: 3, ideal: 10, max: 30 },
      pressure_kpa: { min: 20, ideal: 80, max: 250 },
      infill_pct: { min: 0, ideal: 50, max: 100 },
    },
    recommendedCells: ["Definido pelo usuário"],
    cellDensity_M_per_mL: { min: 0, ideal: 5, max: 50 },
    risks: [],
    scientificNotes: [],
    uiColor: "slate",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getTissueStrategy(id: TissueId): TissueStrategy {
  const found = TISSUE_STRATEGIES.find((t) => t.id === id)
  if (!found) {
    return TISSUE_STRATEGIES[TISSUE_STRATEGIES.length - 1]  // custom fallback
  }
  return found
}

export function toolpathLabel(id: ToolpathStrategyId): string {
  return {
    "planar-rectilinear":   "Planar rectilinear (cross-hatch)",
    "planar-concentric":    "Planar concêntrico (espiral)",
    "non-planar":           "Não-planar 3D",
    "helical":              "Helicoidal transmural",
    "radial":               "Radial centrífugo",
    "serpentine":           "Serpentina contínua",
    "gyroid-tpms":          "Gyroid TPMS (biomimético)",
    "voronoi":              "Voronoi (osso trabecular)",
    "lattice":              "Treliça regular",
    "anisotropic-grid":     "Grid anisotrópico (alinhado)",
    "vector-field":         "Campo vetorial NAATIV3",
    "vascular-branching":   "Ramificação vascular fractal",
    "shell-core":           "Casca + núcleo",
    "multi-material":       "Multi-material (multi-bico)",
    "sacrificial-channel":  "Canal sacrificial (Pluronic)",
    "organoid-niche-array": "Matriz de microcavidades",
  }[id]
}

export function logicLabel(id: BiologyLogic): string {
  return {
    "cell-alignment":         "Alinhamento celular",
    "mechanical-anisotropy":  "Anisotropia mecânica",
    "perfusion":              "Vascularização/perfusão",
    "nutrient-diffusion":     "Difusão de nutrientes",
    "stiffness-gradient":     "Gradiente de rigidez",
    "cell-migration":         "Migração celular",
    "ecm-deposition":         "Deposição de ECM",
    "niche-formation":        "Formação de nicho",
    "tissue-maturation":      "Maturação tecidual",
    "organoid-fusion":        "Fusão de organoides",
    "temporary-support":      "Suporte temporário",
    "bioreactor-interface":   "Interface com biorreator",
    "well-plate-interface":   "Interface com placa de cultura",
  }[id]
}

export function crosslinkingLabel(m: CrosslinkingMethod): string {
  return {
    "uv-light":   "Luz UV (LAP/Irgacure)",
    "ionic":      "Iônico (CaCl₂/CaSO₄)",
    "thermal":    "Térmico (37 °C)",
    "enzymatic":  "Enzimático (TG/trombina)",
    "chemical":   "Químico (genipina/EDC)",
    "physical":   "Físico (hidrofóbico)",
    "dual":       "Duplo / múltiplo",
  }[m]
}

/** Tooltip para nível de complexidade do toolpath */
export function toolpathComplexity(id: ToolpathStrategyId): "low" | "medium" | "high" | "very-high" {
  switch (id) {
    case "planar-rectilinear":
    case "planar-concentric":
    case "lattice":
      return "low"
    case "anisotropic-grid":
    case "shell-core":
    case "organoid-niche-array":
    case "serpentine":
      return "medium"
    case "helical":
    case "voronoi":
    case "gyroid-tpms":
    case "sacrificial-channel":
    case "radial":
      return "high"
    case "vector-field":
    case "vascular-branching":
    case "non-planar":
    case "multi-material":
      return "very-high"
  }
}
