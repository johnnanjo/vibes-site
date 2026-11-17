# VIBES BILLIARDS（vibesbilliards.com）

日本のビリヤード大会・試合結果・ビリヤード場のポータル。Shopifyから移転した静的サイト。

## Build
- `node build.mjs` → `dist/`（依存パッケージなし。Node 18+）
- 公開：GitHub Pages（`.github/workflows/pages.yml`、mainへのpushで自動）。Cloudflare Worker `vibes-site1` はプレビュー（ドメイン移管後に本番へ）
- 確認：`cd dist && python3 -m http.server`

## Data（ここを書き換えるとサイトが更新される）
- `data/tournaments.json` 大会（公式戦／ハウス）。結果は `results` / `winner`。選手ページは `winner` から自動生成。
- `data/shops.json` ビリヤード場
- `data/articles.json` NEWS・試合結果・ハウストーナメント・試合速報の記事（`blog.handle` で振り分け）
- `data/pages.json` 規約などの固定ページ本文、`data/products.json` 商品
- `data/inbox/{articles,tournaments,shops}/*.json` 自動化が書き込む追加分（1件または配列）。ファイル名順に読み、同じhandleは項目ごとに上書き
  - 記事：Make「VIBES Shopify記事 → 新サイト同期」が2時間ごとに `sync-*.json` を追加。掲載フォームは `ht-*`/`form-*` を直接追加
  - 大会・店：Shopifyに書き込む予約タスクが、最後に変更分を `sync-*.json` で追加。`status:"DRAFT"` は運営者が外した大会として非表示（終了14日以上後のDRAFTは結果の履歴として表示）
  - 大会の自動取り込み：`data/inbox/events/*.json`（Googleドライブの `events_latest.json` を Make が置く。AIがまとめた一覧で、項目は organization / category / status / title / date / date_display / venue / result_summary / source_url）。`lib/events-import.mjs` が安全側で取り込む＝①サイトにない大会の追加 ②空いている結果の追記 だけ。既にある大会名・日付・会場・結果は上書きしない。非表示（DRAFT）は戻さない。日付が「公開日・エントリー案内」などのものと、団体が不明なものは追加しない。結果はビルドのログに `events feed: …` で出る。Make「VIBES 大会情報（Googleドライブ events_latest.json → サイトに自動取り込み）」（8626106）が30分ごとにドライブのファイル（VIBES_大会情報/events_latest.json）を見て、更新があれば `ev-<更新日時>.json` として置く
- `data/3c-lab.json` VIBES 3C LAB（`/pages/3c-lab`）＝動画なしの「取り口」テキスト辞典（2026-11-16 に仕様変更。AIによる動画の紐付けは誤判定があるため廃止。動画・YouTube のコードは入れない）。`patterns` 8分類（2026-11-16 に15→8へ整理。名前は運営者指定：表回し・裏回し・切り返し・ダブルレール・箱球・空クッション・てけてけ・押し抜き）：pattern_jp / pattern_en / pattern_kr / summary（ひとこと定義）/ cushion_route（軌道）/ key_point（狙い方）。文面は運営者指定のまま。空の項目は出さない。軌道図は取り下げ中（2026-11-16 運営者「取り口と図が全く違う」。build.mjs の `LAB_FIG=false`。正しい形を運営者に確認してから戻す）。描画コードは `lib/lab-svg.mjs`（id ごとの座標から SVG をビルド時に描く模式図。色は運営者指定：盤面 #111827・枠 #334155・手球 白・第1的球 #FACC15・第2的球 #F43F5E・軌道 #38BDF8）
  - タブは3つ（2026-11-18）：取り口辞典／基礎理論（`#theory`）／システム計算（`#system`）。すべて `static/apps/3c-lab.html` に直書きで、図はページ内のスクリプトが描く（外部の画像・文章は使わない。参考にした Dr. Carom は本文が画像で読めなかったため、目次の並びだけを参考にした）
  - 「システム計算」：ファイブ＆ハーフ（運営者指定の計算式・数値マップ・補正）と、プラスシステム（2026-11-18 追加。運営者の指示書どおり＝手球：右短クッション 0〜40／1クッション目：上の長クッション 10〜80／3クッション目：下の長クッション 0〜80、計算式は 手球＋1クッション目＝3クッション目。指示書が途中で切れていたため、数字の向き（どの角を0にするか）と補正ポイントはこちらで補った＝運営者の確認待ち。軌道の線は描かない）。3つ目は未実装
  - 「基礎理論」：初球のならべ方／厚み（重なり→的球の向き asin(1−厚み)）／撞点と回転／クッションの特性／空クッション（鏡。狙い点＝間隔×手球の距離÷(手球＋的球の距離)）／ストロークとルーティン。出る角度の図は傾向を示すイメージで、実測値ではない
