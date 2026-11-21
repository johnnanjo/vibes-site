/* Exercise the shipped inline match logic without cameras, credentials or a live relay. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = name => fs.readFileSync(new URL(name, root), 'utf8');
const shared = read('static/js/queen-cup.js');
const pad = read('static/apps/event-score-pad.html');
const overlay = read('static/apps/event-score-obs.html');
const studio = read('static/apps/count-studio.html');
const home = read('static/apps/count-home.html');

function section(source, start, end) {
  const left = source.indexOf(start);
  const right = source.indexOf(end, left);
  assert(left >= 0 && right > left, `Missing source section ${start}`);
  return source.slice(left, right);
}

function environment(query = '') {
  const elements = new Map();
  const storage = new Map();
  const events = {};
  let now = 100000;
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        hidden: false, value: '', textContent: '', innerHTML: '', style: {}, options: [],
        classList: { toggle(key, on) { if (on) classes.add(key); else classes.delete(key); },
          remove(key) { classes.delete(key); }, contains(key) { return classes.has(key); } },
        setAttribute() {}, addEventListener() {}, querySelectorAll() { return []; }
      });
    }
    return elements.get(id);
  }
  const context = vm.createContext({
    window: {}, Date: class extends Date { static now() { return now; } },
    match: 'test', qs: () => '', q: new URLSearchParams(query),
    document: { body: element('body'), activeElement: null,
      addEventListener(type, handler) { events[type] = handler; } },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    $: element, $$: () => [], setInterval() {}, setTimeout() {}, clearInterval() {}, clearTimeout() {},
    navigator: {}, addEventListener() {}, toast() {}, store() {}, save() {},
    sock(code, role, receive) { events.receive = receive; events.role = role; return { send() {} }; }
  });
  vm.runInContext(shared, context);
  context.QC = context.window.VibesQueenCup;
  return { context, elements, element, events, storage, advance(ms) { now += ms; } };
}

function operator() {
  const env = environment();
  vm.runInContext(section(pad, '  var CFG0 =', '  /* ---- drawing:'), env.context);
  vm.runInContext(section(pad, '  function idle()', '  function applyAssign('), env.context);
  vm.runInContext(section(pad, '  var setupConfig =', '  /* ---- actions ---- */'), env.context);
  vm.runInContext(section(pad, "  document.addEventListener('click'", "  document.addEventListener('input'"), env.context);
  vm.runInContext(section(pad, '  function snap() {', '  function push() {'), env.context);
  env.context.S.cfg = env.context.cfgOf(env.context.QC.preset());
  env.context.S.p.forEach(player => { player.h = 25; });
  env.clickExtension = (player, slot) => env.events.click({
    target: { closest: () => ({ dataset: { ext: `${player},${slot}` } }) }
  });
  return env;
}

function display() {
  const env = environment();
  Object.assign(env.context, { c: env.element('card'), queen: false, clockLength: 0,
    CK: null, showRes: false, boardShow() {}, esc: String });
  vm.runInContext(section(overlay, '  function draw(m, live)', '  function connect() {'), env.context);
  return env;
}

function studioMonitor(query = '') {
  const env = environment(query);
  vm.runInContext(section(studio, "  $('app').hidden = false;", '  /* ---- camera ---- */'), env.context);
  return env;
}

let passed = 0;
function test(name, run) {
  run(); passed++;
  console.log(`ok ${passed} - ${name}`);
}

function menuLaunch(id) {
  const env = environment();
  Object.assign(env.context, { TB: 2, U: { '3c': '/pages/count-3c/', pocket: '/pages/count-pocket/' }, btoa, atob, escape, unescape });
  vm.runInContext(section(home, '  var MENU = {', '  function edMenu()'), env.context);
  vm.runInContext(section(home, '  function prequeenUrl(', '  function open('), env.context);
  const address = new URL(env.context.url(id), 'https://vibesbilliards.com');
  env.context.match = address.searchParams.get('match');
  env.context.qs = key => address.searchParams.get(key) || '';
  vm.runInContext(section(pad, '  var CFG0 =', '  /* ---- drawing:'), env.context);
  env.context.takeCfg();
  return { ...env, address };
}

