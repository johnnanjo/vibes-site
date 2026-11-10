/* VIBES LIVE TABLE */
window.VIBES_SITE=true;
(function(){document.getElementById("lt-root").innerHTML="<header class=\"top\">\n  <div class=\"brand\"><b>VIBES</b><span>LIVE TABLE</span></div>\n  <div class=\"plan\" role=\"group\" aria-label=\"プラン\"><button type=\"button\" data-p=\"free\" aria-pressed=\"true\">FREE</button><button type=\"button\" data-p=\"pro\" aria-pressed=\"false\">PRO</button></div>\n  <nav class=\"tabs\" role=\"tablist\" aria-label=\"モード\">\n    <button class=\"tab\" role=\"tab\" data-v=\"carom\" aria-selected=\"true\">キャロム版</button>\n    <button class=\"tab\" role=\"tab\" data-v=\"pocket\" aria-selected=\"false\">ポケット版</button>\n    <button class=\"tab\" role=\"tab\" data-v=\"records\" aria-selected=\"false\">記録</button>\n    <button class=\"tab\" role=\"tab\" data-v=\"live\" aria-selected=\"false\">LIVE</button>\n  </nav>\n</header>\n\n<main>\n  <section class=\"view\" id=\"v-carom\"></section>\n  <section class=\"view\" id=\"v-pocket\" hidden></section>\n  <section class=\"view\" id=\"v-records\" hidden></section>\n  <section class=\"view\" id=\"v-live\" hidden></section>\n  <p class=\"foot\" id=\"foot\">VIBES LIVE TABLE ─ 台のそばに置くスコアボード。FREE：キャロム版（カウント・ハイラン・アベレージ・イニング・40秒タイマー・ゲーム時間）、ポケット版（ラック数・マスワリ・ボーラードのスコア表）。PRO：カウントの声・エクステンション・カメラ・記録・LIVE。試合の記録はこの端末に保存されます。</p>\n</main>\n";})();

(function(){
"use strict";
var SITE=!!window.VIBES_SITE;
var $=function(s,r){return (r||document).querySelector(s);};
function h(tag,attrs,kids){var e=document.createElement(tag);if(attrs)for(var k in attrs){var v=attrs[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v);}
  (kids||[]).forEach(function(c){if(c==null||c===false)return;e.appendChild(typeof c==='string'||typeof c==='number'?document.createTextNode(String(c)):c);});return e;}
function clone(o){return JSON.parse(JSON.stringify(o));}
var KEY='vibes-live-table-v1';
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}}
function store(){try{localStorage.setItem(KEY,JSON.stringify(DB));}catch(e){}}
var DB=load();DB.history=DB.history||[];DB.prefs=DB.prefs||{};
var APP={view:'carom',carom:DB.carom||null,pocket:DB.pocket||null,undo:{carom:[],pocket:[]},confirm:null,sheet:false};
function persist(){DB.carom=APP.carom;DB.pocket=APP.pocket;store();pushLive();}

/* ---------- sound & voice ---------- */
var AC=null;function beep(f,d){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();var o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f||880;o.connect(g);g.connect(AC.destination);g.gain.setValueAtTime(.25,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+(d||.15));o.start();o.stop(AC.currentTime+(d||.15));}catch(e){}}
function say(t){if(!pro()||!DB.prefs.voice)return;try{if(!window.speechSynthesis)return;speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=1.05;speechSynthesis.speak(u);}catch(e){}}
if(DB.prefs.voice===undefined)DB.prefs.voice=true;if(DB.prefs.count===undefined)DB.prefs.count=true;if(!DB.prefs.plan)DB.prefs.plan='free';
if(SITE)DB.prefs.plan='free';
function pro(){return !SITE&&DB.prefs.plan==='pro';}
var KANA=['ゼロ','いち','に','さん','よん','ご','ろく','なな','はち','きゅう','じゅう'];
function sayNum(n){say(n<=10?KANA[n]:String(n));}

/* ---------- shot clock ---------- */
var CLK={running:false,remain:0,total:0,last:0,warned:false,count:-1,owner:null,tid:null};
function clockCfg(){var m=APP[APP.view];if(!m||!m.clock||!m.clock.on||m.done)return null;if(m.kind!=='carom'&&!pro())return null;return m.clock;}
function clockReset(start){var c=clockCfg();CLK.owner=APP.view;if(!c){CLK.running=false;renderClock();return;}CLK.total=c.sec;CLK.remain=c.sec;CLK.warned=false;CLK.count=-1;CLK.running=!!start;CLK.last=performance.now();renderClock();}
function clockTick(){if(!CLK.running)return;var now=performance.now(),dt=(now-CLK.last)/1000;CLK.last=now;CLK.remain=Math.max(0,CLK.remain-dt);
  if(!CLK.warned&&CLK.remain<=10&&CLK.total>10){CLK.warned=true;say('残り10秒');}
  var s=Math.ceil(CLK.remain);if(CLK.remain<=5&&s>0&&s!==CLK.count){CLK.count=s;beep(880,.12);}
  if(CLK.remain<=0){CLK.running=false;beep(330,.6);say('タイムアウト');}
  renderClock();}
setInterval(clockTick,100);
function clockExtend(){var m=APP[APP.view],c=clockCfg();if(!c||!m||m.done)return;var i=m.cur;if(m.ext[i]<=0)return;m.ext[i]--;CLK.remain+=c.extSec;CLK.total=Math.max(CLK.total,CLK.remain);CLK.warned=CLK.remain<=10;CLK.count=-1;if(!CLK.running){CLK.running=true;CLK.last=performance.now();}say('エクステンション');persist();render();}
function renderClock(){var el=$('#clock');if(!el||CLK.owner!==APP.view)return;var c=clockCfg();
  el.classList.toggle('off',!c);el.classList.toggle('w',!!c&&CLK.remain<=10&&CLK.remain>0);el.classList.toggle('z',!!c&&CLK.remain<=0&&CLK.total>0);
  $('.t',el).textContent=c?Math.ceil(CLK.remain):'--';$('.bar i',el).style.transform='scaleX('+(c&&CLK.total?CLK.remain/CLK.total:0)+')';
  el.classList.toggle('paused',!!c&&!CLK.running&&CLK.remain>0);var stt=$('.state',el);if(stt)stt.textContent=!c?'':(CLK.running?'カウントダウン中':(CLK.remain<=0?'タイムアウト':'ストップ'));
  var pb=$('#clkPlay');if(pb)pb.textContent=CLK.running?'一時停止':(CLK.remain<=0?'もう一度':'スタート');}
function clockBox(m){var c=m.clock;var names=m.p.map(function(p){return p.name;});
  return h('div',{class:'clock'+(c.on?'':' off'),id:'clock'},[
    h('div',{class:'t num',text:'--'}),
    h('div',null,[h('div',{class:'bar'},[h('i')]),h('div',{class:'lbl',text:c.on?'ショットクロック '+c.sec+'秒・エクステンション +'+c.extSec+'秒（'+names[0]+' 残り'+m.ext[0]+'回 / '+names[1]+' 残り'+m.ext[1]+'回）'+(m.kind==='pocket'?' ※ラックごとに'+c.extMax+'回':''):'ショットクロックはオフです（新しい試合の設定でオンにできます）'})]),
    c.on?h('div',{class:'cx'},[
      h('button',{class:'btn',id:'clkPlay',onclick:function(){if(m.done)return;if(CLK.remain<=0){clockReset(true);return;}CLK.running=!CLK.running;CLK.last=performance.now();renderClock();}},['スタート']),
      h('button',{class:'btn',onclick:function(){clockReset(false);}},['リセット']),
      h('button',{class:'btn',disabled:m.done||m.ext[m.cur]<=0,onclick:clockExtend},['エクステンション（'+m.p[m.cur].name+'）'])]):null]);}

