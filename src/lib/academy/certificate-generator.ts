/**
 * BIA · Academy · Gerador de certificados PDF — R13.14
 *
 * Gera certificados profissionais em PDF usando jsPDF (já no projeto).
 *
 * Dois formatos:
 *   1. generateLessonCertificate() — certificado individual por aula
 *   2. generateProgramCertificate() — certificado de conclusão do programa (120h)
 *
 * Design (ambos):
 *   - Formato A4 landscape (297×210 mm)
 *   - Papel timbrado: barras violeta/fuchsia no topo e rodapé
 *   - Logo "BIA" grande à esquerda; "Quantis Biotechnology" ao lado
 *   - Título "CERTIFICADO" em serifa (helvetica bold large)
 *   - Nome do aluno centralizado em display font grande
 *   - Corpo: "concluiu a aula X do programa Y com carga de Z horas"
 *   - Rodapé: código único + QR code de verificação + assinatura digital
 *
 * O código único segue o padrão BIA-AULA-{YEAR}-{SEQ} ou BIA-ACAD-{YEAR}-{SEQ}
 * e pode ser verificado publicamente em biaquantis.bio/verify/[code].
 */
import jsPDF from "jspdf"

// ───────────────────────────────────────────────────────────────────────
// Configuração de design
// ───────────────────────────────────────────────────────────────────────

const PAGE_W = 297 // mm (A4 landscape)
const PAGE_H = 210 // mm
const MARGIN = 15

// Paleta Quantis (RGB)
const VIOLET_DARK: [number, number, number] = [76, 29, 149]      // #4C1D95
const VIOLET: [number, number, number] = [124, 58, 237]          // #7C3AED
const FUCHSIA: [number, number, number] = [217, 70, 239]         // #D946EF
const GRAY_DARK: [number, number, number] = [55, 65, 81]         // #374151
const GRAY_MID: [number, number, number] = [107, 114, 128]       // #6B7280
const GOLD: [number, number, number] = [217, 119, 6]             // #D97706

// Carga horária por aula padrão: 2h (vídeo + estudo + prática)
// Isso dá ~10h por módulo × 12 módulos = 120h totais (padrão MBA brasileiro)
export const DEFAULT_HOURS_PER_LESSON = 2
export const DEFAULT_HOURS_PER_MODULE = 10
export const DEFAULT_HOURS_TOTAL_PROGRAM = 120

// ───────────────────────────────────────────────────────────────────────
// Helpers de desenho
// ───────────────────────────────────────────────────────────────────────

function drawDecorative(doc: jsPDF) {
  // Barra superior gradient (desenhada como 2 barras + divisão)
  doc.setFillColor(...VIOLET_DARK)
  doc.rect(0, 0, PAGE_W, 10, "F")
  doc.setFillColor(...VIOLET)
  doc.rect(0, 10, PAGE_W, 4, "F")
  doc.setFillColor(...FUCHSIA)
  doc.rect(0, 14, PAGE_W, 2, "F")

  // Barra inferior
  doc.setFillColor(...FUCHSIA)
  doc.rect(0, PAGE_H - 16, PAGE_W, 2, "F")
  doc.setFillColor(...VIOLET)
  doc.rect(0, PAGE_H - 14, PAGE_W, 4, "F")
  doc.setFillColor(...VIOLET_DARK)
  doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F")

  // Cantos decorativos (quadradinhos violeta)
  doc.setFillColor(...FUCHSIA)
  doc.rect(MARGIN, 22, 8, 8, "F")
  doc.setFillColor(...VIOLET)
  doc.rect(PAGE_W - MARGIN - 8, 22, 8, 8, "F")
  doc.setFillColor(...VIOLET)
  doc.rect(MARGIN, PAGE_H - 30, 8, 8, "F")
  doc.setFillColor(...FUCHSIA)
  doc.rect(PAGE_W - MARGIN - 8, PAGE_H - 30, 8, 8, "F")

  // Linha decorativa fina
  doc.setDrawColor(...VIOLET)
  doc.setLineWidth(0.3)
  doc.line(MARGIN + 20, 28, PAGE_W - MARGIN - 20, 28)
  doc.line(MARGIN + 20, PAGE_H - 24, PAGE_W - MARGIN - 20, PAGE_H - 24)
}

