/* Menu availability and device-local rematches. Player names never go in launch URLs. */
(function (root) {
  'use strict';
  var KEY = 'vibes-count-recents-v1', NEXT = 'vibes-count-next-replay-v1';
  /* Keep this preset and its artwork after the event. To reopen it, set a new
     expiresAt, or null for no deadline; enabled=false archives it immediately. */
  var event = { enabled: true, expiresAt: '2026-12-05T23:59:00+09:00' };
  function preQueenOpen(now) { var end = event.expiresAt === null ? Infinity : Date.parse(event.expiresAt); return event.enabled && (now == null ? Date.now() : now) < end; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function clean(o) {
    if (!o || ['carom', 'pocket', 'prequeen'].indexOf(o.kind) < 0 || !Array.isArray(o.players) || !o.players.length || o.players.length > 4) return null;
    var names = o.players.map(function (n) { return typeof n === 'string' ? n.trim().slice(0, 40) : ''; });
    if (names.some(function (n) { return !n; }) || names.every(function (n) { return /^PLAYER [1-4AB]$/.test(n); })) return null;
    var cfg = o.cfg && typeof o.cfg === 'object' ? copy(o.cfg) : null;
    if (cfg && o.kind !== 'prequeen' && (!Array.isArray(cfg.g) || cfg.g.length !== names.length || cfg.g.some(function (g) { return !Number.isFinite(g) || g < 0 || g > 999; }))) return null;
    if (cfg && o.kind === 'pocket' && ['bowlard', 'nine', 'ten', 'g59', 'g510'].indexOf(cfg.mode) < 0) return null;
    if (o.kind === 'prequeen' && (!cfg || cfg.entry !== 'prequeen' || names.length !== 2 || !Array.isArray(cfg.h) || cfg.h.length !== 2)) return null;
    return { id: String(o.id || '').slice(0, 100), at: Number.isFinite(o.at) ? Math.max(0, o.at) : 0, kind: o.kind,
      table: Math.max(0, Math.min(5, o.table | 0)), title: String(o.title || '').slice(0, 80), players: names, cfg: cfg };
  }
  function read() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.map(clean).filter(Boolean) : []; } catch (e) { return []; } }
  function record(o) {
    var row = clean(o); if (!row || !row.id) return false;
    var rows = read(), old = rows.filter(function (r) { return r.id === row.id; })[0]; if (old) row.at = old.at;
    rows = rows.filter(function (r) { return r.id !== row.id; }); rows.push(row);
    rows.sort(function (a, b) { return b.at - a.at; });
    try { localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 80))); return true; } catch (e) { return false; }
  }
  function legacy(edition, table) {
    try {
      var o = JSON.parse(localStorage.getItem('vibes-count-last') || 'null'); if (!o || typeof o.u !== 'string') return null;
      var u = new URL(o.u, root.location.origin), kind = /^\/pages\/count-3c\/?$/.test(u.pathname) ? 'carom' : /^\/pages\/count-pocket\/?$/.test(u.pathname) ? 'pocket' : '';
      if (u.origin !== root.location.origin || !kind || kind !== edition || (+u.searchParams.get('t') || 0) !== table) return null;
      var state = null; try { state = JSON.parse(localStorage.getItem('vibes-count-' + (kind === 'carom' ? '3c' : 'pocket') + '-v1' + (table ? '-t' + table : '')) || 'null'); } catch (e) {}
      var cfg = state && state.cfg && JSON.stringify(state.cfg.n) === JSON.stringify(o.n) ? state.cfg : null;
      if (!cfg && kind === 'pocket' && Array.isArray(o.n)) cfg = { mode: u.searchParams.get('m') || 'nine', g: o.n.map(function () { return 5; }) };
      return clean({ id: 'legacy-' + kind + '-' + table, kind: kind, at: 0, table: table, title: o.title, players: o.n, cfg: cfg });
    } catch (e) { return null; }
  }
  function recent(edition, table) {
    table = table | 0;
    var rows = read().filter(function (r) { return (r.kind === 'pocket' ? 'pocket' : 'carom') === edition && r.table === table; }).sort(function (a, b) { return b.at - a.at; });
    if (!rows.length) { var last = legacy(edition, table); if (last) rows.push(last); }
    return rows.slice(0, 3);
  }
  function prepare(o, table) {
    var row = clean(o); if (!row || (row.kind === 'prequeen' && !preQueenOpen())) return '';
    var ticket = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10), suffix = table ? '&t=' + Math.max(1, Math.min(5, table | 0)) : '';
    try { sessionStorage.setItem(NEXT, JSON.stringify({ ticket: ticket, row: row })); } catch (e) { return ''; }
    if (row.kind === 'prequeen') return '/event-score-pad/?match=pq-r-' + ticket + '&from=count&rpt=' + ticket + suffix;
    return (row.kind === 'pocket' ? '/pages/count-pocket/?m=' + (row.cfg ? row.cfg.mode : 'nine') : '/pages/count-3c/?g=' + (row.cfg && row.cfg.game === 'band' ? 'band' : 'three')) + '&n=again&rpt=' + ticket + suffix;
  }
  function consume(kind, ticket) {
    if (!ticket) return null;
    try {
      var o = JSON.parse(sessionStorage.getItem(NEXT) || 'null'), row = o && clean(o.row);
      if (!o || o.ticket !== ticket || !row || row.kind !== kind || (kind === 'prequeen' && !preQueenOpen())) return null;
      sessionStorage.removeItem(NEXT); return row;
    } catch (e) { return null; }
  }
  root.VibesCountMenu = { event: event, preQueenOpen: preQueenOpen, record: record, recent: recent, prepare: prepare, consume: consume };
})(window);
