/**
 * ═══════════════════════════════════════════════════════════════════════
 *  BIA · Password Reset Tokens (R12.30)
 *  ─────────────────────────────────────────────────────────────────────
 *  Geração e validação criptograficamente segura de tokens de reset.
 *
 *  Garantias:
 *    · Token em claro: 32 bytes aleatórios (256 bits) em base64url.
 *      Equivalente a uma senha de ~43 caracteres aleatórios — impossível
 *      de adivinhar por força bruta.
 *    · DB armazena APENAS o hash SHA-256 (Web Crypto API, edge-safe).
 *      Mesmo se o DB vazar, atacante não pode reusar tokens.
 *    · TTL curto: 30 minutos (constante TOKEN_TTL_MIN).
 *    · Token de uso ÚNICO: marca usedAt ao consumir.
 *
 *  Web Crypto API é usada (não Node `crypto`) para funcionar tanto em
 *  Node runtime (next dev) quanto em edge runtimes futuros.
 *
 *  Janaina Dernowsek / Quantis Biotechnology — 2026
 * ═══════════════════════════════════════════════════════════════════════
 */

/** TTL do token em MINUTOS. */
export const TOKEN_TTL_MIN = 30

/** Tamanho do token em bytes (256 bits). */
const TOKEN_BYTES = 32

/**
 * Gera um par {plainToken, tokenHash}.
 *  · plainToken → enviado ao usuário (email ou UI fallback)
 *  · tokenHash  → armazenado no DB (PasswordResetToken.tokenHash)
 */
export async function generateResetToken(): Promise<{
  plainToken: string
  tokenHash: string
}> {
  const bytes = new Uint8Array(TOKEN_BYTES)
  crypto.getRandomValues(bytes)
  const plainToken = bytesToBase64Url(bytes)
  const tokenHash = await sha256Hex(plainToken)
  return { plainToken, tokenHash }
}

/**
 * Recebe o token em claro (vindo do query string `?token=...`) e retorna
 * o hash que vamos comparar contra o DB.
 */
export async function hashToken(plainToken: string): Promise<string> {
  return sha256Hex(plainToken)
}

/** Validação básica de formato (não confirma existência no DB). */
export function isWellFormedToken(t: unknown): t is string {
  return typeof t === "string" && t.length >= 32 && t.length <= 128 && /^[A-Za-z0-9_-]+$/.test(t)
}

/** Data de expiração a partir de agora. */
export function tokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + TOKEN_TTL_MIN * 60 * 1000)
}

// ─── helpers internos ───

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", enc)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function bytesToBase64Url(bytes: Uint8Array): string {
  // base64 sem dependências externas — funciona em Node 18+ e edge
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  const b64 = typeof btoa !== "undefined"
    ? btoa(bin)
    : Buffer.from(bin, "binary").toString("base64")
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
