import gspread
from oauth2client.service_account import ServiceAccountCredentials

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name('.env/norse-appliance-447500-r6-30cf69d40489.json', scope)

client = gspread.authorize(creds)

# スプレッドシートの取得
spreadsheet = client.open('【項番1】勉強会.研究会受講レポート.xlsx のコピー')

# ワークシートの取得
worksheet = spreadsheet.sheet1

# data = worksheet.get_all_records()
# print(data)

range_values = worksheet.get('B5:E10')
print(f"B5:E10の値: {range_values}")