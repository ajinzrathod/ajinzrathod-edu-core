#!/usr/bin/env python3
"""
Script to generate sample school data for testing the timetable app.
This creates a JSON file that can be imported into the frontend.

Usage:
    python generate_sample_data.py > sample_data.json
    # Then import in browser console using the importSchoolData function
"""

import json
from datetime import datetime
import uuid


def generate_id():
    """Generate a unique ID similar to the frontend's generateId()"""
    return f"{int(datetime.now().timestamp() * 1000)}-{str(uuid.uuid4())[:9]}"


def create_sample_data(school_id="1"):
    """Generate complete sample data for a school"""

    # Teachers
    teachers = [
        {
            "id": generate_id(),
            "username": "y_sir",
            "first_name": "Y",
            "last_name": "Sir",
            "email": "y.sir@school.com",
            "user_type": "teacher",
            "school": {"id": 1, "name": "School"}
        },
        {
            "id": generate_id(),
            "username": "x_mam",
            "first_name": "X",
            "last_name": "Mam",
            "email": "x.mam@school.com",
            "user_type": "teacher",
            "school": {"id": 1, "name": "School"}
        },
        {
            "id": generate_id(),
            "username": "dhruvi_mam",
            "first_name": "Dhruvi",
            "last_name": "Mam",
            "email": "dhruvi.mam@school.com",
            "user_type": "teacher",
            "school": {"id": 1, "name": "School"}
        },
        {
            "id": generate_id(),
            "username": "eng_teacher",
            "first_name": "English",
            "last_name": "Teacher",
            "email": "english@school.com",
            "user_type": "teacher",
            "school": {"id": 1, "name": "School"}
        },
    ]

    # Classes
    classes = [
        {"id": generate_id(), "name": "Class 10-A", "grade": "10", "section": "A"},
        {"id": generate_id(), "name": "Class 10-B", "grade": "10", "section": "B"},
        {"id": generate_id(), "name": "Class 9-A", "grade": "9", "section": "A"},
    ]

    # Timetable entries - same schedule for all classes, all days
    days = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    subjects = ["English", "Maths", "Science", "SST"]
    teacher_assignment = [teachers[3], teachers[0], teachers[1], teachers[2]]

    timetable = []
    for cls in classes:
        for day in days:
            for period, (subject, teacher) in enumerate(zip(subjects, teacher_assignment), 1):
                timetable.append({
                    "id": generate_id(),
                    "class_id": cls["id"],
                    "day": day,
                    "period": period,
                    "subject": subject,
                    "teacher_id": teacher["id"],
                })

    # Sample absences (from past week)
    absences = []

    # Sample proxies (empty to start)
    proxies = []

    return {
        "teachers": teachers,
        "classes": classes,
        "timetable": timetable,
        "absences": absences,
        "proxies": proxies,
    }


if __name__ == "__main__":
    data = create_sample_data()
    print(json.dumps(data, indent=2))
