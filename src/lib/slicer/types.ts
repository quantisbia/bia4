/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R15 · BioSlicer — Tipos do fatiador de bioimpressão
 *  ─────────────────────────────────────────────────────────────────────
 *  Fatiador REAL de malha STL para bioimpressão por extrusão (seringa /
 *  pneumático), estilo Ender/BioEnder (Marlin) e Klipper.
 *
 *  Diferenças ontológicas vs FDM clássico:
 *   · Extrusão volumétrica (µL) — o "E" do G-code é mm de ÊMBOLO, não
 *     mm de filamento. Convertemos via área interna da seringa.
 *   · Hidrogéis têm yield stress baixo → camadas ≈ 80% do bico, pouca
 *     sobreposição, velocidades 2-15 mm/s, retração pequena ou zero.
 *   · NUNCA G28 (home) — a origem é definida pelo usuário com G92 sobre
 *     o alvo biológico (poço, lâmina, Petri).
 *   · Células vivas: tempo total e shear stress são restrições reais.
 *
 *  Lib PURA (zero DOM) — roda em Node (testes) e no browser.
 * ═══════════════════════════════════════════════════════════════════════
 */

export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }
/** Polígono fechado (último ponto NÃO repete o primeiro). */
export type Polygon = Vec2[]
/** Caminho aberto (polilinha). */
export type Path = Vec2[]

export interface BBox2 { minX: number; minY: number; maxX: number; maxY: number }
export interface BBox3 extends BBox2 { minZ: number; maxZ: number }

/** Malha triangular "flat": vertices.length = triangleCount × 9 */
export interface TriMesh {
  vertices: Float32Array
  triangleCount: number
  bbox: BBox3
  name?: string
}

export type ExtruderKind =
  | "syringe_stepper"   // seringa com êmbolo acionado por motor de passo (BioEnder, Enderstruder, FRESH)
  | "pneumatic"         // pressão de ar (CELLINK/Allevi) — E vira "liga/desliga" + pressão em kPa
  | "filament_eq"       // emula filamento 1.75 mm

export interface SyringeSpec {
  volume_mL: number
  /** Diâmetro INTERNO do barril (mm). BD 1 mL ≈ 4.78, 3 mL ≈ 8.66, 5 mL ≈ 12.06, 10 mL ≈ 14.5, 20 mL ≈ 19.13 */
  innerDiameter_mm: number
}

export interface ExtrusionModel {
  kind: ExtruderKind
  syringe?: SyringeSpec
  /** Multiplicador de fluxo. 1.0 = teoria. Hidrogéis: 0.6–1.2 */
  flowMultiplier: number
  pressure_kPa?: number
  filamentDiameter_mm?: number
  /** µL extra ao INICIAR trecho (prime) e µL a recuar ao TERMINAR (retract). */
  primeVolume_uL: number
  retractVolume_uL: number
  /** Velocidade de retração/prime (mm/s de êmbolo). */
  retractSpeed_mms: number
  /** Dwell após prime (ms). */
  primeDwell_ms: number
  /**
   * R25 · Pré-carga no START (µL): enche agulha + luer (dead volume) e empurra
   * um extra para o filamento aparecer na ponta ANTES do primeiro cordão.
   * undefined → calculado por flow-science (dead volume + extra da classe).
   * 0 → desliga (já pré-carregado manualmente no Host).
   */
  startPrime_uL?: number
  /** R25 · Classe da biotinta usada para o fator de extrusão (informativo no cabeçalho). */
  bioinkClass?: string
}

export type InfillPattern =
  | "rectilinear"   // linhas paralelas, ângulo alterna por camada (woodpile 0/90)
  | "grid"          // 0+90 na MESMA camada
  | "triangles"     // 0/60/120 na mesma camada
  | "honeycomb"     // hexagonal
  | "concentric"    // anéis internos
  | "gyroid"        // aproximação 2D do gyroid
  | "zigzag"        // rectilinear conectado → caminho contínuo (menos gotas)
  | "waves"         // R20-B: linhas senoidais paralelas (ondas)
  | "none"
  // R20-B · aba Avançado — cada um gera o que o nome diz
  | "schwarz_p"     // TPMS Schwarz P (iso-curvas por camada)
  | "diamond"       // TPMS Schwarz D
  | "voronoi"       // células de Voronoi 2D (trabecular)
  | "perlin"        // iso-curvas de ruído (orgânico)
  | "gradient"      // gradiente radial de espaçamento

