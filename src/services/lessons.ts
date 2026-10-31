import { supabase, tables } from '../lib/supabaseLesson'
import type { Book, Lesson, LessonSection, LessonSummary, Note, Question, Verse } from '../types/lesson'

// ── parsers ──────────────────────────────────────────────────────────────────

function asString(v: unknown, fallback = ''): string {
  return v != null ? String(v) : fallback
}

function parseDateDisplay(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null
  // "Saturday, October 4, 2025"
  try { return new Date(v) } catch { return null }
}

function parseVerse(j: any): Verse {
  return {
    id: asString(j.id),
    reference: asString(j.reference),
    text: asString(j.verse_text ?? j.text),
    order: j.verse_order ?? j.display_order ?? j.order ?? 1,
  }
}

function parseNote(j: any): Note {
  return {
    id: asString(j.id),
    author: j.author ?? null,
    source: j.source ?? null,
    text: asString(j.note_text ?? j.text ?? j.content),
    order: j.note_order ?? j.display_order ?? j.order ?? 1,
  }
}

function parseQuestion(j: any): Question {
  return {
    id: asString(j.id),
    number: j.question_number ?? j.number ?? 0,
    text: asString(j.question_text ?? j.text),
    subtitle: j.subtitle ?? null,
    verses: ((j.question_verses as any[]) ?? [])
      .map(parseVerse)
      .sort((a, b) => a.order - b.order),
    notes: ((j.question_notes as any[]) ?? [])
      .map(parseNote)
      .sort((a, b) => a.order - b.order),
  }
}

function parseSection(j: any): LessonSection {
  return {
    id: asString(j.id),
    dayNumber: j.day_number ?? 0,
    dayName: asString(j.day_name),
    title: asString(j.title),
    scriptureReference: j.scripture_reference ?? null,
    content: asString(j.content),
    questions: ((j.questions as any[]) ?? [])
      .map(parseQuestion)
      .sort((a, b) => a.number - b.number),
  }
}

function parseLesson(j: any): Lesson {
  return {
    id: asString(j.id),
    bookId: asString(j.book_id),
    lessonNumber: j.lesson_number ?? 0,
    title: asString(j.title),
    dateDisplay: j.date_display ?? null,
    memoryVerse: j.memory_verse ?? null,
    memoryVerseReference: j.memory_verse_reference ?? null,
    introduction: j.introduction ?? null,
    additionalStudy: j.additional_study ?? null,
    sections: ((j.lesson_sections as any[]) ?? [])
      .map(parseSection)
      .sort((a, b) => a.dayNumber - b.dayNumber),
  }
}

function parseLessonSummary(j: any): LessonSummary {
  return {
    id: asString(j.id),
    lessonNumber: j.lesson_number ?? 0,
    title: asString(j.title),
    dateDisplay: j.date_display ?? null,
    date: parseDateDisplay(j.date_display),
    sortOrder: j.sort_order ?? 0,
  }
}

function parseBook(j: any): Book {
  return {
    id: asString(j.id),
    title: asString(j.title).split('\n')[0].trim(),
    coverUrl: j.cover_url ?? null,
  }
}

// ── queries ───────────────────────────────────────────────────────────────────

export async function getCurrentBook(): Promise<Book | null> {
  const { data, error } = await supabase
    .from(tables.books)
    .select('id,title,cover_url')
    .eq('is_current', true)
    .eq('is_published', true)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? parseBook(data) : null
}

export async function getLessons(bookId: string): Promise<LessonSummary[]> {
  const { data, error } = await supabase
    .from(tables.lessons)
    .select('id,lesson_number,title,date_display,sort_order,content_type')
    .eq('book_id', bookId)
    .eq('content_type', 'lesson')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(parseLessonSummary)
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from(tables.lessons)
    .select(`
      *,
      lesson_sections(
        *,
        questions(
          *,
          question_verses(*),
          question_notes(*)
        )
      )
    `)
    .eq('id', lessonId)
    .maybeSingle()
  if (error) throw error
  return data ? parseLesson(data) : null
}

/** Elige la lección cuyo sábado es el próximo (igual lógica que la app móvil). */
export function pickCurrentLesson(lessons: LessonSummary[]): LessonSummary | null {
  if (lessons.length === 0) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = today.getDay()
  const daysUntilSat = day === 6 ? 0 : day === 0 ? 6 : 6 - day
  const targetSat = new Date(today)
  targetSat.setDate(today.getDate() + daysUntilSat)

  for (const l of lessons) {
    if (l.date && l.date.getTime() === targetSat.getTime()) return l
  }
  let best: LessonSummary | null = null
  let bestDiff = Infinity
  for (const l of lessons) {
    if (!l.date) continue
    const diff = l.date.getTime() - targetSat.getTime()
    if (diff > 0 && diff < bestDiff) { bestDiff = diff; best = l }
  }
  if (best) return best
  bestDiff = Infinity
  for (const l of lessons) {
    if (!l.date) continue
    const diff = targetSat.getTime() - l.date.getTime()
    if (diff >= 0 && diff < bestDiff) { bestDiff = diff; best = l }
  }
  return best ?? lessons[0]
}
