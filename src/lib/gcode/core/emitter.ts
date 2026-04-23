/**
 * BIA v4.2 — GCODE Emitter
 * Converte uma lista estruturada de Moves em G-code texto.
 * Suporta dialetos: Marlin, Klipper, RepRap, CELLINK, Allevi, REGEMAT, EnvisionTEC.
 */

import type { Move, BioprinterProfile, Bioink, PrintJob } from "./types"
import { fmt, mmsToMmMin } from "./kinematics"

export interface EmitOptions {
  verbose?: boolean              // incluir comentários explicativos
  relativeExtrusion?: boolean    // M83 vs M82
  includeHeader?: boolean
  includeFooter?: boolean
  jobMetadata?: PrintJob
}

// ═══════════════════════════════════════════════════════════════
// HEADER / FOOTER
// ═══════════════════════════════════════════════════════════════
export function emitHeader(
  bp: BioprinterProfile,
  bioink: Bioink,
  opts: EmitOptions = {},
): string[] {
  const lines: string[] = []
  const stamp = new Date().toISOString()
  lines.push(`; ═══════════════════════════════════════════════════════════`)
  lines.push(`; BIA v4.2 — Bioimpressão Especial GCODE Engine`)
  lines.push(`; Quantis Biotechnology`)
  lines.push(`; ═══════════════════════════════════════════════════════════`)
  lines.push(`; Generated: ${stamp}`)
  lines.push(`; Bioprinter: ${bp.manufacturer} ${bp.name}`)
  lines.push(`; Flavor: ${bp.flavor}`)
  lines.push(`; Bioink: ${bioink.material} @ ${bioink.concentration}%`)
  lines.push(`; Nozzle: ${bioink.nozzleDiameter_um} µm`)
  lines.push(`; Temp: ${bioink.temperature_c}°C  |  Pressure: ${bioink.pressure_kpa} kPa`)
  lines.push(`; Cells: ${bioink.hasCells ? `YES (${bioink.cellDensity ?? "?"}×10⁶/mL)` : "NO (acellular)"}`)
  if (opts.jobMetadata) {
    const j = opts.jobMetadata
    lines.push(`; Tissue: ${j.tissue}`)
    lines.push(`; Application: ${j.application}`)
    lines.push(`; Infill: ${j.infillAlgorithm} @ ${j.infillPercent}%`)
    if (j.wellPlate) {
      lines.push(`; Well plate: ${j.wellPlate.format}-well  (${j.wellPlate.selectedWells.length} wells)`)
      lines.push(`; Selected: ${j.wellPlate.selectedWells.join(", ")}`)
      lines.push(`; Replication mode: ${j.wellPlate.replicationMode}`)
    }
  }
  lines.push(`; ═══════════════════════════════════════════════════════════`)
  lines.push("")

  // Códigos de início universais
  lines.push("G21                    ; set units to mm")
  lines.push("G90                    ; absolute positioning")
  lines.push(opts.relativeExtrusion ? "M83                    ; relative extrusion" : "M82                    ; absolute extrusion")
  lines.push("G92 E0                 ; zero extrusion counter")

  // Temperatura
  if (bp.hasHeatedBed && bioink.temperature_c) {
    lines.push(`M140 S${fmt(bioink.temperature_c)}        ; set bed temp`)
    lines.push(`M190 S${fmt(bioink.temperature_c)}        ; wait for bed temp`)
  }

  // Pressão pneumática (bioprinter específico)
  if (bp.mcodes.pressureSet) {
    const code = bp.mcodes.pressureSet.replace("{kpa}", fmt(bioink.pressure_kpa))
    lines.push(`${code}          ; set extrusion pressure`)
  } else if (bp.flavor === "cellink") {
    lines.push(`M773 P${fmt(bioink.pressure_kpa)}         ; CELLINK set pressure (kPa)`)
  } else if (bp.flavor === "allevi") {
    lines.push(`M751 S${fmt(bioink.pressure_kpa)}         ; Allevi set pressure`)
  }

  // Auto-level / homing
  if (bp.hasAutoLeveling) {
    lines.push("G28                    ; home all axes")
    lines.push("G29                    ; auto bed leveling")
  } else {
    lines.push("G28                    ; home all axes")
  }

  // Start print code específico
  if (bp.mcodes.startPrint) {
    lines.push(`${bp.mcodes.startPrint}      ; ${bp.manufacturer} start print`)
  }

  lines.push("")
  lines.push("; ─── PRINT START ─────────────────────────────────────")
  return lines
}

export function emitFooter(bp: BioprinterProfile, bioink: Bioink): string[] {
  const lines: string[] = []
  lines.push("")
  lines.push("; ─── PRINT END ───────────────────────────────────────")
  lines.push("G91                    ; relative positioning")
  lines.push("G1 Z10 F300            ; lift nozzle")
  lines.push("G90                    ; absolute positioning")
  lines.push("G1 X0 Y200 F3000       ; park")

  // UV crosslink final (se equipado)
  if (bp.hasUV && (bioink.material.toLowerCase().includes("gelma") || bioink.material.toLowerCase().includes("pegda"))) {
    lines.push("")
    lines.push("; ─── FINAL UV CROSSLINK ─────────────────────────────")
    lines.push(bp.mcodes.uvOn ?? "M106 P1 S255           ; UV ON")
    lines.push("G4 S60                 ; UV exposure 60s")
    lines.push(bp.mcodes.uvOff ?? "M107 P1                ; UV OFF")
  }

  if (bp.mcodes.endPrint) lines.push(bp.mcodes.endPrint)

  // Pressão OFF
  if (bp.flavor === "cellink") lines.push("M773 P0                ; CELLINK pressure OFF")
  else if (bp.flavor === "allevi") lines.push("M751 S0                ; Allevi pressure OFF")

  if (bp.hasHeatedBed) lines.push("M140 S0                ; bed off")
  lines.push("M84                    ; disable motors")
  lines.push("; BIA v4.2 — End of print")
  return lines
}

