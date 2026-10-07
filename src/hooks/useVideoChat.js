import { useCallback, useEffect, useRef, useState } from "react"
import { joinRoom, selfId } from "trystero/nostr"

const APP_ID = "vibechat-p2p-v1"
const LOBBY_ID = "lobby-global-v2"
const PRESENCE_MS = 4000
const PEER_TIMEOUT_MS = 12000
const MIN_AGE = 18
const MAX_AGE = 50

function clampAge(v, fallback = 25) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(n)))
}

function normCountry(v, fallback = "ANY") {
  const c = String(v || "").toUpperCase()
  return /^[A-Z]{2,3}$/.test(c) ? c : fallback
}

function inAgeRange(age, min, max) {
  const a = Number(age)
  if (!Number.isFinite(a)) return true
  return a >= min && a <= max
}

const RTC_CFG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    // TURN UDP (rápido en PC) + TCP 443 (crucial en móviles con NAT/CG-NAT y redes que bloquean UDP)
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turns:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ],
  // En redes móviles el gathering puede tardar: no cortar candidatos demasiado pronto
  iceCandidatePoolSize: 4,
}

const ROOM_CFG = {
  appId: APP_ID,
  rtcConfig: RTC_CFG,
  relayConfig: { urls: ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.nostr.band", "wss://nostr-pub.wellorder.net", "wss://relay.snort.social"], redundancy: 3 },
}

function hashId(id) {
  let h = 0
  const s = String(id || "")
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function shortId(id) {
  return String(id || "").slice(0, 6).toUpperCase()
}

export default function useVideoChat() {
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState("")
  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [peerCount, setPeerCount] = useState(1)
  const [peerShortId, setPeerShortId] = useState("")
  const [messages, setMessages] = useState([])
  const [typingPeer, setTypingPeer] = useState(false)
  const [profileDone, setProfileDone] = useState(() => {
    try { return localStorage.getItem("vibechat-profile-done") === "1" } catch { return false }
  })
  const [profileError, setProfileError] = useState("")
  const [myCountry, setMyCountryState] = useState(() => {
    try { return normCountry(localStorage.getItem("vibechat-country"), "") } catch { return "" }
  })
  const [myAge, setMyAgeState] = useState(() => {
    try {
      const raw = localStorage.getItem("vibechat-age")
      if (raw == null || raw === "") return ""
      return clampAge(raw, "")
    } catch { return "" }
  })
  const [filterCountry, setFilterCountryState] = useState(() => {
    try { return normCountry(localStorage.getItem("vibechat-filter-country"), "ANY") } catch { return "ANY" }
  })
  const [filterAgeMin, setFilterAgeMinState] = useState(() => {
    try {
      const raw = localStorage.getItem("vibechat-filter-min")
      if (raw == null || raw === "") return ""
      return clampAge(raw, "")
    } catch { return "" }
  })
  const [filterAgeMax, setFilterAgeMaxState] = useState(() => {
    try {
      const raw = localStorage.getItem("vibechat-filter-max")
      if (raw == null || raw === "") return ""
      return clampAge(raw, "")
    } catch { return "" }
  })
  const [peerCountry, setPeerCountry] = useState("")
  const [peerAge, setPeerAge] = useState(null)

  const localStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const lobbyRef = useRef(null)
  const pairRef = useRef(null)
  const sendChatRef = useRef(null)
  const sendTypingRef = useRef(null)
  const sendByeRef = useRef(null)
  const reqSendRef = useRef(null)
  const ackSendRef = useRef(null)
  const presenceSendRef = useRef(null)
  const partnerRef = useRef("")
  const myIdRef = useRef(selfId)
  const myCountryRef = useRef("ANY")
  const myAgeRef = useRef(25)
  const filterCountryRef = useRef("ANY")
  const filterAgeMinRef = useRef(MIN_AGE)
  const filterAgeMaxRef = useRef(MAX_AGE)
  const profileRef = useRef(new Map())
  myCountryRef.current = myCountry
  myAgeRef.current = myAge
  filterCountryRef.current = filterCountry
  filterAgeMinRef.current = Math.min(filterAgeMin, filterAgeMax)
  filterAgeMaxRef.current = Math.max(filterAgeMin, filterAgeMax)
  const statusRef = useRef("idle")
  const typingTimer = useRef(null)
  const presenceTimer = useRef(null)
  const sweepTimer = useRef(null)
  const matchTimer = useRef(null)
  const seenRef = useRef(new Map())
  const busyRef = useRef(new Set())
  const connectingRef = useRef(false)
  statusRef.current = status

  const refreshCount = useCallback(() => {
    const now = Date.now()
    let n = 0
    for (const t of seenRef.current.values()) if (now - t < PEER_TIMEOUT_MS) n++
    setPeerCount(n + 1)
  }, [])

  const pushMsg = useCallback((from, text) => {
    setMessages((m) => [...m, { from, text, at: Date.now() }].slice(-100))
  }, [])

  const clearTimers = useCallback(() => {
    clearTimeout(matchTimer.current)
    clearInterval(presenceTimer.current)
    clearInterval(sweepTimer.current)
    matchTimer.current = null
    presenceTimer.current = null
    sweepTimer.current = null
  }, [])

  const setMyCountry = useCallback((v) => {
    const c = normCountry(v, "")
    setMyCountryState(c)
    setProfileDone(false)
    setProfileError("")
    try {
      if (c) localStorage.setItem("vibechat-country", c)
      else localStorage.removeItem("vibechat-country")
      localStorage.removeItem("vibechat-profile-done")
    } catch { /* noop */ }
    try { presenceSendRef.current?.({ from: myIdRef.current, busy: Boolean(partnerRef.current || connectingRef.current), country: c || "ANY", age: Number(myAgeRef.current) || null, wantCountry: filterCountryRef.current, wantMin: filterAgeMinRef.current, wantMax: filterAgeMaxRef.current }) } catch { /* noop */ }
  }, [])

  const setMyAge = useCallback((v) => {
    if (v === "" || v == null) {
      setMyAgeState("")
      setProfileDone(false)
      setProfileError("")
      try { localStorage.removeItem("vibechat-age"); localStorage.removeItem("vibechat-profile-done") } catch { /* noop */ }
      return
    }
    const a = clampAge(v, "")
    setMyAgeState(a)
    setProfileDone(false)
    setProfileError("")
    try { localStorage.setItem("vibechat-age", String(a)); localStorage.removeItem("vibechat-profile-done") } catch { /* noop */ }
    try { presenceSendRef.current?.({ from: myIdRef.current, busy: Boolean(partnerRef.current || connectingRef.current), country: myCountryRef.current || "ANY", age: a, wantCountry: filterCountryRef.current, wantMin: filterAgeMinRef.current, wantMax: filterAgeMaxRef.current }) } catch { /* noop */ }
  }, [])

  const setFilterCountry = useCallback((v) => {
    const c = normCountry(v, "ANY")
    setFilterCountryState(c)
    setProfileDone(false)
    setProfileError("")
    try { localStorage.setItem("vibechat-filter-country", c); localStorage.removeItem("vibechat-profile-done") } catch { /* noop */ }
    try { presenceSendRef.current?.({ from: myIdRef.current, busy: Boolean(partnerRef.current || connectingRef.current), country: myCountryRef.current || "ANY", age: Number(myAgeRef.current) || null, wantCountry: c, wantMin: filterAgeMinRef.current, wantMax: filterAgeMaxRef.current }) } catch { /* noop */ }
    scheduleMatchRef.current?.()
  }, [])

  const setAgeRange = useCallback((min, max) => {
    if (min === "" || min == null || max === "" || max == null) {
      setFilterAgeMinState(min === "" ? "" : clampAge(min, ""))
      setFilterAgeMaxState(max === "" ? "" : clampAge(max, ""))
      setProfileDone(false)
      setProfileError("")
      try { localStorage.removeItem("vibechat-profile-done") } catch { /* noop */ }
      return
    }
    const lo = clampAge(min, "")
    const hi = clampAge(max, "")
    const a = Math.min(lo, hi)
    const b = Math.max(lo, hi)
    setFilterAgeMinState(a)
    setFilterAgeMaxState(b)
    setProfileDone(false)
    setProfileError("")
    try { localStorage.setItem("vibechat-filter-min", String(a)); localStorage.setItem("vibechat-filter-max", String(b)); localStorage.removeItem("vibechat-profile-done") } catch { /* noop */ }
    try { presenceSendRef.current?.({ from: myIdRef.current, busy: Boolean(partnerRef.current || connectingRef.current), country: myCountryRef.current || "ANY", age: Number(myAgeRef.current) || null, wantCountry: filterCountryRef.current, wantMin: a, wantMax: b }) } catch { /* noop */ }
    scheduleMatchRef.current?.()
  }, [])

  const profileIssues = useCallback(() => {
    const issues = []
    if (!myCountry || myCountry === "ANY") issues.push("tu país")
    if (myAge === "" || myAge == null || Number(myAge) < MIN_AGE || Number(myAge) > MAX_AGE) issues.push("tu edad (18–50)")
    if (filterAgeMin === "" || filterAgeMax === "" || filterAgeMin == null || filterAgeMax == null) issues.push("el rango de edad que buscas")
    return issues
  }, [myCountry, myAge, filterAgeMin, filterAgeMax])

  const isProfileComplete = useCallback(() => profileIssues().length === 0, [profileIssues])

  const confirmProfile = useCallback(() => {
    const issues = profileIssues()
    if (issues.length > 0) {
      setProfileError("Completa tu perfil para empezar: falta " + issues.join(", ") + ".")
      setProfileDone(false)
      try { localStorage.removeItem("vibechat-profile-done") } catch { /* noop */ }
      document.getElementById("filtros")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return false
    }
    setProfileError("")
    setProfileDone(true)
    try { localStorage.setItem("vibechat-profile-done", "1") } catch { /* noop */ }
    try { presenceSendRef.current?.({ from: myIdRef.current, busy: Boolean(partnerRef.current || connectingRef.current), country: myCountryRef.current || "ANY", age: Number(myAgeRef.current) || null, wantCountry: filterCountryRef.current, wantMin: filterAgeMinRef.current, wantMax: filterAgeMaxRef.current }) } catch { /* noop */ }
    return true
  }, [profileIssues])

  function isCompatibleWith(peerId) {
    if (!peerId || peerId === myIdRef.current) return false
    const p = profileRef.current.get(peerId)
    const wCountry = filterCountryRef.current
    const wMin = Math.min(filterAgeMinRef.current, filterAgeMaxRef.current)
    const wMax = Math.max(filterAgeMinRef.current, filterAgeMaxRef.current)
    if (p) {
      if (wCountry !== "ANY" && p.country && p.country !== "ANY" && p.country !== wCountry) return false
      if (!inAgeRange(p.age, wMin, wMax)) return false
      if (p.wantCountry && p.wantCountry !== "ANY" && myCountryRef.current !== "ANY" && p.wantCountry !== myCountryRef.current) return false
      if (Number.isFinite(p.wantMin) && Number.isFinite(p.wantMax) && !inAgeRange(myAgeRef.current, Math.min(p.wantMin, p.wantMax), Math.max(p.wantMin, p.wantMax))) return false
      return true
    }
    return wCountry === "ANY"
  }

  const cleanupPair = useCallback(async (wasConnected) => {
    connectingRef.current = false
    try { await pairRef.current?.leave() } catch { /* noop */ }
    pairRef.current = null
    partnerRef.current = ""
    sendChatRef.current = null
    sendTypingRef.current = null
    sendByeRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setTypingPeer(false)
    setPeerShortId("")
    setPeerCountry("")
    setPeerAge(null)
    if (wasConnected) pushMsg("sys", "Se desconectó. Buscando a alguien nuevo... 🔎")
  }, [pushMsg])

  const stopAll = useCallback(async () => {
    clearTimers()
    connectingRef.current = false
    clearTimeout(typingTimer.current)
    try { await pairRef.current?.leave() } catch { /* noop */ }
    try { await lobbyRef.current?.leave() } catch { /* noop */ }
    lobbyRef.current = null
    pairRef.current = null
    partnerRef.current = ""
    reqSendRef.current = null
    ackSendRef.current = null
    presenceSendRef.current = null
    seenRef.current = new Map()
    busyRef.current = new Set()
    profileRef.current = new Map()
    setPeerCountry("")
    setPeerAge(null)
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setStatus("idle")
    setPeerShortId("")
    setPeerCountry("")
    setPeerAge(null)
    setPeerCount(1)
    setMessages([])
    setTypingPeer(false)
    setError("")
  }, [clearTimers])
  const startLocal = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    // 1) Intento ideal (PC + móviles modernos)
    const ideal = {
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(ideal)
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch(() => {})
      }
      return stream
    } catch (e) {
      // 2) Fallback móvil/tablet: constraints simples (iOS Safari y Android antiguos fallan con width/height ideales)
      if (e?.name !== "NotAllowedError" && e?.name !== "NotFoundError" && e?.name !== "SecurityError") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          localStreamRef.current = stream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
            localVideoRef.current.play().catch(() => {})
          }
          return stream
        } catch { /* cae al throw original */ }
      }
      throw e
    }
  }, [])

  const attachRemote = useCallback((stream) => {
    if (!stream || !remoteVideoRef.current) return
    try {
      remoteVideoRef.current.srcObject = stream
      remoteVideoRef.current.play().catch(() => {})
    } catch { /* noop */ }
  }, [])

  const scheduleMatchRef = useRef(null)

  const markConnected = useCallback((peerId) => {
    if (statusRef.current !== "waiting" && statusRef.current !== "connected") return
    if (partnerRef.current && partnerRef.current !== peerId) return
    connectingRef.current = false
    busyRef.current.delete(peerId)
    partnerRef.current = peerId
    setPeerShortId(shortId(peerId))
    const p = profileRef.current.get(peerId)
    setPeerCountry(p?.country && p.country !== "ANY" ? p.country : "")
    setPeerAge(Number.isFinite(p?.age) ? p.age : null)
    setStatus("connected")
    setError("")
    setMessages([{ from: "sys", text: "Conectado con @" + shortId(peerId) + ". ¡Di hola! 👋", at: Date.now() }])
  }, [])

  const tryMatchRef = useRef(null)

  const scheduleMatch = useCallback(() => {
    clearTimeout(matchTimer.current)
    matchTimer.current = setTimeout(() => tryMatchRef.current && tryMatchRef.current(), 800)
  }, [])

  scheduleMatchRef.current = scheduleMatch

  const tryMatch = useCallback(async () => {
    const sendReq = reqSendRef.current
    if (!lobbyRef.current || !sendReq) return
    if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current || connectingRef.current) return
    const now = Date.now()
    const fresh = [...seenRef.current.entries()].filter(([, t]) => now - t < PEER_TIMEOUT_MS).map(([id]) => id)
    const avail = fresh.filter((id) => id !== myIdRef.current && !busyRef.current.has(id) && isCompatibleWith(id))
    refreshCount()
    if (avail.length === 0) {
      clearTimeout(matchTimer.current)
      matchTimer.current = setTimeout(() => tryMatchRef.current && tryMatchRef.current(), 2500)
      return
    }
    const rival = avail.sort((a, b) => hashId(a) - hashId(b))[0]
    if (hashId(myIdRef.current) < hashId(rival)) {
      const pairId = "pair-" + [myIdRef.current, rival].sort().join("-").slice(0, 30) + "-" + Date.now().toString(36)
      try { await sendReq({ pairId, from: myIdRef.current, country: myCountryRef.current, age: myAgeRef.current, wantCountry: filterCountryRef.current, wantMin: filterAgeMinRef.current, wantMax: filterAgeMaxRef.current }, { target: rival }) } catch { /* noop */ }
      clearTimeout(matchTimer.current)
      matchTimer.current = setTimeout(() => { if (statusRef.current === "waiting" && !partnerRef.current && !connectingRef.current) tryMatchRef.current() }, 3000)
    } else {
      clearTimeout(matchTimer.current)
      matchTimer.current = setTimeout(() => { if (statusRef.current === "waiting" && !partnerRef.current && !connectingRef.current) tryMatchRef.current() }, 3500)
    }
  }, [refreshCount])

  tryMatchRef.current = tryMatch

  const openPair = useCallback(async (pairId, targetPeerId) => {
    if (pairRef.current || connectingRef.current || !localStreamRef.current) return
    if (!pairId || typeof pairId !== "string") return
    connectingRef.current = true
    const stream = localStreamRef.current
    let room
    try {
      room = joinRoom(ROOM_CFG, pairId)
    } catch {
      connectingRef.current = false
      return
    }
    pairRef.current = room
    const chatAction = room.makeAction("chat")
    const typingAction = room.makeAction("typing")
    const byeAction = room.makeAction("bye")
    sendChatRef.current = (data, opts) => chatAction.send(data, opts)
    sendTypingRef.current = (data, opts) => typingAction.send(data, opts)
    sendByeRef.current = (data, opts) => byeAction.send(data, opts)
    chatAction.onMessage = (data) => {
      const text = typeof data === "string" ? data : data?.text
      if (typeof text === "string" && text) pushMsg("them", String(text).slice(0, 500))
    }
    typingAction.onMessage = () => {
      setTypingPeer(true)
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setTypingPeer(false), 2000)
    }
    byeAction.onMessage = () => {
      const was = statusRef.current === "connected" || Boolean(partnerRef.current)
      cleanupPair(was).then(() => {
        if (statusRef.current !== "idle") {
          setStatus("waiting")
          scheduleMatch()
        }
      })
    }
    room.onPeerStream = (s) => attachRemote(s)
    room.onPeerTrack = (_t, s) => attachRemote(s)
    room.onPeerLeave = (id) => {
      if (partnerRef.current && id && partnerRef.current !== id) return
      const was = statusRef.current === "connected" || Boolean(partnerRef.current)
      cleanupPair(was).then(() => {
        if (statusRef.current !== "idle") {
          setStatus("waiting")
          scheduleMatch()
        }
      })
    }
    room.onPeerJoin = (peerId) => markConnected(peerId)
    try { await Promise.all(room.addStream(stream)) } catch { /* noop */ }
    try {
      const peers = Object.keys(room.getPeers() || {})
      if (peers.length > 0) {
        const pick = targetPeerId && peers.includes(targetPeerId) ? targetPeerId : peers[0]
        markConnected(pick)
        return
      }
    } catch { /* noop */ }
    setTimeout(() => {
      try {
        const peers = Object.keys(room.getPeers ? room.getPeers() : {})
        if (!partnerRef.current && peers.length > 0 && statusRef.current !== "idle") {
          const pick = targetPeerId && peers.includes(targetPeerId) ? targetPeerId : peers[0]
          markConnected(pick)
        }
      } catch { /* noop */ }
    }, 2500)
    // En móvil (4G/CG-NAT) el ICE vía TURN tarda más: dar 25s antes de rendirse (antes 12s)
    setTimeout(() => {
      if (!partnerRef.current && statusRef.current === "waiting") {
        connectingRef.current = false
        try { room.leave() } catch { /* noop */ }
        if (pairRef.current === room) pairRef.current = null
        scheduleMatch()
      }
    }, 25000)
  }, [attachRemote, cleanupPair, markConnected, scheduleMatch])

  const start = useCallback(async () => {
    const st = statusRef.current
    if (st === "starting" || st === "connected" || st === "waiting") return
    if (!isProfileComplete()) {
      confirmProfile()
      setStatus("idle")
      return
    }
    setStatus("starting")
    setError("")
    setMessages([])
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error")
      setError("Tu navegador no soporta cámara/micro. Usa Chrome, Edge o Firefox actualizado.")
      return
    }
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      setStatus("error")
      setError("La cámara requiere HTTPS. En local funciona, online necesitas https://.")
      return
    }
    try {
      await startLocal()
    } catch (e) {
      setStatus("denied")
      const ua = navigator.userAgent || ""
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      const isAndroid = /Android/.test(ua)
      setError(e?.name === "NotAllowedError"
        ? isIOS
          ? "Permiso denegado en iPhone/iPad: ve a Ajustes → Safari → Cámara y Micrófono → Permitir, recarga con HTTPS y pulsa Reintentar."
          : "Permiso denegado: toca el candado 🔒 del navegador, permite Cámara y Micrófono y pulsa Reintentar."
        : e?.name === "NotFoundError"
          ? "No se encontró cámara o micrófono en este dispositivo."
          : e?.name === "OverconstrainedError" || e?.name === "ConstraintNotSatisfiedError"
            ? "Tu cámara no acepta esos ajustes" + (isAndroid ? " (Android): prueba con Chrome actualizado." : " (iOS): abre en Safari con HTTPS.") + " Pulsa Reintentar."
            : "No se pudo acceder a la cámara/micro: " + (e?.message || e))
      return
    }
    try {
      const lobby = joinRoom(ROOM_CFG, LOBBY_ID)
      lobbyRef.current = lobby
      const presenceAction = lobby.makeAction("presence")
      const reqAction = lobby.makeAction("req")
      const ackAction = lobby.makeAction("ack")
      const busyAction = lobby.makeAction("busy")
      presenceSendRef.current = (data, opts) => presenceAction.send(data, opts)
      reqSendRef.current = (data, opts) => reqAction.send(data, opts)
      ackSendRef.current = (data, opts) => ackAction.send(data, opts)
      const noteSeen = (id) => {
        if (!id || id === myIdRef.current) return
        seenRef.current.set(id, Date.now())
        refreshCount()
      }
      lobby.onPeerJoin = (id) => noteSeen(id)
      lobby.onPeerLeave = (id) => {
        seenRef.current.delete(id)
        busyRef.current.delete(id)
        profileRef.current.delete(id)
        refreshCount()
      }
      const saveProfile = (id, data) => {
        if (!id) return
        profileRef.current.set(id, {
          country: normCountry(data?.country, "ANY"),
          age: Number.isFinite(Number(data?.age)) ? clampAge(data.age, 25) : null,
          wantCountry: normCountry(data?.wantCountry, "ANY"),
          wantMin: Number.isFinite(Number(data?.wantMin)) ? clampAge(data.wantMin, MIN_AGE) : MIN_AGE,
          wantMax: Number.isFinite(Number(data?.wantMax)) ? clampAge(data.wantMax, MAX_AGE) : MAX_AGE,
        })
      }
      presenceAction.onMessage = (data, ctx) => {
        const id = data?.from || ctx?.peerId
        noteSeen(id)
        if (!id) return
        saveProfile(id, data)
        if (data?.busy) busyRef.current.add(id)
        else busyRef.current.delete(id)
      }
      busyAction.onMessage = (data, ctx) => {
        const id = data?.from || ctx?.peerId
        if (id) busyRef.current.add(id)
      }
      const profilePayload = () => ({ from: myIdRef.current, country: myCountryRef.current, age: myAgeRef.current, wantCountry: filterCountryRef.current, wantMin: filterAgeMinRef.current, wantMax: filterAgeMaxRef.current })
      reqAction.onMessage = async (data, ctx) => {
        const fromId = data?.from || ctx?.peerId
        if (fromId) noteSeen(fromId)
        if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current || connectingRef.current) return
        const pairId = data?.pairId
        if (typeof pairId !== "string" || !pairId) return
        if (!fromId) return
        saveProfile(fromId, data)
        if (!isCompatibleWith(fromId)) return
        if (hashId(myIdRef.current) < hashId(fromId)) return
        try { await ackAction.send({ ok: true, pairId, from: myIdRef.current, ...profilePayload() }, { target: fromId }) } catch { /* noop */ }
        try { await presenceAction.send({ from: myIdRef.current, busy: true, ...profilePayload() }) } catch { /* noop */ }
        busyRef.current.add(fromId)
        await openPair(pairId, fromId)
      }
      ackAction.onMessage = async (data, ctx) => {
        const fromId = data?.from || ctx?.peerId
        if (fromId) noteSeen(fromId)
        if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current) return
        if (!data || data.ok !== true || typeof data.pairId !== "string") return
        saveProfile(fromId, data)
        if (fromId && !isCompatibleWith(fromId)) return
        try { await presenceAction.send({ from: myIdRef.current, busy: true, ...profilePayload() }) } catch { /* noop */ }
        if (fromId) busyRef.current.add(fromId)
        await openPair(data.pairId, fromId)
      }
      const beat = async () => {
        try { await presenceAction.send({ from: myIdRef.current, busy: Boolean(partnerRef.current || connectingRef.current), ...profilePayload() }) } catch { /* noop */ }
        refreshCount()
      }
      await beat()
      clearInterval(presenceTimer.current)
      presenceTimer.current = setInterval(beat, PRESENCE_MS)
      clearInterval(sweepTimer.current)
      sweepTimer.current = setInterval(() => {
        const now = Date.now()
        for (const [id, t] of [...seenRef.current.entries()]) {
          if (now - t > PEER_TIMEOUT_MS) {
            seenRef.current.delete(id)
            busyRef.current.delete(id)
          }
        }
        refreshCount()
      }, PRESENCE_MS)
      try {
        const peers = Object.keys(lobby.getPeers() || {})
        peers.forEach(noteSeen)
      } catch { /* noop */ }
      setStatus("waiting")
      refreshCount()
      pushMsg("sys", "En el lobby 👀 buscando a alguien real...")
      scheduleMatch()
    } catch (e) {
      setStatus("error")
      setError("No se pudo conectar a la red P2P: " + (e?.message || e))
    }
  }, [openPair, pushMsg, refreshCount, scheduleMatch, startLocal])

  const next = useCallback(async () => {
    const st = statusRef.current
    if (st !== "connected" && st !== "waiting") return
    try { await sendByeRef.current?.({ from: myIdRef.current }) } catch { /* noop */ }
    try { await presenceSendRef.current?.({ from: myIdRef.current, busy: false, country: myCountryRef.current, age: myAgeRef.current, wantCountry: filterCountryRef.current, wantMin: filterAgeMinRef.current, wantMax: filterAgeMaxRef.current }) } catch { /* noop */ }
    await cleanupPair(false)
    setMessages([{ from: "sys", text: "Buscando a alguien nuevo... 🔎", at: Date.now() }])
    setStatus("waiting")
    setTypingPeer(false)
    scheduleMatch()
  }, [cleanupPair, scheduleMatch])

  const sendMessage = useCallback(async (text) => {
    const t = String(text || "").trim().slice(0, 500)
    if (!t || !sendChatRef.current || !partnerRef.current) return false
    pushMsg("me", t)
    try {
      await sendChatRef.current({ text: t }, { target: partnerRef.current })
      return true
    } catch { return false }
  }, [pushMsg])

  const sendTyping = useCallback(async () => {
    try { await sendTypingRef.current?.({}, partnerRef.current ? { target: partnerRef.current } : undefined) } catch { /* noop */ }
  }, [])

  const toggleCam = useCallback(() => {
    setCamOn((v) => {
      const nv = !v
      try { localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = nv }) } catch { /* noop */ }
      return nv
    })
  }, [])

  const toggleMic = useCallback(() => {
    setMicOn((v) => {
      const nv = !v
      try { localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = nv }) } catch { /* noop */ }
      return nv
    })
  }, [])

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [status])

  useEffect(() => () => {
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    clearTimeout(typingTimer.current)
    clearTimeout(matchTimer.current)
    clearInterval(presenceTimer.current)
    clearInterval(sweepTimer.current)
  }, [])

  return {
    status, error, camOn, micOn,
    peerCount, peerShortId, peerCountry, peerAge, messages, typingPeer,
    myCountry, myAge, filterCountry, filterAgeMin, filterAgeMax, MIN_AGE, MAX_AGE,
    profileDone, profileError, isProfileComplete, confirmProfile,
    setMyCountry, setMyAge, setFilterCountry, setAgeRange,
    localVideoRef, remoteVideoRef,
    selfShortId: shortId(myIdRef.current),
    start, stop: stopAll, next, sendMessage, sendTyping,
    toggleCam, toggleMic, retry: start,
  }
}

