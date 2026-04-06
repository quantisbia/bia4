/**
 * BIA v3 - Pipeline AI Service
 * Motor de análise das 12 etapas de design de tecidos
 */

import { generateContent, generateStructured, SYSTEM_PROMPTS } from "./gemini"

export interface PipelineStageAnalysis {
  stage: number
  stageName: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
  recommendation: string
  parameters: Record<string, string | number>
  warnings: string[]
  nextSteps: string[]
  creditsUsed: number
}

export interface TissueDesignInput {
  tissueType: string
  targetApplication: string
  cellSource?: string
  requirements?: string
  currentStage?: number
}

export const PIPELINE_STAGES = [
  { num: 1, name: "Definição do Tecido Alvo", key: "tissue_definition" },
  { num: 2, name: "Estratégia de Scaffolding", key: "scaffolding_strategy" },
  { num: 3, name: "Seleção de Biomateriais", key: "biomaterial_selection" },
  { num: 4, name: "Incorporação Celular", key: "cell_incorporation" },
  { num: 5, name: "Fatores de Crescimento", key: "growth_factors" },
  { num: 6, name: "Bioimpressão/Fabricação", key: "bioprinting" },
  { num: 7, name: "Cultura em Biorreator", key: "bioreactor_culture" },
  { num: 8, name: "Caracterização Mecânica", key: "mechanical_characterization" },
  { num: 9, name: "Análise Bioquímica", key: "biochemical_analysis" },
  { num: 10, name: "Testes de Viabilidade", key: "viability_testing" },
  { num: 11, name: "Validação Funcional", key: "functional_validation" },
  { num: 12, name: "Translação Clínica", key: "clinical_translation" },
] as const

/**
 * Analisa uma etapa específica do pipeline
 */
export async function analyzePipelineStage(
  input: TissueDesignInput,
  stageNum: number,
  previousOutputs?: Record<string, string>
): Promise<PipelineStageAnalysis> {
  const stage = PIPELINE_STAGES[stageNum - 1]
  if (!stage) throw new Error(`Etapa ${stageNum} inválida`)

  const contextStr = previousOutputs
    ? `\nContexto das etapas anteriores:\n${Object.entries(previousOutputs)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}`
    : ""

  const prompt = `Analise a Etapa ${stageNum}: "${stage.name}" para o seguinte projeto de engenharia de tecidos:

Tipo de Tecido: ${input.tissueType}
Aplicação Alvo: ${input.targetApplication}
Fonte Celular: ${input.cellSource ?? "Não especificado"}
Requisitos Adicionais: ${input.requirements ?? "Padrão"}
${contextStr}

Forneça uma análise detalhada e científica desta etapa específica, incluindo parâmetros quantitativos, protocolos recomendados e considerações críticas.`

  const schema = `{
  "recommendation": "string (análise detalhada da etapa, 2-4 parágrafos)",
  "parameters": {
    "key_param_1": "value",
    "key_param_2": "value"
  },
  "warnings": ["aviso 1", "aviso 2"],
  "nextSteps": ["próximo passo 1", "próximo passo 2", "próximo passo 3"]
}`

  const result = await generateStructured<{
    recommendation: string
    parameters: Record<string, string | number>
    warnings: string[]
    nextSteps: string[]
  }>(prompt, schema, {
    systemPrompt: SYSTEM_PROMPTS.PIPELINE_ASSISTANT,
    temperature: 0.5,
  })

  return {
    stage: stageNum,
    stageName: stage.name,
    status: "COMPLETED",
    recommendation: result.recommendation,
    parameters: result.parameters,
    warnings: result.warnings ?? [],
    nextSteps: result.nextSteps ?? [],
    creditsUsed: 5,
  }
}

/**
 * Gera um resumo executivo do projeto
 */
export async function generateProjectSummary(
  input: TissueDesignInput,
  completedStages: PipelineStageAnalysis[]
): Promise<string> {
  const stagesStr = completedStages
    .map((s) => `Etapa ${s.stage} (${s.stageName}): ${s.recommendation.substring(0, 200)}...`)
    .join("\n\n")

  const { text } = await generateContent(
    `Gere um resumo executivo científico para o projeto de engenharia de tecidos:
    
Tecido: ${input.tissueType}
Aplicação: ${input.targetApplication}

Etapas concluídas:
${stagesStr}

Inclua: resumo técnico, resultados esperados, cronograma estimado e potencial de impacto clínico.`,
    { systemPrompt: SYSTEM_PROMPTS.PIPELINE_ASSISTANT, temperature: 0.6 }
  )

  return text
}

/**
 * Sugere biomateriais para uma etapa específica
 */
export async function suggestBiomaterials(
  tissueType: string,
  stageContext: string
): Promise<{ name: string; reason: string; concentration: string }[]> {
  return generateStructured<{ name: string; reason: string; concentration: string }[]>(
    `Para engenharia de tecido ${tissueType} na etapa "${stageContext}", sugira os 5 melhores biomateriais do nosso banco de dados (inclui GelMA, Alginato, PLGA, Fibrina, dECM, HA, PCL, Seda, Matrigel, Colágeno I e centenas mais).`,
    `[{"name": "nome do biomaterial", "reason": "justificativa científica", "concentration": "concentração recomendada (ex: 5% w/v)"}]`,
    { systemPrompt: SYSTEM_PROMPTS.BIOMATERIAL_EXPERT, temperature: 0.4 }
  )
}
