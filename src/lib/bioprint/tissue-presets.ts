/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Tissue Presets para Bioimpressão (R12.54)
 *  ─────────────────────────────────────────────────────────────────────
 *  Camada de "presets de impressão prontos para usar" — distinta do
 *  módulo `tissue-parameters.ts` que descreve a *biomecânica teórica*
 *  do tecido (poro, porosidade, padrão biomimetico).
 *
 *  Aqui mapeamos cada `(tissueId, bioinkId)` → um PRESET COMPLETO de
 *  parâmetros de slicer prontos para gerar G-code que IMPRIME na hora,
 *  acompanhado de:
 *    1. `params`            — parâmetros do slicer (layer, speed, infill…)
 *    2. `rationale`         — explicação de POR QUE cada parâmetro
 *    3. `fluxoBioimpressao` — passo-a-passo do processo de impressão
 *    4. `validacaoEsperada` — o que verificar pós-impressão
 *    5. `referencias`       — papers que embasam as escolhas
 *
 *  Esses presets alimentam o card "Recomendado pela BIA" no /slice
 *  (R12.54). O usuário pode regerar com parâmetros customizados via
 *  o botão "🔧 Ajustar e Regenerar".
 *
 *  ONDA 1 (R12.54): tecidos moles e elásticos com geometrias mais
 *  simples — paredes finas, túbulos, fibras alinhadas:
 *    · membrana        — folha fina sem volume interno
 *    · vaso            — tubular oco com paredes finas
 *    · músculo         — fibras paralelas alinhadas
 *    · nervo           — feixes paralelos de alta resolução
 *
 *  ONDA 2 (R12.55, futuro): cartilagem, pele, fígado, coração, rim
 *  (geometrias complexas, multicamadas, parenquimatosas).
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── Tipos ──────────────────────────────────────────────────────────────

/**
 * Parâmetros completos de impressão. Mapeia 1-pra-1 nos campos que o
 * /slice usa pra montar a request do `/api/gcode/generate`.
 */
export interface PresetParams {
  /** Altura de camada (mm) — define resolução vertical */
  layerHeightMm: number
  /** Velocidade de impressão (mm/s) — tradeoff resolução vs viabilidade */
  printSpeedMmS: number
  /** Pressão pneumática (kPa) — só vale pra bioimpressoras pneumáticas */
  pressureKPa: number
  /**
   * Fluxo de extrusão (M221 S{n}) em %. Hidrogéis normalmente precisam
   * de 30-60% — bem abaixo dos 100% usados em FDM termoplástico.
   */
  flowPercent: number
  /** % de preenchimento (0-100). 0 = só perímetros */
  infillPercent: number
  /** ID do padrão de infill (vide INFILL_PATTERNS / CLASSIC_INFILL_PATTERNS) */
  infillPatternId: string
  /** Número de perímetros (walls) — paredes que formam a casca externa */
  walls: number
  /** Loops de "saia" antes da peça (estabilizam pressão) */
  skirtLoops: number
  /** Retração em mm — hidrogéis normalmente NÃO retraem (0) */
  retractionMm: number
  /** Temperatura do cartucho/bocal (°C) */
  cartridgeTempC: number
  /** Temperatura da mesa (°C) */
  bedTempC: number
  /** Temperatura ambiente da câmara (°C, opcional) */
  chamberTempC: number | null
  /**
   * Quando `true`, força infill=0 e desabilita topo sólido. Útil para
   * membranas finas e testes de impressibilidade.
   */
  perimeterOnly: boolean
}

/** Faixa segura de cada parâmetro — usada nos sliders do painel Regenerar */
export interface ParamRanges {
  layerHeightMm: { min: number; max: number; step: number }
  printSpeedMmS: { min: number; max: number; step: number }
  pressureKPa: { min: number; max: number; step: number }
  flowPercent: { min: number; max: number; step: number }
  infillPercent: { min: number; max: number; step: number }
  walls: { min: number; max: number; step: number }
  skirtLoops: { min: number; max: number; step: number }
  retractionMm: { min: number; max: number; step: number }
  cartridgeTempC: { min: number; max: number; step: number }
  bedTempC: { min: number; max: number; step: number }
}

/**
 * Faixas seguras *gerais* — válidas pra qualquer tecido mole. Tecidos
 * específicos podem refinar (ex.: nervo precisa de layer ≤ 0.2mm).
 */
export const DEFAULT_PARAM_RANGES: ParamRanges = {
  layerHeightMm: { min: 0.05, max: 0.5, step: 0.05 },
  printSpeedMmS: { min: 2, max: 30, step: 1 },
  pressureKPa: { min: 5, max: 150, step: 5 },
  flowPercent: { min: 20, max: 100, step: 5 },
  infillPercent: { min: 0, max: 100, step: 5 },
  walls: { min: 1, max: 5, step: 1 },
  skirtLoops: { min: 0, max: 5, step: 1 },
  retractionMm: { min: 0, max: 5, step: 0.5 },
  cartridgeTempC: { min: 4, max: 40, step: 1 },
  bedTempC: { min: 4, max: 60, step: 1 },
}

/** Referência científica curta (autor, ano, journal) */
export interface PresetReference {
  citation: string
  doi?: string
}

