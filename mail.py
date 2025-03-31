import webbrowser
import urllib.parse

# E-Mail Text als String direkt im Code definiert
email_body = (
    "Liebe Kolleginnen und Kollegen,\n\n"
    "anbei erhalten Sie die Terminliste für die anstehenden Klassenfotos.\n"
    "Bitte beachten Sie die folgenden Hinweise:\n"
    "- Termin: Datum, Uhrzeit und Raum laut angehängter Liste\n"
    "- Bei Rückfragen wenden Sie sich bitte an die Verwaltung.\n\n"
    "Viele Grüße\nIhr Fototeam\n\n"
    "Terminübersicht:\n"
    "2024-05-10 - Klasse 1000A um 08:00 in Raum Raum 101 (Priorität: 1)\n"
    "2024-05-10 - Klasse 10B um 09:00 in Raum Raum 102 (Priorität: 1)\n"
    "2024-05-10 - Klasse Abschluss 11 um 10:00 in Raum Raum 103 (Priorität: 2)\n"
    "2024-05-11 - Klasse 10A um 11:00 in Raum Raum 101 (Priorität: 1)\n"
)

# Betreff der E-Mail
subject = "Terminliste für Klassenfotos"

# Erstelle den mailto-Link mit URL-Encoding
mailto_link = f"mailto:?subject={urllib.parse.quote(subject)}&body={urllib.parse.quote(email_body)}"

# Öffnet das Standard-Mailprogramm mit der vorgefertigten E-Mail
webbrowser.open(mailto_link)
