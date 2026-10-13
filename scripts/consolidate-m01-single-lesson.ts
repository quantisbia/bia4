/**
 * R13.14.4 · Consolidar Módulo 01 em UMA aula única (decisão Janaina)
 *
 * Decisão (Janaina, 2026-10-11):
 *   O Módulo 1 "Introdução à Biofabricação" vai ser uma aula corrida
 *   única (não quebrada em 5 partes). Mantemos todo o conteúdo denso
 *   dos 5 roteiros, fundido num summary só.
 *
 * O que o script faz:
 *   1. Lê as 5 aulas atuais do Módulo 1 em ordem (order ASC)
 *   2. CONSOLIDA na aula #1 (slug "introducao-biofabricacao"):
 *      - título: "Introdução à Biofabricação — aula completa"
 *      - objective: 1 objetivo agregando os 5 originais
 *      - summary: markdown unificado com os 5 roteiros como SEÇÕES
 *      - durationMin: soma das 5 (= 75 min hoje)
 *      - level: basic (manter o original)
 *      - youtubeId: mantém o atual (admin edita quando subir o vídeo)
 *      - biaHook: usa o da aula #1 (formulator-pro starter-hydrogel)
 *      - mantém os 2 anexos existentes (reatribuindo da aula 4 → aula 1)
 *   3. DELETA as aulas 2, 3, 4 e 5 (cascade limpa progress/quiz/cert)
 *
 * Idempotente: se rodar duas vezes, da segunda em diante só confirma
 * que já há 1 aula (sem erro).
 *
 * Backup antes de deletar: imprime um JSON dump das 5 aulas no stdout
 * para você guardar caso queira reverter.
 *
 * Como rodar:
 *   DATABASE_URL=$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"') \
 *     npx tsx scripts/consolidate-m01-single-lesson.ts
 */
import { prisma } from "../src/lib/db/prisma"
import { writeFileSync } from "node:fs"
import { join } from "node:path"

const MODULE_SLUG = "introducao-biofabricacao"

const SECTION_HEADERS: Record<number, string> = {
  1: "## Parte 1 · O que é biofabricação?",
  2: "## Parte 2 · Fundamentos de engenharia tecidual",
  3: "## Parte 3 · Panorama da bioimpressão 3D",
  4: "## Parte 4 · Aplicações clínicas atuais",
  5: "## Parte 5 · Limitações e desafios do estado da arte",
}

