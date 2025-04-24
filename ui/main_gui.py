import json
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.popup import Popup
from data.timetable_fetcher import fetch_and_save

def load_class_names(json_path: str) -> list:
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # Alle eindeutigen Klassen-Namen
    names = sorted({e['kl'][0]['name'] for e in data if e.get('kl')})
    return names


class WeekdayColumn(BoxLayout):
    def __init__(self, day, time_slots, pause_slots, class_names, schedule, shared_data, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'vertical'
        self.day = day
        self.time_slots = time_slots
        self.pause_slots = pause_slots
        self.class_names = class_names
        self.schedule = schedule
        self.shared_data = shared_data
        self.build_column()

    def build_column(self):
        for time in self.time_slots:
            if time in self.pause_slots:
                self.add_widget(Label(text='Pause'))
            else:
                idx = self.shared_data['class_index']
                if idx >= len(self.class_names):
                    self.add_widget(Label(text=''))
                    continue

                # Fototermin erzeugen
                classes = []
                remaining = 50
                current = time
                name = f"Fototermin {self.shared_data['fotocount']}"
                while idx < len(self.class_names):
                    cname = self.class_names[idx]
                    dur = 15 if cname.startswith('5') else 10
                    if remaining < dur:
                        break
                    end = self.increment_time(current, dur)
                    classes.append((cname, current, end))
                    remaining -= dur
                    current = end
                    idx += 1

                self.schedule[name] = classes
                btn = Button(text=name)
                btn.bind(on_release=lambda inst, n=name: self.show_popup(n))
                self.add_widget(btn)
                self.shared_data['class_index'] = idx
                self.shared_data['fotocount'] += 1

    def show_popup(self, name):
        content = BoxLayout(orientation='vertical')
        content.add_widget(Label(text=name, bold=True))
        for cls, start, end in self.schedule[name]:
            content.add_widget(Label(text=f"{cls}: {start}-{end}"))
        close = Button(text='Schließen')
        content.add_widget(close)
        popup = Popup(title=name, content=content, size_hint=(0.6, 0.6))
        close.bind(on_release=popup.dismiss)
        popup.open()

    @staticmethod
    def increment_time(timestr: str, minutes: int) -> str:
        h, m = map(int, timestr.split(':'))
        m += minutes
        if m >= 60:
            h += m // 60
            m %= 60
        return f"{h:02d}:{m:02d}"


class WeekdayApp(App):
    def build(self):
        # Daten aktualisieren
        fetch_and_save('20250407', '20250409')
        class_names = load_class_names('entire-API-Data/data.json')

        main = BoxLayout(orientation='vertical')
        header = BoxLayout(orientation='horizontal', size_hint=(1, 0.1))
        header.add_widget(Label(text='Uhrzeit', bold=True))
        for d in ['Mo', 'Di', 'Mi', 'Do', 'Fr']:
            header.add_widget(Label(text=d, bold=True))
        main.add_widget(header)

        times = [
            '08:00','08:50','09:40','09:55','10:45','11:35',
            '11:40','12:30','13:20','13:25','14:15','15:05',
            '15:15','16:05','16:55','17:45'
        ]
        pauses = {'09:40','11:35','12:30','13:20','15:05'}

        content = BoxLayout(orientation='horizontal')
        # Zeitspalte
        times_box = BoxLayout(orientation='vertical', size_hint=(0.2,1))
        for t in times:
            times_box.add_widget(Label(text=t))
        content.add_widget(times_box)

        shared = {'class_index': 0, 'fotocount': 1}
        schedule = {}
        for day in ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag']:
            col = WeekdayColumn(day, times, pauses, class_names, schedule, shared, size_hint=(0.16,1))
            content.add_widget(col)
        main.add_widget(content)
        return main

if __name__ == '__main__':
    WeekdayApp().run()