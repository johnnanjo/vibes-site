# HANDOFF — 引きつぎ帳

AI どうし・AI と運営者のあいだの引きつぎ用です。**作業のはじめに読み、終わりに書き足します。** 決まりごとは `CLAUDE.md`、AI 共通の進め方は `AGENTS.md`。
個人情報・鍵・パスコードは書きません。

## 作業中（同じ所を2人で触らないための札）
| だれが | 何を | 触るファイル | いつから |
| --- | --- | --- | --- |
| （なし） | | | |

## いま止まっている課題
### スコア画面のまん中に、別のパソコンの映像（GoPro）が出ない（2026-11-19 夜・WIND）
- 構成：ノートPC（GoPro＋OBS の仮想カメラ）→ `/pages/count-cam/?r=<番号>&bar=0` → お店のPCの `/pages/count-3c`（各種設定「カメラ映像」＝別のパソコンのカメラ）。
- 症状：合図（offer/answer）は届く。送る側は「別モニター：0台」のまま、受ける側は黒い枠。＝ICE がつながっていない。
- こちらのテスト（1台のPCで2つのブラウザ）では届く。
- 見立て：2台が別のネットワーク／受ける側の候補が mDNS 名になり Windows のファイアウォールで届かない／ルーターの AP 隔離。STUN だけで TURN が無い。
- 未確認：2台の IPv4 アドレス、`chrome://webrtc-internals` の候補の中身。
- 案：Cloudflare の TURN を Worker 経由で足す（キーの発行と Worker の秘密の値は運営者が入れる）。運営者は ChatGPT にも原因さがしを依頼中。
- その場しのぎ：ノートPCを HDMI でお店のモニターにつなぎ、「この端末のカメラ」で OBS の映像をえらぶ。

## 実機・本番でまだ確かめていないもの
こちらの環境からは本番サイトと実機を見られません。下は、テスト環境でだけ動かしたものです。
- スコア画面のカメラ映像：この端末のカメラ／スマホ（QR）／別のパソコン（上の課題）
- ＊キーの新しい動き（止めた秒数を残す・＋で40秒から）— 実機のテンキーで
- メニューの「カメラ・配信」の画面、3列になった「各種設定」
- スタジオモニター（リプレイ・動画の保存・スマホのリモコン）
- 大会用：管理者画面の④組分け・対戦表、台の割り当て、`/event-board`、配信の帯に出る自動のリーグ表／トーナメント表、OBS と本番の中継をとおした動き
- 配信の帯 `count-overlay`（テンキーの点数を OBS に出す）
- 導入診断 `/pages/digital-lab-check` の「公式LINE に結果を送る」

## 運営者が決めること・やること
- 12/5 女王杯：試合形式の最終確定（要項は「Wイリミネーションもしくはリーグ戦」「8〜10点予定」。いまは昨年と同じ形で作成。Wイリミネーションの表は未対応）
- 12/5：②③④番台を紙のメモのままにするか、スマホ入力にするか
- 12/5：BGM、BG賞の対象、配信テストの日、YouTube のライブ有効化とチャンネルのアドレス、選手への案内
- DIGITAL LAB：インボイスの登録番号の扱い（税理士・税務署に確認中）
- DIGITAL LAB：サイトの「お返事は平日」の文を、即日対応に合わせて直すか
- DIGITAL LAB：紹介ページのメニュー画像（「トーナメント」表記の古い写真）の撮り直し
- 映像の中継サーバー（TURN）を入れるか
- 古い資料（運営マニュアル・図解ガイド・ご承諾のお願い）を、いまの形式と正式な大会名に合わせるか

## 記録（新しいものを上に）
### 2026-11-20 — AI_INBOX 自動実装
- 実装と共通チェック成功: 1件。未完了: 1件。
- 実施した共通チェック: node build.mjs / node scripts/lab-positions.mjs --check / node scripts/test-auto-ai-worker.mjs / node scripts/test-ai-worker.mjs / git diff --check。
- 実機・本番で未確認: 実機操作と本番公開は未確認です。
- 変更はPRで運営者確認後に反映。mainへの直接コミット・公開操作は行っていません。

