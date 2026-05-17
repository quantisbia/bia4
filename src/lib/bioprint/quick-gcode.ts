/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Quick-GCode Engine — Geração rápida e simples (R12.12)
 *
 *  Filosofia: usuário define biotinta + modelo simples → G-code SAI EM <1s.
 *  Sem LLM, sem Voronoi pré-computado, sem well-plates, sem timeout 45s.
 *
 *  Geometrias suportadas (parametrizáveis):
 *    - cubo (l × w × h)
 *    - cilindro/disco (Ø × h)
 *    - grid/scaffold simples (l × w × h, pitch)
 *    - esfera oca (R externo, espessura)
 *    - patch retangular (l × w × h fino)
 *
 *  Infill suportado:
 *    - linhas paralelas (rectilinear) — alterna 0°/90° por camada
 *    - concêntrico — espirais offset (para discos)
 *    - sem infill (oco)
 *
 *  Saída: G-code Marlin-compatível com header BIA, SEM G28 (preserva bandeja).
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Tipos ──────────────────────────────────────────────────────────────

export type QuickGeometryId = "cube" | "disk" | "grid" | "patch" | "hollow-sphere"

export type QuickInfillPattern = "rectilinear" | "concentric" | "none"

export interface QuickGeometry {
  id: QuickGeometryId
  /** Largura X (mm) */
  width: number
  /** Profundidade Y (mm) */
  depth: number
  /** Altura Z (mm) */
  height: number
  /** Para grid: passo do grid (mm); para disk: ignorado */
  pitch?: number
  /** Para hollow-sphere: espessura da parede (mm) */
  wallThickness?: number
}

export interface QuickBioinkParams {
  /** Nome do material (livre, ex: "GelMA 10%") */
  materialLabel: string
  /** Diâmetro do bico em mm (típico 0.25–0.6) */
  nozzleDiameter_mm: number
  /** Viscosidade Pa·s (para metadata e estimativa de pressão) */
  viscosity_PaS: number
  /** Velocidade de impressão mm/s */
  printSpeed_mms: number
  /** Velocidade de travel mm/s */
  travelSpeed_mms: number
  /** Pressão sugerida kPa (opcional, p/ comentário) */
  pressure_kpa?: number
  /** Tem células? (p/ comentário) */
  hasCells?: boolean
  /** Tipo celular (opcional, p/ comentário) */
  cellType?: string | null
  /** Densidade celular ×10⁶ cel/mL (opcional) */
  cellDensity_M_per_mL?: number | null
  /** Crosslinker (opcional, p/ comentário) */
  crosslinker?: string | null
}

export interface QuickGcodeOptions {
  /** Altura de cada camada em mm (típico 0.2-0.4) */
  layerHeight_mm: number
  /** Padrão de infill */
  infillPattern: QuickInfillPattern
  /** Densidade de infill 0-100% (ignorado se "none") */
  infillDensity_pct: number
  /** Número de paredes externas (typical 1-3) */
  walls: number
  /** Nome do job para o header */
  jobName?: string
}

export interface QuickGcodeResult {
  /** G-code completo pronto para enviar */
  gcode: string
  /** Total de camadas */
  layerCount: number
  /** Quantidade total de bioink em mm³ (≈ µL) */
  bioinkVolume_uL: number
  /** Tempo estimado em minutos */
  estimatedTime_min: number
  /** Total de moves */
  moveCount: number
  /** Comentários explicando o racional, em linguagem simples */
  rationale: string[]
  /** Avisos relevantes */
  warnings: string[]
}

// ─── Helpers internos ────────────────────────────────────────────────────

interface Point { x: number; y: number }
interface Move {
  type: "G0" | "G1"  // G0 = travel, G1 = extrude
  x: number
  y: number
  z: number
  e?: number  // extrusão acumulada
  f: number   // feedrate em mm/min
  comment?: string
}

const mmsToMmMin = (mms: number) => mms * 60

/** Volume extrudado por mm de movimento (volumétrico) */
function extrusionPerMm(nozzle_mm: number, layerHeight_mm: number): number {
  // Aproximação: filete retangular de seção (nozzle × layer)
  return nozzle_mm * layerHeight_mm
}

