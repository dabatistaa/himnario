type Handler = (msg: unknown) => void

const handlers = new Set<Handler>()
let lastState: unknown = null
let ws: WebSocket | null = null
let salaId: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let stopped = false

const RELAY_WS = (import.meta.env.VITE_RELAY_URL ?? 'wss://himnario-relay.dabatistaa.workers.dev')
  .replace(/^http/, 'ws')

const SALA_CHARS = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
const SALA_KEY = 'himnario-sala'

function generateSala(): string {
  return Array.from({ length: 6 }, () => SALA_CHARS[Math.floor(Math.random() * SALA_CHARS.length)]).join('')
}

export function getSala(): string | null {
  try {
    const urlSala = new URL(window.location.href).searchParams.get('sala')
    if (urlSala) {
      localStorage.setItem(SALA_KEY, urlSala)
      return urlSala
    }
    const stored = localStorage.getItem(SALA_KEY)
    return (stored && stored.length >= 2) ? stored : null
  } catch { return null }
}

export function generateAndSetSala(): string {
  return setSala(generateSala())
}

export function clearSala() {
  localStorage.removeItem(SALA_KEY)
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('sala')
    window.history.replaceState({}, '', url.toString())
  } catch {}
  stopped = true
  ws?.close()
  ws = null
  salaId = null
}

export function setSala(code: string): string {
  const sala = code.trim().toUpperCase().slice(0, 20)
  localStorage.setItem(SALA_KEY, sala)
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('sala', sala)
    window.history.replaceState({}, '', url.toString())
  } catch {}
  // Reconectar relay con nueva sala
  stopped = true
  ws?.close()
  ws = null
  salaId = sala
  stopped = false
  connect()
  return sala
}

export function initRelay(sala: string) {
  salaId = sala
  stopped = false
  connect()
}

function connect() {
  if (!salaId || stopped || !RELAY_WS) return
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return
  ws = new WebSocket(`${RELAY_WS}/ws?sala=${encodeURIComponent(salaId)}`)
  ws.onopen = () => { if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null } }
  ws.onmessage = ({ data }) => {
    try {
      const msg = JSON.parse(data as string)
      const t = (msg as { type?: string }).type
      // Guardar el último estado de cualquier modo para replay al reconectar
      if (t === 'state' || t === 'bible-state' || t === 'leccion-state') lastState = msg
      handlers.forEach(h => h(msg))
    } catch {}
  }
  ws.onclose = () => { if (!stopped) reconnectTimer = setTimeout(connect, 2000) }
  ws.onerror = () => ws?.close()
}

export function relaySend(msg: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

export function onRelayMessage(handler: Handler, replayLast = false): () => void {
  handlers.add(handler)
  if (replayLast && lastState) handler(lastState)
  return () => handlers.delete(handler)
}

export function isRelayConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN
}
