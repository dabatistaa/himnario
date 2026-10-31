import { useCallback, useEffect, useRef, useState } from 'react'

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return width
}
import { Stage } from '../components/Stage'
import { useKeyboard } from '../hooks/useKeyboard'
import { buildSlides } from '../lib/slides'
import { searchHymns } from '../lib/search'
import { broadcastState, DEFAULT_SETTINGS, loadPersistedState, onMessage, persistState, isRelayConnected, getSala, setSala, generateAndSetSala, clearSala, resetRelay } from '../lib/sync'
import type { Hymn, HymnaryId, ProjectionTheme, Settings, Slide } from '../types'

interface OperatorPageProps {
  hymnsSmi: Hymn[]
  hymnsJuvenil: Hymn[]
}

const THEME_OPTIONS: ProjectionTheme[] = ['Negro', 'Azul noche', 'Claro']

const HYMNARY_LABELS: Record<HymnaryId, string> = {
  smi: 'Himnario SMI',
  juvenil: 'Himnario Juvenil SMI',
}

export function OperatorPage({ hymnsSmi, hymnsJuvenil }: OperatorPageProps) {
  const persisted = loadPersistedState()

  const [hymnary, setHymnary] = useState<HymnaryId>(persisted.hymnary ?? 'smi')
  const hymns = hymnary === 'smi' ? hymnsSmi : hymnsJuvenil

  const [hymnNum, setHymnNum] = useState(persisted.num ?? (hymns[0]?.number ?? 1))
  const [slideIdx, setSlideIdx] = useState(persisted.idx ?? 0)
  const [blank, setBlank] = useState(false)
  const [scale, setScale] = useState(persisted.scale ?? 1.0)
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS })
  const [projLastSeen, setProjLastSeen] = useState<number | null>(null)
  const [relayConnected, setRelayConnected] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const isActiveRef = useRef(false)
  const activationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [remoteOpId, setRemoteOpId] = useState<string | null>(null)
  const myId = useRef(Math.random().toString(36).slice(2, 10))
  const hasMounted = useRef(false)
  const [copiedObs, setCopiedObs] = useState(false)
  const [salaState, setSalaState] = useState<string | null>(() => getSala())
  const [salaMode, setSalaMode] = useState<'idle' | 'join'>('idle')
  const [salaInput, setSalaInput] = useState('')
  const salaInputRef = useRef<HTMLInputElement>(null)

  const sala = salaState
  const obsUrl = sala ? `${window.location.origin}/proyector?sala=${sala}` : ''

  const handleCreateSala = () => {
    const newSala = generateAndSetSala()
    setSalaState(newSala)
    resetRelay()
  }

  const handleJoinSala = () => {
    const code = salaInput.trim().toUpperCase()
    if (code.length >= 2) {
      const newSala = setSala(code)
      setSalaState(newSala)
      resetRelay()
    }
    setSalaMode('idle')
    setSalaInput('')
  }

  const handleLeaveSala = () => {
    clearSala()
    setSalaState(null)
    setSalaMode('idle')
  }

  const copyObsUrl = () => {
    if (!obsUrl) return
    navigator.clipboard.writeText(obsUrl).then(() => {
      setCopiedObs(true)
      setTimeout(() => setCopiedObs(false), 2500)
    })
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchHymns>>([])
  const searchRef = useRef<HTMLInputElement>(null)

  const [digitBuffer, setDigitBuffer] = useState('')
  const digitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hymn = hymns.find(h => h.number === hymnNum) ?? hymns[0]
  const slides: Slide[] = hymn ? buildSlides(hymn, settings.repeatChorus) : []
  const safeIdx = Math.min(slideIdx, Math.max(0, slides.length - 1))
  const slide = slides[safeIdx] ?? null

  const sendState = useCallback(() => {
    if (!isActiveRef.current) return
    broadcastState({ num: hymnNum, idx: safeIdx, blank, scale, settings, hymnary }, myId.current)
  }, [hymnNum, safeIdx, blank, scale, settings, hymnary])

  useEffect(() => {
    activationTimerRef.current = setTimeout(() => {
      if (!isActiveRef.current) {
        isActiveRef.current = true
        setIsActive(true)
      }
    }, 1500)
    return () => { if (activationTimerRef.current) clearTimeout(activationTimerRef.current) }
  }, [])

  const takeControl = useCallback(() => {
    if (activationTimerRef.current) { clearTimeout(activationTimerRef.current); activationTimerRef.current = null }
    isActiveRef.current = true
    setIsActive(true)
    setRemoteOpId(null)
    broadcastState({ num: hymnNum, idx: safeIdx, blank, scale, settings, hymnary }, myId.current)
  }, [hymnNum, safeIdx, blank, scale, settings, hymnary])

  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return }
    if (isActiveRef.current) sendState()
    persistState({ num: hymnNum, idx: safeIdx, scale, hymnary })
  }, [hymnNum, safeIdx, blank, scale, settings, hymnary])

  useEffect(() => {
    return onMessage(msg => {
      if (msg.type === 'hello') {
        setProjLastSeen(Date.now())
        sendState()
      } else if (msg.type === 'state') {
        const m = msg as { type: 'state'; operatorId?: string }
        if (m.operatorId && m.operatorId !== myId.current) {
          if (activationTimerRef.current) { clearTimeout(activationTimerRef.current); activationTimerRef.current = null }
          isActiveRef.current = false
          setIsActive(false)
          setRemoteOpId(m.operatorId)
        }
      } else if (msg.type === 'cmd') {
        if (!isActiveRef.current) return
        const m = msg as { type: 'cmd'; action: string; num?: number }
        if (m.action === 'next') setSlideIdx(i => Math.min(i + 1, slides.length - 1))
        else if (m.action === 'prev') setSlideIdx(i => Math.max(i - 1, 0))
        else if (m.action === 'first') setSlideIdx(0)
        else if (m.action === 'blank') setBlank(b => !b)
        else if (m.action === 'goto' && m.num) goToHymn(m.num)
      }
    })
  }, [sendState, slides.length])

  useEffect(() => {
    const t = setInterval(() => {
      setProjLastSeen(p => p)
      setRelayConnected(isRelayConnected())
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const goToHymn = useCallback((num: number) => {
    setHymnNum(num)
    setSlideIdx(0)
    setBlank(false)
  }, [])

  const switchHymnary = useCallback((id: HymnaryId) => {
    setHymnary(id)
    const newHymns = id === 'smi' ? hymnsSmi : hymnsJuvenil
    setHymnNum(newHymns[0]?.number ?? 1)
    setSlideIdx(0)
    setBlank(false)
  }, [hymnsSmi, hymnsJuvenil])

  const nextSlide = useCallback(() => setSlideIdx(i => Math.min(i + 1, slides.length - 1)), [slides.length])
  const prevSlide = useCallback(() => setSlideIdx(i => Math.max(i - 1, 0)), [])
  const firstSlide = useCallback(() => setSlideIdx(0), [])
  const toggleBlank = useCallback(() => setBlank(b => !b), [])

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
    else document.exitFullscreen()
  }, [])

  const handleDigit = useCallback((d: string) => {
    setDigitBuffer(prev => {
      const next = (prev + d).slice(0, 4)
      if (digitTimerRef.current) clearTimeout(digitTimerRef.current)
      digitTimerRef.current = setTimeout(() => setDigitBuffer(''), 3000)
      return next
    })
  }, [])

  const handleDigitEnter = useCallback(() => {
    if (!digitBuffer) return
    const n = parseInt(digitBuffer, 10)
    if (n >= 1) goToHymn(n)
    setDigitBuffer('')
    if (digitTimerRef.current) clearTimeout(digitTimerRef.current)
  }, [digitBuffer, goToHymn])

  useKeyboard({
    onNext: isActive ? nextSlide : undefined,
    onPrev: isActive ? prevSlide : undefined,
    onFirst: isActive ? firstSlide : undefined,
    onBlack: isActive ? toggleBlank : undefined,
    onFullscreen: handleFullscreen,
    onEsc: () => { setSearchOpen(false); setSearchQuery(''); setDigitBuffer('') },
    onDigit: isActive ? handleDigit : undefined,
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      if (e.key === 'Enter' && digitBuffer) { e.preventDefault(); handleDigitEnter() }
      if (e.key === 'Backspace' && digitBuffer) { e.preventDefault(); setDigitBuffer(b => b.slice(0, -1)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [digitBuffer, handleDigitEnter])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    setSearchResults(searchHymns(hymns, searchQuery))
  }, [searchQuery, hymns])

  const openProjector = () => {
    const sala = getSala()
    const q = sala ? `?sala=${encodeURIComponent(sala)}` : ''
    window.open(`/proyector${q}`, 'proyector', 'popup=1,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')
  }

  const hymnIndex = hymns.findIndex(h => h.number === hymnNum)
  const updateSetting = <K extends keyof Settings>(key: K, val: Settings[K]) => setSettings(s => ({ ...s, [key]: val }))
  const projConnected = projLastSeen != null && Date.now() - projLastSeen < 8000

  const btnBase: React.CSSProperties = {
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const containerWidth = useContainerWidth(containerRef)
  const narrow = containerWidth < 520

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        height: '100vh',
        minHeight: narrow ? 0 : 640,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        background: '#0E1014',
        color: '#E7E8EC',
        fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
        outline: 'none',
      }}
    >
      {/* Header */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: narrow ? 8 : 16,
        padding: narrow ? '10px 12px' : '14px 24px',
        borderBottom: '1px solid #262A33',
        background: '#14171D',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: narrow ? '1 1 auto' : '0 0 auto' }}>
          {!narrow && <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.01em' }}>{HYMNARY_LABELS[hymnary]}</span>}
          {!narrow && <span style={{ fontSize: 13, color: '#9AA0AC' }}>Operador</span>}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
            padding: '3px 8px', borderRadius: 999, border: '1px solid #333844',
            color: projConnected ? '#CDEFD9' : '#9AA0AC',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: projConnected ? '#5BD18B' : '#6B7180' }} />
            {narrow ? (projConnected ? 'Proj' : 'Sin proj') : (projConnected ? 'Proyector conectado' : 'Proyector sin abrir')}
          </span>
          {sala ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11,
                padding: '3px 8px', borderRadius: 999, border: '1px solid #333844',
                color: relayConnected ? '#CDEFD9' : '#9AA0AC',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: relayConnected ? '#5BD18B' : '#6B7180' }} />
                {relayConnected ? `Sala: ${sala}` : 'Conectando…'}
              </span>
              <button type="button" onClick={handleLeaveSala} title="Salir de la sala"
                style={{ height: 22, width: 22, borderRadius: '50%', border: '1px solid #333844', background: 'transparent', color: '#9AA0AC', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                ✕
              </button>
            </span>
          ) : salaMode === 'join' ? (
            <form onSubmit={e => { e.preventDefault(); handleJoinSala() }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <input
                ref={salaInputRef}
                value={salaInput}
                onChange={e => setSalaInput(e.target.value.toUpperCase().slice(0, 20))}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { setSalaMode('idle'); setSalaInput('') } }}
                autoFocus
                placeholder="Código de sala"
                style={{
                  height: 26, padding: '0 8px', borderRadius: 6, border: '1px solid #E3B260',
                  background: '#1A1D24', color: '#E3B260', fontFamily: 'monospace',
                  fontSize: 12, fontWeight: 700, width: 120, outline: 'none',
                }}
              />
              <button type="submit" style={{ height: 26, padding: '0 8px', borderRadius: 6, border: 0, background: '#E3B260', color: '#1A1408', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Unirse</button>
              <button type="button" onClick={() => { setSalaMode('idle'); setSalaInput('') }}
                style={{ height: 26, padding: '0 6px', borderRadius: 6, border: '1px solid #333844', background: 'transparent', color: '#9AA0AC', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </form>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button type="button" onClick={handleCreateSala}
                style={{ height: 26, padding: '0 10px', borderRadius: 6, border: 0, background: '#E3B260', color: '#1A1408', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Crear sala
              </button>
              <button type="button" onClick={() => setSalaMode('join')}
                style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid #333844', background: 'transparent', color: '#9AA0AC', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                Unirse
              </button>
            </span>
          )}
          {sala && !narrow && (
            <button
              type="button"
              onClick={copyObsUrl}
              title={obsUrl}
              style={{
                ...btnBase, gap: 6, height: 32, padding: '0 12px', borderRadius: 8,
                border: '1px solid #333844',
                background: copiedObs ? '#2A3D2A' : '#1A1D24',
                color: copiedObs ? '#5BD18B' : '#9AA0AC',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {copiedObs ? '✓ URL OBS copiada' : '📋 Copiar URL OBS'}
            </button>
          )}
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', flex: narrow ? '1 1 100%' : '1 1 360px', maxWidth: narrow ? '100%' : 560 }}>
          <label htmlFor="buscar" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Buscar himno por número, título o letra
          </label>
          <input
            id="buscar"
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') {
                const q = searchQuery.trim()
                if (/^\d+$/.test(q)) { goToHymn(parseInt(q, 10)); setSearchOpen(false); setSearchQuery(''); return }
                if (searchResults.length > 0) { goToHymn(searchResults[0].hymn.number); setSearchOpen(false); setSearchQuery('') }
              } else if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); (e.target as HTMLElement).blur() }
            }}
            placeholder="Número, título o una frase del himno…"
            autoComplete="off"
            style={{
              width: '100%', boxSizing: 'border-box', height: 46,
              padding: '0 16px', borderRadius: 10, border: '1px solid #333844',
              background: '#0E1014', color: '#F4F5F7', fontFamily: 'inherit', fontSize: 17,
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', zIndex: 10, top: 52, left: 0, right: 0,
              background: '#1A1D24', border: '1px solid #333844', borderRadius: 12,
              padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
              boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
            }}>
              {searchResults.map((r, i) => (
                <button
                  key={r.hymn.number}
                  type="button"
                  onClick={() => { goToHymn(r.hymn.number); setSearchOpen(false); setSearchQuery('') }}
                  style={{
                    ...btnBase, gap: 14, width: '100%', textAlign: 'left',
                    padding: '10px 12px', border: 0, borderRadius: 8,
                    background: i === 0 ? '#242833' : 'transparent', color: '#E7E8EC',
                  }}
                >
                  <span style={{ flex: '0 0 52px', fontSize: 18, fontWeight: 700, color: '#E3B260', fontVariantNumeric: 'tabular-nums' }}>{r.hymn.number}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{r.hymn.title}</span>
                    {r.matchLine && <span style={{ fontSize: 13, color: '#9AA0AC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.matchLine}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
            <div style={{ position: 'absolute', zIndex: 10, top: 52, left: 0, right: 0, background: '#1A1D24', border: '1px solid #333844', borderRadius: 12, padding: 12, fontSize: 14, color: '#9AA0AC' }}>
              No se encontró ningún himno.
            </div>
          )}
        </div>

        {/* Botones header */}
        {!narrow && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <button type="button" onClick={() => setScale(s => Math.max(0.6, +(s - 0.1).toFixed(2)))} aria-label="Letra más pequeña" style={{ ...btnBase, height: 44, minWidth: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', fontSize: 15 }}>A−</button>
            <button type="button" onClick={() => setScale(s => Math.min(1.6, +(s + 0.1).toFixed(2)))} aria-label="Letra más grande" style={{ ...btnBase, height: 44, minWidth: 44, padding: '0 12px', borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', fontSize: 19, fontWeight: 700 }}>A+</button>
            <button type="button" onClick={toggleBlank} aria-pressed={blank} style={{ ...btnBase, height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid #333844', background: blank ? '#E7E8EC' : '#1A1D24', color: blank ? '#111318' : '#E7E8EC', fontSize: 15 }}>Pantalla negra</button>
            <button type="button" onClick={openProjector} style={{ ...btnBase, gap: 8, height: 44, padding: '0 18px', borderRadius: 10, border: 0, background: '#E3B260', color: '#1A1408', fontSize: 15, fontWeight: 700 }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>
              Proyectar
            </button>
            <a href="/leccion" style={{ ...btnBase, height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#9AA0AC', textDecoration: 'none', fontSize: 14, gap: 6 }}>
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Lección
            </a>
            <a href="/biblia" style={{ ...btnBase, height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#9AA0AC', textDecoration: 'none', fontSize: 14, gap: 6 }}>
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Biblia
            </a>
            <a href={`/guia?sala=${sala ?? ''}`} target="_blank" rel="noopener noreferrer" style={{ ...btnBase, height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#9AA0AC', textDecoration: 'none', fontSize: 14, gap: 6 }}>
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Guía OBS
            </a>
          </div>
        )}
      </header>

      {/* Banner de estado de control */}
      {isActive ? (
        sala && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 24px', background: '#0D1F14', borderBottom: '1px solid #1B3A24',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5BD18B', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#5BD18B', fontWeight: 600 }}>Este dispositivo tiene el control</span>
          </div>
        )
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '10px 24px',
          background: '#2B1E0E', borderBottom: '1px solid #5C3A10',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E3B260', flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: '#E3B260', fontWeight: 600 }}>
              Otro dispositivo está controlando
              {remoteOpId && <code style={{ marginLeft: 8, fontSize: 11, color: '#9AA0AC', fontWeight: 400 }}>#{remoteOpId.slice(0, 6)}</code>}
            </span>
          </div>
          <button
            type="button"
            onClick={takeControl}
            style={{
              height: 34, padding: '0 16px', borderRadius: 8, border: 0,
              background: '#E3B260', color: '#1A1408', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Tomar control
          </button>
        </div>
      )}

      {/* Pestañas de himnario */}
      <div style={{ display: 'flex', gap: 0, padding: narrow ? '0 12px' : '0 24px', background: '#14171D', borderBottom: '1px solid #262A33' }}>
        {(['smi', 'juvenil'] as HymnaryId[]).map(id => (
          <button
            key={id}
            type="button"
            onClick={() => switchHymnary(id)}
            style={{
              ...btnBase,
              height: narrow ? 36 : 42,
              padding: narrow ? '0 12px' : '0 20px',
              fontSize: narrow ? 13 : 14,
              fontWeight: hymnary === id ? 700 : 400,
              color: hymnary === id ? '#E3B260' : '#9AA0AC',
              background: 'transparent',
              border: 'none',
              borderBottom: hymnary === id ? '2px solid #E3B260' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {HYMNARY_LABELS[id]}
          </button>
        ))}
      </div>

      {/* ── Layout móvil ── */}
      {narrow ? (
        <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Himno actual: número + título + flechas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #262A33' }}>
            <button type="button" onClick={() => { const prev = hymns[hymnIndex - 1]; if (prev) goToHymn(prev.number) }} aria-label="Himno anterior" disabled={hymnIndex <= 0} style={{ ...btnBase, height: 40, width: 40, borderRadius: 8, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', opacity: hymnIndex <= 0 ? 0.3 : 1, flexShrink: 0 }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#E3B260', fontVariantNumeric: 'tabular-nums' }}>{hymn?.number}</span>
                <span style={{ fontSize: 18, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hymn?.title}</span>
              </div>
              {hymn?.author && <span style={{ fontSize: 12, color: '#9AA0AC' }}>{hymn.author}</span>}
            </div>
            <button type="button" onClick={() => { const next = hymns[hymnIndex + 1]; if (next) goToHymn(next.number) }} aria-label="Himno siguiente" disabled={hymnIndex >= hymns.length - 1} style={{ ...btnBase, height: 40, width: 40, borderRadius: 8, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', opacity: hymnIndex >= hymns.length - 1 ? 0.3 : 1, flexShrink: 0 }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          {/* Tarjeta: texto actual proyectado */}
          <div style={{ flex: '1 1 auto', overflow: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slide ? (
              <div style={{ borderRadius: 14, border: `2px solid ${blank ? '#333844' : '#E3B260'}`, background: blank ? '#111418' : '#1C2030', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: blank ? '#6B7180' : '#E3B260' }}>
                    {blank ? '■ Pantalla negra' : slide.label}
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7180', fontVariantNumeric: 'tabular-nums' }}>{safeIdx + 1} / {slides.length}</span>
                </div>
                <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: blank ? '#6B7180' : '#E7E8EC', whiteSpace: 'pre-wrap', fontStyle: blank ? 'italic' : 'normal' }}>
                  {blank ? 'El proyector no está mostrando nada' : slide.text}
                </p>
              </div>
            ) : (
              <div style={{ borderRadius: 14, border: '1px solid #262A33', background: '#14171D', padding: '24px 16px', textAlign: 'center', color: '#6B7180', fontSize: 15 }}>
                Sin himno seleccionado
              </div>
            )}

            {/* Lista de secciones colapsable */}
            <details style={{ borderRadius: 10, border: '1px solid #262A33', background: '#14171D' }}>
              <summary style={{ padding: '12px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#9AA0AC', letterSpacing: '0.08em', textTransform: 'uppercase', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Todas las secciones</span>
                <span style={{ fontSize: 11, color: '#6B7180', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{slides.length} secciones</span>
              </summary>
              <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {slides.map((s, i) => {
                  const active = i === safeIdx
                  return (
                    <button key={i} type="button" onClick={() => setSlideIdx(i)} aria-current={active ? 'true' : 'false'}
                      style={{ ...btnBase, flexDirection: 'column', alignItems: 'flex-start', gap: 3, width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: `1px solid ${active ? '#E3B260' : '#262A33'}`, background: active ? '#1C2030' : 'transparent', color: '#E7E8EC' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? '#E3B260' : '#9AA0AC' }}>{s.label}</span>
                      <span style={{ fontSize: 13, lineHeight: 1.35, color: '#C9CCD3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{s.text.split('\n').slice(0, 1).join('')}</span>
                    </button>
                  )
                })}
              </div>
            </details>
          </div>

          {/* Barra de acciones fija abajo */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #262A33', background: '#14171D', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Anterior / Siguiente */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={prevSlide} disabled={safeIdx === 0} style={{ ...btnBase, flex: 1, height: 56, gap: 8, borderRadius: 12, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', fontSize: 16, opacity: safeIdx === 0 ? 0.35 : 1 }}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                Anterior
              </button>
              <button type="button" onClick={nextSlide} disabled={safeIdx >= slides.length - 1} style={{ ...btnBase, flex: 1, height: 56, gap: 8, borderRadius: 12, border: 0, background: '#2B3140', color: '#FFFFFF', fontSize: 16, fontWeight: 700, opacity: safeIdx >= slides.length - 1 ? 0.35 : 1 }}>
                Siguiente
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
            {/* Pantalla negra */}
            <button type="button" onClick={toggleBlank} aria-pressed={blank} style={{ ...btnBase, height: 44, borderRadius: 10, border: '1px solid #333844', background: blank ? '#E7E8EC' : '#1A1D24', color: blank ? '#111318' : '#9AA0AC', fontSize: 14, gap: 8 }}>
              <span style={{ fontSize: 16 }}>■</span>
              {blank ? 'Mostrar proyector' : 'Pantalla negra'}
            </button>
          </div>
        </div>

      ) : (

      /* ── Layout escritorio ── */
      <main style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexWrap: 'wrap', gap: 20, padding: '20px 24px', overflow: 'auto' }}>

        {/* Sección izquierda */}
        <section style={{ flex: '999 1 0px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Encabezado del himno */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={() => { const prev = hymns[hymnIndex - 1]; if (prev) goToHymn(prev.number) }} aria-label="Himno anterior" disabled={hymnIndex <= 0} style={{ ...btnBase, height: 44, width: 44, borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', opacity: hymnIndex <= 0 ? 0.35 : 1 }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 260px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#E3B260', fontVariantNumeric: 'tabular-nums' }}>{hymn?.number}</span>
                <span style={{ fontSize: 26, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hymn?.title}</span>
              </div>
              <span style={{ fontSize: 14, color: '#9AA0AC' }}>
                {[hymn?.musicNote, hymn?.author, hymn?.translator].filter(Boolean).join('  ·  ')}
              </span>
            </div>
            <button type="button" onClick={() => { const next = hymns[hymnIndex + 1]; if (next) goToHymn(next.number) }} aria-label="Himno siguiente" disabled={hymnIndex >= hymns.length - 1} style={{ ...btnBase, height: 44, width: 44, borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', opacity: hymnIndex >= hymns.length - 1 ? 0.35 : 1 }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          {/* Vista previa 16:9 */}
          <Stage
            slide={slide}
            slides={slides}
            currentIndex={safeIdx}
            hymn={hymn ? { number: hymn.number, title: hymn.title } : null}
            blank={false}
            scale={scale}
            settings={settings}
            onClick={nextSlide}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              maxHeight: 'calc(100vh - 250px)',
              borderRadius: 14,
              border: '1px solid #262A33',
            }}
          />

          {/* Controles de navegación */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={prevSlide} disabled={safeIdx === 0} style={{ ...btnBase, gap: 8, height: 48, padding: '0 20px', borderRadius: 10, border: '1px solid #333844', background: '#1A1D24', color: '#E7E8EC', fontSize: 16, opacity: safeIdx === 0 ? 0.45 : 1 }}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Anterior
            </button>
            <span style={{ fontSize: 15, color: '#9AA0AC', fontVariantNumeric: 'tabular-nums', minWidth: 90, textAlign: 'center' }}>
              {slides.length ? `${safeIdx + 1} de ${slides.length}` : '—'}
            </span>
            <button type="button" onClick={nextSlide} disabled={safeIdx >= slides.length - 1} style={{ ...btnBase, gap: 8, height: 48, padding: '0 20px', borderRadius: 10, border: 0, background: '#2B3140', color: '#FFFFFF', fontSize: 16, fontWeight: 700, opacity: safeIdx >= slides.length - 1 ? 0.45 : 1 }}>
              Siguiente
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {digitBuffer && (
              <span style={{ fontSize: 15, color: '#1A1408', background: '#E3B260', borderRadius: 8, padding: '6px 10px', fontWeight: 700 }}>
                Ir al {digitBuffer} ↵
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#9AA0AC', lineHeight: 1.5 }}>
              → o Espacio: siguiente · ←: anterior · escribe un número + Enter · B: negro · F: proyectar · Esc: salir
            </span>
          </div>

          {/* Ajustes */}
          <details style={{ borderRadius: 10, border: '1px solid #262A33', background: '#14171D' }}>
            <summary style={{ padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#9AA0AC', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pantalla</summary>
            <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#9AA0AC', marginBottom: 8 }}>Tema</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {THEME_OPTIONS.map(th => (
                    <button key={th} type="button" onClick={() => updateSetting('theme', th)} style={{ ...btnBase, height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #333844', background: settings.theme === th ? '#E3B260' : '#1A1D24', color: settings.theme === th ? '#0E1014' : '#E7E8EC', fontSize: 14, fontWeight: settings.theme === th ? 700 : 400 }}>{th}</button>
                  ))}
                </div>
              </div>
              {(['repeatChorus', 'showTitle', 'showLabel'] as const).map(key => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={settings[key] as boolean} onChange={e => updateSetting(key, e.target.checked)} style={{ width: 16, height: 16, accentColor: '#E3B260' }} />
                  {key === 'repeatChorus' ? 'Repetir coro' : key === 'showTitle' ? 'Mostrar título' : 'Mostrar etiqueta (Estrofa N / Coro)'}
                </label>
              ))}
            </div>
          </details>
        </section>

        {/* Columna derecha: Orden del himno */}
        <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9AA0AC' }}>Orden del himno</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slides.map((s, i) => {
              const active = i === safeIdx
              const preview = s.text.split('\n').slice(0, 2).join(' / ')
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIdx(i)}
                  aria-current={active ? 'true' : 'false'}
                  style={{
                    ...btnBase, flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                    width: '100%', textAlign: 'left', padding: '12px 14px',
                    borderRadius: 10, border: `1px solid ${active ? '#E3B260' : '#262A33'}`,
                    background: active ? '#262B36' : '#171A20', color: '#E7E8EC',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: active ? '#E3B260' : '#9AA0AC' }}>{s.label}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.35, color: '#C9CCD3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{preview}</span>
                </button>
              )
            })}
          </div>
        </aside>
      </main>
      )}
    </div>
  )
}
