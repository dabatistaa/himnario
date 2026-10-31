export type Verse = {
  id: string
  reference: string
  text: string
  order: number
}

export type Note = {
  id: string
  author: string | null
  source: string | null
  text: string
  order: number
}

export type Question = {
  id: string
  number: number
  text: string
  subtitle: string | null
  verses: Verse[]
  notes: Note[]
}

export type LessonSection = {
  id: string
  dayNumber: number
  dayName: string
  title: string
  scriptureReference: string | null
  content: string
  questions: Question[]
}

export type Lesson = {
  id: string
  bookId: string
  lessonNumber: number
  title: string
  dateDisplay: string | null
  memoryVerse: string | null
  memoryVerseReference: string | null
  introduction: string | null
  additionalStudy: string | null
  sections: LessonSection[]
}

export type LessonSummary = {
  id: string
  lessonNumber: number
  title: string
  dateDisplay: string | null
  date: Date | null
  sortOrder: number
}

export type Book = {
  id: string
  title: string
  coverUrl: string | null
}
