/**
 * BIA · DOCX Exporter — R12.67
 *
 * Renderiza um ExportableContent como .docx (OOXML) usando a lib `docx`.
 * Compatível com Word / LibreOffice / Google Docs.
 *
 * Design: mesma marca do PDF exporter — cabeçalho fino roxo,
 * rodapé "BIA · Quantis Biotechnology", fonte Calibri (padrão Word).
 */
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Footer,
  Header,
  ImageRun,
  PageOrientation,
  LevelFormat,
} from "docx"
import { saveAs } from "file-saver"
import type {
  ExportableContent,
  ContentBlock,
  HeadingBlock,
  ParagraphBlock,
  ListBlock,
  KeyValueBlock,
  TableBlock as TableBlockT,
  CodeBlock as CodeBlockT,
  ImageBlock,
  DividerBlock,
  CalloutBlock,
} from "./types"
import { slugifyFileName, timestampForFileName } from "./types"

// ─── Cores em hex (docx aceita "RRGGBB" sem #) ──────────────────
const HEX = {
  brand: "7C3AED",
  ink: "1E1E28",
  muted: "6E6E78",
  rule: "DCDCE6",
  calloutBg: "F5F3FF",
  warnBg: "FFF7ED",
  successBg: "ECFDF5",
  codeBg: "F6F6FA",
  headerBg: "F8F8FC",
}

// ─── Helpers ────────────────────────────────────────────────────

function heading(text: string, level: 1 | 2 | 3): Paragraph {
  const map = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  } as const
  const sizes = { 1: 40, 2: 28, 3: 22 } // meio-pontos
  const colors = { 1: HEX.ink, 2: HEX.brand, 3: HEX.ink }
  return new Paragraph({
    heading: map[level],
    spacing: { before: level === 1 ? 0 : 200, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: sizes[level],
        color: colors[level],
        font: "Calibri",
      }),
    ],
  })
}

function paragraph(text: string, opts?: {
  italic?: boolean
  bold?: boolean
  color?: string
  size?: number
}): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        italics: opts?.italic,
        bold: opts?.bold,
        color: opts?.color ?? HEX.ink,
        size: opts?.size ?? 22,
        font: "Calibri",
      }),
    ],
  })
}

function renderListBlock(block: ListBlock): Paragraph[] {
  const numbered = block.style === "numbered"
  return block.items.map((item, i) => {
    if (numbered) {
      // Enumeração manual (fallback simples) — evita depender de
      // numbering.xml customizado que exige config extra na Document
      return new Paragraph({
        spacing: { after: 60 },
        indent: { left: 360 },
        children: [
          new TextRun({
            text: `${i + 1}. `,
            bold: true,
            color: HEX.brand,
            font: "Calibri",
            size: 22,
          }),
          new TextRun({ text: item, font: "Calibri", size: 22, color: HEX.ink }),
        ],
      })
    }
    return new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [
        new TextRun({
          text: "•  ",
          bold: true,
          color: HEX.brand,
          font: "Calibri",
          size: 22,
        }),
        new TextRun({ text: item, font: "Calibri", size: 22, color: HEX.ink }),
      ],
    })
  })
}

function renderKeyValueBlock(block: KeyValueBlock): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = []
  if (block.title) {
    parts.push(paragraph(block.title, { bold: true }))
  }
  // Tabela sem bordas: chave à esquerda em bold muted, valor à direita
  const rows = block.pairs.map(
    (p) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: p.key,
                    bold: true,
                    color: HEX.muted,
                    font: "Calibri",
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: noBorders(),
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: p.value,
                    color: HEX.ink,
                    font: "Calibri",
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
  )
  parts.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }),
  )
  parts.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
  return parts
}

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  }
}

function ruleBorders(color: string = HEX.rule) {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color },
    bottom: { style: BorderStyle.SINGLE, size: 4, color },
    left: { style: BorderStyle.SINGLE, size: 4, color },
    right: { style: BorderStyle.SINGLE, size: 4, color },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color },
  }
}

