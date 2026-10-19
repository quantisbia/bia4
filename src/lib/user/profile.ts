/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA v4 · R14.1 · User Profile — segmentação por perfil clínico/acadêmico
 *  ─────────────────────────────────────────────────────────────────────
 *  A plataforma BIA atende 6 perfis distintos — cada um tem necessidades
 *  diferentes de UI, linguagem e fluxos destacados no dashboard.
 *
 *  O perfil é escolhido no onboarding (ou na área de configurações) e
 *  determina:
 *    - Quais ferramentas aparecem destacadas no dashboard home
 *    - Qual modo UI é sugerido como padrão (clínico vs pesquisador)
 *    - Quais e-books e módulos da Academy são recomendados
 *    - Quais templates de scaffold aparecem primeiro
 *
 *  Armazenamento: User.researchArea (campo existente) + localStorage
 *  (preferência imediata que não requer migração de banco).
 *
 *  Janaina Dernowsek / Quantis Biotechnology — Out/2026
 * ═══════════════════════════════════════════════════════════════════════
 */

export type UserProfileId =
  | "orthopedist"       // Médico ortopedista / CBMF
  | "dermatologist"     // Médico dermatologista / plástica
  | "dentist"           // Dentista / implantodontia
  | "postgrad"          // Aluno de pós-graduação (mestrado/doutorado)
  | "undergrad"         // Aluno de graduação
  | "researcher"        // Pesquisador sênior / docente

export interface UserProfile {
  id: UserProfileId
  /** Nome legível em pt-BR */
  label: string
  /** Pergunta de identificação ("Você é...?") */
  shortLabel: string
  /** Emoji identificador */
  emoji: string
  /** Descrição em 1 linha para o onboarding */
  description: string
  /** Modo UI sugerido como padrão */
  defaultMode: "clinical" | "researcher"
  /** IDs dos quickActions do dashboard destacados pra esse perfil */
  highlightedActions: string[]
  /** IDs dos kits clínicos recomendados (futuro: R14.2) */
  recommendedKitCategories: string[]
  /** Slug do e-book recomendado da biblioteca */
  recommendedEbookId?: string
  /** Módulos da Academy destacados (slugs) */
  recommendedModuleSlugs: string[]
  /** Cor temática pro perfil (tailwind) */
  accentColor: "rose" | "amber" | "sky" | "violet" | "emerald" | "fuchsia"
}

/* ═══════════════════════════════════════════════════════════════════════
 *  Catálogo dos 6 perfis
 * ═══════════════════════════════════════════════════════════════════════ */

