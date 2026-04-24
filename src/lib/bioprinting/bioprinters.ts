/**
 * BIA — Catálogo de Bioimpressoras
 * ==================================
 * Bioimpressoras principais usadas em biofabricação, com dimensões de mesa
 * (build plate) e capacidades técnicas para gerar G-code compatível.
 */

export type PrintingTech =
  | "extrusion_pneumatic"  // pressão pneumática (Cellink, Allevi, Regemat)
  | "extrusion_screw"      // parafuso (Allevi 3, BioAssemblyBot)
  | "extrusion_piston"     // pistão mecânico (Envisiontec 3D-Bioplotter)
  | "extrusion_FDM"        // termoplástico (BioEnder)
  | "DLP"                  // DLP/SLA fotopolimerização
  | "inkjet"               // inkjet / drop-on-demand

export interface BioprinterSpec {
  id: string
  brand: string
  model: string
  fullName: string
  technology: PrintingTech[]
  buildVolume: { x: number; y: number; z: number; unit: "mm" }  // X × Y × Z
  resolution_um: { xy: number; z: number }                       // resolução XY / Z
  maxSpeed_mm_s: number
  numHeads: number                                                // cabeçotes simultâneos
  temperatureRange_C: { min: number; max: number }               // temperatura do cartucho
  hasBedHeating: boolean
  hasUVcuring: boolean
  pressureRange_kPa?: { min: number; max: number }
  connectionTypes: Array<"USB" | "Wi-Fi" | "Ethernet" | "SD" | "Proprietary">
  firmwareCompatibility: Array<"Marlin" | "Klipper" | "RepRap" | "Proprietary" | "GCODE-standard">
  baud: number                                                    // taxa serial USB (para conexão)
  nozzleDiameters_um: number[]                                    // bicos suportados
  priceTier: "academic" | "research" | "professional" | "industrial"
  description: string
  typicalApplications: string[]
  notes?: string[]
  icon: string
}