function renderTableBlock(block: TableBlockT): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = []
  if (block.title) {
    parts.push(paragraph(block.title, { bold: true }))
  }
  const nCols = block.headers.length
  const colWidthPct = nCols > 0 ? 100 / nCols : 100

  const headerRow = new TableRow({
    tableHeader: true,
    children: block.headers.map(
      (h) =>
        new TableCell({
          width: { size: colWidthPct, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: HEX.headerBg, color: "auto" },
          children: [
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  color: HEX.ink,
                  font: "Calibri",
                  size: 22,
                }),
              ],
            }),
          ],
        }),
    ),
  })

  const bodyRows = block.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              width: { size: colWidthPct, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: cell ?? "",
                      color: HEX.ink,
                      font: "Calibri",
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
  )

  parts.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: ruleBorders(),
      rows: [headerRow, ...bodyRows],
    }),
  )
  parts.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
  return parts
}

function renderCodeBlock(block: CodeBlockT): Paragraph[] {
  const lines = block.content.split(/\r?\n/)
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, line: 240 },
        shading: {
          type: ShadingType.CLEAR,
          color: "auto",
          fill: HEX.codeBg,
        },
        children: [
          new TextRun({
            text: line || " ",
            font: "Consolas",
            size: 20,
            color: HEX.ink,
          }),
        ],
      }),
  )
}

function renderImageBlock(block: ImageBlock): Paragraph[] {
  // Aceita dataURL. Extrai base64 e converte para Uint8Array.
  const match = /^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i.exec(block.src)
  if (!match) {
    return [
      paragraph("[imagem referenciada por URL externa — não embutida no DOCX]", {
        italic: true,
        color: HEX.muted,
        size: 20,
      }),
    ]
  }
  const mime = match[1].toLowerCase()
  const base64 = match[2]
  const bytes = base64ToUint8Array(base64)

  // Dimensões em pixels (docx usa px inteiros)
  let widthPx = block.widthPx ?? 480
  let heightPx = block.heightPx ?? Math.round(widthPx * 0.66)
  // Trava largura máxima para não estourar a página A4 no Word
  if (widthPx > 560) {
    const ratio = heightPx / widthPx
    widthPx = 560
    heightPx = Math.round(widthPx * ratio)
  }

  const parts: Paragraph[] = []
  const runType =
    mime === "image/png"
      ? "png"
      : mime === "image/gif"
        ? "gif"
        : mime === "image/bmp"
          ? "bmp"
          : "jpg"

  parts.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new ImageRun({
          // docx exige um dos tipos suportados; qualquer outro cai em "jpg"
          type: runType,
          data: bytes as never,
          transformation: { width: widthPx, height: heightPx },
        } as never),
      ],
    }),
  )
  if (block.caption) {
    parts.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: block.caption,
            italics: true,
            color: HEX.muted,
            font: "Calibri",
            size: 18,
          }),
        ],
      }),
    )
  }
  return parts
}

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/\s+/g, "")
  // Ambiente browser tem atob; ambiente Node de testes usa Buffer.
  if (typeof atob === "function") {
    const bin = atob(clean)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }
  // Node fallback (para testes)
  const buf = Buffer.from(clean, "base64")
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
}

function renderDivider(_block: DividerBlock): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: {
      bottom: {
        color: HEX.rule,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [],
  })
}

function renderCallout(block: CalloutBlock): Table {
  const v = block.variant ?? "info"
  const bg = v === "warning" ? HEX.warnBg : v === "success" ? HEX.successBg : HEX.calloutBg
  const border = v === "warning" ? "EA580C" : v === "success" ? "10B981" : HEX.brand

  const children: Paragraph[] = []
  if (block.title) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: block.title,
            bold: true,
            color: HEX.ink,
            font: "Calibri",
            size: 22,
          }),
        ],
      }),
    )
  }
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: block.text,
          color: HEX.ink,
          font: "Calibri",
          size: 22,
        }),
      ],
    }),
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: border },
      left: { style: BorderStyle.SINGLE, size: 12, color: border },
      right: { style: BorderStyle.SINGLE, size: 4, color: border },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: bg, color: "auto" },
            children,
          }),
        ],
      }),
    ],
  })
}

