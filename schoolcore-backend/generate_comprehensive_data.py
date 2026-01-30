"""
Comprehensive Data Generation Script
- 2 Schools with 2 admins each
- 3 Academic Years: 2023-24, 2024-25, 2025-26
- 2023-24: 10 students, 20 classes
- 2024-25: 10 students, 20 classes
- 2025-26: 50 students, 25 classes
- Students tracked across years (same user, different student IDs per year)
- Optimized with bulk operations and progress tracking
- Indian holidays (15 per year)
- Varied attendance rates: 60-80%, 80-90%, 95-100%
- Weekends on Sundays (0)
- Dates: June 1 - March 31 range per year
"""

import os
import django
from datetime import datetime, timedelta, date
from random import randint, choice, random as rand_float
import random
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'schoolcore.settings')
django.setup()

from django.contrib.auth import get_user_model
from records.models import School, AcademicYear, ClassRoom, Student, Attendance, Holiday
from django.db.models import Count

User = get_user_model()

# Indian Names
FIRST_NAMES = [
    'Aarav', 'Aditya', 'Arjun', 'Rohan', 'Vikram', 'Priya', 'Anjali', 'Pooja',
    'Neha', 'Deepa', 'Raj', 'Ravi', 'Sandeep', 'Suresh', 'Ramesh', 'Bhavna',
    'Divya', 'Geeta', 'Harini', 'Ishita', 'Jaya', 'Kavya', 'Lalit', 'Manoj',
    'Nikhil', 'Omkar', 'Pankaj', 'Rahul', 'Sameer', 'Tarun', 'Uday', 'Varun'
]

LAST_NAMES = [
    'Sharma', 'Kumar', 'Singh', 'Patel', 'Gupta', 'Verma', 'Joshi', 'Rao',
    'Desai', 'Nair', 'Iyer', 'Reddy', 'Srivastava', 'Mishra', 'Tripathi', 'Chatterjee'
]

# Indian Holidays for Academic Year (covering June 2023 to April 2024 pattern)
INDIAN_HOLIDAYS = [
    ('2023-06-29', 'Eid ul-Adha'),
    ('2023-07-03', 'Muharram'),
    ('2023-08-15', 'Independence Day'),
    ('2023-08-30', 'Janmashtami'),
    ('2023-09-28', 'Dussehra'),
    ('2023-10-24', 'Diwali'),
    ('2023-10-25', 'Diwali - Day 2'),
    ('2023-11-13', 'Guru Nanak Jayanti'),
    ('2023-11-27', 'Thanksgiving (Optional)'),
    ('2023-12-25', 'Christmas'),
    ('2024-01-26', 'Republic Day'),
    ('2024-03-08', 'Maha Shivaratri'),
    ('2024-03-25', 'Holi'),
    ('2024-03-29', 'Good Friday'),
    ('2024-04-11', 'Eid ul-Fitr'),
]

HOLIDAY_DATES_BY_YEAR = {
    '2023-24': [
        ('06-29', 'Eid ul-Adha'),
        ('07-03', 'Muharram'),
        ('08-15', 'Independence Day'),
        ('08-30', 'Janmashtami'),
        ('09-28', 'Dussehra'),
        ('10-24', 'Diwali'),
        ('10-25', 'Diwali - Day 2'),
        ('11-13', 'Guru Nanak Jayanti'),
        ('11-27', 'Thanksgiving'),
        ('12-25', 'Christmas'),
        ('01-26', 'Republic Day'),
        ('03-08', 'Maha Shivaratri'),
        ('03-25', 'Holi'),
        ('03-29', 'Good Friday'),
        ('04-11', 'Eid ul-Fitr'),
    ],
    '2024-25': [
        ('06-28', 'Eid ul-Adha'),
        ('07-02', 'Muharram'),
        ('08-15', 'Independence Day'),
        ('08-18', 'Janmashtami'),
        ('10-02', 'Gandhi Jayanti'),
        ('10-12', 'Dussehra'),
        ('10-31', 'Diwali'),
        ('11-01', 'Diwali - Day 2'),
        ('11-15', 'Guru Nanak Jayanti'),
        ('12-25', 'Christmas'),
        ('01-26', 'Republic Day'),
        ('02-26', 'Maha Shivaratri'),
        ('03-14', 'Holi'),
        ('03-20', 'Mahavir Jayanti'),
        ('03-21', 'Good Friday'),
    ],
    '2025-26': [
        ('06-30', 'Eid ul-Adha'),
        ('07-06', 'Muharram'),
        ('08-15', 'Independence Day'),
        ('08-26', 'Janmashtami'),
        ('09-24', 'Dussehra'),
        ('10-20', 'Diwali'),
        ('10-21', 'Diwali - Day 2'),
        ('11-15', 'Guru Nanak Jayanti'),
        ('11-26', 'Thanksgiving'),
        ('12-25', 'Christmas'),
        ('01-26', 'Republic Day'),
        ('03-04', 'Maha Shivaratri'),
        ('03-21', 'Holi'),
        ('03-29', 'Good Friday'),
        ('04-02', 'Eid ul-Fitr'),
    ]
}


