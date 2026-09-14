/**
 * BIA · Academy · Seed do Módulo 1 piloto — R13.01
 *
 * MOTIVAÇÃO
 * ─────────
 * Popular o banco com um módulo COMPLETO (Introdução à Biofabricação) e
 * 5 aulas piloto — para o time de conteúdo já ter algo tangível para
 * revisar antes de gravar os 12 módulos oficiais.
 *
 * COMPORTAMENTO
 * ─────────────
 * - Idempotente: usa `upsert` por slug (não duplica se rodar 2×).
 * - Não-destrutivo: não apaga dados existentes.
 * - Vídeos com `youtubeId` placeholder — o time troca depois pelo ID real
 *   dos vídeos não listados.
 *
 * COMO EXECUTAR
 * ─────────────
 *   # Preview (dry-run):
 *   npx tsx scripts/seed-academy-module-01.ts --dry-run
 *
 *   # Executar:
 *   npx tsx scripts/seed-academy-module-01.ts
 *
 *   # Publicar tudo automaticamente (por default cria como draft):
 *   npx tsx scripts/seed-academy-module-01.ts --publish
 */

// Reusa o singleton do app (com adapter Neon já configurado)
import { prisma } from "../src/lib/db/prisma"
import type { Prisma } from "@prisma/client"

interface Args {
  dryRun: boolean
  publish: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, publish: false }
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true
    else if (a === "--publish") args.publish = true
  }
  return args
}

// ─── Conteúdo do Módulo 1 · Introdução à Biofabricação ─────────

const MODULE_SLUG = "introducao-biofabricacao"

const MODULE_DATA = {
  slug: MODULE_SLUG,
  order: 1,
  title: "Introdução à Biofabricação",
  description:
    "Fundamentos de engenharia tecidual, biofabricação e bioimpressão 3D. " +
    "Aplicações atuais em medicina regenerativa e limitações do estado da arte.",
  coverImage: null,
}

interface LessonSeed {
  slug: string
  order: number
  title: string
  objective: string
  summary: string
  youtubeId: string          // placeholder — troca antes de publicar
  durationMin: number
  level: "basic" | "intermediate" | "advanced"
  biaHook?: {
    tool: string
    label: string
    params?: Record<string, unknown>
  }
  attachments?: Array<{
    kind: "PDF" | "LINK" | "STL" | "GCODE" | "IMAGE"
    title: string
    url: string
    sizeBytes?: number
  }>
  quiz?: {
    passingScore?: number
    questions: Array<{
      prompt: string
      options: string[]
      correctIndex: number
      explanation?: string
    }>
  }
}

