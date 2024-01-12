from bs4 import BeautifulSoup
import requests
from tqdm import tqdm
import json

BASE_URL = "https://math.stackexchange.com"
MAX = 100

exported = []

for i in tqdm(range(MAX)):
    URL = f"https://math.stackexchange.com/questions?tab=votes&pagesize=50&page={i + 1}"

    response = requests.get(URL)
    soup = BeautifulSoup(response.text, "html.parser")

    questions = soup.find(id="questions")

    for child in questions.findChildren("div", {"class": "s-post-summary"}):
        title = child.find("h3", {"class": "s-post-summary--content-title"})

        if title == None:
            continue

        title_text = title.a.get_text()
        link = title.a.get("href")

        summary = child.find("div", {"class": "s-post-summary--content-excerpt"})

        if summary == None:
            continue

        summary_text = summary.get_text().strip()


        exported.append({
            "title": title_text,
            "url": BASE_URL + link,
            "summary": summary_text,
            "type": "ms"
        })

with open("math-stackexchange.json", "w") as f:
    f.write(json.dumps(exported))
   
print(len(exported))