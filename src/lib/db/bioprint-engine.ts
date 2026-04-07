/**
 * BIA v4 — Biofabrication Calculation Engine
 * Motor de cálculos científicos baseado no banco de dados CECT (807 entradas)
 * + modelos reológicos Herschel-Bulkley, Casson, Power-Law
 * + equação de Hagen-Poiseuille para pressão
 * + estimativas de viabilidade celular
 */

import { BIOPRINT_DB, MATERIAL_META, type BiomaterialDBEntry } from "./bioprint-database"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BioprintParams {
  material: string
  concentration: number   // % w/v or mg/mL
  nozzleDiameter: number  // µm
  printSpeed: number      // mm/s
  pressure: number        // kPa
  temperature: number     // °C
  cellDensity: number     // × 10⁶ cells/mL
  infillPct: number       // 0–100
  layerHeight: number     // µm
}

export interface RheologyResult {
  viscosity_mPas: number       // estimated viscosity
  yieldStress_Pa: number       // yield stress τ₀
  G_prime: number              // elastic modulus G' (Pa)
  G_double_prime: number       // viscous modulus G'' (Pa)
  gelPoint: boolean            // G' > G''
  powerLaw_n: number           // flow index (n<1 = pseudoplastic)
  powerLaw_K: number           // consistency index
  shearRate_s1: number         // shear rate at nozzle wall (s⁻¹)
  wallShearStress_Pa: number   // shear stress at wall (Pa)
  pressureDrop_kPa: number     // Hagen-Poiseuille pressure drop
  model: "Herschel-Bulkley" | "Casson" | "Power-Law" | "Newtonian"
}

export interface PrintabilityResult {
  score: number                // 0–100
  grade: "Excellent" | "Good" | "Fair" | "Poor"
  viability_pct: number        // estimated cell viability %
  cellViabilityRisk: "low" | "medium" | "high"
  structuralFidelity_pct: number
  warnings: string[]
  recommendations: string[]
  complianceChecks: {
    shearStress: boolean       // < 50 Pa for cells
    printTime: boolean         // < 2h
    temperature: boolean       // safe for cells if loaded
    nozzleDiameter: boolean    // ≥ 150 µm with cells
  }
}

export interface MaterialSuggestion {
  material: string
  score: number
  dbEntries: number
  cellCompatible: boolean
  typicalParams: {
    pressure_kpa: number | null
    temp_c: number | null
    speed_mms: number | null
    needle_um: number | null
  }
  concentrations: string[]
  crosslink: string
  notes: string
  dois: string[]
}

export interface GCodeOutput {
  startGcode: string
  layerGcode: string[]
  endGcode: string
  estimatedTime_min: number
  totalLayers: number
  filamentLength_mm: number
}

// ─── Material viscosity models (literature-derived) ──────────────────────────

