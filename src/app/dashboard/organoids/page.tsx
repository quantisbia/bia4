"use client"

import { useState, useEffect } from "react"
import { CircleDot, Loader2, Zap, CheckCircle2, History, Plus, X,
  ArrowRight, Beaker, Clock, AlertCircle, Target, FlaskConical, MessageCircle, ExternalLink,
  BookOpen, Layers, Microscope, ThumbsUp, ChevronRight, Dna,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"

interface OrganoidDesign {
  id?: string
  organoidType: string
  purpose: string
  cellSource: string
  protocol?: string
  materials?: string[]
  timeline?: string
  expectedMarkers?: string[]
  qualityMetrics?: string[]
  createdAt?: string
}

/* ── Ícones SVG científicos inline ────────────────────────────────────── */
function LungIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12c0-3.31 2.69-6 6-6V4" />
      <path d="M6 12c0 2.21-1.79 4-4 4s-1-1.5-1-3V9c0-1.66 1.34-3 3-3h2" />
      <path d="M18 12c0-3.31-2.69-6-6-6" />
      <path d="M18 12c0 2.21 1.79 4 4 4s1-1.5 1-3V9c0-1.66-1.34-3-3-3h-2" />
      <path d="M9 20c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v6z" />
    </svg>
  )
}

function IntestineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6c0-1.1.9-2 2-2h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h6" />
      <path d="M15 20a2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2 2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1" />
    </svg>
  )
}

function LiverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 8c0-3.31-2.69-6-6-6-2.49 0-4.63 1.52-5.59 3.71A4 4 0 0 0 4 9.5a4 4 0 0 0 4 4c.55 0 1.07-.11 1.55-.31" />
      <path d="M9.5 13.5C8.84 15.5 7 18 7 20h10c0-2-1.84-4.5-2.5-6.5" />
      <path d="M12 6v3" />
    </svg>
  )
}

function SkinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="4" rx="1" />
      <rect x="2" y="10" width="20" height="4" rx="1" />
      <rect x="2" y="17" width="20" height="4" rx="1" />
      <line x1="6" y1="7" x2="6" y2="10" />
      <line x1="12" y1="7" x2="12" y2="10" />
      <line x1="18" y1="7" x2="18" y2="10" />
      <line x1="9" y1="14" x2="9" y2="17" />
      <line x1="15" y1="14" x2="15" y2="17" />
    </svg>
  )
}

function SpheroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="8" cy="9" r="1.5" />
      <circle cx="16" cy="9" r="1.5" />
      <circle cx="8" cy="15" r="1.5" />
      <circle cx="16" cy="15" r="1.5" />
      <circle cx="12" cy="6" r="1" />
      <circle cx="12" cy="18" r="1" />
    </svg>
  )
}

/* ── Tipos de organoides com ícones científicos ────────────────────────── */
const ORGANOID_TYPES = [
  {
    value: "intestinal",
    label: "Intestinal",
    icon: <IntestineIcon className="w-5 h-5" />,
    emoji: "🫁",
    desc: "Cripta-vilo, absorção, barreira intestinal",
    color: "emerald",
    category: "organoid",
  },
  {
    value: "hepatico",
    label: "Hepático",
    icon: <LiverIcon className="w-5 h-5" />,
    emoji: "🟤",
    desc: "Metabolismo, detoxificação, produção de bile",
    color: "amber",
    category: "organoid",
  },
  {
    value: "neural",
    label: "Neural",
    icon: <Dna className="w-5 h-5" />,
    emoji: "🧠",
    desc: "Córtex cerebral, mini-brain, neurônios",
    color: "violet",
    category: "organoid",
  },
  {
    value: "cardiaco",
    label: "Cardíaco",
    icon: <Beaker className="w-5 h-5" />,
    emoji: "❤️",
    desc: "Cardiomiócitos, contratilidade, arritmia",
    color: "rose",
    category: "organoid",
  },
  {
    value: "renal",
    label: "Renal",
    icon: <FlaskConical className="w-5 h-5" />,
    emoji: "🫘",
    desc: "Néfrons, filtração glomerular, tubular",
    color: "blue",
    category: "organoid",
  },
  {
    value: "pancreatico",
    label: "Pancreático",
    icon: <Target className="w-5 h-5" />,
    emoji: "🔬",
    desc: "Ilhotas de Langerhans, insulina, glucagon",
    color: "orange",
    category: "organoid",
  },
  {
    value: "pulmonar",
    label: "Pulmonar",
    icon: <LungIcon className="w-5 h-5" />,
    emoji: "💨",
    desc: "Alvéolos, surfactante, barreira ar-sangue",
    color: "sky",
    category: "organoid",
  },
  {
    value: "dermico",
    label: "Dérmico",
    icon: <SkinIcon className="w-5 h-5" />,
    emoji: "🩹",
    desc: "Epiderme, derme, pele completa, cicatrização",
    color: "pink",
    category: "organoid",
    isNew: true,
  },
]

/* ── Tipo esferóide ─────────────────────────────────────────────────────── */
const SPHEROID_ITEM = {
  value: "esferoide",
  label: "Esferoides Monocelulares",
  icon: <SpheroidIcon className="w-5 h-5" />,
  emoji: "⚪",
  desc: "Agregados 3D de um único tipo celular",
  color: "teal",
  category: "spheroid",
  isNew: true,
}

/* ── Tipos celulares para esferoides ─────────────────────────────────── */
const SPHEROID_CELL_TYPES = [
  { value: "fibroblastos",    label: "Fibroblastos",              group: "Tecido Conjuntivo" },
  { value: "queratinócitos",  label: "Queratinócitos",            group: "Pele" },
  { value: "MSC",             label: "MSC (Mesenquimais)",        group: "Tronco" },
  { value: "celulas_tumorais",label: "Células Tumorais",          group: "Oncologia" },
  { value: "hepatocitos",     label: "Hepatócitos",               group: "Fígado" },
  { value: "endoteliais",     label: "Células Endoteliais",       group: "Vascular" },
  { value: "cardiomiocitos",  label: "Cardiomiócitos",            group: "Coração" },
  { value: "neuronios",       label: "Neurônios",                 group: "Neural" },
  { value: "iPSC",            label: "iPSC",                      group: "Tronco" },
  { value: "condrocitos",     label: "Condrócitos",               group: "Cartilagem" },
  { value: "osteoblastos",    label: "Osteoblastos",              group: "Osso" },
  { value: "epiteliais",      label: "Células Epiteliais",        group: "Epitelial" },
  { value: "beta_pancreatico",label: "Células Pancreáticas (β)",  group: "Pâncreas" },
  { value: "alveolares",      label: "Células Alveolares",        group: "Pulmão" },
  { value: "renais",          label: "Células Renais",            group: "Rim" },
]

