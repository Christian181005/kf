import json
from pathlib import Path

with Path("entire-API-Data/data.json").open(encoding="utf-8") as fp:
    data = json.load(fp)

post_alg_data = []
klid = 0
for klasse in data:
    klid += 1
    klassen_data = []
    for lesson in klasse:
        kl = lesson.get("kl", {})
        if not klassen_data:
            klassen_data.append({"name": kl.get("name")})
            klassen_data.append({"class_id": klid})

            klassen_data.append({"KV": kl.get('teacher1')})

        teacher1_id = kl.get("teacher1")
        teachers = lesson.get("te", []) or []
        if isinstance(teachers, dict):
            teachers = [teachers]

        for teacher in teachers:
            if teacher.get("name") == teacher1_id:
                print(f"KV unterrichtet grad! am {lesson.get('date')}")
    print(klassen_data)
    post_alg_data.append(klassen_data)
