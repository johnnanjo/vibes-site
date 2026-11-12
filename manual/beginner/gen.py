import json,base64,io,html
from PIL import Image
M=json.load(open('marks.json'))
def img(name,w):
    im=Image.open(name+'.png').convert('RGB')
    if im.width>w: im=im.resize((w,round(im.height*w/im.width)),Image.LANCZOS)
    b=io.BytesIO(); im.save(b,'JPEG',quality=78,optimize=True); return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode(),im.width,im.height
def fig(name,cap,notes=None,dev=None,small=False):
    dev=dev or ('pc' if name.startswith('pc') else 'phone' if name.startswith('ph') else 'ipad')
    src,w,h=img(name,1180 if dev=='pc' else 1100)
    ms=M.get(name,[]) if notes else []
    o=f'<figure class="shot {dev}{" small" if small else ""}"><div class="dev"><span class="tag">{"PCの画面（モニター）" if dev=="pc" else "お客様のスマホ" if dev=="phone" else "iPadの画面"}</span><div class="scr" style="aspect-ratio:{w}/{h}"><img src="{src}" alt="{html.escape(cap)}" width="{w}" height="{h}">'
    for i,m in enumerate(ms):
        if i>=len(notes): break
        o+=f'<i class="box" style="left:{m[0]}%;top:{m[1]}%;width:{m[2]}%;height:{m[3]}%"><b>{i+1}</b></i>'
    o+='</div></div>'
    if notes:
        o+='<ol class="legend">'+''.join(f'<li><b>{i+1}</b><span>{n}</span></li>' for i,n in enumerate(notes))+'</ol>'
    o+=f'<figcaption>{cap}</figcaption></figure>'
    return o
def steps(items): return '<ol class="steps">'+''.join(f'<li><b class="n">{i+1}</b><div><h4>{t}</h4><p>{d}</p></div></li>' for i,(t,d) in enumerate(items))+'</ol>'
def sec(i,idv,title,lead,body): return f'<section id="{idv}"><header><span class="no">{i}</span><div><h2>{title}</h2><p class="lead">{lead}</p></div></header>{body}</section>'
def tip(t,kind='tip'): return f'<p class="{kind}"><b>{"ポイント" if kind=="tip" else "注意"}</b><span>{t}</span></p>'

DIAG='''<div class="diag" role="img" aria-label="PCの画面は見るところ、iPadは押すところ。ネットでつながります。">
<svg viewBox="0 0 900 330" xmlns="http://www.w3.org/2000/svg">
<rect x="40" y="30" width="360" height="210" rx="14" fill="var(--scr)" stroke="var(--ink)" stroke-width="4"/>
<rect x="60" y="50" width="150" height="130" rx="8" fill="#1E5AA8"/><rect x="230" y="50" width="150" height="130" rx="8" fill="#1E5AA8"/>
<text x="135" y="140" text-anchor="middle" font-size="70" font-weight="900" fill="#fff">8</text><text x="305" y="140" text-anchor="middle" font-size="70" font-weight="900" fill="#F2C200">6</text>
<rect x="60" y="192" width="320" height="30" rx="6" fill="#2C313D"/>
<rect x="195" y="240" width="50" height="34" fill="var(--ink)"/><rect x="140" y="272" width="160" height="12" rx="6" fill="var(--ink)"/>
<text x="220" y="316" text-anchor="middle" font-size="24" font-weight="900" fill="var(--ink)">PCの画面 ＝ 見るところ</text>
<rect x="560" y="70" width="290" height="190" rx="18" fill="var(--scr)" stroke="var(--ink)" stroke-width="4"/>
<rect x="580" y="90" width="110" height="150" rx="8" fill="#1E5AA8"/><rect x="700" y="90" width="130" height="44" rx="8" fill="#2C313D"/><rect x="700" y="142" width="130" height="44" rx="8" fill="#2C313D"/><rect x="700" y="194" width="130" height="46" rx="8" fill="#C0FC09"/>
<text x="635" y="180" text-anchor="middle" font-size="54" font-weight="900" fill="#fff">8</text>
<text x="705" y="316" text-anchor="middle" font-size="24" font-weight="900" fill="var(--ink)">iPad ＝ 押すところ</text>
<path d="M415 135 H545" stroke="var(--ink)" stroke-width="5" stroke-dasharray="3 12" stroke-linecap="round" fill="none"/>
<path d="M455 100 q25 -26 50 0 M465 112 q15 -16 30 0" stroke="var(--ink)" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="480" cy="122" r="5" fill="var(--ink)"/>
<text x="480" y="172" text-anchor="middle" font-size="20" font-weight="700" fill="var(--sub)">ネット（Wi-Fi）</text>
</svg></div>'''

