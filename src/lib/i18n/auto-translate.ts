/**
 * Auto-Translate (R12.2)
 *
 * Tradução automática DOM-wide via MyMemory API (gratuita, sem chave, 5k chars/dia).
 * Estratégia:
 *   1. Quando locale != 'pt', percorre text nodes da página
 *   2. Para cada texto não-vazio, traduz via API (com cache em localStorage)
 *   3. Substitui o textContent do node
 *   4. MutationObserver re-traduz quando novo conteúdo é adicionado (router push, modals)
 *
 * Notas:
 *   - PT é o idioma fonte (não traduz)
 *   - Cache por (locale, hash do texto original) — evita rechamadas
 *   - Marca nodes traduzidos com data-bia-translated="<locale>" para idempotência
 *   - Skip de elementos: <code>, <pre>, <script>, <style>, [data-no-translate]
 */

import type { Locale } from "@/lib/i18n/locales"

const CACHE_PREFIX = "bia-tr-cache-v2"
const TARGET_MAP: Record<Exclude<Locale, "pt">, string> = {
  en: "en",
  es: "es",
}

// Skip tags
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "CODE", "PRE", "NOSCRIPT", "TEXTAREA", "INPUT",
  "SVG", "PATH", "CIRCLE", "RECT", "LINE", "POLYGON", "POLYLINE",
  "G", "DEFS", "USE", "MASK", "CLIPPATH", "STOP", "LINEARGRADIENT",
])

function getCacheKey(locale: string, text: string): string {
  // simple hash to keep keys short
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }
  return `${CACHE_PREFIX}:${locale}:${hash}`
}

function getCached(locale: string, text: string): string | null {
  try {
    return localStorage.getItem(getCacheKey(locale, text))
  } catch {
    return null
  }
}

function setCached(locale: string, text: string, translated: string): void {
  try {
    localStorage.setItem(getCacheKey(locale, text), translated)
  } catch {
    // localStorage may be full — silently ignore
  }
}

/**
 * Traduz uma string via MyMemory API (gratuita, sem chave).
 * Retorna string original em caso de falha.
 */
async function translateString(text: string, target: string): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return text
  if (trimmed.length > 500) return text // limite da API

  const cached = getCached(target, trimmed)
  if (cached !== null) return preservePadding(text, cached)

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=pt|${target}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const resp = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!resp.ok) return text
    const data = await resp.json()
    let translated: string = data?.responseData?.translatedText ?? trimmed
    // Corrige mojibake (UTF-8 mal interpretado como Latin-1) — comum na API
    translated = fixMojibake(translated)
    // Filtra mensagens de erro da API
    if (translated.startsWith("MYMEMORY WARNING") || translated.includes("QUOTA EXCEEDED")) {
      return text
    }
    if (translated && translated.toLowerCase() !== trimmed.toLowerCase()) {
      setCached(target, trimmed, translated)
      return preservePadding(text, translated)
    }
    return text
  } catch {
    return text
  }
}

/**
 * Corrige mojibake comum da MyMemory API (UTF-8 → Latin-1 misinterpreted).
 * Exemplo: "crÃ©ditos" → "créditos"
 */
function fixMojibake(text: string): string {
  if (!/[ÃÂ]/.test(text)) return text
  try {
    // Re-interpretar como Latin-1 e decodificar como UTF-8
    const bytes = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
    // Só usa o decoded se ele não contém replacement chars
    if (!decoded.includes("\uFFFD")) return decoded
  } catch {
    // ignora
  }
  return text
}

function preservePadding(original: string, translated: string): string {
  // Preserva espaços do início/fim do texto original
  const leadMatch = original.match(/^\s*/)
  const trailMatch = original.match(/\s*$/)
  const lead = leadMatch ? leadMatch[0] : ""
  const trail = trailMatch ? trailMatch[0] : ""
  return lead + translated.trim() + trail
}

/**
 * Verifica se um elemento deve ser ignorado pela tradução.
 */
function shouldSkipElement(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true
  if (el.hasAttribute("data-no-translate")) return true
  // Inputs com type específico
  const tagName = el.tagName
  if (tagName === "INPUT" || tagName === "TEXTAREA") return true
  return false
}

/**
 * Verifica se um node de texto é candidato à tradução.
 */
