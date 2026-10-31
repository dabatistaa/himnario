import type { Slide } from '../data/presentation'

export function LeccionSlideView({ slide, scale, light }: { slide: Slide; scale: number; light: boolean }) {
  const s = (px: number) => Math.round(px * scale)

  const ACCENT = light ? '#1A5C8A' : '#6EDCCF'
  const MAIN   = light ? '#1A1A2E' : '#FFFFFF'
  const DIM    = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)'

  const base: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${s(48)}px ${s(60)}px ${s(56)}px`,
  }
  const inner: React.CSSProperties = {
    maxWidth: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: s(16),
    fontWeight: 700,
    color: ACCENT,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: s(20),
  }
  const paginationStyle: React.CSSProperties = {
    fontSize: s(15),
    marginTop: s(24),
    color: DIM,
  }
  const clamp = (lines: number): React.CSSProperties => ({
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
  } as React.CSSProperties)

  if (slide.kind === 'lessonTitle') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={labelStyle}>Lección {slide.lessonNumber}</div>
          <div style={{ fontSize: s(58), fontWeight: 800, color: MAIN, lineHeight: 1.1, marginBottom: s(20), ...clamp(4) }}>
            {slide.title}
          </div>
          {slide.date && <div style={{ fontSize: s(20), color: DIM }}>{slide.date}</div>}
        </div>
      </div>
    )
  }

  if (slide.kind === 'introduction') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={labelStyle}>Introducción</div>
          <div style={{ fontSize: s(34), fontWeight: 500, color: MAIN, lineHeight: 1.55, ...clamp(10) }}>{slide.text}</div>
          {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
        </div>
      </div>
    )
  }

  if (slide.kind === 'question') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={{ fontSize: s(40), fontWeight: 800, color: ACCENT, lineHeight: 1, marginBottom: s(20) }}>{slide.number}</div>
          <div style={{ fontSize: s(42), fontWeight: 700, color: MAIN, lineHeight: 1.3, ...clamp(7) }}>{slide.text}</div>
        </div>
      </div>
    )
  }

  if (slide.kind === 'verse') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={{ ...labelStyle, marginBottom: s(20) }}>{slide.reference}</div>
          <div style={{ fontSize: s(36), fontWeight: 500, color: MAIN, lineHeight: 1.6, ...clamp(9) }}>{slide.text}</div>
          {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
        </div>
      </div>
    )
  }

  if (slide.kind === 'note') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={labelStyle}>Nota</div>
          <div style={{ fontSize: s(34), fontWeight: 500, color: MAIN, lineHeight: 1.6, fontStyle: 'italic', ...clamp(9) }}>{slide.text}</div>
          {slide.author && <div style={{ fontSize: s(18), marginTop: s(20), color: DIM }}>— {slide.author}</div>}
          {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
        </div>
      </div>
    )
  }

  if (slide.kind === 'additionalStudy') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={labelStyle}>Estudio adicional</div>
          <div style={{ fontSize: s(32), fontWeight: 500, color: MAIN, lineHeight: 1.6, ...clamp(11) }}>{slide.text}</div>
          {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
        </div>
      </div>
    )
  }

  return null
}