- `data/lab-codes.json` DIGITAL LAB の利用コード（お店ごと・12けた）。コードそのものは置かず PBKDF2 の値だけ。発行は `node scripts/lab-code.mjs "店名"`（出たコードは公式LINEでお店へ。リポジトリに書かない）、停止は `on:false`。入力画面は `static/js/lab-gate.js`（ビルド時に count-home / count-3c / count-pocket / count-tour の head へ差し込み。導入前から使っていた端末は初回に自動で利用可。モニター店の WIND はコード不要＝`/pages/count/?monitor=wind` で開いた端末は以後ずっと利用可）
- DIGITAL LAB の方針（2026-11-16）：提供開始は2026-12-01。お店の利用管理は「利用コード」だけで行う。`vibesdigilabo.com`（worker.mjs の LABO ログイン方式・`static/labo/`）は扱わない＝使わない（コードは残してあるが、案内も設定もしない）。毎月の費用と利用の約束ごとは未決定
- 旧キャロム版カウント（VIBES LIVE TABLE）は閉鎖（2026-11-17 運営者決定）：`/pages/bowlard/?mode=carom` と `/pages/live-table` は `/pages/digital-lab` へ移動させる（`?mode=pocket` はボーラードへ）。スリークッションのカウントは DIGITAL LAB（利用コード）だけ。古いプログラムは残してある
- イベント用スコアボード（隠しページ。メニューにもサイトマップにも出さない）：`/event-score-pad?match=<試合ID>`（タブレット横向きの入力。`static/apps/event-score-pad.html`）と `/event-score-obs?match=<試合ID>`（OBSのブラウザソース用・背景透過。`static/apps/event-score-obs.html`。2026-11-17 から画面上の横長の帯が標準＝大会名・回戦・イニング・両選手・協賛を1列。`&layout=card` で以前の小さいカード。`&scale=1.2` `&pos=bl`（帯を下へ。カードは tr|bl|br） `&bg=1` `&sponsor=0`）。同期は既存のスコアボード中継（worker.mjs の `/api/count/<6けた>`。試合IDを6けたの番号に変換して部屋にする。入力側＝display、配信側＝remote）。Firebase などの外部DBは使っていない。2026-12-05 の女王杯の配信で使う予定
- `data/config.json` フォーム送信先（`contactHook`, `orderHook`）。空なら mailto にフォールバック。`youtubeLive` に YouTube チャンネルのURLを入れると `/live`（VIBES LIVE の入口）のボタンが有効になる（空なら「準備中」）。`homeWinners` が true のときだけ、トップに「◯月の優勝者」を出す（2026-11-16 から一時的に閉鎖中＝false）

## URL
旧Shopifyと同じURLを維持（/pages/…, /blogs/…/…, /products/vibes-carbon-shaft）。大会 `/pages/tournament/<handle>`、店 `/pages/shop/<handle>`、選手 `/pages/player/<名前>`。
多言語は `/en /ko /zh /vi` に同じページ＋`static/i18n` の辞書翻訳。

## Rules
- 公式戦とハウストーナメントは常に分けて表示する
- 連盟の月例会（タイトルに「月例会」）は「公式戦」と表記しない。バッジは「月例会」。記事タイトルの先頭の【公式戦】はビルド時に外す（月例会も載るため）
- 色：夜色 #171A22／ライム #C0FC09／チョーク #F3F4EF。オレンジは使わない。ライムは文字色に使わない
- ラシャ色＝種目：ポケット #5A616C／キャロム #1E5AA8／ヘイボール #0E6B47
- コンテンツ更新時は NEWS に日付入りで告知（【更新情報】YYYY年M月D日｜…）
- `legacy/` は旧テーマの移植元（ヘイボール・JPA・アプリ・Wear・シャフト・キッズ・デジタルカウント）
