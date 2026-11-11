# Builds the scoreboard manual: print HTML (A4, for PDF), and a body-only variant for the web page.
import base64, sys, os
D = os.path.dirname(os.path.abspath(__file__))
def img(n, cls='', alt=''):
    b = base64.b64encode(open(f'{D}/jpg/{n}.jpg', 'rb').read()).decode()
    return f'<img class="shot {cls}" alt="{alt}" src="data:image/jpeg;base64,{b}">'

ST = 'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"'
IC = {
 'pc': f'<svg viewBox="0 0 64 52" {ST}><rect x="20" y="4" width="24" height="40" rx="3"/><path d="M27 12h10M27 19h10"/><circle cx="32" cy="35" r="2.5"/></svg>',
 'laptop': f'<svg viewBox="0 0 64 52" {ST}><rect x="12" y="8" width="40" height="26" rx="3"/><path d="M5 41h54l-4 5H9z"/></svg>',
 'monitor': f'<svg viewBox="0 0 64 52" {ST}><rect x="5" y="5" width="54" height="32" rx="3"/><path d="M32 37v8M20 46h24"/></svg>',
 'keyboard': f'<svg viewBox="0 0 64 52" {ST}><rect x="4" y="16" width="56" height="24" rx="4"/><path d="M11 23h3M19 23h3M27 23h3M35 23h3M43 23h3M51 23h2M11 29h3M19 29h3M27 29h3M35 29h3M43 29h3M51 29h2M17 35h30"/></svg>',
 'tenkey': f'<svg viewBox="0 0 64 52" {ST}><rect x="18" y="3" width="28" height="46" rx="4"/><path d="M25 12h2M31 12h2M38 12h2M25 20h2M31 20h2M38 20v9M25 28h2M31 28h2M25 37h8M38 37v5"/></svg>',
 'tablet': f'<svg viewBox="0 0 64 52" {ST}><rect x="17" y="3" width="30" height="46" rx="4"/><path d="M29 43h6"/></svg>',
 'wifi': f'<svg viewBox="0 0 64 52" {ST}><path d="M8 20c14-13 34-13 48 0M16 29c10-9 22-9 32 0M24 37c5-4 11-4 16 0"/><circle cx="32" cy="44" r="2.5" fill="currentColor"/></svg>',
 'nowifi': f'<svg viewBox="0 0 64 52" {ST}><path d="M8 20c14-13 34-13 48 0M16 29c10-9 22-9 32 0M24 37c5-4 11-4 16 0" opacity=".35"/><path d="M12 6l40 42" stroke-width="4"/></svg>',
 'usb': f'<svg viewBox="0 0 64 52" {ST}><rect x="8" y="16" width="34" height="20" rx="4"/><rect x="42" y="20" width="14" height="12"/><path d="M47 24v0M51 24v0M16 26h14"/></svg>',
}
def ic(k, label=''):
    return f'<span class="ic">{IC[k]}<b>{label}</b></span>'
def kbd(*ks): return ''.join(f'<kbd>{k}</kbd>' for k in ks)
def steps(items):
    return '<ol class="steps">' + ''.join(f'<li><div><b>{t}</b><span>{d}</span></div></li>' for t, d in items) + '</ol>'
def note(t, d, cls=''): return f'<div class="note {cls}"><b>{t}</b>{d}</div>'
def wire(parts):
    # parts: list of ('dev', key, label) / ('line', label, dashed)
    h = '<div class="wire">'
    for p in parts:
        if p[0] == 'dev': h += f'<div class="dev">{IC[p[1]]}<b>{p[2]}</b></div>'
        else: h += f'<div class="ln {"dash" if p[2] else ""}"><span>{p[1]}</span></div>'
    return h + '</div>'
URL = 'vibesbilliards.com/pages/count'
RURL = 'vibesbilliards.com/pages/count-remote'
pages = []
def page(num, title, body, lead=''):
    pages.append(f'<section class="pg" id="c{num}"><header><i>{num}</i><h2>{title}</h2></header>' + (f'<p class="lead">{lead}</p>' if lead else '') + body + '</section>')

# ---------- cover ----------
cover = f'''<section class="pg cover"><div class="cv">
<p class="cvk">取扱説明書</p>
<h1>スリークッション<br>デジタルカウント</h1>
<p class="cvl">モニターに大きく映して、数字のキーだけで使えるスコアボードです。<br>パソコンが苦手な方でも、この説明書の順番どおりに進めれば使えます。</p>
{img('main','cvimg')}
<div class="cv3"><div><b>得点・イニング</b>当たったら「+」、外したら「Enter」</div><div><b>残り秒数</b>40秒を大きく表示。タイムアウトも自動</div><div><b>選手の名前</b>数字のキーだけで登録できます</div></div>
<p class="cvf">VIBES BILLIARDS　／　2026年11月　テスト版（関係者用）</p>
</div></section>'''

# ---------- 1 chooser ----------
def case(letter, title, icons, how, go):
    return f'<a class="case" href="#c{go}"><i>{letter}</i><div><b>{title}</b><span class="icons">{icons}</span><span class="how">{how}</span></div><em>{go}章へ</em></a>'
