// Builds the offline USB folder: start page + both scoreboards as self-contained files.
//   node scripts/build-usb-pack.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const b64 = (f) => fs.readFileSync(path.join(ROOT, f)).toString('base64');
const out = process.argv[2]; if (!out) throw new Error('outDir');
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
const START = '1_スタート.html';
function inline(src, links) {
  let s = fs.readFileSync(path.join(ROOT, src), 'utf8');
  s = s.replace(/<link rel="canonical"[^>]*>\n/, '').replace(/<link rel="manifest"[^>]*>\n/, '').replace(/<link rel="apple-touch-icon"[^>]*>\n/, '')
    .replace(/<link rel="preconnect"[^\n]*\n/, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n/, `<style>@font-face{font-family:Anton;font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${b64('static/fonts/anton-latin-400-normal.woff2')}) format("woff2")}</style>\n`);
  s = s.split('url(/fonts/unbounded-latin-900-normal.woff2)').join(`url(data:font/woff2;base64,${b64('static/fonts/unbounded-latin-900-normal.woff2')})`);
  s = s.split('href="/img/favicon-64.png"').join(`href="data:image/png;base64,${b64('static/img/favicon-64.png')}"`);
  s = s.split('src="/img/vibes-logo-t.png"').join(`src="data:image/png;base64,${b64('static/img/vibes-logo-t.png')}"`);
  for (const [a, b] of links) s = s.split(a).join(b);
  if (/(src|href)="\/[^"]/.test(s) || /url\(\//.test(s) || /U_HOME = '\/pages/.test(s) || /= \{ '3c': '\/pages/.test(s)) throw new Error('absolute path left in ' + src);
  return s;
}
const enc = encodeURI;
fs.writeFileSync(path.join(out, START), inline('static/apps/count-home.html', [
  ["'/pages/count-3c/'", "'data/count-3c.html'"], ["'/pages/count-pocket/'", "'data/count-pocket.html'"],
  ['href="/pages/count-3c/"', 'href="data/count-3c.html"'], ['href="/pages/count-pocket/?m=', 'href="data/count-pocket.html?m='],
]));
for (const f of ['count-3c', 'count-pocket']) fs.writeFileSync(path.join(out, 'data', f + '.html'), inline('static/apps/' + f + '.html', [
  ["U_HOME = '/pages/count/'", `U_HOME = '../${enc(START)}'`], ['href="/pages/count/"', `href="../${enc(START)}"`],
]));
console.log('wrote', out, fs.readdirSync(out), fs.readdirSync(path.join(out, 'data')));