export type WallOrder = "outside_in" | "inside_out"
export type SeamPosition = "nearest" | "aligned" | "random" | "rear"

export interface SliceParams {
  layerHeight_mm: number
  firstLayerHeight_mm: number
  nozzleDiameter_mm: number
  /** Largura de linha depositada. Hidrogel: ≈ 1.0–1.3 × bico (die swell). */
  lineWidth_mm: number

  wallCount: number
  wallOrder: WallOrder
  seam: SeamPosition
  /** Sobreposição infill↔parede interna (fração da linha). 0.1–0.3 */
  infillOverlap: number

  infillPattern: InfillPattern
  /** 0–100 (%) */
  infillDensity: number
  infillAngle_deg: number
  /** Rotaciona o infill a cada camada (90 → woodpile 0/90). */
  infillAngleStep_deg: number
  /** Espaçamento explícito centro-a-centro (mm). Sobrepõe infillDensity. */
  strandSpacing_mm?: number
  /** Infill a cada N camadas (0 = desligado). */
  infillEveryNLayers: number

  bottomLayers: number
  topLayers: number

  speedPerimeter_mms: number
  speedInfill_mms: number
  speedFirstLayer_mms: number
  speedTravel_mms: number
  speedZ_mms: number

  zHop_mm: number
  retractMinTravel_mm: number
  avoidCrossing: boolean

  skirtLoops: number
  skirtDistance_mm: number
  purgeLine_mm: number

  cartridgeTemp_C: number | null
  bedTemp_C: number | null
  waitForTemps: boolean

  originX_mm: number
  originY_mm: number
  /** Altura do bico sobre o substrato no instante do G92 (0 = encostado). */
  zOffset_mm: number
  scale: number
  rotationZ_deg: number

  hasCells: boolean
  layerPause_s: number
  customStart: string
  customEnd: string
  customLayerChange: string

  firmware: "marlin" | "klipper" | "reprap"
  verboseComments: boolean
}

export interface SliceProfile {
  id: string
  name: string
  description: string
  tier: "basic" | "advanced"
  params: SliceParams
  extrusion: ExtrusionModel
  tips: string[]
  references?: string[]
}

export type PathRole = "wall_outer" | "wall_inner" | "infill" | "skirt" | "purge" | "bottom" | "top" | "support"

export interface ToolPath {
  role: PathRole
  points: Path
  closed: boolean
  speed_mms: number
  lineWidth_mm: number
  /** R23: cabeçote explícito (Draw & Print / grupos de camada). Sobrepõe o mapeamento papel→ferramenta. */
  tool?: number
}

export interface SlicedLayer {
  index: number
  z_mm: number
  height_mm: number
  /** Contornos (outer CCW, holes CW) em coordenadas do bed. */
  contours: Polygon[]
  paths: ToolPath[]
}

export interface SliceStats {
  layerCount: number
  totalPathLength_mm: number
  extrudeLength_mm: number
  travelLength_mm: number
  volume_uL: number
  /** mm de êmbolo (ou filamento) total */
  plungerTravel_mm: number
  /** R20: µL por cabeçote, trocas de ferramenta e nº de cópias (poços) */
  volumeByTool_uL?: Record<number, number>
  toolChanges?: number
  wells?: number
  estimatedTime_s: number
  avgFlow_uLs: number
  wallShear_Pa: number | null
  viability_pct: number | null
  extrusionStarts: number
}

export interface SliceWarning {
  level: "info" | "warn" | "error"
  code: string
  message: string
  hint?: string
}

export interface SliceResult {
  layers: SlicedLayer[]
  gcode: string
  stats: SliceStats
  warnings: SliceWarning[]
  profileId: string
  params: SliceParams
  extrusion: ExtrusionModel
  meshBBox: BBox3
}
