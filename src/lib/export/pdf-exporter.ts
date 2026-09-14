/**
 * BIA · PDF Exporter — R12.67
 *
 * Renderiza um ExportableContent como PDF usando jsPDF.
 * Design: minimalista, científico, marca "BIA · Quantis Biotechnology"
 * no rodapé. A4, margens generosas, fontes clean.
 *
 * IMPORTANTE: usa apenas fontes padrão do jsPDF (helvetica) para
 * evitar bundle pesado. Acentos PT-BR funcionam via WinAnsi/latin1
 * do próprio jsPDF.
 */
import jsPDF from "jspdf"
import { saveAs } from "file-saver"
import type {
  ExportableContent,
  ContentBlock,
} from "./types"
import { slugifyFileName, timestampForFileName } from "./types"

// ─── Layout constants ────────────────────────────────────────────
const PAGE = {
  A4_WIDTH_MM: 210,
  A4_HEIGHT_MM: 297,
  MARGIN_X: 20,
  MARGIN_TOP: 25,
  MARGIN_BOTTOM: 22,
}

const FONT = {
  h1: 20,
  h2: 14,
  h3: 11,
  body: 10,
  small: 8,
  code: 9,
}

const LINE_HEIGHT = {
  h1: 8,
  h2: 6,
  h3: 5,
  body: 5,
  small: 4,
  code: 4.5,
}

const COLORS = {
  brand: [124, 58, 237] as [number, number, number], // roxo (marca BIA)
  ink: [30, 30, 40] as [number, number, number],
  muted: [110, 110, 120] as [number, number, number],
  rule: [220, 220, 230] as [number, number, number],
  calloutBg: [245, 243, 255] as [number, number, number],
  calloutBorder: [124, 58, 237] as [number, number, number],
  warnBg: [255, 247, 237] as [number, number, number],
  warnBorder: [234, 88, 12] as [number, number, number],
  successBg: [236, 253, 245] as [number, number, number],
  successBorder: [16, 185, 129] as [number, number, number],
  tableHeaderBg: [248, 248, 252] as [number, number, number],
  codeBg: [246, 246, 250] as [number, number, number],
}