def clear_all_data():
    """Clear all data except superusers."""
    print("\n🗑️  CLEARING EXISTING DATA...\n")

    print("  ⏳ Deleting attendance records...")
    count, _ = Attendance.objects.all().delete()
    print(f"  ✅ Deleted {count:,} attendance records")

    print("  ⏳ Deleting students...")
    count, _ = Student.objects.all().delete()
    print(f"  ✅ Deleted {count:,} students")

    print("  ⏳ Deleting classrooms...")
    count, _ = ClassRoom.objects.all().delete()
    print(f"  ✅ Deleted {count:,} classrooms")

    print("  ⏳ Deleting holidays...")
    count, _ = Holiday.objects.all().delete()
    print(f"  ✅ Deleted {count:,} holidays")

    print("  ⏳ Deleting academic years...")
    count, _ = AcademicYear.objects.all().delete()
    print(f"  ✅ Deleted {count:,} academic years")

    print("  ⏳ Deleting schools...")
    count, _ = School.objects.all().delete()
    print(f"  ✅ Deleted {count:,} schools")

    print("  ⏳ Deleting non-superuser users...")
    superusers = User.objects.filter(is_superuser=True)
    count, _ = User.objects.exclude(id__in=superusers).delete()
    print(f"  ✅ Deleted {count:,} users (kept superusers)")

    print("\n✅ All data cleared!\n")


def create_schools_and_admins():
    """Create 2 schools with 2 admins each."""
    print("📚 Creating 2 schools with 2 admins each...\n")

    schools = []
    for school_num in range(1, 3):
        school = School.objects.create(name=f'School {school_num}')
        schools.append(school)

        # Create 2 admins per school
        for admin_num in range(1, 3):
            first_name = choice(FIRST_NAMES)
            last_name = choice(LAST_NAMES)
            username = f'admin_s{school_num}_a{admin_num}'.lower()

            User.objects.create_user(
                username=username,
                password='admin123',
                first_name=first_name,
                last_name=last_name,
                email=f'{username}@school.com',
                user_type='admin',
                school=school
            )
            print(f"  ✅ Admin {admin_num} for {school.name}: {username}")

    print()
    return schools


def create_academic_years(schools):
    """Create 3 academic years for each school."""
    print("📅 Creating 3 academic years per school...\n")

    years_by_school = {}
    year_names = ['2023-24', '2024-25', '2025-26']

    for school in schools:
        years_by_school[school.id] = []
        for year_name in year_names:
            is_current = (year_name == '2025-26')
            ay = AcademicYear.objects.create(
                school=school,
                year=year_name,
                is_current=is_current
            )
            years_by_school[school.id].append(ay)
            print(f"  ✅ {year_name} created for {school.name}")

    print()
    return years_by_school


