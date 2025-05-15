from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS, cross_origin  # Hinzugefügt für CORS-Unterstützung

import os
import json
import subprocess
import threading



app = Flask(__name__)

# CORS aktivieren
CORS(app)

# Pfad zur JSON-Datei
JSON_PATH = os.path.join('html', 'json', 'output_data.json')

@app.route('/')
def serve_index():
    return send_from_directory('html', 'index.html')  # Verwende 'index.html', nicht 'html/index.html'

@app.route('/<path:path>')
def serve_static(path):
    if path.startswith("api/"):
        return "Not Found", 404

    return send_from_directory('html', path)

@app.route('/api/generate_schedule', methods=['POST'])
def generate_schedule():
    try:
        # Funktion zum Ausführen der Skripte in einem separaten Thread
        def run_scripts():
            try:
                # data.py ausführen
                subprocess.run(['python', 'data.py'], check=True)
                # algorithm.py ausführen, wenn data.py erfolgreich war
                subprocess.run(['python', 'algorithm.py'], check=True)
            except subprocess.CalledProcessError as e:
                print(f"Fehler beim Ausführen der Skripte: {e}")

        # Starte die Skripte in einem neuen Thread, um den HTTP-Request nicht zu blockieren
        thread = threading.Thread(target=run_scripts)
        thread.start()



        return jsonify({"success": True, "message": "Automatische Terminplanung wurde gestartet."})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/save_data', methods=['POST'])
def save_data():
    try:
        data = request.json

        # Speichere die Daten in der JSON-Datei
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return jsonify({"success": True, "message": "Daten erfolgreich gespeichert"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/archive_data', methods=['POST'])
def archive_data():
    try:
        CURRENT_FILE = 'html/json/output_data.json'
        ARCHIVE_FILE = 'html/json/archive.json'

        # Die ausgewählten Klassen werden von der Anfrage erwartet
        selected_classes = request.json.get('selectedClasses', [])

        if not selected_classes:
            return jsonify({"success": False, "message": "Keine Klassen zum Archivieren angegeben."}), 400

        # Aktuelle Daten laden
        with open(CURRENT_FILE, 'r', encoding='utf-8') as f:
            current_data = json.load(f)

        # Archiv-Daten laden
        with open(ARCHIVE_FILE, 'r', encoding='utf-8') as f:
            archive_data = json.load(f)

        # Filtere die zu archivierenden Daten basierend auf den ausgewählten Klassen
        to_archive = [item for item in current_data if item['class'] in selected_classes]
        remaining = [item for item in current_data if item['class'] not in selected_classes]

        # Kombiniere die archivierten Daten mit den bestehenden Archiv-Daten
        updated_archive = archive_data + to_archive

        # Speichere die verbleibenden Daten (aktualisiertes `output_data.json`)
        with open(CURRENT_FILE, 'w', encoding='utf-8') as f:
            json.dump(remaining, f, indent=2, ensure_ascii=False)

        # Speichere die archivierten Daten (aktualisiertes `archive.json`)
        with open(ARCHIVE_FILE, 'w', encoding='utf-8') as f:
            json.dump(updated_archive, f, indent=2, ensure_ascii=False)

        return jsonify({"success": True, "message": f"{len(to_archive)} Termine archiviert."})

    except Exception as e:
        return jsonify({"success": False, "message": f"Fehler beim Archivieren: {str(e)}"}), 500

@app.route('/api/add_appointment', methods=['POST'])
@cross_origin()
def add_appointment():
    data = request.get_json()

    # Pfad zur JSON-Datei
    json_path = JSON_PATH

    # Bestehende Daten laden
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except json.JSONDecodeError:
                existing_data = []
    else:
        existing_data = []

    # Neuen Termin hinzufügen
    existing_data.append(data)

    # Zurückschreiben
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

    return jsonify({"message": "Termin gespeichert"}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
