/* Real WebCrypto signatures, the shipped score engine, and the venue input guard. */
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const pad = read('static/apps/event-score-pad.html');
function section(s, a, b) { const i = s.indexOf(a), j = s.indexOf(b, i); assert(i >= 0 && j > i); return s.slice(i, j); }
let now = 100000, passed = 0;
const storage = new Map(), sent = [];
const c = vm.createContext({ window: { crypto: webcrypto }, TextEncoder, Uint8Array, console,
  Date: class extends Date { static now() { return now; } } });
vm.runInContext(read('static/js/event-referee.js'), c);
const RF = c.window.VibesEventReferee, store = { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) };
const client = RF.random(), client2 = RF.random();
let count = 0, active = true;
const options = { match: 'referee-test', storage: store, active: () => active, view: () => ({ count }), send: m => sent.push(m), apply: op => { if (op !== 'point') return false; count++; return true; } };
let host = new RF.Host(options), auth = RF.signer(host.state.key);
const msg = (seq, op = 'point', base = host.state.rev, who = client) => auth.sign({ type: 'referee-command', m: 'referee-test', client: who, seq, op, base });
async function test(name, fn) { await fn(); console.log(`ok ${++passed} - ${name}`); }
await test('QR keeps the random pairing key in a URL fragment', async () => {
  const u = new URL(host.url('https://vibesbilliards.com'));
  assert.equal(u.pathname, '/event-score-referee/'); assert.equal(u.searchParams.get('match'), 'referee-test');
  assert(!u.search.includes(host.state.key)); assert.equal(u.hash, '#key=' + host.state.key);
  assert.notEqual(RF.random(), host.state.key);
});
await test('wrong signatures and altered payloads cannot acquire control', async () => {
  const wrong = await RF.signer(RF.random()).sign({ type: 'referee-command', m: 'referee-test', client, seq: 0, op: 'hello' });
  assert.equal(await host.receive(wrong), false); assert.equal(host.state.client, '');
  const altered = await msg(0, 'hello'); altered.op = 'point';
  assert.equal(await host.receive(altered), false); assert.equal(count, 0);
});
await test('signed handshake binds one phone and authenticates its reply without sending the key', async () => {
  assert.equal(await host.receive(await msg(0, 'hello')), true); assert(host.online());
  assert.equal(sent.at(-1).owner, true); assert(await auth.verify(sent.at(-1)));
  assert(!JSON.stringify(sent).includes(host.state.key));
  const fake = { ...sent.at(-1), rev: 99 }; assert.equal(await auth.verify(fake), false);
});
await test('duplicate delivery and concurrent retries produce exactly one point', async () => {
  const m = await msg(1); await Promise.all([host.receive(m), host.receive(m), host.receive(m)]);
  assert.equal(count, 1); assert.equal(host.state.rev, 1); assert.equal(sent.at(-1).ack, 1);
});
await test('stale revisions, wrong rooms, and out-of-order actions are rejected', async () => {
  assert.equal(await host.receive(await msg(2, 'point', 0)), false); assert.equal(count, 1);
  const wrongRoom = await auth.sign({ type: 'referee-command', m: 'other-room', client, seq: 3, op: 'point', base: 1 });
  assert.equal(await host.receive(wrongRoom), false);
  assert.equal(await host.receive(await msg(1)), false); assert.equal(count, 1);
  assert.equal(await host.receive(await msg(3)), true); assert.equal(count, 2);
});
await test('another phone cannot take over an active referee; takeover works after timeout', async () => {
  assert.equal(await host.receive(await msg(0, 'hello', host.state.rev, client2)), false);
  assert.equal(sent.at(-1).owner, false); now += 12001; assert.equal(host.online(), false);
  assert.equal(await host.receive(await msg(0, 'hello', host.state.rev, client2)), true);
  assert.equal(await host.receive(await msg(4)), false); assert.equal(count, 2);
});
await test('reload retains pairing and deduplication; inactive displays accept no commands', async () => {
  const key = host.state.key; host = new RF.Host(options); assert.equal(host.state.key, key);
  assert.equal(host.state.client, client2); assert.equal(host.state.rev, 2);
  active = false; assert.equal(await host.receive(await msg(1, 'point', 2, client2)), false); assert.equal(count, 2); active = true;
});