// ═══════════════════════════════════════════════════════════════
// EMITIR UM MOVE INDIVIDUAL
// ═══════════════════════════════════════════════════════════════
export function emitMove(m: Move, opts: EmitOptions = {}): string {
  // Pausa e dwell
  if (m.type === "pause") {
    return `M0 ${m.comment ? `; ${m.comment}` : "; pause"}`
  }
  if (m.type === "wait") {
    const sec = m.f ?? 1  // reutilizamos f para segundos
    return `G4 S${fmt(sec, 2)} ${m.comment ? `; ${m.comment}` : ""}`
  }
  if (m.type === "uv") {
    return `; UV trigger — ${m.comment ?? ""}\nM106 P1 S255\nG4 S${fmt(m.f ?? 30, 0)}\nM107 P1`
  }

  // Movimento mecânico (G0/G1)
  const cmd = m.type === "travel" || m.type === "zhop" ? "G0" : "G1"
  const parts: string[] = [cmd]
  if (m.x !== undefined) parts.push(`X${fmt(m.x, 3)}`)
  if (m.y !== undefined) parts.push(`Y${fmt(m.y, 3)}`)
  if (m.z !== undefined) parts.push(`Z${fmt(m.z, 3)}`)
  if (m.e !== undefined && m.type !== "travel" && m.type !== "zhop") {
    parts.push(`E${fmt(m.e, 4)}`)
  }
  if (m.f !== undefined) parts.push(`F${fmt(m.f, 0)}`)
  if (opts.verbose && m.comment) parts.push(`; ${m.comment}`)
  return parts.join(" ")
}

// ═══════════════════════════════════════════════════════════════
// EMITIR LISTA COMPLETA
// ═══════════════════════════════════════════════════════════════
export function emitGCode(
  moves: Move[],
  bp: BioprinterProfile,
  bioink: Bioink,
  opts: EmitOptions = {},
): string {
  const lines: string[] = []
  const {
    includeHeader = true,
    includeFooter = true,
    relativeExtrusion = false,
    verbose = true,
  } = opts

  if (includeHeader) lines.push(...emitHeader(bp, bioink, { ...opts, relativeExtrusion }))

  let lastWell: string | undefined
  let lastLayer: number | undefined
  for (const m of moves) {
    // Marcadores de poço
    if (m.wellId && m.wellId !== lastWell) {
      lines.push("")
      lines.push(`; ─── WELL ${m.wellId} ─────────────────────────`)
      lastWell = m.wellId
    }
    // Marcadores de layer
    if (m.layer !== undefined && m.layer !== lastLayer) {
      lines.push(`; LAYER ${m.layer}`)
      lastLayer = m.layer
    }
    const text = emitMove(m, { verbose })
    if (text) lines.push(text)
  }

  if (includeFooter) lines.push(...emitFooter(bp, bioink))
  return lines.join("\n")
}

// ═══════════════════════════════════════════════════════════════
// MOVIMENTOS DE ALTO NÍVEL (HELPERS)
// ═══════════════════════════════════════════════════════════════
export function travelTo(x: number, y: number, bioink: Bioink, z?: number, wellId?: string): Move {
  return {
    type: "travel",
    x, y, z,
    f: mmsToMmMin(bioink.travelSpeed_mms),
    wellId,
    comment: `travel → (${fmt(x,2)},${fmt(y,2)})`,
  }
}

export function extrudeTo(
  x: number, y: number, e: number,
  bioink: Bioink, z?: number, wellId?: string, layer?: number,
): Move {
  return {
    type: "extrude",
    x, y, z, e,
    f: mmsToMmMin(bioink.printSpeed_mms),
    wellId,
    layer,
  }
}

export function retract(bioink: Bioink): Move {
  return {
    type: "retract",
    e: -bioink.retraction_mm,
    f: mmsToMmMin(60),  // 60 mm/s retraction default
    comment: "retract",
  }
}

export function primeExtruder(bioink: Bioink): Move {
  return {
    type: "prime",
    e: bioink.retraction_mm,
    f: mmsToMmMin(40),
    comment: "prime",
  }
}

export function zHop(fromZ: number, hopHeight: number, bioink: Bioink): Move {
  return {
    type: "zhop",
    z: fromZ + hopHeight,
    f: mmsToMmMin(bioink.travelSpeed_mms),
    comment: `z-hop +${fmt(hopHeight, 2)}`,
  }
}

export function dwell(seconds: number, comment = "dwell"): Move {
  return { type: "wait", f: seconds, comment }
}

export function pauseMove(comment = "pause for operator"): Move {
  return { type: "pause", comment }
}
