import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage } from '../components/Stage'
import { buildSlides } from '../lib/slides'
import { broadcastCmd, broadcastHello, onMessage } from '../lib/sync'
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
  const bufRef = useRef('')
  const bufTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    broadcastHello()
    const t = setInterval(broadcastHello, 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'state') {
        setRemote(msg as unknown as RemoteState)
      }
    })
  }, [])

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
