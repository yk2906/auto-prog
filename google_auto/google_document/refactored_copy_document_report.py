import datetime
import logging
import json
from googleapiclient.errors import HttpError
from google_api_client import get_drive_service, get_latest_file_in_folder

# ロギング設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_new_file_name():
    """新しいファイル名を生成します。"""
    current_month = datetime.datetime.now().strftime("%-m月")
    return f"状況報告書_{current_month}"

def copy_google_document(drive_service, file_id, new_file_name, destination_folder_id=None):
    """Googleドキュメントをコピーします。"""
    try:
        copy_metadata = {"name": new_file_name}
        if destination_folder_id:
            copy_metadata["parents"] = [destination_folder_id]

        copied_file = drive_service.files().copy(
            fileId=file_id, body=copy_metadata
        ).execute()

        logging.info(f"新しい Google Document が作成されました: {new_file_name}")
        logging.info(f"ファイル ID: {copied_file['id']}")
        return copied_file['id']
    except HttpError as error:
        logging.error(f"ドキュメントのコピー中にエラーが発生しました: {error.resp.status} - {error.error_details}")
        return None

def main():
    """メイン処理"""
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        logging.error("設定ファイル 'config.json' が見つかりません。")
        return

    doc_config = config.get('document_report', {})
    source_folder_id = doc_config.get('source_folder_id')
    destination_folder_id = doc_config.get('destination_folder_id')
    credentials_file = config.get('credentials_file', 'credentials.json')

    if not source_folder_id:
        logging.error("設定ファイルに source_folder_id が指定されていません。")
        return

    try:
        drive_service = get_drive_service(credentials_file)
        
        # 最新のGoogleドキュメントのIDを取得
        mime_type = 'application/vnd.google-apps.document'
        latest_file = get_latest_file_in_folder(drive_service, source_folder_id, mime_type)

        if not latest_file:
            return # ファイルが見つからなければ終了

        new_file_name = generate_new_file_name()
        copy_google_document(drive_service, latest_file['id'], new_file_name, destination_folder_id)
        
    except Exception as e:
        logging.error(f"予期しないエラーが発生しました: {e}")

if __name__ == "__main__":
    main()