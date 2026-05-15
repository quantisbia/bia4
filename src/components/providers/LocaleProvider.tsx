"use client"

/**
 * LocaleProvider — gerencia idioma da plataforma (pt/en/es)
 *
 * - Persiste em localStorage (`bia-locale`)
 * - Detecta locale do navegador na primeira visita
 * - Expõe `t(key)` para tradução
 * - Atualiza atributo `lang` do <html>
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import {
  type Locale,
  type TranslationKey,
  DICTIONARIES,
  LOCALE_HTML_LANG,
  detectBrowserLocale,
} from "@/lib/i18n/locales"

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, fallback?: string) => string
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

const STORAGE_KEY = "bia-locale"

interface LocaleProviderProps {
  children: React.ReactNode
  defaultLocale?: Locale
}

export function LocaleProvider({ children, defaultLocale = "pt" }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  // Hidratação inicial
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored === "pt" || stored === "en" || stored === "es") {
        setLocaleState(stored)
      } else {
        // Primeira visita: detecta do navegador
        const detected = detectBrowserLocale()
        setLocaleState(detected)
        localStorage.setItem(STORAGE_KEY, detected)
      }
    } catch {
      // ignora
    }
  }, [])

  // Atualiza atributo lang do <html>
  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = LOCALE_HTML_LANG[locale]
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignora
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey, fallback?: string) => {
      const dict = DICTIONARIES[locale] as Record<string, string>
      return dict[key] ?? fallback ?? DICTIONARIES.pt[key] ?? key
    },
    [locale]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    // Fallback seguro: retorna pt direto do dicionário
    return {
      locale: "pt" as Locale,
      setLocale: () => {},
      t: (key: TranslationKey, fallback?: string) =>
        (DICTIONARIES.pt as Record<string, string>)[key] ?? fallback ?? key,
    }
  }
  return ctx
}

/**
 * Hook conveniente que retorna apenas a função t
 */
export function useT() {
  return useLocale().t
}
