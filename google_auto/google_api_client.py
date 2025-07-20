import logging
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar.readonly"
]

def get_credentials(credentials_file):
    """認証情報を取得します。"""
    return Credentials.from_service_account_file(credentials_file, scopes=SCOPES)

def get_drive_service(credentials_file):
    """Google Drive APIクライアントを返します。"""
    creds = get_credentials(credentials_file)
    return build('drive', 'v3', credentials=creds)

def get_sheets_service(credentials_file):
    """Google Sheets APIクライアントを返します。"""
    creds = get_credentials(credentials_file)
    return build('sheets', 'v4', credentials=creds)

def get_calendar_service(credentials_file):
    """Google Calendar APIクライアントを返します。"""
    creds = get_credentials(credentials_file)
    return build('calendar', 'v3', credentials=creds)

def get_latest_file_in_folder(drive_service, folder_id, mime_type=None):
    """指定されたフォルダ内で最も新しく更新されたファイルの情報を取得します。"""
    try:
        query = f"'{folder_id}' in parents and trashed = false"
        if mime_type:
            query += f" and mimeType='{mime_type}'"
            
        results = drive_service.files().list(
            q=query,
            pageSize=1,
            orderBy='modifiedTime desc',
            fields='files(id, name)'
        ).execute()
        
        items = results.get('files', [])
        if not items:
            logging.warning(f"フォルダID {folder_id} 内にファイルが見つかりませんでした。")
            return None
        
        latest_file = items[0]
        logging.info(f"最新のファイル ''{latest_file['name']}'' (ID: {latest_file['id']}) を取得しました。")
        return latest_file
        
    except HttpError as error:
        logging.error(f"フォルダ内のファイル検索中にエラーが発生しました: {error}")
        return None