// ─── Renderer ────────────────────────────────────────────────────
class PdfRenderer {
  private doc: jsPDF
  private y: number
  private pageWidth: number
  private pageHeight: number
  private contentWidth: number

  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4" })
    this.pageWidth = PAGE.A4_WIDTH_MM
    this.pageHeight = PAGE.A4_HEIGHT_MM
    this.contentWidth = this.pageWidth - PAGE.MARGIN_X * 2
    this.y = PAGE.MARGIN_TOP
  }

  private setColor(rgb: [number, number, number]): void {
    this.doc.setTextColor(rgb[0], rgb[1], rgb[2])
  }

  private setFillColor(rgb: [number, number, number]): void {
    this.doc.setFillColor(rgb[0], rgb[1], rgb[2])
  }

  private setDrawColor(rgb: [number, number, number]): void {
    this.doc.setDrawColor(rgb[0], rgb[1], rgb[2])
  }

  /** Garante espaço vertical, quebrando página se necessário. */
  private ensureSpace(needed: number): void {
    if (this.y + needed > this.pageHeight - PAGE.MARGIN_BOTTOM) {
      this.newPage()
    }
  }

  private newPage(): void {
    this.doc.addPage()
    this.y = PAGE.MARGIN_TOP
  }

  /** Escreve texto quebrando linhas automaticamente. */
  private writeText(
    text: string,
    opts: {
      size: number
      lineHeight: number
      style?: "normal" | "bold" | "italic"
      color?: [number, number, number]
      x?: number
      maxWidth?: number
    },
  ): void {
    if (!text) return
    this.doc.setFontSize(opts.size)
    this.doc.setFont("helvetica", opts.style ?? "normal")
    this.setColor(opts.color ?? COLORS.ink)

    const x = opts.x ?? PAGE.MARGIN_X
    const maxWidth = opts.maxWidth ?? this.contentWidth
    const lines: string[] = this.doc.splitTextToSize(text, maxWidth) as string[]

    for (const line of lines) {
      this.ensureSpace(opts.lineHeight)
      this.doc.text(line, x, this.y)
      this.y += opts.lineHeight
    }
  }

  // ─── Cabeçalho e rodapé ────────────────────────────────────────

  private drawHeader(source?: string): void {
    // barra de marca no topo (linha fina roxa)
    this.setDrawColor(COLORS.brand)
    this.doc.setLineWidth(0.6)
    this.doc.line(
      PAGE.MARGIN_X,
      15,
      this.pageWidth - PAGE.MARGIN_X,
      15,
    )
    this.doc.setLineWidth(0.2)

    // "BIA" à esquerda + source à direita
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(FONT.small)
    this.setColor(COLORS.brand)
    this.doc.text("BIA", PAGE.MARGIN_X, 12)

    if (source) {
      this.setColor(COLORS.muted)
      this.doc.setFont("helvetica", "normal")
      const sourceStr = source
      const w = this.doc.getTextWidth(sourceStr)
      this.doc.text(sourceStr, this.pageWidth - PAGE.MARGIN_X - w, 12)
    }
  }

  private drawFooterOnAllPages(): void {
    const total = this.doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i)
      this.doc.setFont("helvetica", "normal")
      this.doc.setFontSize(FONT.small)
      this.setColor(COLORS.muted)

      const footerY = this.pageHeight - 10
      const left = "BIA · Biofabrication Intelligent Assistant · Quantis Biotechnology"
      const right = `${i} / ${total}`

      this.doc.text(left, PAGE.MARGIN_X, footerY)
      const rw = this.doc.getTextWidth(right)
      this.doc.text(right, this.pageWidth - PAGE.MARGIN_X - rw, footerY)
    }
  }

  // ─── Blocos ────────────────────────────────────────────────────

  private renderHeading(block: { level: 1 | 2 | 3; text: string }): void {
    if (block.level === 1) {
      this.y += 2
      this.writeText(block.text, {
        size: FONT.h1,
        lineHeight: LINE_HEIGHT.h1,
        style: "bold",
        color: COLORS.ink,
      })
      this.y += 1
    } else if (block.level === 2) {
      this.y += 3
      this.writeText(block.text, {
        size: FONT.h2,
        lineHeight: LINE_HEIGHT.h2,
        style: "bold",
        color: COLORS.brand,
      })
      this.y += 1
    } else {
      this.y += 2
      this.writeText(block.text, {
        size: FONT.h3,
        lineHeight: LINE_HEIGHT.h3,
        style: "bold",
        color: COLORS.ink,
      })
    }
  }

  private renderParagraph(block: { text: string }): void {
    this.writeText(block.text, {
      size: FONT.body,
      lineHeight: LINE_HEIGHT.body,
    })
    this.y += 1
  }

  private renderList(block: {
    style?: "bullet" | "numbered"
    items: string[]
  }): void {
    const isNumbered = block.style === "numbered"
    block.items.forEach((item, i) => {
      const bullet = isNumbered ? `${i + 1}.` : "•"
      const prefix = `${bullet}  `
      this.doc.setFont("helvetica", "normal")
      this.doc.setFontSize(FONT.body)
      const prefixWidth = this.doc.getTextWidth(prefix)

      this.ensureSpace(LINE_HEIGHT.body)
      this.setColor(COLORS.brand)
      this.doc.text(bullet, PAGE.MARGIN_X, this.y)

      this.writeText(item, {
        size: FONT.body,
        lineHeight: LINE_HEIGHT.body,
        x: PAGE.MARGIN_X + prefixWidth,
        maxWidth: this.contentWidth - prefixWidth,
      })
    })
    this.y += 1
  }

  private renderKeyValue(block: {
    title?: string
    pairs: Array<{ key: string; value: string }>
  }): void {
    if (block.title) {
      this.writeText(block.title, {
        size: FONT.h3,
        lineHeight: LINE_HEIGHT.h3,
        style: "bold",
        color: COLORS.ink,
      })
    }
    const keyColW = 55
    for (const p of block.pairs) {
      this.ensureSpace(LINE_HEIGHT.body)
      // Key
      this.doc.setFont("helvetica", "bold")
      this.doc.setFontSize(FONT.body)
      this.setColor(COLORS.muted)
      this.doc.text(p.key, PAGE.MARGIN_X, this.y)
      // Value
      this.doc.setFont("helvetica", "normal")
      this.setColor(COLORS.ink)
      const valLines = this.doc.splitTextToSize(
        p.value,
        this.contentWidth - keyColW,
      ) as string[]
      let localY = this.y
      for (const line of valLines) {
        this.doc.text(line, PAGE.MARGIN_X + keyColW, localY)
        localY += LINE_HEIGHT.body
      }
      this.y = Math.max(this.y + LINE_HEIGHT.body, localY)
    }
    this.y += 1
  }

  private renderTable(block: {
    title?: string
    headers: string[]
    rows: string[][]
  }): void {
    if (block.title) {
      this.writeText(block.title, {
        size: FONT.h3,
        lineHeight: LINE_HEIGHT.h3,
        style: "bold",
        color: COLORS.ink,
      })
    }

    const nCols = block.headers.length
    if (nCols === 0) return

    const colWidth = this.contentWidth / nCols
    const cellPad = 2
    const rowHeight = 7

    // Header
    this.ensureSpace(rowHeight + 2)
    this.setFillColor(COLORS.tableHeaderBg)
    this.doc.rect(PAGE.MARGIN_X, this.y - 4, this.contentWidth, rowHeight, "F")
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(FONT.body)
    this.setColor(COLORS.ink)
    block.headers.forEach((h, i) => {
      this.doc.text(h, PAGE.MARGIN_X + i * colWidth + cellPad, this.y)
    })
    this.y += rowHeight

    // Rows
    this.doc.setFont("helvetica", "normal")
    this.setColor(COLORS.ink)
    for (const row of block.rows) {
      // Calcula altura da linha (célula mais alta)
      const cellLinesPerCol: string[][] = row.map(
        (cell) =>
          this.doc.splitTextToSize(
            cell ?? "",
            colWidth - cellPad * 2,
          ) as string[],
      )
      const maxLines = Math.max(1, ...cellLinesPerCol.map((c) => c.length))
      const thisRowHeight = maxLines * LINE_HEIGHT.body + 2

      this.ensureSpace(thisRowHeight)

      cellLinesPerCol.forEach((lines, i) => {
        let localY = this.y
        for (const line of lines) {
          this.doc.text(
            line,
            PAGE.MARGIN_X + i * colWidth + cellPad,
            localY,
          )
          localY += LINE_HEIGHT.body
        }
      })
      // linha divisória inferior
      this.setDrawColor(COLORS.rule)
      this.doc.line(
        PAGE.MARGIN_X,
        this.y + thisRowHeight - 2,
        PAGE.MARGIN_X + this.contentWidth,
        this.y + thisRowHeight - 2,
      )
      this.y += thisRowHeight
    }
    this.y += 2
  }

  private renderCode(block: { language?: string; content: string }): void {
    const lines = block.content.split(/\r?\n/)
    const boxPad = 3
    const lineH = LINE_HEIGHT.code

    // Bloco pode ser longo — não tenta manter tudo numa página; só
    // desenha fundo por página de forma incremental.
    for (const raw of lines) {
      const wrapped = this.doc.splitTextToSize(
        raw || " ",
        this.contentWidth - boxPad * 2,
      ) as string[]
      for (const line of wrapped) {
        this.ensureSpace(lineH + 1)
        this.setFillColor(COLORS.codeBg)
        this.doc.rect(
          PAGE.MARGIN_X,
          this.y - lineH + 1,
          this.contentWidth,
          lineH + 1,
          "F",
        )
        this.doc.setFont("courier", "normal")
        this.doc.setFontSize(FONT.code)
        this.setColor(COLORS.ink)
        this.doc.text(line, PAGE.MARGIN_X + boxPad, this.y)
        this.y += lineH
      }
    }
    this.doc.setFont("helvetica", "normal")
    this.y += 2
  }

  private renderImage(block: {
    src: string
    caption?: string
    widthPx?: number
    heightPx?: number
  }): void {
    // src pode ser dataURL. Tenta detectar formato.
    const format = block.src.startsWith("data:image/png")
      ? "PNG"
      : block.src.startsWith("data:image/webp")
        ? "WEBP"
        : "JPEG"

    // Escala mantendo proporção. Fallback: 100 x 60 mm.
    let widthMm = 120
    let heightMm = 80
    if (block.widthPx && block.heightPx && block.widthPx > 0) {
      const ratio = block.heightPx / block.widthPx
      widthMm = Math.min(this.contentWidth, 150)
      heightMm = widthMm * ratio
      // Se a imagem for muito alta, limita para caber
      const maxH = this.pageHeight - PAGE.MARGIN_TOP - PAGE.MARGIN_BOTTOM - 20
      if (heightMm > maxH) {
        heightMm = maxH
        widthMm = heightMm / ratio
      }
    }

    this.ensureSpace(heightMm + 6)
    try {
      this.doc.addImage(
        block.src,
        format,
        PAGE.MARGIN_X,
        this.y,
        widthMm,
        heightMm,
        undefined,
        "FAST",
      )
    } catch {
      // Silencioso — se a imagem falhar (dataURL corrompida), pula
      this.writeText("[imagem não pôde ser renderizada]", {
        size: FONT.small,
        lineHeight: LINE_HEIGHT.small,
        style: "italic",
        color: COLORS.muted,
      })
      return
    }
    this.y += heightMm + 2

    if (block.caption) {
      this.writeText(block.caption, {
        size: FONT.small,
        lineHeight: LINE_HEIGHT.small,
        style: "italic",
        color: COLORS.muted,
      })
    }
    this.y += 2
  }

  private renderDivider(): void {
    this.y += 3
    this.ensureSpace(4)
    this.setDrawColor(COLORS.rule)
    this.doc.line(
      PAGE.MARGIN_X,
      this.y,
      this.pageWidth - PAGE.MARGIN_X,
      this.y,
    )
    this.y += 4
  }

  private renderCallout(block: {
    variant?: "info" | "warning" | "success" | "note"
    title?: string
    text: string
  }): void {
    const v = block.variant ?? "info"
    const bg =
      v === "warning"
        ? COLORS.warnBg
        : v === "success"
          ? COLORS.successBg
          : COLORS.calloutBg
    const border =
      v === "warning"
        ? COLORS.warnBorder
        : v === "success"
          ? COLORS.successBorder
          : COLORS.calloutBorder

    // Mede altura do bloco
    const pad = 3
    const textLines = this.doc.splitTextToSize(
      block.text,
      this.contentWidth - pad * 2 - 3,
    ) as string[]
    const titleLines = block.title ? [block.title] : []
    const totalH =
      pad * 2 +
      titleLines.length * LINE_HEIGHT.body +
      textLines.length * LINE_HEIGHT.body

    this.ensureSpace(totalH + 2)

    // Fundo
    this.setFillColor(bg)
    this.doc.rect(PAGE.MARGIN_X, this.y, this.contentWidth, totalH, "F")
    // Barra lateral
    this.setFillColor(border)
    this.doc.rect(PAGE.MARGIN_X, this.y, 1.2, totalH, "F")

    // Conteúdo
    let localY = this.y + pad + LINE_HEIGHT.body - 1
    if (block.title) {
      this.doc.setFont("helvetica", "bold")
      this.doc.setFontSize(FONT.body)
      this.setColor(COLORS.ink)
      this.doc.text(block.title, PAGE.MARGIN_X + pad + 2, localY)
      localY += LINE_HEIGHT.body
    }
    this.doc.setFont("helvetica", "normal")
    this.setColor(COLORS.ink)
    for (const line of textLines) {
      this.doc.text(line, PAGE.MARGIN_X + pad + 2, localY)
      localY += LINE_HEIGHT.body
    }

    this.y += totalH + 3
  }

  // ─── API pública ───────────────────────────────────────────────

  public render(content: ExportableContent): void {
    this.drawHeader(content.source)

    // Título principal
    this.writeText(content.title, {
      size: FONT.h1,
      lineHeight: LINE_HEIGHT.h1,
      style: "bold",
      color: COLORS.ink,
    })
    if (content.subtitle) {
      this.writeText(content.subtitle, {
        size: FONT.body,
        lineHeight: LINE_HEIGHT.body,
        style: "italic",
        color: COLORS.muted,
      })
    }
    // Meta: data + versão + tags (se houver)
    const metaParts: string[] = []
    metaParts.push(
      new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    )
    if (content.existing) {
      metaParts.push(`v${content.existing.currentVersion}`)
    }
    if (content.tags && content.tags.length > 0) {
      metaParts.push(content.tags.slice(0, 6).join(" · "))
    }
    this.writeText(metaParts.join(" · "), {
      size: FONT.small,
      lineHeight: LINE_HEIGHT.small,
      color: COLORS.muted,
    })

    // Régua fina
    this.y += 1
    this.setDrawColor(COLORS.rule)
    this.doc.line(
      PAGE.MARGIN_X,
      this.y,
      this.pageWidth - PAGE.MARGIN_X,
      this.y,
    )
    this.y += 5

    // Blocos
    for (const block of content.blocks) {
      this.renderBlock(block)
    }

    this.drawFooterOnAllPages()
  }

  private renderBlock(block: ContentBlock): void {
    switch (block.type) {
      case "heading":
        this.renderHeading(block)
        return
      case "paragraph":
        this.renderParagraph(block)
        return
      case "list":
        this.renderList(block)
        return
      case "keyvalue":
        this.renderKeyValue(block)
        return
      case "table":
        this.renderTable(block)
        return
      case "code":
        this.renderCode(block)
        return
      case "image":
        this.renderImage(block)
        return
      case "divider":
        this.renderDivider()
        return
      case "callout":
        this.renderCallout(block)
        return
    }
  }

  public getBlob(): Blob {
    return this.doc.output("blob")
  }

  public getArrayBuffer(): ArrayBuffer {
    return this.doc.output("arraybuffer") as ArrayBuffer
  }
}

// ─── API pública do módulo ──────────────────────────────────────

/**
 * Constrói um Blob PDF a partir de um ExportableContent.
 * Não dispara download (útil para testes).
 */
export function buildPdfBlob(content: ExportableContent): Blob {
  const r = new PdfRenderer()
  r.render(content)
  return r.getBlob()
}

/**
 * Renderiza + salva no navegador. Nome do arquivo é derivado do
 * título; usa file-saver para máxima compatibilidade.
 */
export function exportPdf(content: ExportableContent, opts?: { filename?: string }): void {
  const r = new PdfRenderer()
  r.render(content)
  const blob = r.getBlob()
  const name =
    opts?.filename ??
    `${slugifyFileName(content.title)}-${timestampForFileName()}.pdf`
  saveAs(blob, name)
}
