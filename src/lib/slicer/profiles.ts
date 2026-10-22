/**
 * BIA v4 · R15 · BioSlicer — Perfis de fatiamento (Básico e Avançado)
 *
 * BÁSICO ("o que dá certo"): 4 perfis conservadores para começar em
 * Ender/BioEnder com seringa 10 mL e agulha 22G–18G.
 * AVANÇADO: perfis por objetivo biológico, todos os parâmetros + dicas.
 *
 * Fontes: Compaired 2025 (IJB) · Allevi GelMA · Ribeiro 2017 · Ouyang 2016 ·
 * Blaeser 2016 · Cordova 2024 (Enderstruder) · Hinton 2015 / Lee 2019 (FRESH).
 */

import type { SliceParams, SliceProfile, ExtrusionModel } from "./types"
import { DEFAULT_EXTRUSION_SYRINGE_10ML, defaultLayerHeight, defaultLineWidth } from "./extrusion"

export function baseParams(nozzle_mm = 0.41): SliceParams {
  const h = defaultLayerHeight(nozzle_mm)
  return {
    layerHeight_mm: h,
    firstLayerHeight_mm: Math.round(h * 0.9 * 100) / 100,
    nozzleDiameter_mm: nozzle_mm,
    lineWidth_mm: defaultLineWidth(nozzle_mm),
    wallCount: 1, wallOrder: "outside_in", seam: "nearest", infillOverlap: 0.15,
    infillPattern: "rectilinear", infillDensity: 30, infillAngle_deg: 0, infillAngleStep_deg: 90,
    strandSpacing_mm: undefined, infillEveryNLayers: 0,
    bottomLayers: 0, topLayers: 0,
    speedPerimeter_mms: 6, speedInfill_mms: 8, speedFirstLayer_mms: 4, speedTravel_mms: 40, speedZ_mms: 5,
    zHop_mm: 1.0, retractMinTravel_mm: 2, avoidCrossing: true,
    skirtLoops: 0, skirtDistance_mm: 4, purgeLine_mm: 0, // R19: skirt opt-in — 1º cordão nasce no ponto zero
    cartridgeTemp_C: null, bedTemp_C: null, waitForTemps: false,
    originX_mm: 0, originY_mm: 0, zOffset_mm: 0, scale: 1, rotationZ_deg: 0,
    hasCells: false, layerPause_s: 0, customStart: "", customEnd: "", customLayerChange: "",
    firmware: "marlin", verboseComments: true,
  }
}

function withExtrusion(partial: Partial<ExtrusionModel> = {}): ExtrusionModel {
  return { ...DEFAULT_EXTRUSION_SYRINGE_10ML, ...partial }
}

