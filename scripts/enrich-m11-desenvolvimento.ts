/**
 * R13.14.8 · Conteúdo denso do Módulo 11 — Desenvolvimento de Projeto
 *
 * Módulo publicado mas SEM nenhuma aula. Vamos criar do zero uma aula completa.
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "desenvolvimento-projeto",
    lessonSlug: "desenvolvimento-projeto-aula-completa",
    order: 1,
    title: "Desenvolvimento de Projeto — do problema clínico ao protocolo bioimprimível",
    durationMin: 95,
    level: "advanced",
    biaHook: { tool: "pipeline", label: "Rascunhar protocolo completo do projeto (BIA Pipeline)", params: { context: "project-dev" } },

    objective: `Dominar o método de desenvolvimento de projeto em biofabricação — da definição do problema clínico até o protocolo experimental exportável — integrando TODOS os módulos anteriores (biomateriais, biotintas, impressão, arquitetura, células, tecidos, avaliação).

Ao final desta aula você será capaz de:
1. Formular pergunta de pesquisa clara usando framework PICO adaptado para biofabricação.
2. Mapear o Target Product Profile (TPP) do seu constructo-alvo: função, geometria, prazo, custo, regulação.
3. Escolher material + célula + técnica justificando trade-offs explicitamente.
4. Projetar roadmap experimental com milestones (TRL 1 → TRL 4 in vitro, TRL 5-6 in vivo).
5. Montar documento de projeto completo (hipótese, metodologia, orçamento, cronograma, outcomes) exportável como PDF.`,

    summary: `## Contexto

Esta é a aula de **integração**. Até aqui você aprendeu os componentes: biomateriais, biotintas, impressão, arquitetura, células, tecidos, avaliação. Mas um projeto real de pesquisa não é a soma linear desses tópicos — é a **convergência deles em torno de uma pergunta específica, respondida com rigor e reprodutibilidade**.

Boa parte dos projetos de biofabricação que fracassam no mestrado/doutorado não falham por "problema técnico". Falham antes: pergunta mal formulada, escopo gigantesco demais, grupos controle ausentes, ensaios de leitura escolhidos no último mês, orçamento irreal. A frase do laboratório da Jennifer Lewis em Harvard resume: *"the most important part of the experiment is the experiment you do NOT run"* — ou seja, planejamento rigoroso evita 70% dos esforços perdidos.

A diferença entre um projeto bem desenhado e um "projeto de laboratório que vai dando certo" é documentada em frameworks consagrados: [NIH Rigor & Reproducibility](https://grants.nih.gov/policy/reproducibility/index.htm), [ARRIVE guidelines](https://arriveguidelines.org/) (para experimentos com animais) e [TRL — Technology Readiness Levels](https://www.nasa.gov/directorates/heo/scan/engineering/technology/txt_accordion1.html) (originalmente da NASA, hoje usado por FDA, ANVISA, INCT, FINEP, FAPESP para avaliar maturidade tecnológica).

Esta aula organiza o desenvolvimento de projeto em 7 blocos: (1) definição de problema, (2) revisão da literatura, (3) target product profile, (4) escolha de material + célula + técnica, (5) desenho experimental e grupos controle, (6) painel de avaliação, (7) cronograma + orçamento + outcomes.

## Conceitos-chave

### 1. Definição de problema — PICO adaptado para biofabricação

PICO é um framework da epidemiologia (Patient / Intervention / Comparison / Outcome). Para biofabricação, adaptamos:

| Letra | Pergunta | Exemplo |
|---|---|---|
| **P** — Population/Problem | Qual tecido / doença / paciente alvo? | "Defeito ósseo crítico (>5 cm) em tíbia de ratos Wistar" |
| **I** — Intervention | Qual o constructo bioimpresso? | "Scaffold PCL + β-TCP com arquitetura TPMS gyroid, 70% porosidade" |
| **C** — Comparison | Com o que comparar? | "Scaffold comercial Osteoset® + grupo defeito vazio" |
| **O** — Outcome | O que medir? | "Volume ósseo neo-formado por μCT em 12 semanas; força mecânica por três pontos" |
| **T** — Time | Quando? | "Avaliação em 2, 4, 8 e 12 semanas pós-implante" |

Pergunta bem formulada: *"Em defeitos ósseos críticos de tíbia em ratos Wistar, scaffold PCL+β-TCP com arquitetura gyroid (70% porosidade) induz maior volume ósseo neo-formado em 12 semanas comparado a Osteoset® e controle vazio?"*. Essa pergunta cabe em uma linha, tem resposta sim/não, e todos os componentes experimentais já estão definidos.

### 2. Revisão de literatura — método SPIDER

Antes de desenhar o experimento, revise:
- **O que já foi feito?** Buscar últimos 5 anos em Scopus/Web of Science com termos específicos.
- **Qual o gap?** O que ninguém testou? Por quê?
- **Qual a melhor combinação consenso?** Papers de alto impacto definem o "state of the art" — você precisa superar ou pelo menos igualar.

Ferramentas: [Scopus](https://www.scopus.com/), [Web of Science](https://www.webofscience.com/), [Google Scholar](https://scholar.google.com/), [Connected Papers](https://www.connectedpapers.com/) (visualizar citações), [Research Rabbit](https://www.researchrabbit.ai/) (recomendações).

Documentação da revisão: usar [PRISMA flowchart](http://www.prisma-statement.org/) mesmo em revisões não-sistemáticas — mostra ao avaliador que você conhece o campo.

### 3. Target Product Profile (TPP)

TPP é uma técnica da indústria farmacêutica (FDA) que define TODAS as características do produto final ANTES de desenvolver:

**Exemplo TPP — Scaffold ósseo bioimpresso para tíbia**

| Parâmetro | Target | Mínimo aceitável |
|---|---|---|
| Material | PCL + 20% β-TCP | PCL puro |
| Porosidade | 70-85% | 60% |
| Pore size | 300-500 μm | 200-700 μm |
| Módulo compressão | 50-200 MPa | >20 MPa |
| Biocompatibilidade (ISO 10993-5) | >90% viabilidade | >70% |
| Degradação | 6-12 meses in vivo | 3-18 meses |
| Tempo de impressão | <2h por scaffold | <6h |
| Custo material | <R$ 50 por scaffold | <R$ 200 |
| Esterilização | gamma 25 kGy OU óxido de etileno | autoclave 121°C |
| Regulatório target | Classe III ANVISA + FDA 510(k) | nenhum (uso pesquisa) |

O TPP guia TODAS as escolhas subsequentes. Se o material candidato não atende TPP, descarta antes de rodar experimento.

### 4. Escolha de material + célula + técnica — matriz de decisão

Nenhuma escolha isolada. Sempre tri-dimensional:

**Material**: biodegradabilidade + mecânica + bioatividade + custo + regulatório
**Célula**: fonte autóloga/alogênica/xenogênica, densidade, passagem, viabilidade pós-impressão
**Técnica**: resolução necessária, viabilidade celular aceitável, tempo, custo

Use matriz de pontuação (1-5) para cada combinação. A combinação que maximiza o score E atende TPP é a escolha.

### 5. Desenho experimental — grupos controle são SAGRADOS

**Grupos mínimos** para qualquer projeto de biofabricação:

| Grupo | Função |
|---|---|
| **Teste** | Seu constructo com todos os componentes |
| **Controle positivo** | Padrão-ouro atual (ex: scaffold comercial) |
| **Controle negativo** | Sem intervenção (defeito vazio, ou meio de cultura puro) |
| **Controle de material** | Scaffold sem células (avalia efeito do material isolado) |
| **Controle de células** | Células sem scaffold (ex: injeção em suspensão) |
| **Sham** (in vivo) | Cirurgia placebo (abre, fecha, não implanta) |

**n amostral**: calcular por **power analysis** antes de começar. Software: [G*Power](https://www.psychologie.hhu.de/arbeitsgruppen/allgemeine-psychologie-und-arbeitspsychologie/gpower) (livre). Regra prática: n=5-6 por grupo in vitro; n=8-12 por grupo in vivo (segundo [ARRIVE 2.0](https://arriveguidelines.org/)).

**Randomização e blinding**: alocar amostras aleatoriamente aos grupos; análise de imagens cega (quem analisa não sabe qual grupo).

### 6. Painel de avaliação — do Módulo 9

Reutilize o framework do M09:
- **Bloco 1** · Viabilidade (Live/Dead + AlamarBlue, D1 e D7)
- **Bloco 2** · Morfologia (confocal + SEM)
- **Bloco 3** · Função (IF + qPCR para marcadores do tecido-alvo)
- **Bloco 4** · Mecânica (compressão + μCT)

**Timepoints**: D1 (trauma), D7 (adaptação), D14 (proliferação), D21-D28 (maturação).

### 7. Cronograma + orçamento + outcomes

**Cronograma típico de projeto de Mestrado (24 meses)**:
- Mês 1-3: revisão + TPP + aquisição de material + treinamentos
- Mês 4-6: otimização de impressão (parâmetros, printabilidade)
- Mês 7-12: experimentos in vitro + caracterização
- Mês 13-18: experimentos in vivo (se aplicável) + aprovação CEUA
- Mês 19-22: análise de dados + escrita
- Mês 23-24: defesa + submissão de paper

**Orçamento típico (R$)**:
- Consumíveis (bioink, células, reagentes): R$ 20.000-80.000
- Insumos de impressora (bicos, tubos, filamento): R$ 2.000-10.000
- Taxas de serviço (microscopia, μCT, histologia): R$ 5.000-30.000
- Animais + CEUA (se in vivo): R$ 10.000-40.000
- Reserva para erro e repetição: 20% do total

**Outcomes esperados**: 1-2 papers Q1/Q2 + dissertação + protocolo exportável + eventualmente patente.

## Distinções que geram confusão (atenção!)

| Termo | Significado | NÃO é |
|---|---|---|
| **Hipótese** | Afirmação testável (sim/não) | Objetivo |
| **Objetivo** | O que você vai FAZER | Hipótese |
| **Pergunta de pesquisa** | O que você quer SABER | Metodologia |
| **TRL (Technology Readiness Level)** | Maturidade tecnológica (1-9) | Qualidade científica |
| **Rigor** | Precisão metodológica (controles, n, blinding) | Novidade |

**TRL para biofabricação**:
- TRL 1-3: pesquisa básica (prova de conceito em bancada)
- TRL 4-5: validação in vitro + animal pequeno
- TRL 6-7: validação em animal grande + protótipo clínico
- TRL 8-9: ensaio clínico + aprovação regulatória + comercialização

A maioria dos projetos acadêmicos vive em **TRL 2-4**. Chegar a TRL 5+ exige colaboração com empresa + CRO + agência regulatória.

## Desafios técnicos

1. **Pergunta grande demais** — "quero bioimprimir fígado funcional" não é projeto de mestrado; "quero validar matriz PEG+GelMA para hepatócitos HepG2 em 4 semanas" é.
2. **Escolher técnica antes do problema** — "quero usar a impressora X" não é projeto, é hobby. O problema define a técnica.
3. **Ignorar aprovação ética** — CEP (Comitê de Ética em Pesquisa) para células humanas; CEUA (Comitê de Ética no Uso de Animais) para in vivo. Prazo: 1-3 meses. PLANEJE DESDE O MÊS 1.
4. **Subestimar tempo de otimização** — publicar paper = otimizar parâmetros meses antes dos "experimentos definitivos". Reserve 20-30% do cronograma para isso.
5. **Não documentar protocolo passo-a-passo** — protocolos em caderno de laboratório que outra pessoa não consegue reproduzir destroem reprodutibilidade e levam ao retraction.
6. **Não ter plano B** — se o bioink principal não imprimir, qual o segundo? Se a célula primária não chegar, qual a alternativa?
7. **Orçamento irreal** — pedir R$ 10k para fazer o que custa R$ 50k gera projeto incompleto; pedir R$ 500k para projeto exploratório gera recusa do edital.
8. **Comunicação com orientador/coautores** — reunião semanal + ata + decisões documentadas evita retrabalho.

## Erros comuns de pesquisadores iniciantes

Atenção · Erros que geram problemas reais

1
**Começar a imprimir ANTES de definir hipótese** — "vou imprimir e ver o que acontece" não é ciência, é lazer de laboratório.

2
**Pular revisão sistemática** — "achei meu material novo!" — não achou, alguém já testou em 2018; busque com SPIDER/PRISMA.

3
**Não ter grupo controle positivo** — "meu scaffold teve 80% viabilidade" perde valor sem comparar com padrão-ouro no mesmo lote de células.

4
**Confiar em n=3** — para publicar em journals de impacto, mínimo n=5-6 por grupo com power analysis documentado.

5
**Escolher ensaios de leitura no último mês** — anticorpos de IF demoram 3-6 semanas para chegar (importação); planeje desde o Mês 2.

6
**Trocar parâmetros no meio do experimento** — mudou pressão de impressão porque "estava ruim"? Agora os grupos não são comparáveis. Documente e refaça.

7
**Não guardar amostras extras** — sempre imprima 20% a mais do que o n planejado para cobrir perdas (contaminação, imprevistos).

8
**Submeter paper sem revisão de coautor** — revisão interna pelo orientador antes de submeter reduz tempo de resposta em 2-3x.

## Artigos recomendados

NIH · 2024

Rigor and Reproducibility — official NIH guidelines.
📰 NIH Office of Extramural Research

Link: https://grants.nih.gov/policy/reproducibility/index.htm

Percie du Sert N. et al · 2020

The ARRIVE guidelines 2.0 — updated guidelines for reporting animal research.
📰 PLOS Biology

DOI: 10.1371/journal.pbio.3000410

Khademhosseini A, Langer R · 2016

A decade of progress in tissue engineering.
📰 Nature Protocols

DOI: 10.1038/nprot.2016.123

Hunsberger J. et al · 2015

Manufacturing road map for tissue engineering and regenerative medicine technologies.
📰 Stem Cells Translational Medicine

DOI: 10.5966/sctm.2014-0244

Patrício SG. et al · 2021

Bioprinting human microvascular networks — guidelines for designing and reporting bioprinting studies.
📰 Biofabrication

DOI: 10.1088/1758-5090/ac2d78

Vijayavenkataraman S. et al · 2018

3D bioprinting of tissues and organs for regenerative medicine.
📰 Advanced Drug Delivery Reviews

DOI: 10.1016/j.addr.2018.07.004

Groll J. et al · 2018

A definition of bioinks and their distinction from biomaterial inks.
📰 Biofabrication

DOI: 10.1088/1758-5090/aaec52

## Principais pesquisadores do campo

- **Anthony Atala** (Wake Forest Institute, EUA) — pioneiro da translação de bioimpressão para clínica (bexiga em 1999)
- **Jennifer Lewis** (Harvard SEAS, EUA) — metodologia rigorosa de desenvolvimento + Voxel8 (spin-off)
- **Ali Khademhosseini** (Terasaki Institute, EUA) — autor do framework "decade of progress"
- **Dietmar Hutmacher** (QUT, Austrália) — scaffolds para translação regulatória + edital Prime Minister's Prize
- **Luiz Bertassoni** (OHSU, EUA, brasileiro) — desenho experimental em microfluídica e vasos
- **Lorenzo Moroni** (Maastricht University, Holanda) — guideline de reporting em biofabricação
- **Jürgen Groll** (Universidade de Würzburg, Alemanha) — editor de Biofabrication, padronização de protocolo
- **Hala Zreiqat** (Universidade de Sydney, Austrália) — pipeline bancada-clínica em osso

## Congressos e sociedades científicas

**Internacionais** (foco em projeto + translação):

International Conference on Biofabrication

anual · ISBF · sessão "Translation to Clinic"

TERMIS World Congress

trienal · workshops de "project design"

AACR Annual Meeting

anual · EUA · câncer + organoides + modelos pré-clínicos

ORS Annual Meeting

anual · ortopedia + bancada-clínica

**Nacionais**:

Encontro Anual da SBB — Sociedade Brasileira de Biomateriais

workshops de desenvolvimento de projeto para pós-graduação

CBEB — Congresso Brasileiro de Engenharia Biomédica

sessões de inovação e translação

Reunião Anual da SBPC

integração interdisciplinar

**Agências de fomento + ferramentas de projeto**:
- FAPESP ([Auxílios](https://fapesp.br/)) — modelo Jovem Pesquisador + Temático
- CNPq ([Chamadas](https://www.gov.br/cnpq/)) — Universal, Produtividade
- FINEP ([Programas](https://www.finep.gov.br/)) — para TRL 4+ (translação)
- EMBRAPII — para projeto empresa-universidade
- EU Horizon Europe (para colaborações internacionais)

**Ferramentas de produtividade**:
- [Notion](https://www.notion.so/) ou [Obsidian](https://obsidian.md/) para documentação do projeto
- [Zotero](https://www.zotero.org/) ou [Mendeley](https://www.mendeley.com/) para referências
- [LabArchives](https://www.labarchives.com/) ou [Benchling](https://www.benchling.com/) para caderno de laboratório eletrônico
- [LaTeX + Overleaf](https://www.overleaf.com/) para escrita científica reprodutível

## Próximos passos de estudo

1. **Escrever hipótese e TPP do seu próprio projeto** usando os templates desta aula (BIA Pipeline tem assistente para isso).
2. **Fazer revisão sistemática rápida** (SPIDER/PRISMA) nos últimos 5 anos sobre seu tecido-alvo.
3. **Submeter protocolo ao CEP/CEUA ANTES de qualquer experimento** — prazo típico 2-3 meses.
4. **Montar cronograma + orçamento no formato dos editais FAPESP/CNPq** mesmo que não vá submeter — exercício que estrutura o projeto.
5. **Avançar para o Módulo 12 (Projeto Final)** — onde você entrega o documento completo do seu projeto pessoal, exportado em PDF/DOCX.
`,
  })

  console.log(`✓ M11 Desenvolvimento (${r.action}, ${r.summaryChars} chars)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
