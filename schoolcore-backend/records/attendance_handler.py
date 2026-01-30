"""
Handler classes for attendance operations.
Separated for clean architecture and loose coupling.
"""

from datetime import datetime, date
from typing import List, Dict, Tuple, Set, Optional
from django.db.models import QuerySet

from .models import Attendance, Student, AcademicYear
from .utils import is_weekend


class AttendanceHandler:
    """Encapsulates attendance record management logic."""

    @staticmethod
    def validate_and_prepare_records(
        records: List[Dict],
        year: AcademicYear,
        school,
        holidays: Set[date]
    ) -> Tuple[List[Attendance], List[str]]:
        """
        Validate and prepare attendance records for creation.

        Args:
            records: List of attendance record dictionaries
            year: Academic year instance
            school: School instance
            holidays: Set of holiday dates

        Returns:
            Tuple of (valid_attendance_objects, error_list)
        """
        # Get valid students and their classrooms
        student_ids = [r.get('student_id') for r in records]
        students = Student.objects.filter(
            id__in=student_ids,
            classroom__school=school
        ).select_related('classroom')

        valid_students = {s.id: s for s in students}

        attendance_objects = []
        errors = []

        for idx, record in enumerate(records):
            error = AttendanceHandler._validate_single_record(
                idx, record, valid_students, holidays, year
            )

            if error:
                errors.append(error)
            else:
                attendance_obj = AttendanceHandler._create_attendance_object(
                    record, year, valid_students
                )
                if attendance_obj:
                    attendance_objects.append(attendance_obj)

        return attendance_objects, errors

    @staticmethod
    def _validate_single_record(
        idx: int,
        record: Dict,
        valid_students: Dict,
        holidays: Set[date],
        year: AcademicYear
    ) -> Optional[str]:
        """Validate a single attendance record and return error if any."""
        student_id = record.get('student_id')
        date_str = record.get('date')
        present = record.get('present')

        # Check required fields
        if not student_id or not date_str:
            return f"Record {idx}: Missing student_id or date"

        if student_id not in valid_students:
            return f"Record {idx}: Invalid student_id {student_id}"

        # Parse and validate date
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return f"Record {idx}: Invalid date format {date_str}"

        # Check if date is in the future
        today = datetime.now().date()
        if date_obj > today:
            return f"Record {idx}: Cannot mark attendance for future date ({date_str}). Today is {today.strftime('%Y-%m-%d')}"

        # Check if weekend
        student = valid_students[student_id]
        if is_weekend(date_obj, student.classroom):
            return f"Record {idx}: Cannot mark on weekend ({date_str})"

        # Check if holiday
        if date_obj in holidays:
            return f"Record {idx}: Cannot mark on holiday ({date_str})"

        return None

    @staticmethod
    def _create_attendance_object(
        record: Dict,
        year: AcademicYear,
        valid_students: Dict
    ) -> Optional[Attendance]:
        """Create an Attendance object from record data."""
        student_id = record.get('student_id')
        date_str = record.get('date')
        present = record.get('present')

        if present is None:
            return None

        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

        return Attendance(
            student_id=student_id,
            date=date_obj,
            present=present,
            year=year
        )

    @staticmethod
    def bulk_create_records(
        attendance_objects: List[Attendance],
        performed_by=None
    ) -> Tuple[int, str]:
        """
        Bulk create attendance records with conflict handling.
        Also logs the bulk operation to audit logs with detailed changes.

        Args:
            attendance_objects: List of Attendance objects to create
            performed_by: User performing the action (for audit logging)

        Returns:
            Tuple of (count_created, error_message_or_empty_string)
        """
        if not attendance_objects:
            return 0, ""

        try:
            Attendance.objects.bulk_create(
                attendance_objects,
                update_conflicts=True,
                update_fields=['present'],
                unique_fields=['student', 'date', 'year']
            )

            # Log the bulk operation with detailed changes
            if performed_by:
                try:
                    from .services import AuditLogService

                    # Build detailed changes for each record
                    detailed_changes = {}
                    for i, record in enumerate(attendance_objects, 1):
                        student_name = record.student.user.get_full_name() if record.student.user else f"Roll {record.student.roll_number}"
                        status = "Present" if record.present else "Absent"
                        detailed_changes[f'Record_{i}'] = {
                            'old': None,
                            'new': f'{student_name} - {record.date}: {status}'
                        }

                    # Create audit log with all details
                    AuditLogService.log_action(
                        action='create',
                        performed_by=performed_by,
                        model_name='Attendance',
                        object_id=0,  # Bulk operation marker
                        object_display=f'Bulk attendance: {len(attendance_objects)} records',
                        changes=detailed_changes
                    )
                except Exception as e:
                    # Log errors but don't fail the operation
                    print(f"Audit logging error: {str(e)}")

            return len(attendance_objects), ""
        except Exception as e:
            return 0, f'Database error: {str(e)}'


class AttendanceFilterHandler:
    """Encapsulates attendance filtering and query logic."""

    @staticmethod
    def filter_attendance_records(
        queryset: QuerySet,
        year_id: str = None,
        classroom_id: int = None,
        date: str = None,
        month: str = None,
        school = None,
        user = None
    ) -> QuerySet:
        """
        Apply filters to attendance queryset.

        Returns:
            Filtered queryset
        """
        from .utils import get_current_academic_year

        # Filter by year
        if year_id:
            queryset = queryset.filter(year_id=year_id)
        else:
            current_year = get_current_academic_year(school or user.school)
            if current_year:
                queryset = queryset.filter(year=current_year)
            else:
                return queryset.none()

        # Filter by classroom
        if classroom_id:
            queryset = queryset.filter(student__classroom_id=classroom_id)

        # Filter by date or month
        if date:
            queryset = queryset.filter(date=date)
        elif month:
            try:
                queryset = queryset.filter(date__month=int(month))
            except (ValueError, TypeError):
                pass
        elif classroom_id:
            # Default to today if classroom specified but no date
            today = datetime.now().date()
            queryset = queryset.filter(date=today)

        return queryset

    @staticmethod
    def optimize_queryset(queryset: QuerySet) -> QuerySet:
        """Apply performance optimizations to queryset."""
        return queryset.select_related(
            'student', 'student__user'
        ).order_by('student__roll_number')
