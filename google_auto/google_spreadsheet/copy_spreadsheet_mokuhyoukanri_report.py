import re
import datetime
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.service_account import Credentials

# 認証情報の設定
SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/calendar.readonly"]
creds = Credentials.from_service_account_file('credentials.json', scopes=SCOPES)

# Google Drive APIクライアントの作成
drive_service = build('drive', 'v3', credentials=creds)

# Google Sheets APIクライアントの作成
sheets_service = build('sheets', 'v4', credentials=creds)

# Google Calendar APIクライアントの作成
calendar_service = build('calendar', 'v3', credentials=creds)

def get_coaching_dates(calendar_id):
    now = datetime.datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_of_month = (start_of_month + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(seconds=1)

    events_result = calendar_service.events().list(
        calendarId=calendar_id, timeMin=start_of_month.isoformat() + 'Z',
        timeMax=end_of_month.isoformat() + 'Z', singleEvents=True,
        orderBy='startTime').execute()
    events = events_result.get('items', [])

    coaching_dates = []
    for event in events:
        if 'コーチ面談' in event.get('summary', ''):
            start_date = event['start'].get('dateTime', event['start'].get('date'))
            coaching_dates.append(start_date[:10])  # YYYY-MM-DD形式

    return coaching_dates

def copy_latest_sheet_and_clear_cells(spreadsheet_id, cells_to_clear, calendar_id):
    try:
        coaching_dates = get_coaching_dates(calendar_id)
        if not coaching_dates:
            print("今月のコーチ面談の予定が見つかりませんでした。")
            return

        # 最新のシートを取得（一番右のシート）
        spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = spreadsheet.get('sheets', [])
        latest_sheet = sheets[-1]
        latest_sheet_id = latest_sheet['properties']['sheetId']
        latest_sheet_title = latest_sheet['properties']['title']
        print(f"最新のシート '{latest_sheet_title}' をコピー中...")

        # 新しいシート名を生成
        new_sheet_title = coaching_dates[0].replace('-', '')  # 最初のコーチ面談の日付を使用

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

        # コピーしたシートのタブの色を赤に設定
        requests = [
            {
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": new_sheet_id,
                        "tabColor": {"red": 1.0, "green": 0.0, "blue": 0.0}
                    },
                    "fields": "tabColor"
                }
            },
            # コピー元のシートのタブの色を白に設定
            {
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": latest_sheet_id,
                        "tabColor": {"red": 1.0, "green": 1.0, "blue": 1.0}
                    },
                    "fields": "tabColor"
                }
            }
        ]

        # 特定のセルを空白にする
        today_date = datetime.datetime.now().strftime("%-m/%-d/%Y")
        requests.extend([
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
        ])

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
spreadsheet_id = "1utF5pv67W4VOjXlFYx5m5QsDK1i0RFRtSMCuv1bRTOw"
calendar_id = "yk050696@gmail.com"  # 取得したいカレンダーのID
column_to_clear = 39
cells_to_clear = [(22, column_to_clear), (31, column_to_clear), (40, column_to_clear), (50, column_to_clear), (60, column_to_clear)]  # 空白にするセルのリスト（(行, 列)形式で指定、1始まり）
copy_latest_sheet_and_clear_cells(spreadsheet_id, cells_to_clear, calendar_id)
