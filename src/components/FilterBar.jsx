import { COUNTRIES, flagOf, nameOf } from "./countries.js"
import { IconSliders, IconPin, IconUsers, IconCheckCircle, IconAlert, IconLock, IconGlobe } from "./icons.jsx"

/**
 * Panel "Tu perfil + filtros" para VibeChat (PASO OBLIGATORIO antes de Empezar).
 * País con banderas y rango de edad 18–50. Sin confirmar no se abre la cámara.
 */
export default function FilterBar({ chat }) {
  const lo = chat.filterAgeMin === "" ? "" : Math.min(chat.filterAgeMin, chat.filterAgeMax === "" ? chat.filterAgeMin : chat.filterAgeMax)
  const hi = chat.filterAgeMax === "" ? "" : Math.max(chat.filterAgeMin === "" ? chat.filterAgeMax : chat.filterAgeMin, chat.filterAgeMax)

  const onMin = (e) => chat.setAgeRange(Number(e.target.value), hi === "" ? Number(e.target.value) : hi)
  const onMax = (e) => chat.setAgeRange(lo === "" ? Number(e.target.value) : lo, Number(e.target.value))

  const ready = chat.isProfileComplete()

  const confirm = () => {
    chat.confirmProfile()
  }

  const summary = lo === "" || hi === ""
    ? "elige el rango de edad"
    : `${lo}–${hi} años`

  return (
    <div id="filtros" className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-3xl border border-line bg-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-primary to-primary-dark px-5 py-4 text-white">
        <h3 className="flex items-center gap-2.5 text-lg font-black">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <IconSliders className="h-5 w-5" />
          </span>
          Tu perfil y filtros
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide">obligatorio</span>
        </h3>
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-white/85">
          <IconGlobe className="h-4 w-4" />
          Buscando: {chat.filterCountry === "ANY" ? "Todo el mundo" : `${flagOf(chat.filterCountry)} ${nameOf(chat.filterCountry)}`} · {summary}
        </p>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-bg-muted p-4">
          <p className="flex items-center gap-2 text-sm font-black text-ink"><IconPin className="h-4 w-4 text-primary" /> Tu país y edad</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-xs font-bold text-ink-soft">
              Tu país * {chat.myCountry && chat.myCountry !== "ANY" ? `(muestras ${flagOf(chat.myCountry)})` : ""}
              <select
                value={chat.myCountry || ""}
                onChange={(e) => chat.setMyCountry(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none"
              >
                <option value="">— Elige tu país —</option>
                {COUNTRIES.filter((c) => c.code !== "ANY").map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex w-[120px] flex-col gap-1 text-xs font-bold text-ink-soft">
              Tu edad *
              <input
                type="number" min={chat.MIN_AGE} max={chat.MAX_AGE}
                placeholder="18–50"
                value={chat.myAge}
                onChange={(e) => chat.setMyAge(e.target.value === "" ? "" : Number(e.target.value))}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-bg-muted p-4">
          <p className="flex items-center gap-2 text-sm font-black text-ink"><IconUsers className="h-4 w-4 text-primary" /> ¿A quién quieres conocer?</p>
          <label className="mt-3 flex flex-col gap-1 text-xs font-bold text-ink-soft">
            País del otro
            <select
              value={chat.filterCountry}
              onChange={(e) => chat.setFilterCountry(e.target.value)}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </label>
          <div className="mt-3">
            <p className="text-xs font-bold text-ink-soft">Edad que buscas * {lo === "" || hi === "" ? "" : `: ${lo} – ${hi} años`}</p>
            <div className="mt-2 flex items-center gap-2">
              <input type="range" min={chat.MIN_AGE} max={chat.MAX_AGE} value={lo === "" ? chat.MIN_AGE : lo} onChange={onMin} className="w-full accent-[#0b74e5]" aria-label="Edad mínima" />
              <input type="range" min={chat.MIN_AGE} max={chat.MAX_AGE} value={hi === "" ? chat.MAX_AGE : hi} onChange={onMax} className="w-full accent-[#ff5a5f]" aria-label="Edad máxima" />
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-bold text-ink-soft">
              <span>18</span><span>50</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        {chat.profileError && (
          <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700"><IconAlert className="h-5 w-5 shrink-0" /> {chat.profileError}</p>
        )}

        <button
          onClick={confirm}
          className={`mt-3 inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3.5 text-base font-black text-white shadow-lg transition active:scale-[.99] ${chat.profileConfirmed && ready ? "bg-green-500 shadow-green-500/30 hover:bg-green-600" : "bg-gradient-to-r from-primary to-primary-dark shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"}`}
        >
          <IconCheckCircle className="h-5 w-5" />
          {chat.profileConfirmed && ready ? "Perfil confirmado — puedes pulsar Empezar" : "Confirmar mi perfil y filtros"}
        </button>

        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
          <IconLock className="h-4 w-4 shrink-0" />
          Sin confirmar este paso no se activa la cámara. El emparejamiento es mutuo: solo te conecta con quien también encaje con tu país y edad.
        </p>
      </div>
    </div>
  )
}
