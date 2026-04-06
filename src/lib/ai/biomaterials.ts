/**
 * BIA v3 - Biomaterial AI Service
 */

import { generateContent, generateStructured, SYSTEM_PROMPTS } from "./gemini"

export interface BiomaterialFormulation {
  name: string
  category: string
  composition: string
  concentration: string
  crosslinking?: string
  mechanicalProps: {
    youngsModulus?: string
    compressiveStrength?: string
    swellingRatio?: string
    gelTime?: string
  }
  biologicalProps: {
    biocompatibility: string
    biodegradability: string
    cellAdhesion: string
  }
  applications: string[]
  preparation: string
  considerations: string[]
  references: string[]
}

export interface OrganoidDesign {
  type: string
  protocol: string
  materials: string[]
  timeline: string
  expectedMarkers: string[]
  qualityMetrics: string[]
}

/**
 * Analisa e recomenda formulação de biomaterial
 */
export async function formulateBiomaterial(
  application: string,
  tissueType: string,
  requirements: {
    stiffness?: string
    biodegradable?: boolean
    printable?: boolean
    cellLaden?: boolean
    transparency?: boolean
  }
): Promise<BiomaterialFormulation> {
  const reqStr = Object.entries(requirements)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")

  const schema = `{
  "name": "Nome do biomaterial/formulação",
  "category": "Hidrogel|Polímero Sintético|Matriz Natural|Compósito|Bioink",
  "composition": "Descrição da composição química",
  "concentration": "ex: 5% w/v GelMA + 0.5% Irgacure",
  "crosslinking": "Método de crosslinking se aplicável",
  "mechanicalProps": {
    "youngsModulus": "ex: 1-10 kPa",
    "compressiveStrength": "ex: 50 kPa",
    "swellingRatio": "ex: 300%",
    "gelTime": "ex: 5 min"
  },
  "biologicalProps": {
    "biocompatibility": "Alta/Média/Moderada",
    "biodegradability": "Rápida/Lenta/Não-biodegradável",
    "cellAdhesion": "Excelente/Boa/Requer modificação RGD"
  },
  "applications": ["aplicação 1", "aplicação 2"],
  "preparation": "Protocolo de preparação passo a passo",
  "considerations": ["consideração 1", "consideração 2"],
  "references": ["DOI 1", "DOI 2"]
}`

  return generateStructured<BiomaterialFormulation>(
    `Formule o biomaterial ideal para:
Aplicação: ${application}
Tipo de tecido: ${tissueType}
Requisitos: ${reqStr}

Use o conhecimento do banco de dados BIA (807+ formulações validadas).`,
    schema,
    { systemPrompt: SYSTEM_PROMPTS.BIOMATERIAL_EXPERT, temperature: 0.4 }
  )
}

/**
 * Design de organoide
 */
export async function designOrganoid(
  organoidType: string,
  purpose: string,
  cellSource: string
): Promise<OrganoidDesign> {
  const schema = `{
  "type": "${organoidType}",
  "protocol": "Protocolo detalhado de diferenciação (passo a passo, com timelines)",
  "materials": ["material 1 com concentração", "material 2"],
  "timeline": "ex: Dia 0-3: indução mesoderme; Dia 4-7: ...",
  "expectedMarkers": ["marcador 1 (ex: CDX2)", "marcador 2"],
  "qualityMetrics": ["critério 1", "critério 2"]
}`

  return generateStructured<OrganoidDesign>(
    `Projete um organoide ${organoidType} para ${purpose}.
Fonte celular: ${cellSource}
Use as melhores práticas da literatura atual (2020-2024).`,
    schema,
    { systemPrompt: SYSTEM_PROMPTS.ORGANOID_DESIGNER, temperature: 0.5 }
  )
}

/**
 * Gera protocolo completo
 */
export async function generateProtocol(
  title: string,
  type: string,
  context: string
): Promise<string> {
  const { text } = await generateContent(
    `Gere um protocolo laboratorial completo para:
Título: ${title}
Tipo: ${type}
Contexto: ${context}

Siga o formato padrão: objetivo, materiais, equipamentos, procedimento, controles, análise de resultados, referências.
Inclua concentrações exatas, temperaturas, tempos e pontos críticos de controle.`,
    { systemPrompt: SYSTEM_PROMPTS.PROTOCOL_GENERATOR, temperature: 0.4, maxTokens: 3000 }
  )
  return text
}

/**
 * Busca semântica na base de conhecimento
 */
export async function searchKnowledgeWithAI(
  query: string,
  articles: Array<{ title: string; abstract: string; doi: string }>
): Promise<{ relevantArticles: string[]; summary: string }> {
  const articlesStr = articles
    .map((a) => `- ${a.title} (${a.doi}): ${a.abstract?.substring(0, 200)}`)
    .join("\n")

  const schema = `{
  "relevantArticles": ["DOI 1", "DOI 2", "DOI 3"],
  "summary": "Resumo das descobertas relevantes para a busca"
}`

  return generateStructured<{ relevantArticles: string[]; summary: string }>(
    `O usuário perguntou: "${query}"

Artigos disponíveis:
${articlesStr}

Identifique os artigos mais relevantes e forneça um resumo das principais descobertas.`,
    schema,
    { temperature: 0.3 }
  )
}
