import type { Slide } from '../data/presentation'
import { FitText } from './FitText'

export function LeccionSlideView({ slide, scale, light }: { slide: Slide; scale: number; light: boolean }) {
  const s = (px: number) => Math.round(px * scale)

  const ACCENT = light ? '#1A5C8A' : '#6EDCCF'
  const MAIN   = light ? '#1A1A2E' : '#FFFFFF'
  const DIM    = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)'

  const wrap: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    padding: `3vmin 5vmin`,
    overflow: 'hidden',
  }
  const labelStyle: React.CSSProperties = {
    flexShrink: 0,
    fontSize: `${1.4 * scale}vmin`,
    fontWeight: 700,
    color: ACCENT,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    textAlign: 'center',
    marginBottom: '2vmin',
  }
  const paginationStyle: React.CSSProperties = {
    flexShrink: 0,
    fontSize: `${1.2 * scale}vmin`,
    marginTop: '1.5vmin',
    color: DIM,
    textAlign: 'center',
  }
  const textArea: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  if (slide.kind === 'lessonTitle') {
    return (
      <div style={wrap}>
        <div style={labelStyle}>Lección {slide.lessonNumber}</div>
        <div style={textArea}>
          <FitText maxVmin={10 * scale} minVmin={2.5} lineHeight={1.1}
            style={{ fontWeight: 800, color: MAIN, textAlign: 'center' }}>
            {slide.title ?? ''}
          </FitText>
        </div>
        {slide.date && (
          <div style={{ flexShrink: 0, textAlign: 'center', fontSize: `${1.4 * scale}vmin`, color: DIM, marginTop: '1.5vmin' }}>
            {slide.date}
          </div>
        )}
      </div>
    )
  }

  if (slide.kind === 'introduction') {
    return (
      <div style={wrap}>
        <div style={labelStyle}>Introducción</div>
        <div style={textArea}>
          <FitText maxVmin={8 * scale} minVmin={2.5} lineHeight={1.55}
            style={{ fontWeight: 400, color: MAIN, textAlign: 'center' }}>
            {slide.text ?? ''}
          </FitText>
        </div>
        {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
      </div>
    )
  }

  if (slide.kind === 'question') {
    return (
      <div style={wrap}>
        <div style={{ ...labelStyle, fontSize: `${2.2 * scale}vmin`, fontWeight: 800, color: ACCENT }}>
          {slide.number}
        </div>
        <div style={textArea}>
          <FitText maxVmin={9 * scale} minVmin={2.5} lineHeight={1.3}
            style={{ fontWeight: 700, color: MAIN, textAlign: 'center' }}>
            {slide.text ?? ''}
          </FitText>
        </div>
      </div>
    )
  }

  if (slide.kind === 'verse') {
    return (
      <div style={wrap}>
        <div style={labelStyle}>{slide.reference}</div>
        <div style={textArea}>
          <FitText maxVmin={8.5 * scale} minVmin={2.5} lineHeight={1.6}
            style={{ fontWeight: 400, color: MAIN, textAlign: 'center' }}>
            {slide.text ?? ''}
          </FitText>
        </div>
        {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
      </div>
    )
  }

  if (slide.kind === 'note') {
    return (
      <div style={wrap}>
        <div style={labelStyle}>Nota</div>
        <div style={textArea}>
          <FitText maxVmin={8 * scale} minVmin={2.5} lineHeight={1.6}
            style={{ fontWeight: 400, fontStyle: 'italic', color: MAIN, textAlign: 'center' }}>
            {slide.text ?? ''}
          </FitText>
        </div>
        {slide.author && (
          <div style={{ flexShrink: 0, textAlign: 'center', fontSize: `${1.3 * scale}vmin`, color: DIM, marginTop: '1.5vmin' }}>
            — {slide.author}
          </div>
        )}
        {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
      </div>
    )
  }

  if (slide.kind === 'additionalStudy') {
    return (
      <div style={wrap}>
        <div style={labelStyle}>Estudio adicional</div>
        <div style={textArea}>
          <FitText maxVmin={8 * scale} minVmin={2.5} lineHeight={1.6}
            style={{ fontWeight: 400, color: MAIN, textAlign: 'center' }}>
            {slide.text ?? ''}
          </FitText>
        </div>
        {slide.total && slide.total > 1 && <div style={paginationStyle}>{slide.page} / {slide.total}</div>}
      </div>
    )
  }

  return null
}