S=[]
S.append(sec(1,'shikumi','しくみ','PCの画面でスコアを見て、iPadで操作します。むずかしい設定はありません。',DIAG+
 '<ul class="plain"><li><b>PC（デスクトップ）</b>は、スコアを大きく映すだけです。試合中は触りません。</li><li><b>iPad</b>が操作盤です。点を入れる、交代する、選手を選ぶ、すべてiPadでできます。</li><li>2台は<b>お店のネット（Wi-Fi）</b>でつながります。iPadがPCのQRコードを読むだけです。</li></ul>'))
S.append(sec(2,'youi','用意するもの','はじめに、下の4つがそろっているか確かめます。',
 '<ul class="check"><li><b>デスクトップPC</b><span>Windows。Google Chrome か Microsoft Edge が入っていること。</span></li><li><b>PCのモニター</b><span>台から見える場所に置きます。小さい時は、テレビにHDMIでつなぐと見やすくなります。</span></li><li><b>iPad</b><span>カメラが使えること。スタンドに立てて、台のそばに置きます。充電器もあると安心です。</span></li><li><b>ネット（Wi-Fi）</b><span>PCとiPadの両方が、ネットにつながっていること。</span></li><li><b>スピーカー</b><span>点数を読み上げる声を出します。モニターから音が出るなら不要です。</span></li></ul>'))
S.append(sec(3,'pc','PCの準備','開店の時に1回だけ行います。終わったら、PCは触らなくて大丈夫です。',
 steps([('PCの電源を入れます','いつも通りに起動します。'),
        ('Chrome（または Edge）を開きます','画面の下か、デスクトップにある丸いマークをダブルクリックします。'),
        ('アドレスを入れて Enter を押します','一番上の細長い欄をクリックして、下のアドレスを打ちます。<span class="url">vibesbilliards.com/pages/count/</span>2回目からは、ブックマーク（お気に入り）に入れておくと楽です。'),
        ('キーボードの F を押します','画面いっぱいに広がります。もう一度 F を押すと元に戻ります。'),
        ('画面のどこかを1回クリックします','これで、点数を読み上げる声がPCから出るようになります。')])+
 fig('pc_top','PCにこの画面が出れば準備完了です。',['<b>QRコード</b>：あとでiPadのカメラで読みます。右の6けたの番号は、QRコードが読めない時に使います。','<b>メニュー</b>：iPadをつなぐと、同じものがiPadに出ます。','<b>全画面</b>：F キーと同じです。'])+
 tip('PCのスリープ（しばらくすると画面が消える設定）は、切っておくと安心です。画面が消えたら、マウスを動かすと戻ります。','warn')))
S.append(sec(4,'ipad','iPadをつなぐ','PCの画面のQRコードを、iPadのカメラで読みます。',
 steps([('iPadの「カメラ」を開きます','ホーム画面の、カメラの絵のアプリです。'),
        ('PCの画面の左上のQRコードに向けます','写真は撮りません。向けるだけで、画面に黄色い枠と文字が出ます。'),
        ('出てきた黄色い文字（リンク）を押します','Safari が開いて、メニューが出ます。'),
        ('iPadを横向きにして、スタンドに立てます','横向きにすると、ボタンが大きくなり、1画面に収まります。')])+
 fig('ip_menu','iPadにこのメニューが出たら、つながっています。右上の緑の丸と番号が、つながっている印です。',['<b>ニューゲーム</b>：種目と選手を選んで始めます。','<b>同じ人とゲーム</b>：前回と同じ種目・同じ選手で、すぐ始めます。','<b>選手登録</b>：選手の登録と、持ち点の修正。','<b>各種設定</b>：秒数カウント、イージーモードなど。'])+
 fig('pc_solo','iPadがつながると、PCの画面はロゴだけになります。これで正常です。',small=True)+
 tip('うまくつながらない時は、iPadのSafariで <span class="url inl">vibesbilliards.com/pages/count-remote/</span> を開き、PCに出ている6けたの番号を入れて「つなぐ」を押します。')))
