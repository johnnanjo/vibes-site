import os
D=os.path.dirname(os.path.abspath(__file__))
def kbd(*k): return ''.join(f'<kbd>{x}</kbd>' for x in k)
def win(title, rows, menu=None, side=None):
    h=f'<div class="win"><div class="bar">{title}</div><div class="wb">'
    if side: h+='<div class="sd">'+''.join(f'<span class="{"on" if on else ""}">{t}</span>' for t,on in side)+'</div>'
    h+='<div class="rw">'+''.join(f'<div class="row {"hl" if hl else ""}"><span class="fi {ic}"></span><b>{t}</b></div>' for ic,t,hl in rows)
    if menu: h+='<div class="menu">'+''.join(f'<span class="{"on" if on else ""}">{t}</span>' for t,on in menu)+'</div>'
    return h+'</div></div></div>'
def keys(*k): return '<div class="kv">'+' ＋ '.join(f'<span class="bigk">{x}</span>' for x in k)+'</div>'
def step(n,t,d,pic): return f'<div class="us"><i>{n}</i><div><b>{t}</b><p>{d}</p></div><div class="pic">{pic}</div></div>'
SIDE=[('ダウンロード',False),('デスクトップ',False),('USB ドライブ (E:)',False)]
def side(i): return [(t,j==i) for j,(t,_) in enumerate(SIDE)]
A=[
 ('ZIPファイルをPCに保存する','受け取った <b class="in">VIBES-3C-USB.zip</b> を押して保存します。PCの「ダウンロード」フォルダに入ります。', win('ダウンロード',[('zip','VIBES-3C-USB.zip',True)],side=side(0))),
 ('USBメモリーをPCに差す','PCの横やうしろにある、長方形の差し込み口（USB）に差します。向きが合わない時は、裏返します。','<div class="usbpic"><span class="stick"></span><span class="arr">→</span><span class="port">USB</span></div>'),
 ('フォルダの画面を開く',f'キーボードの {kbd("Windows")} キー（田のマーク）を押しながら {kbd("E")} を押します。', keys('田 Windows','E')),
 ('ZIPを「すべて展開」する','左の「ダウンロード」を押します。<b class="in">VIBES-3C-USB.zip</b> を<b class="in">右クリック</b>して「すべて展開」を選び、次の画面で「展開」を押します。', win('ダウンロード',[('zip','VIBES-3C-USB.zip',True)],menu=[('開く',False),('すべて展開…',True),('コピー',False)],side=side(0))),
 ('「VIBES-3C」フォルダをコピーする','黄色いフォルダ <b class="in">VIBES-3C</b> ができます。<b class="in">右クリック</b>して「コピー」を選びます。', win('VIBES-3C-USB',[('dir','VIBES-3C',True)],menu=[('開く',False),('コピー',True),('削除',False)])),
 ('USBメモリーに貼り付ける','左の「USB ドライブ」を押します。何もない所を<b class="in">右クリック</b>して「貼り付け」を選びます。', win('USB ドライブ (E:)',[('dir','VIBES-3C',True)],menu=[('表示',False),('貼り付け',True)],side=side(2))),
 ('USBメモリーを抜く','画面右下の「ハードウェアを安全に取り外す」を押してから抜きます。これでUSBメモリーの完成です。','<div class="done">USBメモリーの完成</div>'),
]
B=[
 ('USBメモリーをお店のPCに差す','長方形の差し込み口（USB）に差します。','<div class="usbpic"><span class="stick"></span><span class="arr">→</span><span class="port">USB</span></div>'),
 ('USBメモリーの中を開く',f'{kbd("Windows")} キーを押しながら {kbd("E")} を押し、左の「USB ドライブ」を押します。', win('USB ドライブ (E:)',[('dir','VIBES-3C',False)],side=side(2))),
 ('「VIBES-3C」フォルダをコピーする','<b class="in">VIBES-3C</b> を<b class="in">右クリック</b>して「コピー」を選びます。', win('USB ドライブ (E:)',[('dir','VIBES-3C',True)],menu=[('開く',False),('コピー',True),('削除',False)],side=side(2))),
 ('デスクトップに貼り付ける','デスクトップ（最初の画面）の何もない所を<b class="in">右クリック</b>して「貼り付け」を選びます。', '<div class="desk"><span class="fi dir"></span><b>VIBES-3C</b><div class="menu st"><span>表示</span><span class="on">貼り付け</span></div></div>'),
 ('「1_デジタルカウント」を開く','デスクトップの「VIBES-3C」フォルダを開き、<b class="in">1_デジタルカウント</b> をダブルクリックします。', win('VIBES-3C',[('html','1_デジタルカウント',True),('pdf','2_取扱説明書',False),('txt','はじめにお読みください',False)])),
 ('全画面にする',f'カウントの画面が出たら、キーボードの {kbd("F")} を押します。これで使えます。', keys('F')),
]
def pg(num,title,lead,items,extra=''):
    return f'<section class="pg"><header><i>{num}</i><h2>{title}</h2></header><p class="lead">{lead}</p>'+''.join(step(i+1,*x) for i,x in enumerate(items))+extra+'</section>'
