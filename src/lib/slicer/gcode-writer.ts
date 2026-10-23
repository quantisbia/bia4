/**
 * BIA v4 · R15 → R20 · BioSlicer — Escritor de G-code (Marlin / Klipper / RepRap)
 *
 * Convenções BIA:
 *   · NUNCA G28. Origem por G92 X0 Y0 Z<offset> E0 no ponto atual do bico.
 *   · PONTO ZERO É PONTO ZERO: o 1º cordão nasce em (0,0) — aproximação EXTRUDADA.
 *   · M83 (E relativo) — compatível com M221 em tempo real. M302 S0 (cold extrusion).
 *   · Sem park no fim: só Z+5 relativo.
 *   · ;LAYER:n, ;TYPE:…, ;Z:, ;WELL:, ;TOOL: e ;BIA_META json.
 *
 * R20:
 *   · ALVO: Petri/lâmina (peça em 0,0) ou placa N poços — o 1º poço selecionado
 *     (superior-esquerdo) é a origem; os demais são offsets pelo pitch. A peça
 *     inteira é replicada poço a poço (Z-hop, pausa e purga opcionais entre eles).
 *   · CABEÇOTES: 1–4 ferramentas (T0..T3). Cada papel do caminho tem uma
 *     ferramenta; a troca emite retração → T<n> → prime → dwell. Um único G-code.
 */

import { needleDeadVolume_uL, BIOINK_CLASSES, plungerLimits, plungerLimitsGcode, safePlungerFeed_mmmin, type BioinkClass } from "./flow-science"
import type { SliceParams, ExtrusionModel, SlicedLayer, ToolPath, Vec2, SliceStats, PathRole } from "./types"
import { ePerMm, volumeToE, beadArea_mm2 } from "./extrusion"
import { dist } from "./polygon-ops"
import { type PrintTarget, DEFAULT_TARGET, PLATES, wellOffsets, referenceWell, describeTarget } from "./target"
import { type ToolsConfig, type ToolHead, singleTool, toolForRole, toolForLayer, describeTools } from "./tools"

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
  /** R20: alvo da impressão (default Petri 60 — peça em 0,0) */
  target?: PrintTarget
  /** R20: cabeçotes (default 1 = extrusão X) */
  tools?: ToolsConfig
}

export interface WriteResult {
  gcode: string
  stats: Pick<SliceStats, "extrudeLength_mm" | "travelLength_mm" | "volume_uL" | "plungerTravel_mm" | "estimatedTime_s" | "extrusionStarts" | "totalPathLength_mm"> & {
    /** µL por ferramenta (R20) */
    volumeByTool_uL: Record<number, number>
    toolChanges: number
    wells: number
  }
}