/** Preset completo de bioimpressão para uma combinação (tecido, bioink) */
export interface TissuePreset {
  /** ID do tecido (membrana, vaso, musculo, nervo) — combina com model/category */
  tissueId: string
  /** ID do bioink (alginate, gelma, etc) — combina com BIOMATERIALS / BIOINK_PRESETS */
  bioinkId: string
  /** Nome humano-legível: "Membrana fina (alginato 2%)" */
  displayName: string
  /** Emoji visual */
  emoji: string
  /** Categoria mecânica — agrupa visualmente */
  family: "membrana" | "tubular" | "fibrosa" | "neural" | "parenquimal"
  /** Sumário 1-frase para tooltip/lista */
  summary: string
  /** Parâmetros prontos pra mandar pro engine */
  params: PresetParams
  /** Faixas seguras (overrides do default quando aplicável) */
  ranges?: Partial<ParamRanges>
  /**
   * Por que cada parâmetro foi escolhido. Key = nome do parâmetro,
   * value = explicação curta em pt-BR. Exibido no card "Recomendado pela BIA".
   */
  rationale: {
    layerHeight: string
    speed: string
    flow: string
    infill: string
    walls: string
    pressure?: string
    temperature?: string
  }
  /**
   * Passo-a-passo numerado do PROCESSO de bioimpressão (não confundir
   * com G-code). Inclui prep do bioink, calibração, crosslinking, etc.
   */
  fluxoBioimpressao: string[]
  /**
   * Critérios para validar visualmente que a impressão deu certo.
   * O usuário usa essa lista pra preencher o modal de feedback.
   */
  validacaoEsperada: string[]
  /** Papers que embasam essas escolhas */
  referencias: PresetReference[]
}

// ─── PRESETS ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
// 1) MEMBRANA — folha fina, sem volume interno (1-3mm de espessura)
// ════════════════════════════════════════════════════════════════════════
//
// Aplicações: barreiras tecido-tecido, modelos de difusão, scaffolds 2.5D,
// patches dérmicos, modelos in vitro de epitélio.
//
// Característica chave: ALTURA muito menor que XY. Não tem volume interno
// significativo, então infill=0 e só perímetros formam a estrutura.
// Velocidade lenta e fluxo baixo evitam borramento horizontal (que
// destruiria a definição de bordas finas).

const PRESET_MEMBRANA_ALGINATE: TissuePreset = {
  tissueId: "membrana",
  bioinkId: "alginate",
  displayName: "Membrana fina (alginato 2%)",
  emoji: "🟦",
  family: "membrana",
  summary: "Folha fina sem volume interno — só perímetros formam a estrutura. Crosslink iônico CaCl₂.",
  params: {
    layerHeightMm: 0.15,
    printSpeedMmS: 6,
    pressureKPa: 30,
    flowPercent: 45,
    infillPercent: 0,
    infillPatternId: "classic-lines",
    walls: 2,
    skirtLoops: 2,
    retractionMm: 0,
    cartridgeTempC: 22,
    bedTempC: 4,
    chamberTempC: null,
    perimeterOnly: true,
  },
  ranges: {
    layerHeightMm: { min: 0.1, max: 0.3, step: 0.05 },
    printSpeedMmS: { min: 3, max: 12, step: 1 },
  },
  rationale: {
    layerHeight:
      "Membrana fina (1-3 mm de espessura total): camadas de 0.15 mm dão boa resolução vertical sem virar 'geleca' (membrana real só funciona com bordas bem definidas).",
    speed:
      "6 mm/s é o sweet spot do alginato 2% em bocal 410 µm — mais rápido subextruda (linhas fragmentadas), mais lento desidrata (depósito não-uniforme).",
    flow:
      "45% para alginato pneumático. Nelson et al. (2021) mostra que >60% causa borramento horizontal — fatal pra membranas finas onde a definição de borda é a 'feature' principal.",
    infill:
      "Membrana não tem volume interno — só perímetros formam a estrutura. Por isso `perimeterOnly: true` força infill=0.",
    walls:
      "2 perímetros: o externo dá a forma final, o interno reforça a interface (evita rasgo durante o crosslinking). 1 só fica frágil, 3+ vira parede grossa que perde o caráter de 'membrana'.",
    pressure:
      "30 kPa baixo: alginato 2% é shear-thinning — mais pressão acelera mas comprime o bioink e mata célula (Blaeser et al. 2016).",
  },
  fluxoBioimpressao: [
    "Esterilizar o bocal de 410 µm com etanol 70% — deixar secar 5 min antes de carregar bioink.",
    "Preparar alginato 2% (w/v) em PBS — agitar 2h a 22°C até dissolver completamente; filtrar com 0.22 µm se for usar com células.",
    "Carregar o cartucho refrigerado da bioimpressora — manter a 4-22°C antes de imprimir.",
    "Conectar a BioEnder via /execute (R12.53), fazer home automático (G28) e calibrar altura do bocal (papel sulfite 80g — deve ter atrito leve).",
    "Imprimir saia de 2 loops a 30 kPa — estabiliza a pressão pneumática antes de começar a peça (evita extrusão irregular na primeira camada).",
    "Imprimir a membrana. NÃO usar bed heating — 4°C preserva a integridade estrutural do alginato pré-crosslinking.",
    "Após impressão, banhar em CaCl₂ 100 mM por 5 min para crosslinking iônico (Ca²⁺ substitui Na⁺ no alginato, formando 'egg-box' estrutural).",
    "Lavar 3× em PBS para remover CaCl₂ residual e equilibrar osmolaridade.",
    "Caracterizar: módulo elástico (DMA ou nanoindentação), permeabilidade hidráulica, viabilidade celular (Live/Dead pós-72h se com células).",
  ],
  validacaoEsperada: [
    "Bordas externas BEM DEFINIDAS — sem borramento ou 'orelhas' nos cantos.",
    "Espessura uniforme (variação <10%) ao longo de toda a peça.",
    "Sem furos / falhas de extrusão visíveis a olho nu.",
    "Após CaCl₂, membrana mantém forma fora do banho por >30 segundos.",
    "Translúcida e flexível, mas não pegajosa nem dissolvendo.",
  ],
  referencias: [
    { citation: "Nelson, M. T. et al. (2021) Biofabrication 13(2), 022002", doi: "10.1088/1758-5090/abd590" },
    { citation: "Murphy, S. V. & Atala, A. (2014) Nat Biotechnol 32(8), 773-785", doi: "10.1038/nbt.2958" },
    { citation: "Blaeser, A. et al. (2016) Adv Healthc Mater 5(3), 326-333", doi: "10.1002/adhm.201500677" },
  ],
}

