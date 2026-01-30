"""
Services for attendance statistics and analytics.
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Set
from .models import (
    AcademicYear, ClassRoom, Student, Attendance
)
from .utils import (
    get_holiday_set, parse_weekend_days, count_school_days
)


class AttendanceStatsService:
    """Service for computing attendance statistics for classrooms and schools."""

    @staticmethod
    def get_classroom_stats(
        classroom: ClassRoom,
        year: AcademicYear,
        holidays: Set[date],
        today: date
    ) -> Optional[Dict[str, Any]]:
        """
        Calculate attendance statistics for a single classroom.

        Args:
            classroom: ClassRoom instance
            year: AcademicYear instance
            holidays: Set of holiday dates
            today: Current date for calculating "till today" metrics

        Returns:
            Dictionary with classroom statistics
        """
        # Get students
        students = Student.objects.filter(
            classroom=classroom
        )
        student_ids = list(students.values_list('id', flat=True))
        student_count = len(student_ids)

        if student_count == 0:
            return None

        # Determine date range
        if classroom.start_date and classroom.end_date:
            start_date = classroom.start_date
            end_date = min(classroom.end_date, today)
        else:
            start_date = today.replace(month=1, day=1)
            end_date = today

        # Parse weekend days
        weekend_days = parse_weekend_days(classroom.weekend_days)

        # Count expected school days
        expected_days = count_school_days(start_date, end_date, weekend_days, holidays)
        expected_records = expected_days * student_count

        # Get attendance records
        attendance_records = Attendance.objects.filter(
            student_id__in=student_ids,
            date__range=[start_date, end_date],
            year_id=year.id
        )

        present_count = attendance_records.filter(present=True).count()
        total_attendance = attendance_records.count()
        pending_records = max(0, expected_records - total_attendance)
        is_completed = pending_records <= 0

        attendance_percentage = round(
            (present_count / total_attendance * 100)
            if total_attendance > 0
            else 0,
            2
        )

        return {
            'classroom_id': classroom.id,
            'classroom_name': classroom.name,
            'student_count': student_count,
            'attendance_records': total_attendance,
            'present_count': present_count,
            'expected_records': expected_records,
            'pending_records': pending_records,
            'is_completed': is_completed,
            'attendance_percentage': attendance_percentage,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        }

    @staticmethod
    def get_school_wide_stats(
        school,
        year: AcademicYear,
        today: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Calculate school-wide attendance statistics.

        Args:
            school: School instance
            year: AcademicYear instance
            today: Current date (defaults to today)

        Returns:
            Dictionary with school statistics and classroom details
        """
        today = today or datetime.now().date()

        # Get all classrooms
        classrooms = ClassRoom.objects.filter(
            school=school,
            academic_year=year
        ).prefetch_related('student_set')

        if not classrooms.exists():
            return AttendanceStatsService._empty_school_stats(year, today)

        # Get holidays
        holidays = get_holiday_set(year)

        # Aggregate statistics
        classroom_details = []
        total_students = 0
        total_present = 0
        total_attendance_records = 0
        total_expected_records = 0
        classrooms_completed = 0

        for classroom in classrooms:
            stats = AttendanceStatsService.get_classroom_stats(
                classroom, year, holidays, today
            )

            if stats:
                classroom_details.append(stats)
                total_students += stats['student_count']
                total_present += stats['present_count']
                total_attendance_records += stats['attendance_records']
                total_expected_records += stats['expected_records']

                if stats['is_completed']:
                    classrooms_completed += 1

        classrooms_pending = len(classrooms) - classrooms_completed

        # Calculate overall percentage
        overall_percentage = round(
            (total_present / total_attendance_records * 100)
            if total_attendance_records > 0
            else 0,
            2
        )

        return {
            'year': year.year,
            'as_of_date': today.isoformat(),
            'school_statistics': {
                'total_students': total_students,
                'total_present': total_present,
                'overall_attendance_percentage': overall_percentage,
                'classrooms_completed': classrooms_completed,
                'classrooms_pending': classrooms_pending,
                'total_classrooms': len(classrooms),
                'total_attendance_records': total_attendance_records,
                'expected_records': total_expected_records,
                'pending_records': max(0, total_expected_records - total_attendance_records),
            },
            'classroom_details': classroom_details,
        }

    @staticmethod
    def _empty_school_stats(year: AcademicYear, today: date) -> Dict[str, Any]:
        """Create empty statistics response."""
        return {
            'year': year.year,
            'as_of_date': today.isoformat(),
            'school_statistics': {
                'total_students': 0,
                'total_present': 0,
                'overall_attendance_percentage': 0,
                'classrooms_completed': 0,
                'classrooms_pending': 0,
                'total_classrooms': 0,
                'total_attendance_records': 0,
                'expected_records': 0,
                'pending_records': 0,
            },
            'classroom_details': [],
        }


