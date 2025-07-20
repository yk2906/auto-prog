import datetime
import logging
import json
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from googleapiclient.errors import HttpError
from google_api_client import get_sheets_service, get_calendar_service, get_latest_file_in_folder, get_drive_service

# ロギング設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_coaching_dates(calendar_service, calendar_id):
    """Googleカレンダーから今月のコーチ面談の日付を取得します。"""
    try:
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
                coaching_dates.append(start_date[:10])  # YYYY-MM-DD
        
        if not coaching_dates:
            logging.warning("今月のコーチ面談の予定が見つかりませんでした。")
        return coaching_dates
    except HttpError as error:
        logging.error(f"カレンダーイベントの取得中にエラーが発生しました: {error}")
        return []

def get_latest_sheet(sheets_service, spreadsheet_id):
    """スプレッドシートの最新（一番右）のシートを取得します。"""
    try:
        spreadsheet = sheets_service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = spreadsheet.get('sheets', [])
        if not sheets:
            logging.warning(f"スプレッドシート {spreadsheet_id} にシートがありません。")
            return None
        return sheets[-1]
    except HttpError as error:
        logging.error(f"スプレッドシートの取得中にエラーが発生しました: {error}")
        return None

def duplicate_sheet(sheets_service, spreadsheet_id, source_sheet_id, new_sheet_name):
    """シートを複製します。"""
    try:
        requests = [{
            "duplicateSheet": {
                "sourceSheetId": source_sheet_id,
                "insertSheetIndex": 9999, # 一番右に配置
                "newSheetName": new_sheet_name
            }
        }]
        body = {"requests": requests}
        response = sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id, body=body).execute()
        new_sheet_properties = response['replies'][0]['duplicateSheet']['properties']
        logging.info(f"新しいシート '{new_sheet_name}' を作成しました。")
        return new_sheet_properties['sheetId']
    except HttpError as error:
        logging.error(f"シートの複製中にエラーが発生しました: {error}")
        return None

def update_sheet_properties_and_cells(sheets_service, spreadsheet_id, new_sheet_id, old_sheet_id, cells_to_clear, date_cell):
    """シートのプロパティ（タブ色）とセルを更新します。"""
    try:
        requests = [
            # 新しいシートのタブを赤色に
            {
                "updateSheetProperties": {
                    "properties": {"sheetId": new_sheet_id, "tabColor": {"red": 1.0}},
                    "fields": "tabColor"
                }
            },
            # 古いシートのタブをデフォルト色に
            {
                "updateSheetProperties": {
                    "properties": {"sheetId": old_sheet_id, "tabColor": {"red": 1.0, "green": 1.0, "blue": 1.0}},
                    "fields": "tabColor"
                }
            }
        ]

        # セルのクリア
        if cells_to_clear:
            requests.extend([
                {
                    "updateCells": {
                        "range": {
                            "sheetId": new_sheet_id,
                            "startRowIndex": row - 1, "endRowIndex": row,
                            "startColumnIndex": col - 1, "endColumnIndex": col
                        },
                        "rows": [{"values": [{"userEnteredValue": {}}]}],
                        "fields": "userEnteredValue"
                    }
                }
                for row, col in cells_to_clear
            ])

        # 日付の更新
        if date_cell:
            today_date = datetime.datetime.now().strftime("%-m/%-d/%Y")
            requests.append({
                "updateCells": {
                    "range": {
                        "sheetId": new_sheet_id,
                        "startRowIndex": date_cell['row'] - 1, "endRowIndex": date_cell['row'],
                        "startColumnIndex": date_cell['column'] - 1, "endColumnIndex": date_cell['column']
                    },
                    "rows": [{"values": [{"userEnteredValue": {"stringValue": today_date}}]}],
                    "fields": "userEnteredValue"
                }
            })

        body = {"requests": requests}
        sheets_service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=body).execute()
        logging.info(f"シート {new_sheet_id} のプロパティとセルを更新しました。")
        return True
    except HttpError as error:
        logging.error(f"シートのプロパティとセルの更新中にエラーが発生しました: {error}")
        return False

def main():
    """メイン処理"""
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        logging.error("設定ファイル 'config.json' が見つかりません。")
        return

    report_config = config.get('goal_management_report', {})
    source_folder_id = report_config.get('source_folder_id')
    calendar_id = report_config.get('calendar_id')
    cells_to_clear = report_config.get('cells_to_clear', [])
    date_cell = report_config.get('date_cell')
    credentials_file = config.get('credentials_file', 'credentials.json')

    if not all([source_folder_id, calendar_id]):
        logging.error("設定ファイルに source_folder_id または calendar_id が指定されていません。")
        return

    try:
        drive_service = get_drive_service(credentials_file)
        sheets_service = get_sheets_service(credentials_file)
        calendar_service = get_calendar_service(credentials_file)

        coaching_dates = get_coaching_dates(calendar_service, calendar_id)
        if not coaching_dates:
            return

        mime_type = 'application/vnd.google-apps.spreadsheet'
        latest_file = get_latest_file_in_folder(drive_service, source_folder_id, mime_type)
        if not latest_file:
            return

        spreadsheet_id = latest_file['id']
        latest_sheet = get_latest_sheet(sheets_service, spreadsheet_id)
        if not latest_sheet:
            return

        new_sheet_title = coaching_dates[0].replace('-', '')
        latest_sheet_id = latest_sheet['properties']['sheetId']
        
        new_sheet_id = duplicate_sheet(sheets_service, spreadsheet_id, latest_sheet_id, new_sheet_title)

        if new_sheet_id:
            update_sheet_properties_and_cells(sheets_service, spreadsheet_id, new_sheet_id, latest_sheet_id, cells_to_clear, date_cell)

    except Exception as e:
        logging.error(f"予期しないエラーが発生しました: {e}", exc_info=True)

if __name__ == "__main__":
    main()