/**
 * BIA v4.2 — Motor GCODE — Core Types
 * Tipos fundamentais do motor de bioimpressão
 */

// ═══════════════════════════════════════════════════════════════
// TIPOS GEOMÉTRICOS BÁSICOS
// ═══════════════════════════════════════════════════════════════
export type Point2D = { x: number; y: number }
export type Point3D = { x: number; y: number; z: number }
export type Segment2D = { a: Point2D; b: Point2D }
export type Polygon2D = Point2D[]
export type BBox2D = { minX: number; minY: number; maxX: number; maxY: number }
export type BBox3D = { min: Point3D; max: Point3D }

// ═══════════════════════════════════════════════════════════════
// MOVIMENTOS E TOOL-PATH
// ═══════════════════════════════════════════════════════════════
export type MoveType =
  | "travel"        // G0 — movimento rápido sem extrusão
  | "extrude"       // G1 — movimento com deposição de bioink
  | "retract"       // G1 E- (retração)
  | "prime"         // G1 E+ (priming)
  | "zhop"          // sobe Z no travel
  | "pause"         // M0 / M25 — pausa
  | "uv"            // M42/M106 — acionar UV (crosslink)
  | "wait"          // G4 — dwell

export interface Move {
  type: MoveType
  x?: number
  y?: number
  z?: number
  e?: number        // extrusão volumétrica (µL)
  f?: number        // feedrate (mm/min)
  comment?: string
  // metadados para analytics
  wellId?: string   // poço onde está ocorrendo
  layer?: number
  tool?: number     // head index (bioink multi-head)
}

export interface Layer {
  z: number                // altura da camada (mm)
  thickness: number        // espessura (mm)
  perimeters: Polygon2D[]  // contornos (walls)
  infillPaths: Segment2D[] // caminhos de preenchimento
  wellId?: string
  tool?: number
}

// ═══════════════════════════════════════════════════════════════
// BIOIMPRESSORA (PROFILE)
// ═══════════════════════════════════════════════════════════════
export type BioprinterFlavor = "marlin" | "klipper" | "reprap" | "cellink" | "allevi" | "regemat" | "envisiontec"
export type ExtrusionMode = "volumetric_ul" | "filament_mm" | "pressure_kpa"

export interface BioprinterProfile {
  id: string
  name: string
  manufacturer: string
  flavor: BioprinterFlavor
  heads: number              // número de cabeçotes
  buildVolume: BBox3D        // mm
  extrusionMode: ExtrusionMode
  // Limites físicos
  maxFeedrate: { xy: number; z: number; e: number }  // mm/min
  minFeedrate: { xy: number; z: number; e: number }
  maxAcceleration: number    // mm/s²
  minNozzleUm: number
  maxNozzleUm: number
  // Recursos
  hasHeatedBed: boolean
  hasUV: boolean             // crosslinking UV embutido
  hasCamera: boolean
  hasAutoLeveling: boolean
  hasWellPlateSupport: boolean
  // Códigos especiais (M-codes específicos da marca)
  mcodes: {
    startPrint?: string      // ex "M710" (Cellink start)
    endPrint?: string
    pressureSet?: string     // ex "M700 S{kpa}"
    uvOn?: string            // ex "M106 P1 S255"
    uvOff?: string           // ex "M107 P1"
    pauseForBioink?: string
    wipeTower?: string
  }
  // Origem da placa SBS (mm no referencial da impressora)
  sbsOriginOffset?: Point3D
  notes: string[]
}

// ═══════════════════════════════════════════════════════════════
// BIOINK
// ═══════════════════════════════════════════════════════════════
export interface Bioink {
  id: string
  material: string           // GelMA, Alginate, PCL, etc
  concentration: number      // % w/v
  hasCells: boolean
  cellDensity?: number       // x10^6 cel/mL
  viscosity_cP?: number
  crosslinker?: string
  crosslinkerConc?: string
  temperature_c: number
  pressure_kpa: number
  shearStressMax_Pa?: number // limite para viabilidade
  // Parâmetros de extrusão
  nozzleDiameter_um: number
  flowMultiplier: number     // ajuste fino (0.8-1.2)
  retraction_mm: number
  printSpeed_mms: number
  travelSpeed_mms: number
}