test('new-game menu replaces band with Pre Queen and preserves the regular 3C route', () => {
  const { context: p, address } = menuLaunch('prequeen-qual');
  assert.deepEqual(Array.from(p.MENU.carom.items, x => x.b), ['スリークッション', 'プレクイーン']);
  assert.equal(p.MENU.prequeen.items.length, 3);
  assert.equal(p.url('3c'), '/pages/count-3c/?g=three&n=new&t=2');
  assert.equal(address.pathname, '/event-score-pad/');
  assert.equal(address.searchParams.get('from'), 'count');
  assert.equal(address.searchParams.get('t'), '2');
});

test('Pre Queen qualifying launches with seven points and retains the both-lose cap rule', () => {
  const { context: p } = menuLaunch('prequeen-qual');
  assert.deepEqual(Array.from(p.S.p, x => x.h), [7, 7]);
  assert.equal(p.S.cfg.limit, 25); assert.equal(p.S.cfg.back, true); assert.equal(p.S.cfg.clk, 0);
  assert.equal(p.S.round, 'ゼッケン決定戦');
  p.S.inn = 25; p.S.turn = 1; p.S.p[0].s = 6; p.S.p[1].s = 5; p.next();
  assert.equal(p.S.over.w, -2);
});

test('Pre Queen final launches with ten points and retains sudden death on a tied cap', () => {
  const { context: p } = menuLaunch('prequeen-final');
  assert.deepEqual(Array.from(p.S.p, x => x.h), [10, 10]);
  assert.equal(p.S.cfg.back, false); assert.equal(p.S.cfg.limit, 25); assert.equal(p.S.cfg.clk, 0);
  p.S.inn = 25; p.S.turn = 1; p.S.p[0].s = 8; p.S.p[1].s = 8; p.next();
  assert.equal(p.S.sd, true); assert.equal(p.S.over, null);
  p.add(0, 1); assert.equal(p.S.over.w, 0);
});

test('W3C entry uses an independent room and rereading its setup preserves score and spent EXT', () => {
  const first = menuLaunch('prequeen-w3c'), second = menuLaunch('prequeen-w3c');
  const p = first.context;
  assert.notEqual(first.address.searchParams.get('match'), second.address.searchParams.get('match'));
  assert.deepEqual(Array.from(p.S.p, x => x.h), [25, 25]);
  assert.equal(p.S.cfg.limit, 35); assert.equal(p.S.cfg.clk, 40); assert.equal(p.S.cfg.to, 2);
  assert.equal(p.S.title, 'W3C PRE QUEEN CUP 2026');
  p.add(0, 1); p.QC.extend(p.S.p[0], 0); p.takeCfg();
  assert.equal(p.S.p[0].s, 1); assert.equal(p.QC.usedMask(p.S.p[0]), 1);
});

test('preset defaults and custom 30-second clock', () => {
  const { context: p } = operator();
  assert.equal(p.S.cfg.limit, 35); assert.equal(p.S.cfg.clk, 40);
  assert.equal(p.S.cfg.back, true); assert.equal(p.S.cfg.to, 2);
  p.S.cfg = p.cfgOf({ ...p.QC.preset(), limit: 42, clk: 30 });
  assert.equal(p.S.cfg.limit, 42); assert.equal(p.S.cfg.clk, 30);
});

test('setup applies individual targets and blocks changing an ongoing game', () => {
  const { context: p, element } = operator();
  p.setupConfig = p.QC.preset();
  element('setupH0').value = '18'; element('setupH1').value = '23';
  element('setupLimit').value = '28'; element('setupClock').value = '30';
  p.applySetup();
  assert.equal(p.S.p[0].h, 18); assert.equal(p.S.p[1].h, 23);
  assert.equal(p.S.cfg.limit, 28); assert.equal(p.S.cfg.clk, 30);
  assert.equal(p.S.title, 'W3C PRE QUEEN CUP 2026');
  p.add(0, 1); element('setupH0').value = '99'; p.applySetup();
  assert.equal(p.S.p[0].h, 18); assert.equal(p.S.p[0].s, 1);
});

test('first player reaching target immediately shows equalizing status', () => {
  const { context: p } = operator();
  for (let i = 0; i < 25; i++) p.add(0, 1);
  assert.equal(p.S.over, null); assert.equal(p.S.turn, 0);
  assert.equal(p.QC.status(p.S).equalizing, true); assert.equal(p.S.ck.run, false);
  p.add(0, 1); assert.equal(p.S.p[0].s, 25);
  p.next(); assert.equal(p.S.turn, 1); assert.equal(p.S.rep, true);
  p.next(); assert.equal(p.S.over.w, 0);
});