page(1, 'まず、あなたのお店はどれですか？',
 case('①', 'パソコン＋モニター＋キーボード＋タブレット（Wi-Fiあり）', ic('pc','パソコン')+ic('monitor','モニター')+ic('keyboard','キーボード')+ic('tablet','タブレット')+ic('wifi','Wi-Fi'), 'キーボードでも、タブレットでも操作できます。', 4) +
 case('②', 'パソコン＋モニター＋数字だけのキーボード（テンキー）＋タブレット（Wi-Fiあり）', ic('pc','パソコン')+ic('monitor','モニター')+ic('tenkey','テンキー')+ic('tablet','タブレット')+ic('wifi','Wi-Fi'), 'テンキーだけで全部できます。タブレットでも操作できます。', 5) +
 case('③', 'ノートパソコンだけ（外付けモニターなし）', ic('laptop','ノートパソコン'), 'ノートパソコンの画面とキーボードをそのまま使います。', 6) +
 case('④', 'Wi-Fi（インターネット）がない', ic('pc','パソコン')+ic('nowifi','ネットなし')+ic('usb','USBメモリー'), 'USBメモリーから開きます。ネットは一度もいりません。', 7) +
 case('⑤', 'パソコンがない（タブレットとモニター）', ic('tablet','タブレット')+ic('monitor','モニター')+ic('tenkey','テンキー'), 'タブレットをモニターにつなぎ、テンキーで操作します。', 7) +
 note('迷ったら', 'インターネットがある → <b class="in">2章</b>「インターネットで開く」。　インターネットがない → <b class="in">3章</b>「USBメモリーで開く」。どちらも、使い方は同じです。'),
 '当てはまるものを1つ選んで、右に書いてある章を見てください。')

# ---------- 2 open by internet ----------
page(2, 'インターネットで開く',
 f'<div class="addr"><small>ブラウザのアドレス欄に入れる文字</small><b>{URL}</b></div>' +
 steps([
  ('ブラウザを開く', '画面の下や、デスクトップにある <b class="in">Edge（エッジ）</b> か <b class="in">Chrome（クローム）</b> のマークをダブルクリックします。青と緑のうずまきが Edge、赤・黄・緑の丸が Chrome です。'),
  ('アドレスを入れる', f'画面のいちばん上にある細長い欄をクリックし、<b class="in">{URL}</b> と入れて {kbd("Enter")} を押します。'),
  ('メニューが出る', 'VIBESのロゴと、種目のボタンが出れば成功です。'),
  ('種目を選ぶ', f'スリークッションは {kbd("1")} を押して {kbd("Enter")}。マウスで押しても選べます。'),
  ('全画面にする', f'キーボードの {kbd("F")} を押します。もう一度押すと元にもどります。'),
 ]) + img('home','wide') +
 note('次からはもっと簡単に', 'アドレス欄の右にある ☆ を押して「お気に入り」に入れておくと、次からは選ぶだけで開けます。一度開いたパソコンでは、インターネットが切れている時でも同じアドレスで開けます。'),
 'インターネット（Wi-Fi）につながっているパソコンやタブレットは、この方法がいちばん簡単です。')

# ---------- 3 USB ----------
usbfiles = '<div class="files"><div class="win"><div class="bar">USB ドライブ (E:) ＞ VIBES-COUNT</div><div class="row hl"><span class="fi html"></span><b>1_スタート</b><em>← これをダブルクリック</em></div><div class="row"><span class="fi pdf"></span><b>2_取扱説明書</b><em>この説明書です</em></div><div class="row"><span class="fi txt"></span><b>はじめにお読みください</b></div><div class="row"><span class="fi dir"></span><b>data</b><em>さわらないでください</em></div></div></div>'
page(3, 'USBメモリーで開く',
 steps([
  ('USBメモリーをパソコンに差す', 'パソコンの横やうしろにある、長方形の差し込み口（USB）に差します。向きが合わない時は、裏返して差します。'),
  ('USBメモリーの中を開く', f'キーボードの {kbd("Windows")} キー（田のマーク）を押しながら {kbd("E")} を押します。開いた画面の左側にある <b class="in">「USB ドライブ」</b>（名前は「VIBES」など）をクリックします。'),
  ('「VIBES-COUNT」フォルダを開く', '黄色いフォルダ <b class="in">VIBES-COUNT</b> をダブルクリックします。'),
  ('「1_スタート」をダブルクリック', 'ブラウザが開き、メニュー（種目を選ぶ画面）が出ます。「どのアプリで開きますか？」と聞かれたら、Edge か Chrome を選びます。'),
  ('全画面にする', f'キーボードの {kbd("F")} を押します。'),
 ]) + usbfiles +
 '<div class="two"><div class="box"><h3>おすすめ：デスクトップにコピーする</h3><ol><li>「VIBES-COUNT」フォルダを<b class="in">右クリック</b>して「コピー」を選びます。</li><li>デスクトップ（最初の画面）の何もない所を<b class="in">右クリック</b>して「貼り付け」を選びます。</li><li>次からは、USBメモリーなしで、デスクトップのフォルダから開けます。</li></ol></div>' +
 '<div class="box"><h3>USBメモリーで使う時の注意</h3><ul><li>登録した選手と得点は、<b class="in">そのパソコンの中</b>に保存されます。USBメモリーには入りません。</li><li>別のパソコンで開くと、選手の登録は空から始まります。</li><li>漢字の候補と、タブレットからの操作は、インターネットがある時だけ使えます。</li><li>新しい版をもらったら、フォルダごと入れ替えます。</li></ul></div></div>',
 'インターネットがなくても使える方法です。USBメモリーの中のファイルを開くだけで、インストールの作業はいりません。')

