  var PCOL = ['#FFFFFF', '#F2C200', '#E5484D', '#35C486'], PCN = ['白', '黄', '赤', '緑'];
  var MODES = {
    bowlard: { en: 'BOWLARD', jp: 'ボーラード', min: 1, max: 4, n: 1, target: false, mid: 'FRAME' },
    nine: { en: '9-BALL', jp: '9ボール', min: 2, max: 2, n: 2, target: true, mid: 'RACK' },
    ten: { en: '10-BALL', jp: '10ボール', min: 2, max: 2, n: 2, target: true, mid: 'RACK' },
    g59: { en: '5-9', jp: '5-9', min: 2, max: 4, n: 3, target: false, mid: 'RACK', pb: '5=1,9=2', last: 9 },
    g510: { en: '5-10', jp: '5-10', min: 2, max: 4, n: 3, target: false, mid: 'RACK', pb: '5=1,10=2', last: 10 }
  };
  var MKEYS = ['bowlard', 'nine', 'ten', 'g59', 'g510'];
  var M = function () { return MODES[S.cfg.mode] || MODES.nine; };
  var isG5 = function () { return S.cfg.mode === 'g59' || S.cfg.mode === 'g510'; };
  var isSet = function () { return S.cfg.mode === 'nine' || S.cfg.mode === 'ten'; };
  var isBow = function () { return S.cfg.mode === 'bowlard'; };
  var isDefName = function (v) { return /^PLAYER [1-4]$/.test(v || ''); };
  var names = function (n) { var a = []; for (var i = 0; i < n; i++) a.push('PLAYER ' + (i + 1)); return a; };
  var def = function (c) {
    c = c || { mode: 'nine', n: names(2), g: [5, 5], lim: 0, t: 0, snd: 1, pm: 5, to: 0, brk: 'alt', pb: '5=1,9=2', dbl: 1 };
    var N = c.n.length, z = function (f) { var a = []; for (var i = 0; i < N; i++) a.push(f()); return a; };
    return { cfg: c, sc: z(function () { return 0; }), inn: z(function () { return []; }), fr: z(function () { return []; }), cnt: z(function () { return {}; }), to: z(function () { return c.to; }),
      run: 0, typed: false, turn: 0, brk: 0, rack: 1, used: [], x2: false, moves: 0, over: false, t0: 0, t1: 0, ready: false };
  };
  var NP = function () { return S.cfg.n.length; };
  var fresh = function () { return !S.moves && !S.run && !S.over; };
  function setN(n) { var m = M(); n = Math.max(m.min, Math.min(m.max, n)); var c = S.cfg; while (c.n.length < n) { c.n.push('PLAYER ' + (c.n.length + 1)); c.g.push(c.g[0] || 5); } c.n.length = n; c.g.length = n; var h = hist; S = def(c); hist = h; }
  function setMode(k) { if (!MODES[k]) return; var c = S.cfg; c.mode = k; if (MODES[k].pb) c.pb = MODES[k].pb; var n = c.n.length; if (n < MODES[k].min || n > MODES[k].max) n = MODES[k].n; setN(n); }
  var S = def(), hist = [], tLeft = 0, tOn = false, tId = null, dotAt = 0, actx = null;
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && o.cfg && o.sc && MODES[o.cfg.mode]) { var c0 = Object.assign(def().cfg, o.cfg); var d0 = def(c0); S = Object.assign(d0, o); S.cfg = c0; ['sc', 'inn', 'fr', 'cnt', 'to'].forEach(function (k) { if (!S[k] || S[k].length !== c0.n.length) S = def(c0); }); } } } catch (e) {}
  var roster = {};
  function drawRoster() { var dl = $('roster'); dl.textContent = ''; players.forEach(function (o) { var n0 = o.mei ? o.sei + ' ' + o.mei : o.sei; var op = document.createElement('option'); op.value = n0; dl.appendChild(op); }); }
  function remember() {}
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  var snap = function () { hist.push(JSON.stringify(S)); if (hist.length > 400) hist.shift(); };
  var toast = function (m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 1800); };
  function beep(f, ms) {
    if (!S.cfg.snd) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.connect(g); g.connect(actx.destination); g.gain.value = .18; o.start(); o.stop(actx.currentTime + ms / 1000); } catch (e) {}
  }
  /* ---- point balls (5-9 / 5-10) ---- */
  function pbMap() { var m = {}; String(S.cfg.pb || '').split(/[,、\s]+/).forEach(function (t) { var a = /^(\d{1,2})\s*[=:＝]\s*(\d{1,2})$/.exec(t); if (a && +a[1] >= 1 && +a[1] <= 15 && +a[2] > 0) m[+a[1]] = +a[2]; }); var L = M().last; if (L && !m[L]) m[L] = 2; return m; }
  var pbKeys = function () { return Object.keys(pbMap()).map(Number).sort(function (a, b) { return a - b; }); };
  /* ---- bowlard (bowling scoring) ---- */
  function bState(r) {
    var i = 0, f = 1;
    for (; f <= 9; f++) { if (i >= r.length) return { frame: f, ball: 1, pins: 10, done: false }; if (r[i] === 10) { i++; continue; } if (i + 1 >= r.length) return { frame: f, ball: 2, pins: 10 - r[i], done: false }; i += 2; }
    var a = r[i], b = r[i + 1], c = r[i + 2];
    if (a == null) return { frame: 10, ball: 1, pins: 10, done: false };
    if (b == null) return { frame: 10, ball: 2, pins: a === 10 ? 10 : 10 - a, done: false };
    if (a === 10 || a + b === 10) { if (c == null) return { frame: 10, ball: 3, pins: (a === 10 && b !== 10) ? 10 - b : 10, done: false }; return { frame: 10, ball: 3, pins: 0, done: true }; }
    return { frame: 10, ball: 2, pins: 0, done: true };
  }
  function bFrames(r) {
    var out = [], i = 0, tot = 0, v = function (k) { return r[k] == null ? 0 : r[k]; };
    for (var f = 1; f <= 10; f++) {
      if (i >= r.length) { out.push({ m: '', c: '' }); continue; }
      if (f < 10) {
        if (r[i] === 10) { tot += 10 + v(i + 1) + v(i + 2); out.push({ m: 'X', c: r[i + 2] != null ? tot : '', k: 's' }); i++; }
        else if (r[i + 1] == null) { tot += r[i]; out.push({ m: (r[i] || '-') + '', c: '' }); i++; }
        else if (r[i] + r[i + 1] === 10) { tot += 10 + v(i + 2); out.push({ m: (r[i] || '-') + ' /', c: r[i + 2] != null ? tot : '', k: 'p' }); i += 2; }
        else { tot += r[i] + r[i + 1]; out.push({ m: (r[i] || '-') + ' ' + (r[i + 1] || '-'), c: tot }); i += 2; }
      } else {
        var a = r[i], b = r[i + 1], c = r[i + 2], mk = [];
        mk.push(a === 10 ? 'X' : (a || '-'));
        if (b != null) mk.push(a === 10 ? (b === 10 ? 'X' : (b || '-')) : (a + b === 10 ? '/' : (b || '-')));
        if (c != null) mk.push((a === 10 && b !== 10) ? (b + c === 10 ? '/' : (c || '-')) : (c === 10 ? 'X' : (c || '-')));
        tot += v(i) + v(i + 1) + v(i + 2); out.push({ m: mk.join(' '), c: bState(r).done ? tot : '', k: a === 10 ? 's' : '' });
      }
    }
    return { fr: out, total: tot };
  }
  var bCount = function (p, k) { var ch = k === 's' ? 'X' : '/', n = 0; bFrames(S.fr[p]).fr.forEach(function (x) { n += String(x.m).split(ch).length - 1; }); return n; };
  var room = function () { return isBow() ? bState(S.fr[S.turn]).pins : 0; };
  /* ---- board ---- */
  var built = '';
  function statDefs() {
    if (isBow()) return [['STRIKE', 'st'], ['SPARE', 'sp']];
    if (isSet()) return [['TO GO', 'st'], ['BREAK', 'sp']];
    var k = pbKeys(); return [[k[0] + ' BALL', 'st'], [M().last + ' BALL', 'sp']];
  }
  function build() {
    var N = NP(), m = $('main'), mid = $('mid'), sh = $('sheet'), sd = statDefs();
    Array.prototype.slice.call(m.querySelectorAll('.side')).forEach(function (e) { e.remove(); });
    m.className = 'main n' + N + ' m-' + S.cfg.mode; sh.textContent = ''; sh.className = 'sheet n' + N + ' m-' + S.cfg.mode;
    for (var p = 0; p < N; p++) {
      var sec = el('section', 'side p' + p); sec.id = 's' + p; sec.style.order = N === 2 ? (p ? 3 : 1) : p + 1;
      sec.appendChild(el('span', 'turn', 'AT THE TABLE'));
      var who = el('div', 'who'), ball = el('span', 'ball'); ball.style.setProperty('--c', PCOL[p]); who.appendChild(ball); var nm = el('span', 'name'); nm.id = 'n' + p; who.appendChild(nm); sec.appendChild(who);
      var sc = el('div', 'score num', '0'); sc.id = 'sc' + p; sc.style.color = p ? PCOL[p] : '#fff'; sec.appendChild(sc);
      var foot = el('div', 'foot'), st = el('div', 'stats');
      sd.forEach(function (a) { var d = el('div', 'stat'); d.appendChild(el('small', '', a[0])); var b = el('b', '', '0'); b.id = a[1] + p; d.appendChild(b); st.appendChild(d); });
      foot.appendChild(st); var to = el('div', 'stat tos'); to.appendChild(el('small', '', 'TIME-OUT')); var tw = el('span', 'tow'); tw.id = 'to' + p; to.appendChild(tw); foot.appendChild(to); sec.appendChild(foot);
      m.appendChild(sec);
      var lab = el('span', 'lab'), dot = el('i'); dot.style.background = PCOL[p]; lab.appendChild(dot); var ln = el('span'); ln.id = 'ln' + p; lab.appendChild(ln); sh.appendChild(lab); var row = el('div', 'row'); row.id = 'r' + p; sh.appendChild(row);
    }
    mid.style.order = N === 2 ? 2 : 9; $('midL').textContent = M().mid; $('ttl').textContent = (TB ? 'TABLE ' + TB + ' · ' : '') + M().en;
    built = N + S.cfg.mode + S.cfg.pb;
  }
  var label = function (p) { return S.cfg.n[p] + (M().target ? ' (' + S.cfg.g[p] + ')' : ''); };
  var signed = function (v) { return v > 0 ? '+' + v : String(v); };
  function scoreText(p) {
    if (isBow()) return String(bFrames(S.fr[p].concat(p === S.turn && !S.over && S.run ? [S.run] : [])).total);
    if (isG5()) return signed(S.sc[p]);
    return String(S.sc[p]);
  }
  function rdDraw() {
    var on = !!S.ready && !S.over; $('rdL').hidden = !on; if (!on) return;
    var m = $('rdM'), N = NP(); m.textContent = ''; m.className = 'rdm n' + N; if (!$('rdLogo').src) $('rdLogo').src = document.querySelector('.top img').src;
    for (var p = 0; p < N; p++) {
      if (p && N === 2) m.appendChild(el('span', 'vs', 'VS'));
      var c = el('div', 'rdc'); c.appendChild(el('small', '', N === 1 ? M().jp : N === 2 ? (p ? '後攻' : '先攻') : (p ? (p + 1) + '番' : '1番（先攻）')));
      var w = el('div', 'who'), b = el('span', 'ball'); b.style.setProperty('--c', PCOL[p]); w.appendChild(b); w.appendChild(el('span', 'name', S.cfg.n[p])); c.appendChild(w);
      if (M().target) { var g = el('div', 'rdg'); g.appendChild(el('b', 'num', String(S.cfg.g[p]))); g.appendChild(el('small', '', 'セット先取')); c.appendChild(g); }
      m.appendChild(c);
    }
    $('rdN').textContent = M().jp + '　' + (N === 1 ? 'Enter で始めます。' : N === 2 ? 'バンキングで先攻・後攻を決めます。先攻が左です。入れ替える時は / を押します。' : '順番を決めます。/ を押すと順番が回ります。');
    $('rdSwap').textContent = (N === 2 ? '入れ替え' : '順番を回す') + ' (/)'; $('rdSwap').hidden = N === 1;
  }
  function rdSwap() { if (!S.ready || NP() < 2) return; var c = S.cfg; if (NP() === 2) { c.n.reverse(); c.g.reverse(); } else { c.n.push(c.n.shift()); c.g.push(c.g.shift()); } render(); }
  function rdStart() { if (!S.ready) return; S.ready = false; begin(); render(); }
  function gtText() { if (!S.t0) return '0:00'; var v = Math.max(0, Math.floor(((S.over && S.t1 ? S.t1 : Date.now()) - S.t0) / 1000)), h = Math.floor(v / 3600), m = Math.floor(v % 3600 / 60), x = v % 60, z = function (n) { return (n < 10 ? '0' : '') + n; }; return h ? h + ':' + z(m) + ':' + z(x) : m + ':' + z(x); }
  function drawTime() { var t = gtText(), e = $('gt'); if (e.textContent !== t) { e.textContent = t; e.classList.toggle('long', t.length > 5); } }
  var begin = function () { if (!S.t0) S.t0 = Date.now(); };
  function render() {
    var N = NP(); if (built !== N + S.cfg.mode + S.cfg.pb) build();
    var pk = isG5() ? pbKeys() : [];
    for (var p = 0; p < N; p++) {
      $('n' + p).textContent = label(p); $('ln' + p).textContent = label(p);
      var t = scoreText(p), se = $('sc' + p); se.textContent = t; se.classList.toggle('d3', t.length > 2); se.classList.toggle('neg', isG5() && S.sc[p] < 0);
      if (isBow()) { $('st' + p).textContent = bCount(p, 's'); $('sp' + p).textContent = bCount(p, 'p'); }
      else if (isSet()) { $('st' + p).textContent = Math.max(0, S.cfg.g[p] - S.sc[p]); $('sp' + p).textContent = p === S.brk && !S.over ? '●' : '–'; }
      else { $('st' + p).textContent = S.cnt[p][pk[0]] || 0; $('sp' + p).textContent = S.cnt[p][M().last] || 0; }
      $('s' + p).classList.toggle('on', p === S.turn && !S.over);
      var tw = $('to' + p); tw.textContent = ''; tw.parentNode.hidden = !S.cfg.to;
      for (var k = 0; k < (S.cfg.to || 0); k++) { var c = el('i'); if (k >= S.to[p]) c.className = 'used'; tw.appendChild(c); }
      var r = $('r' + p); r.textContent = '';
      if (isBow()) bFrames(S.fr[p]).fr.forEach(function (x, i) { var s = el('span', 'bf' + (x.k ? ' ' + x.k : '')); s.appendChild(el('i', '', x.m || String(i + 1))); s.appendChild(el('b', '', x.c === '' ? ' ' : String(x.c))); if (!x.m) s.className += ' z'; r.appendChild(s); });
      else S.inn[p].slice(-18).forEach(function (v) { var s = el('span', v === 0 || v === '0' ? 'z' : '', String(v)); r.appendChild(s); });
    }
    var info = '';
    if (isBow()) info = S.run && !S.over ? 'RUN ' + S.run : '';
    else if (isG5()) info = S.x2 ? 'SIDE ×2' : '';
    $('runS').textContent = info;
    $('inn').textContent = isBow() ? bState(S.fr[S.turn]).frame : S.rack;
    $('lim').textContent = isBow() ? (S.over ? '' : bState(S.fr[S.turn]).ball + ' / ' + (bState(S.fr[S.turn]).frame === 10 ? 3 : 2)) : (isG5() && S.cfg.lim ? '上限 ' + S.cfg.lim : '');
    $('tbox').hidden = !S.cfg.t; drawKeys();
    rdDraw(); drawTime(); drawTimer(); save(); if (typeof rmPush === 'function') rmPush();
  }
  function drawKeys() {
    var a;
    if (isBow()) a = [['+', '1個'], ['-', '1個へらす'], ['0-9', '個数入力'], ['Enter', 'ミス・確定'], ['BackSpace', '戻る']];
    else if (isSet()) a = [['+', 'セットを取った'], ['-', 'セットを取り消す'], ['Enter', '交代'], ['BackSpace', '戻る']];
    else a = pbKeys().map(function (b) { return [b === 10 ? '0' : String(b), b + '番（' + pbMap()[b] + '点）']; }).concat(S.cfg.dbl ? [['+', 'サイド2倍']] : []).concat([['Enter', '交代'], ['BackSpace', '戻る']]);
    a = a.concat([['*', '残り秒数'], ['/', '設定'], ['.', '2回で新しい試合']]);
    var k = $('mainK'), sig = a.join('|'); if (k.getAttribute('data-s') === sig) return; k.setAttribute('data-s', sig); k.textContent = '';
    a.forEach(function (x) { var sp = el('span'); sp.appendChild(el('kbd', '', x[0])); sp.appendChild(document.createTextNode(x[1])); k.appendChild(sp); });
  }
  function drawTimer() {
    var T = S.cfg.t || 1, v = tOn ? Math.max(0, Math.ceil(tLeft)) : S.cfg.t;
    $('tm').textContent = v;
    var sg = $('segs');
    if (sg.children.length !== (S.cfg.t || 0)) { sg.textContent = ''; for (var i = 0; i < (S.cfg.t || 0); i++) { var el2 = document.createElement('i'); el2.style.background = 'hsl(' + Math.round(i / Math.max(1, T - 1) * 125) + ',78%,46%)'; sg.appendChild(el2); } }
    for (var j = 0; j < sg.children.length; j++) sg.children[j].classList.toggle('off', j >= v);
    $('tbox').classList.toggle('warn', tOn && tLeft <= 10 && tLeft > 0); $('tbox').classList.toggle('over', tOn && tLeft <= 0);
  }
  function tStop() { tOn = false; clearInterval(tId); tId = null; drawTimer(); }
  function tStart() {
    if (!S.cfg.t || S.over) return; begin(); tStop(); tOn = true; tLeft = S.cfg.t; var last = Date.now(), warned = false, done = false;
    tId = setInterval(function () { var n = Date.now(); tLeft -= (n - last) / 1000; last = n; if (!warned && tLeft <= 10) { warned = true; beep(880, 160); } if (!done && tLeft <= 0) { if (S.cfg.to && S.to[S.turn] > 0) { snap(); S.to[S.turn]--; beep(660, 350); toast('タイムアウトを使いました：' + S.cfg.n[S.turn]); render(); tStart(); return; } done = true; beep(330, 900); } drawTimer(); }, 100);
    drawTimer();
  }
  var tKick = function () { if (tOn) tStart(); };
  var nextTurn = function () { S.turn = (S.turn + 1) % NP(); };
  function finish() { S.over = true; S.t1 = Date.now(); tStop(); render(); showWin(); }
  function add(n) {
    if (S.over) return; begin();
    if (isBow()) { var v = Math.max(0, Math.min(room(), S.run + n)); if (v === S.run) { if (n > 0) toast('全部入りました。Enter で確定します'); return; } S.run = v; S.typed = false; tKick(); render(); return; }
    if (isSet()) {
      var p = S.turn;
      if (n > 0) { snap(); S.moves++; S.sc[p]++; for (var q = 0; q < NP(); q++) S.inn[q].push(q === p ? 1 : 0); if (S.sc[p] >= S.cfg.g[p]) return finish(); S.rack++; S.brk = S.cfg.brk === 'win' ? p : (S.brk + 1) % NP(); S.turn = S.brk; tStop(); render(); }
      else { if (S.sc[p] <= 0) { toast('取り消すセットがありません'); return; } snap(); S.sc[p]--; S.rack = Math.max(1, S.rack - 1); for (var q2 = 0; q2 < NP(); q2++) S.inn[q2].pop(); render(); }
      return;
    }
    if (n > 0) { if (!S.cfg.dbl) return; S.x2 = !S.x2; render(); } else toast('まちがえた時は BackSpace で戻します');
  }
  function digit(d) {
    if (S.over) return; begin();
    if (isBow()) { var v = S.typed ? S.run * 10 + d : d; if (v > room()) v = d > room() ? room() : d; S.run = v; S.typed = true; render(); return; }
    if (!isG5()) return;
    var b = d === 0 ? 10 : d, map = pbMap(), N = NP(), p = S.turn;
    if (!map[b]) { toast(b + '番は、かけ玉ではありません'); return; }
    if (S.used.indexOf(b) >= 0) { toast(b + '番は、このラックでもう入っています'); return; }
    snap(); S.moves++; var pts = map[b] * (S.x2 ? 2 : 1);
    for (var q = 0; q < N; q++) { if (q === p) S.sc[q] += pts * (N - 1); else S.sc[q] -= pts; }
    S.cnt[p][b] = (S.cnt[p][b] || 0) + 1; S.inn[p].push(b + (S.x2 ? '×2' : '')); S.used.push(b); S.x2 = false;
    if (b === M().last) { if (S.cfg.lim && S.rack >= S.cfg.lim) return finish(); S.rack++; S.used = []; S.brk = p; tStop(); }
    else tKick();
    render();
  }
  function commit() {
    if (S.over) return; begin(); snap(); S.moves++;
    if (isBow()) {
      var p = S.turn, before = bState(S.fr[p]); S.fr[p].push(S.run); S.run = 0; S.typed = false;
      var st = bState(S.fr[p]);
      if (st.done || st.frame !== before.frame) {
        var N = NP(), k = 0; do { S.turn = (S.turn + 1) % N; k++; } while (k <= N && bState(S.fr[S.turn]).done);
        if (S.fr.every(function (r) { return bState(r).done; })) return finish();
      }
      tKick(); render(); return;
    }
    S.x2 = false; nextTurn(); tKick(); render();
  }
  function undo() {
    if (!S.over && isBow() && S.run > 0) { S.run = 0; S.typed = false; render(); return; }
    if (!hist.length) { toast('これ以上は戻れません'); return; }
    S = JSON.parse(hist.pop()); $('winL').hidden = true; render();
  }
  function newGame(keep) { snap(); var c = S.cfg; S = def(c); S.ready = !c.n.every(isDefName); if (!keep) hist = []; tStop(); $('winL').hidden = true; render(); }
  function showWin() {
    var val = function (p) { return isBow() ? bFrames(S.fr[p]).total : S.sc[p]; }, w = 0, tie = false, ps = S.cfg.n.map(function (x, i) { return i; }), sd = statDefs();
    ps.forEach(function (p) { if (p && val(p) > val(w)) { w = p; tie = false; } else if (p && val(p) === val(w)) tie = true; }); if (tie) w = -1;
    $('wName').textContent = NP() === 1 ? 'スコア：' + val(0) : (w < 0 ? '引き分け' : '勝者：' + S.cfg.n[w]);
    $('wH').textContent = ''; ['', isBow() ? 'スコア' : isSet() ? 'セット' : '点', sd[0][0], sd[1][0]].forEach(function (t) { $('wH').appendChild(el('th', '', t)); });
    var tb = $('wT'); tb.textContent = '';
    ps.forEach(function (p) { var tr = document.createElement('tr'); [label(p), isG5() ? signed(S.sc[p]) : isSet() ? S.sc[p] + ' / ' + S.cfg.g[p] : val(p), $('st' + p).textContent, $('sp' + p).textContent].forEach(function (v, i) { var c = document.createElement(i ? 'td' : 'th'); c.textContent = v; tr.appendChild(c); }); tb.appendChild(tr); });
    $('winL').hidden = false;
  }
  function openSet() {
    for (var q = 0; q < 4; q++) { $('fn' + q).value = S.cfg.n[q] || 'PLAYER ' + (q + 1); $('fg' + q).value = S.cfg.g[q] || S.cfg.g[0] || 5; }
    $('fmd').value = S.cfg.mode; $('fmd').disabled = !fresh(); $('fnp').value = NP(); $('fnp').disabled = !fresh(); $('fto').value = S.cfg.to; setRows();
    $('fp').value = S.cfg.pm; $('fl').value = S.cfg.lim; $('ft').value = S.cfg.t; $('fe').value = S.cfg.brk; $('fs').value = S.cfg.snd; $('fpb').value = S.cfg.pb; $('fdb').value = S.cfg.dbl;
    $('setL').hidden = false; $('fn0').focus(); $('fn0').select();
  }
  function setRows() {
    var md = MODES[$('fmd').value] || M(), sel = $('fnp'), cur = +sel.value || NP(); sel.textContent = '';
    for (var i = md.min; i <= md.max; i++) { var o = document.createElement('option'); o.value = i; o.textContent = i; sel.appendChild(o); }
    sel.value = cur >= md.min && cur <= md.max ? cur : md.n; var n = +sel.value;
    for (var q = 0; q < 4; q++) { Array.prototype.forEach.call(document.querySelectorAll('.pf' + q), function (e) { e.hidden = q >= n; }); Array.prototype.forEach.call(document.querySelectorAll('.pg' + q), function (e) { e.hidden = q >= n || !md.target; }); }
    Array.prototype.forEach.call(document.querySelectorAll('.o-set'), function (e) { e.hidden = !md.target; });
    Array.prototype.forEach.call(document.querySelectorAll('.o-g5'), function (e) { e.hidden = !md.pb; });
    if (md.pb && $('fmd').value !== S.cfg.mode) $('fpb').value = md.pb;
  }
  function closeSet(apply) {
    if (apply) {
      var num = function (id, lo, hi, d) { var v = parseInt($(id).value, 10); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); };
      if (fresh() && $('fmd').value !== S.cfg.mode) setMode($('fmd').value);
      var nn = fresh() ? +$('fnp').value : NP(), oldTo = S.cfg.to; if (nn !== NP()) setN(nn); nn = NP();
      for (var q = 0; q < nn; q++) { S.cfg.n[q] = $('fn' + q).value.trim() || 'PLAYER ' + (q + 1); S.cfg.g[q] = Math.max(num('fg' + q, 1, 99, 5), isSet() ? S.sc[q] : 1); }
      S.cfg.to = num('fto', 0, 9, 0); if (S.cfg.to !== oldTo) S.to = S.to.map(function (v) { return Math.max(0, v + S.cfg.to - oldTo); }); S.cfg.lim = num('fl', 0, 999, 0); S.cfg.t = num('ft', 0, 180, 0); S.cfg.pm = num('fp', 1, 60, 5);
      S.cfg.brk = $('fe').value === 'win' ? 'win' : 'alt'; S.cfg.snd = +$('fs').value; S.cfg.dbl = +$('fdb').value;
      if (isG5()) { var old = S.cfg.pb; S.cfg.pb = $('fpb').value.trim() || M().pb; if (!Object.keys(pbMap()).length) S.cfg.pb = old; }
      if (S.run > room()) S.run = Math.max(0, room());
    }
    $('setL').hidden = true; tStop(); render();
  }