### 2026-11-20 — GitHubへの登録とPR #1提出（ChatGPT / Codex）
- 接続済みChromeのjohnnanjoアカウントで認証を確認し、codex/auto-ai-worker-20261120 ブランチにAI_INBOX・ワークフロー・実行スクリプト・回帰テスト・共通ルールをコミット。PR #1を作成した： https://github.com/johnnanjo/vibes-site/pull/1 。mainにはマージしていない。
- 指定のAI_INBOX本文は変更せず、待機中の2件を未処理のまま登録。実装8ファイルはgit fetch後にローカルの検証済み内容とのバイト一致を確認。引きつぎ帳もこのコミットで更新する。
- GitHub Actionsの Check build / build (pull_request) 成功を確認（40cdfda時点、19秒）。ローカルの38項目と同じテストをCIに追加済み。実APIの呼出し・クレジット切替・main反映後のAuto AI Workerそのものの実行・実機動作は未確認。
- Cloudflareの Workers Builds: vibes-site / vibes-site1 は両方失敗。変更前のmain（8982d84）にも同じ2チェックの失敗があることをGitHubの状態画面で確認。詳細原因は未確認で、Cloudflareの設定は変更していない。
- 起動には運営者がGitHub SecretsへANTHROPIC_API_KEYとOPENAI_API_KEYを登録し、ActionsからのPR作成を許可する。設定を済ませてからPRをmainへマージすると登録済み2件の処理が始まる。値はチャット・コミットに書かない。

### 2026-11-20 — 指定のAI_INBOX初期タスクを登録（ChatGPT / Codex）
- AI_INBOX.md を運営者指定の本文にし、[DEV] W3C Queen Cupモード（持ち点25点・エクステンション2回）と [COPY] E-placeの15秒CM用キャッチコピー3案の2件を未処理で登録。チェックは付けていない。今回の作業は受付と自動実行の準備であり、この2件そのものは実行していない。
- main の AI_INBOX.md 更新を受けてAPI実装→独立検証→完了チェックとログ更新→専用ブランチとPR作成を行うワークフローと、前回の実行スクリプトを同じブランチに保持。空の完了済みログでも初回に表見出しが付くよう修正し、受付の件数に依存してCIが失敗しないようテストを修正。
- 指定本文の完全一致と未処理2件、回帰テスト38項目（20＋18）、ビルド10475ページ、YAMLのmain・paths条件とジョブ順序・権限、差分を確認。実API・GitHub Actionsは未実行。実際の起動はmainへの反映・Secrets設定後。書込み認証が未接続のためGitHub上のコミット・PR作成は接続後の作業。

### 2026-11-20 — AIワーカーのタスク別振分けとAPI認証（ChatGPT / Codex）
- scripts/ai-worker.js を追加し、従来の一括CLI実行をタスク単位の直接API実行に変更。Claude優先、[GPT]はOpenAI、Claudeのクレジット不足時は途中の変更を破棄して同じタスクをOpenAIで再処理。認証不良は未完了、通常の429・一時障害は同じAPIで再試行する。
- [COPY]は日本時間の docs/ai-outputs/copy-YYYYMMDD.md に完成原稿を追記。[DEV]・タグなしはリポジトリ内のコードを編集。Shopify本番など外部サービスへの接続や投稿は行わない。
- API実行・APIキーなしの検証・PR作成の3ジョブに分離。共通チェック成功後だけチェックを更新し、AI_INBOX末尾へ日時・使用AI・モデルを記録。ai-auto/update-日時-実行番号-再実行番号 の新規ブランチと日本語PRを作る。自動マージしない。
- 回帰テスト38項目成功（test-auto-ai-worker 20、test-ai-worker 18）。クレジット切替時の変更破棄、キー未登録・認証不良時の未完了保持、GPT/COPY/DEVの振分け、同日原稿の追記、o3-mini未提供時のGPT-4o再試行、APIキーなしの別チェックアウトでの検証・完了ログ、ローカルbareリポジトリへの新規ブランチpushまでを確認。APIとGitHub CLIは模擬で、実APIは呼んでいない。
- node build.mjs 成功（10475ページ）、配置カード20枚・警告0、JS構文・差分・YAML構造・mainの起動条件・3ジョブの権限とSecrets参照・Actions固定SHAを確認。CLAUDE.mdとAI_INBOX.mdに新仕様・受付例・Secretsの設定先を反映。
- Claudeのツール呼出し・エラー・現行モデル名、OpenAIのツール呼出し・Chat Completions・GPT-4o/o3-mini、GitHub SecretsとGITHUB_TOKENを公式資料で確認。旧CLIの10米ドル上限はこの直接API版には適用されない。実行25分・1タスク40応答の上限がある。
- GitHub CLIの書込み認証は未接続。ローカルブランチ codex/auto-ai-worker-20261120 に実装を保存し、反映用パッチと日本語PR原稿を用意。GitHub上のpush・PR、実際のActions実行、実APIでの生成とクレジット切替は接続・Secrets設定後に確認が必要。mainへの反映・本番公開は行っていない。

