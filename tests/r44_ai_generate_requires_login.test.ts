/**
 * R44 · /api/bioprint/model/ai-generate exige login antes de ler o corpo ou chamar a IA.
 * (Teste estático do código-fonte — o projeto não sobe o runtime do Next nos testes.)
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const src = readFileSync(resolve(process.cwd(), "src/app/api/bioprint/model/ai-generate/route.ts"), "utf8")
const iPost = src.indexOf("export async function POST")
const iGet = src.indexOf("export async function GET")
const post = src.slice(iPost, iGet)
const get = src.slice(iGet)

describe("R44 · ai-generate exige login", () => {
  it("importa o auth do projeto", () => {
    expect(src).toContain('import { auth } from "@/lib/auth/config"')
  })
  it("POST: sessão verificada antes do corpo, da chave e da chamada ao modelo", () => {
    const iAuth = post.indexOf("await auth()")
    expect(iAuth).toBeGreaterThan(-1)
    expect(post.indexOf("status: 401")).toBeGreaterThan(iAuth)
    for (const later of ["req.json()", "process.env.ANTHROPIC_API_KEY", "new Anthropic("]) {
      expect(post.indexOf(later), later).toBeGreaterThan(iAuth)
    }
  })
  it("GET: não expõe metadados sem sessão", () => {
    const iAuth = get.indexOf("await auth()")
    expect(iAuth).toBeGreaterThan(-1)
    expect(get.indexOf("status: 401")).toBeGreaterThan(iAuth)
    expect(get.indexOf("hasApiKey")).toBeGreaterThan(iAuth)
  })
})
