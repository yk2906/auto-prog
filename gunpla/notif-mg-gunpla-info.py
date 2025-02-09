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

results = []

if target_div:
    ul_elements = target_div.find_all("ul")

    for ul in ul_elements:
        li_elements = ul.find_all("li")

        for li in li_elements:
            a_element = li.find("a")
            if a_element:
                href = a_element.get("href")
                span_elements = a_element.find_all("span")

                span_texts = [span.text.strip() for span in span_elements if span.text.strip()]
                span_texts_str = "\\n".join(span_texts) if span_texts else "No title"

                results.append(f"{span_texts_str}: {href}")

else:
    results.append("指定の <div> タグが見つかりませんでした。")

print("RESULT_CONTENT=" + "\\n".join(results))