const PRESET_MEMBRANA_GELMA: TissuePreset = {
  tissueId: "membrana",
  bioinkId: "gelma",
  displayName: "Membrana fina (GelMA 7%)",
  emoji: "🟦",
  family: "membrana",
  summary: "Folha fina foto-reticulável — crosslink UV/visível com LAP. Maior bioatividade (RGD).",
  params: {
    layerHeightMm: 0.2,
    printSpeedMmS: 8,
    pressureKPa: 45,
    flowPercent: 50,
    infillPercent: 0,
    infillPatternId: "classic-lines",
    walls: 2,
    skirtLoops: 2,
    retractionMm: 0,
    cartridgeTempC: 25,
    bedTempC: 10,
    chamberTempC: null,
    perimeterOnly: true,
  },
  ranges: {
    layerHeightMm: { min: 0.1, max: 0.3, step: 0.05 },
    printSpeedMmS: { min: 4, max: 15, step: 1 },
    cartridgeTempC: { min: 20, max: 32, step: 1 },
  },
  rationale: {
    layerHeight:
      "0.2 mm: GelMA 7% suporta camadas levemente mais grossas que alginato (maior viscosidade pré-cura). Resolução suficiente pra membranas de 1.5-4 mm.",
    speed:
      "8 mm/s: GelMA tem viscosidade maior (~100-300 Pa.s) — pode ir um pouco mais rápido que alginato sem fragmentar. Acima de 15 mm/s perde definição de borda.",
    flow:
      "50%: GelMA precisa de fluxo levemente maior que alginato pra compensar a contração durante a foto-cura (Schuurman et al. 2013 reporta encolhimento de 5-15%).",
    infill:
      "Membrana: sem volume interno → perimeterOnly + infill 0.",
    walls:
      "2 perímetros — mesmo racional do alginato. Permite remoção do mold de cultura sem rasgar.",
    temperature:
      "Cartridge 25°C: GelMA gelifica abaixo de 20°C (bloqueia o bico). Bed 10°C: ajuda a fixar a primeira camada antes da foto-cura.",
  },
  fluxoBioimpressao: [
    "Preparar GelMA 7% (w/v) + LAP 0.25% (w/v) em PBS — dissolver a 40°C em ambiente escuro (LAP é foto-sensível).",
    "Filtrar com 0.22 µm em ambiente estéril (cabine de fluxo) se for usar com células.",
    "Carregar cartucho aquecido a 25°C — abaixo disso GelMA gelifica e entope o bocal.",
    "Esterilizar bocal 410 µm com etanol 70%, secar 5 min, instalar na bioimpressora.",
    "Conectar a BioEnder via /execute, fazer home + calibrar altura.",
    "Imprimir saia de 2 loops — verifica que o fluxo está estável e o bocal não entupiu.",
    "Imprimir a membrana com bed a 10°C — gelifica a primeira camada e ajuda a aderência.",
    "Aplicar UV 365 nm por 30 segundos (densidade 10-20 mW/cm²) — crosslinking covalente do GelMA via LAP.",
    "Lavar em PBS estéril 2× para remover LAP não-reagido.",
    "Caracterizar mecanicamente (DMA: módulo Young esperado 10-30 kPa) e biologicamente (Live/Dead 24h).",
  ],
  validacaoEsperada: [
    "Após UV, membrana mantém forma DENTRO E FORA do PBS por horas.",
    "Cor levemente amarelada (RGD do GelMA), translúcida.",
    "Flexível ao toque (módulo 10-30 kPa) — pode dobrar sem rasgar.",
    "Sem regiões com gel não-curado (que ficariam pegajosas).",
    "Aderência celular pós-24h boa (RGD do GelMA promove ancoragem — diferente do alginato puro).",
  ],
  referencias: [
    { citation: "Schuurman, W. et al. (2013) Macromol Biosci 13(5), 551-561", doi: "10.1002/mabi.201200471" },
    { citation: "Yin, J. et al. (2018) ACS Appl Mater Interfaces 10(8), 6849-6857", doi: "10.1021/acsami.7b16059" },
  ],
}

// ════════════════════════════════════════════════════════════════════════
// 2) VASO — tubular oco, paredes finas (200-500 µm), lúmen interno
// ════════════════════════════════════════════════════════════════════════
//
// Aplicações: enxertos vasculares pequenos (<6 mm de diâmetro), modelos
// de aterosclerose in vitro, estudo de células endoteliais.
//
// Característica chave: GEOMETRIA TUBULAR — perímetros concêntricos formam
// a parede, lúmen central vazio. Padrão "concentric-spiral" é nativo do
// tecido vascular. Crosslinking duplo (trombina + 37°C) pra colágeno+fibrina.

