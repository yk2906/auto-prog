# auto-prog

諸々の自動化プログラム置き場

Python を中心に、Google Workspace（Drive、Sheets、Calendar）の自動化、Web スクレイピング、ブラウザ自動化（Playwright）を置いています。

## プロジェクト構成

```
auto-prog/
├── google_auto/              # Google Workspace自動化
│   ├── google_api_client.py  # Google API共通クライアント（Python用）
│   ├── config.json           # 設定ファイル（Python用）
│   └── gas/                  # GAS版スクリプト（ドキュメント/スプレッドシートのコピー系は現在GAS版のみ）
│       ├── Code.gs
│       ├── ConvertDocsToWord.gs
│       ├── ConvertSheetsToExcel.gs
│       ├── Setup.gs
│       ├── copy/             # ドキュメント/スプレッドシートのコピー系スクリプト
│       ├── objective_sync/   # 目標管理同期スクリプト
│       ├── sync/             # ObsidianとスプレッドシートのSync
│       └── README.md
├── gunpla/                   # Webスクレイピング
│   └── notif-mg-gunpla-info.py
├── mail/                     # メール送信補助（WSL2 + Thunderbird）
│   ├── submit_monthly_report_mail.py
│   └── submit_monthly_coachmtg_mail.py
├── playwright/                # ブラウザ自動化（Node / Playwright）
│   ├── site-login/            # Bold ポータル勤怠ログイン（site-login.js）
│   ├── test-youtube/          # 動作確認用サンプル（test-youtube.js）
│   ├── tests/                 # Playwright テスト（@playwright/test）
│   ├── package.json
│   └── playwright.config.ts
├── pyproject.toml            # プロジェクト設定
└── uv.lock                   # 依存関係ロックファイル
```

## 機能

### Google Workspace自動化

