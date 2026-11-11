const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('file://'+__dirname+'/out/manual-print.html');await p.waitForTimeout(800);
await p.evaluate(()=>{const H=297/25.4*96;document.querySelectorAll('.pg:not(.cover)').forEach(e=>{e.style.minHeight='0';const w=document.createElement('div');while(e.firstChild)w.appendChild(e.firstChild);e.appendChild(w);let k=1;for(let i=0;i<8;i++){w.style.zoom=k;const h=e.getBoundingClientRect().height;const t=Math.min(1.24,k*(H-6)/h);if(Math.abs(t-k)<0.004)break;k=t}w.style.zoom=k;e.dataset.k=k.toFixed(2);e.style.height='297mm';e.style.overflow='hidden'})});
console.log(JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('.pg')].map((e,i)=>[i,Math.round(e.getBoundingClientRect().height/1122.5*100),e.dataset.k||''].join(':')))));
await p.pdf({path:'out/manual.pdf',format:'A4',printBackground:true,margin:{top:0,bottom:0,left:0,right:0}});await b.close()})()
