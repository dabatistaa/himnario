import { getSala, initRelay, onRelayMessage, relaySend } from './relay'

export type BibleVerse = {
  bookIdx: number  // 0-65
  chapter: number  // 1-based
  verse: number    // 1-based
  endVerse: number // 1-based, >= verse
}

export type BibleSyncState = {
  verse: BibleVerse
  reference: string  // "Juan 3:16" — precomputado para el proyector
  text: string       // texto(s) del versículo — precomputado
  blank: boolean
  textScale: number
  theme: 'dark' | 'light'
}

export const DEFAULT_BIBLE_STATE: BibleSyncState = {
  verse: { bookIdx: 42, chapter: 3, verse: 16, endVerse: 16 }, // Juan 3:16
  reference: 'Juan 3:16',
  text: '',
  blank: false,
  textScale: 1,
  theme: 'dark',
}

const CHANNEL = 'biblia-smi'
let bc: BroadcastChannel | null = null
function getCh() {
  if (!bc) bc = new BroadcastChannel(CHANNEL)
  return bc
}

let relayReady = false
function ensureRelay() {
  const sala = getSala()
  if (!sala || relayReady) return
  relayReady = true
  initRelay(sala)
}

export function resetBibleRelay() {
  relayReady = false
  ensureRelay()
}

export function broadcastBibleState(state: BibleSyncState) {
  ensureRelay()
  const msg = { type: 'bible-state', ...state }
  const sala = getSala()
  if (sala) relaySend(msg)
  else try { getCh().postMessage(msg) } catch (_) {}
}

export function broadcastBibleHello() {
  ensureRelay()
  const msg = { type: 'bible-hello' }
  const sala = getSala()
  if (sala) relaySend(msg)
  else try { getCh().postMessage(msg) } catch (_) {}
}

type BibleListener = (msg: any) => void
const listeners: BibleListener[] = []
let bcListening = false

function startBcListen() {
  if (bcListening) return
  bcListening = true
  getCh().onmessage = (e) => listeners.forEach(fn => fn(e.data))
}

export function onBibleMessage(fn: BibleListener): () => void {
  const sala = getSala()
  let unsubRelay: (() => void) | null = null

  if (sala) {
    ensureRelay()
    unsubRelay = onRelayMessage((msg: any) => {
      if (msg.type?.startsWith('bible-')) fn(msg)
    })
  } else {
    startBcListen()
    listeners.push(fn)
  }

  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
    unsubRelay?.()
  }
}

export { getSala }
