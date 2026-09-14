/**
 * BIA · Sistema universal de exportação/salvamento — R12.67
 *
 * Tipos compartilhados por PDF exporter, DOCX exporter e ExportBar.
 * Este é o "contrato" que qualquer ferramenta da BIA (Pipeline,
 * Formulator Pro, Bioink, Chat IA, Próximos Passos, Notebook)
 * precisa produzir para poder ser exportada/salva/versionada.
 *
 * A ideia é que cada ferramenta tenha uma função `toExportable()`
 * que devolve este objeto — e a partir daí o ExportBar cuida
 * de tudo (PDF, DOCX, Salvar no Notebook, Nova versão, etc.).
 */

// ─── Blocos de conteúdo estruturado ─────────────────────────────
// Cada bloco vira uma seção no PDF e um parágrafo/tabela no DOCX.

export type ContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | KeyValueBlock
  | TableBlock
  | CodeBlock
  | ImageBlock
  | DividerBlock
  | CalloutBlock

export interface HeadingBlock {
  type: "heading"
  level: 1 | 2 | 3
  text: string
}

export interface ParagraphBlock {
  type: "paragraph"
  text: string
}

export interface ListBlock {
  type: "list"
  style?: "bullet" | "numbered"
  items: string[]
}

/** Par chave-valor (ex: "Concentração: 10 mg/mL"). Melhor que tabela pequena. */
export interface KeyValueBlock {
  type: "keyvalue"
  title?: string
  pairs: Array<{ key: string; value: string }>
}

export interface TableBlock {
  type: "table"
  title?: string
  headers: string[]
  rows: string[][]
}

export interface CodeBlock {
  type: "code"
  language?: string // "gcode", "json", "typescript" ...
  content: string
}

/**
 * Imagem embutida. Aceita dataURL (base64) ou URL http(s).
 * width/height opcionais em pixels — o exporter escala proporcional.
 */
export interface ImageBlock {
  type: "image"
  src: string
  caption?: string
  widthPx?: number
  heightPx?: number
}

export interface DividerBlock {
  type: "divider"
}

/** Chamada de destaque (nota / aviso / dica). */
export interface CalloutBlock {
  type: "callout"
  variant?: "info" | "warning" | "success" | "note"
  title?: string
  text: string
}

// ─── Documento completo ─────────────────────────────────────────

export interface ExportableContent {
  /** Título principal — vira <h1> do PDF/DOCX e o title da entrada do Notebook. */
  title: string

  /** Subtítulo opcional (aparece abaixo do título com fonte menor). */
  subtitle?: string

  /** Nome do módulo/ferramenta origem — ex: "Formulator Pro", "Bioink". */
  source?: string

  /**
   * Categoria do conteúdo — mapeia para NotebookEntry.entryType quando
   * salvo. Ex: "PROTOCOL" | "FORMULATION" | "PIPELINE_SUMMARY".
   * Ver enum NotebookEntryType no schema.prisma.
   */
  entryType?:
    | "NOTE"
    | "PROTOCOL"
    | "FORMULATION"
    | "PIPELINE_SUMMARY"
    | "ARTICLE_DRAFT"
    | "PATENT_DRAFT"
    | "BOOK_CHAPTER"
    | "RESEARCH_LOG"
    | "REFERENCE"
    | "STL_GEOMETRY"

  /** Tags livres — herdadas na entrada do Notebook. */
  tags?: string[]

  /** Categoria livre (texto) — herdada na entrada do Notebook. */
  category?: string

  /** Corpo estruturado (blocos que viram seções no PDF/DOCX). */
  blocks: ContentBlock[]

  /**
   * Metadados livres — vão para `NotebookEntry.metadata` (Json).
   * Útil para guardar coisas que não são visuais mas precisam
   * ser lembradas na versão (ex: hash de STL, ID de projeto Pipeline).
   */
  metadata?: Record<string, unknown>

  /**
   * Se este conteúdo já foi salvo antes, preencha aqui para o
   * ExportBar saber que deve oferecer "Editar" / "Nova versão"
   * em vez de "Salvar" pela primeira vez.
   */
  existing?: {
    entryId: string
    currentVersion: number
  }

  /**
   * ProjectId opcional — se o usuário estiver dentro de um Project
   * (R12.66), a entrada nasce vinculada a ele.
   */
  projectId?: string | null

  /** Sumário curto usado no changelog de versão. */
  autoChangeSummary?: string
}

// ─── Resultado das ações do ExportBar ───────────────────────────

export interface SaveResult {
  entryId: string
  versionNumber: number
  isNew: boolean
}

export interface EditResult {
  entryId: string
  newVersionNumber: number | null
  updateInPlace: boolean
}

// ─── Utilitários ────────────────────────────────────────────────

/**
 * Nome de arquivo seguro para download.
 * "Formulação GelMA · v3" → "formulacao-gelma-v3"
 */
export function slugifyFileName(input: string): string {
  return input
    .normalize("NFD")
    // Remove diacríticos (á → a) sem depender de \p{Diacritic} (que a runtime pode não suportar)
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "documento"
}

/**
 * Timestamp para uso em nome de arquivo (YYYY-MM-DD-HHMM).
 */
export function timestampForFileName(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  )
}
