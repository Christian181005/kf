import qrcode

# Termindaten direkt im Code definiert
schedule_text = (
    "Termine für Klassenfotos:\n\n"
    "2024-05-10 - Klasse 1000A um 08:00 in Raum Raum 101 (Priorität: 1)\n"
    "2024-05-10 - Klasse 10B um 09:00 in Raum Raum 102 (Priorität: 1)\n"
    "2024-05-10 - Klasse Abschluss 11 um 10:00 in Raum Raum 103 (Priorität: 2)\n"
    "2024-05-11 - Klasse 10A um 11:00 in Raum Raum 101 (Priorität: 1)\n"
)

# QR-Code erzeugen
qr = qrcode.QRCode(version=1, box_size=10, border=5)
qr.add_data(schedule_text)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")

# QR-Code als Bild speichern
qr_filename = 'termine_qr.png'
img.save(qr_filename)
print(f"QR-Code gespeichert als {qr_filename}")
