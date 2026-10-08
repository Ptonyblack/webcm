// Identidad VibeChat — Fase 1 (100% frontend, sin instalar nada)
// Handle @XXXXXX random por sesion (gratis) o permanente (premium)
// Device ID + claves ECDH (WebCrypto). La privada NUNCA sale del dispositivo.
const HANDLE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LS_KEYS = {
  deviceId: "vibechat-device-id",
  privJwk: "vibechat-id-priv-jwk",
  pubJwk: "vibechat-id-pub-jwk",
  permanentHandle: "vibechat-handle-permanent",
  sessionHandle: "vibechat-handle-session",
  premiumUntil: "vibechat-premium-until",
  contacts: "vibechat-contacts",
};
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* noop */ } }
export function randomHandle() {
  const buf = crypto.getRandomValues(new Uint8Array(6));
  let s = "@";
  for (let i = 0; i < 6; i++) s += HANDLE_ALPHABET[buf[i] % HANDLE_ALPHABET.length];
  return s;
}
export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(LS_KEYS.deviceId);
    if (!id) {
      const b = crypto.getRandomValues(new Uint8Array(16));
      id = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(LS_KEYS.deviceId, id);
    }
    return id;
  } catch { return "ephemeral-" + Math.random().toString(36).slice(2); }
}
export async function getOrCreateKeyPair() {
  const sp = safeGet(LS_KEYS.privJwk);
  const su = safeGet(LS_KEYS.pubJwk);
  if (sp && su) {
    try {
      const priv = await crypto.subtle.importKey("jwk", JSON.parse(sp), { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
      return { privateKey: priv, publicJwk: JSON.parse(su) };
    } catch { /* regenerar */ }
  }
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  safeSet(LS_KEYS.privJwk, JSON.stringify(privJwk));
  safeSet(LS_KEYS.pubJwk, JSON.stringify(pubJwk));
  return { privateKey: kp.privateKey, publicJwk: pubJwk };
}
export async function getDevicePublicId() {
  try {
    const { publicJwk } = await getOrCreateKeyPair();
    const raw = JSON.stringify({ x: publicJwk.x, y: publicJwk.y });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 32);
  } catch { return getOrCreateDeviceId(); }
}
export async function encryptForPeer(privateKey, peerPublicJwk, plaintext) {
  const peerPub = await crypto.subtle.importKey("jwk", peerPublicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const aes = await crypto.subtle.deriveKey({ name: "ECDH", public: peerPub }, privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(plaintext));
  return { iv: btoa(String.fromCharCode(...iv)), data: btoa(String.fromCharCode(...new Uint8Array(ct))) };
}
export async function decryptFromPeer(privateKey, peerPublicJwk, payload) {
  const peerPub = await crypto.subtle.importKey("jwk", peerPublicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const aes = await crypto.subtle.deriveKey({ name: "ECDH", public: peerPub }, privateKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(payload.data), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aes, data);
  return new TextDecoder().decode(pt);
}
export function getPremiumUntil() {
  const raw = safeGet(LS_KEYS.premiumUntil);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n < Date.now()) {
    try { localStorage.removeItem(LS_KEYS.premiumUntil); } catch { /* noop */ }
    try { localStorage.removeItem(LS_KEYS.permanentHandle); } catch { /* noop */ }
    return 0;
  }
  return n;
}
export function isPremium() { return getPremiumUntil() > Date.now(); }
export function activatePremiumLocal(days = 30) {
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  safeSet(LS_KEYS.premiumUntil, String(until));
  const sess = safeGet(LS_KEYS.sessionHandle);
  const perm = safeGet(LS_KEYS.permanentHandle);
  if (!perm && sess) safeSet(LS_KEYS.permanentHandle, sess);
  return until;
}
export function resolveHandle() {
  if (isPremium()) {
    let perm = safeGet(LS_KEYS.permanentHandle);
    if (!perm) { perm = randomHandle(); safeSet(LS_KEYS.permanentHandle, perm); }
    return { handle: perm, permanent: true };
  }
  const h = randomHandle();
  safeSet(LS_KEYS.sessionHandle, h);
  return { handle: h, permanent: false };
}
export function regenerateSessionHandle() {
  const h = randomHandle();
  safeSet(LS_KEYS.sessionHandle, h);
  return h;
}
export function getContacts() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.contacts) || "[]"); } catch { return []; }
}
export function saveContact(entry) {
  const list = getContacts();
  if (!list.some((c) => c.deviceId === entry.deviceId)) {
    list.push({ ...entry, at: Date.now() });
    try { localStorage.setItem(LS_KEYS.contacts, JSON.stringify(list.slice(-100))); } catch { /* noop */ }
  }
  return list;
}
export function dmRoomId(idA, idB) {
  const [a, b] = [String(idA), String(idB)].sort();
  return `dm-${a.slice(0, 12)}-${b.slice(0, 12)}`;
}
