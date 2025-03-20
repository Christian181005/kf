import pandas as pd
import datetime
import qrcode
from io import BytesIO

# -------------------------------
# Testdaten erzeugen und speichern
# -------------------------------
def create_test_data():
    # Testdaten für Stundenplandaten aus Untis
    timetable_data = {
        'Klasse': ['10AB', '10B', 'Abschluss 11', '10A'],
        'Datum': ['2024-05-10', '2024-05-10', '2024-05-10', '2024-05-11'],
        'Uhrzeit': ['08:00', '09:00', '10:00', '11:00'],
        'Lehrkraft': ['Herr Müller', 'Frau Schmidt', 'Herr Meier', 'Frau Schulze'],
        'Raum_Klasse': ['Raum 101', 'Raum 102', 'Raum 103', 'Raum 101'],
        'Raum_KV': ['Raum 201', 'Raum 202', 'Raum 203', 'Raum 201'],
        'Benachrichtigung': ['ja', 'ja', 'nein', 'ja']
    }
    timetable_df = pd.DataFrame(timetable_data)
    timetable_file = 'timetable.csv'
    timetable_df.to_csv(timetable_file, index=False, sep=';')
    print(f"Testdaten für Stundenplan wurden als {timetable_file} gespeichert.")

    # Testdaten für Lehrkräfte- und Verantwortlichkeitsliste
    teacher_data = {
        'Name': ['Herr Müller', 'Frau Schmidt', 'Herr Meier', 'Frau Schulze', 'Herr Becker'],
        'Rolle': ['KV', 'Lehrer', 'WL', 'KV', 'Lehrer']
    }
    teacher_df = pd.DataFrame(teacher_data)
    teacher_file = 'teacher_info.csv'
    teacher_df.to_csv(teacher_file, index=False, sep=';')
    print(f"Testdaten für Lehrkräfte wurden als {teacher_file} gespeichert.")

# -------------------------------
# Funktionen zur Terminplanung
# -------------------------------
def load_data(timetable_file, teacher_file):
    timetable_df = pd.read_csv(timetable_file, delimiter=';')
    teacher_df = pd.read_csv(teacher_file, delimiter=';')
    return timetable_df, teacher_df

def is_preferred_teacher(lehrkraft, teacher_df):
    preferred_roles = ['KV', 'WL']
    return not teacher_df[(teacher_df['Name'] == lehrkraft) & (teacher_df['Rolle'].isin(preferred_roles))].empty

def calculate_photo_time(row, duration_minutes=10):
    lesson_time = datetime.datetime.strptime(row['Uhrzeit'], '%H:%M')
    if row['preferred']:
        photo_time = lesson_time
    else:
        photo_time = lesson_time + datetime.timedelta(minutes=5)
    if 'Abschluss' in row['Klasse']:
        duration_minutes = 15
    return photo_time.strftime('%H:%M'), duration_minutes

def schedule_class_photos(timetable_df, teacher_df):
    timetable_df['preferred'] = timetable_df['Lehrkraft'].apply(lambda x: is_preferred_teacher(x, teacher_df))
    schedule = []
    for index, row in timetable_df.iterrows():
        photo_time, duration = calculate_photo_time(row)
        entry = {
            'Klasse': row['Klasse'],
            'Datum': row['Datum'],
            'Fototermin': photo_time,
            'Dauer (Min.)': duration,
            'Raum': row['Raum_Klasse'],
            'Lehrkraft': row['Lehrkraft'],
            'Priorität': '1' if row['preferred'] else '2'
        }
        schedule.append(entry)
    schedule_df = pd.DataFrame(schedule)
    return schedule_df

def generate_email_text(schedule_df):
    email_text = ("Liebe Kolleginnen und Kollegen,\n\n"
                  "anbei erhalten Sie die Terminliste für die anstehenden Klassenfotos.\n"
                  "Bitte beachten Sie die folgenden Hinweise:\n"
                  "- Termin: Datum, Uhrzeit und Raum laut angehängter Liste\n"
                  "- Bei Rückfragen wenden Sie sich bitte an die Verwaltung.\n\n"
                  "Viele Grüße\nIhr Fototeam\n\n"
                  "Terminübersicht:\n")
    for _, row in schedule_df.iterrows():
        email_text += (f"{row['Datum']} - Klasse {row['Klasse']} um {row['Fototermin']} in Raum {row['Raum']} "
                       f"(Priorität: {row['Priorität']})\n")
    return email_text

def generate_qr_code(data, filename='qr_bestellung.png'):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill='black', back_color='white')
    img.save(filename)
    print(f"QR-Code gespeichert als {filename}")

# -------------------------------
# Hauptfunktion
# -------------------------------
def main():
    # Erstelle Testdaten
    create_test_data()
    
    # Dateinamen der Testdaten
    timetable_file = 'timetable.csv'
    teacher_file = 'teacher_info.csv'
    
    # Daten laden
    timetable_df, teacher_df = load_data(timetable_file, teacher_file)
    
    # Terminplanung durchführen
    schedule_df = schedule_class_photos(timetable_df, teacher_df)
    
    # Speichern der finalen Terminliste als CSV
    output_csv = 'einteilung_fotos_final.csv'
    schedule_df.to_csv(output_csv, index=False, sep=';')
    print(f"Terminliste wurde als {output_csv} gespeichert.")
    
    # E-Mail Text generieren und speichern
    email_text = generate_email_text(schedule_df)
    with open('email_text.txt', 'w', encoding='utf-8') as f:
        f.write(email_text)
    print("E-Mail Text wurde als email_text.txt gespeichert.")
    
    # QR-Code generieren (Beispiel-Daten)
    bestell_data = "Bestellung Klassenfoto, Termin: siehe Anhang, Klasse: Beispielklasse, KV: Mustermann"
    generate_qr_code(bestell_data)

if __name__ == "__main__":
    main()

