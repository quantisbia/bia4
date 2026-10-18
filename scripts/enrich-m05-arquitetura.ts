/**
 * R13.14.8 · Conteúdo denso do Módulo 05 — Arquitetura 3D
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "arquitetura-3d",
    lessonSlug: "arquitetura-3d-aula-completa",
    order: 1,
    title: "Arquitetura 3D — scaffolds, porosidade e TPMS",
    durationMin: 80,
    level: "intermediate",
    biaHook: {
      tool: "bioprint/model",
      label: "Projetar scaffold 3D na BIA",
      params: { preset: "scaffold-gyroid" },
    },

    objective: `Dominar o design arquitetural de constructos 3D — da geometria básica (grid, honeycomb) aos padrões biomiméticos avançados (TPMS, Voronoi), com foco em porosidade, permeabilidade e matching mecânico com o tecido-alvo.

Ao final desta aula você será capaz de:
1. Explicar por que arquitetura 3D afeta diretamente viabilidade celular, vascularização e integração tecidual.
2. Calcular porosidade (vazios), interconectividade e tamanho de poro ideal para cada tecido.
3. Projetar scaffolds com geometrias TPMS (Gyroid, Schwarz, Diamond, Primitive) e saber quando cada uma é indicada.
4. Comparar scaffolds grid (cartesianos) vs. TPMS vs. Voronoi para osso, cartilagem, pele e tecidos moles.
5. Validar manufaturabilidade da arquitetura antes de imprimir (overhangs, ângulos, espessura mínima).`,

    summary: `## Contexto

Em biofabricação, **arquitetura 3D** é o design geométrico interno do constructo — não só a forma externa (que vem do CAD), mas o padrão de preenchimento, a distribuição de poros, a hierarquia de canais, a orientação de fibras. Esta arquitetura **determina o destino biológico** do constructo tanto quanto a biotinta.

O princípio foi consolidado por [Hollister (2005) na Nature Materials](https://doi.org/10.1038/nmat1421) no artigo seminal *"Porous scaffold design for tissue engineering"*: as células não vêem apenas o material químico, vêem **topografia, mecânica local e espaço disponível**. Um mesmo biomaterial em diferentes arquiteturas gera tecidos diferentes.

Três exigências biológicas fundamentais que a arquitetura precisa resolver:

1. **Transporte de massa** — oxigênio, nutrientes e metabólitos precisam entrar; CO₂ e resíduos precisam sair. Sem rede de poros interconectados, o centro do constructo necrosa em <72h (limite de difusão ~200 μm, Rouwkema et al. 2008).

2. **Migração e colonização celular** — poros muito pequenos (<50 μm) bloqueiam entrada de células; poros muito grandes (>500 μm) não dão suporte para adesão. Faixa ótima varia por tecido.

3. **Matching mecânico** — scaffold rígido demais para o tecido-alvo desvia a diferenciação celular (osso quer kPa altos, cérebro quer kPa baixíssimos — Discher et al. 2005).

Arquitetura 3D é o que diferencia **um bloco maciço de biomaterial** (quase sempre falha) de um **scaffold funcional** (coloniza, vasculariza, integra).

## Conceitos-chave

### Parâmetros arquiteturais essenciais

| Parâmetro | O que mede | Faixa típica | Impacto biológico |
|---|---|---|---|
| **Porosidade (φ)** | % volume de vazios | 40-95% | > nutrição, < mecânica |
| **Tamanho de poro** | Diâmetro médio | 50-800 μm | Define quais células entram |
| **Interconectividade** | % poros conectados | 70-100% | Essencial p/ vascularização |
| **Espessura de parede (strut)** | μm | 50-500 μm | Limite de impressão + mecânica |
| **Razão superfície/volume (SSA)** | mm²/mm³ | 1-50 | > adesão celular |
| **Permeabilidade (k)** | 10⁻⁹ a 10⁻¹¹ m² | Fluxo de fluido | Perfusão em biorreator |

### Tamanho de poro ideal por tecido

Baseado em revisão de [Loh & Choong (2013)](https://doi.org/10.1089/ten.teb.2012.0437):

| Tecido | Tamanho de poro ótimo |
|---|---|
| **Fibroblastos (pele, geral)** | 90-360 μm |
| **Osteoblastos / osso** | 200-500 μm (ideal 300-400) |
| **Condrócitos / cartilagem** | 200-400 μm |
| **Hepatócitos** | 20-125 μm |
| **Neurônios** | 60-500 μm |
| **Vascularização (vasos)** | > 300 μm (para capilares entrarem) |

### Geometrias de arquitetura

#### 1. Grid cartesiano (padrão clássico)
Linhas paralelas em cada camada, cruzadas 90° entre camadas sucessivas. **Vantagens**: simples, imprimível em qualquer impressora, poros bem definidos. **Desvantagens**: anisotropia (propriedades diferentes nas 3 direções), poros quadrados (menos biomiméticos), concentração de stress nas junções.

**Quando usar**: testes iniciais, caracterização de material, experiments de proof-of-concept.

#### 2. TPMS (Triply Periodic Minimal Surfaces)
Superfícies matemáticas periódicas descobertas por **Schwarz (1890)** e redescobertas pela biofabricação. São superfícies infinitas sem auto-intersecção, com curvatura média zero em todos os pontos. **Isotropia natural** (mesmas propriedades em todas as direções) e **biomimética** (osso trabecular tem geometria TPMS-like).

Principais famílias:

| TPMS | Equação implícita (simplificada) | Características |
|---|---|---|
| **Gyroid** | sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x) = 0 | Mais isotrópico, melhor permeabilidade |
| **Schwarz-P** | cos(x) + cos(y) + cos(z) = 0 | Alta superfície específica, estrutura simples |
| **Diamond** | sin(x)sin(y)sin(z) + sin(x)cos(y)cos(z) + ... = 0 | Alta resistência mecânica |
| **Primitive (I-WP)** | 2(cos(x)cos(y)+cos(y)cos(z)+cos(z)cos(x)) - (cos(2x)+cos(2y)+cos(2z)) = 0 | Padrão simples de impressão |

**Quando usar TPMS**: osso (Gyroid é padrão-ouro), cartilagem, tecidos que precisam de alta permeabilidade e isotropia mecânica. [Yánez et al. (2018)](https://doi.org/10.1016/j.msec.2017.11.047) mostrou que scaffolds Gyroid de Ti6Al4V têm propriedades mecânicas 30% melhores que grid para implantes ósseos.

#### 3. Voronoi / aleatório
Tesselação irregular do espaço, mimética ao osso trabecular natural. Gerada computacionalmente a partir de pontos semente aleatórios. **Vantagens**: muito biomimética, propriedades locais variáveis, pode ser otimizada por carga (topologia). **Desvantagens**: imprimível só em técnicas avançadas (SLM/EBM metais, DLP para polímeros).

**Quando usar**: osso trabecular, scaffolds personalizados por paciente, pesquisa avançada.

#### 4. Hierárquica / multiescala
Combina múltiplas escalas (ex: canais macroscópicos para vascularização + microporos para adesão celular). Imita a estrutura hierárquica do osso (osteon de ~200 μm com canal de Havers no centro + lacunas de ~20 μm nos lados).

**Quando usar**: tecidos vascularizados complexos, osso de alta performance.

### Como escolher a arquitetura certa

Fluxograma simplificado:

\'\'\'
Tecido-alvo?
├─ Osso denso → Gyroid 40-60% porosidade, poro ~300-400 μm, parede 200 μm
├─ Osso trabecular → Voronoi ou Gyroid 70-85%, poro 400-600 μm
├─ Cartilagem → Grid ou Gyroid 50-70%, poro 200-400 μm
├─ Pele → Grid ou honeycomb 60-80%, poro 100-200 μm
├─ Tecido mole (pele mole, muscular) → Grid 70-90%, poro 100-300 μm
├─ Vascular / tubular → Hollow cylinder + hierárquica, canal central 200+ μm
└─ Teste in vitro / screening → Grid simples 50-70%, barato e rápido
\'\'\'

## Distinções que geram confusão (atenção!)

### Porosidade total ≠ porosidade acessível

**Porosidade total (φ)** = volume de vazios ÷ volume total.
**Porosidade acessível** = volume de poros CONECTADOS ao exterior.

Um scaffold pode ter 80% porosidade total mas 30% acessível (poros isolados). Para transporte e vascularização, só interessa a acessível. Medir com intrusão de mercúrio ou análise μCT.

### Infill ≠ porosidade

- **Infill** é um parâmetro do slicer: % de material no interior da peça (vs. casca sólida externa). Infill 30% ≠ scaffold 30%.
- **Porosidade** é propriedade do design final (contando parede + interior).
- Peça com 100% infill mas usando padrão TPMS ainda tem porosidade (porque o TPMS é a geometria em si).

### Scaffold vs. implante

| Termo | Significado |
|---|---|
| **Scaffold** | Estrutura 3D porosa que serve como "andaime" para células |
| **Implante** | Dispositivo médico (pode ou não ser poroso) |
| **Prótese** | Dispositivo que substitui função perdida (geralmente não-biológica) |
| **Enxerto** | Tecido vivo transplantado |

### Mecânica isotrópica vs. anisotrópica

- **Isotrópico** — propriedades iguais em todas as direções (ex: Gyroid, Voronoi aleatório). Ideal para tecidos homogêneos.
- **Anisotrópico** — propriedades dependem da direção (ex: grid cartesiano). Pode ser DESEJÁVEL (osso cortical, músculo esquelético têm anisotropia nativa).

## Desafios técnicos

1. **Overhangs e ângulos impossíveis** — qualquer impressão por extrusão falha em ângulos >45° sem suporte. Para TPMS/Voronoi, usar material sacrificial (Pluronic) ou impressão em banho (FRESH).

2. **Espessura de parede abaixo da resolução** — projetar scaffold com paredes de 100 μm mas imprimir com bico de 200 μm = falha. Validar com: 'espessura_parede ≥ 2 × diâmetro_bico'.

3. **Shrinkage após reticulação** — hidrogéis encolhem 5-20% após gelificar. Projetar scaffold 10-15% maior que a dimensão alvo.

4. **Densidade heterogênea no infill** — padrões cartesianos podem gerar "linhas de falha" onde camadas sucessivas não se tocam bem. Compensar com rotação de camada (45° entre camadas).

5. **Caracterização difícil** — medir porosidade de scaffold mole (hidrogel) com μCT exige contraste (iodo, ósmio). Para scaffold rígido é mais fácil.

6. **Fatiamento de TPMS exige slicer avançado** — fatiadores padrão (Cura, Slic3r) não geram TPMS nativamente. Usar: nTopology (pago), MSLattice (gratuito), FreeCAD + plugins, ou a BIA (Formulator Pro + Bioprint Model).

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros que arruínam o scaffold:**

1. **Projetar scaffold sem considerar o diâmetro do bico** — modelo CAD lindo no computador que depois não imprime porque as paredes são menores que a resolução.

2. **Copiar porosidade de paper sem adaptar** — paper diz "70% porosidade com Gyroid" mas usa biomaterial diferente, impressora diferente, bico diferente. Validar com seu setup.

3. **Ignorar interconectividade** — "80% porosidade" sem checar se os poros conectam = scaffold que não permite colonização celular.

4. **Scaffold grosso sem canais vasculares** — qualquer peça >5 mm sem canais embutidos vai necrosar no centro. Projetar canais ≥ 300 μm desde o CAD.

5. **Não documentar os parâmetros do TPMS** — "fizemos Gyroid" não é reprodutível. Documente: unit cell size, offset (controla porosidade), espessura de parede, equação exata.

6. **Overengineer: TPMS para proof-of-concept** — às vezes grid simples 60% porosidade basta para o teste. Comece simples, complexifique só se necessário.

7. **Não validar propriedades mecânicas antes do estudo celular** — scaffold pode ter porosidade perfeita mas módulo elástico 10× fora do alvo → células diferenciam no tipo errado.

## Artigos recomendados

**Hollister SJ · 2005**
Porous scaffold design for tissue engineering.
📰 *Nature Materials*
DOI: [10.1038/nmat1421](https://doi.org/10.1038/nmat1421)

**Loh QL, Choong C · 2013**
Three-dimensional scaffolds for tissue engineering applications: role of porosity and pore size.
📰 *Tissue Engineering Part B*
DOI: [10.1089/ten.teb.2012.0437](https://doi.org/10.1089/ten.teb.2012.0437)

**Yánez A et al. · 2018**
Compressive behaviour of gyroid lattice structures for human cancellous bone implant applications.
📰 *Materials Science and Engineering C*
DOI: [10.1016/j.msec.2017.11.047](https://doi.org/10.1016/j.msec.2017.11.047)

**Kadkhodapour J et al. · 2015**
Failure mechanisms of additively manufactured porous biomaterials: Effects of porosity and type of unit cell.
📰 *Journal of the Mechanical Behavior of Biomedical Materials*
DOI: [10.1016/j.jmbbm.2015.06.012](https://doi.org/10.1016/j.jmbbm.2015.06.012)

**Rouwkema J, Rivron NC, van Blitterswijk CA · 2008**
Vascularization in tissue engineering.
📰 *Trends in Biotechnology*
DOI: [10.1016/j.tibtech.2008.04.009](https://doi.org/10.1016/j.tibtech.2008.04.009)

**Yoo DJ · 2011**
Porous scaffold design using the distance field and triply periodic minimal surface models.
📰 *Biomaterials*
DOI: [10.1016/j.biomaterials.2011.06.012](https://doi.org/10.1016/j.biomaterials.2011.06.012)

## Principais pesquisadores do campo

- **Scott Hollister** (Georgia Tech, EUA) — pioneiro em scaffold design computacional; impressão de traqueia pediátrica em paciente real
- **Dietmar W. Hutmacher** (QUT, Austrália) — scaffolds de PCL para osso em escala clínica, geometria otimizada
- **Lorenzo Moroni** (MERLN Institute, Holanda) — scaffolds hierárquicos multiescala
- **Chee Kai Chua** (Nanyang, Singapura) — bíblia da manufatura aditiva (livro-texto); scaffolds biomédicos
- **Juan A. Sanz-Herrera** (Sevilha) — modelagem matemática de TPMS para tecidos
- **Dong-Jin Yoo** (Sejong, Coreia) — primeiro paper comparando TPMS para biomedicina

## Congressos e sociedades científicas

**Internacionais:**
- **ASME International Mechanical Engineering Congress** — EUA, trilha de bioengenharia
- **European Society of Biomechanics (ESB) Congress** — Europa, bienal
- **World Congress of Biomechanics** — maior evento mundial, quadrienal
- **AM4TE (Additive Manufacturing for Tissue Engineering)** — workshop focado

**Softwares especializados em arquitetura 3D:**
- **nTopology (nTop)** — padrão de ouro para TPMS, Voronoi, otimização topológica (pago)
- **MSLattice** — gratuito, geração de TPMS a partir de CAD
- **Materialise 3-Matic** — scaffold design + otimização (pago, muito usado em indústria médica)
- **FreeCAD + Mesh Designer** — gratuito, menos funcional
- **BIA — Bioprint Model** — da própria Quantis, suporta Gyroid, Schwarz e Voronoi

**Periódicos relevantes:**
- *Additive Manufacturing* (Elsevier, IF ~11)
- *Materials Science and Engineering: C* (Elsevier)
- *Journal of the Mechanical Behavior of Biomedical Materials*
- *Biofabrication* (IOP)

## Próximos passos de estudo

1. Ler Hollister (2005) — ainda é a referência obrigatória para scaffold design.
2. Explorar o **Bioprint > Model** na BIA e gerar seu primeiro scaffold Gyroid (preset "scaffold-gyroid").
3. Comparar porosidade total vs. acessível em CAD vs. imprimido (use μCT se disponível).
4. Ler Yánez et al. (2018) sobre Gyroid para osso.
5. Avançar para o Módulo 6 (Células) — onde você aprende quais células colocar no scaffold.
`,
  })

  console.log(`✓ M05 Arquitetura 3D (${r.action}, ${r.summaryChars} chars)`)
}

main().catch(e => { console.error(e); process.exit(1) })
