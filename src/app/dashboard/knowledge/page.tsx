"use client"

import { useState } from 'react'
import { BookOpen, FileText, Briefcase, Scale, TrendingUp, Target, Lightbulb, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react'

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
  oportunidades_quantis: {
    tecidos_subexplorados: Array<{
      tecido: string
      artigos: number
      patentes: number
    }>
    gaps_regulatorios: string[]
  }
}

const mockKnowledge: KnowledgeData = {
  resumo: {
    total_artigos: 100,
    total_patentes: 100,
    total_regulatorio: 12
  },
  tecidos: {
    artigos: {
      "Geral": 9,
      "Fígado": 8,
      "Osso": 8,
      "Pele": 7,
      "Cartilagem": 7,
      "Pâncreas": 7,
      "Cérebro": 7,
      "Córnea": 7,
      "Rim": 7,
      "Músculo cardíaco": 6,
      "Tecido adiposo": 5,
      "Mama": 4,
      "Tendão/Ligamento": 4
    },
    patentes: {
      "Bioprinting": 6,
      "Osso": 5,
      "Rim": 5,
      "Medula óssea": 5,
      "Pele": 4,
      "Bioink": 4,
      "Fígado": 4,
      "Córnea": 4,
      "Músculo cardíaco": 4,
      "Ovário": 4
    }
  },
  trl_distribuicao: {
    "2": 12,
    "3": 46,
    "4": 37,
    "7": 5
  },
  biomateriais: {
    "ECM (Matriz Extracelular)": 2
  },
  tecnologias: {
    "DLP/SLA": 2,
    "Laser (LIFT)": 1
  },
  estrategias_maturacao: {
    "Organoides": 32,
    "Esferoides": 6,
    "Scaffolds": 5,
    "Biorreator/Perfusão": 1,
    "Vascularização": 1
  },
  oportunidades_quantis: {
    tecidos_subexplorados: [
      { tecido: "Geral", artigos: 9, patentes: 0 },
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

export default function KnowledgeBasePage() {
  const [expandedSection, setExpandedSection] = useState<string | null>("resumo")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")

  const data = mockKnowledge

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const getTRLColor = (trl: string) => {
    const level = parseInt(trl)
    if (level <= 2) return "bg-blue-500"
    if (level <= 4) return "bg-violet-500"
    if (level <= 6) return "bg-amber-500"
    return "bg-emerald-500"
  }

  const getTRLLabel = (trl: string) => {
    const level = parseInt(trl)
    if (level <= 2) return "In vitro"
    if (level === 3) return "Bioimpressão"
    if (level === 4) return "Organoides"
    if (level <= 6) return "In vivo"
    return "Clínico"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                Base de Conhecimento BIA
              </h1>
              <p className="text-gray-600">100 artigos · 100 patentes · 12 casos regulatórios</p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar tecidos, biomateriais, tecnologias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">Todas categorias</option>
              <option value="tecidos">Tecidos</option>
              <option value="biomateriais">Biomateriais</option>
              <option value="tecnologias">Tecnologias</option>
              <option value="regulatorio">Regulatório</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <span className="text-3xl font-bold text-blue-600">{data.resumo.total_artigos}</span>
            </div>
            <h3 className="text-gray-700 font-semibold">Artigos Científicos</h3>
            <p className="text-sm text-gray-500">Base de literatura</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-violet-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <Briefcase className="w-8 h-8 text-violet-500" />
              <span className="text-3xl font-bold text-violet-600">{data.resumo.total_patentes}</span>
            </div>
            <h3 className="text-gray-700 font-semibold">Patentes Analisadas</h3>
            <p className="text-sm text-gray-500">Propriedade intelectual</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <Scale className="w-8 h-8 text-amber-500" />
              <span className="text-3xl font-bold text-amber-600">{data.resumo.total_regulatorio}</span>
            </div>
            <h3 className="text-gray-700 font-semibold">Casos Regulatórios</h3>
            <p className="text-sm text-gray-500">FDA, ANVISA, EMA</p>
          </div>
        </div>

        {/* TRL Distribution */}
        <Section
          title="Distribuição de Maturidade (TRL)"
          icon={TrendingUp}
          color="blue"
          expanded={expandedSection === "trl"}
          onToggle={() => toggleSection("trl")}
        >
          <div className="space-y-3">
            {Object.entries(data.trl_distribuicao)
              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
              .map(([trl, count]) => {
                const total = Object.values(data.trl_distribuicao).reduce((a, b) => a + b, 0)
                const percentage = (count / total) * 100
                return (
                  <div key={trl} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">TRL {trl}</span>
                        <span className="text-sm text-gray-500">· {getTRLLabel(trl)}</span>
                      </div>
                      <span className="text-gray-600 font-medium">{count} artigos</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${getTRLColor(trl)} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </Section>

        {/* Tissues */}
        <Section
          title="Tecidos Bioimpressos"
          icon={Target}
          color="violet"
          expanded={expandedSection === "tecidos"}
          onToggle={() => toggleSection("tecidos")}
        >
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Artigos
              </h4>
              <div className="space-y-2">
                {Object.entries(data.tecidos.artigos).slice(0, 10).map(([tecido, count]) => (
                  <div key={tecido} className="flex justify-between items-center p-2 hover:bg-violet-50 rounded-lg transition-colors">
                    <span className="text-gray-700">{tecido}</span>
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Patentes
              </h4>
              <div className="space-y-2">
                {Object.entries(data.tecidos.patentes).slice(0, 10).map(([tecido, count]) => (
                  <div key={tecido} className="flex justify-between items-center p-2 hover:bg-violet-50 rounded-lg transition-colors">
                    <span className="text-gray-700">{tecido}</span>
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Maturation Strategies */}
        <Section
          title="Estratégias de Maturação Tecidual"
          icon={Lightbulb}
          color="emerald"
          expanded={expandedSection === "estrategias"}
          onToggle={() => toggleSection("estrategias")}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(data.estrategias_maturacao).map(([estrategia, count]) => (
              <div key={estrategia} className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="text-2xl font-bold text-emerald-600 mb-1">{count}</div>
                <div className="text-gray-700 font-medium">{estrategia}</div>
                <div className="text-xs text-gray-500 mt-1">menções</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Quantis Opportunities */}
        <Section
          title="💎 Oportunidades Quantis"
          icon={Target}
          color="amber"
          expanded={expandedSection === "oportunidades"}
          onToggle={() => toggleSection("oportunidades")}
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                Tecidos com Pesquisa Ativa mas Poucas Patentes
              </h4>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Oportunidade de IP:</strong> Tecidos com alta atividade científica mas baixa proteção por patentes representam gaps comerciais onde a Quantis pode desenvolver propriedade intelectual.
                </p>
              </div>
              <div className="space-y-2">
                {data.oportunidades_quantis.tecidos_subexplorados.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{item.tecido}</div>
                      <div className="text-sm text-gray-500">
                        {item.artigos} artigos · apenas {item.patentes} patente(s)
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                      Alta oportunidade
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-500" />
                Gaps Regulatórios Identificados
              </h4>
              <div className="space-y-2">
                {data.oportunidades_quantis.gaps_regulatorios.map((gap, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-amber-100 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="text-gray-700">{gap}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-violet-600 rounded-xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">Explore insights com a IA</h3>
          <p className="mb-4 text-blue-100">
            Use o chat BIA para fazer perguntas específicas sobre artigos, patentes, biomateriais, tecnologias e estratégias regulatórias.
          </p>
          <button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            Abrir Chat BIA
          </button>
        </div>
      </div>
    </div>
  )
}

interface SectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'violet' | 'emerald' | 'amber'
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Section({ title, icon: Icon, color, expanded, onToggle, children }: SectionProps) {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    violet: 'border-violet-200 bg-violet-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50'
  }

  const iconColors = {
    blue: 'text-blue-600',
    violet: 'text-violet-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600'
  }

  return (
    <div className={`mb-6 border rounded-xl overflow-hidden ${colorClasses[color]}`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-600" />
        )}
      </button>
      {expanded && (
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  )
}
