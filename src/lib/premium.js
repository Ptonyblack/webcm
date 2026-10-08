// Premium VibeChat — 10 USDT / 30 dias en TRON (TRC-20). Compatible TrustWallet + SafePal.
// 100% frontend Fase 1: verifica el hash en TronGrid/Tronscan publicos sin instalar nada.
import { activatePremiumLocal, getPremiumUntil, isPremium } from "./identity.js";
export const PREMIUM_PRICE_USDT = 10;
export const PREMIUM_DAYS = 30;
export const PAY_WALLET = (import.meta?.env?.VITE_PAY_WALLET_TRON || "TE2gVY3ue9zBsj7e3xeMcZGraRKYzAP9c8").trim();
export const USDT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
export const PAY_NETWORK = "TRON (TRC-20)";
const USDT_HEX = "41a614f803b6fd780986a42c78ec9c7f77e6ded13c"; // contrato USDT-TRC20
const ONE_USDT = 1000000; // 6 decimales
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
// Base58Check -> hex TRON (41…). Sin librerias.
export function tronToHex(addr) {
  const a = String(addr || "").trim();
  if (/^41[0-9a-fA-F]{40}$/.test(a)) return a.toLowerCase();
  const bytes = [0];
  for (const ch of a) {
    const v = B58.indexOf(ch);
    if (v < 0) throw new Error("Dirección TRON inválida.");
    let carry = v;
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  let pad = 0;
  for (const ch of a) { if (ch === "1") pad++; else break; }
  const full = new Uint8Array(pad + bytes.length);
  for (let i = 0; i < bytes.length; i++) full[full.length - 1 - i] = bytes[i];
  if (full.length !== 25) throw new Error("Dirección TRON inválida.");
  return [...full].slice(0, 21).map((b) => b.toString(16).padStart(2, "0")).join("").toLowerCase();
}
function normHash(h) {
  let s = String(h || "").trim();
  if (/^0x/i.test(s)) s = s.slice(2);
  if (!/^[0-9a-fA-F]{64}$/.test(s)) throw new Error("Hash inválido. Pega el hash de la transacción TRON (64 caracteres).");
  return s.toLowerCase();
}
async function fetchTronGrid(txid) {
  const r = await fetch("https://api.trongrid.io/wallet/gettransactionbyid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ value: txid }) });
  if (!r.ok) throw new Error("TronGrid no responde. Reintenta en 1 min.");
  return r.json();
}
async function fetchTronscan(txid) {
  const r = await fetch("https://apilist.tronscanapi.com/api/transaction-info?hash=" + txid);
  if (!r.ok) throw new Error("Tronscan no responde. Reintenta en 1 min.");
  return r.json();
}
// Verifica que txHash sea una transferencia de 10 USDT-TRC20 hacia PAY_WALLET.
export async function verifyPremiumTx(txidRaw) {
  const txid = normHash(txidRaw);
  const wantTo = tronToHex(PAY_WALLET);
  // 1) TronGrid: contrato + destino + monto + confirmada
  try {
    const g = await fetchTronGrid(txid);
    const c = g?.raw_data?.contract?.[0];
    const param = c?.parameter?.value;
    const contractAddr = String(param?.contract_address || "").toLowerCase();
    const toAddr = String(param?.to_address || "").toLowerCase();
    const amount = Number(param?.amount || 0);
    if (contractAddr && contractAddr !== USDT_HEX) throw new Error("Esa transacción no es USDT-TRC20.");
    if (toAddr && toAddr !== wantTo) throw new Error("El destino no es la wallet oficial TRON. Revisa la dirección.");
    if (contractAddr === USDT_HEX && toAddr === wantTo && amount >= PREMIUM_PRICE_USDT * ONE_USDT) {
      markTxUsed(txid);
      return { ok: true, network: PAY_NETWORK, to: PAY_WALLET, amount: amount / ONE_USDT };
    }
  } catch (e) { if (/no es|destino/i.test(e?.message || "")) throw e; }
  // 2) Tronscan como respaldo
  const t = await fetchTronscan(txid);
  const trc20 = t?.trc20TransferInfo || t?.tokenTransferInfo || {};
  const to = String(trc20?.to_address || t?.toAddress || "").trim();
  const sym = String(trc20?.symbol || trc20?.tokenName || t?.tokenName || "USDT").toUpperCase();
  const amtRaw = Number(trc20?.amount_str ?? trc20?.amount ?? 0);
  const dec = Number(trc20?.decimals ?? 6);
  const amt = dec > 20 ? amtRaw / 10 ** dec : amtRaw / ONE_USDT;
  if (!to && !trc20?.to_address) throw new Error("No se encontró esa transacción en TRON todavía. Espera 1 min y reintenta.");
  if (sym && !sym.includes("USDT")) throw new Error("Esa transacción no es USDT.");
  let toHex = "";
  try { toHex = tronToHex(to); } catch { /* Tronscan a veces devuelve hex */ toHex = to.toLowerCase(); }
  if (toHex !== wantTo && to.toLowerCase() !== PAY_WALLET.toLowerCase()) throw new Error("El destino no es la wallet oficial TRON.");
  if (!(amt >= PREMIUM_PRICE_USDT)) throw new Error("El monto es menor a 10 USDT.");
  if (t?.confirmed !== true && t?.contractRet !== "SUCCESS" && t?.ret?.[0]?.contractRet !== "SUCCESS") throw new Error("La transacción aún no está confirmada o falló.");
  markTxUsed(txid);
  return { ok: true, network: PAY_NETWORK, to: PAY_WALLET, amount: amt };
}
function markTxUsed(txid) {
  try {
    const k = "vibechat-premium-txs";
    const list = JSON.parse(localStorage.getItem(k) || "[]");
    if (list.includes(txid)) throw new Error("Ese hash ya fue usado. Cada pago vale por 1 activación.");
    list.push(txid);
    localStorage.setItem(k, JSON.stringify(list.slice(-50)));
  } catch (e) { if (/ya fue usado/i.test(e?.message || "")) throw e; }
}
export async function claimPremiumWithTx(txHash) {
  const v = await verifyPremiumTx(txHash);
  const until = activatePremiumLocal(PREMIUM_DAYS);
  return { ...v, until };
}
// TrustWallet abre la pantalla de envío del token (el usuario confirma monto/destino).
export function trustWalletPayUrl(amount = PREMIUM_PRICE_USDT) {
  return `https://link.trustwallet.com/send?asset=c195_t${USDT_TRC20}&address=${PAY_WALLET}&amount=${amount}`;
}
// SafePal / resto: no acepta deep-link de pago TRON genérico → instrucción copiar+pegar.
export function safepalInstructions() {
  return `Abre SafePal → USDT → Enviar → red TRON (TRC-20) → destino ${PAY_WALLET} → monto ${PREMIUM_PRICE_USDT} → confirma y pega aquí el hash.`;
}
export { getPremiumUntil, isPremium, activatePremiumLocal };
