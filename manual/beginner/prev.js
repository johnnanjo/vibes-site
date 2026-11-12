const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const html = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + fs.readFileSync('wind-manual.html', 'utf8') + '</body></html>'; fs.writeFileSync('prev.html', html);
  const p = await b.newPage({ viewport: { width: 1000, height: 1300 } }); await p.goto('file://' + process.cwd() + '/prev.html'); await p.waitForTimeout(1500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight); console.log('H', H, 'overflowX', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  for (const [i, y] of [[0, 0], [1, 1900], [2, 6200], [3, 9000]]) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(200); await p.screenshot({ path: 'pv' + i + '.png' }); }
  const m = await b.newPage({ viewport: { width: 400, height: 800 } }); await m.goto('file://' + process.cwd() + '/prev.html'); await m.waitForTimeout(800); console.log('m overflowX', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth)); await m.evaluate(() => scrollTo(0, 3600)); await m.screenshot({ path: 'pvm.png' });
  await p.emulateMedia({ media: 'print' }); await p.pdf({ path: 'デジタルカウント はじめての使い方.pdf', format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' } });
  await b.close(); })();
