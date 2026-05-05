/**
 * BIA v4 — Formulador Profissional de Bio/Hidrogel (Pro)
 * ──────────────────────────────────────────────────────
 * Lógica científica robusta para combinar biomateriais (do catálogo OU custom),
 * analisar interações químicas/físicas e gerar formulação otimizada para o
 * objetivo clínico do usuário.
 *
 * Diferenciais vs formulador legado:
 * 1. Aceita até 8 biomateriais com concentração e papel definidos pelo usuário
 * 2. Análise multi-dimensional: química, mecânica, biológica, regulatória
 * 3. Templates científicos por objetivo clínico (cicatrização, osso, gengiva, mama)
 * 4. Sistema de score + alertas + sugestões alternativas
 * 5. Validação de incompatibilidades (cation-anion clash, pH, crosslinking conflict)
 */

import { generateStructured, SYSTEM_PROMPTS } from "./gemini"

// ────────────────────────────────────────────────────────────────────────────
// TIPOS PÚBLICOS
// ────────────────────────────────────────────────────────────────────────────

export type BiomaterialRole =
  | "STRUCTURAL"      // Backbone mecânico (PCL, PLGA, alginato cross-linked)
  | "BIOACTIVE"       // Sinalização celular (RGD, fatores de crescimento, dECM)
  | "RHEOLOGY"        // Modulador reológico (HA, xantana, gelatina fria)
  | "CROSSLINKER"     // Agente reticulante (CaCl2, genipina, EDC/NHS, UV+LAP)
  | "POROGEN"         // Gerador de poros (NaCl, sacarose, gás CO2)
  | "ADDITIVE"        // Aditivo (antibiótico, anti-oxidante, contraste)
  | "SOLVENT"         // Solvente/buffer (PBS, água, DMSO, etanol)

export interface FormulatorInput {
  /** Objetivo clínico do usuário (texto livre + categoria sugerida) */
  goal: string
  goalCategory?: ClinicalGoal

  /** Tipo de tecido alvo (texto livre) */
  targetTissue?: string

  /** Biomateriais escolhidos (catálogo OU custom) */
  components: ComponentInput[]

  /** Especificações desejadas (todas opcionais) */
  specs?: {
    targetModulusKPa?: { min?: number; max?: number }
    porosityPercent?: { min?: number; max?: number }
    poreSizeUm?: { min?: number; max?: number }
    degradationDays?: { min?: number; max?: number }
    swellingPercent?: { min?: number; max?: number }
    viscoelasticBehavior?: "elastic" | "viscoelastic" | "plastic" | "any"
    biodegradable?: boolean
    printable?: boolean
    cellLaden?: boolean
    sterilizable?: boolean
    transparent?: boolean
    injectable?: boolean
    pHRange?: { min?: number; max?: number }
  }

  /** Restrições adicionais do usuário */
  constraints?: {
    avoidAnimalDerived?: boolean        // sem gelatina, fibrina, colágeno animal
    avoidPhotoinitiator?: boolean       // sem LAP/Irgacure
    fdaApprovedOnly?: boolean
    costSensitive?: boolean
    notes?: string
  }

  /** Modo: rápido (1 sugestão) ou amplo (3 alternativas) */
  mode?: "single" | "alternatives"
}

export type ClinicalGoal =
  | "WOUND_HEALING"          // Cicatrização cutânea
  | "BONE_REGENERATION"      // Diferenciação óssea
  | "GINGIVAL_REGENERATION"  // Regeneração gengival/periodontal
  | "CARTILAGE_REPAIR"       // Cartilagem articular
  | "BREAST_IMPLANT"         // Implante mamário elástico biodegradável
  | "VASCULAR_GRAFT"         // Vaso/enxerto vascular
  | "NEURAL_REGENERATION"    // Nervo periférico/SNC
  | "DRUG_DELIVERY"          // Entrega controlada
  | "ORGANOID_SCAFFOLD"      // Suporte para organoide
  | "GENERIC"                // Genérico

export interface ComponentInput {
  /** Nome do biomaterial (ex: "GelMA", "Quitosana", "Meu polímero X") */
  name: string

  /** Concentração desejada — string flexível: "5% w/v", "10 mg/mL", "1:1", "qsp 100 mL" */
  concentration?: string

  /** Papel funcional na formulação */
  role?: BiomaterialRole

  /** Se vem do catálogo BIA, anexar id (opcional) */
  catalogId?: string

