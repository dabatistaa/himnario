export interface HymnSection {
  type: 'stanza' | 'chorus' | 'coda'
  number?: number
  text: string
}

export interface Hymn {
  number: number
  title: string
  musicNote: string
  author?: string
  translator?: string
  content: HymnSection[]
}

export interface Slide {
  label: string
  text: string
  index: number
  type: 'stanza' | 'chorus' | 'coda'
  lines: number
  longest: number
}

export type ProjectionTheme = 'Negro' | 'Azul noche' | 'Claro'

export type HymnaryId = 'smi' | 'juvenil'

export interface Settings {
  theme: ProjectionTheme
  repeatChorus: boolean
  showTitle: boolean
  showLabel: boolean
}

export interface SyncState {
  num: number
  idx: number
  blank: boolean
  scale: number
  settings: Settings
  hymnary: HymnaryId
}