export const USER_PROFILES: UserProfile[] = [
  {
    id: "orthopedist",
    label: "Médico(a) Ortopedista / CBMF",
    shortLabel: "Ortopedia",
    emoji: "🦴",
    description:
      "Scaffolds ósseos personalizados, cartilagem articular, calota craniana, mandíbula, reconstruções.",
    defaultMode: "clinical",
    highlightedActions: ["bioprint-model", "pipeline", "protocols", "chat"],
    recommendedKitCategories: ["ortopedia", "cbmf"],
    recommendedEbookId: "ebook-biofabricacao-ortopedia-2026",
    recommendedModuleSlugs: ["biomateriais", "arquitetura-3d", "tecidos", "avaliacao-celular"],
    accentColor: "amber",
  },
  {
    id: "dermatologist",
    label: "Médico(a) Dermatologista / Cirurgia Plástica",
    shortLabel: "Dermatologia",
    emoji: "🩺",
    description:
      "Pele bioimpressa multicamada, testes dermato-cosméticos, cicatrização, modelos substitutos a animais.",
    defaultMode: "clinical",
    highlightedActions: ["bioprint-model", "formulator-pro", "organoids", "chat"],
    recommendedKitCategories: ["dermatologia"],
    recommendedModuleSlugs: ["tecidos", "biotintas", "celulas"],
    accentColor: "rose",
  },
  {
    id: "dentist",
    label: "Dentista / Implantodontia / CBMF",
    shortLabel: "Odontologia",
    emoji: "🦷",
    description:
      "Enxertos alveolares, membranas PRF, scaffolds periodontais, regeneração óssea maxilar.",
    defaultMode: "clinical",
    highlightedActions: ["bioprint-model", "pipeline", "protocols", "chat"],
    recommendedKitCategories: ["odontologia", "cbmf"],
    recommendedModuleSlugs: ["biomateriais", "tecidos", "desenvolvimento-projeto"],
    accentColor: "sky",
  },
  {
    id: "postgrad",
    label: "Pós-graduação (Mestrado / Doutorado)",
    shortLabel: "Pós-grad",
    emoji: "🎓",
    description:
      "Pipeline completo, formulação avançada, notebook versionado, exportação para dissertação/tese.",
    defaultMode: "researcher",
    highlightedActions: ["pipeline", "formulator-pro", "notebook", "knowledge"],
    recommendedKitCategories: ["pesquisa"],
    recommendedModuleSlugs: ["desenvolvimento-projeto", "biotintas", "arquitetura-3d", "avaliacao-celular"],
    accentColor: "violet",
  },
  {
    id: "undergrad",
    label: "Graduação / Iniciação Científica",
    shortLabel: "Graduação",
    emoji: "📚",
    description:
      "Tutoriais guiados, templates prontos, modo aprendizado, caminho sugerido pela equipe Quantis.",
    defaultMode: "clinical",
    highlightedActions: ["roadmap", "manual", "chat", "bioprint-model"],
    recommendedKitCategories: ["iniciante"],
    recommendedModuleSlugs: ["introducao-biofabricacao", "biomateriais", "biotintas"],
    accentColor: "emerald",
  },
  {
    id: "researcher",
    label: "Pesquisador(a) Sênior / Docente",
    shortLabel: "Pesquisador",
    emoji: "🔬",
    description:
      "Formulador avançado, reologia completa, dECM customizado, análises moleculares, dossiês regulatórios.",
    defaultMode: "researcher",
    highlightedActions: ["formulator-pro", "pipeline", "analyses", "knowledge"],
    recommendedKitCategories: ["pesquisa", "tecidos-moles"],
    recommendedModuleSlugs: ["biotintas", "celulas", "organoides", "desenvolvimento-projeto"],
    accentColor: "fuchsia",
  },
]

/* ═══════════════════════════════════════════════════════════════════════
 *  Helpers
 * ═══════════════════════════════════════════════════════════════════════ */

/** Busca um perfil pelo ID. Retorna undefined se não encontrar. */
export function getProfileById(id: string | null | undefined): UserProfile | undefined {
  if (!id) return undefined
  return USER_PROFILES.find((p) => p.id === id)
}

/** Perfil padrão para novos usuários (postgrad é a maior parcela da base atual). */
export const DEFAULT_PROFILE_ID: UserProfileId = "postgrad"

/** Retorna o perfil do User (ou DEFAULT se não setado). Nunca retorna undefined. */
export function resolveUserProfile(
  researchArea: string | null | undefined,
): UserProfile {
  const found = getProfileById(researchArea)
  if (found) return found
  return USER_PROFILES.find((p) => p.id === DEFAULT_PROFILE_ID)!
}

/**
 * Mapeamento de IDs de quickAction do dashboard home.
 * Mantém sincronizado com os cards do dashboard/page.tsx.
 */
export const QUICK_ACTION_IDS = {
  pipeline: "pipeline",
  "bioprint-model": "bioprint-model",
  "bioprint-full": "bioprint-full",
  "formulator-pro": "formulator-pro",
  organoids: "organoids",
  protocols: "protocols",
  analyses: "analyses",
  chat: "chat",
  knowledge: "knowledge",
  tools: "tools",
  notebook: "notebook",
  roadmap: "roadmap",
  manual: "manual",
} as const

export type QuickActionId = keyof typeof QUICK_ACTION_IDS
