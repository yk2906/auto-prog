import subprocess
import os

def compose_mail_with_direct_drive():
    # 添付するファイルのWSL2側パス（複数追加可）
    wsl_file_paths = [
        "/mnt/g/マイドライブ/株式会社ボールド/提出/【項番2】Udemy受講レポート.xlsx",
        "/mnt/g/マイドライブ/株式会社ボールド/提出/【項番3】Udemy受講レポート.xlsx",
        "/mnt/g/マイドライブ/株式会社ボールド/提出/【項番4】自主勉強会開催レポート.xlsx",
    ]

    win_file_paths = []
    for wsl_path in wsl_file_paths:
        result = subprocess.run(["wslpath", "-w", wsl_path], capture_output=True, text=True)
        win_file_paths.append(result.stdout.strip())

    to_email = "jinji@bold.ne.jp"
    # Cc アドレス（複数追加可。不要な場合は空リストにする）
    cc_emails = ["e_tsunashima@bold.ne.jp"]
    subject = "【公式レポート提出】1495・小濵佑斗"
    body = "経営戦略本部　管理部各位\n\nお疲れ様です。\n\n今月のABC目標に関するレポートを提出致します。\n・Udemy受講レポート（2つ）\n・自主勉強会開催レポート\n\n以上、よろしくお願いします。"

    attachment_str = ",".join(win_file_paths)
    compose_args = f"to='{to_email}',subject='{subject}',body='{body}',attachment='{attachment_str}'"
    if cc_emails:
        compose_args += f",cc='{','.join(cc_emails)}'"

    thunderbird_path = "/mnt/c/Program Files/Mozilla Thunderbird/thunderbird.exe"
    subprocess.Popen([thunderbird_path, "-compose", compose_args])
    print(f"Thunderbirdを起動しました（添付ファイル: {len(win_file_paths)}件）")

if __name__ == "__main__":
    compose_mail_with_direct_drive()