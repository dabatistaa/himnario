import type { HymnaryId, SyncState } from '../types'

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

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel {
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function broadcastState(state: SyncState) {
  try {
    getChannel().postMessage({
      type: 'state',
      num: state.num,
      idx: state.idx,
      blank: state.blank,
      scale: state.scale,
      theme: state.settings.theme,
      repeatChorus: state.settings.repeatChorus,
      showTitle: state.settings.showTitle,
      showLabel: state.settings.showLabel,
      hymnary: state.hymnary,
    })
  } catch (_) {}
}

export function broadcastHello() {
  try { getChannel().postMessage({ type: 'hello' }) } catch (_) {}
}

export function broadcastCmd(action: 'next' | 'prev' | 'first' | 'blank' | 'goto', num?: number) {
  try {
    getChannel().postMessage(Object.assign({ type: 'cmd', action }, num != null ? { num } : {}))
  } catch (_) {}
}

type StateMsg = { type: 'state'; num: number; idx: number; blank: boolean; scale: number; theme: string; repeatChorus: boolean; showTitle: boolean; showLabel: boolean; hymnary: HymnaryId }
type HelloMsg = { type: 'hello' }
type CmdMsg = { type: 'cmd'; action: string; num?: number }
type Msg = StateMsg | HelloMsg | CmdMsg

export function onMessage(handler: (msg: Msg) => void): () => void {
  const ch = getChannel()
  const listener = (e: MessageEvent<Msg>) => handler(e.data)
  ch.addEventListener('message', listener)
  return () => ch.removeEventListener('message', listener)
}

const STORAGE_KEY = 'himnario-smi:operador'

export function loadPersistedState(): { num?: number; idx?: number; scale?: number; hymnary?: HymnaryId } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as { num?: number; idx?: number; scale?: number; hymnary?: HymnaryId }
  } catch {
    return {}
  }
}

export function persistState(s: { num: number; idx: number; scale: number; hymnary: HymnaryId }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch (_) {}
}
