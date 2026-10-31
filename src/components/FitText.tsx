import { useLayoutEffect, useRef } from 'react'

interface FitTextProps {
  children: string
  maxVmin?: number   // tamaño máximo relativo al contenedor (default 11)
  minVmin?: number   // tamaño mínimo (default 2.8)
  lineHeight?: number
  style?: React.CSSProperties
}

/**
 * Renderiza texto al tamaño máximo que quepa en su contenedor.
 * - Observa el PADRE (no el propio elemento) para evitar bucle infinito.
 * - Calcula vmin relativo al contenedor, no a window: funciona igual
 *   en proyector (pantalla completa) y en preview pequeño.
 */
export function FitText({ children, maxVmin = 11, minVmin = 2.8, lineHeight = 1.3, style }: FitTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const container = el?.parentElement
    if (!el || !container) return

    const fit = () => {
      const cmin = Math.min(container.clientWidth, container.clientHeight)
      if (cmin === 0) return
      const unit = cmin / 100  // 1 "vmin" relativo al contenedor
      let size = maxVmin
      el.style.fontSize = `${size * unit}px`
      el.style.lineHeight = String(lineHeight)

      while (
        (el.scrollHeight > container.clientHeight || el.scrollWidth > container.clientWidth)
        && size > minVmin
      ) {
        size -= 0.2
        el.style.fontSize = `${size * unit}px`
      }
    }

    fit()
    // Observar el PADRE: su tamaño cambia por window resize o layout,
    // nunca por cambios de fontSize del hijo → sin bucle.
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
