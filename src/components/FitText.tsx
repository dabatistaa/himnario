import { useEffect, useRef } from 'react'

interface FitTextProps {
  children: string
  maxVmin?: number   // tamaño máximo en vmin (default 11)
  minVmin?: number   // tamaño mínimo en vmin (default 2.8)
  lineHeight?: number
  style?: React.CSSProperties
}

/**
 * Renderiza texto al tamaño máximo posible que quepa en su contenedor.
 * El contenedor DEBE tener height definido y overflow: hidden.
 */
export function FitText({ children, maxVmin = 11, minVmin = 2.8, lineHeight = 1.3, style }: FitTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fit = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight) / 100
      let size = maxVmin
      el.style.fontSize = `${size * vmin}px`
      el.style.lineHeight = String(lineHeight)

      while (el.scrollHeight > el.clientHeight && size > minVmin) {
        size -= 0.2
        el.style.fontSize = `${size * vmin}px`
      }
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
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
