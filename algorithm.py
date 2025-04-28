import json
from pathlib import Path
from data import startDate, endDate
from datetime import datetime


def format_time(time_int):
    """Format integer time like 955 -> 09:55"""
    hour = time_int // 100
    minute = time_int % 100
    return f"{hour:02d}:{minute:02d}"


with Path("entire-API-Data/data.json").open(encoding="utf-8") as fp:
    data = json.load(fp)

post_alg_data = []
klid = 0

date_format = "%Y%m%d"
start_dt = datetime.strptime(startDate, date_format).date()
end_dt = datetime.strptime(endDate, date_format).date()
days = (end_dt - start_dt).days + 2

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
        "priority": 2
    }

    for i in range(1, days + 1):
        klassen_data[f"nr{i}"] = None
        klassen_data[f"d{i}"] = None

    lessons_by_date = []

    for lesson in klasse:
        kl = lesson.get("kl", {})
        ro = lesson.get("ro", {})

        if klassen_data['name'] is None:
            klassen_data['name'] = kl.get("name")
        if klassen_data['class_id'] is None:
            klassen_data['class_id'] = klid
        if klassen_data['kv'] is None:
            klassen_data['kv'] = kl.get("teacher1")
        if klassen_data['room_kl'] is None:
            if isinstance(ro, dict):
                klassen_data['room_kl'] = ro.get("name")
            elif isinstance(ro, list) and ro and isinstance(ro[0], dict):
                klassen_data['room_kl'] = ro[0].get("name")

        lessons_by_date.append(lesson)

    class_name = klassen_data['name'] or ""
    if class_name.startswith("5"):
        photo_duration = 15
    else:
        photo_duration = 10

    found_slot = False
    photo_date = None
    photo_start_time = None
    photo_end_time = None

    lessons_grouped = {}
    for lesson in lessons_by_date:
        lessons_grouped.setdefault(lesson["date"], []).append(lesson)

    for date, lessons in sorted(lessons_grouped.items()):
        lessons_sorted = sorted(lessons, key=lambda x: x["startTime"])

        for lesson in lessons_sorted:
            teacher1_id = klassen_data['kv']
            teachers = lesson.get("te", [])
            if isinstance(teachers, dict):
                teachers = [teachers]

            for teacher in teachers:
                if teacher.get("name") == teacher1_id:
                    if lesson['endTime'] <= 1415:
                        tentative_start = lesson['startTime']
                        tentative_end = lesson['endTime']
                        if (date, tentative_start, tentative_end) not in used_timeslots:
                            klassen_data['priority'] = 1
                            photo_date = date
                            photo_start_time = tentative_start
                            photo_end_time = tentative_end
                            used_timeslots.append((date, photo_start_time, photo_end_time))
                            found_slot = True
                            break
            if found_slot:
                break

        if found_slot:
            break

        first_lesson = lessons_sorted[0]
        last_lesson = lessons_sorted[-1]

        tentative_start = 800
        tentative_end = tentative_start + photo_duration
        if first_lesson['startTime'] >= tentative_end and tentative_end <= 1415:
            if (date, tentative_start, tentative_end) not in used_timeslots:
                klassen_data['priority'] = 2
                photo_date = date
                photo_start_time = tentative_start
                photo_end_time = tentative_end
                used_timeslots.append((date, photo_start_time, photo_end_time))
                found_slot = True

        if not found_slot and last_lesson['endTime'] + photo_duration <= 1415:
            tentative_start = last_lesson['endTime']
            tentative_end = tentative_start + photo_duration
            if (date, tentative_start, tentative_end) not in used_timeslots:
                klassen_data['priority'] = 2
                photo_date = date
                photo_start_time = tentative_start
                photo_end_time = tentative_end
                used_timeslots.append((date, photo_start_time, photo_end_time))
                found_slot = True

        if not found_slot:
            for i in range(len(lessons_sorted) - 1):
                end_current = lessons_sorted[i]['endTime']
                start_next = lessons_sorted[i + 1]['startTime']
                if (start_next - end_current) >= photo_duration and (end_current + photo_duration) <= 1415:
                    tentative_start = end_current
                    tentative_end = tentative_start + photo_duration
                    if (date, tentative_start, tentative_end) not in used_timeslots:
                        klassen_data['priority'] = 2
                        photo_date = date
                        photo_start_time = tentative_start
                        photo_end_time = tentative_end
                        used_timeslots.append((date, photo_start_time, photo_end_time))
                        notified_teacher = lessons_sorted[i].get("te", {})
                        if isinstance(notified_teacher, list) and notified_teacher:
                            notified_teacher = notified_teacher[0]
                        if isinstance(notified_teacher, dict):
                            klassen_data['notified_te'] = notified_teacher.get("name")
                        found_slot = True
                        break
        if found_slot:
            break

    if found_slot:
        klassen_data['d1'] = str(photo_date)
        klassen_data['nr1'] = f"{format_time(photo_start_time)} - {format_time(photo_end_time)}"

        if klassen_data['priority'] == 1:
            klassen_data['room_kv'] = klassen_data['room_kl']
        else:
            kv_name = klassen_data['kv']
            kv_room = None
            for lesson in lessons_by_date:
                if lesson["date"] != photo_date:
                    continue

                teachers = lesson.get("te", [])
                if isinstance(teachers, dict):
                    teachers = [teachers]

                for teacher in teachers:
                    if teacher.get("name") == kv_name:
                        lesson_start = lesson["startTime"]
                        lesson_end = lesson["endTime"]
                        if lesson_start <= photo_start_time < lesson_end:
                            ro = lesson.get("ro", {})
                            if isinstance(ro, dict):
                                kv_room = ro.get("name")
                            elif isinstance(ro, list) and ro and isinstance(ro[0], dict):
                                kv_room = ro[0].get("name")
                            break
                if kv_room:
                    break

            klassen_data['room_kv'] = kv_room

    post_alg_data.append(klassen_data)

json_str = json.dumps(post_alg_data, ensure_ascii=False, indent=2)
json_str = json_str.replace("'", '"')
with open("entire-API-Data/output_data.json", "w", encoding="utf-8") as f:
    f.write(json_str)

print("file saved correctly (probably)")
