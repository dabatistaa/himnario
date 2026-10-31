import { useState } from 'react'
import { getSala } from '../lib/relay'

const RELAY = 'https://himnario-relay.dabatistaa.workers.dev'
const APP = 'https://himnario.impartela.org'
const SALA = getSala() ?? 'TU-SALA'

function CopyBtn({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  const copy = () => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 2000) })
  return (
    <button type="button" onClick={copy} style={{
      flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 8,
      border: '1px solid #333844', background: done ? '#2A3D2A' : '#1A1D24',
      color: done ? '#5BD18B' : '#9AA0AC', fontFamily: 'inherit',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}>
      {done ? '✓ Copiado' : label}
    </button>
  )
}

function Code({ value, label }: { value: string; label?: string }) {
  return (
    <div>
      {label && <div style={{ fontSize: 12, color: '#9AA0AC', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0E1014', border: '1px solid #262A33', borderRadius: 8, padding: '10px 14px' }}>
        <code style={{ flex: 1, fontSize: 13, color: '#E3B260', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.6 }}>{value}</code>
        <CopyBtn text={value} />
      </div>
    </div>
  )
}

function StreamDeckBtn({ label, action, n }: { label: string; action: string; n?: number }) {
  const url = `${RELAY}/cmd/${action}?sala=${SALA}${n != null ? `&n=${n}` : ''}`
  const curl = `/usr/bin/curl -s "${url}"`
  const [done, setDone] = useState(false)
  const copy = () => navigator.clipboard.writeText(curl).then(() => { setDone(true); setTimeout(() => setDone(false), 2000) })
  return (
    <div style={{ background: '#0E1014', border: '1px solid #262A33', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{label}</span>
        <button type="button" onClick={copy} style={{
          height: 36, padding: '0 16px', borderRadius: 8, border: 0,
          background: done ? '#2A3D2A' : '#E3B260',
          color: done ? '#5BD18B' : '#1A1408',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          {done ? '✓ Copiado' : 'Copiar comando'}
        </button>
      </div>
      <code style={{ fontSize: 12, color: '#6B7180', fontFamily: 'monospace', lineHeight: 1.5, wordBreak: 'break-all' }}>{curl}</code>
    </div>
  )
}

const TABS = [
  { id: 'basico', label: '1. Uso básico' },
  { id: 'obs', label: '2. OBS Studio' },
  { id: 'streamdeck', label: '3. Stream Deck' },
]

export function GuiaPage() {
  const [tab, setTab] = useState('basico')

  return (
    <div style={{ minHeight: '100vh', background: '#0E1014', color: '#E7E8EC', fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#14171D', borderBottom: '1px solid #262A33', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href={`/?sala=${SALA}`} style={{ color: '#9AA0AC', fontSize: 13, textDecoration: 'none' }}>← Volver</a>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Guía de configuración</div>
          <div style={{ fontSize: 13, color: '#9AA0AC' }}>
            Sala: <code style={{ color: '#E3B260' }}>{SALA}</code>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#14171D', borderBottom: '1px solid #262A33', padding: '0 24px', gap: 4 }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} style={{
            height: 44, padding: '0 18px', border: 'none', background: 'transparent',
            borderBottom: tab === t.id ? '2px solid #E3B260' : '2px solid transparent',
            color: tab === t.id ? '#E3B260' : '#9AA0AC',
            fontFamily: 'inherit', fontSize: 14, fontWeight: tab === t.id ? 700 : 400,
            cursor: 'pointer', marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Uso básico ── */}
        {tab === 'basico' && <>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Uso básico del operador</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StepCard n={1} title="Abre el panel de control">
              <p style={{ margin: '0 0 10px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>Este es el panel desde donde controlas todo. Comparte esta URL con tu equipo de multimedia.</p>
              <Code value={`${APP}/?sala=${SALA}`} />
            </StepCard>

            <StepCard n={2} title="Busca un himno">
              <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                Escribe el <strong style={{ color: '#E7E8EC' }}>número</strong> o palabras del título/letra en el buscador. Presiona <Kbd>Enter</Kbd> para seleccionar.
              </p>
            </StepCard>

            <StepCard n={3} title="Navega por las estrofas">
              <p style={{ margin: '0 0 10px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                Usa los botones <strong style={{ color: '#E7E8EC' }}>Anterior / Siguiente</strong> o haz clic en cualquier estrofa de la lista. También puedes usar el teclado:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[['→ / Espacio', 'Siguiente'], ['←', 'Anterior'], ['Número + Enter', 'Ir al himno N'], ['B', 'Pantalla negra']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#14171D', border: '1px solid #262A33', borderRadius: 8, padding: '8px 12px' }}>
                    <Kbd>{k}</Kbd>
                    <span style={{ fontSize: 13, color: '#9AA0AC' }}>{v}</span>
                  </div>
                ))}
              </div>
            </StepCard>

            <StepCard n={4} title="Cambia de himnario">
              <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                Usa las pestañas <strong style={{ color: '#E7E8EC' }}>Himnario SMI</strong> / <strong style={{ color: '#E7E8EC' }}>Himnario Juvenil SMI</strong> para cambiar entre himnarios.
              </p>
            </StepCard>
          </div>

          <NavBtn next="obs" label="Siguiente: Configurar OBS →" onClick={setTab} />
        </>}

        {/* ── OBS ── */}
        {tab === 'obs' && <>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Configurar en OBS Studio</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StepCard n={1} title="Agrega el panel operador como dock">
              <p style={{ margin: '0 0 10px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                En OBS: <strong style={{ color: '#E7E8EC' }}>Ver → Paneles → Paneles de navegador personalizados</strong>
              </p>
              <Code value={`${APP}/?sala=${SALA}`} label="Dock Name: Himnario  ·  URL:" />
              <p style={{ margin: '10px 0 0', color: '#9AA0AC', fontSize: 13 }}>El operador aparece como panel dentro de OBS — buscas y cambias himnos sin salir.</p>
            </StepCard>

            <StepCard n={2} title="Agrega el proyector como Fuente de navegador">
              <p style={{ margin: '0 0 10px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                En tu escena: <strong style={{ color: '#E7E8EC' }}>+ → Fuente de navegador</strong>
              </p>
              <Code value={`${APP}/proyector?sala=${SALA}`} label="URL del proyector (pegar en Fuente de navegador):" />
              <div style={{ marginTop: 10, background: '#14171D', border: '1px solid #262A33', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Setting label="Width" value="1920" />
                <Setting label="Height" value="1080" />
                <Setting label="Shutdown source when not visible" value="✓ Activar" />
              </div>
            </StepCard>

            <StepCard n={3} title="¡Listo!">
              <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                Lo que controlas en el dock aparece al instante en la Fuente de navegador. Puedes controlar también desde el <strong style={{ color: '#E7E8EC' }}>celular</strong> abriendo la URL del operador.
              </p>
            </StepCard>
          </div>

          <NavBtn next="streamdeck" label="Siguiente: Configurar Stream Deck →" onClick={setTab} />
        </>}

        {/* ── Stream Deck ── */}
        {tab === 'streamdeck' && <>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Configurar Stream Deck</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StepCard n={1} title='Instala el plugin "Super Macro"'>
              <p style={{ margin: '0 0 12px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                Elige una de estas dos opciones:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ background: '#0E1014', border: '1px solid #262A33', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#E7E8EC' }}>Opción A — Desde el Discord de BarRaider (sin cuenta de Elgato)</div>
                  <ol style={{ margin: 0, paddingLeft: 18, color: '#9AA0AC', fontSize: 14, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <li>Entra al Discord: <a href="http://discord.barraider.com" target="_blank" rel="noopener noreferrer" style={{ color: '#E3B260', fontSize: 13 }}>discord.barraider.com</a></li>
                    <li>Busca el canal de SuperMacro y descarga el archivo <code style={{ color: '#E3B260', fontSize: 13 }}>.streamDeckPlugin</code></li>
                    <li>Haz doble clic en el archivo — Stream Deck lo instala automáticamente</li>
                  </ol>
                </div>
                <div style={{ background: '#0E1014', border: '1px solid #262A33', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#E7E8EC' }}>Opción B — Desde la tienda de Elgato</div>
                  <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                    Stream Deck app → ícono de tienda → busca <strong style={{ color: '#E7E8EC' }}>Super Macro</strong> de BarRaider → Instalar. (Requiere cuenta de Elgato)
                  </p>
                </div>
              </div>
            </StepCard>

            <StepCard n={2} title="Para cada botón: selecciona Super Macro → Run System Command">
              <p style={{ margin: '0 0 12px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                Copia el comando del botón que quieras y pégalo en el campo <strong style={{ color: '#E7E8EC' }}>"Command"</strong> de Super Macro:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <StreamDeckBtn label="▶  Siguiente estrofa" action="next" />
                <StreamDeckBtn label="◀  Estrofa anterior" action="prev" />
                <StreamDeckBtn label="⏮  Primera estrofa" action="first" />
                <StreamDeckBtn label="⬛  Pantalla negra (toggle)" action="blank" />
              </div>
            </StepCard>

            <StepCard n={3} title="Ir directo a un himno (opcional)">
              <p style={{ margin: '0 0 10px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
                Cambia el número al final del comando para saltar a un himno específico:
              </p>
              <StreamDeckBtn label="🎵  Ir al himno 1 (cambia el número)" action="goto" n={1} />
            </StepCard>
          </div>

          <div style={{ background: '#141C14', border: '1px solid #2A3D2A', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
            <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              Los comandos ya tienen tu sala <code style={{ color: '#E3B260' }}>{SALA}</code> incluida. Solo copia y pega — sin modificar nada.
            </p>
          </div>
        </>}

      </div>
    </div>
  )
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#14171D', border: '1px solid #262A33', borderRadius: 12, padding: '20px 22px', display: 'flex', gap: 16 }}>
      <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: '#E3B260', color: '#1A1408', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{n}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15, paddingTop: 4 }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd style={{ background: '#1A1D24', border: '1px solid #333844', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontFamily: 'monospace', color: '#E3B260' }}>{children}</kbd>
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#9AA0AC' }}>{label}</span>
      <span style={{ color: '#E7E8EC', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function NavBtn({ next, label, onClick }: { next: string; label: string; onClick: (t: string) => void }) {
  return (
    <button type="button" onClick={() => onClick(next)} style={{
      alignSelf: 'flex-end', height: 44, padding: '0 20px', borderRadius: 10, border: 0,
      background: '#E3B260', color: '#1A1408', fontFamily: 'inherit', fontSize: 15,
      fontWeight: 700, cursor: 'pointer',
    }}>{label}</button>
  )
}