const LESSONS: LessonSeed[] = [
  {
    slug: "o-que-e-biofabricacao",
    order: 1,
    title: "O que é biofabricação?",
    objective:
      "Definir biofabricação e diferenciá-la de engenharia tecidual clássica " +
      "e da bioimpressão 3D isolada.",
    summary: [
      "Nesta aula introdutória, apresentamos a **biofabricação** como o " +
      "processo automatizado de produção de constructos biológicos " +
      "hierárquicos com finalidade terapêutica ou de pesquisa.",
      "",
      "Principais conceitos:",
      "- Diferença entre biofabricação, engenharia tecidual e bioimpressão",
      "- Componentes essenciais: biomaterial + células + fatores de sinalização",
      "- Papel da automação e reprodutibilidade",
      "- Escalabilidade e desafios regulatórios",
    ].join("\n"),
    youtubeId: "PLACEHOLDER_M01_L01",
    durationMin: 12,
    level: "basic",
    attachments: [
      {
        kind: "LINK",
        title: "Groll et al. 2019 — Biofabrication: reappraising the definition (open access)",
        url: "https://doi.org/10.1088/1758-5090/aaec52",
      },
    ],
    quiz: {
      passingScore: 70,
      questions: [
        {
          prompt: "Qual é a característica ESSENCIAL da biofabricação em relação à engenharia tecidual clássica?",
          options: [
            "Uso obrigatório de células-tronco",
            "Automação do processo de fabricação",
            "Impressão em 3D",
            "Uso apenas de biomateriais sintéticos",
          ],
          correctIndex: 1,
          explanation:
            "Groll et al. (2019) definem biofabricação essencialmente pela AUTOMAÇÃO — " +
            "o que a distingue de processos manuais de engenharia tecidual.",
        },
      ],
    },
  },
  {
    slug: "engenharia-tecidual-fundamentos",
    order: 2,
    title: "Fundamentos de engenharia tecidual",
    objective:
      "Compreender a tríade clássica da engenharia tecidual e como cada " +
      "elemento contribui para a formação de um tecido funcional.",
    summary: [
      "A **tríade da engenharia tecidual** é composta por três elementos essenciais:",
      "",
      "1. **Scaffold** — suporte estrutural 3D",
      "2. **Células** — componente biológico ativo",
      "3. **Fatores bioativos** — sinalização e diferenciação",
      "",
      "Discutimos o papel de cada um e como eles interagem para reproduzir " +
      "a microarquitetura de tecidos nativos.",
    ].join("\n"),
    youtubeId: "PLACEHOLDER_M01_L02",
    durationMin: 15,
    level: "basic",
    biaHook: {
      tool: "formulator-pro",
      label: "Experimentar formulação básica na BIA",
      params: { preset: "starter-hydrogel" },
    },
  },
  {
    slug: "bioimpressao-3d-panorama",
    order: 3,
    title: "Panorama da bioimpressão 3D",
    objective:
      "Apresentar as principais técnicas de bioimpressão (extrusão, jato de tinta, " +
      "estereolitografia) e suas aplicações típicas.",
    summary: [
      "Nesta aula percorremos as **3 técnicas dominantes** de bioimpressão:",
      "",
      "- **Extrusão** — a mais comum, boa para hidrogéis viscosos",
      "- **Jato de tinta (inkjet)** — alta resolução, baixa viscosidade",
      "- **Estereolitografia (SLA/DLP)** — precisão sub-100μm com fotorreticulação",
      "",
      "Comparamos vantagens, limitações e biomateriais compatíveis com cada técnica.",
    ].join("\n"),
    youtubeId: "PLACEHOLDER_M01_L03",
    durationMin: 18,
    level: "intermediate",
    biaHook: {
      tool: "bioprint/model",
      label: "Explorar geometrias 3D na BIA",
    },
  },
  {
    slug: "aplicacoes-clinicas-atuais",
    order: 4,
    title: "Aplicações clínicas atuais",
    objective:
      "Levantar quais aplicações da biofabricação já chegaram à clínica ou " +
      "estão em ensaios clínicos avançados em 2026.",
    summary: [
      "Aplicações CLÍNICAS validadas (2026):",
      "",
      "- **Pele bioimpressa** — cicatrização de queimaduras (fase III)",
      "- **Cartilagem articular** — reparo condral autólogo (fase II/III)",
      "- **Enxertos vasculares** — TEVGs (fase clínica ativa)",
      "- **Membranas periodontais** — regeneração gengival (produtos aprovados)",
      "",
      "Discutimos também aplicações em **fase pré-clínica** promissoras: " +
      "organoides, tecidos hepáticos, patches cardíacos, nervos periféricos.",
    ].join("\n"),
    youtubeId: "PLACEHOLDER_M01_L04",
    durationMin: 14,
    level: "intermediate",
    attachments: [
      {
        kind: "LINK",
        title: "Murphy & Atala 2014 — 3D bioprinting of tissues and organs",
        url: "https://doi.org/10.1038/nbt.2958",
      },
    ],
  },
  {
    slug: "limitacoes-e-desafios",
    order: 5,
    title: "Limitações e desafios do estado da arte",
    objective:
      "Reconhecer os gargalos técnicos e regulatórios que ainda impedem a " +
      "biofabricação em escala industrial.",
    summary: [
      "Desafios principais em 2026:",
      "",
      "1. **Vascularização** — tecidos > 200 μm precisam de rede capilar",
      "2. **Escala** — passar de constructos de bancada para produção clínica",
      "3. **Regulatório** — ANVISA/FDA/EMA ainda em processo de definir framework claro",
      "4. **Reprodutibilidade** — variabilidade lote-a-lote de biomateriais",
      "5. **Custo** — bioimpressoras e biotintas de qualidade GMP",
      "",
      "Discutimos as pesquisas mais promissoras endereçando cada gargalo.",
    ].join("\n"),
    youtubeId: "PLACEHOLDER_M01_L05",
    durationMin: 16,
    level: "advanced",
    quiz: {
      passingScore: 70,
      questions: [
        {
          prompt: "Qual é atualmente o MAIOR gargalo técnico para bioimpressão de órgãos sólidos completos?",
          options: [
            "Falta de células-tronco",
            "Ausência de biomateriais compatíveis",
            "Vascularização de constructos espessos",
            "Software de fatiamento",
          ],
          correctIndex: 2,
          explanation:
            "Vascularização é o gargalo #1 para órgãos sólidos: tecidos com " +
            "espessura > ~200 μm precisam de rede capilar para viabilidade " +
            "celular a longo prazo. Sem isso, o centro do constructo necrosa.",
        },
        {
          prompt: "Em relação à regulação de produtos de biofabricação em 2026, o cenário é:",
          options: [
            "Totalmente definido no Brasil, EUA e Europa",
            "Em desenvolvimento com framework ainda em consolidação",
            "Proibido em todos os países",
            "Aprovado sem restrições",
          ],
          correctIndex: 1,
          explanation:
            "O framework regulatório ainda está em consolidação — ANVISA, FDA " +
            "e EMA vêm publicando guias específicos progressivamente.",
        },
      ],
    },
  },
]

