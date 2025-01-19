import gspread
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

# 認証情報の設定
SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/spreadsheets"]
creds = Credentials.from_service_account_file('norse-appliance-447500-r6-30cf69d40489.json', scopes=SCOPES)

# Google Drive APIクライアントの作成
drive_service = build('drive', 'v3', credentials=creds)

# Google Sheets APIクライアントの作成 (gspreadを利用)
client = gspread.authorize(creds)  # ここを修正して `google-auth` の認証情報を使う

# フォルダ内のスプレッドシートを検索する関数
def get_spreadsheets_in_folder(folder_id):
    try:
        print(f"フォルダID: {folder_id} の中を検索中...")
        query = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet'"
        results = drive_service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get('files', [])
        if not files:
            print("フォルダ内にスプレッドシートが見つかりませんでした。")
        else:
            print("フォルダ内のスプレッドシート:")
            for file in files:
                print(f"名前: {file['name']}, ID: {file['id']}")
        return files
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        return []

# 特定のスプレッドシートとセルの情報を取得する関数
def read_cell(spreadsheet_id, worksheet_name, cell_address):
    try:
        print(f"スプレッドシートID: {spreadsheet_id} を開いています...")
        spreadsheet = client.open_by_key(spreadsheet_id)
        print(f"スプレッドシート '{spreadsheet.title}' にアクセス成功")

        print(f"ワークシート '{worksheet_name}' を取得中...")
        worksheet = spreadsheet.worksheet(worksheet_name)

        print(f"セル '{cell_address}' の値を取得中...")
        cell_value = worksheet.acell(cell_address).value
        print(f"{cell_address} の値: {cell_value}")
    except gspread.WorksheetNotFound:
        print(f"指定したワークシート '{worksheet_name}' が見つかりません。")
    except gspread.SpreadsheetNotFound:
        print(f"指定したスプレッドシートID '{spreadsheet_id}' が見つかりません。")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

# メイン処理
folder_id = "10BZvPy1Ffn7zCJRsFFO2bctQT9u9xBD4"  # 対象フォルダのIDを指定
spreadsheets = get_spreadsheets_in_folder(folder_id)

# 特定のスプレッドシートとセルを操作
target_spreadsheet_name = "【項番1】勉強会.研究会受講レポート"
target_worksheet_name = "目次"
target_cell_address = "E5"

for sheet in spreadsheets:
    if sheet['name'] == target_spreadsheet_name:
        read_cell(sheet['id'], target_worksheet_name, target_cell_address)
        break
else:
    print(f"フォルダ内にスプレッドシート '{target_spreadsheet_name}' が見つかりませんでした。")
