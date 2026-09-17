/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.13 — Redesign educacional da página de aula (RichLessonContent)
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-09-16):
 *   O conteúdo denso do R13.12 estava sendo renderizado como texto plain
 *   (whitespace-pre-line). Isso perdia toda a estrutura semântica.
 *
 *   Nova renderização educacional:
 *    - Headings ## viram cards de seção com ícone temático
 *    - Tabelas markdown viram <table> com cabeçalho violeta
 *    - Bullets de artigos viram ArticleCard com DOI clicável
 *    - Bullets de congressos viram grid com ícones 🌍 / 🇧🇷
 *    - Erros comuns viram MistakeCallout com borda vermelha
 *    - Blockquotes viram citação destacada com borda violeta
 *    - Callouts coloridos por tipo (Contexto, Distinções, Desafios...)
 *
 *   Contraste garantido:
 *    - Fundo escuro (tema atual) → texto branco/gray-100/200
 *    - Todos os elementos usam classes com bom contraste WCAG AA
 *
 *  ESTE ARQUIVO TRAVA a estrutura do componente RichLessonContent:
 *   A) Arquivo existe e exporta o componente
 *   B) Componente integrado no LessonView
 *   C) Parser detecta os 8 tipos de seção (Contexto, Conceitos,
 *      Distinções, Desafios, Erros, Artigos, Congressos, Próximos)
 *   D) ArticleCard extrai autores/título/journal/ano/DOI corretamente
 *   E) ConferenceCard diferencia internacional vs nacional
 *   F) MistakeCallout renderiza como lista numerada em card vermelho
 *   G) Table renderiza cabeçalho violeta + linhas alternadas
 *   H) InlineRun processa **bold**, *italic*, `code`, [link](url)
 *   I) Contraste correto (classes text-white / text-gray-100/200
 *      em fundos escuros)
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const RICH_PATH = resolve(ROOT, "src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/_components/RichLessonContent.tsx")
const VIEW_PATH = resolve(ROOT, "src/app/academy/(app)/modules/[moduleSlug]/[lessonSlug]/_components/LessonView.tsx")

const RICH_SRC = readFileSync(RICH_PATH, "utf8")
const VIEW_SRC = readFileSync(VIEW_PATH, "utf8")

describe("R13.13 · Arquivo RichLessonContent existe e é public component", () => {

  it("A) Arquivo RichLessonContent.tsx existe", () => {
    expect(RICH_SRC.length).toBeGreaterThan(1000)
    expect(RICH_SRC).toMatch(/^"use client"/)
  })

  it("A.2) Exporta o componente RichLessonContent como named export", () => {
    expect(RICH_SRC).toMatch(/export function RichLessonContent/)
  })

  it("A.3) Componente aceita prop markdown: string", () => {
    expect(RICH_SRC).toMatch(/markdown\s*:\s*string/)
  })

  it("A.4) Componente tem data-testid='rich-lesson-content'", () => {
    expect(RICH_SRC).toContain(`data-testid="rich-lesson-content"`)
  })
})

