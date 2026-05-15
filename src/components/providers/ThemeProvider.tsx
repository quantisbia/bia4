"use client"

/**
 * ThemeProvider — gerencia tema light/dark/system
 *
 * - Persiste em localStorage (`bia-theme`)
 * - Sincroniza com `prefers-color-scheme` quando "system"
 * - Aplica classe `dark` no <html> (compatível com Tailwind darkMode: "class")
 * - Zero dependência externa
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react"

export type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "bia-theme"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyThemeClass(resolved: "light" | "dark") {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
    root.classList.remove("light")
  } else {
    root.classList.add("light")
    root.classList.remove("dark")
  }
  // Atualiza atributo color-scheme para nativos (scrollbar, autofill, etc)
  root.style.colorScheme = resolved
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = "dark" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark")

  // Hidratação inicial: lê localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored)
      }
    } catch {
      // localStorage indisponível (SSR / private mode) — ignora
    }
  }, [])

  // Resolve tema efetivo e aplica classe
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    applyThemeClass(resolved)
  }, [theme])

  // Listener para mudanças do sistema (apenas se theme === "system")
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const resolved = mql.matches ? "dark" : "light"
      setResolvedTheme(resolved)
      applyThemeClass(resolved)
    }
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignora
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback seguro caso o consumidor esteja fora do provider
    return {
      theme: "dark" as Theme,
      resolvedTheme: "dark" as const,
      setTheme: () => {},
    }
  }
  return ctx
}

/**
 * Script para evitar flash of unstyled content (FOUC).
 * Injetar no <head> via dangerouslySetInnerHTML antes do React hidratar.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var theme = stored || 'dark';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    root.style.colorScheme = resolved;
  } catch (e) {}
})();
`.trim()
