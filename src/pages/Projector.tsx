import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage } from '../components/Stage'
import { buildSlides } from '../lib/slides'
import { broadcastCmd, broadcastHello, onMessage, getSala, setSala, resetRelay } from '../lib/sync'
import type { Hymn, HymnaryId, Slide } from '../types'

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

  const handleJoin = () => {
    const code = joinInput.trim().toUpperCase()
    if (code.length < 2) return
    setSala(code)
    resetRelay()
    setSalaReady(true)
  }

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
        setRemote(msg as unknown as RemoteState)
      }
    }, true)
  }, [salaReady])

  const cmd = useCallback((action: 'next' | 'prev' | 'first' | 'blank' | 'goto', num?: number) => {
    broadcastCmd(action, num)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key
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
  }, [cmd, toggleFullscreen])

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
  const waiting = !slide && !blank

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
