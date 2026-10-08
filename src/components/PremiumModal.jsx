import { useState } from "react";
import { claimPremiumWithTx, trustWalletPayUrl, safepalInstructions, PAY_WALLET, PAY_NETWORK, PREMIUM_PRICE_USDT, PREMIUM_DAYS } from "../lib/premium.js";
import { getPremiumUntil } from "../lib/identity.js";
// Modal premium TRON: 10 USDT-TRC20. TrustWallet via deep-link, SafePal via copiar+pegar.
export default function PremiumModal({ handle, onClose, onActivated }) {
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const until = getPremiumUntil();
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); setOk("Copiado. Pégalo en tu wallet."); } catch { setErr("No se pudo copiar."); } };
  const claim = async () => {
    setBusy(true); setErr(""); setOk("");
    try {
      const r = await claimPremiumWithTx(tx);
      setOk("Premium activado hasta " + new Date(r.until).toLocaleDateString() + ". Tu " + handle + " queda fijo " + PREMIUM_DAYS + " días.");
      onActivated?.(r.until);
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  };
  const openTrust = () => window.open(trustWalletPayUrl(), "_blank", "noopener");
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-black">Conserva {handle} — 10 USDT/mes</h3>
        <p className="mt-1 text-sm font-semibold text-ink-soft">Red {PAY_NETWORK}. Gratis = handle random cada vez. Premium = nombre fijo + contactos + DM.</p>
        {until > Date.now() && <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700">Activo hasta {new Date(until).toLocaleString()}</p>}
        <div className="mt-4 space-y-2">
          <img src="/qrcode.png" alt="QR pago 10 USDT TRC20" className="mx-auto w-44 rounded-2xl border border-line bg-white p-2 shadow-sm" />
          <p className="text-center text-xs font-bold text-ink-soft">Escanea con SafePal o TrustWallet — 10 USDT red TRON (TRC-20)</p>
          <button onClick={openTrust} className="w-full rounded-2xl bg-[#3375BB] px-4 py-3 font-black text-white hover:brightness-110">Pagar con Trust Wallet</button>
          <button onClick={() => copy(PAY_WALLET + " | 10 USDT-TRC20")} className="w-full rounded-2xl bg-[#1E1E2E] px-4 py-3 font-black text-white hover:brightness-125">Copiar datos para SafePal</button>
          <p className="rounded-2xl border border-line bg-bg-muted px-4 py-2.5 text-xs font-semibold">{safepalInstructions()}</p>
          <button onClick={() => copy(PAY_WALLET)} className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs font-bold">Wallet: {PAY_WALLET}</button>
        </div>
        <ol className="mt-3 space-y-1 text-xs font-semibold text-ink-soft">
          <li>1. Envía exacto {PREMIUM_PRICE_USDT} USDT por red TRON (TRC-20).</li>
          <li>2. Copia el hash (64 caracteres) desde SafePal o TrustWallet.</li>
          <li>3. Pégalo abajo y pulsa Verificar.</li>
        </ol>
        <input value={tx} onChange={(e) => setTx(e.target.value)} placeholder="hash TRON (64 caracteres)" className="mt-3 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-mono outline-none focus:border-primary" />
        {err && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{err}</p>}
        {ok && <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700">{ok}</p>}
        <div className="mt-3 flex gap-2">
          <button onClick={claim} disabled={busy || !tx.trim()} className="flex-1 rounded-full bg-primary px-4 py-2.5 font-black text-white disabled:opacity-50">{busy ? "Verificando en TRON…" : "Verificar y activar"}</button>
          <button onClick={onClose} className="rounded-full border border-line px-4 py-2.5 font-bold">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

