import os

from thunderbird_util import get_submit_dir, launch_compose


def compose_mail_with_direct_drive():
    submit_dir = get_submit_dir()
    file_paths = [
        os.path.join(submit_dir, "【項番2】Udemy受講レポート.xlsx"),
        os.path.join(submit_dir, "【項番3】Udemy受講レポート.xlsx"),
        os.path.join(submit_dir, "【項番4】自主勉強会開催レポート.xlsx"),
    ]

    to_email = "jinji@bold.ne.jp"
    cc_emails = ["e_tsunashima@bold.ne.jp"]
    subject = "【公式レポート提出】1495・小濵佑斗"
    body = "\n".join([
        "経営戦略本部　管理部各位",
        "",
        "お疲れ様です。",
        "",
        "今月のABC目標に関するレポートを提出致します。",
        "・Udemy受講レポート（2つ）",
        "・自主勉強会開催レポート",
        "",
        "以上、よろしくお願いします。",
    ])

    launch_compose(to_email, subject, body, file_paths, cc_emails)


if __name__ == "__main__":
    compose_mail_with_direct_drive()
