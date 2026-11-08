/**
 * R33-B · Endurecimento de segurança após investigação de contas-sonda (08/11/2026)
 *
 *  1. getClientInfo: IP REAL (ignora 10.64.x.x da Vercel, prioriza x-vercel-forwarded-for) + UA
 *  2. isDisposableEmail / isProbeEmail: bloqueia example.com, mailinator…, qa.tester / recon.test / keyprobe
 *  3. checkRateLimit: janela por chave; register limita 5 / 15 min
 *  4. detectRegisterBurst: > 3 cadastros do mesmo IP em 10 min → alerta
 *  5. forgot-password NÃO devolve resetUrl em produção; link só por e-mail
 *  6. register/login gravam ip + userAgent no AuditLog
 */
import { describe, it, expect, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  getClientInfo, isPrivateIp, isDisposableEmail, isProbeEmail, checkRateLimit, _resetRateLimits,
  detectRegisterBurst, REGISTER_BURST_THRESHOLD, REGISTER_BURST_WINDOW_MS,
} from "../src/lib/security/request-guard"

const ROOT = resolve(__dirname, "..")
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")
const req = (h: Record<string, string>) => ({ headers: new Headers(h) })

describe("R33-B · getClientInfo — IP real", () => {
  it("ignora IPs privados (10.x da Vercel) e pega o primeiro público do x-forwarded-for", () => {
    expect(getClientInfo(req({ "x-forwarded-for": "10.64.243.202, 189.68.196.24" })).ip).toBe("189.68.196.24")
    expect(getClientInfo(req({ "x-forwarded-for": "189.68.196.24, 10.64.243.202" })).ip).toBe("189.68.196.24")
  })
  it("prioriza x-vercel-forwarded-for (não falsificável) sobre x-forwarded-for", () => {
    expect(getClientInfo(req({ "x-forwarded-for": "1.2.3.4", "x-vercel-forwarded-for": "177.79.85.135" })).ip).toBe("177.79.85.135")
  })
  it("cai para o IP privado se só houver privado; 'unknown' se não houver nada", () => {
    expect(getClientInfo(req({ "x-forwarded-for": "10.64.45.26" })).ip).toBe("10.64.45.26")
    expect(getClientInfo(req({})).ip).toBe("unknown")
  })
  it("captura user-agent (máx. 256) e país", () => {
    const c = getClientInfo(req({ "user-agent": "python-requests/2.31", "x-vercel-ip-country": "BR" }))
    expect(c.userAgent).toBe("python-requests/2.31"); expect(c.country).toBe("BR")
    expect(getClientInfo(req({ "user-agent": "x".repeat(400) })).userAgent?.length).toBe(256)
  })
  it("isPrivateIp cobre RFC1918, loopback e link-local", () => {
    for (const ip of ["10.0.0.1", "192.168.1.1", "172.16.0.1", "172.31.255.255", "127.0.0.1", "169.254.0.21", "::1"]) expect(isPrivateIp(ip)).toBe(true)
    for (const ip of ["8.8.8.8", "170.106.202.227", "172.32.0.1", "189.68.196.24"]) expect(isPrivateIp(ip)).toBe(false)
  })
})

describe("R33-B · e-mails descartáveis e sondas", () => {
  it("bloqueia domínios reservados/descartáveis (inclui as sondas reais encontradas)", () => {
    for (const e of ["qa.tester.9f2@example.com", "ss.keyprobe.01@example.com", "x@mailinator.com", "x@sub.yopmail.com", "test@test.com", "debug.test@bia.com"]) expect(isDisposableEmail(e)).toBe(true)
  })
  it("não bloqueia e-mails legítimos (gmail, institucionais, com 'test' no meio do nome)", () => {
    for (const e of ["andros1208@hotmail.com", "janaina.dernowsek@quantis.bio", "tayna.copesrodrigues@uni-hohenheim.de", "contestani@gmail.com", "maria.teste@usp.br"]) {
      expect(isDisposableEmail(e)).toBe(false); expect(isProbeEmail(e)).toBe(false)
    }
  })
  it("detecta padrões de sonda no local-part (recon.test, qa.tester, keyprobe, crosscheck)", () => {
    for (const e of ["recon.test+b4a1@gmail.com", "recon.test2.crosscheck@gmail.com", "qa.tester.9f3@gmail.com", "keyprobe.7@gmail.com", "crosscheck@gmail.com"]) expect(isProbeEmail(e)).toBe(true)
  })
})

