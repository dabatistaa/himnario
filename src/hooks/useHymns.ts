import { useEffect, useState } from 'react'
import type { Hymn } from '../types'

const caches = new Map<string, Hymn[]>()
const promises = new Map<string, Promise<Hymn[]>>()

export function loadHymns(src: string, normalize: (raw: unknown) => Hymn[]): Promise<Hymn[]> {
  if (caches.has(src)) return Promise.resolve(caches.get(src)!)
  if (!promises.has(src)) {
    const p = fetch(src).then(r => r.json()).then((raw: unknown) => {
      const data = normalize(raw)
      caches.set(src, data)
      return data
    })
    promises.set(src, p)
  }
  return promises.get(src)!
}

export function useHymns(src: string, normalize: (raw: unknown) => Hymn[]) {
  const [hymns, setHymns] = useState<Hymn[]>(caches.get(src) ?? [])
  const [loading, setLoading] = useState(!caches.has(src))

  useEffect(() => {
    if (caches.has(src)) return
    loadHymns(src, normalize).then(data => {
      setHymns(data)
      setLoading(false)
    })
  // normalize is stable (module-level constant), src is the cache key
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  return { hymns, loading }
}
