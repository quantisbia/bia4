/**
 * BIA v4 · R14.1 · Hook useUIMode — React-side state do modo UI
 *
 * Pattern "lift state via events" sem Context pra manter o blast radius
 * mínimo e evitar re-renders em cascata (muitos componentes só precisam
 * ler o modo, nunca escrever).
 */
"use client"

import { useEffect, useState, useCallback } from "react"
import {
  type UIMode,
  readStoredMode,
  storeMode,
  t as translate,
} from "./ui-mode"

export function useUIMode() {
  const [mode, setModeState] = useState<UIMode>("researcher")
  const [hydrated, setHydrated] = useState(false)

  // Hidrata a partir do localStorage após mount (evita hydration mismatch)
  useEffect(() => {
    setModeState(readStoredMode())
    setHydrated(true)
  }, [])

  // Reage a mudanças disparadas por outras instâncias do hook
  useEffect(() => {
    function handler(e: Event) {
      const ev = e as CustomEvent<{ mode: UIMode }>
      if (ev.detail?.mode) setModeState(ev.detail.mode)
    }
    window.addEventListener("bia:ui-mode-change", handler)
    return () => window.removeEventListener("bia:ui-mode-change", handler)
  }, [])

  const setMode = useCallback((next: UIMode) => {
    storeMode(next)
    setModeState(next)
  }, [])

  const toggle = useCallback(() => {
    setMode(mode === "clinical" ? "researcher" : "clinical")
  }, [mode, setMode])

  const t = useCallback((key: string) => translate(key, mode), [mode])

  return { mode, setMode, toggle, t, hydrated, isClinical: mode === "clinical" }
}
