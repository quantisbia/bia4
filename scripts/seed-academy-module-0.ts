/**
 * BIA · Academy · R28 · Seed do Módulo 0 — "Aulas introdutórias do curso prático"
 *
 *   npx tsx --env-file=.env.local scripts/seed-academy-module-0.ts [--dry] [--unpublished]
 *
 * O que faz (idempotente — rodar de novo apenas atualiza):
 *   1. upsert do AcademyModule slug `curso-pratico-intro` com order 0 (aparece antes do M01)
 *   2. upsert da aula 0.1 `antes-de-ligar-a-bioimpressora` — aula de LEITURA (youtubeId = null),
 *      summary = corpo do docs/academy/reforco-M00-curso-pratico.md (sem frontmatter)
 *   3. anexa 2 PDFs como AcademyFile (bytes no Postgres, ready = true):
 *        - scripts/BIA-Academy-Guia-do-Aluno-2026.pdf
 *        - docs/academy/pdf/reforco-M00-curso-pratico.pdf
 *      (substitui arquivo de mesmo fileName se já existir)
 *   4. lembra de rodar o quiz: npx tsx --env-file=.env.local scripts/seed-academy-quizzes.ts --only=M00
 *
 * NÃO envia notificação — isso é feito pelo admin em /dashboard/admin/academy/notifications.
 */
import { readFileSync, existsSync } from "node:fs"
import { prisma } from "../src/lib/db/prisma"

const DRY = process.argv.includes("--dry")
const PUBLISH = !process.argv.includes("--unpublished")

const MODULE = {
  slug: "curso-pratico-intro",
  order: 0,
  title: "Aulas introdutórias do curso prático",
  description:
    "Antes de ligar a bioimpressora: as 6 fases da BIA, zeragem (G92), E-steps do êmbolo, pré-carga e fluxo (M221). " +
    "Leitura obrigatória antes da primeira prática na bancada. Materiais em PDF + teste de aprendizagem.",
}

const LESSON = {
  slug: "antes-de-ligar-a-bioimpressora",
  order: 1,
  title: "Antes de ligar a bioimpressora",
  durationMin: 15,
  level: "basic",
  objective:
    "Chegar à bancada sabendo as 5 ideias que evitam 90 % dos problemas da primeira impressão: ordem das fases da BIA, " +
    "zeragem com G92, E-steps do extrusor de seringa, pré-carga da agulha e o papel do fluxo (M221). " +
    "Baixe o Guia do Aluno e o material de reforço em PDF, leia o checklist e faça o teste.",
  biaHook: {
    tool: "bioprint-execute",
    label: "Abrir Fase 4 · Calibrar E-steps",
    params: { path: "/dashboard/bioprint/execute", panel: "esteps" },
  },
}

const FILES: Array<{ title: string; path: string; fileName: string }> = [
  {
    title: "Guia do Aluno · BIA Academy 2026",
    path: "scripts/BIA-Academy-Guia-do-Aluno-2026.pdf",
    fileName: "BIA-Academy-Guia-do-Aluno-2026.pdf",
  },
  {
    title: "Reforço M0 · Antes de ligar a bioimpressora (checklist + teste)",
    path: "docs/academy/pdf/reforco-M00-curso-pratico.pdf",
    fileName: "reforco-M00-curso-pratico.pdf",
  },
]

function stripFrontmatter(md: string): string {
  const m = md.match(/^---\n[\s\S]*?\n---\n/)
  return (m ? md.slice(m[0].length) : md).trim()
}

async function main() {
  const summary = stripFrontmatter(readFileSync("docs/academy/reforco-M00-curso-pratico.md", "utf-8"))
  for (const f of FILES) if (!existsSync(f.path)) throw new Error(`PDF não encontrado: ${f.path}`)

  console.log(`${DRY ? "(dry) " : ""}Módulo ${MODULE.order} · ${MODULE.title} (${MODULE.slug}) · publicado=${PUBLISH}`)
  console.log(`${DRY ? "(dry) " : ""}  Aula ${MODULE.order}.${LESSON.order} · ${LESSON.title} · leitura ${LESSON.durationMin} min · summary ${summary.length} chars`)
  for (const f of FILES) console.log(`${DRY ? "(dry) " : ""}  PDF · ${f.title} · ${(readFileSync(f.path).length / 1024).toFixed(0)} KB`)
  if (DRY) return

  const mod = await prisma.academyModule.upsert({
    where: { slug: MODULE.slug },
    create: { ...MODULE, isPublished: PUBLISH },
    update: { order: MODULE.order, title: MODULE.title, description: MODULE.description, isPublished: PUBLISH },
  })

  const now = new Date()
  const lesson = await prisma.academyLesson.upsert({
    where: { moduleId_slug: { moduleId: mod.id, slug: LESSON.slug } },
    create: {
      moduleId: mod.id,
      slug: LESSON.slug,
      order: LESSON.order,
      title: LESSON.title,
      objective: LESSON.objective,
      summary,
      youtubeId: null,
      durationMin: LESSON.durationMin,
      level: LESSON.level,
      isPublished: PUBLISH,
      publishedAt: PUBLISH ? now : null,
      biaHook: LESSON.biaHook,
    },
    update: {
      order: LESSON.order,
      title: LESSON.title,
      objective: LESSON.objective,
      summary,
      youtubeId: null,
      durationMin: LESSON.durationMin,
      level: LESSON.level,
      isPublished: PUBLISH,
      biaHook: LESSON.biaHook,
    },
  })
  if (PUBLISH && !lesson.publishedAt) {
    await prisma.academyLesson.update({ where: { id: lesson.id }, data: { publishedAt: now } })
  }

  for (const f of FILES) {
    const bytes = readFileSync(f.path)
    if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) throw new Error(`${f.path} não é PDF`)
    const existing = await prisma.academyFile.findFirst({ where: { lessonId: lesson.id, fileName: f.fileName }, select: { id: true } })
    const data = { title: f.title, fileName: f.fileName, mimeType: "application/pdf", sizeBytes: bytes.length, data: bytes, ready: true, uploadedBy: "seed:r28" }
    if (existing) {
      await prisma.academyFile.update({ where: { id: existing.id }, data })
      console.log(`  ↻ PDF atualizado · ${f.fileName}`)
    } else {
      await prisma.academyFile.create({ data: { lessonId: lesson.id, ...data } })
      console.log(`  + PDF criado · ${f.fileName}`)
    }
  }

  console.log(`\n✓ Módulo 0 pronto · module=${mod.id} lesson=${lesson.id}`)
  console.log(`  URL aluno: /academy/modules/${MODULE.slug}/${LESSON.slug}`)
  console.log(`  URL admin: /dashboard/admin/academy/${MODULE.slug}/${LESSON.slug}`)
  console.log(`\nAgora rode o quiz:\n  npx tsx --env-file=.env.local scripts/seed-academy-quizzes.ts --only=M00`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
