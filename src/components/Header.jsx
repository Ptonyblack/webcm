import { useEffect, useState } from "react"
import Logo from "./Logo.jsx"
import { NAV_LINKS } from "./navLinks.js"
import { useSettings } from "../lib/settings.jsx"

export default function Header({ onStartChat }) {
  const { lang, setLang, theme, toggleTheme, t } = useSettings()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState("#inicio")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Nav activa según la sección visible (scrollspy)
  useEffect(() => {
    const sections = document.querySelectorAll("main section[id]")
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive("#" + e.target.id)
        })
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    sections.forEach((s) => spy.observe(s))
    return () => spy.disconnect()
  }, [])

  const close = () => setOpen(false)

  return (
    <header
      className={`sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md transition-shadow ${
        scrolled ? "shadow-[0_6px_24px_rgba(18,32,51,.08)]" : ""
      }`}
    >
      <div className="mx-auto flex h-[72px] w-[min(1180px,92%)] items-center justify-between gap-5">
        <a href="#inicio" aria-label="VibeChat inicio" onClick={close}>
          <Logo />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-2 text-[.95rem] font-bold transition ${
                active === l.href
                  ? "bg-primary-light text-primary"
                  : "text-ink-soft hover:bg-primary-light hover:text-primary"
              }`}
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={onStartChat}
            className="ml-1 rounded-full bg-primary px-4 py-2 text-[.95rem] font-bold text-white transition hover:bg-primary-dark"
          >
            {t.nav.start}
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-line bg-bg-muted p-0.5">
            <button
              onClick={() => setLang("es")}
              aria-label="Español"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition"
              style={{ backgroundColor: lang === "es" ? "var(--color-primary)" : "transparent", color: lang === "es" ? "white" : "var(--color-ink-soft)" }}
            >
              ES
            </button>
            <button
              onClick={() => setLang("en")}
              aria-label="English"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition"
              style={{ backgroundColor: lang === "en" ? "var(--color-primary)" : "transparent", color: lang === "en" ? "white" : "var(--color-ink-soft)" }}
            >
              EN
            </button>
          </div>
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t.settings.themeLight : t.settings.themeDark}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-bg-muted text-ink-soft transition hover:bg-primary hover:text-white"
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        <button
          className="flex flex-col gap-[5px] p-2 lg:hidden"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={`h-[3px] w-[26px] rounded bg-ink transition ${
              open ? "translate-y-[8px] rotate-45" : ""
            }`}
          />
          <span className={`h-[3px] w-[26px] rounded bg-ink transition ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-[3px] w-[26px] rounded bg-ink transition ${
              open ? "-translate-y-[8px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Menú móvil */}
      <nav
        className={`fixed inset-x-0 top-[72px] z-40 flex max-h-[calc(100vh-72px)] flex-col gap-1.5 overflow-y-auto border-b border-line bg-white p-4 shadow-[0_20px_40px_rgba(18,32,51,.12)] transition-transform duration-300 lg:hidden ${
          open ? "translate-y-0" : "-translate-y-[130%]"
        }`}
      >
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={close}
            className={`rounded-xl px-4 py-3 font-bold transition ${
              active === l.href ? "bg-primary-light text-primary" : "text-ink-soft hover:bg-bg-muted"
            }`}
          >
            {l.label}
          </a>
        ))}
        <button
          onClick={() => {
            close()
            onStartChat()
          }}
          className="mt-1 rounded-xl bg-primary px-4 py-3 text-center font-bold text-white"
        >
          Empezar chat
        </button>
      </nav>
    </header>
  )
}