/* ── Dados campo dérmico ────────────────────────────────────────────────── */
const DERMIC_CELL_TYPES = [
  { value: "queratinocitosDerm", label: "Queratinócitos" },
  { value: "fibroblastosDerm",   label: "Fibroblastos" },
  { value: "endoteliais",        label: "Células Endoteliais (opcional)" },
  { value: "melanocitos",        label: "Melanócitos (opcional)" },
  { value: "imunes",             label: "Células Imunes (opcional)" },
]

const DERMIC_STRUCTURES = [
  { value: "epiderme",         label: "Epiderme" },
  { value: "derme",            label: "Derme" },
  { value: "full_thickness",   label: "Full Thickness Skin" },
  { value: "skin_equivalent",  label: "Skin Equivalent" },
]

const DERMIC_OBJECTIVES = [
  { value: "cosmetico",        label: "Cosmético" },
  { value: "regenerativo",     label: "Regenerativo" },
  { value: "doenca",           label: "Modelagem de Doença" },
  { value: "screening",        label: "Screening de Drogas" },
  { value: "biomaterial",      label: "Teste de Biomateriais" },
]

/* ── Métodos de formação de esferoides ─────────────────────────────────── */
const SPHEROID_METHODS = [
  { value: "nao_aderente",  label: "Não Aderente (agarose)", desc: "QMicroNiche™ recomendado" },
  { value: "micropinos",    label: "Micropinos / QMicroNiche™", desc: "Método validado JoVE 2022" },
  { value: "hanging_drop",  label: "Hanging Drop", desc: "Gotas suspensas" },
  { value: "hidrogel",      label: "Hidrogel/Matrigel", desc: "Encapsulamento 3D" },
  { value: "spinner",       label: "Spinner Flask", desc: "Agitação contínua" },
]

const SPHEROID_OBJECTIVES = [
  { value: "screening",    label: "Screening de Compostos" },
  { value: "regeneracao",  label: "Regeneração Tecidual" },
  { value: "tumor",        label: "Modelo Tumoral" },
  { value: "co_cultura",   label: "Co-cultura Futura" },
  { value: "ecm",          label: "Produção de ECM" },
  { value: "implante",     label: "Implante Experimental" },
]

const CELL_SOURCES = [
  { value: "iPSC",         label: "iPSC (Pluripotentes Induzidas)" },
  { value: "ESC",          label: "ESC (Embrionárias)" },
  { value: "Adult_Stem",   label: "Células-Tronco Adultas" },
  { value: "Primary",      label: "Células Primárias" },
]

/* ── Mapa de cores por tipo ──────────────────────────────────────────────── */
const COLOR_MAP: Record<string, string> = {
  emerald: "border-emerald-500/25 bg-emerald-500/8 text-emerald-300",
  amber:   "border-amber-500/25 bg-amber-500/8 text-amber-300",
  violet:  "border-violet-500/25 bg-violet-500/8 text-violet-300",
  rose:    "border-rose-500/25 bg-rose-500/8 text-rose-300",
  blue:    "border-blue-500/25 bg-blue-500/8 text-blue-300",
  orange:  "border-orange-500/25 bg-orange-500/8 text-orange-300",
  sky:     "border-sky-500/25 bg-sky-500/8 text-sky-300",
  pink:    "border-pink-500/25 bg-pink-500/8 text-pink-300",
  teal:    "border-teal-500/25 bg-teal-500/8 text-teal-300",
}

