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
    padding: `${s(72)}px 36px ${s(80)}px`,
  }
  const inner: React.CSSProperties = {
    maxWidth: 720,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: ACCENT,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 20,
  }
  const paginationStyle: React.CSSProperties = {
    fontSize: 13,
    marginTop: 24,
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
          <div style={{ fontSize: s(44), fontWeight: 700, color: MAIN, lineHeight: 1.15, marginBottom: 16, ...clamp(4) }}>
            {slide.title}
          </div>
          {slide.date && <div style={{ fontSize: s(16), color: DIM }}>{slide.date}</div>}
        </div>
      </div>
    )
  }

  if (slide.kind === 'introduction') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={labelStyle}>Introducción</div>
          <div style={{ fontSize: s(24), color: MAIN, lineHeight: 1.6, ...clamp(12) }}>{slide.text}</div>
          {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
        </div>
      </div>
    )
  }

  if (slide.kind === 'question') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={{ fontSize: s(32), fontWeight: 700, color: ACCENT, lineHeight: 1, marginBottom: 16 }}>{slide.number}</div>
          <div style={{ fontSize: s(30), fontWeight: 600, color: MAIN, lineHeight: 1.4, ...clamp(8) }}>{slide.text}</div>
        </div>
      </div>
    )
  }

  if (slide.kind === 'verse') {
    return (
      <div style={base}>
        <div style={inner}>
          <div style={{ ...labelStyle, marginBottom: 18 }}>{slide.reference}</div>
          <div style={{ fontSize: s(26), color: MAIN, lineHeight: 1.65, ...clamp(11) }}>{slide.text}</div>
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
          <div style={{ fontSize: s(24), color: MAIN, lineHeight: 1.65, fontStyle: 'italic', ...clamp(10) }}>{slide.text}</div>
          {slide.author && <div style={{ fontSize: s(15), marginTop: 20, color: DIM }}>— {slide.author}</div>}
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
          <div style={{ fontSize: s(22), color: MAIN, lineHeight: 1.65, ...clamp(13) }}>{slide.text}</div>
          {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
        </div>
      </div>
    )
  }

  return null
}
