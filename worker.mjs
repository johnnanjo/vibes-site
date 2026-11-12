/* Cloudflare Worker: static site (assets) + realtime relay for the scoreboard remote
   + VIBES BILLIARDS DIGITAL LABO (vibesdigilabo.com): shop accounts, login, gated scoreboard pages.
   /api/count/<6-digit room>?role=display|remote  →  WebSocket, relayed inside a Durable Object per room.
   /api/labo/*                                     →  accounts and sessions (Durable Object with SQLite). */
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

/* ---------- DIGITAL LABO accounts ---------- */
const DAY = 86400000, SESSION_DAYS = 30;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
async function pwHash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 }, key, 256));
}
function same(a, b) { a = String(a); b = String(b); let d = a.length ^ b.length; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ (b.charCodeAt(i % (b.length || 1)) || 0); return d === 0; }
function newPassword() { const A = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(12)); let s = ''; for (const x of r) s += A[x % A.length]; return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8); }
const ID_RE = /^[a-z0-9][a-z0-9-]{2,31}$/;

export class LaboAccounts extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, shop TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', expires INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, last_login INTEGER NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, lock_until INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions (th TEXT PRIMARY KEY, id TEXT NOT NULL, exp INTEGER NOT NULL);`);
  }
  row(id) { return this.sql.exec('SELECT * FROM accounts WHERE id = ?', id).toArray()[0] || null; }
  usable(a, now) { if (!a) return 'none'; if (a.status !== 'active') return 'stopped'; if (a.expires && now > a.expires) return 'expired'; return ''; }
  async login(id, pw) {
    const now = Date.now(); id = String(id || '').trim().toLowerCase(); pw = String(pw || '');
    const a = this.row(id);
    if (!a) { await pwHash(pw, 'x'); return { ok: false, error: 'IDかパスワードが違います。' }; }
    if (a.lock_until > now) return { ok: false, error: '何度も間違えたため、15分間ログインできません。' };
    if (!same(await pwHash(pw, a.salt), a.hash)) {
      const fails = a.fails + 1; this.sql.exec('UPDATE accounts SET fails = ?, lock_until = ? WHERE id = ?', fails >= 8 ? 0 : fails, fails >= 8 ? now + 15 * 60000 : 0, id);
      return { ok: false, error: 'IDかパスワードが違います。' };
    }
    const why = this.usable(a, now);
    if (why === 'stopped') return { ok: false, error: 'このアカウントは停止中です。運営にお問い合わせください。' };
    if (why === 'expired') return { ok: false, error: '利用期間が終了しました。運営にお問い合わせください。' };
    const token = randHex(32);
    this.sql.exec('DELETE FROM sessions WHERE exp < ?', now);
    this.sql.exec('INSERT INTO sessions (th, id, exp) VALUES (?, ?, ?)', await sha256(token), id, now + SESSION_DAYS * DAY);
    this.sql.exec('UPDATE accounts SET fails = 0, lock_until = 0, last_login = ? WHERE id = ?', now, id);
    return { ok: true, token, id, shop: a.shop, expires: a.expires };
  }
  async session(token) {
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return { ok: false };
    const now = Date.now(), s = this.sql.exec('SELECT * FROM sessions WHERE th = ?', await sha256(token)).toArray()[0];
    if (!s || s.exp < now) return { ok: false };
    const a = this.row(s.id), why = this.usable(a, now);
    if (why) return { ok: false, why };
    return { ok: true, id: a.id, shop: a.shop, expires: a.expires };
  }
  async logout(token) { if (token) this.sql.exec('DELETE FROM sessions WHERE th = ?', await sha256(token)); return { ok: true }; }
  async password(token, oldPw, newPw) {
    const s = await this.session(token); if (!s.ok) return { ok: false, error: 'ログインし直してください。' };
    newPw = String(newPw || ''); if (newPw.length < 8 || newPw.length > 72) return { ok: false, error: '新しいパスワードは8文字以上にしてください。' };
    const a = this.row(s.id); if (!same(await pwHash(String(oldPw || ''), a.salt), a.hash)) return { ok: false, error: '今のパスワードが違います。' };
    const salt = randHex(16); this.sql.exec('UPDATE accounts SET salt = ?, hash = ? WHERE id = ?', salt, await pwHash(newPw, salt), a.id);
    this.sql.exec('DELETE FROM sessions WHERE id = ? AND th != ?', a.id, await sha256(token));
    return { ok: true };
  }
  async admin(op, d) {
    const now = Date.now(); d = d || {};
    const pub = (a) => ({ id: a.id, shop: a.shop, status: a.status, expires: a.expires, note: a.note, created: a.created, last_login: a.last_login });
    if (op === 'list') return { ok: true, now, accounts: this.sql.exec('SELECT * FROM accounts ORDER BY created DESC').toArray().map(pub) };
    const id = String(d.id || '').trim().toLowerCase();
    if (op === 'create') {
      if (!ID_RE.test(id)) return { ok: false, error: 'IDは半角の英小文字・数字・ハイフンで、3〜32文字にしてください。' };
      const shop = String(d.shop || '').trim().slice(0, 40); if (!shop) return { ok: false, error: '店名を入れてください。' };
      if (this.row(id)) return { ok: false, error: 'このIDは、すでに使われています。' };
      const days = Math.max(0, Math.min(3650, parseInt(d.days, 10) || 0)), pw = newPassword(), salt = randHex(16);
      this.sql.exec('INSERT INTO accounts (id, shop, salt, hash, expires, note, created) VALUES (?, ?, ?, ?, ?, ?, ?)', id, shop, salt, await pwHash(pw, salt), days ? now + days * DAY : 0, String(d.note || '').slice(0, 200), now);
      return { ok: true, account: pub(this.row(id)), password: pw };
    }
    const a = this.row(id); if (!a) return { ok: false, error: 'アカウントが見つかりません。' };
    if (op === 'update') {
      if (typeof d.shop === 'string' && d.shop.trim()) this.sql.exec('UPDATE accounts SET shop = ? WHERE id = ?', d.shop.trim().slice(0, 40), id);
      if (typeof d.note === 'string') this.sql.exec('UPDATE accounts SET note = ? WHERE id = ?', d.note.slice(0, 200), id);
      if (d.status === 'active' || d.status === 'stopped') { this.sql.exec('UPDATE accounts SET status = ? WHERE id = ?', d.status, id); if (d.status === 'stopped') this.sql.exec('DELETE FROM sessions WHERE id = ?', id); }
      if (d.expires === 0 || (Number.isFinite(d.expires) && d.expires > 0)) this.sql.exec('UPDATE accounts SET expires = ? WHERE id = ?', Math.floor(d.expires), id);
      if (Number.isFinite(d.addDays) && d.addDays) { const base = Math.max(a.expires || now, now); this.sql.exec('UPDATE accounts SET expires = ? WHERE id = ?', base + Math.floor(d.addDays) * DAY, id); }
      return { ok: true, account: pub(this.row(id)) };
    }
    if (op === 'reset') { const pw = newPassword(), salt = randHex(16); this.sql.exec('UPDATE accounts SET salt = ?, hash = ?, fails = 0, lock_until = 0 WHERE id = ?', salt, await pwHash(pw, salt), id); this.sql.exec('DELETE FROM sessions WHERE id = ?', id); return { ok: true, account: pub(this.row(id)), password: pw }; }
    return { ok: false, error: 'unknown op' };
  }
}

