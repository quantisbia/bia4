/**
 * R38 · Impressão Básica — feedback pós-impressão e sugestões da BIA.
 * Motor de regras determinístico (roda no browser, sem IA remota): sintomas → ajustes
 * concretos de fluxo, velocidade, altura de camada/agulha, escorva, pressão e temperatura.
 */

import type { BasicState, Head } from "./engine"

export type Symptom =
  | "no_material"        // não saiu hidrogel / saiu pouco
  | "too_much"           // saiu demais, filete largo/escorrendo
  | "gaps_first_layer"   // falhas na primeira camada / não aderiu
  | "gaps_layers"        // falhas no meio das camadas (filete interrompido)
  | "stringing"          // fios entre regiões
  | "dragging"           // agulha arrastou/rasgou as camadas
  | "collapse"           // estrutura desabou / espalhou
  | "clog"               // agulha entupiu
  | "offset"             // deslocamento / não imprimiu no lugar certo
  | "ok"

export interface PrintFeedback {
  rating: 1 | 2 | 3 | 4 | 5
  symptoms: Symptom[]
  notes?: string
  /** ajustes em tempo real usados durante a impressão */
  live?: { flow: number; speed: number; zBaby: number }
  /** contexto do trabalho */
  job?: { layers: number; minutes: number; heads: number[] }
  at: string
}

export interface Suggestion {
  id: string
  title: string
  detail: string
  /** ajuste proposto aplicável com um clique (parcial no estado) */
  apply?: (s: BasicState) => BasicState
  applyLabel?: string
  priority: 1 | 2 | 3
}

export const SYMPTOMS: { id: Symptom; label: string; hint: string }[] = [
  { id: "ok", label: "Saiu como esperado", hint: "Boa impressão — a BIA só registra o resultado." },
  { id: "no_material", label: "Não saiu hidrogel (ou saiu pouco)", hint: "Filete fino, interrompido ou ausente desde o início." },
  { id: "gaps_first_layer", label: "Falhas na 1ª camada / não aderiu", hint: "Primeira camada com buracos ou soltando do substrato." },
  { id: "gaps_layers", label: "Falhas no meio das camadas", hint: "Filete interrompido em camadas intermediárias." },
  { id: "too_much", label: "Saiu demais / escorreu", hint: "Filete largo, poros fechados, material acumulando." },
  { id: "stringing", label: "Fios entre regiões", hint: "Fiapos de biotinta nos deslocamentos." },
  { id: "dragging", label: "Agulha arrastou as camadas", hint: "Agulha rasgou ou empurrou o que já estava impresso." },
  { id: "collapse", label: "Estrutura desabou / espalhou", hint: "Camadas superiores afundaram ou o construto perdeu a forma." },
  { id: "clog", label: "Agulha entupiu", hint: "Fluxo parou e não voltou mesmo com mais pressão." },
  { id: "offset", label: "Imprimiu fora do lugar", hint: "Deslocado em relação ao centro do poço/placa." },
]

const headsUsed = (s: BasicState): Head[] => s.heads.filter((h) => h.enabled && s.shapes.some((x) => x.head === h.id))
const r2 = (v: number) => Math.round(v * 100) / 100

function bumpFlow(pct: number, heads: Head[]) { return (s: BasicState): BasicState => ({ ...s, heads: s.heads.map((h) => (heads.some((x) => x.id === h.id) ? { ...h, flow: Math.round(Math.min(300, Math.max(10, h.flow * (1 + pct / 100)))), pressure: h.extrusionMode === "pneumatic" ? r2(Math.min(700, h.pressure * (1 + pct / 100))) : h.pressure } : h)) }) }
function bumpSpeed(pct: number, heads: Head[]) { return (s: BasicState): BasicState => ({ ...s, heads: s.heads.map((h) => (heads.some((x) => x.id === h.id) ? { ...h, speed: r2(Math.min(200, Math.max(0.5, h.speed * (1 + pct / 100)))) } : h)) }) }

