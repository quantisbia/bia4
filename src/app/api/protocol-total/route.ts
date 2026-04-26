/**
 * BIA v4 — API Protocolo Total Pós-Pipeline
 * POST /api/protocol-total
 * Gera o Protocolo Técnico Completo de Biofabricação a partir das 12 etapas concluídas
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { requireCredits } from "@/lib/auth/credits"
import { generateContent, BiaAIError, aiErrorToHttp } from "@/lib/ai/gemini"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const schema = z.object({
  projectId: z.string().min(1),
})

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

  const userRole = (session.user as { role?: string }).role

  // Verificar e debitar créditos (REGULATORY_DOSSIER = 20 créditos para protocolo completo)
  const creditError = await requireCredits(
    session.user.id,
    "REGULATORY_DOSSIER",
    `Protocolo Total BIA — ${parsed.data.projectId}`,
    { action: "protocol_total", projectId: parsed.data.projectId },
    userRole
  )
  if (creditError) return creditError.error

  // Buscar projeto e etapas
  const project = await prisma.pipelineProject.findFirst({
    where: { id: parsed.data.projectId, userId: session.user.id },
    include: { stages: { orderBy: { stageNumber: "asc" } } },
  })

  if (!project) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
  }

  // Montar contexto das etapas
  const stagesContext = project.stages.map(s => {
    const outputs = s.outputs as Record<string, unknown> | null
    const analysis = s.aiAnalysis ?? ""
    return `### Etapa ${s.stageNumber}: ${s.name}
Status: ${s.status}
Análise IA: ${analysis.substring(0, 500)}${analysis.length > 500 ? "..." : ""}
${outputs ? `Parâmetros: ${JSON.stringify(outputs).substring(0, 300)}` : ""}`
  }).join("\n\n")

  const today = new Date().toLocaleDateString("pt-BR")

  const prompt = `Você é BIA v4, especialista em biofabricação. Com base nas 12 etapas do pipeline concluídas abaixo, gere o PROTOCOLO TÉCNICO COMPLETO DE BIOFABRICAÇÃO.

## Projeto: ${project.name}
- Tecido Alvo: ${project.tissueType}
- Aplicação Clínica: ${project.targetApplication ?? "Não especificado"}
- Fonte Celular: ${project.cellSource ?? "Não especificado"}

## Etapas do Pipeline Concluídas:
${stagesContext}

---

Gere um PROTOCOLO TÉCNICO COMPLETO seguindo EXATAMENTE esta estrutura em Markdown:

# PROTOCOLO TÉCNICO DE BIOFABRICAÇÃO — ${project.name.toUpperCase()}

**Versão:** 1.0 | **Data:** ${today} | **Gerado por:** BIA v4 — Inteligência Artificial em Biofabricação

---

## 1. IDENTIFICAÇÃO DO PROTOCOLO
- **Título:** [título descritivo completo]
- **Código:** BIA-${Date.now().toString().slice(-6)}-2025
- **Tecido/Órgão Alvo:** ${project.tissueType}
- **Aplicação Clínica:** ${project.targetApplication ?? "Pesquisa pré-clínica"}
- **Nível de Biossegurança:** [BSL-1 ou BSL-2 conforme células utilizadas]
- **Responsável Técnico:** ___________________________
- **Instituição:** ___________________________
- **Data de Vigência:** ___________________________

## 2. FUNDAMENTO CIENTÍFICO
[Escrever 2-3 parágrafos sobre o princípio de engenharia de tecidos aplicado, justificativa da abordagem e estado da arte]

### 2.1 Referências Bibliográficas-Chave
[Listar 5-8 referências relevantes no formato Vancouver]

## 3. MATERIAIS E EQUIPAMENTOS

### 3.1 Biomateriais
| Material | Concentração | Grau | Fornecedor Recomendado | Armazenamento |
|----------|-------------|------|----------------------|---------------|
[tabela completa com todos os biomateriais do projeto]

### 3.2 Células e Reagentes Biológicos
| Item | Especificação | Quantidade/Experimento | Armazenamento |
|------|--------------|----------------------|---------------|
[tabela completa]

### 3.3 Equipamentos e Instrumentos
| Equipamento | Função | Configuração Crítica | Calibração |
|-------------|--------|---------------------|-----------|
[bioimpressora, reômetro, microscópio, incubadora, etc.]

### 3.4 EPIs Obrigatórios
- [ ] Jaleco de manga comprida
- [ ] Luvas de nitrila (dupla)
- [ ] Óculos de proteção
- [ ] Máscara cirúrgica / N95
- [listar demais EPIs específicos]

## 4. PARÂMETROS TÉCNICOS CRÍTICOS

### 4.1 Parâmetros de Bioimpressão
| Parâmetro | Valor Alvo | Faixa Aceitável | Unidade |
|-----------|-----------|-----------------|---------|
| Pressão de extrusão | [valor] | [mín–máx] | kPa |
| Velocidade de impressão | [valor] | [mín–máx] | mm/s |
| Temperatura do nozzle | [valor] | [mín–máx] | °C |
| Diâmetro do nozzle | [valor] | — | mm |
| Altura da camada | [valor] | [mín–máx] | µm |
| Infill | [valor] | [mín–máx] | % |
[adicionar parâmetros conforme tecnologia utilizada]

### 4.2 Parâmetros Reológicos da Biotinta
| Propriedade | Valor Alvo | Método de Medição |
|-------------|-----------|-------------------|
| Viscosidade | [valor] mPa·s | Reômetro rotacional |
| Yield Stress | [valor] Pa | Varredura de estresse |
| Tixotropia (recuperação) | >95% em 60s | Teste 3-interval-thixotropy |
| G' (pós-crosslink) | [valor] Pa | Varredura de frequência |
| G'' (pós-crosslink) | [valor] Pa | Varredura de frequência |

### 4.3 Parâmetros Celulares
| Parâmetro | Valor Alvo | Critério de Aceite |
|-----------|-----------|-------------------|
| Densidade celular | [valor] células/mL | ≥ [mínimo] |
| Viabilidade pré-impressão | [valor]% | ≥ 85% |
| Viabilidade pós-impressão (24h) | [valor]% | ≥ 80% |
| Passagem máxima | P[X] | ≤ P[máx] |
| Tempo máximo pós-dissociação | [tempo] min | < 2h |

## 5. PROCEDIMENTO OPERACIONAL PADRÃO (SOP)

### 5.1 Pré-Preparo — D-1 (dia anterior)
1. ...
2. ...
[passos numerados detalhados]

### 5.2 Preparo da Biotinta — Dia D (manhã)
1. ...
2. ...
[passos com tempos, temperaturas e volumes]

### 5.3 Preparo das Células
1. ...
2. ...
[passos para dissociação, contagem e ajuste de densidade]

### 5.4 Montagem da Bioimpressora
1. ...
2. ...
[calibração, carga de biotinta, zero do nozzle]

### 5.5 Bioimpressão — Execução
1. ...
2. ...
[passos detalhados da impressão incluindo geometria a ser utilizada]

### 5.6 Crosslinking e Pós-Processamento
1. ...
2. ...
[agente, concentração, tempo, temperatura, lavagem]

### 5.7 Cultura em Biorreator / Incubação
1. ...
2. ...
[meio de cultura, suplementos, tempo, temperatura, CO2, trocas de meio]

## 6. CONTROLE DE QUALIDADE

### 6.1 Critérios de Aceitação — Pontos de Liberação
| Parâmetro | Critério Mínimo | Critério Ótimo | Método Analítico |
|-----------|----------------|----------------|-----------------|
[tabela completa para liberação do produto]

### 6.2 Hold Points (Pontos de Parada Obrigatória)
1. **HP-01:** Antes da incorporação celular → confirmar viabilidade ≥ 85%
2. **HP-02:** Antes da impressão → confirmar reologia dentro dos parâmetros
3. **HP-03:** Pós-impressão (1h) → confirmar integridade estrutural
4. [listar demais hold points]

### 6.3 Rastreabilidade Obrigatória
| Campo | Descrição |
|-------|----------|
| Lote da biotinta | |
| Passagem celular | |
| Número da impressão | |
| Operador | |
| Equipamento ID | |
| Data/hora | |

## 7. DESVIOS E AÇÕES CORRETIVAS
| Desvio Observado | Causa Provável | Ação Corretiva Imediata | Ação Preventiva | Responsável |
|-----------------|---------------|------------------------|-----------------|-------------|
[listar desvios mais comuns deste tipo de tecido/processo]

## 8. ANÁLISES BIOQUÍMICAS E HISTOLÓGICAS

### 8.1 Painel Mínimo Obrigatório
| Análise | Marcador | Técnica | Timepoint |
|---------|---------|---------|-----------|
[análises obrigatórias para este tecido]

### 8.2 Funcionalidade Específica do Tecido
[análises específicas de funcionalidade para ${project.tissueType}]

### 8.3 Análises de Segurança
- [ ] Teste de esterilidade (microbiologia)
- [ ] Teste de endotoxinas (LAL)
- [ ] Micoplasma (qPCR ou MycoAlert)

## 9. TRANSLAÇÃO CLÍNICA E REGULATÓRIO

### 9.1 Classificação Regulatória
- **ANVISA (Brasil):** [classificação RDC]
- **FDA (EUA):** [510(k), PMA, HCT/P]
- **EMA (Europa):** [ATM, ATMP]

### 9.2 Documentação Técnica Necessária
1. Dossiê de desenvolvimento (Design History File)
2. Análise de risco (ISO 14971)
3. Validação de processo
4. Estudos de estabilidade
5. [listar demais documentos]

### 9.3 Requisitos GMP Aplicáveis
- ISO 13485:2016 (dispositivos médicos)
- RDC ANVISA 665/2022 (terapias avançadas)
- [demais normas aplicáveis]

## 10. DESCARTE E BIOSSEGURANÇA
- **Resíduos Biológicos (Grupo A):** Autoclave 121°C, 20 min → saco branco leitoso
- **Reagentes Químicos:** Conforme FISPQ de cada produto
- **Equipamentos Contaminados:** Descontaminação com hipoclorito 1% por 30 min
- **Descarte de células:** Inativação com glutaraldeído 4% ou autoclave

## 11. GLOSSÁRIO TÉCNICO
| Termo | Definição |
|-------|----------|
| Bioink / Biotinta | Formulação biocompatível contendo células e/ou biomateriais para bioimpressão |
| Crosslinking | Processo de reticulação química ou física que solidifica o hidrogel |
| Gyroid | Estrutura infill de tripla periodicidade mínima que mimetiza osso trabecular |
| Scaffold | Arcabouço 3D que fornece suporte estrutural para crescimento celular |
| Tixotropia | Propriedade de redução de viscosidade sob cisalhamento e recuperação em repouso |
| Yield Stress | Tensão mínima necessária para iniciar o fluxo do material |
[adicionar termos específicos do projeto]

## 12. APÊNDICES

### Apêndice A — Arquivos de Geometria 3D
| Geometria | Arquivo | Dimensões | Tecnologia |
|-----------|---------|----------|-----------|
[listar arquivos STL/OBJ a serem gerados via BIA Gerador STL]

### Apêndice B — Parâmetros de Fatiamento (G-Code)
[parâmetros para software de fatiamento específico]

### Apêndice C — Formulações de Biotinta
[detalhamento das formulações conforme Formulador de Biomateriais BIA]

## 13. HISTÓRICO DE VERSÕES
| Versão | Data | Alterações | Responsável |
|--------|------|-----------|-------------|
| 1.0 | ${today} | Versão inicial gerada automaticamente por BIA v4 | IA |

---

> ⚠️ **AVISO REGULATÓRIO:** Este protocolo foi gerado automaticamente pela BIA v4 com base em dados científicos consolidados. **Validação obrigatória por profissional habilitado** (Engenheiro Biomédico, Biotecnólogo ou Médico especialista) antes de qualquer implementação laboratorial, pré-clínica ou clínica. A BIA não substitui julgamento clínico especializado.

*© BIA v4 — Plataforma de Inteligência Artificial para Biofabricação | ${today}*`

  try {
    const { text: protocol } = await generateContent(prompt, { maxTokens: 8192, temperature: 0.3 })

    return NextResponse.json({
      protocol,
      projectName: project.name,
      tissueType: project.tissueType,
      application: project.targetApplication,
      stagesCompleted: project.stages.filter(s => s.status === "COMPLETED").length,
      generatedAt: new Date().toISOString(),
      creditsUsed: 20,
    })
  } catch (err) {
    console.error("[POST /api/protocol-total]", err)
    if (err instanceof BiaAIError) {
      const r = aiErrorToHttp(err)
      return NextResponse.json({ error: r.error, code: r.code }, { status: r.status })
    }
    return NextResponse.json(
      { error: "Erro ao gerar protocolo. Tente novamente em alguns segundos." },
      { status: 500 }
    )
  }
}
