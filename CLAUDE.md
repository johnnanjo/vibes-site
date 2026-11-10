# VIBES BILLIARDS（vibesbilliards.com）

日本のビリヤード大会・試合結果・ビリヤード場のポータル。Shopifyから移転した静的サイト。

## Build
- `node build.mjs` → `dist/`（依存パッケージなし。Node 18+）
- Cloudflare Pages：Build command `node build.mjs`、Output directory `dist`
- 確認：`cd dist && python3 -m http.server`

## Data（ここを書き換えるとサイトが更新される）
- `data/tournaments.json` 大会（公式戦／ハウス）。結果は `results` / `winner`。選手ページは `winner` から自動生成。
- `data/shops.json` ビリヤード場
- `data/articles.json` NEWS・試合結果・ハウストーナメント・試合速報の記事（`blog.handle` で振り分け）
- `data/pages.json` 規約などの固定ページ本文、`data/products.json` 商品
- `data/inbox/{articles,tournaments,shops}/*.json` 自動化（Make）が1件1ファイルで書き込む追加分。同じhandleは上書き
- `data/config.json` フォーム送信先（`contactHook`, `orderHook`）。空なら mailto にフォールバック

## URL
旧Shopifyと同じURLを維持（/pages/…, /blogs/…/…, /products/vibes-carbon-shaft）。大会 `/pages/tournament/<handle>`、店 `/pages/shop/<handle>`、選手 `/pages/player/<名前>`。
多言語は `/en /ko /zh /vi` に同じページ＋`static/i18n` の辞書翻訳。

## Rules
- 公式戦とハウストーナメントは常に分けて表示する
- 色：夜色 #171A22／ライム #C0FC09／チョーク #F3F4EF。オレンジは使わない。ライムは文字色に使わない
- ラシャ色＝種目：ポケット #5A616C／キャロム #1E5AA8／ヘイボール #0E6B47
- コンテンツ更新時は NEWS に日付入りで告知（【更新情報】YYYY年M月D日｜…）
- `legacy/` は旧テーマの移植元（ヘイボール・JPA・アプリ・Wear・シャフト・キッズ・デジタルカウント）
