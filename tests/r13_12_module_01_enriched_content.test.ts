/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.12 — Conteúdo denso didático do Módulo 1 (Introdução à Biofabricação)
 *  ─────────────────────────────────────────────────────────────────────
 *  DECISÃO (Janaina, 2026-09-16):
 *   Substituir o "resumo curto" das 5 aulas do Módulo 1 por conteúdo
 *   denso (~800-1000 palavras cada) que sirva de ROTEIRO para gravação
 *   dos vídeos. Este é o "template dourado" — depois replicamos nos
 *   módulos 2-12.
 *
 *  ESTE ARQUIVO TRAVA o CÓDIGO-FONTE do script enrich-module-01-content.ts:
 *   A) Todas 5 aulas têm summary > 4000 caracteres
 *   B) Cada aula cita pelo menos 3 DOIs reais (formato 10.xxxx/yyy)
 *   C) Cada aula lista congressos internacionais (TERMIS OU
 *      Biofabrication Conference OU ISBF) — solicitação explícita da Janaina
 *   D) Cada aula tem seção "Erros comuns" ou "Distinções que geram confusão"
 *   E) Cada aula tem seção "Congressos e sociedades científicas"
 *   F) Cada aula tem seção "Artigos recomendados"
 *   G) Aula 1.1 tem a distinção obrigatória tinta vs biotinta
 *   H) Script suporta --dry-run e --revert
 *
 *  Não testa o banco Neon (isso é infra); testa que o SEED CODE está correto
 *  e vai sempre gerar conteúdo com essas características. Assim garantimos
 *  que qualquer PR futuro que reduzir a qualidade quebra o CI.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = resolve(__dirname, "..")
const SCRIPT_PATH = resolve(ROOT, "scripts/enrich-module-01-content.ts")
const SRC = readFileSync(SCRIPT_PATH, "utf8")

/** Extrai o array `LESSONS` do script como texto para inspeção. */
function extractLessonsBlock(): string {
  const start = SRC.indexOf("const LESSONS:")
  const end = SRC.indexOf("async function main")
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return SRC.slice(start, end)
}

/** Extrai o summary de cada aula (usa a chave summary: `...`). */
function extractAllSummaries(): string[] {
  const block = extractLessonsBlock()
  // Cada summary começa com `summary: \`` e termina com \`, (backtick vírgula).
  // Como usamos template literals multilinha, temos que ser cuidadosos.
  const summaries: string[] = []
  const parts = block.split(/\n    summary:\s+`/)
  // Primeiro elemento é antes do primeiro summary — descartar
  parts.shift()
  for (const p of parts) {
    // Achar o fechamento do template literal (`,)
    // Usar um marcador único: `,\n    fallbackShortSummary
    const endIdx = p.indexOf("`,\n    fallbackShortSummary")
    if (endIdx > -1) summaries.push(p.slice(0, endIdx))
  }
  return summaries
}

const SUMMARIES = extractAllSummaries()

describe("R13.12 · Estrutura básica do script de enriquecimento", () => {

  it("Script enrich-module-01-content.ts existe e é executável", () => {
    expect(SRC.length).toBeGreaterThan(1000)
    expect(SRC).toMatch(/^\/\*\*/) // começa com JSDoc
  })

  it("Módulo alvo é 'introducao-biofabricacao'", () => {
    expect(SRC).toMatch(/MODULE_SLUG\s*=\s*"introducao-biofabricacao"/)
  })

  it("Array LESSONS contém exatamente 5 aulas (mesmo tamanho do Módulo 1)", () => {
    expect(SUMMARIES.length).toBe(5)
  })

  it("Script suporta --dry-run (não altera o banco)", () => {
    expect(SRC).toContain("--dry-run")
    expect(SRC).toMatch(/DRY_RUN/)
  })

  it("Script suporta --revert (rollback para conteúdo curto)", () => {
    expect(SRC).toContain("--revert")
    expect(SRC).toMatch(/REVERT/)
    expect(SRC).toMatch(/fallbackShortSummary/)
  })
})

