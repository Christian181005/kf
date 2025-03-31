import os
import requests
import json
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Union

username = os.getenv("WEBUNTIS_USERNAME")
password = os.getenv("WEBUNTIS_PASSWORD")




class WebUntis:
    def __init__(self, base_url: str, school: str, username: str, password: str):
        self.base_url = base_url.rstrip('/')
        self.school = school
        self.username = username
        self.password = password
        self.session_id = None
        self.headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'HTL-Steyr-Klassenfotos/1.0'
        }

    def _request(self, method: str, params: Dict = None) -> Dict:
        """Internal method to make JSON-RPC requests"""
        payload = {
            "id": str(datetime.now().timestamp()),
            "method": method,
            "params": params or {},
            "jsonrpc": "2.0"
        }

        url = f"{self.base_url}/execute.php/{method}"
        if method == "authenticate":
            url = f"{self.base_url}/execute.php?school={self.school}"

        try:
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            data = response.json()

            if 'error' in data:
                raise Exception(f"API Error: {data['error']}")
            return data.get('result', {})
        except Exception as e:
            raise Exception(f"Request failed: {str(e)}")

    def authenticate(self) -> bool:
        """Authenticate and start session"""
        params = {
            "user": self.username,
            "password": self.password,
            "client": "HTL-Steyr-Klassenfotos"
        }
        result = self._request("authenticate", params)

        if 'sessionId' in result:
            self.session_id = result['sessionId']
            # Set session cookie for subsequent requests
            self.headers['Cookie'] = f'JSESSIONID={self.session_id}'
            return True
        return False

    def logout(self) -> bool:
        """End the current session"""
        if not self.session_id:
            return True

        result = self._request("logout")
        self.session_id = None
        return True

    # Basic data retrieval methods
    def get_teachers(self) -> List[Dict]:
        """Get list of all teachers"""
        return self._request("getTeachers")

    def get_students(self) -> List[Dict]:
        """Get list of all students"""
        return self._request("getStudents")

    def get_classes(self, schoolyear_id: Optional[int] = None) -> List[Dict]:
        """Get list of classes"""
        params = {}
        if schoolyear_id:
            params["schoolyearId"] = schoolyear_id
        return self._request("getKlassen", params)

    def get_subjects(self) -> List[Dict]:
        """Get list of subjects"""
        return self._request("getSubjects")

    def get_rooms(self) -> List[Dict]:
        """Get list of rooms"""
        return self._request("getRooms")

    def get_departments(self) -> List[Dict]:
        """Get list of departments"""
        return self._request("getDepartments")

    def get_holidays(self) -> List[Dict]:
        """Get list of holidays"""
        return self._request("getHolidays")

    def get_timegrid(self) -> List[Dict]:
        """Get the timegrid structure"""
        return self._request("getTimegridUnits")

    def get_status_data(self) -> Dict:
        """Get lesson types and status codes"""
        return self._request("getStatusData")

    def get_current_schoolyear(self) -> Dict:
        """Get current schoolyear data"""
        return self._request("getCurrentSchoolyear")

    def get_schoolyears(self) -> List[Dict]:
        """Get list of all schoolyears"""
        return self._request("getSchoolyears")

    # Timetable methods
    def get_timetable(self, element_id: int, element_type: int,
                      start_date: Optional[str] = None,
                      end_date: Optional[str] = None) -> List[Dict]:
        """
        Get timetable (simple version)

        element_type:
            1 = klasse, 2 = teacher, 3 = subject, 4 = room, 5 = student
        """
        params = {
            "id": element_id,
            "type": element_type
        }

        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date

        return self._request("getTimetable", params)

    def get_timetable_extended(self, element_id: Union[int, str], element_type: int,
                               key_type: str = "id", start_date: Optional[str] = None,
                               end_date: Optional[str] = None, show_info: bool = False,
                               show_subst_text: bool = False, show_ls_text: bool = False,
                               show_ls_number: bool = False, show_studentgroup: bool = False,
                               klasse_fields: Optional[List[str]] = None,
                               teacher_fields: Optional[List[str]] = None,
                               subject_fields: Optional[List[str]] = None,
                               room_fields: Optional[List[str]] = None) -> List[Dict]:
        """
        Get timetable (extended customizable version)
        """
        options = {
            "element": {
                "id": element_id,
                "type": element_type,
                "keyType": key_type
            },
            "showInfo": show_info,
            "showSubstText": show_subst_text,
            "showLsText": show_ls_text,
            "showLsNumber": show_ls_number,
            "showStudentgroup": show_studentgroup
        }

        if start_date:
            options["startDate"] = start_date
        if end_date:
            options["endDate"] = end_date
        if klasse_fields:
            options["klasseFields"] = klasse_fields
        if teacher_fields:
            options["teacherFields"] = teacher_fields
        if subject_fields:
            options["subjectFields"] = subject_fields
        if room_fields:
            options["roomFields"] = room_fields

        return self._request("getTimetable", {"options": options})

    # Other methods
    def get_latest_import_time(self) -> int:
        """Get timestamp of last data import"""
        return self._request("getLatestImportTime")

    def get_person_id(self, person_type: int, surname: str,
                      forename: str, birthdate: int = 0) -> int:
        """
        Search for person ID by name

        person_type: 2 = teacher, 5 = student
        birthdate: Use 0 if unknown (format: YYYYMMDD)
        """
        params = {
            "type": person_type,
            "sn": surname,
            "fn": forename,
            "dob": birthdate
        }
        return self._request("getPersonId", params)

    def get_substitutions(self, start_date: str, end_date: str,
                          department_id: int = 0) -> List[Dict]:
        """Get substitutions for date range"""
        params = {
            "startDate": start_date,
            "endDate": end_date,
            "departmentId": department_id
        }
        return self._request("getSubstitutions", params)

    def get_classreg_events(self, start_date: str, end_date: str) -> List[Dict]:
        """Get class register events"""
        params = {
            "startDate": start_date,
            "endDate": end_date
        }
        return self._request("getClassregEvents", params)

    def get_exams(self, exam_type_id: int, start_date: str, end_date: str) -> List[Dict]:
        """Get exams for date range"""
        params = {
            "examTypeId": exam_type_id,
            "startDate": start_date,
            "endDate": end_date
        }
        return self._request("getExams", params)

    def get_exam_types(self) -> List[Dict]:
        """Get list of exam types"""
        return self._request("getExamTypes")

    # Utility methods
    @staticmethod
    def parse_untis_date(date_int: int) -> datetime:
        """Convert WebUntis date (YYYYMMDD) to datetime"""
        date_str = str(date_int)
        return datetime.strptime(date_str, '%Y%m%d')

    @staticmethod
    def parse_untis_time(time_int: int) -> time:
        """Convert WebUntis time (HHMM) to time object"""
        time_str = f"{time_int:04d}"
        return datetime.strptime(time_str, '%H%M').time()

    @staticmethod
    def format_date_for_untis(date: datetime) -> str:
        """Convert datetime to WebUntis date format (YYYYMMDD)"""
        return date.strftime('%Y%m%d')


