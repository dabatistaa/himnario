import type { Settings, Slide } from '../types'

const THEMES = {
  'Negro': { bg: '#000000', fg: '#F6F3EC', muted: '#8E8A82', accent: '#E3B260', dotOff: '#3A3833' },
  'Azul noche': { bg: '#0D1A2F', fg: '#FFFFFF', muted: '#93A4BF', accent: '#8EC3FF', dotOff: '#2A3B57' },
  'Claro': { bg: '#FAF8F3', fg: '#16171B', muted: '#6A655C', accent: '#9A5B13', dotOff: '#D9D3C7' },
}

interface StageProps {
  slide: Slide | null
  slides: Slide[]
  currentIndex: number
  hymn: { number: number; title: string } | null
  blank: boolean
  scale: number
  settings: Settings
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function Stage({ slide, slides, currentIndex, hymn, blank, scale, settings, className = '', style, onClick }: StageProps) {
  const t = THEMES[settings.theme] ?? THEMES['Negro']

  let fontSize = '6cqh'
  if (slide) {
    const byH = Math.min(9.5, 66 / (slide.lines * 1.28))
    const byW = 86 / (slide.longest * 0.5)
    fontSize = `min(${(byH * scale).toFixed(2)}cqh, ${(byW * scale).toFixed(2)}cqw)`
  }

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        background: blank ? '#000000' : t.bg,
        color: t.fg,
        containerType: 'size',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onClick={onClick}
    >
      {!blank && slide && (
        <>
          {settings.showTitle && hymn && (
            <div style={{
              position: 'absolute',
              top: '4.5cqh',
              left: '5cqw',
              right: '5cqw',
              textAlign: 'center',
              fontSize: '3.4cqh',
              letterSpacing: '0.02em',
              color: t.muted,
            }}>
              {hymn.number} · {hymn.title}
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3cqh',
            padding: '0 6cqw',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}>
            {settings.showLabel && (
              <div style={{
                fontSize: '3.2cqh',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: t.accent,
              }}>
                {slide.label}
              </div>
            )}
            <div style={{
              whiteSpace: 'pre-line',
              textAlign: 'center',
              lineHeight: 1.28,
              fontWeight: 700,
              fontSize,
              fontStyle: slide.type === 'chorus' ? 'italic' : 'normal',
              overflowWrap: 'break-word',
              maxWidth: '100%',
            }}>
              {slide.text}
            </div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: '4.5cqh',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '1.2cqh',
          }}>
            {slides.map((_, i) => (
              <span
                key={i}
                style={{
                  width: '1.3cqh',
                  height: '1.3cqh',
                  borderRadius: '50%',
                  display: 'inline-block',
                  background: i === currentIndex ? t.accent : t.dotOff,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
