import { getSala, initRelay, isRelayConnected, onRelayMessage, relaySend } from './relay'
import type { PresentationConfig } from '../data/presentation'
import { defaultConfig } from '../data/presentation'

export type LeccionSyncState = {
  lessonId: string
  config: PresentationConfig
  slideIdx: number
  blank: boolean
  coverUrl: string | null
  textScale: number
}

export const DEFAULT_LECCION_STATE: LeccionSyncState = {
  lessonId: '',
  config: defaultConfig,
  slideIdx: 0,
  blank: false,
  coverUrl: null,
  textScale: 1,
}

const CHANNEL = 'leccion-smi'
let bc: BroadcastChannel | null = null

function getCh(): BroadcastChannel {
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

export function resetLeccionRelay() {
  relayReady = false
  ensureRelay()
}

export function broadcastLeccionState(state: LeccionSyncState, operatorId?: string) {
  ensureRelay()
  const msg = {
    type: 'leccion-state',
    lessonId: state.lessonId,
    config: state.config,
    slideIdx: state.slideIdx,
    blank: state.blank,
    coverUrl: state.coverUrl,
    textScale: state.textScale,
    ...(operatorId ? { operatorId } : {}),
  }
  getCh().postMessage(msg)
  if (getSala()) relaySend(msg)
}

export function broadcastLeccionHello() {
  ensureRelay()
  const msg = { type: 'leccion-hello' }
  getCh().postMessage(msg)
  if (getSala()) relaySend(msg)
}

type LeccionListener = (msg: any) => void
const listeners: LeccionListener[] = []

let bcListening = false
function startBcListen() {
  if (bcListening) return
  bcListening = true
  getCh().onmessage = (e) => listeners.forEach(fn => fn(e.data))
}

export function onLeccionMessage(fn: LeccionListener, isProjector = false): () => void {
  startBcListen()
  let unsubRelay: (() => void) | null = null
  if (isProjector) {
    const sala = getSala()
    if (sala) {
      ensureRelay()
      unsubRelay = onRelayMessage((msg: any) => {
        if (msg.type?.startsWith('leccion-')) fn(msg)
      })
    }
  }
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
    unsubRelay?.()
  }
}

export { isRelayConnected, getSala }
