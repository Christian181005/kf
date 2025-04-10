import kivy

kivy.require("1.10.0")
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.popup import Popup
from data import get_data


class WeekdayColumn(BoxLayout):
    def __init__(self, day, time_slots, pause_slots, class_names, schedule, shared_data, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'vertical'
        self.day = day
        self.time_slots = time_slots
        self.pause_slots = pause_slots
        self.class_names = class_names
        self.schedule = schedule
        self.shared_data = shared_data  # Gemeinsamer Klassenindex
        self.fototermin_counter = 1
        self.build_column()

    def build_column(self):
        for time in self.time_slots:
            if time in self.pause_slots:
                self.add_widget(Label(text="Pause"))
            else:
                if self.shared_data["class_index"] >= len(self.class_names):
                    self.add_widget(Label(text=""))
                    continue

                # Button-Text: "Fototermin 1", "Fototermin 2", ...
                fototermin_name = f"Fototermin {self.fototermin_counter}"
                fototermin_classes = []
                start_time = time
                available_time = 50  # Zeitfenster pro Slot

                while self.shared_data["class_index"] < len(self.class_names):
                    class_name = self.class_names[self.shared_data["class_index"]]
                    # Klassen, die mit "5" beginnen, bekommen 15 Min, sonst 10 Min
                    duration = 15 if class_name.startswith("5") else 10
                    if available_time >= duration:
                        end_time = self.calculate_end_time(start_time, duration)
                        fototermin_classes.append((class_name, start_time, end_time))
                        start_time = end_time
                        available_time -= duration
                        self.shared_data["class_index"] += 1
                    else:
                        break

                self.schedule[fototermin_name] = fototermin_classes
                btn = Button(text=fototermin_name)
                btn.bind(on_release=lambda instance, f_name=fototermin_name: self.show_popup(f_name))
                self.add_widget(btn)
                self.fototermin_counter += 1

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
        main_layout = BoxLayout(orientation="vertical")

        data = get_data()


        # Kopfzeile: Uhrzeit + Wochentage
        header = BoxLayout(orientation="horizontal", size_hint=(1, 0.1))
        header.add_widget(Label(text="Uhrzeit", bold=True))
        days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"]
        for day in days:
            header.add_widget(Label(text=day, bold=True))
        main_layout.add_widget(header)

        # Hauptlayout: linke Spalte mit Zeiten und dann die Spalten für die Tage
        content = BoxLayout(orientation="horizontal")
        # Definition der Zeit-Slots und Pausen
        time_slots = [
            "08:00", "08:50", "09:40", "09:55", "10:45", "11:35",
            "11:40", "12:30", "13:20", "13:25", "14:15",
            "15:05", "15:15", "16:05", "16:55", "17:45"
        ]
        pause_slots = {"09:40", "11:35", "12:30", "13:20", "15:05"}

        # Linke Spalte: Uhrzeiten
        times_box = BoxLayout(orientation="vertical", size_hint=(0.2, 1))
        for time in time_slots:
            times_box.add_widget(Label(text=time))
        content.add_widget(times_box)

        # Klassenliste
        class_names = [
            "1AFMBZ", "2AFMBZ", "3AFMBZ", "4AFMBZ", "1AHME", "1BHME", "2AHME", "2BHME",
            "3AHME", "3BHME", "4AHME", "4BHME", "5AHME", "5BHME", "1YHKUG", "1YHKUJ",
            "1YHKUP", "2YHKUG", "2YHKUJ", "2YHKUP", "3YHKUG", "3YHKUJ", "3YHKUP", "4YHKUG",
            "4YHKUJ", "4YHKUP", "5YHKUG", "5YHKUJ", "5YHKUP", "1AHITN", "2AHITN", "3AHITN",
            "4AHITN", "5AHITN", "1AHEL", "2AHEL", "3AHEL", "4AHEL", "5AHEL", "1AHMBZ", "1BHMBZ",
            "2AHMBZ", "2BHMBZ", "3AHMBZ", "3BHMBZ", "4AHMBZ", "5AHMBZ", "5BHMBZ"
        ]



        # Gemeinsamer Speicher für den Klassenindex
        shared_data = {"class_index": 0}
        schedule = {}  # Hier werden alle Fototermine samt Details gespeichert

        # Für jeden Wochentag wird eine Spalte erzeugt
        for day in days:
            column = WeekdayColumn(
                day, time_slots, pause_slots, class_names, schedule, shared_data,
                size_hint=(0.16, 1)
            )
            content.add_widget(column)

        main_layout.add_widget(content)
        return main_layout


if __name__ == '__main__':
    # App starten
    WeekdayApp().run()

