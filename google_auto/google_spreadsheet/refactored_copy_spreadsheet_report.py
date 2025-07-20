import datetime
import logging
import json
import re
from googleapiclient.errors import HttpError
from google_api_client import get_sheets_service, get_drive_service, get_latest_file_in_folder

# ロギング設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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

def generate_new_sheet_title(latest_sheet_title):
    """新しいシート名を生成します。"""
    match = re.match(r"^[①-⑳]", latest_sheet_title)
    if match:
        current_number_unicode = ord(match.group())
        next_number_unicode = current_number_unicode + 1
        next_number = chr(next_number_unicode)
    else:
        logging.warning("シート名に番号が見つかりませんでした。デフォルト値として①を使用します。")
        next_number = "①"
    today = datetime.datetime.now().strftime("%m月%d日")
    return f"{next_number} {today}"

def duplicate_sheet(sheets_service, spreadsheet_id, source_sheet_id, new_sheet_name):
    """シートを複製します。"""
    try:
        requests = [{
            "duplicateSheet": {
                "sourceSheetId": source_sheet_id,
                "insertSheetIndex": 9999,  # 十分大きな値で一番右に配置
                "newSheetName": new_sheet_name
            }
        }]
        body = {"requests": requests}
        response = sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id, body=body).execute()
        new_sheet_id = response['replies'][0]['duplicateSheet']['properties']['sheetId']
        logging.info(f"新しいシート '{new_sheet_name}' を作成しました。シートID: {new_sheet_id}")
        return new_sheet_id
    except HttpError as error:
        logging.error(f"シートの複製中にエラーが発生しました: {error}")
        return None

def clear_and_update_cells(sheets_service, spreadsheet_id, sheet_id, cells_to_clear, date_cell):
    """指定されたセルをクリアし、日付を更新します。"""
    try:
        requests = []
        # セルのクリア
        if cells_to_clear:
            requests.extend([
                {
                    "updateCells": {
                        "range": {
                            "sheetId": sheet_id,
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
        
        # 日付の更新
        if date_cell:
            today_date = datetime.datetime.now().strftime("%-m/%-d/%Y")
            requests.append({
                "updateCells": {
                    "range": {
                        "sheetId": sheet_id,
                        "startRowIndex": date_cell['row'] - 1,
                        "endRowIndex": date_cell['row'],
                        "startColumnIndex": date_cell['column'] - 1,
                        "endColumnIndex": date_cell['column']
                    },
                    "rows": [{"values": [{"userEnteredValue": {"stringValue": today_date}}]}],
                    "fields": "userEnteredValue"
                }
            })

        if requests:
            body = {"requests": requests}
            sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id, body=body).execute()
            logging.info(f"シート {sheet_id} のセルを更新しました。")
        return True
    except HttpError as error:
        logging.error(f"セルの更新中にエラーが発生しました: {error}")
        return False

def main():
    """メイン処理"""
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        logging.error("設定ファイル 'config.json' が見つかりません。")
        return

    report_config = config.get('daily_report', {})
    source_folder_id = report_config.get('source_folder_id')
    cells_to_clear = report_config.get('cells_to_clear', [])
    date_cell = report_config.get('date_cell')
    credentials_file = config.get('credentials_file', 'credentials.json')

    if not source_folder_id:
        logging.error("設定ファイルに source_folder_id が指定されていません。")
        return

    try:
        drive_service = get_drive_service(credentials_file)
        sheets_service = get_sheets_service(credentials_file)
        
        mime_type = 'application/vnd.google-apps.spreadsheet'
        spreadsheets = get_latest_file_in_folder(drive_service, source_folder_id, mime_type)
        if not spreadsheets:
            logging.info("対象フォルダにスプレッドシートが見つかりませんでした。")
            return

        spreadsheet_id = spreadsheets['id']
        logging.info(f"処理中のスプレッドシート: {spreadsheets['name']} (ID: {spreadsheet_id})")
        
        latest_sheet = get_latest_sheet(sheets_service, spreadsheet_id)
        if not latest_sheet:
            return

        new_sheet_title = generate_new_sheet_title(latest_sheet['properties']['title'])
        new_sheet_id = duplicate_sheet(sheets_service, spreadsheet_id, latest_sheet['properties']['sheetId'], new_sheet_title)

        if new_sheet_id:
            clear_and_update_cells(sheets_service, spreadsheet_id, new_sheet_id, cells_to_clear, date_cell)

    except Exception as e:
        logging.error(f"予期しないエラーが発生しました: {e}")

if __name__ == "__main__":
    main()