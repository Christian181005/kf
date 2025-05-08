import json
from pathlib import Path


def format_time(time_int):
    """Format integer time like 955 -> 09:55"""
    hour = time_int // 100
    minute = time_int % 100
    return f"{hour:02d}:{minute:02d}"


def add_minutes_to_time(time_int, minutes_to_add):
    """Add minutes to a time integer and handle hour overflow properly.

    Example: 955 (9:55) + 15 minutes = 1010 (10:10)
    """
    hour = time_int // 100
    minute = time_int % 100

    # Add minutes and handle overflow
    total_minutes = minute + minutes_to_add
    new_hour = hour + (total_minutes // 60)
    new_minute = total_minutes % 60

    # Return new time in the same format
    return new_hour * 100 + new_minute


with Path("entire-API-Data/data.json").open(encoding="utf-8") as fp:
    data = json.load(fp)

with Path("entire-API-Data/te_data.json").open(encoding="utf-8") as fp:
    te_data = json.load(fp)

post_alg_data = []
klid = 0

used_timeslots = []

for klasse in data:
    klid += 1
    klassen_data = {
        "name": None,
        "class_id": None,
        "kv": None,
        "wl": "Can not access required information with API",
        "room_kl": None,
        "room_kv": None,
        "notified_te": None,
        "priority": 2,
        "date": None,
        "time": None
    }

    for lesson in klasse:
        photo_time = 10
        slot_found = False
        kl = lesson.get("kl", {})
        ro = lesson.get("ro", {})
        te = lesson.get("te", {})

        te_list = [te] if isinstance(te, dict) else te
        ro_list = [ro] if isinstance(ro, dict) else ro

        if klassen_data['name'] is None:
            klassen_data['name'] = kl.get("name")
        if klassen_data['class_id'] is None:
            klassen_data['class_id'] = klid
        if klassen_data['kv'] is None:
            klassen_data['kv'] = kl.get("teacher1")

        if klassen_data['name'].startswith('5'):
            photo_time = 15

        photo_date = lesson['date']
        start_time = lesson['startTime']
        end_time = add_minutes_to_time(start_time, photo_time)

        if klassen_data['date'] is None and klassen_data['time'] is None and lesson['endTime'] <= 1405:
            if [photo_date, start_time, end_time, kl['name']] in used_timeslots:
                start_time = add_minutes_to_time(lesson['endTime'], -photo_time)
                end_time = lesson['endTime']
            if [photo_date, start_time, end_time, kl['name']] in used_timeslots:
                break

            found_kv = False
            for teacher in te_list:
                if teacher.get('name') == klassen_data['kv']:
                    klassen_data['priority'] = 1
                    for room in ro_list:
                        klassen_data['room_kv'] = room.get('name')
                        break
                    found_kv = True
                    break

            if not found_kv and te_list:
                klassen_data['notified_te'] = te_list[0].get('name')

            klassen_data['date'] = f"{photo_date}"
            klassen_data['time'] = f"{format_time(start_time)}-{format_time(end_time)}"

            if ro_list:
                klassen_data['room_kl'] = ro_list[0].get('name')

            used_timeslots.append([photo_date, start_time, end_time, kl['name']])

        if klassen_data['priority'] == 2:
            for teacher in te_list:
                if kl.get('teacher1') == teacher.get('name'):
                    print(f"KV unterrichtet die {klassen_data['name']}")
                    if [photo_date, start_time, end_time, kl['name']] in used_timeslots:
                        start_time = add_minutes_to_time(lesson['endTime'], -photo_time)
                        end_time = lesson['endTime']
                    if [photo_date, start_time, end_time, kl['name']] in used_timeslots:
                        break

                    new_slots = [entry for entry in used_timeslots if entry[3] != kl['name']]
                    new_slots.append([photo_date, start_time, end_time, kl['name']])
                    used_timeslots = new_slots
                    klassen_data['date'] = f"{photo_date}"
                    klassen_data['time'] = f"{format_time(start_time)}-{format_time(end_time)}"
                    klassen_data['priority'] = 1
                    if ro_list:
                        klassen_data['room_kl'] = ro_list[0].get('name')
                        klassen_data['room_kv'] = ro_list[0].get('name')

                    klassen_data['notified_te'] = None

    if klassen_data['name'] is not None:
        post_alg_data.append(klassen_data)

json_str = json.dumps(post_alg_data, ensure_ascii=False, indent=2)
json_str = json_str.replace("'", '"')
with open("entire-API-Data/output_data.json", "w", encoding="utf-8") as f:
    f.write(json_str)

print("file saved correctly (probably)")