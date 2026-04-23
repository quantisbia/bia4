/**
 * BIA v4.2 — DLP/SLA Emitter
 *
 * Emissor de G-code para bioimpressoras DLP/SLA (ex: EnvisionTEC Perfactory P4K).
 *
 * Diferença fundamental vs extrusão:
 *   - NÃO HÁ extrusor (sem G1 E)
 *   - Cada camada é uma IMAGEM projetada (bitmap) + tempo de exposição
 *   - Sequência típica por camada:
 *        1. Tilt do vat (separar camada anterior da base)
 *        2. Subir build plate (dist > layer height)
 *        3. Descer build plate (layer height exato)
 *        4. Settling delay (dwell, bolhas dissiparem)
 *        5. Carregar imagem da camada (bitmap XY)
 *        6. Projetar luz UV (405/385nm) por tExposure segundos
 *        7. Desligar projetor
 *   - Tempo total de impressão = N_layers × (t_mech + t_exposure)
 *   - Resolução XY limitada pelo pixel size do projetor (20-80 µm típico)
 *   - Resolução Z = layer height (10-100 µm)
 *
 * Esta implementação gera um "pseudo G-code" + metadados de imagem.
 * Para impressão real, cada camada precisa de uma imagem bitmap PNG
 * (gerada separadamente por rasterização dos toolpaths/slices).
 *
 * Referências:
 *   - EnvisionTEC Perfactory Technical Manual (2023)
 *   - Grigoryan B et al. (2019) Science 364, 458-464 (SLA tissue engineering)
 *   - Lim KS et al. (2020) Adv. Healthc. Mater. 9, 1901792 (GelMA DLP)
 */

import type {
  BioprinterProfile,
  Bioink,
  BBox2D,
  Segment2D,
  Polygon2D,
} from "./types"

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════
export interface DLPLayer {
  index: number
  z_mm: number
  thickness_mm: number
  exposureTime_s: number
  uvIntensity_pct: number        // 0-100
  // Geometria da camada — usada para rasterizar a máscara
  perimeters: Polygon2D[]
  infillSegments: Segment2D[]
  // ID da imagem bitmap que será carregada no projetor
  imageId: string
}

export interface DLPJobConfig {
  bioprinter: BioprinterProfile
  bioink: Bioink
  layerHeight_mm: number
  // Parâmetros críticos de exposição
  exposureTime_s: number        // por camada (2-15s típico GelMA)
  uvIntensity_pct: number       // 0-100
  initialLayers: number         // primeiras camadas com exposição extra (aderência)
  initialExposureMult: number   // multiplicador (ex 2.5x)
  // Mecânica entre camadas
  liftDistance_mm: number       // subida para desprender (3-8 mm típico)
  liftSpeed_mmmin: number       // 60-300 mm/min
  retractSpeed_mmmin: number    // descida (50-200 mm/min)
  settlingTime_s: number        // dwell após mover (1-5s)
  tiltAngle_deg: number         // peel tilt (2-5°)
  // Modo
  continuousMode?: boolean      // CLIP-style (se hardware suportar)
  // Cura final
  postCureUV_s?: number
}

export interface DLPJobResult {
  gcode: string                  // pseudo-G-code com comandos DLP
  layers: DLPLayer[]
  totalLayers: number
  estimatedTime_min: number
  bioinkVolume_mL: number        // volume de resina no vat necessário
  totalExposureEnergy_mJ: number // dose acumulada (biocompatibilidade)
  warnings: string[]
  notes: string[]
}

// ═══════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════
export class DLPEmitter {
  private lines: string[] = []
  private layers: DLPLayer[] = []
  private cfg: DLPJobConfig
  private totalTime_s = 0
  private totalEnergy_mJ = 0
  private warnings: string[] = []
  private notes: string[] = []

  constructor(config: DLPJobConfig) {
    this.cfg = config
    this.validateConfig()
  }

