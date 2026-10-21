/**
 * BIA v4 · R15 · BioSlicer — Escritor de G-code (Marlin / Klipper / RepRap)
 *
 * Convenções BIA (R12.64):
 *   · NUNCA G28. Origem por G92 X0 Y0 Z<offset> E0 no ponto atual do bico.
 *   · M83 (E relativo) — compatível com M221 em tempo real.
 *   · M302 S0 (cold extrusion).
 *   · ;LAYER:n, ;TYPE:…, ;Z: (Cura-like) e ;BIA_META json para o host/coherence-check.
 */

import type { SliceParams, ExtrusionModel, SlicedLayer, ToolPath, Vec2, SliceStats } from "./types"
import { ePerMm, volumeToE, beadArea_mm2 } from "./extrusion"
import { dist } from "./polygon-ops"

const f = (n: number, d = 3) => {
  const s = n.toFixed(d)
  return s.replace(/\.?0+$/, "") || "0"
}
const F = (mms: number) => Math.round(Math.max(1, mms) * 60)

export interface WriteOptions {
  jobName: string
  meshName?: string
  profileId: string
  profileName: string
  meta?: Record<string, string | number | boolean | null | undefined>
}

export interface WriteResult {
  gcode: string
  stats: Pick<SliceStats, "extrudeLength_mm" | "travelLength_mm" | "volume_uL" | "plungerTravel_mm" | "estimatedTime_s" | "extrusionStarts" | "totalPathLength_mm">
}