def create_classrooms_and_holidays(schools, years_by_school):
    """Create classrooms and holidays."""
    print("🏫 Creating classrooms and holidays...\n")

    classrooms_by_year = {}
    total_classrooms = 0

    # Year -> number of classes mapping
    year_class_mapping = {
        '2023-24': 15,
        '2024-25': 15,
        '2025-26': 15
    }

    for school in schools:
        print(f"  📍 {school.name}:")
        school_years = years_by_school[school.id]

        for year in school_years:
            num_classes = year_class_mapping[year.year]
            classrooms_by_year[year.id] = []

            print(f"    📚 {year.year}: Creating {num_classes} classrooms...", end=" ", flush=True)

            classroom_batch = []
            for class_num in range(1, num_classes + 1):
                start_month = randint(6, 6)  # June
                start_day = randint(1, 30)
                end_month = randint(3, 4)  # March or April
                end_day = randint(1, 28)

                start_year = int(year.year.split('-')[0])
                if end_month >= 3:  # April
                    end_full_year = start_year + 1
                else:  # March
                    end_full_year = start_year + 1

                start = datetime(start_year, start_month, start_day).date()
                end = datetime(end_full_year, end_month, end_day).date()

                # Ensure end > start
                if end <= start:
                    end = start + timedelta(days=200)

                cr = ClassRoom(
                    school=school,
                    academic_year=year,
                    name=f'{year.year}-Class-{class_num}',
                    start_date=start,
                    end_date=end,
                    weekend_days=[0]  # Sunday only
                )
                classroom_batch.append(cr)

            # Bulk create classrooms
            ClassRoom.objects.bulk_create(classroom_batch)
            classrooms_by_year[year.id] = list(ClassRoom.objects.filter(academic_year=year).order_by('id'))
            total_classrooms += num_classes
            print(f"✅ ({num_classes} classrooms)")

            # Create holidays for this year
            print(f"    🎉 {year.year}: Creating 15 holidays...", end=" ", flush=True)
            holiday_batch = []
            holidays_created = 0

            for month_day, name in HOLIDAY_DATES_BY_YEAR.get(year.year, []):
                try:
                    month, day = map(int, month_day.split('-'))
                    year_int = int(year.year.split('-')[0])

                    # Adjust year for Jan-April holidays
                    if month < 6:
                        year_int += 1

                    holiday_date = datetime(year_int, month, day).date()

                    holiday_batch.append(Holiday(
                        year=year,
                        date=holiday_date,
                        name=name
                    ))
                    holidays_created += 1
                except ValueError:
                    pass

            Holiday.objects.bulk_create(holiday_batch)
            print(f"✅ ({holidays_created} holidays)")

    print(f"\n✅ Created {total_classrooms} total classrooms\n")
    return classrooms_by_year


def create_users(schools):
    """Create student users that will span multiple years."""
    print("👥 Creating users (will span 3 years)...\n")

    # For 15 classrooms with 20-30 students each:
    # 15 * 25 (avg) = ~375 students per year
    # But we want to reuse users across years for multi-year tracking
    # Create enough users to cover all needs

    users = []
    users_multi_year = []  # Track users that appear in all 3 years

    # Assign users to first school for creation (we'll manage enrollment separately)
    primary_school = schools[0]

    print("  📌 Creating 450 unique student users...")

    for i in range(1, 451):
        first_name = choice(FIRST_NAMES)
        last_name = choice(LAST_NAMES)

        # For multi-year students, ensure they have distinguishable names
        # Make first 4 students have same name repeated (for 3-year tracking)
        if i <= 4:
            first_name = 'MultiYear'
            last_name = f'Student{i}'

        username = f'student_{i:03d}_{first_name}_{last_name}'.lower().replace(' ', '_')

        # Ensure unique username
        counter = 1
        base_username = username
        while User.objects.filter(username=username).exists():
            username = f'{base_username}_{counter}'
            counter += 1

        user = User.objects.create_user(
            username=username,
            password='student123',
            first_name=first_name,
            last_name=last_name,
            email=f'{username}@school.com',
            user_type='student',
            school=primary_school  # Assign to first school by default
        )
        users.append(user)

        if i <= 4:
            users_multi_year.append(user)

    print(f"  ✅ Created 450 users\n")
    print(f"  📌 Multi-year students (3 years):\n")
    for user in users_multi_year:
        print(f"    - {user.first_name} {user.last_name} (User ID: {user.id}, Username: {user.username})")
    print()

    return users, users_multi_year


