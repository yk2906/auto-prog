from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import os

SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = './norse-appliance-447500-r6-30cf69d40489.json'

creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)

drive_service = build('drive', 'v3', credentials=creds)
sheets_service = build('sheets', 'v4', credentials=creds)

def get_spreadsheets_in_folder(folder_id):
    query = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet'"
    results = drive_service.files().list(q=query, fields="files(id, name)").execute()
    files = results.get('files', [])
    return files

def read_spreadsheet(sheet_id, range_name):
    result = sheets_service.spreadsheets().values().get(spreadsheetId=sheet_id, range=range_name).execute()
    return result.get('values', [])

# メイン処理
if __name__ == '__main__':
    # 指定フォルダID（Google DriveのURLから取得可能）
    folder_id = '10BZvPy1Ffn7zCJRsFFO2bctQT9u9xBD4'

    # フォルダ内のスプレッドシート一覧を取得
    spreadsheets = get_spreadsheets_in_folder(folder_id)
    print("Found spreadsheets:")
    for sheet in spreadsheets:
        print(f"Name: {sheet['name']}, ID: {sheet['id']}")

    # 特定のスプレッドシートのデータを取得（例: 最初のスプレッドシートの範囲"A1:D10"）
    if spreadsheets:
        sheet_id = spreadsheets[0]['id']  # 最初のスプレッドシートのID
        data = read_spreadsheet(sheet_id, 'B5:E10')
        print("Spreadsheet data:")
        for row in data:
            print(row)