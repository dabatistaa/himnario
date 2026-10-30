import { useState } from 'react'

const SALA = 'smi'
const RELAY = 'https://himnario-relay.dabatistaa.workers.dev'
const APP = 'https://himnario.impartela.org'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={copy}
      style={{
        flexShrink: 0,
        height: 32,
        padding: '0 12px',
        borderRadius: 8,
        border: '1px solid #333844',
        background: copied ? '#2A3D2A' : '#1A1D24',
        color: copied ? '#5BD18B' : '#9AA0AC',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}

function CodeBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      {label && <div style={{ fontSize: 12, color: '#9AA0AC', marginBottom: 4 }}>{label}</div>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#0E1014', border: '1px solid #262A33',
        borderRadius: 8, padding: '10px 14px',
      }}>
        <code style={{ flex: 1, fontSize: 13, color: '#E3B260', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {value}
        </code>
        <CopyButton text={value} />
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
        background: '#E3B260', color: '#1A1408',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 15,
      }}>{n}</div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#14171D', border: '1px solid #262A33',
      borderRadius: 16, padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span> {title}
      </h2>
      {children}
    </section>
  )
}

export function GuiaPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0E1014',
      color: '#E7E8EC',
      fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
      padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Encabezado */}
        <div>
          <a href="/" style={{ color: '#E3B260', fontSize: 14, textDecoration: 'none' }}>← Volver al operador</a>
          <h1 style={{ margin: '16px 0 8px', fontSize: 32, fontWeight: 700 }}>Guía de uso</h1>
          <p style={{ margin: 0, color: '#9AA0AC', fontSize: 16, lineHeight: 1.6 }}>
            Cómo usar el Himnario SMI con OBS Studio y Stream Deck.
            Tu código de sala es <code style={{ color: '#E3B260', background: '#1A1D24', padding: '2px 8px', borderRadius: 6 }}>{SALA}</code>.
          </p>
        </div>

        {/* Uso básico */}
        <Section title="Uso básico" icon="🎵">
          <Step n={1} title="Abre el panel de control (operador)">
            <p style={{ margin: '0 0 8px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              Abre esta URL en tu navegador o en el dock de OBS. Desde aquí buscas himnos y controlas las diapositivas.
            </p>
            <CodeBlock value={`${APP}/?sala=${SALA}`} />
          </Step>
          <Step n={2} title="Busca y navega">
            <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              Escribe el número o palabras del himno en el buscador. Una vez seleccionado, usa los botones <strong style={{ color: '#E7E8EC' }}>Anterior / Siguiente</strong> para cambiar de estrofa, o haz clic en cualquier estrofa de la lista lateral.
            </p>
          </Step>
        </Section>

        {/* OBS */}
        <Section title="Configurar en OBS Studio" icon="🎬">
          <Step n={1} title="Agrega el panel operador como dock">
            <p style={{ margin: '0 0 8px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              En OBS ve a <strong style={{ color: '#E7E8EC' }}>View → Docks → Custom Browser Docks</strong> y agrega:
            </p>
            <CodeBlock value={`${APP}/?sala=${SALA}`} label="Dock Name: Himnario · URL:" />
            <p style={{ margin: '10px 0 0', color: '#9AA0AC', fontSize: 13 }}>
              El operador aparece como un panel dentro de OBS — puedes buscar y cambiar himnos sin salir.
            </p>
          </Step>
          <Step n={2} title="Agrega el proyector como Browser Source">
            <p style={{ margin: '0 0 8px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              En tu escena de OBS, agrega una fuente <strong style={{ color: '#E7E8EC' }}>Browser Source</strong> con:
            </p>
            <CodeBlock value={`${APP}/proyector?sala=${SALA}`} label="URL:" />
            <p style={{ margin: '10px 0 0', color: '#9AA0AC', fontSize: 13 }}>
              Resolución recomendada: <strong style={{ color: '#E7E8EC' }}>1920 × 1080</strong>. Activa <strong style={{ color: '#E7E8EC' }}>"Shutdown source when not visible"</strong> para ahorrar recursos.
            </p>
          </Step>
          <Step n={3} title="Listo — ambos se sincronizan solos">
            <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              Lo que controlas en el dock aparece instantáneamente en el Browser Source. También puedes controlar desde el celular abriendo la URL del operador.
            </p>
          </Step>
        </Section>

        {/* Stream Deck */}
        <Section title="Configurar Stream Deck" icon="🎛️">
          <Step n={1} title='Instala el plugin "Super Macro"'>
            <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              Abre la app de Stream Deck → ícono de tienda → busca <strong style={{ color: '#E7E8EC' }}>Super Macro</strong> de BarRaider → instalar.
            </p>
          </Step>
          <Step n={2} title="Crea un botón por acción">
            <p style={{ margin: '0 0 12px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              Para cada botón: acción <strong style={{ color: '#E7E8EC' }}>Super Macro → Run System Command</strong>. Copia el comando correspondiente:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CodeBlock
                label="▶ Siguiente estrofa"
                value={`/usr/bin/curl -s "${RELAY}/cmd/next?sala=${SALA}"`}
              />
              <CodeBlock
                label="◀ Estrofa anterior"
                value={`/usr/bin/curl -s "${RELAY}/cmd/prev?sala=${SALA}"`}
              />
              <CodeBlock
                label="⏮ Primera estrofa"
                value={`/usr/bin/curl -s "${RELAY}/cmd/first?sala=${SALA}"`}
              />
              <CodeBlock
                label="⬛ Pantalla negra (toggle)"
                value={`/usr/bin/curl -s "${RELAY}/cmd/blank?sala=${SALA}"`}
              />
            </div>
          </Step>
          <Step n={3} title="Ir a un himno específico (opcional)">
            <p style={{ margin: '0 0 8px', color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
              Cambia el número al final para saltar directamente a un himno:
            </p>
            <CodeBlock
              label="Ejemplo: ir al himno 42"
              value={`/usr/bin/curl -s "${RELAY}/cmd/goto?sala=${SALA}&n=42"`}
            />
          </Step>
        </Section>

        {/* Nota final */}
        <div style={{
          background: '#141C14', border: '1px solid #2A3D2A',
          borderRadius: 12, padding: '16px 20px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, color: '#9AA0AC', fontSize: 14, lineHeight: 1.6 }}>
            Varias personas pueden controlar el mismo proyector a la vez usando la misma sala <code style={{ color: '#E3B260' }}>{SALA}</code> — ideal para tener un operador principal y un respaldo.
          </p>
        </div>

      </div>
    </div>
  )
}
