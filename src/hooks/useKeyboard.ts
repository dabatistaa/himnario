import { useEffect } from 'react'

interface KeyboardActions {
  onNext?: () => void
  onPrev?: () => void
  onFirst?: () => void
  onBlack?: () => void
  onFullscreen?: () => void
  onEsc?: () => void
  onDigit?: (digit: string) => void
}

export function useKeyboard(actions: KeyboardActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault()
          actions.onNext?.()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          actions.onPrev?.()
          break
        case 'Home':
          e.preventDefault()
          actions.onFirst?.()
          break
        case 'b':
        case 'B':
        case '.':
          actions.onBlack?.()
          break
        case 'f':
        case 'F':
          actions.onFullscreen?.()
          break
        case 'Escape':
          actions.onEsc?.()
          break
        default:
          if (e.key >= '0' && e.key <= '9' && actions.onDigit) {
            actions.onDigit(e.key)
          }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [actions])
}
