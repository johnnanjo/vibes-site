import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { pageData } from './lab-positions.mjs';
import { matchesCard, viewFromHash, copyPositions, transformPositions, moveBall,
  rankConfigurations, samplePath, pathLength, makeDeck, tipZone, restoreProgress }
  from '../static/js/3c-lab-learning-core.mjs';

const { cards } = pageData();
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('OK ' + name); }
test('20枚すべてを元の配置で検索できる', () => {
  for (const card of cards) {
    const [match] = rankConfigurations(cards, copyPositions(card.geo));
    assert.equal(match.card.id, card.id); assert.equal(match.error, 0);
  }
});
test('反転・回転した配置も同じ登録カードに対応する', () => {
  for (const card of cards) for (const [x, y] of [[true, false], [false, true], [true, true]]) {
    const [match] = rankConfigurations(cards, transformPositions(card.geo, x, y));
    assert.equal(match.card.id, card.id); assert.ok(match.error < .000001);
  }
});
test('手球・的球の入れ替えを同じ配置とは判定しない', () => {
  const c = cards[0], pos = copyPositions(c.geo);
  [pos.cue, pos.o1] = [pos.o1, pos.cue];
  assert.ok(rankConfigurations([c], pos)[0].error > .1);
});
test('検索結果の上限と近い順', () => {
  const a = rankConfigurations(cards, { cue: [4, 2], o1: [1, 1], o2: [7, 3] }, 4);
  assert.equal(a.length, 4); assert.ok(a.every((x, i) => !i || x.error >= a[i - 1].error));
});
test('球は台内に収まり、重なり・無効な数字は保存しない', () => {
  const pos = { cue: [1, 1], o1: [2, 2], o2: [3, 3] };
  assert.deepEqual(moveBall(pos, 'cue', [-9, 20]).cue, [.14, 3.86]);
  assert.equal(moveBall(pos, 'cue', [2, 2]), null);
  assert.equal(moveBall(pos, 'cue', [NaN, 1]), null);
  assert.equal(moveBall(pos, 'bad', [1, 2]), null);
  assert.deepEqual(pos.cue, [1, 1]);
});
test('配置の番号は完全一致、全角検索・複数の語を扱える', () => {
  assert.ok(matchesCard(cards[7], '＃８'));
  assert.ok(!matchesCard(cards[17], '#8'));
  assert.ok(matchesCard(cards[7], '裏回し 初級'));
  assert.ok(!matchesCard(cards[7], '表回し 初級'));
});
test('既存のカード・取り口・理論・計算の深いリンクを維持する', () => {
  for (const h of ['#pos-ura-1', '#pat-3', '#l3-pos', '#cards']) assert.equal(viewFromHash(h), 'cards');
  assert.equal(viewFromHash('#sys-plus'), 'system');
  assert.equal(viewFromHash('#th-tip'), 'theory');
  assert.equal(viewFromHash('#practice-ura-1'), 'practice');
  assert.equal(viewFromHash(''), 'home');
});
test('折れ線の再生は接点・クッション・終点と一致する', () => {
  const p = [[0, 0], [4, 0], [4, 3]];
  assert.equal(pathLength(p), 7);
  assert.deepEqual(samplePath(p, 4 / 7), [4, 0]);
  assert.deepEqual(samplePath(p, 1), [4, 3]);
  assert.deepEqual(samplePath([[2, 2], [2, 2], [4, 2]], .5), [3, 2]);
  for (const c of cards) {
    const all = c.geo.pre.concat(c.geo.post.slice(1));
    assert.deepEqual(samplePath(all, 0), c.geo.cue);
    assert.deepEqual(samplePath(all, 1), all.at(-1));
  }
});
test('1巡の重複と、巡の境目で同じ問題が続くことを防ぐ', () => {
  const ids = cards.map((c) => c.id), deck = makeDeck(ids, ids[0], () => .999);
  assert.equal(deck.length, ids.length); assert.equal(new Set(deck).size, ids.length);
  assert.notEqual(deck[0], ids[0]);
  assert.deepEqual(makeDeck(['one'], 'one'), ['one']);
  assert.deepEqual(makeDeck([], null), []);
});
test('撞点クイズの9方向は登録の撞点座標から決まる', () => {
  assert.equal(tipZone([0, 0]), 'center');
  assert.equal(tipZone([.4, -.4]), 'up-right');
  assert.equal(tipZone([-.4, .4]), 'down-left');
  for (const c of cards) {
    if (c.tipxy[0] > .15) assert.ok(tipZone(c.tipxy).includes('right'));
    if (c.tipxy[0] < -.15) assert.ok(tipZone(c.tipxy).includes('left'));
  }
});
test('学習記録は重複・消えた配置・不正な得点を除いて復元する', () => {
  const valid = cards.map((c) => c.id), id = valid[0];
  assert.deepEqual(restoreProgress({ v: 1, reviewed: [id, id, 'missing'], attempts: 2, correct: 9 }, valid),
    { v: 1, reviewed: [id], attempts: 2, correct: 2 });
  assert.deepEqual(restoreProgress({ v: 1, reviewed: null, attempts: -1, correct: Infinity }, valid),
    { v: 1, reviewed: [], attempts: 0, correct: 0 });
});
test('非同期のダイアログ終了で再生リンクや次のカードを上書きしない', () => {
  const html = fs.readFileSync(new URL('../static/apps/3c-lab.html', import.meta.url), 'utf8');
  const start = html.indexOf("$('pc-d').addEventListener('close', ");
  const source = html.slice(start, html.indexOf("  window.addEventListener('vibes:3c-open'", start));
  let closeHandler;
  const context = { cur: { id: 'omote-1' }, location: { hash: '#pos-omote-1' },
    $: () => ({ addEventListener: (event, fn) => { closeHandler = fn; } }) };
  context.history = { replaceState: (_a, _b, hash) => { context.location.hash = hash; } };
  vm.runInNewContext(source, context);
  closeHandler.call({ open: false });
  assert.equal(context.location.hash, '#cards'); assert.equal(context.cur, null);
  context.location.hash = '#practice-omote-1';
  closeHandler.call({ open: false });
  assert.equal(context.location.hash, '#practice-omote-1');
  context.cur = { id: 'ura-1' }; context.location.hash = '#pos-ura-1';
  closeHandler.call({ open: true });
  assert.equal(context.location.hash, '#pos-ura-1'); assert.equal(context.cur.id, 'ura-1');
});
test('公開ページは外部素材・外部APIなしで拡張できる', () => {
  const html = fs.readFileSync(new URL('../static/apps/3c-lab.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../static/js/3c-lab-learning.mjs', import.meta.url), 'utf8');
  assert.match(html, /type="module" src="\/js\/3c-lab-learning\.mjs"/);
  assert.ok(!/fetch\s*\(|XMLHttpRequest|https?:\/\//.test(js));
  assert.match(html, /vibes-3c-fav/);
  assert.match(html, /id="pc-data">__POS__/);
  assert.match(html, /id="l3-legacy"/);
});
console.log(passed + ' learning checks passed');
