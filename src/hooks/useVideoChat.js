import { useCallback, useEffect, useRef, useState } from "react"
import { joinRoom, selfId } from "trystero/nostr"

const APP_ID = "webcm-ometv-v2"
const LOBBY_ID = "lobby-global-v2"
const PRESENCE_MS = 4000
const PEER_TIMEOUT_MS = 12000

const RTC_CFG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ],
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
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setStatus("idle")
    setPeerShortId("")
    setPeerCount(1)
    setMessages([])
    setTypingPeer(false)
    setError("")
  }, [clearTimers])
  const startLocal = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      audio: { echoCancellation: true, noiseSuppression: true },
    })
    localStreamRef.current = stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
      localVideoRef.current.play().catch(() => {})
    }
    return stream
  }, [])

  const attachRemote = useCallback((stream) => {
    if (!stream || !remoteVideoRef.current) return
    try {
      remoteVideoRef.current.srcObject = stream
      remoteVideoRef.current.play().catch(() => {})
    } catch { /* noop */ }
  }, [])

  const markConnected = useCallback((peerId) => {
    if (statusRef.current !== "waiting" && statusRef.current !== "connected") return
    if (partnerRef.current && partnerRef.current !== peerId) return
    connectingRef.current = false
    busyRef.current.delete(peerId)
    partnerRef.current = peerId
    setPeerShortId(shortId(peerId))
    setStatus("connected")
    setError("")
    setMessages([{ from: "sys", text: "Conectado con @" + shortId(peerId) + ". ¡Di hola! 👋", at: Date.now() }])
  }, [])

  const tryMatchRef = useRef(null)

  const scheduleMatch = useCallback(() => {
    clearTimeout(matchTimer.current)
    matchTimer.current = setTimeout(() => tryMatchRef.current && tryMatchRef.current(), 800)
  }, [])

  const tryMatch = useCallback(async () => {
    const sendReq = reqSendRef.current
    if (!lobbyRef.current || !sendReq) return
    if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current || connectingRef.current) return
    const now = Date.now()
    const fresh = [...seenRef.current.entries()].filter(([, t]) => now - t < PEER_TIMEOUT_MS).map(([id]) => id)
    const avail = fresh.filter((id) => id !== myIdRef.current && !busyRef.current.has(id))
    refreshCount()
    if (avail.length === 0) {
      clearTimeout(matchTimer.current)
      matchTimer.current = setTimeout(() => tryMatchRef.current && tryMatchRef.current(), 2500)
      return
    }
    const rival = avail.sort((a, b) => hashId(a) - hashId(b))[0]
    if (hashId(myIdRef.current) < hashId(rival)) {
      const pairId = "pair-" + [myIdRef.current, rival].sort().join("-").slice(0, 30) + "-" + Date.now().toString(36)
      try { await sendReq({ pairId, from: myIdRef.current }, { target: rival }) } catch { /* noop */ }
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
    setTimeout(() => {
      if (!partnerRef.current && statusRef.current === "waiting") {
        connectingRef.current = false
        try { room.leave() } catch { /* noop */ }
        if (pairRef.current === room) pairRef.current = null
        scheduleMatch()
      }
    }, 12000)
  }, [attachRemote, cleanupPair, markConnected, scheduleMatch])

  const start = useCallback(async () => {
    const st = statusRef.current
    if (st === "starting" || st === "connected" || st === "waiting") return
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
      setError(e?.name === "NotAllowedError"
        ? "Permiso denegado: clic en el candado 🔒 del navegador, permite Cámara y Micrófono y pulsa Reintentar."
        : e?.name === "NotFoundError"
          ? "No se encontró cámara o micrófono en este dispositivo."
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
        refreshCount()
      }
      presenceAction.onMessage = (data, ctx) => {
        const id = data?.from || ctx?.peerId
        noteSeen(id)
        if (!id) return
        if (data?.busy) busyRef.current.add(id)
        else busyRef.current.delete(id)
      }
      busyAction.onMessage = (data, ctx) => {
        const id = data?.from || ctx?.peerId
        if (id) busyRef.current.add(id)
      }
      reqAction.onMessage = async (data, ctx) => {
        const fromId = data?.from || ctx?.peerId
        if (fromId) noteSeen(fromId)
        if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current || connectingRef.current) return
        const pairId = data?.pairId
        if (typeof pairId !== "string" || !pairId) return
        if (!fromId) return
        if (hashId(myIdRef.current) < hashId(fromId)) return
        try { await ackAction.send({ ok: true, pairId, from: myIdRef.current }, { target: fromId }) } catch { /* noop */ }
        try { await presenceAction.send({ from: myIdRef.current, busy: true }) } catch { /* noop */ }
        busyRef.current.add(fromId)
        await openPair(pairId, fromId)
      }
      ackAction.onMessage = async (data, ctx) => {
        const fromId = data?.from || ctx?.peerId
        if (fromId) noteSeen(fromId)
        if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current) return
        if (!data || data.ok !== true || typeof data.pairId !== "string") return
        try { await presenceAction.send({ from: myIdRef.current, busy: true }) } catch { /* noop */ }
        if (fromId) busyRef.current.add(fromId)
        await openPair(data.pairId, fromId)
      }
      const beat = async () => {
        try { await presenceAction.send({ from: myIdRef.current, busy: Boolean(partnerRef.current || connectingRef.current) }) } catch { /* noop */ }
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
    try { await presenceSendRef.current?.({ from: myIdRef.current, busy: false }) } catch { /* noop */ }
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
    peerCount, peerShortId, messages, typingPeer,
    localVideoRef, remoteVideoRef,
    selfShortId: shortId(myIdRef.current),
    start, stop: stopAll, next, sendMessage, sendTyping,
    toggleCam, toggleMic, retry: start,
  }
}

