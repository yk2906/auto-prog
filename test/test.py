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

target_div = soup.find("div", id="bhs_search_result")

if target_div:
    ol_elements = target_div.find_all("ol")

    for ol in ol_elements:
        span_elements = ol.find_all("span")  # 修正済み
        if span_elements:  # 要素が存在するかチェック
            for p in span_elements:
                print(p.text.strip())
else:
    print("指定の <div> タグが見つかりませんでした。")