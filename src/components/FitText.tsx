import { useLayoutEffect, useRef } from 'react'

interface FitTextProps {
  children: string
  maxVmin?: number
  minVmin?: number
  lineHeight?: number
  style?: React.CSSProperties
}

export function FitText({ children, maxVmin = 11, minVmin = 2.8, lineHeight = 1.3, style }: FitTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const container = el?.parentElement
    if (!el || !container) return

    const fit = () => {
      const cw = container.clientWidth
      const ch = container.clientHeight
      const cmin = Math.min(cw, ch)
      if (cmin === 0) return

      const unit = cmin / 100

      // Parte del tamaño actual para evitar el flash de reset a máximo
      const currentPx = parseFloat(el.style.fontSize)
      let size = currentPx > 0 ? Math.min(currentPx / unit, maxVmin) : maxVmin

      el.style.fontSize = `${size * unit}px`
      el.style.lineHeight = String(lineHeight)

      // Reducir si desborda
      while ((el.scrollHeight > ch || el.scrollWidth > cw) && size > minVmin) {
        size -= 0.2
        el.style.fontSize = `${size * unit}px`
      }

      // Crecer si hay espacio (hasta maxVmin)
      while (el.scrollHeight <= ch && el.scrollWidth <= cw && size < maxVmin) {
        const next = Math.min(maxVmin, size + 0.2)
        el.style.fontSize = `${next * unit}px`
        if (el.scrollHeight > ch || el.scrollWidth > cw) {
          el.style.fontSize = `${size * unit}px`
          break
        }
        size = next
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [children, maxVmin, minVmin, lineHeight])

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        whiteSpace: 'pre-line',
        wordBreak: 'break-word',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
