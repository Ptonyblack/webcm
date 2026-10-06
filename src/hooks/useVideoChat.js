import { useCallback, useEffect, useRef, useState } from "react"
import { joinRoom, selfId } from "trystero"

const APP_ID = "webcm-ometv-v1"
const LOBBY_ID = "lobby-global"

function hashId(id) {
  let h = 0
  const s = String(id || "")
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
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
  const sendByeRef = useRef(null)
  const partnerRef = useRef("")
  const myIdRef = useRef(selfId)
  const statusRef = useRef("idle")
  const typingTimer = useRef(null)
  statusRef.current = status

  const pushMsg = useCallback((from, text) => {
    setMessages((m) => [...m, { from, text, at: Date.now() }].slice(-100))
  }, [])

  const cleanupPair = useCallback(async (wasConnected) => {
    try { await pairRef.current?.leave() } catch { /* noop */ }
    pairRef.current = null
    partnerRef.current = ""
    sendChatRef.current = null
    sendByeRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setTypingPeer(false)
    setPeerShortId("")
    if (wasConnected) pushMsg("sys", "Se desconectó. Pulsa Siguiente 🔎")
  }, [pushMsg])

  const stopAll = useCallback(async () => {
    try { await pairRef.current?.leave() } catch { /* noop */ }
    try { await lobbyRef.current?.leave() } catch { /* noop */ }
    lobbyRef.current = null
    pairRef.current = null
    partnerRef.current = ""
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setStatus("idle")
    setPeerShortId("")
    setMessages([])
    setTypingPeer(false)
    setError("")
  }, [])

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

  const openPair = useCallback(async (pairId) => {
    if (pairRef.current || !localStreamRef.current) return
    const stream = localStreamRef.current
    const room = joinRoom({ appId: APP_ID }, pairId)
    pairRef.current = room
    const chatAction = room.makeAction("chat")
    const typingAction = room.makeAction("typing")
    const byeAction = room.makeAction("bye")
    sendChatRef.current = (data, opts) => chatAction.send(data, opts)
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
    byeAction.onMessage = () => { cleanupPair(true) }
    room.onPeerStream = (s) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = s
        remoteVideoRef.current.play().catch(() => {})
      }
    }
    room.onPeerLeave = () => { cleanupPair(true) }
    try { await Promise.all(room.addStream(stream)) } catch { /* noop */ }
    room.onPeerJoin = (peerId) => {
      partnerRef.current = peerId
      setPeerShortId(String(peerId).slice(0, 6).toUpperCase())
      setStatus("connected")
      setError("")
      setMessages([{ from: "sys", text: "Conectado. ¡Di hola! 👋", at: Date.now() }])
    }
    setTimeout(() => {
      const peers = Object.keys(room.getPeers())
      if (peers.length > 0 && !partnerRef.current && statusRef.current !== "idle") {
        partnerRef.current = peers[0]
        setPeerShortId(String(peers[0]).slice(0, 6).toUpperCase())
        setStatus("connected")
        setMessages([{ from: "sys", text: "Conectado. ¡Di hola! 👋", at: Date.now() }])
      }
    }, 3000)
  }, [cleanupPair, pushMsg])


  const matchLoop = useCallback(async (lobby, sendReq) => {
    if (statusRef.current !== "waiting" || partnerRef.current) return
    const others = Object.keys(lobby.getPeers()).filter((id) => id !== myIdRef.current)
    setPeerCount(others.length + 1)
    if (others.length === 0) {
      setTimeout(() => matchLoop(lobby, sendReq), 2000)
      return
    }
    const rival = others.sort((a, b) => hashId(a) - hashId(b))[0]
    if (hashId(myIdRef.current) < hashId(rival)) {
      const pairId = "pair-" + [myIdRef.current, rival].sort().join("-").slice(0, 40) + "-" + Date.now().toString(36)
      try { await sendReq({ pairId, from: myIdRef.current }) } catch { /* noop */ }
      setTimeout(() => { if (statusRef.current === "waiting" && !partnerRef.current) matchLoop(lobby, sendReq) }, 3000)
    } else {
      setTimeout(() => { if (statusRef.current === "waiting" && !partnerRef.current) matchLoop(lobby, sendReq) }, 3500)
    }
  }, [])

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
      setError("La cámara requiere HTTPS. En local funciona, online necesitas https:// (Vercel lo da gratis).")
      return
    }
    let stream
    try {
      stream = await startLocal()
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
      const lobby = joinRoom({ appId: APP_ID }, LOBBY_ID)
      lobbyRef.current = lobby
      const refresh = () => setPeerCount(Object.keys(lobby.getPeers()).length + 1)
      lobby.onPeerJoin = refresh
      lobby.onPeerLeave = refresh
      lobby.onPeerStream = () => {}
      const reqAction = lobby.makeAction("req")
      const ackAction = lobby.makeAction("ack")
      const sendReq = (data, opts) => reqAction.send(data, opts)
      const sendAck = (data, opts) => ackAction.send(data, opts)
      reqAction.onMessage = async (data, ctx) => {
        if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current) return
        const pairId = data?.pairId
        if (typeof pairId !== "string" || !pairId) return
        if (hashId(myIdRef.current) < hashId(ctx.peerId)) return
        try { await sendAck({ ok: true, pairId }, ctx.peerId ? { target: ctx.peerId } : undefined) } catch { /* noop */ }
        await openPair(pairId)
      }
      ackAction.onMessage = async (data) => {
        if (statusRef.current !== "waiting" || partnerRef.current || pairRef.current) return
        if (!data || data.ok !== true || typeof data.pairId !== "string") return
        await openPair(data.pairId)
      }
      try { await Promise.all(lobby.addStream(stream)) } catch { /* noop */ }
      setStatus("waiting")
      setPeerCount(Object.keys(lobby.getPeers()).length + 1)
      pushMsg("sys", "Buscando a alguien… abre 2 pestañas para probar contigo mismo 🧪")
      matchLoop(lobby, sendReq)
    } catch (e) {
      setStatus("error")
      setError("No se pudo conectar a la red P2P: " + (e?.message || e))
    }
  }, [matchLoop, openPair, pushMsg, startLocal])

  const next = useCallback(async () => {
    const st = statusRef.current
    if (st !== "connected" && st !== "waiting") return
    try { await sendByeRef.current?.({ from: myIdRef.current }) } catch { /* noop */ }
    await cleanupPair(false)
    setMessages([{ from: "sys", text: "Buscando a alguien nuevo… 🔎", at: Date.now() }])
    setStatus("waiting")
    setTypingPeer(false)
    const lobby = lobbyRef.current
    if (!lobby) return
    const reqAction = lobby.makeAction("req")
    const sendReq = (data, opts) => reqAction.send(data, opts)
    matchLoop(lobby, sendReq)
  }, [cleanupPair, matchLoop])

  const sendMessage = useCallback(async (text) => {
    const t = String(text || "").trim().slice(0, 500)
    if (!t || !sendChatRef.current || !partnerRef.current) return false
    pushMsg("me", t)
    try {
      await sendChatRef.current({ text: t }, { target: partnerRef.current })
      return true
    } catch { return false }
  }, [pushMsg])

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
  }, [])

  return {
    status, error, camOn, micOn,
    peerCount, peerShortId, messages, typingPeer,
    localVideoRef, remoteVideoRef,
    selfShortId: String(myIdRef.current).slice(0, 6).toUpperCase(),
    start, stop: stopAll, next, sendMessage,
    toggleCam, toggleMic, retry: start,
  }
}

