# GAS版自動化スクリプト

このディレクトリには、Google Workspace自動化のGAS（Google Apps Script）版が含まれています。

## ファイル構成

- `Code.gs`: 共通関数（設定取得、ファイル操作、ログ出力など）
- `CopyDocumentReport.gs`: Googleドキュメントの月次コピー
- `CopySpreadsheetReport.gs`: 日次レポートの自動生成（後述）
- `CopyMokuhyoukanriReport.gs`: 目標管理レポートの自動生成
- `Setup.gs`: 初期設定とトリガー設定
- `appsscript.json`: GAS設定ファイル
- `.clasp.json`: clasp設定ファイル（scriptIdは後で設定）

## CopySpreadsheetReport（日次レポート）の仕様

`copySpreadsheetReport()` は、設定で指定したフォルダ内の各スプレッドシートに対して以下を実行します。

1. **シートの複製**  
   一番右（最新）のシートを複製し、シート名を「① MM月DD日」形式の次の番号・日付に変更します。

2. **設定に基づく処理**  
   - 設定で指定したセルをクリア（`cells_to_clear`）
   - 設定で指定した日付セルを更新（`date_cell`）

3. **新規作成したシートの E8**  
   コピーを実行した日の日付を `yyyy/mm/dd` で設定します。

4. **目次シートの更新**  
   同じスプレッドシート内に「目次」という名前のシートがある場合、範囲 C5～E10（基準行は C5～E5）を次のルールで更新します。
   - **C列（日付）**: C5 から順に確認し、最初に空いている行にコピー実施日を記載。C5～C10 がすべて埋まっている場合は追記しません。
   - **D列・E列**: 日付を入れた行が 6 行目以降の場合のみ、その 1 行上の D・E の内容をその行にコピー（1 行分のみ）。

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

