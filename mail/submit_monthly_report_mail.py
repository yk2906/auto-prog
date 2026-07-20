import subprocess

def compose_mail_with_direct_drive():
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
    cc_emails = ["e_tsunashima@bold.ne.jp"]
    subject = "【公式レポート提出】1495・小濵佑斗"
    body_lines = [
        "経営戦略本部　管理部各位",
        "",
        "お疲れ様です。",
        "",
        "今月のABC目標に関するレポートを提出致します。",
        "・Udemy受講レポート（2つ）",
        "・自主勉強会開催レポート",
        "",
        "以上、よろしくお願いします。",
    ]

    attachment_str = ",".join(win_file_paths)
    thunderbird_path = r"C:\Program Files\Mozilla Thunderbird\thunderbird.exe"
    powershell = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"

    # PowerShell の `n（ダブルクォート内の改行エスケープ）で本文を構築
    body_ps = "`n".join(body_lines)
    cc_str = ",".join(cc_emails)

    ps_cmd = (
        f"$body = \"{body_ps}\"; "
        f"$compose = \"to='{to_email}',subject='{subject}',body='\" + $body + \"',attachment='{attachment_str}',cc='{cc_str}'\"; "
        f"Start-Process '{thunderbird_path}' -ArgumentList @('-compose', $compose)"
    )
    subprocess.Popen(
        [powershell, "-Command", ps_cmd],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    print(f"Thunderbirdを起動しました（添付ファイル: {len(win_file_paths)}件）")

if __name__ == "__main__":
    compose_mail_with_direct_drive()
