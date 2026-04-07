/**
 * BIA v4 — API de Análises Especializadas
 * POST /api/analyses → gera análise científica via IA
 * GET  /api/analyses → lista análises do usuário
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { prisma } from "@/lib/db/prisma"
import { generateContent, SYSTEM_PROMPTS } from "@/lib/ai/gemini"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// ─── Tipos de análise e seus prompts ──────────────────────────────────────────
const ANALYSIS_TYPES = {
  MOLECULAR:    { label: "Análise Molecular",          prompt: SYSTEM_PROMPTS.ANALYSIS_MOLECULAR,    credits: 12, minPlan: "ADVANCED" },
  BIOCHEMICAL:  { label: "Análise Bioquímica",         prompt: SYSTEM_PROMPTS.ANALYSIS_BIOCHEMICAL,  credits: 10, minPlan: "ADVANCED" },
  CELLULAR:     { label: "Análise Celular",            prompt: SYSTEM_PROMPTS.ANALYSIS_CELLULAR,     credits: 10, minPlan: "ADVANCED" },
  IN_VITRO:     { label: "Ensaio In Vitro",            prompt: SYSTEM_PROMPTS.ANALYSIS_IN_VITRO,     credits: 12, minPlan: "ADVANCED" },
  IN_VIVO:      { label: "Estudo In Vivo",             prompt: SYSTEM_PROMPTS.ANALYSIS_IN_VIVO,      credits: 20, minPlan: "ENTERPRISE" },
  PRECLINICAL:  { label: "Estudo Pré-Clínico",         prompt: SYSTEM_PROMPTS.ANALYSIS_PRECLINICAL,  credits: 20, minPlan: "ENTERPRISE" },
  CLINICAL:     { label: "Ensaio Clínico",             prompt: SYSTEM_PROMPTS.ANALYSIS_CLINICAL,     credits: 20, minPlan: "ENTERPRISE" },
  REG_DOSSIER:  { label: "Dossiê Regulatório",         prompt: SYSTEM_PROMPTS.REGULATORY_DOSSIER,    credits: 20, minPlan: "ENTERPRISE" },
  REG_POP:      { label: "POP Regulatório",            prompt: SYSTEM_PROMPTS.REGULATORY_DOSSIER,    credits: 12, minPlan: "ADVANCED" },
  REG_510K:     { label: "Dossiê FDA 510(k)",          prompt: SYSTEM_PROMPTS.REGULATORY_DOSSIER,    credits: 20, minPlan: "ENTERPRISE" },
  REG_ANVISA:   { label: "Dossiê ANVISA",              prompt: SYSTEM_PROMPTS.REGULATORY_DOSSIER,    credits: 20, minPlan: "ENTERPRISE" },
  REG_CTD:      { label: "Dossiê CTD/EMA",             prompt: SYSTEM_PROMPTS.REGULATORY_DOSSIER,    credits: 20, minPlan: "ENTERPRISE" },
} as const

type AnalysisType = keyof typeof ANALYSIS_TYPES

const PLAN_ORDER = ["FREE", "DISCOVERY", "ADVANCED", "ENTERPRISE", "ACADEMY"]

// ─── Validação ────────────────────────────────────────────────────────────────
const analyseSchema = z.object({
  type:        z.enum(Object.keys(ANALYSIS_TYPES) as [AnalysisType, ...AnalysisType[]]),
  title:       z.string().min(5).max(200),
  context:     z.string().min(20, "Descreva o contexto com mais detalhes (min 20 chars)"),
  objective:   z.string().optional(),
  material:    z.string().optional(),
  tissueType:  z.string().optional(),
  species:     z.string().optional(),   // para in vivo
  regulatoryTarget: z.string().optional(), // FDA/ANVISA/EMA
})

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (id) {
      // Buscar protocolo específico (reutilizamos a tabela Protocol para análises)
      const record = await prisma.protocol.findFirst({
        where: { id, userId: session.user.id },
      })
      if (!record) return NextResponse.json({ error: "Análise não encontrada" }, { status: 404 })
      return NextResponse.json({
        id: record.id,
        title: record.title,
        type: record.category?.toUpperCase() ?? "MOLECULAR",
        typeName: ANALYSIS_TYPES[record.category?.toUpperCase() as AnalysisType]?.label ?? record.category,
        content: record.content,
        creditsUsed: record.creditsUsed,
        createdAt: record.createdAt,
      })
    }

    // Listar análises (armazenadas como protocolos com categoria prefixed "ANALYSIS_")
    const records = await prisma.protocol.findMany({
      where: {
        userId: session.user.id,
        category: { startsWith: "analysis_" },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, category: true, description: true, creditsUsed: true, createdAt: true },
    })

    const regRecords = await prisma.protocol.findMany({
      where: {
        userId: session.user.id,
        category: { startsWith: "reg_" },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, category: true, description: true, creditsUsed: true, createdAt: true },
    })

    const all = [...records, ...regRecords].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json(
      all.map(r => ({
        id: r.id,
        title: r.title,
        type: r.category?.toUpperCase() ?? "MOLECULAR",
        typeName: ANALYSIS_TYPES[r.category?.toUpperCase() as AnalysisType]?.label ?? r.category,
        description: r.description,
        creditsUsed: r.creditsUsed,
        createdAt: r.createdAt,
      }))
    )
  } catch (err) {
    console.error("[GET /api/analyses]", err)
    return NextResponse.json({ error: "Erro ao buscar análises" }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    let body: unknown
    try { body = await req.json() }
    catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

    const parsed = analyseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { type, title, context, objective, material, tissueType, species, regulatoryTarget } = parsed.data
    const analysisConfig = ANALYSIS_TYPES[type]

    // Verificar plano mínimo
    const userPlan = (session.user as { plan?: string }).plan ?? "FREE"
    const userPlanIdx = PLAN_ORDER.indexOf(userPlan)
    const minPlanIdx  = PLAN_ORDER.indexOf(analysisConfig.minPlan)
    if (userPlanIdx < minPlanIdx) {
      return NextResponse.json({
        error: `Esta análise requer plano ${analysisConfig.minPlan} ou superior. Seu plano atual: ${userPlan}.`,
        code: "PLAN_REQUIRED",
        requiredPlan: analysisConfig.minPlan,
      }, { status: 403 })
    }

    // Verificar créditos usando a ação mais próxima disponível
    const creditResult = await requireCredits(
      session.user.id,
      "PROTOCOL_GENERATION",  // reutilizamos esta ação; ajustamos o custo na lógica abaixo
      `Análise ${analysisConfig.label}: ${title}`,
      { type, title } as Prisma.InputJsonValue
    )
    if (creditResult) return creditResult.error

    // ── Gerar prompt especializado ────────────────────────────────────────────
    const extras = [
      objective    ? `OBJETIVO ESPECÍFICO: ${objective}` : null,
      material     ? `MATERIAL/BIOMATERIAL: ${material}` : null,
      tissueType   ? `TECIDO/ÓRGÃO ALVO: ${tissueType}` : null,
      species      ? `ESPÉCIE ANIMAL: ${species}` : null,
      regulatoryTarget ? `AGÊNCIA REGULATÓRIA ALVO: ${regulatoryTarget}` : null,
    ].filter(Boolean).join("\n")

    const prompt = buildAnalysisPrompt(type, title, context, extras)

    const { text: content } = await generateContent(prompt, {
      systemPrompt: analysisConfig.prompt,
      temperature: 0.25,
      maxTokens: 6000,
    })

    if (!content || content.trim().length < 200) {
      return NextResponse.json({ error: "IA não retornou conteúdo válido. Tente novamente." }, { status: 500 })
    }

    // ── Salvar como protocolo com categoria prefixed ──────────────────────────
    const categoryKey = type.toLowerCase()  // "molecular", "biochemical", etc.
    const record = await prisma.protocol.create({
      data: {
        userId:      session.user.id,
        title,
        category:    categoryKey,
        description: context.substring(0, 500),
        content,
        steps:       [] as Prisma.InputJsonValue,
        materials:   [] as Prisma.InputJsonValue,
        equipment:   [],
        safetyNotes: [],
        aiGenerated: true,
        sourceInputs: { type, context, objective, material, tissueType, species, regulatoryTarget } as Prisma.InputJsonValue,
        creditsUsed: analysisConfig.credits,
      },
    })

    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "analysis_generated",
        entity: "protocol",
        entityId: record.id,
        metadata: { type, title } as Prisma.InputJsonValue,
      },
    }).catch(() => {})

    return NextResponse.json({
      id: record.id,
      title: record.title,
      type,
      typeName: analysisConfig.label,
      content,
      description: record.description,
      creditsUsed: analysisConfig.credits,
      createdAt: record.createdAt,
    }, { status: 201 })

  } catch (err) {
    console.error("[POST /api/analyses]", err)
    const msg = err instanceof Error ? err.message : "Erro desconhecido"
    if (msg.includes("Créditos") || msg.includes("INSUFFICIENT")) {
      return NextResponse.json({ error: msg, code: "INSUFFICIENT_CREDITS" }, { status: 402 })
    }
    return NextResponse.json({ error: "Erro ao gerar análise. Tente novamente." }, { status: 500 })
  }
}

// ─── Build prompt especializado por tipo ─────────────────────────────────────
function buildAnalysisPrompt(type: AnalysisType, title: string, context: string, extras: string): string {
  const base = `SOLICITAÇÃO: ${title}\nCONTEXTO: ${context}\n${extras ? "\nINFORMAÇÕES ADICIONAIS:\n" + extras : ""}\n\n`

  switch (type) {
    case "MOLECULAR":
      return base + `Gere um relatório técnico completo de análise molecular para biofabricação com:
## Fundamento Científico e Molecular
## Ensaios Moleculares Recomendados (com justificativa)
## Protocolo Detalhado por Ensaio
  - Materiais e reagentes (fornecedor, número catálogo, concentração)
  - Procedimento passo-a-passo com tempos, temperaturas e CCPs
  - Controles positivos e negativos obrigatórios
## Análise Estatística e Interpretação
  - Testes estatísticos adequados (ANOVA, t-test, correção múltiplas comparações)
  - Software recomendado (GraphPad Prism, R)
  - Critérios de significância
## Interpretação Clínica e Biológica dos Resultados
## Referências DOI (preferencialmente 2022-2026)`

    case "BIOCHEMICAL":
      return base + `Gere um protocolo bioquímico completo para caracterização de biomaterial/scaffold com:
## Caracterização Físico-Química (FTIR, NMR, GPC, TGA, DSC)
  - Para cada técnica: protocolo de preparo de amostra, parâmetros de análise, interpretação
## Ensaios de Viabilidade e Citotoxicidade
  - MTS/CCK-8: protocolo, curva padrão, cálculo IC50
  - LDH: protocolo, controles, critérios ISO 10993-5
## Ensaios de Diferenciação (se aplicável)
## Análise Estatística
## Referências Normativas (ISO, ASTM, ABNT)`

    case "CELLULAR":
      return base + `Gere um protocolo completo de análise celular para engenharia tecidual com:
## Análise de Viabilidade Celular
  - Live/Dead (Calcein-AM/EthD-1): protocolo completo, threshold de aceitação
  - Citometria de fluxo (Anexina V/PI): interpretação dos quadrantes
## Análise de Proliferação
  - BrdU/EdU: protocolo de incorporação e detecção
  - Citometria de ciclo celular
## Morfologia e Citoesqueleto
  - F-actina (Faloidina): protocolo, parâmetros confocal
  - MEV: preparo de amostra, condições de imageamento
## Análise Funcional (específica para o tipo celular solicitado)
## Análise Estatística com GraphPad Prism
## Referências DOI (2022-2026)`

    case "IN_VITRO":
      return base + `Gere um plano completo de ensaios in vitro seguindo ISO 10993 com:
## Avaliação de Biocompatibilidade (ISO 10993-5, -10, -4)
  - Seleção de ensaios baseada no contato com tecido (ISO 10993-1 Tabela A.1)
  - Protocolo de extração (ISO 10993-12): meio, temperatura, tempo
  - Células recomendadas e justificativa
  - Critérios de aceitação normativos
## Estudos de Degradação
  - Degradação hidrolítica: PBS pH 7.4, 37°C — pontos de coleta
  - Degradação enzimática: enzimas específicas ao material
  - Medidas: perda de massa, alteração morfológica, pH
## Ensaios Funcionais de Diferenciação
## Cronograma de Estudos
## Análise Estatística
## Referências ISO/ASTM/FDA Guidance`

    case "IN_VIVO":
      return base + `Gere um protocolo completo de estudo in vivo com:
## Justificativa Ética (Princípio 3Rs)
## Modelo Animal Recomendado e Justificativa
  - Espécie, linhagem, sexo, peso, n amostral (cálculo power analysis)
  - Aprovação CEUA/IACUC: documentos necessários
## Delineamento Experimental
  - Grupos: controle negativo, controle positivo, grupos teste
  - Timeline: semanas de acompanhamento, pontos de coleta
## Procedimento Cirúrgico
  - Anestesia: protocolo e doses (mg/kg)
  - Técnica cirúrgica passo-a-passo
  - Pós-operatório: analgesia, monitoramento
## Análises e Endpoints
  - Imagiologia (microCT, radiografia): parâmetros
  - Biomecânica: ensaios ex vivo
  - Histologia: colorações, scores de avaliação
  - Imunologia: ELISA, PCR de tecidos
## Análise Estatística
  - Cálculo amostral completo (média, DP estimados, poder, α)
## Documentação Regulatória (CEUA, IACUC, CONCEA)`

    case "PRECLINICAL":
      return base + `Gere um pacote pré-clínico completo para submissão regulatória com:
## Plano de Estudos ISO 10993 (Tabela de risco ISO 10993-1)
  - Todos os estudos obrigatórios listados com justificativa
  - Timeline cronológico (Gantt simplificado)
  - Estimativa de custos por estudo
## Estudos de Citotoxicidade (ISO 10993-5)
  - Protocolo completo: extrato, contato direto, elution
  - Critérios de aceitação: viabilidade ≥70%
## Estudos de Genotoxicidade
  - Ames test: cepas, doses, controles, critério S/I factor ≥2
  - Micronúcleo in vitro: protocolo citostase (CBMN)
## Estudos de Implantação (ISO 10993-6)
  - Modelo subcutâneo: n=10/grupo, timeline 2/4/12 semanas
  - Histologia: HE, Masson, score ISO 10993-6 Tabela A.2
## Biocompatibilidade Sistêmica
## Relatórios Regulatórios
  - Estrutura do relatório de biocompatibilidade ABNT
  - CBR (Chemical Biological Risk) assessment`

    case "CLINICAL":
      return base + `Gere um protocolo de ensaio clínico completo para produto de biofabricação com:
## Sumário Executivo do Estudo
## Introdução e Racional Científico
  - Dados pré-clínicos suportando a hipótese clínica
  - Necessidade médica não atendida
## Objetivo e Hipótese
  - Primário: desfecho principal com métrica (ex: VAS dor, % regeneração)
  - Secundários: qualidade de vida, biomarcadores, segurança
## Design do Estudo
  - Fase (I/II/III), desenho (randomizado, cego, multicêntrico)
  - Randomização: método, ocultação de alocação
## Critérios de Elegibilidade (Inclusão/Exclusão)
## Tamanho Amostral — cálculo power analysis completo
## Intervenção
  - Aplicação/implantação do produto biofabricado (protocolo cirúrgico)
  - Controle: procedimento simulado (sham) ou padrão ouro
## Desfechos e Instrumentos Validados
## Análise Estatística (ICH E9, SAP summary)
## Considerações Regulatórias
  - IND/IDE, CONEP/ANVISA, registro ClinicalTrials.gov
  - TCLE: principais elementos obrigatórios
## Cronograma e Orçamento estimado`

    case "REG_DOSSIER":
    case "REG_510K":
    case "REG_ANVISA":
    case "REG_CTD":
      const targetAgency = extras.includes("FDA") ? "FDA 510(k)/PMA" :
                           extras.includes("ANVISA") ? "ANVISA RDC 185/204" :
                           extras.includes("EMA") ? "EMA CTD" : "FDA/ANVISA/EMA"
      return base + `Gere um dossiê regulatório completo e profissional para ${targetAgency} com:
## Seção 1 — Informações do Produto
  - Identificação do produto (nome comercial, genérico, código)
  - Classificação regulatória com justificativa
  - Descrição técnica completa (materiais, componentes, processo fabricação)
  - Indicação de uso, contraindicações, advertências
## Seção 2 — Equivalência Substancial / Comparativo (para 510k)
  - Tabela comparativa com predicado (intended use, design, tecnologia)
  - Diferenças e avaliação de equivalência
## Seção 3 — Qualidade e Fabricação
  - Processo de fabricação: fluxograma com pontos de controle
  - Especificações do produto acabado (física, química, microbiológica)
  - Validação de métodos analíticos (ICH Q2)
  - Plano de estabilidade (ICH Q1A — acelerado + tempo real)
  - Esterilização: método, parâmetros, validação SAL 10⁻⁶
## Seção 4 — Biocompatibilidade
  - Tabela ISO 10993-1: contato, duração, estudos realizados/justificados
  - Sumário dos resultados dos estudos
## Seção 5 — Desempenho e Segurança
  - Ensaios de bancada (bench testing): normas ASTM/ISO aplicáveis
  - Resultados dos testes mecânicos, funcionais, degradação
## Seção 6 — Dados Clínicos
  - Literatura clínica relevante (revisão sistematizada)
  - Estudos clínicos realizados (se houver)
## Seção 7 — Rotulagem
  - Elementos obrigatórios por regulação
## Lista de verificação de submissão (checklist final)`

    case "REG_POP":
      return base + `Gere um POP (Procedimento Operacional Padrão) completo em formato regulatório ANVISA/GMP:
## CABEÇALHO OFICIAL
  | Código POP: [empresa]-POP-XXX | Versão: 1.0 | Data: [data atual] |
  | Elaborado por: | Revisado por: | Aprovado por: |
## 1. OBJETIVO E ESCOPO
  - Objetivo claro em 2-3 frases
  - Área de aplicabilidade e exclusões
## 2. RESPONSABILIDADES
  - Executante, supervisor, responsável pela aprovação
## 3. DEFINIÇÕES E ABREVIAÇÕES
  - Glossário técnico completo
## 4. MATERIAIS, EQUIPAMENTOS E REAGENTES
  - Lista completa: fornecedor, referência/lote, concentração, validade
  - Equipamentos: modelo, calibração, periodicidade
## 5. PROCEDIMENTO EXPERIMENTAL
  - Pré-operatório: verificações, limpeza, EPI
  - Etapas numeradas e detalhadas com:
    • Temperatura (°C), pH, tempo (min/h), pressão (kPa/bar)
    • Pontos Críticos de Controle (✱ CCPs destacados)
    • Limites de alerta e ação
## 6. CRITÉRIOS DE ACEITAÇÃO E CÁLCULOS
  - Resultados esperados com limites numéricos
  - Fórmulas de cálculo se aplicável
## 7. TROUBLESHOOTING
  - Desvios comuns e ações corretivas
## 8. REFERÊNCIAS NORMATIVAS
  - Normas ISO, ABNT, ASTM, RDC ANVISA, FDA 21 CFR
## 9. HISTÓRICO DE REVISÕES
  | Versão | Data | Descrição da alteração | Autor |
## 10. FORMULÁRIOS DE REGISTRO (ANEXO A)
  - Modelo de planilha de registro dos resultados`

    default:
      return base + `Gere uma análise técnica completa e detalhada sobre o tema solicitado,
incluindo fundamento científico, protocolo, controles, análise estatística e referências DOI atualizadas (2022-2026).`
  }
}
