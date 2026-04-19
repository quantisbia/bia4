"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, FileText, Briefcase, Scale, TrendingUp, Target,
  Lightbulb, ChevronDown, ChevronUp, Search, Filter,
  MessageSquare, ExternalLink, Beaker, Microscope, Dna,
  GraduationCap, Award, BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils/helpers'

/* ═══════════════════════════════════════════════════════════════════════════
   Dados da Base de Conhecimento
═══════════════════════════════════════════════════════════════════════════ */
interface KnowledgeData {
  resumo: {
    total_artigos: number
    total_patentes: number
    total_regulatorio: number
  }
  tecidos: {
    artigos: Record<string, number>
    patentes: Record<string, number>
  }
  trl_distribuicao: Record<string, number>
  biomateriais: Record<string, number>
  tecnologias: Record<string, number>
  estrategias_maturacao: Record<string, number>
  novos_artigos: Array<{
    id: number
    titulo: string
    autores: string
    journal: string
    ano: number
    doi: string
    tags: string[]
    citacoes: number | null
    resumo: string
  }>
  oportunidades_quantis: {
    tecidos_subexplorados: Array<{
      tecido: string
      artigos: number
      patentes: number
    }>
    gaps_regulatorios: string[]
  }
}

const knowledgeData: KnowledgeData = {
  resumo: {
    total_artigos: 120,
    total_patentes: 100,
    total_regulatorio: 12
  },
  tecidos: {
    artigos: {
      "Geral": 20, "Fígado": 9, "Osso": 9, "Pele": 9, "Cartilagem": 8,
      "Pâncreas": 8, "Rim": 8, "Cérebro": 7, "Córnea": 7,
      "Músculo cardíaco": 7, "Vascular": 1, "Tecido adiposo": 5, "Mama": 4, "Tendão/Ligamento": 4
    },
    patentes: {
      "Bioprinting": 6, "Osso": 5, "Rim": 5, "Medula óssea": 5,
      "Pele": 4, "Bioink": 4, "Fígado": 4, "Córnea": 4,
      "Músculo cardíaco": 4, "Ovário": 4
    }
  },
  trl_distribuicao: { "2": 12, "3": 46, "4": 37, "7": 5 },
  biomateriais: { "GelMA": 5, "Alginato": 4, "Colágeno": 3, "dECM": 3, "ECM (Matriz Extracelular)": 2, "Fibrina": 2, "Hidroxiapatita": 1, "PCL/PLGA": 1 },
  tecnologias: { "Extrusão": 7, "DLP/SLA": 3, "Inkjet": 2, "FRESH": 2, "Electrospinning": 1, "Laser (LIFT)": 1, "Coaxial": 1, "4D Bioprinting": 1 },
  estrategias_maturacao: {
    "Organoides": 35, "Esferoides": 7, "Scaffolds": 6,
    "Organ-on-Chip": 2, "Biorreator/Perfusão": 1, "Vascularização": 2
  },
  novos_artigos: [
    {
      id: 101, titulo: "Hydrogels as extracellular matrix mimics for 3D cell culture",
      autores: "Tibbitt MW, Anseth KS", journal: "Biotechnol. Bioeng.", ano: 2009,
      doi: "10.1002/bit.22361", tags: ["hidrogel", "ECM", "cultura 3D"],
      citacoes: 1200, resumo: "Revisão seminal sobre hidrogéis como mimetizadores da ECM para cultura celular 3D."
    },
    {
      id: 102, titulo: "GelMA-based hydrogels for biomaterial applications",
      autores: "Yue K et al.", journal: "Biomaterials", ano: 2015,
      doi: "10.1016/j.biomaterials.2015.08.045", tags: ["GelMA", "fotopolimerização", "bioink"],
      citacoes: 890, resumo: "Revisão abrangente sobre GelMA — síntese, propriedades e aplicações em bioimpressão."
    },
    {
      id: 103, titulo: "Alginate hydrogels as biomaterials",
      autores: "Lee KY, Mooney DJ", journal: "Prog. Polym. Sci.", ano: 2012,
      doi: "10.1016/j.progpolymsci.2011.06.003", tags: ["alginato", "CaCl2", "crosslinking"],
      citacoes: 4500, resumo: "Revisão definitiva sobre alginato — gelificação, propriedades e aplicações."
    },
    {
      id: 104, titulo: "Printability of hydrogels: critical assessment and design strategy",
      autores: "Hölzl K et al.", journal: "Biofabrication", ano: 2016,
      doi: "10.1088/1758-5090/8/3/032002", tags: ["printability", "reologia", "viscosidade"],
      citacoes: 450, resumo: "Define métricas de printability: fidelidade de forma, yield stress e janela de impressão."
    },
    {
      id: 105, titulo: "The bioink: comprehensive review on bioprintable materials",
      autores: "Hospodiuk M et al.", journal: "Biotechnol. Adv.", ano: 2017,
      doi: "10.1016/j.biotechadv.2016.12.006", tags: ["bioink", "colágeno", "dECM", "PEG"],
      citacoes: 680, resumo: "Revisão completa de bioinks naturais e sintéticos para bioimpressão."
    },
    {
      id: 106, titulo: "Rheological properties of bioinks and their influence on bioprinting",
      autores: "Paxton N et al.", journal: "Biofabrication", ano: 2017,
      doi: "10.1088/1758-5090/aa8dd8", tags: ["reologia", "shear-thinning", "G'"],
      citacoes: 320, resumo: "Estudo sistemático das propriedades reológicas de bioinks e impacto na qualidade de impressão."
    },
    {
      id: 107, titulo: "3D bioprinting of articular cartilage: advances and perspectives",
      autores: "Daly AC et al.", journal: "Bioprinting", ano: 2017,
      doi: "10.1016/j.bprint.2017.04.003", tags: ["cartilagem", "condrócitos", "TGF-β3"],
      citacoes: 280, resumo: "Bioimpressão de cartilagem articular: scaffolds, fontes celulares e maturação."
    },
    {
      id: 108, titulo: "Hydroxyapatite bioceramics and scaffolds for bone tissue engineering",
      autores: "Zhou H, Lee J", journal: "J. R. Soc. Interface", ano: 2011,
      doi: "10.1098/rsif.2011.0091", tags: ["osso", "hidroxiapatita", "biocerâmica"],
      citacoes: 1500, resumo: "HA e biocerâmicas para regeneração óssea: síntese, osteocondução e scaffolds."
    },
    {
      id: 109, titulo: "Organoids: modeling development and the stem cell niche",
      autores: "Clevers H", journal: "Cell", ano: 2016,
      doi: "10.1016/j.cell.2016.05.082", tags: ["organoides", "células-tronco", "Lgr5"],
      citacoes: 2800, resumo: "Artigo seminal de Clevers sobre organoides — auto-organização e nicho de células-tronco."
    },
    {
      id: 110, titulo: "In situ bioprinting of skin for wound healing",
      autores: "Albanna M et al.", journal: "Adv. Healthc. Mater.", ano: 2019,
      doi: "10.1002/adhm.201801048", tags: ["pele", "in situ", "fibrina"],
      citacoes: 350, resumo: "Bioimpressão in situ para cicatrização cutânea usando fibrina/colágeno."
    },
    // ── ETAPA 2: 10 novos artigos estratégicos (IDs 111-120) ──
    {
      id: 111, titulo: "Advanced strategies in 3D bioprinting for vascular tissue engineering",
      autores: "Noor N, Shapira A, Edri R et al.", journal: "Virtual Phys. Prototyping", ano: 2024,
      doi: "10.1080/17452759.2024.2395470", tags: ["vascularização", "smart bioink", "coaxial", "perfusão"],
      citacoes: 45, resumo: "Estratégias avançadas de bioinks inteligentes para modelos vasculares perfusáveis e espacialmente controlados."
    },
    {
      id: 112, titulo: "Recent trends in decellularized extracellular matrix bioinks for 3D bioprinting",
      autores: "Choudhury D et al.", journal: "Biofabrication", ano: 2020,
      doi: "10.1088/1758-5090/ab98ab", tags: ["dECM", "descelularização", "bioink", "biomimético"],
      citacoes: 380, resumo: "Revisão definitiva sobre bioinks dECM — a classe mais biomimética de bioinks disponível."
    },
    {
      id: 113, titulo: "Bridging the gap: integrating 3D bioprinting and microfluidics for organ-on-chip",
      autores: "Zarrintaj P et al.", journal: "Bioengineering", ano: 2024,
      doi: "10.3390/bioengineering11070664", tags: ["organ-on-chip", "microfluídica", "drug screening"],
      citacoes: 62, resumo: "Integração de bioimpressão 3D com microfluídica para plataformas organ-on-chip."
    },
    {
      id: 114, titulo: "3D bioprinting of human iPSC-derived kidney organoids",
      autores: "Shin J, Lee H et al.", journal: "Bioprinting", ano: 2024,
      doi: "10.1016/j.bprint.2024.e00337", tags: ["rim", "iPSC", "organoides", "néfron"],
      citacoes: 32, resumo: "Plataforma automatizada de bioimpressão para organoides renais derivados de iPSC."
    },
    {
      id: 115, titulo: "3D bioprinting of collagen to rebuild components of the human heart (FRESH)",
      autores: "Lee A, Feinberg AW et al.", journal: "Science", ano: 2019,
      doi: "10.1126/science.aav9051", tags: ["FRESH", "colágeno", "coração", "embedded printing"],
      citacoes: 1200, resumo: "Técnica FRESH para bioimpressão de colágeno em escala de órgão — válvulas e ventrículos cardíacos."
    },
    {
      id: 116, titulo: "4D bioprinting: next generation technology for biofabrication",
      autores: "Gao B, Yang Q et al.", journal: "Biofabrication", ano: 2020,
      doi: "10.1088/1758-5090/ab6034", tags: ["4D bioprinting", "shape-memory", "estímulo-responsivo"],
      citacoes: 280, resumo: "Bioimpressão 4D — construtos que mudam forma/função ao longo do tempo em resposta a estímulos."
    },
    {
      id: 117, titulo: "Regulatory considerations for 3D bioprinted products: FDA perspective",
      autores: "Tappa K et al.", journal: "J. 3D Print. Med.", ano: 2023,
      doi: "10.2217/3dp-2022-0026", tags: ["regulatório", "FDA", "ATMP", "GMP"],
      citacoes: 95, resumo: "Framework regulatório FDA para produtos bioimpressos — classificação, esterilização e rastreabilidade celular."
    },
    {
      id: 118, titulo: "Electrospinning and 3D bioprinting: hybrid approach for tissue engineering",
      autores: "Mota C, Puppi D et al.", journal: "J. Tissue Eng. Regen. Med.", ano: 2021,
      doi: "10.1002/term.3244", tags: ["electrospinning", "nanofibras", "scaffold híbrido", "PCL"],
      citacoes: 175, resumo: "Integração de electrospinning com bioimpressão 3D para scaffolds híbridos com mecânica otimizada."
    },
    {
      id: 119, titulo: "iPSC-derived liver organoids for disease modeling and drug screening",
      autores: "Heinzelmann E et al.", journal: "Cell Stem Cell", ano: 2024,
      doi: "10.1016/j.stem.2024.04.005", tags: ["fígado", "iPSC", "organoides", "drug screening", "NAFLD"],
      citacoes: 66, resumo: "Organoides hepáticos iPSC para modelagem de NAFLD, hepatite e toxicologia preditiva."
    },
    {
      id: 120, titulo: "Bioprinting of pancreatic islets for diabetes therapy",
      autores: "Duin S et al.", journal: "Biofabrication", ano: 2023,
      doi: "10.1088/1758-5090/ac7b5d", tags: ["pâncreas", "ilhotas", "diabetes", "imunoproteção"],
      citacoes: 130, resumo: "Bioimpressão de ilhotas pancreáticas em alginato/GelMA para terapia do diabetes tipo 1."
    },
  ],
  oportunidades_quantis: {
    tecidos_subexplorados: [
      { tecido: "Geral / Hidrogéis", artigos: 15, patentes: 0 },
      { tecido: "Pâncreas", artigos: 7, patentes: 2 },
      { tecido: "Cérebro", artigos: 7, patentes: 2 },
      { tecido: "Mama / organoides", artigos: 4, patentes: 0 },
      { tecido: "Tendão / Ligamento", artigos: 4, patentes: 0 },
      { tecido: "Mama / implante mamário", artigos: 3, patentes: 0 }
    ],
    gaps_regulatorios: [
      "Guidelines específicos para bio-impressão celular",
      "Harmonização FDA/ANVISA/EMA para ATMP",
      "Validação GMP de bioimpressoras",
      "Rastreabilidade celular",
      "Testes de esterilidade específicos"
    ]
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Componentes
═══════════════════════════════════════════════════════════════════════════ */

function StatCard({ icon: Icon, value, label, sub, color }: {
  icon: React.ComponentType<{ className?: string }>
  value: string | number; label: string; sub: string; color: string
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${color}-400`} />
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-xs text-${color}-400 mt-1`}>{sub}</div>
    </div>
  )
}

interface SectionProps {
  title: string; icon: React.ComponentType<{ className?: string }>
  color: string; expanded: boolean; onToggle: () => void; children: React.ReactNode
  badge?: string
}
function Section({ title, icon: Icon, color, expanded, onToggle, children, badge }: SectionProps) {
  return (
    <div className={cn(
      "rounded-xl sm:rounded-2xl border overflow-hidden transition-all",
      expanded ? `border-${color}-500/25 bg-${color}-500/[0.03]` : "border-white/[0.08] bg-white/[0.02]"
    )}>
      <button onClick={onToggle}
        className="w-full px-4 sm:px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
        <div className={`w-8 h-8 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 text-${color}-400`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-bold text-white">{title}</h2>
            {badge && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-${color}-500/15 text-${color}-400 uppercase`}>
                {badge}
              </span>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
        }
      </button>
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-white/[0.05]">
          {children}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Component
═══════════════════════════════════════════════════════════════════════════ */
export default function KnowledgeBasePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>("novos")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const data = knowledgeData
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const getTRLColor = (trl: string) => {
    const level = parseInt(trl)
    if (level <= 2) return "blue"
    if (level <= 4) return "violet"
    if (level <= 6) return "amber"
    return "emerald"
  }
  const getTRLLabel = (trl: string) => {
    const level = parseInt(trl)
    if (level <= 2) return "In vitro"
    if (level === 3) return "Bioimpressão"
    if (level === 4) return "Organoides"
    if (level <= 6) return "In vivo"
    return "Clínico"
  }

  // Filtrar artigos novos pelo search
  const filteredArticles = data.novos_artigos.filter(a => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return a.titulo.toLowerCase().includes(term) ||
           a.autores.toLowerCase().includes(term) ||
           a.tags.some(t => t.toLowerCase().includes(term)) ||
           a.resumo.toLowerCase().includes(term)
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-7 max-w-6xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
          <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Base de Conhecimento BIA
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            {data.resumo.total_artigos} artigos · {data.resumo.total_patentes} patentes · {data.resumo.total_regulatorio} casos regulatórios
          </p>
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar tecidos, biomateriais, autores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/40 transition-colors"
            />
          </div>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "sm:hidden w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors",
              showFilters ? "bg-violet-500/10 border-violet-500/25 text-violet-400" : "bg-white/[0.05] border-white/[0.1] text-gray-500"
            )}>
            <Filter className="w-4 h-4" />
          </button>
          {/* Desktop filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="hidden sm:block pl-3 pr-8 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-violet-500/40 appearance-none"
          >
            <option value="all">Todas categorias</option>
            <option value="tecidos">Tecidos</option>
            <option value="biomateriais">Biomateriais</option>
            <option value="tecnologias">Tecnologias</option>
            <option value="regulatorio">Regulatório</option>
          </select>
        </div>
        {/* Mobile filter dropdown */}
        {showFilters && (
          <div className="sm:hidden flex gap-2 flex-wrap">
            {["all", "tecidos", "biomateriais", "tecnologias", "regulatorio"].map(cat => (
              <button key={cat} onClick={() => { setFilterCategory(cat); setShowFilters(false) }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filterCategory === cat
                    ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
                    : "bg-white/[0.05] text-gray-400 border border-white/[0.08]"
                )}>
                {cat === "all" ? "Todas" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={FileText} value={data.resumo.total_artigos} label="Artigos Científicos" sub="base RAG indexada" color="blue" />
        <StatCard icon={Briefcase} value={data.resumo.total_patentes} label="Patentes Analisadas" sub="propriedade intelectual" color="violet" />
        <StatCard icon={Scale} value={data.resumo.total_regulatorio} label="Casos Regulatórios" sub="FDA, ANVISA, EMA" color="amber" />
      </div>

      {/* ── Novos Artigos (destaque) ── */}
      <Section
        title="Artigos Recentes Adicionados"
        icon={Award}
        color="emerald"
        expanded={expandedSection === "novos"}
        onToggle={() => toggleSection("novos")}
        badge={`+${data.novos_artigos.length} novos`}
      >
        <div className="space-y-3 mt-4">
          {filteredArticles.map(artigo => (
            <div key={artigo.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 sm:p-4 hover:border-emerald-500/20 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white leading-snug mb-1">
                    {artigo.titulo}
                  </h4>
                  <p className="text-[11px] text-gray-500 mb-1.5">
                    {artigo.autores} · <span className="text-gray-400">{artigo.journal}</span> ({artigo.ano})
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2 line-clamp-2">
                    {artigo.resumo}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {artigo.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">
                        {tag}
                      </span>
                    ))}
                    {artigo.citacoes && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-400 flex items-center gap-1">
                        <TrendingUp className="w-2.5 h-2.5" />
                        {artigo.citacoes.toLocaleString()} citações
                      </span>
                    )}
                    {artigo.doi && (
                      <a href={`https://doi.org/${artigo.doi}`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/15 text-blue-400 flex items-center gap-1 hover:bg-blue-500/20 transition-colors">
                        <ExternalLink className="w-2.5 h-2.5" />
                        DOI
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredArticles.length === 0 && (
            <div className="py-8 text-center">
              <Search className="w-6 h-6 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Nenhum artigo encontrado para &quot;{searchTerm}&quot;</p>
            </div>
          )}
        </div>
      </Section>

      {/* ── Distribuição TRL ── */}
      <Section
        title="Maturidade Tecnológica (TRL)"
        icon={BarChart3}
        color="blue"
        expanded={expandedSection === "trl"}
        onToggle={() => toggleSection("trl")}
      >
        <div className="space-y-3 mt-4">
          {Object.entries(data.trl_distribuicao)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([trl, count]) => {
              const total = Object.values(data.trl_distribuicao).reduce((a, b) => a + b, 0)
              const pct = (count / total) * 100
              const color = getTRLColor(trl)
              return (
                <div key={trl}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">TRL {trl}</span>
                      <span className="text-xs text-gray-500">{getTRLLabel(trl)}</span>
                    </div>
                    <span className={`text-xs font-medium text-${color}-400`}>{count} artigos ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`bg-${color}-500 h-full rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
        </div>
      </Section>

      {/* ── Tecidos ── */}
      <Section
        title="Tecidos Bioimpressos"
        icon={Dna}
        color="violet"
        expanded={expandedSection === "tecidos"}
        onToggle={() => toggleSection("tecidos")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Artigos por Tecido
            </h4>
            <div className="space-y-1.5">
              {Object.entries(data.tecidos.artigos).slice(0, 10).map(([tecido, count]) => (
                <div key={tecido} className="flex justify-between items-center p-2 rounded-lg hover:bg-violet-500/[0.06] transition-colors">
                  <span className="text-xs text-gray-300">{tecido}</span>
                  <span className="text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/15 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" /> Patentes por Tecido
            </h4>
            <div className="space-y-1.5">
              {Object.entries(data.tecidos.patentes).slice(0, 10).map(([tecido, count]) => (
                <div key={tecido} className="flex justify-between items-center p-2 rounded-lg hover:bg-violet-500/[0.06] transition-colors">
                  <span className="text-xs text-gray-300">{tecido}</span>
                  <span className="text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/15 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Biomateriais ── */}
      <Section
        title="Biomateriais Referenciados"
        icon={Beaker}
        color="blue"
        expanded={expandedSection === "biomateriais"}
        onToggle={() => toggleSection("biomateriais")}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
          {Object.entries(data.biomateriais).map(([material, count]) => (
            <div key={material}
              className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-3 hover:border-blue-500/30 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-blue-400 mb-0.5">{count}</div>
              <div className="text-xs text-gray-300 font-medium">{material}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">menções</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Tecnologias ── */}
      <Section
        title="Tecnologias de Bioimpressão"
        icon={Microscope}
        color="indigo"
        expanded={expandedSection === "tecnologias"}
        onToggle={() => toggleSection("tecnologias")}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
          {Object.entries(data.tecnologias).map(([tech, count]) => (
            <div key={tech}
              className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.04] p-3 hover:border-indigo-500/30 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-indigo-400 mb-0.5">{count}</div>
              <div className="text-xs text-gray-300 font-medium">{tech}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">artigos</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Estratégias de Maturação ── */}
      <Section
        title="Estratégias de Maturação Tecidual"
        icon={Lightbulb}
        color="emerald"
        expanded={expandedSection === "estrategias"}
        onToggle={() => toggleSection("estrategias")}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mt-4">
          {Object.entries(data.estrategias_maturacao).map(([estrategia, count]) => (
            <div key={estrategia}
              className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3 hover:border-emerald-500/30 transition-colors">
              <div className="text-lg sm:text-xl font-bold text-emerald-400 mb-0.5">{count}</div>
              <div className="text-xs text-gray-300 font-medium">{estrategia}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">menções</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Oportunidades Quantis ── */}
      <Section
        title="Oportunidades Quantis"
        icon={Target}
        color="amber"
        expanded={expandedSection === "oportunidades"}
        onToggle={() => toggleSection("oportunidades")}
        badge="IP"
      >
        <div className="space-y-5 mt-4">
          {/* Tecidos subexplorados */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              Tecidos com alta pesquisa e poucas patentes
            </h4>
            <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/15 p-3 mb-3">
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                <strong className="text-amber-300">Oportunidade de IP:</strong> Tecidos com alta atividade científica mas baixa proteção por patentes representam gaps comerciais onde a Quantis pode desenvolver propriedade intelectual.
              </p>
            </div>
            <div className="space-y-2">
              {data.oportunidades_quantis.tecidos_subexplorados.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-amber-500/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white">{item.tecido}</p>
                    <p className="text-[10px] text-gray-500">{item.artigos} artigos · {item.patentes} patente(s)</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15 shrink-0 ml-2">
                    ALTA
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gaps regulatórios */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              Gaps Regulatórios
            </h4>
            <div className="space-y-2">
              {data.oportunidades_quantis.gaps_regulatorios.map((gap, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="text-xs text-gray-300 leading-relaxed">{gap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── CTA — Chat BIA ── */}
      <div className="rounded-xl sm:rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/[0.08] to-blue-500/[0.05] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-violet-400" />
              <h3 className="text-base sm:text-lg font-bold text-white">Explore insights com IA</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Use o chat BIA para perguntas específicas sobre artigos, patentes, biomateriais e estratégias regulatórias.
            </p>
          </div>
          <Link href="/dashboard/chat"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-900/40 whitespace-nowrap w-full sm:w-auto active:scale-[0.98]">
            <MessageSquare className="w-4 h-4" />
            Abrir Chat BIA
          </Link>
        </div>
      </div>
    </div>
  )
}