test('equalizing player reaching their own target produces a draw', () => {
  const { context: p } = operator();
  p.S.p[0].h = 2; p.S.p[1].h = 3;
  p.add(0, 1); p.add(0, 1); p.next();
  p.add(1, 1); p.add(1, 1); p.add(1, 1);
  assert.equal(p.S.over.w, -1);
  assert.equal(p.QC.status(p.S).equalizing, false);
});

test('35th inning allows both visits, then ends without creating inning 36', () => {
  const { context: p } = operator();
  p.S.inn = 35; p.S.p[0].s = 12; p.S.p[1].s = 10;
  assert.equal(p.QC.status(p.S).final, true);
  p.next(); assert.equal(p.S.over, null); assert.equal(p.S.inn, 35);
  p.next(); assert.equal(p.S.over.w, 0); assert.equal(p.S.inn, 35);
});

test('extension slots are independent and cannot be used twice, including after reload', () => {
  const env = operator(), p = env.context;
  p.ckSet(30000, true); p.S.cfg.clk = 30;
  env.clickExtension(0, 1);
  assert.equal(p.ckLeft(), 70000); assert.equal(p.S.p[0].ext, 2); assert.equal(p.S.p[0].to, 1);
  env.clickExtension(0, 1); assert.equal(p.ckLeft(), 70000);
  env.clickExtension(1, 0); assert.equal(p.S.p[1].to, 0);
  p.S = p.fix(JSON.parse(JSON.stringify(p.S)));
  env.clickExtension(0, 1); assert.equal(p.ckLeft(), 70000);
  env.clickExtension(0, 0); assert.equal(p.ckLeft(), 110000); assert.equal(p.S.p[0].to, 2);
  p.newGame(); assert.equal(p.S.p[0].to, 0); assert.equal(p.S.p[0].ext, 0);
});

test('paused extension remains paused and legacy used counts migrate', () => {
  const env = operator(), p = env.context;
  p.ckSet(8000, false); env.clickExtension(0, 0);
  assert.equal(p.ckLeft(), 48000); assert.equal(p.S.ck.run, false);
  assert.equal(p.QC.usedMask({ to: 1 }), 1);
  assert.equal(p.QC.usedMask({ to: 2 }), 3);
});

test('OBS receives title, cap, both status badges and the exact used EXT slot', () => {
  const env = operator(), p = env.context, output = display();
  p.S.inn = 35; env.clickExtension(0, 1); p.S.p[0].s = 25;
  output.context.draw(p.snap(), true);
  assert.equal(output.element('tt').textContent, p.QC.title);
  assert.equal(output.element('of').textContent, '/ 35');
  assert.equal(output.element('queenFinal').hidden, false);
  assert.equal(output.element('queenEqual').hidden, false);
  assert.match(output.element('oA').innerHTML, /^<u><\/u><u class="used">/);
});

test('OBS gauge turns red only below 10 seconds and stops flashing after extension', () => {
  const { context: p } = operator(), output = display();
  p.ckSet(10000, true); output.context.draw(p.snap(), true);
  assert.equal(output.element('body').classList.contains('clock-warning'), false);
  output.advance(1); output.context.tick();
  assert.equal(output.element('body').classList.contains('clock-warning'), true);
  p.ckSet(49000, true); output.context.draw(p.snap(), true);
  assert.equal(output.element('body').classList.contains('clock-warning'), false);
});

test('existing Queen Cup qualifying and final rules stay compatible', () => {
  const { context: p } = operator();
  p.S.cfg = p.cfgOf({ mode: '3c', back: true, limit: 25, end: 'both', clk: 0, to: 0 });
  p.S.inn = 25; p.next(); p.next(); assert.equal(p.S.over.w, -2);
  p.newGame(); p.S.cfg = p.cfgOf({ mode: '3c', back: false, limit: 25, end: 'sd', clk: 0 });
  p.S.p[0].h = 10; p.S.p[0].s = 9; p.add(0, 1); assert.equal(p.S.over.w, 0);
  p.newGame(); p.S.inn = 25; p.next(); p.next(); assert.equal(p.S.sd, true);
  p.add(0, 1); assert.equal(p.S.over.w, 0);
});

test('standalone studio follows equalizing and capped-innings rules', () => {
  const env = studioMonitor(), p = env.context;
  env.element('queenPreset').onclick();
  p.S.h = [1, 1]; p.plus(0);
  assert.equal(p.S.over, -1); assert.equal(p.QC.status(p.queenState()).equalizing, true);
  p.next(); p.plus(1); assert.equal(p.S.over, 2);
  p.newGame(true); p.S.inn = 35; p.next(); p.next(); assert.equal(p.S.over, 2);
});