function isTranslatableTextNode(node: Node): boolean {
  if (node.nodeType !== Node.TEXT_NODE) return false
  const text = node.textContent ?? ""
  if (!text.trim()) return false
  if (text.length < 2) return false
  // Skip números puros, símbolos, URLs
  if (/^[\d\s\.,%·:/\-+()$€£R$#@]+$/.test(text.trim())) return false
  if (/^https?:\/\//.test(text.trim())) return false

  // Verifica ancestrais
  let parent: Node | null = node.parentNode
  while (parent && parent.nodeType === Node.ELEMENT_NODE) {
    if (shouldSkipElement(parent as Element)) return false
    parent = parent.parentNode
  }
  return true
}

/**
 * Coleta text nodes traduzíveis dentro de um root, evitando re-traduzir os já marcados.
 */
function collectTextNodes(root: Node, locale: string): Text[] {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (!isTranslatableTextNode(node)) return NodeFilter.FILTER_REJECT
      const parent = node.parentElement
      if (parent?.dataset?.biaTranslated === locale) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let n: Node | null
  while ((n = walker.nextNode())) {
    nodes.push(n as Text)
  }
  return nodes
}

/**
 * Restaura textos originais (usado quando muda para pt).
 */
function restoreOriginals(): void {
  const els = document.querySelectorAll<HTMLElement>("[data-bia-original]")
  els.forEach((el) => {
    if (el.dataset.biaOriginal !== undefined) {
      const original = el.dataset.biaOriginal
      // Reaplica como text content do primeiro text child
      const firstText = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE) as Text | undefined
      if (firstText) {
        firstText.textContent = original
      }
      delete el.dataset.biaTranslated
    }
  })
  // Limpa marcador para reescanear
  document.querySelectorAll<HTMLElement>("[data-bia-translated]").forEach((el) => {
    delete el.dataset.biaTranslated
  })
}

let currentLocale: Locale = "pt"
let observer: MutationObserver | null = null
let translationInProgress = false
let pendingRoots = new Set<Node>()
let scanTimer: ReturnType<typeof setTimeout> | null = null

async function translateNodes(target: string, nodes: Text[]): Promise<void> {
  // batch em grupos de 5 paralelos
  const BATCH = 5
  for (let i = 0; i < nodes.length; i += BATCH) {
    const batch = nodes.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (node) => {
        const original = node.textContent ?? ""
        if (!original.trim()) return
        const translated = await translateString(original, target)
        if (translated !== original) {
          // Salva original no parent para futuro restore
          const parent = node.parentElement
          if (parent && !parent.dataset.biaOriginal) {
            parent.dataset.biaOriginal = original
          }
          node.textContent = translated
          if (parent) parent.dataset.biaTranslated = target
        } else if (node.parentElement) {
          // marca como visitado mesmo se não traduziu para evitar reprocessar
          node.parentElement.dataset.biaTranslated = target
        }
      })
    )
  }
}

async function processRoots(target: string): Promise<void> {
  if (translationInProgress) return
  translationInProgress = true
  try {
    const roots = Array.from(pendingRoots)
    pendingRoots.clear()
    const allNodes: Text[] = []
    for (const root of roots) {
      allNodes.push(...collectTextNodes(root, target))
    }
    if (allNodes.length > 0) {
      await translateNodes(target, allNodes)
    }
  } finally {
    translationInProgress = false
    // se mais foi adicionado durante a tradução, processa de novo
    if (pendingRoots.size > 0) {
      scheduleScan(target)
    }
  }
}

function scheduleScan(target: string): void {
  if (scanTimer) clearTimeout(scanTimer)
  scanTimer = setTimeout(() => processRoots(target), 250)
}

function startObserver(target: string): void {
  if (observer) observer.disconnect()
  observer = new MutationObserver((mutations) => {
    let added = false
    for (const m of mutations) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) {
            pendingRoots.add(n)
            added = true
          }
        })
      } else if (m.type === "characterData") {
        if (m.target.parentNode) {
          pendingRoots.add(m.target.parentNode)
          added = true
        }
      }
    }
    if (added) scheduleScan(target)
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

function stopObserver(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (scanTimer) {
    clearTimeout(scanTimer)
    scanTimer = null
  }
}

/**
 * Entrypoint principal — chamado pelo LocaleProvider quando o locale muda.
 */
export function applyAutoTranslate(locale: Locale): void {
  if (typeof window === "undefined" || typeof document === "undefined") return

  // Mesmo locale → no-op
  if (locale === currentLocale) {
    // mas se trocou de pt para pt depois de en, restaura
    if (locale === "pt") {
      stopObserver()
      restoreOriginals()
    }
    return
  }

  const prevLocale = currentLocale
  currentLocale = locale

  // Mudou para PT: restaura originais e para observer
  if (locale === "pt") {
    stopObserver()
    restoreOriginals()
    return
  }

  // Mudou de en↔es ou pt→en/es: limpa traduções antigas e re-traduz
  if (prevLocale !== "pt") {
    restoreOriginals()
  }

  const target = TARGET_MAP[locale]
  pendingRoots.add(document.body)
  scheduleScan(target)
  startObserver(target)
}