def create_students(schools, classrooms_by_year, users, users_multi_year):
    """Create student records for each year with 20-30 random students per class."""
    print("📚 Creating student records across 3 years (20-30 students per class)...\n")

    students_by_year = {}
    total_students = 0
    student_count_created = {'2023-24': 0, '2024-25': 0, '2025-26': 0}

    # For now, use first school for all students
    school = schools[0]
    print(f"  📍 {school.name}:")

    school_years = AcademicYear.objects.filter(school=school).order_by('year')

    for year in school_years:
        classrooms_for_year = classrooms_by_year[year.id]
        students_by_year[year.id] = []

        print(f"    📚 {year.year}: Creating students for {len(classrooms_for_year)} classrooms...", end=" ", flush=True)

        # IMPORTANT: Each user can only be in ONE classroom per year
        # Track which users are already assigned in this year
        assigned_users_this_year = set()
        student_batch = []
        total_students_for_year = 0
        roll_counter = 0

        # Determine which users to use for this year
        if year.year in ['2023-24', '2024-25']:
            # Use first 10 users (multi-year) + additional random users
            year_users = users[:10] + users[10:100]  # Use up to 100 users for variety
        else:  # 2025-26
            # Use all 450 users
            year_users = users

        # Shuffle the users to randomize distribution
        year_users_shuffled = random.sample(year_users, len(year_users))
        user_index = 0

        # For each classroom, assign 20-30 students
        for classroom in classrooms_for_year:
            num_students_in_class = randint(20, 30)
            students_assigned_to_classroom = 0

            # Assign students to this classroom, ensuring no duplicates in the year
            while students_assigned_to_classroom < num_students_in_class and user_index < len(year_users_shuffled):
                user = year_users_shuffled[user_index]
                user_index += 1

                # Skip if user already assigned in this year
                if user.id in assigned_users_this_year:
                    continue

                assigned_users_this_year.add(user.id)
                roll_counter += 1

                student = Student(
                    user=user,
                    classroom=classroom,
                    roll_number=roll_counter
                )
                student_batch.append(student)
                students_assigned_to_classroom += 1
                total_students_for_year += 1

        # Validate each student before bulk creating
        # Check that no user is in multiple classrooms in the same year
        users_in_this_year = {}
        for student in student_batch:
            user_id = student.user_id
            classroom_id = student.classroom_id

            if user_id in users_in_this_year:
                if users_in_this_year[user_id] != classroom_id:
                    print(f"\n❌ ERROR: User {student.user_id} assigned to multiple classrooms in {year.year}")
                    print(f"   Classroom 1: {users_in_this_year[user_id]}")
                    print(f"   Classroom 2: {classroom_id}")
                    raise ValueError(f"User {student.user_id} cannot be in multiple classrooms in same year")
            else:
                users_in_this_year[user_id] = classroom_id

        # Bulk create all students for this year
        Student.objects.bulk_create(student_batch)
        students_by_year[year.id] = student_batch
        total_students += total_students_for_year
        student_count_created[year.year] = total_students_for_year
        print(f"✅ ({total_students_for_year} students)")

    print(f"\n✅ Created {total_students} total student records\n")
    print(f"  Summary:")
    for year, count in student_count_created.items():
        print(f"    - {year}: {count} student records")
    print()

    return students_by_year, users_multi_year


def create_attendance_records(schools, classrooms_by_year):
    """Create attendance records with varied rates and progress tracking."""
    print("📝 Creating attendance records (optimized with bulk operations)...\n")

    # Gather all students
    all_students = Student.objects.select_related(
        'classroom',
        'user',
        'classroom__academic_year',
        'classroom__school'
    ).all()

    total_students_count = all_students.count()
    total_attendance_records = 0

    print(f"  Processing {total_students_count} students for attendance...\n")

    # Pre-fetch all holidays
    holidays_by_year = {}
    for year_id in classrooms_by_year.keys():
        holidays_by_year[year_id] = set(
            Holiday.objects.filter(year_id=year_id).values_list('date', flat=True)
        )

    # Configure attendance rates per classroom
    attendance_configs = {
        'low': (60, 80),      # 60-80%
        'medium': (80, 90),   # 80-90%
        'high': (95, 100)     # 95-100%
    }

    start_time = time.time()

    for idx, student in enumerate(all_students, 1):
        classroom = student.classroom
        year = classroom.academic_year
        school = classroom.school

        # Show progress
        if idx % 10 == 0 or idx == 1:
            elapsed = time.time() - start_time
            rate = idx / elapsed if elapsed > 0 else 0
            remaining = (total_students_count - idx) / rate if rate > 0 else 0
            pct = (idx * 100) // total_students_count

            print(f"  ⏳ Processing student {idx:,}/{total_students_count:,} ({pct}%) | "
                  f"Records: {total_attendance_records:,} | ETA: {remaining:.0f}s", flush=True)

        # Assign attendance rate based on classroom
        rate_config = choice(['low', 'medium', 'high'])
        min_rate, max_rate = attendance_configs[rate_config]
        attendance_rate = randint(min_rate, max_rate)

        # Get holidays for this year
        holidays_set = holidays_by_year.get(year.id, set())

        # Create attendance records
        attendance_batch = []
        current = classroom.start_date

        while current <= classroom.end_date:
            # Check if it's not a weekend (Sunday = 0)
            if current.weekday() != 0:
                # Check if it's not a holiday
                if current not in holidays_set:
                    # Only create attendance for dates up to today
                    if current <= date.today():
                        is_present = rand_float() * 100 <= attendance_rate
                        attendance_batch.append(Attendance(
                            student=student,
                            date=current,
                            present=is_present,
                            year=year
                        ))

            current += timedelta(days=1)

            # Bulk create every 1000 records
            if len(attendance_batch) >= 1000:
                Attendance.objects.bulk_create(attendance_batch, ignore_conflicts=True)
                total_attendance_records += len(attendance_batch)
                attendance_batch = []

        # Create remaining records
        if attendance_batch:
            Attendance.objects.bulk_create(attendance_batch, ignore_conflicts=True)
            total_attendance_records += len(attendance_batch)

    elapsed_time = time.time() - start_time
    print(f"\n✅ Created {total_attendance_records:,} attendance records in {elapsed_time:.1f}s\n")

    return total_attendance_records


