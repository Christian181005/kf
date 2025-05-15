import json
import re
from pathlib import Path


def format_time(time_int):
    hour = time_int // 100
    minute = time_int % 100
    return f"{hour:02d}:{minute:02d}"


def add_minutes_to_time(time_int, minutes_to_add):
    hour = time_int // 100
    minute = time_int % 100
    total_minutes = minute + minutes_to_add
    new_hour = hour + (total_minutes // 60)
    new_minute = total_minutes % 60
    return new_hour * 100 + new_minute


def normalize_class_name(name):
    if name:
        match = re.match(r'(\d+YHKU)[A-Z]', name)
        if match:
            return match.group(1)
    return name


def find_teacher_room(teacher_name, date, start_time, end_time, te_data):
    if not teacher_name:
        return "Unknown"

    for teacher in te_data:
        if not isinstance(teacher, list):
            continue

        for lesson in teacher:
            if not isinstance(lesson, dict):
                continue

            te = lesson.get("te", {})
            if isinstance(te, dict) and te.get("name") == teacher_name:
                if (lesson.get("date") == date and
                        lesson.get("startTime") <= start_time and
                        end_time <= lesson.get("endTime")):
                    ro = lesson.get("ro", {})
                    if isinstance(ro, dict) and ro.get("name"):
                        return ro.get("name")

    return "Unknown"


with Path("entire-API-Data/data.json").open(encoding="utf-8") as fp:
    data = json.load(fp)

with Path("entire-API-Data/te_data.json").open(encoding="utf-8") as fp:
    te_data = json.load(fp)

combined_classes = {}

for klasse in data:
    class_name = None
    class_kv = None

    for lesson in klasse:
        kl = lesson.get("kl", {})
        if class_name is None:
            class_name = kl.get("name")
        if class_kv is None:
            class_kv = kl.get("teacher1")
        if class_name and class_kv:
            break

    normalized_name = normalize_class_name(class_name)

    if normalized_name not in combined_classes:
        combined_classes[normalized_name] = {
            "name": normalized_name,
            "lessons": [],
            "kv": class_kv
        }

    combined_classes[normalized_name]["lessons"].extend(klasse)

post_alg_data = []
used_timeslots = []
new_klid = 0

for normalized_name, class_data in combined_classes.items():
    new_klid += 1

    if not normalized_name:
        continue

    klassen_data = {
        "name": normalized_name,
        "class_id": new_klid,
        "kv": class_data["kv"],
        "wl": "Can not access required information with API",
        "room_kl": [],
        "room_kv": None,
        "notified_te": [],
        "priority": 2,
        "date": None,
        "start": None,
        "end": None
    }

    photo_time = 15 if (normalized_name and normalized_name.startswith('5')) else 10

    time_assigned = False
    all_possible_slots = []

    for lesson in class_data["lessons"]:
        kl = lesson.get("kl", {})
        ro = lesson.get("ro", {})
        te = lesson.get("te", {})

        te_list = [te] if isinstance(te, dict) else te if isinstance(te, list) else []
        ro_list = [ro] if isinstance(ro, dict) else ro if isinstance(ro, list) else []

        if not te_list or not all(isinstance(t, dict) for t in te_list):
            continue

        photo_date = lesson['date']

        start_time = lesson['startTime']
        end_time = add_minutes_to_time(start_time, photo_time)

        kv_present = any(teacher.get('name') == klassen_data['kv'] for teacher in te_list if isinstance(teacher, dict))

        room_names = [r.get('name') for r in ro_list if isinstance(r, dict) and r.get('name')]
        if not room_names:
            room_names = ["Unknown"]

        teacher_names = [t.get('name') for t in te_list if isinstance(t, dict) and t.get('name')]
        if not teacher_names:
            teacher_names = []

        slot_data = {
            'date': photo_date,
            'start': start_time,
            'end': end_time,
            'priority': 1 if kv_present else 2,
            'rooms': room_names,
            'teachers': teacher_names,
            'timeslot': [photo_date, start_time, end_time]
        }
        all_possible_slots.append(slot_data)

        end_slot_start = add_minutes_to_time(lesson['endTime'], -photo_time)
        end_slot_end = lesson['endTime']

        end_slot_data = {
            'date': photo_date,
            'start': end_slot_start,
            'end': end_slot_end,
            'priority': 1 if kv_present else 2,
            'rooms': room_names,
            'teachers': teacher_names,
            'timeslot': [photo_date, end_slot_start, end_slot_end]
        }
        all_possible_slots.append(end_slot_data)

    sorted_slots = sorted(all_possible_slots, key=lambda x: x['priority'])

    for slot in sorted_slots:
        if slot['timeslot'] not in used_timeslots:
            klassen_data['date'] = slot['date']
            klassen_data['start'] = slot['start']
            klassen_data['end'] = slot['end']
            klassen_data['priority'] = slot['priority']
            klassen_data['room_kl'] = slot['rooms']

            if slot['priority'] == 1:
                klassen_data['room_kv'] = next((room for room in slot['rooms'] if room != "Unknown"), "Unknown")

                klassen_data['notified_te'] = [t for t in slot['teachers'] if t != klassen_data['kv']]
            else:
                kv_room = find_teacher_room(klassen_data['kv'], slot['date'], slot['start'], slot['end'], te_data)
                klassen_data['room_kv'] = kv_room
                klassen_data['notified_te'] = slot['teachers']

            used_timeslots.append(slot['timeslot'])
            time_assigned = True
            break

    if not time_assigned and all_possible_slots:
        max_attempts = 50
        attempt = 0
        base_slot = all_possible_slots[0]

        while attempt < max_attempts and not time_assigned:
            attempt += 1
            offset = attempt * 5

            new_start = add_minutes_to_time(base_slot['start'], offset)
            new_end = add_minutes_to_time(new_start, photo_time)
            new_timeslot = [base_slot['date'], new_start, new_end]

            if new_timeslot not in used_timeslots:
                klassen_data['date'] = base_slot['date']
                klassen_data['start'] = new_start
                klassen_data['end'] = new_end
                klassen_data['priority'] = 3
                klassen_data['room_kl'] = base_slot['rooms']

                kv_room = find_teacher_room(klassen_data['kv'], base_slot['date'], new_start, new_end, te_data)
                klassen_data['room_kv'] = kv_room
                klassen_data['notified_te'] = base_slot['teachers']

                used_timeslots.append(new_timeslot)
                time_assigned = True
                break

    if klassen_data['name'] is not None:
        post_alg_data.append(klassen_data)

json_str = json.dumps(post_alg_data, ensure_ascii=False, indent=2)
json_str = json_str.replace("'", '"')
with open("html/json/output_data.json", "w", encoding="utf-8") as f:
    f.write(json_str)

print(f"File saved correctly. Scheduled {len(post_alg_data)} combined classes.")