describe("R13.12 · Densidade do conteúdo (roteiro para gravação)", () => {

  it("A) Todas as 5 aulas têm summary > 4000 caracteres (denso)", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      expect(SUMMARIES[i].length, `Aula ${i + 1} muito curta`).toBeGreaterThan(4000)
    }
  })

  it("A.2) Todas as 5 aulas têm summary > 600 palavras", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      const words = SUMMARIES[i].split(/\s+/).filter(Boolean).length
      expect(words, `Aula ${i + 1} tem apenas ${words} palavras`).toBeGreaterThan(600)
    }
  })
})

describe("R13.12 · DOIs reais (peer-reviewed, formato válido)", () => {

  it("B) Cada aula cita pelo menos 3 DOIs reais no formato 10.xxxx/yyy", () => {
    // DOI regex baseado em CrossRef spec (10.NNNN/qualquercoisa)
    const doiRegex = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi
    for (let i = 0; i < SUMMARIES.length; i++) {
      const matches = SUMMARIES[i].match(doiRegex) ?? []
      const unique = [...new Set(matches.map((d) => d.toLowerCase()))]
      expect(unique.length, `Aula ${i + 1} só tem ${unique.length} DOIs únicos`).toBeGreaterThanOrEqual(3)
    }
  })

  it("B.2) DOI de Murphy & Atala (Nature Biotechnology 2014) presente em pelo menos 1 aula (referência seminal)", () => {
    const allText = SUMMARIES.join("\n")
    expect(allText).toContain("10.1038/nbt.2958")
  })

  it("B.3) DOI de Kolesky et al (Advanced Materials 2014, vascularização) presente", () => {
    const allText = SUMMARIES.join("\n")
    expect(allText).toContain("10.1002/adma.201305506")
  })

  it("B.4) DOI de Miller Lab (Science 2019, DLP + rede vascular) presente", () => {
    const allText = SUMMARIES.join("\n")
    expect(allText).toContain("10.1126/science.aav9051")
  })
})

describe("R13.12 · Congressos internacionais (solicitação explícita da Janaina)", () => {

  it("C) TERMIS mencionado em pelo menos 3 aulas", () => {
    const count = SUMMARIES.filter((s) => /TERMIS/i.test(s)).length
    expect(count, `TERMIS mencionado só em ${count} aulas`).toBeGreaterThanOrEqual(3)
  })

  it("C.2) 'Biofabrication Conference' OU 'ISBF' presente em pelo menos 3 aulas", () => {
    const count = SUMMARIES.filter((s) =>
      /Biofabrication Conference|International Conference on Biofabrication|ISBF|Society for Biofabrication/i.test(s),
    ).length
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it("C.3) Cada aula lista pelo menos 1 congresso NACIONAL / LatAm", () => {
    // Aceita: SBB, SLABO, CLABIO, CBEB, SIMBIOTE, SB3D, SBBME
    const regex = /\b(SBB|SLABO|CLABIO|CBEB|SIMBIOTE|SB3D|SBBME|Sociedade Brasileira|Latino-Americ)/i
    for (let i = 0; i < SUMMARIES.length; i++) {
      expect(regex.test(SUMMARIES[i]), `Aula ${i + 1} sem congresso brasileiro/LatAm`).toBe(true)
    }
  })

  it("C.4) Cada aula tem seção 'Congressos e sociedades científicas'", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      expect(SUMMARIES[i]).toMatch(/Congressos e sociedades científicas/i)
    }
  })
})

describe("R13.12 · Estrutura didática obrigatória", () => {

  it("D) Cada aula tem seção 'Erros comuns' OU 'Distinções que geram confusão'", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      const hasErros = /Erros comuns/i.test(SUMMARIES[i])
      const hasDistincoes = /Distinç[õo]es que geram confusão/i.test(SUMMARIES[i])
      expect(hasErros || hasDistincoes, `Aula ${i + 1} sem erros/distinções`).toBe(true)
    }
  })

  it("F) Cada aula tem seção 'Artigos recomendados'", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      expect(SUMMARIES[i]).toMatch(/Artigos recomendados/i)
    }
  })

  it("Cada aula tem seção 'Próximos passos de estudo'", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      expect(SUMMARIES[i]).toMatch(/Próximos passos de estudo/i)
    }
  })

  it("Cada aula tem seção 'Desafios técnicos' (não só regulatórios — pedido da Janaina)", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      expect(SUMMARIES[i]).toMatch(/Desafios técnicos/i)
    }
  })
})

