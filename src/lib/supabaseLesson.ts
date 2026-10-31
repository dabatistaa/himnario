import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ouomfdvsstkmwhmugtqr.supabase.co'
const supabaseAnonKey = 'sb_publishable_kulZYP63sP43R0KD-oyA5w_9WWZM5uI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const tables = {
  books: 'books',
  lessons: 'lessons',
  lessonSections: 'lesson_sections',
  questions: 'questions',
  questionVerses: 'question_verses',
} as const