/* ---------- live (db) ---------- */
var LIVE={db:null,ready:false,unsub:null,docs:[],err:''};var liveTimer=null;
if(window.claude&&window.claude.use){window.claude.use('db').then(function(db){LIVE.db=db;LIVE.ready=true;if(db)subscribeLive();if(APP.view==='live'||APP.view==='records')render();}).catch(function(){LIVE.ready=true;});}else LIVE.ready=true;
setTimeout(function(){if(!LIVE.ready){LIVE.ready=true;if(APP.view==='live')render();}},10500);
function subscribeLive(){if(LIVE.unsub||!LIVE.db)return;try{LIVE.unsub=LIVE.db.collection('tables').onSnapshot(function(s){LIVE.docs=s.docs.map(function(d){return Object.assign({id:d.id},d.data());});if(APP.view==='live')render();},function(e){LIVE.err=(e&&e.message)||'読み込めませんでした';if(APP.view==='live')render();});}catch(e){LIVE.err='読み込めませんでした';}}
function summary(m){if(!m)return null;var s={kind:m.kind,disc:m.discName,table:m.table,done:!!m.done,cur:m.cur,updated:Date.now(),names:[m.p[0].name,m.p[1].name]};
  if(m.kind==='carom'){s.scores=[m.p[0].score,m.p[1].score];s.goal=[m.p[0].target,m.p[1].target];s.inn=caromInnings(m);s.avg=[avg(m,0),avg(m,1)];s.hr=[m.p[0].hr,m.p[1].hr];}
  else{s.scores=[m.p[0].racks,m.p[1].racks];s.goal=[m.p[0].race,m.p[1].race];s.rack=m.rackNo;}return s;}
function pushLive(){var m=APP[APP.view];if(!LIVE.db||!m||!m.live||!m.table||m.disc==='bowl')return;clearTimeout(liveTimer);liveTimer=setTimeout(function(){var s=summary(m);LIVE.db.doc('tables/table-'+String(m.table).replace(/[^\w-]/g,'')).set(s).catch(function(){});},700);}
function saveGameShared(rec){if(!LIVE.db)return;try{LIVE.db.collection('games').doc(rec.id).set(rec).catch(function(){});}catch(e){}}

/* ---------- carom ---------- */
var CDISC={'3c':'スリークッション','1c':'ワンクッション（バンド）','free':'フリー','4b':'四つ球'};
function newCarom(f){return {kind:'carom',disc:f.disc,discName:CDISC[f.disc],table:f.table,live:f.live,
  p:[{name:f.na||'プレイヤーA',target:+f.ta||30,score:0,hr:0,turns:[]},{name:f.nb||'プレイヤーB',target:+f.tb||30,score:0,hr:0,turns:[]}],
  first:+f.first||0,cur:+f.first||0,run:0,limit:+f.limit||25,equal:!!f.equal,final:false,done:false,winner:null,
  clock:{on:f.clk===''?true:!!f.clk,sec:+f.sec||40,extSec:+f.extSec||40,extMax:f.ext===''?2:+f.ext},ext:[f.ext===''?2:+f.ext,f.ext===''?2:+f.ext],started:Date.now(),id:'c'+Date.now().toString(36)};}
function caromInnings(m){return Math.max(m.p[0].turns.length,m.p[1].turns.length)+(m.done?0:(m.p[m.cur].turns.length>=m.p[1-m.cur].turns.length?1:0));}
function innOf(m,i){return m.p[i].turns.length+(!m.done&&m.cur===i?1:0);}
function avg(m,i){var n=innOf(m,i);return n?m.p[i].score/n:0;}
function cSnap(){APP.undo.carom.push(clone(APP.carom));if(APP.undo.carom.length>200)APP.undo.carom.shift();}
function cPoint(d){var m=APP.carom;if(!m||m.done)return;cSnap();var p=m.p[m.cur];
  if(d<0){if(m.run<=0){APP.undo.carom.pop();return;}m.run--;p.score--;p.hr=Math.max(p.hr,0);recomputeHR(m);}
  else{m.run++;p.score++;if(m.run>p.hr)p.hr=m.run;
    if(p.score>=p.target){var second=1-m.first;
      if(m.cur===m.first&&m.equal&&!m.final){endTurn(m);m.final=true;m.cur=second;m.run=0;say(p.name+'、持ち点到達。'+m.p[second].name+'、最後のイニングです');persist();clockReset(true);render();return;}
      endTurn(m);finishCarom(m);return;}}
  if(d>0&&DB.prefs.count)sayNum(p.score);persist();if(d>0)clockReset(true);render();}
function recomputeHR(m){m.p.forEach(function(p,i){var hr=0;p.turns.forEach(function(t){if(t>hr)hr=t;});if(i===m.cur&&m.run>hr)hr=m.run;p.hr=hr;});}
function endTurn(m){m.p[m.cur].turns.push(m.run);}
function cMiss(){var m=APP.carom;if(!m||m.done)return;cSnap();endTurn(m);var wasSecond=m.cur!==m.first;
  if(m.final){finishCarom(m);return;}
  if(wasSecond&&m.limit&&m.p[m.cur].turns.length>=m.limit){finishCarom(m);return;}
  m.cur=1-m.cur;m.run=0;persist();clockReset(true);render();}
function finishCarom(m){m.done=true;m.ended=Date.now();m.run=0;var a=m.p[0],b=m.p[1];
  var ra=a.score/a.target,rb=b.score/b.target;m.winner=(a.score>=a.target&&b.score>=b.target)?-1:(a.score>=a.target?0:(b.score>=b.target?1:(ra>rb?0:rb>ra?1:-1)));
  var rec={id:m.id,kind:'carom',disc:m.disc,discName:m.discName,date:new Date().toISOString().slice(0,10),ended:Date.now(),winner:m.winner,inn:Math.max(a.turns.length,b.turns.length),
    p:m.p.map(function(p){return {name:p.name,score:p.score,target:p.target,hr:p.hr,inn:p.turns.length,turns:p.turns.slice()};})};
  DB.history.unshift(rec);DB.history=DB.history.slice(0,500);saveGameShared(rec);persist();CLK.running=false;say(m.winner<0?'引き分けです':m.p[m.winner].name+'の勝ちです');render();}
function cUndo(){var u=APP.undo.carom;if(!u.length)return;var prev=u.pop();if(APP.carom&&APP.carom.done&&!prev.done){DB.history=DB.history.filter(function(r){return r.id!==APP.carom.id;});}APP.carom=prev;persist();clockReset(true);render();}

/* ---------- pocket ---------- */
var PDISC={'9b':'9ボール','10b':'10ボール','8b':'8ボール','bowl':'ボーラード'};
function newBowl(f){var ps=[{name:f.na||'プレイヤーA',rolls:[]}];if(f.nb)ps.push({name:f.nb,rolls:[]});return {kind:'pocket',disc:'bowl',discName:'ボーラード',table:f.table,live:false,p:ps,cur:0,done:false,winner:null,clock:{on:false},ext:[0,0],started:Date.now(),id:'b'+Date.now().toString(36)};}
function bStatus(r){var i=0;for(var f=0;f<9;f++){if(i>=r.length)return {f:f,k:0,max:10};if(r[i]===10){i++;continue;}if(i+1>=r.length)return {f:f,k:1,max:10-r[i]};i+=2;}
  var t=r.slice(i);if(t.length===0)return {f:9,k:0,max:10};if(t.length===1)return {f:9,k:1,max:t[0]===10?10:10-t[0]};
  if(t.length===2){if(t[0]===10)return {f:9,k:2,max:t[1]===10?10:10-t[1]};if(t[0]+t[1]===10)return {f:9,k:2,max:10};}return {done:true,f:10};}
