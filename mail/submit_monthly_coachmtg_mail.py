import subprocess
import os

def compose_mail_with_direct_drive():
    # 添付するファイルのWSL2側パス（複数追加可）
    wsl_file_paths = [
        "/mnt/g/マイドライブ/株式会社ボールド/提出/状況報告書_6月.docx",
        "/mnt/g/マイドライブ/株式会社ボールド/提出/20260616(小濵佑斗)２４下目標管理進捗報告シート.xlsx",
    ]

    win_file_paths = []
    for wsl_path in wsl_file_paths:
        result = subprocess.run(["wslpath", "-w", wsl_path], capture_output=True, text=True)
        win_file_paths.append(result.stdout.strip())

    to_email = "y_kohama@bold.ne.jp"
    # Cc アドレス（複数追加可。不要な場合は空リストにする）
    cc_emails = ["y_kohama@bold.ne.jp"]
    subject = "【面談資料の提出】1495・小濵佑斗"
    body = "綱島さん\n\nお疲れ様です。技術部の小濵佑斗です。\n\n今月の「状況報告書」及び「24下目標管理進捗報告シート」を提出致します。\n\nご確認の程、よろしくお願いします。"

    attachment_str = ",".join(win_file_paths)
    compose_args = f"to='{to_email}',subject='{subject}',body='{body}',attachment='{attachment_str}'"
    if cc_emails:
        compose_args += f",cc='{','.join(cc_emails)}'"

    thunderbird_path = "/mnt/c/Program Files/Mozilla Thunderbird/thunderbird.exe"
    subprocess.Popen([thunderbird_path, "-compose", compose_args])
    print(f"Thunderbirdを起動しました（添付ファイル: {len(win_file_paths)}件）")

if __name__ == "__main__":
    compose_mail_with_direct_drive()