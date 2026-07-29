/**
 * BIA — Coherence Check (R12.47 · fix R12.61)
 *
 * Valida se o G-code carregado no /execute REALMENTE corresponde às
 * escolhas que o usuário fez no fluxo (modelo → biotinta → fatiamento).
 *
 * ── R12.61 (2026-07-29) ─── FIX bloqueio falso "geometria-divergente" ──
 * Bug reportado: usuária escolhe orelha (ear) + gyroid infill; slicer emite
 * G-code correto de orelha com `; Infill: gyroid_tpms @ 30%`. O coherence
 * antigo tinha "gyroid" em GEOMETRY_KEYWORDS, então detectava geometryHint
 * = "gyroid", comparava com expected "ear", divergia e BLOQUEAVA impressão
 * válida. Correção:
 *   1) `emitter.ts` (R12.61) agora emite `; JobName:` + `; Geometry: <id>`
 *   2) `extractGcodeHints()` lê `; Geometry:` como fonte da verdade
 *   3) Palavras de infill (gyroid/honeycomb/voronoi/tpms) REMOVIDAS de
 *      GEOMETRY_KEYWORDS — só ficam em INFILL_PATTERN_KEYWORDS
 *   4) Keyword scan de geometria (fallback pra G-code externo) SÓ emite
 *      warning agora — nunca bloqueia. Bloqueio só quando `; Geometry:`
 *      explícito diverge da escolha.
 *
 * Por que existe:
 *   A "fonte da verdade" (BioprintProcessState em process-context.tsx)
 *   coleta todas as escolhas do usuário (orelha, GelMA, Cellink, linhas,
 *   etc.). Mas o G-code pode vir de fontes diferentes:
 *     - gerado pelo /api/gcode/generate (motor BIA)
 *     - colado manualmente pela usuária
 *     - importado de upload externo
 *     - vindo do demo / quick-gcode / printability
 *   Quando o G-code não corresponde ao state escolhido, a impressão
 *   sai "totalmente diferente" do que a usuária esperava (caso real:
 *   Orelha + GelMA + Cellink + Linhas → G-code de cilindro afunilado
 *   genérico sem nada de orelha).
 *
 * Como funciona:
 *   1) Lê o cabeçalho do G-code (linhas que começam com `;`) e procura
 *      pistas: jobName, geometry, material, infill pattern, dimensões.
 *   2) Compara com o BioprintProcessState (modelo escolhido, biotinta,
 *      padrão de fatiamento).
 *   3) Emite issues classificadas em 3 níveis:
 *        - "info"     → diferença explicável (ex: G-code paramétrico para
 *                       orelha em vez de mesh real)
 *        - "warning"  → divergência que provavelmente é OK, mas confirme
 *        - "blocking" → divergência grave, NÃO imprima (ex: modelo escolhido
 *                       é orelha mas G-code é claramente um cubo gyroide)
 *
 * Limitações honestas:
 *   - O motor /api/gcode/generate hoje usa elipse afunilada para "ear"
 *     (não a mesh anatômica real de 261 KB). Isso é uma limitação CONHECIDA
 *     do slicer (não tem voxelizer/marching squares de mesh arbitrária).
 *     A função emite um "info" claro alertando sobre isso.
 *   - A detecção de geometria via cabeçalho é heurística. Se o G-code não
 *     tiver comentários ; nenhuma análise é possível e retorna "unknown".
 */

import type { BioprintProcessState } from "./process-context"

// ─── Tipos públicos ──────────────────────────────────────────────────────

export type CoherenceLevel = "info" | "warning" | "blocking"

export interface CoherenceIssue {
  level: CoherenceLevel
  /** Curto, mostra no badge — ex: "geometria-paramétrica" */
  code: string
  /** Frase explicativa para a usuária — ex: "O G-code da orelha é uma
   *  aproximação paramétrica…" */
  message: string
  /** O que ela deve fazer para resolver — ex: "Para gerar mesh real,
   *  use upload STL na Etapa 1." */
  fixHint: string
  /** O que estava no state (esperado) vs o que aparece no G-code (encontrado) */
  expected?: string
  found?: string
}

export interface CoherenceReport {
  /** True se algum issue é "blocking" — UI deve impedir o IMPRIMIR */
  isBlocking: boolean
  /** Todos os issues encontrados (ordenados: blocking → warning → info) */
  issues: CoherenceIssue[]
  /** Resumo do que foi extraído do G-code (debug + display) */
  detected: {
    jobName: string | null
    geometryHints: string[]
    materialHints: string[]
    infillHints: string[]
    layerCount: number | null
    bedSize: { x: number; y: number } | null
  }
  /** Resumo do que estava no state (debug + display) */
  expected: {
    modelCategory: string | null
    modelGeometryId: string | null
    materialName: string | null
    infillPatternId: string | null
    layerHeight: number | null
    pattern: string | null
  }
}