function bFresh(r,b){if(b.done)return false;if(b.k===0)return true;if(b.f<9)return false;var i=0;for(var f=0;f<9;f++)i+=r[i]===10?1:2;var t=r.slice(i);if(b.k===1)return t[0]===10;return t[1]===10||(t[0]<10&&t[0]+t[1]===10);}
function bLabel(r,b,n){var fr=bFresh(r,b);if(n===10&&fr)return 'ストライク';if(!fr&&n===b.max&&n>0)return 'スペア';return '';}
function bFrames(r){var fr=[],i=0,tot=0,ok=true;for(var f=0;f<10;f++){var o={marks:[],score:null};
    if(f<9){if(i>=r.length){fr.push(o);continue;}
      if(r[i]===10){o.marks=['','X'];o.x=1;var s=(r[i+1]!=null&&r[i+2]!=null)?10+r[i+1]+r[i+2]:null;i++;o.raw=s;}
      else{var a=r[i],b=r[i+1];o.marks=[a===0?'-':String(a),b==null?'':(a+b===10?'/':(b===0?'-':String(b)))];if(b!=null&&a+b===10)o.sp=1;o.raw=b==null?null:(a+b===10?(r[i+2]!=null?10+r[i+2]:null):a+b);i+=b==null?1:2;}}
    else{var t=r.slice(i,i+3);o.marks=t.map(function(v,k){if(v===10&&(k===0||t[k-1]===10||(k===2&&t[0]+t[1]===10)))return 'X';if(k>0&&t[k-1]!==10&&!(k===2&&t[0]+t[1]===10)&&t[k-1]+v===10)return '/';return v===0?'-':String(v);});
      var need=(t[0]===10||(t.length>1&&t[0]+t[1]===10))?3:2;o.raw=t.length>=need?t.reduce(function(x,y){return x+y;},0):null;}
    if(o.raw!=null&&ok){tot+=o.raw;o.score=tot;}else ok=false;fr.push(o);}
  return {frames:fr,total:tot};}
function bRoll(n){var m=APP.pocket;if(!m||m.done)return;var p=m.p[m.cur],b=bStatus(p.rolls);if(b.done||n>b.max)return;pSnap();p.rolls.push(n);var a=bStatus(p.rolls);
  var lb0=bLabel(p.rolls.slice(0,-1),b,n);if(DB.prefs.count)say(lb0||String(n));
  if(a.done||a.f!==b.f){var nx=m.cur;for(var k=1;k<=m.p.length;k++){var c=(m.cur+k)%m.p.length;if(!bStatus(m.p[c].rolls).done){nx=c;break;}}
    if(m.p.every(function(q){return bStatus(q.rolls).done;})){finishBowl(m);return;}m.cur=nx;}
  persist();render();}
function finishBowl(m){m.done=true;m.ended=Date.now();var sc=m.p.map(function(q){return bFrames(q.rolls).total;});var best=Math.max.apply(null,sc);m.winner=sc.filter(function(x){return x===best;}).length>1?-1:sc.indexOf(best);
  var rec={id:m.id,kind:'bowl',disc:'bowl',discName:'ボーラード',date:new Date().toISOString().slice(0,10),ended:Date.now(),winner:m.winner,p:m.p.map(function(q,i){var fr=bFrames(q.rolls).frames;return {name:q.name,score:sc[i],strikes:fr.filter(function(f){return f.x;}).length,spares:fr.filter(function(f){return f.sp;}).length};})};
  DB.history.unshift(rec);DB.history=DB.history.slice(0,500);saveGameShared(rec);persist();say(m.p.length>1?(m.winner<0?'引き分けです':m.p[m.winner].name+'の勝ちです'):sc[0]+'点です');render();}
function bowlSheet(m,pi){var q=m.p[pi],F=bFrames(q.rolls),st=bStatus(q.rolls),cur=!m.done&&m.cur===pi?st.f:-1;
  return h('div',{class:'bw-sheet'},[h('table',{class:'bw'},[h('thead',null,[h('tr',null,[1,2,3,4,5,6,7,8,9,10].map(function(n){return h('th',{text:String(n)});}).concat([h('th',{text:'計'})]))]),
    h('tbody',null,[h('tr',null,F.frames.map(function(fr,k){var ms=k<9?[fr.marks[0]||'',fr.marks[1]||'']:[fr.marks[0]||'',fr.marks[1]||'',fr.marks[2]||''];
      return h('td',{class:k===cur?'cur':''},[h('div',{class:'rolls'},ms.map(function(x){return h('span',{class:x==='X'?'x':(x==='/'?'sp':''),text:x});})),h('div',{class:'tot',text:fr.score==null?'':String(fr.score)})]);}).concat([h('td',{class:'sum',text:String(F.total)})]))])])]);}
function bowlBoard(m){var wrap=h('div',{class:'board'});if(!m.done)wrap.appendChild(h('p',{class:'rot',text:'📱 スマホは横向きにすると、スコアが大きく見やすくなります'}));
  wrap.appendChild(h('div',{class:'bhead'},[h('div',{class:'disc'},[h('span',{class:'chip'},['種目 ',h('b',{text:'ボーラード'})]),h('span',{class:'chip'},['台 ',h('b',{text:m.table||'-'})]),h('span',{class:'chip',text:'10フレーム・最高300点'})]),h('div',{class:'msg',id:'msg',text:MSG})]));
  if(m.done){var sc=m.p.map(function(q){return bFrames(q.rolls).total;});wrap.appendChild(h('div',{class:'result',style:'border-color:var(--b)'},[h('h2',{text:m.p.length>1?(m.winner<0?'DRAW':m.p[m.winner].name+' WIN'):sc[0]+' 点'}),h('p',{text:m.p.map(function(q,i){return q.name+'：'+sc[i]+'点';}).join('　｜　')})]));}
  m.p.forEach(function(q,i){var on=!m.done&&m.cur===i,F=bFrames(q.rolls),b=bStatus(q.rolls);
    var card=h('div',{class:'pl'+(i?' pb':'')+(on?' on':''),style:'gap:12px'},[h('div',{class:'pl-top'},[h('div',{class:'pl-name',text:q.name}),h('span',{class:'pl-tag'+(on?'':' off'),text:on?'AT TABLE':(b.done?'FINISH':'WAIT')})]),
      h('div',{class:'score'},[h('span',{class:'big',style:'font-size:clamp(72px,10vw,120px)',text:String(F.total)}),h('span',{class:'of num',text:b.done?'最終スコア':'フレーム '+(b.f+1)+'・'+(b.k+1)+'投目'})]),bowlSheet(m,i)]);
    if(on){var pad=h('div',{class:'pad'});for(var n=0;n<=b.max;n++)(function(n){var lbl=bLabel(q.rolls,b,n);
        pad.appendChild(h('button',{class:'btn'+(lbl?' hi':''),onclick:function(){bRoll(n);}},[String(n),lbl?h('small',{text:lbl}):null]));})(n);
      card.appendChild(h('div',null,[h('p',{class:'note',style:'margin-bottom:6px',text:'このイニングで入った球の数をタップ（1フレーム＝10球・2イニング）'}),pad]));}
    wrap.appendChild(card);});
  wrap.appendChild(h('div',{class:'tools'},[h('button',{class:'btn',disabled:!APP.undo.pocket.length,onclick:pUndo},['1つ戻す']),(function(){var d=document.documentElement;return d.requestFullscreen||d.webkitRequestFullscreen;})()?h('button',{class:'btn',onclick:fullLand},[document.fullscreenElement||document.webkitFullscreenElement?'全画面を終わる':'全画面（横向き）']):null,h('button',{class:'btn danger',onclick:function(){APP.confirm='pocket';render();}},[m.done?'新しい試合':'試合をやめる'])]));
  if(APP.confirm==='pocket')wrap.appendChild(h('div',{class:'confirm'},[m.done?'新しい試合の設定に進みますか？':'この試合を記録せずに終了しますか？',h('button',{class:'btn danger',onclick:function(){APP.pocket=null;APP.undo.pocket=[];APP.confirm=null;MSG='';persist();render();}},[m.done?'進む':'終了する']),h('button',{class:'btn',onclick:function(){APP.confirm=null;render();}},['キャンセル'])]));
  wrap.appendChild(h('p',{class:'note',text:'ボーラードは、ボウリングのように点数をつけるポケットビリヤードの練習ゲームです。10球を並べ、1フレームに2イニング。1イニング目で10球すべて入れたらストライク（次の2イニングの球数を加算）、2イニングで10球入れたらスペア（次の1イニングの球数を加算）。10フレーム目はボーナスのイニングがあります。'}));
  return wrap;}
function newPocket(f){if(f.disc==='bowl')return newBowl(f);return {kind:'pocket',disc:f.disc,discName:PDISC[f.disc],table:f.table,live:f.live,breakRule:f.brk,
  p:[{name:f.na||'プレイヤーA',race:+f.ra||7,racks:0,br:0,ace:0,fouls:0,rf:0},{name:f.nb||'プレイヤーB',race:+f.rb||7,racks:0,br:0,ace:0,fouls:0,rf:0}],
  breaker:+f.first||0,cur:+f.first||0,rackNo:1,log:[],done:false,winner:null,
  clock:{on:f.clk===''?true:!!f.clk,sec:+f.sec||40,extSec:+f.extSec||40,extMax:f.ext===''?1:+f.ext},ext:[f.ext===''?1:+f.ext,f.ext===''?1:+f.ext],started:Date.now(),id:'p'+Date.now().toString(36)};}
