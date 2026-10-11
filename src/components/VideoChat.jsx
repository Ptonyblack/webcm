import { useEffect, useRef, useState } from "react"
import {
  IconVideo, IconVideoOff, IconMic, IconMicOff, IconPlay,
  IconNext, IconStop, IconSend, IconAlert, IconCheckCircle, IconUsers,
} from "./icons.jsx"
import { useSettings } from "../lib/settings.jsx"

export default function VideoChat({ chat, onNeedProfile }) {
  const { t } = useSettings()
  const v = t.vc
  const [input, setInput] = useState("")
  const scrollRef = useRef(null)
  const connected = chat.status === "connected"
  const active = chat.status === "starting" || chat.status === "waiting" || connected

  const gatedStart = () => {
    if (!chat.canStart()) {
      chat.confirmProfile()
      onNeedProfile?.()
      return
    }
    chat.start()
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" })
  }, [chat.messages, chat.typingPeer])

  const send = (e) => {
    e?.preventDefault()
    if (!input.trim()) return
    chat.sendMessage(input)
    setInput("")
  }

  return (
    <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-3xl border border-line bg-white shadow-xl dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-dark via-[#14263d] to-dark px-5 py-4 text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
          <IconVideo className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-[180px]">
          <p className="font-extrabold leading-tight">
            {connected ? v.connectedWith(chat.peerShortId) : chat.status === "waiting" ? v.looking : v.title}
          </p>
          <p className="text-xs font-bold text-white/70">
            {v.youAre(chat.selfShortId)} · {chat.myAge === "" ? v.ageUnset : v.yearsOld(chat.myAge)} ·{" "}
            {connected && chat.peerAge != null && (
              <span>{v.peerAge(chat.peerAge)}</span>
            )}
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />{chat.peerCount} {v.onlineNow}</span>
          </p>
        </div>
        {!active && (
          <button
            onClick={gatedStart}
            disabled={!chat.canStart()}
            title={chat.canStart() ? v.startTitle : v.confirmFirstTitle}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black text-white transition active:scale-[.97] ${chat.canStart() ? "bg-green-500 hover:bg-green-600" : "cursor-not-allowed bg-ink-soft/40 opacity-60"}`}
          >
            <IconPlay className="h-4 w-4" /> {chat.canStart() ? v.start : v.completeProfileBtn}
          </button>
        )}
        {active && (
          <div className="flex gap-2">
            {connected && (
              <button onClick={chat.next} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black text-ink transition hover:bg-primary-light hover:text-primary active:scale-[.97]">
                <IconNext className="h-4 w-4" /> {v.next}
              </button>
            )}
            <button onClick={chat.stop} className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-600 active:scale-[.97]">
              <IconStop className="h-4 w-4" /> {v.leave}
            </button>
          </div>
        )}
      </div>
      {chat.profileError && !active && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800 dark:border-white/10 dark:bg-amber-500/10 dark:text-amber-200">
          <IconAlert className="h-5 w-5 shrink-0" /> {chat.profileError}{" "}
          <button onClick={() => onNeedProfile?.()} className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white transition hover:bg-amber-600">{v.completeProfileBtn}</button>
        </div>
      )}
      {chat.error && (
        <div className="border-b border-line bg-red-50 px-5 py-3 text-sm font-bold text-red-700 dark:border-white/10 dark:bg-red-500/10 dark:text-red-300">
          <span className="inline-flex items-center gap-2"><IconAlert className="h-5 w-5 shrink-0" /> {chat.error}</span>{" "}
          <button onClick={chat.retry} className="ml-2 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white transition hover:bg-red-700">{t.premium.close === "Close" ? "Retry" : "Reintentar"}</button>
          {/HTTPS/i.test(chat.error) && (
            <p className="mt-1 text-xs font-semibold">{t.hero.mobilePc}: https:// — localhost OK (PC)</p>
          )}
        </div>
      )}
      {chat.diag?.debug && (
        <div className="border-b border-line bg-slate-900 px-4 py-3 font-mono text-[11px] leading-relaxed text-green-300">
          <p className="font-black text-white">DIAG ?debug=1 — copia esto si falla móvil-PC</p>
          <p>secure={String(chat.diag.secure)} host={chat.diag.host} proto={chat.diag.proto} mobile={String(chat.diag.mobile)}</p>
          <p>hasMedia={String(chat.diag.hasMedia)} status={chat.status} lobby={chat.diag.lobby} pair={chat.diag.pair} ice={chat.diag.ice} peers={chat.peerCount}</p>
          <p className="break-all text-white/70">ua: {chat.diag.ua}</p>
          {chat.diag.lastLog && <p className="text-yellow-300">último: {chat.diag.lastLog}</p>}
          <details>
            <summary className="cursor-pointer text-white">ver últimos logs ({(chat.diagLogs || []).length})</summary>
            <div className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
              {(chat.diagLogs || []).join("\n")}
            </div>
          </details>
        </div>
      )}

      <div className="grid gap-2 bg-black p-3 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-[#16283f]">
          <video ref={chat.localVideoRef} autoPlay playsInline muted className="aspect-[4/3] w-full -scale-x-100 object-cover" />
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
            {v.you} @{chat.selfShortId} {chat.micOn ? <IconMic className="h-3.5 w-3.5" /> : <IconMicOff className="h-3.5 w-3.5 text-red-300" />}
          </span>
          {active && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button onClick={chat.toggleMic} title={chat.micOn ? v.muteMic : v.unmuteMic} className={`rounded-full p-2.5 text-white transition active:scale-95 ${chat.micOn ? "bg-black/60 hover:bg-black/80" : "bg-red-500 hover:bg-red-600"}`}>
                {chat.micOn ? <IconMic className="h-4 w-4" /> : <IconMicOff className="h-4 w-4" />}
              </button>
              <button onClick={chat.toggleCam} title={chat.camOn ? v.camOff : v.camOn} className={`rounded-full p-2.5 text-white transition active:scale-95 ${chat.camOn ? "bg-black/60 hover:bg-black/80" : "bg-red-500 hover:bg-red-600"}`}>
                {chat.camOn ? <IconVideo className="h-4 w-4" /> : <IconVideoOff className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#1d2f47]">
          <video ref={chat.remoteVideoRef} autoPlay playsInline className="aspect-[4/3] w-full object-cover" />
          {!connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-white/80">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <IconUsers className="h-8 w-8" />
              </span>
              <p className="text-sm font-bold">{v.confirmGo}</p>
            </div>
          )}
          {connected && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">@{chat.peerShortId}{chat.peerAge != null ? ` · ${chat.peerAge}` : ""}</span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="demo-scroll h-[220px] space-y-2.5 overflow-y-auto bg-bg-muted p-4 dark:bg-[#0b1422]">
        {chat.messages.map((m, i) =>
          m.from === "sys" ? (
            <p key={i} className="mx-auto w-fit rounded-full bg-white px-4 py-1.5 text-center text-xs font-bold text-ink-soft shadow-sm dark:bg-white/10 dark:text-slate-200">{m.text}</p>
          ) : (
            <p key={i} className={`w-fit max-w-[80%] rounded-2xl px-4 py-2.5 text-[.95rem] font-semibold shadow-sm ${m.from === "me" ? "ml-auto rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-100"}`}>
              {m.text}
            </p>
          ),
        )}
        {chat.typingPeer && (
          <p className="w-fit animate-blink rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-soft dark:border-white/10 dark:bg-white/10 dark:text-slate-200">{v.typing}</p>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line bg-white p-3 dark:border-white/10 dark:bg-white/5">
        <input value={input} onChange={(e) => { setInput(e.target.value); chat.sendTyping && chat.sendTyping() }} placeholder={v.typeMessage} disabled={!connected} className="flex-1 rounded-full border border-line bg-bg-muted px-4 py-2.5 font-semibold outline-none transition focus:border-primary focus:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-[#0b1422] dark:text-slate-100 dark:focus:bg-[#0e1a2e]" />
        <button type="submit" disabled={!connected} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-extrabold text-white transition hover:bg-primary-dark active:scale-[.97] disabled:opacity-50">
          <IconSend className="h-4 w-4" /> {v.send}
        </button>
      </form>
    </div>
  )
}
