/**
 * R13.14.8 · Helper reutilizável para enriquecer conteúdo de aulas
 *
 * Centraliza:
 *   - upsertLessonBySlug: idempotente, cria OU atualiza aula com conteúdo denso
 *   - Padrão markdown esperado pelo RichLessonContent (R13.13):
 *       ## Contexto
 *       ## Conceitos-chave
 *       ## Distinções que geram confusão (atenção!)
 *       ## Desafios técnicos
 *       ## Erros comuns de pesquisadores iniciantes
 *       ## Artigos recomendados
 *       ## Congressos e sociedades científicas
 *       ## Próximos passos de estudo
 *
 * Como usar num script de enriquecimento:
 *   import { upsertLessonBySlug } from "./_enrich-helper"
 *   await upsertLessonBySlug({
 *     moduleSlug: "biomateriais",
 *     lessonSlug: "biomateriais-aula-completa",
 *     order: 1,
 *     title: "Biomateriais — aula completa",
 *     objective: "...",
 *     summary: `## Contexto\n...`,
 *     durationMin: 90,
 *     level: "basic",
 *     youtubeId: "UDhVk6_c-C8",  // mantém o existente ou passa um novo
 *   })
 */
import { prisma } from "../src/lib/db/prisma"

export interface EnrichLessonInput {
  moduleSlug: string
  lessonSlug: string         // slug final da aula (pode ser diferente do atual)
  order: number
  title: string
  objective: string
  summary: string            // markdown denso (6k-10k chars)
  durationMin: number        // minutos
  level: "basic" | "intermediate" | "advanced"
  youtubeId?: string         // se omitido, mantém o atual
  biaHook?: { tool: string; label: string; params?: Record<string, unknown> } | null
}

export async function upsertLessonBySlug(input: EnrichLessonInput) {
  const mod = await prisma.academyModule.findUnique({
    where: { slug: input.moduleSlug },
  })
  if (!mod) throw new Error(`Módulo não encontrado: ${input.moduleSlug}`)

  // Procura por aula existente nesse módulo com qualquer order ou slug
  // (pode haver 1 aula pré-criada vazia que vamos preencher)
  const existing = await prisma.academyLesson.findFirst({
    where: { moduleId: mod.id, order: input.order },
  })

  const baseData = {
    title:        input.title,
    slug:         input.lessonSlug,
    order:        input.order,
    objective:    input.objective,
    summary:      input.summary,
    durationMin:  input.durationMin,
    level:        input.level,
    isPublished:  true,
    ...(input.youtubeId ? { youtubeId: input.youtubeId } : {}),
    ...(input.biaHook !== undefined ? { biaHook: input.biaHook as object | null } : {}),
  }

  if (existing) {
    const updated = await prisma.academyLesson.update({
      where: { id: existing.id },
      data: baseData,
    })
    return { action: "updated" as const, lessonId: updated.id, summaryChars: input.summary.length }
  }

  // Cria do zero (quando o módulo não tinha nenhuma aula)
  const created = await prisma.academyLesson.create({
    data: {
      ...baseData,
      moduleId: mod.id,
      // Se não passou youtubeId e precisa criar, usa placeholder
      youtubeId: input.youtubeId ?? `PLACEHOLDER_M${mod.order.toString().padStart(2, "0")}_L${input.order.toString().padStart(2, "0")}`,
    },
  })
  return { action: "created" as const, lessonId: created.id, summaryChars: input.summary.length }
}
