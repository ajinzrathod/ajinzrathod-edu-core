#!/usr/bin/env python3
"""
Script to insert sample records into the School Timetable Manager backend.
Make sure your Django backend is running on http://localhost:8000
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api"

# Admin credentials to login
ADMIN_CREDENTIALS = {
    "username": "admin_s1_a1",
    "password": "ajinkya123"
}

class TimetableDataInserter:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.user = None
        self.school_id = None
        
    def login(self, username, password):
        """Login and get access token"""
        print(f"\n📝 Logging in as {username}...")
        
        response = self.session.post(
            f"{self.base_url}/login/",
            json={"username": username, "password": password}
        )
        
        if response.status_code == 200:
            data = response.json()
            # API returns "access" not "access_token"
            self.token = data.get("access")
            self.user = data.get("user")
            # Extract school_id from nested school object
            self.school_id = self.user.get("school", {}).get("id") if self.user else None
            
            # Add token to headers
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            })
            
            print(f"✅ Login successful!")
            print(f"   User: {self.user.get('first_name')} {self.user.get('last_name')}")
            print(f"   School ID: {self.school_id}")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    
    def create_school(self, name, address, phone):
        """Create a new school"""
        print(f"\n🏫 Creating school: {name}...")
        
        response = self.session.post(
            f"{self.base_url}/schools/",
            json={
                "name": name,
                "address": address,
                "phone": phone
            }
        )
        
        if response.status_code in [200, 201]:
            school = response.json()
            print(f"✅ School created: {school.get('id')}")
            return school
        else:
            print(f"❌ Failed to create school: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    
    def create_teacher(self, name, email, phone, subject, available_for_proxy=True):
        """Create a teacher"""
        print(f"   👨‍🏫 Creating teacher: {name}...")
        
        response = self.session.post(
            f"{self.base_url}/schools/{self.school_id}/teachers/",
            json={
                "name": name,
                "email": email,
                "phone": phone,
                "subject": subject,
                "available_for_proxy": available_for_proxy
            }
        )
        
        if response.status_code in [200, 201]:
            teacher = response.json()
            print(f"      ✅ Teacher created: {teacher.get('id')}")
            return teacher
        else:
            print(f"      ❌ Failed: {response.status_code}")
            print(f"         Response: {response.text}")
            return None
    
    def create_class(self, name, grade, section):
        """Create a class"""
        print(f"   📚 Creating class: {name}...")
        
        response = self.session.post(
            f"{self.base_url}/schools/{self.school_id}/classes/",
            json={
                "name": name,
                "grade": grade,
                "section": section
            }
        )
        
        if response.status_code in [200, 201]:
            class_obj = response.json()
            print(f"      ✅ Class created: {class_obj.get('id')}")
            return class_obj
        else:
            print(f"      ❌ Failed: {response.status_code}")
            print(f"         Response: {response.text}")
            return None
    
    def create_timetable_slot(self, class_id, teacher_id, day, start_time, end_time, subject):
        """Create a timetable slot"""
        print(f"      ⏰ Adding {day} {start_time}-{end_time}: {subject}...")
        
        response = self.session.post(
            f"{self.base_url}/schools/{self.school_id}/timetables/",
            json={
                "class_id": class_id,
                "teacher_id": teacher_id,
                "day": day,
                "start_time": start_time,
                "end_time": end_time,
                "subject": subject
            }
        )
        
        if response.status_code in [200, 201]:
            slot = response.json()
            print(f"         ✅ Slot created")
            return slot
        else:
            # Don't print error for each slot, just silent fail
            return None
    
    def create_proxy_record(self, original_teacher_id, proxy_teacher_id, class_id, date, reason, status="pending"):
        """Create a proxy record"""
        print(f"   🔄 Creating proxy record...")
        
        response = self.session.post(
            f"{self.base_url}/schools/{self.school_id}/proxy-records/",
            json={
                "original_teacher_id": original_teacher_id,
                "proxy_teacher_id": proxy_teacher_id,
                "class_id": class_id,
                "date": date,
                "reason": reason,
                "status": status
            }
        )
        
        if response.status_code in [200, 201]:
            proxy = response.json()
            print(f"      ✅ Proxy created: {proxy.get('id')}")
            return proxy
        else:
            print(f"      ❌ Failed: {response.status_code}")
            print(f"         Response: {response.text}")
            return None
    
    def insert_sample_data(self):
        """Insert all sample data"""
        print("\n" + "="*60)
        print("🎓 SCHOOL TIMETABLE - SAMPLE DATA INSERTION")
        print("="*60)
        
        # Create teachers
        print("\n📚 Creating Teachers:")
        teachers = []
        teacher_data = [
            ("Mr. John Smith", "john.smith@school.com", "9876543210", "Mathematics", True),
            ("Ms. Sarah Johnson", "sarah.johnson@school.com", "9876543211", "English", True),
            ("Mr. David Brown", "david.brown@school.com", "9876543212", "Science", True),
            ("Ms. Emily Davis", "emily.davis@school.com", "9876543213", "History", False),
            ("Mr. Robert Wilson", "robert.wilson@school.com", "9876543214", "Computer Science", True),
        ]
        
        for name, email, phone, subject, available in teacher_data:
            teacher = self.create_teacher(name, email, phone, subject, available)
            if teacher:
                teachers.append(teacher)
        
        if not teachers:
            print("❌ No teachers created. Cannot proceed.")
            return
        
        # Create classes
        print("\n📚 Creating Classes:")
        classes = []
        class_data = [
            ("Class 10A", "10", "A"),
            ("Class 10B", "10", "B"),
            ("Class 9A", "9", "A"),
        ]
        
        for name, grade, section in class_data:
            class_obj = self.create_class(name, grade, section)
            if class_obj:
                classes.append(class_obj)
        
        if not classes:
            print("❌ No classes created. Cannot proceed.")
            return
        
        # Create timetable slots
        print("\n📅 Creating Timetable Slots:")
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        
        for class_obj in classes:
            print(f"\n   Class: {class_obj.get('name')}")
            class_id = class_obj.get('id')
            
            # 5 slots per day, 5 days = 25 slots per class
            for day in days:
                time_slots = [
                    ("09:00", "10:00"),
                    ("10:00", "11:00"),
                    ("11:00", "12:00"),
                    ("12:00", "13:00"),
                    ("13:00", "14:00"),
                ]
                
                for i, (start, end) in enumerate(time_slots):
                    teacher = teachers[i % len(teachers)]
                    subject = teacher.get('subject')
                    teacher_id = teacher.get('id')
                    
                    self.create_timetable_slot(
                        class_id,
                        teacher_id,
                        day,
                        start,
                        end,
                        subject
                    )
        
        # Create proxy records
        print("\n🔄 Creating Proxy Records:")
        
        # Generate dates for next 30 days
        today = datetime.now().date()
        
        proxy_data = [
            (0, 1, "Medical Leave"),
            (1, 2, "Conference"),
            (2, 0, "Training"),
            (3, 4, "Personal Leave"),
            (0, 2, "Jury Duty"),
        ]
        
        for i, (original_idx, proxy_idx, reason) in enumerate(proxy_data):
            if original_idx < len(teachers) and proxy_idx < len(teachers) and classes:
                date = today + timedelta(days=i+1)
                self.create_proxy_record(
                    original_teacher_id=teachers[original_idx].get('id'),
                    proxy_teacher_id=teachers[proxy_idx].get('id'),
                    class_id=classes[0].get('id'),
                    date=str(date),
                    reason=reason,
                    status="pending"
                )
        
        print("\n" + "="*60)
        print("✅ Sample data insertion completed!")
        print("="*60)
        print(f"\nCreated:")
        print(f"  • {len(teachers)} Teachers")
        print(f"  • {len(classes)} Classes")
        print(f"  • {len(classes) * len(days) * 5} Timetable Slots")
        print(f"  • {len(proxy_data)} Proxy Records")
        print("\n🚀 You can now login with your credentials and see the data!")

def main():
    """Main entry point"""
    import sys
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/schools/", timeout=2)
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Django backend is not running!")
        print(f"   Make sure your backend is running on {BASE_URL}")
        sys.exit(1)
    
    # Initialize inserter
    inserter = TimetableDataInserter()
    
    # Login
    if not inserter.login(ADMIN_CREDENTIALS["username"], ADMIN_CREDENTIALS["password"]):
        print("❌ Could not login. Exiting.")
        sys.exit(1)
    
    # Insert sample data
    inserter.insert_sample_data()

if __name__ == "__main__":
    main()
