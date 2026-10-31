import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentBook, getLessons, getLesson, pickCurrentLesson } from '../services/lessons'
import {
  broadcastLeccionState,
  getSala,
} from '../lib/syncLesson'
import {
  BACKGROUND_PRESETS,
  buildSlides,
  defaultConfig,
  getSlideLabel,
  backgroundCss,
  isLightBackground,
} from '../data/presentation'
import type { Book, Lesson, LessonSummary } from '../types/lesson'
import type { PresentationConfig } from '../data/presentation'
import type { LeccionSyncState } from '../lib/syncLesson'

const TOGGLE_ITEMS: { key: keyof Omit<PresentationConfig, 'background' | 'overlayOpacity'>; label: string; sub: string }[] = [
  { key: 'lessonTitle',    label: 'Portada',           sub: 'Título y fecha de la lección' },
  { key: 'introduction',   label: 'Introducción',       sub: 'Texto introductorio de la lección' },
  { key: 'questions',      label: 'Preguntas',          sub: 'Todas las preguntas de estudio' },
  { key: 'verses',         label: 'Versículos',         sub: 'Textos bíblicos de cada pregunta' },
  { key: 'notes',          label: 'Notas / Citas',      sub: 'Citas de autores adjuntas a preguntas' },
  { key: 'additionalStudy',label: 'Estudio adicional',  sub: 'Texto de estudio adicional' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 transition-colors"
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? '#E3B260' : '#333844',
        border: 'none', cursor: 'pointer',
      }}
    >
      <span
        className="absolute transition-transform"
        style={{
          width: 14, height: 14, borderRadius: 7, background: '#fff',
          top: 3, left: 3,
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

export function LeccionOperatorPage() {
  const [book, setBook] = useState<Book | null>(null)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [config, setConfig] = useState<PresentationConfig>(defaultConfig)
  const [slideIdx, setSlideIdx] = useState(0)
  const [blank, setBlank] = useState(false)
  const [textScale, setTextScale] = useState(1)
  const myId = useRef(Math.random().toString(36).slice(2, 10))

  const updateConfig = (partial: Partial<PresentationConfig>) =>
    setConfig(c => ({ ...c, ...partial }))

  const slides = useMemo(
    () => lesson ? buildSlides(lesson, config) : [],
    [lesson, config]
  )

  // Carga inicial
  useEffect(() => {
    setLoading(true)
    getCurrentBook()
      .then(async (b) => {
        if (!b) { setError('No hay libro activo.'); setLoading(false); return }
        setBook(b)
        const ls = await getLessons(b.id)
        setLessons(ls)
        const current = pickCurrentLesson(ls)
        if (current) setSelectedLessonId(current.id)
        setLoading(false)
      })
      .catch((e) => { setError(String(e)); setLoading(false) })
  }, [])

  // Cargar lección completa
  useEffect(() => {
    if (!selectedLessonId) return
    setLessonLoading(true)
    getLesson(selectedLessonId)
      .then((l) => { setLesson(l); setSlideIdx(0); setLessonLoading(false) })
      .catch((e) => { setError(String(e)); setLessonLoading(false) })
  }, [selectedLessonId])

  // Mantener slideIdx dentro de rango cuando cambia la config
  useEffect(() => {
    if (slides.length > 0) setSlideIdx(i => Math.min(i, slides.length - 1))
  }, [slides.length])

  // Broadcast al proyector
  useEffect(() => {
    if (!selectedLessonId) return
    const state: LeccionSyncState = {
      lessonId: selectedLessonId,
      config,
      slideIdx,
      blank,
      coverUrl: book?.coverUrl ?? null,
      textScale,
    }
    broadcastLeccionState(state, myId.current)
  }, [selectedLessonId, config, slideIdx, blank, textScale, book?.coverUrl])

  const sala = getSala()
  const projUrl = sala
    ? `${window.location.origin}/leccion-proyector?sala=${sala}`
    : `${window.location.origin}/leccion-proyector`

  const slide = slides[slideIdx]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E1014', color: '#E3B260' }}>
        <div className="text-center">
          <div className="text-xl font-bold mb-2">Lección SMI</div>
          <div className="text-sm opacity-60">Cargando lecciones…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E1014', color: '#E3B260' }}>
        <div className="text-center max-w-sm">
          <div className="text-xl font-bold mb-2">Error</div>
          <div className="text-sm opacity-70 mb-4">{error}</div>
          <Link to="/" className="text-xs underline opacity-50">← Volver al himnario</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0E1014', color: '#E8E0D5', fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xs opacity-40 hover:opacity-70 transition-opacity">← Himnario</Link>
          <span className="text-xs opacity-20">|</span>
          <span className="font-bold text-sm" style={{ color: '#E3B260' }}>Lección</span>
          {book && <span className="text-xs opacity-40 truncate max-w-40">{book.title}</span>}
        </div>
        <a
          href={projUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: '#E3B260', color: '#0E1014' }}
        >
          Abrir proyector
        </a>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Col izquierda — lecciones */}
        <div className="w-48 flex-shrink-0 border-r border-white/10 overflow-y-auto p-2 flex flex-col gap-1">
          <div className="text-xs font-semibold opacity-30 uppercase mb-1 px-1 mt-1">Lecciones</div>
          {lessons.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelectedLessonId(l.id)}
              className="w-full text-left px-2 py-1.5 rounded text-sm transition-colors"
              style={{
                background: selectedLessonId === l.id ? '#1C3A5A' : 'transparent',
                color: selectedLessonId === l.id ? '#E3B260' : '#8A8A8A',
              }}
            >
              <div className="font-medium text-xs">Lec. {l.lessonNumber}</div>
              <div className="text-xs opacity-70 truncate">{l.title}</div>
            </button>
          ))}
        </div>

        {/* Col central — preview del slide + lista */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {lessonLoading ? (
            <div className="flex-1 flex items-center justify-center opacity-40 text-sm">Cargando lección…</div>
          ) : lesson ? (
            <>
              {/* Mini preview del slide actual */}
              {(() => {
                const previewLight = isLightBackground(config.background)
                const previewAccent = previewLight ? '#1A5C8A' : '#6EDCCF'
                const previewMain   = previewLight ? '#1A1A2E' : '#FFFFFF'
                const previewDim    = previewLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)'
                return (
                  <div
                    className="flex-shrink-0 mx-4 mt-3 mb-2 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ height: 130, background: backgroundCss(config.background, book?.coverUrl), position: 'relative' }}
                  >
                    {slide ? (
                      <div className="text-center px-4 py-3" style={{ zIndex: 1 }}>
                        {slide.kind === 'lessonTitle' ? (
                          <>
                            <div className="text-xs font-bold mb-1" style={{ color: previewAccent }}>Lección {slide.lessonNumber}</div>
                            <div className="text-sm font-bold leading-tight" style={{ color: previewMain }}>{slide.title}</div>
                            {slide.date && <div className="text-xs mt-1" style={{ color: previewDim }}>{slide.date}</div>}
                          </>
                        ) : slide.kind === 'question' ? (
                          <>
                            <div className="text-lg font-bold mb-1" style={{ color: previewAccent }}>{slide.number}</div>
                            <div className="text-xs leading-snug line-clamp-3" style={{ color: previewMain }}>{slide.text}</div>
                          </>
                        ) : slide.kind === 'verse' ? (
                          <>
                            <div className="text-xs font-bold mb-1" style={{ color: previewAccent }}>{slide.reference}</div>
                            <div className="text-xs italic line-clamp-3" style={{ color: previewMain }}>{slide.text}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: previewAccent }}>{getSlideLabel(slide)}</div>
                            <div className="text-xs line-clamp-3" style={{ color: previewMain }}>{slide.text}</div>
                          </>
                        )}
                        {slide.total && slide.total > 1 && (
                          <div className="text-xs mt-1" style={{ color: previewDim }}>{slide.page} / {slide.total}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: previewDim }}>Sin diapositivas</div>
                    )}
                  </div>
                )
              })()}

              {/* Controles de navegación */}
              <div className="flex items-center gap-2 px-4 mb-2">
                <button
                  onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
                  disabled={slideIdx === 0}
                  className="px-3 py-1 rounded text-xs disabled:opacity-30"
                  style={{ background: '#1C2030', color: '#E8E0D5' }}
                >← Anterior</button>
                <span className="text-xs opacity-40 flex-1 text-center">
                  {slides.length > 0 ? `${slideIdx + 1} / ${slides.length}` : '—'}
                </span>
                <button
                  onClick={() => setSlideIdx(i => Math.min(slides.length - 1, i + 1))}
                  disabled={slideIdx >= slides.length - 1}
                  className="px-3 py-1 rounded text-xs disabled:opacity-30"
                  style={{ background: '#1C2030', color: '#E8E0D5' }}
                >Siguiente →</button>
              </div>

              {/* Lista de slides */}
              <div className="flex-1 overflow-y-auto px-4 pb-3">
                <div className="text-xs opacity-30 uppercase font-semibold mb-2">Diapositivas</div>
                <div className="flex flex-col gap-1">
                  {slides.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSlideIdx(i)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs transition-colors"
                      style={{
                        background: slideIdx === i ? '#1C3A5A' : 'transparent',
                        color: slideIdx === i ? '#E3B260' : '#7A7A7A',
                        border: slideIdx === i ? '1px solid #2A5A8A' : '1px solid transparent',
                      }}
                    >
                      <span className="font-medium">{getSlideLabel(s)}</span>
                      {s.total && s.total > 1 && <span className="ml-1 opacity-50">{s.page}/{s.total}</span>}
                      {s.text && <span className="block opacity-50 truncate">{s.text.slice(0, 50)}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center opacity-30 text-sm">Selecciona una lección</div>
          )}
        </div>

        {/* Col derecha — config */}
        <div className="w-60 flex-shrink-0 border-l border-white/10 overflow-y-auto p-4 flex flex-col gap-5">

          {/* Qué incluir */}
          <div>
            <div className="text-xs font-semibold opacity-40 uppercase mb-3">Contenido</div>
            <div className="flex flex-col gap-3">
              {TOGGLE_ITEMS.map(({ key, label, sub }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <Toggle
                    checked={config[key] as boolean}
                    onChange={(v) => updateConfig({ [key]: v })}
                  />
                  <div>
                    <div className="text-sm">{label}</div>
                    <div className="text-xs opacity-40">{sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Fondo */}
          <div>
            <div className="text-xs font-semibold opacity-40 uppercase mb-3">Fondo</div>
            <div className="grid grid-cols-3 gap-1.5">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => updateConfig({ background: { type: 'preset', id: preset.id } })}
                  title={preset.name}
                  className="rounded-md transition-all"
                  style={{
                    height: 36,
                    background: preset.colors.length === 1
                      ? preset.colors[0]
                      : `linear-gradient(to bottom, ${preset.colors.join(', ')})`,
                    outline: config.background.type === 'preset' && (config.background as { type: 'preset'; id: string }).id === preset.id
                      ? '2px solid #E3B260'
                      : '2px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              ))}
              {book?.coverUrl && (
                <button
                  onClick={() => updateConfig({ background: { type: 'cover' } })}
                  title="Portada del libro"
                  className="rounded-md overflow-hidden transition-all"
                  style={{
                    height: 36,
                    backgroundImage: `url('${book.coverUrl}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    outline: config.background.type === 'cover'
                      ? '2px solid #E3B260'
                      : '2px solid transparent',
                    outlineOffset: 2,
                  }}
                />
              )}
            </div>
          </div>

          {/* Tamaño de texto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold opacity-40 uppercase">Texto</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTextScale(s => Math.max(0.7, parseFloat((s - 0.1).toFixed(1))))}
                  disabled={textScale <= 0.7}
                  className="w-6 h-6 rounded flex items-center justify-center text-sm disabled:opacity-30"
                  style={{ background: '#1C2030', color: '#E8E0D5' }}
                >−</button>
                <span className="text-xs opacity-60 w-8 text-center">{Math.round(textScale * 100)}%</span>
                <button
                  onClick={() => setTextScale(s => Math.min(1.6, parseFloat((s + 0.1).toFixed(1))))}
                  disabled={textScale >= 1.6}
                  className="w-6 h-6 rounded flex items-center justify-center text-sm disabled:opacity-30"
                  style={{ background: '#1C2030', color: '#E8E0D5' }}
                >+</button>
              </div>
            </div>
          </div>

          {/* Oscurecer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold opacity-40 uppercase">Oscurecer</div>
              <div className="text-xs opacity-50">{Math.round(config.overlayOpacity * 100)}%</div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.overlayOpacity}
              onChange={(e) => updateConfig({ overlayOpacity: Number(e.target.value) })}
              className="w-full"
              style={{ accentColor: '#E3B260' }}
            />
          </div>

          {/* Pantalla apagada */}
          <button
            onClick={() => setBlank(b => !b)}
            className="w-full py-2 rounded text-sm font-medium transition-colors"
            style={{
              background: blank ? '#5A1A1A' : '#1C2030',
              color: blank ? '#FF6B6B' : '#E8E0D5',
              border: blank ? '1px solid #8A2A2A' : '1px solid transparent',
            }}
          >
            {blank ? '● Pantalla apagada' : 'Apagar pantalla'}
          </button>

          {sala && (
            <div>
              <div className="text-xs opacity-30 mb-1">Sala</div>
              <div className="text-xs font-mono px-2 py-1 rounded" style={{ background: '#1C2030', color: '#E3B260' }}>
                {sala}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
