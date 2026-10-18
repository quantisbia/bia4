/**
 * BIA · Academy · R13.14 · Biblioteca · White Papers Quantis
 *
 * Lista curada de white papers institucionais da Quantis Biotechnology,
 * usados como material de apoio (open access) na biblioteca da Academy.
 *
 * O primeiro item (QMatrix / esferoides) é um BRINDE público — fica
 * acessível sem login via /library/*.pdf para atrair alunos aos cursos.
 *
 * Como adicionar um novo white paper:
 *   1. Colocar o PDF em  /public/library/<slug>.pdf
 *   2. Adicionar entrada no array `QUANTIS_WHITE_PAPERS` abaixo
 *   3. Se `openAccess=true`, ele aparece também na landing /academy (CTA)
 */

export interface QuantisWhitePaper {
  /** ID estável, usado como key em listas */
  id: string
  /** Tipo do material — define posicionamento visual e cópia */
  kind?: "white-paper" | "ebook"
  /** Título completo (impresso em cards e no PDF) */
  title: string
  /** Subtítulo opcional (usado em e-books) */
  subtitle?: string
  /** Lista de autores — texto já formatado "Dra. X, Dr. Y" */
  authors: string[]
  /** Ano de publicação */
  year: number
  /** Categoria temática — ex: "Esferoides & MEC", "Biotintas", "Impressão 3D" */
  category: string
  /** Resumo técnico (3-6 linhas) para preview em cards */
  abstract: string
  /** Palavras-chave (chips coloridos no card) */
  keywords: string[]
  /**
   * URL pública do PDF (relativa à raiz do site).
   * Para materiais `restrictedToStudents=true`, este path NUNCA deve existir
   * em /public/library — o arquivo real fica em `/private-library/` e é
   * servido via /api/library/download/[id] após checar matrícula.
   * Para materiais open-access, pode apontar direto para /public/library/*.pdf.
   */
  pdfUrl: string
  /**
   * Path do arquivo PDF relativo à raiz do REPO (fora de /public).
   * Obrigatório para materiais `restrictedToStudents=true`.
   * Ex: "private-library/ebook-biofabricacao-ortopedia-2026.pdf"
   * O servidor usa isso para ler o arquivo via fs.readFile e stream pro cliente.
   */
  privateFilePath?: string
  /** URL de thumbnail/capa (opcional) — mostra na landing / card.
   *  Capas PODEM ficar em /public (são só preview, não o conteúdo protegido). */
  coverUrl?: string
  /** Público-alvo específico (ex: "Médicos ortopedistas") */
  audience?: string
  /** Número de páginas */
  pages: number
  /** Tamanho do PDF em MB (para mostrar antes do download) */
  sizeMb: number
  /** Idioma — "pt-BR", "en-US" */
  language: "pt-BR" | "en-US" | "es-ES"
  /**
   * Se true, acessível sem login (brinde público via /library/*.pdf direto
   * ou via /api/library/lead → redirect ao PDF após captura de lead).
   */
  openAccess: boolean
  /**
   * Se true, SÓ é liberado para alunos BIA Academy com matrícula ACTIVE ou
   * COMPLETED. É mutuamente exclusivo com `openAccess` — se um e-book é
   * restricted, não pode ser open-access ao mesmo tempo.
   * Enforcement: rota /api/library/download/[id] faz o check server-side,
   * e o arquivo físico NÃO fica em /public (fica em /private-library).
   */
  restrictedToStudents?: boolean
  /** Citação formatada no padrão da Quantis */
  citation: string
  /** Patente relacionada (opcional) — ex: "BR102021019538-0A" */
  relatedPatent?: string
  /** DOI (opcional) */
  doi?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   WHITE PAPERS QUANTIS — material institucional curado
═══════════════════════════════════════════════════════════════════════════ */

export const QUANTIS_WHITE_PAPERS: QuantisWhitePaper[] = [
  {
    id: "qmatrix-esferoides-2026",
    kind: "white-paper",
    title:
      "QMatrix: Agregação de esferoides em células com baixa produção de matriz extracelular",
    authors: ["Dra. Kamila Leichtweis", "Dr. Lucas Guarnier"],
    year: 2026,
    category: "Esferoides & Matriz Extracelular",
    abstract:
      "White paper técnico que apresenta a tecnologia QMatrix da Quantis Biotechnology — uma matriz extracelular humana descelularizada e processada, " +
      "desenvolvida para resgatar a capacidade de agregação de linhagens celulares com baixa produção endógena de MEC (ex: L929, HEK293). " +
      "O estudo demonstra que, com QMatrix a 200µg/mL, a esfericidade de esferoides de L929 passa de 0.52 para 0.95 em apenas 24h, " +
      "viabilizando ensaios 3D reprodutíveis com linhagens antes consideradas 'não-formadoras'. Inclui protocolo passo-a-passo, " +
      "comparação com colágeno tipo I e Matrigel, controle de qualidade e discussão de aplicações em bioprinting e drug screening.",
    keywords: [
      "esferoides",
      "matriz extracelular",
      "QMatrix",
      "L929",
      "colágeno tipo I",
      "MEC humana",
      "bioprinting",
      "cultura 3D",
    ],
    pdfUrl: "/library/quantis-white-paper-qmatrix-esferoides-2026.pdf",
    pages: 13,
    sizeMb: 1.67,
    language: "pt-BR",
    openAccess: true,
    citation:
      "Leichtweis, K.; Guarnier, L. QMatrix: Agregação de esferoides em células com baixa produção de matriz extracelular. " +
      "Quantis Biotechnology, White Paper técnico, Outubro de 2026, 13p.",
    relatedPatent: "BR102021019538-0A",
  },
  {
    id: "ebook-biofabricacao-ortopedia-2026",
    kind: "ebook",
    title: "Biofabricação em Ortopedia",
    subtitle: "Do defeito ósseo crítico ao implante bioimpresso paciente-específico",
    authors: ["Equipe editorial Quantis Biotechnology", "BIA Academy"],
    year: 2026,
    category: "Aplicações Clínicas · Ortopedia",
    audience: "Médicos ortopedistas, cirurgiões bucomaxilofaciais, residentes e pesquisadores em engenharia tecidual musculoesquelética",
    abstract:
      "E-book técnico-educacional de 53 páginas que percorre a biofabricação ortopédica do defeito ósseo crítico ao implante bioimpresso paciente-específico. " +
      "Em 10 capítulos ricamente ilustrados — com imagens originais e figuras open-access de artigos CC-BY da Nature, Frontiers e Springer — o guia cobre: " +
      "anatomia e biologia óssea para engenheiros, biomateriais (PCL, PLA, hidroxiapatita, β-TCP, biovidro), arquitetura 3D (TPMS gyroid, Voronoi, pore size 300-500 μm), " +
      "fontes de MSC e pré-vascularização com HUVEC, cartilagem articular (os desafios de hipertrofia), " +
      "casos clínicos reais (AuriNovo, Instituto Gandu, mandíbula impressa belga, Humacyte), avaliação pré-clínica (μCT, histomorfometria, ensaios mecânicos), " +
      "caminho regulatório (ANVISA, FDA 510(k) × PMA, ISO 13485/10993, TRL 1-9), e guia prático para o ortopedista começar hoje. Inclui glossário, " +
      "referências com DOI, 11 pesquisadores de referência e congressos/sociedades (TERMIS, ORS, AAOS, SBB, SBOT, SBCBMF).",
    keywords: [
      "ortopedia",
      "biofabricação",
      "scaffold ósseo",
      "PCL",
      "hidroxiapatita",
      "TPMS gyroid",
      "paciente-específico",
      "ANVISA",
      "FDA",
      "ISO 13485",
      "cartilagem articular",
      "MSC",
      "pré-vascularização",
    ],
    // pdfUrl aqui é o PATH PÚBLICO da rota protegida — NÃO é o arquivo real.
    // A rota /api/library/download/ebook-biofabricacao-ortopedia-2026 autentica
    // e serve o arquivo de /private-library/.
    pdfUrl: "/api/library/download/ebook-biofabricacao-ortopedia-2026",
    privateFilePath: "private-library/ebook-biofabricacao-ortopedia-2026.pdf",
    coverUrl: "/library/ebook-assets/ai-cover.jpg",
    pages: 53,
    sizeMb: 3.9,
    language: "pt-BR",
    openAccess: false,         // ⬅ PRIVADO
    restrictedToStudents: true, // ⬅ só alunos BIA Academy ACTIVE/COMPLETED
    citation:
      "Dernowsek, J. et al. Biofabricação em Ortopedia — do defeito ósseo crítico ao implante bioimpresso paciente-específico. " +
      "BIA Academy / Quantis Biotechnology, 1ª ed., 2026, 53p. Exclusivo para alunos da BIA Academy — biaquantis.bio/academy",
  },
]

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────── */

/** Retorna apenas os white papers de acesso público (brindes) */
export function getOpenAccessWhitePapers(): QuantisWhitePaper[] {
  return QUANTIS_WHITE_PAPERS.filter((wp) => wp.openAccess)
}

/** Busca white paper por ID */
export function getWhitePaperById(id: string): QuantisWhitePaper | undefined {
  return QUANTIS_WHITE_PAPERS.find((wp) => wp.id === id)
}

/** White paper em destaque para CTA na landing /academy — pega o white-paper primeiro */
export function getFeaturedWhitePaper(): QuantisWhitePaper | undefined {
  // Prioriza o white paper QMatrix (kind=white-paper), e-books têm seção própria
  return (
    QUANTIS_WHITE_PAPERS.find((wp) => wp.openAccess && wp.kind === "white-paper") ??
    QUANTIS_WHITE_PAPERS.find((wp) => wp.openAccess)
  )
}

/** Retorna apenas os e-books educacionais open-access (sem a flag restrictedToStudents). */
export function getOpenAccessEbooks(): QuantisWhitePaper[] {
  return QUANTIS_WHITE_PAPERS.filter(
    (wp) => wp.openAccess && wp.kind === "ebook" && !wp.restrictedToStudents,
  )
}

/** Retorna todos os materiais open-access (white papers + ebooks) para a biblioteca interna */
export function getAllOpenAccessMaterials(): QuantisWhitePaper[] {
  return QUANTIS_WHITE_PAPERS.filter((wp) => wp.openAccess)
}

/**
 * R13.15.2 · Retorna e-books EXCLUSIVOS para alunos matriculados.
 * Esses aparecem como "brinde da matrícula" na landing /academy (teaser) e
 * como material completo na biblioteca interna /academy/(app)/library.
 */
export function getStudentOnlyEbooks(): QuantisWhitePaper[] {
  return QUANTIS_WHITE_PAPERS.filter(
    (wp) => wp.kind === "ebook" && wp.restrictedToStudents === true,
  )
}

/**
 * R13.15.2 · Busca material protegido por ID para a rota de download.
 * Garante que só retorna se for restrictedToStudents=true E tiver privateFilePath.
 * Rejeita se o material é open-access (deve usar o fluxo normal /library/*.pdf).
 */
export function getStudentOnlyMaterialById(id: string): QuantisWhitePaper | undefined {
  const wp = QUANTIS_WHITE_PAPERS.find((m) => m.id === id)
  if (!wp) return undefined
  if (!wp.restrictedToStudents) return undefined
  if (!wp.privateFilePath) return undefined
  return wp
}

/**
 * R13.15.2 · Lista TODOS os materiais acessíveis a quem tem matrícula ativa:
 * - Open-access (white papers e e-books públicos)
 * - Restritos a alunos (brindes da matrícula)
 * Usado em /academy/(app)/library para alunos logados.
 */
export function getAllStudentAccessibleMaterials(): QuantisWhitePaper[] {
  return QUANTIS_WHITE_PAPERS.filter(
    (wp) => wp.openAccess || wp.restrictedToStudents === true,
  )
}
