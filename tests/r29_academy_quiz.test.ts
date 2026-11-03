/**
 * R29 · BIA Academy · Quiz — correção server-side (src/lib/academy/quiz.ts)
 * e integridade do seed de questões (docs/academy/quiz-seed.json).
 */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { gradeQuiz, parseOptions, toPublic, type QuizQuestionFull } from "@/lib/academy/quiz"

const Q: QuizQuestionFull[] = [
  { id: "a", order: 2, prompt: "p2", options: ["x", "y", "z", "w"], correctIndex: 1, explanation: "e2" },
  { id: "b", order: 1, prompt: "p1", options: ["x", "y", "z", "w"], correctIndex: 0, explanation: null },
  { id: "c", order: 3, prompt: "p3", options: ["x", "y", "z", "w"], correctIndex: 3, explanation: "e3" },
]

describe("gradeQuiz", () => {
  it("corrige, ordena por order e calcula nota/aprovação", () => {
    const g = gradeQuiz(Q, { a: 1, b: 0, c: 2 }, 70)
    expect(g.items.map((i) => i.order)).toEqual([1, 2, 3])
    expect(g.correct).toBe(2); expect(g.total).toBe(3); expect(g.score).toBe(67); expect(g.passed).toBe(false)
    expect(g.items[2]).toMatchObject({ id: "c", selected: 2, correctIndex: 3, correct: false, explanation: "e3" })
  })
  it("100% quando tudo certo; aprovação respeita passingScore", () => {
    const g = gradeQuiz(Q, { a: 1, b: 0, c: 3 }, 70)
    expect(g).toMatchObject({ score: 100, correct: 3, passed: true, passingScore: 70 })
    expect(gradeQuiz(Q, { a: 1, b: 0, c: 2 }, 60).passed).toBe(true) // 67 ≥ 60
  })
  it("em branco, null, fora do intervalo, não inteiro → errada com selected=null", () => {
    const g = gradeQuiz(Q, { a: null, c: 9, b: 0.5 }, 70)
    expect(g.items.every((i) => i.selected === null && !i.correct)).toBe(true)
    expect(g.score).toBe(0)
  })
  it("ignora respostas de ids desconhecidos; quiz vazio → 0 e reprovado", () => {
    expect(gradeQuiz(Q, { zzz: 1, a: 1, b: 0, c: 3 }, 70).score).toBe(100)
    expect(gradeQuiz([], {}, 70)).toMatchObject({ score: 0, total: 0, passed: false })
  })
})

describe("helpers", () => {
  it("toPublic remove gabarito", () => {
    const p = toPublic(Q[0]) as Record<string, unknown>
    expect(p).toEqual({ id: "a", order: 2, prompt: "p2", options: ["x", "y", "z", "w"] })
    expect("correctIndex" in p).toBe(false); expect("explanation" in p).toBe(false)
  })
  it("parseOptions normaliza Json", () => {
    expect(parseOptions(["a", 2, true])).toEqual(["a", "2", "true"])
    expect(parseOptions("nope")).toEqual([]); expect(parseOptions(null)).toEqual([])
  })
})

describe("quiz-seed.json", () => {
  type Seed = Record<string, { moduleSlug: string; passingScore: number; questions: Array<{ prompt: string; options: string[]; correctIndex: number; explanation: string }> }>
  const seed = JSON.parse(readFileSync("docs/academy/quiz-seed.json", "utf-8")) as Seed

  it("todas as questões têm 4 opções, gabarito válido e explicação", () => {
    for (const [code, s] of Object.entries(seed)) {
      expect(s.passingScore, code).toBeGreaterThanOrEqual(50)
      for (const q of s.questions) {
        expect(q.options, `${code}: ${q.prompt}`).toHaveLength(4)
        expect(new Set(q.options).size, `${code} opções repetidas: ${q.prompt}`).toBe(4)
        expect(q.correctIndex, code).toBeGreaterThanOrEqual(0); expect(q.correctIndex, code).toBeLessThan(4)
        expect(q.explanation.length, code).toBeGreaterThan(10)
      }
    }
  })
  it("M01 (Introdução à Biofabricação) tem 15 questões cobrindo as 5 partes + complemento, sem viés de gabarito", () => {
    const m = seed.M01
    expect(m.moduleSlug).toBe("introducao-biofabricacao"); expect(m.questions).toHaveLength(15)
    const all = m.questions.map((q) => q.prompt + q.options.join(" ")).join(" ").toLowerCase()
    for (const kw of ["groll", "bioassembly", "langer", "decm", "bmp-2", "extrusão", "dlp", "fresh", "apligraf", "organoides", "200 µm", "anvisa", "2024–2026"]) expect(all, kw).toContain(kw)
    const dist = m.questions.reduce<Record<number, number>>((acc, q) => ((acc[q.correctIndex] = (acc[q.correctIndex] ?? 0) + 1), acc), {})
    expect(Object.keys(dist).length, "gabarito usa ≥ 3 letras diferentes").toBeGreaterThanOrEqual(3)
    expect(Math.max(...Object.values(dist)), "nenhuma letra é resposta em mais de 70% das questões").toBeLessThanOrEqual(11)
  })
})