export function writeGCode(layers: SlicedLayer[], P: SliceParams, X: ExtrusionModel, opt: WriteOptions): WriteResult {
  const target = opt.target ?? DEFAULT_TARGET
  const tools = opt.tools ?? singleTool(X)
  const multiTool = tools.heads.length > 1
  const out: string[] = []
  let extrude = 0, travel = 0, volume = 0, eTotal = 0, time = 0, starts = 0, toolChanges = 0
  const volumeByTool: Record<number, number> = {}
  const push = (s: string) => out.push(s)

  // ── alvo → lista de offsets (cada um = uma cópia inteira da peça) ──
  const copies: Array<{ id: string; dx: number; dy: number }> =
    target.kind === "plate" && target.wells.length > 0
      ? wellOffsets(PLATES[target.format], target.wells)
      : [{ id: target.kind === "plate" ? "A1" : "peça", dx: 0, dy: 0 }]
  const refWell = target.kind === "plate" && target.wells.length ? referenceWell(PLATES[target.format], target.wells) : null

  // ── cabeçalho ──
  push(`; ═══════════════════════════════════════════════════════════`)
  push(`; BIA v4 · BioSlicer R20 — ${opt.jobName}`)
  push(`; Gerado: ${new Date().toISOString()}`)
  push(`; Perfil: ${opt.profileName} (${opt.profileId})`)
  if (opt.meshName) push(`; Modelo: ${opt.meshName}`)
  push(`; Firmware alvo: ${P.firmware}`)
  push(`; Origin: ${refWell ? `centro do poço ${refWell} (placa ${(target as { format: number }).format} poços) — demais poços são offsets relativos` : "centro da peça — ponto atual do bico"}`)
  push(`; Alvo: ${describeTarget(target)}`)
  push(`; Cabeçotes: ${describeTools(tools)}`)
  push(`; Bico: ${f(P.nozzleDiameter_mm)} mm · Linha: ${f(P.lineWidth_mm)} mm · Camada: ${f(P.layerHeight_mm)} mm (1ª: ${f(P.firstLayerHeight_mm)})`)
  push(`; Paredes: ${P.wallCount} · Infill: ${P.infillPattern} ${P.infillDensity}%` + (P.strandSpacing_mm ? ` · espaçamento ${f(P.strandSpacing_mm)} mm` : ""))
  push(`; Velocidades (mm/s): perímetro ${P.speedPerimeter_mms} · infill ${P.speedInfill_mms} · 1ª camada ${P.speedFirstLayer_mms} · travel ${P.speedTravel_mms}`)
  for (const h of tools.heads) {
    const hx = h.extrusion
    if (hx.kind === "syringe_stepper" && hx.syringe) push(`; T${h.index} ${h.label}: seringa ${hx.syringe.volume_mL} mL (Ø int ${f(hx.syringe.innerDiameter_mm, 2)} mm) · E = mm de êmbolo · fluxo ×${f(hx.flowMultiplier, 2)}`)
    else if (hx.kind === "pneumatic") push(`; T${h.index} ${h.label}: pneumática ${hx.pressure_kPa ?? "?"} kPa · E virtual`)
    else push(`; T${h.index} ${h.label}: filamento equivalente Ø${f(hx.filamentDiameter_mm ?? 1.75, 2)} mm`)
  }
  push(`; Camadas: ${layers.length} · Cópias: ${copies.length}`)
  push(`;LAYER_COUNT:${layers.length * copies.length}`)
  const meta = {
    generator: "bia-bioslicer-r20", profileId: opt.profileId, layerCount: layers.length,
    layerHeight_mm: P.layerHeight_mm, nozzle_mm: P.nozzleDiameter_mm, infill: P.infillPattern,
    infillDensity: P.infillDensity, extruder: X.kind, syringe_mL: X.syringe?.volume_mL ?? null,
    target: target.kind, wells: copies.length, tools: tools.heads.length,
    toolLabels: tools.heads.map((h) => h.label).join("|"), ...opt.meta,
  }
  push(`;BIA_META ${JSON.stringify(meta)}`)
  push(`; Extrusão: fator ${X.flowMultiplier.toFixed(2)}× (Q_real/Q_teórico)${X.bioinkClass ? ` · classe ${X.bioinkClass}` : ""} · seringa ${X.syringe?.volume_mL ?? 10} mL`)
  push(`; Geometry: ${opt.meta?.geometryId ?? opt.meshName ?? "stl"}`)
  push(`; ═══════════════════════════════════════════════════════════`)
  push(``)

  push(`; ─── START ──────────────────────────────────────────────────`)
  push(`G21                    ; mm`)
  push(`G90                    ; posicionamento absoluto`)
  push(`M83                    ; extrusão RELATIVA (compatível com M221 em tempo real)`)
  if (P.firmware === "marlin" || P.firmware === "reprap") push(`M302 S0                ; permitir extrusão a frio (seringa)`)
  push(`; ⚠️ NENHUM G28 (home) — bioimpressora preserva bandeja/cartucho`)
  push(`; 📍 PONTO ZERO: posicione o bico ${refWell ? `sobre o centro do poço ${refWell}` : "sobre o centro do alvo"} ANTES de iniciar`)
  push(`G92 X0 Y0 Z${f(P.zOffset_mm)} E0  ; zerar coordenadas AQUI (ponto atual = origem)`)
  if (multiTool) {
    push(`T0                     ; começa no cabeçote 0`)
    if (!tools.applyOffsetInPath) {
      for (const h of tools.heads) if (h.index > 0 && (h.offsetX_mm || h.offsetY_mm)) push(`M218 T${h.index} X${f(h.offsetX_mm)} Y${f(h.offsetY_mm)}  ; offset do cabeçote ${h.index} (firmware)`)
    }
    for (const h of tools.heads) if (h.temp_C !== null) push(`M104 T${h.index} S${f(h.temp_C, 1)}  ; temperatura T${h.index} (sem esperar)`)
  } else if (P.cartridgeTemp_C !== null) {
    push(`M104 S${f(P.cartridgeTemp_C, 1)}  ; temperatura do cartucho (sem esperar)`)
  }
  if (P.bedTemp_C !== null) push(`M140 S${f(P.bedTemp_C, 1)}  ; temperatura da mesa (sem esperar — estabilize antes pelo painel)`)
  if (X.kind === "pneumatic" && X.pressure_kPa) push(`; pressão: ${X.pressure_kPa} kPa (ajuste no regulador / M-code do fabricante)`)
  // R27 · NÃO escrevemos M220/M221 aqui: o Host aplica o fluxo da memória da
  // biotinta ANTES do stream; um M221 S100 no arquivo zerava esse ajuste no
  // meio do START ("aumentei o fluxo e voltou para 100 %").
  push(`; fluxo (M221) e velocidade (M220) são do HOST — não são redefinidos aqui`)
  // R27 · LIMITES DO EIXO E PARA SERINGA — o firmware vem com jerk/aceleração
  // de filamento; com 2 000–9 000 steps/mm o motor perde passos e o êmbolo
  // não anda ("ok" sem movimento). Sem M500: vale só para este job.
  const X0 = tools.heads[0].extrusion
  const LIM = plungerLimits(X0.eSteps, X0.plungerMaxFeed_mms)
  if (X0.kind === "syringe_stepper" && (P.firmware === "marlin" || P.firmware === "reprap")) {
    push(`; ─── LIMITES DO ÊMBOLO R27 (${LIM.eSteps}${LIM.assumed ? " steps/mm assumidos — calibre no Host" : " steps/mm"}) ───`)
    for (const l of plungerLimitsGcode(LIM)) push(l)
  }
  if (P.customStart.trim()) {
    push(`; custom start:`)
    for (const l of P.customStart.split(/\r?\n/)) if (l.trim()) push(l.trim())
  }
  // R25 · PRÉ-CARGA: encher agulha + luer e fazer o filamento aparecer na ponta
  // ANTES do primeiro cordão. Sem isto a cabeça anda e nada sai (dead volume
  // de 22G×25 mm + luer ≈ 43 µL ≫ 0,13 mm² × poucos mm de cordão).
  {
    const cls = (X0.bioinkClass as BioinkClass | undefined) && BIOINK_CLASSES[X0.bioinkClass as BioinkClass] ? (X0.bioinkClass as BioinkClass) : undefined
    const auto = needleDeadVolume_uL(P.nozzleDiameter_mm) + (cls ? BIOINK_CLASSES[cls].extraPrime_uL : 6)
    const vol = X0.startPrime_uL === undefined ? auto : Math.max(0, X0.startPrime_uL)
    if (vol > 0) {
      const eP = volumeToE(vol, X0)
      // R27: enche a agulha a ~10 µL/s (22G → ~75 mm/s de jato, sem espirrar),
      // em 2 etapas: 70 % rápido + 30 % lento para a pressão estabilizar; o
      // feed respeita os limites do êmbolo (antes era F9 = 0,15 mm/s FIXO,
      // levava 6 s para 0,87 mm e, em seringa 10 mL, 0,3 mm não vencia o backlash).
      const e1 = eP * 0.7, e2 = eP - e1
      const f1 = safePlungerFeed_mmmin(e1, (vol * 0.7) / 10, LIM)
      const f2 = safePlungerFeed_mmmin(e2, (vol * 0.3) / 4, LIM)
      push(`; ─── PRÉ-CARGA R25/R27: ${vol.toFixed(1)} µL (agulha ${P.nozzleDiameter_mm} mm + luer${cls ? ` · ${BIOINK_CLASSES[cls].label}` : ""}) ───`)
      push(`G1 E${f(e1, 4)} F${f1}          ; encher agulha + luer (${e1.toFixed(3)} mm de êmbolo)`)
      push(`G1 E${f(e2, 4)} F${f2}          ; fazer o filamento aparecer na ponta (${e2.toFixed(3)} mm)`)
      push(`G4 P400                ; estabilizar pressão`)
      eTotal += eP; time += e1 / (f1 / 60) + e2 / (f2 / 60) + 0.4
      push(`; dica: se já pré-carregou pelo Host, defina startPrime_uL = 0 no perfil`)
    }
  }
  push(``)

  // ── estado da máquina virtual ──
  let cur: Vec2 = { x: 0, y: 0 }
  let curZ = P.zOffset_mm
  let retracted = false
  let firstBeadDone = false
  let activeTool: ToolHead = tools.heads[0]
  let XA: ExtrusionModel = activeTool.extrusion // modelo de extrusão ATIVO
  // R27 · feed de retração/prime limitado pelo êmbolo (antes F120 = 2 mm/s fixo
  // → 6 000–18 000 steps/s em seringa: perdia passos e o prime não acontecia).
  const limF = (mms: number) => F(Math.min(mms, LIM.maxFeed_mms))
  let eRetract = volumeToE(XA.retractVolume_uL, XA)
  let ePrime = volumeToE(XA.primeVolume_uL, XA)
  let retractF = limF(XA.retractSpeed_mms)
  // R27 · Fluxo CONTÍNUO por caminho: antes cada trecho fazia prime → G4 150 ms
  // → cordão → "des-prime" (G1 E-prime). Em hidrogel isso é um puxa-empurra que
  // NÃO repõe pressão (o gel é compressível) e cria uma pausa seca a cada linha
  // de infill (72 arranques × 0,15 s = 11 s parados com a agulha na peça).
  // Agora: o prime só acontece quando há retração ANTES (recupera o que foi
  // puxado + prime) ou quando o travel foi longo o bastante para a pressão cair;
  // o volume do prime NÃO é recuado no fim — a retração (se houver) é a única
  // responsável por aliviar pressão em travels longos.
  const firstLayerFlow = Math.max(0.8, Math.min(2, XA.firstLayerFlow ?? 1.15))

  const applyOffset = (p: Vec2): Vec2 =>
    tools.applyOffsetInPath && (activeTool.offsetX_mm || activeTool.offsetY_mm)
      ? { x: p.x - activeTool.offsetX_mm, y: p.y - activeTool.offsetY_mm }
      : p

  const switchTool = (h: ToolHead, zTop: number) => {
    if (h.index === activeTool.index) return
    push(`; ─── troca de cabeçote T${activeTool.index} → T${h.index} (${h.label}) ───`)
    // retrai o cabeçote que sai
    const eOut = volumeToE(tools.retractBeforeSwitch_uL, XA)
    if (eOut > 0) { push(`G1 E-${f(eOut, 4)} F${retractF}`); time += eOut / Math.max(0.1, XA.retractSpeed_mms) }
    // sobe para não arrastar
    const hop = Math.max(P.zHop_mm, 1)
    push(`G0 Z${f(zTop + hop)} F${F(P.speedZ_mms)}`)
    push(`T${h.index}`)
    activeTool = h
    XA = h.extrusion
    eRetract = volumeToE(XA.retractVolume_uL, XA)
    ePrime = volumeToE(XA.primeVolume_uL, XA)
    retractF = limF(XA.retractSpeed_mms)
    retracted = false
    // escorva o cabeçote que entra
    const eIn = volumeToE(tools.primeAfterSwitch_uL, XA)
    if (eIn > 0) { push(`G1 E${f(eIn, 4)} F${retractF}`); eTotal += eIn; time += eIn / Math.max(0.1, XA.retractSpeed_mms) }
    if (tools.dwellAfterSwitch_s > 0) { push(`G4 S${f(tools.dwellAfterSwitch_s, 1)}`); time += tools.dwellAfterSwitch_s }
    curZ = zTop + hop
    toolChanges++
    push(`;TOOL:${h.index}`)
  }

  let lastTravel_mm = 0
  const goTravel = (to: Vec2, zTop: number) => {
    const d = dist(cur, to)
    lastTravel_mm = d
    if (d < 1e-6 && Math.abs(zTop - curZ) < 1e-6) return
    if (d >= P.retractMinTravel_mm && eRetract > 0 && !retracted) {
      push(`G1 E-${f(eRetract, 4)} F${retractF}`)
      retracted = true
      time += eRetract / Math.max(0.05, retractF / 60)
    }
    const hop = d >= P.retractMinTravel_mm ? P.zHop_mm : 0
    if (hop > 0) { push(`G0 Z${f(zTop + hop)} F${F(P.speedZ_mms)}`); time += hop / P.speedZ_mms }
    const o = applyOffset(to)
    push(`G0 X${f(o.x)} Y${f(o.y)} F${F(P.speedTravel_mms)}`)
    time += d / P.speedTravel_mms
    travel += d
    if (hop > 0 || Math.abs(zTop - curZ) > 1e-6) { push(`G0 Z${f(zTop)} F${F(P.speedZ_mms)}`); time += hop / P.speedZ_mms }
    cur = to
    curZ = zTop
  }

  const startExtrusion = (opts: { isFirstOfJob?: boolean } = {}) => {
    const vF = Math.max(0.05, retractF / 60)
    // recupera a retração + prime num único movimento (uma linha, sem pausa)
    let eIn = 0
    if (retracted && eRetract > 0) { eIn += eRetract; retracted = false }
    // prime só quando a pressão realmente caiu: 1º cordão do job/poço, após
    // retração, ou travel longo (≥ 3× o mínimo de retração) sem retração
    const pressureDropped = opts.isFirstOfJob || eIn > 0 || lastTravel_mm >= Math.max(3 * P.retractMinTravel_mm, 6)
    if (ePrime > 0 && pressureDropped) { eIn += ePrime; eTotal += ePrime }
    if (eIn > 0) {
      push(`G1 E${f(eIn, 4)} F${retractF}`)
      time += eIn / vF
      // dwell só no 1º cordão do job (pressão subindo do zero) — nunca a cada linha
      if (opts.isFirstOfJob && XA.primeDwell_ms > 0) { push(`G4 P${Math.round(XA.primeDwell_ms)}`); time += XA.primeDwell_ms / 1000 }
    }
    lastTravel_mm = 0
    starts++
  }

  // R27: sem "des-prime" no fim do caminho — ver nota acima.
  const endExtrusion = () => { /* intencionalmente vazio */ }

  const addVolume = (tp: ToolPath, hMm: number, len: number, mult = 1) => {
    const v = beadArea_mm2(tp.lineWidth_mm, hMm) * len * XA.flowMultiplier * mult
    volume += v
    volumeByTool[activeTool.index] = (volumeByTool[activeTool.index] ?? 0) + v
  }

  // ── purge line (opt-in) ──
  if (P.purgeLine_mm > 0 && layers.length) {
    const h = layers[0].height_mm
    const zTop = P.zOffset_mm + h
    push(`;TYPE:SKIRT`)
    push(`; purge line ${P.purgeLine_mm} mm`)
    push(`G1 Z${f(zTop)} F${F(P.speedZ_mms)}`)
    const e = ePerMm(P.lineWidth_mm * 1.5, h, XA) * P.purgeLine_mm * firstLayerFlow
    push(`G1 X${f(P.purgeLine_mm)} Y0 E${f(e, 4)} F${F(P.speedFirstLayer_mms)}`)
    cur = { x: P.purgeLine_mm, y: 0 }
    curZ = zTop
    extrude += P.purgeLine_mm; eTotal += e
    volume += beadArea_mm2(P.lineWidth_mm * 1.5, h) * P.purgeLine_mm * XA.flowMultiplier * firstLayerFlow
    time += P.purgeLine_mm / P.speedFirstLayer_mms
    starts++
    firstBeadDone = true
  }

  // ── cópias (poços) × camadas × caminhos ──
  let globalLayer = 0
  for (let ci = 0; ci < copies.length; ci++) {
    const copy = copies[ci]
    if (copies.length > 1 || target.kind === "plate") {
      push(``)
      push(`; ═══ ${refWell ? `POÇO ${copy.id}` : "PEÇA"} · offset (${f(copy.dx)}, ${f(copy.dy)}) ═══`)
      push(`;WELL:${copy.id}`)
    }
    if (ci > 0 && target.kind === "plate") {
      // travel seguro para o próximo poço: Z-hop alto, ir, descer no início da 1ª camada
      const hop = Math.max(target.zHop_mm, 2)
      const zTopLast = curZ
      if (eRetract > 0 && !retracted) { push(`G1 E-${f(eRetract, 4)} F${retractF}`); retracted = true }
      push(`G0 Z${f(zTopLast + hop)} F${F(P.speedZ_mms)}      ; z-hop entre poços`)
      const o = applyOffset({ x: copy.dx, y: copy.dy })
      push(`G0 X${f(o.x)} Y${f(o.y)} F${F(P.speedTravel_mms)}  ; centro do poço ${copy.id}`)
      travel += dist(cur, { x: copy.dx, y: copy.dy }); time += dist(cur, { x: copy.dx, y: copy.dy }) / P.speedTravel_mms + hop / P.speedZ_mms
      cur = { x: copy.dx, y: copy.dy }
      curZ = zTopLast + hop
      if (target.pause_s > 0) { push(`G4 S${f(target.pause_s, 1)}             ; pausa entre poços`); time += target.pause_s }
      if (target.purge_uL > 0) { const e = volumeToE(target.purge_uL, XA); const pf = safePlungerFeed_mmmin(e, target.purge_uL / 10, LIM); push(`G1 E${f(e, 4)} F${pf}  ; purga ${target.purge_uL} µL`); eTotal += e; retracted = false; time += e / (pf / 60) }
      // o 1º cordão do poço também nasce no centro do poço (sem travel seco)
      firstBeadDone = false
    }

    for (const L of layers) {
      const zTop = P.zOffset_mm + (L.z_mm - layers[0].z_mm) + layers[0].height_mm / 2 + L.height_mm / 2
      push(``)
      push(`;LAYER:${globalLayer}`)
      push(`;Z:${f(zTop)}`)
      if (P.verboseComments) push(`; camada ${L.index + 1}/${layers.length}${copies.length > 1 ? ` · ${copy.id}` : ""} · z=${f(zTop)} mm · h=${f(L.height_mm)} mm · ${L.paths.length} caminhos`)
      if (P.customLayerChange.trim() && L.index > 0) for (const l of P.customLayerChange.split(/\r?\n/)) if (l.trim()) push(l.trim())
      if (P.layerPause_s > 0 && L.index > 0) { push(`G4 S${f(P.layerPause_s, 1)}        ; pausa entre camadas (gelificação)`); time += P.layerPause_s }
      globalLayer++

      // R20: agrupa caminhos por ferramenta dentro da camada para minimizar trocas
      const layerHead = toolForLayer(tools, L.index)
      const headOf = (tp: ToolPath) => (tp.tool !== undefined ? (tools.heads.find((h) => h.index === tp.tool) ?? tools.heads[0]) : layerHead ?? toolForRole(tools, tp.role))
      const ordered = multiTool ? [...L.paths].sort((a, b) => headOf(a).index - headOf(b).index) : L.paths

      let lastRole: string | null = null
      for (const tp0 of ordered) {
        if (tp0.points.length < 2) continue
        // aplica offset do poço
        const tp: ToolPath = copy.dx || copy.dy ? { ...tp0, points: tp0.points.map((p) => ({ x: p.x + copy.dx, y: p.y + copy.dy })) } : tp0
        const head = headOf(tp)
        if (multiTool && head.index !== activeTool.index) {
          if (firstBeadDone) switchTool(head, zTop)
          else { // ainda não imprimiu nada nesta cópia: troca sem hop
            push(`T${head.index}`); activeTool = head; XA = head.extrusion
            eRetract = volumeToE(XA.retractVolume_uL, XA); ePrime = volumeToE(XA.primeVolume_uL, XA); retractF = F(XA.retractSpeed_mms)
            toolChanges++; push(`;TOOL:${head.index}`)
          }
        }
        const role = roleTag(tp.role)
        if (role !== lastRole) { push(`;TYPE:${role}`); lastRole = role }
        // R27 · 1ª camada com fluxo extra (adesão + pressão ainda subindo)
        const layerMult = L.index === 0 ? firstLayerFlow : 1
        const eMm = ePerMm(tp.lineWidth_mm, L.height_mm, XA) * layerMult
        const speedF = F(tp.speed_mms)
        let pts = tp.points

        if (!firstBeadDone) {
          // PONTO ZERO É PONTO ZERO — o 1º cordão desta cópia nasce no centro
          // (cur). Rotaciona o caminho para o vértice mais próximo e EXTRUDA a
          // aproximação (sem travel seco).
          let bi = 0, bd = Infinity
          for (let i = 0; i < pts.length; i++) { const d = (pts[i].x - cur.x) ** 2 + (pts[i].y - cur.y) ** 2; if (d < bd) { bd = d; bi = i } }
          if (tp.closed) pts = [...pts.slice(bi), ...pts.slice(0, bi)]
          else if (bi > pts.length / 2) pts = [...pts].reverse()
          const first = pts[0]
          push(`G1 Z${f(zTop)} F${F(P.speedZ_mms)}        ; altura da 1ª camada, sem sair do ponto zero`)
          curZ = zTop
          startExtrusion({ isFirstOfJob: true })
          const d0 = dist(cur, first)
          if (d0 > 1e-3) {
            const e0 = d0 * eMm
            const o = applyOffset(first)
            push(`G1 X${f(o.x)} Y${f(o.y)} E${f(e0, 5)} F${speedF}  ; aproximação extrudada a partir do ponto zero`)
            eTotal += e0; extrude += d0; time += d0 / tp.speed_mms
            addVolume(tp, L.height_mm, d0, layerMult)
          }
          cur = first
          firstBeadDone = true
        } else {
          goTravel(pts[0], zTop)
          startExtrusion()
        }

        const seq = tp.closed ? [...pts, pts[0]] : pts
        let segLen = 0
        for (let i = 1; i < seq.length; i++) {
          const p = seq[i]
          const d = dist(seq[i - 1], p)
          if (d < 1e-6) continue
          const e = d * eMm
          const o = applyOffset(p)
          push(`G1 X${f(o.x)} Y${f(o.y)} E${f(e, 5)}${i === 1 ? ` F${speedF}` : ""}`)
          segLen += d
          eTotal += e
          time += d / tp.speed_mms
        }
        extrude += segLen
        addVolume(tp, L.height_mm, segLen, layerMult)
        endExtrusion()
        cur = seq[seq.length - 1]
      }
    }
  }

  // ── fim seguro: sem park ──
  push(``)
  push(`; ─── END ────────────────────────────────────────────────────`)
  if (eRetract > 0 && !retracted) push(`G1 E-${f(eRetract, 4)} F${retractF}`)
  push(`M400                   ; aguarda fila`)
  push(`G91                    ; relativo`)
  push(`G0 Z5 F${F(P.speedZ_mms)}             ; sobe 5 mm (afasta o bico da peça)`)
  push(`G90                    ; absoluto`)
  if (multiTool) { for (const h of tools.heads) if (h.temp_C !== null) push(`M104 T${h.index} S0`) }
  else if (P.cartridgeTemp_C !== null) push(`M104 S0                ; cartucho off`)
  if (P.bedTemp_C !== null) push(`M140 S0                ; mesa off`)
  if (P.customEnd.trim()) {
    push(`; custom end:`)
    for (const l of P.customEnd.split(/\r?\n/)) if (l.trim()) push(l.trim())
  }
  push(`; ⚠️ SEM park / SEM G28 — bico fica sobre a peça; mova manualmente pelo joystick`)
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
      volumeByTool_uL: Object.fromEntries(Object.entries(volumeByTool).map(([k, v]) => [k, round(v)])),
      toolChanges,
      wells: copies.length,
    },
  }
}

function roleTag(role: PathRole): string {
  switch (role) {
    case "wall_outer": return "WALL-OUTER"
    case "wall_inner": return "WALL-INNER"
    case "skirt": case "purge": return "SKIRT"
    case "support": return "SUPPORT"
    default: return "FILL"
  }
}

function round(n: number, d = 2): number {
  const k = 10 ** d
  return Math.round(n * k) / k
}
