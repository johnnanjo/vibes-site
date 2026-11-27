/* Pure helpers for 3C LAB. Existing shot geometry and system formulas are unchanged. */
export const VIEWS = ['home', 'search', 'cards', 'practice', 'quiz', 'theory', 'system', 'notebook'];
export const TIP_ZONES = [
  ['up-left', '左上'], ['up', '上'], ['up-right', '右上'],
  ['left', '左'], ['center', '中心'], ['right', '右'],
  ['down-left', '左下'], ['down', '下'], ['down-right', '右下']
];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const normalise = (s) => String(s ?? '').normalize('NFKC').toLocaleLowerCase().trim();
export function matchesCard(card, query) {
  const q = normalise(query);
  if (!q) return true;
  if (/^#?\d+$/.test(q)) return card.no === Number(q.replace('#', ''));
  const text = normalise([card.name, card.pattern, card.cat, card.level, card.lead,
    card.system, card.tip, card.english, ...(card.notes || [])].join(' '));
  return q.split(/\s+/).every((word) => text.includes(word));
}
export function viewFromHash(hash) {
  const h = String(hash || '').replace(/^#/, '');
  if (/^(system|sys-)/.test(h)) return 'system';
  if (/^(theory|th-)/.test(h)) return 'theory';
  if (/^(pos-|pat-|l3-pos|l3-pat)/.test(h)) return 'cards';
  if (/^practice-/.test(h)) return 'practice';
  return VIEWS.includes(h) ? h : 'home';
}
export function copyPositions(geo) {
  return { cue: geo.cue.slice(), o1: geo.o1.slice(), o2: geo.o2.slice() };
}
export function transformPoint(point, flipX = false, flipY = false) {
  return [flipX ? 8 - point[0] : point[0], flipY ? 4 - point[1] : point[1]]
    .map((n) => Math.round(n * 1000000) / 1000000);
}
export function transformPositions(positions, flipX = false, flipY = false) {
  return Object.fromEntries(['cue', 'o1', 'o2'].map((key) =>
    [key, transformPoint(positions[key], flipX, flipY)]));
}
export function moveBall(positions, key, point) {
  if (!['cue', 'o1', 'o2'].includes(key) || !point.every(Number.isFinite)) return null;
  const next = point.map((n, i) => Math.round(clamp(n, .14, i ? 3.86 : 7.86) * 100) / 100);
  if (['cue', 'o1', 'o2'].some((other) => other !== key &&
    Math.hypot(next[0] - positions[other][0], next[1] - positions[other][1]) < .28)) return null;
  return { ...positions, [key]: next };
}
export function rankConfigurations(cards, positions, limit = 6) {
  const transforms = [[false, false, '元の向き'], [true, false, '左右反転'],
    [false, true, '上下反転'], [true, true, '180度回転']];
  return cards.map((card) => {
    let best;
    for (const [flipX, flipY, orientation] of transforms) {
      const points = transformPositions(card.geo, flipX, flipY);
      const error = Math.sqrt(['cue', 'o1', 'o2'].reduce((sum, key) => sum +
        (positions[key][0] - points[key][0]) ** 2 + (positions[key][1] - points[key][1]) ** 2, 0) / 3);
      if (!best || error < best.error) best = { card, error, flipX, flipY, orientation };
    }
    return best;
  }).sort((a, b) => a.error - b.error || a.card.no - b.card.no).slice(0, limit);
}
export function pathLength(points) {
  return points.slice(1).reduce((sum, q, i) =>
    sum + Math.hypot(q[0] - points[i][0], q[1] - points[i][1]), 0);
}
export function samplePath(points, fraction) {
  if (!points.length) return [0, 0];
  if (fraction <= 0) return points[0].slice();
  if (fraction >= 1) return points[points.length - 1].slice();
  let distance = pathLength(points) * clamp(fraction, 0, 1);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length && distance <= length) return a.map((v, j) => v + (b[j] - v) * distance / length);
    distance -= length;
  }
  return points[points.length - 1].slice();
}
export function makeDeck(ids, previous, random = Math.random) {
  const deck = [...new Set(ids)];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(clamp(random(), 0, .999999999) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (deck.length > 1 && deck[0] === previous) [deck[0], deck[1]] = [deck[1], deck[0]];
  return deck;
}
export function tipZone(xy) {
  const x = xy[0] < -.15 ? 'left' : xy[0] > .15 ? 'right' : '';
  const y = xy[1] < -.15 ? 'up' : xy[1] > .15 ? 'down' : '';
  return [y, x].filter(Boolean).join('-') || 'center';
}
export function restoreProgress(value, validIds) {
  const known = new Set(validIds);
  const ids = (v) => Array.isArray(v) ? [...new Set(v.filter((id) => known.has(id)))] : [];
  const number = (v) => Number.isSafeInteger(v) && v >= 0 ? Math.min(v, 10000000) : 0;
  const raw = value && typeof value === 'object' && value.v === 1 ? value : {};
  const attempts = number(raw.attempts), correct = Math.min(attempts, number(raw.correct));
  return { v: 1, reviewed: ids(raw.reviewed), attempts, correct };
}
