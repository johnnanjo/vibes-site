/* Record real match transitions against asynchronous camera/file doubles. No cameras, permissions or network required. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const shared = fs.readFileSync(new URL('../static/js/match-recorder.js', import.meta.url), 'utf8');
const board = fs.readFileSync(new URL('../static/apps/count-3c.html', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function section(text, from, to) { const a = text.indexOf(from), b = text.indexOf(to, a); assert(a >= 0 && b > a, from); return text.slice(a, b); }

function fixture({ unsupported = false, cancel = false, refuse = false, writeFailure = false, closeFailure = false, slowOpen, slowClose, codecFailure = false, startFailure = false } = {}) {
  let now = 100000, clonesStopped = 0, cameraStopped = 0, writeCalls = 0;
  const instances = [], files = new Map(), saved = [], states = [];
  const camera = { readyState: 'live', stop() { cameraStopped++; this.readyState = 'ended'; }, clone() {
    return { readyState: 'live', stop() { clonesStopped++; this.readyState = 'ended'; } };
  } };
  class Stream { constructor(tracks) { this.tracks = tracks; } getVideoTracks() { return this.tracks; } }
  class Recorder {
    static isTypeSupported(type) { return !codecFailure && type.includes('webm'); }
    constructor(stream, options) { this.state = 'inactive'; this.stream = stream; this.mimeType = options.mimeType || 'video/webm'; instances.push(this); }
    start(ms) { if (startFailure) throw new Error('start'); this.timeslice = ms; this.state = 'recording'; }
    data(value) { this.ondataavailable({ data: new Blob([value], { type: 'video/webm' }) }); }
    stop() { assert.equal(this.state, 'recording'); this.state = 'inactive'; queueMicrotask(() => { this.data('final'); this.onstop(); }); }
    ended() { this.state = 'inactive'; queueMicrotask(() => { this.data('ended'); this.onstop(); }); }
  }
  const folder = { name: 'テスト用動画', async queryPermission() { return refuse ? 'denied' : 'granted'; }, async getFileHandle(name, options) {
    if (!options?.create) { if (files.has(name)) return files.get(name); throw Object.assign(new Error(), { name: 'NotFoundError' }); }
    const file = { name, chunks: [], closed: false, async createWritable() {
      if (slowOpen) await slowOpen.promise;
      return { async write(blob) { writeCalls++; if (writeFailure) throw new Error('disk full'); file.chunks.push(await blob.text()); }, async close() {
        if (slowClose) await slowClose.promise; if (closeFailure) throw new Error('close failed'); file.closed = true;
      } };
    } }; files.set(name, file); return file;
  } };
  const context = vm.createContext({ window: {}, Date, Math, Promise, Object });
  vm.runInContext(shared, context);
  const api = context.window.VibesMatchRecorder;
  const recorder = api.create({ MediaRecorder: unsupported ? null : Recorder, MediaStream: Stream,
    now: () => now, chooseDirectory: async () => { if (cancel) throw Object.assign(new Error(), { name: 'AbortError' }); return folder; },
    onChange: state => states.push(state), onSaved: file => saved.push(file) });
  const stream = new Stream([camera]);
  const game = (id = 'game-1', active = true, overrides = {}) => ({ id, active, finished: !active, stream, table: 1, ...overrides });
  async function settle() { for (let i = 0; i < 5; i++) { await tick(); await recorder.settled(); } }
  return { api, recorder, Recorder, Stream, instances, files, saved, states, camera, stream, game, settle,
    advance(ms) { now += ms; }, counts: () => ({ clonesStopped, cameraStopped, writeCalls }) };
}

let passed = 0;
async function test(name, run) { await run(); passed++; console.log(`ok ${passed} - ${name}`); }

await test('arming does not record the selection/ready screen', async () => {
  const f = fixture(); await f.recorder.update(f.game('ready', false, { finished: false })); await f.recorder.arm();
  assert.equal(f.instances.length, 0); assert.equal(f.recorder.info().phase, 'waiting');
});

await test('game starts one recorder, streams chunks to disk, and closes only after the final chunk', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game());
  assert.equal(f.recorder.info().phase, 'recording'); assert.equal(f.instances[0].timeslice, 2000);
  f.instances[0].data('first'); await tick(); assert.equal(f.counts().writeCalls, 1);
  await f.recorder.update(f.game('game-1', false)); await f.settle();
  assert.equal(f.saved.length, 1); const file = f.files.get(f.saved[0].name);
  assert.deepEqual(file.chunks, ['first', 'final']); assert(file.closed); assert.equal(f.saved[0].partial, false);
  assert.equal(f.counts().cameraStopped, 0); assert.equal(f.counts().clonesStopped, 1);
});

await test('clock updates and a game pause do not split a recording', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game());
  for (let i = 0; i < 20; i++) await f.recorder.update(f.game());
  f.advance(12000); assert.equal(f.recorder.info().seconds, 12); assert.equal(f.instances.length, 1);
  await f.recorder.disable(); await f.settle();
});

await test('a second game gets a separate file without another directory picker', async () => {
  const f = fixture(); await f.recorder.arm();
  await f.recorder.update(f.game()); await f.recorder.update(f.game('game-1', false)); await f.settle();
  await f.recorder.update(f.game('game-2')); await f.recorder.update(f.game('game-2', false)); await f.settle();
  assert.equal(f.saved.length, 2); assert.notEqual(f.saved[0].name, f.saved[1].name); assert.equal(f.recorder.info().enabled, true);
});

await test('slow file opening cannot start recording after the game already ended', async () => {
  const open = deferred(), f = fixture({ slowOpen: open }); await f.recorder.arm();
  const first = f.recorder.update(f.game()); await tick(); const end = f.recorder.update(f.game('game-1', false));
  open.resolve(); await first; await end; await f.settle();
  assert.equal(f.instances.length, 0); assert.equal(f.saved.length, 0); assert.equal(f.recorder.info().busy, false);
});

await test('a new game waits for the prior file to finish closing', async () => {
  const close = deferred(), f = fixture({ slowClose: close }); await f.recorder.arm(); await f.recorder.update(f.game());
  const stop = f.recorder.update(f.game('game-1', false)); await tick(); const next = f.recorder.update(f.game('game-2'));
  assert.equal(f.instances.length, 1); close.resolve(); await stop; await next; await f.settle();
  assert.equal(f.instances.length, 2); assert.equal(f.saved.length, 1);
  await f.recorder.disable(); await f.settle();
});

await test('cancelling the folder picker leaves automatic recording off', async () => {
  const f = fixture({ cancel: true }); assert.equal(await f.recorder.arm(), false); await f.recorder.update(f.game());
  assert.equal(f.instances.length, 0); assert.equal(f.recorder.info().enabled, false);
});

await test('denied write permission is visible and does not start recording', async () => {
  const f = fixture({ refuse: true }); assert.equal(await f.recorder.arm(), false); assert.equal(f.recorder.info().phase, 'error');
  assert.equal(f.instances.length, 0);
});

await test('unsupported browsers do not disturb scoring or pretend to be armed', async () => {
  const f = fixture({ unsupported: true }); assert.equal(await f.recorder.arm(), false); assert.equal(f.recorder.info().supported, false);
  assert.equal(f.recorder.info().phase, 'error');
});

await test('disk errors stop recording, leave the live camera alone, and never report success', async () => {
  const f = fixture({ writeFailure: true }); await f.recorder.arm(); await f.recorder.update(f.game());
  f.instances[0].data('chunk'); await f.settle();
  assert.equal(f.recorder.info().phase, 'error'); assert.equal(f.recorder.info().enabled, false);
  assert.equal(f.saved.length, 0); assert.equal(f.counts().cameraStopped, 0);
});

await test('failed final close is an error, not a saved game', async () => {
  const f = fixture({ closeFailure: true }); await f.recorder.arm(); await f.recorder.update(f.game());
  await f.recorder.update(f.game('game-1', false)); await f.settle();
  assert.equal(f.saved.length, 0); assert.equal(f.recorder.info().phase, 'error');
});

await test('encoder startup failure releases the file and does not deadlock later updates', async () => {
  const f = fixture({ startFailure: true }); await f.recorder.arm(); await f.recorder.update(f.game()); await f.settle();
  assert.equal(f.recorder.info().phase, 'error'); assert.equal(f.recorder.info().busy, false);
});

await test('missing camera waits, then records only after a live track arrives', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game('game-1', true, { stream: null }));
  assert.equal(f.instances.length, 0); assert.match(f.recorder.info().message, /カメラ/);
  await f.recorder.update(f.game()); assert.equal(f.instances.length, 1);
  await f.recorder.disable(); await f.settle();
});

await test('camera replacement closes an incomplete clip and continues with the new camera', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game());
  const track = { readyState: 'live' }, stream = new f.Stream([track]);
  await f.recorder.update(f.game('game-1', true, { stream })); await f.settle();
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].partial, true); assert.equal(f.instances.length, 2);
  await f.recorder.update(f.game('game-1', false, { stream })); await f.settle(); assert.equal(f.saved[1].partial, true);
});

await test('camera disconnect still saves its final chunk when the encoder is already inactive', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game());
  f.camera.readyState = 'ended'; f.instances[0].ended();
  await f.recorder.update(f.game('game-1', true, { stream: null })); await f.settle();
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].partial, true);
  assert.deepEqual(f.files.get(f.saved[0].name).chunks, ['ended']); assert.equal(f.instances.length, 1);
});

await test('an ended source is detected even when its recording clone and encoder remain live', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game());
  f.camera.stop(); assert.equal(f.instances[0].state, 'recording');
  await f.recorder.update(f.game()); await f.settle();
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].partial, true); assert.equal(f.recorder.info().busy, false);
  assert.match(f.recorder.info().message, /カメラ/);
  const stream = new f.Stream([{ readyState: 'live' }]);
  await f.recorder.update(f.game('game-1', true, { stream })); assert.equal(f.instances.length, 2);
  await f.recorder.update(f.game('game-1', false, { stream })); await f.settle(); assert.equal(f.saved[1].partial, true);
});

await test('unexpected encoder stop cannot create an endless series of empty recordings', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game()); f.instances[0].ended(); await f.settle();
  for (let i = 0; i < 5; i++) await f.recorder.update(f.game());
  assert.equal(f.instances.length, 1); assert.match(f.recorder.info().message, /カメラ/);
});

await test('manually disabling saves an incomplete clip and never stops the display camera', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game()); await f.recorder.disable(); await f.settle();
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].partial, true); assert.equal(f.recorder.info().enabled, false);
  assert.equal(f.counts().cameraStopped, 0);
});

await test('joining a match late is labelled as a partial recording', async () => {
  const f = fixture(); await f.recorder.arm(); await f.recorder.update(f.game('game-1', true, { startedAt: 90000 }));
  await f.recorder.update(f.game('game-1', false)); await f.settle(); assert.equal(f.saved[0].partial, true);
});

function matchLogic(f) {
  let now = 100000;
  const context = vm.createContext({ Date: class extends Date { static now() { return now; } }, Math, Object,
    KEY: 'test', localStorage: { getItem() { return null; } }, MIR: false,
    tStop() {}, showWin() {}, rmPush() {}, rdDraw() {}, drawTime() {}, drawTimer() {}, save() {},
    chime() {}, cl() { return 'ja'; }, gotSay() {}, winSay() {}, tKick() {}, beep() {},
    setTimeout() {}, toast() {}, pzDraw() {}, pzClock: 0, hist: [],
    $() { return { hidden: true }; } });
  vm.runInContext(section(board, '  var PCOL =', '  var RK ='), context);
  context.matchRecSync = () => f.recorder.update(f.api.gameOf(context.S, f.stream, false));
  context.render = () => context.matchRecSync();
  vm.runInContext(section(board, '  var begin =', '  function render()'), context);
  vm.runInContext(section(board, '  function rdStart()', '  function gtText()'), context);
  vm.runInContext(section(board, '  function finish()', '  var GOT ='), context);
  vm.runInContext(section(board, '  function newGame(keep)', '  function showWin()'), context);
  vm.runInContext(section(board, '  function pzOn()', '  function pzDraw()'), context);
  context.snap = () => context.hist.push(JSON.stringify(context.S));
  context.S.cfg.voice = 0; context.S.cfg.g = [1, 1]; context.S.cfg.n = ['選手A', '選手B']; context.S.ready = true;
  return { context, advance(ms) { now += ms; } };
}

await test('the real match-start button starts recording before the first point', async () => {
  const f = fixture(), { context: c } = matchLogic(f); await f.recorder.arm();
  c.matchRecSync(); await f.settle(); assert.equal(f.instances.length, 0);
  c.rdStart(); await f.settle(); assert.equal(f.instances.length, 1); assert.equal(c.S.run, 0);
  await f.recorder.disable(); await f.settle();
});

await test('the real equalizing-inning rule keeps recording until the second player finishes', async () => {
  const f = fixture(), { context: c } = matchLogic(f); await f.recorder.arm(); c.rdStart(); await f.settle();
  c.S.run = 1; c.commit(); await f.settle(); assert.equal(c.S.over, false); assert.equal(f.saved.length, 0);
  c.S.run = 1; c.commit(); await f.settle(); assert.equal(c.S.over, true); assert.equal(f.saved.length, 1);
});

await test('the real inning-limit finish also closes the automatic recording', async () => {
  const f = fixture(), { context: c } = matchLogic(f); c.S.cfg.lim = 1;
  await f.recorder.arm(); c.rdStart(); await f.settle(); c.commit(); c.commit(); await f.settle();
  assert.equal(c.S.over, true); assert.equal(f.saved.length, 1);
});

await test('the real pause changes the elapsed clock without changing the recording identity', async () => {
  const f = fixture(), logic = matchLogic(f), c = logic.context; await f.recorder.arm(); c.rdStart(); await f.settle();
  const id = c.S.recordId; c.pzOn(); logic.advance(30000); c.pzOff(); await f.settle();
  assert.equal(c.S.recordId, id); assert.equal(c.S.t0, 130000); assert.equal(f.instances.length, 1);
  await f.recorder.disable(); await f.settle();
});

await test('new-game resets create a fresh identity and save the old partial game', async () => {
  const f = fixture(), { context: c } = matchLogic(f); await f.recorder.arm(); c.rdStart(); await f.settle();
  const id = c.S.recordId; c.newGame(true); await f.settle(); assert.notEqual(c.S.recordId, id);
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].partial, true); assert.equal(f.instances.length, 1);
});

await test('a tablet mirror is never a recording owner', async () => {
  const f = fixture(); await f.recorder.arm();
  await f.recorder.update(f.api.gameOf({ recordId: 'mirror', t0: 1, ready: false, over: false }, f.stream, true));
  assert.equal(f.instances.length, 0);
});

console.log(`passed ${passed} automatic recording checks`);
