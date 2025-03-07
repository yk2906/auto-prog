import re
import datetime
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.service_account import Credentials

# 認証情報の設定
SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"]
creds = Credentials.from_service_account_file('credentials.json', scopes=SCOPES)

# Google Drive APIクライアントの作成
drive_service = build('drive', 'v3', credentials=creds)

# Google Sheets APIクライアントの作成
sheets_service = build('sheets', 'v4', credentials=creds)

# フォルダIDを指定
folder_id = '1f5EpTp2E0D-0txrYvAQ39kyU915YHrwS'

# 関数を先に定義
def copy_latest_sheet_and_clear_cells(spreadsheet_id, cells_to_clear):
    try:
        print(f"スプレッドシートID: {spreadsheet_id} を開いています...")
        spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = spreadsheet.get('sheets', [])
        
        # 最新のシートを取得（一番右のシート）
        latest_sheet = sheets[-1]
        latest_sheet_id = latest_sheet['properties']['sheetId']
        latest_sheet_title = latest_sheet['properties']['title']
        print(f"最新のシート '{latest_sheet_title}' をコピー中...")
        
        # シート名から冒頭の番号を抽出（①、②など）
        match = re.match(r"^[①-⑳]", latest_sheet_title)
        if match:
            current_number_unicode = ord(match.group())  # 番号のUnicode値を取得
            next_number_unicode = current_number_unicode + 1  # 次の番号のUnicode値
            next_number = chr(next_number_unicode)  # 次の番号をUnicode文字に変換
        else:
            print("シート名に番号が見つかりませんでした。デフォルト値として①を使用します。")
            next_number = "①"
        
        # 新しいシート名を生成
        today = datetime.datetime.now().strftime("%m月%d日")
        new_sheet_title = f"{next_number} {today}"
        
        # シートをコピー
        requests = [
            {
                "duplicateSheet": {
                    "sourceSheetId": latest_sheet_id,
                    "insertSheetIndex": len(sheets),  # 一番右に配置
                    "newSheetName": new_sheet_title
                }
            }
        ]
        body = {"requests": requests}
        response = sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id, body=body).execute()
        
        # 新しいシートIDを取得
        new_sheet_id = response['replies'][0]['duplicateSheet']['properties']['sheetId']
        print(f"新しいシート '{new_sheet_title}' を作成しました。")
        
        # 特定のセルを空白にする
        today_date = datetime.datetime.now().strftime("%-m/%-d/%Y")
        requests = [
            {
                "updateCells": {
                    "range": {
                        "sheetId": new_sheet_id,
                        "startRowIndex": cell_row - 1,
                        "endRowIndex": cell_row,
                        "startColumnIndex": cell_col - 1,
                        "endColumnIndex": cell_col
                    },
                    "rows": [{"values": [{"userEnteredValue": {}}]}],
                    "fields": "userEnteredValue"
                }
            }
            for cell_row, cell_col in cells_to_clear
        ]

        requests.append({
            "updateCells": {
                "range": {
                    "sheetId": new_sheet_id,
                    "startRowIndex": 7,  # 8行目 (0ベース)
                    "endRowIndex": 8,
                    "startColumnIndex": 4,  # 5列目 (0ベース)
                    "endColumnIndex": 5
                },
                "rows": [{"values": [{"userEnteredValue": {"stringValue": today_date}}]}],
                "fields": "userEnteredValue"
            }
        })

        body = {"requests": requests}
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id, body=body).execute()
        print(f"新しいシート '{new_sheet_title}' の指定されたセルを空白にしました。")

    except HttpError as error:
        print(f"エラーが発生しました: {error}")
    except Exception as e:
        print(f"予期しないエラーが発生しました: {e}")

# メイン処理
cells_to_clear = [(8, 5), (9, 4), (15, 2), (22, 2), (28, 2)]

# フォルダ内のスプレッドシートを取得
results = drive_service.files().list(
    q=f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet'",
    spaces='drive',
    fields='files(id, name)').execute()

items = results.get('files', [])

if not items:
    print('No files found.')
else:
    for item in items:
        spreadsheet_id = item['id']
        print(f"Spreadsheet ID: {spreadsheet_id}")
        copy_latest_sheet_and_clear_cells(spreadsheet_id, cells_to_clear)