# Example usage
if __name__ == "__main__":
    # Configuration - replace with your actual credentials
    config = {
        "base_url": "https://www.htl-steyr.ac.at/intern/webuntis",
        "school": "HTL Steyr",
        "username": "your_username",
        "password": "your_password"
    }

    # Initialize API
    untis = WebUntis(
        base_url=config["base_url"],
        school=config["school"],
        username=config["username"],
        password=config["password"]
    )

    try:
        # Authenticate
        if not untis.authenticate():
            print("❌ Authentication failed")
            exit(1)
        print("✅ Authentication successful")

        # Example: Get all classes
        classes = untis.get_classes()
        print(f"Found {len(classes)} classes:")
        for cls in classes[:5]:  # Print first 5 classes
            print(f"- {cls['name']} ({cls['longName']})")

        # Example: Get timetable for first class
        if classes:
            class_id = classes[0]['id']
            timetable = untis.get_timetable(
                element_id=class_id,
                element_type=1,  # 1 = class
                start_date="20250301",
                end_date="20250307"
            )
            print(f"\nTimetable for {classes[0]['name']}:")
            for lesson in timetable[:3]:  # Print first 3 lessons
                date = untis.parse_untis_date(lesson['date'])
                start = untis.parse_untis_time(lesson['startTime'])
                end = untis.parse_untis_time(lesson['endTime'])
                print(f"- {date.strftime('%a %d.%m.')} {start}-{end}")

        # Example: Get teachers
        teachers = untis.get_teachers()
        print(f"\nFound {len(teachers)} teachers")

        # Example: Get current schoolyear
        schoolyear = untis.get_current_schoolyear()
        print(f"\nCurrent schoolyear: {schoolyear['name']}")

    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        # Always logout when done
        untis.logout()
        print("\nLogged out")