/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  R12.56 · Sprint A — Smoke tests para Geração por IA (Claude Sonnet 4.5)
 * ─────────────────────────────────────────────────────────────────────────
 *  Testa a camada de validação (validateAiResponse) — a chamada real ao
 *  LLM é externa, então validamos o CONTRATO ao invés da resposta do modelo.
 *
 *  Estratégia:
 *    • validateAiResponse aceita entrada estruturada válida
 *    • validateAiResponse rejeita geometria fora da whitelist
 *    • validateAiResponse rejeita material fora da whitelist (com warning)
 *    • validateAiResponse clampa dims fora de [5, 100]
 *    • validateAiResponse aplica defaults sensatos quando campos faltam
 *    • Constantes de whitelist estão coerentes com Modo Básico
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import {
  GEOMETRIES_WHITELIST,
  MATERIALS_WHITELIST,
  GEOMETRY_LABELS,
  AI_TOOL_SCHEMA,
  AI_SYSTEM_PROMPT,
  validateAiResponse,
  type AiGenerateResult,
} from "@/lib/bioprint/ai-generate"

// ═══════════════════════════════════════════════════════════════════════════
// 1) Whitelists coerentes
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · Whitelists de segurança", () => {
  it("GEOMETRIES_WHITELIST contém exatamente as 5 geometrias do Modo Básico", () => {
    expect(GEOMETRIES_WHITELIST).toEqual([
      "cube_tissue",
      "skin_cylinder",
      "disk",
      "membrane",
      "vessel",
    ])
  })

  it("GEOMETRY_LABELS tem rótulo pt-BR para cada geometria whitelist", () => {
    for (const g of GEOMETRIES_WHITELIST) {
      expect(GEOMETRY_LABELS[g]).toBeDefined()
      expect(GEOMETRY_LABELS[g].length).toBeGreaterThan(3)
    }
  })

  it("MATERIALS_WHITELIST tem 10 materiais canônicos", () => {
    expect(MATERIALS_WHITELIST.length).toBe(10)
    expect(MATERIALS_WHITELIST).toContain("GelMA")
    expect(MATERIALS_WHITELIST).toContain("Alginate")
    expect(MATERIALS_WHITELIST).toContain("PCL")
  })

  it("AI_SYSTEM_PROMPT menciona whitelist de geometrias e materiais", () => {
    for (const g of GEOMETRIES_WHITELIST) {
      expect(AI_SYSTEM_PROMPT).toContain(g)
    }
    // Pelo menos 5 materiais principais devem aparecer no prompt
    const materialsInPrompt = MATERIALS_WHITELIST.filter((m) =>
      AI_SYSTEM_PROMPT.includes(m),
    )
    expect(materialsInPrompt.length).toBeGreaterThanOrEqual(5)
  })

  it("AI_TOOL_SCHEMA tem enum de geometrias sincronizado com whitelist", () => {
    // @ts-expect-error tool schema types are Anthropic-specific, tests inspect structure
    expect(AI_TOOL_SCHEMA.input_schema.properties.geometryId.enum).toEqual(
      GEOMETRIES_WHITELIST,
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2) validateAiResponse — happy path
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · validateAiResponse — respostas válidas", () => {
  // PCL fundido puro = 100%. Materiais em solução aquosa ficam em 0.5-30%.
  // Validador aceita 0.5-100% para cobrir ambos os casos.
  const VALID_RESPONSE = {
    geometryId: "cube_tissue",
    dims: { x: 20, y: 15, z: 10 },
    bioinkSuggestion: {
      material: "PCL",
      concentration_pct: 100,
      crosslinker: null,
      crosslinkerConc: null,
      rationale: "PCL é ideal para osso cortical devido à alta rigidez e biocompatibilidade.",
    },
    processParams: {
      printSpeed_mms: 5,
      layerHeight_mm: 0.3,
      infillPercent: 65,
      needleDiameter_um: 250,
    },
    rationale:
      "Osso cortical requer scaffold rígido com porosidade controlada para vascularização passiva. " +
      "PCL fundido (55-65°C) produz peças estruturais duráveis, com módulo elástico compatível com o córtex. " +
      "Infill 65% oferece equilíbrio entre integridade mecânica e permeabilidade celular. " +
      "Próximos passos: validar migração de osteoblastos em D7/D14 e considerar coating com HA.",
    dois: ["10.1088/1758-5090/abc123", "10.1016/j.actbio.2021.05.001"],
  }

  it("aceita resposta válida completa", () => {
    const r = validateAiResponse(VALID_RESPONSE, "prompt de teste")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.geometryId).toBe("cube_tissue")
      expect(r.result.geometryLabel).toBe("Cubo (tecido volumétrico)")
      expect(r.result.dims).toEqual({ x: 20, y: 15, z: 10 })
      expect(r.result.bioinkSuggestion.material).toBe("PCL")
      expect(r.result.dois.length).toBe(2)
      expect(r.result.originalPrompt).toBe("prompt de teste")
      expect(r.result.warnings.length).toBe(0)
    }
  })

  it("aceita resposta para córnea (disk + GelMA)", () => {
    const corneaResponse = {
      ...VALID_RESPONSE,
      geometryId: "disk",
      dims: { x: 11, y: 11, z: 0.8 },
      bioinkSuggestion: {
        material: "GelMA",
        concentration_pct: 10,
        crosslinker: "LAP + UV 405 nm",
        crosslinkerConc: "0.1% w/v LAP",
        rationale: "GelMA fotocurável mimetiza estroma corneano com transparência controlada.",
      },
    }
    const r = validateAiResponse(corneaResponse, "córnea 11 mm")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.geometryId).toBe("disk")
      expect(r.result.geometryLabel).toBe("Disco/lente (córnea, cartilagem)")
      expect(r.result.bioinkSuggestion.crosslinker).toBe("LAP + UV 405 nm")
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3) Guardrails — geometria fora da whitelist é REJEITADA
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · Guardrails — geometria fora whitelist", () => {
  const BAD_RESPONSE = {
    geometryId: "hexagonal_liver", // ← geometria avançada, não permitida no Sprint A
    dims: { x: 20, y: 15, z: 10 },
    bioinkSuggestion: {
      material: "dECM",
      concentration_pct: 5,
      crosslinker: null,
      crosslinkerConc: null,
      rationale: "test",
    },
    processParams: {
      printSpeed_mms: 8,
      layerHeight_mm: 0.2,
      infillPercent: 50,
      needleDiameter_um: 300,
    },
    rationale: "test",
    dois: [],
  }

  it("rejeita geometria avançada (hexagonal_liver)", () => {
    const r = validateAiResponse(BAD_RESPONSE, "test")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toContain("geometria_fora_whitelist")
      expect(r.error).toContain("hexagonal_liver")
    }
  })

  it("rejeita geometria inventada (invalid_shape)", () => {
    const r = validateAiResponse({ ...BAD_RESPONSE, geometryId: "invalid_shape" }, "test")
    expect(r.ok).toBe(false)
  })

  it("rejeita quando geometryId ausente", () => {
    const { geometryId, ...withoutGeom } = BAD_RESPONSE
    void geometryId
    const r = validateAiResponse(withoutGeom, "test")
    expect(r.ok).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4) Material fora whitelist → substituído por GelMA + warning
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · Guardrails — material fora whitelist", () => {
  it("substitui material inventado por GelMA com warning", () => {
    const bad = {
      geometryId: "cube_tissue",
      dims: { x: 20, y: 15, z: 10 },
      bioinkSuggestion: {
        material: "UnobtainiumGel", // ← não existe na whitelist
        concentration_pct: 8,
        rationale: "material fictício",
      },
      processParams: {
        printSpeed_mms: 8,
        layerHeight_mm: 0.2,
        infillPercent: 50,
        needleDiameter_um: 300,
      },
      rationale: "teste com material inválido para verificar fallback do validador",
      dois: [],
    }
    const r = validateAiResponse(bad, "test")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.bioinkSuggestion.material).toBe("GelMA")
      expect(r.result.warnings.some((w) => w.includes("UnobtainiumGel"))).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5) Clamp defensivo — dimensões fora de [5, 100]
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · Clamp defensivo de dimensões", () => {
  const BASE = {
    geometryId: "cube_tissue",
    bioinkSuggestion: {
      material: "GelMA",
      concentration_pct: 10,
      rationale: "test",
    },
    processParams: {
      printSpeed_mms: 8,
      layerHeight_mm: 0.2,
      infillPercent: 50,
      needleDiameter_um: 300,
    },
    rationale: "teste clamp de dimensões para verificar comportamento defensivo do validador",
    dois: [],
  }

  it("clampa X grande (200 → 100)", () => {
    const r = validateAiResponse({ ...BASE, dims: { x: 200, y: 15, z: 10 } }, "test")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.dims.x).toBe(100)
      expect(r.result.warnings.some((w) => w.includes("dims.x"))).toBe(true)
    }
  })

  it("clampa dim pequena (2 → 5)", () => {
    const r = validateAiResponse({ ...BASE, dims: { x: 2, y: 15, z: 10 } }, "test")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.dims.x).toBe(5)
      expect(r.result.warnings.some((w) => w.includes("dims.x"))).toBe(true)
    }
  })

  it("aplica fallback quando dim é NaN", () => {
    const r = validateAiResponse({ ...BASE, dims: { x: "abc" as unknown as number, y: 15, z: 10 } }, "test")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.dims.x).toBe(20) // fallback default
      expect(r.result.warnings.some((w) => w.includes("dims.x"))).toBe(true)
    }
  })

  it("permite disk fino (Z pode ser 0.5)", () => {
    const r = validateAiResponse({ ...BASE, geometryId: "disk", dims: { x: 11, y: 11, z: 0.5 } }, "test")
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.dims.z).toBe(0.5)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6) Defaults sensatos quando LLM devolve payload minimalista
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · Defaults quando LLM devolve mínimo", () => {
  it("aplica defaults quando processParams vem vazio", () => {
    const minimal = {
      geometryId: "cube_tissue",
      dims: { x: 20, y: 15, z: 10 },
      bioinkSuggestion: {
        material: "GelMA",
        concentration_pct: 10,
        rationale: "teste minimalista",
      },
      processParams: {}, // ← vazio
      rationale: "resposta minimalista para verificar defaults dos parâmetros de processo",
      dois: [],
    }
    const r = validateAiResponse(minimal, "test")
    expect(r.ok).toBe(true)
    if (r.ok) {
      // Defaults declarados em clampNumber: 8, 0.2, 50, 300
      expect(r.result.processParams.printSpeed_mms).toBe(8)
      expect(r.result.processParams.layerHeight_mm).toBe(0.2)
      expect(r.result.processParams.infillPercent).toBe(50)
      expect(r.result.processParams.needleDiameter_um).toBe(300)
      // 4 warnings — 1 por campo faltante
      expect(r.result.warnings.length).toBeGreaterThanOrEqual(4)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7) Sanity checks estruturais
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · Sanity checks", () => {
  it("rejeita entrada null/undefined", () => {
    expect(validateAiResponse(null, "test").ok).toBe(false)
    expect(validateAiResponse(undefined, "test").ok).toBe(false)
    expect(validateAiResponse("string aleatoria", "test").ok).toBe(false)
    expect(validateAiResponse(42, "test").ok).toBe(false)
  })

  it("originalPrompt é preservado no result", () => {
    const r = validateAiResponse(
      {
        geometryId: "cube_tissue",
        dims: { x: 20, y: 15, z: 10 },
        bioinkSuggestion: { material: "GelMA", concentration_pct: 10, rationale: "ok" },
        processParams: {
          printSpeed_mms: 8,
          layerHeight_mm: 0.2,
          infillPercent: 50,
          needleDiameter_um: 300,
        },
        rationale: "rationale suficientemente longo para passar do check de tamanho",
        dois: [],
      },
      "Meu prompt original específico",
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.originalPrompt).toBe("Meu prompt original específico")
    }
  })

  it("dois vazio é aceito (LLM honesto)", () => {
    const r = validateAiResponse(
      {
        geometryId: "cube_tissue",
        dims: { x: 20, y: 15, z: 10 },
        bioinkSuggestion: { material: "GelMA", concentration_pct: 10, rationale: "ok" },
        processParams: {
          printSpeed_mms: 8,
          layerHeight_mm: 0.2,
          infillPercent: 50,
          needleDiameter_um: 300,
        },
        rationale: "rationale suficientemente longo para passar do check de tamanho",
        dois: [],
      },
      "test",
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.dois).toEqual([])
    }
  })

  it("filtra DOIs vazios/inválidos do array", () => {
    const r = validateAiResponse(
      {
        geometryId: "cube_tissue",
        dims: { x: 20, y: 15, z: 10 },
        bioinkSuggestion: { material: "GelMA", concentration_pct: 10, rationale: "ok" },
        processParams: {
          printSpeed_mms: 8,
          layerHeight_mm: 0.2,
          infillPercent: 50,
          needleDiameter_um: 300,
        },
        rationale: "rationale suficientemente longo para passar do check de tamanho",
        dois: ["10.1088/valid", "", "abc", "10.1016/valid2", "   "],
      },
      "test",
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.dois.length).toBe(2)
      expect(r.result.dois).toContain("10.1088/valid")
    }
  })

  it("respeita cap de max 4 DOIs", () => {
    const r = validateAiResponse(
      {
        geometryId: "cube_tissue",
        dims: { x: 20, y: 15, z: 10 },
        bioinkSuggestion: { material: "GelMA", concentration_pct: 10, rationale: "ok" },
        processParams: {
          printSpeed_mms: 8,
          layerHeight_mm: 0.2,
          infillPercent: 50,
          needleDiameter_um: 300,
        },
        rationale: "rationale suficientemente longo para passar do check de tamanho",
        dois: ["10.1/a", "10.2/b", "10.3/c", "10.4/d", "10.5/e", "10.6/f"],
      },
      "test",
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.result.dois.length).toBe(4)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 8) Type consistency — AiGenerateResult tem campos esperados pelo UI
// ═══════════════════════════════════════════════════════════════════════════

describe("R12.56 · Contract com o UI (page.tsx)", () => {
  it("AiGenerateResult expõe campos que o AIPanel consome", () => {
    const r = validateAiResponse(
      {
        geometryId: "vessel",
        dims: { x: 8, y: 8, z: 20 },
        bioinkSuggestion: {
          material: "Pluronic F127",
          concentration_pct: 20,
          crosslinker: "Cold set 4°C",
          crosslinkerConc: null,
          rationale: "Pluronic é sacrificial para lumens vasculares.",
        },
        processParams: {
          printSpeed_mms: 6,
          layerHeight_mm: 0.25,
          infillPercent: 100,
          needleDiameter_um: 410,
        },
        rationale: "Rationale suficientemente longo. " + "x".repeat(200),
        dois: ["10.1088/vaso"],
      },
      "vaso 6 mm",
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      const result: AiGenerateResult = r.result
      // Contract: campos usados no JSX do AIPanel
      expect(typeof result.geometryId).toBe("string")
      expect(typeof result.geometryLabel).toBe("string")
      expect(typeof result.dims.x).toBe("number")
      expect(typeof result.bioinkSuggestion.material).toBe("string")
      expect(typeof result.bioinkSuggestion.concentration_pct).toBe("number")
      expect(typeof result.processParams.printSpeed_mms).toBe("number")
      expect(typeof result.rationale).toBe("string")
      expect(Array.isArray(result.dois)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
    }
  })
})