describe("R33-B · rate-limit", () => {
  beforeEach(() => _resetRateLimits())
  it("permite até max e bloqueia o seguinte com retryAfter; janelas independentes por chave e escopo", () => {
    const t = 1_000_000
    for (let i = 0; i < 5; i++) expect(checkRateLimit("register", "1.1.1.1", 5, 60_000, t).allowed).toBe(true)
    const blocked = checkRateLimit("register", "1.1.1.1", 5, 60_000, t + 1000)
    expect(blocked.allowed).toBe(false); expect(blocked.retryAfterSec).toBe(59)
    expect(checkRateLimit("register", "2.2.2.2", 5, 60_000, t).allowed).toBe(true)
    expect(checkRateLimit("forgot-password", "1.1.1.1", 5, 60_000, t).allowed).toBe(true)
  })
  it("libera após a janela expirar", () => {
    const t = 1_000_000
    for (let i = 0; i < 5; i++) checkRateLimit("register", "1.1.1.1", 5, 60_000, t)
    expect(checkRateLimit("register", "1.1.1.1", 5, 60_000, t + 60_001).allowed).toBe(true)
  })
})

describe("R33-B · detector de rajada de cadastros", () => {
  it("limiar > 3 em 10 min; ignora IP privado/unknown", async () => {
    expect(REGISTER_BURST_THRESHOLD).toBe(3); expect(REGISTER_BURST_WINDOW_MS).toBe(600_000)
    const fake = (n: number) => ({ count: async () => n })
    expect((await detectRegisterBurst(fake(3), "8.8.8.8")).burst).toBe(false)
    expect((await detectRegisterBurst(fake(4), "8.8.8.8")).burst).toBe(true)
    expect((await detectRegisterBurst(fake(99), "10.64.243.202")).burst).toBe(false)
    expect((await detectRegisterBurst(fake(99), "unknown")).burst).toBe(false)
  })
  it("consulta o AuditLog por action=user_register + ip na janela", async () => {
    let seen: unknown
    await detectRegisterBurst({ count: async (args) => { seen = args; return 0 } }, "8.8.8.8", new Date("2026-11-08T12:00:00Z"))
    expect(seen).toMatchObject({ where: { action: "user_register", ip: "8.8.8.8", createdAt: { gte: new Date("2026-11-08T11:50:00Z") } } })
  })
})

describe("R33-B · rotas endurecidas (análise estática)", () => {
  const register = read("src/app/api/auth/register/route.ts")
  const forgot = read("src/app/api/auth/forgot-password/route.ts")
  const authCfg = read("src/lib/auth/config.ts")
  const page = read("src/app/auth/forgot-password/page.tsx")

  it("register: IP real, rate-limit, bloqueio de descartáveis/sondas, UA no audit, alerta de rajada", () => {
    expect(register).toContain("getClientInfo(req)")
    expect(register).toContain('checkRateLimit("register"')
    expect(register).toContain("isDisposableEmail(emailLower) || isProbeEmail(emailLower)")
    expect(register).toContain('action: "user_register_blocked"')
    expect(register).toContain("detectRegisterBurst(prisma.auditLog, ip)")
    expect(register).toContain("sendSecurityAlert(")
    expect(register).toMatch(/registeredAt: new Date\(\)\.toISOString\(\),\s*userAgent,\s*country,/)
    expect(register).not.toContain('req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip")')
  })
  it("forgot-password: resetUrl NUNCA na resposta em produção; só por e-mail", () => {
    expect(forgot).toContain("const RESET_LINK_IN_RESPONSE = process.env.RESET_LINK_IN_RESPONSE === \"1\" && process.env.NODE_ENV !== \"production\"")
    // o único retorno com resetUrl está atrás do guard de dev
    const idxGuard = forgot.indexOf("if (RESET_LINK_IN_RESPONSE)")
    const tail = forgot.slice(idxGuard + 40)
    expect(tail.includes("resetUrl,\n")).toBe(false)
    expect(forgot).toContain("emailDelivered: true")
    expect(forgot).toContain("{ status: 502 }")
    expect(forgot).toContain("getClientInfo(req)")
    expect(forgot).toContain('checkRateLimit("forgot-password"')
    expect(forgot).toMatch(/const RATE_LIMIT_MAX = 5/)
  })
  it("login (authorize) grava ip + userAgent", () => {
    expect(authCfg).toContain("async authorize(credentials, request)")
    expect(authCfg).toContain("getClientInfo(")
    expect(authCfg).toMatch(/action: "user_login",[\s\S]*?ip: client\.ip/)
    expect(authCfg).toMatch(/userAgent: client\.userAgent/)
  })
  it("UI forgot-password mostra estado 'link enviado por e-mail'", () => {
    expect(page).toContain('data-testid="forgot-email-sent"')
    expect(page).toContain("Enviar link por e-mail")
    expect(page).toContain("enviaremos um link seguro")
    expect(page).toContain("const emailSentOnly = result?.ok && result.accountExists && !result.resetUrl")
  })
})
