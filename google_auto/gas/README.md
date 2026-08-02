# GAS版自動化スクリプト

このディレクトリには、Google Workspace自動化のGAS（Google Apps Script）版が含まれています。

## ファイル構成

### 日次・月次レポート（`Setup.gs` のプロパティと連携）

- `Code.gs`: 共通関数（設定取得、ファイル操作、ログ出力など）
- `copy/CopyDocumentReport.gs`: Googleドキュメントの月次コピー
- `copy/CopySpreadsheetReport.gs`: 日次レポートの自動生成（後述）
- `copy/CopyMokuhyoukanriReport.gs`: 目標管理レポートの自動生成（生成後、`SyncAbcGoalToProgress.gs` のABC目標セル同期を呼び出す）
- `copy/SyncAbcGoalToProgress.gs`: ABC目標親フォルダ配下の最新期フォルダから「{期短縮}-ABC目標」を探し、J37/J47/J57/J67/J77 の値を目標管理進捗報告シートの新規タブ（J22/J31/J40/J50/J60）へ同期。ABC目標がxlsx形式の場合は一時的にGoogleスプレッドシートへ変換コピーして読み取り、読み取り後に削除する
- `Setup.gs`: 初期設定とトリガー設定

### その他のスクリプト（各ファイル内の定数・設定を編集して利用）

- `ConvertDocsToWord.gs` / `ConvertSheetsToExcel.gs`: 指定フォルダ内の Google ドキュメント／スプレッドシートを docx／xlsx として別フォルダへ保存（`convertDocsToWord()` / `convertSheetsToExcel()`。ソース／出力フォルダ ID はファイル内。変換処理本体は `Code.gs` の `convertFilesInFolders()` を共通利用）
- `sync/SyncCommon.gs`: Obsidian版・Notion版どちらのレポート同期スクリプトからも使う共通処理（Markdown風の行配列を見出し単位で抽出する `buildSyncResultsFromLines()`、スプレッドシート／当月シートの検索、セルへの書き込みロジックなど）
- `sync/SyncObsidianSS_report2.gs`: Markdown と同名のスプレッドシートの当月シートへ見出し単位で同期（`syncMarkdownToCellReport2()`）
- `sync/SyncObsidianSS_report3.gs`: 同上（項番3用、`syncMarkdownToCellReport3()`）
- `sync/SyncObsidianSS_report4.gs`: 同上（自主勉強会レポート用、`syncMarkdownToCellReport4()`）
- `sync/NotionCommon.gs`: Notion API 固有の処理（トークン取得、親ページ配下でのタイトル検索、ブロック・データベース行の取得とMarkdown風行への変換、デバッグ用のツリー表示）
- `sync/SyncNotionSS_report2.gs` / `_report3.gs` / `_report4.gs`: 上記Obsidian版と同じセルマッピングで、同期元をNotionページに差し替えた版（`syncNotionToCellReport2/3/4()`）。Obsidian版と共存し、どちらも独立して実行可能
- `objective_sync/objective_sync.gs`: 2 フォルダ間の同名スプレッドシートで、指定シート・セルの値をコピー（`syncCellBetweenFolders()`）

### 設定ファイル

- `appsscript.json`: GAS 設定ファイル（ローカル開発・手動 `clasp push` 用）
- `.clasp.json`: clasp 設定ファイル（`scriptId` は `clasp create` 後に設定。Git には含めない）

## CopySpreadsheetReport（日次レポート）の仕様

`copySpreadsheetReport()` は、設定で指定したフォルダ内の各スプレッドシートに対して以下を実行します。

1. **シートの複製**  
   一番右（最新）のシートを複製し、シート名を「① MM月DD日」形式の次の番号・日付に変更します。

2. **設定に基づく処理**  
   - セルをクリア: 適用順は（1）ファイル名が `DAILY_CELLS_TO_CLEAR_BY_NAME` と**完全一致**したセル一覧 →（2）ファイル名が `DAILY_CELLS_TO_CLEAR_BY_NAME_CONTAINS` のキーを**含む**場合のセル一覧（大文字小文字区別、先にマッチしたキーを採用）→（3）`cells_to_clear`（共通）。
   - 設定で指定した日付セルを更新（`date_cell`）

3. **新規作成したシートの E8**  
   コピーを実行した日の日付を `yyyy/mm/dd` で設定します。

4. **目次シートの更新**  
   同じスプレッドシート内に「目次」という名前のシートがある場合、範囲 C5～E10（基準行は C5～E5）を次のルールで更新します。
   - **C列（日付）**: C5 から順に確認し、最初に空いている行にコピー実施日を記載。C5～C10 がすべて埋まっている場合は追記しません。
   - **D列・E列**: 日付を入れた行が 6 行目以降の場合のみ、その 1 行上の D・E の内容をその行にコピー（1 行分のみ）。

## Notion同期（`syncNotionToCellReport2/3/4`）のセットアップ

Obsidian版と同じセルマッピングで、同期元をNotionページに切り替えた版です。Obsidian版のファイルはそのまま維持されており、どちらも独立して実行できます。

1. **Notion Integrationを作成**
   https://www.notion.so/my-integrations で Internal Integration を作成し、シークレット（トークン）を発行します。
2. **親ページをIntegrationに共有**
   同期対象のページをまとめている親ページ（例: レポート一覧ページ）を開き、「Connect to」から作成したIntegrationを接続します。Notionは親ページへの共有を配下ページに自動継承するため、個々のレポートページを毎回共有し直す必要はありません。
