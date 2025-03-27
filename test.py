import json
import requests
import pandas as pd
import datetime
import qrcode
from io import BytesIO
import os
import logging

# Konfiguration
logging.basicConfig(level=logging.INFO)
WEBUNTIS_BASE_URL = "https://www.htl-steyr.ac.at/intern/webuntis/execute.php"
KV_DEPARTMENT_IDS = [34]  # Anpassen nach tatsächlichen KV-DIDs
WL_DEPARTMENT_IDS = [35]  # Anpassen nach tatsächlichen WL-DIDs


# -------------------------------
# WebUntis Datenabfrage
# -------------------------------
def fetch_webuntis_teachers():
    """Holt Lehrerliste von WebUntis"""
    url = f"{WEBUNTIS_BASE_URL}/getTeachers"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Fehler beim Abrufen der Lehrer: {e}")
        return []


def fetch_webuntis_timetable(class_id):
    """Holt Stundenplan für eine Klasse"""
    params = json.dumps({"id": str(class_id), "type": 2})
    url = f"{WEBUNTIS_BASE_URL}/getTimeTable/{params}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Fehler beim Abrufen des Stundenplans für Klasse {class_id}: {e}")
        return []


def transform_teacher_data(teachers):
    """Transformiert Rohdaten in DataFrame"""
    transformed = []
    for teacher in teachers:
        transformed.append({
            'id': teacher['id'],
            'Name': f"{teacher['title']} {teacher['longName']}",
            'dids': [d['id'] for d in teacher.get('dids', [])]
        })
    return pd.DataFrame(transformed)


def transform_timetable_data(timetable):
    """Transformiert Stundenplandaten"""
    transformed = []
    for entry in timetable:
        date = datetime.datetime.fromtimestamp(entry['date'] / 1000).strftime('%Y-%m-%d')
        start = datetime.datetime.fromtimestamp(entry['startTime'] / 1000).strftime('%H:%M')
        end = datetime.datetime.fromtimestamp(entry['endTime'] / 1000).strftime('%H:%M')

        transformed.append({
            'Klasse': entry.get('className', ''),
            'Datum': date,
            'Startzeit': start,
            'Endzeit': end,
            'Lehrkräfte': ', '.join([str(t.get('id', '')) for t in entry.get('teachers', [])]),
            'Raum': entry.get('rooms', [''])[0]
        })
    return pd.DataFrame(transformed)


# -------------------------------
# Terminplanungslogik
# -------------------------------
def is_preferred_teacher(teacher_id, teachers_df):
    """Prüft ob Lehrer KV/WL ist"""
    teacher = teachers_df[teachers_df['id'] == teacher_id]
    if not teacher.empty:
        dids = teacher.iloc[0]['dids']
        return any(d in KV_DEPARTMENT_IDS + WL_DEPARTMENT_IDS for d in dids)
    return False


def find_best_slot(timetable_df, teachers_df, klasse):
    """Findet den besten Termin für Klassenfotos"""
    preferred_slots = []
    other_slots = []

    for _, lesson in timetable_df.iterrows():
        teachers = [int(t) for t in lesson['Lehrkräfte'].split(', ') if t]
        preferred = any(is_preferred_teacher(t, teachers_df) for t in teachers)

        slot = {
            'Datum': lesson['Datum'],
            'Start': lesson['Startzeit'],
            'Ende': lesson['Endzeit'],
            'Raum': lesson['Raum'],
            'Priorität': 1 if preferred else 2
        }

        if preferred:
            preferred_slots.append(slot)
        else:
            other_slots.append(slot)

    # Priorisierte Slots zuerst
    return preferred_slots + other_slots


# -------------------------------
# Ausgabegenerierung
# -------------------------------
def generate_schedule(slots, klasse):
    """Erstellt den Fototerminplan"""
    schedule = []
    duration = 15 if 'Abschluss' in klasse else 10

    for slot in slots[:1]:  # Nimm den ersten passenden Slot
        schedule.append({
            'Klasse': klasse,
            'Datum': slot['Datum'],
            'Zeit': slot['Start'],
            'Dauer': duration,
            'Raum': slot['Raum'],
            'Priorität': slot['Priorität']
        })

    return pd.DataFrame(schedule)


def generate_email_content(schedule_df):
    """Generiert E-Mail Text mit Terminliste"""
    email_text = """Sehr geehrte Lehrkräfte,

im Anhang finden Sie die Terminliste für die Klassenfotos:

"""
    for _, row in schedule_df.iterrows():
        email_text += f"{row['Datum']} {row['Zeit']} - Klasse {row['Klasse']} ({row['Dauer']} Min.) in {row['Raum']}\n"

    email_text += "\nBitte beachten Sie die Termine!\n\nFreundliche Grüße\nFototeam"
    return email_text


# -------------------------------
# Hauptprogramm
# -------------------------------
def main():
    # Daten abrufen
    teachers = fetch_webuntis_teachers()
    teachers_df = transform_teacher_data(teachers)

    # Beispielklassen (in Produktion alle Klassen holen)
    sample_classes = ['10A', '11B', 'Abschluss 12C']

    all_schedules = []

    for klasse in sample_classes:
        # Stundenplan für Klasse holen
        timetable = fetch_webuntis_timetable(523)  # ID muss angepasst werden
        timetable_df = transform_timetable_data(timetable)

        # Terminplanung
        slots = find_best_slot(timetable_df, teachers_df, klasse)
        class_schedule = generate_schedule(slots, klasse)
        all_schedules.append(class_schedule)

    # Gesamtplan erstellen
    final_schedule = pd.concat(all_schedules)
    final_schedule.to_excel('Klassenfoto_Plan.xlsx', index=False)

    # E-Mail generieren
    email_text = generate_email_content(final_schedule)
    with open('Email_Versand.txt', 'w') as f:
        f.write(email_text)

    logging.info("Planung erfolgreich abgeschlossen!")


if __name__ == "__main__":
    main()