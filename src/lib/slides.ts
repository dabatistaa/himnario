import type { Hymn, HymnSection, Slide } from '../types'

function sectionLabel(section: HymnSection): string {
  if (section.type === 'stanza') return `Estrofa ${section.number ?? ''}`
  if (section.type === 'chorus') return 'Coro'
  return 'Final'
}

function analyzeText(text: string): { lines: number; longest: number } {
  const rawLines = text.replace(/\s+$/, '').split('\n')
  const segments: string[] = []
  for (const line of rawLines) {
    if (line.length > 35) {
      const parts = line.split(/[,;:]/).map(s => s.trim()).filter(Boolean)
      segments.push(...parts)
    } else {
      if (line.trim()) segments.push(line)
    }
  }
  const effectiveLines = Math.max(segments.length, rawLines.length, 1)
  const longest = Math.max(...segments.map(l => l.length), ...rawLines.map(l => l.length), 1)
  return { lines: effectiveLines, longest }
}

export function buildSlides(hymn: Hymn, repeatChorus: boolean): Slide[] {
  const choruses = hymn.content.filter(s => s.type === 'chorus')
  const hasSingleChorus = choruses.length === 1
  const chorus = hasSingleChorus ? choruses[0] : null

  let seq: HymnSection[]

  if (!repeatChorus || !chorus) {
    seq = hymn.content
  } else {
    seq = []
    const firstItem = hymn.content[0]
    if (firstItem && firstItem.type === 'chorus') seq.push(chorus)
    hymn.content.forEach(it => {
      if (it.type === 'chorus') return
      seq.push(it)
      if (it.type === 'stanza') seq.push(chorus!)
    })
  }

  return seq.map((section, i) => {
    const text = String(section.text || '').replace(/\s+$/, '')
    const { lines, longest } = analyzeText(text)
    return {
      label: sectionLabel(section),
      text,
      index: i,
      type: section.type,
      lines,
      longest,
    }
  })
}
