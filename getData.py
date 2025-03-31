import requests
import json
from bs4 import BeautifulSoup

BASE_URL = "https://www.htl-steyr.ac.at/intern/webuntis/execute.php/"


def fetch_data():
    """Fetches the raw HTML from the base URL."""
    response = requests.get(BASE_URL)
    if response.status_code == 200:
        return response.text
    else:
        print(f"Failed to fetch data: {response.status_code}")
        return None


def parse_html(html):
    """Parses HTML and extracts relevant data."""
    soup = BeautifulSoup(html, "html.parser")

    # Example: Extract all table data
    tables = soup.find_all("table")
    data = {}

    for idx, table in enumerate(tables):
        rows = table.find_all("tr")
        table_data = []

        for row in rows:
            cells = row.find_all(["td", "th"])
            cell_data = [cell.text.strip() for cell in cells]
            table_data.append(cell_data)

        data[f"table_{idx}"] = table_data

    return data


def save_json(data, filename="data.json"):
    """Saves extracted data as a JSON file."""
    with open(filename, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=4)
    print(f"Data saved to {filename}")


if __name__ == "__main__":
    html_content = fetch_data()
    if html_content:
        extracted_data = parse_html(html_content)
        save_json(extracted_data)