css=open(D+'/manual.css').read()+'''
.us{display:grid;grid-template-columns:11mm minmax(0,1fr) 74mm;gap:4mm;align-items:center;padding:2.6mm 0;border-bottom:.3mm solid var(--line2);break-inside:avoid}
.us>i{font-style:normal;width:10mm;height:10mm;border-radius:50%;background:var(--night);color:#fff;font-weight:900;font-size:14pt;display:grid;place-items:center}
.us b{font-size:12.5pt;font-weight:900}.us p{margin:1mm 0 0;font-size:10.5pt}
.pic .win{font-size:9.5pt}.wb{display:flex;position:relative;min-height:19mm}
.sd{flex:none;width:27mm;border-right:.3mm solid var(--line2);padding:1mm 0;font-size:8pt}
.sd span{display:block;padding:.8mm 2mm}.sd span.on{background:var(--lime);font-weight:900}
.rw{flex:1;position:relative;min-width:0}
.win .row{padding:1.6mm 3mm;border:0}.win .row b{font-size:9.5pt}
.fi.zip{background:#F2C200}.fi.dir{background:#F2C200;height:6.5mm;width:8.5mm;border-radius:1mm 2mm 1mm 1mm}
.wb:has(.menu){min-height:29mm}
.menu{position:absolute;right:2mm;top:9.5mm;background:#fff;border:.4mm solid var(--night);border-radius:1.6mm;box-shadow:0 1mm 2.5mm rgba(0,0,0,.25);font-size:8.5pt;min-width:25mm;overflow:hidden}
.menu span{display:block;padding:1mm 3mm}.menu span.on{background:var(--night);color:#fff;font-weight:900}
.menu.st{position:static;margin-left:auto}.desk{min-height:22mm}
.kv{display:flex;align-items:center;justify-content:center;gap:2mm;font-weight:900;font-size:13pt}
.bigk{display:inline-grid;place-items:center;min-width:17mm;height:14mm;padding:0 3mm;border-radius:2.4mm;background:var(--night);color:#fff;font-weight:900;font-size:11pt;box-shadow:0 1.2mm 0 #000}
.usbpic{display:flex;align-items:center;justify-content:center;gap:4mm;font-weight:900;font-size:16pt}
.stick{width:26mm;height:10mm;border-radius:2mm;background:var(--felt);position:relative}.stick::after{content:"";position:absolute;right:-7mm;top:2mm;width:7mm;height:6mm;background:#B9BDC6;border:.4mm solid var(--night)}
.arr{margin-left:6mm}.port{border:.6mm solid var(--night);border-radius:1.6mm;padding:2mm 4mm;font-size:10pt}
.done{background:var(--lime);border-radius:3mm;padding:4mm;text-align:center;font-weight:900;font-size:12pt}
.desk{background:var(--felt);border-radius:3mm;padding:4mm;display:flex;align-items:center;gap:2mm;color:#fff}.desk b{font-size:9pt}.desk .menu{color:var(--night)}
@media (max-width:640px){.us{grid-template-columns:36px minmax(0,1fr)}.us .pic{grid-column:1/-1}}
'''
cover=('<section class="pg"><header><i>USB</i><h2>USBメモリーで入れる方法（スリークッション デジタルカウント）</h2></header>'
 '<p class="lead">やることは2つです。まず自分のパソコンでUSBメモリーを作り、次にお店のパソコンに入れます。ソフトを入れる作業はなく、フォルダをコピーするだけです。</p>')
body=('<main class="mn">'+pg('A','USBメモリーを作る（自分のパソコンで1回だけ）','受け取った「VIBES-3C-USB.zip」を、USBメモリーに入れます。',A,
 '<div class="note"><b>うまくいかない時</b>「すべて展開」が出ない時は、ZIPをダブルクリックして開き、中の「VIBES-3C」フォルダをUSBメモリーへコピーしても同じです。</div>')
 +pg('B','お店のパソコンに入れる','USBメモリーの中身を、お店のパソコンのデスクトップにコピーします。次からは、USBメモリーなしで開けます。',B,
 '<div class="note lime"><b>これで終わりです</b>次からは、デスクトップの「VIBES-3C」フォルダ →「1_デジタルカウント」をダブルクリックするだけです。</div>'
 '<div class="note"><b>知っておいてほしいこと</b><ul><li>お店のパソコンがインターネットにつながっていなくても動きます。</li><li>「どのアプリで開きますか？」と聞かれたら、Edge か Chrome を選びます。</li><li>コピーせずに、USBメモリーを差したまま「1_デジタルカウント」を開いても使えます。</li><li>登録した選手と得点は、開いたパソコンの中に保存されます。</li><li>くわしい使い方は、フォルダの中の「2_取扱説明書」を見てください。</li></ul></div>')+'</main>')
body=body.replace('.pg header i','')
open(D+'/out/usb-print.html','w').write('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>USBメモリーで入れる方法</title><style>'+css+'.pg header i{width:auto;min-width:13mm;padding:0 3mm}</style></head><body class="print">'+body+'</body></html>')
print('ok')
