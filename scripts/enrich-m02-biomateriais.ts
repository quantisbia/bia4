/**
 * R13.14.8 · Conteúdo denso do Módulo 02 — Biomateriais
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "biomateriais",
    lessonSlug: "biomateriais-aula-completa",
    order: 1,
    title: "Biomateriais — aula completa",
    durationMin: 85,
    level: "basic",
    youtubeId: "UDhVk6_c-C8", // mantém o existente
    biaHook: {
      tool: "formulator-pro",
      label: "Comparar biomateriais na BIA",
      params: { preset: "biomaterials-comparator" },
    },

    objective: `Dominar os fundamentos dos biomateriais usados em biofabricação — compreendendo origem (natural vs. sintético), classes químicas, propriedades mecânicas e biológicas, e critérios de escolha para cada aplicação.

Ao final desta aula você será capaz de:
1. Classificar biomateriais em polímeros naturais (colágeno, gelatina, alginato, ácido hialurônico, quitosana, fibrina) vs. sintéticos (PCL, PLA, PLGA, PEG) vs. híbridos (GelMA, PEGDA-colágeno).
2. Explicar o que é biocompatibilidade segundo a norma ISO 10993 e por que ela não é suficiente para garantir sucesso clínico.
3. Compreender o papel da Matriz Extracelular (MEC) descelularizada como "padrão-ouro" biológico e por que biomateriais sintéticos tentam mimetizar suas propriedades.
4. Reconhecer os principais ensaios de caracterização: mecânico (módulo elástico, resistência à tração), degradação (hidrólise, enzimática), biológico (viabilidade, adesão, proliferação).
5. Escolher o biomaterial adequado para o tecido-alvo com base em módulo elástico, taxa de degradação e sinais bioativos necessários.`,

    summary: `## Contexto

Um **biomaterial** é qualquer substância (natural, sintética ou híbrida) projetada para interagir com sistemas biológicos de forma a tratar, aumentar ou substituir tecido, órgão ou função do corpo. A definição formal foi consolidada pela **Williams Dictionary of Biomaterials (1999)** e reafirmada no [2nd Consensus Conference on Biomaterials Definitions, Chengdu, 2018](https://www.sciencedirect.com/science/article/pii/S0142961219301498): *"a material designed to take a form which, alone or as part of a complex system, is used to direct, by control of interactions with components of living systems, the course of any therapeutic or diagnostic procedure."*

O campo nasceu nas décadas de 1950-60 com a necessidade de implantes ortopédicos e cardiovasculares inertes (titânio, aço cirúrgico, Teflon vascular), evoluiu para biomateriais **bioativos** nos anos 1980 (biovidro de Hench, hidroxiapatita), e explodiu com a biofabricação a partir dos anos 2000 — passando da pergunta *"como ser inerte?"* para *"como instruir ativamente a célula a formar tecido?"*.

Hoje, biomateriais são classificados em **3 gerações**:
- **1ª geração** — bioinertes (minimizam reação): titânio, aço, polietileno UHMW, PTFE
- **2ª geração** — bioativos ou bioabsorvíveis (interagem com o tecido): biovidros, hidroxiapatita, PLA, PGA
- **3ª geração** — bioresponsivos / instrutivos (estimulam resposta celular específica): hidrogéis funcionalizados com RGD, GelMA, dECM, materiais responsivos a estímulos

Na biofabricação, trabalhamos quase exclusivamente com a **3ª geração**, especialmente **hidrogéis** — redes poliméricas tridimensionais capazes de absorver >90% de água, com propriedades mecânicas sintonizáveis e ambiente similar ao tecido mole nativo.

## Conceitos-chave

Os biomateriais usados em biofabricação se dividem em 3 grandes grupos:

1. **Polímeros naturais** — derivados de fontes biológicas (ECM animal, polissacarídeos de algas/crustáceos, proteínas plasmáticas). Vantagens: bioatividade intrínseca, baixa toxicidade, biodegradáveis. Desvantagens: variabilidade batch-to-batch, propriedades mecânicas limitadas, risco imunogênico (xenogênico).
   - **Colágeno tipo I** — proteína mais abundante do corpo; ideal para pele, osso, tendão. Reticulação por EDC/NHS ou genipina.
   - **Gelatina** — colágeno desnaturado (hidrolisado). Barata, imprimível, mas se dissolve a 37°C → precisa modificação (GelMA).
   - **Alginato** — polissacarídeo de alga parda. Reticulação instantânea com Ca²⁺. Barato, imprimível, mas inerte (precisa funcionalização com RGD para adesão celular).
   - **Ácido hialurônico (HA)** — glicosaminoglicano abundante na MEC. Bioativo via CD44. Modificações: HA-tiramina (reticulação enzimática), HAMA (foto-reticulação).
   - **Quitosana** — derivado da quitina (crustáceos). Antimicrobiana, catiônica (adere bem a células), mas difícil de solubilizar em pH fisiológico.
   - **Fibrina** — formada por polimerização de fibrinogênio + trombina. Autóloga (do próprio paciente), excelente adesão celular, mas degrada rápido (3-14 dias).

2. **Polímeros sintéticos** — produzidos por síntese química. Vantagens: reprodutibilidade exata, propriedades sintonizáveis, degradação controlada. Desvantagens: ausência de sinais bioativos (precisa funcionalizar), produtos de degradação podem ser ácidos.
   - **PCL (policaprolactona)** — degradação lenta (meses-anos); scaffolds rígidos para osso.
   - **PLA (ácido polilático)** — hidrólise libera ácido lático (acidifica meio local); FDA-aprovado.
   - **PLGA (ácido polilático-co-glicólico)** — razão LA:GA controla taxa de degradação (semanas-meses).
   - **PEG (polietilenoglicol)** — hidrofílico, "stealth" (baixa adsorção proteica); base para muitos hidrogéis sintéticos.
   - **Pluronic F-127** — gelificação termorreversível; usado como sacrificial para criar canais vasculares.

3. **Híbridos / funcionalizados** — combinam o melhor dos dois mundos.
   - **GelMA (Gelatin Methacryloyl)** — gelatina + grupos metacrilato; foto-reticulação UV/azul. Padrão de ouro em bioimpressão (Yue et al., 2015).
   - **PEGDA (PEG diacrilato)** — PEG + grupos acrílicos reticuláveis por luz.
   - **dECM (decellularized ECM)** — tecido descelularizado quimicamente/enzimaticamente, mantendo arquitetura e sinais bioativos nativos (ex: QMatrix Quantis).
   - **GelMA-HAMA** — combina rigidez da gelatina com bioatividade do HA.

## Propriedades que determinam a escolha

Para cada aplicação, 4 propriedades mandam na escolha:

| Propriedade | O que mede | Faixa típica (hidrogéis) | Como testar |
|---|---|---|---|
| **Módulo elástico (E)** | Rigidez | 0,1–100 kPa | Reômetro oscilatório, DMA, AFM |
| **Taxa de degradação** | Tempo de desaparecimento | Horas-meses | Perda de massa, SEM temporal |
| **Swelling ratio** | Absorção de água | 5–50x peso seco | Pesagem seca vs. intumescida |
| **Porosidade** | % volume de vazios | 40–95% | μCT, intrusão de mercúrio |

**Regra prática do matching mecânico** (Discher et al., Science 2005): o módulo elástico do scaffold deve ser próximo ao do tecido-alvo, caso contrário as células mudam de linhagem.
- Cérebro: 0,1–1 kPa
- Músculo liso: 8–17 kPa
- Pele: 2–20 kPa
- Músculo esquelético: 10–20 kPa
- Osso trabecular: 1–10 GPa (10⁶ kPa)

## Distinções que geram confusão (atenção!)

| Termo | Escopo | Exemplo |
|---|---|---|
| **Biomaterial** | Substância projetada para interagir com sistema biológico | GelMA, PCL, hidroxiapatita |
| **Biotinta (bioink)** | Biomaterial + células, formulado para bioimpressão | GelMA 10% + L929 (5×10⁶/mL) + fotoiniciador |
| **Scaffold** | Estrutura 3D porosa (biomaterial sem células, implantada antes do povoamento) | PCL impresso para enxerto ósseo |
| **MEC descelularizada (dECM)** | Tecido animal com células removidas, mantendo arquitetura | SIS porcina, QMatrix, Matrigel® |

**Confusão clássica #1: biodegradável vs. bioreabsorvível**
- **Biodegradável** — se quebra em pedaços menores no corpo (não implica absorção)
- **Bioreabsorvível** — degrada E os produtos são metabolizados/eliminados pelo corpo (PLA, PGA)

Nem todo biodegradável é bioreabsorvível. Teflon degradado forma microfragmentos que ficam no tecido para sempre.

**Confusão clássica #2: biocompatibilidade NÃO É "não tóxico"**

A ISO 10993 define biocompatibilidade como *"ability of a material to perform with an appropriate host response in a specific application"*. Isso é contexto-dependente: um material pode ser biocompatível para implante dentário e tóxico para contato com sangue. **Sempre pergunte: biocompatível para QUÊ, em QUAL tecido, por QUANTO TEMPO.**

**Confusão clássica #3: Matrigel® não é padrão de ouro universal**

Matrigel® é um extrato de MEC do tumor murino Engelbreth-Holm-Swarm. Rico em laminina, colágeno IV, entactina, perlecan. **Problemas**:
- Variabilidade altíssima entre lotes (~2× diferença)
- Composição heterogênea e mal definida
- Origem tumoral (não é fisiológica)
- Reatividade cruzada em testes de câncer

Para reprodutibilidade e aplicação clínica, preferir **dECM tissue-specific** (ex: QMatrix humano para esferoides, SIS porcino para pele).

## Desafios técnicos

1. **Variabilidade entre lotes** — colágeno e gelatina mudam propriedades reológicas entre lotes do mesmo fornecedor. Sempre caracterize antes de usar e documente o lot number nas publicações.

2. **Equilíbrio reologia × viabilidade** — biomaterial precisa ser viscoso o suficiente para manter forma, mas não tão viscoso que o shear stress na extrusão mate as células (Blaeser et al., 2016 mostrou shear >5 kPa → >20% morte).

3. **Produtos ácidos de degradação** — PLA, PGA e PLGA liberam ácido lático/glicólico, que podem baixar pH local para 4-5 e matar células vizinhas. Blendar com materiais tamponantes (hidroxiapatita, carbonato de cálcio).

4. **Esterilização sem destruir o material** — autoclave (121°C) desnatura proteínas. Alternativas: filtração 0,22 μm (líquidos), EtO (resíduos tóxicos), γ (radicals), e-beam. Cada método muda propriedades do material — teste depois de esterilizar.

5. **Vascularização de constructos espessos** — qualquer tecido >200 μm precisa de rede capilar. Sem ela, núcleo necrosa por hipóxia (Rouwkema et al., 2008). Estratégias: biomateriais sacrificiais (Pluronic), canais pré-impressos, co-cultura com HUVEC/pericitos.

6. **Imunogenicidade de materiais xenogênicos** — colágeno bovino, Matrigel® (murino), SIS (porcino) podem gerar resposta imune mesmo após descelularização. Resíduos de DNA >50 ng/mg disparam TLR9.

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros que causam problemas reais:**

1. **Usar gelatina pura e esperar que mantenha estrutura a 37°C** — gelatina derrete acima de ~30°C. Para cultura celular, só serve se for GelMA (reticulada).

2. **Não caracterizar módulo elástico antes de bioimprimir** — se o scaffold está muito rígido para o tecido-alvo, células-tronco mudam linhagem (hepatócitos viram miócitos em substrato muscular, por exemplo).

3. **Confiar na biocompatibilidade "do fabricante" sem testes locais** — mesmo material pode ser biocompatível com uma linhagem e tóxico com outra; teste MTT/live-dead com suas células.

4. **Blendas sem gradientes de concentração** — misturar 2 polímeros em 1 proporção fixa e esperar que resolva tudo. Faça varredura (ex: GelMA 5%, 10%, 15% + HAMA 0,5%, 1%, 2%) e mapeie viabilidade × mecânica.

5. **Ignorar o inchamento (swelling)** — biomaterial recém-impresso tem X mm; após 24h em meio, pode ter 1,5X mm. Projete arquitetura considerando o swelling.

6. **Comprar colágeno sem especificar origem/tipo** — colágeno "I" bovino tendão ≠ colágeno "I" rat tail ≠ colágeno recombinante humano. Propriedades mecânicas e imunogenicidade variam drasticamente.

## Artigos recomendados

**Williams DF · 2008**
On the mechanisms of biocompatibility.
📰 *Biomaterials*
DOI: [10.1016/j.biomaterials.2008.04.023](https://doi.org/10.1016/j.biomaterials.2008.04.023)

**Yue K et al. · 2015**
Synthesis, properties, and biomedical applications of gelatin methacryloyl (GelMA) hydrogels.
📰 *Biomaterials*
DOI: [10.1016/j.biomaterials.2015.08.045](https://doi.org/10.1016/j.biomaterials.2015.08.045)

**Discher DE, Janmey P, Wang Y · 2005**
Tissue cells feel and respond to the stiffness of their substrate.
📰 *Science*
DOI: [10.1126/science.1116995](https://doi.org/10.1126/science.1116995)

**Hoshiba T · 2017**
Decellularized extracellular matrix for cancer research.
📰 *Materials*
DOI: [10.3390/ma12081125](https://doi.org/10.3390/ma12081125)

**Crapo PM, Gilbert TW, Badylak SF · 2011**
An overview of tissue and whole organ decellularization processes.
📰 *Biomaterials*
DOI: [10.1016/j.biomaterials.2011.01.057](https://doi.org/10.1016/j.biomaterials.2011.01.057)

**Rouwkema J, Rivron NC, van Blitterswijk CA · 2008**
Vascularization in tissue engineering.
📰 *Trends in Biotechnology*
DOI: [10.1016/j.tibtech.2008.04.009](https://doi.org/10.1016/j.tibtech.2008.04.009)

## Principais pesquisadores do campo

- **David F. Williams** (Wake Forest, EUA) — "pai" da terminologia de biomateriais; organizador das Consensus Conferences
- **Stephen Badylak** (University of Pittsburgh) — pioneiro de SIS e dECM; fundador da ACell
- **Robert Langer** (MIT) — biomateriais poliméricos e drug delivery; +1500 artigos, >400 patentes
- **Larry Hench** (†2015) — descobriu o Bioglass® 45S5 em 1969
- **Ali Khademhosseini** (Terasaki Institute) — padronizou GelMA; +1200 artigos em bioimpressão
- **Jennifer Lewis** (Harvard) — pioneira em DIW (direct ink writing) e órgãos impressos vascularizados
- **Dietmar W. Hutmacher** (QUT, Austrália) — scaffolds de PCL para osso em escala clínica

## Congressos e sociedades científicas

**Internacionais:**
- **World Biomaterials Congress (WBC)** — maior evento mundial, quadrienal (próximo: 2028)
- **Society for Biomaterials (SFB) Annual Meeting** — EUA, anual
- **European Society for Biomaterials (ESB) Annual Conference** — Europa, anual
- **TERMIS World Congress** — trienal (biomateriais + eng. tecidual integrados)
- **International Conference on Biofabrication (ISBF)** — anual

**Nacionais/Latam:**
- **Sociedade Brasileira de Biomateriais, Órgãos Artificiais e Engenharia de Tecidos (SLABO)** — anual, rotativa Latam
- **Encontro Anual SBB** — Brasil, outubro
- **CBEB — Congresso Brasileiro de Engenharia Biomédica** — bienal

**Periódicos essenciais para acompanhar:**
- *Biomaterials* (Elsevier, IF ~14)
- *Acta Biomaterialia* (Elsevier, IF ~10)
- *Biofabrication* (IOP, IF ~11)
- *Advanced Healthcare Materials* (Wiley, IF ~11)
- *Journal of Biomedical Materials Research Part A* (Wiley, IF ~4)

## Próximos passos de estudo

1. Ler os papers de Williams (2008) e Yue et al. (2015) — base conceitual + GelMA aplicado.
2. Abrir a **Biblioteca da BIA Academy** e revisar a aba "Papers & Patentes" filtrando por "Biomateriais".
3. Usar o **Formulator Pro** na BIA para comparar hidrogéis (GelMA, Alginato, Colágeno) para o seu tecido-alvo.
4. Baixar o white paper **QMatrix** da biblioteca para ver dECM aplicado a esferoides.
5. Avançar para o Módulo 3 (Biotintas) — onde esses biomateriais ganham vida com células.
`,
  })

  console.log(`✓ M02 Biomateriais (${r.action}, ${r.summaryChars} chars)`)
}

main().catch(e => { console.error(e); process.exit(1) })