function pSnap(){APP.undo.pocket.push(clone(APP.pocket));if(APP.undo.pocket.length>200)APP.undo.pocket.shift();}
function pRack(i,kind,why){var m=APP.pocket;if(!m||m.done)return;pSnap();var p=m.p[i];p.racks++;if(kind==='br')p.br++;if(kind==='ace')p.ace++;
  m.log.push({no:m.rackNo,w:i,kind:kind,brk:m.breaker,why:why||''});m.p[0].rf=0;m.p[1].rf=0;
  if(p.racks>=p.race){m.done=true;m.winner=i;var rec={id:m.id,kind:'pocket',disc:m.disc,discName:m.discName,date:new Date().toISOString().slice(0,10),ended:Date.now(),winner:i,racks:m.rackNo,
    p:m.p.map(function(q){return {name:q.name,racks:q.racks,race:q.race,br:q.br,ace:q.ace,fouls:q.fouls};})};DB.history.unshift(rec);DB.history=DB.history.slice(0,500);saveGameShared(rec);persist();CLK.running=false;say(p.name+'の勝ちです');render();return;}
  m.rackNo++;m.breaker=m.breakRule==='alt'?1-m.breaker:i;m.cur=m.breaker;m.ext=[m.clock.extMax,m.clock.extMax];
  say((kind==='br'?'マスワリ。':(kind==='ace'?'ブレイクエース。':''))+(DB.prefs.count?m.p[0].racks+'対'+m.p[1].racks:''));persist();clockReset(false);render();}
function pFoul(i){var m=APP.pocket;if(!m||m.done)return;pSnap();var p=m.p[i];p.fouls++;p.rf++;
  if(m.disc!=='8b'&&p.rf>=3){APP.undo.pocket.pop();pSnap();p.rf=3;msg(p.name+'：3ファウル。'+m.p[1-i].name+'のラックです');var keep=APP.undo.pocket.length;pRack(1-i,'normal','3ファウル');return;}
  if(p.rf===2&&m.disc!=='8b')say(p.name+'、ツーファウルです');
  m.cur=1-i;persist();clockReset(false);render();}
function pSwitch(){var m=APP.pocket;if(!m||m.done)return;pSnap();m.cur=1-m.cur;persist();clockReset(true);render();}
function pUndo(){var u=APP.undo.pocket;if(!u.length)return;var prev=u.pop();if(APP.pocket&&APP.pocket.done&&!prev.done){DB.history=DB.history.filter(function(r){return r.id!==APP.pocket.id;});}APP.pocket=prev;persist();clockReset(false);render();}

/* ---------- camera ---------- */
var CAM={stream:null,rec:null,chunks:[],url:'',err:'',recording:false,t0:0};
function camStart(){CAM.err='';if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){CAM.err='この画面ではカメラを使えません。VIBES のサイトに公開したページや、アプリとして開いたときに使えます。';render();return;}
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:false}).then(function(s){CAM.stream=s;render();}).catch(function(){CAM.err='カメラを開けませんでした。カメラの使用を許可してください（この画面では使えないことがあります。VIBES のサイトに公開したページなら使えます）。';render();});}
function camStop(){try{if(CAM.rec&&CAM.recording)CAM.rec.stop();}catch(e){}if(CAM.stream)CAM.stream.getTracks().forEach(function(t){t.stop();});CAM.stream=null;CAM.recording=false;CAM.err='';render();}
function camRec(){if(!CAM.stream)return;if(CAM.recording){CAM.rec.stop();return;}try{CAM.chunks=[];var r=new MediaRecorder(CAM.stream);CAM.rec=r;r.ondataavailable=function(e){if(e.data&&e.data.size)CAM.chunks.push(e.data);};
  r.onstop=function(){CAM.recording=false;if(CAM.url)URL.revokeObjectURL(CAM.url);CAM.url=URL.createObjectURL(new Blob(CAM.chunks,{type:r.mimeType||'video/webm'}));render();};r.start(1000);CAM.recording=true;CAM.t0=Date.now();render();}catch(e){CAM.err='この端末では録画できません。';render();}}
function camBox(m){if(CAM.err&&!CAM.stream)return h('div',{class:'empty',text:CAM.err});
  var v=h('video',{autoplay:true,playsinline:true,muted:true});v.srcObject=CAM.stream;v.muted=true;
  var sc=m.kind==='carom'?m.p[0].score+' − '+m.p[1].score:(m.disc==='bowl'?m.p.map(function(q){return bFrames(q.rolls).total;}).join(' − '):m.p[0].racks+' − '+m.p[1].racks);
  return h('div',{style:'display:grid;gap:8px'},[h('div',{class:'cam'},[v,CAM.recording?h('span',{class:'rec',text:'録画中'}):null,h('span',{class:'ov',text:sc})]),
    h('div',{class:'camx'},[h('button',{class:'btn',onclick:camRec},[CAM.recording?'録画を止める':'録画する']),CAM.url&&!CAM.recording?h('a',{href:CAM.url,download:'vibes-match-'+new Date().toISOString().slice(0,16).replace(/[:T]/g,'')+'.webm',text:'録画した動画を保存'}):null,
      h('span',{class:'note',text:'台を映しながらスコアを付けられます。動画は端末の中だけに保存されます。'})])]);}
function upsell(name){return h('div',{class:'upsell'},[h('h1',null,[name+' は ',h('span',{text:'PRO'})]),
  h('p',{text:'FREE プランでは、キャロム版（得点・ハイラン・アベレージ・イニング・40秒タイマー）とポケット版（ラック数・マスワリ・ボーラードのスコア表）が使えます。PRO にすると、次の機能が使えるようになります。'}),
  h('ul',null,['エクステンション（タイマーの延長）','カウントの声（得点を読み上げ）・残り10秒の音声','カメラで台を映す・試合を録画','スコアシートと選手ごとの記録（通算アベレージ・ハイランランキング）','LIVE（ほかの台のスコアをリアルタイムで見る）'].map(function(t){return h('li',{text:t});})),
  SITE?h('p',{class:'go',style:'background:var(--warn);cursor:default',text:'PRO（有料プラン）は近日公開'}):h('button',{class:'go',style:'background:var(--warn)',onclick:function(){setPlan('pro');}},['PRO を試す']),h('p',{class:'note',text:SITE?'公開の準備ができしだい、このページと公式LINEでお知らせします。':'いまは試作のため、ボタンで PRO を体験できます。料金と支払い方法は、公開するときに設定します。'})]);}
