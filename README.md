# auto-prog

諸々の自動化プログラム置き場

Google Workspace（Drive、Sheets、Calendar）の自動化とWebスクレイピングを行うPythonプロジェクトです。

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

## セットアップ

### 前提条件

- Python 3.10以上
- [uv](https://github.com/astral-sh/uv) (インストール方法: `curl -LsSf https://astral.sh/uv/install.sh | sh`)

### インストール

```bash
# 依存関係のインストール
uv sync
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

## 注意事項

- 旧版スクリプト（`copy_*.py`）とリファクタ版（`refactored_*.py`）が併存しています
- 新規使用時はリファクタ版（`refactored_*.py`）の使用を推奨します
- リファクタ版は設定ファイルベースで、ロギングとエラーハンドリングが改善されています