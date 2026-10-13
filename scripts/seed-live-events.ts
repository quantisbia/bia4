/**
 * R13.14.3 · Seed dos 3 encontros ao vivo iniciais da Academy
 *
 * Datas definidas pela Janaina (podem sofrer alterações, serão
 * atualizadas via painel admin próximo à data).
 *
 * Fuso: America/Sao_Paulo (UTC-3). Os valores Date abaixo são
 * explicitamente convertidos de "19:00 BRT" → UTC pelo construtor
 * (basta somar 3h: 19:00 BRT = 22:00 UTC).
 *
 * Idempotente: upsert por "order" (1, 2 e 3). Rodar quantas vezes
 * quiser — não cria duplicatas.
 *
 * Como rodar:
 *   DATABASE_URL=$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"') \
 *     npx tsx scripts/seed-live-events.ts
 */
import { prisma } from "../src/lib/db/prisma"

interface SeedEvent {
  order: number
  title: string
  description: string
  // ISO em UTC. 19:00 BRT (America/Sao_Paulo, UTC-3) = 22:00 UTC
  scheduledAtUtc: string
  durationMin: number
}

const EVENTS: SeedEvent[] = [
  {
    order: 1,
    title: "Encontro ao vivo #1 — Abertura: contexto, ferramentas e jornada",
    description:
      "Primeiro encontro online do programa. Panorama da biofabricação em 2026-2027, " +
      "demo guiada da plataforma BIA (Formulator Pro, Bioimpressão 3D, Organoid Builder), " +
      "e orientações para você construir seu Projeto de Biofabricação durante o curso. " +
      "Momento aberto para apresentar sua pesquisa e tirar dúvidas direto com a Dra. Kamila Leichtweis.",
    scheduledAtUtc: "2026-11-25T22:00:00.000Z", // 25/nov/2026 · 19:00 BRT
    durationMin: 90,
  },
  {
    order: 2,
    title: "Encontro ao vivo #2 — Meio do caminho: discussão de projetos",
    description:
      "Checkpoint do programa. Discussão aberta dos projetos em andamento — cada aluno " +
      "apresenta brevemente o seu projeto e recebe feedback técnico do time. " +
      "Demos de casos reais de laboratórios parceiros usando QMatrix e as biotintas Quantis.",
    scheduledAtUtc: "2026-12-15T22:00:00.000Z", // 15/dez/2026 · 19:00 BRT
    durationMin: 90,
  },
  {
    order: 3,
    title: "Encontro ao vivo #3 — Fechamento: apresentações finais & certificação",
    description:
      "Encontro de encerramento da turma. Apresentações finais dos Projetos de Biofabricação, " +
      "entrega formal dos certificados de conclusão e orientações sobre próximos passos " +
      "(publicação, continuidade do projeto, aplicação clínica). Momento de networking entre os alunos.",
    scheduledAtUtc: "2027-01-26T22:00:00.000Z", // 26/jan/2027 · 19:00 BRT
    durationMin: 90,
  },
]

async function main() {
  console.log("─────────────────────────────────────────────────────")
  console.log("R13.14.3 · Seed de 3 encontros ao vivo da Academy")
  console.log("─────────────────────────────────────────────────────")

  // Como AcademyLiveEvent não tem @unique em "order", precisamos
  // deletar-recriar (ou procurar pelo order primeiro). Vou usar upsert
  // manual: busca por order, update se existe, create se não.
  for (const ev of EVENTS) {
    const existing = await prisma.academyLiveEvent.findFirst({
      where: { order: ev.order },
    })

    const data = {
      title:       ev.title,
      description: ev.description,
      scheduledAt: new Date(ev.scheduledAtUtc),
      durationMin: ev.durationMin,
      order:       ev.order,
      isPublished: true,
      // meetingUrl e recordingUrl ficam null até o admin preencher
    }

    if (existing) {
      const updated = await prisma.academyLiveEvent.update({
        where: { id: existing.id },
        data,
      })
      console.log(
        `  ✓ ATUALIZADO #${ev.order} — ${new Date(ev.scheduledAtUtc).toISOString()} — ${ev.title.slice(0, 60)}`,
      )
    } else {
      const created = await prisma.academyLiveEvent.create({ data })
      console.log(
        `  ✓ CRIADO    #${ev.order} — ${new Date(ev.scheduledAtUtc).toISOString()} — ${ev.title.slice(0, 60)}`,
      )
    }
  }

  // Verifica no fim
  const total = await prisma.academyLiveEvent.count()
  console.log("─────────────────────────────────────────────────────")
  console.log(`Total de encontros no banco: ${total}`)

  // Lista o estado atual
  const all = await prisma.academyLiveEvent.findMany({
    orderBy: { order: "asc" },
  })
  for (const e of all) {
    const localTime = e.scheduledAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    console.log(`  #${e.order} · ${localTime} BRT · ${e.title}`)
    console.log(`       meetingUrl=${e.meetingUrl ?? "(a definir)"} · recordingUrl=${e.recordingUrl ?? "(após o evento)"}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
