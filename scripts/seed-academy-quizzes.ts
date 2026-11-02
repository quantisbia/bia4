/**
 * BIA · Academy · Carrega os testes de aprendizagem (docs/academy/quiz-seed.json)
 *
 *   npx tsx --env-file=.env.local scripts/seed-academy-quizzes.ts [--dry] [--only=M03]
 *
 * Para cada módulo do JSON: encontra o módulo pelo slug, pega a 1ª aula
 * (order asc) e faz upsert do AcademyQuiz + substitui as questões.
 * Idempotente: rodar de novo apenas atualiza. Módulos inexistentes
 * (ex.: M00 antes de ser criado) são pulados com aviso.
 */
import { readFileSync } from "node:fs"
import { prisma } from "../src/lib/db/prisma"

type Q = { prompt: string; options: string[]; correctIndex: number; explanation: string }
type Seed = Record<string, { moduleSlug: string; passingScore: number; questions: Q[] }>

const DRY = process.argv.includes("--dry")
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7)

async function main() {
  const seed = JSON.parse(readFileSync("docs/academy/quiz-seed.json", "utf-8")) as Seed
  let loaded = 0
  for (const [code, s] of Object.entries(seed)) {
    if (ONLY && ONLY !== code) continue
    const mod = await prisma.academyModule.findUnique({ where: { slug: s.moduleSlug }, include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, slug: true } } } })
    if (!mod) { console.log(`⏭  ${code} · módulo "${s.moduleSlug}" não existe ainda — pulado`); continue }
    const lesson = mod.lessons[0]
    if (!lesson) { console.log(`⏭  ${code} · módulo sem aulas — pulado`); continue }
    for (const q of s.questions) {
      if (q.options.length !== 4 || q.correctIndex < 0 || q.correctIndex > 3) throw new Error(`${code}: questão inválida: ${q.prompt.slice(0, 60)}`)
    }
    console.log(`${DRY ? "(dry) " : ""}${code} → ${mod.title} / ${lesson.title} · ${s.questions.length} questões · nota mínima ${s.passingScore}%`)
    if (DRY) continue
    await prisma.$transaction(async (tx) => {
      const quiz = await tx.academyQuiz.upsert({
        where: { lessonId: lesson.id },
        create: { lessonId: lesson.id, passingScore: s.passingScore },
        update: { passingScore: s.passingScore },
      })
      await tx.academyQuizQuestion.deleteMany({ where: { quizId: quiz.id } })
      await tx.academyQuizQuestion.createMany({
        data: s.questions.map((q, i) => ({ quizId: quiz.id, order: i + 1, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation })),
      })
    })
    loaded += s.questions.length
  }
  console.log(`\n✓ ${loaded} questões carregadas`)
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