export const BIOPRINTERS: BioprinterSpec[] = [
  // ═══════════════════════════════════════════════════════════
  // NACIONAIS / LATINO-AMERICANAS
  // ═══════════════════════════════════════════════════════════
  {
    id: "bioender_bioedtech",
    brand: "BIOEDTECH",
    model: "BioEnder",
    fullName: "BIOEDTECH BioEnder (Ender 3 modificada para bioimpressão)",
    technology: ["extrusion_pneumatic", "extrusion_FDM"],
    buildVolume: { x: 200, y: 200, z: 200, unit: "mm" },
    resolution_um: { xy: 100, z: 50 },
    maxSpeed_mm_s: 80,
    numHeads: 1,
    temperatureRange_C: { min: 4, max: 60 },
    hasBedHeating: true,
    hasUVcuring: false,
    pressureRange_kPa: { min: 0, max: 200 },
    connectionTypes: ["USB", "SD"],
    firmwareCompatibility: ["Marlin", "Klipper", "RepRap"],
    baud: 115200,
    nozzleDiameters_um: [200, 250, 330, 410, 510, 840, 1200],
    priceTier: "academic",
    description: "Adaptação nacional da Ender 3 (Creality) para bioimpressão; mesa 200×200 mm, firmware Marlin aberto, compatível com Pronterface e Cura. Excelente custo-benefício para laboratórios acadêmicos e uso didático.",
    typicalApplications: ["Ensino", "Research acadêmico", "Scaffolds FDM", "Hidrogéis pneumáticos"],
    notes: [
      "Firmware Marlin aberto: use Pronterface ou OctoPrint para envio de G-code",
      "Conexão USB-B padrão, baud 115200 por padrão",
      "Compatível com G-code padrão RepRap/Marlin",
      "Mesa aquecida até 110°C (útil para PCL/PLA)",
    ],
    icon: "🇧🇷",
  },
  {
    id: "octopus_3dbs",
    brand: "3D Biotechnology Solutions",
    model: "Octopus",
    fullName: "3DBS Octopus (Brasil)",
    technology: ["extrusion_pneumatic"],
    buildVolume: { x: 130, y: 90, z: 60, unit: "mm" },
    resolution_um: { xy: 10, z: 10 },
    maxSpeed_mm_s: 50,
    numHeads: 3,
    temperatureRange_C: { min: 4, max: 65 },
    hasBedHeating: true,
    hasUVcuring: true,
    pressureRange_kPa: { min: 0, max: 700 },
    connectionTypes: ["USB", "Wi-Fi"],
    firmwareCompatibility: ["Proprietary", "GCODE-standard"],
    baud: 250000,
    nozzleDiameters_um: [100, 200, 330, 410, 610, 840],
    priceTier: "research",
    description: "Bioimpressora brasileira com múltiplos cabeçotes e cura UV integrada",
    typicalApplications: ["Pesquisa multicelular", "Órgãos-em-chip", "Cartilagem"],
    icon: "🐙",
  },

  // ═══════════════════════════════════════════════════════════
  // CELLINK (BICO Group)
  // ═══════════════════════════════════════════════════════════
  {
    id: "cellink_biox",
    brand: "CELLINK",
    model: "BIO X",
    fullName: "CELLINK BIO X",
    technology: ["extrusion_pneumatic"],
    buildVolume: { x: 130, y: 90, z: 80, unit: "mm" },
    resolution_um: { xy: 1, z: 1 },
    maxSpeed_mm_s: 50,
    numHeads: 3,
    temperatureRange_C: { min: 4, max: 65 },
    hasBedHeating: true,
    hasUVcuring: true,
    pressureRange_kPa: { min: 0, max: 700 },
    connectionTypes: ["Wi-Fi", "Ethernet", "USB"],
    firmwareCompatibility: ["Proprietary"],
    baud: 115200,
    nozzleDiameters_um: [100, 200, 250, 330, 410, 610, 840, 1200],
    priceTier: "professional",
    description: "Bioimpressora líder de mercado com múltiplos printheads intercambiáveis (pneumático, térmico, fotossensível)",
    typicalApplications: ["Pele", "Cartilagem", "Órgãos-em-chip", "Pesquisa farmacêutica"],
    notes: ["Usa software DNA Studio (proprietário)", "G-code gerado pelo BIA pode ser enviado via .gcode export"],
    icon: "🔬",
  },
  {
    id: "cellink_inkredible",
    brand: "CELLINK",
    model: "INKREDIBLE+",
    fullName: "CELLINK INKREDIBLE+",
    technology: ["extrusion_pneumatic"],
    buildVolume: { x: 130, y: 80, z: 60, unit: "mm" },
    resolution_um: { xy: 10, z: 1 },
    maxSpeed_mm_s: 30,
    numHeads: 2,
    temperatureRange_C: { min: 4, max: 65 },
    hasBedHeating: false,
    hasUVcuring: true,
    pressureRange_kPa: { min: 0, max: 700 },
    connectionTypes: ["USB"],
    firmwareCompatibility: ["Proprietary"],
    baud: 115200,
    nozzleDiameters_um: [200, 250, 330, 410, 610, 840],
    priceTier: "research",
    description: "Entry-level da CELLINK, ideal para laboratórios iniciantes",
    typicalApplications: ["Hidrogéis simples", "Ensino", "Research inicial"],
    icon: "🧪",
  },

  // ═══════════════════════════════════════════════════════════
  // ALLEVI (3D Systems)
  // ═══════════════════════════════════════════════════════════
  {
    id: "allevi_2",
    brand: "Allevi",
    model: "Allevi 2",
    fullName: "Allevi 2 by 3D Systems",
    technology: ["extrusion_pneumatic"],
    buildVolume: { x: 90, y: 60, z: 130, unit: "mm" },
    resolution_um: { xy: 10, z: 10 },
    maxSpeed_mm_s: 40,
    numHeads: 2,
    temperatureRange_C: { min: 4, max: 160 },
    hasBedHeating: true,
    hasUVcuring: true,
    pressureRange_kPa: { min: 0, max: 700 },
    connectionTypes: ["USB", "Wi-Fi"],
    firmwareCompatibility: ["Proprietary"],
    baud: 115200,
    nozzleDiameters_um: [100, 200, 330, 410, 610, 840, 1200],
    priceTier: "professional",
    description: "Bioimpressora compacta com dois extrusores e cura UV",
    typicalApplications: ["Cartilagem", "Pele", "Research multicelular"],
    icon: "🧫",
  },
  {
    id: "allevi_3",
    brand: "Allevi",
    model: "Allevi 3",
    fullName: "Allevi 3 by 3D Systems",
    technology: ["extrusion_pneumatic", "extrusion_screw"],
    buildVolume: { x: 90, y: 60, z: 130, unit: "mm" },
    resolution_um: { xy: 10, z: 10 },
    maxSpeed_mm_s: 40,
    numHeads: 3,
    temperatureRange_C: { min: 4, max: 160 },
    hasBedHeating: true,
    hasUVcuring: true,
    pressureRange_kPa: { min: 0, max: 700 },
    connectionTypes: ["USB", "Wi-Fi"],
    firmwareCompatibility: ["Proprietary"],
    baud: 115200,
    nozzleDiameters_um: [100, 200, 330, 410, 610, 840, 1200],
    priceTier: "professional",
    description: "Três extrusores + screw drive para bioinks de alta viscosidade",
    typicalApplications: ["Vascular multicelular", "Órgãos complexos", "Osteocondral"],
    icon: "🧬",
  },

  // ═══════════════════════════════════════════════════════════
  // REGEMAT 3D
  // ═══════════════════════════════════════════════════════════
  {
    id: "regemat_bio_v1",
    brand: "REGEMAT 3D",
    model: "BIO V1",
    fullName: "REGEMAT 3D BIO V1",
    technology: ["extrusion_pneumatic", "extrusion_screw", "extrusion_FDM"],
    buildVolume: { x: 150, y: 150, z: 150, unit: "mm" },
    resolution_um: { xy: 10, z: 10 },
    maxSpeed_mm_s: 60,
    numHeads: 4,
    temperatureRange_C: { min: 4, max: 250 },
    hasBedHeating: true,
    hasUVcuring: true,
    pressureRange_kPa: { min: 0, max: 800 },
    connectionTypes: ["USB", "Wi-Fi"],
    firmwareCompatibility: ["Proprietary", "GCODE-standard"],
    baud: 115200,
    nozzleDiameters_um: [100, 200, 330, 410, 610, 840, 1200],
    priceTier: "industrial",
    description: "Bioimpressora versátil com 4 extrusores, cura UV, controle de ambiente e termoplásticos",
    typicalApplications: ["Ortopedia", "Cartilagem", "Osso", "Multi-material"],
    icon: "🇪🇸",
  },

  // ═══════════════════════════════════════════════════════════
  // ENVISIONTEC (EnvisionTEC / Desktop Metal)
  // ═══════════════════════════════════════════════════════════
  {
    id: "envisiontec_3dbioplotter",
    brand: "EnvisionTEC",
    model: "3D-Bioplotter",
    fullName: "EnvisionTEC 3D-Bioplotter Developer Series",
    technology: ["extrusion_pneumatic", "extrusion_piston"],
    buildVolume: { x: 150, y: 150, z: 140, unit: "mm" },
    resolution_um: { xy: 50, z: 100 },
    maxSpeed_mm_s: 60,
    numHeads: 5,
    temperatureRange_C: { min: 0, max: 250 },
    hasBedHeating: true,
    hasUVcuring: true,
    pressureRange_kPa: { min: 0, max: 900 },
    connectionTypes: ["USB", "Ethernet"],
    firmwareCompatibility: ["Proprietary"],
    baud: 115200,
    nozzleDiameters_um: [200, 250, 330, 410, 610, 840, 1200, 1500],
    priceTier: "industrial",
    description: "Referência em bioprinting híbrido; suporta hidrogéis + termoplásticos (PCL) + cerâmicas simultaneamente",
    typicalApplications: ["Osso", "Cartilagem", "Multi-material complexo", "Research GMP"],
    icon: "🏭",
  },
  {
    id: "envisiontec_perfactory",
    brand: "EnvisionTEC",
    model: "Perfactory",
    fullName: "EnvisionTEC Perfactory P4K (DLP)",
    technology: ["DLP"],
    buildVolume: { x: 96, y: 54, z: 180, unit: "mm" },
    resolution_um: { xy: 16, z: 25 },
    maxSpeed_mm_s: 0,
    numHeads: 1,
    temperatureRange_C: { min: 20, max: 45 },
    hasBedHeating: false,
    hasUVcuring: true,
    connectionTypes: ["USB", "Ethernet"],
    firmwareCompatibility: ["Proprietary"],
    baud: 115200,
    nozzleDiameters_um: [],
    priceTier: "industrial",
    description: "Bioimpressora DLP de alta resolução (16 µm XY) para estruturas microfluídicas complexas",
    typicalApplications: ["Vasculatura complexa", "Microfluídica", "Lentes", "Pesquisa avançada"],
    icon: "💡",
  },

  // ═══════════════════════════════════════════════════════════
  // FDM ADAPTÁVEIS (Open source)
  // ═══════════════════════════════════════════════════════════
  {
    id: "ender3_modified",
    brand: "Creality",
    model: "Ender 3 (modificada)",
    fullName: "Creality Ender 3 com extrusor pneumático (DIY)",
    technology: ["extrusion_FDM", "extrusion_pneumatic"],
    buildVolume: { x: 220, y: 220, z: 250, unit: "mm" },
    resolution_um: { xy: 100, z: 50 },
    maxSpeed_mm_s: 100,
    numHeads: 1,
    temperatureRange_C: { min: 4, max: 60 },
    hasBedHeating: true,
    hasUVcuring: false,
    pressureRange_kPa: { min: 0, max: 200 },
    connectionTypes: ["USB", "SD"],
    firmwareCompatibility: ["Marlin", "Klipper", "RepRap"],
    baud: 115200,
    nozzleDiameters_um: [250, 330, 410, 510, 840, 1200],
    priceTier: "academic",
    description: "Ender 3 modificada com cabeçote pneumático; solução DIY popular em laboratórios brasileiros",
    typicalApplications: ["Ensino", "Research baixo custo", "Hidrogéis simples"],
    notes: ["Firmware Marlin 2.x", "100% compatível com Pronterface", "G-code padrão RepRap"],
    icon: "🛠️",
  },
  {
    id: "prusa_i3_mk3_bio",
    brand: "Prusa Research",
    model: "i3 MK3S (bio-mod)",
    fullName: "Prusa i3 MK3S modificada",
    technology: ["extrusion_FDM", "extrusion_pneumatic"],
    buildVolume: { x: 250, y: 210, z: 210, unit: "mm" },
    resolution_um: { xy: 50, z: 50 },
    maxSpeed_mm_s: 200,
    numHeads: 1,
    temperatureRange_C: { min: 4, max: 60 },
    hasBedHeating: true,
    hasUVcuring: false,
    pressureRange_kPa: { min: 0, max: 200 },
    connectionTypes: ["USB", "SD"],
    firmwareCompatibility: ["Marlin", "Klipper", "RepRap"],
    baud: 115200,
    nozzleDiameters_um: [250, 330, 410, 510, 840],
    priceTier: "academic",
    description: "Prusa MK3 adaptada; firmware aberto e alta precisão",
    typicalApplications: ["Research", "Ensino avançado"],
    notes: ["Pronterface compatível", "OctoPrint nativo"],
    icon: "🟠",
  },
  {
    id: "custom_generic",
    brand: "Genérica / DIY",
    model: "Custom RepRap",
    fullName: "Impressora RepRap genérica (G-code padrão)",
    technology: ["extrusion_FDM", "extrusion_pneumatic"],
    buildVolume: { x: 200, y: 200, z: 200, unit: "mm" },
    resolution_um: { xy: 100, z: 100 },
    maxSpeed_mm_s: 60,
    numHeads: 1,
    temperatureRange_C: { min: 4, max: 80 },
    hasBedHeating: true,
    hasUVcuring: false,
    connectionTypes: ["USB", "SD"],
    firmwareCompatibility: ["Marlin", "RepRap", "Klipper"],
    baud: 115200,
    nozzleDiameters_um: [200, 330, 410, 510, 840],
    priceTier: "academic",
    description: "Qualquer impressora RepRap/Marlin com adaptações pneumáticas",
    typicalApplications: ["DIY", "Ensino"],
    icon: "⚙️",
  },
]

export function getBioprinterById(id: string): BioprinterSpec | undefined {
  return BIOPRINTERS.find((b) => b.id === id)
}

// Firmware "aberto" = compatível com conexão USB Web Serial + Pronterface + OctoPrint
export function supportsWebSerial(printer: BioprinterSpec): boolean {
  return (
    printer.connectionTypes.includes("USB") &&
    (printer.firmwareCompatibility.includes("Marlin") ||
      printer.firmwareCompatibility.includes("Klipper") ||
      printer.firmwareCompatibility.includes("RepRap") ||
      printer.firmwareCompatibility.includes("GCODE-standard"))
  )
}
