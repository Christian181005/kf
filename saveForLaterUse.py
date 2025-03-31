timetable_data = ttData
# for teacher in teacher_data:
#     query_string = f'{{"id":"{teacher["id"]}","type":"2"}}'
#     encoded_query = urllib.parse.quote(query_string)
#     url = f"{timetable_base_URL}/{encoded_query}"
#
#     response = requests.get(url)
#     response.raise_for_status()
#     timetable_data.append(response.json())