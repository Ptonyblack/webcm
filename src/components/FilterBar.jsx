import { COUNTRIES, flagOf, nameOf } from "./countries.js"

/**
 * Panel "Tu perfil + filtros" para VibeChat.
 * País con banderas y rango de edad 18–50. Se guarda en localStorage desde el hook.
 */
export default function FilterBar({ chat }) {
  const lo = Math.min(chat.filterAgeMin, chat.filterAgeMax)
  const hi = Math.max(chat.filterAgeMin, chat.filterAgeMax)

  const onMin = (e) => chat.setAgeRange(Number(e.target.value), hi)
  const onMax = (e) => chat.setAgeRange(lo, Number(e.target.value))

  return (
    <div className="mx-auto mt-6 max-w-4xl rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-black">🎯 Tu perfil y filtros</h3>
        <p className="text-xs font-bold text-ink-soft">
          Buscando: {chat.filterCountry === "ANY" ? "🌍 Todo el mundo" : `${flagOf(chat.filterCountry)} ${nameOf(chat.filterCountry)}`} · {lo}–{hi} años
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-bg-muted p-4">
          <p className="text-sm font-black text-ink">Tu país y edad</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-xs font-bold text-ink-soft">
              País (muestra tu {flagOf(chat.myCountry)})
              <select
                value={chat.myCountry}
                onChange={(e) => chat.setMyCountry(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none"
              >
                <option value="ANY">🌍 Sin país / no decir</option>
                {COUNTRIES.filter((c) => c.code !== "ANY").map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex w-[120px] flex-col gap-1 text-xs font-bold text-ink-soft">
              Tu edad
              <input
                type="number" min={chat.MIN_AGE} max={chat.MAX_AGE}
                value={chat.myAge}
                onChange={(e) => chat.setMyAge(e.target.value)}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-ink outline-none"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-bg-muted p-4">
          <p className="text-sm font-black text-ink">¿A quién quieres conocer?</p>
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
            <p className="text-xs font-bold text-ink-soft">Edad: {lo} – {hi} años</p>
            <div className="mt-2 flex items-center gap-2">
              <input type="range" min={chat.MIN_AGE} max={chat.MAX_AGE} value={lo} onChange={onMin} className="w-full accent-[#0b74e5]" aria-label="Edad mínima" />
              <input type="range" min={chat.MIN_AGE} max={chat.MAX_AGE} value={hi} onChange={onMax} className="w-full accent-[#ff5a5f]" aria-label="Edad máxima" />
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-bold text-ink-soft">
              <span>18</span><span>50</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-ink-soft">
        💡 El emparejamiento es mutuo: solo te conecta con quien también encaje con tu país y edad.
      </p>
    </div>
  )
}