S.append(sec(5,'start','試合を始める','iPadで、種目 → 選手 → 試合開始 の順に進みます。',
 '<h3>種目を選ぶ</h3><div class="pair">'+fig('ip_game','「ニューゲーム」を押し、「キャロム」を押します。',['キャロム'],small=True)+fig('ip_carom','「スリークッション」を押します。',['スリークッション'],small=True)+'</div>'+
 '<h3>選手を選ぶ</h3>'+fig('ip_players0','「選手の登録」の画面になります。',['<b>人数</b>：2人・3人・4人から選びます。','<b>名簿から選ぶ</b>：前に登録した選手を、名前でさがして選びます。','<b>名前</b>：はじめての人は、ここに直接入れます（漢字で入れられます）。入れた名前は、自動で名簿に残ります。','<b>持ち点</b>：その選手の持ち点です。数字を押して直せます。'])+
 fig('ip_pick','「名簿から選ぶ」を押すと、さがす画面が出ます。',['名前か、よみがなの最初の2〜3文字を入れます（例：やま）。','出てきた名前を押すと、名前と持ち点が入ります。'],small=True)+
 fig('ip_players','2人とも入ったら、緑の「モニターに送る」を押します。',['名前','持ち点（その日の持ち点に直せます）','<b>モニターに送る</b>：PCの画面に名前が出ます。'],small=True)+
 '<h3>先攻・後攻を決めて、始める</h3>'+fig('ip_ready','バンキングをして、先攻・後攻を決めます。',['上が<b>先攻</b>、下が<b>後攻</b>です。','逆だった時は「<b>入れ替え</b>」を押します。','先攻が初球を撞く時に「<b>試合開始</b>」を押します。ここから試合時間が動きます。','選手の入れ直し、設定、練習時間、メニューに戻る、はここから。'])+
 fig('pc_ready','この時、PCの画面には2人の名前と持ち点が出ています。先攻が左です。',small=True)))
S.append(sec(6,'play','試合中の操作','スリークッションは、相手がカウントします。座っている人がiPadを押します。',
 fig('ip_play','試合中のiPadの画面です。使うボタンはこれだけです。',['<b>スコア</b>：点が入ったら、撞いている人のスコアを1回押します。1回で1点です。','<b>交代</b>：外したら「交代」を押します。相手の番になります。','<b>イニング・この回の点・残り秒</b>：今の状況です。','<b>−1</b>：押しすぎた時に、1点へらします。','<b>戻る</b>：ひとつ前の状態に戻します（交代を間違えた時など）。','<b>秒数カウント</b>：残り秒数を動かす・止める。点を入れるか交代すると、自動で最初の秒数に戻ります。','<b>一時停止</b>：時計を止めます。もう一度押すと再開します。','<b>試合終了</b>：途中で終わる時に、2回押します。'])+
 '<div class="flow"><div><b>当たった</b><span>スコアを1回押す</span></div><i></i><div><b>外した</b><span>「交代」を押す</span></div><i></i><div><b>相手の番</b><span>くり返す</span></div></div>'+
 fig('pc_play','PCの画面の見かたです。',['<b>大きな数字</b>：今の合計点です。','<b>AT THE TABLE</b>：緑の枠と札が付いている方が、今撞いている人です。','<b>TIME</b>：試合時間。下の RUN はこの回の連続点です。','<b>INNING</b>：今のイニングです。','<b>HIGH RUN・AVERAGE・TIME-OUT</b>：ハイラン、アベレージ、残りのタイムアウト（黄色の丸）です。','<b>点数表</b>：小さい数字がイニング、その下がその回の点です。','<b>残り秒数</b>：0になると、タイムアウトが1つ自動で減って、もう一度数え直します。'])+
 '<h3>声で知らせます（音声コール）</h3><p>点が入ると、PCから英語で読み上げます。持ち点が近づくと、残りの点も言います。</p><table class="tbl"><thead><tr><th>場面</th><th>声</th></tr></thead><tbody><tr><td>1点入った</td><td>one point（ワン・ポイント）</td></tr><tr><td>続けて2点目</td><td>two points（ツー・ポインツ）</td></tr><tr><td>持ち点まであと3点</td><td>three more（スリー・モア）</td></tr><tr><td>あと2点</td><td>two more（ツー・モア）</td></tr><tr><td>あと1点</td><td>one more（ワン・モア）</td></tr></tbody></table>'+
 '<h3>持ち点に届いたら</h3><ul class="plain"><li><b>先攻が先に届いた時</b>：すぐには終わりません。後攻がもう1回撞きます（裏撞き）。</li><li><b>後攻も届いた時</b>：引き分け（DRAW）です。</li><li><b>後攻が届かなかった時</b>：先攻の勝ちです。</li></ul>'+
 '<h3>少し休む時</h3><div class="pair">'+fig('ip_pause','「一時停止」を押すと緑の「再開」に変わります。',['もう一度押すと再開します。'],small=True)+fig('pc_pause','PCの画面にも「一時停止中」と出ます。止めている間は、点は入りません。',small=True)+'</div>'))
