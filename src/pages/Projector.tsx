import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage } from '../components/Stage'
import { LeccionSlideView } from '../components/LeccionSlideView'
import { FitText } from '../components/FitText'
import { buildSlides } from '../lib/slides'
import { broadcastCmd, broadcastHello, onMessage, getSala, setSala, resetRelay } from '../lib/sync'
import { onLeccionMessage, broadcastLeccionHello, resetLeccionRelay } from '../lib/syncLesson'
import { onBibleMessage, broadcastBibleHello } from '../lib/syncBible'
import { getLesson } from '../services/lessons'
import { buildSlides as buildLeccionSlides, backgroundCss, isLightBackground, defaultConfig } from '../data/presentation'
import type { Hymn, HymnaryId, Slide } from '../types'
import type { Lesson } from '../types/lesson'
import type { LeccionSyncState } from '../lib/syncLesson'
import type { BibleSyncState } from '../lib/syncBible'

interface ProjectorPageProps {
  hymnsSmi: Hymn[]
  hymnsJuvenil: Hymn[]
}

interface RemoteState {
  num: number
  idx: number
  blank: boolean
  scale: number
  theme: string
  repeatChorus: boolean
  showTitle: boolean
  showLabel: boolean
  hymnary: HymnaryId
}

export function ProjectorPage({ hymnsSmi, hymnsJuvenil }: ProjectorPageProps) {
  const [remote, setRemote] = useState<RemoteState | null>(null)
  const [salaReady, setSalaReady] = useState<boolean>(() => !!getSala())
  const [joinInput, setJoinInput] = useState('')
  const bufRef = useRef('')
  const bufTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // ── Lesson / Bible state ─────────────────────────────────────────────────────
  const [mode, setMode] = useState<'hymn' | 'lesson' | 'bible'>('hymn')
  const [leccionRemote, setLeccionRemote] = useState<LeccionSyncState | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const loadedLessonId = useRef('')
  const [bibleRemote, setBibleRemote] = useState<BibleSyncState | null>(null)

  const handleJoin = () => {
    const code = joinInput.trim().toUpperCase()
    if (code.length < 2) return
    setSala(code)
    resetRelay()
    resetLeccionRelay()
    setSalaReady(true)
    // syncBible usa initRelay vía ensureRelay la primera vez que se llame
  }

  // ── Hymn sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!salaReady) return
    broadcastHello()
    const t = setInterval(broadcastHello, 3000)
    return () => clearInterval(t)
  }, [salaReady])

  useEffect(() => {
    if (!salaReady) return
    return onMessage(msg => {
      if (msg.type === 'state') {
        setMode('hymn')
        setRemote(msg as unknown as RemoteState)
      }
    }, true)
  }, [salaReady])

  // ── Lesson sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!salaReady) return
    broadcastLeccionHello()
    const t = setInterval(broadcastLeccionHello, 3000)
    return () => clearInterval(t)
  }, [salaReady])

  useEffect(() => {
    if (!salaReady) return
    return onLeccionMessage(msg => {
      if (msg.type === 'leccion-state') {
        setMode('lesson')
        setLeccionRemote({
          lessonId: msg.lessonId,
          config: msg.config ?? defaultConfig,
          slideIdx: msg.slideIdx ?? 0,
          blank: msg.blank ?? false,
          coverUrl: msg.coverUrl ?? null,
          textScale: msg.textScale ?? 1,
        })
      }
    }, true)
  }, [salaReady])

  useEffect(() => {
    if (!leccionRemote?.lessonId || leccionRemote.lessonId === loadedLessonId.current) return
    loadedLessonId.current = leccionRemote.lessonId
    getLesson(leccionRemote.lessonId).then(setLesson).catch(console.error)
  }, [leccionRemote?.lessonId])

  // ── Bible sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!salaReady) return
    broadcastBibleHello()
    const t = setInterval(broadcastBibleHello, 3000)
    return () => clearInterval(t)
  }, [salaReady])

  useEffect(() => {
    if (!salaReady) return
    return onBibleMessage(msg => {
      if (msg.type === 'bible-state') {
        setMode('bible')
        setBibleRemote({
          verse: msg.verse,
          reference: msg.reference ?? '',
          text: msg.text ?? '',
          blank: msg.blank ?? false,
          textScale: msg.textScale ?? 1,
          theme: msg.theme ?? 'dark',
        })
      }
    })
  }, [salaReady])

  // ── Commands (hymn mode) ────────────────────────────────────────────────────
  const cmd = useCallback((action: 'next' | 'prev' | 'first' | 'blank' | 'goto', num?: number) => {
    broadcastCmd(action, num)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  const leccionSlides = useMemo(
    () => lesson && leccionRemote ? buildLeccionSlides(lesson, leccionRemote.config) : [],
    [lesson, leccionRemote?.config]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key
      if (mode === 'bible') {
        if (k === 'f' || k === 'F') { e.preventDefault(); toggleFullscreen() }
        return
      }
      if (mode === 'lesson') {
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown') {
          e.preventDefault()
          setLeccionRemote(r => r ? { ...r, slideIdx: Math.min(Math.max(0, leccionSlides.length - 1), r.slideIdx + 1) } : r)
        } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') {
          e.preventDefault()
          setLeccionRemote(r => r ? { ...r, slideIdx: Math.max(0, r.slideIdx - 1) } : r)
        } else if (k === 'f' || k === 'F') {
          e.preventDefault()
          toggleFullscreen()
        }
        return
      }
      // Hymn mode
      if (/^\d$/.test(k)) {
        e.preventDefault()
        if (bufTimerRef.current) clearTimeout(bufTimerRef.current)
        bufRef.current = (bufRef.current + k).slice(0, 4)
        bufTimerRef.current = setTimeout(() => { bufRef.current = '' }, 3000)
        return
      }
      if (k === 'Enter' && bufRef.current) { e.preventDefault(); cmd('goto', Number(bufRef.current)); bufRef.current = ''; return }
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ') { e.preventDefault(); cmd('next') }
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); cmd('prev') }
      else if (k === 'Home') { e.preventDefault(); cmd('first') }
      else if (k === 'b' || k === 'B' || k === '.') { e.preventDefault(); cmd('blank') }
      else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFullscreen() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cmd, toggleFullscreen, mode, leccionSlides.length])

  // ── Hymn render data ────────────────────────────────────────────────────────
  const themes: Record<string, { bg: string; fg: string; muted: string; accent: string }> = {
    'Negro': { bg: '#000000', fg: '#F6F3EC', muted: '#8E8A82', accent: '#E3B260' },
    'Azul noche': { bg: '#0D1A2F', fg: '#FFFFFF', muted: '#93A4BF', accent: '#8EC3FF' },
    'Claro': { bg: '#FAF8F3', fg: '#16171B', muted: '#6A655C', accent: '#9A5B13' },
  }
  const t = themes[remote?.theme ?? 'Claro'] ?? themes['Claro']

  const hymns = remote?.hymnary === 'juvenil' ? hymnsJuvenil : hymnsSmi
  const hymn = remote ? (hymns.find(h => h.number === remote.num) ?? null) : null
  const slides: Slide[] = hymn && remote ? buildSlides(hymn, remote.repeatChorus !== false) : []
  const idx = remote ? Math.min(remote.idx ?? 0, Math.max(0, slides.length - 1)) : 0
  const slide = slides[idx] ?? null
  const blank = !!(remote?.blank)

  const settings = {
    theme: (remote?.theme ?? 'Claro') as 'Negro' | 'Azul noche' | 'Claro',
    repeatChorus: remote?.repeatChorus !== false,
    showTitle: remote?.showTitle !== false,
    showLabel: remote?.showLabel !== false,
  }

  const handleClick = () => {
    if (!document.fullscreenElement) toggleFullscreen()
    else cmd('next')
  }

  // ── Sala join screen ────────────────────────────────────────────────────────
  if (!salaReady) {
    return (
      <div style={{
        width: '100%', height: '100vh', background: '#0E1014', color: '#E7E8EC',
        fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
      }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>Himnario SMI</div>
        <div style={{ fontSize: 16, color: '#9AA0AC' }}>Ingresa el código de sala del operador</div>
        <form onSubmit={e => { e.preventDefault(); handleJoin() }}
          style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={joinInput}
            onChange={e => setJoinInput(e.target.value.toUpperCase().slice(0, 20))}
            placeholder="Código de sala"
            autoFocus
            style={{
              height: 48, padding: '0 16px', borderRadius: 10, border: '2px solid #E3B260',
              background: '#14171D', color: '#E3B260', fontFamily: 'monospace',
              fontSize: 20, fontWeight: 700, width: 200, outline: 'none', textAlign: 'center',
              letterSpacing: '0.12em',
            }}
          />
          <button type="submit" style={{
            height: 48, padding: '0 24px', borderRadius: 10, border: 0,
            background: '#E3B260', color: '#1A1408', fontFamily: 'inherit',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>Conectar</button>
        </form>
      </div>
    )
  }

  // ── Bible mode render ───────────────────────────────────────────────────────
  if (mode === 'bible' && bibleRemote) {
    if (bibleRemote.blank) {
      return <div style={{ width: '100%', height: '100vh', background: '#000' }} />
    }
    const bLight = bibleRemote.theme === 'light'
    const bBg     = bLight ? '#F5F0E8' : '#0D1B2A'
    const bMain   = bLight ? '#1A1A2E' : '#FFFFFF'
    const bAccent = bLight ? '#1A5C8A' : '#6EDCCF'
    const bScale  = bibleRemote.textScale ?? 1

    return (
      <div
        style={{
          width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
          background: bBg, fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
          padding: `3vmin 5vmin`, boxSizing: 'border-box', overflow: 'hidden',
        }}
        onClick={toggleFullscreen}
      >
        {/* Referencia fija arriba — tamaño generoso */}
        <div style={{
          flexShrink: 0, textAlign: 'center',
          fontSize: `${3 * bScale}vmin`, fontWeight: 700,
          color: bAccent, letterSpacing: '0.12em', textTransform: 'uppercase',
          marginBottom: '2vmin',
        }}>
          {bibleRemote.reference}
        </div>

        {/* Texto centrado verticalmente en el espacio restante */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <FitText
            maxVmin={11 * bScale}
            minVmin={2.5}
            lineHeight={1.35}
            style={{ fontWeight: 600, color: bMain, textAlign: 'center', height: 'auto' }}
          >
            {bibleRemote.text}
          </FitText>
        </div>
      </div>
    )
  }

  // ── Lesson mode render ──────────────────────────────────────────────────────
  if (mode === 'lesson' && leccionRemote) {
    if (leccionRemote.blank) {
      return <div style={{ width: '100%', height: '100vh', background: '#000' }} />
    }

    const config = leccionRemote.config
    const coverUrl = leccionRemote.coverUrl ?? undefined
    const textScale = leccionRemote.textScale ?? 1
    const bg = backgroundCss(config.background, coverUrl)
    const light = isLightBackground(config.background)
    const leccionSlide = leccionSlides[leccionRemote.slideIdx] ?? null
    const ACCENT_PROGRESS = light ? '#1A5C8A' : '#6EDCCF'

    if (!lesson || leccionSlides.length === 0) {
      return (
        <div style={{
          width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: bg, fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
        }}>
          <div style={{ color: light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', fontSize: 18 }}>
            Cargando lección…
          </div>
        </div>
      )
    }

    return (
      <div style={{
        width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
        background: bg, fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
        position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      }}>
        {config.overlayOpacity > 0 && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `rgba(0,0,0,${config.overlayOpacity * 0.6})`,
            zIndex: 0,
          }} />
        )}

        {/* Barra de progreso */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(128,128,128,0.15)', zIndex: 2 }}>
          <div style={{
            height: '100%', background: ACCENT_PROGRESS,
            width: `${((leccionRemote.slideIdx + 1) / leccionSlides.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Slide */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          {leccionSlide
            ? <LeccionSlideView slide={leccionSlide} scale={textScale} light={light} />
            : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', fontSize: 18 }}>
                  Fin de la presentación
                </div>
              </div>
            )
          }

          {/* Zonas de click para navegar */}
          <div
            onClick={() => setLeccionRemote(r => r ? { ...r, slideIdx: Math.max(0, r.slideIdx - 1) } : r)}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', cursor: 'w-resize' }}
          />
          <div
            onClick={() => setLeccionRemote(r => r ? { ...r, slideIdx: Math.min(leccionSlides.length - 1, r.slideIdx + 1) } : r)}
            style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '60%', cursor: 'e-resize' }}
          />
        </div>

        {/* Contador */}
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ fontSize: 12, color: light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
            {leccionRemote.slideIdx + 1} / {leccionSlides.length}
          </div>
        </div>
      </div>
    )
  }

  // ── Hymn mode render ────────────────────────────────────────────────────────
  const waiting = !slide && !blank
  return (
    <div
      ref={rootRef}
      tabIndex={0}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 360,
        boxSizing: 'border-box',
        overflow: 'hidden',
        containerType: 'size',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: blank ? '#000000' : t.bg,
        color: t.fg,
        fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
        outline: 'none',
        cursor: waiting ? 'default' : 'none',
        userSelect: 'none',
      }}
      onClick={handleClick}
    >
      {waiting ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.4cqh', textAlign: 'center', padding: '0 8cqw' }}>
          <div style={{ fontSize: '5cqh', fontWeight: 700 }}>Pantalla del proyector</div>
          <div style={{ fontSize: '3cqh', lineHeight: 1.5, color: t.muted }}>
            {'Esperando al panel del operador. Ábrelo en otra ventana: esta pantalla lo sigue sola.\nHaz clic aquí o presiona F para pantalla completa.'}
          </div>
        </div>
      ) : (
        <Stage
          slide={slide}
          slides={slides}
          currentIndex={idx}
          hymn={hymn ? { number: hymn.number, title: hymn.title } : null}
          blank={blank}
          scale={remote?.scale ?? 1}
          settings={settings}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}