# ---------- 4 case 1 ----------
page(4, 'ケース①　パソコン＋モニター＋キーボード＋タブレット',
 wire([('dev','keyboard','キーボード'),('line','線または無線',False),('dev','pc','パソコン'),('line','HDMIケーブル',False),('dev','monitor','モニター')]) +
 wire([('dev','tablet','タブレット'),('line','Wi-Fi（インターネット）',True),('dev','wifi','Wi-Fi'),('line','',True),('dev','pc','パソコン')]) +
 steps([
  ('パソコンとモニターの電源を入れる', 'モニターにパソコンの画面が映っていることを確かめます。映らない時は <b class="in">8章</b> を見てください。'),
  ('カウントを開く', f'<b class="in">2章</b> のとおりに、ブラウザで {URL} を開きます。'),
  ('全画面にする', f'キーボードの {kbd("F")} を押します。'),
  ('キーボードで操作する', f'数字のキーが右側にあるキーボードは、そこがテンキーです。<b class="in">9章</b> の早見表どおりに使えます。右側に数字のキーがないキーボードは、{kbd("↑")}（1点）と {kbd("Enter")}（交代）で使えます。'),
  ('タブレットでも操作する（使う時だけ）', '離れた場所から操作したい時は、タブレットをリモコンにできます。<b class="in">15章</b> を見てください。'),
 ]) +
 note('この組み合わせのよい所', '名前を入れる時は、キーボードで直接文字を打てます（設定の画面）。タブレットを使えば、台のそばから得点を入れられます。'))

# ---------- 5 case 2 ----------
page(5, 'ケース②　パソコン＋モニター＋テンキー＋タブレット',
 wire([('dev','tenkey','テンキー'),('line','無線（USBレシーバー）',True),('dev','pc','パソコン'),('line','HDMIケーブル',False),('dev','monitor','モニター')]) +
 steps([
  ('テンキーをパソコンにつなぐ', 'テンキーに電池を入れて、電源を入れます。付属の小さな部品（USBレシーバー）をパソコンのUSBの口に差します。線でつなぐテンキーは、線を差すだけです。'),
  ('カウントを開く', f'マウスを使って、<b class="in">2章</b>（インターネット）か <b class="in">3章</b>（USBメモリー）の方法で開きます。開く時だけマウスが必要です。'),
  ('全画面にする', '画面右上の <b class="in">全画面 (F)</b> をマウスで押します。'),
  ('テンキーで操作する', f'ここから先は、テンキーだけで全部できます。{kbd("+")} で1点、{kbd("Enter")} で交代です。<b class="in">9章</b> の早見表を台のそばに置いてください。'),
  ('名前もテンキーで入れる', f'{kbd(".")} を2回押すと、選手の登録が始まります。<b class="in">12章</b> を見てください。'),
  ('タブレットでも操作する（使う時だけ）', 'タブレットをリモコンにできます。タブレットの文字入力で名前も入れられます。<b class="in">15章</b> を見てください。'),
 ]) +
 note('数字が入らない時', f'テンキーの {kbd("NumLock")} を1回押してください。ランプが付くテンキーは、ランプが付いている状態で使います。'))

# ---------- 6 case 3 ----------
page(6, 'ケース③　ノートパソコンだけ（外付けモニターなし）',
 wire([('dev','laptop','ノートパソコン（画面とキーボードをそのまま使う）')]) +
 steps([
  ('ノートパソコンを見やすい場所に置く', '選手から画面が見える場所に置きます。充電器はつないだままにします。'),
  ('カウントを開く', f'<b class="in">2章</b>（インターネット）か <b class="in">3章</b>（USBメモリー）の方法で開きます。'),
  ('全画面にする', f'キーボードの {kbd("F")} を押します。'),
  ('キーボードで操作する', '下の表のキーを使います。'),
 ]) +
 f'<table class="tbl"><tr><th>やりたいこと</th><th>ノートパソコンのキー</th></tr><tr><td>1点入れる</td><td>{kbd("↑")}（上向きの矢印）</td></tr><tr><td>1点へらす</td><td>{kbd("↓")}（下向きの矢印）</td></tr><tr><td>交代する</td><td>{kbd("Enter")}</td></tr><tr><td>ひとつ前にもどす</td><td>{kbd("BackSpace")}</td></tr><tr><td>点数をまとめて入れる</td><td>上の段の数字キー {kbd("1")}〜{kbd("0")}</td></tr><tr><td>残り秒数を始める・止める</td><td>{kbd("Shift")} を押しながら {kbd(":")}（「け」のキー）</td></tr><tr><td>新しい試合・選手の登録</td><td>{kbd(".")}（「る」のキー）を2回</td></tr><tr><td>設定</td><td>{kbd("/")}（「め」のキー）</td></tr><tr><td>練習タイマー</td><td>{kbd("P")}</td></tr></table>' +
 note('画面が小さい時', 'ノートパソコンの画面は小さいので、離れると数字が読みにくくなります。テレビやモニターがあれば、HDMIケーブルでつなぐと大きく映せます（<b class="in">8章</b>）。USBで差すだけのテンキーを足すと、<b class="in">9章</b> の早見表どおりに使えます。')
)