S.append(sec(7,'end','試合を終える','持ち点に届くと、自動で結果が出ます。途中で終わる時は「試合終了」を2回押します。',
 fig('ip_result','iPadの結果の画面です。',['<b>勝者</b>（引き分けの時は「引き分け（DRAW）」）','<b>2人の成績</b>：得点、イニング、ハイラン、アベレージ。','<b>新しい試合（同じ選手）</b>：同じ2人でもう1試合。','<b>選手を変える</b>：選手を入れ直します。','<b>トップへ戻る</b>：最初のメニューに戻ります。次のお客さんに代わる時はこれ。','<b>戻る</b>：間違えて終了した時に、試合に戻ります。'])+
 fig('pc_result','PCの画面にも同じ結果が出ます。',small=True)))
S.append(sec(8,'roster','選手登録と持ち点の修正','一度登録した選手は、ずっと残ります。次からは名簿から選ぶだけです。',
 fig('ip_roster','メニューの「選手登録」を押すと、名簿が出ます。',['<b>＋ 新しい選手を登録</b>：お店の人がiPadで入力します。','<b>お客様のスマホで登録</b>：お客様に自分で入力してもらいます（下で説明します）。','<b>さがす</b>：名前か、よみがなを入れます。','<b>名前を押す</b>と、その選手を直せます。右の数字が持ち点です。'])+
 fig('ip_edit','登録・修正の画面です。',['<b>名前</b>：漢字でそのまま入れます。姓と名の間は空けます。','<b>よみがな</b>：ひらがなで入れます。さがす時に使います。','<b>持ち点</b>：変わったら、ここを直すだけです。','<b>保存する</b>を押すと、名簿に入ります。'])+
 '<h3>お客様が自分のスマホで登録する</h3><p>名前の漢字や持ち点は、本人に入れてもらうのが一番確かです。アプリも会員登録もいりません。</p>'+
 steps([('iPadで「お客様のスマホで登録」を押します','選手名簿の画面にあります。iPadに大きなQRコードが出ます。'),
        ('お客様に、自分のスマホのカメラで読んでもらいます','iPadの画面を見せます。出てきたリンクを押すと、入力の画面が開きます。'),
        ('名前・よみがな・持ち点を入れて「登録する」を押してもらいます','「登録しました」と出たら完了です。お店の名簿にすぐ入ります。'),
        ('iPadの「戻る」を押します','名簿に新しい名前が入っています。試合の時は「名簿から選ぶ」で選べます。')])+
 fig('ip_qr','iPadに出る、登録用のQRコードです。',['このQRコードを、お客様のスマホで読んでもらいます。'],small=True)+
 '<div class="pair">'+fig('ph_self','お客様のスマホに出る画面です。',['名前（漢字で入れられます）','よみがな（ひらがな）','持ち点','<b>登録する</b>'],small=True)+fig('ph_done','この画面が出たら完了です。',['登録された名前'],small=True)+'</div>'+
 tip('持ち点が変わった時は、同じ名前でもう一度登録してもらうと、持ち点が上書きされます。PCのトップ画面の「選手登録」にも、同じQRコードが出ます。')+
 tip('お客様の画面は登録専用です。スコアの操作はできません。試合中に登録しても、試合は止まりません。')+
 tip('同姓同名の方がいると、同じ選手として上書きされます。その時は「山田 太郎2」のように、名前を少し変えてもらいます。','warn')+
 tip('持ち点は、試合前の「選手の登録」の画面で直しても、名簿に上書きされます。わざわざ名簿を開かなくても大丈夫です。')+tip('間違えて登録した選手は、名前を押して「名簿から消す」を2回押します。','warn')))
