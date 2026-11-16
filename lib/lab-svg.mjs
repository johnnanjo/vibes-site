/* VIBES 3C LAB: trajectory diagrams for the pattern dictionary (inline SVG, drawn at build time).
   Play area = 400 x 200 (2:1), origin top-left; top/bottom = long cushions, left/right = short cushions.
   Each shot: w = cue ball start, c = cue ball centre when it meets the first object ball, d = direction after that,
   n = cushions, e = distance travelled after the last cushion (the second object ball sits there).
   Cushion bounces use equal angles; these are schematic (spin changes real angles). */
const R = 6, X0 = R, X1 = 400 - R, Y0 = R, Y1 = 200 - R, O = 12;
const unit = ([x, y]) => { const l = Math.hypot(x, y); return [x / l, y / l]; };
function run(p, d, n, e) {
  const pts = [p]; let [x, y] = p, [dx, dy] = unit(d);
  for (let i = 0; i < n; i++) {
    const tx = dx > 0 ? (X1 - x) / dx : dx < 0 ? (X0 - x) / dx : Infinity, ty = dy > 0 ? (Y1 - y) / dy : dy < 0 ? (Y0 - y) / dy : Infinity, t = Math.min(tx, ty);
    x += dx * t; y += dy * t; if (tx < ty) dx = -dx; else dy = -dy; pts.push([x, y]);
  }
  pts.push([x + dx * e, y + dy * e]); return { pts, dir: [dx, dy] };
}
const SHOTS = {
  'PAT-01': { w: [196, 150], c: [110, 120], d: [-1, -0.3], n: 3, e: 150 },
  'PAT-02': { w: [360, 130], c: [250, 110], d: [-1, -0.6], n: 3, e: 70 },
  'PAT-03': { w: [40, 30], c: [90, 90], d: [0.45, 1], n: 3, e: 90 },
  'PAT-04': { w: [110, 95], c: [220, 120], d: [1, -0.75], n: 3, e: 80 },
  'PAT-06': { w: [200, 180], c: [270, 150], d: [0.5, -1], n: 3, e: 50 },
  'PAT-07': { kick: true, w: [110, 150], d: [1, -0.8], n: 3, e: 80, d2: [0.3, -1], e2: 36 },
  'PAT-09': { w: [150, 80], c: [246, 24], y: [258, 22], via: [[243, 6], [6, 110]], d: [1, 0.45], n: 1, e: 110 },
  'PAT-11': { w: [80, 150], c: [150, 115], curve: [[196, 112], [290, 6]], d: [1, 0.9], n: 2, e: 90 },
};
const f = (v) => Math.round(v * 10) / 10, P = ([x, y]) => `${f(x + O)},${f(y + O)}`;
const ball = (p, c) => `<circle cx="${f(p[0] + O)}" cy="${f(p[1] + O)}" r="${R}" fill="${c}"/>`;
const arrow = (a, b, k = 0.5) => { const m = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], g = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; return Math.hypot(b[0] - a[0], b[1] - a[1]) < 46 ? '' : `<path d="M-5,-4.5 L5,0 L-5,4.5 Z" fill="#38BDF8" transform="translate(${f(m[0] + O)} ${f(m[1] + O)}) rotate(${f(g)})"/>`; };
const num = (p, i) => { const x = Math.min(Math.max(p[0], 10), 390) + O, y = Math.min(Math.max(p[1], 10), 190) + O; return `<circle cx="${f(x)}" cy="${f(y)}" r="8.5" fill="#38BDF8"/><text x="${f(x)}" y="${f(y + 4)}" text-anchor="middle" font-size="11.5" font-weight="900" fill="#111827" font-family="sans-serif">${i}</text>`; };
const side = (c, din, dout) => { const a = [-dout[1], dout[0]], s = a[0] * din[0] + a[1] * din[1] >= 0 ? 1 : -1; return [c[0] + a[0] * s * 2 * R, c[1] + a[1] * s * 2 * R]; };
export function labSvg(id, label) {
  const s = SHOTS[id]; if (!s) return '';
  let solid, dash, yel, red, cush;
  if (s.kick) {
    const a = run(s.w, s.d, s.n, s.e), c = a.pts[a.pts.length - 1], d2 = unit(s.d2), end = [c[0] + d2[0] * s.e2, c[1] + d2[1] * s.e2];
    solid = a.pts; dash = [c, end]; cush = a.pts.slice(1, -1); yel = side(c, a.dir, d2); red = [end[0] + d2[0] * 2 * R, end[1] + d2[1] * 2 * R];
  } else {
    const pre = s.via || (s.curve ? [s.curve[1]] : []), start = pre.length ? pre[pre.length - 1] : s.c, a = run(start, s.d, s.n, s.e);
    solid = [s.w, s.c]; dash = [...(pre.length ? [s.c, ...pre.slice(0, -1)] : []), ...a.pts]; cush = [...pre, ...a.pts.slice(1, -1)];
    const d1 = unit([dash[1][0] - s.c[0], dash[1][1] - s.c[1]]), din = unit([s.c[0] - s.w[0], s.c[1] - s.w[1]]);
    yel = s.y || (s.curve ? [s.c[0] + din[0] * 11.6 + din[1] * 3, s.c[1] + din[1] * 11.6 - din[0] * 3] : side(s.c, din, d1));
    const end = a.pts[a.pts.length - 1]; red = [end[0] + a.dir[0] * 2 * R, end[1] + a.dir[1] * 2 * R];
  }
  const dpath = s.curve ? `M${P(dash[0])} Q${P(s.curve[0])} ${P(s.curve[1])} ` + dash.slice(2).map((p) => 'L' + P(p)).join(' ') : 'M' + dash.map(P).join(' L');
  const arrows = solid.slice(1).map((p, i) => arrow(solid[i], p)).join('') + dash.slice(1).map((p, i) => (s.curve && i === 0 ? '' : arrow(dash[i], p, i === dash.length - 2 ? 0.55 : 0.5))).join('');
  const dia = [112, 212, 312].map((x) => `<rect x="${x - 2.5}" y="3.5" width="5" height="5" transform="rotate(45 ${x} 6)"/><rect x="${x - 2.5}" y="215.5" width="5" height="5" transform="rotate(45 ${x} 218)"/>`).join('') + `<rect x="3.5" y="109.5" width="5" height="5" transform="rotate(45 6 112)"/><rect x="415.5" y="109.5" width="5" height="5" transform="rotate(45 418 112)"/>`;
  return `<svg class="l3-svg" viewBox="0 0 424 224" width="100%" role="img" aria-label="${label}"><rect width="424" height="224" rx="12" fill="#334155"/><rect x="12" y="12" width="400" height="200" rx="2" fill="#111827"/><g fill="#CBD5E1">${dia}</g><path d="M${solid.map(P).join(' L')}" fill="none" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="${dpath}" fill="none" stroke="#38BDF8" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round" stroke-linejoin="round"/>${arrows}${cush.map((p, i) => num(p, i + 1)).join('')}${ball(yel, '#FACC15')}${ball(red, '#F43F5E')}${ball(s.w, '#FFFFFF')}</svg>`;
}
