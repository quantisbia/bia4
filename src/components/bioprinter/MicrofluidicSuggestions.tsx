/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MicrofluidicSuggestions — Sugestões pós-bioimpressão (R12.10)
 *
 *  Catálogo de sistemas microfluídicos recomendados DEPOIS do print:
 *    1. Perfusion Bioreactor — perfusão contínua de meio (24-72h)
 *    2. Organ-on-Chip — chip PDMS acoplado para vasculatura/barreira
 *    3. Gradient Generator — gradientes químicos (quimiotaxia, diferenciação)
 *    4. Vascular Seeding — endotelização de canais sacrificiais (HUVEC + shear)
 *
 *  Filosofia: tecido impresso é só metade — perfusão/maturação é a outra metade.
 *  Cada sugestão tem: setup, parâmetros típicos, papers de referência.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

"use client"

import { useState } from "react"
import {
  Waves, Activity, Beaker, Droplets, AlertCircle, ChevronDown,
  ChevronUp, ExternalLink, Settings2, CheckCircle2, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils/helpers"
import { InfoButton } from "@/components/ui/InfoButton"

// ─── Catálogo de sistemas microfluídicos ─────────────────────────────────

type MicrofluidicCategory = "perfusion" | "ooc" | "gradient" | "vascular"

interface MicrofluidicSystem {
  id: string
  category: MicrofluidicCategory
  name: string
  shortDesc: string
  goodFor: string[]                  // Tipos de tecido
  setup: string[]                    // Itens de hardware/consumível
  params: Array<{ key: string; val: string; hint?: string }>
  protocol: string[]                 // Passos básicos
  refs: Array<{ author: string; year: number; title: string; doi?: string }>
  warning?: string
}

const SYSTEMS: MicrofluidicSystem[] = [
  {
    id: "perfusion-spinner",
    category: "perfusion",
    name: "Perfusion Bioreactor (Câmara fechada)",
    shortDesc: "Perfusão contínua de meio através do construto — essencial para construtos >1 mm³ para vencer limite de difusão O₂",
    goodFor: ["Ósseo", "Cartilagem", "Cardíaco (patch)", "Hepático"],
    setup: [
      "Câmara de perfusão (vidro/PDMS) com inlet/outlet",
      "Bomba peristáltica (0.1–10 mL/min)",
      "Reservatório de meio (50–250 mL)",
      "Filtro 0.22 µm in-line + trap de bolhas",
      "Tubing silicone Pt-cured (1/16\")",
    ],
    params: [
      { key: "Fluxo", val: "0.5 – 3 mL/min", hint: "Ajustar p/ shear endotelial 1–10 dyn/cm²" },
      { key: "Tempo", val: "24 – 168 h", hint: "Maturação: 3–7 dias típico" },
      { key: "Temperatura", val: "37 °C", hint: "Incubadora ou jacket aquecido" },
      { key: "Troca de meio", val: "50 % a cada 48 h" },
      { key: "pH", val: "7.2 – 7.4", hint: "Bicarbonato + 5% CO₂" },
    ],
    protocol: [
      "Estabilize construto crosslinkado em meio 30 min a 37 °C",
      "Carregue na câmara em capela de fluxo (estéril)",
      "Inicie bomba a fluxo baixo (0.1 mL/min) por 1 h — adaptação",
      "Aumente gradualmente até fluxo alvo em rampa 30 min",
      "Monitore pH/glicose/lactato a cada 24 h",
      "Aos 7 dias: extraia para assays (viabilidade, ECM)",
    ],
    refs: [
      { author: "Wendt et al.", year: 2003, title: "Oscillating perfusion of cell suspensions through 3D scaffolds", doi: "10.1002/bit.10583" },
      { author: "Bancroft et al.", year: 2002, title: "Fluid flow increases mineralized matrix deposition in 3D BMC cultures", doi: "10.1073/pnas.182066499" },
    ],
    warning: "Risco de contaminação alto — sempre usar filtro 0.22 µm; troque tubing a cada 14 dias",
  },
  {
    id: "ooc-pdms",
    category: "ooc",
    name: "Organ-on-Chip (Chip PDMS acoplado)",
    shortDesc: "Acopla tecido impresso a chip PDMS com câmara epitelial/endotelial — barreira aire-líquido, co-cultura, vascular",
    goodFor: ["Pele", "Vaso sanguíneo", "Pulmão", "BBB (barreira hematoencefálica)"],
    setup: [
      "Chip PDMS 2-canais (Emulate, Mimetas, OrganoPlate ou custom soft-litho)",
      "Membrana porosa 0.4–1 µm (PET ou PDMS)",
      "Bomba syringe dual (5–500 µL/min)",
      "Manifold de gás (95% ar + 5% CO₂)",
      "Microscópio para imaging live (ideal)",
    ],
    params: [
      { key: "Fluxo apical", val: "10 – 60 µL/min" },
      { key: "Fluxo basal", val: "10 – 100 µL/min" },
      { key: "Shear endotelial", val: "1 – 10 dyn/cm²", hint: "≈ 0.1–1 Pa em capilar" },
      { key: "Stretch cíclico", val: "5 – 15 % @ 0.2 Hz", hint: "Pulmão / cardíaco" },
      { key: "TEER (barreira)", val: "> 200 Ω·cm²", hint: "Marca integridade epitelial" },
    ],
    protocol: [
      "Semeie endotélio (HUVEC) no canal basal — 5 × 10⁶ cel/mL",
      "Aguarde 24 h em static p/ aderência",
      "Inicie fluxo basal a 30 µL/min — endotélio alinha em 48–72 h",
      "Semeie epitélio/parênquima no canal apical",
      "Mantenha co-cultura por 7–14 dias",
      "Validação: TEER + ZO-1/VE-cadherin imunofluorescência",
    ],
    refs: [
      { author: "Huh et al.", year: 2010, title: "Reconstituting organ-level lung functions on a chip", doi: "10.1126/science.1188302" },
      { author: "Ronaldson-Bouchard & Vunjak-Novakovic", year: 2018, title: "Organs-on-a-Chip: A Fast Track for Engineered Human Tissues in Drug Development", doi: "10.1016/j.stem.2018.05.016" },
    ],
  },
  {
    id: "gradient-generator",
    category: "gradient",
    name: "Gradient Generator (Quimiotaxia / Diferenciação)",
    shortDesc: "Cria gradientes lineares ou exponenciais de fatores solúveis sobre o construto — útil p/ stem cell fate + quimiotaxia",
    goodFor: ["Neural", "Ósseo (BMP gradient)", "Vascular (VEGF)", "Stem cells (Wnt/Shh)"],
    setup: [
      "Chip gradient gen 3-input (Christmas tree microfluídico)",
      "3 syringe pumps independentes",
      "Câmara aberta sobre o tecido impresso (gasket PDMS)",
      "Reservatórios com fator de crescimento (alto/médio/zero)",
    ],
    params: [
      { key: "Fluxo total", val: "1 – 10 µL/min" },
      { key: "Faixa de gradiente", val: "0 → 100 ng/mL (típico VEGF)" },
      { key: "Estabilização", val: "30 min para steady state" },
      { key: "Duração", val: "24 – 96 h" },
    ],
    protocol: [
      "Conecte 3 reservatórios: [fator]·max, [fator]·0.5x, sem fator",
      "Estabilize gradiente em capela 30 min antes do tecido",
      "Acople ao construto com gasket PDMS limpo",
      "Mantenha fluxo contínuo — imagem time-lapse a cada 4 h",
      "Análise: migração celular, expressão de marcadores por região",
    ],
    refs: [
      { author: "Jeon et al.", year: 2002, title: "Generation of solution and surface gradients using microfluidic systems", doi: "10.1021/la000600b" },
    ],
  },
  {
    id: "vascular-seeding",
    category: "vascular",
    name: "Vascular Network Seeding (Endotelização de canais)",
    shortDesc: "Após dissolver Pluronic sacrificial, semeia HUVEC nos canais ocos sob fluxo — gera vasculatura funcional perfusável",
    goodFor: ["Construtos com canais Pluronic sacrificial", "Patches espessos (>2 mm)", "FRESH cardíaco"],
    setup: [
      "Tecido com canais Pluronic já dissolvido (lavagem 4 °C, 1 h)",
      "Cell loading port (cânula 22G)",
      "Bomba peristáltica reversa (10–100 µL/min)",
      "HUVEC ou hiPSC-ECs em meio EGM-2",
      "Capela com aquecimento + CO₂",
    ],
    params: [
      { key: "Densidade celular", val: "5 – 20 × 10⁶ cel/mL", hint: "Dependendo do volume vascular" },
      { key: "Tempo de aderência (static)", val: "1 – 4 h" },
      { key: "Shear final", val: "1 – 5 dyn/cm²", hint: "Alinhamento de endotélio" },
      { key: "Maturação", val: "5 – 14 dias" },
    ],
    protocol: [
      "Confirme dissolução total do Pluronic (lavagem 3× PBS 4 °C)",
      "Pré-trate canais com fibronectina 50 µg/mL · 1 h, 37 °C",
      "Injete HUVEC a 10×10⁶ cel/mL — encha canal completamente",
      "Static por 2 h, vire 180° na 1ª hora para semeadura uniforme",
      "Inicie fluxo lento (5 µL/min) — aumente p/ shear alvo em 24 h",
      "Validação: VE-cadherin imuno + permeabilidade (FITC-dextran)",
    ],
    refs: [
      { author: "Skylar-Scott et al.", year: 2019, title: "Biomanufacturing of organ-specific tissues via SWIFT", doi: "10.1126/sciadv.aaw2459" },
      { author: "Kolesky et al.", year: 2016, title: "Three-dimensional bioprinting of thick vascularized tissues", doi: "10.1073/pnas.1521342113" },
    ],
    warning: "Endotélio só sobrevive com perfusão contínua >24 h — não deixar static depois da semeadura",
  },
]

// Categorias (ordem visual)
const CATEGORIES: Array<{
  id: MicrofluidicCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  border: string
}> = [
  { id: "perfusion", label: "Perfusão",       icon: Waves,     color: "text-cyan-300",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30" },
  { id: "ooc",       label: "Organ-on-Chip",  icon: Activity,  color: "text-violet-300",  bg: "bg-violet-500/10",  border: "border-violet-500/30" },
  { id: "gradient",  label: "Gradient Gen",   icon: Droplets,  color: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  { id: "vascular",  label: "Vasc Seeding",   icon: Beaker,    color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
]

// Sugestão por tecido alvo
function suggestFor(tissueType: string | null | undefined): string[] {
  const t = (tissueType ?? "").toLowerCase()
  if (t.includes("ósse") || t.includes("osso")) return ["perfusion-spinner", "gradient-generator"]
  if (t.includes("cartil")) return ["perfusion-spinner"]
  if (t.includes("cardí") || t.includes("cardi")) return ["perfusion-spinner", "vascular-seeding"]
  if (t.includes("pele") || t.includes("skin")) return ["ooc-pdms"]
  if (t.includes("vaso") || t.includes("vasc")) return ["vascular-seeding", "ooc-pdms"]
  if (t.includes("neur") || t.includes("cérebr")) return ["gradient-generator", "ooc-pdms"]
  if (t.includes("hepa") || t.includes("fíga")) return ["perfusion-spinner", "ooc-pdms"]
  return ["perfusion-spinner", "vascular-seeding"]
}

// ─── Componente ──────────────────────────────────────────────────────────

export interface MicrofluidicSuggestionsProps {
  tissueType?: string | null
  hasVascularChannels?: boolean
  className?: string
}

export function MicrofluidicSuggestions({
  tissueType,
  hasVascularChannels = false,
  className,
}: MicrofluidicSuggestionsProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState<MicrofluidicCategory | "all">("all")

  // Recomendações baseadas em tissue
  const recommendedIds = new Set(suggestFor(tissueType))
  if (hasVascularChannels) recommendedIds.add("vascular-seeding")

  const filtered = activeCat === "all"
    ? SYSTEMS
    : SYSTEMS.filter((s) => s.category === activeCat)

  return (
    <section className={cn("rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.04] to-violet-500/[0.02] p-4 sm:p-5", className)}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
            <Waves className="w-4 h-4 text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
              Sugestões Microfluídicas Pós-Bioimpressão
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-semibold uppercase tracking-wider">
                R12.10
              </span>
              <InfoButton title="Por que microfluídica depois do print?" align="left">
                <p>Construtos &gt; 1 mm³ <strong>não sobrevivem por difusão passiva</strong> de O₂/nutrientes.
                Sistemas microfluídicos resolvem isso em 4 frentes:</p>
                <ul className="list-disc list-inside text-[10.5px] mt-1.5 space-y-0.5">
                  <li><strong>Perfusão</strong>: vence limite de Krogh (~200 µm)</li>
                  <li><strong>Organ-on-chip</strong>: simula barreira / shear in vivo</li>
                  <li><strong>Gradientes</strong>: dita diferenciação espacial</li>
                  <li><strong>Endotelização</strong>: torna canais sacrificiais funcionais</li>
                </ul>
              </InfoButton>
            </h2>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Tecidos espessos precisam de perfusão e maturação para virar tecido funcional.
              Aqui estão os 4 sistemas mais usados, com setup, parâmetros e protocolo.
              {tissueType && (
                <span className="ml-1 text-cyan-200">
                  · Recomendações para <strong>{tissueType}</strong> destacadas abaixo.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro por categoria */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <CategoryButton
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
          label="Todos"
        />
        {CATEGORIES.map((c) => (
          <CategoryButton
            key={c.id}
            active={activeCat === c.id}
            onClick={() => setActiveCat(c.id)}
            label={c.label}
            icon={<c.icon className={cn("w-3 h-3", activeCat === c.id ? "text-white" : c.color)} />}
          />
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {filtered.map((sys) => {
          const cat = CATEGORIES.find((c) => c.id === sys.category)!
          const isRec = recommendedIds.has(sys.id)
          const isOpen = expanded === sys.id
          const Icon = cat.icon
          return (
            <article
              key={sys.id}
              className={cn(
                "rounded-lg border transition-all",
                isRec ? "border-cyan-400/50 bg-cyan-500/[0.06] shadow-md shadow-cyan-500/5" : `${cat.border} bg-black/30`,
              )}
            >
              {/* Header do card (clickable) */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : sys.id)}
                className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0", cat.bg, cat.border)}>
                  <Icon className={cn("w-3.5 h-3.5", cat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[13px] font-semibold text-white">{sys.name}</h3>
                    {isRec && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-100 font-semibold">
                        <Sparkles className="w-2.5 h-2.5" />
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{sys.shortDesc}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sys.goodFor.slice(0, 4).map((g) => (
                      <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </button>

              {/* Expandido */}
              {isOpen && (
                <div className="border-t border-white/10 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Setup */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
                      <Settings2 className="w-3 h-3" /> Setup necessário
                    </h4>
                    <ul className="space-y-1">
                      {sys.setup.map((item, i) => (
                        <li key={i} className="text-[11px] text-gray-200 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Parâmetros */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Parâmetros típicos
                    </h4>
                    <div className="space-y-0.5">
                      {sys.params.map((p, i) => (
                        <div key={i} className="text-[11px] flex items-baseline justify-between gap-2 border-b border-white/5 pb-0.5">
                          <span className="text-gray-400 flex-shrink-0">{p.key}</span>
                          <span className="text-white font-mono text-right">{p.val}</span>
                        </div>
                      ))}
                    </div>
                    {sys.params.some((p) => p.hint) && (
                      <div className="mt-1.5 space-y-0.5">
                        {sys.params.filter((p) => p.hint).map((p, i) => (
                          <p key={i} className="text-[9.5px] text-gray-500 italic">
                            · {p.key}: {p.hint}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Protocolo */}
                  <div className="md:col-span-2">
                    <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 flex items-center gap-1">
                      <Beaker className="w-3 h-3" /> Protocolo resumido
                    </h4>
                    <ol className="space-y-1">
                      {sys.protocol.map((step, i) => (
                        <li key={i} className="text-[11px] text-gray-200 flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-[9px] font-semibold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Warning */}
                  {sys.warning && (
                    <div className="md:col-span-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0 mt-0.5" />
                      <p className="text-[10.5px] text-amber-100">{sys.warning}</p>
                    </div>
                  )}

                  {/* Refs */}
                  {sys.refs.length > 0 && (
                    <div className="md:col-span-2">
                      <h4 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Referências canônicas
                      </h4>
                      <ul className="space-y-0.5">
                        {sys.refs.map((r, i) => (
                          <li key={i} className="text-[10px] text-gray-300">
                            <span className="text-violet-300 font-semibold">{r.author}</span>
                            <span className="text-gray-500"> ({r.year})</span>
                            <span className="text-gray-400"> · {r.title}</span>
                            {r.doi && (
                              <a
                                href={`https://doi.org/${r.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-cyan-300 hover:text-cyan-200 underline decoration-dotted"
                              >
                                doi:{r.doi}
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-gray-500 mt-4 italic">
        💡 Estes sistemas não são exclusivos — frequentemente são combinados (perfusão + endotelização, gradient + OoC).
        Consulte o pipeline experimental da Quantis para o seu tecido específico.
      </p>
    </section>
  )
}

// ─── Subcomponente ───────────────────────────────────────────────────────

function CategoryButton({
  active, onClick, label, icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold transition-colors",
        active
          ? "bg-cyan-500/30 border border-cyan-400/60 text-white"
          : "bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:border-white/20",
      )}
    >
      {icon}
      {label}
    </button>
  )
}
