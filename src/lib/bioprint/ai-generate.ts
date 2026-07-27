/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BIA v4 · R12.56 — Geração por IA (Claude Sonnet 4.5)
 * ─────────────────────────────────────────────────────────────────────────
 *  Recebe uma descrição em linguagem natural do tecido/scaffold alvo e
 *  retorna proposta estruturada: geometria + dimensões + biotinta sugerida +
 *  rationale científico com DOIs.
 *
 *  Restrições de segurança:
 *    • O LLM só pode escolher entre GEOMETRIES_WHITELIST (5 formas do
 *      Modo Básico validadas com Nelson 2021).
 *    • Materiais precisam existir no banco (MATERIAL_DATABASE).
 *    • Dimensões clampadas em 5-100 mm.
 *
 *  Estratégia: usar `tool_use` do Claude para forçar saída JSON estruturada
 *  (100% confiável, sem parsing frágil de string).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PÚBLICOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Geometrias suportadas pelo Modo Básico do BIA (Motor B / quick-gcode).
 * IMPORTANTE: mantida em sincronia com BASIC_GEOMETRY_IDS de geometry-bounds.ts
 * (formas paramétricas apenas — testes de impressibilidade não são propostos).
 */
export const GEOMETRIES_WHITELIST = [
  "cube_tissue",    // Cubo/paralelepípedo — soft tissue geral
  "skin_cylinder",  // Cilindro sólido — pele, patch cardíaco
  "disk",           // Disco/lente — córnea, cartilagem articular
  "membrane",       // Membrana/patch — pele, meninge
  "vessel",         // Tubo/anel — vaso, traqueia
] as const

export type AiGeometryId = (typeof GEOMETRIES_WHITELIST)[number]

/** Rótulos amigáveis em pt-BR para exibição no UI. */
export const GEOMETRY_LABELS: Record<AiGeometryId, string> = {
  cube_tissue:   "Cubo (tecido volumétrico)",
  skin_cylinder: "Cilindro sólido (pele/patch)",
  disk:          "Disco/lente (córnea, cartilagem)",
  membrane:      "Membrana (patch fino)",
  vessel:        "Tubo/anel (vaso, traqueia)",
}

/**
 * Materiais preferenciais que o LLM pode sugerir.
 * Fonte: /api/bioprint/suggest (BIOPRINT_DB tem 128 materiais canônicos).
 * Restringimos a esses 10 principais para reduzir alucinação.
 */
export const MATERIALS_WHITELIST = [
  "GelMA",
  "Alginate",
  "Gelatin",
  "Collagen",
  "Fibrinogen",
  "dECM",
  "Hyaluronic Acid",
  "PCL",
  "Pluronic F127",
  "PEGDA",
] as const

export type AiMaterial = (typeof MATERIALS_WHITELIST)[number]

