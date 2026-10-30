import type { Hymn } from '../types'

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SearchResult {
  hymn: Hymn
  matchLine?: string
}

export function searchHymns(hymns: Hymn[], query: string, max = 8): SearchResult[] {
  const q = normalize(query)
  if (!q) return []

  const numMatch = /^\d+$/.test(q.trim())
  if (numMatch) {
    const n = parseInt(q.trim(), 10)
    const found = hymns.find(h => h.number === n)
    return found ? [{ hymn: found }] : []
  }

  const results: SearchResult[] = []

  for (const hymn of hymns) {
    if (results.length >= max) break

    const titleNorm = normalize(hymn.title)
    if (titleNorm.includes(q)) {
      results.push({ hymn })
      continue
    }

    let matchLine: string | undefined
    outer: for (const section of hymn.content) {
      for (const line of section.text.split('\n')) {
        if (normalize(line).includes(q)) {
          matchLine = line.trim()
          break outer
        }
      }
    }

    if (matchLine) {
      results.push({ hymn, matchLine })
    }
  }

  return results
}