const LABO_HOSTS = new Set(['vibesdigilabo.com', 'www.vibesdigilabo.com', 'labo.localhost']);
const LABO_PAGES = { '/': '/labo', '/login': '/labo/login', '/admin': '/labo/admin', '/account': '/labo/account' };
const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const cookieOf = (req) => { const m = /(?:^|;\s*)labo_s=([0-9a-f]{64})/.exec(req.headers.get('cookie') || ''); return m ? m[1] : ''; };
const setCookie = (token, age) => `labo_s=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const accounts = (env) => env.LABO.get(env.LABO.idFromName('main'));

async function laboApi(req, env, url) {
  const p = url.pathname.slice('/api/labo/'.length), db = accounts(env);
  if (req.method === 'GET' && p === 'me') { const s = await db.session(cookieOf(req)); return json(s.ok ? s : { ok: false }); }
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  const origin = req.headers.get('origin'); if (origin && origin !== url.origin) return json({ ok: false, error: 'origin' }, 403);
  let d = {}; try { d = await req.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }
  if (p === 'login') { const r = await db.login(d.id, d.pw); if (!r.ok) return json(r, 401); const { token, ...rest } = r; return json(rest, 200, { 'set-cookie': setCookie(token, SESSION_DAYS * 86400) }); }
  if (p === 'logout') { await db.logout(cookieOf(req)); return json({ ok: true }, 200, { 'set-cookie': setCookie('x', 0) }); }
  if (p === 'password') return json(await db.password(cookieOf(req), d.old, d.new));
  if (p === 'admin') {
    if (!env.ADMIN_KEY) return json({ ok: false, error: '管理キー（ADMIN_KEY）が、まだ設定されていません。' }, 503);
    if (!same(req.headers.get('x-admin-key') || '', env.ADMIN_KEY)) return json({ ok: false, error: '管理キーが違います。' }, 401);
    return json(await db.admin(d.op, d));
  }
  return json({ ok: false, error: 'not found' }, 404);
}

async function asset(env, req, url, path) { const u = new URL(url); u.pathname = path; u.search = ''; return env.ASSETS.fetch(new Request(u, { method: 'GET', headers: req.headers })); }
async function html(res, fn) { if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) return res; const h = new Headers(res.headers); h.set('cache-control', 'no-store'); h.delete('etag'); h.delete('content-length'); return new Response(fn(await res.text()), { status: 200, headers: h }); }

/* pre = '' on vibesdigilabo.com; '/labo' when the same site is reached under a path on the preview host (until the domain is on Cloudflare) */
async function laboSite(req, env, url, pre = '') {
  let p = (url.pathname.slice(pre.length).replace(/\/+$/, '')) || '/';
  if (!pre && LABO_PAGES[p]) return asset(env, req, url, LABO_PAGES[p]);
  const app = /^\/pages\/count(-3c|-pocket|-remote|-cam|-live)?$/.exec(p);
  if (app) {
    const gated = !app[1] || app[1] === '-3c' || app[1] === '-pocket';
    let s = null;
    if (gated) { s = await accounts(env).session(cookieOf(req)); if (!s.ok) return Response.redirect(url.origin + pre + '/login?next=' + encodeURIComponent(url.pathname + url.search) + (s.why ? '&why=' + s.why : ''), 302); }
    const boot = `<script>window.LABO=${JSON.stringify(s ? { id: s.id, shop: s.shop, expires: s.expires, pre } : { pre }).replace(/</g, '\\u003c')}</script>`;
    return html(await asset(env, req, url, p), (t) => t.split('https://vibesbilliards.com/pages/count').join('\u0001A').split('vibesbilliards.com/pages/count').join('\u0001B').split('/pages/count').join(pre + '/pages/count')
      .split('\u0001A').join(url.origin + pre + '/pages/count').split('\u0001B').join(url.host + pre + '/pages/count')
      .split('/img/vibes-logo-t.png').join('/img/vibes-digilabo-t.png').replace('<head>', '<head>' + boot + '<style>.lab,.mlogo span,.top>b{display:none!important}</style>'));
  }
  if (pre) return env.ASSETS.fetch(req);
  if (/^\/(img|js|css|fonts|labo)\//.test(url.pathname) || /^\/(sw-count\.js|count-3c\.webmanifest|favicon\.ico|robots\.txt)$/.test(url.pathname)) return env.ASSETS.fetch(req);
  return Response.redirect(url.origin + '/', 302);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/api\/count\/(\d{6})$/);
    if (m) return env.COUNT_ROOM.get(env.COUNT_ROOM.idFromName(m[1])).fetch(req);
    if (url.pathname.startsWith('/api/labo/')) return laboApi(req, env, url);
    if (LABO_HOSTS.has(url.hostname)) return laboSite(req, env, url);
    if (url.pathname.startsWith('/labo/pages/count')) return laboSite(req, env, url, '/labo');
    return env.ASSETS.fetch(req);
  },
};