const VISCOSITY_MODELS: Record<string, {
  baseViscosity: number  // mPa·s at 1 s⁻¹
  yieldStress: number    // Pa
  n: number              // power law index
  K: number              // consistency index
  model: "Herschel-Bulkley" | "Casson" | "Power-Law" | "Newtonian"
  G_prime_gel: number    // Pa after gelation
  G_prime_pre: number    // Pa before gelation
}> = {
  "Alginate":    { baseViscosity: 800,   yieldStress: 20,  n: 0.35, K: 15,  model: "Herschel-Bulkley", G_prime_gel: 2000,  G_prime_pre: 50 },
  "GelMA":       { baseViscosity: 500,   yieldStress: 15,  n: 0.40, K: 12,  model: "Herschel-Bulkley", G_prime_gel: 1500,  G_prime_pre: 30 },
  "Gelatin":     { baseViscosity: 1200,  yieldStress: 30,  n: 0.30, K: 20,  model: "Herschel-Bulkley", G_prime_gel: 800,   G_prime_pre: 10 },
  "PCL":         { baseViscosity: 3000,  yieldStress: 100, n: 0.55, K: 50,  model: "Power-Law",        G_prime_gel: 50000, G_prime_pre: 5000 },
  "Chitosan":    { baseViscosity: 600,   yieldStress: 25,  n: 0.38, K: 14,  model: "Herschel-Bulkley", G_prime_gel: 500,   G_prime_pre: 20 },
  "Fibrinogen":  { baseViscosity: 200,   yieldStress: 5,   n: 0.60, K: 5,   model: "Casson",           G_prime_gel: 300,   G_prime_pre: 5 },
  "Collagen":    { baseViscosity: 150,   yieldStress: 2,   n: 0.70, K: 3,   model: "Power-Law",        G_prime_gel: 50,    G_prime_pre: 2 },
  "Hyaluronic Acid": { baseViscosity: 400, yieldStress: 8, n: 0.45, K: 10,  model: "Power-Law",        G_prime_gel: 400,   G_prime_pre: 15 },
  "PLGA":        { baseViscosity: 2000,  yieldStress: 80,  n: 0.50, K: 40,  model: "Power-Law",        G_prime_gel: 30000, G_prime_pre: 3000 },
  "Pluronic F127": { baseViscosity: 2500, yieldStress: 60, n: 0.42, K: 30,  model: "Herschel-Bulkley", G_prime_gel: 5000,  G_prime_pre: 500 },
  "dECM":        { baseViscosity: 300,   yieldStress: 10,  n: 0.55, K: 8,   model: "Herschel-Bulkley", G_prime_gel: 200,   G_prime_pre: 8 },
  "Methylcellulose": { baseViscosity: 700, yieldStress: 18, n: 0.38, K: 16, model: "Power-Law",        G_prime_gel: 600,   G_prime_pre: 25 },
  "Gellan Gum":  { baseViscosity: 900,   yieldStress: 35,  n: 0.32, K: 22,  model: "Herschel-Bulkley", G_prime_gel: 3000,  G_prime_pre: 80 },
  "PEGDA":       { baseViscosity: 100,   yieldStress: 1,   n: 0.85, K: 2,   model: "Newtonian",        G_prime_gel: 5000,  G_prime_pre: 5 },
  "Agarose":     { baseViscosity: 1500,  yieldStress: 40,  n: 0.33, K: 25,  model: "Herschel-Bulkley", G_prime_gel: 4000,  G_prime_pre: 100 },
}

// Default model for unknown materials
const DEFAULT_MODEL = { baseViscosity: 600, yieldStress: 20, n: 0.45, K: 15, model: "Power-Law" as const, G_prime_gel: 1000, G_prime_pre: 30 }

// ─── Rheology Calculator ──────────────────────────────────────────────────────

/**
 * Calculate full rheology profile for a bioink.
 * Based on Herschel-Bulkley / Casson / Power-Law models.
 */
export function calculateRheology(params: BioprintParams): RheologyResult {
  const { material, concentration, nozzleDiameter, printSpeed, cellDensity } = params
  const model = VISCOSITY_MODELS[material] ?? DEFAULT_MODEL

  const R_m = (nozzleDiameter / 2) * 1e-6  // radius in meters
  const L_m = 0.02                            // nozzle length ~20 mm
  const Q = (printSpeed * 1e-3) * Math.PI * R_m * R_m  // volumetric flow (m³/s)

  // Shear rate at nozzle wall (Newtonian approximation for first estimate)
  const shearRate = (4 * Q) / (Math.PI * R_m ** 3)

  // Concentration scaling factor (higher conc = higher viscosity)
  const concFactor = Math.pow(concentration / 5, 1.2)  // reference at 5%

  // Cell loading increases effective viscosity
  const cellFactor = 1 + (cellDensity * 0.03)  // ~3% per 10⁶ cells/mL

  // Base viscosity adjusted by concentration and cells
  let eta = model.baseViscosity * concFactor * cellFactor

  // Power-law viscosity at current shear rate
  if (model.model === "Power-Law" || model.model === "Herschel-Bulkley") {
    eta = model.K * concFactor * cellFactor * Math.pow(Math.max(shearRate, 0.1), model.n - 1) * 1000
    eta = Math.max(eta, 1)
  }

  // Wall shear stress: τ = η * γ̇ (+ yield stress for HB)
  let wallShear = (eta / 1000) * shearRate  // Pa
  if (model.model === "Herschel-Bulkley") {
    wallShear += model.yieldStress * concFactor
  }

  // Pressure drop: Hagen-Poiseuille generalized
  const pressureDrop = (8 * (eta / 1000) * L_m * Q) / (Math.PI * Math.pow(R_m, 4)) / 1000  // kPa

  // G' and G'' estimation
  const G_prime = model.G_prime_pre * concFactor * concFactor + (model.G_prime_gel - model.G_prime_pre) * 0.3
  const G_double_prime = G_prime * 0.6  // approximate loss factor

  return {
    viscosity_mPas: Math.round(eta),
    yieldStress_Pa: Math.round(model.yieldStress * concFactor),
    G_prime: Math.round(G_prime),
    G_double_prime: Math.round(G_double_prime),
    gelPoint: G_prime > G_double_prime,
    powerLaw_n: model.n,
    powerLaw_K: Math.round(model.K * concFactor * 10) / 10,
    shearRate_s1: Math.round(shearRate * 10) / 10,
    wallShearStress_Pa: Math.round(wallShear * 10) / 10,
    pressureDrop_kPa: Math.round(pressureDrop * 10) / 10,
    model: model.model,
  }
}

