/* Exercise shipped voice calls with a fake speech engine; no audio service or player data. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('../static/apps/' + name, import.meta.url), 'utf8');
const carom = read('count-3c.html'), remote = read('count-remote.html');
function fn(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, name + ' must exist');
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unclosed function ' + name);
}
const voices = [
  { name: 'Microsoft Zira', lang: 'en-US', localService: true },
  { name: 'Microsoft David', lang: 'en-US', localService: true },
  { name: 'Microsoft Haruka', lang: 'ja-JP', localService: true }
];
function engine(source, available = voices) {
  const spoken = [], storage = new Map(); let cancelled = 0;
  const ss = { speaking: false, pending: false, getVoices: () => available,
    speak: u => spoken.push(u), cancel: () => cancelled++ };
  const ctx = vm.createContext({ window: { speechSynthesis: ss },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; this.rate = 1; this.pitch = 1; } },
    S: { cfg: { voice: 1, vdev: 'both', clang: 'ja', cvo: 'calm', n: ['GUEST 1', 'GUEST 2'], g: [100, 100] },
      sc: [0, 0], run: 1, turn: 0, inn: [[], []], over: false },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    location: { search: '?n=again', pathname: '/pages/count-3c/' }, history: { replaceState() {} },
    def: cfg => ({ cfg }), isDefName: n => /^PLAYER/.test(n), hist: []
  });
  const start = source.indexOf('  var VL =');
  const end = source.indexOf('  try { if (window.speechSynthesis)', start);
  assert(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end) + fn(source, 'voiceMode') + fn(source, 'vSpeak'), ctx);
  return { ctx, spoken, ss, storage, cancelled: () => cancelled };
}
let passed = 0;
function test(name, run) { run(); console.log('ok ' + (++passed) + ' - ' + name); }
for (const file of ['count-3c.html', 'count-pocket.html', 'count-remote.html']) {
  const src = read(file);
  test(file + ': English female and male are slow; calm stays female', () => {
    const { ctx: c, spoken: out } = engine(src);
    c.vSpeak('two points', 'en', 'f'); c.vSpeak('two points', 'en', 'm'); c.vSpeak('two points', 'en', 'calm');
    assert.deepEqual(out.map(x => x.rate), [.8, .8, .8]);
    assert.equal(out[0].voice.name, 'Microsoft Zira'); assert.equal(out[1].voice.name, 'Microsoft David');
    assert.equal(out[2].voice.name, 'Microsoft Zira'); assert.equal(out[2].pitch, .92);
  });
  test(file + ': Japanese calm is slow; ordinary female stays unchanged', () => {
    const { ctx: c, spoken: out } = engine(src);
    c.vSpeak('ひとつ', 'ja', 'calm'); c.vSpeak('ひとつ', 'ja', 'f');
    assert.equal(out[0].lang, 'ja-JP'); assert.equal(out[0].rate, .8); assert.equal(out[0].pitch, .92);
    assert.equal(out[1].rate, 1); assert.equal(out[1].pitch, 1);
  });
  test(file + ': missing language uses slow English fallback and interrupts stale calls', () => {
    const e = engine(src, voices.slice(0, 2)); e.ss.pending = true;
    e.ctx.vSpeak('ひとつ', 'ja', 'calm', 'one point');
    assert.equal(e.spoken[0].text, 'one point'); assert.equal(e.spoken[0].lang, 'en-US');
    assert.equal(e.spoken[0].rate, .8); assert.equal(e.cancelled(), 1);
  });
}
const counter = ['ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とぉー', 'じゅういち'];
function scoring(e, source = carom) {
  const nw = source.match(/^  var NW = function.*$/m); assert(nw);
  vm.runInContext(fn(source, 'countJa') + nw[0], e.ctx);
  return e;
}
test('1–11 spoken runs use the requested Japanese counters through the real callOut path', () => {
  const e = scoring(engine(carom));
  vm.runInContext(fn(carom, 'callText') + "var cl=function(){return S.cfg.clang;};" + fn(carom, 'speak') + fn(carom, 'callOut'), e.ctx);
  for (let n = 1; n <= 11; n++) { e.ctx.S.run = n; e.ctx.callOut(); }
  assert.deepEqual(e.spoken.map(x => x.text), counter);
  assert(e.spoken.every(x => x.lang === 'ja-JP' && x.rate === .8));
  assert.equal(e.ctx.callText(11, 2, 'ja'), 'じゅういち、あとふたつ');
  assert.equal(e.ctx.callText(2, 1, 'en'), 'two points, one more');
  e.ctx.S.cfg.voice = 0; e.ctx.callOut(); assert.equal(e.spoken.length, 11);
  e.ctx.S.cfg.voice = 1; e.ctx.S.cfg.vdev = 'tab'; e.ctx.callOut(); assert.equal(e.spoken.length, 11);
});
test('12 and higher return to ordinary Japanese numbers, including hundreds', () => {
  const { ctx: c } = scoring(engine(carom));
  for (const [n, text] of [[12, 'じゅうに'], [20, 'にじゅう'], [21, 'にじゅういち'], [99, 'きゅうじゅうきゅう'], [100, 'ひゃく'], [101, 'ひゃくいち'], [110, 'ひゃくじゅう'], [300, 'さんびゃく'], [600, 'ろっぴゃく'], [800, 'はっぴゃく']]) assert.equal(c.countJa(n), text);
});
test('turn-completion Japanese totals use the same counter; ten-second warning is unchanged', () => {
  const e = scoring(engine(carom)); const start = carom.indexOf('  var GOT ='); const end = carom.indexOf('  var gotText', start);
  vm.runInContext(carom.slice(start, end), e.ctx);
  assert.equal(e.ctx.GOT.ja(0), 'なし'); assert.equal(e.ctx.GOT.ja(10), 'とぉー'); assert.equal(e.ctx.GOT.ja(11), 'じゅういち');
  assert(carom.includes("ja: '残り10秒'"));
});
for (const file of ['count-3c.html', 'count-pocket.html']) test(file + ': calm preference survives save and next-game loading', () => {
  const src = read(file), e = engine(src);
  const vars = src.match(/^  var PFK = .*$/m); assert(vars);
  vm.runInContext(vars[0] + fn(src, 'prefSave') + fn(src, 'menuInit'), e.ctx);
  e.ctx.prefSave(); assert.equal(JSON.parse(e.storage.get('vibes-count-prefs')).cvo, 'calm');
  e.ctx.S.cfg.cvo = 'f'; e.ctx.menuInit(); assert.equal(e.ctx.S.cfg.cvo, 'calm');
});
test('remote fallback honors Japanese ten / eleven, calm voice and monitor-only output', () => {
  const e = scoring(engine(remote), remote);
  vm.runInContext(fn(remote, 'phoneSay'), e.ctx);
  e.ctx.last = { voice: 1, sc: [0, 0], g: [100, 100], turn: 0, run: 9, clang: 'ja', cvo: 'calm' };
  e.ctx.phoneSay(); e.ctx.last.run = 10; e.ctx.phoneSay();
  assert.deepEqual(e.spoken.map(x => x.text), ['とぉー', 'じゅういち']);
  assert(e.spoken.every(x => x.lang === 'ja-JP' && x.rate === .8 && x.voice.name === 'Microsoft Haruka'));
  e.ctx.last.vdev = 'pc'; e.ctx.last.va = true; e.ctx.phoneSay(); assert.equal(e.spoken.length, 2);
});
test('monitor preview and remote configuration offer calm without relabeling it as a character voice', () => {
  const e = engine(carom); vm.runInContext(fn(carom, 'cfSchema'), e.ctx);
  const field = e.ctx.cfSchema().find(x => x.k === 'cvo'); assert(field.o.some(x => x[0] === 'calm')); assert.equal(field.v, 'calm');
  assert(carom.includes('id="bVoiceTest"')); assert(carom.includes('端末の女性音声を低め・ゆっくりに調整'));
  const home = read('count-home.html'); assert(home.includes("['calm', '落ち着いた女性']"));
  assert(home.includes('/^(f|m|calm)$/'));
});
test('home settings save the calm preset without coercing it back to standard female', () => {
  const home = read('count-home.html'), stored = new Map();
  const c = vm.createContext({ PFK: 'vibes-count-prefs', lv: 'top', cfGet: () => ({}),
    shopGet: () => '', vdevGet: () => 'both', strGet: (k, pattern, fallback) => fallback,
    menu() {}, shopDraw() {}, localStorage: { setItem: (k, v) => stored.set(k, v) } });
  vm.runInContext(fn(home, 'cfSchema') + fn(home, 'cfSave'), c);
  c.cfSave({ cvo: 'calm', clang: 'ja' });
  const saved = JSON.parse(stored.get('vibes-count-prefs'));
  assert.equal(saved.cvo, 'calm'); assert.equal(saved.clang, 'ja');
});
console.log(passed + ' voice integration checks passed. Actual OS voices require listening on the target device.');
