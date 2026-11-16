/* DIGITAL LAB 利用コード（build.mjs が count-home / count-3c / count-pocket / count-tour の <head> に差し込む）。
   公式LINEで申し込んだお店に12けたのコードを発行し、最初の1回だけ入力してもらう。照合は /data/lab-codes.json（コードそのものは置かず、PBKDF2 の値だけ）。
   この仕組みを入れる前から使っていた端末（WIND など）は、初回にそのまま利用可にする。発行は scripts/lab-code.mjs。 */
(function () {
  'use strict';
  var K = 'vibes-lab-lic', G = 'vibes-lab-gate', SALT = 'vibes-digital-lab-v1', IT = 150000, N = 12;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var lic = null; try { lic = JSON.parse(get(K) || 'null'); } catch (e) {}
  if (!lic && !get(G)) {
    if (['vibes-count-prefs', 'vibes-count-3c-v1', 'vibes-count-3c-players-v2', 'vibes-count-last', 'vibes-lab-ed'].some(function (k) { return get(k) != null; })) { lic = { legacy: 1, at: Date.now() }; set(K, JSON.stringify(lic)); }
    set(G, '1');
  }
  function list() { return fetch('/data/lab-codes.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }
  function hash(code) {
    var te = new TextEncoder();
    return crypto.subtle.importKey('raw', te.encode(code), 'PBKDF2', false, ['deriveBits']).then(function (k) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: te.encode(SALT), iterations: IT, hash: 'SHA-256' }, k, 256); })
      .then(function (b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); });
  }
  function find(d, h) { return ((d && d.codes) || []).filter(function (x) { return x && x.h === h && x.on !== false; })[0]; }
  if (lic) {
    /* a code that was switched off stops working the next time the device is online (checked once a day) */
    if (lic.h && (!lic.ck || Date.now() - lic.ck > 864e5)) list().then(function (d) { if (find(d, lic.h)) { lic.ck = Date.now(); set(K, JSON.stringify(lic)); } else { try { localStorage.removeItem(K); } catch (e) {} location.reload(); } }).catch(function () {});
    return;
  }
  var on = true, val = '', busy = false, bad = 0, lock = 0, root, cells, msg;
  function draw() { for (var i = 0; i < N; i++) { cells[i].textContent = val.charAt(i); cells[i].className = i === val.length && !busy ? 'c on' : 'c'; } }
  function say(t, e) { msg.textContent = t; msg.className = e ? 'm e' : 'm'; }
  function go() {
    if (busy || val.length !== N) return;
    if (Date.now() < lock) return say('少し時間をおいてから、もう一度お試しください。', 1);
    if (!(window.crypto && crypto.subtle)) return say('このブラウザでは確認できません。Chrome・Edge・Safari の新しい版でお試しください。', 1);
    busy = true; say('確かめています…'); draw();
    var code = val;
    hash(code).then(function (h) { return list().then(function (d) { return [h, find(d, h)]; }, function () { return [h, 'net']; }); }).then(function (r) {
      busy = false;
      if (r[1] === 'net') { say('インターネットにつながっていません。Wi-Fi を確かめて、もう一度 Enter を押してください。', 1); return draw(); }
      if (!r[1]) { val = ''; if (++bad >= 5) { bad = 0; lock = Date.now() + 30000; } say('コードがちがいます。もう一度お確かめください。', 1); return draw(); }
      set(K, JSON.stringify({ h: r[0], shop: r[1].shop || '', at: Date.now(), ck: Date.now() }));
      on = false; root.remove();
    }).catch(function () { busy = false; say('確認できませんでした。もう一度 Enter を押してください。', 1); draw(); });
  }
  function key(k) {
    if (busy) return;
    if (/^[0-9]$/.test(k)) { if (val.length < N) { val += k; say('テンキーで12けたの数字を入れると、自動で確かめます。まちがえたら Back Space。'); draw(); if (val.length === N) go(); } }
    else if (k === 'Backspace' || k === 'Delete') { val = val.slice(0, -1); draw(); }
    else if (k === 'Enter') go();
  }
  ['keydown', 'keyup', 'keypress'].forEach(function (t) {
    window.addEventListener(t, function (e) {
      if (!on) return;
      e.stopImmediatePropagation();
      if (t === 'keydown' && (/^[0-9]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter')) { e.preventDefault(); if (root) key(e.key); }
    }, true);
  });
  function build() {
    var css = '#lgt{position:fixed;inset:0;z-index:2147483000;background:#000;color:#F3F4EF;font-family:"Noto Sans JP","Hiragino Sans","Yu Gothic",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:2.2vmin;box-sizing:border-box}' +
      '#lgt *{box-sizing:border-box}#lgt .f{width:100%;height:100%;border:.45vmin solid #C0FC09;border-radius:3.4vmin;box-shadow:0 0 3.2vmin rgba(192,252,9,.55),inset 0 0 2.4vmin rgba(192,252,9,.22);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.6vmin;padding:3vmin;overflow:auto}' +
      '#lgt .b{font-family:Anton,Impact,sans-serif;font-size:3.2vmin;letter-spacing:.34em;line-height:1;text-align:center}#lgt h1{margin:0;font-size:6.4vmin;font-weight:900;line-height:1.3;text-align:center}' +
      '#lgt .r{display:flex;gap:2.6vmin;flex-wrap:wrap;justify-content:center}#lgt .g{display:flex;gap:.9vmin}#lgt .c{width:6.6vmin;height:9vmin;border-radius:1.5vmin;background:#171A22;border:.35vmin solid #3A3F4C;display:flex;align-items:center;justify-content:center;font-family:Anton,Impact,sans-serif;font-size:6vmin;line-height:1}' +
      '#lgt .c.on{border-color:#C0FC09;box-shadow:0 0 1.6vmin rgba(192,252,9,.6)}#lgt .m{margin:0;font-size:2.7vmin;font-weight:700;line-height:1.6;text-align:center;color:#D5D8CF;min-height:4.4vmin}#lgt .m.e{color:#FF8A8A;font-weight:900}' +
      '#lgt .p{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1vmin;width:min(92%,84vmin)}#lgt .p button{appearance:none;border:0;border-radius:1.6vmin;background:#262A35;color:#F3F4EF;font:900 3.4vmin/1 "Noto Sans JP",sans-serif;height:7.4vmin;cursor:pointer;touch-action:manipulation}#lgt .p button.w{background:#C0FC09;color:#171A22}' +
      '#lgt .l{display:flex;align-items:center;gap:2vmin;max-width:92%}#lgt .l img{flex:none;width:13vmin;height:13vmin;background:#fff;border-radius:1.2vmin;padding:.6vmin}#lgt .l p{margin:0;font-size:2.3vmin;font-weight:700;line-height:1.7;color:#A3A8B5}#lgt .l b{color:#F3F4EF;font-weight:900}' +
      '@media (orientation:portrait){#lgt .c{width:5.6vmin;height:8vmin;font-size:5vmin}#lgt .g{gap:.6vmin}#lgt .r{gap:1.8vmin}#lgt .p{grid-template-columns:repeat(3,minmax(0,1fr));width:min(92%,70vmin)}#lgt .p button{height:10vmin;font-size:4.6vmin}#lgt .m{font-size:3.4vmin}#lgt .l p{font-size:3vmin}#lgt .l img{width:20vmin;height:20vmin}}';
    root = document.createElement('div'); root.id = 'lgt'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', '利用コードの入力');
    var g = ''; for (var i = 0; i < 3; i++) g += '<div class="g"><div class="c"></div><div class="c"></div><div class="c"></div><div class="c"></div></div>';
    var p = ''; '1234567890'.split('').forEach(function (d) { p += '<button type="button" data-k="' + d + '">' + d + '</button>'; });
    root.innerHTML = '<style>' + css + '</style><div class="f"><div class="b">VIBES BILLIARDS DIGITAL LAB</div><h1>利用コードを入れてください</h1><div class="r" aria-live="polite">' + g + '</div><p class="m"></p>' +
      '<div class="p">' + p + '<button type="button" data-k="Backspace">消す</button><button type="button" class="w" data-k="Enter">決定</button></div>' +
      '<div class="l"><img src="/img/line-qr.svg" alt="VIBES BILLIARDS 公式LINE のQRコード"><p>利用コードは、<b>VIBES BILLIARDS 公式LINE</b>（@361mehjz）でお申し込みいただいたお店にお送りしています。<br>くわしくは <b>vibesbilliards.com/pages/digital-lab</b></p></div></div>';
    document.body.appendChild(root);
    cells = root.querySelectorAll('.c'); msg = root.querySelector('.m');
    root.addEventListener('click', function (e) { var b = e.target.closest('button[data-k]'); if (b) key(b.getAttribute('data-k')); });
    say('テンキーで12けたの数字を入れると、自動で確かめます。まちがえたら Back Space。'); draw();
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
