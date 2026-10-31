import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { broadcastBibleState, broadcastBibleHello, onBibleMessage, getSala } from '../lib/syncBible'
import type { BibleSyncState, BibleVerse } from '../lib/syncBible'

type BibleBook = { abbrev: string; name: string; chapters: string[][] }

const TESTAMENT_BREAK = 39 // libros AT

function buildReference(books: BibleBook[], v: BibleVerse): string {
  const book = books[v.bookIdx]
  if (!book) return ''
  const base = `${book.name} ${v.chapter}:${v.verse}`
  return v.endVerse > v.verse ? `${base}-${v.endVerse}` : base
}

function buildText(books: BibleBook[], v: BibleVerse): string {
  const book = books[v.bookIdx]
  if (!book) return ''
  const ch = book.chapters[v.chapter - 1]
  if (!ch) return ''
  const verses: string[] = []
  for (let i = v.verse; i <= Math.min(v.endVerse, ch.length); i++) {
    const txt = ch[i - 1]
    if (txt) verses.push(v.endVerse > v.verse ? `${i} ${txt}` : txt)
  }
  return verses.join('\n')
}

export function BibliaOperatorPage() {
  const [books, setBooks] = useState<BibleBook[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [bookIdx, setBookIdx] = useState(42)     // Juan
  const [chapter, setChapter] = useState(3)
  const [verse, setVerse] = useState(16)
  const [endVerse, setEndVerse] = useState(16)
  const [blank, setBlank] = useState(false)
  const [textScale, setTextScale] = useState(1)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const stateRef = useRef<BibleSyncState | null>(null)

  useEffect(() => {
    fetch('/rv1960.json')
      .then(r => r.json())
      .then((data: BibleBook[]) => { setBooks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Broadcast al proyector cuando cambia algo
  useEffect(() => {
    if (books.length === 0) return
    const v: BibleVerse = { bookIdx, chapter, verse, endVerse }
    const state: BibleSyncState = {
      verse: v,
      reference: buildReference(books, v),
      text: buildText(books, v),
      blank,
      textScale,
      theme,
    }
    stateRef.current = state
    broadcastBibleState(state)
  }, [books, bookIdx, chapter, verse, endVerse, blank, textScale, theme])

  // Responder a hello del proyector (OBS)
  useEffect(() => {
    return onBibleMessage((msg) => {
      if (msg.type === 'bible-hello' && stateRef.current) {
        broadcastBibleState(stateRef.current)
      }
    })
  }, [])

  // Broadcast periódico de hello para sincronía
  useEffect(() => {
    broadcastBibleHello()
    const t = setInterval(broadcastBibleHello, 3000)
    return () => clearInterval(t)
  }, [])

  const sala = getSala()
  const projUrl = sala
    ? `${window.location.origin}/proyector?sala=${sala}`
    : `${window.location.origin}/proyector`

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E1014', color: '#E3B260', fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Biblia</div>
          <div style={{ opacity: 0.6, fontSize: 14 }}>Cargando RV1960…</div>
        </div>
      </div>
    )
  }

  const book = books[bookIdx]
  const chapterData = book?.chapters[chapter - 1] ?? []
  const totalChapters = book?.chapters.length ?? 1
  const totalVerses = chapterData.length

  const filteredBooks = search.trim()
    ? books.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
    : books

  const previewText = buildText(books, { bookIdx, chapter, verse, endVerse })
  const previewRef = buildReference(books, { bookIdx, chapter, verse, endVerse })

  const prevVerse = () => {
    if (verse > 1) { setVerse(v => v - 1); setEndVerse(v => v - 1) }
    else if (chapter > 1) {
      const prevCh = book.chapters[chapter - 2]
      setChapter(c => c - 1)
      setVerse(prevCh.length)
      setEndVerse(prevCh.length)
    }
  }

  const nextVerse = () => {
    if (verse < totalVerses) { setVerse(v => v + 1); setEndVerse(v => v + 1) }
    else if (chapter < totalChapters) { setChapter(c => c + 1); setVerse(1); setEndVerse(1) }
  }

  // ── Preview colors ──────────────────────────────────────────────────────────
  const pBg    = theme === 'light' ? '#F5F0E8' : '#0D1B2A'
  const pMain  = theme === 'light' ? '#1A1A2E' : '#FFFFFF'
  const pAccent = theme === 'light' ? '#1A5C8A' : '#6EDCCF'
  const pDim   = theme === 'light' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0E1014', color: '#E8E0D5', fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontSize: 12, opacity: 0.4, color: 'inherit', textDecoration: 'none' }}>← Himnario</Link>
          <span style={{ opacity: 0.2 }}>|</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#E3B260' }}>Biblia RV1960</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href={projUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: 11, opacity: 0.4, color: 'inherit', textDecoration: 'underline' }}>
            Proyector ↗
          </a>
          {sala && (
            <span style={{ fontSize: 11, background: '#1C2A3A', color: '#6EDCCF', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              {sala}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', minHeight: 0 }}>

        {/* ── Columna libros ─────────────────────────────────────────────── */}
        <div style={{ width: 200, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 10px 6px' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar libro…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                background: '#14171D', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, color: '#E8E0D5', fontSize: 12, outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!search && (
              <div style={{ padding: '4px 10px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                Antiguo Testamento
              </div>
            )}
            {filteredBooks.map((b, fi) => {
              const realIdx = books.indexOf(b)
              const showNTDivider = !search && realIdx === TESTAMENT_BREAK
              return (
                <div key={realIdx}>
                  {showNTDivider && (
                    <div style={{ padding: '8px 10px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                      Nuevo Testamento
                    </div>
                  )}
                  <button
                    onClick={() => { setBookIdx(realIdx); setChapter(1); setVerse(1); setEndVerse(1); setSearch('') }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '6px 12px',
                      background: bookIdx === realIdx ? 'rgba(227,178,96,0.15)' : 'transparent',
                      color: bookIdx === realIdx ? '#E3B260' : '#C8BFB4',
                      border: 'none', cursor: 'pointer', fontSize: 13,
                      borderLeft: bookIdx === realIdx ? '2px solid #E3B260' : '2px solid transparent',
                    }}
                  >
                    {b.name}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Centro: capítulo + versículo + preview ─────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Selector capítulo */}
          <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>
              {book?.name} — Capítulo
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Array.from({ length: totalChapters }, (_, i) => i + 1).map(c => (
                <button
                  key={c}
                  onClick={() => { setChapter(c); setVerse(1); setEndVerse(1) }}
                  style={{
                    width: 32, height: 28, borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12,
                    background: chapter === c ? '#E3B260' : 'rgba(255,255,255,0.07)',
                    color: chapter === c ? '#0E1014' : '#C8BFB4',
                    fontWeight: chapter === c ? 700 : 400,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Selector versículo */}
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                Versículo
              </div>
              {endVerse > verse && (
                <span style={{ fontSize: 11, color: '#6EDCCF', background: 'rgba(110,220,207,0.12)', padding: '1px 7px', borderRadius: 4 }}>
                  rango {verse}–{endVerse}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {Array.from({ length: totalVerses }, (_, i) => i + 1).map(v => {
                const inRange = v >= verse && v <= endVerse
                const isStart = v === verse
                return (
                  <button
                    key={v}
                    onClick={(e) => {
                      if (e.shiftKey) {
                        if (v >= verse) setEndVerse(v)
                        else { setVerse(v); setEndVerse(verse) }
                      } else {
                        setVerse(v); setEndVerse(v)
                      }
                    }}
                    style={{
                      width: 30, height: 26, borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
                      background: inRange ? (isStart ? '#E3B260' : 'rgba(227,178,96,0.3)') : 'rgba(255,255,255,0.07)',
                      color: inRange ? (isStart ? '#0E1014' : '#E3B260') : '#C8BFB4',
                      fontWeight: inRange ? 700 : 400,
                    }}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
              Shift+clic para seleccionar rango
            </div>
          </div>

          {/* Preview */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'hidden', background: pBg, margin: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {blank && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, borderRadius: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Pantalla oscura</span>
                </div>
              )}
              <div style={{ flex: 1, padding: '20px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: pAccent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                  {previewRef}
                </div>
                <div style={{ fontSize: Math.round(16 * textScale), color: pMain, lineHeight: 1.55, whiteSpace: 'pre-line', maxWidth: 480 }}>
                  {previewText || <span style={{ opacity: 0.3 }}>Sin texto</span>}
                </div>
              </div>
            </div>

            {/* Navegación rápida */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 12px 12px' }}>
              <button onClick={prevVerse} style={{ flex: 1, padding: '8px 0', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, color: '#C8BFB4', cursor: 'pointer', fontSize: 14 }}>
                ← Anterior
              </button>
              <button
                onClick={() => setBlank(b => !b)}
                style={{ padding: '8px 18px', background: blank ? '#E3B260' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, color: blank ? '#0E1014' : '#C8BFB4', cursor: 'pointer', fontSize: 13, fontWeight: blank ? 700 : 400 }}
              >
                {blank ? 'Mostrar' : 'Ocultar'}
              </button>
              <button onClick={nextVerse} style={{ flex: 1, padding: '8px 0', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, color: '#C8BFB4', cursor: 'pointer', fontSize: 14 }}>
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        {/* ── Columna controles ───────────────────────────────────────────── */}
        <div style={{ width: 180, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 20, flexShrink: 0, overflowY: 'auto' }}>

          {/* Tema */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>Tema</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['dark', 'light'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 7, border: '1.5px solid',
                    borderColor: theme === t ? '#E3B260' : 'transparent',
                    background: t === 'dark' ? '#0D1B2A' : '#F5F0E8',
                    color: t === 'dark' ? '#fff' : '#1A1A2E',
                    fontSize: 12, cursor: 'pointer', fontWeight: theme === t ? 700 : 400,
                  }}
                >
                  {t === 'dark' ? 'Oscuro' : 'Claro'}
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño texto */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Tamaño</div>
              <div style={{ fontSize: 11, color: '#E3B260' }}>{Math.round(textScale * 100)}%</div>
            </div>
            <input
              type="range" min={60} max={180} step={5}
              value={Math.round(textScale * 100)}
              onChange={e => setTextScale(Number(e.target.value) / 100)}
              style={{ width: '100%', accentColor: '#E3B260' }}
            />
          </div>

          {/* Info versículo actual */}
          <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E3B260', marginBottom: 4 }}>{previewRef}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{totalVerses} versículos · cap. {chapter}/{totalChapters}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
