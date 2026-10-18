/**
 * R13.14.8 · Conteúdo denso do Módulo 08 — Esferoides e Organoides
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "esferoides-organoides",
    lessonSlug: "organoides-bioassembly",
    order: 1,
    title: "Organoides e Bioassembly — mini-órgãos e scaffold-free biofabrication",
    durationMin: 80,
    level: "advanced",
    biaHook: { tool: "organoids", label: "Projetar organoide na BIA (Organoid Builder)", params: { preset: "organoid-standard" } },

    objective: `Dominar organoides (mini-órgãos derivados de células-tronco) e técnicas de bioassembly (montagem de tecidos a partir de building blocks como esferoides) — as abordagens mais avançadas da biofabricação scaffold-free.

Ao final desta aula você será capaz de:
1. Diferenciar organoide de esferoide (confusão clássica) e explicar quando usar cada abordagem.
2. Descrever o fluxo de geração de organoides (ESC/iPSC → protocolo de diferenciação → maturação em Matrigel/dECM) para 5 tipos: intestinal, hepático, cerebral, renal, pulmonar.
3. Comparar as 3 técnicas principais de bioassembly: Kenzan (needle-array), scaffold-free bioprinting, acoustic/magnetic assembly.
4. Reconhecer aplicações clínicas emergentes: screening personalizado em oncologia, modelos de doença genética, teste de fármacos.
5. Identificar as limitações atuais (vascularização, maturação, variabilidade) e as fronteiras ativas de pesquisa.`,

    summary: `## Contexto

**Organoides** são mini-tecidos tridimensionais auto-organizados a partir de células-tronco (ESC, iPSC ou adult stem cells), que recapitulam parte da arquitetura, composição celular e função de um órgão real — em escala milimétrica, numa placa de cultura. O campo nasceu em 2009 quando [Toshiro Sato e Hans Clevers](https://doi.org/10.1038/nature07935) demonstraram o primeiro organoide intestinal a partir de uma única célula-tronco Lgr5+, cultivada em Matrigel + Wnt + EGF + Noggin + R-spondin. Esse paper mudou o paradigma: era possível fazer um órgão auto-organizar in vitro, sem engenharia nenhuma — bastava dar o microambiente certo e deixar as células fazerem seu trabalho.

Desde então, organoides se tornaram uma das áreas mais ativas da biologia e medicina. Hoje existem protocolos para organoides de intestino, cólon, fígado, pâncreas, próstata, mama, estômago, pulmão, rim, retina, cérebro, hipófise, tireoide, salivares. Aplicações incluem: modelagem de doença genética (ex: organoides de pacientes com fibrose cística para testar correção CRISPR), screening de drogas personalizado em oncologia (biobank de organoides tumorais), estudos de desenvolvimento embrionário, infecção viral (organoides pulmonares para SARS-CoV-2 em 2020).

Em paralelo, surge o **bioassembly** — a técnica de construir tecidos maiores a partir de **building blocks** pré-formados (geralmente esferoides). Ao invés de depositar células soltas em biotinta (bioprinting clássico), o bioassembly posiciona esferoides pré-formados num padrão 3D, deixa que fundam entre si (24-72h), e obtém tecido escalável scaffold-free. A técnica mais famosa é o **Kenzan method** (Nakayama, 2015) — esferoides empalados em agulhas finíssimas (como um "ikebana celular") que fundem e viram tubos vasculares completos.

Esferoides, organoides e bioassembly são a fronteira da biofabricação scaffold-free. Esta aula é a mais avançada do programa.

## Conceitos-chave

### Esferoide vs. organoide — a tabela definitiva

| Dimensão | Esferoide | Organoide |
|---|---|---|
| **Fonte celular** | Linhagem imortal, primária, câncer | Stem cells (ESC, iPSC, adult SC) |
| **Composição** | 1-2 tipos celulares | Múltiplos tipos (3-10+), auto-organizados |
| **Matriz** | MEC endógena secretada | MEC exógena (Matrigel, dECM) + endógena |
| **Fatores de crescimento** | Opcionais | Obrigatórios (coquetéis complexos) |
| **Arquitetura** | Esfera homogênea | Arquitetura de órgão (ductos, lúmen, zonas, vilos) |
| **Função** | Modelo tecido-like simples | Função parcial do órgão real |
| **Tempo** | 1-7 dias | 14-180 dias |
| **Custo** | Baixo (~R$ 10/esferoide) | Alto (R$ 500-5000/organoide) |
| **Reprodutibilidade** | Alta (CV <20%) | Média (CV 30-70% entre batches) |
| **Escalabilidade** | Alta (milhares/semana) | Baixa (dezenas/semana) |
| **Exemplo típico** | HepG2 em placa ULA, L929 + QMatrix | Organoide intestinal de iPSC Lgr5+ |

### Protocolo clássico de organoide intestinal (Sato & Clevers)

1. Isolar cripta intestinal de biópsia ou duodeno de ratinho (dissecação mecânica + EDTA)
2. Semear em Matrigel 50% + meio ENR (EGF, Noggin, R-spondin) ou ENR+W (adiciona Wnt3a para intestino humano)
3. Trocar meio a cada 48h
4. Primeiros brotos aparecem em 3-5 dias; organoides maduros em 7-14 dias
5. Passagem: fragmentação mecânica a cada 7-10 dias, re-semear em Matrigel novo

**Marcadores de maturidade**: Lgr5+ (stem cells na base da cripta), Villin (enterócitos no vilo), Muc2 (células caliciformes), ChgA (enteroendócrinas), Lysozyme (Paneth cells).

### Protocolos de organoides por órgão (overview)

| Órgão | Fonte | Fatores-chave | Tempo | Referência |
|---|---|---|---|---|
| **Intestino** | iPSC ou criptas | EGF, Noggin, R-spondin, Wnt3a | 7-14 d | Sato & Clevers 2009 |
| **Fígado** | iPSC | HGF, OSM, Dexametasona | 25-45 d | Takebe et al. 2013 |
| **Cérebro** | iPSC | SMAD inhibitors, FGF2 | 60-180 d | Lancaster & Knoblich 2013 |
| **Rim** | iPSC | FGF9, Rspo2, BMP7 | 25-45 d | Takasato et al. 2015 |
| **Pulmão** | iPSC | FGF7, FGF10, dexametasona | 60-90 d | Dye et al. 2015 |
| **Retina** | iPSC | BMP4, FGF2, IWR1 | 60-180 d | Nakano et al. 2012 |
| **Mama** | Primária/organoide tumoral | Neuregulina, R-spondin | 7-21 d | Sachs et al. 2018 |

### Bioassembly — montagem de tecidos a partir de building blocks

**Princípio**: ao invés de depositar células soltas, deposita-se **esferoides pré-formados**. Em 24-72h, esferoides vizinhos **fundem** (via cadherinas e remodelação de MEC), formando um tecido contínuo scaffold-free.

**Vantagens**:
- 100% biológico (sem polímero sintético residual)
- Density celular alta e uniforme
- Vascularização pode emergir espontaneamente (co-cultivo)
- Mecânica desenvolvida pelas próprias células

**Desvantagens**:
- Formato limitado (dependendo da técnica)
- Baixa escalabilidade
- Fusão imperfeita pode deixar gaps

### 3 técnicas principais de bioassembly

1. **Kenzan method** (Nakayama 2015, Cyfuse Biomedical) — esferoides empalados em agulhas finíssimas (0,1-0,3 mm) arranjadas num padrão 3D. Após fusão, agulhas são removidas e fica o tecido. Já produziu: tubos vasculares, nervos, tendões, cartilagem. [Primeiro ensaio clínico em 2017 no Japão](https://doi.org/10.1016/j.actbio.2019.01.058) com enxerto vascular.

2. **Scaffold-free bioprinting** (Jakab et al. 2010, Organovo) — esferoides depositados por bioprinter em padrão 3D sobre um suporte temporário (gel, hidrogel sacrificial). Após fusão, suporte é removido. Vantagem: geometrias complexas.

3. **Acoustic / magnetic assembly** — campos acústicos ou magnéticos (nanoparticulas magnéticas nos esferoides) organizam building blocks sem contato físico. Técnica nova, ainda em desenvolvimento. Promessa: tecidos vascularizados complexos.

### Organoides em oncologia — a revolução do screening personalizado

O maior impacto clínico atual dos organoides está em **oncologia personalizada**. Fluxo:
1. Biópsia do tumor do paciente
2. Expansão em organoide tumoral (3-6 semanas)
3. Teste de ~50-200 drogas em paralelo
4. Resposta orienta terapia

Casos documentados: [Sachs et al. (2018) em Cell](https://doi.org/10.1016/j.cell.2018.11.021) — biobank de organoides de câncer de mama com 100+ linhagens. [Vlachogiannis et al. (2018) em Science](https://doi.org/10.1126/science.aao2774) — organoides de câncer colorretal previram resposta à quimioterapia em 88% dos casos. Empresas: Hubrecht Organoid Technology (HUB), Crown Biosciences, Xilis.

## Distinções que geram confusão (atenção!)

### Organoide ≠ organoide tumoral

**Organoide saudável** — derivado de iPSC ou tecido normal. Padrão arquitetural do órgão.
**Organoide tumoral (tumoroide)** — derivado de biópsia de câncer. Preserva mutações do tumor, heterogeneidade intratumoral.

Ambos existem. O tumoroide é mais usado em oncologia clínica.

### Mini-órgão ≠ mini-humano

**Hype warning**: media costuma dizer "organoide = mini-cérebro consciente". **Falso**. Organoide cerebral tem alguma estrutura (zonas progenitoras, neurônios maduros) mas:
- Falta vascularização → núcleo necrótico em organoides >3 mm
- Falta microglia (origem distinta)
- Falta input sensorial e motor
- Padrões neuronais são imaturos (equivalente a 2º trimestre gestacional, no máximo)

Essas são **limitações éticas importantes** — organoides cerebrais complexos levantaram debates sobre consciência artificial (artigo de Lavazza, 2020: *"Potential ethical problems with human cerebral organoids: Consciousness and moral status of future brains in a dish"*).

### Bioassembly ≠ Bioprinting

**Bioprinting** — células encapsuladas em biotinta, extrudadas camada por camada.
**Bioassembly** — building blocks pré-formados (esferoides) posicionados e fundidos.

Ambos são técnicas de biofabricação. [Moroni et al. (2018)](https://doi.org/10.1016/j.tibtech.2017.10.015) separa claramente os dois no vocabulário oficial da ISBF.

## Desafios técnicos

1. **Vascularização de organoides maduros** — organoide >1 mm necessita vasos para não necrosar. Co-cultivo com HUVEC/pericitos ajuda; implante in vivo em sítio vascularizado é alternativa.

2. **Variabilidade entre batches** — Matrigel é lot-to-lot variável (até 2× diferença); iPSC pode derivar linhas com cariótipo diferente. Para GMP, substituir Matrigel por dECM definido ou matrizes sintéticas (ex: PEG funcionalizado).

3. **Maturação limitada** — organoides atingem estágio equivalente a 2º-3º trimestre fetal, raramente adulto. Para doenças adultas (Alzheimer, por exemplo), isso limita.

4. **Escalabilidade de bioassembly** — Kenzan produz ~10 constructs/dia. Para clínica, precisa automação (robôs que empalhem esferoides em alta vazão).

5. **Caracterização funcional** — mostrar que organoide "parece" órgão é fácil (histologia); mostrar que "funciona" é difícil (teste eletrofisiológico de neurônios, perfusão de rim, batimento sincronizado de coração).

6. **Dados ômicos de organoides** — scRNA-seq de organoides gera milhões de pontos; integrar com dados in vivo exige bioinformática avançada.

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros frequentes:**

1. **Confundir esferoide com organoide** — vender esferoide HepG2 como "organoide hepático" em paper. Revisores Q1 rejeitam na hora.

2. **Esperar organoide "normal" de iPSC não validada** — iPSC com cariótipo alterado gera organoide anormal. Validar cariótipo + pluripotência antes de diferenciar.

3. **Usar Matrigel vencido ou mal armazenado** — Matrigel polimeriza a 37°C; tem que manter a 4°C sempre, pipetar frio. Deixar em bancada 1 h = perdido.

4. **Semear organoides em alta densidade** — organoides em Matrigel precisam de espaço para expandir. 50-100 fragmentos / drop de 50 μL. Mais que isso = atrofia por falta de nutriente.

5. **Trocar meio todo dia (como em 2D)** — organoide quer troca a cada 48-72h. Troca diária estressa.

6. **Não registrar fonte da iPSC** — iPSCs de bancos (WiCell, RIKEN, Coriell) têm características documentadas. iPSC "da gaveta" de outro lab = reprodutibilidade zero.

7. **Analisar organoide inteiro sem single-cell** — organoide é heterogêneo (10+ tipos celulares). Análise em bulk mascara biologia. scRNA-seq é padrão hoje.

## Artigos recomendados

**Sato T et al. · 2009**
Single Lgr5 stem cells build crypt-villus structures in vitro without a mesenchymal niche.
📰 *Nature*
DOI: [10.1038/nature07935](https://doi.org/10.1038/nature07935) — paper fundador

**Lancaster MA, Knoblich JA · 2014**
Organogenesis in a dish: Modeling development and disease using organoid technologies.
📰 *Science*
DOI: [10.1126/science.1247125](https://doi.org/10.1126/science.1247125)

**Takebe T et al. · 2013**
Vascularized and functional human liver from an iPSC-derived organ bud transplant.
📰 *Nature*
DOI: [10.1038/nature12271](https://doi.org/10.1038/nature12271)

**Vlachogiannis G et al. · 2018**
Patient-derived organoids model treatment response of metastatic gastrointestinal cancers.
📰 *Science*
DOI: [10.1126/science.aao2774](https://doi.org/10.1126/science.aao2774)

**Jakab K et al. · 2010**
Tissue engineering by self-assembly and bio-printing of living cells.
📰 *Biofabrication*
DOI: [10.1088/1758-5082/2/2/022001](https://doi.org/10.1088/1758-5082/2/2/022001)

**Nakayama K · 2015**
In vitro biofabrication of tissues and organs (Kenzan method).
📘 *Biofabrication Elsevier chapter*
DOI: [10.1016/B978-1-4557-7862-1.00001-8](https://doi.org/10.1016/B978-1-4557-7862-1.00001-8)

**Takasato M et al. · 2015**
Kidney organoids from human iPS cells contain multiple lineages and model human nephrogenesis.
📰 *Nature*
DOI: [10.1038/nature15695](https://doi.org/10.1038/nature15695)

## Principais pesquisadores do campo

- **Hans Clevers** (Hubrecht Institute) — padrão de ouro em organoides intestinais; fundador do HUB
- **Yoshiki Sasai** (†2014) — pioneiro de organoides de retina e cérebro
- **Madeline Lancaster** (MRC-LMB) — primeiros organoides cerebrais
- **Takanori Takebe** (Cincinnati) — organoide hepático vascularizado
- **Shigeru Nakayama** (Saga University) — inventor do Kenzan method
- **Melissa Little** (Murdoch Institute) — organoides renais
- **Jim Wells** (Cincinnati) — organoides intestinais a partir de iPSC

## Congressos e sociedades científicas

**Internacionais:**
- **International Symposium on Organoids** — anual, Países Baixos
- **ISSCR Annual Meeting** — stem cells + organoides
- **Cold Spring Harbor Meetings** — vários eventos de organoids/stem cells por ano
- **EMBO Workshops on Organoids** — curso prático

**Nacionais:**
- **Latin American Society for Stem Cell Research (LASSCR)** — bianual
- **SBB — Sociedade Brasileira de Biologia Celular** — anual, com trilha organoide

**Bancos e recursos:**
- **HUB Organoid Technology** — biobank comercial de organoides tumorais (Holanda)
- **ATCC Organoid Models** — organoides disponíveis para compra
- **BiOrganPrint** — database colaborativo de protocolos
- **Cell Model Passports** — Sanger Institute, caracterização genômica

## Próximos passos de estudo

1. Ler Sato & Clevers (2009) — paper que fundou o campo; obrigatório.
2. Para quem trabalha com câncer: ler Vlachogiannis et al. (2018) — organoides como ferramenta de precisão clínica.
3. Explorar **Organoid Builder** na BIA (preset "organoid-standard") para projetar seu primeiro organoide.
4. Baixar o white paper QMatrix da biblioteca — como MEC descelularizada pode substituir Matrigel.
5. Avançar para o Módulo 9 (Avaliação pós-impressão) — como validar que seu constructo funciona de verdade.
`,
  })
  console.log('✓ M08 Organoides (' + r.action + ', ' + r.summaryChars + ' chars)')
}

main().catch(e => { console.error(e); process.exit(1) })
