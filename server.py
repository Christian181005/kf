from flask import Flask, request, jsonify, send_from_directory
import os
import json
from flask_cors import CORS  # Hinzugefügt für CORS-Unterstützung

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
    return send_from_directory('html', path)

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
