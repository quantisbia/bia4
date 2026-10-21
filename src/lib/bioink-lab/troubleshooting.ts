/**
 * BIA v4 · R16 · Troubleshooting de biotintas
 * ──────────────────────────────────────────
 * Sintoma → causas prováveis → correções → "botão" do BioSlicer/Host a girar.
 * Fontes: CELLINK/Allevi troubleshooting guides, Schwab 2020, Ouyang 2016,
 * Paxton 2017 (two-step printability), experiência de bancada.
 */
import type { CrosslinkKind, TroubleItem } from "./types"

export const TROUBLES: TroubleItem[] = [
  {
    id: "no_flow",
    symptom: "Nada sai da agulha (ou sai e para)",
    likelyCauses: ["Biotinta gelificou na seringa (temperatura baixa ou tempo de espera longo)", "Grumo/bolha entupiu a agulha", "Alginato pré-reticulou com Ca²⁺ do meio", "Pressão/fluxo insuficiente para o yield stress"],
    fixes: ["Aqueça a seringa 1–2 °C e aguarde 5 min", "Troque a agulha (nunca force — rompe células)", "Prepare em PBS/meio SEM Ca²⁺/Mg²⁺", "Faça um 'prime' de 20–50 µL antes do G-code"],
    knob: { param: "Fluxo / pressão", direction: "up", amount: "+10 % por tentativa" },
  },
  {
    id: "blob_start",
    symptom: "Gota grande no início de cada linha",
    likelyCauses: ["Atraso entre início do movimento e extrusão (fluido comprimido)", "Sem retração entre ilhas", "Pressão residual na seringa"],
    fixes: ["Ative retração 0,5–1 µL (modo Avançado)", "Reduza o 'prime' inicial", "Comece a extrusão já em movimento (coast)"],
    knob: { param: "Retração", direction: "up", amount: "0,5 → 1,0 µL" },
  },
  {
    id: "stringing",
    symptom: "Fios/teias entre as ilhas",
    likelyCauses: ["Biotinta muito viscoelástica (tan δ baixo, alta elasticidade)", "Retração insuficiente", "Velocidade de deslocamento baixa"],
    fixes: ["Aumente retração e velocidade de travel", "Eleve 1 °C para reduzir elasticidade", "Agulha cônica em vez de cilíndrica"],
    knob: { param: "Velocidade de travel", direction: "up", amount: "20 → 40 mm/s" },
  },
  {
    id: "spreading",
    symptom: "Linha espalha / camadas fundem (perde forma)",
    likelyCauses: ["Yield stress baixo (gel mole, temperatura alta)", "Fluxo excessivo", "Altura de camada maior que o cordão"],
    fixes: ["Resfrie a seringa 1–2 °C e espere 10 min", "Reduza fluxo 10 %", "Aumente concentração de gelatina/CNF 1 %", "Reticule parcialmente a cada 3–5 camadas"],
    knob: { param: "Fluxo", direction: "down", amount: "-10 %" },
  },
  {
    id: "broken_line",
    symptom: "Linha quebrada / pontilhada",
    likelyCauses: ["Bolhas na biotinta", "Fluxo insuficiente", "Velocidade alta demais", "Agulha longe demais da mesa"],
    fixes: ["Centrifugue 3000 rpm/10 min ou descanse 30 min a 37 °C", "Aumente fluxo 10 % ou reduza velocidade 20 %", "Recalibre o Z0 (a agulha deve quase tocar)"],
    knob: { param: "Velocidade", direction: "down", amount: "-20 %" },
  },
  {
    id: "collapse",
    symptom: "Estrutura desaba acima de 3–5 camadas",
    likelyCauses: ["G' baixo para a altura (gel não sustenta o peso)", "Sem reticulação intermediária", "Camadas muito finas acumulam erro de Z"],
    fixes: ["Use receita com CNF ou gelatina mais alta", "Reticule a cada N camadas (CaCl₂ spray ou luz 5 s)", "Imprima em banho de suporte (FRESH)", "Reduza altura total ou use paredes duplas"],
    knob: { param: "Reticulação intermediária", direction: "up", amount: "a cada 5 camadas" },
  },
  {
    id: "low_viability",
    symptom: "Viabilidade baixa (< 70 %) após impressão",
    likelyCauses: ["Shear alto (agulha fina + velocidade alta + biotinta viscosa)", "Tempo fora da incubadora > 45–60 min", "Luz/fotoiniciador em excesso", "CaCl₂ muito concentrado ou tempo longo", "pH ácido (colágeno) sem neutralizar"],
    fixes: ["Agulha ≥ 0,41 mm cônica, velocidade ≤ 6 mm/s", "Imprima em lotes de 30 min; mantenha o resto a 4 °C/37 °C conforme receita", "LAP ≤ 0,25 % e luz ≤ 30 s a 10 mW/cm²", "CaCl₂ ≤ 100 mM, ≤ 5 min", "Neutralize colágeno no gelo antes de carregar"],
    knob: { param: "Agulha", direction: "up", amount: "0,33 → 0,41 mm" },
  },
  {
    id: "no_gel",
    symptom: "Não endurece após reticulação",
    likelyCauses: ["Fotoiniciador degradado (LAP exposto à luz)", "Fonte de luz fraca ou comprimento errado (365 vs 405 nm)", "CaCl₂ não penetra (peça muito grossa)", "Trombina velha / fibrinogênio não dissolvido"],
    fixes: ["Prepare LAP fresco, frasco âmbar", "Meça irradiância (≥ 5 mW/cm²) e tempo por mm de espessura", "Submerja mais tempo ou reticule a cada camada", "Teste gota-controle antes de imprimir"],
  },
  {
    id: "bubbles",
    symptom: "Bolhas na biotinta / linhas com buracos",
    likelyCauses: ["Agitação vigorosa ao dissolver", "Mistura de células com pistão rápido", "Carga da seringa com ar"],
    fixes: ["Dissolva em agitação lenta; centrifugue a biotinta", "Misture células seringa-a-seringa devagar (10–20 passagens)", "Carregue a seringa pelo pistão invertido, bata para subir o ar, expulse"],
  },
  {
    id: "sedimentation",
    symptom: "Células concentradas no fundo da seringa / distribuição desigual",
    likelyCauses: ["Biotinta pouco viscosa (células sedimentam em minutos)", "Impressão longa sem homogeneizar"],
    fixes: ["Misture logo antes de carregar; imprima em ≤ 20 min por seringa", "Aumente viscosidade (gelatina 2–3 %) ou use agulha vertical com seringa deitada entre impressões"],
  },
  {
    id: "clog_particles",
    symptom: "Entope com hidroxiapatita / partículas",
    likelyCauses: ["Agulha menor que ~20× o tamanho das partículas", "Aglomerados mal dispersos"],
    fixes: ["Agulha ≥ 0,6 mm", "Sonique a suspensão de HAp antes de misturar", "Peneire 100 µm"],
    knob: { param: "Agulha", direction: "up", amount: "≥ 0,60 mm" },
  },
  {
    id: "batch_variation",
    symptom: "Lote novo imprime diferente do anterior",
    likelyCauses: ["Variação de bloom/PM da gelatina ou grau de metacrilação do GelMA", "Umidade do pó", "Alginato de outra viscosidade"],
    fixes: ["Faça o 'teste do filamento' (Paxton 2017): extrude uma linha reta e um ângulo", "Ajuste ±1 % de polímero ou ±1 °C até reproduzir o cordão", "Anote lote, data e parâmetros na BIA (registro de receita)"],
  },
]

/** Filtra problemas relevantes à forma de reticulação e presença de células */
export function relevantTroubles(crosslink: CrosslinkKind, hasCells: boolean, hasParticles = false): TroubleItem[] {
  return TROUBLES.filter((t) => {
    if (t.id === "no_gel" && (crosslink === "none" || crosslink === "sacrificial")) return false
    if ((t.id === "low_viability" || t.id === "sedimentation") && !hasCells) return false
    if (t.id === "clog_particles" && !hasParticles) return false
    return true
  })
}

export function findTrouble(id: string): TroubleItem | undefined {
  return TROUBLES.find((t) => t.id === id)
}
