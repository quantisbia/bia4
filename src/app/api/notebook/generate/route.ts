/**
 * BIA v4 — Gerador de Documentos Científicos do Notebook
 * POST /api/notebook/generate
 * Gera: artigos científicos, patentes, capítulos de livro,
 *       resumos de conferência, cartas de cover letter
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { generateContent, BiaAIError, aiErrorToHttp } from "@/lib/ai/gemini"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const GENERATION_TYPES = {
  ARTICLE:    { label: "Artigo Científico",      credits: "REGULATORY_DOSSIER" as const, cost: 20 },
  PATENT:     { label: "Rascunho de Patente",    credits: "REGULATORY_DOSSIER" as const, cost: 20 },
  CHAPTER:    { label: "Capítulo de Livro",      credits: "ANALYSIS_RUN"        as const, cost: 12 },
  ABSTRACT:   { label: "Resumo para Congresso",  credits: "PROTOCOL_GENERATION" as const, cost: 8 },
  REVIEW:     { label: "Artigo de Revisão",      credits: "REGULATORY_DOSSIER" as const, cost: 20 },
  METHODS:    { label: "Seção de Metodologia",   credits: "PROTOCOL_GENERATION" as const, cost: 8 },
  INTRO:      { label: "Introdução Científica",  credits: "PROTOCOL_GENERATION" as const, cost: 8 },
  DISCUSSION: { label: "Discussão e Conclusões", credits: "PROTOCOL_GENERATION" as const, cost: 8 },
} as const

type GenType = keyof typeof GENERATION_TYPES

const schema = z.object({
  entryIds:   z.array(z.string()).min(1).max(10),
  genType:    z.string(),
  title:      z.string().optional(),
  journal:    z.string().optional(),
  style:      z.string().optional(), // "ABNT", "Vancouver", "APA"
  language:   z.string().optional().default("pt-BR"),
  keywords:   z.array(z.string()).optional(),
  extraNotes: z.string().optional(),
})

function buildPrompt(
  genType: GenType,
  entriesContent: string,
  opts: { title?: string; journal?: string; style?: string; language?: string; keywords?: string[]; extraNotes?: string }
): string {
  const lang = opts.language === "en" ? "English" : "Português (Brasil)"
  const style = opts.style ?? "Vancouver"
  const kw = opts.keywords?.join(", ") ?? ""

  const base = `Você é BIA v4, especialista em biofabricação e redação científica. Com base nas notas e dados do notebook do pesquisador abaixo, gere um documento científico de alta qualidade.

## Dados do Notebook do Pesquisador:
${entriesContent}

${opts.extraNotes ? `## Instruções Adicionais do Pesquisador:\n${opts.extraNotes}\n` : ""}
---

Idioma de saída: **${lang}**
Estilo de referências: **${style}**
${kw ? `Palavras-chave sugeridas: ${kw}` : ""}
${opts.title ? `Título sugerido: "${opts.title}"` : ""}
${opts.journal ? `Periódico/Congresso alvo: ${opts.journal}` : ""}`

  const prompts: Record<GenType, string> = {
    ARTICLE: `${base}

Gere um **ARTIGO CIENTÍFICO COMPLETO** no formato IMRaD (Introduction, Methods, Results, Discussion) para publicação em periódico científico. O artigo deve:

1. **TÍTULO** — Título científico preciso e atraente
2. **AUTORES** — [Nomes dos autores — campo a preencher]
3. **AFILIAÇÕES** — [Instituições — campo a preencher]
4. **ABSTRACT** (250-300 palavras) — em inglês e português
5. **KEYWORDS** — 5-8 palavras-chave (MeSH terms quando aplicável)
6. **1. INTRODUÇÃO** (3-4 parágrafos)
   - Contextualização do problema
   - Estado da arte com referências
   - Lacuna científica identificada
   - Objetivo do estudo
7. **2. MATERIAIS E MÉTODOS**
   - Detalhamento técnico completo
   - Parâmetros de bioimpressão/biofabricação
   - Análises estatísticas
8. **3. RESULTADOS**
   - Dados obtidos (tabelas e figuras sugeridas)
   - Análise quantitativa
9. **4. DISCUSSÃO**
   - Interpretação dos resultados
   - Comparação com literatura
   - Limitações do estudo
10. **5. CONCLUSÕES**
11. **DECLARAÇÕES** (conflito de interesses, financiamento, contribuições)
12. **REFERÊNCIAS** (formato ${style}, 20-30 referências relevantes)

Nível: Publicação em periódico Q1-Q2 (ex: Biofabrication, Acta Biomaterialia, Biomaterials)`,

    PATENT: `${base}

Gere um **RASCUNHO TÉCNICO DE PATENTE** para proteção da inovação em biofabricação. Seguir estrutura INPI/USPTO:

1. **TÍTULO DA INVENÇÃO**
2. **CAMPO TÉCNICO DA INVENÇÃO**
3. **FUNDAMENTOS DA INVENÇÃO**
   - Problemas do estado da técnica
   - Referências a patentes anteriores (prior art)
4. **SUMÁRIO DA INVENÇÃO**
   - Objeto principal
   - Vantagens sobre o estado da técnica
5. **BREVE DESCRIÇÃO DOS DESENHOS** (figuras sugeridas)
6. **DESCRIÇÃO DETALHADA DA INVENÇÃO**
   - Modalidade preferencial
   - Exemplos de realização (Exemplo 1, Exemplo 2...)
   - Parâmetros específicos, composições e processos
7. **REIVINDICAÇÕES** (15-20 reivindicações)
   - Reivindicação independente principal
   - Reivindicações dependentes
8. **RESUMO** (máximo 150 palavras)
9. **ABSTRACT** (inglês, máximo 150 palavras)

Nota: Este é um rascunho para orientação. Consulte um advogado de propriedade intelectual antes de protocolar.`,

    CHAPTER: `${base}

Gere um **CAPÍTULO DE LIVRO CIENTÍFICO** sobre o tema. Estrutura:

1. **TÍTULO DO CAPÍTULO**
2. **RESUMO DO CAPÍTULO** (150-200 palavras)
3. **1. INTRODUÇÃO** ao tema do capítulo
4. **2. FUNDAMENTOS TEÓRICOS**
   - Base científica detalhada
   - Princípios físico-químicos e biológicos
5. **3. METODOLOGIA E TÉCNICAS**
   - Protocolos detalhados
   - Equipamentos e materiais
6. **4. APLICAÇÕES CLÍNICAS E TRANSLACIONAIS**
7. **5. DESAFIOS E PERSPECTIVAS FUTURAS**
8. **6. CASOS DE ESTUDO** (exemplos práticos)
9. **CONCLUSÕES DO CAPÍTULO**
10. **REFERÊNCIAS** (formato ${style}, 30-50 referências)
11. **GLOSSÁRIO DO CAPÍTULO**

Nível: Livro técnico universitário (graduação/pós-graduação) ou obra de referência`,

    ABSTRACT: `${base}

Gere um **RESUMO PARA CONGRESSO CIENTÍFICO** (formato expandido). Incluir:

1. **TÍTULO** — impactante e específico
2. **AUTORES E AFILIAÇÕES**
3. **INTRODUÇÃO/OBJETIVO** (2-3 frases)
4. **MÉTODOS** (resumido, foco nos pontos-chave)
5. **RESULTADOS** (dados quantitativos principais)
6. **DISCUSSÃO E CONCLUSÕES** (2-3 frases)
7. **PALAVRAS-CHAVE** (5 termos)
8. **FINANCIAMENTO** (campo a preencher)

Versão em português E inglês.
Formato adequado para: TERMIS, TISSUE, SBB, SBCBM, ISBF ou congresos similares.
Máximo 300 palavras (por idioma).`,

    REVIEW: `${base}

Gere um **ARTIGO DE REVISÃO SISTEMÁTICA** sobre o tema. Estrutura PRISMA-adaptada:

1. **TÍTULO** — incluir "A review of..." ou "Revisão sobre..."
2. **ABSTRACT** (350 palavras, structured abstract)
3. **1. INTRODUÇÃO** — importância clínica, escopo da revisão
4. **2. MÉTODOS DA REVISÃO**
   - Critérios de inclusão/exclusão
   - Estratégia de busca (PubMed, Scopus, Web of Science)
5. **3. ESTADO DA ARTE** por sub-temas
6. **4. ANÁLISE CRÍTICA COMPARATIVA** (tabela comparativa de estudos)
7. **5. TENDÊNCIAS E PERSPECTIVAS FUTURAS**
8. **6. CONCLUSÕES**
9. **REFERÊNCIAS** (50-80 referências, formato ${style})

Foco em artigos dos últimos 10 anos (2014-2024). Periódico alvo sugerido: Biomaterials, Advanced Materials, Chemical Reviews.`,

    METHODS: `${base}

Gere uma **SEÇÃO DE MATERIAIS E MÉTODOS** detalhada para publicação científica. Incluir:

1. **Materiais** — reagentes, grau de pureza, fabricante, país
2. **Preparação das Amostras** — passo a passo reprodutível
3. **Equipamentos** — modelo, fabricante, configurações
4. **Caracterização** — técnicas analíticas, condições
5. **Cultura Celular** (se aplicável)
6. **Bioimpressão/Biofabricação** — parâmetros completos
7. **Análise Estatística** — software, testes, n amostral
8. **Aprovações Éticas** (campos a preencher)

Nível de detalhamento: suficiente para reprodutibilidade total. Formato periódico Q1.`,

    INTRO: `${base}

Gere uma **INTRODUÇÃO CIENTÍFICA** para artigo de alto impacto. Estrutura em funil:

1. **Parágrafo 1** — Importância clínica/societal do problema (big picture)
2. **Parágrafo 2** — Estado da arte atual (com referências-chave)
3. **Parágrafo 3** — Limitações das abordagens existentes (gap identification)
4. **Parágrafo 4** — Proposta inovadora do presente trabalho
5. **Parágrafo 5** — Objetivos específicos e hipótese

Incluir 15-20 referências relevantes (últimos 5 anos prioritariamente).
Tom: científico, preciso, motivador.`,

    DISCUSSION: `${base}

Gere uma **DISCUSSÃO E CONCLUSÕES** para artigo científico:

1. **Discussão Principal**
   - Interpretação dos principais resultados
   - Comparação com literatura existente
   - Mecanismos propostos
   - Implicações clínicas/translacionais
2. **Pontos Fortes do Estudo**
3. **Limitações** (honesta e objetiva)
4. **Perspectivas Futuras**
5. **Conclusões** (3-5 pontos objetivos)

Tom: crítico, científico, equilibrado. Incluir 10-15 referências de comparação.`,
  }

  return prompts[genType] ?? prompts.ARTICLE
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { entryIds, genType, title, journal, style, language, keywords, extraNotes } = parsed.data
  const safeGenType = (Object.keys(GENERATION_TYPES).includes(genType) ? genType : "ARTICLE") as GenType
  const genConfig = GENERATION_TYPES[safeGenType]

  // Verificar créditos
  const userRole = (session.user as { role?: string }).role
  const creditError = await requireCredits(
    session.user.id,
    genConfig.credits,
    `Notebook — ${genConfig.label}`,
    { action: "notebook_generate", genType: safeGenType },
    userRole
  )
  if (creditError) return creditError.error

  // Buscar conteúdo das entradas selecionadas
  const entries = await prisma.notebookEntry.findMany({
    where: { id: { in: entryIds }, userId: session.user.id },
    select: { id: true, title: true, content: true, entryType: true, category: true, createdAt: true },
  })

  if (entries.length === 0) {
    return NextResponse.json({ error: "Nenhuma entrada encontrada" }, { status: 404 })
  }

  const entriesContent = entries.map(e =>
    `### ${e.title} [${e.entryType}]\nCategoria: ${e.category ?? "Geral"}\nData: ${e.createdAt.toLocaleDateString("pt-BR")}\n\n${e.content.substring(0, 2000)}${e.content.length > 2000 ? "\n[...conteúdo resumido...]" : ""}`
  ).join("\n\n---\n\n")

  const prompt = buildPrompt(safeGenType, entriesContent, { title, journal, style, language, keywords, extraNotes })

  try {
    const { text: document } = await generateContent(prompt, { maxTokens: 8192, temperature: 0.4 })

    // Salvar documento gerado na entrada principal
    const mainEntryId = entryIds[0]
    await prisma.notebookEntry.update({
      where: { id: mainEntryId },
      data: {
        generatedDoc: {
          type: safeGenType,
          label: genConfig.label,
          content: document,
          generatedAt: new Date().toISOString(),
          basedOnEntries: entryIds,
          settings: { title, journal, style, language, keywords },
        } as never,
      },
    })

    return NextResponse.json({
      document,
      genType: safeGenType,
      label: genConfig.label,
      creditsUsed: genConfig.cost,
      basedOn: entries.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[POST /api/notebook/generate]", err)
    if (err instanceof BiaAIError) {
      const r = aiErrorToHttp(err)
      return NextResponse.json({ error: r.error, code: r.code }, { status: r.status })
    }
    return NextResponse.json(
      { error: "Erro ao gerar documento. Tente novamente." },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    types: Object.entries(GENERATION_TYPES).map(([key, val]) => ({
      key,
      label: val.label,
      cost: val.cost,
    }))
  })
}
