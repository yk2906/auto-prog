# GAS版自動化スクリプト

このディレクトリには、Google Workspace自動化のGAS（Google Apps Script）版が含まれています。

## ファイル構成

- `Code.gs`: 共通関数（設定取得、ファイル操作、ログ出力など）
- `CopyDocumentReport.gs`: Googleドキュメントの月次コピー
- `CopySpreadsheetReport.gs`: 日次レポートの自動生成
- `CopyMokuhyoukanriReport.gs`: 目標管理レポートの自動生成
- `Setup.gs`: 初期設定とトリガー設定
- `appsscript.json`: GAS設定ファイル
- `.clasp.json`: clasp設定ファイル（scriptIdは後で設定）

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

## 注意事項

- `.clasp.json`は`.gitignore`に追加されているため、Gitにはコミットされません
- 各環境で`clasp create`を実行して独自のGASプロジェクトを作成してください
- スクリプトプロパティは各GASプロジェクトごとに独立しています

