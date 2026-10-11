import { useEffect, useState } from "react"
import PremiumModal from "./components/PremiumModal.jsx"
import { resolveHandle, isPremium, getPremiumUntil, getOrCreateDeviceId } from "./lib/identity.js"
import Header from "./components/Header.jsx"
import Logo from "./components/Logo.jsx"
import VideoChat from "./components/VideoChat.jsx"
import FilterBar from "./components/FilterBar.jsx"
import useVideoChat from "./hooks/useVideoChat.js"
import { useSettings } from "./lib/settings.jsx"
import {
  IconPlay, IconVideo, IconCheckCircle, IconShield,
  IconZap, IconGlobe, IconLock, IconDevice, IconDice, IconChat, IconDoc,
} from "./components/icons.jsx"

function scrollToChat() {
  document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" })
}

export default function App() {
  const { t } = useSettings()
  const chat = useVideoChat()
  const [openFaq, setOpenFaq] = useState(0)
  const [myHandle, setMyHandle] = useState("")
  const [premium, setPremium] = useState(false)
  const [showPremium, setShowPremium] = useState(false)
  useEffect(() => {
    getOrCreateDeviceId()
    const r = resolveHandle()
    setMyHandle(r.handle)
    setPremium(isPremium())
  }, [])
  const refreshPremium = () => {
    const r = resolveHandle()
    setMyHandle(r.handle)
    setPremium(isPremium())
  }
  const FAQS = t.faq.items
  const STEPS = [
    { n: "1", t: t.how.steps[0].t, d: t.how.steps[0].d },
    { n: "2", t: t.how.steps[1].t, d: t.how.steps[1].d },
    { n: "3", t: t.how.steps[2].t, d: t.how.steps[2].d },
  ]
  const PERKS = [
    { Icon: IconZap, t: t.perks.items[0].t, d: t.perks.items[0].d },
    { Icon: IconGlobe, t: t.perks.items[1].t, d: t.perks.items[1].d },
    { Icon: IconLock, t: t.perks.items[2].t, d: t.perks.items[2].d },
    { Icon: IconDevice, t: t.perks.items[3].t, d: t.perks.items[3].d },
    { Icon: IconDice, t: t.perks.items[4].t, d: t.perks.items[4].d },
    { Icon: IconChat, t: t.perks.items[5].t, d: t.perks.items[5].d },
  ]
  const RULES = t.rules.items
  const canStart = chat.canStart()
  const goFilters = () => {
    document.getElementById("filtros")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }
  // Si no hay perfil confirmado, los botones Empezar solo llevan a los filtros.
  // Una vez validado, el mismo botón arranca la cámara directamente.
  const startAndGo = () => {
    if (!chat.canStart()) {
      goFilters()
      return
    }
    scrollToChat()
    setTimeout(() => chat.start(), 400)
  }
  return (
    <div className="min-h-screen bg-white text-ink dark:bg-[#0b1422] dark:text-slate-100">
      <Header onStartChat={startAndGo} />
      <main>
        <section id="inicio" className="relative overflow-hidden bg-gradient-to-b from-primary-light via-white to-white dark:from-[#0e2238] dark:via-[#0b1422] dark:to-[#0b1422]">
          <div className="mx-auto grid w-[min(1180px,92%)] items-center gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
            <div className="animate-pop">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-sm font-bold text-ink-soft shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-green-500" />
                <span className="tabular-nums">{t.hero.inLobby(chat.peerCount)}</span>
              </p>
              <h1 className="text-4xl font-black leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
                {t.hero.titleA}{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t.hero.titleB}</span>{" "}
                {t.hero.titleC}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-soft dark:text-slate-300">
                {t.hero.sub}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={startAndGo}
                  disabled={!canStart}
                  title={canStart ? t.hero.startVideochatTitle : t.hero.confirmFirstTitle}
                  className={`group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-lg font-extrabold text-white shadow-lg transition active:scale-[.98] ${canStart ? "bg-gradient-to-r from-primary to-primary-dark shadow-primary/30 hover:shadow-xl hover:shadow-primary/40" : "cursor-not-allowed bg-ink-soft/40 shadow-none opacity-60"}`}
                >
                  <IconPlay className="h-5 w-5 transition group-hover:scale-110" />
                  {canStart ? t.hero.startFree : t.hero.completeProfileToStart}
                </button>
                {!chat.profileConfirmed && (
                  <button onClick={goFilters} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 font-extrabold text-ink-soft shadow-sm transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                    <IconShield className="h-5 w-5" />
                    {t.hero.completeProfile}
                  </button>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-bold text-ink-soft dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><IconCheckCircle className="h-4 w-4 text-green-500" /> {t.hero.freeNoSignup}</span>
                <span className="inline-flex items-center gap-1.5"><IconCheckCircle className="h-4 w-4 text-green-500" /> {t.hero.p2pEncrypted}</span>
                <span className="inline-flex items-center gap-1.5"><IconCheckCircle className="h-4 w-4 text-green-500" /> {t.hero.mobilePc}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-black dark:border-white/10 dark:bg-white/10">{t.hero.youAre} {myHandle || "…"} {premium && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] text-black">PREMIUM</span>}</span>
                {!premium && <button onClick={() => setShowPremium(true)} className="rounded-full bg-dark px-4 py-2 text-sm font-black text-white hover:brightness-125 dark:bg-white dark:text-ink">{t.hero.keepHandle(myHandle)}</button>}
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-line bg-dark shadow-xl">
              <div className="relative">
                <video ref={chat.localVideoRef} autoPlay playsInline muted className="aspect-video w-full -scale-x-100 bg-black object-cover" />
                {chat.status === "idle" && !chat.profileConfirmed && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark/70 p-6 text-center backdrop-blur-[2px]">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <IconVideo className="h-8 w-8" />
                    </span>
                    <p className="max-w-[26ch] font-extrabold text-white">{t.vc.confirmGo}</p>
                    <button onClick={goFilters} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-black text-ink transition hover:bg-primary-light hover:text-primary">
                      <IconShield className="h-4 w-4" />
                      {t.hero.goProfile}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 px-3 py-4">
                <button
                  onClick={startAndGo}
                  disabled={!canStart}
                  title={canStart ? t.vc.startTitle : t.vc.confirmFirstTitle}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold text-white transition active:scale-[.98] ${canStart ? "bg-green-500 hover:bg-green-600" : "cursor-not-allowed bg-ink-soft/40 opacity-60"}`}
                >
                  <IconVideo className="h-4 w-4" />
                  {canStart ? t.vc.enableCam : t.vc.incompleteProfile}
                </button>
              </div>
            </div>
          </div>
        </section>
        <section id="como-funciona" className="mx-auto w-[min(1180px,92%)] py-16">
          <p className="text-sm font-black uppercase tracking-[.2em] text-primary">{t.how.kicker}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{t.how.title}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-bg-muted p-6 dark:border-white/10 dark:bg-white/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-black text-white">{s.n}</span>
                <h3 className="mt-4 text-xl font-extrabold">{s.t}</h3>
                <p className="mt-1.5 text-ink-soft dark:text-slate-300">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="chat" className="border-y border-line bg-bg-muted py-16 dark:border-white/10 dark:bg-[#0e1a2e]">
          <div className="mx-auto w-[min(1180px,92%)]">
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">{t.chatSection.title}</h2>
            <p className="mt-2 max-w-2xl text-ink-soft dark:text-slate-300">{t.chatSection.sub}</p>
            <FilterBar chat={chat} />
            <VideoChat chat={chat} onNeedProfile={goFilters} />
          </div>
        </section>


        <section id="ventajas" className="mx-auto w-[min(1180px,92%)] py-16">
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{t.perks.title}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERKS.map((p) => (
              <div key={p.t} className="group rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-white text-primary ring-1 ring-line transition group-hover:from-primary group-hover:to-primary-dark group-hover:text-white dark:from-white/10 dark:to-white/5 dark:ring-white/10">
                  <p.Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-lg font-extrabold">{p.t}</h3>
                <p className="mt-1 text-ink-soft dark:text-slate-300">{p.d}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="faq" className="border-y border-line bg-bg-muted py-16 dark:border-white/10 dark:bg-[#0e1a2e]">
          <div className="mx-auto w-[min(760px,92%)]">
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">{t.faq.title}</h2>
            <div className="mt-8 space-y-3">
              {FAQS.map((f, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white dark:border-white/10 dark:bg-white/5">
                  <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-extrabold">
                    {f.q}
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-lg font-black text-primary">+</span>
                  </button>
                  {openFaq === i && <p className="border-t border-line px-5 py-4 text-ink-soft dark:border-white/10 dark:text-slate-300">{f.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="reglas" className="mx-auto w-[min(1180px,92%)] py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/5">
              <h2 className="flex items-center gap-2.5 text-2xl font-black">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <IconDoc className="h-5 w-5" />
                </span>
                {t.rules.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2.5 rounded-xl bg-bg-muted px-4 py-3 text-[.95rem] font-semibold dark:bg-white/5">
                    <IconCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col justify-center rounded-3xl bg-dark p-8 text-white sm:p-10">
              <Logo light />
              <h2 className="mt-4 text-3xl font-black leading-tight">{t.rules.cta}</h2>
              <button onClick={startAndGo} className="mt-6 inline-flex w-fit items-center gap-2.5 rounded-full bg-accent px-8 py-3.5 text-lg font-extrabold text-white shadow-lg shadow-accent/30 transition hover:brightness-110 active:scale-[.98]">
                <IconPlay className="h-5 w-5" />
                {canStart ? t.rules.ctaStart : t.rules.ctaComplete}
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line bg-bg-muted py-8 text-center text-sm font-semibold text-ink-soft dark:border-white/10 dark:bg-[#0e1a2e] dark:text-slate-300">
        <p className="inline-flex items-center gap-2"><IconLock className="h-4 w-4" /> {t.footer}</p>
      </footer>
      {showPremium && <PremiumModal handle={myHandle} onClose={() => setShowPremium(false)} onActivated={refreshPremium} />}
    </div>
  )
}
