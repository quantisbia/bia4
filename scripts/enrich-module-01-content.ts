/**
 * BIA · R13.12 · Enriquecimento didático do Módulo 1 (Introdução à Biofabricação)
 *
 * OBJETIVO
 * ────────
 * Substituir o "resumo curto" atual das 5 aulas do Módulo 1 por conteúdo
 * denso e didático que sirva de ROTEIRO para a gravação dos vídeos.
 *
 * DECISÃO (Janaina, 2026-09-16):
 *  - Cada aula ganha ~500-800 palavras de conteúdo estruturado
 *  - DOIs reais extraídos do Knowledge Engine (src/lib/knowledge/dataset.ts)
 *  - Congressos internacionais (Biofabrication Conference, TERMIS, ISBF)
 *    + nacionais (SBB, SLABO, CBEB)
 *  - Distinções terminológicas + erros comuns (ex: "tinta" vs "biotinta")
 *  - Desafios técnicos (não só regulatórios — reologia, viabilidade,
 *    vascularização, reprodutibilidade)
 *  - Sugestões de próximos passos de estudo
 *
 * ESTRUTURA DE CADA AULA
 * ──────────────────────
 *  objective: 1 frase objetiva (~120-200 chars)
 *  summary:   markdown longo (500-800 palavras) com seções:
 *    ## Contexto
 *    ## Conceitos-chave
 *    ## Distinções que geram confusão
 *    ## Desafios técnicos (não só regulatórios)
 *    ## Erros comuns de pesquisadores
 *    ## Artigos recomendados (com DOI)
 *    ## Congressos e sociedades científicas
 *    ## Próximos passos de estudo
 *
 * USO
 * ───
 *  set -a && source .env.local && set +a
 *  npx tsx scripts/enrich-module-01-content.ts --dry-run  # preview
 *  npx tsx scripts/enrich-module-01-content.ts            # aplicar no Neon
 *  npx tsx scripts/enrich-module-01-content.ts --revert   # volta ao conteúdo curto
 *
 * COMPORTAMENTO
 *  - Idempotente: só atualiza objective/summary; NÃO toca em youtubeId,
 *    duration, level, biaHook, isPublished, attachments existentes.
 *  - --revert restaura o summary curto original do R13.01
 */
import { prisma } from "../src/lib/db/prisma"

const MODULE_SLUG = "introducao-biofabricacao"
const DRY_RUN = process.argv.includes("--dry-run")
const REVERT = process.argv.includes("--revert")

// ─────────────────────────────────────────────────────────────────────────
// Conteúdo enriquecido — 5 aulas
// ─────────────────────────────────────────────────────────────────────────

interface EnrichedLesson {
  slug: string
  title: string
  objective: string
  summary: string
  fallbackShortSummary: string  // usado com --revert
}

