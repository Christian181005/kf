import requests, urllib.parse, json

roomURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getRooms"
teacherURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getTeachers"
klassenURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getKlassen"
timetable_base_URL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getTimetable"

with open("json-files/timetable.json", "r") as file:
    ttData = json.load(file)  # Convert JSON string to a Python object

try:
    response = requests.get(roomURL)
    response.raise_for_status()
    room_data = response.json()

    response = requests.get(teacherURL)
    response.raise_for_status()
    teacher_data = response.json()

    response = requests.get(klassenURL)
    response.raise_for_status()
    klassen_data = response.json()

    timetable_data = ttData  # Already parsed JSON, no need to load again

    for sublist in timetable_data:
        if isinstance(sublist, list):
            for entry in sublist:
                if isinstance(entry, dict):
                    kl_ids = [kl['id'] for kl in entry.get('kl', [])]
                    te_ids = [te['id'] for te in entry.get('te', [])]
                    ro_ids = [ro['id'] for ro in entry.get('ro', [])]

                    print(f"kl IDs: {kl_ids}, te IDs: {te_ids}, ro IDs: {ro_ids}")

except requests.exceptions.RequestException as e:
    print(":(", e)
