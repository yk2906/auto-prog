"""
今月分のレポート（Udemy受講レポート x2, 自主勉強会開催レポート）が完成しているかをチェックする。
- 全て完成していれば submit_monthly_report_mail.py を実行してThunderbirdの下書きを開く
  （送信はしない。今月分は一度だけ実行するようマーカーファイルで制御）。
- 未完成があればSlackにWebhookでリマインドを送る。

cronから毎週金曜20時に実行される想定（週次で必ずチェック・通知する）。

前提:
- サービスアカウントの認証情報: ~/.config/bold-report-checker/service-account.json
  （対象スプレッドシートに「閲覧者」で共有しておくこと）
- Slack Webhook URL: ~/.config/bold-report-checker/slack_webhook_url に1行で保存
"""
import datetime
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build

CONFIG_DIR = Path.home() / '.config' / 'bold-report-checker'
SERVICE_ACCOUNT_FILE = CONFIG_DIR / 'service-account.json'
SLACK_WEBHOOK_FILE = CONFIG_DIR / 'slack_webhook_url'
LAST_DRAFTED_FILE = CONFIG_DIR / 'last_drafted_month'

REPORTS = [
    {
        'name': '【項番2】Udemy受講レポート',
        'file_id': '1TopTSdoMCM-FsLZyyJyppt_6v3JbK4L38kbQErN0x58',
        'type': 'udemy',
    },
    {
        'name': '【項番3】Udemy受講レポート',
        'file_id': '1JKofkpoV4OWNSc33byyEmDThI_RJra50BBJRibkxTmE',
        'type': 'udemy',
    },
    {
        'name': '【項番4】自主勉強会開催レポート',
        'file_id': '1K4j1_OqP11g2KUy-XQwcA5R-_ooKt0G9aAL_HOVwvv4',
        'type': 'jishu',
    },
]

# 目次シートで確認する列（この当月行が埋まっているか）。(列, 項目名)
TOC_COLUMNS_BY_TYPE = {
    'udemy': [('C', '受講日'), ('D', '講師'), ('E', 'コース名'), ('F', '受講時間')],
    'jishu': [('C', '開催日'), ('D', '主催者'), ('E', '講義名'), ('I', '出席者')],
}

