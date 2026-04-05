import logging
import json
import os
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar.readonly"
]

def load_config(config_file='config.json'):
    """スクリプトと同じディレクトリにある設定ファイルを読み込みます。"""
    # スクリプトがあるディレクトリの config.json を取得
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(current_dir, config_file)
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logging.error(f"設定ファイル '{config_path}' が見つかりません。")
        return None

def get_credentials(credentials_file):
    """認証情報を取得します。"""
    # credentials_file もパス解決を行う
    current_dir = os.path.dirname(os.path.abspath(__file__))
    creds_path = os.path.join(current_dir, credentials_file)
    return Credentials.from_service_account_file(creds_path, scopes=SCOPES)

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

def get_files_in_folder(drive_service, folder_id, mime_type=None):
    """指定されたフォルダ内のファイルをすべて取得します。"""
    try:
        query = f"'{folder_id}' in parents and trashed = false"
        if mime_type:
            query += f" and mimeType='{mime_type}'"
            
        results = drive_service.files().list(
            q=query,
            fields='files(id, name, mimeType)' # mimeTypeも取得
        ).execute()
        
        items = results.get('files', [])
        if not items:
            logging.warning(f"フォルダID {folder_id} 内にファイルが見つかりませんでした。")
            return []
        
        logging.info(f"フォルダID {folder_id} 内に {len(items)} 個のファイルが見つかりました。")
        return items
        
    except HttpError as error:
        logging.error(f"フォルダ内のファイル検索中にエラーが発生しました: {error}")
        return []