  private validateConfig(): void {
    const bp = this.cfg.bioprinter
    if (bp.technology !== "dlp_sla") {
      throw new Error(
        `DLPEmitter requer bioimpressora DLP/SLA, recebido: ${bp.technology}`,
      )
    }
    if (!bp.dlp) {
      throw new Error("BioprinterProfile DLP sem parâmetros 'dlp' definidos")
    }
    const lh_um = this.cfg.layerHeight_mm * 1000
    if (lh_um < bp.dlp.minLayerHeight_um) {
      this.warnings.push(
        `layerHeight ${lh_um}µm < mínimo do hardware (${bp.dlp.minLayerHeight_um}µm)`,
      )
    }
    if (lh_um > bp.dlp.maxLayerHeight_um) {
      this.warnings.push(
        `layerHeight ${lh_um}µm > máximo do hardware (${bp.dlp.maxLayerHeight_um}µm)`,
      )
    }
    if (this.cfg.exposureTime_s < bp.dlp.minExposureTime_s) {
      this.warnings.push(
        `exposureTime ${this.cfg.exposureTime_s}s < mínimo (${bp.dlp.minExposureTime_s}s)`,
      )
    }
    if (!bp.dlp.supportedResins.some(r =>
      r.toLowerCase().includes(this.cfg.bioink.material.toLowerCase()),
    )) {
      this.warnings.push(
        `Bioink "${this.cfg.bioink.material}" não listado nas resinas suportadas. ` +
        `Verifique fotoiniciador e biocompatibilidade.`,
      )
    }
  }

  // ─────────────────────────────────────────────────────────────
  // COMENTÁRIO E LINHA
  // ─────────────────────────────────────────────────────────────
  comment(text: string): this {
    this.lines.push(`; ${text}`)
    return this
  }

  raw(line: string): this {
    this.lines.push(line)
    return this
  }

  // ─────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────
  emitHeader(jobName: string, tissue: string, bbox: BBox2D): this {
    const bp = this.cfg.bioprinter
    const dlp = bp.dlp!
    this.comment("═══════════════════════════════════════════════════════")
    this.comment(`BIA v4.2 — DLP/SLA BIOPRINT`)
    this.comment(`Job: ${jobName}`)
    this.comment(`Tecido: ${tissue}`)
    this.comment(`Impressora: ${bp.manufacturer} ${bp.name}`)
    this.comment(`Tecnologia: DLP/SLA ${dlp.projector} — ${dlp.pixelSize_um}µm/px`)
    this.comment(`Resolução XY: ${dlp.resolution_px.x}×${dlp.resolution_px.y} px`)
    this.comment(`Bioink: ${this.cfg.bioink.material} ${this.cfg.bioink.concentration}%`)
    this.comment(`Crosslinker: ${this.cfg.bioink.crosslinker ?? "fotoiniciador incluso"}`)
    this.comment(`Layer height: ${(this.cfg.layerHeight_mm * 1000).toFixed(1)}µm`)
    this.comment(`Exposição padrão: ${this.cfg.exposureTime_s}s @ ${this.cfg.uvIntensity_pct}%`)
    this.comment(`Initial layers: ${this.cfg.initialLayers} × ${this.cfg.initialExposureMult}`)
    this.comment(`BBox XY: (${bbox.minX.toFixed(1)}, ${bbox.minY.toFixed(1)}) → ` +
                 `(${bbox.maxX.toFixed(1)}, ${bbox.maxY.toFixed(1)}) mm`)
    this.comment(`Data: ${new Date().toISOString()}`)
    this.comment("═══════════════════════════════════════════════════════")
    this.comment("")
    this.comment("─── INIT SEQUENCE ──────────────────────────────────────")

    const startCmd = bp.mcodes.startPrint ?? "M110 N0"
    this.raw(startCmd + "                     ; DLP init")
    this.raw("G21                              ; units: mm")
    this.raw("G90                              ; absolute positioning")
    this.raw("M17                              ; enable motors")
    this.raw("G28 Z                            ; home Z axis")
    this.raw("G1 Z5 F300                       ; park Z above vat")
    this.comment("")
    this.comment("─── VAT PREPARATION ────────────────────────────────────")
    this.raw("M3 S0                            ; reset vat tilt")
    this.raw("G4 P5000                         ; wait 5s for resin settle")
    this.comment("")
    return this
  }

