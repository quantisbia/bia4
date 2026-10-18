/**
 * R13.14.8 · Conteúdo denso do Módulo 09 — Avaliação pós-impressão
 *
 * Módulo pré-existente com 1 aula vazia (slug=avaliacao-celular, youtubeId=Jb1sA1AuZag).
 * Vamos preencher o summary com conteúdo denso no padrão M01.
 */
import { upsertLessonBySlug } from "./_enrich-helper"

async function main() {
  const r = await upsertLessonBySlug({
    moduleSlug: "avaliacao-celular",
    lessonSlug: "avaliacao-pos-impressao-aula-completa",
    order: 1,
    title: "Avaliação pós-impressão — viabilidade, morfologia, mecânica e histologia",
    durationMin: 90,
    level: "intermediate",
    youtubeId: "Jb1sA1AuZag",
    biaHook: { tool: "pipeline", label: "Projetar painel de avaliação pós-impressão (BIA Pipeline)", params: { context: "post-print-assay" } },

    objective: `Dominar as técnicas de caracterização pós-impressão para validar se um constructo bioimpresso é funcional — do ensaio mais básico (viabilidade por Live/Dead) ao mais avançado (histologia + marcadores moleculares + ensaios mecânicos).

Ao final desta aula você será capaz de:
1. Projetar um painel mínimo de caracterização (viabilidade + morfologia + função + mecânica).
2. Escolher o ensaio de viabilidade correto para cada pergunta (Live/Dead vs MTT vs AlamarBlue vs LDH).
3. Interpretar análises de histologia (H&E, tricrômio, imunohistoquímica, imunofluorescência).
4. Reconhecer artefatos comuns (bordas secas, autofluorescência de GelMA, falso-positivo de MTT).
5. Montar relatório técnico de QC (quality control) para constructo bioimpresso.`,

    summary: `## Contexto

Depois de bioimprimir um constructo, a pergunta inevitável é: **"funcionou?"**. Essa pergunta tem muitas camadas. Está vivo? Quantas células sobreviveram? Elas estão com a morfologia certa? Produzem matriz extracelular? Têm a mecânica correta? Expressam os marcadores do tecido-alvo? Vão sobreviver se eu colocar em bioreator mais 2 semanas?

Avaliação pós-impressão (também chamada de "characterization" ou "quality control") é o pilar mais negligenciado por iniciantes — todos focam na impressora, no bioink e nos parâmetros de impressão, mas poucos planejam o painel de caracterização ANTES de imprimir. O resultado é previsível: termina a impressão, não tem reagentes prontos, não tem controle, não sabe o que medir.

A referência mais citada para esse tema é o roadmap de [Ouyang et al. (2016)](https://doi.org/10.1002/adhm.201600058) e as diretrizes de boas práticas publicadas pela [ASTM F3515-22](https://www.astm.org/f3515-22.html) para caracterização de scaffolds bioimpressos. A regra de ouro: **sem caracterização, não existe reprodutibilidade — e sem reprodutibilidade, não existe ciência (nem produto)**.

Esta aula organiza as técnicas em 4 blocos: (1) viabilidade e proliferação, (2) morfologia e distribuição, (3) função biológica (marcadores + MEC + fenótipo), (4) mecânica e microestrutura. O painel mínimo típico combina 1-2 ensaios de cada bloco.

## Conceitos-chave

### Bloco 1 · Viabilidade celular

**Live/Dead (calceína-AM + homodímero de etídio)**
- Padrão-ouro para viabilidade logo após impressão (D0, D1, D3, D7)
- Calceína-AM: entra em células vivas e vira verde fluorescente (ex 495/em 515 nm)
- Homodímero de etídio: entra apenas em células mortas (membrana rompida) e vira vermelho (ex 528/em 617 nm)
- Protocolo clássico: incubar 30 min a 37°C, imagear em microscópio confocal, contar células em pelo menos 5 campos
- Métrica: % viabilidade = (verde / (verde + vermelho)) × 100
- Limite aceitável: >70% em D1 para publicação; >90% é "excelente"

**MTT / MTS / XTT**
- Sais de tetrazólio reduzidos por desidrogenases mitocondriais ativas
- MTT (sal insolúvel, requer DMSO) → MTS/XTT (sais solúveis, leitura direta)
- MEDE ATIVIDADE METABÓLICA, não viabilidade estrita — alta atividade pode indicar poucas células muito ativas OU muitas células estressadas
- Protocolo: 2-4h de incubação, leitura em 490-570 nm
- Problema conhecido: hidrogéis absorvem o sal, falseando leitura (prefira AlamarBlue para 3D)

**AlamarBlue (Resazurina)**
- Melhor para constructos 3D (penetra em hidrogel)
- Resazurina azul (não fluorescente) é reduzida a resorufina rosa fluorescente
- Leitura por absorbância (570/600 nm) OU fluorescência (ex 560/em 590 nm — mais sensível)
- Não é tóxico — pode-se fazer time-course (D1, D3, D7, D14) no mesmo poço
- Padrão em laboratórios industriais

**LDH (Lactato Desidrogenase)**
- Mede CITOTOXICIDADE (células mortas liberam LDH no sobrenadante)
- Complementar ao Live/Dead — "quanto morreu?"
- Útil para avaliar shear stress da impressão: coletar sobrenadante D0 e comparar com controle não impresso

### Bloco 2 · Morfologia e distribuição

**Microscopia confocal (fluorescência)**
- Marcadores de citoesqueleto: faloidina (F-actina, 488 ou 568 nm) + DAPI (núcleo, 405 nm)
- Permite reconstrução 3D (stacks em Z)
- Avaliar: morfologia (arredondada = esfera, alongada = espraiada), orientação, agregação, formação de redes

**Microscopia eletrônica de varredura (SEM)**
- Topografia da superfície do scaffold + células aderidas
- Preparação: fixar em glutaraldeído, desidratar em etanol graduado, secar por ponto crítico, metalizar com ouro
- Útil para avaliar porosidade real, rugosidade, adesão celular inicial

**Microscopia eletrônica de transmissão (TEM)**
- Ultraestrutura interna (organelas, junções intercelulares, deposição de MEC)
- Preparação complexa: cortes ultrafinos (60-90 nm) + contrastação com urânio/chumbo
- Usado em projetos avançados (publicação em journals Q1)

**Análise de imagem — Fiji/ImageJ**
- Macros padronizadas para contagem celular, área, forma (circularidade, aspect ratio), orientação
- Plugin recomendado: [BoneJ](https://bonej.org/) para scaffolds mineralizados, [TWOMBLI](https://github.com/wershofe/TWOMBLI) para orientação de fibras

### Bloco 3 · Função biológica

**Imunofluorescência (IF) e Imunohistoquímica (IHC)**
- Marcadores por tecido:
  - Osso: osteocalcina (OCN), fosfatase alcalina (ALP), colágeno I, RUNX2, SPARC
  - Cartilagem: colágeno II, agrecano, SOX9, colágeno X (hipertrofia — ALERTA!)
  - Pele: queratina 14 (basal) e 10 (suprabasal), filagrina (barreira), involucrina
  - Fígado: albumina, ureia, CYP3A4, HNF4α
  - Músculo: miosina, actina, desmina, MYOD1
  - Endotélio: CD31 (PECAM-1), vWF, VE-caderina
- Protocolo IF: fixar em PFA 4%, permeabilizar (Triton X-100 0,1%), bloquear (BSA 3%), incubar primário overnight 4°C, secundário 1h RT

**qPCR (expressão gênica)**
- Extração de RNA de constructos: TRIzol ou kit (Qiagen RNeasy)
- Normalizador: GAPDH, β-actina, 18S (usar MÚLTIPLOS para 3D — expressão varia)
- Alvos específicos por tecido (mesmo painel da IF)
- Formato de resultado: 2^-ΔΔCt vs controle

**ELISA / Multiplex (secretoma)**
- Mede o que a célula SECRETA (fatores de crescimento, citocinas, MEC)
- Albumina + ureia para hepatócitos
- VEGF + Ang-1 para endotélio
- IL-6, TNF-α, IL-1β para marcadores de inflamação (constructo rejeitado?)

**Deposição de MEC**
- Coloração: tricrômio de Masson (colágeno), picrossirius red (colágeno I vs III sob luz polarizada), Alcian blue (GAGs/proteoglicanos), vermelho de alizarina (depósitos de cálcio)
- Imagem brightfield suficiente para quantificação por Fiji

### Bloco 4 · Mecânica e microestrutura

**Testes mecânicos — compressão / tração**
- Equipamento: Instron, TA.XTPlus, Discovery HR (DMA)
- Compressão não-confinada é padrão para hidrogéis e scaffolds
- Parâmetros: módulo elástico (Young), tensão de ruptura, deformação na ruptura
- Importante: hidratar completamente antes do teste; testar a 37°C em meio de cultura (não só PBS)

**Reologia pós-impressão**
- G' (módulo de armazenamento) e G" (módulo de perda) ao longo do tempo (cinética de maturação)
- Varredura de frequência (0,1 a 10 Hz) para caracterizar viscoelasticidade

**μCT (micro-tomografia computadorizada)**
- Reconstrução 3D não-destrutiva de porosidade, interconectividade, mineralização
- Resolução típica: 5-50 μm/voxel
- Para scaffolds mineralizados: quantifica BV/TV (bone volume / total volume), Tb.Th (trabecular thickness)

**OCT (Tomografia por Coerência Óptica)**
- Imagem 3D não-destrutiva de hidrogéis (penetra 1-2 mm)
- Útil para monitorar remodelamento em tempo real sem destruir a amostra

## Distinções que geram confusão (atenção!)

| Termo | O que mede | NÃO mede |
|---|---|---|
| **Viabilidade** | % de células vivas (membrana íntegra) | Função, proliferação |
| **Proliferação** | Divisão celular (BrdU, EdU, Ki67) | Viabilidade total |
| **Metabolismo** | Atividade enzimática mitocondrial (MTT, AlamarBlue) | Número exato de células |
| **Citotoxicidade** | Liberação de conteúdo intracelular (LDH, Pierce) | Células vivas |
| **Função** | Marcadores específicos do tecido (IF, qPCR, ELISA) | Viabilidade |

**Confusão clássica**: "A viabilidade por MTT foi de 120%!" — isso significa que a atividade metabólica aumentou em relação ao controle, não que apareceram "mais do que 100% de células". MTT mede atividade por célula × número de células; proliferação ou hipermetabolismo pelo estresse podem gerar >100%.

**Outra confusão**: Fluorescência verde na calceína-AM NÃO É sempre célula viva — autofluorescência do GelMA sob 488 nm pode falsear o resultado. Sempre use controle sem células do mesmo bioink no mesmo dia.

## Desafios técnicos

1. **Penetração de reagentes em hidrogel denso** — moléculas grandes (anticorpos) demoram horas para difundir em um constructo de 2 mm; aumentar tempo de incubação e Triton X-100 ajuda.
2. **Autofluorescência do scaffold** — GelMA (ex 350-450 nm), colágeno (365 nm), PCL (varia); SEMPRE rodar controle sem células do mesmo bioink no mesmo dia.
3. **Fixação sem destruir arquitetura** — PFA 4% é padrão, mas pode encolher hidrogéis em até 20%; glutaraldeído preserva melhor mas interfere em IF.
4. **Padronização de slice/corte histológico** — hidrogéis moles não cortam bem em criostato; crio-preservação em OCT compound a −80°C e cortes de 10-15 μm são o compromisso.
5. **Heterogeneidade espacial** — células no fundo do poço vs superfície vêem O₂ e nutrientes diferentes; AMOSTRAGEM aleatória de pelo menos 5 regiões.
6. **Padronização entre lotes de bioink** — mesmo "GelMA 10%" varia entre fornecedores e lotes; sempre rodar grupo controle no mesmo dia do grupo teste.
7. **Timing de maturação** — alguns marcadores (osteocalcina, albumina) só aparecem após D14-D21; planejar painel com D1, D7, D14, D21 (não só D1!).
8. **Perda de células durante processamento** — centrifugar sobrenadante com reagentes é fonte comum de erro (perde células em suspensão); contar antes e depois do processamento.

## Erros comuns de pesquisadores iniciantes

Atenção · Erros que geram problemas reais

1
**Fazer só Live/Dead D1 e declarar vitória** — viabilidade em D1 reflete trauma da impressão; o que importa é D7-D14 (quando células devem estar crescendo e produzindo MEC).

2
**Não ter grupo controle 2D equivalente** — "a viabilidade foi 85%" perde valor sem comparar com cultura 2D convencional da mesma passagem.

3
**Usar MTT para hidrogéis sem validar** — o sal se cristaliza dentro do gel e falseia leitura. Use AlamarBlue ou LDH.

4
**Esquecer de normalizar por número de células** — ensaios como ALP ou produção de MEC devem ser normalizados por DNA (PicoGreen) ou proteína (BCA), não por volume.

5
**Confundir imagem BONITA com dados RIGOROSOS** — uma foto de confocal lindíssima mostrando células verdes NÃO é quantificação; precisa contagem em pelo menos 5 campos independentes com análise estatística.

6
**Não ter painel de IF validado antes de imprimir** — anticorpos nem sempre funcionam em hidrogéis (bloqueio inespecífico, difusão); teste em 2D antes.

7
**Interpretar colágeno X como "bom" em cartilagem** — colágeno X é marcador de hipertrofia (osso endocondral), não de cartilagem articular madura. Em projeto de cartilagem, é RUIM.

8
**Não documentar protocolo com fotos** — repetir o experimento 6 meses depois é impossível sem fotos passo-a-passo do protocolo exato.

## Artigos recomendados

Ouyang L. et al · 2016

A generalizable strategy for the 3D bioprinting of hydrogels from nonviscous photo-crosslinkable inks.
📰 Advanced Healthcare Materials

DOI: 10.1002/adhm.201600058

Decante G. et al · 2021

Engineering bioinks for 3D bioprinting.
📰 Biofabrication

DOI: 10.1088/1758-5090/abec2c

Riss T. et al · 2004 (atual: 2016)

Cell Viability Assays — Assay Guidance Manual (NIH/NCATS).
📰 Eli Lilly & NCATS Assay Guidance Manual

Link: https://www.ncbi.nlm.nih.gov/books/NBK144065/

Groll J. et al · 2018

A definition of bioinks and their distinction from biomaterial inks.
📰 Biofabrication

DOI: 10.1088/1758-5090/aaec52

Malda J. et al · 2013

25th anniversary article — engineering hydrogels for biofabrication.
📰 Advanced Materials

DOI: 10.1002/adma.201302042

Chimene D. et al · 2016

Advanced bioinks for 3D printing — a materials science perspective.
📰 Annals of Biomedical Engineering

DOI: 10.1007/s10439-016-1638-y

Hunsberger J. et al · 2015

Manufacturing road map for tissue engineering and regenerative medicine technologies.
📰 Stem Cells Translational Medicine

DOI: 10.5966/sctm.2014-0244

## Principais pesquisadores do campo

- **Jos Malda** (UMC Utrecht, Holanda) — editor-chefe de Biofabrication, pioneiro em caracterização mecânica de bioinks
- **Jürgen Groll** (Universidade de Würzburg, Alemanha) — padronização de bioinks e critérios de printabilidade
- **Jennifer Lewis** (Harvard SEAS, EUA) — caracterização de constructos vascularizados por microscopia 4D
- **Ali Khademhosseini** (Terasaki Institute, EUA) — painéis multi-ensaio em microfluídica
- **Hala Zreiqat** (Universidade de Sydney, Austrália) — caracterização mecânica e biológica de scaffolds de osso
- **Marcy Zenobi-Wong** (ETH Zurich, Suíça) — validação de cartilagem bioimpressa (IF + qPCR + mecânica)
- **Luiz Bertassoni** (OHSU, EUA, brasileiro) — vascularização e caracterização funcional em microfluídica

## Congressos e sociedades científicas

**Internacionais** (encontros de referência):

International Conference on Biofabrication

anual · ISBF · sessões dedicadas a "characterization" e "quality assurance"

TERMIS World Congress

trienal · WG de biomanufacturing & QC publica guidelines

Microscopy & Microanalysis (M&M)

anual · EUA · ferramentas de SEM, TEM, confocal para scaffolds

ORS Annual Meeting

anual · ortopedia + caracterização de scaffolds mineralizados

**Nacionais**:

SBB — Sociedade Brasileira de Biomateriais

simpósios de caracterização

CBEB — Congresso Brasileiro de Engenharia Biomédica

sessões de bioinstrumentação e análise

**Normas e boas práticas**:
- [ASTM F3515-22](https://www.astm.org/f3515-22.html) — Standard Guide for Characterization of Hydrogels Used in Regenerative Medicine
- [ISO 10993-5](https://www.iso.org/standard/36406.html) — Biological Evaluation of Medical Devices (citotoxicidade in vitro)
- NIH Assay Guidance Manual — [livre e online](https://www.ncbi.nlm.nih.gov/books/NBK53196/)

## Próximos passos de estudo

1. **Baixar e ler o NIH Assay Guidance Manual** — é o manual mais prático e livre disponível na área.
2. **Montar um painel mínimo para seu projeto**: Live/Dead (D1, D7) + AlamarBlue (D1, D3, D7, D14) + IF para 1 marcador do tecido + 1 ensaio mecânico (compressão).
3. **Validar anticorpos de IF em 2D antes de imprimir** — testar diluições 1:100, 1:200, 1:500 e escolher a melhor relação sinal/ruído.
4. **Avançar para o Módulo 11 (Desenvolvimento de Projeto)** para integrar tudo em um protocolo completo exportável.
5. **Praticar análise de imagem no Fiji/ImageJ** — tutoriais oficiais em https://imagej.net/learn/
`,
  })

  console.log(`✓ M09 Avaliação (${r.action}, ${r.summaryChars} chars)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
