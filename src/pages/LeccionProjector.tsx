import { useEffect, useMemo, useRef, useState } from 'react'
import { getLesson } from '../services/lessons'
import { broadcastLeccionHello, onLeccionMessage, getSala, resetLeccionRelay } from '../lib/syncLesson'
import { buildSlides, backgroundCss, defaultConfig, isLightBackground } from '../data/presentation'
import type { Lesson } from '../types/lesson'
import type { LeccionSyncState } from '../lib/syncLesson'
import type { PresentationConfig } from '../data/presentation'
import { LeccionSlideView } from '../components/LeccionSlideView'

// ── Proyector ─────────────────────────────────────────────────────────────────

export function LeccionProjectorPage() {
  const [remote, setRemote] = useState<LeccionSyncState | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [salaReady, setSalaReady] = useState(() => !!getSala())
  const [joinInput, setJoinInput] = useState('')
  const loadedLessonId = useRef('')

  useEffect(() => {
    const params = new URL(window.location.href).searchParams
    const sala = params.get('sala')
    if (sala) {
      import('../lib/relay').then(({ setSala }) => {
        setSala(sala)
        resetLeccionRelay()
        setSalaReady(true)
      })
    }
  }, [])

  useEffect(() => {
    if (!salaReady) return
    broadcastLeccionHello()
    const t = setInterval(broadcastLeccionHello, 3000)
    return () => clearInterval(t)
  }, [salaReady])

  useEffect(() => {
    if (!salaReady) return
    return onLeccionMessage((msg) => {
      if (msg.type === 'leccion-state') {
        setRemote({
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
    if (!remote?.lessonId || remote.lessonId === loadedLessonId.current) return
    loadedLessonId.current = remote.lessonId
    getLesson(remote.lessonId).then(setLesson).catch(console.error)
  }, [remote?.lessonId])

  const slides = useMemo(
    () => lesson && remote ? buildSlides(lesson, remote.config) : [],
    [lesson, remote?.config]
  )

  // Teclado: flechas + f (igual que proyector de himnos)
  useEffect(() => {
    const total = slides.length
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        setRemote(r => r ? { ...r, slideIdx: Math.min(Math.max(0, total - 1), r.slideIdx + 1) } : r)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        setRemote(r => r ? { ...r, slideIdx: Math.max(0, r.slideIdx - 1) } : r)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        else document.documentElement.requestFullscreen().catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  const handleJoin = () => {
    const code = joinInput.trim().toUpperCase()
    if (code.length < 2) return
    import('../lib/relay').then(({ setSala }) => {
      setSala(code)
      resetLeccionRelay()
      setSalaReady(true)
    })
  }

  if (!salaReady) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 24,
        background: '#0E1014', color: '#E3B260',
        fontFamily: 'Atkinson Hyperlegible, sans-serif',
      }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Proyector — Lección</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="Código de sala"
            maxLength={10}
            style={{
              padding: '8px 12px', borderRadius: 6, fontSize: 14, fontFamily: 'monospace',
              background: '#1C2030', color: '#E8E0D5', border: '1px solid #2A3050',
              outline: 'none', width: 160,
            }}
          />
          <button
            onClick={handleJoin}
            style={{ padding: '8px 16px', borderRadius: 6, fontSize: 14, fontWeight: 600, background: '#E3B260', color: '#0E1014', border: 'none', cursor: 'pointer' }}
          >Conectar</button>
        </div>
      </div>
    )
  }

  if (!remote?.lessonId) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0E1014', fontFamily: 'Atkinson Hyperlegible, sans-serif',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.35, color: '#E3B260' }}>Esperando al operador…</div>
      </div>
    )
  }

  if (remote.blank) {
    return <div style={{ minHeight: '100vh', background: '#000' }} />
  }

  const config: PresentationConfig = remote.config ?? defaultConfig
  const coverUrl = remote.coverUrl ?? undefined
  const textScale = remote.textScale ?? 1
  const bg = backgroundCss(config.background, coverUrl)
  const light = isLightBackground(config.background)
  const slide = slides[remote.slideIdx] ?? null
  const ACCENT_PROGRESS = light ? '#1A5C8A' : '#6EDCCF'

  if (!lesson || slides.length === 0) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, fontFamily: 'Atkinson Hyperlegible, sans-serif',
      }}>
        <div style={{ color: light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', fontSize: 18 }}>
          Cargando lección…
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: bg, fontFamily: 'Atkinson Hyperlegible, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Overlay oscurecer */}
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
          width: `${((remote.slideIdx + 1) / slides.length) * 100}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Slide */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {slide
          ? <LeccionSlideView slide={slide} scale={textScale} light={light} />
          : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: light ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', fontSize: 18 }}>
                Fin de la presentación
              </div>
            </div>
          )
        }

        {/* Zonas de click para navegar (izquierda=anterior, derecha=siguiente) */}
        <div
          onClick={() => setRemote(r => r ? { ...r, slideIdx: Math.max(0, r.slideIdx - 1) } : r)}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', cursor: 'w-resize' }}
        />
        <div
          onClick={() => setRemote(r => r ? { ...r, slideIdx: Math.min(slides.length - 1, r.slideIdx + 1) } : r)}
          style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '60%', cursor: 'e-resize' }}
        />
      </div>

      {/* Contador */}
      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
        <div style={{ fontSize: 12, color: light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
          {remote.slideIdx + 1} / {slides.length}
        </div>
      </div>
    </div>
  )
}