describe("R13.12 · Distinções terminológicas críticas (pedido explícito da Janaina)", () => {

  it("G) Aula 1.1 esclarece a distinção 'tinta' (biomaterial sem células, para dispositivos rígidos) vs 'biotinta' (com células vivas)", () => {
    const aula1 = SUMMARIES[0]
    // Deve mencionar ambos os termos
    expect(aula1).toMatch(/tinta.*biotinta|biotinta.*tinta/i)
    // Deve explicar o que é biotinta (com células)
    expect(aula1).toMatch(/biotinta.*célul|célul.*biotinta/i)
  })

  it("Aula 1.1 diferencia biofabricação, engenharia tecidual e bioimpressão", () => {
    const aula1 = SUMMARIES[0]
    expect(aula1).toMatch(/biofabrica[çc][ãa]o/i)
    expect(aula1).toMatch(/engenharia tecidual|tissue engineering/i)
    expect(aula1).toMatch(/bioimpress[ãa]o/i)
  })

  it("Aula 1.2 apresenta a tríade (scaffold + células + sinais)", () => {
    const aula2 = SUMMARIES[1]
    expect(aula2).toMatch(/scaffold/i)
    expect(aula2).toMatch(/c[eé]lulas/i)
    expect(aula2).toMatch(/fatores? (bioativos?|de sinaliza|de crescimento)/i)
  })

  it("Aula 1.3 apresenta as 4 técnicas (extrusão, jato, luz, FRESH)", () => {
    const aula3 = SUMMARIES[2]
    expect(aula3).toMatch(/extrus[ãa]o/i)
    expect(aula3).toMatch(/jato de tinta|inkjet/i)
    expect(aula3).toMatch(/SLA|DLP|estereolitografia/i)
    expect(aula3).toMatch(/FRESH/i)
  })

  it("Aula 1.4 lista aplicações clínicas aprovadas (Apligraf, MACI ou Integra)", () => {
    const aula4 = SUMMARIES[3]
    const hasClinicalProduct = /Apligraf|MACI|Integra|Dermagraft/i.test(aula4)
    expect(hasClinicalProduct).toBe(true)
    // Deve distinguir fases clínicas
    expect(aula4).toMatch(/fase (I{1,3}|II|III)/i)
  })

  it("Aula 1.5 explora desafios além do regulatório (reologia, vascularização, escala)", () => {
    const aula5 = SUMMARIES[4]
    expect(aula5).toMatch(/vasculariza[çc][ãa]o/i)
    // Deve ter tanto regulatório quanto técnico
    expect(aula5).toMatch(/regulat[óo]rio/i)
    expect(aula5).toMatch(/escala/i)
  })
})

describe("R13.12 · Integração com plataforma BIA (biaHook)", () => {

  it("Pelo menos 2 aulas mencionam prática na plataforma BIA (Formulator/Bioprinting/Knowledge Engine/GLP)", () => {
    const biaTools = /Formulator Pro|Bioprinting|Knowledge Engine|GLP\/GMP|Chat IA|Notebook do Pesquisador|Slicer/i
    const count = SUMMARIES.filter((s) => biaTools.test(s)).length
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

describe("R13.12 · Regressão — proteções contra desconfiguração", () => {

  it("Nunca reduzir a lista de aulas para menos de 5", () => {
    expect(SUMMARIES.length).toBe(5)
  })

  it("Nunca aceitar summary com menos de 3000 chars (piso duro)", () => {
    for (let i = 0; i < SUMMARIES.length; i++) {
      expect(SUMMARIES[i].length).toBeGreaterThan(3000)
    }
  })

  it("Slugs das 5 aulas preservados (não podem mudar)", () => {
    const expected = [
      "o-que-e-biofabricacao",
      "engenharia-tecidual-fundamentos",
      "bioimpressao-3d-panorama",
      "aplicacoes-clinicas-atuais",
      "limitacoes-e-desafios",
    ]
    for (const slug of expected) {
      expect(SRC).toContain(`slug: "${slug}"`)
    }
  })
})