const PRESET_VASO_COL_FIBRIN: TissuePreset = {
  tissueId: "vaso",
  bioinkId: "col_fibrin_vascular",
  displayName: "Vaso (colágeno I + fibrinogênio)",
  emoji: "🩸",
  family: "tubular",
  summary: "Tubo oco com parede fina e lúmen central. Bioink 100% natural pró-angiogênico.",
  params: {
    layerHeightMm: 0.1,
    printSpeedMmS: 4,
    pressureKPa: 25,
    flowPercent: 40,
    infillPercent: 0,
    infillPatternId: "freeform-suspension",
    walls: 3,
    skirtLoops: 3,
    retractionMm: 0,
    cartridgeTempC: 10,
    bedTempC: 37,
    chamberTempC: null,
    perimeterOnly: true,
  },
  ranges: {
    layerHeightMm: { min: 0.05, max: 0.2, step: 0.05 },
    printSpeedMmS: { min: 2, max: 8, step: 0.5 },
    cartridgeTempC: { min: 4, max: 15, step: 1 },
    bedTempC: { min: 30, max: 40, step: 1 },
  },
  rationale: {
    layerHeight:
      "0.1 mm fina: paredes vasculares reais têm 200-500 µm — precisamos de pelo menos 2-3 camadas pra formar uma parede sem buracos. Camadas mais grossas perdem a definição do lúmen.",
    speed:
      "4 mm/s lento: colágeno I é altamente shear-sensitive (fibras se quebram acima de ~5 mm/s) — perde estruturação fibrilar e fica como gel amorfo.",
    flow:
      "40% baixo: bioink colágeno+fibrina é diluído (~2.5% sólidos totais). Fluxo alto causaria 'puddling' (acúmulo) e perda da forma tubular.",
    infill:
      "Vaso é OCO — perimeterOnly + infill 0. Os 3 perímetros formam a parede; o centro vazio é o lúmen.",
    walls:
      "3 perímetros: forma uma parede de ~900 µm (3 × 300 µm filament width) — próximo da espessura nativa de artéria pequena. <3 pode vazar conteúdo do lúmen.",
    temperature:
      "Cartridge 10°C mantém colágeno líquido. Bed 37°C: gelifica colágeno na hora (transição sol-gel térmica). Esse gradiente é CRÍTICO — sem ele o vaso colapsa.",
    pressure:
      "25 kPa baixo: colágeno+fibrina precisa de extrusão suave. Acima de 50 kPa quebra as fibras de colágeno (perde organização anisotrópica).",
  },
  fluxoBioimpressao: [
    "Em câmara fria (4-10°C, cabine de fluxo refrigerada), preparar colágeno I 0.5% + fibrinogênio 2% em PBS neutro — manter sempre <10°C pra evitar gelificação prematura.",
    "Adicionar trombina 5 U/mL no cartucho na hora — começa o relógio (workable time ~30 min).",
    "Carregar cartucho na bioimpressora com cartridge cooler ativado (10°C).",
    "PRÉ-AQUECER A MESA A 37°C antes de começar — o gradiente térmico cartucho→mesa gelifica o bioink no momento que ele toca a placa.",
    "Esterilizar bocal 250-330 µm (mais fino que outros bioinks pra preservar fibras de colágeno).",
    "Conectar BioEnder, fazer home, calibrar altura.",
    "Imprimir saia de 3 loops devagar — ajuda a equilibrar cartridge fria + bed quente antes da peça.",
    "Imprimir o vaso. Atenção: se a primeira camada não gelificar instantaneamente ao tocar a mesa, AUMENTAR a temperatura do bed em 2°C e regerar.",
    "Após impressão, manter 15 min a 37°C para gelificação completa de trombina+fibrinogênio→fibrina.",
    "Submergir em meio de cultura DMEM + 10% FBS — começar perfusão lenta pelo lúmen (50 µL/min) se for biorreator.",
    "Caracterizar: integridade do lúmen (microscopia), burst pressure, viabilidade endotelial.",
  ],
  validacaoEsperada: [
    "LÚMEN VISÍVEL E ABERTO — não colapsado, pode ser perfundido com líquido.",
    "Parede UNIFORME (sem regiões mais finas que outras) ao longo do comprimento.",
    "Diâmetro externo dentro de ±10% do projetado.",
    "Após gelificação, o vaso mantém a forma sem desabar quando removido da mesa.",
    "Cor branca-amarelada translúcida (típica de colágeno+fibrina hidratado).",
    "Permite perfusão lenta de PBS pelo lúmen sem vazamento pelas paredes.",
  ],
  referencias: [
    { citation: "Kolesky, D. B. et al. (2016) PNAS 113(12), 3179-3184", doi: "10.1073/pnas.1521342113" },
    { citation: "Lee, A. et al. (2019) Science 365(6452), 482-487 (FRESH 2.0)", doi: "10.1126/science.aav9051" },
    { citation: "Norotte, C. et al. (2009) Biomaterials 30(30), 5910-5917", doi: "10.1016/j.biomaterials.2009.06.034" },
  ],
}

const PRESET_VASO_ALGINATE: TissuePreset = {
  tissueId: "vaso",
  bioinkId: "alginate",
  displayName: "Vaso (alginato 3% — econômico)",
  emoji: "🩸",
  family: "tubular",
  summary: "Tubo oco de alginato — versão acadêmica/treinamento. Crosslink CaCl₂.",
  params: {
    layerHeightMm: 0.15,
    printSpeedMmS: 6,
    pressureKPa: 40,
    flowPercent: 50,
    infillPercent: 0,
    infillPatternId: "classic-lines",
    walls: 3,
    skirtLoops: 2,
    retractionMm: 0,
    cartridgeTempC: 22,
    bedTempC: 4,
    chamberTempC: null,
    perimeterOnly: true,
  },
  ranges: {
    layerHeightMm: { min: 0.1, max: 0.25, step: 0.05 },
    printSpeedMmS: { min: 3, max: 12, step: 1 },
  },
  rationale: {
    layerHeight:
      "0.15 mm: alginato 3% (mais concentrado que o de membrana — 2%) sustenta camadas levemente mais grossas.",
    speed:
      "6 mm/s padrão de alginato concentrado — equilíbrio entre tempo de impressão e definição.",
    flow:
      "50% pra alginato 3%: maior viscosidade que o 2% justifica fluxo um pouco maior.",
    infill: "Tubular oco — perimeterOnly + infill 0.",
    walls:
      "3 perímetros: forma parede ~1.2 mm (3 × 410 µm) com alginato grosso — suficiente pra integridade do lúmen mas sem ficar 'salsicha'.",
    pressure:
      "40 kPa moderado: alginato 3% precisa de mais pressão que o 2% — viscosidade aproximadamente o dobro.",
  },
  fluxoBioimpressao: [
    "Preparar alginato 3% em PBS — agitar 3h a 22°C; viscosidade alta (>1000 Pa.s).",
    "Filtrar 0.22 µm é difícil com 3% — usar filtros de seringa 5 µm ou pular se não-estéril.",
    "Carregar cartucho a 22°C (não precisa resfriar).",
    "Esterilizar bocal 410 µm com etanol 70%.",
    "Conectar BioEnder, fazer home, calibrar (alginato concentrado é fácil de calibrar — só achar primeira altura onde extruda continuamente).",
    "Imprimir saia de 2 loops a 40 kPa.",
    "Imprimir o vaso. Sem heating na mesa.",
    "Imergir em CaCl₂ 100 mM por 5 min — crosslinking iônico instantâneo (alginato rígido em segundos).",
    "Lavar 3× em PBS.",
    "Caracterizar: integridade do lúmen, perfusão.",
  ],
  validacaoEsperada: [
    "Lúmen aberto após crosslinking.",
    "Parede com aspecto 'salsicha branca' homogêneo (típico de alginato 3%).",
    "Rigidez sensível ao tato — alginato CaCl₂ é mais rígido que GelMA ou colágeno.",
    "Sem vazamento de água em perfusão suave.",
  ],
  referencias: [
    { citation: "Gao, Q. et al. (2015) Biomaterials 61, 203-215", doi: "10.1016/j.biomaterials.2015.05.031" },
    { citation: "Jia, W. et al. (2016) Biomaterials 106, 58-68", doi: "10.1016/j.biomaterials.2016.07.038" },
  ],
}

