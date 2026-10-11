import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { STRINGS } from "./strings.js"

const LANG_KEY = "vibechat-lang"
const THEME_KEY = "vibechat-theme"

function readLang() {
  try {
    const v = String(localStorage.getItem(LANG_KEY) || "").toLowerCase()
    if (v === "en" || v === "es") return v
  } catch { /* noop */ }
  try {
    const nav = String(navigator.language || "es").toLowerCase()
    if (nav.startsWith("en")) return "en"
  } catch { /* noop */ }
  return "es"
}

function readTheme() {
  try {
    const v = String(localStorage.getItem(THEME_KEY) || "").toLowerCase()
    if (v === "dark" || v === "light") return v
  } catch { /* noop */ }
  return "light"
}

const SettingsCtx = createContext(null)

export function SettingsProvider({ children }) {
  const [lang, setLangState] = useState(readLang)
  const [theme, setThemeState] = useState(readTheme)

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* noop */ }
    try { document.documentElement.lang = lang } catch { /* noop */ }
  }, [lang])

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* noop */ }
    try { document.documentElement.classList.toggle("dark", theme === "dark") } catch { /* noop */ }
    try { document.documentElement.style.colorScheme = theme } catch { /* noop */ }
  }, [theme])

  const setLang = useCallback((v) => {
    setLangState(v === "en" ? "en" : "es")
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"))
  }, [])

  const value = useMemo(() => {
    const t = STRINGS[lang] || STRINGS.es
    return { lang, setLang, theme, toggleTheme, t }
  }, [lang, theme, setLang, toggleTheme])

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsCtx)
  if (!ctx) throw new Error("useSettings debe usarse dentro de <SettingsProvider>")
  return ctx
}