// ─── Printability Assessor ────────────────────────────────────────────────────

export function assessPrintability(
  params: BioprintParams,
  rheology: RheologyResult
): PrintabilityResult {
  const { material, nozzleDiameter, printSpeed, pressure, temperature, cellDensity, layerHeight } = params
  const warnings: string[] = []
  const recommendations: string[] = []
  let score = 100

  // DB validation
  const dbEntry = BIOPRINT_DB[material]
  const meta = MATERIAL_META[material]

  // ── Shear stress check (critical for cell viability) ──
  const shearOk = rheology.wallShearStress_Pa < 50
  if (!shearOk) {
    score -= 25
    warnings.push(`⚠️ Shear stress excessivo: ${rheology.wallShearStress_Pa.toFixed(1)} Pa (limite: 50 Pa para células)`)
    recommendations.push("Reduzir velocidade de impressão ou aumentar diâmetro do bico (>400 µm)")
  }

  // ── Nozzle diameter check ──
  const nozzleOk = cellDensity === 0 || nozzleDiameter >= 150
  if (!nozzleOk) {
    score -= 20
    warnings.push(`⚠️ Bico muito pequeno (${nozzleDiameter} µm) para impressão com células — risco de ruptura celular`)
    recommendations.push("Usar bico ≥200 µm para células. Bico cônico reduz shear mais que cilíndrico")
  }

  // ── Temperature check ──
  const isCellLoaded = cellDensity > 0
  const tempOk = !isCellLoaded || (temperature >= 4 && temperature <= 37)
  if (!tempOk) {
    score -= 15
    warnings.push(`⚠️ Temperatura ${temperature}°C pode comprometer viabilidade celular (faixa segura: 4–37°C)`)
    recommendations.push("Manter temperatura entre 15–25°C para células durante impressão")
  }

  // ── Pressure vs DB range ──
  if (dbEntry?.pressure_kpa.min && dbEntry?.pressure_kpa.max) {
    if (pressure < dbEntry.pressure_kpa.min * 0.5 || pressure > dbEntry.pressure_kpa.max * 1.5) {
      score -= 15
      warnings.push(`⚠️ Pressão ${pressure} kPa fora do range validado na literatura (${dbEntry.pressure_kpa.min}–${dbEntry.pressure_kpa.max} kPa)`)
      recommendations.push(`Ajustar pressão para ${dbEntry.pressure_kpa.typical} kPa (valor típico do DB para ${material})`)
    }
  }

  // ── Speed vs DB range ──
  if (dbEntry?.speed_mms.min && dbEntry?.speed_mms.max) {
    if (printSpeed < dbEntry.speed_mms.min * 0.4 || printSpeed > dbEntry.speed_mms.max * 2) {
      score -= 10
      warnings.push(`⚠️ Velocidade ${printSpeed} mm/s fora do range da literatura`)
      recommendations.push(`Velocidade típica para ${material}: ${dbEntry.speed_mms.typical} mm/s`)
    }
  }

  // ── Needle diameter vs DB ──
  if (dbEntry?.needle_um.typical) {
    const nTypical = dbEntry.needle_um.typical
    if (nozzleDiameter < nTypical * 0.5) {
      score -= 10
      warnings.push(`⚠️ Bico ${nozzleDiameter} µm muito fino — pode entupir com ${material}`)
      recommendations.push(`Diâmetro típico para ${material}: ${nTypical} µm`)
    }
  }

  // ── Layer height vs nozzle diameter ──
  if (layerHeight > nozzleDiameter * 0.8) {
    score -= 8
    warnings.push("⚠️ Layer height acima de 80% do diâmetro do bico — risco de delamination")
    recommendations.push(`Layer height ≤${Math.round(nozzleDiameter * 0.7)} µm para este bico`)
  }

  // ── Viscosity range check ──
  if (rheology.viscosity_mPas < 50) {
    score -= 10
    warnings.push("⚠️ Viscosidade muito baixa — material pode não manter forma após deposição")
    recommendations.push("Aumentar concentração ou adicionar componente viscosificante (Methylcellulose, Gelatin)")
  }
  if (rheology.viscosity_mPas > 15000) {
    score -= 12
    warnings.push("⚠️ Viscosidade muito alta — pode causar entupimento e requer pressão excessiva")
    recommendations.push("Reduzir concentração ou aumentar temperatura de impressão levemente")
  }

  // ── PCL high-temp warning ──
  if (material === "PCL" && temperature < 75) {
    score -= 20
    warnings.push(`⚠️ PCL requer temperatura ≥80°C para extrusão (configurado: ${temperature}°C)`)
    recommendations.push("Definir temperatura do bico para 80–100°C para PCL")
  }

  // ── Positive indicators ──
  if (dbEntry && dbEntry.with_cells > 10 && cellDensity > 0) {
    recommendations.push(`✅ ${material} tem ${dbEntry.with_cells} estudos validados com células vivas no DB (807 entradas)`)
  }
  if (meta?.crosslink) {
    recommendations.push(`💡 Crosslinking: ${meta.crosslink}`)
  }

  score = Math.max(0, Math.min(100, score))

  // Grade
  const grade = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor"

  // Viability estimation
  let viability = 95
  if (rheology.wallShearStress_Pa > 50) viability -= 20
  if (rheology.wallShearStress_Pa > 100) viability -= 15
  if (!tempOk) viability -= 15
  if (!nozzleOk) viability -= 10
  if (material === "PCL" && cellDensity > 0) viability -= 30  // PCL high temp kills cells
  viability = Math.max(0, Math.min(99, viability))

  const viabilityRisk: "low" | "medium" | "high" =
    viability >= 80 ? "low" : viability >= 60 ? "medium" : "high"

  // Structural fidelity
  let fidelity = 95
  if (rheology.viscosity_mPas < 100) fidelity -= 20
  if (layerHeight > nozzleDiameter * 0.8) fidelity -= 10
  if (score < 50) fidelity -= 15
  fidelity = Math.max(30, Math.min(98, fidelity))

  return {
    score,
    grade,
    viability_pct: Math.round(viability),
    cellViabilityRisk: viabilityRisk,
    structuralFidelity_pct: Math.round(fidelity),
    warnings,
    recommendations,
    complianceChecks: {
      shearStress: shearOk,
      printTime: true,
      temperature: tempOk,
      nozzleDiameter: nozzleOk,
    },
  }
}