# ---------- 7 case 4/5 ----------
page(7, 'ケース④ Wi-Fiがない　／　ケース⑤ パソコンがない',
 '<h3 class="h3">ケース④　Wi-Fi（インターネット）がない</h3>' +
 wire([('dev','usb','USBメモリー'),('line','差す',False),('dev','pc','パソコン'),('line','HDMIケーブル',False),('dev','monitor','モニター')]) +
 steps([
  ('USBメモリーから開く', '<b class="in">3章</b> のとおりに、USBメモリーの中の「1_スタート」を開きます。'),
  ('あとは同じ', '操作は、インターネットがある時と同じです。'),
 ]) +
 '<table class="tbl"><tr><th>ネットなしで使えるもの</th><th>ネットなしでは使えないもの</th></tr><tr><td>得点・交代・もどす<br>残り秒数・タイムアウト・練習タイマー<br>選手の登録（ひらがな・カタカナ・アルファベット）<br>登録した選手の検索</td><td>名前の漢字の候補<br>タブレット・スマホからの操作（リモコン）</td></tr></table>' +
 '<h3 class="h3" style="margin-top:7mm">ケース⑤　パソコンがない（タブレットをモニターにつなぐ）</h3>' +
 wire([('dev','tenkey','テンキー（Bluetooth）'),('line','無線',True),('dev','tablet','タブレット'),('line','変換アダプタ＋HDMI',False),('dev','monitor','モニター')]) +
 steps([
  ('タブレットとモニターをつなぐ', 'タブレットに変換アダプタを差し、HDMIケーブルでモニターにつなぎます。タブレットと同じ画面がモニターに映ります。'),
  ('テンキーをつなぐ', 'タブレットの「設定」→「Bluetooth」を開き、テンキーのペアリングボタンを押して、一覧に出た名前を押します。'),
  ('カウントを開く', f'ブラウザで {URL} を開きます。メニューの「ホーム画面に追加」をしておくと、次からはアイコンで開けます。'),
 ]) +
 note('タブレットを選ぶ時', '映像を外に出せる機種が必要です。iPad は対応しています。Android は機種によります。Fire タブレットは多くが対応していません。'))

# ---------- 8 monitor ----------
page(8, 'モニターにつなぐ',
 wire([('dev','pc','パソコン'),('line','HDMIケーブル（1本だけ）',False),('dev','monitor','モニター・テレビ')]) +
 steps([
  ('HDMIケーブルを差す', 'パソコンとモニターの「HDMI」と書いてある口に、ケーブルの両はしを差します。'),
  ('モニターの入力を「HDMI」にする', 'モニターやテレビのリモコンの「入力切替」を押して、HDMI を選びます。'),
  ('映らない時は、パソコン側で切り替える', f'キーボードの {kbd("Windows")} キー（田のマーク）を押しながら {kbd("P")} を押し、<b class="in">「複製」</b>を選びます。パソコンとモニターに同じ画面が出ます。'),
  ('全画面にする', f'カウントを開いて {kbd("F")} を押します。'),
 ]) +
 '<h3 class="h3">モニターの大きさの目安</h3><table class="tbl"><tr><th>選手が見る距離</th><th>おすすめの大きさ</th><th>残り秒数の数字の高さ</th></tr><tr><td>〜3m（台のすぐそば）</td><td>24〜27型</td><td>約6〜7cm</td></tr><tr><td>3〜5m（台の向こう側から）</td><td><b class="in">32〜43型</b></td><td>約8〜11cm</td></tr><tr><td>5m以上（広い店・観客も見る）</td><td>43〜55型</td><td>約11〜14cm</td></tr></table>' +
 '<p class="small">迷ったら32型がおすすめです。横長（16:9）で、HDMIの口があれば、家庭用のテレビでも使えます。数字の高さは計算上の目安です。</p>' +
 note('HDMIの口がないパソコン', '「USB-C → HDMI 変換アダプタ」を足します。パソコンのUSB-Cの口が映像に対応しているかは、パソコンの説明書で確かめてください。') +
 note('音について', '残り10秒と0秒で音が鳴ります。音はモニター（HDMI）かパソコンから出ます。小さい時は、両方の音量を上げてください。'))