function setPlan(p){if(SITE){p='free';var pl=document.querySelector('.plan');if(pl)pl.hidden=true;}DB.prefs.plan=p;store();if(p==='free'){CLK.running=false;}document.querySelectorAll('.plan button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.p===p));});
  document.querySelectorAll('.tab').forEach(function(t){var L=t.querySelector('.lock');if((t.dataset.v==='records'||t.dataset.v==='live')&&p==='free'){if(!L)t.appendChild(h('span',{class:'lock',text:'PRO'}));}else if(L)L.remove();});render();}
document.querySelectorAll('.plan button').forEach(function(b){b.addEventListener('click',function(){setPlan(b.dataset.p);});});
var MSG='';function msg(t){MSG=t;var e=$('#msg');if(e)e.textContent=t;}

/* ---------- views ---------- */
function field(lbl,input,cls){return h('label',{class:'f'+(cls?' '+cls:'')},[lbl,input]);}
function inp(id,val,type,extra){var a={id:id,name:id,value:val,type:type||'text'};for(var k in extra)a[k]=extra[k];return h('input',a);}
function sel(id,opts,val){var s=h('select',{id:id,name:id},opts.map(function(o){return h('option',{value:o[0],selected:String(o[0])===String(val)},[o[1]]);}));return s;}
function fv(id){var e=document.getElementById(id);return e?(e.type==='checkbox'?e.checked:e.value.trim()):'';}

function caromSetup(){var pr=DB.prefs.carom||{};
  var form=h('form',{class:'setup',onsubmit:function(e){e.preventDefault();var f={disc:fv('c-disc'),na:fv('c-na'),nb:fv('c-nb'),ta:fv('c-ta'),tb:fv('c-tb'),limit:fv('c-lim'),first:fv('c-first'),equal:fv('c-eq'),clk:fv('c-clk'),sec:fv('c-sec'),extSec:fv('c-xs'),ext:fv('c-ext'),table:fv('c-tbl'),live:fv('c-live')};
      DB.prefs.carom=f;APP.carom=newCarom(f);APP.undo.carom=[];persist();render();clockReset(true);say('ゲームスタート');}},[
    h('div',null,[h('h1',null,['VIBES LIVE TABLE ',h('em',null,['CAROM']),h('span',{style:'display:block;font-family:var(--jp);font-size:20px;color:var(--mute);margin-top:8px',text:'キャロム版 デジタルカウント'})]),h('p',{class:'lead',text:'スリークッション・ワンクッション・フリー・四つ球のスコアボード。得点を押すだけで、ハイランとアベレージを自動で計算します。'})]),
    h('div',{class:'fs'},[h('h2',{text:'種目と選手'}),
      h('div',{class:'row'},[field('種目',sel('c-disc',[['3c','スリークッション'],['1c','ワンクッション（バンド）'],['free','フリー'],['4b','四つ球']],pr.disc||'3c')),field('台番号',inp('c-tbl',pr.table||'1','text',{inputmode:'numeric',maxlength:'4'}))]),
      h('div',{class:'row'},[field('選手A',inp('c-na',pr.na||'','text',{placeholder:'プレイヤーA',maxlength:'20'}),'pa'),field('Aの持ち点',inp('c-ta',pr.ta||'30','number',{min:'1',max:'999',inputmode:'numeric'}),'pa')]),
      h('div',{class:'row'},[field('選手B',inp('c-nb',pr.nb||'','text',{placeholder:'プレイヤーB',maxlength:'20'}),'pb'),field('Bの持ち点',inp('c-tb',pr.tb||'30','number',{min:'1',max:'999',inputmode:'numeric'}),'pb')]),
      h('div',{class:'row'},[field('先攻（ブレイク）',sel('c-first',[['0','選手A'],['1','選手B']],pr.first||'0')),field('イニング数（10〜99）',sel('c-lim',(function(){var a=[];for(var n=10;n<=99;n++)a.push([n,n+'イニング']);return a;})(),(pr.limit&&+pr.limit>=10)?pr.limit:25))]),
      h('label',{class:'chk'},[inp('c-eq','1','checkbox',{checked:pr.equal===undefined?true:pr.equal}),'イコールイニング（先攻が持ち点に届いたら、後攻に最後のイニング）'])]),
    h('div',{class:'fs'},[h('h2',{text:'カウントダウンタイマー'}),
      h('label',{class:'chk'},[inp('c-clk','1','checkbox',{checked:pr.clk===undefined?true:pr.clk}),'タイマーを使う（ゲームスタートと同時にカウントダウン開始）']),
      h('div',{class:'row'},[field('1ショットの秒数',sel('c-sec',[[30,'30秒'],[40,'40秒'],[50,'50秒'],[60,'60秒']],pr.sec||40)),pro()?field('エクステンション',sel('c-xs',[[30,'+30秒'],[40,'+40秒'],[60,'+60秒']],pr.extSec||40)):null,pro()?field('エクステンション回数（1試合）',sel('c-ext',[[0,'なし'],[1,'1回'],[2,'2回'],[3,'3回']],pr.ext===undefined?2:pr.ext)):null]),
      h('p',{class:'note',text:'選手が撞いたら、画面のどこか（ボタン以外）をタップするとタイマーが止まります。得点したとき・交代したときに、タイマーは最初の秒数に戻って、また動き出します。'})]),
    !pro()?h('p',{class:'note',text:'カウントの声・エクステンション・カメラ・記録・ライブ共有は PRO の機能です。'}):null,
    !pro()?null:h('div',{class:'fs'},[h('h2',{text:'ライブ共有'}),h('label',{class:'chk'},[inp('c-live','1','checkbox',{checked:!!pr.live}),'LIVE タブに、この台のスコアをリアルタイムで表示する']),
      h('p',{class:'note',text:LIVE.db?'オンにすると、サインインしている人が LIVE タブでこの台を見られます。':'ライブ共有は Claude にサインインしているときに使えます。いまはこの端末の中だけで記録します。'})]),
    h('button',{class:'go',type:'submit'},['試合開始'])]);
  return form;}

function caromBoard(m){var wrap=h('div',{class:'board'});if(!m.done)wrap.appendChild(h('p',{class:'rot',text:'📱 スマホは横向きにすると、スコアが大きく見やすくなります'}));
  wrap.appendChild(h('div',{class:'bhead'},[h('div',{class:'disc'},[h('span',{class:'chip'},['種目 ',h('b',{text:m.discName})]),h('span',{class:'chip'},['台 ',h('b',{text:m.table||'-'})]),h('span',{class:'chip'},['イニング ',h('b',{class:'num',text:String(caromInnings(m))}),m.limit?' / '+m.limit:'']),m.equal?h('span',{class:'chip',text:'イコールイニング'}):null,m.final&&!m.done?h('span',{class:'chip',style:'border-color:var(--warn);color:var(--warn)',text:'最終イニング'}):null,m.live&&LIVE.db?h('span',{class:'chip live',text:'LIVE'}):null]),
    h('div',{class:'msg',id:'msg',text:MSG})]));
  if(m.done)wrap.appendChild(resultCarom(m));
  var pls=h('div',{class:'players carom'});
  m.p.forEach(function(p,i){var on=!m.done&&m.cur===i,run=on?m.run:0,a=avg(m,i);
    if(i===1)pls.appendChild(caromMid(m));
    pls.appendChild(h('div',{class:'pl'+(i===m.first?' pw':' py')+(on?' on':'')},[
      h('div',{class:'pl-top'},[h('div',{class:'pl-name',text:p.name}),h('span',{class:'pl-tag'+(on?'':' off'),text:(i===m.first?'先攻・白':'後攻・黄')+(on?'　AT TABLE':'')})]),
      h('div',{class:'score'},[h('span',{class:'big',text:String(p.score)}),h('span',{class:'of num',text:'/ '+p.target+'　残り '+Math.max(0,p.target-p.score)})]),
      h('div',{class:'stats'},[st('AVG',a.toFixed(3)),st('HR',p.hr),st('RUN',run,on),st('INN',innOf(m,i))]),
      on?h('div',{class:'acts'},[h('button',{class:'btn main',onclick:function(){cPoint(1);}},['+1',h('small',{text:'得点'})]),h('button',{class:'btn',onclick:function(){cPoint(-1);},disabled:m.run<=0},['−1',h('br'),'訂正']),
        h('button',{class:'btn miss wide',onclick:cMiss},[m.final?'ミス（試合終了）':'ミス・交代'])]):null]));});
  wrap.appendChild(pls);
  if(CAM.stream||CAM.err)wrap.appendChild(camBox(m));
  wrap.appendChild(tools('carom'));
  if(pro()&&(APP.sheet||m.done))wrap.appendChild(caromSheet(m));
  return wrap;}
function caromMid(m){var c=m.clock,on=c&&c.on&&!m.done;
  return h('div',{class:'cmid',id:'clock'},[
    h('div',null,[h('small',{text:'INNING'}),h('div',{class:'inn'},[String(caromInnings(m)),h('span',{text:'/ '+m.limit})]),m.final&&!m.done?h('div',{class:'state',style:'color:var(--warn)',text:'最終イニング'}):null]),
    on?h('div',{class:'tm'},[h('small',{text:'SHOT CLOCK'}),h('div',{class:'t',text:String(c.sec)}),h('div',{class:'bar'},[h('i')]),h('div',{class:'state',text:''})]):h('div',{class:'tm',style:'display:none'},[h('div',{class:'t'}),h('div',{class:'bar'},[h('i')])]),
    h('div',null,[h('small',{text:'GAME TIME'}),h('div',{class:'gt',id:'gtime',text:fmtT((m.ended||Date.now())-m.started)})]),
    on?h('div',{class:'cx'},[h('button',{class:'btn',id:'clkPlay',onclick:function(){if(m.done)return;if(CLK.remain<=0){clockReset(true);return;}CLK.running=!CLK.running;CLK.last=performance.now();renderClock();}},['スタート']),
      pro()?h('button',{class:'btn',disabled:m.ext[m.cur]<=0,onclick:clockExtend},['延長 '+m.ext[m.cur]]):null]):null,
    on?h('p',{class:'hint',text:'撞いたら、画面のどこかをタップでストップ'}):null]);}
function st(k,v,hot){return h('div',{class:'st'+(hot?' hot':'')},[h('small',{text:k}),h('b',{text:String(v)})]);}
function caromSheet(m){var n=Math.max(m.p[0].turns.length+(m.cur===0&&!m.done?1:0),m.p[1].turns.length+(m.cur===1&&!m.done?1:0));
  var cum=[0,0],rows=[];for(var k=0;k<n;k++){var cells=[h('td',{class:'num',text:String(k+1)})];
    [0,1].forEach(function(i){var p=m.p[i],v=k<p.turns.length?p.turns[k]:(k===p.turns.length&&!m.done&&m.cur===i?m.run:null);if(v!=null)cum[i]+=v;
      cells.push(h('td',{class:'num p'+(i?'b':'a')+(v!=null&&v===p.hr&&v>0?' best':''),text:v==null?'':String(v)}));cells.push(h('td',{class:'num p'+(i?'b':'a'),text:v==null?'':String(cum[i])}));});
    rows.push(h('tr',null,cells));}
  return h('div',{class:'sheetw'},[h('table',null,[h('thead',null,[h('tr',null,[h('th',{text:'INN'}),h('th',{class:'',text:m.p[0].name}),h('th',{text:'計'}),h('th',{text:m.p[1].name}),h('th',{text:'計'})])]),h('tbody',null,rows.length?rows:[h('tr',null,[h('td',{colspan:'5',text:'まだ記録がありません'})])])])]);}
function resultCarom(m){var w=m.winner;return h('div',{class:'result'},[h('h2',{text:w<0?'DRAW':m.p[w].name+' WIN'}),
  h('p',{text:m.p.map(function(p){return p.name+'：'+p.score+'点 / '+p.turns.length+'イニング・アベレージ '+(p.turns.length?(p.score/p.turns.length).toFixed(3):'0.000')+'・ハイラン '+p.hr;}).join('　｜　')}),
  h('p',{class:'note',text:(pro()?'記録は RECORDS に保存しました。':'')+'まちがえたときは「1つ戻す」で試合に戻れます。'})]);}

function fullLand(){var d=document.documentElement;try{if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document);}else{var p=(d.requestFullscreen||d.webkitRequestFullscreen).call(d);var lk=function(){try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(function(){});}catch(e){}};if(p&&p.then)p.then(lk).catch(function(){});else lk();}}catch(e){}setTimeout(render,300);}
function tools(kind){var m=APP[kind];var box=h('div',{class:'tools'},[
  h('button',{class:'btn',disabled:!APP.undo[kind].length,onclick:kind==='carom'?cUndo:pUndo},['1つ戻す']),
  kind==='carom'?(pro()?h('button',{class:'btn',onclick:function(){APP.sheet=!APP.sheet;render();}},[APP.sheet?'スコアシートを閉じる':'スコアシート']):null):h('button',{class:'btn',disabled:m.done,onclick:pSwitch},['交代（相手の番へ）']),
  pro()?h('button',{class:'btn',onclick:function(){DB.prefs.count=!DB.prefs.count;store();render();}},['カウントの声 '+(DB.prefs.count?'オン':'オフ')]):null,
  pro()?h('button',{class:'btn',onclick:function(){DB.prefs.voice=!DB.prefs.voice;store();render();}},['音声 '+(DB.prefs.voice?'オン':'オフ')]):null,
  pro()?h('button',{class:'btn',onclick:function(){CAM.stream?camStop():camStart();}},[CAM.stream?'カメラを止める':'カメラ']):null,
  (function(){var d=document.documentElement;return d.requestFullscreen||d.webkitRequestFullscreen;})()?h('button',{class:'btn',onclick:fullLand},[document.fullscreenElement||document.webkitFullscreenElement?'全画面を終わる':'全画面（横向き）']):null,
  h('button',{class:'btn danger',onclick:function(){APP.confirm=kind;render();}},[m.done?'新しい試合':'試合をやめる'])]);
  if(APP.confirm===kind){return h('div',{style:'display:grid;gap:8px'},[box,h('div',{class:'confirm'},[m.done?'新しい試合の設定に進みますか？':'この試合を記録せずに終了しますか？',
    h('button',{class:'btn danger',onclick:function(){APP[kind]=null;APP.undo[kind]=[];APP.confirm=null;MSG='';persist();CLK.running=false;render();}},[m.done?'進む':'終了する']),h('button',{class:'btn',onclick:function(){APP.confirm=null;render();}},['キャンセル'])])]);}
  return box;}