function drawHeader(doc: jsPDF) {
  // Logo "BIA" grande à esquerda
  doc.setTextColor(...VIOLET_DARK)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(32)
  doc.text("BIA", MARGIN + 15, 45)

  // Subtítulo abaixo
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_MID)
  doc.text("Biomaterial Intelligent Assistant", MARGIN + 15, 50)

  // "ACADEMY" à direita
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...FUCHSIA)
  doc.text("ACADEMY", PAGE_W - MARGIN - 15, 45, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...GRAY_MID)
  doc.text("Quantis Biotechnology", PAGE_W - MARGIN - 15, 50, { align: "right" })
}

function drawTitle(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(48)
  doc.setTextColor(...VIOLET_DARK)
  doc.text(title, PAGE_W / 2, 75, { align: "center" })

  // Linha decorativa abaixo do título
  const titleWidth = doc.getTextWidth(title)
  doc.setDrawColor(...FUCHSIA)
  doc.setLineWidth(1)
  doc.line(
    (PAGE_W - titleWidth * 0.6) / 2,
    82,
    (PAGE_W + titleWidth * 0.6) / 2,
    82,
  )
}

function drawStudentName(doc: jsPDF, name: string) {
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...GRAY_DARK)
  doc.text("Certificamos que", PAGE_W / 2, 95, { align: "center" })

  // Nome do aluno em display
  doc.setFont("helvetica", "bold")
  doc.setFontSize(26)
  doc.setTextColor(...VIOLET)
  doc.text(name, PAGE_W / 2, 112, { align: "center" })

  // Sublinhado sutil embaixo do nome
  const nameWidth = doc.getTextWidth(name)
  doc.setDrawColor(...FUCHSIA)
  doc.setLineWidth(0.5)
  doc.line(
    (PAGE_W - nameWidth) / 2 - 5,
    117,
    (PAGE_W + nameWidth) / 2 + 5,
    117,
  )
}

function drawBody(doc: jsPDF, lines: string[]) {
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.setTextColor(...GRAY_DARK)
  let y = 130
  for (const line of lines) {
    doc.text(line, PAGE_W / 2, y, { align: "center", maxWidth: PAGE_W - 2 * MARGIN - 40 })
    y += 8
  }
}

function drawFooter(doc: jsPDF, code: string, issuedAt: Date, verifyUrl: string) {
  // Data (esquerda)
  const issuedLabel = `Emitido em ${issuedAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}`
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...GRAY_DARK)
  doc.text(issuedLabel, MARGIN + 15, PAGE_H - 42)

  // Linha de assinatura
  doc.setDrawColor(...GRAY_MID)
  doc.setLineWidth(0.3)
  doc.line(MARGIN + 15, PAGE_H - 50, MARGIN + 90, PAGE_H - 50)
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_MID)
  doc.text("Dra. Janaina Dernowsek", MARGIN + 15, PAGE_H - 46)
  doc.setFont("helvetica", "normal")
  doc.text("CEO · Quantis Biotechnology", MARGIN + 15, PAGE_H - 42)

  // Código único (centro)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...VIOLET_DARK)
  doc.text(code, PAGE_W / 2, PAGE_H - 46, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(...GRAY_MID)
  doc.text("Código de verificação", PAGE_W / 2, PAGE_H - 42, { align: "center" })

  // Link de verificação (direita)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_DARK)
  doc.text("Verificar autenticidade em:", PAGE_W - MARGIN - 15, PAGE_H - 46, { align: "right" })
  doc.setTextColor(...VIOLET)
  doc.textWithLink(verifyUrl, PAGE_W - MARGIN - 15, PAGE_H - 42, {
    align: "right",
    url: verifyUrl,
  })
}

// ───────────────────────────────────────────────────────────────────────
// Geração de códigos únicos
// ───────────────────────────────────────────────────────────────────────

export function generateLessonCertCode(year: number, sequential: number): string {
  const y = year.toString().padStart(4, "0")
  const seq = sequential.toString().padStart(6, "0")
  return `BIA-AULA-${y}-${seq}`
}

export function generateProgramCertCode(year: number, sequential: number): string {
  const y = year.toString().padStart(4, "0")
  const seq = sequential.toString().padStart(4, "0")
  return `BIA-ACAD-${y}-${seq}`
}

// ───────────────────────────────────────────────────────────────────────
// Geradores públicos
// ───────────────────────────────────────────────────────────────────────

