import { useState } from "react"
import Header from "./components/Header.jsx"
import Logo from "./components/Logo.jsx"
import VideoChat from "./components/VideoChat.jsx"
import FilterBar from "./components/FilterBar.jsx"
import useVideoChat from "./hooks/useVideoChat.js"

const FAQS = [
  { q: "¿VibeChat es gratis?", a: "Sí, el chat de vídeo aleatorio es 100% gratis, sin límite de tiempo y sin necesidad de registro." },
  { q: "¿Necesito crear una cuenta?", a: "No. Entras, aceptas la cámara y empiezas a conocer gente al instante." },
  { q: "¿Funciona en el móvil?", a: "Sí, funciona en Chrome, Safari y Firefox tanto en Android como en iOS." },
  { q: "¿Cómo funciona el emparejamiento?", a: "Entras al lobby P2P y el sistema te empareja 1 a 1 con otra persona. Pulsa Siguiente para cambiar." },
  { q: "¿Es seguro?", a: "Nunca compartas datos personales. El vídeo va directo entre navegadores (P2P)." },
]

const STEPS = [
  { n: "1", t: "Pulsa Empezar", d: "Un clic y entras al lobby. Sin registros ni formularios." },
  { n: "2", t: "Permite cámara y micro", d: "El navegador te pedirá permiso. Acepta para el videochat real." },
  { n: "3", t: "Conoce gente real", d: "Te emparejamos 1 a 1. Siguiente para cambiar." },
]

const PERKS = [
  { icon: "⚡", t: "Sin límites", d: "Chatea todo el tiempo que quieras, gratis y sin cortes." },
  { icon: "🌍", t: "P2P global", d: "Conexión directa entre navegadores vía WebRTC." },
  { icon: "🔒", t: "Sin servidor de vídeo", d: "El vídeo no pasa por nuestros servidores." },
  { icon: "📱", t: "En cualquier dispositivo", d: "Móvil, tablet o PC. Solo necesitas el navegador." },
  { icon: "🎲", t: "Aleatorio 1 a 1", d: "Cada clic en Siguiente busca a otra persona." },
  { icon: "💬", t: "Texto + vídeo", d: "Combina cámara con chat de texto en vivo." },
]

const RULES = [
  "Sé respetuoso: nada de insultos, acoso o discurso de odio.",
  "Prohibido el contenido sexual o explícito ante la cámara.",
  "No compartas datos personales (teléfono, dirección, contraseñas).",
  "No hagas spam ni publicidad de otros sitios.",
  "Si alguien rompe las reglas, pulsa Siguiente.",
]

function scrollToChat() {
  document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" })
}

export default function App() {
  const chat = useVideoChat()
  const [openFaq, setOpenFaq] = useState(0)
  const startAndGo = () => {
    scrollToChat()
    setTimeout(() => chat.start(), 400)
  }
  return (
    <div className="min-h-screen bg-white text-ink">
      <Header onStartChat={startAndGo} />
      <main>
        <section id="inicio" className="relative overflow-hidden bg-gradient-to-b from-primary-light via-white to-white">
          <div className="mx-auto grid w-[min(1180px,92%)] items-center gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
            <div className="animate-pop">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-sm font-bold text-ink-soft shadow-sm">
                <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-green-500" />
                <span className="tabular-nums">{chat.peerCount} en el lobby ahora</span>
              </p>
              <h1 className="text-4xl font-black leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
                Videochat <span className="text-primary">real</span> con cámara y micro 🎥
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-soft">
                Sin bots: al pulsar Empezar se activa tu cámara y te emparejamos 1 a 1 con otra persona.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={startAndGo} className="rounded-full bg-primary px-7 py-3.5 text-lg font-extrabold text-white shadow-lg hover:bg-primary-dark">
                  ▶ Empezar chat gratis
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-line bg-dark shadow-xl">
              <video ref={chat.localVideoRef} autoPlay playsInline muted className="aspect-video w-full -scale-x-100 bg-black object-cover" />
              <div className="flex items-center justify-center gap-3 px-3 py-4">
                <button onClick={startAndGo} className="rounded-full bg-green-500 px-5 py-2 text-sm font-extrabold text-white">Activar cámara 🎥</button>
              </div>
            </div>
          </div>
        </section>
        <section id="como-funciona" className="mx-auto w-[min(1180px,92%)] py-16">
          <p className="text-sm font-black uppercase tracking-[.2em] text-primary">Simple y rápido</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">¿Cómo funciona?</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-bg-muted p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-black text-white">{s.n}</span>
                <h3 className="mt-4 text-xl font-extrabold">{s.t}</h3>
                <p className="mt-1.5 text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="chat" className="border-y border-line bg-bg-muted py-16">
          <div className="mx-auto w-[min(1180px,92%)]">
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Videochat aleatorio real</h2>
            <p className="mt-2 max-w-2xl text-ink-soft">Permite cámara y micro cuando el navegador lo pida. Ajusta tu país y rango de edad (18–50) antes de empezar.</p>
            <FilterBar chat={chat} />
            <VideoChat chat={chat} />
          </div>
        </section>


        <section id="ventajas" className="mx-auto w-[min(1180px,92%)] py-16">
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Ventajas del videochat P2P</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((p) => (
              <div key={p.t} className="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <span className="text-3xl">{p.icon}</span>
                <h3 className="mt-3 text-lg font-extrabold">{p.t}</h3>
                <p className="mt-1 text-ink-soft">{p.d}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="faq" className="border-y border-line bg-bg-muted py-16">
          <div className="mx-auto w-[min(760px,92%)]">
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Preguntas frecuentes</h2>
            <div className="mt-8 space-y-3">
              {FAQS.map((f, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-extrabold">
                    {f.q}
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-lg font-black text-primary">+</span>
                  </button>
                  {openFaq === i && <p className="border-t border-line px-5 py-4 text-ink-soft">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="reglas" className="mx-auto w-[min(1180px,92%)] py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-black">📋 Reglas de la comunidad</h2>
              <ul className="mt-4 space-y-2.5">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2.5 rounded-xl bg-bg-muted px-4 py-3 text-[.95rem] font-semibold">
                    <span className="text-green-600">✔</span> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center rounded-3xl bg-dark p-8 text-white sm:p-10">
              <Logo light />
              <h2 className="mt-4 text-3xl font-black leading-tight">¿Listo para conocer a alguien nuevo?</h2>
              <button onClick={startAndGo} className="mt-6 w-fit rounded-full bg-accent px-8 py-3.5 text-lg font-extrabold text-white">
                Empezar ahora — es gratis 🚀
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line bg-bg-muted py-8 text-center text-sm font-semibold text-ink-soft">
        <p>© 2026 VibeChat — P2P real, sin bots 🔒</p>
      </footer>
    </div>
  )
}