// ─── Heurísticas de extração do G-code ────────────────────────────────────

/**
 * Lê os primeiros 100 comentários do G-code (linhas começando com ;) e
 * tenta identificar pistas sobre o que ele realmente imprime.
 *
 * NÃO faz parse geométrico real — apenas leitura de cabeçalho/comentários.
 * G-codes gerados pela BIA têm header rico (jobName, geometry, infill).
 * G-codes externos podem ter pouco ou nada.
 *
 * R12.61: prioridade agora é ler `; Geometry: <id>` EXPLÍCITO emitido pelo
 * emitter (fonte da verdade). Só cai em keyword scan como fallback para
 * G-codes externos/legados. Também separa keywords de INFILL PATTERN
 * (gyroid como preenchimento) das de GEOMETRIA (formas 3D), pra parar de
 * confundir "gyroid" (padrão) com "orelha" (modelo) e bloquear falsamente.
 */
function extractGcodeHints(gcode: string): CoherenceReport["detected"] & {
  /** Geometry ID explícito lido do header `; Geometry: <id>` (R12.61) */
  explicitGeometryId: string | null
} {
  const lines = gcode.split("\n").slice(0, 200)  // primeiras 200 linhas bastam
  const commentLines = lines
    .map((l) => l.trim())
    .filter((l) => l.startsWith(";"))
    .map((l) => l.slice(1).trim())
    .filter((l) => l.length > 0)

  // R12.61: PISTA EXPLÍCITA — `; Geometry: <id>` do emitter novo.
  // Se presente, é a fonte da verdade e evita todo o keyword scan ambíguo.
  let explicitGeometryId: string | null = null
  for (const c of commentLines) {
    const m = c.match(/^geometry\s*:\s*(\S+)/i)
    if (m) { explicitGeometryId = m[1].trim().toLowerCase(); break }
  }

  // jobName: procura "; JobName: …", "jobName:", "Job:", "BIA · …"
  let jobName: string | null = null
  for (const c of commentLines) {
    const m =
      c.match(/^job\s*name\s*:\s*(.+)/i) ??
      c.match(/^job\s*:\s*(.+)/i) ??
      c.match(/bia\s*·\s*(.+?)(?:\s*—|\s*\||$)/i)
    if (m) { jobName = m[1].trim(); break }
  }

  // Pistas de geometria: SÓ formas 3D reais (não misturar com padrões de infill).
  // R12.61: removidos "gyroid" e afins que são PADRÕES DE PREENCHIMENTO,
  // não geometrias de modelo. Um cubo com gyroid infill não é "geometria gyroid".
  const allText = commentLines.join(" ").toLowerCase()
  const GEOMETRY_KEYWORDS: Record<string, string[]> = {
    ear:          ["orelha", "auric", "pavilhão"],
    heart:        ["coração", "coracao", "cardio"],
    nose:         ["nariz", "septo"],
    femur:        ["femur", "fêmur", "osso longo"],
    kidney:       ["rim", "renal", "néfron", "nefron"],
    hand:         ["mão", "mao", "palma"],
    cube:         ["cubo"],
    disk:         ["disco"],
    // "grid" só como geometria se explícito ("scaffold aberto" ou padrão de casco);
    // como INFILL vai pra INFILL_KEYWORDS abaixo.
    grid:         ["scaffold aberto"],
    patch:        ["membrana"],
    cylinder:     ["cilindro"],
    sphere:       ["esfera", "organoide"],
    "hollow-sphere": ["esfera oca"],
    // NOTA: "ear", "heart", "nose", "kidney" também aparecem em inglês —
    // mas SÓ pegamos essas palavras se estiverem "isoladas" (word boundary),
    // pra evitar match acidental em "gearbox" ou coisas assim.
  }
  const geometryHints: string[] = []
  for (const [id, kws] of Object.entries(GEOMETRY_KEYWORDS)) {
    if (kws.some((k) => allText.includes(k))) geometryHints.push(id)
  }
  // Palavras em inglês curtas precisam de word boundary pra reduzir falsos positivos
  const EN_BOUNDARY: Record<string, RegExp> = {
    ear:    /\bear\b/,
    heart:  /\bheart\b/,
    nose:   /\bnose\b/,
    kidney: /\bkidney\b/,
    hand:   /\bhand\b/,
    femur:  /\bfemur\b/,
    cube:   /\bcube\b/,
    disk:   /\bdisk\b/,
    cylinder: /\bcylinder\b/,
    sphere: /\bsphere\b/,
    patch:  /\bpatch\b/,
  }
  for (const [id, rx] of Object.entries(EN_BOUNDARY)) {
    if (rx.test(allText) && !geometryHints.includes(id)) geometryHints.push(id)
  }

  // Pistas de material
  const MATERIAL_KEYWORDS = [
    "gelma", "alginato", "alginate", "pluronic", "fibrinogen",
    "colágeno", "collagen", "agarose", "matrigel", "decellularized",
    "pcl", "pla", "plga", "qmatrix", "qgel",
  ]
  const materialHints: string[] = []
  for (const m of MATERIAL_KEYWORDS) {
    if (allText.includes(m)) materialHints.push(m)
  }

  // R12.61: Pistas de infill — SÓ olha a linha "; Infill: <algo>" (fonte
  // limpa) ao invés de fazer scan em allText, que confunde "gyroid" (padrão)
  // com "gyroid" (que o coherence antigo tratava como forma).
  const infillHints: string[] = []
  const INFILL_PATTERN_KEYWORDS = [
    "rectilinear", "linhas", "linear",
    "gyroid", "giroide",
    "concentric", "concêntrico", "concentrico",
    "honeycomb", "favo",
    "grid", "grade",
    "voronoi", "perlin", "wave",
    "tpms", "schwarz", "diamond",
  ]
  for (const c of commentLines) {
    const infillMatch = c.match(/^infill\s*:\s*(.+)/i)
    if (infillMatch) {
      const infillText = infillMatch[1].toLowerCase()
      for (const kw of INFILL_PATTERN_KEYWORDS) {
        if (infillText.includes(kw) && !infillHints.includes(kw)) {
          infillHints.push(kw)
        }
      }
      break  // primeira linha "; Infill:" basta
    }
  }
  // Fallback pra G-codes externos sem "; Infill:" — scan geral, mas
  // marcado como low-confidence (não usado para bloqueio)
  if (infillHints.length === 0) {
    for (const kw of INFILL_PATTERN_KEYWORDS) {
      if (allText.includes(kw)) infillHints.push(kw)
    }
  }

  // Layer count: tenta achar "; N layers" ou conta "; Layer X/Y"
  let layerCount: number | null = null
  for (const c of commentLines) {
    const m1 = c.match(/(\d+)\s*camadas?/i) ?? c.match(/(\d+)\s*layers?/i)
    if (m1) { layerCount = parseInt(m1[1], 10); break }
  }

  // Tamanho da mesa (se mencionado): "200×200" ou "200x200"
  let bedSize: { x: number; y: number } | null = null
  for (const c of commentLines) {
    const m = c.match(/(\d{2,3})\s*[x×]\s*(\d{2,3})\s*mm/i)
    if (m) {
      bedSize = { x: parseInt(m[1], 10), y: parseInt(m[2], 10) }
      break
    }
  }

  return {
    jobName,
    geometryHints,
    materialHints,
    infillHints,
    layerCount,
    bedSize,
    explicitGeometryId,
  }
}