S.append(sec(9,'settings','各種設定とイージーモード','メニューの「各種設定」で、お店に合わせて変えられます。',
 fig('ip_config','変えたい所を直して、下の緑の「モニターに送る」を押します。',['<b>イージーモード</b>：「あり」にすると、点数・イニング・名前・ハイランだけの大きな表示になります。','<b>秒数カウント</b>：1ショットの秒数。使わない時は 0 にします。','<b>音声コール</b>：点数の読み上げ。うるさい時は「なし」にします。','<b>モニターに送る</b>'])+
 fig('pc_easy','イージーモードのPC画面です。はじめての方や、数字を大きく見たい時に向いています。',small=True)))
QA=[('iPadに「つながっていません」と出る','PCのページが開いているか確かめます。開いていたら、iPadのページを下に引っぱって読み込み直します。直らない時は、もう一度QRコードを読みます。'),
('QRコードが読めない','iPadを少し離して、QRコード全体が映るようにします。だめな時は、Safariで vibesbilliards.com/pages/count-remote/ を開いて、PCの6けたの番号を入れます。'),
('PCの画面にQRコードが出ていない','右上の「リモコン」を押すと、大きなQRコードが出ます。'),
('点を入れすぎた','「−1」を押します。'),
('交代を間違えて押した','「戻る」を押します。押すたびに、ひとつずつ前に戻ります。'),
('声が出ない','PCの画面を1回クリックします。PCの音量と、スピーカーの電源も確かめます。'),
('画面が古いまま／表示がおかしい','PCは Ctrl を押しながら F5 を押します。iPadはページを下に引っぱって読み込み直します。'),
('PCの画面が消えた','マウスを動かすか、キーボードを押します。試合の内容は残っています。'),
('ネットが切れた','PCにキーボードがあれば、そのまま続けられます。＋で1点、Enter で交代、BackSpace で戻る、です。')]
S.append(sec(10,'komatta','困った時は','あわてずに、下の表を見てください。','<table class="tbl qa"><thead><tr><th>こんな時</th><th>こうします</th></tr></thead><tbody>'+''.join(f'<tr><td>{a}</td><td>{b}</td></tr>' for a,b in QA)+'</tbody></table>'))
S.append(sec(11,'matome','1枚まとめ','台のそばに貼っておくと便利です。',
 '<div class="sum"><div><h3>開店の時（PC）</h3><ol><li>Chrome を開く</li><li>vibesbilliards.com/pages/count/ を開く</li><li>F で全画面、画面を1回クリック</li></ol></div><div><h3>始める時（iPad）</h3><ol><li>カメラでQRコードを読む</li><li>ニューゲーム → 種目</li><li>選手を選ぶ → モニターに送る</li><li>試合開始</li></ol></div><div><h3>試合中（iPad）</h3><ol><li>当たった → スコアを押す</li><li>外した → 交代</li><li>間違えた → −1 か 戻る</li></ol></div><div><h3>終わったら（iPad）</h3><ol><li>同じ2人 → 新しい試合</li><li>次の人 → トップへ戻る</li></ol></div></div>'))

TOC=''.join(f'<li><a href="#{i}"><b>{n}</b>{t}</a></li>' for n,(i,t) in enumerate([('shikumi','しくみ'),('youi','用意するもの'),('pc','PCの準備'),('ipad','iPadをつなぐ'),('start','試合を始める'),('play','試合中の操作'),('end','試合を終える'),('roster','選手登録と持ち点（お客様のスマホでも）'),('settings','各種設定・イージーモード'),('komatta','困った時は'),('matome','1枚まとめ')],1))
css=open('page.css').read()
page=f'''<title>デジタルカウント はじめての使い方</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&family=Anton&display=swap">
<style>{css}</style>
<div class="wrap">
<div class="cover"><p class="brand">VIBES DIGITAL LAB</p><h1>デジタルカウント<br>はじめての使い方</h1><p class="sub">PCとiPadで使う スリークッションのスコアボード</p><ul class="env"><li>ネットあり</li><li>デスクトップPC</li><li>iPad</li></ul></div>
<nav class="toc" aria-label="もくじ"><h2>もくじ</h2><ol>{TOC}</ol></nav>
{''.join(S)}
<p class="foot">VIBES BILLIARDS ／ VIBES DIGITAL LAB　デジタルカウント　2026年11月12日版</p>
</div>'''
open('wind-manual.html','w').write(page); print(len(page)//1024,'KB')