// ════════════════════════════════════════════════════════════════════════
// 3) MÚSCULO — fibras paralelas alinhadas, anisotrópico
// ════════════════════════════════════════════════════════════════════════
//
// Aplicações: modelo in vitro de músculo esquelético/cardíaco, patches
// contráteis, estudo de distrofias, screening de fármacos miotrópicos.
//
// Característica chave: ANISOTROPIA — fibras alinhadas em uma direção
// preferencial (paralelas ao eixo X, por exemplo). Padrão `parallel-aligned`
// mantém todas as camadas com filamentos no MESMO sentido (diferente do
// `classic-lines` que rotaciona 90° entre camadas).

const PRESET_MUSCULO_GELMA_DECM: TissuePreset = {
  tissueId: "musculo",
  bioinkId: "gelma_decm_heart",
  displayName: "Músculo cardíaco (GelMA + dECM cardíaca)",
  emoji: "💪",
  family: "fibrosa",
  summary: "Fibras paralelas alinhadas com dECM cardíaca — bioatividade específica de coração.",
  params: {
    layerHeightMm: 0.18,
    printSpeedMmS: 7,
    pressureKPa: 50,
    flowPercent: 55,
    infillPercent: 70,
    infillPatternId: "parallel-lines",
    walls: 1,
    skirtLoops: 2,
    retractionMm: 0,
    cartridgeTempC: 25,
    bedTempC: 10,
    chamberTempC: null,
    perimeterOnly: false,
  },
  ranges: {
    layerHeightMm: { min: 0.1, max: 0.3, step: 0.05 },
    printSpeedMmS: { min: 4, max: 12, step: 1 },
    infillPercent: { min: 50, max: 90, step: 5 },
    cartridgeTempC: { min: 22, max: 32, step: 1 },
  },
  rationale: {
    layerHeight:
      "0.18 mm: GelMA com dECM é levemente mais viscoso que GelMA puro — camadas médias preservam definição das fibras.",
    speed:
      "7 mm/s: equilibra rapidez (peça grande de músculo pode levar 1h+) com preservação da estruturação anisotrópica.",
    flow:
      "55%: ligeiramente acima do GelMA puro pra compensar a dECM (que adiciona ~2% de sólidos).",
    infill:
      "70% paralelo: alta densidade (fibras musculares reais têm volume sólido ~75-85%). Padrão paralelo MANTÉM todas as camadas no mesmo sentido — chave pra anisotropia.",
    walls:
      "1 perímetro: o infill é tão denso (70%) que a casca quase não acrescenta — 1 perímetro só pra suavizar a borda.",
    temperature:
      "Cartridge 25°C (mesmo do GelMA puro). Bed 10°C: gelifica a primeira camada e ajuda a fixar a orientação das fibras antes do UV.",
  },
  fluxoBioimpressao: [
    "Preparar GelMA 7% + dECM cardíaca 2% + LAP 0.25% em PBS — dissolver a 37°C em ambiente escuro (40°C destrói epítopos da dECM).",
    "Filtrar 0.45 µm (0.22 µm entupe com dECM).",
    "Carregar cartucho aquecido a 25°C.",
    "Esterilizar bocal 410 µm.",
    "ALINHAR O EIXO DE IMPRESSÃO com a direção anatômica desejada — gravar isso na anotação do experimento (ex: 'fibras paralelas ao eixo X = direção apical-basal').",
    "Conectar BioEnder, home, calibrar.",
    "Imprimir saia de 2 loops.",
    "Imprimir o músculo. CONFERIR pela câmera do bioprinter (se houver) que todas as camadas estão indo no MESMO sentido — fundamental pra anisotropia.",
    "UV 405 nm (visível, não-tóxica) por 60 segundos — dECM tem grupos sensíveis a UV-C/B (365 nm) → usar 405 sempre que possível.",
    "Imergir em meio cardiomiócito (DMEM + 10% FBS + B27 sem insulina).",
    "Caracterizar: imunofluorescência (alfa-actinina, troponina T), contratilidade espontânea após 5-7 dias se semeado com iPS-CM, módulo elástico (10-50 kPa esperado).",
  ],
  validacaoEsperada: [
    "Fibras visíveis a olho nu OU em microscopia — todas alinhadas na MESMA direção.",
    "Sem 'crosshatch' (linhas perpendiculares) entre camadas — se aparecer, o padrão não foi aplicado corretamente.",
    "Cor amarelo-rosada (mistura do amarelo do GelMA + rosa da dECM).",
    "Após UV, peça flexível mas com resistência claramente maior na direção das fibras que perpendicular (anisotropia mecânica).",
    "Aderência celular pós-24h com cardiomiócitos formando rede orientada (microscopia).",
  ],
  referencias: [
    { citation: "Das, S. et al. (2019) Acta Biomater 95, 188-200", doi: "10.1016/j.actbio.2019.04.026" },
    { citation: "Pati, F. et al. (2014) Nat Commun 5, 3935", doi: "10.1038/ncomms4935" },
    { citation: "Ma, X. et al. (2018) Adv Drug Deliv Rev 132, 235-251", doi: "10.1016/j.addr.2018.06.011" },
  ],
}