function pocketSetup(){var pr=DB.prefs.pocket||{};
  return h('form',{class:'setup',onsubmit:function(e){e.preventDefault();var f={disc:fv('p-disc'),na:fv('p-na'),nb:fv('p-nb'),ra:fv('p-ra'),rb:fv('p-rb'),first:fv('p-first'),brk:fv('p-brk'),clk:fv('p-clk'),sec:fv('p-sec'),extSec:fv('p-xs'),ext:fv('p-ext'),table:fv('p-tbl'),live:fv('p-live')};
      DB.prefs.pocket=f;APP.pocket=newPocket(f);APP.undo.pocket=[];persist();clockReset(false);say('ゲームスタート');render();}},[
    h('div',null,[h('h1',null,['VIBES LIVE TABLE ',h('em',{style:'color:var(--b)'},['POCKET']),h('span',{style:'display:block;font-family:var(--jp);font-size:20px;color:var(--mute);margin-top:8px',text:'ポケット版 デジタルカウント'})]),h('p',{class:'lead',text:'9ボール・10ボール・8ボールのスコアボード。ハンデ付きの先取ルール、マスワリ（ブレイクラン）、ブレイクエース、3ファウルを記録します。'})]),
    h('div',{class:'fs'},[h('h2',{text:'種目と選手'}),
      h('div',{class:'row'},[field('種目',sel('p-disc',[['9b','9ボール'],['10b','10ボール'],['8b','8ボール'],['bowl','ボーラード（スコア表）']],pr.disc||'9b')),field('台番号',inp('p-tbl',pr.table||'1','text',{inputmode:'numeric',maxlength:'4'}))]),
      h('div',{class:'row'},[field('選手A',inp('p-na',pr.na||'','text',{placeholder:'プレイヤーA',maxlength:'20'}),'pa'),field('Aの先取数',inp('p-ra',pr.ra||'7','number',{min:'1',max:'99',inputmode:'numeric'}),'pa')]),
      h('div',{class:'row'},[field('選手B',inp('p-nb',pr.nb||'','text',{placeholder:'プレイヤーB',maxlength:'20'}),'pb'),field('Bの先取数',inp('p-rb',pr.rb||'7','number',{min:'1',max:'99',inputmode:'numeric'}),'pb')]),
      h('div',{class:'row'},[field('最初のブレイク',sel('p-first',[['0','選手A'],['1','選手B']],pr.first||'0')),field('ブレイクの順番',sel('p-brk',[['winner','勝った人がブレイク'],['alt','交互にブレイク']],pr.brk||'alt'))])]),
    !pro()?h('p',{class:'note',text:'FREE プランは、ラック数・マスワリ・ブレイクエース・ファウルのデジタルカウントと、ボーラードのスコア表が使えます。ポケット版のタイマー・カウントの声・カメラ・記録・ライブ共有は PRO の機能です。'}):null,
    !pro()?null:h('div',{class:'fs'},[h('h2',{text:'ショットクロック'}),
      h('label',{class:'chk'},[inp('p-clk','1','checkbox',{checked:pr.clk===undefined?true:pr.clk}),'ショットクロックを使う（残り10秒と5秒前から音声・音でお知らせ）']),
      h('div',{class:'row'},[field('1ショットの秒数',sel('p-sec',[[30,'30秒'],[35,'35秒'],[40,'40秒'],[45,'45秒']],pr.sec||40)),field('エクステンション',sel('p-xs',[[15,'+15秒'],[30,'+30秒'],[40,'+40秒']],pr.extSec||40)),field('エクステンション回数（1ラック）',sel('p-ext',[[0,'なし'],[1,'1回'],[2,'2回'],[3,'3回']],pr.ext===undefined?1:pr.ext))])]),
    !pro()?null:h('div',{class:'fs'},[h('h2',{text:'ライブ共有'}),h('label',{class:'chk'},[inp('p-live','1','checkbox',{checked:!!pr.live}),'LIVE タブに、この台のスコアをリアルタイムで表示する']),
      h('p',{class:'note',text:LIVE.db?'オンにすると、サインインしている人が LIVE タブでこの台を見られます。':'ライブ共有は Claude にサインインしているときに使えます。いまはこの端末の中だけで記録します。'})]),
    h('button',{class:'go',type:'submit',style:'background:var(--b)'},['試合開始'])]);}

