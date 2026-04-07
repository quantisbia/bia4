"use client"

/**
 * BIA v4 — BiaMarkdown
 * Renderizador profissional de Markdown com suporte completo a:
 * - Tabelas estilizadas com scroll horizontal
 * - Blocos de código com highlight
 * - Listas ordenadas e não ordenadas
 * - Blockquotes / avisos
 * - Badges de status
 * - Checkboxes interativos
 * - Headers hierárquicos
 */

import React from "react"
import { cn } from "@/lib/utils/helpers"

interface BiaMarkdownProps {
  content: string
  className?: string
  compact?: boolean
}


// ─── Inline markdown (bold, italic, code, links) ───────────────────────────
function InlineMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const remaining = text
  let key = 0

  // Processar sequencialmente: bold, italic, code, links
  const patterns = [
    { regex: /\*\*\*(.+?)\*\*\*/g, render: (m: string) => <strong key={key++} className="font-bold text-white italic">{m}</strong> },
    { regex: /\*\*(.+?)\*\*/g,     render: (m: string) => <strong key={key++} className="font-semibold text-white">{m}</strong> },
    { regex: /\*(.+?)\*/g,         render: (m: string) => <em key={key++} className="italic text-indigo-200">{m}</em> },
    { regex: /`(.+?)`/g,           render: (m: string) => <code key={key++} className="bg-indigo-950/60 text-indigo-200 px-1.5 py-0.5 rounded text-[0.82em] font-mono border border-indigo-800/40">{m}</code> },
  ]

  // Simple inline parser
  const segments = remaining.split(/(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*|`.+?`)/g)
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.startsWith("***") && seg.endsWith("***"))
          return <strong key={i} className="font-bold text-white italic">{seg.slice(3, -3)}</strong>
        if (seg.startsWith("**") && seg.endsWith("**"))
          return <strong key={i} className="font-semibold text-white">{seg.slice(2, -2)}</strong>
        if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2)
          return <em key={i} className="italic text-indigo-200">{seg.slice(1, -1)}</em>
        if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2)
          return <code key={i} className="bg-indigo-950/60 text-indigo-200 px-1.5 py-0.5 rounded text-[0.82em] font-mono border border-indigo-800/40">{seg.slice(1, -1)}</code>
        return <React.Fragment key={i}>{seg}</React.Fragment>
      })}
    </>
  )
  void parts; void patterns; void remaining
}

