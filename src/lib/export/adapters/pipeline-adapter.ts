/**
 * BIA · Adapter Pipeline → ExportableContent — R12.68
 *
 * Converte um projeto Pipeline + resultado da análise IA em ExportableContent
 * (pronto para PDF/DOCX/salvar no Notebook via ExportBar).
 *
 * Também cobre "Próximos Passos" — que na Pipeline é uma seção do card de
 * análise, não uma tela separada. 1 adapter = 2 features documentadas.
 */
import type { ExportableContent, ContentBlock } from "../types"

// ─── Tipos "espelho" das interfaces internas da /dashboard/pipeline/page.tsx
// (mantemos duplicados aqui porque page.tsx é Client Component e não exporta
//  seus tipos — se a página mudar os tipos, este arquivo TypeScript não
//  compila, o que é EXATAMENTE o mecanismo de segurança que queremos).

export interface PipelineProjectLike {
  id: string
  name: string
  tissueType: string
  targetApplication: string
  currentStage: number
  completionRate: number
  status: string
  createdAt: string
}

export interface StageAnalysisLike {
  stage: number
  stageName: string
  recommendation: string
  parameters: Record<string, string | number>
  warnings: string[]
  nextSteps: string[]
  creditsUsed: number
}

/**
 * Constrói um ExportableContent a partir do projeto Pipeline + análise atual.
 *
 * Regras:
 *  - Se `analysis` for null, exporta só o cabeçalho do projeto + status.
 *  - Se `analysis` existir, monta um documento completo: recomendação,
 *    parâmetros (keyvalue), warnings (callouts), próximos passos (lista
 *    numerada).
 *  - `existing` deve ser passado pelo caller para permitir edição/versão.
 */
export function buildContentFromPipeline(params: {
  project: PipelineProjectLike
  analysis: StageAnalysisLike | null
  existing?: { entryId: string; currentVersion: number }
}): ExportableContent {
  const { project, analysis, existing } = params

  const title = analysis
    ? `${project.name} · Etapa ${analysis.stage} · ${analysis.stageName}`
    : project.name

  const subtitle = analysis
    ? `Análise Pipeline · ${project.tissueType} · ${project.targetApplication}`
    : `Projeto Pipeline · ${project.tissueType} · ${project.targetApplication}`

  const tags = uniqTags([
    "pipeline",
    slug(project.tissueType),
    slug(project.targetApplication),
    ...(analysis ? [`etapa-${analysis.stage}`, slug(analysis.stageName)] : []),
  ])

  const blocks: ContentBlock[] = []

  // Contexto do projeto (sempre)
  blocks.push({ type: "heading", level: 2, text: "Contexto do projeto" })
  blocks.push({
    type: "keyvalue",
    pairs: [
      { key: "Projeto", value: project.name },
      { key: "Tecido-alvo", value: project.tissueType },
      { key: "Aplicação", value: project.targetApplication },
      { key: "Etapa atual", value: `${project.currentStage} de 10` },
      { key: "Progresso", value: `${project.completionRate}%` },
      { key: "Status", value: project.status },
    ],
  })

  // Análise IA (se existir)
  if (analysis) {
    blocks.push({ type: "divider" })
    blocks.push({
      type: "heading",
      level: 2,
      text: `Análise IA — Etapa ${analysis.stage}: ${analysis.stageName}`,
    })
    if (analysis.recommendation) {
      blocks.push({ type: "paragraph", text: analysis.recommendation })
    }

    // Parâmetros
    const paramEntries = Object.entries(analysis.parameters ?? {})
    if (paramEntries.length > 0) {
      blocks.push({
        type: "keyvalue",
        title: "Parâmetros recomendados",
        pairs: paramEntries.map(([k, v]) => ({ key: k, value: String(v) })),
      })
    }

    // Warnings (cada um vira um callout — Janaina pediu destaque visual)
    if (analysis.warnings.length > 0) {
      blocks.push({ type: "heading", level: 3, text: "Atenção" })
      for (const w of analysis.warnings) {
        blocks.push({
          type: "callout",
          variant: "warning",
          text: w,
        })
      }
    }

    // Próximos passos (verbatim Janaina — seção obrigatória)
    if (analysis.nextSteps.length > 0) {
      blocks.push({ type: "heading", level: 3, text: "Próximos passos" })
      blocks.push({
        type: "list",
        style: "numbered",
        items: analysis.nextSteps,
      })
    }

    // Créditos utilizados (rastreabilidade financeira)
    blocks.push({ type: "divider" })
    blocks.push({
      type: "paragraph",
      text: `Análise gerada consumindo ${analysis.creditsUsed} crédito(s) da BIA.`,
    })
  }

  return {
    title,
    subtitle,
    source: "Pipeline",
    entryType: "PIPELINE_SUMMARY",
    tags,
    category: "Pipeline",
    blocks,
    existing,
    metadata: {
      pipelineProjectId: project.id,
      stage: analysis?.stage ?? project.currentStage,
      stageName: analysis?.stageName,
      creditsUsed: analysis?.creditsUsed,
    },
    autoChangeSummary: analysis
      ? `Análise da etapa ${analysis.stage} (${analysis.stageName})`
      : undefined,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function slug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}

function uniqTags(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of list) {
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}
