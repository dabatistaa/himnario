type Handler = (msg: unknown) => void

const handlers = new Set<Handler>()
let ws: WebSocket | null = null
let salaId: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let stopped = false

const RELAY_WS = (import.meta.env.VITE_RELAY_URL ?? 'wss://himnario-relay.dabatistaa.workers.dev')
  .replace(/^http/, 'ws')

const SALA_CHARS = 'abcdefghjkmnpqrstvwxyz23456789'
const SALA_KEY = 'himnario-sala'

function generateSala(): string {
  return Array.from({ length: 6 }, () => SALA_CHARS[Math.floor(Math.random() * SALA_CHARS.length)]).join('')
}

export function getSala(): string | null {
  try {
    const url = new URL(window.location.href)
    const urlSala = url.searchParams.get('sala')

    // En el proyector solo se usa el param de URL (no auto-generar)
    if (window.location.pathname.startsWith('/proyector')) return urlSala

    // En el operador: URL param tiene prioridad
    if (urlSala) {
      localStorage.setItem(SALA_KEY, urlSala)
      return urlSala
    }

    // Recuperar o generar sala
    let sala = localStorage.getItem(SALA_KEY)
    if (!sala) sala = generateSala()
    localStorage.setItem(SALA_KEY, sala)

    // Actualizar URL sin recargar
    url.searchParams.set('sala', sala)
    window.history.replaceState({}, '', url.toString())
    return sala
  } catch { return null }
}

export function initRelay(sala: string) {
  salaId = sala
  stopped = false
  connect()
}

function connect() {
  if (!salaId || stopped || !RELAY_WS) return
  ws = new WebSocket(`${RELAY_WS}/ws?sala=${encodeURIComponent(salaId)}`)
  ws.onopen = () => { if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null } }
  ws.onmessage = ({ data }) => {
    try { const msg = JSON.parse(data as string); handlers.forEach(h => h(msg)) } catch {}
  }
  ws.onclose = () => { if (!stopped) reconnectTimer = setTimeout(connect, 2000) }
  ws.onerror = () => ws?.close()
}

export function relaySend(msg: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

export function onRelayMessage(handler: Handler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function isRelayConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN
}
