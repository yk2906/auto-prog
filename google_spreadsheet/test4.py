from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials

# 認証情報の設定
SCOPES = ["https://www.googleapis.com/auth/drive"]
creds = Credentials.from_service_account_file('norse-appliance-447500-r6-30cf69d40489.json', scopes=SCOPES)

# Google Drive APIクライアントの作成
service = build('drive', 'v3', credentials=creds)

# フォルダ内のスプレッドシートを取得
def get_spreadsheets_in_folder(folder_id):
    try:
        print(f"フォルダID: {folder_id} の中を検索中...")
        query = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet'"
        results = service.files().list(q=query, fields="files(id, name)").execute()
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

# フォルダIDを指定して実行
folder_id = "10BZvPy1Ffn7zCJRsFFO2bctQT9u9xBD4"  # 対象のフォルダIDをここに記載
spreadsheets = get_spreadsheets_in_folder(folder_id)

# 必要に応じてgspreadでスプレッドシートを操作
import gspread
from oauth2client.service_account import ServiceAccountCredentials

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds_gspread = ServiceAccountCredentials.from_json_keyfile_name('norse-appliance-447500-r6-30cf69d40489.json', scope)
client = gspread.authorize(creds_gspread)

for sheet in spreadsheets:
    spreadsheet_id = sheet['id']
    spreadsheet_name = sheet['name']
    print(f"スプレッドシート: {spreadsheet_name}, ID: {spreadsheet_id}")
    # スプレッドシートをgspreadで開く
    spreadsheet = client.open_by_key(spreadsheet_id)
    print(f"'{spreadsheet_name}' を操作可能")
