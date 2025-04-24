import json
from collections import defaultdict


def load_data(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_kv_wl_ids(teachers_data):
    """Extrahiert IDs von Klassenvorständen und Werkstättenleitern."""
    kv_wl_ids = set()
    for teacher in teachers_data:
        if 'name' in teacher and any(tag in teacher['name'].lower() for tag in ['kv', 'wl']):
            kv_wl_ids.add(teacher['id'])
    return kv_wl_ids


def is_priority_teacher(entry, kv_wl_ids):
    return any(teacher['id'] in kv_wl_ids for teacher in entry.get('te', []))


def is_block_start_or_end(entry, day_entries):
    times = sorted([(e['startTime'], e['endTime']) for e in day_entries])
    return entry['startTime'] == times[0][0] or entry['endTime'] == times[-1][1]


def plan_fototermine(data, kv_wl_ids):
    class_schedule = defaultdict(list)
    for entry in data:
        for klass in entry.get('kl', []):
            class_schedule[klass['name']].append(entry)

    fototermine = []
    for klasse, entries in class_schedule.items():
        preferred = None
        fallback = None

        for entry in entries:
            if is_priority_teacher(entry, kv_wl_ids):
                preferred = entry
                break
            elif is_block_start_or_end(entry, entries):
                fallback = fallback or entry

        chosen = preferred or fallback
        if not chosen:
            continue

        start = chosen['startTime']
        duration = 15 if klasse.startswith("5") else 10
        hour = int(start[:2])
        minute = int(start[2:]) + duration
        if minute >= 60:
            hour += 1
            minute -= 60
        end = f"{hour:02d}{minute:02d}"

        fototermine.append({
            'klasse': klasse,
            'date': chosen['date'],
            'startTime': start,
            'endTime': end,
            'priority': bool(preferred),
            'room': chosen.get('ro', [{}])[0].get('name', '-')
        })

    return fototermine


def save_fototermine(fototermine, output_path):
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(fototermine, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    raw_data = load_data('entire-API-Data/data.json')
    teachers_data = load_data('entire-API-Data/teachers.json')  # Lehrer separat speichern!
    kv_wl_ids = extract_kv_wl_ids(teachers_data)

    termine = plan_fototermine(raw_data, kv_wl_ids)
    save_fototermine(termine, 'entire-API-Data/fototermine.json')
    print("Fototermine geplant und gespeichert.")