3. **各 `.gs` に親ページのURLを設定**
   `sync/SyncNotionSS_report2/3/4.gs` 内の `notionRootPageUrl` に、手順2で共有した親ページを開いたときのURL（例: `https://app.notion.com/p/7-xxxxxxxx...`）を設定します。同期対象のページ検索はこの親ページ配下（子孫）に限定されます。
4. **スクリプトプロパティにトークンを設定**
   GASエディタの「プロジェクトの設定」→「スクリプトプロパティ」で `NOTION_API_TOKEN` にシークレットを設定します（コードには書き込まないでください）。
5. **Notionページの見出し・リスト構成をObsidian版と合わせる**
   見出しは `### 内容` のようなH3、本文は箇条書き（`-`/`*`/数字リスト）で記載し、ネストしたリストで階層を表現します。見出し名は各 `.gs` 内の `syncMap` のキーと完全一致させてください。ページタイトルはスプレッドシート名（`targetName`）と完全一致させてください。
6. **動作確認**
   `syncNotionToCellReport2()` / `syncNotionToCellReport3()` / `syncNotionToCellReport4()` を手動実行して同期結果を確認します。

## セットアップ手順

### 1. GASプロジェクトを作成

```bash
cd /home/yuto_kohama/work/auto-prog/google_auto/gas
clasp create --type standalone --title "auto-prog-gas"
```

これで`.clasp.json`に`scriptId`が自動的に設定されます。

### 2. コードをプッシュ

```bash
clasp push
```

### 3. 設定を反映

GASエディタで以下の手順を実行：

1. `Setup.gs`の`setupConfig()`関数を選択して実行
   - これでスクリプトプロパティに設定が保存されます
   - `DOC_SOURCE_FOLDER_ID`は実際のフォルダIDに変更してください

2. 動作確認のため、各関数を手動実行：
   - `copyDocumentReport()`
   - `copySpreadsheetReport()`
   - `copyMokuhyoukanriReport()`
   - （利用する場合）`convertSheetsToExcel()`、`syncMarkdownToCellReport2` / `3` / `4`、`syncNotionToCellReport2` / `3` / `4`、`syncCellBetweenFolders()` — いずれも対応する `.gs` 内のフォルダ ID・ファイル名・セル指定を先に合わせてください（Notion版は上記「Notion同期のセットアップ」も参照）

### 4. トリガー設定（任意）

定期実行を設定する場合：

1. GASエディタで`Setup.gs`の`setupTriggers()`関数を実行
2. または、GASエディタの「トリガー」タブから手動で設定

## 設定の変更

設定を変更する場合は、`Setup.gs`の`setupConfig()`関数を編集して再実行するか、GASエディタの「プロジェクトの設定」→「スクリプト プロパティ」から直接編集できます。

## ログの確認

実行ログはGASエディタの「実行」タブで確認できます。

## CI/CD（GitHub Actions）

`google_auto/gas/` 配下のファイルを変更して GitHub に push すると、自動で `clasp push` が実行され、GAS プロジェクトに反映されます。

ワークフロー実行時は、リポジトリの `appsscript.json` の有無にかかわらず、デプロイ直前に既定の `appsscript.json`（タイムゾーン Asia/Tokyo、runtime V8 等）を生成してから `clasp push --force` します。ローカルで追加した `appsscript.json` の項目を CI でも使う場合は、`.github/workflows/deploy-gas.yaml` 側の生成内容を合わせる必要があります。

### 必要な GitHub Secrets

リポジトリの **Settings → Secrets and variables → Actions** で以下を登録してください。

| Secret 名 | 内容 |
|-----------|------|
| `CLASPRC_JSON` | ローカルで `clasp login` 実行後、`~/.clasprc.json` の内容をそのまま貼り付け |
| `GAS_SCRIPT_ID` | `.clasp.json` の `scriptId` の値（GAS プロジェクト ID） |

### CLASPRC_JSON の取得方法

```bash
clasp login
cat ~/.clasprc.json
```

表示された JSON 全体をコピーして Secret に登録します。トークンには有効期限があるため、CI で認証エラーになった場合は再度 `clasp login` して Secret を更新してください。

### トリガー

- **push**: `main` または `master` ブランチへ push し、かつ `google_auto/gas/**` に変更があったとき
- **手動**: Actions タブから「Deploy GAS (clasp push)」の「Run workflow」で実行可能

### 「Insufficient Permission」が出る場合

1. **CLASPRC_JSON のアカウントと GAS の所有者を一致させる**  
   `clasp login` した Google アカウントが、`GAS_SCRIPT_ID` の GAS プロジェクトの**編集者**（または所有者）になっているか確認してください。別アカウントで作ったプロジェクトには push できません。

2. **CLASPRC_JSON を再取得する**  
   `~/.clasprc.json` を開き、**改行を含む JSON 全体**をコピーして Secret に登録し直してください。1 行にまとまっていても構いませんが、`{` から `}` まで欠けずに含める必要があります。

3. **GAS_SCRIPT_ID の確認**  
   ローカルの `google_auto/gas/.clasp.json` の `scriptId` と、GitHub の `GAS_SCRIPT_ID` Secret が同じ値か確認してください。

## 注意事項

- `.clasp.json`は`.gitignore`に追加されているため、Gitにはコミットされません
- 各環境で`clasp create`を実行して独自のGASプロジェクトを作成してください
- スクリプトプロパティは各GASプロジェクトごとに独立しています

