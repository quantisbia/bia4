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
  /** Título completo (impresso em cards e no PDF) */
  title: string
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
  /** URL pública do PDF (relativa à raiz do site) */
  pdfUrl: string
  /** Número de páginas */
  pages: number
  /** Tamanho do PDF em MB (para mostrar antes do download) */
  sizeMb: number
  /** Idioma — "pt-BR", "en-US" */
  language: "pt-BR" | "en-US" | "es-ES"
  /** Se true, acessível sem login (brinde público) */
  openAccess: boolean
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

/** White paper em destaque para CTA na landing /academy */
export function getFeaturedWhitePaper(): QuantisWhitePaper | undefined {
  return QUANTIS_WHITE_PAPERS.find((wp) => wp.openAccess)
}