function pocketBoard(m){if(m.disc==='bowl')return bowlBoard(m);var wrap=h('div',{class:'board'});if(!m.done)wrap.appendChild(h('p',{class:'rot',text:'📱 スマホは横向きにすると、スコアが大きく見やすくなります'}));
  wrap.appendChild(h('div',{class:'bhead'},[h('div',{class:'disc'},[h('span',{class:'chip'},['種目 ',h('b',{text:m.discName})]),h('span',{class:'chip'},['台 ',h('b',{text:m.table||'-'})]),h('span',{class:'chip'},['ラック ',h('b',{class:'num',text:String(m.rackNo)})]),h('span',{class:'chip',text:m.breakRule==='alt'?'交互ブレイク':'勝者ブレイク'}),m.live&&LIVE.db?h('span',{class:'chip live',text:'LIVE'}):null]),h('div',{class:'msg',id:'msg',text:MSG})]));
  if(m.done)wrap.appendChild(h('div',{class:'result',style:'border-color:var(--b)'},[h('h2',{text:m.p[m.winner].name+' WIN'}),h('p',{text:m.p[0].name+' '+m.p[0].racks+' − '+m.p[1].racks+' '+m.p[1].name+'（'+m.p[0].race+'先 / '+m.p[1].race+'先）'}),h('p',{class:'note',text:'記録は RECORDS に保存しました。まちがえたときは「1つ戻す」で試合に戻れます。'})]));
  var pls=h('div',{class:'players'});
  m.p.forEach(function(p,i){var on=!m.done&&m.cur===i,max=m.disc==='8b'?0:3;
    var dots=h('div',{class:'fouls'},max?['このラックのファウル'].concat([0,1,2].map(function(k){return h('i',{class:k<p.rf?'on'+(p.rf>=2?' max':''):''});})):['ファウル合計 '+p.fouls]);
    pls.appendChild(h('div',{class:'pl'+(i?' pb':'')+(on?' on':'')},[
      h('div',{class:'pl-top'},[h('div',{class:'pl-name',text:p.name}),h('span',{class:'pl-tag'+(on?'':' off'),text:on?'AT TABLE':(m.breaker===i&&!m.done?'NEXT BREAK':'WAIT')})]),
      h('div',{class:'score'},[h('span',{class:'big',text:String(p.racks)}),h('span',{class:'of num',text:'/ '+p.race+'先　あと '+Math.max(0,p.race-p.racks)})]),
      h('div',{class:'stats'},[st('マスワリ',p.br),st('B.ACE',p.ace),st('FOUL',p.fouls),st('BREAK',m.breaker===i&&!m.done?'●':'')]),
      dots,
      !m.done?h('div',{class:'acts p'},[h('button',{class:'btn main wide',onclick:function(){pRack(i,'normal');}},['ラック獲得',h('small',{text:p.name+'が最後の球を入れた'})]),
        h('button',{class:'btn',disabled:m.breaker!==i,onclick:function(){pRack(i,'br');}},['マスワリ',h('br'),h('small',{text:'ブレイクラン'})]),
        h('button',{class:'btn',disabled:m.breaker!==i,onclick:function(){pRack(i,'ace');}},['ブレイク',h('br'),'エース']),
        h('button',{class:'btn',onclick:function(){pFoul(i);}},['ファウル'])]):null]));});
  wrap.appendChild(pls);
  if(CAM.stream||CAM.err)wrap.appendChild(camBox(m));
  if(!m.done&&pro())wrap.appendChild(clockBox(m));
  wrap.appendChild(tools('pocket'));
  if(m.log.length){var kn={normal:'',br:'マスワリ',ace:'ブレイクエース'};wrap.appendChild(h('div',{class:'sheetw'},[h('table',null,[h('thead',null,[h('tr',null,[h('th',{text:'RACK'}),h('th',{class:'l',text:'ブレイク'}),h('th',{class:'l',text:'獲得'}),h('th',{class:'l',text:'メモ'}),h('th',{text:'スコア'})])]),
    h('tbody',null,(function(){var c=[0,0];return m.log.map(function(r){c[r.w]++;return h('tr',null,[h('td',{class:'num',text:String(r.no)}),h('td',{class:'l p'+(r.brk?'b':'a'),text:m.p[r.brk].name}),h('td',{class:'l p'+(r.w?'b':'a'),text:m.p[r.w].name}),h('td',{class:'l'+(r.kind!=='normal'?' best':''),text:kn[r.kind]||r.why}),h('td',{class:'num',text:c[0]+' − '+c[1]})]);}).reverse();})())])]));}
  return wrap;}

