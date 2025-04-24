import urllib

import requests, json

roomURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getRooms"
teacherURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getTeachers"
klassenURL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getKlassen"
timetable_base_URL = "https://www.htl-steyr.ac.at//intern/webuntis/execute.php/getTimetable"


def get_data():
    try:
        # notation: year, month, date
        startDate = "20250407"
        endDate = "20250409"

        response = requests.get(roomURL)
        response.raise_for_status()
        d1 = response.json()
        room_data = d1
        print(room_data)

        response = requests.get(teacherURL)
        response.raise_for_status()
        d2 = response.json()
        teacher_data = d2
        print(teacher_data)

        response = requests.get(klassenURL)
        response.raise_for_status()
        d3 = response.json()
        klassen_data = d3
        print(klassen_data)

        timetable_data = []
        for klasse in klassen_data:
            query_string = f'{{"id":"{klasse["id"]}","type":"1","startDate":"{startDate}","endDate":"{endDate}"}}'
            encoded_query = urllib.parse.quote(query_string)
            url = f"{timetable_base_URL}/{encoded_query}"

            response = requests.get(url)
            response.raise_for_status()
            timetable_data.append(response.json())
        d4 = json.dumps(timetable_data)
        timetable_data = json.loads(d4)

        for sublist in timetable_data:
            if isinstance(sublist, list):
                for entry in sublist:
                    if isinstance(entry, dict):
                        kl_ids = [kl['id'] for kl in entry.get('kl', [])]
                        te_ids = [te['id'] for te in entry.get('te', [])]
                        ro_ids = [ro['id'] for ro in entry.get('ro', [])]
                        for teacher in teacher_data:
                            for te_id in te_ids:
                                if te_id == teacher['id']:
                                    entry['te'] = teacher
                        for room in room_data:
                            for ro_id in ro_ids:
                                if ro_id == room['id']:
                                    entry['ro'] = room
                        for klasse in klassen_data:
                            for kl_id in kl_ids:
                                if kl_id == klasse['id']:
                                    entry['kl'] = klasse
                                    for teacher in teacher_data:
                                       if teacher['id'] == entry['kl']['teacher1']:
                                           entry['kl']['teacher1'] = teacher['name']



        json_str = json.dumps(timetable_data, ensure_ascii=False, indent=2)
        json_str = json_str.replace("'", '"')

        with open("entire-API-Data/data.json", "w", encoding="utf-8") as f:
            f.write(json_str)

        print("file saved correctly (probably)")

    except requests.exceptions.RequestException as e:
        print(":(", e)

if __name__ == "__main__":
    get_data()