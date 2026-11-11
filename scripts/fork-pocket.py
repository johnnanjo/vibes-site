# One-time fork: builds static/apps/count-pocket.html from count-3c.html + scripts/pocket-core.js
import re,io
s=open('static/apps/count-3c.html').read()
core=open('scripts/pocket-core.js').read()
def rep(a,b,n=1):
    global s
    assert a in s,'MISSING: '+a[:80]
    s=s.replace(a,b,n) if n else s.replace(a,b)
i=s.index("  var PCOL = ['#FFFFFF'"); j=s.index("  /* ===== player entry by numeric keypad ===== */")
s=s[:i]+"  var RK = 'vibes-count-pocket-roster-v1', hi = function () { return 0; }, avg = function () { return '0'; };\n"+core+s[j:]
s=s.replace('vibes-count-3c','vibes-count-pocket')
rep('<title>スリークッション デジタルカウント（モニター＋テンキー）｜VIBES BILLIARDS</title>','<title>ポケット デジタルカウント（ボーラード・9ボール・10ボール・5-9・5-10）｜VIBES BILLIARDS</title>')
s=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="モニターとテンキーで使えるポケットビリヤードのデジタルカウント。ボーラード、9ボール、10ボール、5-9、5-10。">',s,1)
rep('https://vibesbilliards.com/pages/count-3c','https://vibesbilliards.com/pages/count-pocket')
s=re.sub(r'<link rel="manifest"[^>]*>\n','',s,1)
rep('<span class="ttl" id="ttl">3-CUSHION SCOREBOARD</span>','<span class="ttl" id="ttl">POCKET SCOREBOARD</span>')
rep('<div class="box inn"><small>INNING</small>','<div class="box inn"><small id="midL">RACK</small>')
i=s.index('    <div class="keys" style="margin-top:.8vh">'); j=s.index('    </div>',i)+len('    </div>')
s=s[:i]+'    <div class="keys" id="mainK" style="margin-top:.8vh"></div>'+s[j:]
rep('<thead><tr><th></th><th>得点</th><th>イニング</th><th>ハイラン</th><th>アベレージ</th></tr></thead>','<thead><tr id="wH"></tr></thead>')
# settings form
rep('      <div class="f"><label for="fnp">人数</label><select id="fnp"><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>',
    '      <div class="f"><label for="fmd">種目</label><select id="fmd"><option value="bowlard">ボーラード</option><option value="nine">9ボール</option><option value="ten">10ボール</option><option value="g59">5-9</option><option value="g510">5-10</option></select></div>\n      <div class="f"><label for="fnp">人数</label><select id="fnp"></select></div>')
for k in range(4):
    a=f'<div class="f pf{k}"><label for="fg{k}">選手{k+1}の持ち点</label>'
    rep(a,f'<div class="f pf{k} pg{k}"><label for="fg{k}">選手{k+1}のセット数（先取）</label>')
rep('<div class="f"><label for="fl">イニング制限（0＝なし）</label>','<div class="f o-g5"><label for="fl">ラック数の上限（0＝なし）</label>')
rep('<div class="f"><label for="fe">裏撞き（全員が撞いてから終了）</label><select id="fe"><option value="1">あり</option><option value="0">なし</option></select></div>',
    '<div class="f o-set"><label for="fe">ブレイク</label><select id="fe"><option value="alt">交互</option><option value="win">勝った人</option></select></div>\n      <div class="f o-g5"><label for="fpb">かけ玉と点（例：5=1,9=2）</label><input id="fpb" maxlength="60" autocomplete="off"></div>\n      <div class="f o-g5"><label for="fdb">サイド2倍</label><select id="fdb"><option value="1">あり</option><option value="0">なし</option></select></div>')
rep("  $('fnp').addEventListener('change', setRows);","  $('fnp').addEventListener('change', setRows); $('fmd').addEventListener('change', setRows);")
# wizard
rep("step: fresh() && !p ? 'count' : 'mode'","step: fresh() && !p ? 'game' : 'mode'")
rep("    if (W.step === 'count') {\n      h.appendChild(document.createTextNode('人数を選ぶ'));\n      var bx = el('div', 'opts c3');\n      [2, 3, 4].forEach(function (n) {",
"""    if (W.step === 'game') {
      h.appendChild(document.createTextNode('種目を選ぶ'));
      var bg = el('div', 'opts c3');
      MKEYS.forEach(function (k, i) { var o = el('div', 'opt' + (k === S.cfg.mode ? ' sel' : '')); o.appendChild(el('kbd', '', String(i + 1))); o.appendChild(el('span', '', MODES[k].jp)); bg.appendChild(o); });
      b.appendChild(bg); keysHelp([['1-5', '選ぶ'], ['Enter', M().jp + ' のまま']]); return;
    }
    if (W.step === 'count') {
      h.appendChild(document.createTextNode('人数を選ぶ（' + M().jp + '）'));
      var bx = el('div', 'opts c3'), rng = []; for (var ri = M().min; ri <= M().max; ri++) rng.push(ri);
      rng.forEach(function (n) {""")
