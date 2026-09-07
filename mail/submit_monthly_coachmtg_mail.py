import glob
import os
import re
from datetime import date

from thunderbird_util import get_submit_dir, launch_compose


def find_latest_report(submit_dir: str, today: date) -> str:
    """状況報告書_◯月.docx のうち、今月に一番近い(超えない)月のものを選ぶ"""
    pattern = re.compile(r"^状況報告書_(\d{1,2})月\.docx$")
    candidates = []
    for path in glob.glob(os.path.join(submit_dir, "状況報告書_*月.docx")):
        m = pattern.match(os.path.basename(path))
        if m:
            candidates.append((int(m.group(1)), path))

    if not candidates:
        raise FileNotFoundError(f"状況報告書_◯月.docx が見つかりません: {submit_dir}")

    def distance_from_today(month: int) -> int:
        return (today.month - month) % 12

    return min(candidates, key=lambda c: distance_from_today(c[0]))[1]


def find_latest_progress_sheet(submit_dir: str) -> str:
    """先頭がYYYYMMDDの目標管理進捗報告シートのうち、日付が最新のものを選ぶ"""
    pattern = re.compile(r"^(\d{8})\(小濵佑斗\).*目標管理進捗報告シート\.xlsx$")
    candidates = []
    for path in glob.glob(os.path.join(submit_dir, "*(小濵佑斗)*目標管理進捗報告シート.xlsx")):
        m = pattern.match(os.path.basename(path))
        if m:
            candidates.append((m.group(1), path))

    if not candidates:
        raise FileNotFoundError(f"◯◯(小濵佑斗)◯◯目標管理進捗報告シート.xlsx が見つかりません: {submit_dir}")

    return max(candidates, key=lambda c: c[0])[1]


def compose_mail_with_direct_drive():
    today = date.today()
    submit_dir = get_submit_dir()

    # 添付するファイルのパス（フォルダ内の該当ファイルから最新のものを自動選択）
    file_paths = [
        find_latest_report(submit_dir, today),
        find_latest_progress_sheet(submit_dir),
    ]

    to_email = "y_kohama@bold.ne.jp"
    # Cc アドレス（複数追加可。不要な場合は空リストにする）
    cc_emails = ["y_kohama@bold.ne.jp"]
    subject = "【面談資料の提出】1495・小濵佑斗"
    body = "綱島さん\n\nお疲れ様です。技術部の小濵佑斗です。\n\n今月の「状況報告書」及び「24下目標管理進捗報告シート」を提出致します。\n\nご確認の程、よろしくお願いします。"

    launch_compose(to_email, subject, body, file_paths, cc_emails)


if __name__ == "__main__":
    compose_mail_with_direct_drive()