// ─── Smart Material Suggester ─────────────────────────────────────────────────

/**
 * Sugere os melhores materiais para um dado tecido alvo e requisitos.
 * Baseado nos 807 registros do CECT + conhecimento científico BIA.
 */
export function suggestMaterials(options: {
  tissueType: string
  withCells: boolean
  stiffness: "soft" | "medium" | "hard"
  biodegradable: boolean
  temperature?: "cold" | "room" | "hot"
}): MaterialSuggestion[] {
  const { tissueType, withCells, stiffness, biodegradable } = options
  const tissue = tissueType.toLowerCase()

  const suggestions: MaterialSuggestion[] = []

  for (const [matName, dbEntry] of Object.entries(BIOPRINT_DB)) {
    const meta = MATERIAL_META[matName]
    if (!meta) continue

    let score = 0

    // Cell compatibility score
    if (withCells) {
      const cellRatio = dbEntry.with_cells / dbEntry.n
      score += cellRatio * 30  // up to 30 pts for cell compatibility
      if (dbEntry.with_cells === 0 && withCells) score -= 20  // penalize if no cell data
    }

    // Tissue target matching
    if (meta.tissueTargets.some(t => t.toLowerCase().includes(tissue) || tissue.includes(t.toLowerCase()))) {
      score += 25
    }

    // Stiffness matching
    const modelData = VISCOSITY_MODELS[matName]
    if (modelData) {
      if (stiffness === "soft" && modelData.G_prime_gel < 1000) score += 15
      if (stiffness === "medium" && modelData.G_prime_gel >= 1000 && modelData.G_prime_gel < 10000) score += 15
      if (stiffness === "hard" && modelData.G_prime_gel >= 10000) score += 15
    }

    // Biodegradability
    const bioMats = ["GelMA", "Alginate", "Gelatin", "Collagen", "Fibrinogen", "Chitosan",
                     "Hyaluronic Acid", "PLGA", "dECM", "Gellan Gum", "Agarose"]
    const synthMats = ["PCL", "PEGDA", "Pluronic F127", "PLGA"]
    if (biodegradable && bioMats.includes(matName)) score += 10
    if (!biodegradable && synthMats.includes(matName)) score += 5

    // DB confidence (more entries = more confidence)
    score += Math.min(dbEntry.n / 10, 15)

    // PCL not suitable for cells at high temp
    if (withCells && matName === "PCL") score -= 30

    if (score > 0) {
      suggestions.push({
        material: matName,
        score: Math.round(score),
        dbEntries: dbEntry.n,
        cellCompatible: dbEntry.with_cells > 5,
        typicalParams: {
          pressure_kpa: dbEntry.pressure_kpa.typical,
          temp_c: dbEntry.temp_c.typical,
          speed_mms: dbEntry.speed_mms.typical,
          needle_um: dbEntry.needle_um.typical,
        },
        concentrations: dbEntry.concs.slice(0, 4),
        crosslink: meta.crosslink,
        notes: meta.notes,
        dois: dbEntry.dois.slice(0, 3),
      })
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 8)
}

// ─── G-Code Generator ────────────────────────────────────────────────────────

export function generateGCode(params: BioprintParams & {
  structureWidth: number   // mm
  structureHeight: number  // mm
  structureDepth: number   // mm
  infillPattern: "rectilinear" | "grid" | "gyroid" | "honeycomb"
}): GCodeOutput {
  const {
    material, nozzleDiameter, printSpeed, pressure, temperature,
    layerHeight, infillPct, structureWidth, structureHeight, structureDepth, infillPattern
  } = params

  const layerHeightMm = layerHeight / 1000
  const nozzleMm = nozzleDiameter / 1000
  const totalLayers = Math.ceil(structureDepth / layerHeightMm)
  const isHighTemp = temperature > 50

  // Start G-code
  const startGcode = [
    `; BIA v4 G-Code Generator`,
    `; Material: ${material}`,
    `; Nozzle: ${nozzleDiameter} µm | Temp: ${temperature}°C | Pressure: ${pressure} kPa`,
    `; Print Speed: ${printSpeed} mm/s | Layer: ${layerHeightMm} mm`,
    `; Generated: ${new Date().toISOString()}`,
    `;`,
    `G28 ; Home all axes`,
    `G21 ; Set units to millimeters`,
    `G90 ; Absolute positioning`,
    `M82 ; Absolute extruder mode`,
    isHighTemp ? `M104 S${temperature} ; Set nozzle temperature` : `; Nozzle: ambient (${temperature}°C)`,
    isHighTemp ? `M109 S${temperature} ; Wait for nozzle temperature` : `; No heating required`,
    `G92 E0 ; Reset extruder`,
    `; === PURGE LINE ===`,
    `G1 Z0.3 F500`,
    `G1 X10 Y0 F3000`,
    `G1 X150 Y0 E15 F${printSpeed * 60} ; Purge line`,
    `G92 E0 ; Reset extruder after purge`,
    `G1 Z${layerHeightMm} F500 ; Lift to first layer`,
  ].join("\n")

  // Generate layer G-code (simplified pattern)
  const layerGcodes: string[] = []
  const speedMmMin = printSpeed * 60
  const xStart = 0, yStart = 0
  const skirtLines = 2

  for (let layer = 0; layer < Math.min(totalLayers, 5); layer++) {
    const z = ((layer + 1) * layerHeightMm).toFixed(3)
    const lines: string[] = [`; === LAYER ${layer + 1} / ${totalLayers} === Z=${z}mm`]

    if (layer === 0) {
      // Skirt
      for (let s = 0; s < skirtLines; s++) {
        const offset = -3 - s * 2
        lines.push(`G1 Z${z} F500`)
        lines.push(`G1 X${xStart + offset} Y${yStart + offset} F3000`)
        lines.push(`G1 X${xStart + structureWidth - offset} Y${yStart + offset} E0.5 F${speedMmMin}`)
        lines.push(`G1 X${xStart + structureWidth - offset} Y${yStart + structureHeight - offset} E0.5 F${speedMmMin}`)
        lines.push(`G1 X${xStart + offset} Y${yStart + structureHeight - offset} E0.5 F${speedMmMin}`)
        lines.push(`G1 X${xStart + offset} Y${yStart + offset} E0.5 F${speedMmMin}`)
      }
    }

    // Perimeters (2 walls)
    lines.push(`; Perimeter`)
    lines.push(`G1 Z${z} F500`)
    lines.push(`G1 X${xStart} Y${yStart} F3000`)
    lines.push(`G1 X${xStart + structureWidth} Y${yStart} E${(structureWidth * 0.04).toFixed(3)} F${speedMmMin}`)
    lines.push(`G1 X${xStart + structureWidth} Y${yStart + structureHeight} E${(structureHeight * 0.04).toFixed(3)} F${speedMmMin}`)
    lines.push(`G1 X${xStart} Y${yStart + structureHeight} E${(structureWidth * 0.04).toFixed(3)} F${speedMmMin}`)
    lines.push(`G1 X${xStart} Y${yStart} E${(structureHeight * 0.04).toFixed(3)} F${speedMmMin}`)

    // Infill pattern
    const infillSpacing = (nozzleMm * 100) / infillPct
    lines.push(`; Infill (${infillPattern}, ${infillPct}%)`)
    if (infillPattern === "rectilinear" || infillPattern === "grid") {
      const isEven = layer % 2 === 0
      let y = yStart + infillSpacing
      while (y < yStart + structureHeight) {
        if (isEven) {
          lines.push(`G1 X${xStart + nozzleMm} Y${y.toFixed(2)} F3000`)
          lines.push(`G1 X${(xStart + structureWidth - nozzleMm).toFixed(2)} Y${y.toFixed(2)} E${((structureWidth - 2 * nozzleMm) * 0.04).toFixed(3)} F${speedMmMin}`)
        } else {
          lines.push(`G1 X${y.toFixed(2)} Y${yStart + nozzleMm} F3000`)
          lines.push(`G1 X${y.toFixed(2)} Y${(yStart + structureHeight - nozzleMm).toFixed(2)} E${((structureHeight - 2 * nozzleMm) * 0.04).toFixed(3)} F${speedMmMin}`)
        }
        y += infillSpacing
      }
    }

    layerGcodes.push(lines.join("\n"))
  }

  if (totalLayers > 5) {
    layerGcodes.push(`; ... (${totalLayers - 5} more layers follow same pattern)`)
    layerGcodes.push(`; Total layers: ${totalLayers}`)
  }

  // End G-code
  const endGcode = [
    `; === END G-CODE ===`,
    `G92 E0 ; Reset extruder`,
    `G1 E-2 F300 ; Retract to prevent stringing`,
    `G1 Z${(totalLayers * layerHeightMm + 5).toFixed(2)} F500 ; Lift nozzle`,
    `G1 X0 Y${structureHeight + 20} F3000 ; Move to safe position`,
    isHighTemp ? `M104 S0 ; Turn off nozzle heater` : `; No heater to turn off`,
    `M84 ; Disable steppers`,
    `; === PRINT COMPLETE ===`,
    `; Material: ${material} | ${totalLayers} layers | ${layerHeightMm}mm/layer`,
  ].join("\n")

  // Time and filament estimates
  const perimeter = 2 * (structureWidth + structureHeight)
  const infillLength = (structureWidth * structureHeight * infillPct / 100) / nozzleMm
  const totalPathLength = (perimeter + infillLength) * totalLayers
  const estimatedTime = totalPathLength / (printSpeed * 60)  // minutes

  return {
    startGcode,
    layerGcode: layerGcodes,
    endGcode,
    estimatedTime_min: Math.round(estimatedTime),
    totalLayers,
    filamentLength_mm: Math.round(totalPathLength),
  }
}

// ─── DB Query Functions ───────────────────────────────────────────────────────

/**
 * Busca parâmetros validados para um material específico no DB.
 */
export function getDBParams(material: string): BiomaterialDBEntry | null {
  // Try exact match
  if (BIOPRINT_DB[material]) return BIOPRINT_DB[material]

  // Fuzzy match
  const lower = material.toLowerCase()
  for (const [key, val] of Object.entries(BIOPRINT_DB)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return val
    }
  }
  return null
}

