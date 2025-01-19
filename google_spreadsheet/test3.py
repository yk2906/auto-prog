import gspread
from oauth2client.service_account import ServiceAccountCredentials

# 認証情報の設定
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name('norse-appliance-447500-r6-30cf69d40489.json', scope)

# クライアントの作成
try:
    print("認証中...")
    client = gspread.authorize(creds)
    print("認証成功")

    # スプレッドシート一覧を取得してデバッグ
    print("アクセス可能なスプレッドシート一覧を取得中...")
    spreadsheets = client.openall()  # アクセス可能なすべてのスプレッドシートを取得
    for sheet in spreadsheets:
        print(f"スプレッドシート名: {sheet.title}, ID: {sheet.id}")

    # スプレッドシートIDを使用して取得
    spreadsheet_id = "1DPFGhoYOmU9y_gB4-MeDG5jxJjok4-iUziByiqLkBPc"  # スプレッドシートのIDを記載
    print(f"スプレッドシートID: {spreadsheet_id} にアクセス中...")
    spreadsheet = client.open_by_key(spreadsheet_id)
    print("スプレッドシートにアクセス成功")

    # ワークシートの取得
    sheet_name = "目次"  # 取得したいワークシート名
    print(f"ワークシート '{sheet_name}' を取得中...")
    worksheet = spreadsheet.worksheet(sheet_name)
    print(f"ワークシート '{sheet_name}' を取得しました")

    # 全てのデータを取得
    print("データを取得中...")
    data = worksheet.get_all_records()
    print("取得したデータ:")
    print(data)

    # 特定のセルの値を取得
    cell_address = 'B5'  # 対象のセルアドレス
    print(f"セル '{cell_address}' の値を取得中...")
    cell_value = worksheet.acell(cell_address).value
    print(f"{cell_address} セルの値: {cell_value}")

except gspread.SpreadsheetNotFound:
    print("指定したスプレッドシートが見つかりませんでした。IDまたは共有設定を確認してください。")

except gspread.WorksheetNotFound:
    print(f"指定したワークシート '{sheet_name}' が見つかりませんでした。名前を確認してください。")

except Exception as e:
    print(f"エラーが発生しました: {e}")