rep("keysHelp([['2-4', '選ぶ'], ['Enter', NP() + '人のまま']])","keysHelp([[M().min + '-' + M().max, '選ぶ'], ['Enter', NP() + '人のまま'], ['BackSpace', '種目にもどる']])")
rep("""    if (W.step === 'count') {
      if (d >= 2 && d <= 4) { if (d !== NP()) { setN(d); render(); } W.step = 'mode'; wzDraw(); }
      else if (k === 'Enter') { W.step = 'mode'; wzDraw(); }
      return true;
    }""","""    var afterGame = function () { W.step = M().min === M().max ? 'mode' : 'count'; wzDraw(); };
    if (W.step === 'game') {
      if (d >= 1 && d <= 5) { if (MKEYS[d - 1] !== S.cfg.mode) { setMode(MKEYS[d - 1]); render(); } afterGame(); }
      else if (k === 'Enter') afterGame();
      return true;
    }
    if (W.step === 'count') {
      if (d >= M().min && d <= M().max) { if (d !== NP()) { setN(d); render(); } W.step = 'mode'; wzDraw(); }
      else if (k === 'Enter') { W.step = 'mode'; wzDraw(); }
      else if (k === 'Backspace') { W.step = 'game'; wzDraw(); }
      return true;
    }""")
rep("else if (k === 'Backspace' && fresh()) { W.step = 'count'; wzDraw(); }","else if (k === 'Backspace' && fresh()) { W.step = M().min === M().max ? 'game' : 'count'; wzDraw(); }")
rep("  function targetStart(g) { W.step = 'target'; W.num = String(g || 25); W.fresh = true; wzDraw(); }","  function targetStart(g) { if (!M().target) { W.num = '1'; return targetDone(); } W.step = 'target'; W.num = String(g && g <= 20 ? g : 5); W.fresh = true; wzDraw(); }")
rep("var g = Math.max(1, Math.min(999, parseInt(W.num, 10) || 25)), c = W.cur;","var g = Math.max(1, Math.min(99, parseInt(W.num, 10) || 5)), c = W.cur;")
rep("'持ち点 — ' +","'セット数（先取） — ' +")
rep("inp2.appendChild(el('small', '', '点'))","inp2.appendChild(el('small', '', 'セット先取'))")
rep("keysHelp([['0-9', '点数を入れる'], ['Enter', '決定'], ['BackSpace', '消す・戻る']])","keysHelp([['0-9', 'セット数を入れる'], ['Enter', '決定'], ['BackSpace', '消す・戻る']])")
rep("if ('serviceWorker' in navigator &&","if (false && 'serviceWorker' in navigator &&")
rep("else if (S.cfg.n.every(isDefName) && fresh()) wzOpen(0);","else if (S.cfg.n.every(isDefName) && fresh()) wzOpen(0);")
css='''/* ---- pocket: cloth colour, bowling sheet, signed scores ---- */
#bRm{display:none}
.side,.rdc{background:radial-gradient(120% 90% at 28% 0%,rgba(255,255,255,.16),transparent 56%),repeating-linear-gradient(135deg,rgba(255,255,255,.028) 0 2px,transparent 2px 4px),linear-gradient(180deg,#6E7683 0%,#5A616C 46%,#434953 100%)}
.rdc{background:linear-gradient(180deg,#6E7683 0%,#5A616C 46%,#434953 100%)}
.main.n1{grid-template-columns:1fr minmax(16vw,20vw)}.rdm.n1{grid-template-columns:minmax(0,60vw);justify-content:center}
.score.neg{opacity:.78}
.m-g59 .score,.m-g510 .score{font-size:min(34vh,15vw)}.m-g59 .score.d3,.m-g510 .score.d3{font-size:min(26vh,10.5vw)}
.n3.m-g59 .score,.n3.m-g510 .score{font-size:min(28vh,10.5vw)}.n3.m-g59 .score.d3,.n3.m-g510 .score.d3{font-size:min(22vh,7.6vw)}
.n4.m-g59 .score,.n4.m-g510 .score{font-size:min(24vh,8vw)}.n4.m-g59 .score.d3,.n4.m-g510 .score.d3{font-size:min(18vh,5.8vw)}
.m-bowlard .score.d3{font-size:min(34vh,13.5vw)}.n2.m-bowlard .score.d3{font-size:min(30vh,11.5vw)}
.sheet .row span.bf{min-width:6.2vw;padding:.2vh .3vw;display:grid;gap:0;line-height:1.25}
.sheet .row span.bf i{font-style:normal;font-family:"Noto Sans JP",sans-serif;font-weight:900;font-size:1.8vh;color:#C9CDD6;letter-spacing:.06em}
.sheet .row span.bf b{font-weight:400;font-size:2.4vh}
.sheet .row span.bf.s i,.sheet .row span.bf.p i{color:var(--yellow)}
.sheet .row span.bf.z i{color:#5B6070}
.sheet.n3 .row span.bf b,.sheet.n4 .row span.bf b{font-size:1.9vh}.sheet.n3 .row span.bf i,.sheet.n4 .row span.bf i{font-size:1.5vh}
'''
rep("@media (prefers-reduced-motion:reduce){.side,.segs i{transition:none}}",css+"@media (prefers-reduced-motion:reduce){.side,.segs i{transition:none}}")
rep('名前と持ち点は、このパソコンに保存されます。次からは名前を選ぶと、持ち点が自動で入ります。','登録した選手の名前は、このパソコンに保存されます。')
open('static/apps/count-pocket.html','w').write(s)
print('forked',len(s))
