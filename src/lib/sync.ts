import type { HymnaryId, SyncState } from '../types'
import { getSala, initRelay, isRelayConnected, onRelayMessage, relaySend, setSala, generateAndSetSala, clearSala } from './relay'
export { getSala, isRelayConnected, setSala, generateAndSetSala, clearSala }

const CHANNEL_NAME = 'himnario-smi'

export const DEFAULT_SETTINGS = {
  theme: 'Claro' as const,
  repeatChorus: true,
  showTitle: true,
  showLabel: true,
}

export const DEFAULT_STATE: SyncState = {
  num: 1,
  idx: 0,
  blank: false,
  scale: 1.0,
  settings: DEFAULT_SETTINGS,
  hymnary: 'smi',
}

// ── BroadcastChannel (mismo navegador) ──────────────────────────────────────
let channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel {
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

// ── Relay WebSocket (cross-device / OBS) ────────────────────────────────────
let relayReady = false
function ensureRelay() {
  const sala = getSala()
  if (!sala) return
  if (relayReady) return
  relayReady = true
  initRelay(sala)
}

export function resetRelay() {
  relayReady = false
  ensureRelay()
}

function usesRelay(): boolean { return !!getSala() }

// ── Flat message shape ───────────────────────────────────────────────────────
function flatState(s: SyncState) {
  return {
    num: s.num, idx: s.idx, blank: s.blank, scale: s.scale,
    theme: s.settings.theme, repeatChorus: s.settings.repeatChorus,
    showTitle: s.settings.showTitle, showLabel: s.settings.showLabel,
    hymnary: s.hymnary,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
export function broadcastState(state: SyncState, operatorId?: string) {
  ensureRelay()
  const msg = { type: 'state', ...flatState(state), ...(operatorId ? { operatorId } : {}) }
  if (usesRelay()) relaySend(msg)
  else try { getChannel().postMessage(msg) } catch (_) {}
}

export function broadcastHello() {
  ensureRelay()
  const msg = { type: 'hello' }
  if (usesRelay()) relaySend(msg)
  else try { getChannel().postMessage(msg) } catch (_) {}
}

export function broadcastCmd(action: 'next' | 'prev' | 'first' | 'blank' | 'goto', num?: number) {
  ensureRelay()
  const msg = Object.assign({ type: 'cmd', action }, num != null ? { num } : {})
  if (usesRelay()) relaySend(msg)
  else try { getChannel().postMessage(msg) } catch (_) {}
}

type StateMsg = { type: 'state'; num: number; idx: number; blank: boolean; scale: number; theme: string; repeatChorus: boolean; showTitle: boolean; showLabel: boolean; hymnary: HymnaryId }
type HelloMsg = { type: 'hello' }
type CmdMsg = { type: 'cmd'; action: string; num?: number }
type Msg = StateMsg | HelloMsg | CmdMsg

export function onMessage(handler: (msg: Msg) => void, replayLast = false): () => void {
  ensureRelay()
  if (usesRelay()) {
    return onRelayMessage(msg => handler(msg as Msg), replayLast)
  }
  const ch = getChannel()
  const listener = (e: MessageEvent<Msg>) => handler(e.data)
  ch.addEventListener('message', listener)
  return () => ch.removeEventListener('message', listener)
}

// ── Persistence ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'himnario-smi:operador'

export function loadPersistedState(): { num?: number; idx?: number; scale?: number; hymnary?: HymnaryId } {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

export function persistState(s: { num: number; idx: number; scale: number; hymnary: HymnaryId }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch (_) {}
}
