export interface Env {
  ROOMS: DurableObjectNamespace
}

export class HimnarioRoom {
  private sessions: Set<WebSocket> = new Set()
  private lastState: string | null = null

  constructor(private readonly ctx: DurableObjectState, private readonly env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') return cors(null, 204)

    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair()
      this.accept(server)
      return new Response(null, { status: 101, webSocket: client })
    }

    const m = url.pathname.match(/^\/cmd\/(\w+)$/)
    if (m) {
      const action = m[1]
      const num = url.searchParams.get('n')
      this.broadcast(JSON.stringify({ type: 'cmd', action, ...(num != null ? { num: Number(num) } : {}) }))
      return cors('ok')
    }

    return cors(`Himnario Relay — sala: ${url.searchParams.get('sala') ?? 'default'}`)
  }

  private accept(ws: WebSocket) {
    ws.accept()
    this.sessions.add(ws)
    if (this.lastState) { try { ws.send(this.lastState) } catch (_) {} }
    ws.addEventListener('message', ({ data }) => {
      if (typeof data !== 'string') return
      try { if (JSON.parse(data).type === 'state') this.lastState = data } catch (_) {}
      this.broadcast(data, ws)
    })
    const drop = () => this.sessions.delete(ws)
    ws.addEventListener('close', drop)
    ws.addEventListener('error', drop)
  }

  private broadcast(msg: string, exclude?: WebSocket) {
    for (const ws of this.sessions) {
      if (ws === exclude) continue
      try { ws.send(msg) } catch (_) { this.sessions.delete(ws) }
    }
  }
}

function cors(body: BodyInit | null, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const sala = new URL(request.url).searchParams.get('sala') ?? 'default'
    return env.ROOMS.get(env.ROOMS.idFromName(sala)).fetch(request)
  },
}
