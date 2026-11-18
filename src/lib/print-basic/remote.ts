/**
 * R39 · Cliente da ponte tablet ↔ notebook (polling via /api/print-basic/remote).
 */

export type RemoteAction = "jog" | "zero" | "goZero" | "home" | "flow" | "speed" | "babyZ" | "extrude" | "valve" | "start" | "stop" | "pause" | "resume" | "rearm" | "loadSyringe" | "setHead" | "raw"

/** Estado publicado pelo notebook para o tablet (snapshot leve) */
export interface RemoteState {
  connected: boolean
  ctrlState: string
  pos: { x: number; y: number; z: number }
  zeroed: boolean
  flow: number; speed: number; zBaby: number
  curHead: number
  extruding: boolean
  stopped: boolean
  hasGcode: boolean
  progress?: { current: number; total: number; percent: number; currentLayer: number } | null
  firmware?: string | null
  lastLog?: string[]
  updatedAt: number
}

export interface RemoteCommand { id: string; seq: number; action: RemoteAction; payload?: Record<string, unknown> | null }

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch("/api/print-basic/remote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((j as { error?: string }).error || `HTTP ${r.status}`)
  return j as T
}

export const remoteApi = {
  create: (hostLabel?: string) => call<{ sessionId: string; code: string; expiresAt: string }>({ op: "create", hostLabel }),
  join: (code: string) => call<{ sessionId: string; hostLabel: string | null; hostOnline: boolean; state: Partial<RemoteState> }>({ op: "join", code }),
  cmd: (sessionId: string, action: RemoteAction, payload?: Record<string, unknown>) => call<{ id: string; seq: number }>({ op: "cmd", sessionId, action, payload }),
  hostSync: (sessionId: string, state: RemoteState, results: { id: string; status: "done" | "error"; result?: string }[]) =>
    call<{ commands: RemoteCommand[]; clientOnline: boolean; code: string }>({ op: "host-sync", sessionId, state, results }),
  clientSync: (sessionId: string, since: number) =>
    call<{ state: Partial<RemoteState>; hostOnline: boolean; hostLabel: string | null; commands: { id: string; seq: number; action: string; status: string; result: string | null }[] }>({ op: "client-sync", sessionId, since }),
  close: (sessionId: string) => call<{ ok: true }>({ op: "close", sessionId }),
}

export const REMOTE_KEY = "bia.print-basic.remote.v1"
export function loadRemote(): { role: "host" | "client"; sessionId: string; code: string } | null { try { return JSON.parse(sessionStorage.getItem(REMOTE_KEY) || "null") } catch { return null } }
export function saveRemote(v: { role: "host" | "client"; sessionId: string; code: string } | null) { try { if (v) sessionStorage.setItem(REMOTE_KEY, JSON.stringify(v)); else sessionStorage.removeItem(REMOTE_KEY) } catch { /* noop */ } }

/** detecta iPad/Android (sem Web Serial) para sugerir o modo tablet */
export function isTabletLike(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const iPadOS = /Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document
  return /iPad|iPhone|Android/i.test(ua) || iPadOS
}