# ---------- 9 tenkey ----------
pad = '''<div class="pad">
<div class="key off" style="grid-column:1 / span 2;grid-row:1"><b>テンキー</b></div>
<div class="key act" style="grid-column:3 / span 2;grid-row:1"><b class="sm">BackSpace</b><span>ひとつ前にもどす</span></div>
<div class="key off" style="grid-column:1;grid-row:2"><b>Num<br>Lock</b></div>
<div class="key" style="grid-column:2;grid-row:2"><b>/</b><span>設定</span></div>
<div class="key act" style="grid-column:3;grid-row:2"><b>*</b><span>残り秒数<br>開始・停止</span></div>
<div class="key" style="grid-column:4;grid-row:2"><b>−</b><span>1点へらす</span></div>
<div class="key num" style="grid-column:1;grid-row:3"><b>7</b></div><div class="key num" style="grid-column:2;grid-row:3"><b>8</b></div><div class="key num" style="grid-column:3;grid-row:3"><b>9</b></div>
<div class="key main" style="grid-column:4;grid-row:3 / span 2"><b>+</b><span>1点</span></div>
<div class="key num" style="grid-column:1;grid-row:4"><b>4</b></div><div class="key num" style="grid-column:2;grid-row:4"><b>5</b><span>数字＝点数を<br>まとめて入力</span></div><div class="key num" style="grid-column:3;grid-row:4"><b>6</b></div>
<div class="key num" style="grid-column:1;grid-row:5"><b>1</b></div><div class="key num" style="grid-column:2;grid-row:5"><b>2</b></div><div class="key num" style="grid-column:3;grid-row:5"><b>3</b></div>
<div class="key main" style="grid-column:4;grid-row:5 / span 2"><b>Enter</b><span>交代</span></div>
<div class="key num" style="grid-column:1 / span 2;grid-row:6"><b>0</b></div>
<div class="key" style="grid-column:3;grid-row:6"><b>.</b><span>2回で<br>新しい試合</span></div>
</div>'''
page(9, 'テンキー早見表',
 '<div class="padwrap">' + pad + f'''<ul class="keys">
<li><span>{kbd("+")}</span><span><b>1点入れる</b>当たるたびに1回押します</span></li>
<li><span>{kbd("Enter")}</span><span><b>交代する</b>外したら押します。次の選手の番になります</span></li>
<li><span>{kbd("BackSpace")}</span><span><b>ひとつ前にもどす</b>押しまちがえた時。何回でももどせます</span></li>
<li><span>{kbd("−")}</span><span><b>1点へらす</b>試合が始まる前は、練習タイマーが開きます</span></li>
<li><span>{kbd("0")}〜{kbd("9")}</span><span><b>点数をまとめて入れる</b>例：{kbd("5")} → {kbd("Enter")} で5点</span></li>
<li><span>{kbd("*")}</span><span><b>残り秒数</b>始める・止める</span></li>
<li><span>{kbd(".")} を2回</span><span><b>新しい試合</b>選手の登録画面が開きます</span></li>
<li><span>{kbd("/")}</span><span><b>設定を開く</b></span></li>
</ul></div>''' +
 note('いちばん大事な2つ', f'当たったら {kbd("+")}、外したら {kbd("Enter")}。この2つだけで試合はできます。まちがえたら {kbd("BackSpace")} です。', 'lime') +
 f'<table class="tbl"><tr><th>キーボードだけで使えるキー</th><th>動き</th></tr><tr><td>{kbd("F")}</td><td>全画面にする・もどす</td></tr><tr><td>{kbd("P")}</td><td>練習タイマーを開く</td></tr><tr><td>{kbd("Esc")}</td><td>開いている画面を閉じる</td></tr><tr><td>{kbd("↑")} {kbd("↓")}</td><td>1点入れる・1点へらす（テンキーがない時）</td></tr></table>',
 'このページを印刷して、台のそばに置いてください。')

# ---------- 10 screen ----------
pins = [(2.2,12.5,1),(22,11.5,2),(4,48,3),(41.5,13,4),(41.5,53,5),(3.5,69.5,6),(33,69.5,7),(1.2,80.2,8),(60,86,9)]
scr = '<div class="pinbox">' + img('main') + ''.join(f'<span class="pin" style="left:{x}%;top:{y}%">{n}</span>' for x, y, n in pins) + '</div>'
page(10, '画面の見方',
 scr + '''<ul class="legend">
<li><i>1</i><span><b>ライムの枠＝今撞いている選手</b>「AT THE TABLE」と出ます。待っている選手は暗くなります</span></li>
<li><i>2</i><span><b>名前（持ち点）</b>白い球＝1人目、黄色い球＝2人目</span></li>
<li><i>3</i><span><b>今の得点</b>当たるたびに、その場で増えます</span></li>
<li><i>4</i><span><b>TIME＝試合時間</b>下の「RUN 2」は、このイニングで当てた点です</span></li>
<li><i>5</i><span><b>INNING＝今、何イニング目か</b></span></li>
<li><i>6</i><span><b>HIGH RUN＝最高連続点　AVERAGE＝アベレージ</b></span></li>
<li><i>7</i><span><b>TIME-OUT＝残りのタイムアウト</b>黄色い丸の数が、残りの回数です</span></li>
<li><i>8</i><span><b>スコア表</b>イニングごとの点が、左から順に並びます</span></li>
<li><i>9</i><span><b>残り秒数</b>1秒ごとに、バーが右から1本ずつ消えます</span></li>
</ul>''' + note('英語が出るのは、試合中の表示だけです', 'TIME・INNING・HIGH RUN・AVERAGE・TIME-OUT は英語で出ます。意味は上のとおりです。操作の説明や設定の画面は、すべて日本語です。'),
 '試合中の画面です。番号の説明は下にあります。')