# 当月シートで確認するセルと項目名。(cell, label, required)
UDEMY_SESSION_CELLS = ['E9', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15', 'E16']
UDEMY_SESSION_TIME_CELLS = ['S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15', 'S16']
UDEMY_FIXED_CELLS = [
    ('X9', '学習時間', True),
    ('D17', '内容', True),
    ('B23', '学んだこと', True),
    ('B30', '今後の活用', False),
]
JISHU_FIXED_CELLS = [
    ('E8', '開催日', True),
    ('N8', '実施時間', True),
    ('R8', '主催者', True),
    ('E9', '受講者', True),
    ('D10', '内容', True),
    ('B15', '目的', True),
    ('B22', '受講者の反応', True),
    ('B28', '開催内容の反省点、次回の改善点', True),
]

GOOGLE_SHEETS_EPOCH = datetime.date(1899, 12, 30)

# 受講時間・学習時間はこの分数未満なら未完了とする
MIN_STUDY_MINUTES = 120


def parse_study_minutes(text):
    """「2時間4分」「1時間」「39分」のような文字列を分に変換する。時間・分どちらも無ければNone。"""
    hours_match = re.search(r'(\d+)\s*時間', text)
    minutes_match = re.search(r'(\d+)\s*分', text)
    if not hours_match and not minutes_match:
        return None
    hours = int(hours_match.group(1)) if hours_match else 0
    minutes = int(minutes_match.group(1)) if minutes_match else 0
    return hours * 60 + minutes


def build_sheets_client():
    creds = service_account.Credentials.from_service_account_file(
        str(SERVICE_ACCOUNT_FILE),
        scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'],
    )
    return build('sheets', 'v4', credentials=creds)


def serial_to_date(serial):
    try:
        return GOOGLE_SHEETS_EPOCH + datetime.timedelta(days=float(serial))
    except (TypeError, ValueError):
        return None


def find_current_month_toc_row(sheets, file_id, today):
    result = sheets.spreadsheets().values().get(
        spreadsheetId=file_id, range='目次!C5:I10'
    ).execute()
    rows = result.get('values', [])
    for row in rows:
        if not row:
            continue
        date_value = serial_to_date(row[0])
        if date_value and date_value.year == today.year and date_value.month == today.month:
            return row
    return None


def toc_missing_columns(row, report_type):
    # C=0, D=1, E=2, F=3, G=4, H=5, I=6 (C5:I10の相対インデックス)
    index_by_column = {'C': 0, 'D': 1, 'E': 2, 'F': 3, 'I': 6}
    missing = []
    for col, label in TOC_COLUMNS_BY_TYPE[report_type]:
        idx = index_by_column[col]
        value = row[idx] if (row is not None and idx < len(row)) else ''
        if not str(value).strip():
            missing.append(f'目次:{label}')
        elif col == 'F' and report_type == 'udemy':
            minutes = parse_study_minutes(str(value))
            if minutes is None or minutes < MIN_STUDY_MINUTES:
                missing.append(f'目次:{label}（2時間未満）')
    return missing


def find_current_month_sheet_name(sheets, file_id, today):
    meta = sheets.spreadsheets().get(spreadsheetId=file_id, fields='sheets.properties.title').execute()
    month_str = f'{today.month:02d}月'
    for sheet in meta.get('sheets', []):
        title = sheet['properties']['title']
        if f'{month_str}' in title and title != '目次':
            # "MM月DD日" のMM部分が今月と一致するものだけを対象にする
            match = re.search(r'(\d{2})月\d{2}日', title)
            if match and match.group(1) == f'{today.month:02d}':
                return title
    return None


def get_cell_values(sheets, file_id, sheet_name, cells):
    ranges = [f"'{sheet_name}'!{cell}" for cell in cells]
    result = sheets.spreadsheets().values().batchGet(spreadsheetId=file_id, ranges=ranges).execute()
    values = []
    for value_range in result.get('valueRanges', []):
        vr = value_range.get('values')
        values.append(vr[0][0] if vr and vr[0] else '')
    return values


def check_udemy_report(sheets, file_id, sheet_name):
    missing = []

    session_cells = UDEMY_SESSION_CELLS + UDEMY_SESSION_TIME_CELLS
    all_values = get_cell_values(sheets, file_id, sheet_name, session_cells)
    session_values = all_values[:len(UDEMY_SESSION_CELLS)]
    time_values = all_values[len(UDEMY_SESSION_CELLS):]

    filled_sessions = [v for v in session_values if str(v).strip()]
    if not filled_sessions:
        missing.append('本文:セッション（最低1件）')
    for row_num, (e_val, s_val) in enumerate(zip(session_values, time_values), start=9):
        if str(e_val).strip() and not str(s_val).strip():
            missing.append(f'本文:時間（{row_num}行目のセッションに対応する時間が未入力）')

    fixed_cells = [cell for cell, _, _ in UDEMY_FIXED_CELLS]
    fixed_values = get_cell_values(sheets, file_id, sheet_name, fixed_cells)
    for (cell, label, required), value in zip(UDEMY_FIXED_CELLS, fixed_values):
        if required and not str(value).strip():
            missing.append(f'本文:{label}')
        elif cell == 'X9' and str(value).strip():
            minutes = parse_study_minutes(str(value))
            if minutes is None or minutes < MIN_STUDY_MINUTES:
                missing.append(f'本文:{label}（2時間未満）')

    return missing


def check_jishu_report(sheets, file_id, sheet_name):
    missing = []
    cells = [cell for cell, _, _ in JISHU_FIXED_CELLS]
    values = get_cell_values(sheets, file_id, sheet_name, cells)
    for (cell, label, required), value in zip(JISHU_FIXED_CELLS, values):
        if required and not str(value).strip():
            missing.append(f'本文:{label}')
    return missing


def check_report(sheets, report, today):
    file_id = report['file_id']
    report_type = report['type']

    missing = []

    toc_row = find_current_month_toc_row(sheets, file_id, today)
    missing.extend(toc_missing_columns(toc_row, report_type))

    sheet_name = find_current_month_sheet_name(sheets, file_id, today)
    if not sheet_name:
        missing.append('本文:今月のシートがまだ作成されていません')
    elif report_type == 'udemy':
        missing.extend(check_udemy_report(sheets, file_id, sheet_name))
    else:
        missing.extend(check_jishu_report(sheets, file_id, sheet_name))

    return (len(missing) == 0), missing


def send_slack_reminder(incomplete_reports):
    if not SLACK_WEBHOOK_FILE.exists():
        print('Slack Webhook URLが未設定のため通知をスキップします: ' + str(SLACK_WEBHOOK_FILE))
        return
    webhook_url = SLACK_WEBHOOK_FILE.read_text().strip()
    if not webhook_url:
        print('Slack Webhook URLが空のため通知をスキップします')
        return

    lines = ['今月のレポートがまだ揃っていません:']
    for name, missing in incomplete_reports:
        lines.append(f'*{name}*')
        for item in missing:
            lines.append(f'    • {item}')
    text = '\n'.join(lines)

    data = json.dumps({'text': text}).encode('utf-8')
    req = urllib.request.Request(webhook_url, data=data, headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req, timeout=10)
        print('Slackにリマインドを送信しました')
    except Exception as e:
        print(f'Slack通知に失敗しました: {e}')


def already_drafted_this_month(today):
    if not LAST_DRAFTED_FILE.exists():
        return False
    return LAST_DRAFTED_FILE.read_text().strip() == f'{today.year}-{today.month:02d}'


def mark_drafted_this_month(today):
    LAST_DRAFTED_FILE.write_text(f'{today.year}-{today.month:02d}')


def run_submit_mail_draft():
    script_path = Path(__file__).parent / 'submit_monthly_report_mail.py'
    subprocess.Popen([sys.executable, str(script_path)])
    print('submit_monthly_report_mail.py を実行しました（Thunderbird下書きを起動、送信はしていません）')


def main():
    today = datetime.date.today()
    sheets = build_sheets_client()

    incomplete_reports = []
    for report in REPORTS:
        is_complete, missing = check_report(sheets, report, today)
        status = 'OK' if is_complete else 'NG'
        print(f'{report["name"]}: {status}' + (f' ({", ".join(missing)})' if missing else ''))
        if not is_complete:
            incomplete_reports.append((report['name'], missing))

    if incomplete_reports:
        send_slack_reminder(incomplete_reports)
        return

    if already_drafted_this_month(today):
        print('今月分は既に下書き済みのため、submit_monthly_report_mail.py は実行しません')
        return

    run_submit_mail_draft()
    mark_drafted_this_month(today)


if __name__ == '__main__':
    main()
