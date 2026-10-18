/**
 * R13.14.8 · Conteúdo denso do Módulo 06 — Células (2 aulas: cultivo + esferoides)
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r1 = await upsertLessonBySlug({
    moduleSlug: "celulas",
    lessonSlug: "cultivo-2d-3d",
    order: 1,
    title: "Cultivo Celular 2D e 3D — fundamentos e limitações",
    durationMin: 75,
    level: "basic",
    youtubeId: "H8zEcZyvqhE", // mantém o existente
    biaHook: { tool: "chat", label: "Perguntar à BIA sobre protocolos de cultivo", params: { context: "cell-culture" } },

    objective: `Dominar os fundamentos do cultivo celular em 2D e 3D, entendendo quando usar cada abordagem e por que o 2D "clássico" não representa a biologia real do tecido.

Ao final desta aula você será capaz de:
1. Classificar os principais tipos celulares usados em biofabricação (primárias, linhagens, iPSC, MSC) por fonte, imortalização e aplicação.
2. Explicar as diferenças biológicas entre cultivo 2D e 3D: polaridade, morfologia, expressão gênica, resposta a fármacos.
3. Reconhecer as 5 abordagens de cultivo 3D (esferoides, organoides, scaffold-based, microfluídica, bioimpressos) e saber quando aplicar cada uma.
4. Documentar protocolo reprodutível de passagem, criopreservação e descongelamento.
5. Validar identidade e qualidade celular (STR, microplasma, viabilidade, cariótipo).`,

    summary: `## Contexto

**Cultivo celular** é o conjunto de técnicas que mantém células vivas e proliferativas fora do organismo. Foi padronizado por George Gey em 1951 (HeLa), e desde então evoluiu de uma arte artesanal para uma disciplina reprodutível, fundamental para pesquisa básica, drug screening, fabricação de vacinas, terapia celular e biofabricação.

Durante décadas, "cultivo celular" significou **monocamada em 2D** — células aderidas em plástico de poliestireno tratado (TCPS, Falcon/Corning), em meio líquido com soro fetal bovino. Essa abordagem foi revolucionária, mas tem uma limitação profunda: **células in vivo não vivem em 2D**. Elas vivem em um ambiente 3D, cercadas por matriz extracelular, com polaridade apical-basal, interações multidirecionais com vizinhas e gradientes de nutrientes/oxigênio.

A partir dos anos 2000, com o avanço dos hidrogéis e do bioprinting, o **cultivo 3D** passou de nicho acadêmico para padrão em várias áreas (hepatologia, oncologia, neurociência). A revisão clássica de [Pampaloni et al. (Nature Reviews Molecular Cell Biology, 2007)](https://doi.org/10.1038/nrm2236) consolidou a mensagem: *"the third dimension of cell culture matters"*.

Em biofabricação, 3D não é opcional — é a razão de existir da área. Todo constructo bioimpresso é, por definição, cultivo 3D. Mas as células chegam ao bioink via cultivo 2D (expansão), então dominar os dois é mandatório.

## Conceitos-chave

### Classes principais de células em biofabricação

| Classe | Fonte | Imortalização | Vantagens | Limitações |
|---|---|---|---|---|
| **Primárias** | Biópsia / doador | Nenhuma (passagens limitadas, 10-20) | Fenótipo real do tecido | Variabilidade, difícil obter, finitas |
| **Linhagens estabelecidas** | Imortalização (vírus, oncogenes) | Sim | Infinita, reprodutível, barata | Alteração genética, longe do fenótipo real |
| **iPSC (induced pluripotent)** | Reprogramação de células adultas (Yamanaka 4 fatores) | Pluripotente | Qualquer tipo celular, autólogas, infinitas | Caras, protocolo de diferenciação complexo |
| **MSC (mesenchymal stem cells)** | Medula óssea, tecido adiposo, cordão umbilical | Multipotente (osso, cartilagem, adipo, mio) | Fácil obter, imunomoduladoras | Heterogêneas, perdem potencial com passagens |
| **ESC (embryonic stem cells)** | Blastocistos | Pluripotentes | Qualquer tipo celular | Questões éticas, teratomas |

### Linhagens celulares comuns em biofabricação

| Linhagem | Origem | Tipo | Uso principal |
|---|---|---|---|
| **L929** | Fibroblasto murino (NCTC) | Linhagem | Testes de citotoxicidade (ISO 10993-5) |
| **NIH-3T3** | Fibroblasto embrionário murino | Linhagem | Transfecção, controle |
| **HEK293** | Rim embrionário humano | Linhagem | Produção de proteínas, vírus |
| **HeLa** | Cérvice (câncer, Henrietta Lacks) | Linhagem | Controle histórico |
| **MG-63** | Osteossarcoma humano | Linhagem | Modelo osteoblasto |
| **MC3T3-E1** | Calvária murina | Linhagem | Diferenciação osteogênica |
| **ATDC5** | Teratoma murino | Linhagem | Condrogênese |
| **HepG2** | Hepatocarcinoma humano | Linhagem | Modelos hepáticos |
| **HUVEC** | Veia umbilical humana | Primária | Endotelial, angiogênese |
| **hMSC-BM** | Medula óssea humana | Primária multipotente | Terapia celular |

### Cultivo 2D vs. 3D — por que o 3D é diferente

A diferença não é só a geometria. 3D muda **biologia** profundamente:

| Aspecto | 2D | 3D |
|---|---|---|
| **Morfologia** | Achatada, espraiada (artificial) | Volumosa, polarizada (fisiológica) |
| **Polaridade** | Única (apical/basal perdida) | Preservada (importante para epitélio) |
| **Expressão gênica** | ~1000 genes diferentemente expressos vs. in vivo | Mais próxima do in vivo |
| **Resposta a fármacos** | Hipersensível (sem barreira de MEC) | Realista (gradientes de penetração) |
| **Proliferação** | Alta, uniforme | Variável (gradientes de O₂, nutrientes) |
| **Diferenciação** | Tende a desdiferenciar | Mantida (hepatócitos continuam funcionais) |
| **Cross-talk celular** | Limitado (só vizinhos laterais) | Completo (3 dimensões) |

Em oncologia, isso tem implicação direta: fármacos aprovados em 2D falham em 70% dos ensaios clínicos (Breslin & O'Driscoll, 2013). Esferoides 3D são hoje considerados padrão para drug screening (ver aula 2 deste módulo).

### As 5 abordagens de cultivo 3D

1. **Esferoides scaffold-free** — células agregadas por gravidade (hanging drop), força (microagitação) ou impedimento de adesão (ultra-low attachment plates). Simples, reprodutível, barato. Melhor para proof-of-concept, drug screening.

2. **Organoides** — mini-tecidos auto-organizados a partir de stem cells + matriz (Matrigel/MEC) + fatores de crescimento. Mais complexos, reproduzem arquitetura de órgão. Caros, demorados (semanas-meses). Hoje: organoide intestinal, hepático, cerebral, renal, mamário, pancreático.

3. **Scaffold-based** — células semeadas em scaffold pré-fabricado (PCL, hidroxiapatita, dECM). Boa integração em implantes. Usado em osso, cartilagem, pele.

4. **Microfluídica (organ-on-chip)** — células em microcanais com perfusão controlada. Simula fluxo sanguíneo, gradientes. Melhor para farmacologia, toxicologia. Marcas: Emulate, Mimetas, TissUse.

5. **Bioimpressos** — células encapsuladas em biotinta + impressão camada por camada. Permite arquiteturas complexas, personalização. Esta é a abordagem central da BIA Academy.

## Distinções que geram confusão (atenção!)

### Linhagem imortalizada ≠ célula primária

Linhagem **HepG2 ≠ hepatócito primário humano**. HepG2 vem de hepatocarcinoma, tem cariótipo alterado, expressa 60% menos CYP3A4 (enzima chave de metabolismo). Para toxicologia hepática real, usar hepatócitos primários ou organoides.

### Passagem baixa ≠ célula "fresca"

**Passagem** é o número de vezes que a cultura foi dividida. Linhagens: estáveis até P50+. **Primárias**: começam a mudar fenótipo a partir de P5-P10 (senescência, derivação). **MSC**: perde potencial multipotente após P5-P7.

Documentar passagem em TODA publicação. "Usei MSC-BM" é insuficiente. Correto: "hMSC-BM (Lonza, lote #12345), P4".

### Sorólogica (identidade STR) vs. caracterização funcional

**STR profiling** = identificação molecular da linhagem (comparar com banco ATCC). Testa IDENTIDADE, não função. Uma HepG2 pode ter STR correto mas estar com cariótipo alterado após 20 passagens e já não funcionar como hepatócito. Fazer AMBOS: STR + ensaio funcional (expressão de marcadores, resposta a estímulo).

### Contaminação por micoplasma

**Micoplasma é a praga invisível** do cultivo celular. Não forma turbidez, não muda cor do meio, só altera funções sutilmente (proliferação, resposta a drogas). Estima-se que **15-35% das culturas em labs ao redor do mundo estão contaminadas** (Nikfarjam & Farzaneh, 2012).

**Testar mensalmente**: PCR (MycoAlert®, kit Lonza), coloração Hoechst, qPCR específico. Linhagens novas: testar antes de qualquer experimento.

### Soro fetal bovino (FBS/SFB) é um pesadelo de reprodutibilidade

FBS é extrato indefinido com 1000+ proteínas, lote a lote variável (até 2× diferença em fatores de crescimento), questões éticas (coleta de feto bovino). **Alternativas**:
- **Human Platelet Lysate (hPL)** — expansão de MSC humanas (compliance clínica)
- **Serum-free media** — meios definidos (ex: StemPro, mTeSR, DMEM-F12 com suplementos)
- **Chemically defined media** — todos os componentes conhecidos (padrão para GMP)

## Desafios técnicos

1. **Variabilidade entre lotes de FBS** — mesmo "FBS premium" varia 20-40% em desempenho entre lotes. Reservar lote grande antecipado para projeto inteiro.

2. **Transição 2D → 3D** — células expandidas em 2D podem resistir à transição para 3D (demoram dias para se adaptar). Pré-condicionar em meio 3D-compatible.

3. **Choque mecânico na tripsinização** — tripsina em excesso ou tempo >5 min danifica receptores de membrana. Preferir TrypLE® ou Accutase (gentis).

4. **Perda de fenótipo com passagens** — MSC perde multipotência; hepatócitos perdem CYP; osteoblastos perdem mineralização. Usar passagens baixas.

5. **Contaminações** — bactérias (turbidez, pH ácido), fungos (filamentos visíveis), micoplasma (invisível, insidioso). Rotinas: fluxo laminar, antibiótico profilático (debate: inibe detecção de contaminação sub-clínica), testes mensais.

6. **Criopreservação com perda de viabilidade** — descongelamento rápido (37°C em <2 min), lavar DMSO imediatamente (tóxico a 37°C). Taxa de congelamento: -1°C/min (freezer isopropanol).

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros clássicos:**

1. **Não documentar lote, passagem, origem** — "usei HepG2" é insuficiente. Correto: "HepG2 (ATCC HB-8065, lote XYZ, P15)".

2. **Confundir cultivo em suspensão com cultivo 3D** — células em suspensão (CHO, HEK suspensas) ainda são "2D biologicamente" (sem matriz, sem polaridade).

3. **Semear em alta densidade "pra ir rápido"** — células confluentes param de proliferar e começam a diferenciar/senescer. Manter 60-80% confluência em expansão.

4. **Esquecer de testar micoplasma** — pode ter contaminação crônica mascarando resultados por meses.

5. **Usar antibiótico sempre** — Pen-Strep rotineiro mascara contaminação sub-clínica. Preferir cultivo clean + testes regulares.

6. **Não validar identidade por STR** — células podem contaminar-se cruzadamente entre culturas (ex: HeLa já contaminou 20+ linhagens). Fazer STR anualmente.

7. **Imprimir biotinta com células que acabaram de descongelar** — células precisam de 1-2 passagens para recuperar após descongelamento. Usar células pós-passagem 2.

## Artigos recomendados

**Pampaloni F, Reynaud EG, Stelzer EHK · 2007**
The third dimension bridges the gap between cell culture and live tissue.
📰 *Nature Reviews Molecular Cell Biology*
DOI: [10.1038/nrm2236](https://doi.org/10.1038/nrm2236)

**Breslin S, O'Driscoll L · 2013**
Three-dimensional cell culture: the missing link in drug discovery.
📰 *Drug Discovery Today*
DOI: [10.1016/j.drudis.2012.10.003](https://doi.org/10.1016/j.drudis.2012.10.003)

**Takahashi K, Yamanaka S · 2006**
Induction of pluripotent stem cells from mouse embryonic and adult fibroblast cultures.
📰 *Cell*
DOI: [10.1016/j.cell.2006.07.024](https://doi.org/10.1016/j.cell.2006.07.024) (Nobel 2012)

**Nikfarjam L, Farzaneh P · 2012**
Prevention and detection of mycoplasma contamination in cell culture.
📰 *Cell Journal*
PMID: [23091782](https://pubmed.ncbi.nlm.nih.gov/23091782/)

**Freshney RI · 2016**
Culture of Animal Cells: A Manual of Basic Technique and Specialized Applications, 7th Ed.
📘 Livro-texto (Wiley) — bíblia do cultivo celular

**Lancaster MA, Knoblich JA · 2014**
Organogenesis in a dish: Modeling development and disease using organoid technologies.
📰 *Science*
DOI: [10.1126/science.1247125](https://doi.org/10.1126/science.1247125)

## Principais pesquisadores do campo

- **Shinya Yamanaka** (Kyoto) — Nobel 2012, descobriu iPSC
- **Hans Clevers** (Hubrecht Institute) — pioneiro em organoides intestinais
- **Madeline Lancaster** (MRC-LMB Cambridge) — primeiros organoides cerebrais
- **Jennifer Doudna** (UC Berkeley) — CRISPR em células humanas (Nobel 2020)
- **Donald E. Ingber** (Harvard Wyss) — organ-on-chip, mecanobiologia
- **Rudolf Jaenisch** (Whitehead/MIT) — epigenética, iPSC

## Congressos e sociedades científicas

**Internacionais:**
- **ISSCR Annual Meeting** (International Society for Stem Cell Research) — anual
- **Society for In Vitro Biology (SIVB)** — anual, foco em cultivo
- **Cell Culture World Congress** — anual, aplicado à indústria
- **AACR Annual Meeting** (câncer, muito 3D culture) — anual

**Nacionais:**
- **SBBC — Sociedade Brasileira de Biologia Celular** — anual
- **CBPCM — Congresso Brasileiro de Patologia Clínica/Medicina Laboratorial** — anual
- **ANPEPq SBG** — Genética, usa muito cultivo

**Recursos essenciais:**
- **ATCC (American Type Culture Collection)** — banco de linhagens com dados detalhados
- **ECACC** — European Collection of Authenticated Cell Cultures
- **Cellosaurus** — database colaborativo de linhagens celulares
- **Bio-protocol** — protocolos passo-a-passo revisados por pares

## Próximos passos de estudo

1. Ler Pampaloni et al. (2007) — por que a 3ª dimensão importa.
2. Fazer teste de micoplasma na sua cultura atual (se nunca fez).
3. Documentar identidade STR das linhagens que você usa (ou pedir ao ATCC).
4. Avançar para **Aula 2 deste módulo (Esferoides)** — primeira abordagem 3D prática.
5. Explorar o Chat IA da BIA para tirar dúvidas de protocolos específicos.
`,
  })
  console.log('✓ M06 L1 Cultivo 2D e 3D (' + r1.action + ', ' + r1.summaryChars + ' chars)')

  const r2 = await upsertLessonBySlug({
    moduleSlug: "celulas",
    lessonSlug: "esferoides",
    order: 2,
    title: "Esferoides — building blocks da biofabricação scaffold-free",
    durationMin: 70,
    level: "intermediate",
    youtubeId: "7eZiWkcLE18", // mantém o existente
    biaHook: { tool: "organoids", label: "Projetar esferoide na BIA (Organoid Builder)", params: { preset: "spheroid-standard" } },

    objective: `Dominar a formação, caracterização e aplicação de esferoides celulares — a abordagem 3D scaffold-free mais usada em drug screening, modelagem de doença e building blocks para bioassembly.

Ao final desta aula você será capaz de:
1. Diferenciar esferoide de organoide (confusão clássica!) e saber quando usar cada um.
2. Comparar os 4 métodos de formação (hanging drop, ultra-low attachment, microagitação, microfluidica) por reprodutibilidade, custo e escala.
3. Caracterizar esferoides: diâmetro, esfericidade, viabilidade, núcleo necrótico, gradientes de O₂.
4. Reconhecer quando células têm baixa capacidade de agregação (ex: L929) e as estratégias para resgatar (MEC, dECM, QMatrix).
5. Projetar protocolo reprodutível para seu modelo de interesse (câncer, hepatócito, condrócito).`,

    summary: `## Contexto

**Esferoides** são agregados celulares esféricos tridimensionais, formados pela aproximação espontânea de células em condições que impedem adesão a uma superfície plana. Diferente de uma simples suspensão celular, no esferoide as células estabelecem **junções célula-célula**, secretam **matriz extracelular endógena**, e desenvolvem **gradientes de nutrientes e oxigênio** semelhantes aos de um micro-tecido real.

O conceito foi introduzido por **Robert Sutherland** nos anos 1970 como *multicellular tumor spheroids (MTS)* — mini-tumores em bancada que respondem a quimioterapia de forma mais fisiológica que monocamada 2D ([Sutherland et al., 1971](https://doi.org/10.1093/jnci/46.1.113)). Desde então, esferoides tornaram-se o modelo **3D mais usado no mundo**, especialmente em oncologia (drug screening pré-clínico), hepatologia (teste de toxicidade), condrologia (reparo de cartilagem).

Em biofabricação, esferoides são ainda mais importantes: eles podem servir como **building blocks** para montar tecidos maiores (bioassembly) via técnicas como **scaffold-free bioprinting** (Nakayama, Kenzan method) ou embedding em biotintas. A Quantis desenvolveu o **QMatrix** especificamente para resolver o problema de células com baixa capacidade de formar esferoides (ver white paper aberto na biblioteca).

## Conceitos-chave

### Formação de esferoides — 4 métodos principais

| Método | Mecanismo | Prós | Contras | Marcas |
|---|---|---|---|---|
| **Hanging drop** | Gota invertida (gravidade concentra células no vértice) | Simples, reprodutível, barato | Baixo throughput, difícil troca de meio | 3D Biomatrix, InSphero |
| **Ultra-low attachment (ULA)** | Placas revestidas (hidrogel) impedem adesão | Alto throughput (96/384 wells), troca de meio fácil | Esferoides heterogêneos | Corning, Nunc, S-Bio |
| **Microagitação (spinner/orbital)** | Fluxo mantém células em suspensão → colidem e agregam | Escalável (bioreator), produção massiva | Esferoides irregulares, cisalhamento | Rotary cell culture |
| **Microfluídica** | Chips com câmaras de agregação | Precisão de tamanho, análise acoplada | Caro, baixo throughput | GRI Mimetas |

### Fisiologia do esferoide — por que ele é "quase tecido"

Em esferoides >200 μm, aparecem **3 zonas concêntricas** por difusão limitada:

| Zona | Posição | Características |
|---|---|---|
| **Camada externa** | 0-100 μm da superfície | Alta O₂, alta glicose, alta proliferação (fase S/M) |
| **Camada intermediária** | 100-200 μm | Baixa O₂, quiescência (fase G0) |
| **Núcleo necrótico** | > 200-250 μm | Hipóxia severa, apoptose/necrose |

Essa estrutura **mimetiza microtumores** (zonas vascularizadas vs. hipóxicas) e permite estudar fenômenos reais: resistência a drogas por limitação de penetração, nicho de células-tronco quiescentes, resposta a antiangiogênicos.

### Esferoide ≠ organoide — a confusão clássica

| Característica | Esferoide | Organoide |
|---|---|---|
| **Composição** | 1 tipo celular (ou poucos co-cultivados) | Vários tipos (derivados de stem cells pluripotentes) |
| **Organização** | Esfera homogênea | Arquitetura de órgão (ductos, lúmen, zonas) |
| **Matriz** | MEC endógena (secretada pelas células) | Matriz exógena (Matrigel, dECM) + autoproduzida |
| **Função** | Modelo tissular simples | Mini-órgão funcional |
| **Tempo de formação** | 1-7 dias | 2-8 semanas |
| **Custo** | Baixo | Alto |
| **Reprodutibilidade** | Alta | Média (variabilidade entre batches) |
| **Exemplo** | HepG2 em ULA, L929 agregada | Organoide intestinal de iPSC, mini-cérebro |

### Caracterização obrigatória de esferoides

Nunca publique esferoides sem reportar **4 parâmetros**:

1. **Diâmetro** (média ± desvio) — microscopia + ImageJ/CellProfiler
2. **Esfericidade** (0 = linear, 1 = esfera perfeita) — fórmula de Wadell ou análise de projeção
3. **Viabilidade** (% células vivas) — Live/Dead (Calcein/EthD), MTT, luminescência (CellTiter-Glo)
4. **Núcleo necrótico** (presente/ausente, tamanho) — H&E, IHC para HIF-1α

Opcional (recomendado para publicação Q1):
- Expressão de marcadores (RT-qPCR ou IHC)
- Resposta funcional (ex: albumina para hepatócitos, GAG para condrócitos)
- Taxa de secreção de MEC (hidroxiprolina para colágeno)

## Distinções que geram confusão (atenção!)

### Agregado ≠ esferoide

Simples ajuntamento de células por gravidade (ex: amostra deixada no fundo de um tubo) **não é esferoide**. Falta:
- Junções célula-célula estabelecidas (caderinas, conexinas)
- MEC endógena secretada
- Compactação (esfericidade >0,8)
- Tempo mínimo (24-48h)

### Nem toda célula forma esferoide

Linhagens com **baixa expressão de caderinas** (ex: fibroblastos L929, HEK293T) ou **baixa produção de MEC endógena** falham em agregar sozinhas. Soluções:
1. **Adicionar MEC exógena** (Matrigel 1-5%, colágeno 100-500 μg/mL)
2. **Usar dECM** (ex: QMatrix 200 μg/mL — ver white paper QMatrix)
3. **Pré-tratar com fatores de agregação** (TGF-β, dexametasona)
4. **Aumentar densidade inicial** (10³-10⁴ células/well)

Caso real documentado: **L929 em placa ULA sozinha → agregado frouxo, esfericidade 0,52**. Mesma célula em L929 + QMatrix 200 μg/mL → **esferoide compacto, esfericidade 0,95 em 24h** (QMatrix White Paper, Leichtweis & Guarnier 2026).

### Tamanho ótimo é tecido-específico

- **Hepatócitos (HepG2)** — 150-200 μm (acima disso: núcleo necrótico mascara função)
- **Condrócitos** — 200-400 μm (precisam de nicho hipóxico interno para condrogênese)
- **Tumores (câncer)** — 400-800 μm (reproduzir heterogeneidade tumoral)
- **MSC para osteogênese** — 300-500 μm (gradientes dirigem diferenciação)

### Resposta a drogas em esferoide ≠ resposta em 2D

Esferoide tem **penetração limitada de drogas** por 2 razões:
1. **Difusão** — fármaco precisa passar camada por camada; grandes moléculas (anticorpos) demoram horas-dias
2. **Pressão intratumoral** — densidade celular comprime vasos (in vivo) e canais (in vitro)

Resultado: **IC50 em esferoide costuma ser 5-100× maior que em 2D** para a mesma droga. É isso que faz esferoides preditivos para clínica — a droga que mata em 2D muitas vezes não funciona in vivo porque não penetra.

## Desafios técnicos

1. **Heterogeneidade de tamanho** — placas ULA produzem esferoides com desvio padrão alto. Para reprodutibilidade, filtrar por tamanho (strainer) ou usar hanging drop com volume preciso.

2. **Troca de meio sem perder esferoide** — pipetar meio sobre esferoide livre pode dispersá-lo. Técnicas: inclinar placa, usar pipeta multicanal com cuidado, trocar 50% do volume por vez.

3. **Core necrótico em esferoides grandes** — >250 μm sempre tem hipóxia central. Se o estudo exige esferoide "100% vivo", limitar a <200 μm.

4. **Dificuldade de análise microscópica profunda** — fluorescência atenua >100 μm de profundidade. Alternativas: light-sheet microscopy, clareamento ótico (CLARITY, iDISCO), confocal com objetivas de longa distância.

5. **Transfecção/edição em esferoide** — vírus e lipossomas penetram só na camada externa. Para edição completa, transfectar ANTES de agregar (em 2D), depois formar esferoide.

6. **Co-cultivo em esferoide** — misturar 2 tipos celulares em proporção fixa é fácil, mas garantir distribuição espacial controlada é difícil. Técnicas: layer-by-layer (adicionar células em etapas), coating diferencial.

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros frequentes:**

1. **Confundir agregado frouxo com esferoide** — se desmanchar ao bater o tubo, não é esferoide maduro. Esperar 48h+.

2. **Esperar formação instantânea** — esferoides demoram 24-72h para compactar. Não analisar antes de 48h.

3. **Não caracterizar esfericidade** — publicar "esferoides de 300 μm" sem reportar esfericidade (0,52? 0,95?) deixa resultados não reprodutíveis.

4. **Semear células demais (>10⁴/well)** — esferoide grande demais → necrose precoce no núcleo → viabilidade falsa.

5. **Usar meio padrão 2D em cultivo 3D prolongado** — esferoides consomem meio rapidamente; trocar a cada 48-72h, não 7 dias.

6. **Querer esferoide de L929, HEK293 sem suplementação** — essas linhagens têm baixa MEC endógena. Sem Matrigel/dECM/QMatrix, fica agregado frouxo.

7. **Analisar só diâmetro, ignorar viabilidade/estrutura** — esferoide pode ter 300 μm e estar 50% morto no centro. Usar Live/Dead + microscopia Z-stack.

## Artigos recomendados

**Sutherland RM et al. · 1971**
A multi-component radiation survival curve using an in vitro tumour model.
📰 *Journal of the National Cancer Institute*
DOI: [10.1093/jnci/46.1.113](https://doi.org/10.1093/jnci/46.1.113)

**Friedrich J, Seidel C, Ebner R, Kunz-Schughart LA · 2009**
Spheroid-based drug screen: considerations and practical approach.
📰 *Nature Protocols*
DOI: [10.1038/nprot.2008.226](https://doi.org/10.1038/nprot.2008.226)

**Hirschhaeuser F et al. · 2010**
Multicellular tumor spheroids: an underestimated tool is catching up again.
📰 *Journal of Biotechnology*
DOI: [10.1016/j.jbiotec.2010.01.012](https://doi.org/10.1016/j.jbiotec.2010.01.012)

**Mehta G et al. · 2012**
Opportunities and challenges for use of tumor spheroids as models to test drug delivery and efficacy.
📰 *Journal of Controlled Release*
DOI: [10.1016/j.jconrel.2012.04.045](https://doi.org/10.1016/j.jconrel.2012.04.045)

**Zanoni M et al. · 2016**
3D tumor spheroid models for in vitro therapeutic screening.
📰 *Scientific Reports*
DOI: [10.1038/srep19103](https://doi.org/10.1038/srep19103)

**Leichtweis K, Guarnier L · 2026**
QMatrix: Agregação de esferoides em células com baixa produção de matriz extracelular.
📰 *Quantis Biotechnology White Paper* (disponível na biblioteca Academy)

## Principais pesquisadores do campo

- **Robert Sutherland** (†1988) — inventor do conceito MTS
- **Leoni A. Kunz-Schughart** (TU Dresden) — bíblia de MTS, protocolos padronizados
- **Hans Clevers** (Hubrecht) — ponte entre esferoide e organoide
- **Donald E. Ingber** (Harvard Wyss) — esferoide-on-chip
- **Dra. Kamila Leichtweis** (Quantis Biotechnology) — QMatrix e esferoides de linhagens não-formadoras

## Congressos e sociedades científicas

- **Society for Laboratory Automation and Screening (SLAS)** — anual, muito 3D screening
- **CTAC (3D Culture, Angiogenesis, and Cancer)** — bienal, foco em modelos 3D
- **ISSCR** — stem cells + organoides
- **SBB (Sociedade Brasileira de Bioquímica)** — anual

**Softwares para análise:**
- **CellProfiler** — gratuito, análise de imagem (diâmetro, esfericidade)
- **ImageJ/Fiji + MorphoLibJ** — gratuito, análise morfológica
- **Imaris** — pago, 3D reconstruction
- **ReViSP** — reconstruction de esferoide de projeção 2D

## Próximos passos de estudo

1. Baixar o **white paper QMatrix** da biblioteca da Academy (brinde open-access).
2. Ler Friedrich et al. (2009) — protocolo prático de drug screen em esferoide.
3. Fazer seu primeiro esferoide: HepG2 em placa ULA, 2000 células/well, 72h, análise com ImageJ.
4. Explorar **Organoid Builder** na BIA (preset "spheroid-standard") para projetar sua geometria.
5. Avançar para o Módulo 7 (Tecidos) — onde esferoides viram tecidos maiores via bioassembly.
`,
  })
  console.log('✓ M06 L2 Esferoides (' + r2.action + ', ' + r2.summaryChars + ' chars)')
}

main().catch(e => { console.error(e); process.exit(1) })
