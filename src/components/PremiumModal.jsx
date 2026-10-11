import { useState } from "react";
import { claimPremiumWithTx, trustWalletPayUrl, safepalInstructions, PAY_WALLET, PAY_NETWORK, PREMIUM_PRICE_USDT, PREMIUM_DAYS } from "../lib/premium.js";
import { getPremiumUntil } from "../lib/identity.js";
import { useSettings } from "../lib/settings.jsx";
// Modal premium TRON: 10 USDT-TRC20. TrustWallet via deep-link, SafePal via copiar+pegar.
export default function PremiumModal({ handle, onClose, onActivated }) {
  const { t } = useSettings()
  const p = t.premium
  const [tx, setTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const until = getPremiumUntil();
  const copy = async (txt) => { try { await navigator.clipboard.writeText(txt); setOk(p.copied); } catch { setErr(p.copyFail); } };
  const claim = async () => {
    setBusy(true); setErr(""); setOk("");
    try {
      const r = await claimPremiumWithTx(tx);
      setOk(p.activated(new Date(r.until).toLocaleDateString(), handle, PREMIUM_DAYS));
      onActivated?.(r.until);
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  };
  const openTrust = () => window.open(trustWalletPayUrl(), "_blank", "noopener");
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0e1a2e] dark:text-slate-100" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-black">{p.keepHandle(handle)}</h3>
        <p className="mt-1 text-sm font-semibold text-ink-soft dark:text-slate-300">{p.sub(PAY_NETWORK)}</p>
        {until > Date.now() && <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-green-500/10 dark:text-green-300">{p.activeUntil(new Date(until).toLocaleString())}</p>}
        <div className="mt-4 space-y-2">
          <img src="/qrcode.png" alt="QR pago 10 USDT TRC20" className="mx-auto w-44 rounded-2xl border border-line bg-white p-2 shadow-sm" />
          <p className="text-center text-xs font-bold text-ink-soft dark:text-slate-300">{p.scan}</p>
          <button onClick={openTrust} className="w-full rounded-2xl bg-[#3375BB] px-4 py-3 font-black text-white hover:brightness-110">{p.payTrust}</button>
          <button onClick={() => copy(PAY_WALLET + " | 10 USDT-TRC20")} className="w-full rounded-2xl bg-[#1E1E2E] px-4 py-3 font-black text-white hover:brightness-125">{p.copySafepal}</button>
          <p className="rounded-2xl border border-line bg-bg-muted px-4 py-2.5 text-xs font-semibold dark:border-white/10 dark:bg-white/5">{safepalInstructions()}</p>
          <button onClick={() => copy(PAY_WALLET)} className="w-full rounded-2xl border border-line bg-white px-4 py-2.5 text-xs font-bold dark:border-white/10 dark:bg-white/5 dark:text-slate-100">{p.wallet} {PAY_WALLET}</button>
        </div>
        <ol className="mt-3 space-y-1 text-xs font-semibold text-ink-soft dark:text-slate-300">
          <li>{p.step1(PREMIUM_PRICE_USDT)}</li>
          <li>{p.step2}</li>
          <li>{p.step3}</li>
        </ol>
        <input value={tx} onChange={(e) => setTx(e.target.value)} placeholder={p.hashPh} className="mt-3 w-full rounded-xl border border-line px-3 py-2.5 text-sm font-mono outline-none focus:border-primary dark:border-white/10 dark:bg-[#0b1422] dark:text-slate-100" />
        {err && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
        {ok && <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:bg-green-500/10 dark:text-green-300">{ok}</p>}
        <div className="mt-3 flex gap-2">
          <button onClick={claim} disabled={busy || !tx.trim()} className="flex-1 rounded-full bg-primary px-4 py-2.5 font-black text-white disabled:opacity-50">{busy ? p.verifying : p.verifyActivate}</button>
          <button onClick={onClose} className="rounded-full border border-line px-4 py-2.5 font-bold dark:border-white/10">{p.close}</button>
        </div>
      </div>
    </div>
  );
}

