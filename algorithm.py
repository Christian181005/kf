import json
from pathlib import Path
from data import startDate, endDate
from datetime import datetime

with Path("entire-API-Data/data.json").open(encoding="utf-8") as fp:
    data = json.load(fp)

post_alg_data = []
klid = 0

date_format = "%Y%m%d"
start_dt = datetime.strptime(startDate, date_format).date()
end_dt = datetime.strptime(endDate, date_format).date()
days = (end_dt - start_dt).days + 2

for klasse in data:
    klid += 1
    klassen_data = {"name": None,
                    "class_id": None,
                    "kv": None,
                    "wl": "Can not access required information with API",
                    "room_kl": None,
                    "room_kv": None,
                    "notified_te": None,
                    "priority": 2
                    }
    for i in range(1, days + 1):
        klassen_data[f"nr{i}"] = None
        klassen_data[f"d{i}"] = None
    for lesson in klasse:
        kl = lesson.get("kl", {})
        ro = lesson.get("ro", {})
        print(ro)
        if klassen_data['name'] is None:
            klassen_data['name'] = kl.get("name")
        if klassen_data['class_id'] is None:
            klassen_data['class_id'] = klid
        if klassen_data['kv'] is None:
            klassen_data['kv'] = kl.get("teacher1")
        if klassen_data['room_kl'] is None:
            pass
            # klassen_data['room_kl'] = ro['name']


        teacher1_id = kl.get("teacher1")
        teachers = lesson.get("te", []) or []
        if isinstance(teachers, dict):
            teachers = [teachers]

        if lesson['endTime'] < 1415:
            for teacher in teachers:
                if teacher.get("name") == teacher1_id and klassen_data['priority'] != 1:
                    klassen_data['priority'] = 1
                    klassen_data['d1'] = f"{lesson['startTime']} - {lesson['endTime']}"

    post_alg_data.append(klassen_data)

json_str = json.dumps(post_alg_data, ensure_ascii=False, indent=2)
json_str = json_str.replace("'", '"')
with open("entire-API-Data/output_data.json", "w", encoding="utf-8") as f:
    f.write(json_str)

print("file saved correctly (probably)")