### 2026-11-20 — AI_INBOX 自動実装ワーカー（ChatGPT / Codex）
- 専用ブランチ codex/auto-ai-worker-20261120 に .github/workflows/auto-ai-worker.yml と AI_INBOX.md を追加。mainのAI_INBOX更新で起動し、Claude Codeを優先、キー未登録時はOpenAI Codex GitHub Actionを選べる。手動実行にも対応する。既存CLAUDE.mdを保持して自動実装の決まりを追記。
- 実装ジョブはリポジトリ読取り権限。書込み権限を持つ別ジョブが差分を適用し、ai-auto/task-日時-実行番号の新規ブランチと日本語PRを作る。自動マージとmainへの直接書込みはしない。APIキーはSecretsの参照だけ。
- 未処理0件はAIを呼ばない。自動PRと作業中の札を見て重複・同時編集を防ぐ。元の受付内容を保持し、独立したビルド等に成功したタスクだけチェック。未完了は理由を残してドラフトPRにする。秘密らしい値と禁止パス、差分の整合性を確認する。
- node scripts/test-auto-ai-worker.mjs は19項目成功。受付・部分完了・キー選択・重複防止・ビルド失敗時のチェック保持・キー検出・CLIへの引数・別チェックアウトからの差分適用と新規ブランチpushを確認。AIとGitHub CLIは模擬実行、push先はローカルのbareリポジトリ。APIは呼んでいない。
- node build.mjs 成功（10475ページ）、配置カード20枚・警告0、JS構文、差分、YAML構文・トリガー・ジョブ権限・Actions固定SHAを確認。実際のGitHub Actions、Claude/OpenAI API、GitHub上のpush・PR作成は認証・Secrets設定後の確認が必要。
- 運営者の初回設定: この変更のmain反映、使うAPIキーのSecrets登録、ActionsによるPR作成の許可。GITHUB_TOKENは登録不要。自動PRのCIに承認バナーが出る場合は実行を承認する。設定手順はAI_INBOX.mdに記載。
- 本環境から専用ブランチへのpushを試行したが、GitHubの書込み認証が未設定のため失敗。リモートへの反映・PR提出は未完了。ローカルの実装、反映用パッチ、日本語PR原稿を用意済み。

### 2026-11-20
- `AGENTS.md`・`HANDOFF.md`・プルリクエスト用のビルド確認（`.github/workflows/check.yml`）を追加。ChatGPT と Claude の両方で作業できるようにする準備。

### 2026-11-19
- 配信の帯：試合のあと、結果10秒→最新のリーグ表／トーナメント表を自動で表示（`&board=0` `&boardwait=`）。
- DIGITAL LAB の料金を決定・掲載（月額10,000円・税別・4台まで ほか。くわしくは `CLAUDE.md`）。FOR POCKET は延期。
- 導入診断ページを追加。店舗向けの資料「導入のご案内」を作成（リポジトリの外のドキュメント）。
- スコア画面（count-3c）：まん中のカメラ映像（設定で4つからえらぶ）、＊キーの動きの変更。
- スタジオモニター：カメラが始まらない理由を画面に出すように。
- メニュー：「カメラ・配信」にアドレスをまとめた。各種設定を3列に（保存ボタンが切れる不具合の修正）。
- 管理者画面：④組分け・対戦表（所属と持ち点のかたよりを避けるくじ、台1〜5）、表を映す `/event-board`。