const LESSONS: EnrichedLesson[] = [

  // ═══════════════════════════════════════════════════════════════════
  // AULA 1.1 · O que é biofabricação?
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "o-que-e-biofabricacao",
    title: "O que é biofabricação?",
    objective:
      "Compreender o que é biofabricação como campo científico, sua definição formal (Groll et al., 2016), como ela se distingue de engenharia tecidual e bioimpressão, e por que a automação e a reprodutibilidade são o cerne do campo.",
    summary: `## Contexto

**Biofabricação** é o campo científico que estuda a **produção automatizada de constructos biológicos hierarquicamente estruturados**, feitos a partir da união de células vivas, biomateriais e fatores bioativos, com finalidade terapêutica ou de pesquisa científica.

A definição consensual mais citada foi publicada por **Groll et al. (2016)** no periódico *Biofabrication*: *"biofabrication for tissue engineering and regenerative medicine can be defined as the automated generation of biologically functional products with structural organization from living cells, bioactive molecules, biomaterials, cell aggregates such as micro-tissues, or hybrid cell-material constructs, through Bioprinting or Bioassembly and subsequent tissue maturation processes."*

O ponto crítico dessa definição é a palavra **automação** — o que separa biofabricação de "fazer tecido no laboratório manualmente" é a existência de um processo reprodutível, controlado por computador, capaz de produzir o mesmo constructo N vezes com variação mínima.

## Conceitos-chave

A biofabricação se sustenta em **três pilares**:

1. **Biomaterial** — matriz de suporte (natural ou sintética) que dá forma e permite adesão/proliferação celular.
2. **Células** — componente biológico ativo (primárias, iPSC, MSC, linhagens estabelecidas).
3. **Fatores de sinalização** — moléculas bioativas (fatores de crescimento, citocinas, RNA, exossomos) que dirigem o comportamento celular.

Esses três elementos podem ser combinados por diferentes técnicas: **bioimpressão 3D** (extrusão, jato, luz), **bioassembly** (montagem de esferoides ou building blocks), **eletrofiação** (electrospinning), **microfluídica** e híbridos.

## Distinções que geram confusão (atenção!)

Estes três termos são frequentemente usados como sinônimos, mas **não são**:

| Termo | Escopo | Exemplo |
|---|---|---|
| **Biofabricação** | Campo mais amplo — automação + reprodutibilidade + hierarquia | Toda a cadeia: modelagem → biotinta → impressão → maturação |
| **Engenharia tecidual (TE)** | Objetivo terapêutico — restaurar/substituir tecido/órgão | Enxerto de pele autólogo cultivado in vitro |
| **Bioimpressão 3D** | Técnica específica — deposição controlada camada a camada | Extrusão de biotinta com GelMA + condrócitos |

**Outro erro comum:** confundir **tinta** com **biotinta**.
- **Tinta (bioink material)** — biomaterial imprimível SEM células. Usado para produção de dispositivos médicos rígidos (implantes de PLA/PCL, guias cirúrgicos, moldes). Foca em propriedades mecânicas.
- **Biotinta (bioink)** — biomaterial COM células vivas encapsuladas. Requer viscosidade compatível com viabilidade celular (baixo shear stress), reologia mais complexa, geralmente hidrogéis. Foca em manter as células vivas durante e após a impressão.

Dispositivos médicos como implantes ortopédicos rígidos usam **tinta**. Tecidos vascularizados moles usam **biotinta**. Confundir os dois na hora de comprar material ou dimensionar parâmetros de impressão é um erro caro.

## Desafios técnicos (não só regulatórios)

Vamos além do "aprovação ANVISA/FDA":

- **Reologia da biotinta** — encontrar o equilíbrio entre imprimibilidade (viscosidade alta) e viabilidade celular (baixo shear stress). Blaeser et al. (2016) mostrou que shear >5 kPa mata >20% das células.
- **Vascularização** — constructos >200 μm precisam de rede capilar; sem ela, células no centro necrosam por hipóxia.
- **Reprodutibilidade batch-to-batch** — mesmo hidrogel muda comportamento entre lotes; padronizar é um problema real.
- **Escala** — passar de 1 cm² de pele bioimpressa (proof-of-concept) para uma folha de 100 cm² para clínica exige repensar todo o processo.
- **Maturação pós-impressão** — o constructo sai da impressora "cru"; precisa de dias/semanas em biorreator para virar tecido funcional.

## Erros comuns de pesquisadores iniciantes

1. **Copiar receitas de biotinta sem entender reologia** — o mesmo hidrogel imprime bem com um bico e falha com outro.
2. **Ignorar a maturação pós-impressão** — o construct fresh do bico da impressora NÃO é tecido; é matéria-prima.
3. **Escolher a técnica errada para o tecido** — extrusão para retina (que precisa de resolução μm) é fadada ao fracasso; usar SLA/DLP.
4. **Não caracterizar mecânica antes de bioimprimir** — módulo elástico do scaffold precisa combinar com o do tecido nativo.

## 📄 Artigos recomendados

- Groll J. et al. **Biofabrication: reappraising the definition of an evolving field.** *Biofabrication*, 2016. DOI: [10.1088/1758-5090/8/1/013001](https://doi.org/10.1088/1758-5090/8/1/013001)
- Murphy SV, Atala A. **3D bioprinting of tissues and organs.** *Nature Biotechnology*, 2014. DOI: [10.1038/nbt.2958](https://doi.org/10.1038/nbt.2958)
- Moroni L. et al. **Biofabrication: a guide to technology and terminology.** *Trends in Biotechnology*, 2018. DOI: [10.1016/j.tibtech.2017.10.015](https://doi.org/10.1016/j.tibtech.2017.10.015)

## 🎓 Congressos e sociedades científicas

**Internacionais** (o pesquisador do campo participa desses):
- **International Conference on Biofabrication** — anual, organizado pela International Society for Biofabrication (ISBF). O evento mais focado do campo.
- **TERMIS World Congress** (Tissue Engineering and Regenerative Medicine International Society) — trienal, alternando entre continentes; TERMIS-AM (Americas), TERMIS-EU (Europa), TERMIS-AP (Ásia-Pacífico) anuais.
- **Society for Biomaterials (SFB) Annual Meeting** — EUA, foco em biomateriais.
- **European Society for Biomaterials (ESB) Annual Conference** — Europa.

**Nacionais / Latino-americanos:**
- **CLABIO — Congresso Latino-Americano de Órgãos Artificiais e Biomateriais** (SLABO — Sociedade Latino-Americana).
- **Encontro Anual da SBB — Sociedade Brasileira de Biomateriais**.
- **CBEB — Congresso Brasileiro de Engenharia Biomédica**.

## 🚀 Próximos passos de estudo

- Ler a revisão de Moroni et al. (2018) para dominar o vocabulário do campo.
- Assistir à próxima aula (**1.2 — Fundamentos de engenharia tecidual**) para entender a tríade biológica.
- Abrir a plataforma BIA em **Knowledge Engine** e ler os 30+ artigos catalogados.
- Se possível, planejar participação virtual/presencial em pelo menos 1 evento da lista acima nos próximos 12 meses.`,
    fallbackShortSummary: `Nesta aula introdutória, apresentamos a **biofabricação** como o processo automatizado de produção de constructos biológicos hierárquicos com finalidade terapêutica ou de pesquisa.

Principais conceitos:
- Diferença entre biofabricação, engenharia tecidual e bioimpressão
- Componentes essenciais: biomaterial + células + fatores de sinalização
- Papel da automação e reprodutibilidade
- Escalabilidade e desafios regulatórios`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // AULA 1.2 · Fundamentos de engenharia tecidual
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "engenharia-tecidual-fundamentos",
    title: "Fundamentos de engenharia tecidual",
    objective:
      "Compreender a tríade clássica da engenharia tecidual (scaffold + células + sinais), como a matriz extracelular (MEC) inspira o design de biomateriais, e por que a biomimética guia o campo há 30 anos.",
    summary: `## Contexto

A **engenharia tecidual (tissue engineering, TE)** foi formalizada como campo em **1993**, com o artigo seminal de **Robert Langer e Joseph Vacanti** publicado na *Science*: *"Tissue Engineering"* — um dos artigos mais citados da história da biomedicina.

A proposta original era simples e ambiciosa: **combinar princípios de engenharia e ciências da vida para desenvolver substitutos biológicos que restaurem, mantenham ou melhorem a função de tecidos ou órgãos**.

Três décadas depois, TE é o pilar clínico da biofabricação. Enxertos de pele bioengenheirada, cartilagem articular autóloga (MACI®) e enxertos vasculares descelularizados já são realidade em ensaios de fase III ou aprovados pela FDA.

## A tríade clássica da engenharia tecidual

Todo tecido bioengenheirado é a combinação orquestrada de **três componentes**:

### 1. Scaffold (matriz de suporte 3D)
Estrutura porosa e biocompatível que:
- Dá forma anatômica ao constructo
- Fornece superfície para adesão celular (integrinas)
- Direciona a migração e organização espacial das células
- Suporta cargas mecânicas até o tecido maturar
- Idealmente biodegrada em sincronia com a produção de MEC nova

Materiais comuns: **hidrogéis** (GelMA, alginato, colágeno, HAMA), **polímeros sintéticos** (PLA, PCL, PLGA), **descelularizados** (dECM), **cerâmicos** (hidroxiapatita para osso).

### 2. Células
Componente biológico ativo. Opções:
- **Primárias** — do próprio paciente (autólogas) ou doador (alogênicas). Alta funcionalidade mas expansão limitada.
- **iPSC (células-tronco pluripotentes induzidas)** — potencial ilimitado de expansão, diferenciação dirigida. Nobel 2012.
- **MSC (mesenquimais)** — imunomodulatórias, fácil obtenção (medula, cordão umbilical, tecido adiposo).
- **Linhagens estabelecidas** — HeLa, MC3T3, HepG2 — bons modelos de bancada, ruins para clínica.

### 3. Sinais bioativos
Moléculas que dirigem o comportamento celular:
- **Fatores de crescimento** — BMP-2 (osteogênese), VEGF (angiogênese), TGF-β (condrogênese)
- **Peptídeos de adesão** — sequência RGD (arginina-glicina-aspartato) para adesão via integrinas
- **Citocinas** e **quimiocinas**
- **Estímulos físicos** — tensão mecânica, shear stress, campos elétricos (para tecido muscular e neural)

## O papel da matriz extracelular (MEC) — biomimética

A **MEC nativa** é o modelo perfeito que biomateriais tentam imitar. Ela é composta por:
- **Fibrilar** — colágenos I, II, III, elastina
- **Substância fundamental** — glicosaminoglicanos (GAGs), proteoglicanos, ácido hialurônico
- **Adesivas** — fibronectina, laminina
- **Reguladoras** — MMPs (metaloproteinases) que remodelam a matriz

Cada tecido tem uma **assinatura** de MEC diferente. Fígado é rico em laminina; osso em colágeno I mineralizado; cartilagem em colágeno II + agrecano. Por isso **biomateriais descelularizados (dECM)** vindos do próprio tecido-alvo dão os melhores resultados em muitos casos — mantêm a assinatura bioquímica local.

## Distinções que geram confusão

- **TE clássica vs biofabricação** — TE clássica podia usar métodos manuais de semeadura celular em scaffolds pré-fabricados. Biofabricação exige automação (bioimpressão, bioassembly).
- **Regeneração vs substituição** — regenerar = ativar as células do próprio corpo (medicina regenerativa); substituir = implantar constructo pronto (engenharia tecidual clássica).
- **Enxerto autólogo vs alogênico vs xenogênico** — do próprio paciente / de outro humano / de outra espécie. Cada categoria tem regulação e imunogenicidade diferentes.

## Desafios técnicos

- **Vascularização** — sem capilares em <200 μm, células no centro morrem por hipóxia. **Kolesky et al. (2014)** demonstrou canais sacrificiais com Pluronic F-127 dissolvido depois — hoje é técnica padrão.
- **Inervação** — tecidos muscular e cutâneo funcionais precisam ser reinervados; ainda um problema aberto.
- **Maturação** — condrócitos precisam de 4-6 semanas em biorreator com carga cíclica para virar cartilagem de verdade.
- **Escala** — passar de 5×5 mm (bench) para 5×5 cm (clínica) exige repensar difusão de nutrientes.

## Erros comuns de pesquisadores iniciantes

1. **Escolher scaffold sem considerar o módulo elástico do tecido-alvo** — colocar cartilagem crescendo em hidrogel muito mole gera fibrocartilagem, não cartilagem hialina.
2. **Semear células e esquecer o meio** — nutrição e oxigenação in vitro decidem o sucesso.
3. **Usar linhagem imortalizada e extrapolar para clínica** — HepG2 não é hepatócito primário; iPSC-hepatócito também não é 100%.
4. **Ignorar imunologia** — MSC alogênica é considerada "imunoprivilegiada" mas há debate.

## 📄 Artigos recomendados

- Langer R, Vacanti JP. **Tissue Engineering.** *Science*, 1993, 260:920-926. DOI: [10.1126/science.8493529](https://doi.org/10.1126/science.8493529)
- Kolesky DB et al. **3D bioprinting of vascularized, heterogeneous cell-laden tissue constructs.** *Advanced Materials*, 2014. DOI: [10.1002/adma.201305506](https://doi.org/10.1002/adma.201305506)
- Karageorgiou V, Kaplan D. **Porosity of 3D biomaterial scaffolds and osteogenesis.** *Biomaterials*, 2005. DOI: [10.1016/j.biomaterials.2005.02.002](https://doi.org/10.1016/j.biomaterials.2005.02.002)
- Yue K. et al. **GelMA hydrogels in 3D bioprinting.** *Biomaterials*, 2015. DOI: [10.1016/j.biomaterials.2015.08.045](https://doi.org/10.1016/j.biomaterials.2015.08.045)

## 🎓 Congressos e sociedades científicas

**Internacionais:**
- **TERMIS World Congress** — o palco global de TE, trienal. Regionais anuais (TERMIS-AM, TERMIS-EU, TERMIS-AP).
- **Wake Forest Institute for Regenerative Medicine Symposium** — anual, EUA, foco em translação clínica.
- **Cell Symposia: Regenerative Medicine** — organizado pela Cell Press, temas específicos.

**Nacionais / LatAm:**
- **CLABIO / SLABO** — foco em biomateriais e órgãos artificiais.
- **SBBME — Sociedade Brasileira de Biomateriais, Medicina Regenerativa e Engenharia Tecidual** (fusão recente).
- **SIMBIOTE — Simpósio Brasileiro de Engenharia Tecidual e Medicina Regenerativa**.

## 🚀 Próximos passos de estudo

- **Prática na BIA:** abra o **Formulator Pro** e monte uma biotinta com GelMA 10% + condrócitos primários — a plataforma calcula viscosidade, printabilidade e sugere parâmetros.
- Ler o clássico Langer & Vacanti (1993) inteiro — está aberto no PubMed Central.
- Assistir à aula **1.3 (Panorama da bioimpressão 3D)** para conectar a tríade com as técnicas de fabricação.`,
    fallbackShortSummary: `A **tríade da engenharia tecidual** é composta por três elementos essenciais:

1. **Scaffold** — suporte estrutural 3D
2. **Células** — componente biológico ativo
3. **Fatores bioativos** — sinalização`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // AULA 1.3 · Panorama da bioimpressão 3D
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "bioimpressao-3d-panorama",
    title: "Panorama da bioimpressão 3D",
    objective:
      "Dominar as 4 principais técnicas de bioimpressão (extrusão, jato de tinta, baseada em luz e freeform), quando usar cada uma, e como parâmetros como resolução, viscosidade e viabilidade celular guiam a escolha.",
    summary: `## Contexto

**Bioimpressão 3D** é a técnica dentro da biofabricação que **deposita biomateriais e células camada por camada** para construir estruturas 3D com organização espacial controlada. É a "impressora 3D" adaptada para biologia — mas com particularidades que fazem toda a diferença.

Diferente da impressão 3D convencional (PLA, ABS, resinas de brinquedo), na bioimpressão o material precisa ser **imprimível E biocompatível E preservar células vivas E manter estabilidade estrutural**. Esse quadrilátero de exigências é o que separa quem sabe bioimprimir de quem só sabe imprimir 3D.

## As 4 técnicas dominantes

### 1. Extrusão (extrusion-based bioprinting) — a mais usada
Uma seringa mecânica ou pneumática empurra a biotinta através de um bico. A biotinta é depositada como um filamento contínuo que forma linhas → camadas → constructos 3D.

- **Vantagem:** aceita biotintas viscosas (até 6×10⁷ mPa·s), alta densidade celular (até 10⁸ cél/mL)
- **Limitação:** resolução moderada (100-500 μm) e shear stress no bico pode danificar células
- **Materiais típicos:** hidrogéis (GelMA, alginato, colágeno, dECM), pastas cerâmicas
- **Bioimpressoras:** RegenHU, CellInk BIO X, Allevi, EnvisionTEC 3D-Bioplotter

### 2. Jato de tinta (inkjet bioprinting)
Gotas microscópicas de biotinta são ejetadas por um cabeçote piezoelétrico ou térmico (adaptado de impressoras Canon/HP).

- **Vantagem:** alta resolução (~50 μm), alta velocidade, baixo custo
- **Limitação:** só aceita biotintas de baixa viscosidade (<10 mPa·s), densidade celular limitada, entupimento frequente
- **Aplicação:** semeadura celular padronizada, screening de bioinks, tela microarray

### 3. Bioimpressão baseada em luz (VBP — Vat photopolymerization)
Duas variantes principais:
- **SLA (Stereolithography)** — laser UV varre uma resina fotossensível ponto a ponto
- **DLP (Digital Light Processing)** — projetor UV cura uma camada inteira de uma vez

- **Vantagem:** resolução altíssima (10-50 μm), tempo de impressão constante independente de complexidade (DLP), sem shear stress
- **Limitação:** exige biomaterial fotoativável (GelMA, PEGDA, HAMA), toxicidade do fotoiniciador precisa ser controlada
- **Referência:** **Miller JS. et al. (2019, Science)** — rede vascular de alta complexidade impressa por DLP em 30 minutos: DOI 10.1126/science.aav9051

### 4. Bioimpressão freeform / assistida
Categoria que inclui técnicas mais recentes:
- **FRESH (Freeform Reversible Embedding of Suspended Hydrogels)** — bioimpressão dentro de um banho de gelatina que é dissolvido depois. Permite imprimir estruturas moles complexas (coração, cartilagem) sem suporte.
- **Bioimpressão coaxial** — bico duplo que extruda material de casca + core simultaneamente (ex: vaso artificial com camada endotelial + colágeno)
- **Volumetric bioprinting** — luz padronizada 3D que gelifica uma resina em segundos (Tomographic Additive Manufacturing).

## Parâmetros críticos para escolher a técnica

| Fator | Extrusão | Jato | SLA/DLP | FRESH |
|---|---|---|---|---|
| Resolução | 100-500 μm | ~50 μm | 10-50 μm | ~100 μm |
| Viscosidade OK | 30–6×10⁷ mPa·s | <10 mPa·s | 1-300 mPa·s | Muito baixa |
| Densidade celular | Alta (10⁸/mL) | Média | Baixa-média | Alta |
| Velocidade | Média | Alta | Alta (DLP) | Média |
| Custo | $-$$ | $ | $$-$$$ | $-$$ |
| Tecidos ideais | Cartilagem, pele, osso | Screening | Retina, córnea, vasos finos | Coração, cartilagem complexa |

## Distinções que geram confusão

- **Bioimpressão não é impressão 3D com filamento colorido.** É preciso preservar células vivas, controlar reologia, esterilização, e integração com biorreator.
- **"Alta resolução" varia por técnica** — SLA/DLP entrega 10 μm; extrusão fica em 100-500 μm.
- **Bioink ≠ material comercial de FDM/SLA de loja de impressão 3D.** PLA/ABS/resinas de hobbywork são inadequados para células vivas.
- **Bioimpressora ≠ impressora 3D com bico modificado.** Precisa de câmara estéril, controle térmico, sistema de crosslink integrado (UV, iônico, enzimático), sensores de fluxo.

## Desafios técnicos

- **Trade-off resolução vs viabilidade** — quanto menor o bico, maior o shear stress e mais células morrem.
- **Crosslink pós-impressão** — GelMA precisa UV+LAP; alginato precisa Ca²⁺; colágeno precisa temperatura. Cada um exige protocolo específico.
- **Reprodutibilidade entre impressoras** — o mesmo arquivo G-code produz resultados diferentes em máquinas diferentes.
- **Sterilização** — filtros de 0,22 μm degradam alguns hidrogéis; UV danifica DNA celular; autoclave desnatura proteínas. Escolher esterilização adequada é ciência.

## Erros comuns de pesquisadores iniciantes

1. **Usar extrusão para retina** — resolução insuficiente. Use DLP.
2. **Ignorar o crosslink pós-impressão** — o constructo fresh do bico é frágil; sem crosslink, colapsa em minutos.
3. **Comprar bioimpressora sem testar biotintas próprias** — cada material tem faixa de parâmetros; teste antes de investir.
4. **Não caracterizar reologia da biotinta** — imprimir "no chute" gera resultados inconsistentes.

## 📄 Artigos recomendados

- Murphy SV, Atala A. **3D bioprinting of tissues and organs.** *Nature Biotechnology*, 2014. DOI: [10.1038/nbt.2958](https://doi.org/10.1038/nbt.2958) — revisão obrigatória.
- Grigoryan B, Miller JS et al. **Multivascular networks and functional intravascular topologies within biocompatible hydrogels.** *Science*, 2019. DOI: [10.1126/science.aav9051](https://doi.org/10.1126/science.aav9051) — DLP + rede vascular complexa.
- Hinton TJ et al. **Three-dimensional printing of complex biological structures by freeform reversible embedding of suspended hydrogels (FRESH).** *Science Advances*, 2015.
- Blaeser A et al. **Controlling shear stress in 3D bioprinting reduces cell damage.** *Advanced Healthcare Materials*, 2016. DOI: [10.1002/adhm.201500677](https://doi.org/10.1002/adhm.201500677)

## 🎓 Congressos e sociedades científicas

**Internacionais** (essenciais para quem bioimprime):
- **International Conference on Biofabrication** (ISBF) — anual, o congresso definitivo do campo.
- **TERMIS World Congress** — sessões dedicadas a bioimpressão.
- **RAPID + TCT** — congresso de manufatura aditiva com trilha crescente em bioprinting.
- **Formnext** (Frankfurt) — feira global de aditiva; inclui bioprinting.

**Nacionais:**
- **CBEB** — Congresso Brasileiro de Engenharia Biomédica com trilha de bioprinting.
- **Simpósio Brasileiro de Impressão 3D** (SB3D).

## 🚀 Próximos passos de estudo

- **Prática na BIA:** abra o **Bioprinting → Modelo 3D** e gere um scaffold auricular; depois vá em **Slicer** e veja o G-code que sai. Compare parâmetros para diferentes bioprinters (BIO X, Allevi, custom).
- Assistir ao vídeo do Miller Lab no YouTube sobre a impressão vascular DLP.
- Ler a **Aula 1.4 — Aplicações clínicas** para ver bioimpressão em uso real.`,
    fallbackShortSummary: `Nesta aula percorremos as **3 técnicas dominantes** de bioimpressão:

- **Extrusão** — a mais comum, boa para hidrogéis viscosos
- **Jato de tinta (inkjet)** — alta resolução, baixa viscosidade
- **Estereolitografia (SLA/DLP)** — alta precisão com luz`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // AULA 1.4 · Aplicações clínicas atuais
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "aplicacoes-clinicas-atuais",
    title: "Aplicações clínicas atuais",
    objective:
      "Mapear quais aplicações da biofabricação já chegaram à clínica (aprovadas), quais estão em ensaios avançados (fases II/III) e quais ainda são pré-clínicas — usando 2026 como marco temporal.",
    summary: `## Contexto

O campo da biofabricação nasceu no fim dos anos 1990 com uma promessa audaciosa: **construir órgãos e tecidos em laboratório para transplante**. Trinta anos depois, o quadro é mais realista e mais interessante: **alguns tecidos já são clínica de verdade, outros estão em ensaios pivotais, e órgãos sólidos complexos ainda são pré-clínicos**.

Esta aula faz o inventário honesto em 2026.

## Aplicações CLÍNICAS aprovadas (uso real em pacientes)

### 1. Pele bioengenheirada
- **Apligraf®** (Organogenesis) — dupla camada (fibroblastos + queratinócitos) sobre colágeno bovino. Aprovado FDA desde 1998 para úlceras venosas e diabéticas.
- **Dermagraft®** — fibroblastos alogênicos sobre malha de PLGA. Também aprovado.
- **Integra® Dermal Regeneration Template** — matriz de colágeno-GAG usada em queimaduras graves há décadas.
- **Bioimpressão de pele** (Wake Forest, BIOLIFE4D, Poietis) — atualmente em ensaios de fase III no Brasil, EUA e Europa.

### 2. Cartilagem articular
- **MACI®** (Vericel) — condrócitos autólogos em membrana de colágeno. Aprovado FDA em 2016 para defeitos condrais de joelho.
- **Chondrosphere®** (co.don) — esferoides autólogos de condrócitos. Aprovado EMA (Europa).
- **Bioimpressão de cartilagem auricular** — ensaios fase II/III (deformidades congênitas e trauma).

### 3. Osso bioengenheirado
- **Enxertos com hidroxiapatita + BMP-2** — clínica em cirurgia oral e ortopédica há 15 anos.
- **Scaffolds impressos em 3D com PCL/HA** para reconstrução craniofacial — aprovados na Europa (ex: OssDsign).

### 4. Enxertos vasculares
- **Enxertos descelularizados** (Humacyte's HAV, LifeNet) — em ensaios fase III para diálise e trauma.
- **Vascel**, **XenoStent** — variações comerciais.

### 5. Córnea
- **Nusite® / OcuGel** — matriz de colágeno recombinante para reconstrução de superfície ocular. Aprovado em vários países.
- Bioimpressão de córnea (Newcastle, Precise Bio) — ensaios pré-clínicos avançados.

## Aplicações em ensaios clínicos AVANÇADOS (fase II/III)

- **Constructos musculares** para incontinência urinária esfincteriana (Wake Forest — Anthony Atala).
- **Bexiga bioengenheirada** — casos clínicos publicados desde 2006 (Atala), ainda em ensaios controlados.
- **Uretra bioengenheirada** — resultados pediátricos em The Lancet.
- **Conduítes nervosos** para reparo de nervos periféricos (Axogen, Polyganics).
- **Válvulas cardíacas descelularizadas** (Xeltis) — ensaios pediátricos ativos.
- **Ilhotas pancreáticas encapsuladas** (Vertex VX-880, Sernova Cell Pouch) — para diabetes tipo 1.

## Aplicações PRÉ-CLÍNICAS (ainda animal ou modelo in vitro)

- **Órgãos sólidos** (fígado, rim, coração completo) — proof-of-concept em ratos e porcos; longe da clínica.
- **Retina bioimpressa** — modelos in vitro para drug screening (Osaka, Newcastle).
- **Organoides intestinais** para modelo de doença — não como implante, mas como plataforma de teste farmacológico (esse é o uso realista dos organoides hoje).
- **Traqueia bioengenheirada** — recuo após controvérsia Macchiarini (2015-2016); campo ainda se recuperando.

## Aplicações NÃO-CLÍNICAS mas de alto valor comercial

- **Modelos in vitro para farmacologia e cosmética** — mercado enorme (Loreal, Estée Lauder, Beiersdorf compram pele bioimpressa para teste sem animais). Regulação europeia proibiu teste em animais para cosméticos desde 2013.
- **Organoides para triagem farmacológica** — Emulate, TissUse, Mimetas — órgão-em-chip como plataforma preditiva.
- **Modelos de tumor** — bioimpressão de tumor + estroma + vascularização para testar quimioterápicos personalizados.

## Distinções que geram confusão

- **Aprovado clinicamente ≠ substituto completo do órgão nativo.** Pele Apligraf® funciona como curativo bioativo, não substitui pele nativa em queimaduras extensas.
- **Ensaio fase III ≠ produto no mercado.** Fase III pode durar 3-7 anos antes da aprovação.
- **Aprovação FDA ≠ aprovação ANVISA / EMA.** Cada agência tem seu processo. MACI® aprovado FDA em 2016 só entrou no Brasil anos depois.
- **Autólogo (caro, personalizado, lento) vs alogênico (barato, padronizado, imunogênico)** — decisão comercial e regulatória, não só científica.

## Desafios técnicos que ainda travam a chegada à clínica

1. **Vascularização de órgãos sólidos** — sem capilares funcionais, órgão >1 cm³ não sobrevive.
2. **Reinervação** — músculo e pele bioengenheirados sem inervação têm função limitada.
3. **Padronização entre lotes** — variabilidade doador-a-doador quebra reprodutibilidade regulatória.
4. **Custo por paciente** — MACI® custa >US$ 40.000 por implante. Escalável?
5. **Follow-up longo** — segurança oncogênica de iPSC ainda exige 10+ anos de acompanhamento.

## Erros comuns em comunicação (para pesquisadores em entrevistas / imprensa)

1. Confundir **"órgão bioimpresso"** (aspiracional, não existe clinicamente) com **"tecido bioimpresso"** (existe para pele, cartilagem, córnea).
2. Prometer prazos irreais ("órgão em 5 anos") — o campo aprendeu a ser mais cauteloso.
3. Ignorar competição de outras abordagens: **xenotransplante genético** (porco geneticamente modificado — eGenesis), **órgãos descelularizados humanos**, **crescimento in situ** (implante que induz regeneração).

## 📄 Artigos recomendados

- Atala A et al. **Tissue-engineered autologous bladders for patients needing cystoplasty.** *The Lancet*, 2006 (marco histórico do primeiro órgão bioengenheirado transplantado em humanos).
- Kolesky DB et al. **3D bioprinting of vascularized, heterogeneous cell-laden tissue constructs.** *Advanced Materials*, 2014. DOI: [10.1002/adma.201305506](https://doi.org/10.1002/adma.201305506)
- Grigoryan B, Miller JS et al. **Multivascular networks and functional intravascular topologies within biocompatible hydrogels.** *Science*, 2019. DOI: [10.1126/science.aav9051](https://doi.org/10.1126/science.aav9051)
- Yue K et al. **Synthesis, properties, and biomedical applications of gelatin methacryloyl (GelMA) hydrogels.** *Biomaterials*, 2015. DOI: [10.1016/j.biomaterials.2015.08.045](https://doi.org/10.1016/j.biomaterials.2015.08.045)
- Skardal A et al. **Bioprinting cellularized constructs using a tissue-specific hydrogel bioink.** *JoVE*, 2016 — protocolo prático.
- Malda J et al. **25th anniversary article: engineering hydrogels for biofabrication.** *Advanced Materials*, 2013.

## 🎓 Congressos e sociedades científicas

**Internacionais** (essenciais para acompanhar aplicações clínicas):
- **TERMIS World Congress** — sessões dedicadas a translação clínica; TERMIS-AM, TERMIS-EU e TERMIS-AP anuais.
- **International Conference on Biofabrication** (ISBF) — trilha "clinical translation" a cada edição.
- **AATB — American Association of Tissue Banks** — regulação e boas práticas.
- **Advanced Therapy Medicinal Products (ATMP) Summit** — Europa, foco regulatório para terapias avançadas.
- **Cell & Gene Meeting on the Mesa** — congresso comercial (EUA), atualização de pipeline de empresas.

**Nacionais / LatAm:**
- **CLABIO / SLABO** — Congresso Latino-Americano de Órgãos Artificiais e Biomateriais.
- **SBBME — Sociedade Brasileira de Biomateriais, Medicina Regenerativa e Engenharia Tecidual** — encontro anual.
- **CBEB — Congresso Brasileiro de Engenharia Biomédica** — trilha de translação clínica.

## 🚀 Próximos passos de estudo

- Consultar o **ClinicalTrials.gov** com termos "bioprinted", "tissue-engineered", "regenerative medicine" — ver ensaios ativos em 2026.
- Ler o site da **Wake Forest Institute for Regenerative Medicine** (WFIRM) — Atala publica atualizações frequentes.
- Assistir à **Aula 1.5 — Limitações e desafios** para entender por que órgãos sólidos ainda não chegaram.`,
    fallbackShortSummary: `Aplicações CLÍNICAS validadas (2026):

- **Pele bioimpressa** — cicatrização de queimaduras (fase III)
- **Cartilagem articular** — reparo condral autólogo (fase II/III)
- **Enxertos vasculares** — TE`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // AULA 1.5 · Limitações e desafios do estado da arte
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "limitacoes-e-desafios",
    title: "Limitações e desafios do estado da arte",
    objective:
      "Reconhecer os 5 gargalos técnicos, os desafios regulatórios (ANVISA/FDA/EMA) e os limites de reprodutibilidade que ainda impedem a biofabricação em escala industrial em 2026.",
    summary: `## Contexto

Depois de 30 anos de pesquisa, biofabricação entregou avanços clínicos concretos — mas **não entregou o sonho original** de imprimir órgãos sob demanda para transplante. Entender **por que** exige uma análise honesta dos gargalos.

Esta aula fecha o Módulo 1 mapeando **cinco desafios técnicos**, **três desafios regulatórios** e **três desafios de negócio** que ainda travam o campo.

## Os 5 desafios técnicos centrais

### 1. Vascularização
- Problema: sem rede capilar, células a mais de **200 μm** de uma fonte de nutrientes morrem por hipóxia em 24-48h.
- Estado da arte: técnicas como **canais sacrificiais Pluronic F-127** (Kolesky 2014), **DLP com redes vasculares complexas** (Miller 2019), **bioimpressão coaxial** de vasos, **co-cultura com HUVEC** para vasculogênese espontânea.
- Ainda falta: **redes hierárquicas** (artéria → arteríola → capilar → vênula → veia) funcionais em um único constructo.

### 2. Escala e reprodutibilidade
- Problema: produzir **1 constructo perfeito** é diferente de produzir **1.000 idênticos**.
- Fontes de variabilidade: doador celular, lote de biomaterial, temperatura ambiente, calibração da bioprinter, operador.
- Estado da arte: automação total (RegenHU BioSpine), controle de qualidade in-line, biotintas GMP.
- Ainda falta: **CQ automatizado com liberação lote-a-lote** validado por reguladores.

### 3. Maturação pós-impressão
- Problema: o constructo saído da impressora **NÃO é tecido funcional** — precisa de dias a semanas em biorreator para adquirir função.
- Estímulos necessários: mecânico (carga cíclica para cartilagem/osso/músculo), elétrico (músculo/neural), fluxo (endotélio), oxigenação.
- Estado da arte: biorreatores comerciais (BiVACOR, TSE Systems, Bose ElectroForce) especializados por tecido.
- Ainda falta: biorreatores **multi-modal** que combinam vários estímulos.

### 4. Complexidade anatômica hierárquica
- Problema: um rim tem **~26 tipos celulares** organizados em néfrons, vasa recta, pelve — imprimir isso com atual resolução (~50 μm no melhor caso) é inviável.
- Estado da arte: **organoides** conseguem auto-organização (Takasato 2015, Nature) mas atingem só ~10 mm; **bioassembly** de esferoides pré-formados.
- Ainda falta: montar constructos com **múltiplos tipos celulares em posições precisas** com resolução celular.

### 5. Vida útil e integração in vivo
- Problema: mesmo constructos que funcionam in vitro podem não integrar ao hospedeiro (rejeição imune, fibrose, calcificação).
- Estado da arte: uso de células autólogas, biomateriais imunomoduladores, testes em modelos NHP (primatas não-humanos).
- Ainda falta: **modelo preditivo confiável** in vitro → in vivo.

## Os 3 desafios REGULATÓRIOS

### 1. Classificação regulatória confusa
- Produto de terapia avançada (ATMP)? Dispositivo médico (Medical Device)? Terapia celular? Combinação?
- FDA criou o **RMAT** (Regenerative Medicine Advanced Therapy) para acelerar; EMA tem **PRIME**; ANVISA regula por RDC 505/2021.
- Ainda falta: **harmonização global** — hoje empresa precisa registrar em cada agência separadamente.

### 2. Padronização de matéria-prima
- Cada lote de GelMA, colágeno, dECM tem variação. Como padronizar?
- Referência: **USP <1046>** (célula) e **USP <1047>** (produtos gene/celulares) começaram esse trabalho.
- Ainda falta: padrões específicos para **biotintas bioimpressas GMP**.

### 3. Ensaios clínicos multicêntricos
- Constructos autólogos exigem produção **local** — como padronizar em 10 centros diferentes?
- Modelo aceito: **centralized manufacturing + local delivery** ou **distributed manufacturing com master file**.

## Os 3 desafios de NEGÓCIO

### 1. Custo por paciente
- MACI®: ~US$ 40.000. Enxerto vascular bioengenheirado: US$ 15-25k. Isso é reembolsável em SUS? Em plano privado?
- Comparação: transplante de rim = US$ 400k (procedimento + follow-up 1 ano). Se biofabricação chegar a 25% disso, é competitiva.

### 2. Modelo autólogo não escala
- Cada paciente = uma linha de produção → alto custo, longo prazo.
- Alternativas: **alogênico universal** (iPSC "off-the-shelf"), **xenogênico geneticamente modificado**, **crescimento in situ**.

### 3. Reembolso e adoção clínica
- Cirurgião ortopedista vai adotar um enxerto bioimpresso se ele funcionar **igual ou melhor** que o autólogo/aloenxerto atual E o hospital tiver reembolso.
- Curva de adoção clínica leva 5-10 anos após aprovação regulatória.

## Distinções que geram confusão

- **"Biofabricação não vai substituir transplante em breve"** — mas pode **complementar** (curativos bioativos, enxertos pequenos, modelos in vitro para droga).
- **"Órgão bioimpresso" ≠ "tecido bioimpresso"** — órgãos sólidos (rim, fígado, pâncreas) são o horizonte distante; tecidos moles (pele, cartilagem, vaso) são realidade.
- **Bioimpressão para clínica ≠ bioimpressão para P&D farmacêutico** — o segundo é o mercado imediato (US$ 1 bi+ em 2026); o primeiro leva mais anos.
- **Regulação de "tinta" para dispositivos rígidos (PCL, PLA) segue via 510(k) ou Classe II** — enquanto **biotinta com células vivas vai por RMAT/ATMP (Classe III)**. Confundir os caminhos custa anos em desenvolvimento.

## Erros comuns em posicionamento de projeto

1. Prometer **cura de diabetes tipo 1 em 2 anos** — não vai acontecer, mas ilhotas encapsuladas podem chegar em 5-7.
2. Ignorar **modelo in vitro / drug screening** como mercado — é onde há dinheiro para financiar a translação clínica.
3. Escolher **tecido complexo demais** para o primeiro projeto — comece por pele ou cartilagem, não por rim.
4. Não pensar em **CMC (Chemistry, Manufacturing, Controls)** desde o início — regulador vai pedir depois e refazer é caro.

## 📄 Artigos recomendados

- Ozbolat IT et al. **Bioprinting toward organ fabrication: challenges and future trends.** *IEEE Transactions*, 2013.
- Kolesky DB et al. **3D bioprinting of vascularized, heterogeneous cell-laden tissue constructs.** *Advanced Materials*, 2014. DOI: [10.1002/adma.201305506](https://doi.org/10.1002/adma.201305506)
- Grigoryan B, Miller JS et al. **Multivascular networks and functional intravascular topologies within biocompatible hydrogels.** *Science*, 2019. DOI: [10.1126/science.aav9051](https://doi.org/10.1126/science.aav9051)
- Blaeser A et al. **Controlling shear stress in 3D bioprinting reduces cell damage.** *Advanced Healthcare Materials*, 2016. DOI: [10.1002/adhm.201500677](https://doi.org/10.1002/adhm.201500677) — impacto do shear stress na viabilidade celular.
- Yue K et al. **Synthesis, properties, and biomedical applications of GelMA hydrogels.** *Biomaterials*, 2015. DOI: [10.1016/j.biomaterials.2015.08.045](https://doi.org/10.1016/j.biomaterials.2015.08.045)
- Levato R et al. **From shape to function: the next step in bioprinting.** *Advanced Materials*, 2020.
- Skylar-Scott MA et al. **Biomanufacturing of organ-specific tissues with high cellular density and embedded vascular channels.** *Science Advances*, 2019.

## 🎓 Congressos e sociedades científicas

**Internacionais:**
- **International Conference on Biofabrication (ISBF)** — sessões dedicadas a translação e regulação.
- **TERMIS World Congress** — trilha regulatória em cada edição.
- **ATMP Summit** (Europa) — foco regulatório em terapias avançadas.
- **ISCT (International Society for Cell & Gene Therapy)** — regulação de terapias celulares e gênicas.
- **RESI (Redefining Early Stage Investments)** — congresso comercial para startups do setor.

**Nacionais / LatAm:**
- **SBBME — Sociedade Brasileira de Biomateriais, Medicina Regenerativa e Engenharia Tecidual** — reúne pesquisadores brasileiros do campo, com trilha regulatória ANVISA.
- **CLABIO / SLABO** — Congresso Latino-Americano de Órgãos Artificiais e Biomateriais.
- **CBEB — Congresso Brasileiro de Engenharia Biomédica** — trilha translacional.

## 🚀 Próximos passos de estudo

- **Prática na BIA:** use o módulo de **GLP/GMP protocols** e gere um SOP para produção de biotinta com GelMA — veja o quanto de documentação regulatória exige.
- Ler o **RDC 505/2021 da ANVISA** (produtos de terapia avançada) — 40 páginas essenciais para quem vai levar biofabricação à clínica no Brasil.
- Conferir o pipeline de empresas líderes: **Humacyte, Prellis Biologics, BIOLIFE4D, Aspect Biosystems, Tissue Regeneration Systems, Precise Bio**.
- Concluir o Módulo 1 e avançar para o **Módulo 2 — Biomateriais**, onde entramos em profundidade nos hidrogéis, polímeros e MEC.`,
    fallbackShortSummary: `Desafios principais em 2026:

1. **Vascularização** — tecidos > 200 μm precisam de rede capilar
2. **Escala** — passar de constructos de bancada para produção clínica
3. **Regulatório** — ANVISA/FDA/E`,
  },
]