const PRESET_MUSCULO_ALGINATE_GELATIN: TissuePreset = {
  tissueId: "musculo",
  bioinkId: "alg_gel_standard",
  displayName: "Músculo (alginato + gelatina — acadêmico)",
  emoji: "💪",
  family: "fibrosa",
  summary: "Fibras paralelas em alginato+gelatina — versão econômica/treinamento.",
  params: {
    layerHeightMm: 0.2,
    printSpeedMmS: 8,
    pressureKPa: 45,
    flowPercent: 50,
    infillPercent: 65,
    infillPatternId: "parallel-lines",
    walls: 1,
    skirtLoops: 2,
    retractionMm: 0,
    cartridgeTempC: 25,
    bedTempC: 4,
    chamberTempC: null,
    perimeterOnly: false,
  },
  ranges: {
    layerHeightMm: { min: 0.1, max: 0.3, step: 0.05 },
    printSpeedMmS: { min: 4, max: 14, step: 1 },
    infillPercent: { min: 50, max: 85, step: 5 },
  },
  rationale: {
    layerHeight:
      "0.2 mm: alginato 2% + gelatina 5% tem viscosidade média — camada de 0.2 dá bom equilíbrio entre velocidade e definição das fibras.",
    speed:
      "8 mm/s: gelatina lubrifica o alginato, permite ir um pouco mais rápido que alginato puro.",
    flow:
      "50%: padrão para essa mistura.",
    infill:
      "65% paralelo: densidade alta com padrão paralelo mantido — direção da fibra preservada.",
    walls: "1 perímetro: borda suavizada apenas.",
    temperature:
      "Cartridge 25°C mantém gelatina fluida (gelifica abaixo de 20°C). Bed 4°C fixa rapidamente cada camada.",
  },
  fluxoBioimpressao: [
    "Preparar alginato 2% + gelatina 5% em PBS — dissolver a 40°C com agitação por 2h.",
    "Resfriar pra 25°C antes de carregar (cartridge não pode estar fervendo).",
    "Carregar cartucho aquecido a 25°C.",
    "Esterilizar bocal 410 µm.",
    "Conectar, home, calibrar — gelatina ajuda a aderência da primeira camada.",
    "Imprimir saia de 2 loops.",
    "Imprimir o músculo no padrão parallel-lines (todas as camadas no mesmo eixo).",
    "Imergir em CaCl₂ 100 mM por 5 min (crosslink alginato).",
    "Manter a 4°C — gelatina fica firme abaixo de 20°C, dando dupla rigidez (Ca²⁺ + termo).",
    "Lavar 3× PBS gelado.",
    "Caracterizar fibras alinhadas em microscopia.",
  ],
  validacaoEsperada: [
    "Fibras paralelas visíveis a olho nu.",
    "Anisotropia mecânica: peça mais rígida ao longo das fibras que perpendicular.",
    "Mantém forma a 4°C, amolece se aquecer a 30°C+ (gelatina derrete).",
    "Cor branco-translúcido.",
  ],
  referencias: [
    { citation: "Chung, J. H. Y. et al. (2013) Biomater Sci 1(7), 763-773", doi: "10.1039/c3bm00012e" },
    { citation: "Costantini, M. et al. (2017) Biomaterials 131, 98-110", doi: "10.1016/j.biomaterials.2017.03.026" },
  ],
}

// ════════════════════════════════════════════════════════════════════════
// 4) NERVO — feixes paralelos de ALTA RESOLUÇÃO (similar a músculo mas
//    com camadas mais finas pra mimetizar axônios)
// ════════════════════════════════════════════════════════════════════════
//
// Aplicações: condutos de regeneração nervosa periférica, modelos
// in vitro de neuropatias, screening de neurotoxicidade.
//
// Característica chave: RESOLUÇÃO MÁXIMA — feixes de 10-100 µm reais
// (axônios) exigem bocal o mais fino possível (250 µm) e camadas finas
// (0.1 mm). Velocidade BAIXÍSSIMA pra preservar células neurais (super
// sensíveis a shear).

