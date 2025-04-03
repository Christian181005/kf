import kivy

kivy.require("1.10.0")
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.popup import Popup


class WeekdayGrid(GridLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.cols = 6  # Erste Spalte für Uhrzeiten, dann Montag bis Freitag

        # Wochentage & Zeiträume
        days = ["Uhrzeit", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]
        time_slots = [
            "08:00", "08:50", "09:40", "09:55", "10:45", "11:35",
            "11:40", "12:30", "13:20", "13:25", "14:15",
            "15:05", "15:15", "16:05", "16:55", "17:45"
        ]
        pause_slots = {"09:40", "11:35", "12:30", "13:20", "15:05"}  # Pausenzeiten

        # Klassenliste
        class_names = [
            "1AFMBZ", "2AFMBZ", "3AFMBZ", "4AFMBZ", "1AHME", "1BHME", "2AHME", "2BHME",
            "3AHME", "3BHME", "4AHME", "4BHME", "5AHME", "5BHME", "1YHKUG", "1YHKUJ",
            "1YHKUP", "2YHKUG", "2YHKUJ", "2YHKUP", "3YHKUG", "3YHKUJ", "3YHKUP", "4YHKUG",
            "4YHKUJ", "4YHKUP", "5YHKUG", "5YHKUJ", "5YHKUP", "1AHITN", "2AHITN", "3AHITN",
            "4AHITN", "5AHITN", "1AHEL", "2AHEL", "3AHEL", "4AHEL", "5AHEL", "1AHMBZ", "1BHMBZ",
            "2AHMBZ", "2BHMBZ", "3AHMBZ", "3BHMBZ", "4AHMBZ", "5AHMBZ", "5BHMBZ"
        ]

        self.schedule = {}  # Speichert, welche Klassen in welchem Fototermin sind
        class_index = 0
        fototermin_counter = 1

        # Header-Zeile
        for day in days:
            self.add_widget(Label(text=day, size_hint=(1, 0.3), bold=True))

        # Zeilen mit Uhrzeiten und Fototerminen füllen
        for time in time_slots:
            self.add_widget(Label(text=time, size_hint=(1, 1)))

            if time in pause_slots:
                for _ in range(5):
                    self.add_widget(Label(text="Pause", size_hint=(1, 1)))
                continue

            for day_index in range(1, len(days)):
                if class_index >= len(class_names):
                    self.add_widget(Label(text="", size_hint=(1, 1)))
                    continue

                fototermin_name = f"Fototermin {fototermin_counter}"
                fototermin_classes = []
                start_time = time
                available_time = 50

                while class_index < len(class_names):
                    class_name = class_names[class_index]
                    duration = 15 if class_name.startswith("5") else 10

                    if available_time >= duration:
                        end_time = self.calculate_end_time(start_time, duration)
                        fototermin_classes.append((class_name, start_time, end_time))
                        start_time = end_time
                        available_time -= duration
                        class_index += 1
                    else:
                        break

                self.schedule[fototermin_name] = fototermin_classes
                btn = Button(text=fototermin_name, size_hint=(1, 1))
                btn.bind(on_release=lambda instance, f_name=fototermin_name: self.show_popup(f_name))
                self.add_widget(btn)

                fototermin_counter += 1  # Innerhalb eines Tages hochzählen
                if fototermin_counter > 5:
                    fototermin_counter = 1  # Nach Freitag wieder bei 1 beginnen

    def show_popup(self, fototermin_name):
        content = BoxLayout(orientation="vertical")
        content.add_widget(Label(text=f"{fototermin_name} Details", bold=True))
        for class_name, start_time, end_time in self.schedule[fototermin_name]:
            content.add_widget(Label(text=f"Klasse: {class_name}"))
            content.add_widget(Label(text=f"Uhrzeit: {start_time} - {end_time}"))
        close_btn = Button(text="Schließen")
        content.add_widget(close_btn)
        popup = Popup(title=fototermin_name, content=content, size_hint=(0.6, 0.6))
        close_btn.bind(on_release=popup.dismiss)
        popup.open()

    def calculate_end_time(self, start_time, duration):
        hour, minute = map(int, start_time.split(":"))
        minute += duration
        if minute >= 60:
            hour += 1
            minute -= 60
        return f"{hour:02d}:{minute:02d}"


class WeekdayApp(App):
    def build(self):
        layout = BoxLayout(orientation="vertical")
        layout.add_widget(WeekdayGrid())
        return layout


if __name__ == "__main__":
    WeekdayApp().run()