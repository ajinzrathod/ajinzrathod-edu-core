"""
Query helpers for extracting common database query patterns.
Makes views ultra-clean by delegating all data fetching.
"""

from typing import Optional, List
from .models import User, AcademicYear, ClassRoom, Student, Attendance, Holiday


class UserQueries:
    """User-related database queries."""

    @staticmethod
    def get_user_detail(user_id: int) -> dict:
        """Get user profile with related school."""
        return User.objects.filter(id=user_id).select_related(
            'school'
        ).values(
            'id', 'username', 'first_name', 'last_name', 'email', 'user_type',
            'school__id', 'school__name'
        ).first()

    @staticmethod
    def search_user_by_name(first_name: str, last_name: str, school) -> list:
        """Search for users by first and last name within a school."""
        from .models import Student

        users = User.objects.filter(
            first_name__icontains=first_name,
            last_name__icontains=last_name,
            school=school,
            user_type='student'
        ).values('id', 'username', 'first_name', 'last_name', 'email')

        # Enhance with enrollment history
        users_list = []
        for user in users:
            enrollments = Student.objects.filter(user_id=user['id']).select_related(
                'classroom', 'classroom__academic_year'
            ).values(
                'classroom__name', 'classroom__academic_year__year', 'roll_number'
            ).distinct()

            enrollment_history = [
                {
                    'year': e['classroom__academic_year__year'],
                    'classroom': e['classroom__name'],
                    'roll_number': e['roll_number']
                }
                for e in enrollments
            ]

            user['enrollment_history'] = enrollment_history
            users_list.append(user)

        return users_list


class AcademicYearQueries:
    """Academic year related queries."""

    @staticmethod
    def get_school_years(school):
        """Get all academic years for a school."""
        return AcademicYear.objects.filter(
            school=school
        ).select_related('school').order_by('-year')

    @staticmethod
    def get_year_by_id(year_id: int, school) -> Optional[AcademicYear]:
        """Get academic year by ID, scoped to school."""
        return AcademicYear.objects.filter(
            id=year_id, school=school
        ).first()


class ClassroomQueries:
    """Classroom related queries."""

    @staticmethod
    def get_school_classrooms(school, year_id: Optional[int] = None):
        """Get classrooms for a school, optionally filtered by year."""
        queryset = ClassRoom.objects.filter(
            school=school
        ).select_related('school', 'academic_year')

        if year_id:
            queryset = queryset.filter(academic_year_id=year_id)

        return queryset

    @staticmethod
    def get_classroom_by_id(classroom_id: int, school) -> Optional[ClassRoom]:
        """Get classroom by ID, scoped to school."""
        return ClassRoom.objects.filter(
            id=classroom_id, school=school
        ).select_related('school').first()


class StudentQueries:
    """Student related queries."""

    @staticmethod
    def get_students(school, classroom_id: Optional[int] = None,
                     year_id: Optional[int] = None):
        """Get students with optional filters."""
        queryset = Student.objects.filter(
            classroom__school=school
        ).select_related('user', 'classroom', 'classroom__academic_year')

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)

        if year_id:
            queryset = queryset.filter(classroom__academic_year_id=year_id)

        return queryset.order_by('classroom', 'roll_number')

    @staticmethod
    def student_exists(student_id: int, school) -> bool:
        """Check if student exists and belongs to school."""
        return Student.objects.filter(
            id=student_id, classroom__school=school
        ).exists()

    @staticmethod
    def get_student_by_roll(classroom_id: int, roll_number: int):
        """Get student by roll number in specific classroom."""
        return Student.objects.filter(
            classroom_id=classroom_id,
            roll_number=roll_number
        ).select_related('user', 'classroom').first()


class AttendanceQueries:
    """Attendance related queries."""

    @staticmethod
    def get_student_attendance(student_id: int, year_id: int):
        """Get all attendance records for a student in a year."""
        return Attendance.objects.filter(
            student_id=student_id,
            year_id=year_id
        ).select_related('student', 'student__user').order_by('date')

    @staticmethod
    def get_attendance_by_school(school):
        """Get all attendance records for a school."""
        return Attendance.objects.filter(
            student__classroom__school=school
        )

    @staticmethod
    def get_attendance_record(record_id: int, school) -> Optional[Attendance]:
        """Get single attendance record, scoped to school."""
        return Attendance.objects.select_related(
            'student', 'student__classroom'
        ).filter(
            id=record_id, student__classroom__school=school
        ).first()

    @staticmethod
    def get_students_for_year(school, year):
        """Get student IDs for a school/year."""
        return Student.objects.filter(
            classroom__school=school, classroom__academic_year=year
        ).values_list('id', flat=True)


class HolidayQueries:
    """Holiday related queries."""

    @staticmethod
    def get_holidays(year_id: int, school):
        """Get holidays for an academic year."""
        return Holiday.objects.filter(
            year_id=year_id, year__school=school
        ).select_related('year').order_by('date')

    @staticmethod
    def get_all_holidays(school):
        """Get all holidays for a school."""
        return Holiday.objects.filter(
            year__school=school
        ).select_related('year')