class AttendanceValidationService:
    """Service for validating attendance records."""

    @staticmethod
    def validate_attendance_records(
        records: List[Dict],
        year: AcademicYear,
        school,
        holidays: Set[date]
    ) -> tuple[List[Attendance], List[str]]:
        """
        Validate attendance records before creation.

        Args:
            records: List of attendance record dictionaries
            year: AcademicYear instance
            school: School instance
            holidays: Set of holiday dates

        Returns:
            Tuple of (valid_attendance_objects, error_messages)
        """
        from .models import Attendance

        if not records:
            return [], ['No attendance records provided']

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
            student_id = record.get('student_id')
            date_str = record.get('date')
            present = record.get('present')

            # Validation
            if not student_id or not date_str:
                errors.append(f"Record {idx}: Missing student_id or date")
                continue

            if student_id not in valid_students:
                errors.append(f"Record {idx}: Invalid student_id {student_id}")
                continue

            # Parse date
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                errors.append(f"Record {idx}: Invalid date format {date_str}")
                continue

            # Check weekend
            student = valid_students[student_id]
            from .utils import is_weekend
            if is_weekend(date_obj, student.classroom):
                errors.append(f"Record {idx}: Cannot mark on weekend ({date_str})")
                continue

            # Check holiday
            if date_obj in holidays:
                errors.append(f"Record {idx}: Cannot mark on holiday ({date_str})")
                continue

            # Skip if present is None
            if present is None:
                continue

            attendance_objects.append(Attendance(
                student_id=student_id,
                date=date_obj,
                present=present,
                year=year
            ))

        return attendance_objects, errors


# ============================================================================
# AUDIT LOG SERVICE
# ============================================================================

class AuditLogService:
    """Service for recording and managing audit logs of admin actions."""

    FIELDS_TO_EXCLUDE = {
        'password', 'last_login', 'date_joined', 'id',
        'created_at', 'updated_at', 'is_active'
    }

    @staticmethod
    def log_action(
        action: str,
        performed_by,
        model_name: str,
        object_id: int,
        object_display: str = '',
        changes: Dict[str, Any] = None
    ) -> 'AuditLog':
        """
        Log an action to the audit log.

        Args:
            action: 'create', 'update', or 'delete'
            performed_by: The User object who performed the action
            model_name: Name of the model being modified
            object_id: ID of the object being modified
            object_display: String representation of the object
            changes: Dict of changes {field: {old: value, new: value}}

        Returns:
            AuditLog instance
        """
        from .models import AuditLog

        if changes is None:
            changes = {}

        audit_log = AuditLog.objects.create(
            action=action,
            performed_by=performed_by,
            model_name=model_name,
            object_id=object_id,
            object_display=object_display,
            changes=changes
        )

        return audit_log

    @staticmethod
    def get_changes_dict(old_instance, new_instance) -> Dict[str, Dict[str, Any]]:
        """
        Calculate the difference between two model instances.

        Args:
            old_instance: The original instance (None for creates)
            new_instance: The new/modified instance

        Returns:
            Dict mapping field names to {old: value, new: value}
        """
        changes = {}

        if old_instance is None:
            # This is a create action - return all fields
            for field in new_instance._meta.fields:
                if field.name not in AuditLogService.FIELDS_TO_EXCLUDE:
                    value = getattr(new_instance, field.name, None)
                    # Convert to serializable format
                    if hasattr(value, 'isoformat'):
                        value = value.isoformat()
                    elif hasattr(value, 'pk'):
                        value = value.pk
                    changes[field.name] = {'old': None, 'new': value}
        else:
            # This is an update action - return only changed fields
            for field in new_instance._meta.fields:
                if field.name not in AuditLogService.FIELDS_TO_EXCLUDE:
                    old_value = getattr(old_instance, field.name, None)
                    new_value = getattr(new_instance, field.name, None)

                    # Convert to serializable format
                    if hasattr(old_value, 'isoformat'):
                        old_value = old_value.isoformat()
                    elif hasattr(old_value, 'pk'):
                        old_value = old_value.pk

                    if hasattr(new_value, 'isoformat'):
                        new_value = new_value.isoformat()
                    elif hasattr(new_value, 'pk'):
                        new_value = new_value.pk

                    if old_value != new_value:
                        changes[field.name] = {'old': old_value, 'new': new_value}

        return changes

    @staticmethod
    def get_school_for_model(instance):
        """
        Get the School instance for a given model instance.

        Args:
            instance: Model instance

        Returns:
            School instance or None
        """
        # Check if instance has school FK directly
        if hasattr(instance, 'school'):
            return instance.school

        # Check if instance has school through academic_year
        if hasattr(instance, 'year') and hasattr(instance.year, 'school'):
            return instance.year.school

        # For User model, get school directly
        if hasattr(instance, 'user') and hasattr(instance.user, 'school'):
            return instance.user.school

        # For Student model, get school through classroom or year
        if hasattr(instance, 'classroom') and hasattr(instance.classroom, 'school'):
            return instance.classroom.school

        return None

    @staticmethod
    def filter_audit_logs(performed_by=None, model_name=None, action=None, days=30):
        """
        Retrieve filtered audit logs.

        Args:
            performed_by: Filter by user who performed the action
            model_name: Filter by model name
            action: Filter by action type
            days: Number of days to look back

        Returns:
            QuerySet of AuditLog instances
        """
        from django.utils import timezone
        from datetime import timedelta
        from .models import AuditLog

        qs = AuditLog.objects.all()

        if performed_by:
            qs = qs.filter(performed_by=performed_by)
        if model_name:
            qs = qs.filter(model_name=model_name)
        if action:
            qs = qs.filter(action=action)

        # Filter by date range
        cutoff_date = timezone.now() - timedelta(days=days)
        qs = qs.filter(timestamp__gte=cutoff_date)

        return qs.order_by('-timestamp')