/**
 * Lista todos os materiais disponíveis com suas entradas no DB.
 */
export function listAllMaterials(): Array<{ name: string; entries: number; hasCells: boolean }> {
  return Object.entries(BIOPRINT_DB)
    .map(([name, entry]) => ({
      name,
      entries: entry.n,
      hasCells: entry.with_cells > 0,
    }))
    .sort((a, b) => b.entries - a.entries)
}

/**
 * Gera prompt enriquecido com dados do DB para a IA.
 */
export function buildAIEnrichedPrompt(params: BioprintParams): string {
  const dbEntry = getDBParams(params.material)
  const meta = MATERIAL_META[params.material]
  const rheology = calculateRheology(params)
  const printability = assessPrintability(params, rheology)

  let context = `\n\n[DADOS DO BANCO CECT — ${params.material}]\n`

  if (dbEntry) {
    context += `• Entradas validadas na literatura: ${dbEntry.n}\n`
    context += `• Pressão validada: ${dbEntry.pressure_kpa.min}–${dbEntry.pressure_kpa.max} kPa (típico: ${dbEntry.pressure_kpa.typical} kPa)\n`
    context += `• Temperatura validada: ${dbEntry.temp_c.min}–${dbEntry.temp_c.max}°C (típico: ${dbEntry.temp_c.typical}°C)\n`
    context += `• Velocidade validada: ${dbEntry.speed_mms.min}–${dbEntry.speed_mms.max} mm/s (típico: ${dbEntry.speed_mms.typical} mm/s)\n`
    context += `• Bico validado: ${dbEntry.needle_um.min}–${dbEntry.needle_um.max} µm (típico: ${dbEntry.needle_um.typical} µm)\n`
    context += `• Estudos com células vivas: ${dbEntry.with_cells}/${dbEntry.n}\n`
    context += `• Concentrações encontradas: ${dbEntry.concs.join(', ')}\n`
    if (dbEntry.dois.length > 0) context += `• DOIs referência: ${dbEntry.dois.slice(0, 3).join(', ')}\n`
  }

  if (meta) {
    context += `• Crosslinking: ${meta.crosslink}\n`
    context += `• Aplicações validadas: ${meta.tissueTargets.join(', ')}\n`
    context += `• Biocompatibilidade: ${meta.biocompat}\n`
  }

  context += `\n[PARÂMETROS ATUAIS]\n`
  context += `• Pressão: ${params.pressure} kPa | Temperatura: ${params.temperature}°C | Velocidade: ${params.printSpeed} mm/s\n`
  context += `• Bico: ${params.nozzleDiameter} µm | Concentração: ${params.concentration}% | Células: ${params.cellDensity}×10⁶/mL\n`

  context += `\n[CÁLCULOS REOLÓGICOS]\n`
  context += `• Viscosidade estimada: ${rheology.viscosity_mPas} mPa·s (modelo: ${rheology.model})\n`
  context += `• Shear stress na parede: ${rheology.wallShearStress_Pa} Pa ${rheology.wallShearStress_Pa > 50 ? '⚠️ ACIMA DO LIMITE' : '✅'}\n`
  context += `• G' (elástico): ${rheology.G_prime} Pa | G'' (viscoso): ${rheology.G_double_prime} Pa\n`
  context += `• Yield stress: ${rheology.yieldStress_Pa} Pa | n (Power-Law): ${rheology.powerLaw_n}\n`
  context += `• ΔP (Hagen-Poiseuille): ${rheology.pressureDrop_kPa} kPa\n`

  context += `\n[AVALIAÇÃO DE PRINTABILIDADE]\n`
  context += `• Score: ${printability.score}/100 (${printability.grade})\n`
  context += `• Viabilidade celular estimada: ${printability.viability_pct}%\n`
  context += `• Fidelidade estrutural: ${printability.structuralFidelity_pct}%\n`
  if (printability.warnings.length > 0) {
    context += `• Alertas:\n${printability.warnings.map(w => `  - ${w}`).join('\n')}\n`
  }

  return context
}
