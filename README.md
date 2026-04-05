# auto-prog

諸々の自動化プログラム置き場

Python を中心に、Google Workspace（Drive、Sheets、Calendar）の自動化、Web スクレイピング、ブラウザ自動化（Playwright）を置いています。

## プロジェクト構成

```
auto-prog/
├── google_auto/              # Google Workspace自動化
│   ├── google_api_client.py  # Google API共通クライアント（Python用）
│   ├── config.json           # 設定ファイル（Python用）
│   ├── gas/                  # GAS版スクリプト
│   │   ├── Code.gs
│   │   ├── CopyDocumentReport.gs
│   │   ├── CopySpreadsheetReport.gs
│   │   ├── CopyMokuhyoukanriReport.gs
│   │   ├── Setup.gs
│   │   └── README.md
│   ├── google_document/      # Googleドキュメント関連（Python用）
│   │   ├── copy_document_report.py
│   │   └── refactored_copy_document_report.py
│   └── google_spreadsheet/   # Googleスプレッドシート関連（Python用）
│       ├── copy_spreadsheet_report.py
│       ├── copy_spreadsheet_mokuhyoukanri_report.py
│       ├── refactored_copy_spreadsheet_report.py
│       └── refactored_copy_spreadsheet_mokuhyoukanri_report.py
├── gunpla/                   # Webスクレイピング
│   └── notif-mg-gunpla-info.py
├── playwright/               # ブラウザ自動化（Node / Playwright）
│   ├── playwright-test/      # 単体スクリプト（例: site-login.js）
│   ├── tests/                # Playwright テスト（@playwright/test）
│   ├── package.json
│   └── playwright.config.ts
├── test/                     # テスト・練習用
├── pyproject.toml            # プロジェクト設定
└── uv.lock                   # 依存関係ロックファイル
```

## 機能

### Google Workspace自動化

#### 1. Googleドキュメントの月次コピー
- `google_auto/google_document/refactored_copy_document_report.py`
- 指定フォルダ内の最新Googleドキュメントを月次でコピー
- ファイル名: `状況報告書_{月}月`

#### 2. 日次レポートの自動生成
- `google_auto/google_spreadsheet/refactored_copy_spreadsheet_report.py`
- スプレッドシートの最新シートをコピー
- シート名を「① 月日」形式で自動採番
- 指定セルをクリアし、日付を自動更新

#### 3. 目標管理レポートの自動生成
- `google_auto/google_spreadsheet/refactored_copy_spreadsheet_mokuhyoukanri_report.py`
- Googleカレンダーから「コーチ面談」イベントを取得
- 最新シートをコピーし、シート名を日付（YYYYMMDD）に設定
- 新シートのタブを赤色、旧シートを白色に変更
- 指定セルをクリアし、日付を自動更新

### Webスクレイピング

#### ガンプラ情報取得
- `gunpla/notif-mg-gunpla-info.py`
- バンダイホビーサイト（MGガンプラ）の新着情報を取得・表示

### ブラウザ自動化（Bold ポータル勤怠）

- `playwright/playwright-test/site-login.js`
- Bold ポータルにメール＋パスワードでログインし、勤怠ビューへ遷移して操作します。
- **更新対象の日程**: 実行日を含む直近 7 日間（実行日より前 6 日＋実行日）。未来の日付は対象外です。
- **テレワーク等のチェック**: 上記の範囲で、月曜・水曜の行のみ「定時」の前にオンにします。
- **交通費テンプレート（申請→保存）**: 火曜・木曜・金曜の行のみ「定時」の前に実行します。
- 対象の全日について「定時」→「更新」を続けて実行します。
- ログイン後の時刻入力などは行いません。必要なら `HEADED=1` でブラウザ表示を確認してください。

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

### Googleドキュメントの月次コピー

```bash
cd google_auto/google_document
uv run python refactored_copy_document_report.py
```

### 日次レポートの自動生成

```bash
cd google_auto/google_spreadsheet
uv run python refactored_copy_spreadsheet_report.py
```

### 目標管理レポートの自動生成

```bash
cd google_auto/google_spreadsheet
uv run python refactored_copy_spreadsheet_mokuhyoukanri_report.py
```

### ガンプラ情報取得

```bash
cd gunpla
uv run python notif-mg-gunpla-info.py
```

### Bold ポータル勤怠（site-login）

リポジトリルートから:

```bash
cd playwright
export LOGIN_URL='https://（ログインURL）'
export LOGIN_EMAIL='you@example.com'
export LOGIN_PASSWORD='secret'
# ブラウザを表示する場合（省略時はヘッドレス）
export HEADED=1
node playwright-test/site-login.js
```

`.env` を使う例（`playwright/playwright-test/.env` に `LOGIN_URL` 等を記載。リポジトリには含めないでください）:

```bash
cd playwright
set -a && source playwright-test/.env && set +a && node playwright-test/site-login.js
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

2. **Actions** タブでワークフロー **「Bold portal site-login」** を選び、**Run workflow** で手動実行します。
3. 定期実行はワークフロー内の `schedule` / `cron` で設定します。`timezone` を指定するとそのタイムゾーンで解釈されます（未指定時は UTC）。

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

- 旧版スクリプト（`copy_*.py`）とリファクタ版（`refactored_*.py`）が併存しています
- 新規使用時はリファクタ版（`refactored_*.py`）の使用を推奨します
- リファクタ版は設定ファイルベースで、ロギングとエラーハンドリングが改善されています