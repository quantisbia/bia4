/**
 * BIA · Academy · R29 · Quiz — funções puras de correção
 *
 * O gabarito (correctIndex / explanation) NUNCA sai do servidor antes da
 * submissão. O aluno recebe só prompt + options; envia answers[]; o servidor
 * corrige, grava quizScore em AcademyProgress e devolve o detalhe por questão.
 */

export interface QuizQuestionPublic {
  id: string
  order: number
  prompt: string
  options: string[]
}

export interface QuizQuestionFull extends QuizQuestionPublic {
  correctIndex: number
  explanation: string | null
}

export interface QuizGradeItem {
  id: string
  order: number
  selected: number | null
  correctIndex: number
  correct: boolean
  explanation: string | null
}

export interface QuizGrade {
  score: number // 0–100, arredondado
  correct: number
  total: number
  passed: boolean
  passingScore: number
  items: QuizGradeItem[]
}

/** Remove gabarito para envio ao cliente. */
export function toPublic(q: QuizQuestionFull): QuizQuestionPublic {
  return { id: q.id, order: q.order, prompt: q.prompt, options: q.options }
}

/** Normaliza `options` vindo do Json do Prisma para string[]. */
export function parseOptions(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((o) => String(o)) : []
}

/**
 * Corrige um quiz. `answers` é um mapa questionId → índice escolhido (ou null/ausente = em branco).
 * Questões sem resposta contam como erradas. Índices fora do intervalo contam como erradas.
 */
export function gradeQuiz(
  questions: QuizQuestionFull[],
  answers: Record<string, number | null | undefined>,
  passingScore: number,
): QuizGrade {
  const items: QuizGradeItem[] = [...questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const raw = answers[q.id]
      const selected = typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < q.options.length ? raw : null
      return { id: q.id, order: q.order, selected, correctIndex: q.correctIndex, correct: selected === q.correctIndex, explanation: q.explanation }
    })
  const total = items.length
  const correct = items.filter((i) => i.correct).length
  const score = total === 0 ? 0 : Math.round((correct / total) * 100)
  return { score, correct, total, passed: total > 0 && score >= passingScore, passingScore, items }
}