  // ─────────────────────────────────────────────────────────────
  // CAMADA
  // ─────────────────────────────────────────────────────────────
  emitLayer(layer: {
    index: number
    z_mm: number
    perimeters: Polygon2D[]
    infillSegments: Segment2D[]
  }): this {
    const isInitial = layer.index < this.cfg.initialLayers
    const exposureTime = isInitial
      ? this.cfg.exposureTime_s * this.cfg.initialExposureMult
      : this.cfg.exposureTime_s
    const exposureMs = Math.round(exposureTime * 1000)

    this.comment(`─── LAYER ${layer.index} @ Z=${layer.z_mm.toFixed(3)}mm ─────`)
    if (isInitial) {
      this.comment(`(initial layer — ${this.cfg.initialExposureMult}× exposure)`)
    }

    // 1. Tilt do vat (peel da camada anterior)
    if (layer.index > 0) {
      const vatTiltCmd = this.cfg.bioprinter.mcodes.vatTilt
        ?? "M3 S{angle}"
      this.raw(vatTiltCmd.replace("{angle}", String(this.cfg.tiltAngle_deg)) +
               "              ; tilt vat (peel)")
      this.raw(`G4 P500                          ; wait 0.5s for peel`)
      this.raw("M3 S0                            ; vat return")
    }

    // 2. Subida do build plate (afastar para permitir reposição de resina)
    if (layer.index > 0) {
      this.raw(`G1 Z${(layer.z_mm + this.cfg.liftDistance_mm).toFixed(3)} ` +
               `F${this.cfg.liftSpeed_mmmin}   ; lift for resin refill`)
      this.raw(`G4 P${Math.round(this.cfg.settlingTime_s * 1000)}                         ; settle`)
    }

    // 3. Descer para Z da camada atual (precise)
    this.raw(`G1 Z${layer.z_mm.toFixed(3)} F${this.cfg.retractSpeed_mmmin}` +
             `              ; descend to layer Z`)
    this.raw(`G4 P${Math.round(this.cfg.settlingTime_s * 500)}                         ; pre-expose dwell`)

    // 4. Projetar imagem + expor
    const imageId = `layer_${String(layer.index).padStart(5, "0")}.png`
    const projectCmd = this.cfg.bioprinter.mcodes.projectImage
      ?? "PROJECT S{intensity}"
    this.comment(`IMAGE: ${imageId}  (${layer.perimeters.length} perimeters, ` +
                 `${layer.infillSegments.length} infill segs)`)
    this.raw(`LOAD_IMAGE "${imageId}"                ; load bitmap`)
    this.raw(projectCmd.replace("{intensity}", String(this.cfg.uvIntensity_pct)) +
             `                  ; UV ON @ ${this.cfg.uvIntensity_pct}%`)

    const dwellCmd = this.cfg.bioprinter.mcodes.layerExposure ?? "G4 P{ms}"
    this.raw(dwellCmd.replace("{ms}", String(exposureMs)) +
             `                       ; expose ${exposureTime.toFixed(2)}s`)

    this.raw(`PROJECT S0                        ; UV OFF`)
    this.raw(`G4 P100                          ; post-expose dwell`)
    this.comment("")

    // Contabilidade
    this.totalTime_s += exposureTime + this.cfg.settlingTime_s * 1.5 +
                        this.cfg.liftDistance_mm / this.cfg.liftSpeed_mmmin * 60 * 2 + 1
    // Energia estimada: intensity × tempo × área de build
    const dlp = this.cfg.bioprinter.dlp!
    const areaBuild_cm2 = (dlp.buildAreaMax_mm.x * dlp.buildAreaMax_mm.y) / 100
    // Intensidade típica Perfactory 50% ~ 8 mW/cm² @ 385nm
    const intensity_mWcm2 = 16 * (this.cfg.uvIntensity_pct / 100)
    this.totalEnergy_mJ += intensity_mWcm2 * exposureTime * areaBuild_cm2

    // Registrar camada estruturada
    this.layers.push({
      index: layer.index,
      z_mm: layer.z_mm,
      thickness_mm: this.cfg.layerHeight_mm,
      exposureTime_s: exposureTime,
      uvIntensity_pct: this.cfg.uvIntensity_pct,
      perimeters: layer.perimeters,
      infillSegments: layer.infillSegments,
      imageId,
    })
    return this
  }

