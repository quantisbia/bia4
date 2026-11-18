/**
 * R39 · Ponte tablet ↔ notebook — cliente e detecção de tablet
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { remoteApi, isTabletLike, saveRemote, loadRemote } from "@/lib/print-basic/remote"

describe("R39 · remote client", () => {
  beforeEach(() => { vi.restoreAllMocks() })
  it("remoteApi envia ops corretas para /api/print-basic/remote e propaga erro do servidor", async () => {
    const calls: unknown[] = []
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => { const b = JSON.parse(String(init.body)); calls.push(b)
      if (b.op === "join" && b.code === "000000") return new Response(JSON.stringify({ error: "Código inválido ou expirado." }), { status: 404 })
      return new Response(JSON.stringify({ ok: true, sessionId: "s1", code: "123456", commands: [], clientOnline: true, state: {} }), { status: 200 }) }))
    const c = await remoteApi.create("MacIntel"); expect(c.code).toBe("123456")
    await remoteApi.cmd("s1", "jog", { dx: 1, dy: 0, dz: 0 })
    await remoteApi.hostSync("s1", { connected: true, ctrlState: "ready", pos: { x: 0, y: 0, z: 0 }, zeroed: false, flow: 100, speed: 100, zBaby: 0, curHead: 1, extruding: false, stopped: false, hasGcode: true, updatedAt: 1 }, [])
    await remoteApi.clientSync("s1", 0)
    expect(calls.map((x) => (x as { op: string }).op)).toEqual(["create", "cmd", "host-sync", "client-sync"])
    expect((calls[1] as { action: string; payload: { dx: number } }).action).toBe("jog")
    await expect(remoteApi.join("000000")).rejects.toThrow(/inválido/)
  })
  it("detecta iPad (UA Macintosh + touch) e Android como tablet; desktop não", () => {
    const nav = globalThis.navigator
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit Safari" })
    vi.stubGlobal("document", { ontouchend: null })
    expect(isTabletLike()).toBe(true)
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome" })
    expect(isTabletLike()).toBe(true)
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64) Chrome" }); vi.stubGlobal("document", {})
    expect(isTabletLike()).toBe(false)
    vi.stubGlobal("navigator", nav)
  })
  it("persistência da sessão remota em sessionStorage", () => {
    const store: Record<string, string> = {}
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v }, removeItem: (k: string) => { delete store[k] } })
    saveRemote({ role: "client", sessionId: "s1", code: "123456" })
    expect(loadRemote()?.role).toBe("client")
    saveRemote(null); expect(loadRemote()).toBeNull()
  })
})
