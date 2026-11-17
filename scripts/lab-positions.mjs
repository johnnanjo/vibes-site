/* VIBES 3C LAB: works out the position cards of the dictionary tab from data/3c-lab-shots.json. build.mjs imports pageData().
   Check: node scripts/lab-positions.mjs --check   (prints the route of every card and any warning)
   Each card is written as a shot (ball places, thickness, tip, how many cushions) and the path is then worked out here,
   so the picture always agrees with its own numbers: ball-to-ball deflection for a rolling / sliding cue ball, equal-angle
   cushions plus a sideways push from the english that fades at every cushion. The second object ball is placed on the path.
   It is a teaching model, not a measurement: real tables run longer or shorter (the page says so).
   Table units = diamonds: x 0-8 (left to right), y 0-4 (top to bottom). */
import fs from 'node:fs';
const R = 0.0866, X0 = R, X1 = 8 - R, Y0 = R, Y1 = 4 - R, K = 0.34, FADE = 0.55;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = (a) => Math.hypot(a[0], a[1]), unit = (a) => mul(a, 1 / (len(a) || 1));
const rot = (a, t) => [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t)], right = (f) => [-f[1], f[0]];
const NORM = { T: [0, 1], B: [0, -1], L: [1, 0], R: [-1, 0] }, JP = { T: '長', B: '長', L: '短', R: '短' };
function toRail(p, v) {
  const tx = v[0] > 0 ? (X1 - p[0]) / v[0] : v[0] < 0 ? (X0 - p[0]) / v[0] : Infinity, ty = v[1] > 0 ? (Y1 - p[1]) / v[1] : v[1] < 0 ? (Y0 - p[1]) / v[1] : Infinity;
  const t = Math.min(tx, ty), rail = tx < ty ? (v[0] > 0 ? 'R' : 'L') : (v[1] > 0 ? 'B' : 'T');
  return { q: add(p, mul(v, t)), rail, t };
}
function bounce(v, rail, st) {
  const N = NORM[rail], vn = dot(v, N), ref = sub(v, mul(N, 2 * vn)), push = mul(right(mul(N, -1)), st.om * K * Math.abs(vn));
  const along = sub(ref, mul(N, dot(ref, N))); st.run.push(Math.abs(st.om) < 0.05 ? 0 : Math.sign(dot(push, along)) || 0); st.om *= FADE;
  return unit(add(ref, push));
}
/* cue ball direction after it meets a ball: d = direction in, n = line of centres, tau = +1 rolling (follow) .. 0 sliding .. -1 draw */
function after(d, n, tau) { const vt = sub(d, mul(n, dot(d, n))), o = add(mul(vt, 5), mul(d, 2 * tau)); return len(o) < 1e-6 ? d : unit(o); }
export function shot(s) {
  const st = { om: s.om || 0, run: [] }, pre = [s.cue.slice()], post = [], rails = [], marks = [];
  let p = s.cue.slice(), v, o1, g, n, phi = Math.asin(1 - s.f);
  if (!s.kick) {
    o1 = s.o1; const d0 = unit(sub(o1, p)), dist = len(sub(o1, p)), b = (1 - s.f) * 2 * R, del = Math.asin(b / dist) * s.side;
    v = rot(d0, del); g = add(p, mul(v, dist * Math.cos(del) - Math.sqrt(4 * R * R - b * b))); n = unit(sub(o1, g));
  } else {
    v = unit(s.dir);
    for (let i = 0; i < s.kick; i++) { const h = toRail(p, v); p = h.q; pre.push(p); rails.push(h.rail); marks.push(p); v = bounce(v, h.rail, st); }
    g = add(p, mul(v, s.at)); n = rot(v, -s.side * phi); o1 = add(g, mul(n, 2 * R));
  }
  pre.push(g); const din = v, tau = s.tau == null ? 0.6 : s.tau; v = after(din, n, tau); p = g; post.push(g);
  const m = Math.min(1, Math.max(0.25, len(add(mul(sub(din, mul(n, dot(din, n))), 5), mul(din, 2 * tau))) / 7));
  for (let i = 0; i < s.n; i++) { const h = toRail(p, v); p = h.q; post.push(p); rails.push(h.rail); marks.push(p); v = bounce(v, h.rail, st); }
  const end = add(p, mul(v, s.end)), o2 = add(end, mul(v, 2 * R)); post.push(end);
  /* first object ball: leaves along the line of centres, its share of the speed is cos(phi) */
  const poly = (pts) => pts.slice(1).reduce((a, q, i) => a + len(sub(q, pts[i])), 0), Lpost = poly(post), Lall = poly(pre) + Lpost;
  const ob = [o1.slice()]; { let q = o1.slice(), w = n, left = Math.min(11, Math.cos(phi) / m * Lpost * 0.62); while (left > 0.05) { const h = toRail(q, w); if (h.t >= left) { ob.push(add(q, mul(w, left))); break; } q = h.q; ob.push(q); left -= h.t; left *= 0.7; w = sub(w, mul(NORM[h.rail], 2 * dot(w, NORM[h.rail]))); } }
  /* checks: balls on the bed, second ball not met early, no kiss between the two moving balls */
  const at = (pts, d) => { for (let i = 1; i < pts.length; i++) { const l = len(sub(pts[i], pts[i - 1])); if (d <= l) return add(pts[i - 1], mul(sub(pts[i], pts[i - 1]), d / (l || 1))); d -= l; } return pts[pts.length - 1]; };
  const seg = (a, b, c) => { const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(c, a), ab) / (dot(ab, ab) || 1))); return len(sub(add(a, mul(ab, t)), c)); };
  const warn = [], inb = (q) => q[0] >= X0 - 1e-6 && q[0] <= X1 + 1e-6 && q[1] >= Y0 - 1e-6 && q[1] <= Y1 + 1e-6;
  if (![s.cue, o1, o2].every(inb)) warn.push('ball off the bed');
  if (len(sub(o1, o2)) < 2.4 * R || len(sub(s.cue, o2)) < 2.4 * R || len(sub(s.cue, o1)) < 2.4 * R) warn.push('balls too close');
  const all = [...pre, ...post.slice(1)]; for (let i = 1; i < all.length - 1; i++) if (seg(all[i - 1], all[i], o2) < 2 * R + 0.02) warn.push('meets ball 2 early (leg ' + i + ')');
  if (s.kick) for (let i = 1; i < pre.length - 1; i++) if (seg(pre[i - 1], pre[i], o1) < 2 * R + 0.02) warn.push('meets ball 1 early');
  const Lob = poly(ob); let kiss = 9; for (let k = 1; k <= 400; k++) { const dC = Lpost * k / 400, tt = dC / m, dO = Math.min(Lob, tt * Math.cos(phi) * 0.8); if (dC < 0.5) continue; kiss = Math.min(kiss, len(sub(at(post, dC), at(ob, dO)))); }
  if (kiss < 2 * R + 0.03) warn.push('kiss ' + kiss.toFixed(2));
  if (s.kick ? false : rails.length < 3) warn.push('fewer than 3 cushions');
  return { o1, o2, pre, post, ob, rails, marks, run: st.run, Lall, kiss, warn, phi, tau, m };
}
const r2 = (q) => q.map((v) => Math.round(v * 1000) / 1000);
const FR = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1/1'];
export function describe(s, g) {
  const tips = Math.round(Math.abs(s.om || 0) * 3), lr = (s.om || 0) > 0 ? '右' : '左', first = g.run.find((x) => x) || 0;
  const ud = g.tau >= 0.9 ? '上' : g.tau >= 0.3 ? 'やや上' : g.tau > -0.2 ? '中心' : '下', x = (s.om || 0) * 0.62, y = -Math.max(-1, Math.min(1, g.tau)) * 0.62;
  let hour = Math.round(((Math.atan2(x, -y) * 180 / Math.PI + 360) % 360) / 30) || 12; const centre = Math.hypot(x, y) < 0.15;
  return {
    thick: FR[Math.round(s.f * 8)] + (s.f >= 0.99 ? '' : '（第1的球の' + (s.side > 0 ? '右' : '左') + '側）'),
    english: tips ? (first > 0 ? '順ヒネリ' : first < 0 ? '逆ヒネリ' : 'ヒネリ') + ' ' + tips + 'チップ（' + lr + '）' : 'ヒネリなし',
    tip: centre ? '中心' : ud + (tips ? '・' + lr + ' ' + tips + 'チップ（時計の' + hour + '時）' : '（時計の' + hour + '時）'),
    tipxy: [Math.round(x * 100) / 100, Math.round(y * 100) / 100],
    speed: g.Lall < 10 ? '弱' : g.Lall < 19 ? '中' : '強',
    route: (s.kick ? g.rails.slice(0, s.kick).map((k) => JP[k]).join('→') + '→第1的球→' + (g.rails.slice(s.kick).map((k) => JP[k]).join('→') + (g.rails.length > s.kick ? '→' : '')) : '第1的球→' + g.rails.map((k) => JP[k]).join('→') + '→') + '第2的球',
  };
}
/* what happens to this shot when the thickness is off by 1/16, and how close the two moving balls come: both are worked out, not written by hand */
function tendency(s, g) {
  const B = 2 * R, gap = g.kiss / B - 1, n1 = (v) => (Math.round(v * 2) / 2).toFixed(1).replace('.0', '');
  const kiss = gap < 2.5 ? '手球と第1的球は、いちばん近いところで球およそ' + n1(Math.max(0.5, gap)) + '個ぶんの間隔ですれ違います。強さが変わるとすれ違う場所もずれるため、強さを決めてから撞きます。' : '手球と第1的球の道は重なりません（いちばん近いところでも、球およそ' + Math.round(gap) + '個ぶん離れています）。';
  if (s.kick) return { kiss, miss: 'クッションに先に入れる球は、1クッション目の場所がずれると、第1的球への厚みも一緒に変わります。まず1クッション目を点で決めます。' };
  const off = (df) => { const f = Math.min(0.97, Math.max(0.03, s.f + df)); let h; try { h = shot({ ...s, f }); } catch (e) { return null; } if (h.rails.join('') !== g.rails.join('')) return 'route';
    const a = h.post[h.post.length - 2], b = h.post[h.post.length - 1], d = unit(sub(b, a)), w = sub(g.o2, a); return Math.abs(w[0] * d[1] - w[1] * d[0]) / B; };
  const say = (v, w) => v == null ? '' : v === 'route' ? w + 'ずれると、クッションに入る順番が変わってしまいます' : v < 0.95 ? w + 'ずれても当たります' : w + 'ずれると、第2的球から球およそ' + n1(v) + '個ぶん外れます';
  const tk = off(1 / 16), tn = off(-1 / 16), both = typeof tk === 'number' && typeof tn === 'number' && tk < 0.95 && tn < 0.95;
  return { kiss, miss: both ? '厚みが1/16 ずれても当たる、幅のある配置です。まず厚みを決めて、迷わず撞きます。' : '厚みが1/16 ' + say(tk, '厚く') + '。' + say(tn, '薄く') + '。' };
}
export const CARDS = JSON.parse(fs.readFileSync(new URL('../data/3c-lab-shots.json', import.meta.url), 'utf8'));
export function build() {
  return CARDS.cards.map((c, i) => { const g = shot(c.shot), d = describe(c.shot, g), t = tendency(c.shot, g); return { id: c.id, no: i + 1, name: c.name, cat: c.cat, level: c.level, pattern: c.pattern || '', lead: c.lead, system: c.system, notes: c.notes, ...d, kissNote: t.kiss, missNote: t.miss, cushions: g.rails.length, geo: { cue: r2(c.shot.cue), o1: r2(g.o1), o2: r2(g.o2), pre: g.pre.map(r2), post: g.post.map(r2), ob: g.ob.map(r2), marks: g.marks.map(r2) }, _rails: g.rails.join(''), _warn: g.warn, _L: g.Lall }; });
}
/* what the page needs (build.mjs puts this into /pages/3c-lab) */
export const pageData = () => ({ cats: CARDS.cats, levels: CARDS.levels, cards: build().map(({ _rails, _warn, _L, ...c }) => c) });
if (process.argv[1] && process.argv[1].endsWith('lab-positions.mjs')) {
  const out = build(); let bad = 0;
  for (const c of out) { if (c._warn.length) bad++; if (process.argv.includes('--check') || c._warn.length) console.log(String(c.no).padStart(2), c.id.padEnd(14), c._rails.padEnd(6), c.route, '|', c.thick, '|', c.english, '|', c.tip, '|', c.speed, c._L.toFixed(1), c._warn.length ? '  !! ' + c._warn.join('; ') : ''); }
  if (bad) process.exitCode = 1;
  console.log(out.length + ' cards, ' + bad + ' with warnings');
}