/** Distância euclidiana 2D */
function dist(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

// ─── Geometria: walls (contornos externos) ──────────────────────────────

function generateCubeWalls(geom: QuickGeometry, layerHeight: number, z: number): Point[][] {
  // Retângulo centrado em (cx, cy)
  const cx = 0, cy = 0
  const w2 = geom.width / 2
  const d2 = geom.depth / 2
  return [
    [
      { x: cx - w2, y: cy - d2 },
      { x: cx + w2, y: cy - d2 },
      { x: cx + w2, y: cy + d2 },
      { x: cx - w2, y: cy + d2 },
      { x: cx - w2, y: cy - d2 },
    ],
  ]
}

function generateDiskWalls(geom: QuickGeometry, layerHeight: number, z: number): Point[][] {
  const r = Math.min(geom.width, geom.depth) / 2
  const N = Math.max(32, Math.ceil(r * 4))  // resolução ~ 4 pontos/mm
  const ring: Point[] = []
  for (let i = 0; i <= N; i++) {
    const a = (2 * Math.PI * i) / N
    ring.push({ x: r * Math.cos(a), y: r * Math.sin(a) })
  }
  return [ring]
}

function generateHollowSphereWalls(geom: QuickGeometry, layerHeight: number, z: number): Point[][] {
  // Esfera oca → cada layer é um anel cuja raio depende de z
  const R = Math.min(geom.width, geom.depth, geom.height) / 2
  const cz = R  // centro da esfera em Z (apoiada na bandeja)
  const dz = z - cz
  if (Math.abs(dz) >= R - 0.01) return []  // pólos
  const r_outer = Math.sqrt(R * R - dz * dz)
  const wall = geom.wallThickness ?? 1.5
  const r_inner = Math.max(0, r_outer - wall)
  const rings: Point[][] = []
  for (const r of [r_outer, r_inner]) {
    if (r < 0.5) continue
    const N = Math.max(24, Math.ceil(r * 4))
    const ring: Point[] = []
    for (let i = 0; i <= N; i++) {
      const a = (2 * Math.PI * i) / N
      ring.push({ x: r * Math.cos(a), y: r * Math.sin(a) })
    }
    rings.push(ring)
  }
  return rings
}

/** Patch é um cubo bem fino — mesmo wall que cubo */
const generatePatchWalls = generateCubeWalls

/** Grid é um cubo aberto — só contornos */
const generateGridWalls = generateCubeWalls

// ─── Infill ──────────────────────────────────────────────────────────────

/**
 * Gera segmentos de linhas paralelas dentro de um retângulo (alinhamento por ângulo).
 * Usa raster simples; alterna ângulo 0°/90° por camada (cross-hatch).
 */
function generateRectilinearInfill(
  geom: QuickGeometry,
  layerIdx: number,
  density_pct: number,
  nozzle_mm: number,
): Array<[Point, Point]> {
  if (density_pct <= 0) return []
  const angle = layerIdx % 2 === 0 ? 0 : Math.PI / 2

  const w2 = geom.width / 2
  const d2 = geom.depth / 2

  // Spacing baseado em densidade (100% = nozzle_mm, 0% = nunca)
  const spacing = Math.max(nozzle_mm * 1.2, nozzle_mm / (density_pct / 100))

  const segs: Array<[Point, Point]> = []

  if (angle === 0) {
    // Linhas paralelas a X (varia Y)
    let y = -d2 + spacing / 2
    let dirRight = true
    while (y < d2 - spacing / 4) {
      const a: Point = { x: dirRight ? -w2 : w2, y }
      const b: Point = { x: dirRight ? w2 : -w2, y }
      segs.push([a, b])
      y += spacing
      dirRight = !dirRight  // serpentina (boustrophedon)
    }
  } else {
    // Linhas paralelas a Y (varia X)
    let x = -w2 + spacing / 2
    let dirUp = true
    while (x < w2 - spacing / 4) {
      const a: Point = { x, y: dirUp ? -d2 : d2 }
      const b: Point = { x, y: dirUp ? d2 : -d2 }
      segs.push([a, b])
      x += spacing
      dirUp = !dirUp
    }
  }
  return segs
}

/**
 * Para grid: linhas mais espaçadas formando malha aberta (scaffold poroso).
 */
function generateGridInfill(
  geom: QuickGeometry,
  layerIdx: number,
  pitch_mm: number,
): Array<[Point, Point]> {
  const w2 = geom.width / 2
  const d2 = geom.depth / 2
  const segs: Array<[Point, Point]> = []

  if (layerIdx % 2 === 0) {
    let y = -d2 + pitch_mm
    let dirRight = true
    while (y < d2) {
      segs.push([
        { x: dirRight ? -w2 : w2, y },
        { x: dirRight ? w2 : -w2, y },
      ])
      y += pitch_mm
      dirRight = !dirRight
    }
  } else {
    let x = -w2 + pitch_mm
    let dirUp = true
    while (x < w2) {
      segs.push([
        { x, y: dirUp ? -d2 : d2 },
        { x, y: dirUp ? d2 : -d2 },
      ])
      x += pitch_mm
      dirUp = !dirUp
    }
  }
  return segs
}

/**
 * Concêntrico: espirais offset (apenas p/ disk).
 */
function generateConcentricInfill(
  geom: QuickGeometry,
  density_pct: number,
  nozzle_mm: number,
): Array<[Point, Point]> {
  if (density_pct <= 0) return []
  const r_max = Math.min(geom.width, geom.depth) / 2
  const spacing = Math.max(nozzle_mm * 1.2, nozzle_mm / (density_pct / 100))
  const segs: Array<[Point, Point]> = []

  // Anéis concêntricos
  let r = r_max - spacing
  while (r > spacing / 2) {
    const N = Math.max(24, Math.ceil(r * 4))
    let prev: Point = { x: r, y: 0 }
    for (let i = 1; i <= N; i++) {
      const a = (2 * Math.PI * i) / N
      const next: Point = { x: r * Math.cos(a), y: r * Math.sin(a) }
      segs.push([prev, next])
      prev = next
    }
    r -= spacing
  }
  return segs
}

// ─── Geração de moves a partir de polígonos/segmentos ───────────────────

interface MoveAcc {
  list: Move[]
  e: number             // extrusão acumulada
  last: Point | null    // última posição
  z: number
  ePerMm: number
}

function emitPolygon(acc: MoveAcc, poly: Point[], feedrate_mms: number, travelSpeed_mms: number, comment?: string) {
  if (poly.length < 2) return
  // Travel até o primeiro ponto
  const first = poly[0]
  if (!acc.last || dist(acc.last, first) > 0.05) {
    acc.list.push({
      type: "G0",
      x: first.x, y: first.y, z: acc.z,
      f: mmsToMmMin(travelSpeed_mms),
      comment: comment ? `travel: ${comment}` : "travel",
    })
  }
  acc.last = { x: first.x, y: first.y }

  // Extrude pelos pontos
  for (let i = 1; i < poly.length; i++) {
    const p = poly[i]
    const d = dist(acc.last!, p)
    acc.e += d * acc.ePerMm
    acc.list.push({
      type: "G1",
      x: p.x, y: p.y, z: acc.z,
      e: acc.e,
      f: mmsToMmMin(feedrate_mms),
      comment: i === 1 ? comment : undefined,
    })
    acc.last = { x: p.x, y: p.y }
  }
}

function emitSegments(acc: MoveAcc, segs: Array<[Point, Point]>, feedrate_mms: number, travelSpeed_mms: number, comment?: string) {
  for (const [a, b] of segs) {
    if (!acc.last || dist(acc.last, a) > 0.05) {
      acc.list.push({
        type: "G0",
        x: a.x, y: a.y, z: acc.z,
        f: mmsToMmMin(travelSpeed_mms),
      })
    }
    acc.last = { x: a.x, y: a.y }
    const d = dist(a, b)
    acc.e += d * acc.ePerMm
    acc.list.push({
      type: "G1",
      x: b.x, y: b.y, z: acc.z,
      e: acc.e,
      f: mmsToMmMin(feedrate_mms),
      comment,
    })
    acc.last = { x: b.x, y: b.y }
  }
}

// ─── Função principal ───────────────────────────────────────────────────

/**
 * Gera G-code rápido para uma geometria simples + biotinta + opções.
 * Síncrona, sem rede, sem LLM, sem cache pesado. Tempo típico: <100ms.
 */
export function generateQuickGcode(
  geom: QuickGeometry,
  bioink: QuickBioinkParams,
  opts: QuickGcodeOptions,
): QuickGcodeResult {
  const warnings: string[] = []
  const rationale: string[] = []

  // ─── Validações ───
  if (geom.width <= 0 || geom.depth <= 0 || geom.height <= 0) {
    throw new Error("Dimensões da geometria devem ser positivas")
  }
  if (bioink.nozzleDiameter_mm <= 0) {
    throw new Error("Diâmetro do bico deve ser positivo")
  }
  if (opts.layerHeight_mm <= 0 || opts.layerHeight_mm > 1) {
    throw new Error("Layer height deve estar entre 0 e 1 mm")
  }
  if (opts.layerHeight_mm > bioink.nozzleDiameter_mm * 0.8) {
    warnings.push(
      `Layer height (${opts.layerHeight_mm} mm) > 80% do nozzle (${bioink.nozzleDiameter_mm} mm). ` +
      `Reduza para melhorar adesão entre camadas.`,
    )
  }
  if (opts.layerHeight_mm < bioink.nozzleDiameter_mm * 0.25) {
    warnings.push(
      `Layer height muito baixo (< 25% do nozzle). Tempo de impressão será longo.`,
    )
  }

  // ─── Racional explicativo ───
  rationale.push(
    `🧬 Biotinta: ${bioink.materialLabel}${bioink.hasCells ? ` com células ${bioink.cellType ?? ""}` : " (acelular)"}.`,
  )
  rationale.push(
    `🎯 Geometria: ${geometryLabel(geom.id)} ${geom.width}×${geom.depth}×${geom.height} mm.`,
  )
  rationale.push(
    `🖨️ Camadas: ${Math.ceil(geom.height / opts.layerHeight_mm)} de ${opts.layerHeight_mm} mm cada (bico Ø${bioink.nozzleDiameter_mm} mm).`,
  )
  rationale.push(
    `🌐 Infill: ${infillLabel(opts.infillPattern)}${opts.infillPattern !== "none" ? ` @ ${opts.infillDensity_pct}%` : ""}.`,
  )
  rationale.push(
    `⏱️ Velocidades: ${bioink.printSpeed_mms} mm/s (impressão) · ${bioink.travelSpeed_mms} mm/s (travel).`,
  )

  // ─── Setup ───
  const nozzle = bioink.nozzleDiameter_mm
  const ePerMm = extrusionPerMm(nozzle, opts.layerHeight_mm)
  const numLayers = Math.max(1, Math.ceil(geom.height / opts.layerHeight_mm))

  const acc: MoveAcc = {
    list: [],
    e: 0,
    last: null,
    z: 0,
    ePerMm,
  }

  // ─── Iterar por camadas ───
  for (let li = 0; li < numLayers; li++) {
    const z = (li + 1) * opts.layerHeight_mm
    acc.z = z

    // 1. WALLS (contornos)
    let walls: Point[][]
    switch (geom.id) {
      case "cube":          walls = generateCubeWalls(geom, opts.layerHeight_mm, z); break
      case "disk":          walls = generateDiskWalls(geom, opts.layerHeight_mm, z); break
      case "grid":          walls = generateGridWalls(geom, opts.layerHeight_mm, z); break
      case "patch":         walls = generatePatchWalls(geom, opts.layerHeight_mm, z); break
      case "hollow-sphere": walls = generateHollowSphereWalls(geom, opts.layerHeight_mm, z); break
      default:              walls = []
    }

    // Para múltiplas paredes, offset cada uma (simplificado: só desenha a externa N vezes com pequeno offset)
    const numWalls = Math.max(1, opts.walls)
    for (let w = 0; w < numWalls && w < 3; w++) {
      const offset = w * nozzle
      for (const poly of walls) {
        const shifted = offset > 0 ? shrinkPolygon(poly, offset) : poly
        if (shifted.length >= 2) {
          emitPolygon(acc, shifted, bioink.printSpeed_mms, bioink.travelSpeed_mms, w === 0 ? `wall L${li + 1}` : undefined)
        }
      }
    }

    // 2. INFILL (apenas em geometrias com área "fechada")
    if (opts.infillPattern !== "none" && (geom.id === "cube" || geom.id === "patch" || geom.id === "disk" || geom.id === "grid")) {
      let segs: Array<[Point, Point]> = []
      if (geom.id === "grid") {
        // Grid usa pitch fixo (malha aberta)
        const pitch = geom.pitch ?? Math.max(1.0, nozzle * 5)
        segs = generateGridInfill(geom, li, pitch)
      } else if (opts.infillPattern === "concentric" && geom.id === "disk") {
        segs = generateConcentricInfill(geom, opts.infillDensity_pct, nozzle)
      } else {
        segs = generateRectilinearInfill(geom, li, opts.infillDensity_pct, nozzle)
      }
      emitSegments(acc, segs, bioink.printSpeed_mms, bioink.travelSpeed_mms, `infill L${li + 1}`)
    }
  }

  // ─── Estimativas ───
  const moveCount = acc.list.length
  const totalExtrusion_mm3 = acc.e  // ePerMm já é em mm³/mm
  const bioinkVolume_uL = totalExtrusion_mm3  // 1 mm³ ≈ 1 µL

  // Tempo: soma das distâncias / velocidades
  let totalTime_s = 0
  for (let i = 1; i < acc.list.length; i++) {
    const a = acc.list[i - 1]
    const b = acc.list[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    const speed_mms = b.f / 60
    totalTime_s += d / speed_mms
  }
  const estimatedTime_min = Math.max(0.1, totalTime_s / 60)

  rationale.push(
    `📊 Estimativa: ~${bioinkVolume_uL.toFixed(0)} µL de bioink, ~${estimatedTime_min.toFixed(1)} min.`,
  )

  // ─── Emit final G-code text ───
  const gcode = emitGcodeText(acc.list, bioink, geom, opts, {
    bioinkVolume_uL,
    estimatedTime_min,
    layerCount: numLayers,
  })

  return {
    gcode,
    layerCount: numLayers,
    bioinkVolume_uL,
    estimatedTime_min,
    moveCount,
    rationale,
    warnings,
  }
}

// ─── Shrink polygon (offset interno simples) ────────────────────────────

/**
 * Encolhe um polígono fechado por uma distância (offset interno).
 * Simplificação: move cada vértice na direção do centróide.
 * Funciona bem para polígonos convexos (retângulos, círculos).
 */
function shrinkPolygon(poly: Point[], offset: number): Point[] {
  if (poly.length < 3) return poly
  let cx = 0, cy = 0
  for (const p of poly) { cx += p.x; cy += p.y }
  cx /= poly.length; cy /= poly.length

  const shrunk: Point[] = []
  for (const p of poly) {
    const dx = p.x - cx, dy = p.y - cy
    const r = Math.hypot(dx, dy)
    if (r < offset + 0.1) return []  // muito pequeno, não vale
    const k = (r - offset) / r
    shrunk.push({ x: cx + dx * k, y: cy + dy * k })
  }
  return shrunk
}

// ─── Emit G-code text ────────────────────────────────────────────────────

function emitGcodeText(
  moves: Move[],
  bioink: QuickBioinkParams,
  geom: QuickGeometry,
  opts: QuickGcodeOptions,
  stats: { bioinkVolume_uL: number; estimatedTime_min: number; layerCount: number },
): string {
  const now = new Date().toISOString()
  const lines: string[] = []

  // ─── HEADER BIA ───
  lines.push(
    "; ═══════════════════════════════════════════════════════════════",
    "; BIA · Quick G-Code Engine — R12.12",
    "; Janaina Dernowsek / Quantis Biotechnology",
    "; ─────────────────────────────────────────────────────────────",
    `; Job:        ${opts.jobName ?? `${geom.id}_${Date.now()}`}`,
    `; Generated:  ${now}`,
    "; ─────────────────────────────────────────────────────────────",
    "; BIOTINTA:",
    `;   Material:        ${bioink.materialLabel}`,
    `;   Bico Ø:          ${bioink.nozzleDiameter_mm} mm`,
    `;   Viscosidade:     ${bioink.viscosity_PaS} Pa·s`,
    `;   Velocidade:      ${bioink.printSpeed_mms} mm/s (print) · ${bioink.travelSpeed_mms} mm/s (travel)`,
    bioink.pressure_kpa ? `;   Pressão:         ${bioink.pressure_kpa} kPa` : "",
    bioink.crosslinker ? `;   Crosslinker:     ${bioink.crosslinker}` : "",
    bioink.hasCells ? `;   Células:         ${bioink.cellType ?? "definido"}${bioink.cellDensity_M_per_mL ? ` @ ${bioink.cellDensity_M_per_mL} ×10⁶/mL` : ""}` : ";   Células:         acelular",
    "; ─────────────────────────────────────────────────────────────",
    "; GEOMETRIA:",
    `;   Tipo:            ${geometryLabel(geom.id)}`,
    `;   Dimensões:       ${geom.width} × ${geom.depth} × ${geom.height} mm`,
    `;   Camadas:         ${stats.layerCount} × ${opts.layerHeight_mm} mm`,
    `;   Paredes:         ${opts.walls}`,
    `;   Infill:          ${infillLabel(opts.infillPattern)}${opts.infillPattern !== "none" ? ` @ ${opts.infillDensity_pct}%` : ""}`,
    "; ─────────────────────────────────────────────────────────────",
    "; ESTIMATIVAS:",
    `;   Volume:          ~${stats.bioinkVolume_uL.toFixed(0)} µL`,
    `;   Tempo:           ~${stats.estimatedTime_min.toFixed(1)} min`,
    `;   Moves:           ${moves.length}`,
    "; ═══════════════════════════════════════════════════════════════",
    "; ⚠️ POSICIONE o bico MANUALMENTE sobre o bed antes de iniciar.",
    "; ⚠️ NENHUM aquecimento de cartucho/bed/chamber é enviado.",
    "; ⚠️ NENHUM G28 (home) — preserva bandeja/cartucho.",
    "; ═══════════════════════════════════════════════════════════════",
    "",
    "G21        ; unidades em mm",
    "G90        ; coordenadas absolutas",
    "M83        ; extrusão relativa",
    "G92 E0     ; zera extruder",
    "",
  )

  // ─── MOVES ───
  let lastZ = -1
  let lastE = 0
  for (const m of moves) {
    // Z change → cabeçalho de camada
    if (Math.abs(m.z - lastZ) > 0.001) {
      lines.push(`; ─── Z = ${m.z.toFixed(3)} mm ───`)
      lastZ = m.z
    }
    const parts: string[] = [m.type]
    parts.push(`X${m.x.toFixed(3)}`)
    parts.push(`Y${m.y.toFixed(3)}`)
    parts.push(`Z${m.z.toFixed(3)}`)
    if (m.e !== undefined && m.e > lastE) {
      const dE = m.e - lastE
      parts.push(`E${dE.toFixed(4)}`)
      lastE = m.e
    }
    parts.push(`F${Math.round(m.f)}`)
    if (m.comment) parts.push(`; ${m.comment}`)
    lines.push(parts.join(" "))
  }

  lines.push("", "; ─── FIM ───", "M84        ; desliga motores", "")
  return lines.filter((l) => l !== "").join("\n") + "\n"
}

// ─── Labels human-readable ──────────────────────────────────────────────

export function geometryLabel(id: QuickGeometryId): string {
  return {
    cube:            "Cubo",
    disk:            "Disco",
    grid:            "Grid / Scaffold aberto",
    patch:           "Patch retangular",
    "hollow-sphere": "Esfera oca",
  }[id]
}

export function infillLabel(p: QuickInfillPattern): string {
  return {
    rectilinear: "Linhas paralelas (cross-hatch 0°/90°)",
    concentric:  "Concêntrico (espirais)",
    none:        "Sem preenchimento (oco)",
  }[p]
}

// ─── Presets de geometria comuns ────────────────────────────────────────

export const GEOMETRY_PRESETS: Array<{
  id: QuickGeometryId
  label: string
  description: string
  defaultParams: { width: number; depth: number; height: number; pitch?: number; wallThickness?: number }
  goodFor: string[]
}> = [
  {
    id: "cube",
    label: "Cubo / Bloco",
    description: "Sólido retangular — bom para validar parâmetros, testes de aderência.",
    defaultParams: { width: 10, depth: 10, height: 5 },
    goodFor: ["validação", "testes de aderência", "scaffolds simples"],
  },
  {
    id: "disk",
    label: "Disco / Cilindro",
    description: "Disco circular — patch fino, cartilagem, córnea, pele.",
    defaultParams: { width: 12, depth: 12, height: 2 },
    goodFor: ["cartilagem", "patch cardíaco", "pele", "córnea"],
  },
  {
    id: "grid",
    label: "Grid / Scaffold poroso",
    description: "Malha aberta cross-hatch — alta porosidade, fácil perfusão.",
    defaultParams: { width: 15, depth: 15, height: 3, pitch: 1.5 },
    goodFor: ["osso", "scaffolds vascularizados", "engenharia de tecido"],
  },
  {
    id: "patch",
    label: "Patch (fino)",
    description: "Retângulo fino (~1 mm) — pele, peritôneo, cobertura de feridas.",
    defaultParams: { width: 20, depth: 20, height: 1 },
    goodFor: ["pele", "curativos", "membranas"],
  },
  {
    id: "hollow-sphere",
    label: "Esfera oca",
    description: "Esfera com parede fina — organoides, modelos vasculares simples.",
    defaultParams: { width: 10, depth: 10, height: 10, wallThickness: 1.5 },
    goodFor: ["organoides", "spheroids macros", "modelos vasculares"],
  },
]

// ─── Presets de biotinta rápidos ────────────────────────────────────────

export const BIOINK_QUICK_PRESETS: Array<{
  id: string
  label: string
  materialLabel: string
  nozzleDiameter_mm: number
  viscosity_PaS: number
  printSpeed_mms: number
  travelSpeed_mms: number
  pressure_kpa?: number
  crosslinker?: string
  hint: string
}> = [
  {
    id: "gelma-10",
    label: "GelMA 10%",
    materialLabel: "GelMA 10% w/v",
    nozzleDiameter_mm: 0.41,
    viscosity_PaS: 5,
    printSpeed_mms: 8,
    travelSpeed_mms: 30,
    pressure_kpa: 80,
    crosslinker: "UV 365nm + LAP 0.3%",
    hint: "Versátil · foto-crosslink · para a maioria dos tecidos",
  },
  {
    id: "alginate-3",
    label: "Alginato 3%",
    materialLabel: "Alginato de Sódio 3% w/v",
    nozzleDiameter_mm: 0.41,
    viscosity_PaS: 3,
    printSpeed_mms: 6,
    travelSpeed_mms: 25,
    pressure_kpa: 60,
    crosslinker: "CaCl₂ 100 mM",
    hint: "Iônico · gelifica em CaCl₂ · barato",
  },
  {
    id: "pluronic-30",
    label: "Pluronic F127 30%",
    materialLabel: "Pluronic F127 30% w/v",
    nozzleDiameter_mm: 0.41,
    viscosity_PaS: 50,
    printSpeed_mms: 5,
    travelSpeed_mms: 25,
    pressure_kpa: 200,
    crosslinker: "Lavagem 4°C (sacrificial)",
    hint: "Sacrificial · canais vasculares ocos",
  },
  {
    id: "collagen-3",
    label: "Colágeno I 3%",
    materialLabel: "Colágeno Tipo I 3 mg/mL",
    nozzleDiameter_mm: 0.41,
    viscosity_PaS: 1,
    printSpeed_mms: 5,
    travelSpeed_mms: 20,
    pressure_kpa: 40,
    crosslinker: "Térmico 37°C",
    hint: "Imprime a 4°C · gelifica a 37°C · pele/tendão",
  },
  {
    id: "custom",
    label: "Custom",
    materialLabel: "Biotinta customizada",
    nozzleDiameter_mm: 0.41,
    viscosity_PaS: 5,
    printSpeed_mms: 8,
    travelSpeed_mms: 30,
    hint: "Defina parâmetros manualmente",
  },
]