export const BASIC_PROFILES: SliceProfile[] = [
  {
    id: "basic_first_print",
    name: "Primeira impressão (alginato/gelatina)",
    description: "Começa aqui. Grade 0/90 em 2–4 camadas, agulha 22G (0,41 mm), seringa 3 mL (êmbolo anda 2,8× mais que na de 10 mL). Fator de extrusão 1,6×, pré-carga automática, zero retração.",
    tier: "basic",
    params: { ...baseParams(0.41), infillPattern: "rectilinear", infillDensity: 35, wallCount: 1, speedPerimeter_mms: 8, speedInfill_mms: 9, speedFirstLayer_mms: 6, zHop_mm: 0.8, skirtLoops: 0 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.5, retractVolume_uL: 0, flowMultiplier: 1.6, bioinkClass: "soft_hydrogel" }),
    tips: [
      "Posicione o bico ENCOSTADO no substrato (ou a ~0,3 mm) antes de iniciar — o G92 vai zerar ali.",
      "R25: o G-code começa com uma PRÉ-CARGA (~45 µL) que enche a agulha até o filamento aparecer. Se já purgou pelo Host, pode pular esse trecho.",
      "Seringa 10 mL = 165 mm²: cada µL move o êmbolo só 0,006 mm. Se não sair, troque para seringa 3–5 mL — o êmbolo anda 1,5–2,8× mais por µL.",
      "Alginato 3–4 % + gelatina 7–8 % a ~24 °C é a biotinta mais tolerante para o primeiro dia.",
      "Se o cordão sair fino/interrompido → aumente o fluxo 10 % (M221 S110) ou reduza velocidade.",
      "Se o cordão espalhar e os poros fecharem → reduza fluxo (M221 S90) ou aumente a velocidade.",
      "Reticule com CaCl₂ 100 mM só DEPOIS de terminar a peça.",
    ],
    references: ["Ribeiro 2017 Biofabrication 10.1088/1758-5090/aa90e2", "Ouyang 2016 Biofabrication 10.1088/1758-5090/8/3/035020"],
  },
  {
    id: "basic_gelma",
    name: "GelMA 7–10 % (fotorreticulável)",
    description: "Perfil Allevi/IJB-2025 adaptado: 5–8 mm/s, camada ≈ 0,8×bico, cartucho a 22–24 °C.",
    tier: "basic",
    params: { ...baseParams(0.41), infillPattern: "rectilinear", infillDensity: 40, speedPerimeter_mms: 8, speedInfill_mms: 9, speedFirstLayer_mms: 6, cartridgeTemp_C: 23, bedTemp_C: null, zHop_mm: 1 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.5, retractVolume_uL: 0.4, flowMultiplier: 1.6, bioinkClass: "soft_hydrogel" }),
    tips: [
      "GelMA tem janela térmica estreita: 21–25 °C. Acima disso escorre, abaixo entope.",
      "Teste a viscosidade na seringa: quando as bolhas pararem de subir, está pronto.",
      "Proteja o LAP/Irgacure da luz; reticule com 405 nm (LAP) por 10–30 s ao final.",
      "Compaired 2025: 75 kPa e 600 mm/min (10 mm/s) foi o ótimo em pneumático — em seringa comece a 5–7 mm/s.",
    ],
    references: ["Compaired 2025 IJB 10.36922/ijb.4815", "Allevi GelMA protocol"],
  },
  {
    id: "basic_pluronic_sacrificial",
    name: "Pluronic F127 (sacrificial/canal)",
    description: "Pluronic 30–40 % a 22 °C é gel firme — ótimo para treinar paredes e canais; derrete a 4 °C.",
    tier: "basic",
    params: { ...baseParams(0.41), infillPattern: "none", infillDensity: 0, wallCount: 2, speedPerimeter_mms: 10, speedInfill_mms: 11, speedFirstLayer_mms: 7, cartridgeTemp_C: 23 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.2, retractVolume_uL: 0.3, flowMultiplier: 1.3, bioinkClass: "sacrificial" }),
    tips: [
      "Pluronic é tixotrópico e com yield stress alto — segura paredes de 10+ camadas.",
      "Para remover: incube a 4 °C por 10–15 min e lave com PBS gelado.",
      "Não deixe a seringa esquentar na mão > 30 °C: perde viscosidade.",
    ],
  },
  {
    id: "basic_paste_test",
    name: "Teste de calibração (pasta/creme)",
    description: "Quadrado 20×20 mm em 2 camadas com uma pasta barata (creme dental, gelatina) para calibrar E-steps e fluxo.",
    tier: "basic",
    params: { ...baseParams(0.84), infillPattern: "zigzag", infillDensity: 30, wallCount: 1, speedPerimeter_mms: 10, speedInfill_mms: 12, speedFirstLayer_mms: 8, skirtLoops: 0, purgeLine_mm: 20 },
    extrusion: withExtrusion({ primeVolume_uL: 3, retractVolume_uL: 1, flowMultiplier: 1.15, bioinkClass: "paste" }),
    tips: [
      "Calibre E-steps: envie `G91`, `G1 E10 F100`, meça o êmbolo (deve andar 10 mm) e ajuste com `M92 E<novo>` + `M500`.",
      "Fluxo: meça a largura real do cordão; se > largura esperada, reduza o multiplicador proporcionalmente.",
      "Habilite extrusão a frio: `M302 S0` — bioimpressoras não têm hotend.",
    ],
  },
]