// ─── Normalizadores ──────────────────────────────────────────────────────

/** Normaliza nome de material para comparação (lowercase, sem acento, sem espaço) */
function normalizeMat(s: string | null | undefined): string {
  if (!s) return ""
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

/** Mapeia infillPatternId BIA → família do algoritmo (para comparação livre) */
function patternFamily(id: string | null | undefined): string | null {
  if (!id) return null
  const i = id.toLowerCase()
  if (i.includes("line") || i === "linear" || i === "classic-lines") return "linhas"
  if (i.includes("gyroid") || i.includes("giroide")) return "gyroid"
  if (i.includes("concentric") || i.includes("concentr")) return "concentric"
  if (i.includes("grid")) return "grid"
  if (i.includes("triang") || i.includes("hexagon") || i.includes("trihex")) return "triangular"
  if (i.includes("voronoi")) return "voronoi"
  if (i.includes("wave") || i.includes("perlin")) return "wave"
  return null
}

// ─── Análise principal ──────────────────────────────────────────────────

/**
 * Compara o BioprintProcessState (escolhas do usuário) contra o G-code
 * carregado. Retorna um CoherenceReport com issues classificados.
 *
 * Use no /execute ANTES de liberar o botão IMPRIMIR. Se `isBlocking`,
 * a UI deve impedir o envio e mostrar a lista de issues para que a
 * usuária possa corrigir (regerar o G-code ou ajustar o state).
 */
export function checkCoherence(
  gcode: string,
  state: BioprintProcessState,
): CoherenceReport {
  const detected = extractGcodeHints(gcode)
  const issues: CoherenceIssue[] = []

  const expected = {
    modelCategory: state.model.category,
    modelGeometryId: state.model.geometryId,
    materialName: state.bioink.material ??
      state.bioink.formulations?.[0]?.material ?? null,
    infillPatternId: state.slice.infillPatternId,
    layerHeight: state.slice.layerHeightMm,
    pattern: patternFamily(state.slice.infillPatternId),
  }

  // ─── 0) Sem cabeçalho nenhum → unknown ─────────────────────────────
  const hasAnyHints =
    detected.jobName != null ||
    detected.geometryHints.length > 0 ||
    detected.materialHints.length > 0 ||
    detected.infillHints.length > 0
  if (!hasAnyHints) {
    issues.push({
      level: "warning",
      code: "gcode-sem-cabecalho",
      message:
        "O G-code carregado não tem comentários identificáveis no cabeçalho. Não dá para verificar automaticamente se ele corresponde ao modelo, biotinta e padrão de fatiamento que você escolheu.",
      fixHint:
        "Se você gerou esse G-code dentro da BIA, abra o painel G-code e regere — a versão BIA inclui cabeçalho rico. Se veio de fora, confira visualmente o preview 3D antes de imprimir.",
    })
  }

  // ─── 1) Geometria escolhida vs geometria detectada ─────────────────
  // R12.61: prioridade agora é `; Geometry: <id>` explícito emitido pelo
  // slicer BIA. Só faz keyword scan como sinal FRACO (warning, não blocking)
  // porque scan de palavras em cabeçalho é heurístico e produz falsos
  // positivos (ex: "gyroid" no infill não é "geometria gyroid").
  if (expected.modelGeometryId && detected.explicitGeometryId) {
    // Fonte da verdade: `; Geometry: <id>` no header
    const expGid = expected.modelGeometryId.toLowerCase()
    const gotGid = detected.explicitGeometryId
    if (expGid !== gotGid) {
      issues.push({
        level: "blocking",
        code: "geometria-divergente",
        message: `Você escolheu o modelo "${expected.modelGeometryId}" na Etapa 1, mas o G-code foi gerado para "${gotGid}" (header ; Geometry:).`,
        fixHint:
          "Volte para a Etapa 3 (Fatiamento) e gere novamente o G-code para o modelo correto, ou volte para a Etapa 1 e troque o modelo para o que está no G-code.",
        expected: expected.modelGeometryId,
        found: gotGid,
      })
    }
  } else if (
    expected.modelGeometryId &&
    detected.geometryHints.length > 0 &&
    !detected.explicitGeometryId
  ) {
    // Sem `; Geometry:` explícito — cai no keyword scan (fraco).
    // Só emite WARNING (não BLOCKING) porque a evidência é heurística.
    const expGid = expected.modelGeometryId.toLowerCase()
    const foundMatch = detected.geometryHints.some((h) => {
      if (h === expGid) return true
      if (expGid.includes(h)) return true
      if (h.includes(expGid)) return true
      return false
    })
    if (!foundMatch) {
      issues.push({
        level: "warning",
        code: "geometria-possivelmente-divergente",
        message: `Você escolheu "${expected.modelGeometryId}" na Etapa 1, mas o cabeçalho do G-code menciona ${detected.geometryHints.join(", ")}. O G-code pode ser de outra geometria — não foi possível confirmar (sem tag ; Geometry: explícita).`,
        fixHint:
          "Se você gerou esse G-code pela BIA, regere na Etapa 3 (o header novo inclui ; Geometry: <id>). Se veio de fora, confira visualmente o preview 3D antes de imprimir.",
        expected: expected.modelGeometryId,
        found: detected.geometryHints.join(", "),
      })
    }
  }

  // ─── 2) Aviso de geometria paramétrica vs. mesh real ────────────────
  // R12.49: "ear" passou a usar STL real fatiado.
  // R12.50: "nose" e "femur" também ganharam STL real.
  // R12.51: "heart" e "kidney" também ganharam STL real;
  //         "liver_anatomical" foi REMOVIDO do catálogo.
  // Apenas "hand" continua paramétrica até receber STL real.
  const PARAMETRIC_ANATOMICAL = ["hand"]
  if (
    expected.modelGeometryId &&
    PARAMETRIC_ANATOMICAL.includes(expected.modelGeometryId.toLowerCase()) &&
    detected.geometryHints.some((h) => h === expected.modelGeometryId!.toLowerCase())
  ) {
    issues.push({
      level: "info",
      code: "geometria-parametrica",
      message: `O G-code do modelo "${expected.modelGeometryId}" é uma aproximação PARAMÉTRICA, NÃO a mesh anatômica real.`,
      fixHint:
        "A R12.49 implementou voxelização para 'ear' usando STL real. Para fatiar mesh real desta anatomia, forneça o arquivo STL binário em /public/stl/ e adicione a entrada em STL_FILE_MAP (src/lib/stl/mesh-bounds.ts). Enquanto isso, o G-code paramétrico valida parâmetros (altura, velocidade, pressão) corretamente.",
      expected: `geometria anatômica real (mesh ${expected.modelGeometryId})`,
      found: "aproximação paramétrica (elipse/cilindro afunilado)",
    })
  }

  // ─── 3) Material escolhido vs material detectado ───────────────────
  if (expected.materialName && detected.materialHints.length > 0) {
    const expMat = normalizeMat(expected.materialName)
    const found = detected.materialHints.some((h) => normalizeMat(h).includes(expMat) || expMat.includes(normalizeMat(h)))
    if (!found) {
      issues.push({
        level: "warning",
        code: "material-divergente",
        message: `Você escolheu "${expected.materialName}" como biotinta, mas o G-code menciona "${detected.materialHints.join(", ")}". Os parâmetros (pressão, temperatura, velocidade) podem não ser ótimos para o material que você vai usar de verdade.`,
        fixHint:
          "Regere o G-code na Etapa 3 com a biotinta correta selecionada na Etapa 2, ou ajuste manualmente pressão/temperatura no painel lateral antes de imprimir.",
        expected: expected.materialName,
        found: detected.materialHints.join(", "),
      })
    }
  }

  // ─── 4) Padrão de infill escolhido vs detectado ────────────────────
  if (expected.pattern && detected.infillHints.length > 0) {
    const expectedFamily = expected.pattern
    const foundFamily = detected.infillHints.map(patternFamily).filter(Boolean)
    const match = foundFamily.includes(expectedFamily)
    if (!match) {
      issues.push({
        level: "warning",
        code: "padrao-infill-divergente",
        message: `Você escolheu o padrão "${expected.infillPatternId}" (família: ${expectedFamily}) na Etapa 3, mas o G-code parece usar "${detected.infillHints.join(", ")}".`,
        fixHint:
          "Se o padrão importa (por ex. teste de Pf, gyroid biomimético), regere o G-code. Se for só teste rápido, prossiga ciente da diferença.",
        expected: expectedFamily,
        found: detected.infillHints.join(", "),
      })
    }
  }

  // ─── 5) Modelo escolhido mas G-code vazio/sem moves G1 ─────────────
  const hasG1 = /^\s*G1\s/im.test(gcode)
  if (expected.modelGeometryId && !hasG1) {
    issues.push({
      level: "blocking",
      code: "gcode-sem-movimentos",
      message:
        "O G-code carregado não contém comandos de movimento (G1). Não é possível imprimir nada com ele.",
      fixHint:
        "Volte para a Etapa 3 (Fatiamento) e gere o G-code, ou cole um G-code válido com comandos G1.",
    })
  }

  // Ordena: blocking → warning → info
  const order: CoherenceLevel[] = ["blocking", "warning", "info"]
  issues.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))

  const isBlocking = issues.some((i) => i.level === "blocking")

  // R12.61: `detected` internamente tem `explicitGeometryId` mas o tipo
  // público `CoherenceReport["detected"]` não. Strip antes de retornar.
  const { explicitGeometryId: _egid, ...publicDetected } = detected

  return {
    isBlocking,
    issues,
    detected: publicDetected,
    expected,
  }
}

// ─── Helper de UI ────────────────────────────────────────────────────────

/** Badge curto para mostrar quantos issues de cada nível */
export function coherenceBadge(report: CoherenceReport): {
  label: string
  color: "emerald" | "amber" | "red"
} {
  const blocking = report.issues.filter((i) => i.level === "blocking").length
  const warning = report.issues.filter((i) => i.level === "warning").length
  if (blocking > 0) return { label: `${blocking} bloqueio${blocking > 1 ? "s" : ""}`, color: "red" }
  if (warning > 0) return { label: `${warning} alerta${warning > 1 ? "s" : ""}`, color: "amber" }
  return { label: "coerente", color: "emerald" }
}