Googleドキュメント／スプレッドシートのコピー系機能は、現在は Python 版を廃止し **GAS版のみ** で提供しています。詳細は [GAS版の使用方法](#gas版の使用方法) を参照してください。

#### 1. Googleドキュメントの月次コピー
- `google_auto/gas/copy/CopyDocumentReport.gs`
- 指定フォルダ内の最新Googleドキュメントを月次でコピー
- ファイル名: `状況報告書_{月}月`

#### 2. 日次レポートの自動生成
- `google_auto/gas/copy/CopySpreadsheetReport.gs`
- スプレッドシートの最新シートをコピー
- シート名を「① 月日」形式で自動採番
- 指定セルをクリアし、日付を自動更新

#### 3. 目標管理レポートの自動生成
- `google_auto/gas/copy/CopyMokuhyoukanriReport.gs`
- Googleカレンダーから「コーチ面談」イベントを取得
- 最新シートをコピーし、シート名を日付（YYYYMMDD）に設定
- 新シートのタブを赤色、旧シートを白色に変更
- 指定セルをクリアし、日付を自動更新
- GAS自体のトリガー（`Setup.gs` の `setupTriggers()`）に加えて、`.github/workflows/copy_spreadsheet_mokuhyoukanri_report.yaml` からも `clasp run copyMokuhyoukanriReport` で手動・定期実行できます

### メール送信補助

#### 月次レポートメール
- `mail/submit_monthly_report_mail.py`
- Google Drive 上の Udemy 受講レポート・自主勉強会レポートを添付し、Thunderbird で作成画面を開く
- WSL2 環境で動作（`wslpath` で Windows パスに変換）

#### コーチ面談資料メール
- `mail/submit_monthly_coachmtg_mail.py`
- 状況報告書・目標管理進捗報告シートを添付し、Thunderbird で作成画面を開く
- WSL2 環境で動作（`wslpath` で Windows パスに変換）

### Webスクレイピング

#### ガンプラ情報取得
- `gunpla/notif-mg-gunpla-info.py`
- バンダイホビーサイト（MGガンプラ）の新着情報を取得・表示

### ブラウザ自動化（Bold ポータル勤怠）

- `playwright/site-login/site-login.js`
- Bold ポータルにメール＋パスワードでログインし、勤怠ビューへ遷移して操作します。
- **更新対象の日程**: 実行日を含む直近 7 日間（実行日より前 6 日＋実行日）。未来の日付は対象外です。
- **テレワーク等のチェック**: 上記の範囲で、月曜・水曜の行のみ「定時」の前にオンにします。
- **交通費テンプレート（申請→保存）**: 火曜・木曜・金曜の行のみ「定時」の前に実行します。
- 対象の全日について「定時」→「更新」を続けて実行します。
- **CSVによる始業・終業時刻の指定（任意）**: `playwright/site-login/timesheet.csv`（「日付,始業時刻,終業時刻」形式、日付は年なし M/D、例 `7/1,09:00,18:15`）を用意し、環境変数 `TIMESHEET_CSV_PATH` にそのパスを渡すと、「定時」押下後にその日の時刻欄をCSVの値で上書きしてから「更新」します。始業・終業が両方空欄の行はその日の処理自体をスキップします。CSVを渡さない場合は従来通り「定時」の既定値のまま処理します。`TIMESHEET_CSV_PATH` の代わりに生CSV文字列を環境変数 `TIMESHEET_CSV` で渡すこともできます（`TIMESHEET_CSV_PATH` が優先）。
- **月末確定モード（`RUN_MODE=month_end`）**: 勤怠は月末に確定するため、週次実行とは別に、対象月（`SCHEDULE_YEAR`/`SCHEDULE_MONTH`、未指定時は実行日の年月）の全日についてCSVの時刻で上書きするモードです。既に週次実行で「定時」登録済みの日も含めて対象月全日を上書き対象にし、テレワークチェック・交通費申請フローは行いません。CSVが未設定の場合はエラーになります。GitHub Actionsでは `playwright/site-login/timesheet.csv` をリポジトリにコミットして使い、毎月28〜31日 18:45 JSTに自動実行されます（実行日の翌日が1日＝実際の月末の場合のみ処理）。**月が変わったら `timesheet.csv` をその月の内容で上書きしてコミット・pushしてください。**
- 必要なら `HEADED=1` でブラウザ表示を確認してください。

## セットアップ

### 前提条件

- Python 3.10以上
- [uv](https://github.com/astral-sh/uv) (インストール方法: `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Playwright スクリプト利用時: [Node.js](https://nodejs.org/)（LTS 推奨）

### インストール

```bash
# 依存関係のインストール
uv sync
```

#### Playwright（`playwright/`）

```bash
cd playwright
npm install
npx playwright install chromium
```

### 設定

1. Google API認証情報の準備
   - サービスアカウントのJSONキーファイルを取得
   - `google_auto/credentials.json` として配置

2. 設定ファイルの編集
   - `google_auto/config.json` を編集
   - フォルダID、カレンダーID、セル位置などを設定

## 使用方法

Googleドキュメント／スプレッドシートのコピー系（月次コピー・日次レポート・目標管理レポート）はGAS版のみです。[GAS版の使用方法](#gas版の使用方法) を参照してください。

### ガンプラ情報取得

```bash
cd gunpla
uv run python notif-mg-gunpla-info.py
```

### メール送信補助（mail/）

WSL2 上で実行します。Thunderbird がインストールされている必要があります。

```bash
# 月次レポートメール
uv run python mail/submit_monthly_report_mail.py

# コーチ面談資料メール
uv run python mail/submit_monthly_coachmtg_mail.py
```

添付ファイルのパス（`wsl_file_paths`）は各スクリプト先頭で直接編集してください。

### Bold ポータル勤怠（site-login）

リポジトリルートから:

```bash
cd playwright
export LOGIN_URL='https://（ログインURL）'
export LOGIN_EMAIL='you@example.com'
export LOGIN_PASSWORD='secret'
# ブラウザを表示する場合（省略時はヘッドレス）
export HEADED=1
node site-login/site-login.js
```

`.env` を使う例（`playwright/site-login/.env` に `LOGIN_URL` 等を記載。リポジトリには含めないでください）:

```bash
cd playwright
set -a && source site-login/.env && set +a && node site-login/site-login.js
```

**必須の環境変数**: `LOGIN_URL`, `LOGIN_EMAIL`, `LOGIN_PASSWORD`

**任意の環境変数**（セレクタ・ボタン名・待機時間など）: `site-login.js` 先頭のコメントに一覧があります。一覧にない名前は README に書かないでください。

#### GitHub Actions で実行

ワークフロー: [`.github/workflows/bold-portal-site-login.yaml`](.github/workflows/bold-portal-site-login.yaml)

1. リポジトリの **Settings → Secrets and variables → Actions** で次の **Repository secrets** を登録します。

   | Name | 説明 |
   |------|------|
   | `BOLD_LOGIN_URL` | ログインページの URL（`LOGIN_URL` と同等） |
   | `BOLD_LOGIN_EMAIL` | メールアドレス |
   | `BOLD_LOGIN_PASSWORD` | パスワード |

   月末確定モードの時刻データは Secret ではなく `playwright/site-login/timesheet.csv`（リポジトリにコミット）を使います。

2. **Actions** タブでワークフロー **「Bold portal site-login」** を選び、**Run workflow** で手動実行します（`run_mode` を `weekly` / `month_end` から選択可）。
3. 定期実行はワークフロー内の `schedule` / `cron` で設定されています。毎週金曜 23:30 JST に週次実行、毎月28〜31日 18:45 JST に月末確定実行（実行日の翌日が1日の場合のみ実処理）が走ります。`timezone` を指定するとそのタイムゾーンで解釈されます（未指定時は UTC）。

CI 上ではヘッドレス実行です。追加の環境変数が必要な場合は、同じワークフローの `Run site-login.js` ステップの `env:` に追記してください。

## GAS版の使用方法

GAS版は認証不要で、定期実行の設定も簡単です。詳細は `google_auto/gas/README.md` を参照してください。

### セットアップ

1. GASプロジェクトを作成
   ```bash
   cd google_auto/gas
   clasp create --type standalone --title "auto-prog-gas"
   ```

2. コードをプッシュ
   ```bash
   clasp push
   ```

3. 設定を反映
   - GASエディタで`Setup.gs`の`setupConfig()`関数を実行
   - `DOC_SOURCE_FOLDER_ID`を実際のフォルダIDに変更

4. 動作確認
   - GASエディタで各関数を手動実行して確認

5. トリガー設定（任意）
   - GASエディタで`Setup.gs`の`setupTriggers()`関数を実行

### GitHub Actions から関数を実行する（`clasp run`）

`.github/workflows/copy_spreadsheet_mokuhyoukanri_report.yaml` は `clasp run copyMokuhyoukanriReport` でGAS側の関数を直接呼び出します。利用には以下が必要です。

- 対象スクリプトプロジェクトで **Apps Script API** を有効化していること（[script.google.com/home/usersettings](https://script.google.com/home/usersettings) で有効化）
- リポジトリの **Repository secrets** に `CLASPRC_JSON`（`clasp login` 後の `~/.clasprc.json` の内容）・`GAS_SCRIPT_ID` を登録済みであること（`deploy-gas.yaml` と共通）

## 依存関係

主な依存パッケージ:

- `google-api-python-client`: Google API操作
- `gspread`: Google Sheets操作
- `oauth2client`: OAuth認証
- `beautifulsoup4`: HTML解析
- `requests`: HTTPリクエスト

詳細は `pyproject.toml` を参照してください。

Playwright の npm 依存は `playwright/package.json` を参照してください。

## 注意事項

- `mail/` スクリプトは WSL2 + Thunderbird 環境専用です。添付ファイルパスはスクリプト内に直接記載されているため、実行前に確認・更新してください。
- `google_auto/credentials.json` はリポジトリに含めないでください。