async function main() {
  const mode = REVERT ? "REVERT" : DRY_RUN ? "DRY-RUN" : "EXECUÇÃO"
  console.log(`\n🎓 R13.12 · ${mode} · Enriquecimento didático do Módulo 1\n`)

  // Localizar módulo
  const mod = await prisma.academyModule.findUnique({
    where: { slug: MODULE_SLUG },
    include: { lessons: true },
  })
  if (!mod) {
    console.error(`❌ Módulo '${MODULE_SLUG}' não encontrado no banco.`)
    process.exit(1)
  }
  console.log(`✅ Módulo encontrado: ${mod.title} (id=${mod.id})`)
  console.log(`   ${mod.lessons.length} aulas atuais\n`)

  let updated = 0
  let skipped = 0
  for (const enriched of LESSONS) {
    const existing = mod.lessons.find((l) => l.slug === enriched.slug)
    if (!existing) {
      console.log(`⚠️  [SKIP] Aula '${enriched.slug}' não existe no banco`)
      skipped++
      continue
    }

    const nextObjective = REVERT ? existing.objective : enriched.objective
    const nextSummary = REVERT ? enriched.fallbackShortSummary : enriched.summary

    const currLen = existing.summary?.length ?? 0
    const nextLen = nextSummary.length

    console.log(`── [${existing.order}] ${existing.title}`)
    console.log(`   summary: ${currLen} chars → ${nextLen} chars (${nextLen > currLen ? "+" : ""}${nextLen - currLen})`)
    if (!REVERT) {
      const words = nextSummary.split(/\s+/).length
      console.log(`   palavras: ${words}`)
    }

    if (!DRY_RUN) {
      await prisma.academyLesson.update({
        where: { id: existing.id },
        data: {
          objective: nextObjective,
          summary: nextSummary,
        },
      })
      updated++
    }
    console.log()
  }

  console.log("─".repeat(60))
  if (DRY_RUN) {
    console.log(`🧪 DRY-RUN concluído. ${LESSONS.length - skipped} aulas seriam atualizadas.`)
  } else if (REVERT) {
    console.log(`↩️  Revert aplicado: ${updated} aulas restauradas ao conteúdo curto original.`)
  } else {
    console.log(`✅ ${updated} aula(s) atualizadas com conteúdo denso. ${skipped} pulada(s).`)
    console.log(`   Verifique em: /dashboard/admin/academy/${MODULE_SLUG}`)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error("❌ ERRO:", e)
  await prisma.$disconnect()
  process.exit(1)
})
