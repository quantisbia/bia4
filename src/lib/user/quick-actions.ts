/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.1 · Quick Actions reorganizados por perfil + modo UI
 *  ─────────────────────────────────────────────────────────────────────
 *  Dado o perfil do usuário (ortopedista, dermatologista, etc.) e o modo
 *  UI escolhido (clinical/researcher), retorna uma lista REORDENADA de
 *  QuickActions com:
 *    - Ações destacadas do perfil (vêm primeiro, visualmente marcadas)
 *    - Demais ações (ordem natural)
 *    - Rótulos traduzidos conforme o modo UI
 *
 *  Esta lib é PURA (sem React) — pode ser importada em server components.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { UIMode } from "@/lib/user/ui-mode"
import { resolveUserProfile } from "@/lib/user/profile"

/* ══════════════════════════════════════════════════════════════════════
 *  Catálogo canônico de QuickActions
 * ══════════════════════════════════════════════════════════════════════ */

export interface QuickAction {
  id: string
  title: string
  titleClinical?: string
  desc: string
  descClinical?: string
  href: string
  /** Nome do ícone lucide-react (resolvido no componente) */
  iconName: string
  color: string
}

export const ALL_QUICK_ACTIONS: QuickAction[] = [
  // R24 · Fase 1 do racional de 6 fases (substitui o atalho do BIA Studio:
  // geometria 3D agora vive só na Fase 3 · Fatiamento)
  {
    id: "studio-scaffold",
    title: "Modelo de tecido",
    titleClinical: "O que vou imprimir",
    desc: "Fase 1: tecido-alvo → sugestão de modelo, perfil e biotinta",
    descClinical: "Diga o tecido — a BIA monta o caminho",
    href: "/dashboard/bioprint/model",
    iconName: "Sparkles",
    color: "fuchsia",
  },
  {
    id: "pipeline",
    title: "Novo Pipeline",
    titleClinical: "Novo Projeto de Tecido",
    desc: "Design de tecido em 12 etapas",
    descClinical: "Guia passo-a-passo pro seu tecido",
    href: "/dashboard/pipeline",
    iconName: "GitBranch",
    color: "violet",
  },
  {
    id: "bioprint-model",
    title: "Imprimir Modelo 3D",
    titleClinical: "Imprimir Tecido 3D",
    desc: "6 fases: tecido → biotinta → fatiar → host → análise → maturação",
    descClinical: "Do arquivo pronto à bioimpressora",
    href: "/dashboard/bioprint",
    iconName: "Printer",
    color: "indigo",
  },
  {
    id: "formulator-pro",
    title: "Formulador Pro",
    titleClinical: "Laboratório de Biotintas",
    desc: "Biotintas com até 8 componentes",
    descClinical: "Monte sua tinta de células passo-a-passo",
    href: "/dashboard/formulator",
    iconName: "FlaskConical",
    color: "fuchsia",
  },
  {
    id: "organoids",
    title: "Organoid Builder",
    titleClinical: "Esferoides & Organoides",
    desc: "Modelos 3D in vitro de órgãos",
    descClinical: "Pequenos órgãos para seus testes",
    href: "/dashboard/organoids",
    iconName: "CircleDot",
    color: "purple",
  },
  {
    id: "protocols",
    title: "Protocolos GLP/GMP",
    titleClinical: "Protocolos Clínicos",
    desc: "POPs ABNT/ANVISA",
    descClinical: "Procedimentos padrão para sua clínica",
    href: "/dashboard/protocols",
    iconName: "FileText",
    color: "emerald",
  },
  {
    id: "analyses",
    title: "Análises & Dossiês",
    titleClinical: "Testes & Relatórios",
    desc: "Molecular, celular, FDA",
    descClinical: "Resultados prontos pra sua equipe",
    href: "/dashboard/analyses",
    iconName: "Microscope",
    color: "rose",
  },
  {
    id: "chat",
    title: "Chat com IA",
    titleClinical: "Fale com a BIA",
    desc: "Dúvidas científicas",
    descClinical: "Pergunte à nossa IA especialista",
    href: "/dashboard/chat",
    iconName: "MessageSquare",
    color: "indigo",
  },
  {
    id: "knowledge",
    title: "Motor de Conhecimento",
    titleClinical: "Biblioteca Científica",
    desc: "Pesquisar artigos + DOIs",
    descClinical: "Artigos e literatura em 1 clique",
    href: "/dashboard/knowledge",
    iconName: "BookOpen",
    color: "blue",
  },
  {
    id: "notebook",
    title: "Notebook",
    titleClinical: "Meu Caderno",
    desc: "Caderno digital versionado",
    descClinical: "Suas anotações e projetos",
    href: "/dashboard/notebook",
    iconName: "BookMarked",
    color: "teal",
  },
  {
    id: "roadmap",
    title: "Roteiro Profissional",
    titleClinical: "Guia Passo-a-Passo",
    desc: "Caminho sugerido pela Quantis",
    descClinical: "O que fazer, na ordem certa",
    href: "/dashboard/roadmap",
    iconName: "Map",
    color: "amber",
  },
  {
    id: "manual",
    title: "Manual da BIA",
    titleClinical: "Como usar a BIA",
    desc: "Documentação completa",
    descClinical: "Tudo que você precisa saber",
    href: "/dashboard/manual",
    iconName: "Info",
    color: "gray",
  },
  {
    id: "tools",
    title: "Ferramentas BIA",
    titleClinical: "Utilidades",
    desc: "Comparador · Custos · PDF",
    descClinical: "Pequenas ajudas pro dia-a-dia",
    href: "/dashboard/tools",
    iconName: "Wrench",
    color: "amber",
  },
]

/* ══════════════════════════════════════════════════════════════════════
 *  Resolver — reordena por perfil + aplica rótulos conforme modo UI
 * ══════════════════════════════════════════════════════════════════════ */

export interface ResolvedQuickAction extends QuickAction {
  /** True se essa ação é destaque do perfil atual */
  isHighlighted: boolean
}

export function resolveQuickActionsForUser(
  researchArea: string | null | undefined,
  mode: UIMode,
): ResolvedQuickAction[] {
  const profile = resolveUserProfile(researchArea)
  const highlightSet = new Set(profile.highlightedActions)

  // Divide em 2 grupos: destacadas e demais
  const highlighted: ResolvedQuickAction[] = []
  const others: ResolvedQuickAction[] = []

  for (const action of ALL_QUICK_ACTIONS) {
    const resolved: ResolvedQuickAction = {
      ...action,
      // Aplica rótulo clínico quando modo = clinical E existe variante
      title: mode === "clinical" && action.titleClinical ? action.titleClinical : action.title,
      desc:  mode === "clinical" && action.descClinical  ? action.descClinical  : action.desc,
      isHighlighted: highlightSet.has(action.id),
    }
    if (resolved.isHighlighted) highlighted.push(resolved)
    else others.push(resolved)
  }

  // Reordena destacadas conforme a ordem definida em profile.highlightedActions
  // (preserva a intenção da curadoria por perfil).
  highlighted.sort((a, b) =>
    profile.highlightedActions.indexOf(a.id) -
    profile.highlightedActions.indexOf(b.id),
  )

  return [...highlighted, ...others]
}
