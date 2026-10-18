/**
 * R13.14.8 · Conteúdo denso do Módulo 04 — Bioimpressão 3D
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "bioimpressao-3d",
    lessonSlug: "bioimpressao-3d-aula-completa",
    order: 1,
    title: "Bioimpressão 3D — modelagem, fatiamento e parâmetros de impressão",
    durationMin: 100,
    level: "intermediate",
    youtubeId: "vPCHUDn7XkA", // mantém o existente
    biaHook: {
      tool: "bioprint/slice",
      label: "Fatiar modelo 3D na BIA (Bioimpressão)",
      params: { preset: "extrusion-standard" },
    },

    objective: `Dominar o fluxo completo de bioimpressão por extrusão — da modelagem CAD até o G-code otimizado, com parâmetros ajustados para preservar viabilidade celular.

Ao final desta aula você será capaz de:
1. Comparar as 4 técnicas principais de bioimpressão (extrusão, jato, luz, freeform) e saber qual usar para cada aplicação.
2. Preparar um modelo 3D (CAD → STL) com manifold correto, dimensões reais e boa resolução.
3. Fatiar o modelo em G-code ajustando parâmetros críticos: diâmetro do bico, altura de camada, infill, velocidade, pressão, temperatura.
4. Reconhecer os 5 modos de falha típicos durante a impressão e corrigir em tempo real.
5. Documentar protocolo reprodutível para publicação (parâmetros, materiais, pós-processamento).`,

    summary: `## Contexto

**Bioimpressão 3D** é o conjunto de técnicas automatizadas que depositam células + biomateriais camada por camada para construir tecidos ou órgãos tridimensionais. É a técnica central da biofabricação, consolidada no artigo seminal de [Murphy & Atala (2014) na Nature Biotechnology](https://doi.org/10.1038/nbt.2958), que organizou o campo em 3 grandes abordagens: bioimpressão por **extrusão**, **jato (inkjet)** e **luz (laser/DLP/SLA)**.

Hoje, após uma década de evolução, podemos classificar em **4 famílias principais**:

| Técnica | Mecanismo | Resolução | Velocidade | Viabilidade | Melhor para |
|---|---|---|---|---|---|
| **Extrusão (micro-extrusion / FDM-like)** | Pressão (pneumática, pistão, parafuso) empurra biotinta por bico | 100-500 μm | Média | 85-98% | Tecidos moles, scaffolds porosos |
| **Jato (inkjet)** | Gotas (gotejamento piezo/térmico) | 20-100 μm | Alta | 80-95% | Padrões celulares, screenings |
| **Luz (SLA, DLP, 2PP)** | Fotopolimerização de resina líquida | 1-100 μm | Muito alta | 60-90% | Alta resolução, retina, microvasos |
| **Freeform (FRESH, Suspended)** | Impressão em banho de suporte | 20-500 μm | Média | 90-98% | Estruturas complexas, vasos pendentes |

**Extrusão é a técnica mais usada** no mundo (>70% dos labs) por ser versátil, barata (impressoras entry-level a US$ 5-15k) e aceitar biotintas de várias viscosidades. Esta aula foca em extrusão, com overview das outras.

### Fluxo completo de bioimpressão por extrusão

\'\'\'
1. Modelagem CAD (SolidWorks, Fusion 360, FreeCAD, Blender)
   ↓
2. Exportar STL (triangulação de superfície)
   ↓
3. Validar STL (manifold, sem buracos, orientação correta)
   ↓
4. Fatiar (Slic3r, Cura, PrusaSlicer, BioPrinting Studio)
   ↓
5. Gerar G-code (instruções de movimento XYZ + extrusão)
   ↓
6. Carregar biotinta no reservatório (seringa + bico)
   ↓
7. Calibrar: Z-offset, pressão, velocidade
   ↓
8. Imprimir (10-60 min, dependendo do tamanho)
   ↓
9. Reticular (UV/visível, CaCl₂, incubar com enzima)
   ↓
10. Transferir para meio e maturar (biorreator)
\'\'\'

## Conceitos-chave

### Parâmetros críticos de extrusão

Para extrusão pneumática (a mais comum), os 6 parâmetros que você precisa dominar:

| Parâmetro | Faixa típica | Impacto |
|---|---|---|
| **Diâmetro do bico** | 150-840 μm (21G-30G) | Menor = maior resolução, maior shear |
| **Pressão** | 10-150 kPa | Maior = maior fluxo, maior shear |
| **Velocidade do bico (feed rate)** | 1-20 mm/s | Define largura da linha depositada |
| **Altura de camada** | 100-500 μm | Deve ser ~70-80% do diâmetro do bico |
| **Temperatura do bico** | 4-37°C | Baixa p/ não gelificar prematuramente |
| **Temperatura da plataforma** | 4-37°C | Pode acelerar gelificação (ex: colágeno) |

**Relação essencial:** 'altura_camada ≈ 0,75 × diâmetro_bico'
- Bico 25G (260 μm) → altura ótima ~200 μm
- Bico 22G (410 μm) → altura ótima ~300 μm
- Bico 30G (160 μm) → altura ótima ~120 μm

Se a altura for muito baixa (<50%), a biotinta espalha; se muito alta (>100%), as camadas não aderem.

### Bicos: cônico vs. cilíndrico

- **Bicos cônicos (tapered)** — formato de funil; shear stress menor na parede. Preferir para células. Marcas: Nordson Optimum®, CELLINK®, Allevi®.
- **Bicos cilíndricos (straight)** — comprimento todo do mesmo diâmetro; shear maior; mais barato. Usar só para tintas sem células.

O shear stress no bico pode ser calculado por: **τ = (ΔP × r) / (2 × L)** onde ΔP = pressão, r = raio do bico, L = comprimento. Para bico cônico, a equação é mais complexa — [Billiet et al. (2014)](https://doi.org/10.1016/j.biomaterials.2013.12.026) tem o modelo clássico.

### Padrões de preenchimento (infill)

Dentro de uma peça 3D, o fatiador oferece vários padrões:

| Padrão | Shape | Vantagem | Uso |
|---|---|---|---|
| **Linear** | Linhas paralelas | Simples, rápido | Testes iniciais |
| **Grid** | Linhas cruzadas 90° | Bom suporte, poros regulares | Scaffolds genéricos |
| **Gyroid (TPMS)** | Superfície mínima triplicamente periódica | Isotrópico, melhor mecânica, biomimético | Osso, cartilagem |
| **Schwarz** | TPMS alternativa | Permeabilidade alta | Vascularização |
| **Honeycomb** | Hexagonal | Alta razão resistência/peso | Scaffolds leves |
| **Random (Voronoi)** | Padrão aleatório | Mimético ao osso trabecular | Osso trabecular |

**Densidade de infill típica para tecidos:** 20-40% (equilíbrio entre suporte mecânico e espaço para células).

## Distinções que geram confusão (atenção!)

| Termo | Significado |
|---|---|
| **Printing** | Deposição automática camada por camada |
| **Casting** | Molde + hidrogel; sem controle camada a camada |
| **Patterning** | Deposição de padrões 2D (não 3D) |
| **Direct 3D printing (sem células)** | PCL/PLA → scaffold vazio, povoar depois |
| **Bioprinting (com células)** | Células encapsuladas na biotinta durante impressão |
| **Freeform printing (FRESH)** | Imprime em banho de gelatina suporte (removida depois) |

### STL ≠ modelo 3D

**STL** (STereoLithography) é uma triangulação da superfície do modelo, não o modelo em si. Problemas típicos:
- STL **non-manifold** (arestas compartilhadas por 3+ triângulos) → fatiador falha
- STL com **normal invertida** → interior/exterior trocados → infill vai pra fora
- STL **baixa resolução** → curvas aparecem facetadas → escadas visíveis na impressão
- STL **em escala errada** → modelo 100× maior/menor que esperado

**Validadores gratuitos:** Netfabb (Autodesk), 3D Builder (Windows), MeshLab, Blender.

### G-code vs. biotinta

G-code é **universal** (padrão CNC desde anos 1960) mas cada impressora interpreta um dialeto. Comandos essenciais:
- 'G0 X Y Z' — movimento rápido (sem extrusão)
- 'G1 X Y Z E F' — movimento com extrusão (E = quantidade, F = feed rate)
- 'M106 S' — ligar ventilador (não usar com células)
- 'M83' — modo relativo de extrusão
- 'G92 E0' — resetar contador de extrusão

**Erro comum:** copiar G-code de impressora FDM (plástico) para bioimpressora — temperaturas de bico de 200°C+ matam qualquer biotinta.

### FRESH vs. direto

**FRESH** (Freeform Reversible Embedding of Suspended Hydrogels), publicado por [Hinton et al. em Science Advances (2015)](https://doi.org/10.1126/sciadv.1500758), permite imprimir estruturas suaves (alginato, colágeno) **dentro de um banho de microgel de gelatina**, que é liquefeito depois (37°C). Permite estruturas pendentes impossíveis de imprimir no ar (vasos sanguíneos, orelha, válvula).

## Desafios técnicos

1. **Z-offset incorreto** — a distância entre bico e plataforma na 1ª camada define tudo. Z muito alto = linha gorda e descolada; Z muito baixo = linha fina e esmagada. Calibrar sempre antes de iniciar.

2. **Pressão instável** — compressor pulsante gera linhas irregulares. Usar regulador de precisão (<±0,5 kPa) e aguardar estabilização (30s) antes de iniciar impressão.

3. **Bolhas de ar na biotinta** — causam saltos de extrusão (gap na linha). Centrifugar seringa 500g × 2min antes de montar, ou usar seringa com bomba de vácuo.

4. **Resolução lateral vs. vertical descasada** — bico de 25G (260 μm) com altura de 100 μm gera estrutura com camadas muito definidas no eixo Z mas resolução XY limitada. Equilibrar.

5. **Impressão em meio aquoso** — se precisar imprimir submerso (p.ex. em meio de cultura), bioink flutua ou dispersa. Usar material denso ou impressão em banho sacrificial.

6. **Tempo de impressão vs. viabilidade celular** — >60 min de impressão → células no reservatório começam a sofrer. Para peças grandes, dividir em partes e assemblar.

7. **Contaminação durante impressão** — bioprinting idealmente feito em fluxo laminar classe II. Bioprinter aberta em bancada normal = alto risco de contaminação em 48h.

## Erros comuns de pesquisadores iniciantes

**Atenção · Erros que matam a impressão:**

1. **Não calibrar Z-offset antes de cada impressão** — mesmo que use o mesmo bico, a seringa pode estar 0,5 mm diferente. Calibre sempre.

2. **Usar G-code de outra impressora sem adaptar** — cada impressora tem sua origem (0,0,0) e orientação (bico "parado" vs. "móvel"). Nunca copie G-code sem revisar.

3. **Pressão muito alta no início** — comece sempre com 20-30 kPa e suba gradualmente. Pressão alta de cara estoura bolha e desperdiça biotinta.

4. **Imprimir biotinta ainda não equilibrada em temperatura** — biotinta fria (4°C) + bico em 25°C = mudança de viscosidade durante impressão. Aguarde 10-15 min para equilíbrio.

5. **Fatiar com infill 100% em peças grandes** — tempo de impressão dispara, biotinta não dura. Use 20-30% infill com padrão gyroid.

6. **Não documentar parâmetros exatos** — "imprimi com GelMA" não é reprodutível. Documente: lote da gelatina, concentração, pressão (kPa), velocidade (mm/s), bico (modelo + diâmetro), temperatura, umidade, luz UV (comprimento, intensidade, tempo).

7. **Esquecer de reticular** — bioink deposita, você vira pra outra bancada, volta 1h depois e o constructo virou poça. Reticulação é parte da impressão, não "depois".

## Artigos recomendados

**Murphy SV, Atala A · 2014**
3D bioprinting of tissues and organs.
📰 *Nature Biotechnology*
DOI: [10.1038/nbt.2958](https://doi.org/10.1038/nbt.2958)

**Hinton TJ et al. · 2015**
Three-dimensional printing of complex biological structures by freeform reversible embedding of suspended hydrogels (FRESH).
📰 *Science Advances*
DOI: [10.1126/sciadv.1500758](https://doi.org/10.1126/sciadv.1500758)

**Billiet T et al. · 2014**
The 3D printing of gelatin methacrylamide cell-laden tissue-engineered constructs with high cell viability.
📰 *Biomaterials*
DOI: [10.1016/j.biomaterials.2013.12.026](https://doi.org/10.1016/j.biomaterials.2013.12.026)

**Lee A et al. · 2019**
3D bioprinting of collagen to rebuild components of the human heart.
📰 *Science*
DOI: [10.1126/science.aav9051](https://doi.org/10.1126/science.aav9051)

**Jang J et al. · 2017**
3D printed complex tissue construct using stem cell-laden decellularized extracellular matrix bioinks for cardiac repair.
📰 *Biomaterials*
DOI: [10.1016/j.biomaterials.2016.11.034](https://doi.org/10.1016/j.biomaterials.2016.11.034)

**Kolesky DB et al. · 2016**
Three-dimensional bioprinting of thick vascularized tissues.
📰 *PNAS*
DOI: [10.1073/pnas.1521342113](https://doi.org/10.1073/pnas.1521342113)

## Principais pesquisadores do campo

- **Anthony Atala** (Wake Forest Institute) — pioneiro na impressão de órgãos; implantou primeiros tecidos bioimpressos em humanos (bexiga, 1999)
- **Adam Feinberg** (CMU) — criador do método FRESH; impressão de coração completo em 2019
- **Jennifer Lewis** (Harvard Wyss) — DIW, órgãos vascularizados com rede de canais
- **Jürgen Groll** (Würzburg) — padronização de bioinks + biofabricação
- **Lijie Grace Zhang** (George Washington) — bioimpressão de tecidos neurais e vasculares
- **Byoung Soo Kim** (POSTECH) — dECM bioinks para órgãos
- **Dong-Woo Cho** (POSTECH) — primeira orelha bioimpressa com dECM

## Congressos e sociedades científicas

**Internacionais:**
- **International Conference on Biofabrication (ISBF)** — anual, foco direto
- **TERMIS World Congress** — trienal, grande evento de eng. tecidual
- **IEEE EMBC** — sessões de bioprinting todo ano
- **Rapid + TCT (3D Printing Summit)** — maior feira de impressão 3D do mundo (inclui bio)

**Workshops e cursos práticos:**
- **BICO Education Academy** — cursos online pagos, nível avançado
- **CELLINK University** — workshops gratuitos online
- **Allevi Bioprinting Fundamentals** — vídeos técnicos no YouTube

**Softwares essenciais (familiarize-se):**
- **CAD**: Fusion 360 (gratuito p/ pesquisa), FreeCAD (open source), SolidWorks
- **STL validation**: Netfabb (gratuito), MeshLab (open source)
- **Slicers**: PrusaSlicer, Cura, Slic3r, BioPrinting Studio (CELLINK)
- **G-code viewer**: gCodeViewer online, Repetier-Host

## Próximos passos de estudo

1. Ler Murphy & Atala (2014) — ainda é a melhor overview do campo em 1 paper.
2. Assistir ao vídeo da aula para ver na prática fatiamento + impressão.
3. Baixar STL de teste da BIA Academy (ex: cilindro poroso) e fatiar com diferentes bicos no **Bioprint > Slice**.
4. Explorar o **Bioprint > Model** na BIA para parametrizar scaffolds (TPMS, grid, voronoi).
5. Avançar para o Módulo 5 (Arquitetura 3D) — onde você aprende a projetar geometrias impressíveis.
`,
  })

  console.log(`✓ M04 Bioimpressão 3D (${r.action}, ${r.summaryChars} chars)`)
}

main().catch(e => { console.error(e); process.exit(1) })
