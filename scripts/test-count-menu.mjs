import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const shared = read('static/js/count-menu.js');
function environment() {
  const local = new Map(), session = new Map();
  let now = Date.parse('2026-11-21T12:00:00+09:00');
  const storage = m => ({ getItem: k => m.get(k) || null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) });
  const context = vm.createContext({ window: { location: { origin: 'https://vibesbilliards.com' } }, URL,
    location: { origin: 'https://vibesbilliards.com' }, localStorage: storage(local), sessionStorage: storage(session),
    Date: class extends Date { static now() { return now; } } });
  vm.runInContext(shared, context);
  return { context, cm: context.window.VibesCountMenu, local, session, setNow(t) { now = Date.parse(t); } };
}
function row(id, at, extra = {}) { return { id, at, kind: 'carom', table: 0, title: 'スリークッション', players: [id + ' A', id + ' B'], cfg: { n: [id + ' A', id + ' B'], g: [14, 18], t: 40, eq: 1, to: 0 }, ...extra }; }
function part(source, start, end) { const a = source.indexOf(start), b = source.indexOf(end, a); assert(a >= 0 && b > a); return source.slice(a, b); }
let passed = 0;
function test(name, run) { run(); console.log(`ok ${++passed} - ${name}`); }

test('expiry uses the exact 23:59 Japan-time boundary', () => {
  const { cm } = environment();
  assert.equal(cm.preQueenOpen(Date.parse('2026-12-05T23:58:59.999+09:00')), true);
  assert.equal(cm.preQueenOpen(Date.parse('2026-12-05T23:59:00+09:00')), false);
  assert.equal(cm.preQueenOpen(Date.parse('2026-12-05T14:59:00Z')), false);
  assert.equal(cm.preQueenOpen(Date.parse('2026-12-06T00:00:00+09:00')), false);
});
test('the archived preset can be reopened without deleting code or history', () => {
  const { cm } = environment();
  cm.record(row('kept', 1)); cm.event.enabled = false; assert.equal(cm.preQueenOpen(), false);
  cm.event.expiresAt = null; cm.event.enabled = true; assert.equal(cm.preQueenOpen(), true);
  assert.equal(cm.recent('carom', 0)[0].id, 'kept');
});
test('the most recent three games are sorted by actual start, not score updates', () => {
  const { cm } = environment();
  for (const [id, at] of [['one', 1], ['three', 3], ['two', 2], ['four', 4]]) cm.record(row(id, at));
  cm.record(row('one', 999));
  assert.deepEqual(Array.from(cm.recent('carom', 0), r => r.id), ['four', 'three', 'two']);
});
test('the same pair in separate games remains selectable as separate games', () => {
  const { cm } = environment();
  cm.record(row('one', 1)); cm.record(row('two', 2, { players: ['one A', 'one B'] }));
  assert.equal(cm.recent('carom', 0).length, 2);
});
test('other tables and pocket games do not replace this table’s carom history', () => {
  const { cm } = environment();
  cm.record(row('here', 1)); cm.record(row('other-table', 3, { table: 2 }));
  cm.record(row('pocket', 4, { kind: 'pocket', cfg: { mode: 'nine', g: [4, 5] } }));
  assert.deepEqual(Array.from(cm.recent('carom', 0), r => r.id), ['here']);
  assert.equal(cm.recent('carom', 2)[0].id, 'other-table'); assert.equal(cm.recent('pocket', 0)[0].id, 'pocket');
});
test('history snapshots cannot be changed by mutating the active game', () => {
  const { cm } = environment(), r = row('snapshot', 1);
  cm.record(r); r.players[0] = 'changed'; r.cfg.g[0] = 999;
  const saved = cm.recent('carom', 0)[0]; assert.equal(saved.players[0], 'snapshot A'); assert.equal(saved.cfg.g[0], 14);
  saved.cfg.g[0] = 1; assert.equal(cm.recent('carom', 0)[0].cfg.g[0], 14);
});
test('invalid or unstarted placeholders are ignored and corrupt storage is recoverable', () => {
  const { cm, local } = environment();
  assert.equal(cm.record(row('bad', 1, { players: ['PLAYER 1', 'PLAYER 2'] })), false);
  assert.equal(cm.record(row('bad', 1, { kind: 'unknown' })), false);
  local.set('vibes-count-recents-v1', '{broken'); assert.equal(cm.recent('carom', 0).length, 0);
  assert.equal(cm.record(row('valid', 2)), true);
});
test('the previous single-game format is retained without inventing three past games', () => {
  const { cm, local } = environment();
  local.set('vibes-count-last', JSON.stringify({ u: 'https://vibesbilliards.com/pages/count-3c/?g=three', n: ['以前 A', '以前 B'], title: 'スリークッション' }));
  local.set('vibes-count-3c-v1', JSON.stringify({ cfg: { n: ['以前 A', '以前 B'], g: [12, 16] } }));
  const old = cm.recent('carom', 0); assert.equal(old.length, 1); assert.equal(old[0].cfg.g[1], 16);
  assert.equal(cm.recent('carom', 2).length, 0);
  local.set('vibes-count-last', JSON.stringify({ u: 'https://outside.example/pages/count-3c/', n: ['A', 'B'] }));
  assert.equal(cm.recent('carom', 0).length, 0);
});
test('a replay ticket carries names locally and can only be consumed once by its intended game', () => {
  const { cm } = environment(), r = row('selected', 1);
  const url = new URL(cm.prepare(r, 2), 'https://vibesbilliards.com');
  assert.equal(url.pathname, '/pages/count-3c/'); assert.equal(url.searchParams.get('t'), '2');
  assert.equal(url.href.includes('selected'), false);
  const ticket = url.searchParams.get('rpt');
  assert.equal(cm.consume('pocket', ticket), null); assert.equal(cm.consume('carom', 'wrong'), null);
  const received = cm.consume('carom', ticket); assert.equal(received.players[0], 'selected A');
  assert.equal(cm.consume('carom', ticket), null);
});
test('expired Pre Queen history stays visible while its replay button cannot start another event game', () => {
  const env = environment(), r = row('queen', 1, { kind: 'prequeen', cfg: { entry: 'prequeen', h: [7, 7], limit: 25, back: true } });
  env.cm.record(r); env.setNow('2026-12-05T23:59:00+09:00');
  assert.equal(env.cm.recent('carom', 0)[0].id, 'queen'); assert.equal(env.cm.prepare(r, 0), '');
  assert.match(env.cm.prepare(row('regular', 2), 0), /^\/pages\/count-3c\//);
});
test('pocket replay keeps the selected game type and does not expose player names in URLs', () => {
  const { cm } = environment();
  const u = new URL(cm.prepare(row('bow', 1, { kind: 'pocket', players: ['テスト選手'], cfg: { mode: 'bowlard', g: [5] } }), 0), 'https://vibesbilliards.com');
  assert.equal(u.searchParams.get('m'), 'bowlard'); assert.equal(u.href.includes('%E3'), false);
});
test('storage failure stops navigation instead of launching with the wrong players', () => {
  const { cm, context } = environment();
  context.sessionStorage.setItem = () => { throw Error('storage unavailable'); };
  assert.equal(cm.prepare(row('storage', 1), 0), '');
});

for (const [file, kind] of [['count-3c.html', 'carom'], ['count-pocket.html', 'pocket']]) {
  test(`${kind} launches the selected older game at zero without changing its archived pairing`, () => {
    const env = environment(), { cm, context: p } = env;
    const cfg = kind === 'pocket' ? { mode: 'ten', n: ['過去 A', '過去 B'], g: [3, 6], t: 30, eq: 0, snd: 1, to: 0 } : { n: ['過去 A', '過去 B'], g: [12, 16], lim: 25, t: 30, eq: 1, to: 0 };
    const old = row('older', 1, { kind, players: cfg.n, cfg }); cm.record(old); cm.record(row('latest', 2, kind === 'pocket' ? { kind, cfg: { mode: 'nine', g: [5, 5] } } : {}));
    const url = new URL(cm.prepare(cm.recent(kind, 0)[1], 0), 'https://vibesbilliards.com');
    Object.assign(p, { CM: cm, PFK: 'prefs', PFL: [], VL: {}, isDefName: n => /^PLAYER [1-4]$/.test(n),
      location: { search: url.search, href: url.href, pathname: url.pathname }, history: { replaceState() {} }, toast() {}, hist: [] });
    const source = read('static/apps/' + file);
    vm.runInContext(part(source, kind === 'pocket' ? '  var names = function' : '  var def = function', '  var NP ='), p);
    p.S = { cfg: { n: ['いま A', 'いま B'], g: [25, 25], mode: kind === 'pocket' ? 'nine' : undefined }, sc: [19, 13] };
    vm.runInContext(part(source, '  function menuInit()', '  setInterval('), p); p.menuInit();
    assert.deepEqual(Array.from(p.S.cfg.n), ['過去 A', '過去 B']); assert.deepEqual(Array.from(p.S.cfg.g), kind === 'pocket' ? [3, 6] : [12, 16]);
    assert.deepEqual(Array.from(p.S.sc), [0, 0]); assert.equal(p.S.ready, true); assert.equal(p.S.t0, 0);
    assert.equal(cm.recent(kind, 0)[1].players[0], '過去 A');
  });
}
console.log(`${passed} menu, expiry and rematch checks passed.`);
