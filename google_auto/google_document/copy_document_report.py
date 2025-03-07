import re
import datetime
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.service_account import Credentials

# 認証情報の設定
SCOPES = ["https://www.googleapis.com/auth/drive"]
creds = Credentials.from_service_account_file('credentials.json', scopes=SCOPES)

# Google Drive APIクライアントの作成
drive_service = build('drive', 'v3', credentials=creds)

def generate_new_file_name():
    current_month = datetime.datetime.now().strftime("%-m月")  # "2月" の形式
    return f"状況報告書_{current_month}"

def copy_google_document(file_id, destination_folder_id=None):
    try:
        new_file_name = generate_new_file_name()

        # Google Drive API を使用してファイルをコピー
        copy_metadata = {"name": new_file_name}
        
        # 指定フォルダにコピーする場合
        if destination_folder_id:
            copy_metadata["parents"] = [destination_folder_id]

        copied_file = drive_service.files().copy(
            fileId=file_id, body=copy_metadata
        ).execute()

        print(f"新しい Google Document が作成されました: {new_file_name}")
        print(f"ファイル ID: {copied_file['id']}")

    except HttpError as error:
        print(f"エラーが発生しました: {error.resp.status} - {error.error_details}")

# メイン処理
source_file_id = "1RmSdsKFvRwQnYHOmUeURSa_il9zUWopog1Kt_4dotp4"  # コピー元のGoogleドキュメントID
destination_folder_id = "12gKaJbxAjtSkCatQF0sm6vl2GLC-fvVP"  # 保存先フォルダID（省略可）

copy_google_document(source_file_id, destination_folder_id)