const PRESET_NERVO_GELMA_LAM: TissuePreset = {
  tissueId: "nervo",
  bioinkId: "gelma",
  displayName: "Nervo (GelMA 5% + laminina 0.1%)",
  emoji: "🧠",
  family: "neural",
  summary: "Feixes paralelos de alta resolução. Laminina promove crescimento axonal.",
  params: {
    layerHeightMm: 0.1,
    printSpeedMmS: 3,
    pressureKPa: 35,
    flowPercent: 45,
    infillPercent: 50,
    infillPatternId: "parallel-lines",
    walls: 2,
    skirtLoops: 3,
    retractionMm: 0,
    cartridgeTempC: 24,
    bedTempC: 8,
    chamberTempC: null,
    perimeterOnly: false,
  },
  ranges: {
    layerHeightMm: { min: 0.05, max: 0.2, step: 0.025 },
    printSpeedMmS: { min: 1, max: 6, step: 0.5 },
    pressureKPa: { min: 10, max: 60, step: 5 },
    infillPercent: { min: 30, max: 70, step: 5 },
  },
  rationale: {
    layerHeight:
      "0.1 mm: alta resolução vertical necessária pra mimetizar feixes axonais (10-100 µm). Acima de 0.15 mm perde o caráter 'feixe paralelo'.",
    speed:
      "3 mm/s muito lento: células neurais (Schwann, neuronais) são EXTREMAMENTE shear-sensitive — Blaeser et al. mostra que >5 mm/s + 50 kPa pode dropar viabilidade pra <60%.",
    flow:
      "45% baixo: GelMA 5% (menos concentrado que membrana — neuronais não toleram bem >5%) precisa de fluxo moderado.",
    infill:
      "50% paralelo: densidade média deixa espaço entre feixes pra crescimento axonal in vitro. Padrão paralelo mimetiza organização anatômica do nervo periférico.",
    walls:
      "2 perímetros: forma um 'epineuro' externo (a casca do nervo) que dá integridade estrutural.",
    pressure:
      "35 kPa baixo: pressão pneumática alta = morte celular neural. Esse é o maior fator de viabilidade.",
    temperature:
      "Cartridge 24°C (limiar inferior do GelMA — qualquer °C a menos gelifica). Bed 8°C: gradiente suave (neurais não toleram choque térmico).",
  },
  fluxoBioimpressao: [
    "Preparar GelMA 5% + laminina 0.1% (w/v) + LAP 0.25% em PBS — dissolver a 37°C; laminina é instável >40°C.",
    "Filtrar 0.22 µm em câmara escura.",
    "Se for usar com células (Schwann/neuronais), adicionar células AGORA — densidade 1-5 × 10⁶ cells/mL.",
    "Carregar cartucho a 24°C — ATENÇÃO: GelMA 5% gelifica abaixo de 22°C MUITO RÁPIDO.",
    "Bocal 250 µm — mais fino possível pra preservar resolução de feixes.",
    "Conectar BioEnder, home, calibrar com EXTREMA precisão (papel sulfite 80g: deve ter atrito MUITO leve).",
    "Imprimir SAIA DE 3 LOOPS (não 2!) — pressão precisa estar PERFEITAMENTE estável antes da peça.",
    "Imprimir o conduto nervoso. Verificar visualmente que NÃO HÁ INTERRUPÇÕES nas linhas paralelas (cada interrupção = barreira pra crescimento axonal).",
    "UV 405 nm por 45 segundos (mais longo que membrana pra garantir cura completa apesar do GelMA mais diluído).",
    "Imergir em meio neural (Neurobasal + B27 + GlutaMAX + neurotrofinas BDNF/NGF se aplicável).",
    "Caracterizar: imunofluorescência (β-III-tubulina, S100), comprimento axonal pós-7 dias, alinhamento (FFT) das fibras impressas.",
  ],
  validacaoEsperada: [
    "Linhas paralelas SEM INTERRUPÇÕES — qualquer falha é uma barreira pra crescimento axonal.",
    "Diâmetro de cada feixe consistente (variação <15%).",
    "Após UV, mantém forma cilíndrica/prismática.",
    "Cor amarelo-claro translúcido.",
    "Se com células, viabilidade Live/Dead >80% pós-24h.",
    "Se com células, sinais de extensão axonal/alinhamento pós-7 dias (microscopia).",
  ],
  referencias: [
    { citation: "Joung, D. et al. (2018) Adv Funct Mater 28(39), 1801850", doi: "10.1002/adfm.201801850" },
    { citation: "Lozano, R. et al. (2015) Biomaterials 67, 264-273", doi: "10.1016/j.biomaterials.2015.07.022" },
    { citation: "Blaeser, A. et al. (2016) Adv Healthc Mater 5(3), 326-333", doi: "10.1002/adhm.201500677" },
  ],
}

const PRESET_NERVO_ALGINATE: TissuePreset = {
  tissueId: "nervo",
  bioinkId: "alginate",
  displayName: "Nervo (alginato 1.5% — acadêmico)",
  emoji: "🧠",
  family: "neural",
  summary: "Conduto nervoso em alginato suave. Versão acadêmica simples — sem proteínas neurais.",
  params: {
    layerHeightMm: 0.12,
    printSpeedMmS: 4,
    pressureKPa: 30,
    flowPercent: 40,
    infillPercent: 45,
    infillPatternId: "parallel-lines",
    walls: 2,
    skirtLoops: 3,
    retractionMm: 0,
    cartridgeTempC: 22,
    bedTempC: 4,
    chamberTempC: null,
    perimeterOnly: false,
  },
  ranges: {
    layerHeightMm: { min: 0.05, max: 0.2, step: 0.025 },
    printSpeedMmS: { min: 2, max: 8, step: 0.5 },
  },
  rationale: {
    layerHeight:
      "0.12 mm: alginato 1.5% (mais diluído que outros) suporta camadas finas pra preservar resolução dos feixes.",
    speed:
      "4 mm/s lento: mesma justificativa do GelMA — viabilidade neural.",
    flow:
      "40% baixo: alginato 1.5% é fluido, fluxo alto causa puddling.",
    infill:
      "45% paralelo: espaço entre feixes pra crescimento axonal.",
    walls: "2 perímetros: epineuro estrutural.",
    pressure:
      "30 kPa baixo: protege células neurais de shear.",
  },
  fluxoBioimpressao: [
    "Preparar alginato 1.5% em PBS — agitar 2h.",
    "Filtrar 0.22 µm.",
    "Se com células neuronais, adicionar agora (densidade baixa — 1-2 × 10⁶/mL).",
    "Carregar cartucho a 22°C.",
    "Bocal 250-330 µm.",
    "Conectar BioEnder, home, calibrar com precisão.",
    "Imprimir saia de 3 loops devagar.",
    "Imprimir nervo — confirmar paralelismo das linhas.",
    "Imergir em CaCl₂ 50 mM (concentração reduzida pra alginato 1.5%) por 3 min.",
    "Lavar 3× PBS.",
    "Caracterizar feixes em microscopia.",
  ],
  validacaoEsperada: [
    "Linhas paralelas sem interrupções.",
    "Conduto translúcido e flexível.",
    "Sem regiões deformadas ou colapsadas.",
    "Se com células, viabilidade >75% pós-24h (alginato sem laminina é menos amigável que GelMA+laminina).",
  ],
  referencias: [
    { citation: "Wang, J. Z. et al. (2017) Biofabrication 9(2), 025008", doi: "10.1088/1758-5090/aa71c8" },
    { citation: "Suri, S. & Schmidt, C. E. (2010) Tissue Eng Part A 16(5), 1703-1716", doi: "10.1089/ten.tea.2009.0381" },
  ],
}

