/** Logo OmeTV reutilizable (ícono + texto) */
export default function Logo({ light = false, size = 34 }) {
  return (
    <span className="flex items-center gap-2.5 font-black text-2xl">
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <rect width="100" height="100" rx="24" fill="currentColor" />
        <path
          d="M28 36h30a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V42a6 6 0 0 1 6-6zm38 10 12-8v24l-12-8z"
          fill="#fff"
        />
      </svg>
      <span className={light ? "text-white" : "text-primary"}>
        Ome<span className={light ? "text-[#7db9ff]" : "text-accent"}>TV</span>
      </span>
    </span>
  )
}