export const ADVANCED_PROFILES: SliceProfile[] = [
  {
    id: "adv_bone_scaffold",
    name: "Scaffold ósseo (woodpile 0/90, poro 300–500 µm)",
    description: "Alta porosidade interconectada para osteocondução. Espaçamento explícito; agulha 18–20G; alginato/gelatina/HAp ou PCL-compósito.",
    tier: "advanced",
    params: { ...baseParams(0.60), infillPattern: "rectilinear", infillAngleStep_deg: 90, strandSpacing_mm: 1.0, infillDensity: 60, wallCount: 1, speedPerimeter_mms: 8, speedInfill_mms: 9, infillOverlap: 0.1, zHop_mm: 1 },
    extrusion: withExtrusion({ syringe: { volume_mL: 5, innerDiameter_mm: 12.06 }, primeVolume_uL: 1.5, retractVolume_uL: 0.5, flowMultiplier: 1.35, bioinkClass: "shear_thinning" }),
    tips: [
      "Tamanho de poro para osso: 300–500 µm favorece vascularização (Karageorgiou & Kaplan 2005).",
      "Woodpile 0/90 com alinhamento global garante que a camada n+2 caia exatamente sobre a n.",
      "Para HAp/β-TCP em alginato use bico ≥ 0,6 mm (partículas entopem 22G).",
      "Compressão: 2 paredes externas aumentam rigidez sem fechar poros.",
    ],
    references: ["Karageorgiou 2005 Biomaterials 10.1016/j.biomaterials.2005.02.002"],
  },
  {
    id: "adv_cartilage_concentric",
    name: "Cartilagem / menisco (concêntrico + gyroid)",
    description: "Paredes concêntricas (fibras circunferenciais) + núcleo gyroid. GelMA 10 % + HA ou alginato/gelatina com condrócitos.",
    tier: "advanced",
    params: { ...baseParams(0.41), infillPattern: "gyroid", infillDensity: 45, wallCount: 3, wallOrder: "inside_out", speedPerimeter_mms: 8, speedInfill_mms: 9, cartridgeTemp_C: 23, hasCells: true, layerPause_s: 0 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.5, retractVolume_uL: 0.4, flowMultiplier: 1.6, bioinkClass: "soft_hydrogel" }),
    tips: [
      "Menisco: a fibra circunferencial suporta tensão de aro → 3 paredes concêntricas imitam isso.",
      "Gyroid distribui tensão isotropicamente e mantém canais interconectados para difusão.",
      "Com células: mantenha a impressão < 45 min; divida em dois cartuchos se necessário.",
    ],
  },
  {
    id: "adv_skin_patch",
    name: "Pele / membrana (2–4 camadas, grade fina)",
    description: "Construto plano: derme + epiderme. Grade 90° com poros ~400 µm para difusão; sem paredes extras.",
    tier: "advanced",
    params: { ...baseParams(0.33), infillPattern: "grid", infillDensity: 45, wallCount: 1, speedPerimeter_mms: 10, speedInfill_mms: 11, speedFirstLayer_mms: 7, hasCells: true, zHop_mm: 0.6 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.0, retractVolume_uL: 0.25, flowMultiplier: 1.6, bioinkClass: "soft_hydrogel" }),
    tips: [
      "Imprima direto em inserto Transwell ou lâmina com colágeno para aderência.",
      "Camada 1 mais lenta e 10 % mais fluxo garante adesão ao substrato.",
      "Bicamada: dois perfis — derme (fibrina/colágeno) e epiderme (queratinócitos em alta densidade).",
    ],
  },
  {
    id: "adv_cellink_skin_3ph",
    name: "Pele 3 cabeçotes — protocolo CELLINK SKIN (1 camada por cabeçote)",
    description: "Cilindro Ø10 × 1,2 mm em 3 camadas de 0,4 mm, infill CONCÊNTRICO 42 %, agulha 22G cônica, 10 mm/s. Camada 1 → T0 derme reticular (HDF 4×10⁶/mL) · 2 → T1 derme papilar (HDF 8×10⁶) · 3 → T2 epiderme (HEK 10×10⁶). Adaptado de pneumático 12 kPa para seringa mecânica.",
    tier: "advanced",
    params: { ...baseParams(0.41), layerHeight_mm: 0.4, firstLayerHeight_mm: 0.4, infillPattern: "concentric", infillDensity: 42, wallCount: 1, speedPerimeter_mms: 10, speedInfill_mms: 10, speedFirstLayer_mms: 8, hasCells: true, zHop_mm: 0.8, cartridgeTemp_C: null, bedTemp_C: null },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.0, retractVolume_uL: 0.3, flowMultiplier: 1.35, bioinkClass: "shear_thinning" }),
    tips: [
      "Na Etapa 3 use 3 cabeçotes e o modo 'por camada' (camada 1→T0, 2→T1, 3→T2) — é o 'Layer group' do DNA Studio 4.",
      "Petri para otimizar; depois Placa 24 poços para replicatas. Em transwell, calibre o Z no inserto.",
      "Protocolo original: 12 kPa pneumático; em seringa mecânica comece com fluxo ×1,0 e ajuste ±10 % pelo laço de feedback.",
      "Pós-impressão: Crosslinking Agent + trombina (100 U), cultura submersa → interface ar-líquido.",
    ],
    references: ["CELLINK · Bioprinting Skin Tissue Model Protocol, CELLINK SKIN, v5, 06-FEB-2023"],
  },
  {
    id: "adv_vascular_channel",
    name: "Canal vascular (sacrificial em bloco celular)",
    description: "Imprime o CANAL com Pluronic/gelatina sacrificial; bloco ao redor por casting ou 2º cartucho. Paredes contínuas, zero infill.",
    tier: "advanced",
    params: { ...baseParams(0.51), infillPattern: "none", infillDensity: 0, wallCount: 1, speedPerimeter_mms: 10, speedTravel_mms: 50, skirtLoops: 0, zHop_mm: 1.5, cartridgeTemp_C: 22 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.5, retractVolume_uL: 0.6, retractSpeed_mms: 3, flowMultiplier: 1.3, bioinkClass: "sacrificial" }),
    tips: [
      "Pluronic 35–40 %: imprima a 20–24 °C, remova a 4 °C.",
      "Diâmetro do canal ≈ largura do cordão; para 1 mm use agulha 18G e 2 cordões lado a lado.",
      "Travel alto e z-hop ≥ 1,5 mm para não arrastar o gel.",
    ],
    references: ["Kolesky 2014 Adv Mater 10.1002/adma.201305506"],
  },
  {
    id: "adv_fresh_support_bath",
    name: "FRESH (banho de gelatina/Carbopol)",
    description: "Impressão embutida em banho de suporte: colágeno, alginato, fibrina de baixa viscosidade. Retração moderada, sem skirt.",
    tier: "advanced",
    params: { ...baseParams(0.26), infillPattern: "rectilinear", infillDensity: 50, wallCount: 2, speedPerimeter_mms: 12, speedInfill_mms: 13, speedTravel_mms: 30, skirtLoops: 0, zHop_mm: 0.3, retractMinTravel_mm: 1, layerHeight_mm: 0.2, firstLayerHeight_mm: 0.2, cartridgeTemp_C: 20 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.0, retractVolume_uL: 0.8, retractSpeed_mms: 4, flowMultiplier: 1.8, bioinkClass: "support_bath" }),
    tips: [
      "No FRESH não há colapso — pode fatiar camadas finas (0,15–0,25 mm) e paredes verticais altas.",
      "A primeira camada começa DENTRO do banho: ajuste zOffset para 1–2 mm abaixo da superfície.",
      "Retração real importa (Tashman 2021): 0,5–1 µL evita rastros no banho.",
      "Após imprimir, derreta a gelatina a 37 °C por 30–60 min.",
    ],
    references: ["Hinton 2015 Sci Adv 10.1126/sciadv.1500758", "Lee 2019 Science 10.1126/science.aav9051", "Tashman 2021 HardwareX"],
  },
  {
    id: "adv_printability_grid",
    name: "Teste de imprimibilidade (Pr de Ouyang)",
    description: "Grade 2 camadas para medir circularidade de poros (Pr = L²/(16A)).",
    tier: "advanced",
    params: { ...baseParams(0.41), infillPattern: "rectilinear", strandSpacing_mm: 2.0, infillDensity: 25, wallCount: 1, speedPerimeter_mms: 6, speedInfill_mms: 6, skirtLoops: 0 },
    extrusion: withExtrusion({ syringe: { volume_mL: 3, innerDiameter_mm: 8.66 }, primeVolume_uL: 1.5, retractVolume_uL: 0.3, flowMultiplier: 1.6, bioinkClass: "soft_hydrogel" }),
    tips: [
      "Pr ≈ 1 → poros quadrados; Pr < 0,9 → gel muito fluido (fusão); Pr > 1,1 → sub-gelificado/irregular.",
      "Fotografe com câmera USB a 90° e meça perímetro L e área A de ≥ 5 poros.",
      "Combine com teste de colapso (pilares 1–16 mm) para estimar yield stress (Ribeiro 2017).",
    ],
    references: ["Ouyang 2016", "Ribeiro 2017"],
  },
  {
    id: "adv_organoid_dome",
    name: "Domo de organoide (Matrigel/BME em poço)",
    description: "Mini-construto 3–5 mm em poço de placa 24/48. Concêntrico com poucas camadas; cartucho frio (4–10 °C).",
    tier: "advanced",
    params: { ...baseParams(0.26), infillPattern: "concentric", infillDensity: 100, wallCount: 1, speedPerimeter_mms: 6, speedInfill_mms: 6, speedFirstLayer_mms: 4, skirtLoops: 0, cartridgeTemp_C: 8, bedTemp_C: 37, hasCells: true, zHop_mm: 0.5 },
    extrusion: withExtrusion({ syringe: { volume_mL: 1, innerDiameter_mm: 4.78 }, primeVolume_uL: 0.5, retractVolume_uL: 0.15, retractSpeed_mms: 1, flowMultiplier: 1.6, bioinkClass: "soft_hydrogel" }),
    tips: [
      "Matrigel gelifica acima de 10 °C: cartucho frio e mesa a 37 °C para fixar o domo ao poço.",
      "Seringa 1 mL dá resolução volumétrica 9× maior que a 10 mL.",
      "Volume total por poço ≤ 50 µL em placa de 48 poços.",
    ],
  },
]

