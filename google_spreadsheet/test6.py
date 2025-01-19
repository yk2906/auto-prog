import re
import datetime
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.service_account import Credentials

# 認証情報の設定
SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"]
creds = Credentials.from_service_account_file('norse-appliance-447500-r6-30cf69d40489.json', scopes=SCOPES)

# Google Drive APIクライアントの作成
drive_service = build('drive', 'v3', credentials=creds)

# Google Sheets APIクライアントの作成
sheets_service = build('sheets', 'v4', credentials=creds)

# 最新のシートをコピーして新しいシートを作成し、特定セルを空白にする関数
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
        body = {"requests": requests}
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id, body=body).execute()
        print(f"新しいシート '{new_sheet_title}' の指定されたセルを空白にしました。")

    except HttpError as error:
        print(f"エラーが発生しました: {error}")
    except Exception as e:
        print(f"予期しないエラーが発生しました: {e}")

# メイン処理
spreadsheet_id = "1DPFGhoYOmU9y_gB4-MeDG5jxJjok4-iUziByiqLkBPc"  # 対象スプレッドシートID
cells_to_clear = [(9, 4), (15, 2), (22, 2)]  # 空白にするセルのリスト（(行, 列)形式で指定、1始まり）
copy_latest_sheet_and_clear_cells(spreadsheet_id, cells_to_clear)