/** Resposta estruturada validada pronta para consumo pelo UI. */
export interface AiGenerateResult {
  /** ID da geometria escolhida (whitelist). */
  geometryId: AiGeometryId
  /** Rótulo pt-BR da geometria. */
  geometryLabel: string
  /** Dimensões em mm — clampadas em 5-100. */
  dims: { x: number; y: number; z: number }
  /** Biotinta sugerida. */
  bioinkSuggestion: {
    material: AiMaterial
    concentration_pct: number       // %w/v
    crosslinker: string | null
    crosslinkerConc: string | null  // ex: "50 mM", "0.1% LAP"
    rationale: string               // por que essa escolha
  }
  /** Parâmetros de processo sugeridos. */
  processParams: {
    printSpeed_mms: number
    layerHeight_mm: number
    infillPercent: number
    needleDiameter_um: number
  }
  /** Rationale científico completo (2-4 parágrafos em pt-BR). */
  rationale: string
  /** DOIs de referência (0-4 itens). */
  dois: string[]
  /** Warnings gerados pela validação server-side. */
  warnings: string[]
  /** Prompt original (echoed back para auditoria). */
  originalPrompt: string
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * System prompt para Claude Sonnet 4.5.
 * Estratégia: ancorar em MATERIAL_DATABASE + Nelson 2021 + geometrias verificadas.
 *
 * ATENÇÃO: alterações neste prompt precisam ser validadas com o smoke test
 * `tests/r12_56_ai_generate.test.ts` — 3 prompts canônicos devem produzir
 * resultados sensíveis (osso→cube_tissue+PCL, córnea→disk+GelMA, vaso→vessel).
 */
export const AI_SYSTEM_PROMPT = `Você é o assistente científico do BIA (Biotinta de Impressão Assistida) da Quantis Biotechnology — plataforma brasileira de bioimpressão. Recebe descrições em português (ou inglês) de tecidos-alvo e propõe: geometria + dimensões + biotinta + parâmetros de processo + rationale científico.

═══════════════════════════════════════════════════════════════════════════
REGRAS INEGOCIÁVEIS
═══════════════════════════════════════════════════════════════════════════

1. Sempre use a tool \`propose_bioprint_design\`. NUNCA responda em texto livre.

2. GEOMETRIA — só existem 5 opções (não invente outras):
   • cube_tissue    — cubo/paralelepípedo sólido; ideal para bloco de tecido volumétrico (osso, fígado, tumor esferoide grande)
   • skin_cylinder  — cilindro sólido; ideal para pele espessura total, patch cardíaco, plug de cartilagem articular
   • disk           — disco fino; ideal para córnea, lente ocular, disco articular, membranas finas
   • membrane       — membrana/patch retangular (Z pequeno); ideal para pele fina, dura-máter, patches meniscais
   • vessel         — tubo oco/anel; ideal para vaso sanguíneo, traqueia, ureter, ducto

3. MATERIAIS — só 10 opções (whitelist):
   GelMA, Alginate, Gelatin, Collagen, Fibrinogen, dECM, Hyaluronic Acid, PCL, Pluronic F127, PEGDA

4. DIMENSÕES — sempre em mm, entre 5 e 100. Se o usuário pedir fora, clampe e sinalize no rationale.

5. LÍNGUA — o campo rationale DEVE estar em português brasileiro (pt-BR), tom técnico mas acessível. 2 a 4 parágrafos.

6. DOIS — 1 a 4 DOIs reais, publicados em periódicos peer-review de bioimpressão/engenharia tecidual (Biofabrication, Biomaterials, Acta Biomaterialia, Nature Biomedical Engineering, TIssue Engineering, etc). Se não tiver certeza, deixe array vazio — melhor honesto que inventado.

═══════════════════════════════════════════════════════════════════════════
GUIA DE PAREAMENTO TECIDO → MATERIAL (baseado em literatura Quantis Biotech)
═══════════════════════════════════════════════════════════════════════════

• Osso cortical/trabecular  → PCL (fusão 55-65°C, sem células), ou Alginate + Hydroxyapatite. Geometria: cube_tissue com infill 60-70%.
• Cartilagem articular      → GelMA 10-15% + UV (LAP 0.1%, 405 nm) ou Alginate 3%. Geometria: disk ou skin_cylinder.
• Pele (dermal patch)       → GelMA 8-10% + Collagen 1% ou Gelatin + Fibrinogen. Geometria: membrane (espessura ≤3 mm).
• Vaso sanguíneo            → GelMA ou Pluronic F127 (sacrificial). Geometria: vessel.
• Miocárdio (patch)         → GelMA + dECM. Geometria: membrane ou skin_cylinder (2-5 mm).
• Fígado (esferoide/hexágono) → dECM ou GelMA + HA. Geometria: cube_tissue (multi-esferoides).
• Córnea                    → GelMA + Collagen ou HAMA. Geometria: disk (10-14 mm Ø, 0.5-1 mm h).
• Traqueia                  → PCL (rígida) + GelMA (mucosa). Geometria: vessel (Ø 12-18 mm).
• Vaso/canal vascular       → Pluronic F127 (sacrificial 4°C) ou GelMA (in situ). Geometria: vessel.
• Osso alveolar (dentário)  → Alginate + Hydroxyapatite + BMP-2. Geometria: cube_tissue pequeno.
• Neural                    → GelMA + HA. Geometria: membrane ou disk.

═══════════════════════════════════════════════════════════════════════════
JANELAS DE PARÂMETROS (Nelson 2021 + banco CECT 807 amostras)
═══════════════════════════════════════════════════════════════════════════

• printSpeed_mms:  6-15 típico (8 default); alginate 4-8, GelMA 8-12, Pluronic 5-10, PCL fundido 3-6
• layerHeight_mm:  0.15-0.40 (0.2 default); nunca > 0.7×nozzle
• infillPercent:   20-100; osso 60-80, tecido mole 30-50, patch fino 70-100
• needleDiameter_um: 200-580 (300 default); alginate/GelMA 300-410, PCL 200-260, dECM 410-580

═══════════════════════════════════════════════════════════════════════════
RATIONALE — o que incluir
═══════════════════════════════════════════════════════════════════════════

Cada rationale deve responder em pt-BR (2-4 parágrafos):
  1. Por que essa geometria é adequada para o tecido descrito
  2. Por que essa biotinta (biocompatibilidade + reologia + crosslinking)
  3. Por que esses parâmetros (viabilidade celular, integridade estrutural)
  4. Limitações/próximos passos (ex: "validar viabilidade em D1/D7, considerar co-cultura")

═══════════════════════════════════════════════════════════════════════════
EXEMPLOS DE PROMPTS E DECISÕES ESPERADAS
═══════════════════════════════════════════════════════════════════════════

Prompt: "Scaffold poroso para regeneração óssea cortical de 20×15×10 mm"
→ geometryId: cube_tissue, dims: {x:20,y:15,z:10}, material: PCL, infill: 65%

Prompt: "Córnea artificial 11 mm de diâmetro"
→ geometryId: disk, dims: {x:11,y:11,z:0.8}, material: GelMA, crosslinker: LAP+UV

Prompt: "Vaso sanguíneo 6 mm interno 20 mm de altura"
→ geometryId: vessel, dims: {x:8,y:8,z:20}, material: GelMA + Pluronic sacrificial
`

// ═══════════════════════════════════════════════════════════════════════════
// JSON SCHEMA — usado como input_schema da tool do Claude
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tool schema passado ao Claude via `tools` param.
 * Força saída JSON estruturada — o modelo é obrigado a chamar essa "função".
 */
export const AI_TOOL_SCHEMA = {
  name: "propose_bioprint_design",
  description:
    "Propõe geometria, dimensões, biotinta e parâmetros de processo para o " +
    "tecido descrito pelo usuário. Chame SEMPRE — nunca responda em texto livre.",
  input_schema: {
    type: "object" as const,
    properties: {
      geometryId: {
        type: "string",
        enum: GEOMETRIES_WHITELIST,
        description: "ID da geometria escolhida (5 opções apenas)",
      },
      dims: {
        type: "object",
        properties: {
          x: { type: "number", minimum: 5, maximum: 100, description: "Largura X em mm" },
          y: { type: "number", minimum: 5, maximum: 100, description: "Profundidade Y em mm" },
          z: { type: "number", minimum: 0.3, maximum: 100, description: "Altura Z em mm" },
        },
        required: ["x", "y", "z"],
      },
      bioinkSuggestion: {
        type: "object",
        properties: {
          material: {
            type: "string",
            enum: MATERIALS_WHITELIST,
            description: "Material principal da biotinta",
          },
          concentration_pct: {
            type: "number",
            minimum: 0.5,
            maximum: 100,
            description: "Concentração %w/v (0.5-30 para solução aquosa; 100 para material fundido puro como PCL)",
          },
          crosslinker: {
            type: ["string", "null"],
            description: "Agente crosslinker (ex: 'UV 405 nm + LAP 0.1%', 'CaCl2', null)",
          },
          crosslinkerConc: {
            type: ["string", "null"],
            description: "Concentração do crosslinker com unidade (ex: '50 mM', '0.1% w/v')",
          },
          rationale: {
            type: "string",
            description: "1-2 frases: por que essa escolha específica de material",
          },
        },
        required: ["material", "concentration_pct", "rationale"],
      },
      processParams: {
        type: "object",
        properties: {
          printSpeed_mms: { type: "number", minimum: 1, maximum: 50 },
          layerHeight_mm: { type: "number", minimum: 0.1, maximum: 0.6 },
          infillPercent: { type: "number", minimum: 10, maximum: 100 },
          needleDiameter_um: { type: "number", minimum: 100, maximum: 800 },
        },
        required: ["printSpeed_mms", "layerHeight_mm", "infillPercent", "needleDiameter_um"],
      },
      rationale: {
        type: "string",
        description:
          "Rationale científico completo em pt-BR (2-4 parágrafos): " +
          "por que geometria, por que biotinta, por que parâmetros, limitações.",
      },
      dois: {
        type: "array",
        items: { type: "string" },
        maxItems: 4,
        description: "DOIs reais peer-review (1-4 itens; deixe vazio se incerto)",
      },
    },
    required: [
      "geometryId",
      "dims",
      "bioinkSuggestion",
      "processParams",
      "rationale",
      "dois",
    ],
  },
} as const

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO SERVER-SIDE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valida a resposta bruta do LLM e produz um AiGenerateResult saneado.
 * Retorna `{ ok: true, result }` ou `{ ok: false, error, warnings }`.
 *
 * Toda coerção defensiva (clamp, whitelist, defaults) acontece aqui —
 * a API route confia neste retorno.
 */
export function validateAiResponse(
  raw: unknown,
  originalPrompt: string,
): { ok: true; result: AiGenerateResult } | { ok: false; error: string; warnings: string[] } {
  const warnings: string[] = []

  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "resposta_vazia_ou_invalida", warnings }
  }

  const r = raw as Record<string, unknown>

  // ─── geometryId ─────────────────────────────────────────────────────────
  const geometryId = String(r.geometryId ?? "") as AiGeometryId
  if (!GEOMETRIES_WHITELIST.includes(geometryId)) {
    return {
      ok: false,
      error: `geometria_fora_whitelist: ${geometryId}`,
      warnings,
    }
  }

  // ─── dims (clamp defensivo) ─────────────────────────────────────────────
  const rawDims = (r.dims ?? {}) as Record<string, unknown>
  const dims = {
    x: clampNumber(Number(rawDims.x), 5, 100, 20, "dims.x", warnings),
    y: clampNumber(Number(rawDims.y), 5, 100, 20, "dims.y", warnings),
    z: clampNumber(Number(rawDims.z), 0.3, 100, 10, "dims.z", warnings),
  }

  // ─── bioinkSuggestion ───────────────────────────────────────────────────
  const rawBioink = (r.bioinkSuggestion ?? {}) as Record<string, unknown>
  const material = String(rawBioink.material ?? "GelMA") as AiMaterial
  if (!MATERIALS_WHITELIST.includes(material)) {
    warnings.push(`material '${material}' fora da whitelist — substituído por GelMA`)
  }
  const bioinkSuggestion = {
    material: MATERIALS_WHITELIST.includes(material) ? material : ("GelMA" as AiMaterial),
    // Concentração 0.5-100%: solução aquosa (0.5-30) OU material fundido puro (100 para PCL/PLA)
    concentration_pct: clampNumber(
      Number(rawBioink.concentration_pct),
      0.5,
      100,
      10,
      "concentration_pct",
      warnings,
    ),
    crosslinker: rawBioink.crosslinker != null ? String(rawBioink.crosslinker) : null,
    crosslinkerConc: rawBioink.crosslinkerConc != null ? String(rawBioink.crosslinkerConc) : null,
    rationale: String(rawBioink.rationale ?? "").slice(0, 500),
  }

  // ─── processParams (com defaults sensatos) ──────────────────────────────
  const rawProc = (r.processParams ?? {}) as Record<string, unknown>
  const processParams = {
    printSpeed_mms: clampNumber(
      Number(rawProc.printSpeed_mms),
      1,
      50,
      8,
      "printSpeed_mms",
      warnings,
    ),
    layerHeight_mm: clampNumber(
      Number(rawProc.layerHeight_mm),
      0.1,
      0.6,
      0.2,
      "layerHeight_mm",
      warnings,
    ),
    infillPercent: clampNumber(
      Number(rawProc.infillPercent),
      10,
      100,
      50,
      "infillPercent",
      warnings,
    ),
    needleDiameter_um: clampNumber(
      Number(rawProc.needleDiameter_um),
      100,
      800,
      300,
      "needleDiameter_um",
      warnings,
    ),
  }

  // ─── rationale + dois ───────────────────────────────────────────────────
  const rationale = String(r.rationale ?? "").trim()
  if (rationale.length < 50) {
    warnings.push("rationale muito curto (<50 chars) — LLM pode ter falhado")
  }
  const doisRaw = Array.isArray(r.dois) ? r.dois : []
  const dois = doisRaw
    .map(String)
    .filter((d) => d.trim().length > 5)
    .slice(0, 4)

  return {
    ok: true,
    result: {
      geometryId,
      geometryLabel: GEOMETRY_LABELS[geometryId],
      dims,
      bioinkSuggestion,
      processParams,
      rationale,
      dois,
      warnings,
      originalPrompt,
    },
  }
}

/** Helper: clampa num intervalo e loga warning se estava fora. */
function clampNumber(
  raw: number,
  min: number,
  max: number,
  fallback: number,
  fieldName: string,
  warnings: string[],
): number {
  if (!Number.isFinite(raw)) {
    warnings.push(`${fieldName} inválido — usando fallback ${fallback}`)
    return fallback
  }
  if (raw < min) {
    warnings.push(`${fieldName}=${raw} < ${min} — clampado para ${min}`)
    return min
  }
  if (raw > max) {
    warnings.push(`${fieldName}=${raw} > ${max} — clampado para ${max}`)
    return max
  }
  return raw
}