function recordsView(){var box=h('div');var kind=APP.rk||'carom';var disc=APP.rd||'all';
  var hist=DB.history.filter(function(r){return r.kind===kind&&(disc==='all'||r.disc===disc);});
  var discs=kind==='carom'?[['all','すべて'],['3c','3C'],['1c','1C'],['free','フリー'],['4b','四つ球']]:[['all','すべて'],['9b','9B'],['10b','10B'],['8b','8B']];
  box.appendChild(h('div',{class:'sec-h'},[h('div',null,[h('h1',{text:'RECORDS'}),h('p',{class:'note',text:'この端末で記録した試合から、選手ごとのアベレージ・ハイランなどを計算します。'})]),
    h('div',{style:'display:flex;flex-wrap:wrap;gap:8px'},[h('div',{class:'seg'},[['carom','CAROM'],['pocket','POCKET']].map(function(o){return h('button',{'aria-pressed':String(kind===o[0]),onclick:function(){APP.rk=o[0];APP.rd='all';render();}},[o[1]]);})),
      h('div',{class:'seg'},discs.map(function(o){return h('button',{'aria-pressed':String(disc===o[0]),onclick:function(){APP.rd=o[0];render();}},[o[1]]);}))])]));
  if(kind==='pocket'){var bh=DB.history.filter(function(r){return r.kind==='bowl';});if(bh.length){var bl=[];bh.forEach(function(r){r.p.forEach(function(p){bl.push({name:p.name,score:p.score,x:p.strikes,sp:p.spares,date:r.date});});});bl.sort(function(a,b){return b.score-a.score;});
    box.appendChild(h('div',{class:'card',style:'margin-bottom:14px'},[h('h2',{text:'ボーラード ベストスコア'}),h('div',{class:'sheetw'},[h('table',null,[h('thead',null,[h('tr',null,[h('th',{text:'#'}),h('th',{class:'l',text:'選手'}),h('th',{text:'スコア'}),h('th',{text:'ストライク'}),h('th',{text:'スペア'}),h('th',{text:'日付'})])]),
      h('tbody',null,bl.slice(0,10).map(function(x,i){return h('tr',null,[td(i+1),h('td',{class:'l',text:x.name}),h('td',{class:'num'+(i===0?' best':''),text:String(x.score)}),td(x.x),td(x.sp),td(x.date.slice(5))]);}))])])]));}}
  if(!hist.length){box.appendChild(h('div',{class:'empty',text:'まだ記録がありません。'+(kind==='carom'?'CAROM':'POCKET')+' タブで試合をすると、ここに選手ごとの成績が並びます。'}));return box;}
  var by={};hist.forEach(function(r){r.p.forEach(function(p,i){var k=p.name;var s=by[k]=by[k]||{name:k,g:0,w:0,pts:0,inn:0,hr:0,racks:0,br:0,ace:0};s.g++;if(r.winner===i)s.w++;
    if(kind==='carom'){s.pts+=p.score;s.inn+=p.inn;if(p.hr>s.hr)s.hr=p.hr;}else{s.racks+=p.racks;s.br+=p.br;s.ace+=p.ace;}});});
  var arr=Object.keys(by).map(function(k){return by[k];});
  arr.sort(kind==='carom'?function(a,b){return (b.inn?b.pts/b.inn:0)-(a.inn?a.pts/a.inn:0);}:function(a,b){return b.w-a.w||b.br-a.br;});
  var hd=kind==='carom'?['選手','試合','勝','総得点','総イニング','アベレージ','ハイラン']:['選手','試合','勝','ラック','マスワリ','B.ACE'];
  var g=h('div',{class:'grid2'});
  g.appendChild(h('div',{class:'card'},[h('h2',{text:'選手ごとの成績'}),h('div',{class:'sheetw'},[h('table',null,[h('thead',null,[h('tr',null,hd.map(function(x,i){return h('th',{class:i?'':'l',text:x});}))]),
    h('tbody',null,arr.map(function(s){return h('tr',null,kind==='carom'?[h('td',{class:'l',text:s.name}),td(s.g),td(s.w),td(s.pts),td(s.inn),td(s.inn?(s.pts/s.inn).toFixed(3):'-'),td(s.hr)]:[h('td',{class:'l',text:s.name}),td(s.g),td(s.w),td(s.racks),td(s.br),td(s.ace)]);}))])])]));
  if(kind==='carom'){var hrs=[];hist.forEach(function(r){r.p.forEach(function(p){hrs.push({name:p.name,hr:p.hr,date:r.date,disc:r.discName});});});hrs.sort(function(a,b){return b.hr-a.hr;});
    g.appendChild(h('div',{class:'card'},[h('h2',{text:'ハイラン記録'}),h('div',{class:'sheetw'},[h('table',null,[h('thead',null,[h('tr',null,[h('th',{text:'#'}),h('th',{class:'l',text:'選手'}),h('th',{text:'HR'}),h('th',{class:'l',text:'種目'}),h('th',{text:'日付'})])]),
      h('tbody',null,hrs.slice(0,10).map(function(x,i){return h('tr',null,[td(i+1),h('td',{class:'l',text:x.name}),h('td',{class:'num'+(i===0?' best':''),text:String(x.hr)}),h('td',{class:'l',text:x.disc}),h('td',{class:'num',text:x.date.slice(5)})]);}))])])]));}
  g.appendChild(h('div',{class:'card'},[h('h2',{text:'最近の試合'}),h('div',{class:'sheetw'},[h('table',null,[h('tbody',null,hist.slice(0,15).map(function(r){var a=r.p[0],b=r.p[1];
    return h('tr',null,[h('td',{class:'num',text:r.date.slice(5)}),h('td',{class:'l',text:r.discName}),h('td',{class:'l pa'+(r.winner===0?' best':''),text:a.name}),h('td',{class:'num',text:kind==='carom'?a.score+' − '+b.score:a.racks+' − '+b.racks}),h('td',{class:'l pb'+(r.winner===1?' best':''),text:b.name}),kind==='carom'?h('td',{class:'num',text:r.inn+'イニング'}):h('td',{class:'num',text:a.race+'先/'+b.race+'先'})]);}))])])]));
  box.appendChild(g);return box;}
function td(v){return h('td',{class:'num',text:String(v)});}

function liveView(){var box=h('div');box.appendChild(h('div',{class:'sec-h'},[h('div',null,[h('h1',{text:'LIVE'}),h('p',{class:'note',text:'ライブ共有をオンにした台のスコアが、リアルタイムで並びます。'})])]));
  if(!LIVE.ready){box.appendChild(h('div',{class:'empty',text:'読み込み中…'}));return box;}
  if(!LIVE.db){box.appendChild(h('div',{class:'empty',text:'LIVE は Claude にサインインしているときに見られます。スコアボードと記録は、サインインしなくてもこの端末で使えます。'}));return box;}
  if(LIVE.err){box.appendChild(h('div',{class:'empty',text:'ライブ情報を読み込めませんでした。ページを開き直してください。'}));return box;}
  var docs=LIVE.docs.filter(function(d){return Date.now()-d.updated<12*3600e3;}).sort(function(a,b){return String(a.table).localeCompare(String(b.table),'ja',{numeric:true});});
  if(!docs.length){box.appendChild(h('div',{class:'empty',text:'いまライブ中の台はありません。CAROM か POCKET で、試合の設定の「ライブ共有」をオンにすると、ここに表示されます。'}));return box;}
  var g=h('div',{class:'grid2'});docs.forEach(function(d){var c=d.kind==='carom';
    g.appendChild(h('div',{class:'lt'},[h('div',{class:'lt-h'},[h('span',{text:'台 '+d.table+'　'+d.disc}),h('span',{text:d.done?'試合終了':(c?'イニング '+d.inn:'ラック '+d.rack)})]),
      [0,1].map(function(i){return h('div',{class:'lt-r '+(i?'b':'a')+(!d.done&&d.cur===i?' on':'')},[h('div',{style:'min-width:0'},[h('b',{text:d.names[i]}),h('div',{class:'note',text:c?'AVG '+(d.avg[i]||0).toFixed(3)+'・HR '+d.hr[i]+'・持ち点 '+d.goal[i]:d.goal[i]+'先'})]),h('span',{class:'num',text:String(d.scores[i])})]);})].flat()));});
  box.appendChild(g);return box;}

function render(){try{document.body.classList.toggle('ingame',!!((APP.view==='carom'&&APP.carom)||(APP.view==='pocket'&&APP.pocket)));}catch(e){}['carom','pocket','records','live'].forEach(function(v){$('#v-'+v).hidden=v!==APP.view;});
  document.querySelectorAll('.tab').forEach(function(t){t.setAttribute('aria-selected',String(t.dataset.v===APP.view));});
  var el=$('#v-'+APP.view);var sy=window.scrollY;el.innerHTML='';
  if(APP.view==='carom')el.appendChild(APP.carom?caromBoard(APP.carom):caromSetup());
  else if(!pro()&&APP.view!=='pocket')el.appendChild(upsell({records:'記録',live:'LIVE'}[APP.view]));
  else if(APP.view==='pocket')el.appendChild(APP.pocket?pocketBoard(APP.pocket):pocketSetup());
  else if(APP.view==='records')el.appendChild(recordsView());
  else el.appendChild(liveView());
  if(CLK.owner!==APP.view&&(APP.view==='carom'||APP.view==='pocket'))clockReset(false);
  renderClock();window.scrollTo(0,sy);}
document.addEventListener('fullscreenchange',function(){render();});
document.addEventListener('pointerdown',function(e){if(APP.view!=='carom'||!APP.carom||APP.carom.done||!CLK.running)return;if(e.target.closest('button,a,input,select,label,textarea,.tabs,.plan'))return;CLK.running=false;beep(520,.08);renderClock();});
setInterval(function(){var g=document.getElementById('gtime'),m=APP[APP.view];if(g&&m&&m.started)g.textContent=fmtT((m.ended||Date.now())-m.started);},1000);
function fmtT(ms){var s=Math.max(0,Math.floor(ms/1000)),hh=Math.floor(s/3600),mm=Math.floor(s%3600/60),ss=s%60;return (hh?hh+':'+(mm<10?'0':''):'')+mm+':'+(ss<10?'0':'')+ss;}
document.querySelectorAll('.tab').forEach(function(t){t.addEventListener('click',function(){if(APP.view===t.dataset.v)return;CLK.running=false;APP.view=t.dataset.v;APP.confirm=null;MSG='';render();});});
try{if(navigator.wakeLock)navigator.wakeLock.request('screen').catch(function(){});}catch(e){}
try{var mq=new URLSearchParams(location.search).get('mode')||location.hash.slice(1);if(mq==='carom'||mq==='pocket')APP.view=mq;}catch(e){}
setPlan(DB.prefs.plan);
})();
