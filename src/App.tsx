import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useHymns } from './hooks/useHymns'
import { OperatorPage } from './pages/Operator'
import { ProjectorPage } from './pages/Projector'
import { GuiaPage } from './pages/Guia'
import { LeccionOperatorPage } from './pages/LeccionOperator'
import { LeccionProjectorPage } from './pages/LeccionProjector'
import { BibliaOperatorPage } from './pages/BibliaOperator'
import type { Hymn, HymnSection } from './types'

function normalizeSmi(raw: unknown): Hymn[] {
  return raw as Hymn[]
}

interface JuvenilEstrofa { id: number; numero: number; texto: string; tiempo: number }
interface JuvenilHymn {
  numero: number; titulo: string; tono: string | null
  autores: { musica: string | null; letra: string | null } | null
  estrofas: JuvenilEstrofa[]
}

function normalizeJuvenil(raw: unknown): Hymn[] {
  const { himnos } = raw as { himnos: JuvenilHymn[] }
  return himnos.map(h => ({
    number: h.numero,
    title: h.titulo,
    musicNote: h.tono ?? '',
    author: h.autores?.letra ?? undefined,
    content: [...h.estrofas].sort((a, b) => a.id - b.id).map((e): HymnSection => ({
      type: e.numero === 0 ? 'chorus' : 'stanza',
      number: e.numero > 0 ? e.numero : undefined,
      text: e.texto,
    })),
  }))
}

export default function App() {
  const { hymns: hymnsSmi, loading: loadingSmi } = useHymns('/himnos_v2.json', normalizeSmi)
  const { hymns: hymnsJuvenil, loading: loadingJuvenil } = useHymns('/himnos-juvenil.json', normalizeJuvenil)

  if (loadingSmi || loadingJuvenil) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E1014', color: '#E3B260', fontFamily: 'Atkinson Hyperlegible, sans-serif' }}>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Himnario SMI</div>
          <div className="text-sm opacity-60">Cargando himnos…</div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OperatorPage hymnsSmi={hymnsSmi} hymnsJuvenil={hymnsJuvenil} />} />
        <Route path="/proyector" element={<ProjectorPage hymnsSmi={hymnsSmi} hymnsJuvenil={hymnsJuvenil} />} />
        <Route path="/guia" element={<GuiaPage />} />
        <Route path="/leccion" element={<LeccionOperatorPage />} />
        <Route path="/leccion-proyector" element={<LeccionProjectorPage />} />
        <Route path="/biblia" element={<BibliaOperatorPage />} />
      </Routes>
    </BrowserRouter>
  )
}
