const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const rooms = { d: [], r: [] }; let lastState = null;
  await ctx.routeWebSocket(/api\/count/, ws => {
    const role = /role=display/.test(ws.url()) ? 'd' : 'r'; rooms[role].push(ws);
    if (role === 'r') { rooms.d.forEach(x => { try { x.send('{"type":"hello"}'); } catch (e) {} }); if (lastState) ws.send(lastState); }
    ws.onMessage(m => { m = String(m); if (role === 'd') { if (m.startsWith('{"type":"state"')) lastState = m; rooms.r.forEach(x => { try { x.send(m); } catch (e) {} }); } else rooms.d.forEach(x => { try { x.send(m); } catch (e) {} }); });
  });
  const B = 'http://localhost:8797', marks = {}, errs = [];
  const shot = async (pg, name, sels) => { await pg.waitForTimeout(350); await pg.screenshot({ path: name + '.png' }); const vp = pg.viewportSize(); marks[name] = [];
    for (const s of (sels || [])) { const bb = await pg.evaluate(([q, i]) => { const e = [...document.querySelectorAll(q)].filter(x => x.getClientRects().length)[i || 0]; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }, [s[0], s[1] || 0]); if (!bb) { console.log('MISSING', name, s[0]); continue; } marks[name].push([+(bb[0] / vp.width * 100).toFixed(2), +(bb[1] / vp.height * 100).toFixed(2), +(bb[2] / vp.width * 100).toFixed(2), +(bb[3] / vp.height * 100).toFixed(2)]); } };
  const tap = (r, sel, i = 0) => r.evaluate(([s, i]) => { const x = [...document.querySelectorAll(s)].filter(e => e.offsetParent)[i]; if (!x) throw new Error('no ' + s); x.click(); }, [sel, i]);
  const d = await ctx.newPage(); d.on('pageerror', e => errs.push('D ' + e.message));
  await d.goto(B + '/pages/count/'); await d.evaluate(() => { localStorage.setItem('vibes-players-v3', JSON.stringify([['山田', '太郎', 'やまだ', 'たろう', 25], ['鈴木', '一郎', 'すずき', 'いちろう', 20], ['佐藤', '健', 'さとう', 'けん', 18], ['田中', '花子', 'たなか', 'はなこ', 15], ['高橋', '誠', 'たかはし', 'まこと', 30]].map((a, i) => ({ id: 'p' + i, sei: a[0], mei: a[1], ys: a[2], ym: a[3], gs: { three: a[4] } })))); localStorage.setItem('vibes-remote-display', JSON.stringify({ code: '482915', on: true })); localStorage.setItem('vibes-count-prefs', JSON.stringify({ lim: 0, t: 40, to: 3, pm: 5, eq: 1, snd: 1, easy: 0, voice: 1 })); });
  await d.reload(); await shot(d, 'pc_top', [['#hq'], ['.tile', 0], ['.bar button', 1]]);
  const r = await ctx.newPage(); await r.setViewportSize({ width: 1180, height: 820 }); r.on('pageerror', e => errs.push('R ' + e.message));
  await r.goto(B + '/pages/count-remote/?r=482915'); await r.waitForTimeout(900);
  await shot(r, 'ip_menu', [['#vMenu .mt', 0], ['#vMenu .mt', 1], ['#vMenu .mt', 2], ['#vMenu .mt', 3]]); await shot(d, 'pc_solo', []);
  // settings + roster from the top
  await tap(r, '#vMenu .mt', 3); await shot(r, 'ip_config', [['#cf_easy'], ['#cf_t'], ['#cf_voice'], ['#fCf .go']]); await tap(r, '#bCfBack');
  await tap(r, '#vMenu .mt', 2); await shot(r, 'ip_roster', [['#roNew'], ['#roQr'], ['#roQ'], ['#roList .rr', 0]]);
  await tap(r, '#roQr'); await shot(r, 'ip_qr', [['#qrB']]);
  const g = await ctx.newPage(); await g.setViewportSize({ width: 390, height: 640 }); await g.goto(B + '/pages/count-remote/?r=482915&j=1'); await g.waitForTimeout(900);
  await g.fill('#sfN', '中村 翔'); await g.fill('#sfY', 'なかむらしょう'); await g.fill('#sfG', '17'); await shot(g, 'ph_self', [['#sfN'], ['#sfY'], ['#sfG'], ['#sfGo']]); await g.click('#sfGo'); await g.waitForTimeout(600); await shot(g, 'ph_done', [['#sfOk']]); await g.close();
  await tap(r, '#qrBack');
  await tap(r, '#roNew'); await r.fill('#edN', '小林 直樹'); await r.fill('#edY', 'こばやしなおき'); await r.fill('#edG', '22'); await shot(r, 'ip_edit', [['#edN'], ['#edY'], ['#edG'], ['#fEd .go']]); await r.click('#fEd .go'); await r.waitForTimeout(300); await tap(r, '#roBack');
  await tap(r, '#vMenu .mt', 0); await shot(r, 'ip_game', [['#vMenu .mt', 0]]); await tap(r, '#vMenu .mt', 0); await shot(r, 'ip_carom', [['#vMenu .mt', 0]]);
  await tap(r, '#vMenu .mt', 0); await d.waitForTimeout(1500); await r.waitForTimeout(500);
  await shot(r, 'ip_players0', [['#plN'], ['#plRows .pick', 0], ['#pn0'], ['#pg0']]);
  await tap(r, '#plRows .pick', 0); await r.fill('#piQ', 'やま'); await shot(r, 'ip_pick', [['#piQ'], ['#piList .rr', 0]]); await tap(r, '#piList .rr', 0);
  await tap(r, '#plRows .pick', 1); await r.fill('#piQ', 'すず'); await r.waitForTimeout(150); await tap(r, '#piList .rr', 0);
  await shot(r, 'ip_players', [['#pn0'], ['#pg0'], ['#vPl .go']]); await r.click('#vPl .go');
  await shot(r, 'ip_ready', [['#rdyO'], ['#rdySwap'], ['#rdy [data-c=start]'], ['#rdy .pre']]); await shot(d, 'pc_ready', []);
  await tap(r, '#rdy [data-c=start]'); await r.waitForTimeout(300);
  const inn = async (a, bb) => { for (let i = 0; i < a; i++) { await tap(r, '#p0 .tap'); await r.waitForTimeout(40); } await tap(r, '#p0 .chg'); await r.waitForTimeout(80); for (let i = 0; i < bb; i++) { await tap(r, '#p1 .tap'); await r.waitForTimeout(40); } await tap(r, '#p1 .chg'); await r.waitForTimeout(80); };
  await inn(2, 0); await inn(0, 1); await inn(3, 2); await inn(1, 0); await inn(0, 3); await tap(r, '#p0 .tap'); await tap(r, '#p0 .tap'); await r.waitForTimeout(200); await tap(r, '#kClock'); await r.waitForTimeout(2600);
  await shot(r, 'ip_play', [['#p0 .tap'], ['#p0 .chg'], ['#runBox'], ['#mainPad .k', 0], ['#mainPad .k', 1], ['#kClock'], ['.pzb'], ['.endb']]);
  await shot(d, 'pc_play', [['#s0 .score'], ['#s0 .turn'], ['#gt'], ['.box.inn'], ['#s0 .foot'], ['#sheet'], ['#tbox']]);
  await tap(r, '.pzb'); await shot(r, 'ip_pause', [['.pzb']]); await shot(d, 'pc_pause', []); await tap(r, '.pzb'); await r.waitForTimeout(200);
  await tap(r, '.endb'); await tap(r, '.endb'); await r.waitForTimeout(500);
  await shot(r, 'ip_result', [['#resW'], ['#resB'], ['#vRes [data-c=newgame]'], ['#vRes .prePl'], ['#vRes [data-c=home]'], ['#vRes [data-c=undo]']]); await shot(d, 'pc_result', []);
  // easy mode look
  await tap(r, '#vRes [data-c=undo]'); await r.waitForTimeout(300); await d.evaluate(() => { document.getElementById('bSet').click(); document.getElementById('fz').value = '1'; }); await d.keyboard.press('Enter'); await d.waitForTimeout(800); await shot(d, 'pc_easy', []);
  fs.writeFileSync('marks.json', JSON.stringify(marks)); console.log('errs', errs); await b.close();
})();