export function analyzeFeedback(fb: PrintFeedback, state: BasicState): Suggestion[] {
  const out: Suggestion[] = []
  const hs = headsUsed(state)
  const ls = state.layerSettings
  const lw = hs.length ? Math.min(...hs.map((h) => h.lineWidth || 0.41)) : 0.41
  const pneu = hs.some((h) => h.extrusionMode === "pneumatic")
  const liveFlow = fb.live?.flow ?? 100, liveSpeed = fb.live?.speed ?? 100, liveZ = fb.live?.zBaby ?? 0
  const sym = new Set(fb.symptoms)

  // ajustes feitos ao vivo viram parâmetros permanentes
  if (Math.abs(liveFlow - 100) >= 5) out.push({ id: "live-flow", priority: 1, title: `Fixar o fluxo que você usou ao vivo (${liveFlow} %)`, detail: `Você ajustou o fluxo para ${liveFlow} % durante a impressão. Vou gravar isso nos cabeçotes para a próxima começar já certa.`, applyLabel: `Aplicar fluxo ×${(liveFlow / 100).toFixed(2)}`, apply: bumpFlow(liveFlow - 100, hs) })
  if (Math.abs(liveSpeed - 100) >= 5) out.push({ id: "live-speed", priority: 1, title: `Fixar a velocidade usada ao vivo (${liveSpeed} %)`, detail: `A impressão rodou a ${liveSpeed} % — gravo a velocidade equivalente por cabeçote.`, applyLabel: `Aplicar velocidade ×${(liveSpeed / 100).toFixed(2)}`, apply: bumpSpeed(liveSpeed - 100, hs) })
  if (Math.abs(liveZ) >= 0.02) out.push({ id: "live-z", priority: 1, title: `Incorporar o ajuste de altura (${liveZ > 0 ? "+" : ""}${liveZ.toFixed(2)} mm)`, detail: liveZ < 0 ? "Você aproximou a agulha durante a impressão: a primeira camada estava alta. Reduzo a primeira camada proporcionalmente." : "Você afastou a agulha: a primeira camada estava esmagando. Aumento a primeira camada.", applyLabel: "Ajustar primeira camada", apply: (s) => ({ ...s, layerSettings: { ...s.layerSettings, firstLayerPct: Math.round(Math.min(200, Math.max(20, s.layerSettings.firstLayerPct + (liveZ / s.layerSettings.layerHeight) * 100))) } }) })

  if (sym.has("no_material")) {
    out.push({ id: "prime", priority: 1, title: "Escorvar antes de começar", detail: "Na etapa Imprimir, use Extrusão manual até o hidrogel sair uniforme na ponta da agulha, limpe a ponta e só então clique ZERAR e Iniciar. Agulha vazia = primeiras linhas sem material." })
    out.push({ id: "flow-up", priority: 1, title: pneu ? "Aumentar pressão/fluxo em ~20 %" : "Aumentar fluxo em ~20 %", detail: pneu ? `Cabeçote pneumático: suba a pressão (hoje ${hs.map((h) => h.pressure + " kPa").join(", ")}) e o fluxo. Se nada sair, verifique vazamento na tampa da seringa e a viscosidade da biotinta.` : "Mais volume por mm de trajeto. Se já estiver acima de 150 %, prefira reduzir a velocidade.", applyLabel: "Fluxo +20 %", apply: bumpFlow(20, hs) })
    out.push({ id: "speed-down", priority: 2, title: "Reduzir velocidade em ~25 %", detail: `Hidrogéis precisam de tempo para sair da agulha. Hoje: ${hs.map((h) => h.speed + " mm/s").join(", ")}. Velocidade menor = filete mais contínuo.`, applyLabel: "Velocidade −25 %", apply: bumpSpeed(-25, hs) })
    if (hs.some((h) => h.gauge >= 25)) out.push({ id: "gauge", priority: 2, title: "Agulha muito fina para a biotinta", detail: `Agulha ${hs.filter((h) => h.gauge >= 25).map((h) => h.gauge + " G").join("/")} exige muita pressão. Teste 22 G (0,41 mm) ou 20 G (0,60 mm) para biotintas viscosas.` })
  }
  if (sym.has("gaps_first_layer")) {
    out.push({ id: "first-layer", priority: 1, title: "Agulha mais perto na 1ª camada", detail: `Primeira camada hoje em ${ls.firstLayerPct} % (${(ls.layerHeight * ls.firstLayerPct / 100).toFixed(2)} mm). Reduza para ~70 % para esmagar levemente o filete contra o substrato e melhorar a adesão. Zere a altura com a agulha encostando de leve no substrato.`, applyLabel: "Primeira camada 70 %", apply: (s) => ({ ...s, layerSettings: { ...s.layerSettings, firstLayerPct: 70 } }) })
    out.push({ id: "first-speed", priority: 2, title: "Primeira camada mais lenta", detail: "Reduza a velocidade em ~30 % — a adesão depende do tempo de contato. Use o ajuste de velocidade ao vivo na 1ª camada e volte a 100 % depois.", applyLabel: "Velocidade −30 %", apply: bumpSpeed(-30, hs) })
    out.push({ id: "substrate", priority: 3, title: "Substrato", detail: "Placa de Petri e lâmina de vidro são lisas: um banho fino de gelatina/colágeno ou plasma-treat aumenta muito a adesão de hidrogéis." })
  }
  if (sym.has("gaps_layers")) {
    out.push({ id: "layer-h", priority: 1, title: "Altura de camada ≤ Ø da agulha", detail: `Altura ${ls.layerHeight.toFixed(2)} mm com agulha ${lw.toFixed(2)} mm. Para filetes contínuos a camada deve ter 80–100 % do Ø interno. Sugiro ${(lw * 0.9).toFixed(2)} mm.`, applyLabel: `Altura ${(lw * 0.9).toFixed(2)} mm`, apply: (s) => ({ ...s, layerSettings: { ...s.layerSettings, layerHeight: r2(lw * 0.9) } }) })
    out.push({ id: "speed-down2", priority: 1, title: "Reduzir velocidade em ~20 %", detail: "Falhas intermitentes no meio da impressão quase sempre são fluxo não acompanhando a velocidade.", applyLabel: "Velocidade −20 %", apply: bumpSpeed(-20, hs) })
    out.push({ id: "flow-up2", priority: 2, title: "Fluxo +10 %", detail: "Pequeno aumento de fluxo compensa a queda de pressão conforme a seringa esvazia.", applyLabel: "Fluxo +10 %", apply: bumpFlow(10, hs) })
    if (hs.some((h) => h.extrusionMode === "pneumatic" && h.flowDelay < 0.1)) out.push({ id: "flow-delay", priority: 2, title: "Atraso de fluxo (pneumático)", detail: "Adicione 0,1–0,3 s de atraso de fluxo para a pressão estabilizar antes de o cabeçote mover.", applyLabel: "Atraso 0,2 s", apply: (s) => ({ ...s, heads: s.heads.map((h) => (h.extrusionMode === "pneumatic" && hs.some((x) => x.id === h.id) ? { ...h, flowDelay: 0.2 } : h)) }) })
  }
  if (sym.has("too_much")) {
    out.push({ id: "flow-down", priority: 1, title: pneu ? "Reduzir pressão/fluxo em ~20 %" : "Reduzir fluxo em ~20 %", detail: "Filete largo e poros fechados indicam excesso de material por mm.", applyLabel: "Fluxo −20 %", apply: bumpFlow(-20, hs) })
    out.push({ id: "speed-up", priority: 2, title: "Aumentar velocidade em ~20 %", detail: "Com o mesmo fluxo, mais velocidade afina o filete.", applyLabel: "Velocidade +20 %", apply: bumpSpeed(20, hs) })
    out.push({ id: "retract", priority: 3, title: "Retração/desligamento no fim do filete", detail: pneu ? "Confirme que o comando de desligar a válvula está correto — gotas no fim do filete indicam válvula lenta." : "Aumente a retração em 0,5 mm (ou mm³) para cortar o filete no fim de cada trajeto." })
  }
  if (sym.has("stringing")) {
    out.push({ id: "zhop", priority: 1, title: "Aumentar Z-hop", detail: `Z-hop hoje ${hs.map((h) => h.zHop + " mm").join(", ")}. Suba para 0,8–1,0 mm para a agulha não arrastar fios nos deslocamentos.`, applyLabel: "Z-hop 0,8 mm", apply: (s) => ({ ...s, heads: s.heads.map((h) => (hs.some((x) => x.id === h.id) ? { ...h, zHop: 0.8 } : h)) }) })
    out.push({ id: "retract2", priority: 1, title: "Mais retração / desligar válvula antes", detail: pneu ? "Para pneumático, use um atraso negativo mental: reduza o fluxo e verifique se a válvula desliga antes do travel." : "Aumente a retração (+0,5) — corta o fio no fim do filete.", applyLabel: "Retração +0,5", apply: (s) => ({ ...s, heads: s.heads.map((h) => (hs.some((x) => x.id === h.id) && h.extrusionMode !== "pneumatic" ? { ...h, retract: r2(h.retract + 0.5) } : h)) }) })
    out.push({ id: "travel", priority: 2, title: "Deslocamento mais rápido", detail: `Travel hoje ${state.printer.travelSpeed} mm/s — suba para 80 mm/s; menos tempo em trânsito = menos fio.`, applyLabel: "Travel 80 mm/s", apply: (s) => ({ ...s, printer: { ...s.printer, travelSpeed: 80 } }) })
  }
  if (sym.has("dragging")) {
    out.push({ id: "layer-h-up", priority: 1, title: "Altura de camada maior ou agulha mais alta", detail: `Agulha arrastando significa camada mais baixa que o filete real. Suba a altura de camada para ~${(lw * 1.0).toFixed(2)} mm (Ø da agulha) ou afaste a agulha +0,1 mm com o ajuste fino.`, applyLabel: `Altura ${lw.toFixed(2)} mm`, apply: (s) => ({ ...s, layerSettings: { ...s.layerSettings, layerHeight: r2(lw) } }) })
    out.push({ id: "zhop2", priority: 1, title: "Z-hop ≥ 0,5 mm", detail: "Garante que a agulha sobe antes de atravessar regiões já impressas.", applyLabel: "Z-hop 0,5 mm", apply: (s) => ({ ...s, heads: s.heads.map((h) => (hs.some((x) => x.id === h.id) ? { ...h, zHop: Math.max(h.zHop, 0.5) } : h)) }) })
    out.push({ id: "flow-down2", priority: 2, title: "Fluxo −10 %", detail: "Excesso de material acumula acima da altura nominal e a agulha bate nele na próxima camada.", applyLabel: "Fluxo −10 %", apply: bumpFlow(-10, hs) })
  }
  if (sym.has("collapse")) {
    out.push({ id: "crosslink", priority: 1, title: "Reticular por camada", detail: "Ative a fotorreticulação a cada camada (etapa Impressora) ou use banho de suporte/CaCl₂ para alginato. Hidrogel sem reticulação não sustenta mais que 3–5 camadas.", applyLabel: "UV a cada camada", apply: (s) => ({ ...s, printer: { ...s.printer, photocrosslinking: true, uvEvery: "layer", uvSeconds: Math.max(5, s.printer.uvSeconds) } }) })
    out.push({ id: "density-up", priority: 2, title: "Mais densidade e mais perímetros", detail: `Densidade ${ls.infillDensity} % → suba para ${Math.min(100, ls.infillDensity + 15)} % e use 2 perímetros para a casca segurar o núcleo.`, applyLabel: "Densidade +15 %, 2 perímetros", apply: (s) => ({ ...s, layerSettings: { ...s.layerSettings, infillDensity: Math.min(100, s.layerSettings.infillDensity + 15), perimeters: Math.max(2, s.layerSettings.perimeters) } }) })
    out.push({ id: "bioink", priority: 2, title: "Biotinta mais viscosa / mais fria", detail: "Aumente a concentração do polímero (ex.: GelMA 7 → 10 %) ou imprima com a seringa resfriada (15–20 °C) para maior rigidez do filete." })
  }
  if (sym.has("clog")) {
    out.push({ id: "clog1", priority: 1, title: "Agulha maior + biotinta filtrada", detail: `Troque para uma agulha maior (${hs.some((h) => h.gauge >= 22) ? "20 G ou 18 G" : "um gauge acima"}), filtre a biotinta (40–70 µm) e evite bolhas ao carregar a seringa (centrifugue 1 min).` })
    out.push({ id: "clog2", priority: 2, title: "Controle de temperatura", detail: "Gelatina/GelMA gelifica na agulha se esfriar: mantenha o cabeçote a 25–30 °C (ou aqueça a agulha). Alginato/CaCl₂ reticula na ponta se houver respingo — limpe entre poços." })
    out.push({ id: "clog3", priority: 3, title: "Pausa e escorva", detail: "Após pausas longas, extrude manualmente antes de retomar para expulsar o tampão gelificado." })
  }
  if (sym.has("offset")) {
    out.push({ id: "zero", priority: 1, title: "Zerar no centro exato", detail: "Com a origem na agulha, o (0,0) é onde você clicou ZERAR. Leve a agulha ao centro do poço/placa com passos de 0,1 mm, encoste no substrato e só então zere. Em multiwell, zere no centro do primeiro poço selecionado." })
    if (hs.length > 1) out.push({ id: "offsets", priority: 1, title: "Offsets entre cabeçotes", detail: "Com mais de um cabeçote, meça a distância entre as agulhas (X/Y) e informe em Offset X/Y de cada cabeçote na etapa Cabeçotes — senão o 2º cabeçote imprime deslocado." })
  }
  if (sym.has("ok") && out.length === 0) {
    out.push({ id: "ok", priority: 3, title: "Parâmetros validados", detail: `Resultado ${fb.rating}/5. Esta combinação (altura ${ls.layerHeight} mm · ${ls.infillPattern} ${ls.infillDensity} % · ${hs.map((h) => `T${h.id - 1} ${h.speed} mm/s / ${h.flow} %`).join(" · ")}) fica registrada como referência. Para evoluir: tente +1 camada de altura ou densidade menor mantendo a qualidade.` })
  }
  if (fb.rating <= 2 && !sym.size) out.push({ id: "generic", priority: 2, title: "Comece pelo básico", detail: "Nota baixa sem sintoma marcado: verifique (1) escorva, (2) zero da agulha encostando no substrato, (3) velocidade ≤ 15 mm/s para hidrogéis, (4) altura de camada ≈ Ø da agulha." })

  // dedupe por id, ordena por prioridade
  const seen = new Set<string>()
  return out.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true))).sort((a, b) => a.priority - b.priority)
}

/** Texto resumido para o G-code/relatório */
export function summarizeSuggestions(list: Suggestion[]): string {
  return list.slice(0, 5).map((s, i) => `${i + 1}. ${s.title}`).join("\n")
}

export const FEEDBACK_KEY = "bia.print-basic.feedback.v1"
export function loadFeedback(): PrintFeedback[] { try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || "[]") } catch { return [] } }
export function saveFeedback(fb: PrintFeedback) { try { const all = loadFeedback(); all.unshift(fb); localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all.slice(0, 50))) } catch { /* noop */ } }