// ─── Renderer principal ─────────────────────────────────────────

function renderBlock(block: ContentBlock): (Paragraph | Table)[] {
  switch (block.type) {
    case "heading":
      return [heading((block as HeadingBlock).text, (block as HeadingBlock).level)]
    case "paragraph":
      return [paragraph((block as ParagraphBlock).text)]
    case "list":
      return renderListBlock(block as ListBlock)
    case "keyvalue":
      return renderKeyValueBlock(block as KeyValueBlock)
    case "table":
      return renderTableBlock(block as TableBlockT)
    case "code":
      return renderCodeBlock(block as CodeBlockT)
    case "image":
      return renderImageBlock(block as ImageBlock)
    case "divider":
      return [renderDivider(block as DividerBlock)]
    case "callout":
      return [renderCallout(block as CalloutBlock)]
  }
}

function buildDocument(content: ExportableContent): Document {
  const children: (Paragraph | Table)[] = []

  // Título
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: content.title,
          bold: true,
          size: 40,
          color: HEX.ink,
          font: "Calibri",
        }),
      ],
    }),
  )
  if (content.subtitle) {
    children.push(
      paragraph(content.subtitle, {
        italic: true,
        color: HEX.muted,
      }),
    )
  }

  // Meta
  const metaParts: string[] = []
  metaParts.push(
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date()),
  )
  if (content.existing) metaParts.push(`v${content.existing.currentVersion}`)
  if (content.tags && content.tags.length > 0) {
    metaParts.push(content.tags.slice(0, 6).join(" · "))
  }
  children.push(
    paragraph(metaParts.join(" · "), {
      color: HEX.muted,
      size: 18,
    }),
  )
  children.push(renderDivider({ type: "divider" }))

  // Blocos
  for (const block of content.blocks) {
    for (const el of renderBlock(block)) {
      children.push(el)
    }
  }

  return new Document({
    creator: "BIA · Quantis Biotechnology",
    title: content.title,
    description: content.subtitle ?? undefined,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: HEX.ink },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 1200,
              right: 1200,
              bottom: 1200,
              left: 1200,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: "BIA",
                    bold: true,
                    color: HEX.brand,
                    font: "Calibri",
                    size: 18,
                  }),
                  ...(content.source
                    ? [
                        new TextRun({
                          text: `   ·   ${content.source}`,
                          color: HEX.muted,
                          font: "Calibri",
                          size: 18,
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "BIA · Biofabrication Intelligent Assistant · Quantis Biotechnology",
                    color: HEX.muted,
                    font: "Calibri",
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
    numbering: {
      config: [
        {
          reference: "bullet",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
  })
}

// ─── API pública ────────────────────────────────────────────────

export async function buildDocxBlob(content: ExportableContent): Promise<Blob> {
  const doc = buildDocument(content)
  return await Packer.toBlob(doc)
}

export async function buildDocxArrayBuffer(
  content: ExportableContent,
): Promise<ArrayBuffer> {
  const doc = buildDocument(content)
  const buf = await Packer.toBuffer(doc)
  // Some environments return Buffer (Node) or Uint8Array (browser);
  // normalize to ArrayBuffer.
  if (buf instanceof ArrayBuffer) return buf
  const u8 = buf as unknown as Uint8Array
  const out = new ArrayBuffer(u8.byteLength)
  new Uint8Array(out).set(u8)
  return out
}

export async function exportDocx(
  content: ExportableContent,
  opts?: { filename?: string },
): Promise<void> {
  const blob = await buildDocxBlob(content)
  const name =
    opts?.filename ??
    `${slugifyFileName(content.title)}-${timestampForFileName()}.docx`
  saveAs(blob, name)
}