# ---------- 11 flow ----------
page(11, '試合の流れ',
 steps([
  ('種目を選び、人数と選手を登録する', f'メニューでスリークッションを選びます。試合の画面からは {kbd(".")} を2回押します。くわしくは <b class="in">12章</b>・<b class="in">13章</b>。名前を入れない時は「ゲスト」で始められます。'),
  ('準備の画面が出る', 'VIBESのロゴと、選手の名前・持ち点が出ます。ここでバンキングをして、先攻と後攻を決めます。<b class="in">先攻が左、後攻が右</b>です。'),
  ('先攻と後攻を入れ替える（必要な時だけ）', f'{kbd("/")} を押すと、左右が入れ替わります。練習タイマーは {kbd("−")} で開きます（<b class="in">14章</b>）。'),
  ('先攻が初球を撞く時に「試合開始」', f'{kbd("Enter")} を押すと試合の画面になり、<b class="in">試合時間が動き始めます</b>。残り秒数を使う時は、続けて {kbd("*")} を押します。'),
  ('当たったら1点', f'当たるたびに {kbd("+")} を1回。得点がその場で増えます。'),
  ('外したら交代', f'{kbd("Enter")} を押します。次の選手の番になり、ライムの枠が移ります。0点の時も、そのまま {kbd("Enter")} です。'),
  ('まちがえたら、もどす', f'{kbd("BackSpace")} で、ひとつずつ前にもどります。交代のあとでももどせます。'),
  ('持ち点に届いたら試合終了', f'「試合終了」と結果が出ます。{kbd("Enter")} で次の試合（選手の登録）へ進みます。'),
 ]) + '<div class="one imgs">' + f'<figure>{img("ready")}<figcaption>準備の画面：左が先攻、右が後攻。{kbd("/")} で入れ替え、{kbd("Enter")} で試合開始</figcaption></figure></div>' +
 note('裏撞き（うらづき）について', '誰かが先に持ち点に届いても、その回の最後の選手まで撞いてから試合終了になります。いらない時は、設定（<b class="in">16章</b>）の「裏撞き」を「なし」にします。'),
 'スリークッションでは、座っている人（相手）がカウントします。撞き終わった人は、席にもどって交代のキーを押します。')

# ---------- 12 players 1 ----------
kana = '<div class="kana">' + ''.join(f'<div><kbd>{k}</kbd>' + ''.join(f'<span>{c}<em>{i+1}</em></span>' for i, c in enumerate(r)) + '</div>' for k, r in [(1,'あいうえお'),(6,'はひふへほ'),(2,'かきくけこ'),(7,'まみむめも'),(3,'さしすせそ'),(8,'やゆよ'),(4,'たちつてと'),(9,'らりるれろ'),(5,'なにぬねの'),(0,'わをんー')]) + '</div>'
page(12, '選手の登録（1）人数と、かなの入れ方',
 f'<div class="stepimg"><div><i>1</i><b>人数を選ぶ</b><p>{kbd(".")} を2回押すと、この画面が出ます。{kbd("2")}・{kbd("3")}・{kbd("4")} で人数を選びます。{kbd("Enter")} だけ押すと、前と同じ人数です。</p></div>{img("count")}</div>' +
 f'<div class="stepimg"><div><i>2</i><b>登録のしかたを選ぶ</b><p>{kbd("1")}＝前に登録した選手を呼び出す<br>{kbd("2")}＝はじめての選手を登録する<br>{kbd("3")}＝名前を入れずに始める（ゲスト）</p></div>{img("mode")}</div>' +
 f'<div class="stepimg"><div><i>3</i><b>かなを入れる（数字を2回押す）</b><p>1回目で<b class="in">行</b>、2回目で<b class="in">文字</b>を選びます。<br>例：{kbd("8")} を押すと「や行」が光ります。次に {kbd("1")} を押すと「や」が入ります。</p></div>{img("kanarow")}</div>' +
 '<h3 class="h3">かなの表</h3>' + kana +
 note('濁点（゛）・半濁点（゜）・小さい字', f'文字を入れた直後に {kbd("*")} を押します。押すたびに変わります。　か→<b class="in">が</b>　　は→<b class="in">ば</b>→<b class="in">ぱ</b>　　つ→<b class="in">づ</b>→<b class="in">っ</b>　　や→<b class="in">ゃ</b>') +
 f'<div class="ex"><span>例：「やまだ」</span><i>{kbd("8","1")}<b>や</b></i>→<i>{kbd("7","1")}<b>ま</b></i>→<i>{kbd("4","1")}<b>た</b></i>→<i>{kbd("*")}<b>だ</b></i></div>',
 '数字のキーだけで、名前を入れられます。')

# ---------- 13 players 2 ----------
page(13, '選手の登録（2）漢字・持ち点・アルファベット',
 f'<div class="stepimg"><div><i>4</i><b>漢字を選ぶ</b><p>名字のかなを入れて {kbd("Enter")} を押すと、漢字の候補が出ます。<b class="in">番号</b>を押して選び、{kbd("Enter")} で決めます。{kbd("0")} で次のページです。</p></div>{img("cand")}</div>' +
 f'<div class="stepimg"><div><i>5</i><b>名前（下の名前）を入れる</b><p>同じように、かな → {kbd("Enter")} → 番号 → {kbd("Enter")}。<br>名前を入れない時は、何も入れずに {kbd("Enter")}。</p></div>{img("kana_mei")}</div>' +
 f'<div class="stepimg"><div><i>6</i><b>持ち点を入れる</b><p>数字で入れて {kbd("Enter")}。これで1人分の登録が終わり、次の選手に進みます。</p></div>{img("target30")}</div>' +
 f'<div class="stepimg"><div><i>＋</i><b>アルファベットで入れる</b><p>かなの画面で {kbd("/")} を押すと、アルファベットの表に変わります。入れ方は同じです（例：S＝{kbd("4","4")}）。もう一度 {kbd("/")} でかなにもどります。</p></div>{img("abc")}</div>' +
 f'<table class="tbl"><tr><th>こんな時</th><th>押すキー</th></tr><tr><td>1文字消す・前の画面にもどる</td><td>{kbd("BackSpace")}</td></tr><tr><td>登録をやめる</td><td>{kbd("Esc")}</td></tr><tr><td>前に登録した選手を呼び出す</td><td>{kbd("1")} → 名字のかなを1〜2文字 → {kbd("Enter")} → 番号 → {kbd("Enter")}<br><span class="small">何も入れずに {kbd("Enter")} を押すと、全員が出ます</span></td></tr><tr><td>名前をまちがえて登録した</td><td>{kbd(".")} を2回押して、{kbd("2")} から入れ直します</td></tr><tr><td>まちがえた登録を消す</td><td>{kbd("1")} → {kbd("Enter")} → 番号で選ぶ → {kbd("−")} を2回</td></tr><tr><td>試合の途中で名前だけ直す</td><td>画面右上の「選手」をマウスで押します（得点は残ります）</td></tr></table>' +
 note('漢字の候補について', '漢字の候補は、インターネットがある時だけ出ます。ない時は、ひらがな・カタカナ・アルファベットで登録できます。'))

