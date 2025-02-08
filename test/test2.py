import requests
from bs4 import BeautifulSoup

url = "https://bandai-hobby.net/brand/mg/"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

response = requests.get(url, headers=headers)

soup = BeautifulSoup(response.text, "html.parser")

title = soup.title.text
print(f"タイトル: {title}")

target_div = soup.find("div", id="bhs_side_renews")

if target_div:
    ul_elements = target_div.find_all("ul")

    for ul in ul_elements:
        # aタグとspanタグをそれぞれ取得
        a_elements = ul.find_all("a")
        span_elements = ul.find_all("span")

        # aタグからhref属性（URL）を抽出
        for a in a_elements:
            href = a.get("href")
            if href:
                print(f"aタグのリンク: {href}")
            for span in span_elements:
                print(f"spanタグのテキスト: {span.text.strip()}")


else:
    print("指定の <div> タグが見つかりませんでした。")