export const ALL_PROFILES: SliceProfile[] = [...BASIC_PROFILES, ...ADVANCED_PROFILES]

export function getProfile(id: string): SliceProfile | undefined {
  return ALL_PROFILES.find((p) => p.id === id)
}

export const PARAM_TIPS: Record<string, string> = {
  layerHeight_mm: "Hidrogel: 70–90 % do diâmetro do bico. Mais alto que o bico → cordão não encosta na camada anterior; muito baixo → esmaga e alarga.",
  firstLayerHeight_mm: "Primeira camada ~90 % da normal melhora adesão ao substrato.",
  nozzleDiameter_mm: "Diâmetro INTERNO da agulha (22G = 0,41 mm; 20G = 0,60; 18G = 0,84; 25G = 0,26). Agulhas cônicas reduzem shear.",
  lineWidth_mm: "Largura real do cordão. Géis incham (die swell) 10–30 % ao sair do bico.",
  wallCount: "1 para membranas, 2–3 para scaffolds que serão manuseados.",
  wallOrder: "Fora→dentro é mais fiel à forma; dentro→fora melhora adesão da parede externa em géis moles.",
  seam: "Onde cada perímetro começa/termina. 'Alinhada' concentra a emenda; 'mais próxima' minimiza travel.",
  infillOverlap: "Quanto o infill invade a parede interna para colar. 10–20 % em hidrogel.",
  infillPattern: "Rectilinear 0/90 = woodpile (scaffold). Grid = cruz na mesma camada. Zigzag = contínuo (menos gotas). Gyroid = isotrópico. Concêntrico = discos/cartilagem.",
  infillDensity: "Porosidade ≈ 100 − densidade. Osso 40–70 %, cartilagem 40–60 %, pele 30–50 %.",
  infillAngle_deg: "Ângulo da primeira camada de infill.",
  infillAngleStep_deg: "Rotação por camada. 90 → 0/90 (poros quadrados). 60 → 0/60/120 (triangulares). 0 → alinhado.",
  strandSpacing_mm: "Distância centro-a-centro entre cordões. Poro ≈ espaçamento − largura. Preferível em scaffolds.",
  infillEveryNLayers: "Infill só a cada N camadas (poros verticais maiores). 0 desliga.",
  speedPerimeter_mms: "Hidrogéis: 3–10 mm/s. Mais rápido → cordão mais fino e risco de quebra.",
  speedInfill_mms: "20–40 % maior que o perímetro. Acima de 15 mm/s a maioria dos géis falha.",
  speedFirstLayer_mms: "Lenta (3–5 mm/s) para aderir ao substrato.",
  speedTravel_mms: "30–60 mm/s. Muito rápido vibra a bandeja/poço.",
  zHop_mm: "Sobe Z antes de travel para não arrastar o gel. 0,5–1,5 mm. FRESH ≤ 0,3 mm.",
  retractMinTravel_mm: "Só retrai se o travel for maior que isso.",
  skirtLoops: "Desligado por padrão: o 1º cordão nasce no ponto zero (G92). Ligue só se quiser escorvar na própria mesa.",
  purgeLine_mm: "Linha reta de purga antes do skirt. Útil após trocar cartucho.",
  cartridgeTemp_C: "GelMA 21–25 °C · Gelatina/alginato 22–28 °C · Matrigel 4–10 °C · Pluronic 20–24 °C · PCL 80–110 °C.",
  bedTemp_C: "37 °C gelifica Matrigel/colágeno; 4–15 °C firma gelatina/GelMA; vazio = não emitir.",
  zOffset_mm: "Altura do bico sobre o substrato no momento do G92. Encostou no vidro → 0.",
  scale: "Escala uniforme do STL (1 = original).",
  rotationZ_deg: "Rotação do modelo em torno de Z.",
  layerPause_s: "Pausa (G4) entre camadas para gelificação/reticulação parcial.",
  hasCells: "Ativa cálculo de viabilidade (shear/tempo) e alertas de duração.",
  flowMultiplier: "Fator de extrusão = Q_real/Q_teórico. Hidrogéis moles 1,2–2,2× (padrão 1,6); pseudoplásticas 1,1–1,8× (1,35); pastas 1,0–1,4× (1,15); FRESH 1,4–2,5× (1,8). Ajuste pela largura real do cordão.",
  primeVolume_uL: "Volume extra ao iniciar extrusão — compensa compressibilidade do gel e ar na seringa.",
  retractVolume_uL: "Volume recuado ao fim do trecho — reduz oozing. 0–1 µL em hidrogel; 0 para alginato fluido.",
  primeDwell_ms: "Espera após prime para estabilizar pressão (100–300 ms).",
}