const elements = new Map(), guards = new Map(), savedScore = new Map();
function element(id) { if (!elements.has(id)) elements.set(id, { hidden: false, inert: false, textContent: '', value: '', classList: { toggle() {} }, addEventListener() {}, setAttribute() {} }); return elements.get(id); }
const p = vm.createContext({ window: {}, localStorage: { getItem: k => savedScore.get(k), setItem: (k, v) => savedScore.set(k, v) }, match: 'engine-test', qs: () => '', Date, setTimeout() {}, setInterval() {},
  document: { body: element('body'), addEventListener: (type, fn, opts) => { if (opts?.capture) guards.set(type, fn); } }, $: element, $$: () => [], location: { origin: 'https://vibesbilliards.com' }, save() {}, store() {} });
vm.runInContext(read('static/js/queen-cup.js'), p); p.QC = p.window.VibesQueenCup;
vm.runInContext(section(pad, '  var CFG0 =', '  /* ---- drawing:'), p);
vm.runInContext(section(pad, '  /* ---- authenticated referee control:', '  /* ---- player list'), p);
vm.runInContext(section(pad, '  function snap() {', '  function push() {'), p);
p.S.cfg = p.cfgOf({ entry: 'prequeen', referee: true, mode: '3c', limit: 25, back: false, end: 'sd' });
p.S.p.forEach(x => { x.h = 10; }); p.prepReset();
await test('organizer chooses the pair before the venue locks at banking', async () => {
  assert.equal(p.refereeLocked(), false);
  p.prepSelect(0, { key: 'a', n: 'デモ選手 A' }); p.prepSelect(1, { key: 'b', n: 'デモ選手 B' }); p.prepBank();
  assert.equal(p.refereeLocked(), true);
  assert.equal(p.refereeApply('point', { player: 0, delta: 1 }), false);
});
await test('venue blocks touch, clicks, typing, and changes while locked', async () => {
  for (const type of ['click', 'pointerdown', 'touchstart', 'keydown', 'input', 'change']) {
    let prevented = false, stopped = false;
    guards.get(type)({ preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } });
    assert(prevented && stopped, type);
  }
  assert.equal(p.S.p[0].s, 0);
});
await test('referee banks, swaps, starts, scores, corrects, and advances innings with the real engine', async () => {
  assert(p.refereeApply('swap', {})); assert.equal(p.S.p[0].n, 'デモ選手 B');
  assert(p.refereeApply('start', {})); assert.equal(p.refereeLocked(), true);
  assert.equal(p.refereeApply('point', { player: 1, delta: 1 }), false);
  assert(p.refereeApply('point', { player: 0, delta: 1 })); assert(p.refereeApply('point', { player: 0, delta: -1 }));
  assert.equal(p.S.p[0].s, 0); assert.equal(p.S.p[0].hr, 0);
  assert(p.refereeApply('next', {})); assert.equal(p.S.turn, 1); assert.equal(p.S.inn, 1);
  assert(p.refereeApply('next', {})); assert.equal(p.S.turn, 0); assert.equal(p.S.inn, 2);
});
await test('ten points ends the final without an answering visit; result can be corrected remotely', async () => {
  for (let i = 0; i < 10; i++) assert(p.refereeApply('point', { player: 0, delta: 1 }));
  assert.equal(p.S.over.w, 0); assert.equal(p.S.rep, false); assert.equal(p.LOG.length, 1);
  assert.equal(p.refereeApply('next', {}), false); assert.equal(p.refereeLocked(), true);
  assert(p.refereeApply('undo', {})); assert.equal(p.LOG.length, 0);
  assert(p.refereeApply('point', { player: 0, delta: -1 })); assert.equal(p.S.p[0].s, 9);
  assert(p.refereeApply('point', { player: 0, delta: 1 })); assert.equal(p.LOG.length, 1);
});
await test('public score contains no pairing key, phone lease, or complete roster; normal modes stay unlocked', async () => {
  assert(!/referee-command|client|key|vibes-event-referee/.test(JSON.stringify(p.snap())));
  p.S.cfg.referee = false; assert.equal(p.refereeLocked(), false);
  let stopped = false; guards.get('click')({ preventDefault() {}, stopImmediatePropagation() { stopped = true; } }); assert.equal(stopped, false);
});
for (const path of ['static/apps/event-score-pad.html', 'static/apps/event-score-referee.html', 'static/apps/count-home.html']) {
  for (const [i, m] of [...read(path).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].entries()) new vm.Script(m[1], { filename: path + ':' + i });
}
console.log(`${passed} referee checks passed; all changed inline scripts parse.`);