# ---------- 14 timers ----------
page(14, '残り秒数・タイムアウト・練習タイマー',
 '<h3 class="h3">残り秒数（40秒）</h3>' +
 f'<table class="tbl"><tr><th>キー</th><th>動き</th></tr><tr><td>{kbd("*")}</td><td>残り秒数を始める。もう一度押すと止まる</td></tr><tr><td>{kbd("+")}</td><td>1点入れると、自動で40秒にもどって数え直します</td></tr><tr><td>{kbd("Enter")}</td><td>交代すると、次の選手の40秒が始まります</td></tr></table>' +
 '<p class="small">残り10秒で「ピッ」、0秒で長い音が鳴ります。残り10秒からは、数字が黄色になります。</p>' +
 '<h3 class="h3">タイムアウト（黄色い丸）</h3>' +
 '<div class="to"><div><span class="dots"><i></i><i></i><i></i></span><b>はじめは3回</b>選手ごとに黄色い丸が3つあります</div><div class="arrow">→</div><div><span class="dots"><i></i><i></i><i class="u"></i></span><b>0秒になると、丸が1つ消える</b>自動で、もう一度40秒が始まります</div><div class="arrow">→</div><div><span class="dots"><i class="u"></i><i class="u"></i><i class="u"></i></span><b>丸がなくなると時間切れ</b>0秒で、数字が赤くなります</div></div>' +
 f'<p class="small">まちがえて丸が消えた時は、{kbd("BackSpace")} でもどせます。回数は、設定の「タイムアウトの回数」で変えられます。0 にすると丸は出ません。</p>' +
 '<h3 class="h3">練習タイマー</h3><div class="stepimg"><div>' +
 f'<table class="tbl"><tr><td>{kbd("−")} または {kbd("P")}</td><td>開く（{kbd("−")} は試合の前だけ）</td></tr><tr><td>{kbd("+")}</td><td>開始・一時停止</td></tr><tr><td>{kbd("1")}〜{kbd("9")}</td><td>分数を変える</td></tr><tr><td>{kbd("/")}</td><td>最初にもどす</td></tr><tr><td>{kbd("Enter")}</td><td>閉じて試合へ</td></tr></table></div>{img("warm")}</div>' +
 '<p class="small">はじめは5分です。残り30秒と0秒で音が鳴ります。10分以上にしたい時は、設定の「練習時間（分）」に分数を入れます。</p>')

# ---------- 15 remote ----------
page(15, 'タブレット・スマホで操作する（リモコン）',
 '<div class="rm"><div>' + steps([
  ('カウントの画面で「リモコン」を押す', '画面右上の <b class="in">リモコン</b> をマウスで押します。6けたの番号が出ます。'),
  ('タブレットでリモコンのページを開く', f'タブレットのブラウザで <b class="in">{RURL}</b> を開きます。'),
  ('6けたの番号を入れる', 'カウントの画面に出ている番号を入れて、<b class="in">つなぐ</b> を押します。'),
  ('準備の画面では「入れ替え」と「試合開始」', 'バンキングのあと、入れ替える時は <b class="in">入れ替え</b>、先攻が初球を撞く時に <b class="in">試合開始</b> を押します。'),
  ('得点は、スコアの数字を押す', '座っている人（相手）がカウントします。<b class="in">どちらのスコアを押しても</b>、今撞いている選手に1点入ります。自分の側のスコアを押せば大丈夫です。'),
  ('交代は「交代」を押す', '撞き終わった人が席にもどって押します。<b class="in">どちらの「交代」を押しても</b>、次の選手の番になります。'),
  ('そのほかのボタン', '<b class="in">−1</b>＝1点へらす　<b class="in">戻る</b>＝ひとつ前にもどす　<b class="in">残り秒数</b>＝40秒を始める・止める　<b class="in">練習時間</b>＝練習タイマー　<b class="in">選手</b>＝名前と持ち点　<b class="in">新しい試合</b>＝2回押す'),
 ]) + img('rmcode') + '</div><div class="phones">' + img('remote_main','phone') + '</div></div>' +
 note('使う時の注意', '<ul><li>パソコンとタブレットの<b class="in">両方</b>が、インターネットにつながっている必要があります。</li><li>番号は台ごとに違います。次に使う時も、同じ番号でつながります。</li><li>3人・4人の試合では、リモコンには「今の選手」と「次の選手」が出ます。3人・4人の名前は、カウントの画面で登録してください。</li></ul>'),
 '離れた場所から、タブレットやスマホで得点を入れられます。インターネットが必要です。')

