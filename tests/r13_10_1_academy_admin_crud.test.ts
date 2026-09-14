/**
 * ═══════════════════════════════════════════════════════════════════════
 *  R13.10.1 — BIA Academy · CRUD admin de módulos, aulas e anexos
 *  ─────────────────────────────────────────────────────────────────────
 *  Entrega:
 *   - Seed dos 11 módulos placeholder (M02-M12) como drafts no Neon
 *   - Helper extractYoutubeId: URL/ID/placeholder → ID válido
 *   - Helper requireAcademyAdmin: SUPERADMIN + ADMIN + INSTRUCTOR (opção B)
 *   - APIs REST: /api/admin/academy/{modules,lessons,attachments}
 *   - Páginas server: /dashboard/admin/academy/* (lista + edição)
 *   - Atalho no /dashboard/admin
 *
 *  Decisões locked (Janaina 2026-08-07):
 *   1. Autorização Opção B: SUPERADMIN + ADMIN + INSTRUCTOR
 *   2. Entrada de vídeo: aceita URL completa OU ID puro (extractor extrai)
 *   3. 11 módulos placeholder (M02-M12) criados como drafts
 *
 *  Cobre:
 *   A) extractYoutubeId — todos formatos de entrada + placeholders
 *   B) requireAcademyAdmin — 3 roles autorizadas + 401/403
 *   C) API modules — GET, POST, PATCH, DELETE + validação Zod + slug único
 *   D) API lessons — POST, PATCH, DELETE + gate publicada + youtubeInput
 *   E) API attachments — POST, DELETE + validação URL/kind
 *   F) Páginas admin — server components com gate + testIds
 *   G) Seed script — idempotente + preserva isPublished + 11 módulos
 * ═══════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  extractYoutubeId,
  isValidYoutubeInput,
  buildYoutubeEmbedUrl,
  buildYoutubeThumbnailUrl,
} from "../src/lib/academy/youtube"

const ROOT = resolve(__dirname, "..")
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8")
const has = (rel: string) => existsSync(resolve(ROOT, rel))

// ══════════════════════════════════════════════════════════════════════
//   R13.10.1.A · extractYoutubeId — helper puro
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.1.A · extractYoutubeId (helper puro)", () => {
  it("ID puro de 11 chars: passa direto", () => {
    expect(extractYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(extractYoutubeId("aBcDeFgHiJk")).toBe("aBcDeFgHiJk")
    expect(extractYoutubeId("_-_-_-_-_-_")).toBe("_-_-_-_-_-_")
  })

  it("URL youtu.be curta: extrai o ID", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ?t=42")).toBe("dQw4w9WgXcQ")
  })

  it("URL youtube.com/watch?v=: extrai o ID", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(extractYoutubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s")).toBe("dQw4w9WgXcQ")
  })

  it("URL /embed/: extrai o ID", () => {
    expect(extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0")).toBe("dQw4w9WgXcQ")
  })

  it("URL /shorts/: extrai o ID", () => {
    expect(extractYoutubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("Placeholder R13.01 (PLACEHOLDER_M01_L01): aceita", () => {
    expect(extractYoutubeId("PLACEHOLDER_M01_L01")).toBe("PLACEHOLDER_M01_L01")
    expect(extractYoutubeId("PLACEHOLDER_M12_L05")).toBe("PLACEHOLDER_M12_L05")
  })

  it("Entrada inválida: retorna string vazia", () => {
    expect(extractYoutubeId("")).toBe("")
    expect(extractYoutubeId(null)).toBe("")
    expect(extractYoutubeId(undefined)).toBe("")
    expect(extractYoutubeId("abc")).toBe("") // curto demais
    expect(extractYoutubeId("https://google.com")).toBe("")
    expect(extractYoutubeId("apenas texto sem url")).toBe("")
  })

  it("Trim de espaços em branco", () => {
    expect(extractYoutubeId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ")
    expect(extractYoutubeId("\thttps://youtu.be/dQw4w9WgXcQ\n")).toBe("dQw4w9WgXcQ")
  })

  it("isValidYoutubeInput retorna true/false coerente", () => {
    expect(isValidYoutubeInput("dQw4w9WgXcQ")).toBe(true)
    expect(isValidYoutubeInput("https://youtu.be/dQw4w9WgXcQ")).toBe(true)
    expect(isValidYoutubeInput("PLACEHOLDER_M02_L01")).toBe(true)
    expect(isValidYoutubeInput("")).toBe(false)
    expect(isValidYoutubeInput("invalido")).toBe(false)
  })

  it("buildYoutubeEmbedUrl monta URL correta", () => {
    expect(buildYoutubeEmbedUrl("dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
    )
    expect(buildYoutubeEmbedUrl("")).toBe("")
  })

  it("buildYoutubeThumbnailUrl monta URL correta", () => {
    expect(buildYoutubeThumbnailUrl("dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    )
    expect(buildYoutubeThumbnailUrl("dQw4w9WgXcQ", "maxresdefault")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    )
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.1.B · requireAcademyAdmin (auth helper)
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.1.B · Helper requireAcademyAdmin", () => {
  const path = "src/lib/academy/admin-auth.ts"
  const src = read(path)

  it("Arquivo existe", () => {
    expect(has(path)).toBe(true)
  })

  it("Exporta requireAcademyAdmin e checkAcademyAdminOrRedirect", () => {
    expect(src).toMatch(/export\s+async\s+function\s+requireAcademyAdmin/)
    expect(src).toMatch(/export\s+async\s+function\s+checkAcademyAdminOrRedirect/)
  })

  it("Aceita SUPERADMIN + ADMIN + INSTRUCTOR (opção B da Janaina)", () => {
    expect(src).toMatch(/isSuperAdmin/)
    expect(src).toMatch(/["']ADMIN["']/)
    expect(src).toMatch(/["']INSTRUCTOR["']/)
  })

  it("Retorna 401 para anônimo, 403 para role insuficiente", () => {
    expect(src).toMatch(/status:\s*401/)
    expect(src).toMatch(/status:\s*403/)
  })

  it("checkAcademyAdminOrRedirect retorna path ou null", () => {
    expect(src).toMatch(/callbackUrl=\/dashboard\/admin\/academy/)
    expect(src).toMatch(/return\s+null/)
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.1.C · API modules — CRUD
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.1.C · API /api/admin/academy/modules", () => {
  const listPath = "src/app/api/admin/academy/modules/route.ts"
  const itemPath = "src/app/api/admin/academy/modules/[moduleId]/route.ts"

  it("Ambos os arquivos existem", () => {
    expect(has(listPath)).toBe(true)
    expect(has(itemPath)).toBe(true)
  })

  it("Exporta GET + POST na collection route", () => {
    const src = read(listPath)
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
    expect(src).toMatch(/export\s+async\s+function\s+POST/)
  })

  it("Exporta PATCH + DELETE na item route", () => {
    const src = read(itemPath)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/)
  })

  it("Valida com Zod (slug kebab-case)", () => {
    const src = read(listPath)
    expect(src).toMatch(/from\s+["']zod["']/)
    expect(src).toMatch(/kebab-case/i)
  })

  it("Retorna 409 se slug já existe", () => {
    const src = read(listPath)
    expect(src).toMatch(/SLUG_EXISTS/)
    expect(src).toMatch(/409/)
  })

  it("DELETE não apaga se módulo tem aulas", () => {
    const src = read(itemPath)
    expect(src).toMatch(/HAS_LESSONS/)
    expect(src).toMatch(/lessons/)
  })

  it("Usa requireAcademyAdmin em todos handlers", () => {
    for (const p of [listPath, itemPath]) {
      const src = read(p)
      expect(src, `${p} sem gate de auth`).toMatch(/requireAcademyAdmin/)
    }
  })

  it("dynamic = force-dynamic em ambos", () => {
    for (const p of [listPath, itemPath]) {
      const src = read(p)
      expect(src).toMatch(/dynamic\s*=\s*["']force-dynamic["']/)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.1.D · API lessons — CRUD
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.1.D · API /api/admin/academy/lessons", () => {
  const listPath = "src/app/api/admin/academy/lessons/route.ts"
  const itemPath = "src/app/api/admin/academy/lessons/[lessonId]/route.ts"

  it("Ambos arquivos existem", () => {
    expect(has(listPath)).toBe(true)
    expect(has(itemPath)).toBe(true)
  })

  it("POST cria aula com Zod + extractYoutubeId", () => {
    const src = read(listPath)
    expect(src).toMatch(/export\s+async\s+function\s+POST/)
    expect(src).toMatch(/extractYoutubeId/)
    expect(src).toMatch(/INVALID_YOUTUBE/)
  })

  it("POST aceita URL completa ou ID puro (youtubeInput)", () => {
    const src = read(listPath)
    expect(src).toMatch(/youtubeInput/)
    // Retorna erro se não consegue extrair
    expect(src).toMatch(/Cole a URL completa|cole a URL/i)
  })

  it("POST rejeita slug duplicado no mesmo módulo (409)", () => {
    const src = read(listPath)
    expect(src).toMatch(/SLUG_EXISTS_IN_MODULE/)
    expect(src).toMatch(/409/)
  })

  it("PATCH atualiza campos + gerencia publishedAt automaticamente", () => {
    const src = read(itemPath)
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/)
    expect(src).toMatch(/publishedAt/)
  })

  it("DELETE bloqueia apagar aula PUBLICADA (protege progresso do aluno)", () => {
    const src = read(itemPath)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/)
    expect(src).toMatch(/PUBLISHED_LESSON/)
    expect(src).toMatch(/Despublique|isPublished=false/)
  })

  it("Todas as rotas usam requireAcademyAdmin", () => {
    for (const p of [listPath, itemPath]) {
      const src = read(p)
      expect(src, `${p} sem gate`).toMatch(/requireAcademyAdmin/)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.1.E · API attachments
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.1.E · API /api/admin/academy/attachments", () => {
  const listPath = "src/app/api/admin/academy/attachments/route.ts"
  const itemPath = "src/app/api/admin/academy/attachments/[attachmentId]/route.ts"

  it("Ambos arquivos existem", () => {
    expect(has(listPath)).toBe(true)
    expect(has(itemPath)).toBe(true)
  })

  it("POST valida kind ∈ {PDF, LINK, STL, GCODE, IMAGE}", () => {
    const src = read(listPath)
    expect(src).toMatch(/PDF/)
    expect(src).toMatch(/LINK/)
    expect(src).toMatch(/STL/)
    expect(src).toMatch(/GCODE/)
    expect(src).toMatch(/IMAGE/)
    expect(src).toMatch(/z\.enum/)
  })

  it("POST valida URL como URL válida", () => {
    const src = read(listPath)
    expect(src).toMatch(/z\.string\(\)\.url\(/)
  })

  it("POST retorna 404 se aula não existe", () => {
    const src = read(listPath)
    expect(src).toMatch(/LESSON_NOT_FOUND/)
  })

  it("DELETE apaga por id", () => {
    const src = read(itemPath)
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/)
    expect(src).toMatch(/attachmentId/)
  })

  it("Ambas rotas usam requireAcademyAdmin", () => {
    for (const p of [listPath, itemPath]) {
      const src = read(p)
      expect(src).toMatch(/requireAcademyAdmin/)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.1.F · Páginas admin
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.1.F · Páginas admin (server components)", () => {
  const listPagePath = "src/app/dashboard/admin/academy/page.tsx"
  const modPagePath = "src/app/dashboard/admin/academy/[moduleSlug]/page.tsx"
  const lessonPagePath = "src/app/dashboard/admin/academy/[moduleSlug]/[lessonSlug]/page.tsx"

  it("As 3 páginas existem", () => {
    expect(has(listPagePath)).toBe(true)
    expect(has(modPagePath)).toBe(true)
    expect(has(lessonPagePath)).toBe(true)
  })

  it("Todas usam checkAcademyAdminOrRedirect (gate no server)", () => {
    for (const p of [listPagePath, modPagePath, lessonPagePath]) {
      const src = read(p)
      expect(src, `${p} sem gate`).toMatch(/checkAcademyAdminOrRedirect/)
    }
  })

  it("Todas são server components (sem 'use client' no topo)", () => {
    for (const p of [listPagePath, modPagePath, lessonPagePath]) {
      const src = read(p)
      expect(src).not.toMatch(/^["']use client["']/m)
    }
  })

  it("Lista de módulos tem testId admin-academy-modules-list", () => {
    const src = read(listPagePath)
    expect(src).toContain("admin-academy-modules-list")
  })

  it("Página de módulo tem ModuleEditForm + NewLessonForm", () => {
    const src = read(modPagePath)
    expect(src).toMatch(/ModuleEditForm/)
    expect(src).toMatch(/NewLessonForm/)
  })

  it("Página de aula tem LessonEditForm + AttachmentsManager", () => {
    const src = read(lessonPagePath)
    expect(src).toMatch(/LessonEditForm/)
    expect(src).toMatch(/AttachmentsManager/)
  })

  it("Componentes client existem", () => {
    const clients = [
      "src/app/dashboard/admin/academy/[moduleSlug]/_components/ModuleEditForm.tsx",
      "src/app/dashboard/admin/academy/[moduleSlug]/_components/NewLessonForm.tsx",
      "src/app/dashboard/admin/academy/[moduleSlug]/[lessonSlug]/_components/LessonEditForm.tsx",
      "src/app/dashboard/admin/academy/[moduleSlug]/[lessonSlug]/_components/AttachmentsManager.tsx",
    ]
    for (const c of clients) {
      expect(has(c), `${c} não existe`).toBe(true)
      const src = read(c)
      expect(src, `${c} não é client component`).toMatch(/^["']use client["']/m)
    }
  })

  it("NewLessonForm aceita URL completa OU ID no campo youtubeInput", () => {
    const src = read("src/app/dashboard/admin/academy/[moduleSlug]/_components/NewLessonForm.tsx")
    expect(src).toMatch(/youtubeInput/)
    expect(src).toMatch(/URL do YouTube/i)
    expect(src).toContain("new-lesson-youtube")
  })

  it("LessonEditForm tem select biaHook com ferramentas da BIA", () => {
    const src = read("src/app/dashboard/admin/academy/[moduleSlug]/[lessonSlug]/_components/LessonEditForm.tsx")
    expect(src).toMatch(/BIA_TOOLS/)
    expect(src).toMatch(/formulator-pro/)
    expect(src).toMatch(/bioprint/)
    expect(src).toMatch(/organoids/)
  })

  it("AttachmentsManager tem os 5 kinds oficiais", () => {
    const src = read("src/app/dashboard/admin/academy/[moduleSlug]/[lessonSlug]/_components/AttachmentsManager.tsx")
    expect(src).toMatch(/KIND_OPTIONS/)
    for (const kind of ["PDF", "LINK", "STL", "GCODE", "IMAGE"]) {
      expect(src, `AttachmentsManager sem ${kind}`).toContain(kind)
    }
  })
})

// ══════════════════════════════════════════════════════════════════════
//   R13.10.1.G · Seed script + atalho no admin
// ══════════════════════════════════════════════════════════════════════
describe("R13.10.1.G · Seed dos módulos 2-12 + atalho admin", () => {
  const seedPath = "scripts/seed-academy-modules-02-12.ts"

  it("Script de seed existe", () => {
    expect(has(seedPath)).toBe(true)
  })

  it("Seed tem os 11 módulos (M02 até M12)", () => {
    const src = read(seedPath)
    // Verifica os slugs oficiais dos 11 módulos
    const slugs = [
      "biomateriais", "biotintas", "bioimpressao-3d", "arquitetura-3d",
      "celulas", "tecidos", "esferoides-organoides", "avaliacao-pos-impressao",
      "translacao", "desenvolvimento-projeto", "projeto-final",
    ]
    for (const s of slugs) {
      expect(src, `slug ${s} ausente do seed`).toContain(s)
    }
  })

  it("Seed é idempotente (upsert / preserva isPublished existente)", () => {
    const src = read(seedPath)
    expect(src).toMatch(/findUnique|upsert/)
    // Comentário explicando que preserva isPublished
    expect(src).toMatch(/preserva\s+isPublished|isPublished\s+preservado/i)
  })

  it("Seed cria como draft (isPublished=false) na primeira execução", () => {
    const src = read(seedPath)
    expect(src).toMatch(/isPublished:\s*false/)
  })

  it("Admin dashboard tem atalho para /dashboard/admin/academy", () => {
    const src = read("src/app/dashboard/admin/page.tsx")
    expect(src).toContain("admin-academy-shortcut")
    expect(src).toMatch(/href=["']\/dashboard\/admin\/academy["']/)
    expect(src).toMatch(/Gerenciar\s+BIA\s+Academy/i)
  })

  it("Admin dashboard importa GraduationCap para o ícone", () => {
    const src = read("src/app/dashboard/admin/page.tsx")
    expect(src).toMatch(/GraduationCap/)
  })
})