// ═══════════════════════════════════════════════════════════════
// JOB DE IMPRESSÃO COMPLETO
// ═══════════════════════════════════════════════════════════════
export interface PrintJob {
  id: string
  name: string
  bioprinter: BioprinterProfile
  bioink: Bioink
  layerHeight: number        // mm
  skirtLoops: number
  walls: number
  infillPercent: number
  infillAlgorithm: InfillAlgorithm
  macroPorosity?: PorosityConfig
  microPorosity?: PorosityConfig
  // Poços
  wellPlate?: WellPlateConfig
  // Metadata
  tissue: string
  application: string
  estimatedTime_min?: number
  estimatedVolume_uL?: number
  estimatedViability_pct?: number
}

// ═══════════════════════════════════════════════════════════════
// INFILL — ESTRATÉGIAS
// ═══════════════════════════════════════════════════════════════
export type InfillAlgorithm =
  | "gyroid_tpms"
  | "schwarz_p"
  | "diamond_tpms"
  | "honeycomb"
  | "gradient"
  | "voronoi_2d"
  | "voronoi_3d"
  | "perlin_noise"
  | "l_system"
  | "linear"
  | "concentric"
  | "rectilinear"

export interface PorosityConfig {
  density: number            // 0.0–1.0 (fração de vazio)
  poreSize_um: number        // tamanho médio do poro
  seed?: number              // para algoritmos aleatórios (reprodutibilidade)
}

// ═══════════════════════════════════════════════════════════════
// WELL PLATES (PLACAS DE CULTURA)
// ═══════════════════════════════════════════════════════════════
export type WellPlateFormat = 6 | 12 | 24 | 48 | 96 | 384

export type ReplicationMode =
  | "same"       // mesmo design em todos os poços selecionados
  | "different"  // designs diferentes por poço
  | "gradient"   // variação paramétrica (ex: concentração crescente)

export interface WellPlateConfig {
  format: WellPlateFormat
  selectedWells: string[]    // ["A1","A2","B3",...]
  replicationMode: ReplicationMode
  perWellDesigns?: Record<string, Partial<PrintJob>>  // se mode=different
  gradientParam?: {          // se mode=gradient
    paramPath: string        // ex "bioink.concentration"
    startValue: number
    endValue: number
  }
  // Configurações operacionais
  zHopBetweenWells_mm: number
  pauseBetweenWells_s: number
  purgeVolume_uL: number     // purga ao trocar poço
  wipeTowerEnabled: boolean
}

export interface WellPlateSpec {
  format: WellPlateFormat
  rows: number
  cols: number
  rowLabels: string[]        // ["A","B","C"...]
  wellDiameter_mm: number    // diâmetro interno do poço
  wellDepth_mm: number
  wellSpacing_mm: number     // pitch (distância entre centros)
  offsetA1: Point2D          // posição do centro do A1 no referencial da placa
  plateSize: { width: number; height: number; height_mm: number } // dimensões da placa
  volumeMin_uL: number
  volumeWorking_uL: number
  volumeMax_uL: number
  standard: "SBS" | "ANSI" | "custom"
  notes: string[]
}

// ═══════════════════════════════════════════════════════════════
// RESULTADO DE GERAÇÃO
// ═══════════════════════════════════════════════════════════════
export interface GCodeResult {
  gcode: string              // texto G-code completo
  moves: Move[]              // lista estruturada
  totalLines: number
  estimatedTime_min: number
  bioinkVolume_uL: number
  totalDistance_mm: number
  layerCount: number
  wellsUsed: string[]
  warnings: string[]
  stats: {
    travelDistance_mm: number
    extrudeDistance_mm: number
    avgShearStress_Pa?: number
    peakShearStress_Pa?: number
    viabilityEstimate_pct?: number
  }
}