// ─── Registry consolidado ──────────────────────────────────────────────

/**
 * Todos os presets da Onda 1 (R12.54).
 *
 * IMPORTANTE: a ordem importa — quando o usuário escolhe um tecido,
 * a UI pega o PRIMEIRO preset que combina (`tissueId === selectedTissue`)
 * como sugestão default. Por isso colocamos a versão "principal" antes
 * das versões "econômica/treinamento".
 */
export const TISSUE_PRESETS: TissuePreset[] = [
  PRESET_MEMBRANA_ALGINATE,
  PRESET_MEMBRANA_GELMA,
  PRESET_VASO_COL_FIBRIN,
  PRESET_VASO_ALGINATE,
  PRESET_MUSCULO_GELMA_DECM,
  PRESET_MUSCULO_ALGINATE_GELATIN,
  PRESET_NERVO_GELMA_LAM,
  PRESET_NERVO_ALGINATE,
]

// ─── Lookup helpers ────────────────────────────────────────────────────

/**
 * Retorna o preset exato pra uma combinação `(tissueId, bioinkId)`.
 * Retorna `null` se a combinação não está catalogada.
 */
export function findPreset(tissueId: string, bioinkId: string): TissuePreset | null {
  return TISSUE_PRESETS.find((p) => p.tissueId === tissueId && p.bioinkId === bioinkId) ?? null
}

/**
 * Retorna TODOS os presets pra um dado tecido (várias opções de bioink).
 * Útil pra mostrar "outras opções" no card de recomendação.
 */
export function listPresetsForTissue(tissueId: string): TissuePreset[] {
  return TISSUE_PRESETS.filter((p) => p.tissueId === tissueId)
}

/**
 * Retorna o "melhor" preset pra um tecido (o primeiro do array — convenção:
 * primeiro = mais robusto / cientificamente embasado).
 */
export function getBestPresetForTissue(tissueId: string): TissuePreset | null {
  return TISSUE_PRESETS.find((p) => p.tissueId === tissueId) ?? null
}

/**
 * Retorna lista única de tecidos cobertos pelos presets (pra UI de seleção).
 */
export function listSupportedTissues(): Array<{ id: string; emoji: string; family: string }> {
  const seen = new Set<string>()
  const result: Array<{ id: string; emoji: string; family: string }> = []
  for (const p of TISSUE_PRESETS) {
    if (seen.has(p.tissueId)) continue
    seen.add(p.tissueId)
    result.push({ id: p.tissueId, emoji: p.emoji, family: p.family })
  }
  return result
}

/**
 * Mapeamento `geometryId → tissueId` para inferir automaticamente o
 * tecido a partir do modelo escolhido na /model. Quando o usuário
 * escolhe geometria `heart`, a BIA assume `musculo` (cardíaco) por
 * default — mas o usuário pode trocar manualmente no card de
 * recomendação se quiser usar outro preset.
 *
 * Geometrias que não estão no mapa retornam `null` — o card de
 * recomendação fica oculto e o usuário usa a UI tradicional.
 */
const GEOMETRY_TO_TISSUE: Record<string, string> = {
  // Membranas — folhas finas, perimeter-only
  "membrane": "membrana",
  "disk": "membrana",
  "cornea": "membrana",
  // Vasos — tubular oco
  "vessel": "vaso",
  // Músculo — foco em anisotropia / fibras alinhadas
  "heart": "musculo",
  // Nervo: nenhuma geometria default mapeia diretamente — o usuário
  // pode imprimir um "vessel" e selecionar manualmente o preset de nervo
  // (que tem padrão parallel-lines em vez de freeform-suspension).
}

/**
 * Infere o tecido (membrana / vaso / musculo / nervo) a partir do
 * geometryId. Retorna null se a geometria não tem mapeamento direto —
 * nesse caso o usuário deve escolher o tecido manualmente.
 */
export function inferTissueFromGeometry(geometryId: string | null): string | null {
  if (!geometryId) return null
  return GEOMETRY_TO_TISSUE[geometryId] ?? null
}

/**
 * Faixas seguras pra um preset específico (merge das `ranges` do preset
 * com os defaults globais). Usado pelos sliders do painel Regenerar.
 */
export function getRangesForPreset(preset: TissuePreset): ParamRanges {
  return {
    ...DEFAULT_PARAM_RANGES,
    ...(preset.ranges ?? {}),
  }
}

/**
 * Compara os parâmetros atuais do usuário com o preset recomendado e
 * retorna quantos parâmetros foram alterados.
 *
 * Útil pra mostrar o badge "⚠️ Você ajustou N parâmetros fora do recomendado"
 * no painel Regenerar.
 */
export function countParamDeviations(current: PresetParams, recommended: PresetParams): number {
  const keys: Array<keyof PresetParams> = [
    "layerHeightMm",
    "printSpeedMmS",
    "pressureKPa",
    "flowPercent",
    "infillPercent",
    "infillPatternId",
    "walls",
    "skirtLoops",
    "retractionMm",
    "cartridgeTempC",
    "bedTempC",
    "perimeterOnly",
  ]
  let count = 0
  for (const k of keys) {
    if (current[k] !== recommended[k]) count++
  }
  return count
}
