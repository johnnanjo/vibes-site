import fs from 'node:fs';
import path from 'node:path';

export const SITE = 'https://vibesbilliards.com';
export const LINE_ID = '@361mehjz';
export const LINE_ADD = 'https://line.me/R/ti/p/@361mehjz';
export const EMAIL = 'info@vibesbilliards.com';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const strip = (h) => String(h ?? '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
export const json = (v) => { if (v == null || v === '') return []; if (Array.isArray(v)) return v; try { const j = JSON.parse(v); return Array.isArray(j) ? j : [j]; } catch { return []; } };

export function write(dist, url, html) {
  let p = url.replace(/^\//, '');
  if (!p || p.endsWith('/')) p += 'index.html';
  else if (!path.extname(p)) p += '/index.html';
  const f = path.join(dist, decodeURIComponent(p));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
}

export function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

/* ---- dates (always Japan time) ---- */
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const WDE = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export function jstParts(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const j = new Date(d.getTime() + 9 * 3600e3);
  return { y: j.getUTCFullYear(), m: j.getUTCMonth() + 1, d: j.getUTCDate(), w: j.getUTCDay(), hh: j.getUTCHours(), mm: j.getUTCMinutes(), ymd: j.toISOString().slice(0, 10) };
}
export const todayJST = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export const addDays = (ymd, n) => new Date(Date.parse(ymd + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
export const wdOf = (ymd) => new Date(ymd + 'T00:00:00Z').getUTCDay();
export const wdJa = (n) => WD[n];
export const wdEn = (n) => WDE[n];
export const md = (ymd) => `${+ymd.slice(5, 7)}.${ymd.slice(8, 10)}`;
export const mdJa = (ymd) => `${+ymd.slice(5, 7)}月${+ymd.slice(8, 10)}日（${WD[wdOf(ymd)]}）`;
export const hm = (p) => (p ? `${p.hh}:${String(p.mm).padStart(2, '0')}` : '');
export const ymdJa = (ymd) => `${ymd.slice(0, 4)}年${+ymd.slice(5, 7)}月${+ymd.slice(8, 10)}日（${WD[wdOf(ymd)]}）`;

export const ICON = {
  home: '<path d="M4 11l8-7 8 7v9H4z"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M12 13v4M8 20h8"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13.5" r="3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  count: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 12h2M14 12h2"/>',
  news: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
  bag: '<path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v5h14v-5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
};
export const svg = (name, size = 20, stroke = 'currentColor', w = 2) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

export const BALLS = ['var(--b1)', 'var(--b3)', 'var(--b2)', 'var(--b6)', 'var(--b7)', 'var(--b5)', 'var(--b4)'];
export function ballFor(name, carom) {
  if (carom) return '#FFFFFF';
  let h = 0; for (const c of name) h = (h * 31 + c.codePointAt(0)) >>> 0;
  return BALLS[h % BALLS.length];
}
export const ball = (name, carom, lg) => `<span class="ball${lg ? ' lg' : ''}" style="background:${ballFor(name, carom)}"><span>${esc([...name.replace(/\s/g, '')][0] || '?')}</span></span>`;
