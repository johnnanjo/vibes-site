// Builds a single-file, offline copy of the 3-cushion scoreboard for USB sticks:
//   node scripts/build-usb.mjs [out.html]
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const b64 = (f) => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const SRC = process.argv[3] || 'static/apps/count-3c.html';
let s = fs.readFileSync(path.join(ROOT, SRC), 'utf8');
const rep = (a, b) => { if (!(a instanceof RegExp ? a.test(s) : s.includes(a))) throw new Error('missing: ' + a); s = s.replace(a, b); };
rep(/<link rel="canonical"[^>]*>\n/, '');
if (/<link rel="manifest"/.test(s)) rep(/<link rel="manifest"[^>]*>\n/, '');
rep(/<link rel="apple-touch-icon"[^>]*>\n/, '');
rep(/<link rel="preconnect"[^\n]*\n/, '');
rep(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n/, `<style>@font-face{font-family:Anton;font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${b64('static/fonts/anton-latin-400-normal.woff2')}) format("woff2")}</style>\n`);
rep('url(/fonts/unbounded-latin-900-normal.woff2)', `url(data:font/woff2;base64,${b64('static/fonts/unbounded-latin-900-normal.woff2')})`);
rep('href="/img/favicon-64.png"', `href="data:image/png;base64,${b64('static/img/favicon-64.png')}"`);
rep('<a href="/" aria-label="VIBES BILLIARDS home"><img src="/img/vibes-logo-t.png"', `<a aria-label="VIBES BILLIARDS"><img src="data:image/png;base64,${b64('static/img/vibes-logo-t.png')}"`);
if (/(src|href)="\/[^"]/.test(s) || /url\(\//.test(s)) throw new Error('absolute path left');
const out = process.argv[2] || path.join(ROOT, 'VIBES-3C-COUNT.html');
fs.writeFileSync(out, s);
console.log('wrote', out, Math.round(s.length / 1024) + ' KB');