export function writeGCode(layers: SlicedLayer[], P: SliceParams, X: ExtrusionModel, opt: WriteOptions): WriteResult {
  const out: string[] = []
  let extrude = 0, travel = 0, volume = 0, eTotal = 0, time = 0, starts = 0
  const push = (s: string) => out.push(s)

  push(`; ═══════════════════════════════════════════════════════════`)
  push(`; BIA v4 · BioSlicer R15 — ${opt.jobName}`)
  push(`; Gerado: ${new Date().toISOString()}`)
  push(`; Perfil: ${opt.profileName} (${opt.profileId})`)
  if (opt.meshName) push(`; Modelo: ${opt.meshName}`)
  push(`; Firmware alvo: ${P.firmware}`)
  push(`; Bico: ${f(P.nozzleDiameter_mm)} mm · Linha: ${f(P.lineWidth_mm)} mm · Camada: ${f(P.layerHeight_mm)} mm (1ª: ${f(P.firstLayerHeight_mm)})`)
  push(`; Paredes: ${P.wallCount} · Infill: ${P.infillPattern} ${P.infillDensity}%` + (P.strandSpacing_mm ? ` · espaçamento ${f(P.strandSpacing_mm)} mm` : ""))
  push(`; Velocidades (mm/s): perímetro ${P.speedPerimeter_mms} · infill ${P.speedInfill_mms} · 1ª camada ${P.speedFirstLayer_mms} · travel ${P.speedTravel_mms}`)
  if (X.kind === "syringe_stepper" && X.syringe) {
    push(`; Extrusão: seringa ${X.syringe.volume_mL} mL (Ø int ${f(X.syringe.innerDiameter_mm, 2)} mm) · E = mm de êmbolo · fluxo ×${f(X.flowMultiplier, 2)}`)
  } else if (X.kind === "pneumatic") {
    push(`; Extrusão: pneumática ${X.pressure_kPa ?? "?"} kPa · E virtual`)
  } else {
    push(`; Extrusão: filamento equivalente Ø${f(X.filamentDiameter_mm ?? 1.75, 2)} mm`)
  }
  push(`; Camadas: ${layers.length}`)
  push(`;LAYER_COUNT:${layers.length}`)
  const meta = {
    generator: "bia-bioslicer-r15", profileId: opt.profileId, layerCount: layers.length,
    layerHeight_mm: P.layerHeight_mm, nozzle_mm: P.nozzleDiameter_mm, infill: P.infillPattern,
    infillDensity: P.infillDensity, extruder: X.kind, syringe_mL: X.syringe?.volume_mL ?? null, ...opt.meta,
  }
  push(`;BIA_META ${JSON.stringify(meta)}`)
  push(`; Geometry: ${opt.meta?.geometryId ?? opt.meshName ?? "stl"}`)
  push(`; ═══════════════════════════════════════════════════════════`)
  push(``)

  push(`; ─── START ──────────────────────────────────────────────────`)
  push(`G21                    ; mm`)
  push(`G90                    ; posicionamento absoluto`)
  push(`M83                    ; extrusão RELATIVA (compatível com M221 em tempo real)`)
  if (P.firmware === "marlin" || P.firmware === "reprap") push(`M302 S0                ; permitir extrusão a frio (seringa)`)
  push(`; ⚠️ NENHUM G28 (home) — bioimpressora preserva bandeja/cartucho`)
  push(`; ⚠️ Posicione o bico MANUALMENTE sobre a origem (centro do alvo) antes de iniciar`)
  push(`G92 X0 Y0 Z${f(P.zOffset_mm)} E0  ; zerar coordenadas AQUI (ponto atual = origem)`)
  if (P.cartridgeTemp_C !== null) push(`${P.waitForTemps ? "M109" : "M104"} S${f(P.cartridgeTemp_C, 1)}  ; temperatura do cartucho`)
  if (P.bedTemp_C !== null) push(`${P.waitForTemps ? "M190" : "M140"} S${f(P.bedTemp_C, 1)}  ; temperatura da mesa`)
  if (X.kind === "pneumatic" && X.pressure_kPa) push(`; pressão: ${X.pressure_kPa} kPa (ajuste no regulador / M-code do fabricante)`)
  push(`M220 S100              ; feedrate 100 %`)
  push(`M221 S100              ; fluxo 100 % (ajuste em tempo real durante a impressão)`)
  if (P.customStart.trim()) {
    push(`; custom start:`)
    for (const l of P.customStart.split(/\r?\n/)) if (l.trim()) push(l.trim())
  }
  push(``)

  let cur: Vec2 = { x: 0, y: 0 }
  let curZ = P.zOffset_mm
  let retracted = false
  const eRetract = volumeToE(X.retractVolume_uL, X)
  const ePrime = volumeToE(X.primeVolume_uL, X)
  const retractF = F(X.retractSpeed_mms)

  if (P.purgeLine_mm > 0 && layers.length) {
    const h = layers[0].height_mm
    const zTop = P.zOffset_mm + h
    push(`;TYPE:SKIRT`)
    push(`; purge line ${P.purgeLine_mm} mm`)
    push(`G1 Z${f(zTop)} F${F(P.speedZ_mms)}`)
    const e = ePerMm(P.lineWidth_mm * 1.5, h, X) * P.purgeLine_mm
    push(`G1 X${f(P.purgeLine_mm)} Y0 E${f(e, 4)} F${F(P.speedFirstLayer_mms)}`)
    cur = { x: P.purgeLine_mm, y: 0 }
    curZ = zTop
    extrude += P.purgeLine_mm; eTotal += e
    volume += beadArea_mm2(P.lineWidth_mm * 1.5, h) * P.purgeLine_mm * X.flowMultiplier
    time += P.purgeLine_mm / P.speedFirstLayer_mms
    starts++
  }

  const goTravel = (to: Vec2, zTop: number) => {
    const d = dist(cur, to)
    if (d < 1e-6 && Math.abs(zTop - curZ) < 1e-6) return
    if (d >= P.retractMinTravel_mm && eRetract > 0 && !retracted) {
      push(`G1 E-${f(eRetract, 4)} F${retractF}`)
      retracted = true
      time += eRetract / Math.max(0.1, X.retractSpeed_mms)
    }
    const hop = d >= P.retractMinTravel_mm ? P.zHop_mm : 0
    if (hop > 0) { push(`G0 Z${f(zTop + hop)} F${F(P.speedZ_mms)}`); time += hop / P.speedZ_mms }
    push(`G0 X${f(to.x)} Y${f(to.y)} F${F(P.speedTravel_mms)}`)
    time += d / P.speedTravel_mms
    travel += d
    if (hop > 0 || Math.abs(zTop - curZ) > 1e-6) { push(`G0 Z${f(zTop)} F${F(P.speedZ_mms)}`); time += hop / P.speedZ_mms }
    cur = to
    curZ = zTop
  }

  const startExtrusion = () => {
    if (retracted && eRetract > 0) {
      push(`G1 E${f(eRetract, 4)} F${retractF}`)
      retracted = false
      time += eRetract / Math.max(0.1, X.retractSpeed_mms)
    }
    if (ePrime > 0) {
      push(`G1 E${f(ePrime, 4)} F${retractF}`)
      eTotal += ePrime
      time += ePrime / Math.max(0.1, X.retractSpeed_mms)
      if (X.primeDwell_ms > 0) { push(`G4 P${Math.round(X.primeDwell_ms)}`); time += X.primeDwell_ms / 1000 }
    }
    starts++
  }

  const endExtrusion = () => {
    if (ePrime > 0) {
      push(`G1 E-${f(ePrime, 4)} F${retractF}`)
      eTotal -= ePrime
      time += ePrime / Math.max(0.1, X.retractSpeed_mms)
    }
  }

  for (const L of layers) {
    const zTop = P.zOffset_mm + (L.z_mm - layers[0].z_mm) + layers[0].height_mm / 2 + L.height_mm / 2
    push(``)
    push(`;LAYER:${L.index}`)
    push(`;Z:${f(zTop)}`)
    if (P.verboseComments) push(`; camada ${L.index + 1}/${layers.length} · z=${f(zTop)} mm · h=${f(L.height_mm)} mm · ${L.paths.length} caminhos`)
    if (P.customLayerChange.trim() && L.index > 0) for (const l of P.customLayerChange.split(/\r?\n/)) if (l.trim()) push(l.trim())
    if (P.layerPause_s > 0 && L.index > 0) { push(`G4 S${f(P.layerPause_s, 1)}        ; pausa entre camadas (gelificação)`); time += P.layerPause_s }

    let lastRole: string | null = null
    for (const tp of L.paths) {
      if (tp.points.length < 2) continue
      const role = roleTag(tp.role)
      if (role !== lastRole) { push(`;TYPE:${role}`); lastRole = role }
      const eMm = ePerMm(tp.lineWidth_mm, L.height_mm, X)
      const speedF = F(tp.speed_mms)
      goTravel(tp.points[0], zTop)
      startExtrusion()
      const seq = tp.closed ? [...tp.points, tp.points[0]] : tp.points
      let segLen = 0
      for (let i = 1; i < seq.length; i++) {
        const p = seq[i]
        const d = dist(seq[i - 1], p)
        if (d < 1e-6) continue
        const e = d * eMm
        push(`G1 X${f(p.x)} Y${f(p.y)} E${f(e, 5)}${i === 1 ? ` F${speedF}` : ""}`)
        segLen += d
        eTotal += e
        time += d / tp.speed_mms
      }
      extrude += segLen
      volume += beadArea_mm2(tp.lineWidth_mm, L.height_mm) * segLen * X.flowMultiplier
      endExtrusion()
      cur = seq[seq.length - 1]
    }
  }

  push(``)
  push(`; ─── END ────────────────────────────────────────────────────`)
  if (eRetract > 0 && !retracted) push(`G1 E-${f(eRetract, 4)} F${retractF}`)
  push(`G91                    ; relativo`)
  push(`G0 Z10 F${F(P.speedZ_mms)}            ; sobe 10 mm`)
  push(`G90                    ; absoluto`)
  if (P.cartridgeTemp_C !== null) push(`M104 S0                ; cartucho off`)
  if (P.bedTemp_C !== null) push(`M140 S0                ; mesa off`)
  if (P.customEnd.trim()) {
    push(`; custom end:`)
    for (const l of P.customEnd.split(/\r?\n/)) if (l.trim()) push(l.trim())
  }
  push(`; motores permanecem ligados — desligue com M84 quando retirar a peça`)
  push(`; BIA v4 · BioSlicer — fim`)

  return {
    gcode: out.join("\n") + "\n",
    stats: {
      extrudeLength_mm: round(extrude),
      travelLength_mm: round(travel),
      volume_uL: round(volume),
      plungerTravel_mm: round(eTotal),
      estimatedTime_s: Math.round(time),
      extrusionStarts: starts,
      totalPathLength_mm: round(extrude + travel),
    },
  }
}

function roleTag(role: ToolPath["role"]): string {
  switch (role) {
    case "wall_outer": return "WALL-OUTER"
    case "wall_inner": return "WALL-INNER"
    case "skirt": case "purge": return "SKIRT"
    default: return "FILL"
  }
}

function round(n: number, d = 2): number {
  const k = 10 ** d
  return Math.round(n * k) / k
}