def print_summary(schools, users, users_multi_year, total_attendance):
    """Print data generation summary."""
    print("\n" + "="*90)
    print("📊 DATA GENERATION SUMMARY")
    print("="*90)

    print(f"\n🏫 Schools: {schools.__len__()}")
    for school in schools:
        admins_count = User.objects.filter(school=school, user_type='admin').count()
        print(f"   - {school.name}: {admins_count} admins")

    print(f"\n📚 Academic Years: 3")
    print(f"   - 2023-24: 20 classrooms, 10 students per class")
    print(f"   - 2024-25: 20 classrooms, 10 students per class")
    print(f"   - 2025-26: 25 classrooms, 50 students per class")

    total_classrooms = ClassRoom.objects.count()
    print(f"\n🏛️  Classrooms: {total_classrooms:,}")

    total_students = Student.objects.count()
    print(f"\n👥 Student Records: {total_students:,}")

    total_users = User.objects.filter(user_type='student').count()
    print(f"👤 Unique Student Users: {total_users}")

    total_holidays = Holiday.objects.count()
    print(f"\n🎉 Holidays: {total_holidays}")

    print(f"\n📝 Attendance Records: {total_attendance:,}")

    print("\n" + "="*90)
    print("👤 STUDENTS APPEARING IN ALL 3 YEARS (Multi-Year Tracking):")
    print("="*90 + "\n")

    for idx, user in enumerate(users_multi_year, 1):
        print(f"{idx}. Name: {user.first_name} {user.last_name}")
        print(f"   User ID: {user.id}")
        print(f"   Username: {user.username}")

        students_for_user = Student.objects.filter(user=user).select_related(
            'classroom__academic_year'
        ).order_by('classroom__academic_year__year')

        print(f"   Enrollment across years:")
        for s in students_for_user:
            attendance_count = Attendance.objects.filter(student=s).count()
            print(f"      - {s.classroom.academic_year.year}: Student ID {s.id}, "
                  f"Classroom: {s.classroom.name}, "
                  f"Attendance Records: {attendance_count}")
        print()

    # Query to find students in all 3 years
    print("="*90)
    print("🔍 QUERY: Students in All 3 Years:")
    print("="*90 + "\n")

    students_in_all_years = User.objects.filter(
        user_type='student'
    ).annotate(
        num_years=Count('student__classroom__academic_year', distinct=True)
    ).filter(
        num_years=3
    )

    print(f"Found {students_in_all_years.count()} students across all 3 years:\n")
    for user in students_in_all_years[:10]:  # Show first 10
        print(f"  - {user.first_name} {user.last_name} (ID: {user.id})")

    print("\n" + "="*90 + "\n")


def main():
    """Main execution function."""
    print("\n" + "="*90)
    print("🚀 COMPREHENSIVE DATA GENERATION")
    print("="*90)
    print("\n📋 Configuration:")
    print("   - 2 Schools with 2 admins each")
    print("   - 3 Academic Years: 2023-24, 2024-25, 2025-26")
    print("   - 15 classrooms per year")
    print("   - 20-30 random students per classroom")
    print("   - 15 Indian holidays per year")
    print("   - Varied attendance: 60-80%, 80-90%, 95-100%")
    print("   - Weekends: Sunday only")
    print("   - Multi-year students tracked")
    print("\n" + "="*90 + "\n")

    try:
        clear_all_data()

        schools = create_schools_and_admins()

        years_by_school = create_academic_years(schools)

        classrooms_by_year = create_classrooms_and_holidays(schools, years_by_school)

        users, users_multi_year = create_users(schools)

        students_by_year, tracked_users = create_students(schools, classrooms_by_year, users, users_multi_year)

        total_attendance = create_attendance_records(schools, classrooms_by_year)

        print_summary(schools, users, users_multi_year, total_attendance)

        print("✅ DATA GENERATION COMPLETE!\n")

    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