export interface LessonCertificateInput {
  studentName: string
  lessonTitle: string
  moduleTitle: string
  moduleOrder: number
  lessonOrder: number
  durationHours?: number     // default: 2h por aula
  code: string                // ex: "BIA-AULA-2027-000001"
  issuedAt: Date
  verifyUrl: string           // ex: "biaquantis.bio/verify/BIA-AULA-2027-000001"
}

export function generateLessonCertificatePdf(
  input: LessonCertificateInput,
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  drawDecorative(doc)
  drawHeader(doc)
  drawTitle(doc, "CERTIFICADO")
  drawStudentName(doc, input.studentName)

  const hours = input.durationHours ?? DEFAULT_HOURS_PER_LESSON
  drawBody(doc, [
    `concluiu com aproveitamento a aula ${input.moduleOrder}.${input.lessonOrder}:`,
    "",
    `"${input.lessonTitle}"`,
    "",
    `pertencente ao Módulo ${input.moduleOrder} — ${input.moduleTitle}`,
    `do programa BIA Academy, com carga horária de ${hours} horas.`,
  ])

  drawFooter(doc, input.code, input.issuedAt, input.verifyUrl)

  return new Uint8Array(doc.output("arraybuffer"))
}

export interface ProgramCertificateInput {
  studentName: string
  completedLessonsCount: number
  totalLessonsCount: number
  totalHours?: number                      // default: 120h
  code: string
  issuedAt: Date
  verifyUrl: string
}

export function generateProgramCertificatePdf(
  input: ProgramCertificateInput,
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  drawDecorative(doc)
  drawHeader(doc)
  drawTitle(doc, "CERTIFICADO DE CONCLUSÃO")
  drawStudentName(doc, input.studentName)

  const hours = input.totalHours ?? DEFAULT_HOURS_TOTAL_PROGRAM
  drawBody(doc, [
    "concluiu com aproveitamento o programa",
    "",
    "BIA ACADEMY — Formação em Biofabricação e Bioimpressão 3D",
    "",
    `com carga horária total de ${hours} horas,`,
    `distribuídas em 12 módulos e ${input.totalLessonsCount} aulas,`,
    `tendo completado ${input.completedLessonsCount} aulas publicadas.`,
  ])

  drawFooter(doc, input.code, input.issuedAt, input.verifyUrl)

  // Selo "APROVADO" dourado no canto
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(...GOLD)
  doc.text("★ APROVADO ★", PAGE_W / 2, 185, { align: "center" })

  return new Uint8Array(doc.output("arraybuffer"))
}

export interface PartialCertificateInput {
  studentName: string
  completedLessons: Array<{
    moduleOrder: number
    lessonOrder: number
    title: string
    moduleTitle: string
  }>
  totalHours: number
  code: string
  issuedAt: Date
  verifyUrl: string
}

export function generatePartialCertificatePdf(
  input: PartialCertificateInput,
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  drawDecorative(doc)
  drawHeader(doc)
  drawTitle(doc, "DECLARAÇÃO DE PROGRESSO")
  drawStudentName(doc, input.studentName)

  drawBody(doc, [
    "concluiu, até esta data, as seguintes aulas do programa BIA Academy,",
    `totalizando ${input.totalHours} horas de carga horária parcial.`,
  ])

  // Lista de aulas (até 12 primeiras cabem no PDF)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...GRAY_DARK)
  const startY = 150
  const maxItems = Math.min(input.completedLessons.length, 12)
  const col1X = MARGIN + 25
  const col2X = PAGE_W / 2 + 10
  for (let i = 0; i < maxItems; i++) {
    const l = input.completedLessons[i]
    const label = `• M${String(l.moduleOrder).padStart(2, "0")}.${l.lessonOrder} — ${l.title}`
    const x = i < 6 ? col1X : col2X
    const y = startY + (i % 6) * 5
    doc.text(label.slice(0, 55), x, y)
  }
  if (input.completedLessons.length > 12) {
    doc.setFont("helvetica", "italic")
    doc.setFontSize(7)
    doc.setTextColor(...GRAY_MID)
    doc.text(
      `… e mais ${input.completedLessons.length - 12} aulas concluídas.`,
      PAGE_W / 2,
      startY + 32,
      { align: "center" },
    )
  }

  drawFooter(doc, input.code, input.issuedAt, input.verifyUrl)

  return new Uint8Array(doc.output("arraybuffer"))
}
