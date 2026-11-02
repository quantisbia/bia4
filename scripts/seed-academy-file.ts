/**
 * BIA · Academy · R28 · Anexa (ou atualiza) um PDF em uma aula, como AcademyFile.
 *
 *   npx tsx --env-file=.env.local scripts/seed-academy-file.ts \
 *     --module=introducao-biofabricacao --lesson=o-que-e-biofabricacao \
 *     --file=docs/academy/pdf/complemento-M01-limitacoes-estado-da-arte.pdf \
 *     --title="Complemento · Limitações e desafios do estado da arte (revisões 2024–2026)" [--dry]
 *
 * · --lesson é opcional: sem ele usa a 1ª aula do módulo (order asc).
 * · Idempotente: se já existir arquivo com o mesmo fileName na aula, substitui bytes/título.
 * · Não envia notificação — faça pelo painel /dashboard/admin/academy/notifications.
 */
import { readFileSync, existsSync } from "node:fs"
import { basename } from "node:path"
import { prisma } from "../src/lib/db/prisma"

function arg(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`))
  return a ? a.slice(name.length + 3).replace(/^"|"$/g, "") : undefined
}
const DRY = process.argv.includes("--dry")
const moduleSlug = arg("module")
const lessonSlug = arg("lesson")
const filePath = arg("file")
const title = arg("title")

async function main() {
  if (!moduleSlug || !filePath || !title) throw new Error("uso: --module=<slug> [--lesson=<slug>] --file=<pdf> --title=<texto> [--dry]")
  if (!existsSync(filePath)) throw new Error(`arquivo não encontrado: ${filePath}`)
  const bytes = readFileSync(filePath)
  if (!bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) throw new Error("não é PDF")

  const mod = await prisma.academyModule.findUnique({
    where: { slug: moduleSlug },
    include: { lessons: { orderBy: { order: "asc" }, select: { id: true, slug: true, title: true } } },
  })
  if (!mod) throw new Error(`módulo não existe: ${moduleSlug}`)
  const lesson = lessonSlug ? mod.lessons.find((l) => l.slug === lessonSlug) : mod.lessons[0]
  if (!lesson) throw new Error(`aula não encontrada (${lessonSlug ?? "1ª do módulo"}); existentes: ${mod.lessons.map((l) => l.slug).join(", ")}`)

  const fileName = basename(filePath)
  console.log(`${DRY ? "(dry) " : ""}${mod.title} / ${lesson.title}\n  + ${title}\n  ${fileName} · ${(bytes.length / 1024).toFixed(0)} KB`)
  if (DRY) return

  const existing = await prisma.academyFile.findFirst({ where: { lessonId: lesson.id, fileName }, select: { id: true } })
  const data = { title, fileName, mimeType: "application/pdf", sizeBytes: bytes.length, data: bytes, ready: true, uploadedBy: "seed:r28" }
  const row = existing
    ? await prisma.academyFile.update({ where: { id: existing.id }, data, select: { id: true } })
    : await prisma.academyFile.create({ data: { lessonId: lesson.id, ...data }, select: { id: true } })
  console.log(`✓ ${existing ? "atualizado" : "criado"} · fileId=${row.id}`)
  console.log(`  aluno: /academy/modules/${mod.slug}/${lesson.slug}  ·  download: /api/academy/files/${row.id}?download=1`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
