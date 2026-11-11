const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const errs=[];
const USB='file:///tmp/claude-0/-home-claude/4269f5be-aa67-52b1-a813-0280e54a6b2a/scratchpad/pack/VIBES-COUNT/data/count-3c.html';
const c=await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1.25});
await c.route('**/inputtools.google.com/**',r=>{const q=decodeURIComponent((r.request().url().match(/text=([^&]*)/)||[])[1]||'');const M={'やまだ':['山田','山多','矢間田','山打','耶麻田'],'たろう':['太郎','太朗','多朗','汰郎','太老']};r.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify(['SUCCESS',[[q,(M[q]||[]).concat([q])]]])})});
await c.routeWebSocket(/api\/count/,ws=>{ws.onMessage(()=>{})});
const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
const k=async s=>{for(const x of s){await p.keyboard.press(x);await p.waitForTimeout(90)}};
const shot=async n=>{await p.waitForTimeout(250);const h=await p.$('.over-l:not([hidden]) .panel');if(h)await h.screenshot({path:'img/'+n+'.png'});else await p.screenshot({path:'img/'+n+'.png'})};
const setS=async f=>{await p.evaluate(f);await p.reload();await p.waitForTimeout(500)};
await p.goto(USB);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(600);
await shot('count');
await k(['Enter']);await shot('mode');
await k(['2']);await shot('kana0');
await k(['8']);await shot('kanarow');
await k(['1','7','1','4','1']);await shot('kana_yamata');
await k(['*']);await shot('kana_yamada');
await k(['Enter']);await p.waitForTimeout(500);await shot('cand');
await k(['Enter']);await k(['4','1','9','5','1','3']);await shot('kana_mei');
await k(['Enter']);await p.waitForTimeout(500);await k(['Enter']);await shot('target');
await k(['3','0']);await shot('target30');await k(['Enter']);
await shot('mode2');
await k(['2','/']);await shot('abc');await k(['4','4','3','3','2','4','4','5','2','3','Enter','Enter','2','5','Enter']);
await shot('start');
await shot('ready0');await k(['-']);await shot('warm');await k(['Enter','Enter']);
await k(['*','+','+']);await p.waitForTimeout(1500);await shot('play');
await k(['Enter','+','Enter','/']);await shot('settings');await p.keyboard.press('Escape');
// search list
await k(['.','.','Enter','1','Enter']);await shot('search');await p.keyboard.press('Escape');
// mid game
await setS(()=>{const S=JSON.parse(localStorage.getItem('vibes-count-3c-v1'));S.ready=false;S.cfg.n=['山田 太郎','SMITH'];S.cfg.g=[30,25];S.sc=[18,14];S.inn=[[1,0,2,4,0,3,1,1,6],[0,2,1,0,3,0,2,3,3]];S.to=[3,2];S.turn=0;S.run=2;S.t0=Date.now()-754000;localStorage.setItem('vibes-count-3c-v1',JSON.stringify(S))});
await k(['*']);await p.waitForTimeout(5200);await shot('main');
// remote code
await p.click('#bRm');await shot('rmcode');const code=await p.evaluate(()=>document.getElementById('rmC').textContent);await p.keyboard.press('Enter');
// win
await setS(()=>{const S=JSON.parse(localStorage.getItem('vibes-count-3c-v1'));S.ready=false;S.sc=[29,14];S.run=0;S.turn=0;localStorage.setItem('vibes-count-3c-v1',JSON.stringify(S))});
await k(['+','Enter','Enter']);await shot('win');
// 4p
await setS(()=>{const S=JSON.parse(localStorage.getItem('vibes-count-3c-v1'));S.ready=false;S.cfg.n=['山田 太郎','SMITH','佐藤 花子','GUEST'];S.cfg.g=[30,25,20,25];S.sc=[18,12,9,21];S.to=[3,2,3,1];S.inn=[[1,0,2,4,0,3,1,1,6],[0,2,1,0,3,0,2,1,3],[1,1,0,2,0,1,3,0,1],[2,3,0,4,1,2,5,3,1]];S.turn=1;S.run=1;S.over=false;S.t0=Date.now()-1354000;S.t1=0;localStorage.setItem('vibes-count-3c-v1',JSON.stringify(S))});
await shot('p4');
// remote page (phone)
const c2=await b.newContext({viewport:{width:390,height:800},deviceScaleFactor:2});
const state={type:'state',table:0,n:['山田 太郎','SMITH'],g:[30,25],sc:[18,14],run:2,turn:0,over:false,inn:[9,9],hr:[6,3],av:['2.000','1.556'],last:[[],[]],t:40,tOn:true,pr:false,pm:5,wz:false};
await c2.routeWebSocket(/api\/count/,ws=>{setTimeout(()=>ws.send(JSON.stringify(state)),200);ws.onMessage(()=>{})});
const r=await c2.newPage();r.on('pageerror',e=>errs.push('R '+e.message));
await r.goto('http://localhost:8796/pages/count-remote/');await r.waitForTimeout(600);await r.screenshot({path:'img/remote_join.png'});
await r.fill('#iCode','123456');await r.waitForTimeout(200);await r.screenshot({path:'img/remote_code.png'});await r.keyboard.press('Enter');await r.waitForTimeout(900);await r.screenshot({path:'img/remote_main.png'});
console.log('code',code,'errs',errs);await b.close()})()
