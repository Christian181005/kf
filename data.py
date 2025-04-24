import os
import json
import requests
import urllib.parse

# API-Endpunkte definieren
BASE_URL = "https://www.htl-steyr.ac.at/intern/webuntis/execute.php"
roomURL = f"{BASE_URL}/getRooms"
teacherURL = f"{BASE_URL}/getTeachers"
klassenURL = f"{BASE_URL}/getKlassen"
timetable_base_URL = f"{BASE_URL}/getTimetable"

# Datenordner
DATA_DIR = "entire-API-Data"
os.makedirs(DATA_DIR, exist_ok=True)


def fetch_and_save(start_date="20250407", end_date="20250409"):
    try:
        # Räume
        room_data = requests.get(roomURL).json()
        with open(os.path.join(DATA_DIR, "rooms.json"), "w", encoding="utf-8") as f:
            json.dump(room_data, f, ensure_ascii=False, indent=2)

        # Lehrkräfte
        teacher_data = requests.get(teacherURL).json()
        with open(os.path.join(DATA_DIR, "teachers.json"), "w", encoding="utf-8") as f:
            json.dump(teacher_data, f, ensure_ascii=False, indent=2)

        # Klassen
        klassen_data = requests.get(klassenURL).json()
        with open(os.path.join(DATA_DIR, "classes.json"), "w", encoding="utf-8") as f:
            json.dump(klassen_data, f, ensure_ascii=False, indent=2)

        # Stundenpläne abrufen
        timetable_data = []
        for teacher in teacher_data:
            query = json.dumps({
                "id": teacher["id"],
                "type": "2",
                "startDate": start_date,
                "endDate": end_date
            })
            url = f"{timetable_base_URL}/{urllib.parse.quote(query)}"
            response = requests.get(url)
            if response.ok:
                entries = response.json()
                timetable_data.extend(entries)

        with open(os.path.join(DATA_DIR, "timetable.json"), "w", encoding="utf-8") as f:
            json.dump(timetable_data, f, ensure_ascii=False, indent=2)

        print("Daten erfolgreich heruntergeladen und gespeichert.")

    except requests.exceptions.RequestException as e:
        print("Fehler bei der API-Abfrage:", e)


if __name__ == '__main__':
    fetch_and_save()