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
- `data/config.json` フォーム送信先（`contactHook`, `orderHook`）。空なら mailto にフォールバック

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