  // ─────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────
  emitFooter(): this {
    this.comment("─── PRINT END ──────────────────────────────────────────")
    this.raw("PROJECT S0                       ; ensure UV off")
    this.raw("G1 Z80 F300                      ; lift build plate out of vat")
    this.raw("M3 S0                            ; vat neutral")
    this.raw("G4 P3000                         ; drip resin 3s")

    if (this.cfg.postCureUV_s && this.cfg.postCureUV_s > 0) {
      this.comment("")
      this.comment("─── POST-CURE ──────────────────────────────────────────")
      this.raw(`PROJECT S100                     ; full UV intensity`)
      this.raw(`G4 P${this.cfg.postCureUV_s * 1000}                     ` +
               `; post-cure ${this.cfg.postCureUV_s}s`)
      this.raw(`PROJECT S0`)
      this.totalTime_s += this.cfg.postCureUV_s
    }

    const endCmd = this.cfg.bioprinter.mcodes.endPrint ?? "M84"
    this.raw(endCmd + "                              ; motors off")
    this.comment("BIA v4.2 — End of DLP/SLA print")
    return this
  }

  // ─────────────────────────────────────────────────────────────
  // COMPILAR
  // ─────────────────────────────────────────────────────────────
  compile(): DLPJobResult {
    const gcode = this.lines.join("\n")
    const totalLayers = this.layers.length

    // Volume de resina estimado:
    //   área do vat × (altura total + folga de 3 mm) × densidade fotopolímero ~1.1
    const dlp = this.cfg.bioprinter.dlp!
    const vatArea = (dlp.buildAreaMax_mm.x * dlp.buildAreaMax_mm.y)  // mm²
    const totalHeight = totalLayers * this.cfg.layerHeight_mm
    const volumeNeeded_mL = (vatArea * (totalHeight + 3)) / 1000  // mm³ → mL

    this.notes.push(
      `Tecnologia: DLP/SLA ${dlp.projector}`,
      `Total de camadas: ${totalLayers}`,
      `Tempo estimado: ${(this.totalTime_s / 60).toFixed(1)} min`,
      `Dose UV acumulada: ${this.totalEnergy_mJ.toFixed(1)} mJ`,
      `Volume de resina necessário (~): ${volumeNeeded_mL.toFixed(1)} mL`,
      `Resolução XY: ${dlp.pixelSize_um} µm/pixel`,
      `Imagens necessárias: ${totalLayers} × bitmap PNG`,
    )
    if (this.totalEnergy_mJ > 5000) {
      this.warnings.push(
        `Dose UV acumulada (${this.totalEnergy_mJ.toFixed(0)} mJ) — ` +
        `verificar viabilidade celular e fototoxicidade`,
      )
    }

    return {
      gcode,
      layers: this.layers,
      totalLayers,
      estimatedTime_min: this.totalTime_s / 60,
      bioinkVolume_mL: volumeNeeded_mL,
      totalExposureEnergy_mJ: this.totalEnergy_mJ,
      warnings: this.warnings,
      notes: this.notes,
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Recomenda parâmetros DLP baseado em bioink e tecido.
 *
 * Tempo de exposição calibrado para GelMA + LAP 0.05%:
 *   - 10% GelMA: 3-5s @ 50% intensity (8 mW/cm²)
 *   - 7.5% GelMA: 5-8s @ 50%
 *   - 5% GelMA: 8-15s @ 60%
 */
export function recommendDLPParameters(
  bioink: Bioink,
  tissue: string,
): Partial<DLPJobConfig> {
  const mat = bioink.material.toLowerCase()
  const conc = bioink.concentration
  const t = tissue.toLowerCase()

  let exposureTime_s = 5
  let uvIntensity_pct = 50
  let layerHeight_mm = 0.05  // 50µm

  if (mat.includes("gelma")) {
    // GelMA + LAP: tempo ~ inverso da concentração
    exposureTime_s = Math.max(2, Math.round(40 / conc))
    uvIntensity_pct = conc < 7 ? 60 : 50
  } else if (mat.includes("pegda")) {
    exposureTime_s = 3
    uvIntensity_pct = 45
  } else if (mat.includes("hema")) {
    exposureTime_s = 8
    uvIntensity_pct = 60
  }

  // Layer height por tecido
  if (t.includes("osso") || t.includes("cartilag")) layerHeight_mm = 0.10
  else if (t.includes("pele") || t.includes("cornea")) layerHeight_mm = 0.025
  else if (t.includes("micro")) layerHeight_mm = 0.025

  return {
    exposureTime_s,
    uvIntensity_pct,
    layerHeight_mm,
    initialLayers: 3,
    initialExposureMult: 2.5,
    liftDistance_mm: 5,
    liftSpeed_mmmin: 100,
    retractSpeed_mmmin: 80,
    settlingTime_s: 2,
    tiltAngle_deg: 3,
    postCureUV_s: 30,
  }
}