// ─── Renderiza bloco de tabela ──────────────────────────────────────────────
function TableBlock({ block }: { block: string }) {
  const lines = block.trim().split("\n")
  const tableLines = lines.filter(l => l.trim().startsWith("|"))
  if (tableLines.length < 2) return <pre className="text-gray-400 text-xs">{block}</pre>

  const parseRow = (line: string) =>
    line.trim().slice(1, -1).split("|").map(c => c.trim())

  const headers = parseRow(tableLines[0])
  const dataRows: string[][] = []
  for (let i = 1; i < tableLines.length; i++) {
    const row = tableLines[i]
    if (row.replace(/[\|\-\s:]/g, "").length === 0) continue
    dataRows.push(parseRow(row))
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/8 my-4">
      <table className="w-full text-sm border-collapse min-w-[400px]">
        <thead>
          <tr className="bg-indigo-900/40">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left text-xs font-semibold text-indigo-200 px-4 py-2.5 border-b border-white/10 whitespace-nowrap"
              >
                <InlineMarkdown text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr
              key={ri}
              className={cn(
                "border-b border-white/5 transition-colors hover:bg-white/3",
                ri % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.03]"
              )}
            >
              {headers.map((_, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "px-4 py-2.5 text-xs align-top",
                    ci === 0 ? "text-gray-200 font-medium" : "text-gray-400"
                  )}
                >
                  <InlineMarkdown text={row[ci] ?? ""} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Renderiza bloco de código ─────────────────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-white/8">
      {lang && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/8">
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{lang}</span>
        </div>
      )}
      <pre className="bg-[#0d0d1f] p-4 overflow-x-auto text-xs font-mono text-green-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────
export function BiaMarkdown({ content, className, compact = false }: BiaMarkdownProps) {
  if (!content) return null

  // Dividir em blocos por linhas em branco duplas
  const blocks = content.split(/\n\n+/)

  const rendered: React.ReactNode[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i].trim()
    if (!block) { i++; continue }

    const lines = block.split("\n")

    // ── Código fenced ──────────────────────────────────────────────────────
    if (block.startsWith("```")) {
      const langMatch = block.match(/^```(\w*)/)
      const lang = langMatch?.[1] || undefined
      const code = block.replace(/^```\w*\n?/, "").replace(/```$/, "").trim()
      rendered.push(<CodeBlock key={i} code={code} lang={lang} />)
      i++; continue
    }

    // ── Tabela Markdown ────────────────────────────────────────────────────
    if (lines[0]?.trim().startsWith("|")) {
      rendered.push(<TableBlock key={i} block={block} />)
      i++; continue
    }

    // ── Headers ────────────────────────────────────────────────────────────
    if (lines[0]?.startsWith("# ")) {
      const text = lines[0].replace(/^# /, "")
      rendered.push(
        <div key={i} className="mt-8 mb-4 pb-3 border-b-2 border-indigo-500/30">
          <h1 className="text-xl font-bold text-white tracking-tight">
            <InlineMarkdown text={text} />
          </h1>
          {lines.slice(1).join("\n").trim() && (
            <p className="text-sm text-gray-400 mt-1">{lines.slice(1).join(" ").trim()}</p>
          )}
        </div>
      )
      i++; continue
    }

    if (lines[0]?.startsWith("## ")) {
      const text = lines[0].replace(/^## /, "")
      rendered.push(
        <div key={i} className={cn("mt-6 mb-3", compact && "mt-4 mb-2")}>
          <h2 className="flex items-center gap-2.5 text-base font-bold text-indigo-300">
            <span className="w-1 h-5 rounded-full bg-indigo-500 shrink-0" />
            <InlineMarkdown text={text} />
          </h2>
          {lines.slice(1).join("\n").trim() && (
            <p className="text-sm text-gray-400 mt-1 ml-3.5">{lines.slice(1).join(" ").trim()}</p>
          )}
        </div>
      )
      i++; continue
    }

    if (lines[0]?.startsWith("### ")) {
      const text = lines[0].replace(/^### /, "")
      rendered.push(
        <h3 key={i} className="mt-4 mb-2 text-sm font-semibold text-indigo-200/80 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400/60 shrink-0" />
          <InlineMarkdown text={text} />
        </h3>
      )
      i++; continue
    }

    if (lines[0]?.startsWith("#### ")) {
      const text = lines[0].replace(/^#### /, "")
      rendered.push(
        <h4 key={i} className="mt-3 mb-1.5 text-sm font-semibold text-gray-300">
          <InlineMarkdown text={text} />
        </h4>
      )
      i++; continue
    }

    // ── HR ─────────────────────────────────────────────────────────────────
    if (block === "---" || block === "***" || block === "___") {
      rendered.push(<hr key={i} className="border-white/10 my-5" />)
      i++; continue
    }

    // ── Blockquote ─────────────────────────────────────────────────────────
    if (lines.every(l => l.startsWith(">"))) {
      const text = lines.map(l => l.replace(/^>\s?/, "")).join("\n")
      const isWarning = text.toLowerCase().includes("⚠️") || text.toLowerCase().includes("aviso")
      const isInfo    = text.toLowerCase().includes("ℹ️") || text.toLowerCase().includes("nota")
      rendered.push(
        <blockquote
          key={i}
          className={cn(
            "my-3 pl-4 py-3 pr-4 rounded-r-xl border-l-4 text-sm leading-relaxed",
            isWarning
              ? "border-l-amber-400 bg-amber-500/8 text-amber-200/90"
              : isInfo
              ? "border-l-blue-400 bg-blue-500/8 text-blue-200/90"
              : "border-l-violet-400 bg-violet-500/8 text-violet-200/90"
          )}
        >
          <InlineMarkdown text={text} />
        </blockquote>
      )
      i++; continue
    }

    // ── Listas ─────────────────────────────────────────────────────────────
    const isOrderedList   = lines.some(l => /^\d+[\.\)]\s/.test(l))
    const isUnorderedList = lines.some(l => /^[-*+]\s/.test(l))
    const isCheckboxList  = lines.some(l => /^[-*]\s\[[ xX]\]/.test(l))

    if (isCheckboxList) {
      rendered.push(
        <ul key={i} className="my-3 space-y-1.5">
          {lines.filter(l => l.trim()).map((line, li) => {
            const checked = /\[x\]/i.test(line)
            const text = line.replace(/^[-*]\s\[[ xX]\]\s?/, "")
            return (
              <li key={li} className="flex items-start gap-2.5 text-sm">
                <span className={cn(
                  "flex-shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center text-[10px]",
                  checked
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "bg-white/5 border-white/15 text-transparent"
                )}>
                  {checked && "✓"}
                </span>
                <span className={checked ? "text-gray-400 line-through" : "text-gray-300"}>
                  <InlineMarkdown text={text} />
                </span>
              </li>
            )
          })}
        </ul>
      )
      i++; continue
    }

    if (isOrderedList) {
      const items = lines.filter(l => l.trim()).map(l => l.replace(/^\d+[\.\)]\s/, ""))
      rendered.push(
        <ol key={i} className="my-3 space-y-1.5 pl-1">
          {items.map((item, li) => (
            <li key={li} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-[10px] font-bold text-indigo-400 mt-0.5">
                {li + 1}
              </span>
              <span className="leading-relaxed"><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ol>
      )
      i++; continue
    }

    if (isUnorderedList) {
      const items = lines.filter(l => l.trim()).map(l => l.replace(/^[-*+]\s/, ""))
      rendered.push(
        <ul key={i} className="my-3 space-y-1.5 pl-1">
          {items.map((item, li) => (
            <li key={li} className="flex items-start gap-2.5 text-sm text-gray-300">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400/60 mt-2" />
              <span className="leading-relaxed"><InlineMarkdown text={item} /></span>
            </li>
          ))}
        </ul>
      )
      i++; continue
    }

    // ── Parágrafo normal ───────────────────────────────────────────────────
    rendered.push(
      <p key={i} className="text-sm text-gray-300 leading-relaxed my-2">
        {lines.map((line, li) => (
          <React.Fragment key={li}>
            {li > 0 && <br />}
            <InlineMarkdown text={line} />
          </React.Fragment>
        ))}
      </p>
    )
    i++
  }

  return (
    <div className={cn("bia-markdown", className)}>
      {rendered}
    </div>
  )
}

export default BiaMarkdown