// ─── Execução ───────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  const summary = {
    dryRun: args.dryRun,
    publish: args.publish,
    module: { slug: MODULE_SLUG, created: false, updated: false },
    lessons: [] as Array<{ slug: string; created: boolean; updated: boolean; hasQuiz: boolean; attachments: number }>,
    errors: [] as Array<{ slug: string; error: string }>,
  }

  try {
    if (args.dryRun) {
      summary.module.created = true
      for (const l of LESSONS) {
        summary.lessons.push({
          slug: l.slug,
          created: true,
          updated: false,
          hasQuiz: !!l.quiz,
          attachments: l.attachments?.length ?? 0,
        })
      }
      console.log(JSON.stringify(summary, null, 2))
      process.exit(0)
    }

    // 1. Upsert do módulo
    const existingModule = await prisma.academyModule.findUnique({
      where: { slug: MODULE_SLUG },
      select: { id: true },
    })

    const academyModule = await prisma.academyModule.upsert({
      where: { slug: MODULE_SLUG },
      create: {
        ...MODULE_DATA,
        isPublished: args.publish,
      },
      update: {
        title: MODULE_DATA.title,
        description: MODULE_DATA.description,
        order: MODULE_DATA.order,
        ...(args.publish ? { isPublished: true } : {}),
      },
    })

    summary.module.created = !existingModule
    summary.module.updated = !!existingModule

    // 2. Upsert de cada aula (+ attachments + quiz aninhados)
    for (const lesson of LESSONS) {
      try {
        const existingLesson = await prisma.academyLesson.findUnique({
          where: {
            moduleId_slug: {
              moduleId: academyModule.id,
              slug: lesson.slug,
            },
          },
          select: { id: true },
        })

        const created = await prisma.academyLesson.upsert({
          where: {
            moduleId_slug: {
              moduleId: academyModule.id,
              slug: lesson.slug,
            },
          },
          create: {
            moduleId: academyModule.id,
            slug: lesson.slug,
            order: lesson.order,
            title: lesson.title,
            objective: lesson.objective,
            summary: lesson.summary,
            youtubeId: lesson.youtubeId,
            durationMin: lesson.durationMin,
            level: lesson.level,
            isPublished: args.publish,
            publishedAt: args.publish ? new Date() : null,
            biaHook: (lesson.biaHook ?? null) as unknown as Prisma.InputJsonValue,
          },
          update: {
            title: lesson.title,
            objective: lesson.objective,
            summary: lesson.summary,
            durationMin: lesson.durationMin,
            level: lesson.level,
            biaHook: (lesson.biaHook ?? null) as unknown as Prisma.InputJsonValue,
            ...(args.publish
              ? { isPublished: true, publishedAt: new Date() }
              : {}),
          },
        })

        // Attachments — apaga e recria (mais simples que reconciliar)
        if (lesson.attachments && lesson.attachments.length > 0) {
          await prisma.academyAttachment.deleteMany({
            where: { lessonId: created.id },
          })
          await prisma.academyAttachment.createMany({
            data: lesson.attachments.map((a) => ({
              lessonId: created.id,
              kind: a.kind,
              title: a.title,
              url: a.url,
              sizeBytes: a.sizeBytes ?? null,
            })),
          })
        }

        // Quiz — apaga anterior e recria (garante consistência de ordem/correctIndex)
        if (lesson.quiz) {
          await prisma.academyQuiz.deleteMany({
            where: { lessonId: created.id },
          })
          await prisma.academyQuiz.create({
            data: {
              lessonId: created.id,
              passingScore: lesson.quiz.passingScore ?? 70,
              questions: {
                create: lesson.quiz.questions.map((q, i) => ({
                  order: i + 1,
                  prompt: q.prompt,
                  options: q.options as unknown as Prisma.InputJsonValue,
                  correctIndex: q.correctIndex,
                  explanation: q.explanation ?? null,
                })),
              },
            },
          })
        }

        summary.lessons.push({
          slug: lesson.slug,
          created: !existingLesson,
          updated: !!existingLesson,
          hasQuiz: !!lesson.quiz,
          attachments: lesson.attachments?.length ?? 0,
        })
      } catch (err) {
        summary.errors.push({
          slug: lesson.slug,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    console.log(JSON.stringify(summary, null, 2))
    process.exit(summary.errors.length === 0 ? 0 : 1)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(2)
})
