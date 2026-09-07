import os
import subprocess


def is_wsl() -> bool:
    try:
        with open("/proc/version") as f:
            return "microsoft" in f.read().lower()
    except FileNotFoundError:
        return False


def get_submit_dir() -> str:
    # Linux Mint側でGoogleドライブのマウント先が決まったら
    # BOLD_SUBMIT_DIR にそのパスを設定する
    override = os.environ.get("BOLD_SUBMIT_DIR")
    if override:
        return override
    if is_wsl():
        return "/mnt/g/マイドライブ/株式会社ボールド/提出"
    raise RuntimeError(
        "Googleドライブの提出フォルダのパスを環境変数 BOLD_SUBMIT_DIR で指定してください"
        "（例: export BOLD_SUBMIT_DIR=\"$HOME/GoogleDrive/マイドライブ/株式会社ボールド/提出\"）"
    )


def to_win_paths(paths: list[str]) -> list[str]:
    win_paths = []
    for path in paths:
        result = subprocess.run(["wslpath", "-w", path], capture_output=True, text=True)
        win_paths.append(result.stdout.strip())
    return win_paths


def launch_compose(to_email: str, subject: str, body: str, attachment_paths: list[str], cc_emails: list[str]) -> None:
    """WSL2ならPowerShell経由でThunderbird(.exe)を、Linux Mintならネイティブのthunderbirdを起動する"""
    cc_str = ",".join(cc_emails)

    if is_wsl():
        attachment_str = ",".join(to_win_paths(attachment_paths))
        thunderbird_path = r"C:\Program Files\Mozilla Thunderbird\thunderbird.exe"
        powershell = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"

        # PowerShell の `n（ダブルクォート内の改行エスケープ）で本文を構築
        body_ps = "`n".join(body.split("\n"))
        compose_args = f"to='{to_email}',subject='{subject}',body='\" + $body + \"',attachment='{attachment_str}'"
        if cc_emails:
            compose_args += f",cc='{cc_str}'"
        ps_cmd = (
            f"$body = \"{body_ps}\"; "
            f"$compose = \"{compose_args}\"; "
            f"Start-Process '{thunderbird_path}' -ArgumentList @('-compose', $compose)"
        )
        subprocess.Popen(
            [powershell, "-Command", ps_cmd],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    else:
        attachment_str = ",".join(attachment_paths)
        compose_args = f"to='{to_email}',subject='{subject}',body='{body}',attachment='{attachment_str}'"
        if cc_emails:
            compose_args += f",cc='{cc_str}'"
        subprocess.Popen(["thunderbird", "-compose", compose_args])

    print(f"Thunderbirdを起動しました（添付ファイル: {len(attachment_paths)}件）")
    for path in attachment_paths:
        print(f"  - {path}")
