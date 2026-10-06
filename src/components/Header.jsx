import { useEffect, useState } from "react"
import Logo from "./Logo.jsx"
import { NAV_LINKS } from "./navLinks.js"

export default function Header({ onStartChat }) {
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
        <a href="#inicio" aria-label="OmeTV inicio" onClick={close}>
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
            Empezar chat
          </button>
        </nav>

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
