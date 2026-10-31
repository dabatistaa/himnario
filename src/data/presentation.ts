/**
 * Lógica de presentación — port desde el proyecto Expo (leccion_smi_project).
 * Construye una lista de slides paginados a partir de una lección y una config.
 * Sin highlights ni respuestas de usuario (no aplican en el proyector).
 */
import type { Lesson } from '../types/lesson'

export type SlideKind =
  | 'lessonTitle'
  | 'introduction'
  | 'question'
  | 'verse'
  | 'note'
  | 'additionalStudy'

export type Slide = {
  kind: SlideKind
  text?: string
  lessonNumber?: number
  title?: string
  date?: string
  reference?: string
  author?: string
  number?: number
  page?: number
  total?: number
}

export type PresentationBackground =
  | { type: 'preset'; id: string }
  | { type: 'cover' }

export type BackgroundPreset = {
  id: string
  name: string
  colors: [string, ...string[]]
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'gradient_blue',   name: 'Azul Celestial',    colors: ['#1E3A5F', '#0D1B2A'] },
  { id: 'gradient_purple', name: 'Púrpura Nocturno',  colors: ['#2D1B4E', '#1A1A2E'] },
  { id: 'gradient_ocean',  name: 'Océano Profundo',   colors: ['#0077B6', '#023E8A', '#03045E'] },
  { id: 'gradient_stars',  name: 'Cielo Estrellado',  colors: ['#0B132B', '#1C2541', '#3A506B'] },
  { id: 'gradient_forest', name: 'Bosque Nocturno',   colors: ['#2D6A4F', '#1B4332', '#081C15'] },
  { id: 'gradient_warm',   name: 'Atardecer Cálido',  colors: ['#5C3D2E', '#2D1F1A'] },
  { id: 'solid_navy',      name: 'Azul Marino',       colors: ['#1E3A5F'] },
  { id: 'solid_dark',      name: 'Negro Elegante',    colors: ['#1A1A2E'] },
  { id: 'solid_burgundy',  name: 'Burdeos',           colors: ['#5C1B24'] },
  { id: 'solid_white',     name: 'Blanco',            colors: ['#FFFFFF'] },
  { id: 'solid_cream',     name: 'Crema',             colors: ['#F5F0E8'] },
]

const LIGHT_PRESET_IDS = new Set(['solid_white', 'solid_cream'])

export const DEFAULT_PRESET_ID = 'gradient_blue'

export type PresentationConfig = {
  lessonTitle: boolean
  introduction: boolean
  questions: boolean
  verses: boolean
  notes: boolean
  additionalStudy: boolean
  background: PresentationBackground
  overlayOpacity: number
}

export const defaultConfig: PresentationConfig = {
  lessonTitle: true,
  introduction: true,
  questions: true,
  verses: false,
  notes: false,
  additionalStudy: true,
  background: { type: 'preset', id: DEFAULT_PRESET_ID },
  overlayOpacity: 0.25,
}

const MAX_CHARS = 500

type TextPart = { text: string; startOffset: number }

export function splitLongText(input: string, max = MAX_CHARS): TextPart[] {
  if (input.length <= max) {
    const trimmed = input.trim()
    return trimmed ? [{ text: trimmed, startOffset: input.indexOf(trimmed) }] : []
  }
  const parts: TextPart[] = []
  let pos = 0
  while (input.length - pos > max) {
    const window = input.slice(pos, pos + max)
    let cut = -1
    const lastPeriod = window.lastIndexOf('. ')
    if (lastPeriod > max * 0.4) cut = lastPeriod + 1
    if (cut === -1) {
      const best = Math.max(window.lastIndexOf('; '), window.lastIndexOf(': '))
      if (best > max * 0.4) cut = best + 1
    }
    if (cut === -1) {
      const lastComma = window.lastIndexOf(', ')
      if (lastComma > max * 0.5) cut = lastComma + 1
    }
    if (cut === -1) {
      const lastSpace = window.lastIndexOf(' ')
      cut = lastSpace > 0 ? lastSpace : max
    }
    const raw = input.slice(pos, pos + cut)
    const trimmed = raw.trim()
    if (trimmed) parts.push({ text: trimmed, startOffset: pos + raw.indexOf(trimmed) })
    pos += cut
    while (pos < input.length && /\s/.test(input[pos])) pos++
  }
  const rest = input.slice(pos).trim()
  if (rest) parts.push({ text: rest, startOffset: pos })
  return parts
}

const PAGINATABLE: SlideKind[] = ['introduction', 'verse', 'note', 'additionalStudy']

function paginateUnit(unit: Slide, maxChars: number): Slide[] {
  if (!PAGINATABLE.includes(unit.kind) || !unit.text) return [unit]
  const parts = splitLongText(unit.text, maxChars)
  if (parts.length <= 1) return [{ ...unit, page: undefined, total: undefined }]
  return parts.map((p, i) => ({ ...unit, text: p.text, page: i + 1, total: parts.length }))
}

export function buildSlides(lesson: Lesson, config: PresentationConfig, maxChars = MAX_CHARS): Slide[] {
  const units: Slide[] = []

  if (config.lessonTitle) {
    units.push({
      kind: 'lessonTitle',
      lessonNumber: lesson.lessonNumber,
      title: lesson.title,
      date: lesson.dateDisplay ?? undefined,
    })
  }

  if (config.introduction && lesson.introduction) {
    units.push({ kind: 'introduction', text: lesson.introduction })
  }

  if (config.questions) {
    let questionNumber = 0
    for (const section of lesson.sections) {
      for (const q of section.questions) {
        questionNumber += 1
        units.push({ kind: 'question', number: questionNumber, text: q.text })

        if (config.verses) {
          for (const v of q.verses) {
            units.push({ kind: 'verse', text: v.text, reference: v.reference })
          }
        }

        if (config.notes) {
          for (const note of q.notes) {
            const author = [note.author, note.source].filter(Boolean).join(', ') || undefined
            units.push({ kind: 'note', text: note.text, author })
          }
        }
      }
    }
  }

  if (config.additionalStudy && lesson.additionalStudy) {
    units.push({ kind: 'additionalStudy', text: lesson.additionalStudy })
  }

  return units.flatMap((u) => paginateUnit(u, maxChars))
}

export function getSlideLabel(s: Slide): string {
  switch (s.kind) {
    case 'lessonTitle':    return 'Portada'
    case 'introduction':   return 'Introducción'
    case 'question':       return `Pregunta ${s.number ?? ''}`
    case 'verse':          return s.reference ?? 'Versículo'
    case 'note':           return 'Nota'
    case 'additionalStudy':return 'Estudio adicional'
  }
}

/** Devuelve el CSS background para un preset o cover. */
export function backgroundCss(bg: PresentationBackground, coverUrl?: string | null): string {
  if (bg.type === 'cover' && coverUrl) {
    return `url('${coverUrl}') center/cover no-repeat`
  }
  if (bg.type === 'preset') {
    const preset = BACKGROUND_PRESETS.find((p) => p.id === bg.id) ?? BACKGROUND_PRESETS[0]
    if (preset.colors.length === 1) return preset.colors[0]
    return `linear-gradient(to bottom, ${preset.colors.join(', ')})`
  }
  return '#0D1B2A'
}

/** true si el fondo es claro y el texto debe ser oscuro. */
export function isLightBackground(bg: PresentationBackground): boolean {
  if (bg.type === 'cover') return false
  if (bg.type === 'preset') return LIGHT_PRESET_IDS.has(bg.id)
  return false
}