// ── QMicroNiche Section ───────────────────────────────────────────────────────
// Baseado no artigo JoVE: Charelli, Dernowsek & Balbino, e63814 (2022)
// Dispositivo QMicroNiche desenvolvido por Janaína Dernowsek / Quantis
function QMicroNicheSection() {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<"protocolo" | "parametros" | "dicas">("protocolo")

  const steps = [
    {
      phase: "Preparo do Agarose",
      time: "30–45 min",
      color: "blue",
      icon: "🧪",
      items: [
        "Preparar solução de agarose 2% (p/v) em PBS 1× — homogeneizar com movimentos circulares",
        "Aquecer em micro-ondas: 30 s, parando a cada 5 s para homogeneizar — repetir até estado líquido-lúcido",
        "Alternativamente: placa aquecedora a 80–90 °C com agitação contínua",
        "Manter a solução a ≥ 60 °C durante o uso (evitar solidificação prematura)",
      ],
    },
    {
      phase: "Montagem do Molde com QMicroNiche",
      time: "35–50 min",
      color: "teal",
      icon: "🖨️",
      items: [
        "Esterilizar o dispositivo QMicroNiche: álcool 70% + UV por 15 min",
        "Adicionar 1–2 mL da solução de agarose quente no poço da placa (6-well, 12-well etc.)",
        "Inserir o dispositivo QMicroNiche CUIDADOSAMENTE sobre o agarose líquido — evitar bolhas de ar na interface",
        "Aguardar ≥ 30 min até solidificação completa (placa de resfriamento reduz o tempo)",
        "Remover o dispositivo com delicadeza para preservar a geometria das micro-recessões",
      ],
    },
    {
      phase: "Equilíbrio e Condicionamento",
      time: "40 min",
      color: "amber",
      icon: "⚗️",
      items: [
        "Adicionar 2 mL de meio DMEM ao molde de agarose; aguardar 10 min e descartar — repetir 3×",
        "Substituir por 2 mL de meio de cultura completo",
        "Incubar a 37 °C, 5% CO₂ e 80% umidade até o momento do plaqueamento celular",
      ],
    },
    {
      phase: "Plaqueamento Celular",
      time: "30 min",
      color: "emerald",
      icon: "🔬",
      items: [
        "Cultivar células em monocamada até 80% de confluência em DMEM (baixa glicose) + 10% SFB + 100 µg/mL pen/estrep",
        "Lavar com PBS 1×; dissociar com tripsina 0,125% + EDTA 0,78 mM por 2–5 min a 37 °C",
        "Neutralizar com meio + SFB; centrifugar 400 × g por 5 min; contar células",
        "Preparar 50 × 10⁵ células em 1 mL de meio de cultura completo",
        "Remover 2 mL do meio do poço e adicionar 1 mL da suspensão celular sobre o molde de agarose",
        "Aguardar 20–30 min (sedimentação nas micro-recessões); adicionar 1 mL de meio lentamente pela parede do poço",
      ],
    },
    {
      phase: "Formação e Maturação dos Esferoides",
      time: "24–48 h",
      color: "violet",
      icon: "🧬",
      items: [
        "Incubar a 37 °C, 5% CO₂, 80% umidade por 24–48 h (varia conforme o tipo celular)",
        "Cada QMicroNiche gera: 750 micro-recessões/poço · até 4.716 esferoides por placa de 6 poços",
        "Tamanho alvo: 123 ± 3 µm de diâmetro com forma homogênea e uniforme",
        "Viabilidade esperada: > 95% (L929, fibroblastos; ajustar para tipo celular específico)",
        "Esferoides podem ser mantidos em cultura por meses sem perda estrutural",
      ],
    },
    {
      phase: "Coleta e Análise",
      time: "15 min",
      color: "rose",
      icon: "📊",
      items: [
        "Remover esferoides por jato direto com pipeta carregada com meio ou PBS",
        "Análises disponíveis: microscopia de fase, microscopia eletrônica, citometria, histologia",
        "Para bioimpressão 3D: esferoides funcionam como building blocks — usar protocolo de fusão de esferoides",
      ],
    },
  ]

  const params = [
    { label: "Concentração de agarose", value: "2% (p/v)", nota: "Em PBS 1×; não usar água destilada" },
    { label: "Volume por poço (6-well)", value: "1–2 mL", nota: "Suficiente para cobrir os micropinos" },
    { label: "Tempo de solidificação", value: "≥ 30 min", nota: "Retirar antes = ruptura do molde" },
    { label: "Densidade celular inicial", value: "50 × 10⁵ céls/mL", nota: "Ajusta o diâmetro final do esferoide" },
    { label: "Esferoides / placa 6-well", value: "4.716", nota: "750 micro-recessões × 6 poços" },
    { label: "Diâmetro médio esperado", value: "123 ± 3 µm", nota: "Homogêneo quando parâmetros seguidos" },
    { label: "Viabilidade celular", value: "> 95%", nota: "L929; verificar em tipo celular alvo" },
    { label: "Temperatura de incubação", value: "37 °C / 5% CO₂", nota: "80% umidade para estabilidade" },
    { label: "Tempo de formação", value: "24–48 h", nota: "Depende da cinética de auto-montagem celular" },
    { label: "Micropinos (QMicroNiche)", value: "Ø 650 µm × 1,3 mm alt.", nota: "SLA – resina fotocurável" },
  ]

  const dicas = [
    { icon: "⚠️", text: "Inserir o dispositivo no agarose SOMENTE quando ele ainda estiver completamente líquido. Bolhas de ar na interface comprometem a geometria das recessões." },
    { icon: "⏳", text: "Aguardar solidificação COMPLETA (≥ 30 min) antes de remover o dispositivo. Remoção prematura deforma ou rompe as micro-recessões." },
    { icon: "💧", text: "Ao adicionar meio após o plaqueamento celular, pipete lentamente pela parede do poço — correntes de líquido deslocam as células antes da sedimentação." },
    { icon: "🔄", text: "O dispositivo QMicroNiche é reutilizável: esterilize com álcool 70% + UV a cada ciclo. Pode ser usado por longos períodos sem perda de precisão geométrica." },
    { icon: "🔬", text: "Tipos celulares com baixa expressão de E-caderina ou integrina podem não compactar adequadamente. Validar com a linhagem de interesse antes de escalar." },
    { icon: "🧬", text: "Para co-culturas: misturar as duas populações celulares antes do plaqueamento na proporção desejada — o processo de auto-montagem integra as células." },
    { icon: "🏗️", text: "Para bioimpressão: esferoides formados no QMicroNiche funcionam como building blocks — coletar e usar diretamente no protocolo de impressão por fusão de esferoides." },
    { icon: "🧫", text: "Alternativa ao agarose: PDMS (polidimetilsiloxano) é mais resistente, transparente e reutilizável com preservação geométrica superior — indicado para protocolos de longa duração." },
  ]

  const colorMap = {
    blue:    { ring: "ring-blue-500/30",    bg: "bg-blue-500/10",    text: "text-blue-300",    dot: "bg-blue-400" },
    teal:    { ring: "ring-teal-500/30",    bg: "bg-teal-500/10",    text: "text-teal-300",    dot: "bg-teal-400" },
    amber:   { ring: "ring-amber-500/30",   bg: "bg-amber-500/10",   text: "text-amber-300",   dot: "bg-amber-400" },
    emerald: { ring: "ring-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-400" },
    violet:  { ring: "ring-violet-500/30",  bg: "bg-violet-500/10",  text: "text-violet-300",  dot: "bg-violet-400" },
    rose:    { ring: "ring-rose-500/30",    bg: "bg-rose-500/10",    text: "text-rose-300",    dot: "bg-rose-400" },
  }

  return (
    <div className="rounded-xl border border-teal-500/25 bg-gradient-to-br from-[#071a17] via-[#09201c] to-[#060f1a] overflow-hidden">
      {/* Header — sempre visível */}
      <div className="p-4 sm:p-5">
        {/* Badge publicação */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/15 border border-teal-500/25 text-[10px] font-semibold text-teal-300 uppercase tracking-wide">
            <BookOpen className="w-3 h-3" />
            JoVE · e63814 · Set 2022
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400">
            DOI: 10.3791/63814
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-300">
            ⭐ Método Quantis
          </span>
        </div>

        {/* Título + subtítulo */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-white leading-snug mb-1">
              Protocolo QMicroNiche™ — Moldes Não-Adesivos para Esferoides e Organoides
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Metodologia publicada por{" "}
              <span className="text-teal-300 font-semibold">Janaína A. Dernowsek</span>
              , Letícia E. Charelli & Tiago A. Balbino (UFRJ / BioEdTech).
              Geração em larga escala de esferoides homogêneos via dispositivo 3D impresso por SLA como molde mestre em agarose não-adesiva.
            </p>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { v: "4.716", label: "esferoides/placa", color: "text-teal-300" },
            { v: ">95%", label: "viabilidade celular", color: "text-emerald-300" },
            { v: "123 µm", label: "diâmetro homogêneo", color: "text-violet-300" },
          ].map((m, i) => (
            <div key={i} className="text-center py-2.5 px-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className={cn("text-base sm:text-lg font-bold", m.color)}>{m.v}</div>
              <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* CTA + expandir */}
        <div className="flex gap-2">
          <a
            href="https://www.quantis.bio/product-page/qmicroniche"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98]"
          >
            <Microscope className="w-4 h-4" />
            Conhecer o QMicroNiche™
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs rounded-xl transition-all"
          >
            {expanded ? "Ocultar" : "Ver protocolo"}
            <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-90")} />
          </button>
        </div>
      </div>

      {/* Corpo expandível */}
      {expanded && (
        <div className="border-t border-white/[0.06]">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-white/[0.06]">
            {[
              { key: "protocolo", label: "📋 Protocolo Completo" },
              { key: "parametros", label: "⚙️ Parâmetros" },
              { key: "dicas",     label: "💡 Dicas Críticas" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={cn(
                  "flex-1 py-3 text-[11px] font-semibold transition-all border-b-2",
                  activeTab === t.key
                    ? "text-teal-300 border-teal-500 bg-teal-500/5"
                    : "text-gray-500 border-transparent hover:text-gray-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {/* ─── Tab: Protocolo ─── */}
            {activeTab === "protocolo" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Fluxo metodológico</span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                {steps.map((step, idx) => {
                  const c = colorMap[step.color as keyof typeof colorMap]
                  return (
                    <div key={idx} className={cn("rounded-xl border p-4", `ring-1 ${c.ring}`, c.bg.replace("bg-", "bg-").replace("/10", "/[0.05]"))}>
                      {/* Header da etapa */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0", c.bg)}>
                          {step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {String(idx + 1).padStart(2, "0")} — {step.phase}
                            </span>
                            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", c.bg, c.text)}>
                              ⏱ {step.time}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Itens */}
                      <div className="space-y-1.5 pl-2">
                        {step.items.map((item, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", c.dot)} />
                            <p className="text-[11px] text-gray-300 leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* Rodapé citação */}
                <div className="mt-4 rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    <span className="text-gray-400 font-semibold">Referência: </span>
                    Charelli, L.E., Dernowsek, J.A., Balbino, T.A.{" "}
                    <span className="italic">Generation of Tissue Spheroids via a 3D Printed Stamp-Like Device.</span>{" "}
                    J. Vis. Exp. (2022). DOI:{" "}
                    <a href="https://doi.org/10.3791/63814" target="_blank" rel="noopener noreferrer"
                      className="text-teal-400 hover:underline">10.3791/63814</a>
                  </p>
                </div>
              </div>
            )}

            {/* ─── Tab: Parâmetros ─── */}
            {activeTab === "parametros" && (
              <div>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                  Parâmetros críticos validados no artigo JoVE (2022) para o dispositivo QMicroNiche com placa 6-well.
                  Ajuste conforme tipo celular e formato de placa utilizado.
                </p>
                <div className="space-y-2">
                  {params.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-teal-500/15 transition-colors">
                      <div className="w-5 h-5 rounded bg-teal-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <ThumbsUp className="w-3 h-3 text-teal-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs text-gray-300">{p.label}</span>
                          <span className="text-xs font-bold text-teal-300 shrink-0">{p.value}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.nota}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formatos compatíveis */}
                <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
                  <h5 className="text-xs font-semibold text-white mb-2">Formatos de Placa Compatíveis</h5>
                  <div className="flex flex-wrap gap-2">
                    {["Petri 35 mm", "Petri 60 mm", "Petri 90 mm", "Petri 150 mm",
                      "6-well", "12-well", "24-well", "96-well"].map((f) => (
                      <span key={f} className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab: Dicas Críticas ─── */}
            {activeTab === "dicas" && (
              <div className="space-y-2.5">
                <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                  Pontos críticos identificados no artigo JoVE e na experiência prática da equipe Quantis.
                </p>
                {dicas.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-base shrink-0">{d.icon}</span>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{d.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Organoid Protocol Viewer Component ───────────────────────────────────────
function OrganoidProtocolViewer({ protocol, organoidType }: { protocol: string; organoidType: string }) {
  // Parse protocolo em seções
  const sections = protocol.split(/\n\n+/).filter(Boolean)
  
  // Detectar seções por palavras-chave
  const parseSection = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes("objetivo") || lower.includes("fundamento")) return { type: "objective", icon: Target, color: "blue" }
    if (lower.includes("materiais") || lower.includes("reagentes")) return { type: "materials", icon: FlaskConical, color: "violet" }
    if (lower.includes("preparo") || lower.includes("preparação")) return { type: "prep", icon: Beaker, color: "amber" }
    if (lower.includes("etapa") || lower.includes("passo") || lower.includes("dia")) return { type: "steps", icon: ArrowRight, color: "emerald" }
    if (lower.includes("crítico") || lower.includes("parâmetro")) return { type: "critical", icon: AlertCircle, color: "rose" }
    if (lower.includes("checkpoint") || lower.includes("qualidade") || lower.includes("controle")) return { type: "quality", icon: CheckCircle2, color: "cyan" }
    if (lower.includes("timeline") || lower.includes("tempo")) return { type: "timeline", icon: Clock, color: "indigo" }
    return { type: "general", icon: ArrowRight, color: "gray" }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <CircleDot className="w-4 h-4 text-teal-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Protocolo de Diferenciação — {organoidType.charAt(0).toUpperCase() + organoidType.slice(1)} Organoid</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Protocolo assistido por IA para formação e maturação de organoides. Siga rigorosamente os parâmetros críticos e checkpoints de qualidade.
        </p>
      </div>

      {/* Seções dinâmicas */}
      <div className="space-y-3">
        {sections.map((sec, i) => {
          const parsed = parseSection(sec)
          const colorMap = {
            blue:    { bg: "bg-blue-500/8",    border: "border-blue-500/15",    icon: "text-blue-400",    title: "text-blue-300" },
            violet:  { bg: "bg-violet-500/8",  border: "border-violet-500/15",  icon: "text-violet-400",  title: "text-violet-300" },
            amber:   { bg: "bg-amber-500/8",   border: "border-amber-500/15",   icon: "text-amber-400",   title: "text-amber-300" },
            emerald: { bg: "bg-emerald-500/8", border: "border-emerald-500/15", icon: "text-emerald-400", title: "text-emerald-300" },
            rose:    { bg: "bg-rose-500/8",    border: "border-rose-500/15",    icon: "text-rose-400",    title: "text-rose-300" },
            cyan:    { bg: "bg-cyan-500/8",    border: "border-cyan-500/15",    icon: "text-cyan-400",    title: "text-cyan-300" },
            indigo:  { bg: "bg-indigo-500/8",  border: "border-indigo-500/15",  icon: "text-indigo-400",  title: "text-indigo-300" },
            gray:    { bg: "bg-white/[0.02]",  border: "border-white/8",        icon: "text-gray-400",    title: "text-white" },
          }
          const colors = colorMap[parsed.color as keyof typeof colorMap] ?? colorMap.gray
          
          const Icon = parsed.icon

          return (
            <div key={i} className={cn("rounded-xl border p-4", colors.bg, colors.border)}>
              <div className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
                  <Icon className={cn("w-4 h-4", colors.icon)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">{sec}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── QMicroNiche Section (JoVE Protocol - Janaína Dernowsek) ── */}
      <QMicroNicheSection />

      {/* QMatrix Section */}
      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/8 to-blue-500/10 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Bioativar com QMatrix™</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Acelere formação de esferoides, melhore adesão celular e organização tecidual com o peptídeo bioativo patenteado Quantis.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {[
              { title: "Revestimento de Superfície", desc: "10–25 µg/mL — pré-cobertura de placas ultra-low attachment" },
              { title: "Aditivo de Adesão", desc: "5–15 µg/mL — adicionar no meio de agregação (Dia 0–3)" },
              { title: "Biotinta / Hidrogel", desc: "50–100 µg/mL — melhor adesão e proliferação em scaffolds 3D" },
              { title: "Maturação Avançada", desc: "2–5 µg/mL — meio de diferenciação (Dia 7+) para organização" },
            ].map((item, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                <div className="text-[11px] font-semibold text-violet-300 mb-0.5">{item.title}</div>
                <div className="text-[10px] text-gray-500 leading-tight">{item.desc}</div>
              </div>
            ))}
          </div>
          <a href="https://www.quantis.bio/product-page/qmatrix-bioactive?lang=pt"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-violet-500/25 active:scale-[0.98]">
            <Beaker className="w-4 h-4" />
            Usar QMatrix™ neste Protocolo
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Acelere com especialistas */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/8 to-cyan-500/10 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Acelere com Especialistas Quantis</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              A IA <span className="text-white font-semibold">guia, explica e gera protocolos</span> para direcionar sua pesquisa.
              Entregamos dossiês técnicos e estratégias regulatórias.
            </p>
            <p className="text-[11px] text-emerald-300 leading-relaxed">
              💡 Porém, a <span className="font-semibold">validação experimental e otimização avançada</span> podem ser feitas com nossa equipe especializada em biofabricação.
            </p>
          </div>
        </div>
        <a href="https://wa.me/5511968632231"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98]">
          <MessageCircle className="w-4 h-4" />
          Falar com Especialistas da Quantis
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

/* ── Builder de esferoides ────────────────────────────────────────────── */
function SpheroidBuilder({
  onResult,
}: {
  onResult: (r: OrganoidDesign) => void
}) {
  const [cellType, setCellType]       = useState("")
  const [diameter, setDiameter]       = useState("200")
  const [cellsPerSphere, setCellsPerSphere] = useState("5000")
  const [method, setMethod]           = useState("micropinos")
  const [objective, setObjective]     = useState("screening")
  const [building, setBuilding]       = useState(false)

  async function buildSpheroide() {
    if (!cellType) return
    setBuilding(true)
    try {
      const purpose = `Esferoide monocelular de ${cellType} — diâmetro alvo ${diameter} µm, ` +
        `${cellsPerSphere} células/esferoide, método: ${method}, objetivo: ${objective}. ` +
        `Integrar sugestão de uso de QMicroNiche™ para produção padronizada e escalável.`
      const res = await fetch("/api/organoids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organoidType: "esferoide",
          purpose,
          cellSource: cellType,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onResult({ ...data, organoidType: `Esferoide · ${cellType}` })
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } finally { setBuilding(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-500/8 to-cyan-500/5 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
            <SpheroidIcon className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Builder de Esferoides Monocelulares</h3>
            <p className="text-[10px] text-teal-300/70">Agregados 3D de um único tipo celular — protocolo gerado por IA</p>
          </div>
        </div>
      </div>

      {/* Tipo celular */}
      <div>
        <label className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wide">
          Tipo Celular
        </label>
        <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {SPHEROID_CELL_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => setCellType(ct.value)}
              className={cn(
                "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] group",
                cellType === ct.value
                  ? "border-teal-500/30 bg-teal-500/10 text-white"
                  : "border-white/5 bg-white/2 text-gray-300 hover:border-white/15 hover:bg-white/4"
              )}
            >
              <span className="text-xs font-medium">{ct.label}</span>
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-md font-semibold",
                cellType === ct.value
                  ? "bg-teal-500/20 text-teal-300"
                  : "bg-white/5 text-gray-600 group-hover:text-gray-500"
              )}>
                {ct.group}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Diâmetro e nº células */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wide">
            Diâmetro Alvo (µm)
          </label>
          <input
            type="number"
            value={diameter}
            onChange={e => setDiameter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/40"
          />
          <p className="text-[10px] text-gray-600 mt-1">Padrão QMicroNiche: 123 µm</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-400 block mb-1.5 uppercase tracking-wide">
            Células / Esferoide
          </label>
          <input
            type="number"
            value={cellsPerSphere}
            onChange={e => setCellsPerSphere(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500/40"
          />
          <p className="text-[10px] text-gray-600 mt-1">Ajuste por tipo celular</p>
        </div>
      </div>

      {/* Método de formação */}
      <div>
        <label className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wide">
          Método de Formação
        </label>
        <div className="space-y-1.5">
          {SPHEROID_METHODS.map((m) => (
            <label
              key={m.value}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all",
                method === m.value
                  ? "border-teal-500/25 bg-teal-500/8"
                  : "border-white/5 bg-white/2 hover:border-white/10"
              )}
            >
              <div className="flex items-center gap-2.5">
                <input type="radio" value={m.value} checked={method === m.value}
                  onChange={() => setMethod(m.value)} className="accent-teal-500" />
                <div>
                  <p className="text-xs font-medium text-white">{m.label}</p>
                  <p className="text-[10px] text-gray-500">{m.desc}</p>
                </div>
              </div>
              {(m.value === "micropinos" || m.value === "nao_aderente") && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 shrink-0">
                  QUANTIS
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Objetivo */}
      <div>
        <label className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wide">
          Objetivo
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {SPHEROID_OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              onClick={() => setObjective(obj.value)}
              className={cn(
                "py-2.5 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98]",
                objective === obj.value
                  ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                  : "border-white/5 bg-white/2 text-gray-400 hover:border-white/15 hover:text-gray-300"
              )}
            >
              {obj.label}
            </button>
          ))}
        </div>
      </div>

      {/* QMicroNiche hint */}
      <div className="rounded-xl border border-teal-500/15 bg-teal-500/5 p-3 flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <Layers className="w-3.5 h-3.5 text-teal-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-teal-300 mb-0.5">QMicroNiche™ recomendado</p>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            A IA BIA integrará automaticamente o protocolo de moldes não-adesivos de agarose 2% (JoVE 2022, Dernowsek) — até 4.716 esferoides/placa, &gt;95% viabilidade.
          </p>
        </div>
      </div>

      {/* Botão gerar */}
      <button
        onClick={buildSpheroide}
        disabled={building || !cellType}
        className="w-full py-3.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-teal-900/30"
      >
        {building ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando protocolo...</>
        ) : (
          <><Zap className="w-4 h-4" /> Gerar Protocolo (15 créditos)</>
        )}
      </button>
    </div>
  )
}

/* ── Builder dérmico ─────────────────────────────────────────────────── */
function DermicBuilder({
  onResult,
}: {
  onResult: (r: OrganoidDesign) => void
}) {
  const [cellTypes, setCellTypes]     = useState<string[]>([])
  const [structure, setStructure]     = useState("full_thickness")
  const [objective, setObjective]     = useState("cosmetico")
  const [building, setBuilding]       = useState(false)

  function toggleCell(v: string) {
    setCellTypes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  async function buildDermico() {
    if (cellTypes.length === 0) return
    setBuilding(true)
    try {
      const purpose = `Organoide dérmico com células: ${cellTypes.join(", ")}. ` +
        `Estrutura: ${structure}. Objetivo: ${objective}. ` +
        `Incluir estratégias de vascularização quando aplicável, uso de QMatrix™ e biomateriais dérmicos validados. ` +
        `Gerar protocolo completo de montagem de pele artificial.`
      const res = await fetch("/api/organoids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organoidType: "dermico",
          purpose,
          cellSource: cellTypes[0] || "Primary",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onResult({ ...data, organoidType: `Dérmico · ${structure}` })
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } finally { setBuilding(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-500/8 to-rose-500/5 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/25 flex items-center justify-center">
            <SkinIcon className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Organoide Dérmico</h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-pink-500/20 text-pink-300">NOVO</span>
            </div>
            <p className="text-[10px] text-pink-300/70">Modelos de pele — epiderme, derme, cicatrização, cosmético</p>
          </div>
        </div>
      </div>

      {/* Células */}
      <div>
        <label className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wide">
          Tipo Celular Principal <span className="text-gray-600 normal-case">(selecione um ou mais)</span>
        </label>
        <div className="space-y-1.5">
          {DERMIC_CELL_TYPES.map((ct) => (
            <label
              key={ct.value}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl cursor-pointer border transition-all",
                cellTypes.includes(ct.value)
                  ? "border-pink-500/25 bg-pink-500/8"
                  : "border-white/5 bg-white/2 hover:border-white/10"
              )}
            >
              <input
                type="checkbox"
                checked={cellTypes.includes(ct.value)}
                onChange={() => toggleCell(ct.value)}
                className="accent-pink-500 w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-200">{ct.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Estrutura */}
      <div>
        <label className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wide">
          Estrutura Desejada
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {DERMIC_STRUCTURES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStructure(s.value)}
              className={cn(
                "py-2.5 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98]",
                structure === s.value
                  ? "border-pink-500/30 bg-pink-500/10 text-pink-300"
                  : "border-white/5 bg-white/2 text-gray-400 hover:border-white/15 hover:text-gray-300"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Objetivo */}
      <div>
        <label className="text-xs font-semibold text-gray-400 block mb-2 uppercase tracking-wide">
          Objetivo do Modelo
        </label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {DERMIC_OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              onClick={() => setObjective(obj.value)}
              className={cn(
                "py-2.5 px-3 rounded-xl text-xs font-medium border transition-all active:scale-[0.98]",
                objective === obj.value
                  ? "border-pink-500/30 bg-pink-500/10 text-pink-300"
                  : "border-white/5 bg-white/2 text-gray-400 hover:border-white/15 hover:text-gray-300"
              )}
            >
              {obj.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={buildDermico}
        disabled={building || cellTypes.length === 0}
        className="w-full py-3.5 rounded-xl bg-pink-600 text-white text-sm font-semibold hover:bg-pink-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-pink-900/30"
      >
        {building ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gerando protocolo...</>
        ) : (
          <><Zap className="w-4 h-4" /> Gerar Protocolo Dérmico (15 créditos)</>
        )}
      </button>
    </div>
  )
}

export default function OrganoidsPage() {
  const [designs, setDesigns]         = useState<OrganoidDesign[]>([])
  const [selectedType, setSelectedType] = useState("")
  const [purpose, setPurpose]         = useState("")
  const [cellSource, setCellSource]   = useState("iPSC")
  const [designing, setDesigning]     = useState(false)
  const [result, setResult]           = useState<OrganoidDesign | null>(null)
  const [showHistory, setShowHistory] = useState(false)  // mobile history drawer

  // builder mode: "organoid" | "spheroid" | "dermic"
  const [builderMode, setBuilderMode] = useState<"organoid" | "spheroid" | "dermic">("organoid")

  useEffect(() => { loadDesigns() }, [])

  async function loadDesigns() {
    const res = await fetch("/api/organoids")
    if (res.ok) setDesigns(await res.json())
  }

  async function designOrganoid() {
    if (!selectedType || !purpose) return
    setDesigning(true)
    setResult(null)
    try {
      const res = await fetch("/api/organoids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organoidType: selectedType, purpose, cellSource }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        loadDesigns()
      } else {
        const err = await res.json()
        alert(err.error)
      }
    } finally { setDesigning(false) }
  }

  function handleSpecialResult(r: OrganoidDesign) {
    setResult(r)
    loadDesigns()
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex w-72 border-r border-white/5 bg-black/10 flex-col shrink-0">
        <SidebarContent
          designs={designs}
          selectedType={selectedType}
          onSelectType={(v) => {
            if (v === "esferoide") { setBuilderMode("spheroid"); setSelectedType("") }
            else if (v === "dermico") { setBuilderMode("dermic"); setSelectedType("") }
            else { setBuilderMode("organoid"); setSelectedType(v) }
          }}
          onSelectDesign={(d) => setResult(d)}
        />
      </div>

      {/* ── Mobile: history drawer ── */}
      {showHistory && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHistory(false)} />
          <div className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[#0d0720] border-l border-white/8 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-teal-400" />
                Histórico
              </h3>
              <button onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {designs.length === 0 ? (
                <div className="py-8 text-center">
                  <CircleDot className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Nenhum design criado</p>
                </div>
              ) : (
                designs.map((d) => (
                  <button key={d.id} onClick={() => { setResult(d); setShowHistory(false) }}
                    className="w-full text-left p-3 rounded-xl border border-white/5 hover:border-teal-500/20 bg-white/2 transition-all active:scale-[0.98]">
                    <p className="text-xs font-medium text-white capitalize">{d.organoidType}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{d.purpose}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {d.createdAt && new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
          <CircleDot className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-sm font-semibold text-white flex-1">Organoid Builder</span>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 transition-all"
          >
            <History className="w-3.5 h-3.5 text-teal-400" />
            Histórico {designs.length > 0 && `(${designs.length})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!result ? (
            <div className="max-w-xl mx-auto">

              {/* Header */}
              <div className="hidden md:block mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                  <CircleDot className="w-5 h-5 text-teal-400" />
                  Organoid Builder
                </h2>
                <p className="text-sm text-gray-400">
                  Design assistido por IA — organoides, esferoides e tecidos
                </p>
              </div>

              {/* ── Tabs de modo ─────────────────────────────────────── */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-5 border border-white/5">
                {[
                  { key: "organoid", label: "Organoides", icon: <CircleDot className="w-3.5 h-3.5" /> },
                  { key: "spheroid", label: "Esferoides", icon: <SpheroidIcon className="w-3.5 h-3.5" /> },
                  { key: "dermic",   label: "Dérmico",    icon: <SkinIcon className="w-3.5 h-3.5" /> },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setBuilderMode(tab.key as "organoid" | "spheroid" | "dermic")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all",
                      builderMode === tab.key
                        ? tab.key === "spheroid"
                          ? "bg-teal-500/20 text-teal-300 shadow-sm"
                          : tab.key === "dermic"
                            ? "bg-pink-500/20 text-pink-300 shadow-sm"
                            : "bg-teal-500/20 text-teal-300 shadow-sm"
                        : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    {(tab.key === "spheroid" || tab.key === "dermic") && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-teal-500/30 text-teal-300 leading-none">NEW</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Modo ESFEROIDES ─────────────────────────────────── */}
              {builderMode === "spheroid" && (
                <SpheroidBuilder onResult={handleSpecialResult} />
              )}

              {/* ── Modo DÉRMICO ────────────────────────────────────── */}
              {builderMode === "dermic" && (
                <DermicBuilder onResult={handleSpecialResult} />
              )}

              {/* ── Modo ORGANOIDES (padrão) ─────────────────────────── */}
              {builderMode === "organoid" && (
                <div className="space-y-4 sm:space-y-5">

                  {/* Seção: Organoides */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Organoides</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                      {ORGANOID_TYPES.filter(t => t.value !== "dermico").map((type) => {
                        const colors = COLOR_MAP[type.color] || COLOR_MAP.teal
                        const isSelected = selectedType === type.value
                        return (
                          <button
                            key={type.value}
                            onClick={() => setSelectedType(type.value)}
                            className={cn(
                              "relative group text-left p-3 rounded-xl border transition-all duration-200 active:scale-[0.97]",
                              isSelected
                                ? colors
                                : "border-white/5 bg-white/2 hover:border-white/15 hover:bg-white/4 hover:shadow-lg hover:shadow-black/20"
                            )}
                          >
                            {type.isNew && (
                              <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1 py-0.5 rounded bg-teal-500/30 text-teal-300 leading-none">NEW</span>
                            )}
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                                isSelected
                                  ? "bg-white/10"
                                  : "bg-white/5 group-hover:bg-white/8"
                              )}>
                                <span className={cn(
                                  "transition-colors",
                                  isSelected ? "" : "text-gray-400 group-hover:text-gray-300"
                                )}>
                                  {type.icon}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-white">{type.label}</p>
                                <p className="text-[9px] text-gray-500 leading-tight mt-0.5">{type.desc}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Seção: Dérmico separado */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Tecidos Especializados</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <button
                      onClick={() => setBuilderMode("dermic")}
                      className="w-full group text-left p-3 rounded-xl border border-pink-500/15 bg-pink-500/5 hover:border-pink-500/30 hover:bg-pink-500/8 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/15 border border-pink-500/20 flex items-center justify-center shrink-0">
                          <SkinIcon className="w-4 h-4 text-pink-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-pink-300">Dérmico / Pele</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-pink-500/20 text-pink-300">NOVO</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">Epiderme, derme, full thickness, cicatrização, cosmético</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-pink-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </div>

                  {/* Seção: Esferoides */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Esferoides</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <button
                      onClick={() => setBuilderMode("spheroid")}
                      className="w-full group text-left p-3 rounded-xl border border-teal-500/15 bg-teal-500/5 hover:border-teal-500/30 hover:bg-teal-500/8 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
                          <SpheroidIcon className="w-4 h-4 text-teal-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-teal-300">Esferoides Monocelulares</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300">NOVO</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">15 tipos celulares — fibroblastos, MSC, tumorais, hepatócitos e mais</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </div>

                  {/* Finalidade */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 block mb-1.5 uppercase tracking-wide">
                      Finalidade / Propósito
                    </label>
                    <textarea
                      value={purpose}
                      onChange={e => setPurpose(e.target.value)}
                      placeholder="ex: Modelagem de doença de Crohn para triagem de drogas; Estudo de infecção por SARS-CoV-2"
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Fonte celular */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 block mb-2 uppercase tracking-wide">
                      Fonte Celular
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {CELL_SOURCES.map((cs) => (
                        <label key={cs.value}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl cursor-pointer border transition-all",
                            cellSource === cs.value
                              ? "border-teal-500/25 bg-teal-500/5"
                              : "border-white/5 bg-white/2 hover:border-white/10"
                          )}>
                          <input type="radio" value={cs.value} checked={cellSource === cs.value}
                            onChange={() => setCellSource(cs.value)} className="accent-teal-500" />
                          <span className="text-xs text-gray-300 leading-tight">{cs.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={designOrganoid}
                    disabled={designing || !selectedType || !purpose}
                    className="w-full py-3.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-teal-900/30"
                  >
                    {designing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Gerando protocolo com IA...</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Gerar Design (15 créditos)</>
                    )}
                  </button>

                  {/* QMicroNiche highlight */}
                  <div className="rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-500/5 to-cyan-500/5 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-teal-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white mb-1">
                          💡 Método Recomendado: Moldes Não-Adesivos QMicroNiche™
                        </h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Metodologia Quantis (publicada na{" "}
                          <span className="text-teal-300">JoVE, 2022</span>) para geração de
                          esferoides e organoides em larga escala — 4.716 esferoides por placa de 6 poços,
                          homogêneos, viabilidade {">"}95%.
                        </p>
                      </div>
                    </div>
                    <a
                      href="https://www.quantis.bio/product-page/qmicroniche"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 border border-teal-500/25 text-teal-300 hover:bg-teal-500/10 text-xs font-semibold rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Saiba mais sobre o QMicroNiche™
                    </a>
                  </div>

                </div>
              )}
            </div>
          ) : (
            /* ── Result ── */
            <div className="max-w-2xl mx-auto">
              <div className="flex items-start justify-between mb-5 sm:mb-6 gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white capitalize">
                    {result.organoidType} Organoid
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{result.purpose}</p>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-xl border border-white/10 shrink-0 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo design
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {result.protocol && (
                  <OrganoidProtocolViewer protocol={result.protocol} organoidType={result.organoidType} />
                )}

                {result.timeline && (
                  <div className="rounded-xl border border-teal-500/15 bg-teal-500/[0.03] p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-teal-300 mb-2">⏱️ Timeline</h3>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{result.timeline}</p>
                  </div>
                )}

                {result.materials && result.materials.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">🧪 Materiais</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.materials.map((m, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.expectedMarkers && result.expectedMarkers.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                      <h3 className="text-xs font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Marcadores Esperados</h3>
                      <div className="space-y-1.5">
                        {result.expectedMarkers.map((m, i) => (
                          <div key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                            <span className="text-teal-500 shrink-0">•</span>{m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.qualityMetrics && result.qualityMetrics.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                      <h3 className="text-xs font-semibold text-gray-400 mb-2.5 uppercase tracking-wide">Métricas de Qualidade</h3>
                      <div className="space-y-1.5">
                        {result.qualityMetrics.map((m, i) => (
                          <div key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Desktop sidebar content ── */
function SidebarContent({
  designs, selectedType, onSelectType, onSelectDesign,
}: {
  designs: OrganoidDesign[]
  selectedType: string
  onSelectType: (v: string) => void
  onSelectDesign: (d: OrganoidDesign) => void
}) {
  const [tab, setTab] = useState<"new" | "history">("new")

  const allItems = [
    ...ORGANOID_TYPES,
    SPHEROID_ITEM,
  ]

  return (
    <>
      <div className="p-4 border-b border-white/5">
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
          {[{ key: "new", label: "Novo Design" }, { key: "history", label: "Histórico" }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key as "new" | "history")}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                tab === t.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "new" ? (
          <div className="space-y-3">
            {/* Organoides */}
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1.5 px-1">
                Organoides
              </p>
              <div className="space-y-0.5">
                {allItems.filter(t => t.category === "organoid" && t.value !== "dermico").map((type) => {
                  const colors = COLOR_MAP[type.color] || COLOR_MAP.teal
                  const isSelected = selectedType === type.value
                  return (
                    <button key={type.value} onClick={() => onSelectType(type.value)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl transition-all active:scale-[0.97] group",
                        isSelected
                          ? colors + " border"
                          : "hover:bg-white/4 border border-transparent"
                      )}>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-6 h-6 flex items-center justify-center shrink-0",
                          isSelected ? "" : "text-gray-500 group-hover:text-gray-300"
                        )}>
                          {type.icon}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-white">{type.label}</p>
                          <p className="text-[9px] text-gray-600">{type.desc.split(",")[0]}</p>
                        </div>
                        {type.isNew && (
                          <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded bg-teal-500/20 text-teal-400 shrink-0">NEW</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tecidos Especializados */}
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1.5 px-1">
                Tecidos
              </p>
              <button onClick={() => onSelectType("dermico")}
                className={cn(
                  "w-full text-left p-2.5 rounded-xl transition-all active:scale-[0.97] group",
                  selectedType === "dermico"
                    ? "border border-pink-500/25 bg-pink-500/8 text-pink-300"
                    : "hover:bg-white/4 border border-transparent"
                )}>
                <div className="flex items-center gap-2">
                  <span className={cn("w-6 h-6 flex items-center justify-center shrink-0",
                    selectedType === "dermico" ? "text-pink-400" : "text-gray-500 group-hover:text-gray-300")}>
                    <SkinIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-white">Dérmico</p>
                    <p className="text-[9px] text-gray-600">Epiderme · Derme · Pele</p>
                  </div>
                  <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded bg-pink-500/20 text-pink-400 shrink-0">NEW</span>
                </div>
              </button>
            </div>

            {/* Esferoides */}
            <div>
              <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1.5 px-1">
                Esferoides
              </p>
              <button onClick={() => onSelectType("esferoide")}
                className={cn(
                  "w-full text-left p-2.5 rounded-xl transition-all active:scale-[0.97] group",
                  selectedType === "esferoide"
                    ? "border border-teal-500/25 bg-teal-500/8 text-teal-300"
                    : "hover:bg-white/4 border border-transparent"
                )}>
                <div className="flex items-center gap-2">
                  <span className={cn("w-6 h-6 flex items-center justify-center shrink-0",
                    selectedType === "esferoide" ? "text-teal-400" : "text-gray-500 group-hover:text-gray-300")}>
                    <SpheroidIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-white">Esferoides Mono.</p>
                    <p className="text-[9px] text-gray-600">15 tipos celulares</p>
                  </div>
                  <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded bg-teal-500/20 text-teal-400 shrink-0">NEW</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {designs.length === 0 ? (
              <div className="py-8 text-center">
                <CircleDot className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Nenhum design criado</p>
              </div>
            ) : (
              designs.map((d) => (
                <button key={d.id} onClick={() => onSelectDesign(d)}
                  className="w-full text-left p-3 rounded-xl border border-white/5 hover:border-teal-500/20 bg-white/2 transition-all active:scale-[0.98]">
                  <p className="text-xs font-medium text-white capitalize">{d.organoidType}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{d.purpose}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {d.createdAt && new Date(d.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </>
  )
}