test('standalone studio EXT adds 40 seconds with a 30-second clock and undo restores it', () => {
  const env = studioMonitor(), p = env.context;
  env.element('queenPreset').onclick(); p.S.len = 30; p.S.left = 12;
  p.timeout(0, 1); assert.equal(p.S.left, 52); assert.equal(p.S.ext[0], 2);
  p.timeout(0, 1); assert.equal(p.S.left, 52);
  p.undo(); assert.equal(p.S.left, 12); assert.equal(p.S.ext[0], 0);
});

test('studio settings cannot restore spent EXT slots during the match', () => {
  const env = studioMonitor(), p = env.context;
  env.element('queenPreset').onclick(); p.timeout(0, 0);
  env.element('toSel').onclick({ target: { closest: () => ({ dataset: { v: '2' } }) } });
  assert.equal(p.S.to[0], 1); assert.equal(p.S.ext[0], 1);
});

test('admin issues the new mode separately from the existing qualifying and final presets', () => {
  const env = environment();
  const admin = read('static/apps/digital-lab-admin.html');
  vm.runInContext(section(admin, '  var QC = window.VibesQueenCup;', "  var C = null, pre = '';"), env.context);
  const presets = env.context.PRE;
  const queen = presets.find(preset => preset.id === 'w3c-queen');
  assert.equal(queen.c.preset, 'w3c-queen');
  assert.equal(queen.c.title, 'W3C PRE QUEEN CUP 2026');
  assert.equal(queen.c.h[0], 25); assert.equal(queen.c.to, 2);
  assert.equal(presets.find(preset => preset.id === 'queenL').c.h[0], 7);
  assert.equal(presets.find(preset => preset.id === 'queenF').c.h[0], 10);
});

test('matched studio is a remote viewer and never overwrites the operator score', () => {
  const sender = operator(), viewer = studioMonitor('match=test'), p = viewer.context;
  sender.context.add(0, 1); sender.clickExtension(0, 1);
  viewer.events.receive(sender.context.snap());
  assert.equal(viewer.events.role, 'remote');
  assert.equal(p.S.preset, 'w3c-queen'); assert.equal(p.S.sc[0], 1);
  assert.equal(p.S.to[0], 1); assert.equal(p.S.ext[0], 2);
  p.plus(0); p.next(); p.timeout(0, 0); p.undo();
  assert.equal(p.S.sc[0], 1); assert.equal(p.S.turn, 0); assert.equal(p.S.to[0], 1);
  const finished = sender.context.snap(); finished.over = { w: -2, why: 'limit' };
  viewer.events.receive(finished);
  assert.equal(viewer.element('wN').textContent, '両者負け');
});

test('a scoreless first visit cannot restore spent EXT through setup', () => {
  const env = operator(), p = env.context;
  env.clickExtension(0, 0);
  assert.equal(p.idle(), false);
  p.setupConfig = p.QC.preset();
  env.element('setupH0').value = '25'; env.element('setupH1').value = '25';
  env.element('setupLimit').value = '35'; env.element('setupClock').value = '40';
  p.applySetup();
  assert.equal(p.S.p[0].ext, 1); assert.equal(p.S.p[0].to, 1);
});

test('a running first shot blocks setup before the first point', () => {
  const { context: p } = operator();
  p.ckSet(40000, true);
  assert.equal(p.idle(), false);
});

test('studio preset cannot replenish EXT before the first point', () => {
  const env = studioMonitor(), p = env.context;
  env.element('queenPreset').onclick();
  p.timeout(0, 0);
  assert.equal(p.studioIdle(), false);
  env.element('queenPreset').onclick();
  assert.equal(p.S.to[0], 1); assert.equal(p.S.ext[0], 1);
});

test('manual turn correction preserves the equalizing last visit', () => {
  const { context: p } = operator();
  p.S.p[0].h = 1; p.add(0, 1); p.S.turn = 1; p.S.rep = false;
  p.next();
  assert.equal(p.S.over.w, 0); assert.equal(p.S.inn, 1);
  const env = studioMonitor(), s = env.context;
  env.element('queenPreset').onclick();
  s.S.h = [1, 1]; s.plus(0); s.S.turn = 1; s.S.rep = false;
  s.next();
  assert.equal(s.S.over, 0); assert.equal(s.S.inn, 1);
});

console.log(`${passed} W3C regression checks passed (${fileURLToPath(root)}).`);
