/**
 * BIA · Academy · Utilitários de YouTube — R13.10.1
 *
 * Aceita várias formas de input e extrai o video ID de 11 caracteres:
 *   - ID puro:        "dQw4w9WgXcQ"                              → "dQw4w9WgXcQ"
 *   - Watch URL:      "https://www.youtube.com/watch?v=dQw4w9WgXcQ" → "dQw4w9WgXcQ"
 *   - Short URL:      "https://youtu.be/dQw4w9WgXcQ"              → "dQw4w9WgXcQ"
 *   - Embed URL:      "https://www.youtube.com/embed/dQw4w9WgXcQ" → "dQw4w9WgXcQ"
 *   - Shorts URL:     "https://youtube.com/shorts/dQw4w9WgXcQ"    → "dQw4w9WgXcQ"
 *   - Com querystring:"https://youtu.be/dQw4w9WgXcQ?t=42"         → "dQw4w9WgXcQ"
 *   - Placeholder R13.01: "PLACEHOLDER_M01_L01"                   → "PLACEHOLDER_M01_L01" (aceita)
 *
 * Retorna string vazia se não conseguir extrair.
 *
 * Regra: ID válido do YouTube é EXATAMENTE 11 caracteres [A-Za-z0-9_-]
 * Placeholders R13.01 (formato PLACEHOLDER_M01_L01) também são aceitos para
 * não bloquear módulos ainda-não-gravados.
 */

const YT_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const PLACEHOLDER_PATTERN = /^PLACEHOLDER(_[A-Z0-9]+)*$/

/**
 * Extrai o video ID de qualquer forma de input.
 * @param input URL completa, ID puro, ou placeholder
 * @returns ID (11 chars) ou placeholder aceito, ou string vazia se inválido
 */
export function extractYoutubeId(input: string | null | undefined): string {
  if (!input) return ""
  const s = input.trim()
  if (!s) return ""

  // 1) Já é um ID puro válido? (11 chars)
  if (YT_ID_PATTERN.test(s)) return s

  // 2) Placeholder R13.01? (formato PLACEHOLDER_M01_L01)
  if (PLACEHOLDER_PATTERN.test(s)) return s

  // 3) Tenta extrair de URL
  //    Padrões: v=XXX, /XXX no path (embed/shorts/youtu.be), sem tolerar chars inválidos
  try {
    // Se não parece URL, força adicionar https:// pro URL construir
    const urlLike = s.match(/^https?:\/\//) ? s : `https://${s}`
    const u = new URL(urlLike)

    // Caso youtube.com/watch?v=XXX
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v")
      if (v && YT_ID_PATTERN.test(v)) return v

      // Caso /embed/XXX ou /shorts/XXX ou /v/XXX
      const pathParts = u.pathname.split("/").filter(Boolean)
      // Path: [embed|shorts|v, ID, ...]
      if (pathParts.length >= 2) {
        const candidate = pathParts[1]
        if (YT_ID_PATTERN.test(candidate)) return candidate
      }
    }

    // Caso youtu.be/XXX
    if (u.hostname === "youtu.be" || u.hostname === "www.youtu.be") {
      const pathParts = u.pathname.split("/").filter(Boolean)
      if (pathParts.length >= 1) {
        const candidate = pathParts[0]
        if (YT_ID_PATTERN.test(candidate)) return candidate
      }
    }
  } catch {
    // URL malformada — cai no fallback
  }

  // 4) Último recurso: regex em qualquer lugar do input
  //    (pega ID de "?v=XXX" mesmo em URLs esquisitas)
  const m = s.match(/(?:v=|\/embed\/|\/shorts\/|\/v\/|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (m && m[1]) return m[1]

  return "" // não conseguiu
}

/**
 * True se o input contém um ID YouTube válido extraível.
 */
export function isValidYoutubeInput(input: string | null | undefined): boolean {
  return extractYoutubeId(input).length > 0
}

/**
 * Constrói uma URL de embed a partir de um ID (para preview no CRUD).
 */
export function buildYoutubeEmbedUrl(videoId: string): string {
  if (!videoId) return ""
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
}

/**
 * Constrói URL de thumbnail (útil no CRUD para preview visual).
 */
export function buildYoutubeThumbnailUrl(videoId: string, quality: "default" | "mqdefault" | "hqdefault" | "sddefault" | "maxresdefault" = "hqdefault"): string {
  if (!videoId) return ""
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}
