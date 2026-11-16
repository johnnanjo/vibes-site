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
- `data/3c-lab.json` VIBES 3C LAB（`/pages/3c-lab`）の取り口15分類と動画（`shots`：video_id・start_sec・end_sec・pattern_jp ほか。足すと取り口ごとの動画一覧に出る。`is_vibes_original:true` は「VIBES LIVE 公式映像」バッジつきで先頭に並ぶ。取り口の説明文は運営者指定の文面）
  - 動画の追加：解析JSON（ショットの配列）を `node scripts/lab-shots.mjs 追加分.json` で足す（15分類への寄せ・秒数の検品・同じ動画で開始が前後3秒以内は重複として除外・`SHOT-0001`〜を振り直し）。運営者がJSONだけを貼ったら、質問せずに反映して「追加件数と合計」だけ報告する
- `data/lab-codes.json` DIGITAL LAB の利用コード（お店ごと・12けた）。コードそのものは置かず PBKDF2 の値だけ。発行は `node scripts/lab-code.mjs "店名"`（出たコードは公式LINEでお店へ。リポジトリに書かない）、停止は `on:false`。入力画面は `static/js/lab-gate.js`（ビルド時に count-home / count-3c / count-pocket / count-tour の head へ差し込み。導入前から使っていた端末は初回に自動で利用可。モニター店の WIND はコード不要＝`/pages/count/?monitor=wind` で開いた端末は以後ずっと利用可）
- DIGITAL LAB の方針（2026-11-16）：提供開始は2026-12-01。お店の利用管理は「利用コード」だけで行う。`vibesdigilabo.com`（worker.mjs の LABO ログイン方式・`static/labo/`）は扱わない＝使わない（コードは残してあるが、案内も設定もしない）。毎月の費用と利用の約束ごとは未決定
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
