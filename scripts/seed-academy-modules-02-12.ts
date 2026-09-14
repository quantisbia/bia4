/**
 * BIA · Academy · Seed dos módulos 2-12 (placeholders) — R13.10.1
 *
 * MOTIVAÇÃO
 * ─────────
 * Popular o banco com os 11 módulos restantes do programa (Módulo 1 já
 * foi seedado em R13.01) como DRAFTS (isPublished=false) para que:
 *  - A área /dashboard/admin/academy mostre os 12 módulos organizados
 *  - A landing /academy e /academy/journey mostrem "12 módulos" mesmo
 *    antes do conteúdo ser produzido (cards com badge "Em breve")
 *  - Janaina possa abrir cada módulo e ir adicionando aulas conforme
 *    o cronograma de gravação
 *
 * COMPORTAMENTO
 * ─────────────
 * - Idempotente: usa `upsert` por slug (não duplica em nova execução)
 * - Não-destrutivo: não apaga dados existentes
 * - Sem aulas (só o módulo/casca) — Janaina cria aulas via CRUD web
 * - Todos como isPublished=false por padrão (drafts)
 *
 * TÍTULOS + DESCRIPTIONS
 * ──────────────────────
 * Fonte oficial: src/app/academy/page.tsx array MODULES (verbatim R13)
 *
 * COMO EXECUTAR
 * ─────────────
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/seed-academy-modules-02-12.ts --dry-run   # preview
 *   npx tsx scripts/seed-academy-modules-02-12.ts             # executa
 */

import { prisma } from "../src/lib/db/prisma"

interface Args {
  dryRun: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes("--dry-run"),
  }
}

// Módulos 2-12 · verbatim da landing (src/app/academy/page.tsx)
// Módulo 1 (Introdução à Biofabricação) já foi seedado em R13.01
const MODULES = [
  {
    order: 2,
    slug: "biomateriais",
    title: "Biomateriais",
    description: "Polímeros naturais/sintéticos · Hidrogéis · Matriz extracelular (MEC) · Biocompatibilidade · Ensaios de degradação · Regulação FDA/ANVISA.",
  },
  {
    order: 3,
    slug: "biotintas",
    title: "Biotintas",
    description: "Formulação de biotintas para extrusão · Viscosidade · Reologia · Reticulação (química e física) · Printabilidade · Ensaios de estabilidade.",
  },
  {
    order: 4,
    slug: "bioimpressao-3d",
    title: "Bioimpressão 3D",
    description: "Extrusão · Pressão · Velocidade · Altura de camada · Bicos · Temperatura · Ambiente estéril · Parâmetros ideais para diferentes tecidos.",
  },
  {
    order: 5,
    slug: "arquitetura-3d",
    title: "Arquitetura 3D",
    description: "Scaffold · Porosidade · Infill · Modelagem STL · G-code · Geometria personalizada · TPMS (Gyroid, Schwarz P, Diamond) · Design de canais vasculares.",
  },
  {
    order: 6,
    slug: "celulas",
    title: "Células",
    description: "Tipos celulares (primárias, iPSC, MSC) · Densidade de encapsulamento · Viabilidade pós-impressão · Cultura celular · Meio de cultivo pós-bioimpressão.",
  },
  {
    order: 7,
    slug: "tecidos",
    title: "Tecidos",
    description: "Bioimpressão de pele · Osso · Cartilagem · Tecidos moles · Vasos sanguíneos · Modelos in vitro · Aplicações clínicas.",
  },
  {
    order: 8,
    slug: "esferoides-organoides",
    title: "Esferoides e Organoides",
    description: "Building blocks · Esferoides scaffold-free · Organoides intestinais/hepáticos/neurais/cardíacos · Modelos de doença · Microambientes 3D.",
  },
  {
    order: 9,
    slug: "avaliacao-pos-impressao",
    title: "Avaliação pós-impressão",
    description: "Viabilidade celular · Morfologia · Ensaios mecânicos · Histologia · Marcadores moleculares · Microscopia · Análise estatística de resultados.",
  },
  {
    order: 10,
    slug: "translacao",
    title: "Translação",
    description: "Escalabilidade de processo · Reprodutibilidade · Qualidade e boas práticas de fabricação (GMP) · Regulação FDA/ANVISA · Do laboratório ao clínico.",
  },
  {
    order: 11,
    slug: "desenvolvimento-projeto",
    title: "Desenvolvimento de Projeto",
    description: "Como estruturar seu projeto pessoal de biofabricação · Definição de problema clínico · Escolha de materiais e métodos · Design experimental · Cronograma.",
  },
  {
    order: 12,
    slug: "projeto-final",
    title: "Projeto Final",
    description: "Da ideia ao protocolo experimental completo · Documento de projeto exportável em PDF/DOCX · Entrega para certificação · Apresentação (opcional).",
  },
]

async function main() {
  const args = parseArgs()

  console.log("\n" + "═".repeat(64))
  console.log(" BIA · Academy · Seed dos módulos 2-12 (placeholders)")
  console.log("═".repeat(64))
  console.log(` Modo: ${args.dryRun ? "DRY-RUN (preview)" : "EXECUTAR"}`)
  console.log(` Total: ${MODULES.length} módulos a serem upsertados como drafts`)
  console.log("─".repeat(64) + "\n")

  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  }

  for (const mod of MODULES) {
    try {
      if (args.dryRun) {
        console.log(`[DRY] Módulo ${mod.order.toString().padStart(2, "0")} · ${mod.slug}`)
        console.log(`      Title: ${mod.title}`)
        console.log(`      Desc:  ${mod.description.substring(0, 80)}...`)
        console.log()
        result.skipped++
        continue
      }

      // Verifica se já existe
      const existing = await prisma.academyModule.findUnique({
        where: { slug: mod.slug },
        select: { id: true, isPublished: true },
      })

      if (existing) {
        // Atualiza SOMENTE campos textuais e ordem — preserva isPublished
        // (para não despublicar módulos que Janaina já ativou)
        await prisma.academyModule.update({
          where: { slug: mod.slug },
          data: {
            order: mod.order,
            title: mod.title,
            description: mod.description,
          },
        })
        console.log(`  ✓ M${mod.order.toString().padStart(2, "0")} · ${mod.slug} atualizado (isPublished=${existing.isPublished ? "true" : "false"} preservado)`)
        result.updated++
      } else {
        // Cria como draft (isPublished=false)
        await prisma.academyModule.create({
          data: {
            slug: mod.slug,
            order: mod.order,
            title: mod.title,
            description: mod.description,
            isPublished: false,
          },
        })
        console.log(`  + M${mod.order.toString().padStart(2, "0")} · ${mod.slug} criado (draft)`)
        result.created++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ M${mod.order.toString().padStart(2, "0")} · ${mod.slug} falhou: ${msg}`)
      result.errors.push(`M${mod.order}: ${msg}`)
    }
  }

  console.log("\n" + "─".repeat(64))
  console.log(" Resumo:")
  console.log(`   ✓ Criados:   ${result.created}`)
  console.log(`   ↻ Atualizados: ${result.updated}`)
  console.log(`   ⊘ Skipped:   ${result.skipped}`)
  console.log(`   ✗ Erros:     ${result.errors.length}`)
  if (result.errors.length > 0) {
    console.log("\n Erros detalhados:")
    result.errors.forEach(e => console.log(`   - ${e}`))
  }
  console.log("═".repeat(64) + "\n")

  await prisma.$disconnect()

  // Sai com código 1 se houve erro (para CI catar)
  if (result.errors.length > 0) process.exit(1)
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