  /** Propriedades conhecidas do componente (preenchidas pelo usuário se custom) */
  knownProps?: {
    family?: string                // "polissacarídeo", "proteína", "sintético"
    modulusKPa?: number
    degradationDays?: number
    crosslinkingMethods?: string[] // ["UV+LAP", "CaCl2 100mM"]
    pH?: number
    chargedAt7?: "anionic" | "cationic" | "neutral" | "amphoteric"
    notes?: string
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TIPOS DE SAÍDA
// ────────────────────────────────────────────────────────────────────────────

export interface ProFormulation {
  /** Nome profissional sugerido (ex: "GelMA-HA-nHA Composite for Maxillary Bone") */
  name: string
  goalCategory: ClinicalGoal
  rationale: string                 // Racional científico de 3-5 frases
  scientificScore: {
    overall: number                  // 0-100
    mechanical: number
    biological: number
    manufacturability: number
    regulatory: number
  }

  /** Tabela final de componentes (com ajustes da IA) */
  components: Array<{
    name: string
    role: BiomaterialRole
    concentration: string            // "5% w/v"
    rationale: string                // por que entra na fórmula
    safetyClass?: string             // "ISO 10993-5/10 OK", "GRAS", "FDA-cleared"
  }>

  /** Crosslinking final */
  crosslinking: {
    method: string                   // "UV 365 nm + 0.25% LAP, 30s"
    parameters: Record<string, string>
    rationale: string
  }

  /** Propriedades preditas */
  predictedProperties: {
    youngsModulusKPa?: string        // "8–15 kPa"
    porosityPercent?: string
    poreSizeUm?: string
    swellingPercent?: string
    degradationDays?: string
    gelTimeMin?: string
    cellViability?: string           // "≥85% após 7 dias"
    pH?: string
    viscosityPaS?: string
  }

  /** Protocolo passo a passo */
  preparationProtocol: Array<{
    step: number
    title: string
    description: string
    timeMin?: number
    temperature?: string
    criticalPoint?: boolean          // se true → CCP (Critical Control Point)
  }>

  /** Alertas e incompatibilidades detectadas */
  warnings: Array<{
    severity: "info" | "warning" | "critical"
    type: string                     // "INCOMPATIBILITY" | "CONCENTRATION" | "STERILIZATION" | "REGULATORY"
    message: string
    suggestion?: string
  }>

  /** Parâmetros de bioimpressão sugeridos (se printable=true) */
  printingParameters?: {
    technology: string               // "Extrusion (EBB)" | "DLP" | "Inkjet"
    nozzleDiameterUm?: number
    pressureKPa?: { min: number; max: number }
    speedMmS?: { min: number; max: number }
    nozzleTempC?: number
    plateTempC?: number
    layerHeightUm?: number
    infillPercent?: number
    infillPattern?: string
  }

  /** Caracterização recomendada */
  characterization: string[]          // ["Reologia oscilatória 0.1-100 Hz", "MTT 24h/72h/7d", ...]

  /** Considerações regulatórias */
  regulatory: {
    estimatedClass: string             // "Classe IIa", "Classe III", "Pesquisa"
    relevantStandards: string[]        // ["ISO 10993-5", "ISO 13485", "ANVISA RDC 751/2022"]
    notes: string
  }

  /** Referências */
  references: Array<{ doi?: string; title: string; year?: number }>

  /** Fórmulas alternativas (se mode === "alternatives") */
  alternatives?: Array<{
    name: string
    summary: string
    swapFromOriginal: string           // "troca PCL por PLGA 50:50"
    tradeoff: string
  }>
}

// ────────────────────────────────────────────────────────────────────────────
// MOTOR DE INCOMPATIBILIDADES (regras determinísticas — pré-IA)
// ────────────────────────────────────────────────────────────────────────────

interface ChemRule {
  id: string
  match: (names: string[]) => boolean
  severity: "info" | "warning" | "critical"
  type: string
  message: string
  suggestion?: string
}

const lc = (s: string) => s.toLowerCase()
const has = (names: string[], ...keys: string[]) =>
  keys.some(k => names.some(n => lc(n).includes(lc(k))))

const CHEM_RULES: ChemRule[] = [
  {
    id: "alginate-collagen-charge",
    match: n => has(n, "alginat") && has(n, "colágen", "collagen"),
    severity: "warning",
    type: "INCOMPATIBILITY",
    message: "Alginato (aniônico) + Colágeno (catiônico em pH<7) podem precipitar por interação iônica.",
    suggestion: "Misture em pH 7.4 (PBS) ou use blend pré-formado; ou substitua colágeno por gelatina neutra.",
  },
  {
    id: "chitosan-anionic-clash",
    match: n => has(n, "quitosan", "chitosan") && (has(n, "alginat") || has(n, "ha", "hialur") || has(n, "carragen")),
    severity: "info",
    type: "INCOMPATIBILITY",
    message: "Quitosana (catiônica) + polissacarídeo aniônico → polyelectrolyte complex (PEC) — útil mas pode opacificar.",
    suggestion: "Controle a razão molar 1:1 a 3:1 (quitosana:aniônico) e mantenha pH 5.5–6.5.",
  },
  {
    id: "gelma-no-photoinitiator",
    match: n => has(n, "gelma", "metacri") && !has(n, "lap", "irgacure", "i2959", "photoinitiator", "fotoiniciador"),
    severity: "warning",
    type: "MISSING_COMPONENT",
    message: "GelMA / hidrogel metacrilado precisa de fotoiniciador para crosslink UV/visível.",
    suggestion: "Adicione 0.25% LAP (visível 405 nm) ou 0.05% Irgacure 2959 (UV 365 nm).",
  },
  {
    id: "fresh-buffer-warning",
    match: n => has(n, "fibrina") && has(n, "trombina"),
    severity: "info",
    type: "GELATION",
    message: "Fibrina + Trombina → gelificação rápida (segundos). Use sistema co-axial ou misture in situ.",
  },
  {
    id: "ca-phosphate-precipitation",
    match: n => has(n, "cacl", "calcium chloride") && has(n, "fosfato", "phosphate", "pbs"),
    severity: "warning",
    type: "INCOMPATIBILITY",
    message: "CaCl₂ + tampão fosfato → precipitação de fosfato de cálcio insolúvel.",
    suggestion: "Use HEPES ou Tris-buffered saline em vez de PBS quando crosslinkar com CaCl₂.",
  },
  {
    id: "edc-nhs-water-degradation",
    match: n => has(n, "edc"),
    severity: "info",
    type: "STABILITY",
    message: "EDC hidrolisa em meio aquoso (t½ ≈ 4 min em pH 7). Prepare fresh e use em ≤15 min.",
  },
]

function runCompatibilityCheck(input: FormulatorInput) {
  const names = input.components.map(c => c.name)
  const triggered: ChemRule[] = []
  for (const rule of CHEM_RULES) {
    if (rule.match(names)) triggered.push(rule)
  }
  return triggered.map(r => ({
    severity: r.severity,
    type: r.type,
    message: r.message,
    suggestion: r.suggestion,
  }))
}

// ────────────────────────────────────────────────────────────────────────────
// TEMPLATES CIENTÍFICOS POR OBJETIVO CLÍNICO
// ────────────────────────────────────────────────────────────────────────────

const GOAL_TEMPLATES: Record<ClinicalGoal, {
  label: string
  context: string
  targetModulus: string
  recommendedFamilies: string[]
  keyConsiderations: string[]
  characterization: string[]
}> = {
  WOUND_HEALING: {
    label: "Cicatrização cutânea",
    context: "Hidrogel macio, hidratado, com transparência para inspeção visual e cessão controlada de fatores. Permeável a O₂ e vapor.",
    targetModulus: "0.5–10 kPa (compatível com derme jovem)",
    recommendedFamilies: ["HA", "Alginato", "Quitosana", "Colágeno I", "Gelatina", "PEG-PCL"],
    keyConsiderations: [
      "WVTR 2000–2500 g/m²/24h (semelhante à pele saudável)",
      "Capacidade de absorção de exsudato 5–20× peso seco",
      "Liberação de PDGF/EGF/VEGF se houver perda crônica",
      "pH 5.5–6.5 para mimetizar manto ácido cutâneo",
    ],
    characterization: ["Swelling kinetics", "WVTR (ISO 13726-1)", "Citotoxicidade (ISO 10993-5)", "Modelo in vivo de excisão dorsal"],
  },
  BONE_REGENERATION: {
    label: "Diferenciação óssea / regeneração óssea",
    context: "Scaffold osteocondutivo com módulo elevado, porosidade interconectada (>70%, poros 200-500 µm) e fase mineral.",
    targetModulus: "1–50 MPa (osso esponjoso) ou 50–500 MPa (cortical)",
    recommendedFamilies: ["PCL", "PLGA", "Hidroxiapatita (HAp)", "β-TCP", "Silk Fibroin", "Bioglass 45S5"],
    keyConsiderations: [
      "Razão Ca/P 1.67 (estequiometria HA)",
      "Liberação controlada de BMP-2 (1-50 µg/mL)",
      "Porosidade hierárquica: macro (200-500 µm) + micro (<10 µm)",
      "Degradação 6-24 meses para acompanhar osteogênese",
    ],
    characterization: ["µ-CT", "ALP activity 7/14/21 dias", "Alizarin Red", "Push-out test in vivo (ratto/coelho)"],
  },
  GINGIVAL_REGENERATION: {
    label: "Regeneração gengival / periodontal",
    context: "Membrana barreira reabsorvível ou hidrogel injetável, com fase celular para queratinócitos/fibroblastos.",
    targetModulus: "5–100 kPa (mucosa)",
    recommendedFamilies: ["Colágeno I/III", "PLGA membrana", "GelMA", "HA-EDC", "PRF (fibrina autóloga)"],
    keyConsiderations: [
      "Aderência mucosa 0.5–2 N/cm",
      "Degradação 4-16 semanas (alinhada com fase de remodelamento)",
      "Ausência de citotoxicidade contra queratinócitos primários",
      "Esterilização gamma 25 kGy ou EtO",
    ],
    characterization: ["Mucoadesão (ex vivo porcina)", "Citotoxicidade HGF", "Modelo de defeito periodontal canino"],
  },
  CARTILAGE_REPAIR: {
    label: "Reparo de cartilagem articular",
    context: "Hidrogel viscoelástico com módulo intermediário, retenção de proteoglicanos e suporte a condrócitos.",
    targetModulus: "100–800 kPa (cartilagem hialina)",
    recommendedFamilies: ["GelMA", "HA-MA", "Sulfato de Condroitina", "PEG-DA", "Silk-Fibroin"],
    keyConsiderations: [
      "Retenção de água ≥70% por 28 dias",
      "Liberação de TGF-β3 (10 ng/mL)",
      "Aggrecan + Col II como marcadores",
      "Fadiga cíclica 1 Hz, 10⁶ ciclos sem ruptura",
    ],
    characterization: ["DMA dinâmica", "Safranin-O / Col II", "Cyclic fatigue", "Modelo de defeito condral em coelho"],
  },
  BREAST_IMPLANT: {
    label: "Implante mamário elástico biodegradável",
    context: "Matriz elastomérica biodegradável de longa duração com baixo módulo, alta deformação reversível e ângulo de contato adequado para integração.",
    targetModulus: "10–50 kPa (tecido mamário) com elasticidade ≥300% deformação",
    recommendedFamilies: ["Poly(glycerol sebacate) - PGS", "PCL elastômero", "Silk fibroin elástica", "PLA/PCL blends"],
    keyConsiderations: [
      "Degradação 18-36 meses para permitir integração de tecido autólogo",
      "Capsule contracture mínimo (Baker I-II)",
      "Ausência de migração de partículas (testes long-term)",
      "Esterilização sem alterar propriedades mecânicas",
      "Conformidade com ISO 14607 (implantes mamários) e ANVISA RDC 751/2022",
    ],
    characterization: ["DMA cíclico 10⁶ ciclos", "Capsule formation in vivo (180/365 dias)", "GPC/MW vs tempo", "Histopatologia + imunohisto"],
  },
  VASCULAR_GRAFT: {
    label: "Enxerto vascular / pequeno calibre",
    context: "Tubo de parede dupla, lúmen anti-trombogênico, ECM externa para integração celular.",
    targetModulus: "0.5–5 MPa (tangential), compliance 5-10%/100 mmHg",
    recommendedFamilies: ["PCL eletrofiado", "PLA", "Colágeno descelularizado", "Heparina-PEG", "Elastina recombinante"],
    keyConsiderations: [
      "Burst pressure ≥1500 mmHg",
      "Suture retention ≥1 N",
      "Anti-trombogênico (heparina ou polysulfobetaína)",
      "Endothelial coverage ≥80% em 28 dias",
    ],
    characterization: ["Burst pressure", "Compliance", "Hemólise (ISO 10993-4)", "Patency rate (modelo carótida ovino)"],
  },
  NEURAL_REGENERATION: {
    label: "Regeneração nervosa periférica",
    context: "Conduit alinhado, módulo muito baixo, liberação de NGF/BDNF, canais paralelos.",
    targetModulus: "0.1–1 kPa (parênquima neural)",
    recommendedFamilies: ["GelMA aligned", "PCL eletrofiado alinhado", "Colágeno I", "Self-assembling peptides (RADA16)", "Silk-fibroin tubular"],
    keyConsiderations: [
      "Alinhamento topográfico (canais 5-20 µm)",
      "Liberação NGF 50-100 ng/mL/dia por 4 semanas",
      "Permeabilidade controlada à glia",
      "Degradação 6-12 meses",
    ],
    characterization: ["AFM modulus", "DRG outgrowth assay", "Walking track (SFI) em rato"],
  },
  DRUG_DELIVERY: {
    label: "Entrega controlada de fármaco",
    context: "Matriz com cinética de liberação otimizada (ordem zero ou Higuchi) para a janela terapêutica desejada.",
    targetModulus: "depende — geralmente 1–100 kPa para injetáveis",
    recommendedFamilies: ["PLGA", "Quitosana", "HA", "Pluronic F-127", "Liposomas-PEG"],
    keyConsiderations: [
      "Burst release <20% nas primeiras 24h",
      "Eficiência de encapsulação ≥80%",
      "Estabilidade do fármaco (proteção térmica/oxidativa)",
      "Razão polímero/fármaco 5:1 a 20:1",
    ],
    characterization: ["Liberação USP IV apparatus", "HPLC quantificação", "Bioactivity post-release"],
  },
  ORGANOID_SCAFFOLD: {
    label: "Suporte para organoide",
    context: "Hidrogel macio defined (Matrigel-free idealmente), com motivos RGD/IKVAV.",
    targetModulus: "0.2–2 kPa",
    recommendedFamilies: ["GelMA low-DOF", "PEG-RGD", "HA-RGD", "Self-assembling peptides", "Decellularized organ ECM"],
    keyConsiderations: [
      "Motivos de adesão definidos (RGD 1-5 mM)",
      "Auto-assembly a 37°C ideal",
      "Free de componentes animais para clinical translation",
      "Degradação por MMPs (sequência IPVS-LRSG)",
    ],
    characterization: ["AFM modulus", "Live/Dead day 7/14", "Marcadores de tipo de organoide", "ssRNA-seq"],
  },
  GENERIC: {
    label: "Genérico",
    context: "Formulação genérica baseada nas escolhas e especificações do usuário.",
    targetModulus: "depende dos requisitos do usuário",
    recommendedFamilies: [],
    keyConsiderations: [],
    characterization: [],
  },
}

export function listClinicalGoals(): Array<{ value: ClinicalGoal; label: string }> {
  return Object.entries(GOAL_TEMPLATES).map(([k, v]) => ({ value: k as ClinicalGoal, label: v.label }))
}

// ────────────────────────────────────────────────────────────────────────────
// MOTOR PRINCIPAL — PROMPT BUILDER
// ────────────────────────────────────────────────────────────────────────────

function buildContextBlock(input: FormulatorInput): string {
  const goal = input.goalCategory ?? "GENERIC"
  const tpl = GOAL_TEMPLATES[goal]

  const componentsBlock = input.components.map((c, i) => {
    const props = c.knownProps
      ? ` | propriedades: ${Object.entries(c.knownProps)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join("/") : v}`)
          .join(", ")}`
      : ""
    return `  ${i + 1}. ${c.name}${c.concentration ? ` @ ${c.concentration}` : ""}${c.role ? ` [papel: ${c.role}]` : ""}${c.catalogId ? ` [catálogo: ${c.catalogId}]` : " [CUSTOM — usuário adicionou manualmente]"}${props}`
  }).join("\n")

  const specs = input.specs ?? {}
  const specsBlock = [
    specs.targetModulusKPa &&
      `  • Módulo de Young alvo: ${specs.targetModulusKPa.min ?? "?"}–${specs.targetModulusKPa.max ?? "?"} kPa`,
    specs.porosityPercent &&
      `  • Porosidade alvo: ${specs.porosityPercent.min ?? "?"}–${specs.porosityPercent.max ?? "?"} %`,
    specs.poreSizeUm &&
      `  • Tamanho de poros: ${specs.poreSizeUm.min ?? "?"}–${specs.poreSizeUm.max ?? "?"} µm`,
    specs.degradationDays &&
      `  • Degradação alvo: ${specs.degradationDays.min ?? "?"}–${specs.degradationDays.max ?? "?"} dias`,
    specs.swellingPercent &&
      `  • Swelling alvo: ${specs.swellingPercent.min ?? "?"}–${specs.swellingPercent.max ?? "?"} %`,
    specs.viscoelasticBehavior && specs.viscoelasticBehavior !== "any" &&
      `  • Comportamento viscoelástico: ${specs.viscoelasticBehavior}`,
    specs.pHRange &&
      `  • pH alvo: ${specs.pHRange.min ?? "?"}–${specs.pHRange.max ?? "?"}`,
    specs.biodegradable !== undefined && `  • Biodegradável: ${specs.biodegradable ? "SIM" : "NÃO"}`,
    specs.printable && `  • Bioimprimível: SIM`,
    specs.cellLaden && `  • Cell-laden: SIM`,
    specs.injectable && `  • Injetável: SIM`,
    specs.sterilizable && `  • Esterilizável (manter propriedades): SIM`,
    specs.transparent && `  • Transparente: SIM`,
  ].filter(Boolean).join("\n")

  const constraints = input.constraints ?? {}
  const constraintsBlock = [
    constraints.avoidAnimalDerived && "  • Evitar componentes de origem animal",
    constraints.avoidPhotoinitiator && "  • Evitar fotoiniciadores",
    constraints.fdaApprovedOnly && "  • Apenas componentes FDA-cleared/GRAS/EMA-approved",
    constraints.costSensitive && "  • Sensível a custo (preferir reagentes commodity)",
    constraints.notes && `  • Notas adicionais: ${constraints.notes}`,
  ].filter(Boolean).join("\n")

  return `
OBJETIVO CLÍNICO: ${input.goal}
CATEGORIA: ${tpl.label}
TECIDO ALVO: ${input.targetTissue ?? "Não especificado"}

CONTEXTO CIENTÍFICO (template BIA):
${tpl.context}
Módulo recomendado: ${tpl.targetModulus}
Famílias indicadas: ${tpl.recommendedFamilies.join(", ") || "(livre)"}
Considerações-chave:
${tpl.keyConsiderations.map(k => `  - ${k}`).join("\n") || "  -"}

COMPONENTES ESCOLHIDOS PELO USUÁRIO (${input.components.length}):
${componentsBlock}

ESPECIFICAÇÕES DESEJADAS:
${specsBlock || "  (nenhuma especificação adicional)"}

RESTRIÇÕES:
${constraintsBlock || "  (nenhuma)"}
`.trim()
}

// Schema enxuto: descrições curtas, sem comentários longos.
// Gemini reproduz melhor schemas pequenos sem perder qualidade do conteúdo.
const RESULT_SCHEMA = `{
  "name": "string (nome profissional da formulação)",
  "goalCategory": "WOUND_HEALING|BONE_REGENERATION|GINGIVAL_REGENERATION|CARTILAGE_REPAIR|BREAST_IMPLANT|VASCULAR_GRAFT|NEURAL_REGENERATION|DRUG_DELIVERY|ORGANOID_SCAFFOLD|GENERIC",
  "rationale": "string (2-4 frases curtas)",
  "scientificScore": { "overall": 0, "mechanical": 0, "biological": 0, "manufacturability": 0, "regulatory": 0 },
  "components": [
    { "name": "string", "role": "STRUCTURAL|BIOACTIVE|RHEOLOGY|CROSSLINKER|POROGEN|ADDITIVE|SOLVENT", "concentration": "string", "rationale": "string curta", "safetyClass": "string" }
  ],
  "crosslinking": {
    "method": "string",
    "parameters": { "key": "value" },
    "rationale": "string curta"
  },
  "predictedProperties": {
    "youngsModulusKPa": "string",
    "porosityPercent": "string",
    "poreSizeUm": "string",
    "swellingPercent": "string",
    "degradationDays": "string",
    "gelTimeMin": "string",
    "cellViability": "string",
    "pH": "string",
    "viscosityPaS": "string"
  },
  "preparationProtocol": [
    { "step": 1, "title": "string", "description": "string concisa (1-2 frases)", "timeMin": 0, "temperature": "string", "criticalPoint": false }
  ],
  "warnings": [
    { "severity": "info|warning|critical", "type": "string", "message": "string", "suggestion": "string" }
  ],
  "printingParameters": {
    "technology": "string",
    "nozzleDiameterUm": 0,
    "pressureKPa": { "min": 0, "max": 0 },
    "speedMmS": { "min": 0, "max": 0 },
    "nozzleTempC": 0,
    "plateTempC": 0,
    "layerHeightUm": 0,
    "infillPercent": 0,
    "infillPattern": "string"
  },
  "characterization": ["string"],
  "regulatory": {
    "estimatedClass": "string",
    "relevantStandards": ["string"],
    "notes": "string curta"
  },
  "references": [
    { "doi": "string", "title": "string", "year": 2024 }
  ],
  "alternatives": [
    { "name": "string", "summary": "string", "swapFromOriginal": "string", "tradeoff": "string" }
  ]
}`

// ────────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO DEFENSIVA — garante que o resultado nunca quebre a UI
// ────────────────────────────────────────────────────────────────────────────

function normalize(raw: Partial<ProFormulation> | null | undefined, input: FormulatorInput): ProFormulation {
  const r = (raw ?? {}) as Partial<ProFormulation>
  const goalLabel = GOAL_TEMPLATES[input.goalCategory ?? "GENERIC"].label

  const score = r.scientificScore ?? { overall: 0, mechanical: 0, biological: 0, manufacturability: 0, regulatory: 0 }
  // Normaliza para 0-100. Se IA devolveu em escala 0-5 ou 0-10, multiplica.
  const clip = (n: unknown) => {
    let v = typeof n === "number" ? n : Number(n)
    if (!Number.isFinite(v)) return 0
    if (v > 0 && v <= 5) v = v * 20        // escala 0-5 → 0-100
    else if (v > 5 && v <= 10) v = v * 10  // escala 0-10 → 0-100
    return Math.max(0, Math.min(100, Math.round(v)))
  }

  return {
    name: (r.name && r.name.trim()) || `Formulação BIA — ${goalLabel}`,
    goalCategory: (r.goalCategory ?? input.goalCategory ?? "GENERIC") as ClinicalGoal,
    rationale: r.rationale ?? "Combinação proposta pelo usuário; análise detalhada limitada — verifique alertas e ajuste manualmente.",
    scientificScore: {
      overall: clip(score.overall),
      mechanical: clip(score.mechanical),
      biological: clip(score.biological),
      manufacturability: clip(score.manufacturability),
      regulatory: clip(score.regulatory),
    },
    components: Array.isArray(r.components) && r.components.length > 0
      ? r.components.map(c => ({
          name: c?.name ?? "Componente",
          role: (c?.role ?? "STRUCTURAL") as BiomaterialRole,
          concentration: c?.concentration ?? "—",
          rationale: c?.rationale ?? "—",
          safetyClass: c?.safetyClass,
        }))
      : input.components.map(c => ({
          name: c.name,
          role: (c.role ?? "STRUCTURAL") as BiomaterialRole,
          concentration: c.concentration ?? "—",
          rationale: "Componente fornecido pelo usuário.",
        })),
    crosslinking: {
      method: r.crosslinking?.method ?? "A definir conforme química dos componentes",
      parameters: (r.crosslinking?.parameters as Record<string, string>) ?? {},
      rationale: r.crosslinking?.rationale ?? "—",
    },
    predictedProperties: r.predictedProperties ?? {},
    preparationProtocol: Array.isArray(r.preparationProtocol) && r.preparationProtocol.length > 0
      ? r.preparationProtocol.map((p, i) => ({
          step: p?.step ?? i + 1,
          title: p?.title ?? `Passo ${i + 1}`,
          description: p?.description ?? "",
          timeMin: p?.timeMin,
          temperature: p?.temperature,
          criticalPoint: !!p?.criticalPoint,
        }))
      : [{
          step: 1, title: "Protocolo a definir",
          description: "A IA não retornou protocolo detalhado. Use as referências e ajuste manualmente.",
          criticalPoint: false,
        }],
    warnings: Array.isArray(r.warnings) ? r.warnings.map(w => ({
      severity: (w?.severity ?? "info") as "info" | "warning" | "critical",
      type: w?.type ?? "INFO",
      message: w?.message ?? "",
      suggestion: w?.suggestion,
    })) : [],
    printingParameters: r.printingParameters,
    characterization: Array.isArray(r.characterization) ? r.characterization.filter(Boolean) : [],
    regulatory: {
      estimatedClass: r.regulatory?.estimatedClass ?? "Pesquisa (não-implantável)",
      relevantStandards: Array.isArray(r.regulatory?.relevantStandards) ? r.regulatory.relevantStandards : [],
      notes: r.regulatory?.notes ?? "",
    },
    references: Array.isArray(r.references) ? r.references : [],
    alternatives: Array.isArray(r.alternatives) ? r.alternatives : [],
  }
}

// ────────────────────────────────────────────────────────────────────────────
// API PÚBLICA
// ────────────────────────────────────────────────────────────────────────────

export async function formulateProfessional(input: FormulatorInput): Promise<ProFormulation> {
  // 1) Pre-checks determinísticos
  const preWarnings = runCompatibilityCheck(input)

  // 2) Construir prompt rico (mais enxuto)
  const context = buildContextBlock(input)
  const modeBlock =
    input.mode === "alternatives"
      ? "Inclua 2 alternativas curtas em 'alternatives'."
      : "Use alternatives = []."

  const prompt = `${context}

${preWarnings.length > 0 ? `ALERTAS PRÉ-DETECTADOS:
${preWarnings.map(w => `[${w.severity.toUpperCase()}] ${w.type}: ${w.message}${w.suggestion ? ` → ${w.suggestion}` : ""}`).join("\n")}
` : ""}

TAREFA (cientista sênior de biomateriais): analise a combinação, ajuste concentrações, escolha crosslinking ótimo, prediga propriedades em FAIXAS, gere protocolo curto (5-8 passos), identifique incompatibilidades, sugira parâmetros de bioimpressão se aplicável, cite 3 DOIs reais (2020-2025). ${modeBlock}

REGRAS:
- Concentrações com unidade (% w/v, mg/mL).
- Score 0-100. Componentes CUSTOM: assuma propriedades da família.
- Implante mamário: cite ISO 14607.
- Strings CURTAS para caber no limite de tokens — descrições de 1-2 frases.`

  // 3) Chamada estruturada — temperatura baixa, maxTokens alto, JSON forçado
  let raw: Partial<ProFormulation> | null = null
  let aiError: Error | null = null
  try {
    raw = await generateStructured<Partial<ProFormulation>>(
      prompt,
      RESULT_SCHEMA,
      {
        systemPrompt: SYSTEM_PROMPTS.BIOMATERIAL_EXPERT,
        temperature: 0.3,
        maxTokens: 8192,
      },
    )
  } catch (e) {
    aiError = e instanceof Error ? e : new Error(String(e))
  }

  // 4) Normalização defensiva — sempre retorna objeto válido
  const result = normalize(raw, input)

  // 5) Mesclar warnings determinísticos
  const merged = [
    ...preWarnings,
    ...result.warnings.filter(w =>
      !preWarnings.some(p => p.message.toLowerCase().includes((w.message || "").toLowerCase().slice(0, 30))),
    ),
  ]

  // Se a IA falhou completamente, adicionar warning informativo (mas ainda devolver formulação base)
  if (aiError) {
    merged.unshift({
      severity: "warning",
      type: "AI_PARTIAL",
      message: "A análise completa da IA não pôde ser concluída. Resultado preliminar baseado nos dados informados.",
      suggestion: `Tente novamente, simplifique a entrada, ou consulte: ${aiError.message.substring(0, 120)}`,
    })
  }

  return { ...result, warnings: merged }
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS DE EXPORTAÇÃO ADICIONAIS
// ────────────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<BiomaterialRole, string> = {
  STRUCTURAL: "Estrutural (backbone)",
  BIOACTIVE: "Bioativo (sinalização celular)",
  RHEOLOGY: "Modificador reológico",
  CROSSLINKER: "Reticulante (crosslinker)",
  POROGEN: "Gerador de poros",
  ADDITIVE: "Aditivo",
  SOLVENT: "Solvente / tampão",
}

export const ROLE_COLORS: Record<BiomaterialRole, string> = {
  STRUCTURAL: "blue",
  BIOACTIVE: "emerald",
  RHEOLOGY: "purple",
  CROSSLINKER: "amber",
  POROGEN: "rose",
  ADDITIVE: "cyan",
  SOLVENT: "slate",
}
