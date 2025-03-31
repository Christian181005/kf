import requests, urllib.parse, json

roomURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getRooms"
teacherURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getTeachers"
klassenURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getKlassen"
timetable_base_URL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getTimetable"

# with open("json-files/timetable.json", "r") as file:
#     ttData = json.load(file)

try:
    import requests
    import json

    response = requests.get(roomURL)
    response.raise_for_status()
    d1 = response.json()
    room_data = json.dumps(d1)
    print(room_data)

    response = requests.get(teacherURL)
    response.raise_for_status()
    d2 = response.json()
    teacher_data = json.dumps(d2)
    print(teacher_data)

    response = requests.get(klassenURL)
    response.raise_for_status()
    d3 = response.json()
    klassen_data = json.dumps(d3)
    print(klassen_data)

    timetable_data = []
    for teacher in teacher_data:
        query_string = f'{{"id":"{teacher["id"]}","type":"2"}}'
        encoded_query = urllib.parse.quote(query_string)
        url = f"{timetable_base_URL}/{encoded_query}"

        response = requests.get(url)
        response.raise_for_status()
        timetable_data.append(response.json())

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