# ---------- 16 settings ----------
page(16, '設定　／　3人・4人で使う',
 '<div class="stepimg tall"><div>' +
 f'<p>{kbd("/")} を押すと設定が開きます。数字を入れて {kbd("Enter")} で保存、{kbd("Esc")} でやめます。</p>' +
 '<table class="tbl"><tr><th>項目</th><th>意味</th></tr><tr><td>人数</td><td>2〜4人。試合の前だけ変えられます</td></tr><tr><td>タイムアウトの回数</td><td>1人あたりの回数。0＝なし</td></tr><tr><td>名前・持ち点</td><td>選手ごとに入れます</td></tr><tr><td>イニング制限</td><td>0＝制限なし</td></tr><tr><td>残り秒数</td><td>1ショットの秒数。0＝使わない</td></tr><tr><td>練習時間（分）</td><td>練習タイマーの分数</td></tr><tr><td>裏撞き</td><td>あり＝全員が撞いてから終了</td></tr><tr><td>音</td><td>あり＝残り10秒と時間切れで鳴る</td></tr></table></div>' + img('settings') + '</div>' +
 '<h3 class="h3">3人・4人で使う</h3>' + img('p4','wide') +
 f'<p class="small">{kbd(".")} を2回押して、最初の画面で {kbd("3")} か {kbd("4")} を押します。選手が横に並び、順番は左から右へ回ります。3人目は赤、4人目は緑の球です。右はしに TIME と INNING が出ます。</p>')

# ---------- 17 trouble ----------
qa = [
 ('キーを押しても動かない', f'画面の上を一度マウスでクリックしてから押します。テンキーの数字が入らない時は {kbd("NumLock")} を押します。画面右下に「あ」と出ている時は、{kbd("半角/全角")} キーを押して「A」にします。'),
 ('点を入れすぎた・交代をまちがえた', f'{kbd("BackSpace")} を押すと、ひとつずつ前にもどります。'),
 ('残り秒数が動かない', f'{kbd("*")} を押すと始まります。設定の「残り秒数」が 0 の時は動きません。'),
 ('音が鳴らない', 'パソコンとモニターの音量を上げます。設定の「音」が「なし」の時は鳴りません。'),
 ('まちがえて画面を閉じてしまった', 'もう一度開くと、試合の続きから始まります。得点は消えません。'),
 ('画面が小さい・まわりに余白がある', f'{kbd("F")} を押すと全画面になります。'),
 ('モニターに映らない', f'モニターの入力を HDMI にします。それでも映らない時は {kbd("Windows")}＋{kbd("P")} →「複製」（<b class="in">8章</b>）。'),
 ('漢字の候補が出ない', 'インターネットにつながっていない時は出ません。ひらがな・カタカナ・アルファベットで登録できます。'),
 ('リモコンがつながらない', 'パソコンとタブレットの両方がインターネットにつながっているか、6けたの番号が合っているかを確かめます。'),
 ('古い画面が出る・新しくならない', f'{kbd("F5")} を押して読み込み直します。USBメモリーの場合は、新しいフォルダに入れ替えます。'),
]
page(17, '困ったとき', '<div class="qa">' + ''.join(f'<div><b>{q}</b><p>{a}</p></div>' for q, a in qa) + '</div>' +
 note('終わる時', f'そのまま画面を閉じて大丈夫です。得点と選手の登録は、パソコンに残ります。USBメモリーは、画面右下の「ハードウェアを安全に取り外す」を押してから抜くと安心です。') +
 note('この説明書について', 'テスト版です。わかりにくい所、動きがおかしい所があれば、運営（VIBES BILLIARDS）に教えてください。', 'lime'))

toc = ('<section class="pg toc"><header><i>目</i><h2>もくじ</h2></header><ol class="tocl">' + ''.join(f'<li><a href="#c{i+1}"><i>{i+1}</i>{t}</a></li>' for i, t in enumerate([
 'まず、あなたのお店はどれですか？','インターネットで開く','USBメモリーで開く','ケース①　パソコン＋モニター＋キーボード＋タブレット','ケース②　パソコン＋モニター＋テンキー＋タブレット','ケース③　ノートパソコンだけ','ケース④ Wi-Fiがない　／　ケース⑤ パソコンがない','モニターにつなぐ','テンキー早見表','画面の見方','試合の流れ','選手の登録（1）人数と、かなの入れ方','選手の登録（2）漢字・持ち点・アルファベット','残り秒数・タイムアウト・練習タイマー','タブレット・スマホで操作する（リモコン）','設定　／　3人・4人で使う','困ったとき'])) + '</ol>' +
 '<div class="quick"><b>いちばん短い使い方</b><div><span>1</span>カウントを開く（2章か3章）</div><div><span>2</span>' + kbd("Enter") + ' → ' + kbd("3") + ' → ' + kbd("Enter") + ' を人数分（名前なし）→ 準備の画面で ' + kbd("Enter") + '</div><div><span>3</span>当たったら ' + kbd("+") + '　外したら ' + kbd("Enter") + '　まちがえたら ' + kbd("BackSpace") + '</div></div></section>')

CSS = open(f'{D}/manual.css').read()
body = '<main class="mn">' + cover + toc + ''.join(pages) + '</main>'
open(f'{D}/out/manual-print.html', 'w').write('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>スリークッション デジタルカウント 取扱説明書</title><style>' + CSS + '</style></head><body class="print">' + body + '</body></html>')
open(f'{D}/out/manual-web.html', 'w').write('<title>3Cカウント 取扱説明書</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<style>' + CSS + '</style>\n' + body)
print('ok', len(body) // 1024, 'KB')
