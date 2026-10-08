/** Logo VibeChat reutilizable (imagen webcam + texto) */
export default function Logo({ light = false, size = 40 }) {
  return (
    <span className="flex items-center gap-2.5 font-black text-2xl">
      <img
        src="/logo.png"
        alt="VibeChat logo webcam"
        width={size}
        height={size}
        className="rounded-2xl object-cover shadow-md"
      />
      <span className={light ? "text-white" : "text-primary"}>
        Vibe<span className={light ? "text-[#7db9ff]" : "text-accent"}>Chat</span>
      </span>
    </span>
  )
}