async function main() {
  console.log("─────────────────────────────────────────────────────")
  console.log("R13.14.4 · Consolidando Módulo 01 em aula única")
  console.log("─────────────────────────────────────────────────────\n")

  const mod = await prisma.academyModule.findUnique({
    where: { slug: MODULE_SLUG },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: {
          attachments: true,
          _count: { select: { attachments: true, progress: true, certificates: true } },
        },
      },
    },
  })

  if (!mod) {
    console.error(`❌ Módulo "${MODULE_SLUG}" não encontrado`)
    process.exit(1)
  }

  // Idempotência: se já tem só 1 aula, não faz nada
  if (mod.lessons.length === 1) {
    const l = mod.lessons[0]
    console.log(`ℹ️  Módulo já tem só 1 aula (${l.title}, ${l.durationMin}min).`)
    console.log(`    Nada a fazer. Script é idempotente — ok rodar de novo.`)
    await prisma.$disconnect()
    return
  }

  if (mod.lessons.length < 2) {
    console.error(`❌ Módulo não tem aulas suficientes (${mod.lessons.length})`)
    process.exit(1)
  }

  console.log(`📚 Encontradas ${mod.lessons.length} aulas no Módulo 1:\n`)
  for (const l of mod.lessons) {
    console.log(`   ${l.order}. "${l.title}" — ${l.durationMin}min, ${l._count.attachments} anexos, ${l._count.progress} progress, ${l._count.certificates} certs`)
  }

  // ─── BACKUP ───
  const backupPath = join(process.cwd(), `backups/m01-5-aulas-before-consolidation-${new Date().toISOString().slice(0, 10)}.json`)
  try {
    writeFileSync(backupPath, JSON.stringify(mod.lessons, null, 2))
    console.log(`\n💾 Backup salvo em: ${backupPath}`)
  } catch (e) {
    console.log(`\n⚠️  Não conseguiu salvar backup em disco (ok em prod). Dump no stdout:`)
    console.log(JSON.stringify(mod.lessons, null, 2))
  }

  // ─── CONSOLIDAÇÃO ───
  const first = mod.lessons[0]
  const totalMin = mod.lessons.reduce((s, l) => s + l.durationMin, 0)

  // Objective: 1 frase agregadora + lista de bullets com cada objetivo original
  const consolidatedObjective = [
    "Dominar os fundamentos da biofabricação em uma visão panorâmica: do nascimento histórico do campo até os gargalos atuais, passando pelas 4 técnicas de bioimpressão 3D e pelas aplicações clínicas já aprovadas.",
    "",
    "Ao final desta aula você será capaz de:",
    ...mod.lessons.map((l, i) =>
      `${i + 1}. ${(l.objective ?? "").trim() || "(sem objetivo específico)"}`,
    ),
  ].join("\n")

  // Summary: concat dos 5 summaries em seções
  const consolidatedSummary = [
    "> **Aula corrida completa — Introdução à Biofabricação**",
    "> ",
    `> Duração total: aproximadamente **${Math.round(totalMin / 60 * 10) / 10} horas**. ` +
      `Esta aula consolida 5 blocos de conteúdo (histórico, fundamentos, técnicas, aplicações e limitações) ` +
      `em um único vídeo corrido, exatamente como você estudaria numa aula presencial de pós-graduação.`,
    "",
    "---",
    "",
    ...mod.lessons.flatMap((l) => [
      SECTION_HEADERS[l.order] ?? `## Parte ${l.order} · ${l.title}`,
      "",
      (l.summary ?? "").trim() || "_(sem conteúdo adicional)_",
      "",
      "---",
      "",
    ]),
  ].join("\n")

  console.log(`\n✍️  Novo conteúdo consolidado:`)
  console.log(`   objective: ${consolidatedObjective.length} chars`)
  console.log(`   summary:   ${consolidatedSummary.length} chars`)
  console.log(`   duration:  ${totalMin} min`)

  // ─── TRANSAÇÃO ───
  // Atualiza aula #1 e deleta as outras numa transação
  await prisma.$transaction(async (tx) => {
    // 1. Atualizar aula #1 (fica como aula ÚNICA)
    await tx.academyLesson.update({
      where: { id: first.id },
      data: {
        title:        "Introdução à Biofabricação — aula completa",
        objective:    consolidatedObjective,
        summary:      consolidatedSummary,
        durationMin:  totalMin,
        order:        1,
        // Mantém youtubeId e biaHook já existentes
      },
    })
    console.log(`\n✓ Aula #1 atualizada com conteúdo consolidado`)

    // 2. Reatribuir anexos das aulas 2..5 para a aula 1 (antes de deletar)
    for (let i = 1; i < mod.lessons.length; i++) {
      const l = mod.lessons[i]
      if (l.attachments.length === 0) continue
      await tx.academyAttachment.updateMany({
        where: { lessonId: l.id },
        data:  { lessonId: first.id },
      })
      console.log(`  ↳ ${l.attachments.length} anexo(s) da aula #${l.order} movido(s) para a aula #1`)
    }

    // 3. Deletar aulas 2..5 (cascade limpa progress, quiz, certificates)
    const idsToDelete = mod.lessons.slice(1).map((l) => l.id)
    const deleted = await tx.academyLesson.deleteMany({
      where: { id: { in: idsToDelete } },
    })
    console.log(`✓ ${deleted.count} aula(s) deletada(s) (cascade: progress + quiz + certificates)`)
  })

  // ─── VALIDAÇÃO ───
  const after = await prisma.academyModule.findUnique({
    where: { slug: MODULE_SLUG },
    include: {
      lessons: { include: { _count: { select: { attachments: true } } } },
    },
  })
  console.log(`\n─────────────────────────────────────────────────────`)
  console.log(`✅ Finalizado. Estado atual do Módulo 1:`)
  console.log(`   título: ${after!.title}`)
  console.log(`   aulas: ${after!.lessons.length}`)
  for (const l of after!.lessons) {
    console.log(`     - "${l.title}" (${l.durationMin}min, ${l._count.attachments} anexo(s), slug=${l.slug})`)
  }
  console.log(`─────────────────────────────────────────────────────`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