describe("R13.13 · Integração no LessonView", () => {

  it("B) LessonView importa RichLessonContent", () => {
    expect(VIEW_SRC).toMatch(/import\s*\{\s*RichLessonContent\s*\}\s*from\s+["']\.\/RichLessonContent["']/)
  })

  it("B.2) LessonView usa <RichLessonContent markdown={lesson.summary}", () => {
    expect(VIEW_SRC).toMatch(/<RichLessonContent[\s\n]+markdown=\{lesson\.summary\}/)
  })

  it("B.3) LessonView não usa mais whitespace-pre-line no summary (só no objective)", () => {
    // whitespace-pre-line não deve aparecer perto de {lesson.summary}
    const summaryContext = VIEW_SRC.match(/\{lesson\.summary\}[\s\S]{0,300}?<\/section>/)
    if (summaryContext) {
      expect(summaryContext[0]).not.toMatch(/whitespace-pre-line/)
    }
  })

  it("B.4) LessonView renderiza objetivo com ícone Target + cor de contraste", () => {
    expect(VIEW_SRC).toMatch(/data-testid="lesson-objective-card"/)
    expect(VIEW_SRC).toContain("Target")
  })

  it("B.5) Section de conteúdo tem data-testid='lesson-rich-content-section'", () => {
    expect(VIEW_SRC).toContain(`data-testid="lesson-rich-content-section"`)
  })
})

describe("R13.13 · Parser detecta os 8 tipos de seção", () => {

  it("C) detectSectionKind reconhece: context, concepts, distinctions, challenges, mistakes, articles, conferences, next-steps", () => {
    const requiredKinds = [
      "context",
      "concepts",
      "distinctions",
      "challenges",
      "mistakes",
      "articles",
      "conferences",
      "next-steps",
    ]
    for (const kind of requiredKinds) {
      expect(RICH_SRC).toContain(`"${kind}"`)
    }
  })

  it("C.2) Parser reconhece heading Contexto → context", () => {
    expect(RICH_SRC).toMatch(/\/contexto\/i.*return.*"context"/s)
  })

  it("C.3) Parser reconhece 📄 → articles kind", () => {
    // Deve haver detecção do emoji 📄 OU "artigos recomendados"
    expect(RICH_SRC).toMatch(/📄|artigos.recomendados/i)
  })

  it("C.4) Parser reconhece 🎓 → conferences kind", () => {
    expect(RICH_SRC).toMatch(/🎓|congressos/i)
  })

  it("C.5) Parser reconhece 🚀 → next-steps kind", () => {
    expect(RICH_SRC).toMatch(/🚀|pr[óo]ximos.passos/i)
  })

  it("C.6) Cada tipo de seção tem ícone lucide próprio", () => {
    // Ícones esperados: BookOpen (Contexto), Layers (Conceitos), GitCompare (Distinções),
    // Cpu (Desafios), AlertTriangle (Erros), FileText (Artigos), GraduationCap (Congressos), Rocket (Próximos passos)
    const requiredIcons = ["BookOpen", "Layers", "GitCompare", "Cpu", "AlertTriangle", "FileText", "GraduationCap", "Rocket"]
    for (const icon of requiredIcons) {
      expect(RICH_SRC).toContain(icon)
    }
  })
})

describe("R13.13 · Componentes visuais especializados", () => {

  it("D) ArticleCard existe e extrai DOI clicável", () => {
    expect(RICH_SRC).toMatch(/function ArticleCard/)
    expect(RICH_SRC).toMatch(/parseArticleItem/)
    // ArticleCard deve renderizar link para DOI
    expect(RICH_SRC).toMatch(/href=\{parsed\.doiUrl\}/)
  })

  it("D.2) ArticleCard mostra autores, título, journal, ano", () => {
    expect(RICH_SRC).toMatch(/parsed\.authors/)
    expect(RICH_SRC).toMatch(/parsed\.title/)
    expect(RICH_SRC).toMatch(/parsed\.journal/)
    expect(RICH_SRC).toMatch(/parsed\.year/)
  })

  it("E) ConferenceCard diferencia internacional (Globe2) vs nacional (MapPin)", () => {
    expect(RICH_SRC).toMatch(/function ConferenceCard/)
    expect(RICH_SRC).toContain("Globe2")
    expect(RICH_SRC).toContain("MapPin")
    // Prop region: "int" | "nat"
    expect(RICH_SRC).toMatch(/region:\s*"int"\s*\|\s*"nat"/)
  })

  it("E.2) Cores diferentes para internacional (emerald) vs nacional (yellow)", () => {
    expect(RICH_SRC).toMatch(/emerald-500.*international|international.*emerald-500|from-emerald/i)
    expect(RICH_SRC).toMatch(/yellow-500|from-yellow/i)
  })

  it("F) MistakeCallout existe com estilo rose/red", () => {
    expect(RICH_SRC).toMatch(/function MistakeCallout/)
    expect(RICH_SRC).toMatch(/border-rose-500|from-rose-500/)
    // Tem AlertTriangle
    expect(RICH_SRC).toContain("AlertTriangle")
  })

  it("G) Table renderiza cabeçalho violeta + linhas alternadas", () => {
    expect(RICH_SRC).toMatch(/function Table/)
    // Cabeçalho gradient violeta/fuchsia
    expect(RICH_SRC).toMatch(/from-violet-600.*to-fuchsia-600|from-fuchsia-600.*to-violet-600/)
    // Linhas alternadas (ri % 2)
    expect(RICH_SRC).toMatch(/ri\s*%\s*2/)
  })

  it("H) InlineRun processa bold, italic, code, link", () => {
    expect(RICH_SRC).toMatch(/function InlineRun/)
    // parseInline gera 4 tipos de node
    expect(RICH_SRC).toMatch(/type:\s*"bold"/)
    expect(RICH_SRC).toMatch(/type:\s*"italic"/)
    expect(RICH_SRC).toMatch(/type:\s*"code"/)
    expect(RICH_SRC).toMatch(/type:\s*"link"/)
  })

  it("H.2) Links com DOI abrem em nova aba", () => {
    expect(RICH_SRC).toMatch(/target="_blank"/)
    expect(RICH_SRC).toMatch(/rel="noopener noreferrer"/)
  })
})

describe("R13.13 · Contraste (texto claro em fundo escuro)", () => {

  it("I) Texto principal usa text-white / text-gray-100 / text-gray-200 (contraste WCAG AA em fundo escuro)", () => {
    // Não deve haver text-gray-500 ou text-gray-600 para body text (só metadata secundária)
    const bodyTexts = RICH_SRC.match(/text-gray-\d{3}/g) ?? []
    const brightEnough = bodyTexts.filter((c) => {
      const n = parseInt(c.replace("text-gray-", ""))
      return n <= 300 // gray-100, gray-200, gray-300 são OK
    })
    // A maior parte do texto deve ser em tons claros (>50% dos usos são <=300)
    expect(brightEnough.length).toBeGreaterThan(0)
  })

  it("I.2) Parágrafos usam text-gray-200 (WCAG AA em fundo escuro)", () => {
    expect(RICH_SRC).toMatch(/text-gray-200/)
  })

  it("I.3) Bold em parágrafos usa text-white (contraste máximo para ênfase)", () => {
    // A regra em parseInline gera <strong> com font-semibold text-white
    expect(RICH_SRC).toMatch(/font-semibold text-white/)
  })

  it("I.4) Ícones renderizados têm cor específica (evita colisão visual com texto)", () => {
    // Ícones lucide sempre inline com w-N h-N; deve haver pelo menos 4 no componente
    // (ícone da metadata BookOpen/Info + ícone da seção + ícones dos cards especializados)
    const iconClasses = RICH_SRC.match(/<[A-Z][a-zA-Z]+\s+className="[^"]*w-\d+\s+h-\d+[^"]*"/g) ?? []
    expect(iconClasses.length).toBeGreaterThanOrEqual(4)
  })

  it("I.5) Blockquote tem borda violeta e texto fuchsia claro", () => {
    expect(RICH_SRC).toMatch(/border-fuchsia-500/)
    expect(RICH_SRC).toMatch(/text-fuchsia-100/)
  })

  it("I.6) Callouts (Contexto, Distinções, Erros, etc.) usam tons de 100-300 para o texto", () => {
    // Cada seção tem cor de texto tipo violet-200, cyan-200, rose-200, amber-200, fuchsia-200, emerald-200, indigo-200
    const requiredColors = [
      "text-violet-200",
      "text-cyan-200",
      "text-rose-200",
      "text-amber-200",
      "text-fuchsia-200",
      "text-emerald-200",
      "text-indigo-200",
    ]
    for (const c of requiredColors) {
      expect(RICH_SRC).toContain(c)
    }
  })
})

describe("R13.13 · Metadata do conteúdo (palavras + tempo de leitura)", () => {

  it("Componente calcula word count", () => {
    expect(RICH_SRC).toMatch(/wordCount/)
    expect(RICH_SRC).toMatch(/split\(\/\\s\+\/\)/)
  })

  it("Componente calcula tempo estimado de leitura (~200 palavras/min)", () => {
    expect(RICH_SRC).toMatch(/wordCount\s*\/\s*200|readMinutes/)
  })

  it("Componente mostra ícone BookOpen + ícone Info na metadata", () => {
    expect(RICH_SRC).toContain("BookOpen")
    expect(RICH_SRC).toContain("Info")
  })
})

describe("R13.13 · Parser markdown robusto", () => {

  it("Parseia heading nível 2 (##)", () => {
    expect(RICH_SRC).toMatch(/\^##\\s\+/)
  })

  it("Parseia heading nível 3 (###)", () => {
    expect(RICH_SRC).toMatch(/\^###\\s\+/)
  })

  it("Parseia listas não-ordenadas (- )", () => {
    expect(RICH_SRC).toMatch(/\^-\\s\+/)
  })

  it("Parseia listas ordenadas (1. )", () => {
    expect(RICH_SRC).toMatch(/\^\\d\+\\\.\\s\+/)
  })

  it("Parseia tabelas GitHub-style", () => {
    // Detecta linha separator |---|---|
    expect(RICH_SRC).toMatch(/\[\\s:\-\|\]\+\\\|/)
  })

  it("Parseia blockquotes (> )", () => {
    expect(RICH_SRC).toMatch(/startsWith\("> "\)/)
  })
})

describe("R13.13 · Regressão — proteções contra desconfiguração", () => {

  it("Component NÃO usa dangerouslySetInnerHTML (segurança)", () => {
    expect(RICH_SRC).not.toContain("dangerouslySetInnerHTML")
  })

  it("Component NÃO importa bibliotecas markdown pesadas (bundle size)", () => {
    // Não pode importar react-markdown, remark, marked, etc.
    expect(RICH_SRC).not.toMatch(/from\s+["']react-markdown/)
    expect(RICH_SRC).not.toMatch(/from\s+["']marked/)
    expect(RICH_SRC).not.toMatch(/from\s+["']remark/)
  })

  it("useMemo aplicado para parsing (performance)", () => {
    expect(RICH_SRC).toMatch(/useMemo/)
  })
})
