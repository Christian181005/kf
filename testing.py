import requests
import json
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import pytz
import logging
from typing import List, Dict, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WebUntisAPI:
    def __init__(self, school: str, server: str, username: str, password: str):
        self.school = school
        self.server = server
        self.username = username
        self.password = password
        self.session_id = None
        self.base_url = f"https://{self.server}/WebUntis/jsonrpc.do?school={self.school}"
        self.headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Klassenfotos-Scheduler/1.0'
        }

    def authenticate(self) -> bool:
        """Authenticate with WebUntis and store session ID"""
        payload = {
            "id": "1",
            "method": "authenticate",
            "params": {
                "user": self.username,
                "password": self.password,
                "client": "Klassenfotos"
            },
            "jsonrpc": "2.0"
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            data = response.json()

            if 'result' in data and 'sessionId' in data['result']:
                self.session_id = data['result']['sessionId']
                self.headers['Cookie'] = f'JSESSIONID={self.session_id}'
                logger.info("Authentication successful")
                return True
            else:
                logger.error("Authentication failed: Invalid response")
                return False

        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            return False

    def logout(self) -> bool:
        """End the WebUntis session"""
        if not self.session_id:
            return True

        payload = {
            "id": "2",
            "method": "logout",
            "params": {},
            "jsonrpc": "2.0"
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            self.session_id = None
            logger.info("Logout successful")
            return True
        except Exception as e:
            logger.error(f"Logout failed: {str(e)}")
            return False

    def get_teachers(self) -> List[Dict]:
        """Get list of all teachers"""
        payload = {
            "id": "3",
            "method": "getTeachers",
            "params": {},
            "jsonrpc": "2.0"
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get('result', [])
        except Exception as e:
            logger.error(f"Failed to get teachers: {str(e)}")
            return []

    def get_classes(self) -> List[Dict]:
        """Get list of all classes"""
        payload = {
            "id": "4",
            "method": "getKlassen",
            "params": {},
            "jsonrpc": "2.0"
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get('result', [])
        except Exception as e:
            logger.error(f"Failed to get classes: {str(e)}")
            return []

    def get_timetable(self, element_id: int, element_type: int,
                      start_date: Optional[str] = None,
                      end_date: Optional[str] = None) -> List[Dict]:
        """
        Get timetable for an element (class, teacher, etc.)

        Args:
            element_id: ID of the element
            element_type: 1=class, 2=teacher, 3=subject, 4=room, 5=student
            start_date: Optional start date in YYYYMMDD format
            end_date: Optional end date in YYYYMMDD format
        """
        params = {
            "id": element_id,
            "type": element_type
        }

        if start_date and end_date:
            params["startDate"] = start_date
            params["endDate"] = end_date

        payload = {
            "id": "5",
            "method": "getTimetable",
            "params": params,
            "jsonrpc": "2.0"
        }

        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get('result', [])
        except Exception as e:
            logger.error(f"Failed to get timetable: {str(e)}")
            return []


class KlassenfotosScheduler:
    def __init__(self, api: WebUntisAPI):
        self.api = api
        self.timezone = pytz.timezone('Europe/Vienna')
        self.photo_duration_regular = 10  # minutes
        self.photo_duration_final = 15  # minutes for final year classes

    def is_final_year_class(self, class_name: str) -> bool:
        """Check if class is a final year class (e.g., 5AHITM)"""
        return class_name.startswith(('5', '4'))  # Adjust based on your school's class naming

    def find_photo_time(self, class_info: Dict, timetable: List[Dict],
                        kv_id: Optional[int] = None, wl_id: Optional[int] = None) -> Optional[Dict]:
        """
        Find suitable time for class photo based on priority rules

        Priority 1: When KV or WL is teaching the class
        Priority 2: Start or end of teaching blocks
        """
        class_id = class_info['id']
        is_final_year = self.is_final_year_class(class_info['name'])
        duration = self.photo_duration_final if is_final_year else self.photo_duration_regular

        # Convert timetable to more usable format
        lessons = []
        for lesson in timetable:
            date_str = str(lesson['date'])
            date = datetime.strptime(date_str, '%Y%m%d').date()
            start_time = self.parse_time(lesson['startTime'])
            end_time = self.parse_time(lesson['endTime'])

            lessons.append({
                'date': date,
                'start': start_time,
                'end': end_time,
                'teachers': [t['id'] for t in lesson.get('te', [])],
                'rooms': [r['id'] for r in lesson.get('ro', [])]
            })

        # Sort lessons by date and time
        lessons.sort(key=lambda x: (x['date'], x['start']))

        # Priority 1: Check for lessons with KV or WL
        if kv_id or wl_id:
            for lesson in lessons:
                if (kv_id and kv_id in lesson['teachers']) or (wl_id and wl_id in lesson['teachers']):
                    # Try to schedule at lesson start
                    photo_time = {
                        'date': lesson['date'],
                        'start': lesson['start'],
                        'end': (datetime.combine(lesson['date'], lesson['start']) +
                                timedelta(minutes=duration)).time(),
                        'room': lesson['rooms'][0] if lesson['rooms'] else None,
                        'reason': 'KV/WL teaching'
                    }
                    return photo_time

        # Priority 2: Find gaps at start or end of day
        # Group lessons by date
        lessons_by_date = {}
        for lesson in lessons:
            if lesson['date'] not in lessons_by_date:
                lessons_by_date[lesson['date']] = []
            lessons_by_date[lesson['date']].append(lesson)

        # Check each day for suitable times
        for date, daily_lessons in lessons_by_date.items():
            if not daily_lessons:
                continue

            # Check before first lesson
            first_lesson = min(daily_lessons, key=lambda x: x['start'])
            school_start = datetime.strptime('07:30', '%H:%M').time()  # Adjust based on school
            if (datetime.combine(date, first_lesson['start']) -
                    datetime.combine(date, school_start) >=
                    timedelta(minutes=duration)):
                photo_time = {
                    'date': date,
                    'start': school_start,
                    'end': (datetime.combine(date, school_start) +
                            timedelta(minutes=duration)).time(),
                    'room': first_lesson['rooms'][0] if first_lesson['rooms'] else None,
                    'reason': 'Before first lesson'
                }
                return photo_time

            # Check after last lesson
            last_lesson = max(daily_lessons, key=lambda x: x['end'])
            school_end = datetime.strptime('17:00', '%H:%M').time()  # Adjust based on school
            if (datetime.combine(date, school_end) -
                    datetime.combine(date, last_lesson['end']) >=
                    timedelta(minutes=duration)):
                photo_time = {
                    'date': date,
                    'start': last_lesson['end'],
                    'end': (datetime.combine(date, last_lesson['end']) +
                            timedelta(minutes=duration)).time(),
                    'room': last_lesson['rooms'][0] if last_lesson['rooms'] else None,
                    'reason': 'After last lesson'
                }
                return photo_time

        # If no suitable time found
        return None

    def parse_time(self, time_int: int):
        """Convert WebUntis time integer (HHMM) to time object"""
        time_str = f"{time_int:04d}"
        return datetime.strptime(time_str, '%H%M').time()

    def generate_schedule(self, start_date: str, end_date: str) -> List[Dict]:
        """Generate photo schedule for all classes"""
        if not self.api.authenticate():
            raise Exception("Failed to authenticate with WebUntis")

        try:
            # Get all teachers and classes
            teachers = self.api.get_teachers()
            classes = self.api.get_classes()

            if not teachers or not classes:
                raise Exception("Failed to fetch required data from WebUntis")

            # Create mapping of teacher names to IDs (you'll need to adjust this based on your KV/WL identification)
            teacher_map = {t['name']: t['id'] for t in teachers}

            # For demo, let's assume KV is the first teacher in the list
            # In real implementation, you'd need proper KV/WL identification
            kv_id = teachers[0]['id'] if teachers else None
            wl_id = teachers[1]['id'] if len(teachers) > 1 else None

            schedule = []

            for class_info in classes:
                class_id = class_info['id']
                class_name = class_info['name']

                # Get timetable for this class
                timetable = self.api.get_timetable(
                    element_id=class_id,
                    element_type=1,  # 1 = class
                    start_date=start_date,
                    end_date=end_date
                )

                if not timetable:
                    logger.warning(f"No timetable found for class {class_name}")
                    continue

                # Find suitable photo time
                photo_time = self.find_photo_time(class_info, timetable, kv_id, wl_id)

                if photo_time:
                    schedule.append({
                        'class_id': class_id,
                        'class_name': class_name,
                        'date': photo_time['date'].strftime('%Y-%m-%d'),
                        'start_time': photo_time['start'].strftime('%H:%M'),
                        'end_time': photo_time['end'].strftime('%H:%M'),
                        'room_id': photo_time['room'],
                        'reason': photo_time['reason'],
                        'is_final_year': self.is_final_year_class(class_name)
                    })
                else:
                    logger.warning(f"Could not find suitable time for class {class_name}")

            return schedule

        finally:
            self.api.logout()


class EmailNotifier:
    def __init__(self, smtp_server: str, smtp_port: int,
                 sender_email: str, sender_password: str):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.sender_email = sender_email
        self.sender_password = sender_password

    def send_schedule_email(self, recipient: str, schedule: List[Dict],
                            start_date: str, end_date: str):
        """Send the generated schedule via email"""
        # Create email content
        subject = f"Klassenfotos Schedule {start_date} to {end_date}"

        # Create HTML content
        html = f"""<html>
        <body>
            <h1>Klassenfotos Schedule</h1>
            <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
            <p>Period: {start_date} to {end_date}</p>

            <table border="1">
                <tr>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Room</th>
                    <th>Scheduled Because</th>
                </tr>
        """

        for item in schedule:
            duration = "15 min" if item['is_final_year'] else "10 min"
            html += f"""
                <tr>
                    <td>{item['class_name']}</td>
                    <td>{item['date']}</td>
                    <td>{item['start_time']} - {item['end_time']}</td>
                    <td>{duration}</td>
                    <td>{item.get('room_id', 'TBD')}</td>
                    <td>{item['reason']}</td>
                </tr>
            """

        html += """
            </table>
            <p>Please review the schedule and make any necessary adjustments.</p>
        </body>
        </html>
        """

        # Create message
        msg = MIMEMultipart()
        msg['From'] = self.sender_email
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(html, 'html'))

        # Send email
        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            logger.info(f"Email sent successfully to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False


def main():
    # Configuration - replace with your actual credentials
    config = {
        'webuntis': {
            'school': 'HTL Steyr',
            'server': 'www.htl-steyr.ac.at',
            'username': 'your_username',
            'password': 'your_password'
        },
        'email': {
            'smtp_server': 'smtp.yourserver.com',
            'smtp_port': 587,
            'sender_email': 'noreply@yourschool.ac.at',
            'sender_password': 'your_email_password',
            'recipient': 'admin@yourschool.ac.at'
        },
        'schedule': {
            'start_date': '20250301',  # YYYYMMDD
            'end_date': '20250331'  # YYYYMMDD
        }
    }

    try:
        # Initialize WebUntis API
        api = WebUntisAPI(
            school=config['webuntis']['school'],
            server=config['webuntis']['server'],
            username=config['webuntis']['username'],
            password=config['webuntis']['password']
        )

        # Initialize scheduler
        scheduler = KlassenfotosScheduler(api)

        # Generate schedule
        logger.info(f"Generating schedule from {config['schedule']['start_date']} to {config['schedule']['end_date']}")
        schedule = scheduler.generate_schedule(
            start_date=config['schedule']['start_date'],
            end_date=config['schedule']['end_date']
        )

        if not schedule:
            logger.error("No schedule generated - check for errors")
            return

        logger.info(f"Generated schedule for {len(schedule)} classes")

        # Initialize email notifier
        notifier = EmailNotifier(
            smtp_server=config['email']['smtp_server'],
            smtp_port=config['email']['smtp_port'],
            sender_email=config['email']['sender_email'],
            sender_password=config['email']['sender_password']
        )

        # Send email with schedule
        notifier.send_schedule_email(
            recipient=config['email']['recipient'],
            schedule=schedule,
            start_date=config['schedule']['start_date'],
            end_date=config['schedule']['end_date']
        )

        logger.info("Process completed successfully")

    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")


if __name__ == "__main__":
    main()