/**
 * R28 · BIA Academy · notificações + descadastro + e-mail (Resend via fetch)
 *
 * Cobre src/lib/academy/notifications.ts com Prisma e fetch mockados:
 *   · token de descadastro HMAC (determinístico, tamanho 32, timing-safe)
 *   · template de e-mail (assunto, saudação, escape HTML, link de descadastro, lista de PDFs)
 *   · createNotification: grava sempre; sem RESEND_API_KEY não envia; respeita notifyEmail;
 *     onlyEmails (teste); contabiliza falhas; sendEmail=false não chama fetch
 *   · listForStudent: flag read + contagem de não lidas
 *   · markRead: "all" vs ids, skipDuplicates
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── mocks ────────────────────────────────────────────────────────────
const db = vi.hoisted(() => ({
  academyEnrollment: { findMany: vi.fn() },
  academyLesson: { findUnique: vi.fn() },
  academyNotification: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  academyNotificationRead: { findMany: vi.fn(), createMany: vi.fn() },
}))
vi.mock("@/lib/db/prisma", () => ({ prisma: db }))

import {
  createNotification,
  listForStudent,
  markRead,
  renderNotificationEmail,
  unsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
  NOTIFICATION_KIND_LABEL,
} from "@/lib/academy/notifications"

const future = new Date(Date.now() + 30 * 86400_000)
const past = new Date(Date.now() - 86400_000)

function students(rows: Array<Partial<{ id: string; email: string; name: string | null; notifyEmail: boolean; accessUntil: Date; completedAt: Date | null }>>) {
  db.academyEnrollment.findMany.mockResolvedValue(
    rows.map((r, i) => ({
      id: r.id ?? `enr${i}`,
      userId: `u${i}`,
      accessUntil: r.accessUntil ?? future,
      completedAt: r.completedAt ?? null,
      notifyEmail: r.notifyEmail ?? true,
      user: { email: r.email ?? `aluno${i}@ex.com`, name: r.name ?? `Aluno ${i}` },
    })),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  for (const t of Object.values(db)) for (const f of Object.values(t)) (f as ReturnType<typeof vi.fn>).mockReset()
  db.academyNotification.create.mockResolvedValue({ id: "n1" })
  db.academyNotification.update.mockResolvedValue({})
  db.academyLesson.findUnique.mockResolvedValue(null)
  process.env.NEXTAUTH_SECRET = "test-secret"
  delete process.env.RESEND_API_KEY
})

// ─── descadastro ──────────────────────────────────────────────────────
describe("unsubscribe token", () => {
  it("é determinístico, tem 32 chars base64url e verifica", () => {
    const t1 = unsubscribeToken("enrA")
    const t2 = unsubscribeToken("enrA")
    expect(t1).toBe(t2)
    expect(t1).toHaveLength(32)
    expect(t1).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(verifyUnsubscribeToken("enrA", t1)).toBe(true)
  })
  it("rejeita token de outra matrícula, vazio ou adulterado", () => {
    const t = unsubscribeToken("enrA")
    expect(verifyUnsubscribeToken("enrB", t)).toBe(false)
    expect(verifyUnsubscribeToken("enrA", "")).toBe(false)
    expect(verifyUnsubscribeToken("enrA", t.slice(0, 31) + (t.endsWith("a") ? "b" : "a"))).toBe(false)
    expect(verifyUnsubscribeToken("enrA", t + "x")).toBe(false)
  })
  it("URL de descadastro carrega e= e t= válidos", () => {
    const u = new URL(unsubscribeUrl("enr/Ç 1"))
    expect(u.pathname).toBe("/api/academy/notifications/unsubscribe")
    expect(u.searchParams.get("e")).toBe("enr/Ç 1")
    expect(verifyUnsubscribeToken("enr/Ç 1", u.searchParams.get("t")!)).toBe(true)
  })
})

// ─── template ─────────────────────────────────────────────────────────
describe("renderNotificationEmail", () => {
  const to = { name: "Dra. Janaína Dernowsek", email: "jana@ex.com", enrollmentId: "enr1" }
  it("assunto com rótulo do tipo, saudação pelo primeiro nome sem título", () => {
    const r = renderNotificationEmail({ kind: "NEW_MATERIAL", title: "PDF novo", body: "Leia." }, to)
    expect(r.subject).toBe(`[BIA Academy] ${NOTIFICATION_KIND_LABEL.NEW_MATERIAL}: PDF novo`)
    expect(r.html).toContain("Olá, Janaína!")
    expect(r.text).toContain("PDF novo")
  })
  it("sem nome (ou nome = parte local do e-mail) usa só 'Olá!'", () => {
    const r1 = renderNotificationEmail({ kind: "ANNOUNCEMENT", title: "t", body: "b" }, { ...to, name: null })
    const r2 = renderNotificationEmail({ kind: "ANNOUNCEMENT", title: "t", body: "b" }, { ...to, name: "jana" })
    expect(r1.html).toContain("Olá!")
    expect(r1.html).not.toContain("Olá, ")
    expect(r2.html).toContain("Olá!")
  })
  it("escapa HTML no título/corpo e lista PDFs com tamanho em MB", () => {
    const r = renderNotificationEmail(
      { kind: "NEW_MATERIAL", title: "<b>x</b>", body: "a & b", files: [{ title: "Guia <1>", sizeBytes: 2 * 1048576 }] },
      to,
    )
    expect(r.html).toContain("&lt;b&gt;x&lt;/b&gt;")
    expect(r.html).toContain("a &amp; b")
    expect(r.html).toContain("Guia &lt;1&gt;")
    expect(r.html).toContain("(2.0 MB)")
    expect(r.text).toContain("• Guia <1>")
  })
  it("link relativo vira absoluto; link absoluto é mantido; sem url → dashboard", () => {
    const rel = renderNotificationEmail({ kind: "NEW_LESSON", title: "t", body: "b", url: "/academy/modules/x/y" }, to)
    const abs = renderNotificationEmail({ kind: "NEW_LESSON", title: "t", body: "b", url: "https://ex.com/z" }, to)
    const none = renderNotificationEmail({ kind: "NEW_LESSON", title: "t", body: "b" }, to)
    expect(rel.text).toMatch(/Abrir: https?:\/\/[^/]+\/academy\/modules\/x\/y/)
    expect(abs.text).toContain("Abrir: https://ex.com/z")
    expect(none.text).toMatch(/Abrir: https?:\/\/[^/]+\/academy\/dashboard/)
  })
  it("inclui link de descadastro assinado da matrícula e módulo·aula quando houver", () => {
    const r = renderNotificationEmail({ kind: "NEW_MATERIAL", title: "t", body: "b", lessonTitle: "Aula 1", moduleTitle: "Mód 0" }, to)
    expect(r.html).toContain(`t=${unsubscribeToken("enr1")}`)
    expect(r.text).toContain(unsubscribeUrl("enr1"))
    expect(r.html).toContain("Mód 0 · Aula 1")
  })
})

// ─── createNotification ──────────────────────────────────────────────
describe("createNotification", () => {
  it("grava e, sem RESEND_API_KEY, marca todos como skipped e não chama fetch", async () => {
    students([{}, {}, {}])
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const r = await createNotification({ kind: "ANNOUNCEMENT", title: "Olá turma", body: "Aviso" })
    expect(db.academyNotification.create).toHaveBeenCalledTimes(1)
    expect(r).toMatchObject({ id: "n1", recipients: 3, emailSent: 0, emailFailed: 0, emailSkipped: 3, emailConfigured: false })
    expect(r.errors[0]).toMatch(/RESEND_API_KEY/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("ignora matrículas expiradas no total de destinatários", async () => {
    students([{ accessUntil: past }, {}])
    const r = await createNotification({ kind: "ANNOUNCEMENT", title: "t", body: "b", sendEmail: false })
    expect(r.recipients).toBe(1)
  })

  it("sendEmail=false grava mas não envia nem atualiza contadores", async () => {
    process.env.RESEND_API_KEY = "re_test"
    students([{}, {}])
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const r = await createNotification({ kind: "ANNOUNCEMENT", title: "t", body: "b", sendEmail: false })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(db.academyNotification.update).not.toHaveBeenCalled()
    expect(r.emailConfigured).toBe(true)
    expect(r.emailSent).toBe(0)
  })

  it("envia um e-mail por aluno com notifyEmail=true, pula quem desligou, conta falhas", async () => {
    process.env.RESEND_API_KEY = "re_test"
    students([
      { email: "a@ex.com" },
      { email: "b@ex.com", notifyEmail: false },
      { email: "c@ex.com" },
    ])
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      if (body.to[0] === "c@ex.com") return new Response("boom", { status: 422 })
      return new Response("{}", { status: 200 })
    })
    const r = await createNotification({ kind: "NEW_MATERIAL", title: "Material novo", body: "Veja o PDF" })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(r).toMatchObject({ recipients: 3, emailSent: 1, emailFailed: 1, emailSkipped: 1 })
    expect(r.errors[0]).toMatch(/^c@ex\.com: 422 boom/)

    // payload do Resend: cabeçalhos List-Unsubscribe e reply_to
    const call = fetchSpy.mock.calls[0]
    expect(call[0]).toBe("https://api.resend.com/emails")
    const init = call[1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test")
    const payload = JSON.parse(String(init.body))
    expect(payload.to).toEqual(["a@ex.com"])
    expect(payload.headers["List-Unsubscribe"]).toMatch(/^<https?:\/\/.+unsubscribe\?e=enr0&t=/)
    expect(payload.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click")
    expect(payload.subject).toContain("Material novo")

    // persistência dos contadores
    expect(db.academyNotification.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "n1" },
      data: expect.objectContaining({ emailSent: 1, emailFailed: 1, emailSkipped: 1 }),
    }))
  })

  it("onlyEmails restringe o envio (modo teste) e conta os demais como skipped", async () => {
    process.env.RESEND_API_KEY = "re_test"
    students([{ email: "a@ex.com" }, { email: "B@EX.com" }, { email: "c@ex.com" }])
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }))
    const r = await createNotification({ kind: "ANNOUNCEMENT", title: "t", body: "b", onlyEmails: [" b@ex.com "] })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body)).to).toEqual(["B@EX.com"])
    expect(r).toMatchObject({ emailSent: 1, emailFailed: 0, emailSkipped: 2 })
  })

  it("com lessonId deriva a URL da aula e inclui os PDFs prontos no e-mail", async () => {
    process.env.RESEND_API_KEY = "re_test"
    db.academyLesson.findUnique.mockResolvedValue({
      id: "L1", title: "Antes de ligar", slug: "antes", module: { slug: "intro", title: "Módulo 0" },
      files: [{ title: "Guia do Aluno", sizeBytes: 160_000 }],
    })
    students([{ email: "a@ex.com" }])
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }))
    await createNotification({ kind: "NEW_MATERIAL", title: "t", body: "b", lessonId: "L1" })
    expect(db.academyNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ url: "/academy/modules/intro/antes", lessonId: "L1" }),
    })
    const payload = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))
    expect(payload.html).toContain("Guia do Aluno")
    expect(payload.html).toContain("Módulo 0 · Antes de ligar")
    expect(payload.text).toContain("/academy/modules/intro/antes")
  })

  it("url explícita prevalece sobre a derivada da aula", async () => {
    db.academyLesson.findUnique.mockResolvedValue({ id: "L1", title: "x", slug: "s", module: { slug: "m", title: "M" }, files: [] })
    students([])
    await createNotification({ kind: "NEW_LESSON", title: "t", body: "b", lessonId: "L1", url: "/academy/journey", sendEmail: false })
    expect(db.academyNotification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ url: "/academy/journey" }) })
  })
})

// ─── listForStudent / markRead ───────────────────────────────────────
describe("listForStudent", () => {
  it("marca lidas e conta não lidas", async () => {
    const d = new Date("2026-11-02T10:00:00Z")
    db.academyNotification.findMany.mockResolvedValue([
      { id: "n1", kind: "NEW_MATERIAL", title: "a", body: "b", url: "/x", createdAt: d, lesson: { title: "Aula", slug: "s", module: { slug: "m", title: "Mód" } } },
      { id: "n2", kind: "ANNOUNCEMENT", title: "c", body: "d", url: null, createdAt: d, lesson: null },
    ])
    db.academyNotificationRead.findMany.mockResolvedValue([{ notificationId: "n2" }])
    const r = await listForStudent("enr1", 6)
    expect(db.academyNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 6 }))
    expect(r.unread).toBe(1)
    expect(r.items[0]).toMatchObject({ id: "n1", read: false, lesson: { title: "Aula", moduleTitle: "Mód" }, createdAt: d.toISOString() })
    expect(r.items[1]).toMatchObject({ id: "n2", read: true, lesson: null })
  })
})

describe("markRead", () => {
  it("ids específicos → createMany com skipDuplicates", async () => {
    db.academyNotificationRead.createMany.mockResolvedValue({ count: 2 })
    const n = await markRead("enr1", ["n1", "n2"])
    expect(n).toBe(2)
    expect(db.academyNotificationRead.createMany).toHaveBeenCalledWith({
      data: [{ notificationId: "n1", enrollmentId: "enr1" }, { notificationId: "n2", enrollmentId: "enr1" }],
      skipDuplicates: true,
    })
  })
  it("'all' busca todos os ids; lista vazia retorna 0 sem gravar", async () => {
    db.academyNotification.findMany.mockResolvedValue([{ id: "n1" }, { id: "n3" }])
    db.academyNotificationRead.createMany.mockResolvedValue({ count: 1 })
    expect(await markRead("enr1", "all")).toBe(1)
    expect(db.academyNotificationRead.createMany.mock.calls[0][0].data).toHaveLength(2)

    db.academyNotificationRead.createMany.mockClear()
    expect(await markRead("enr1", [])).toBe(0)
    expect(db.academyNotificationRead.createMany).not.toHaveBeenCalled()
  })
})
