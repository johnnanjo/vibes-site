/* Cloudflare Worker: static site (assets) + realtime relay for the scoreboard remote.
   /api/count/<6-digit room>?role=display|remote  →  WebSocket, relayed inside a Durable Object per room. */
import { DurableObject } from 'cloudflare:workers';

export class CountRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const role = new URL(req.url).searchParams.get('role') === 'display' ? 'display' : 'remote';
    if (this.ctx.getWebSockets().length >= 12) return new Response('room full', { status: 429 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1], [role]);
    if (role === 'remote') {
      const last = await this.ctx.storage.get('state');
      if (last) pair[1].send(last);
      for (const d of this.ctx.getWebSockets('display')) { try { d.send('{"type":"hello"}'); } catch {} }
    }
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 16000) return;
    const from = this.ctx.getTags(ws)[0];
    if (from === 'display') {
      if (msg.startsWith('{"type":"state"')) await this.ctx.storage.put('state', msg);
      for (const o of this.ctx.getWebSockets('remote')) { try { o.send(msg); } catch {} }
    } else {
      for (const o of this.ctx.getWebSockets('display')) { try { o.send(msg); } catch {} }
    }
  }
  webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code, 'closed'); } catch {} }
  webSocketError(ws) { try { ws.close(1011, 'error'); } catch {} }
}

export default {
  async fetch(req, env) {
    const m = new URL(req.url).pathname.match(/^\/api\/count\/(\d{6})$/);
    if (m) return env.COUNT_ROOM.get(env.COUNT_ROOM.idFromName(m[1])).fetch(req);
    return env.ASSETS.fetch(req);
  },
};
