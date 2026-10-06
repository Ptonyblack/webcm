import { useEffect, useRef, useState } from "react"

export default function VideoChat({ chat }) {
  const [input, setInput] = useState("")
  const scrollRef = useRef(null)
  const connected = chat.status === "connected"
  const active = chat.status === "starting" || chat.status === "waiting" || connected

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
    <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-3xl border border-line bg-white shadow-xl">
      <div className="flex flex-wrap items-center gap-3 bg-dark px-5 py-4 text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl">🎥</span>
        <div className="flex-1 min-w-[180px]">
          <p className="font-extrabold leading-tight">
            {connected ? `Conectado con @${chat.peerShortId}` : chat.status === "waiting" ? "Buscando a alguien… 🔎" : "Videochat aleatorio"}
          </p>
          <p className="text-xs font-bold text-white/70">Tú eres @{chat.selfShortId} · <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />{chat.peerCount} en línea ahora</span></p>
        </div>
        {!active && (
          <button onClick={chat.start} className="rounded-full bg-green-500 px-5 py-2 text-sm font-black text-white">▶ Empezar</button>
        )}
        {active && (
          <div className="flex gap-2">
            {connected && (
              <button onClick={chat.next} className="rounded-full bg-white px-4 py-2 text-sm font-black text-ink">Siguiente ➜</button>
            )}
            <button onClick={chat.stop} className="rounded-full bg-red-500 px-4 py-2 text-sm font-black text-white">⏹ Salir</button>
          </div>
        )}
      </div>
      {chat.error && (
        <div className="border-b border-line bg-red-50 px-5 py-3 text-sm font-bold text-red-700">
          ⚠️ {chat.error}{" "}
          <button onClick={chat.retry} className="ml-2 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">Reintentar</button>
        </div>
      )}

      <div className="grid gap-2 bg-black p-3 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl bg-[#16283f]">
          <video ref={chat.localVideoRef} autoPlay playsInline muted className="aspect-[4/3] w-full -scale-x-100 object-cover" />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">
            Tú @{chat.selfShortId} {chat.micOn ? "🎙️" : "🔇"}
          </span>
          {active && (
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button onClick={chat.toggleMic} className="rounded-full bg-black/60 px-2.5 py-1 text-sm text-white">🎙️</button>
              <button onClick={chat.toggleCam} className="rounded-full bg-black/60 px-2.5 py-1 text-sm text-white">📷</button>
            </div>
          )}
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-[#1d2f47]">
          <video ref={chat.remoteVideoRef} autoPlay playsInline className="aspect-[4/3] w-full object-cover" />
          {!connected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-white/80">
              <span className="text-5xl">👋</span>
              <p className="text-sm font-bold">Pulsa Empezar y permite cámara + micro</p>
            </div>
          )}
          {connected && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white">@{chat.peerShortId}</span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="demo-scroll h-[220px] space-y-2.5 overflow-y-auto bg-bg-muted p-4">
        {chat.messages.map((m, i) =>
          m.from === "sys" ? (
            <p key={i} className="mx-auto w-fit rounded-full bg-white px-4 py-1.5 text-center text-xs font-bold text-ink-soft shadow-sm">{m.text}</p>
          ) : (
            <p key={i} className={`w-fit max-w-[80%] rounded-2xl px-4 py-2.5 text-[.95rem] font-semibold shadow-sm ${m.from === "me" ? "ml-auto rounded-br-md bg-primary text-white" : "rounded-bl-md border border-line bg-white"}`}>
              {m.text}
            </p>
          ),
        )}
        {chat.typingPeer && (
          <p className="w-fit animate-blink rounded-2xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-soft">Escribiendo…</p>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line bg-white p-3">
        <input value={input} onChange={(e) => { setInput(e.target.value); chat.sendTyping && chat.sendTyping() }} placeholder="Escribe un mensaje…" disabled={!connected} className="flex-1 rounded-full border border-line bg-bg-muted px-4 py-2.5 font-semibold outline-none disabled:opacity-50" />
        <button type="submit" disabled={!connected} className="rounded-full bg-primary px-5 py-2.5 font-extrabold text-white disabled:opacity-50">Enviar</button>
      </form>
    </div>
  )
}
