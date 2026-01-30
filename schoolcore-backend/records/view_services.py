"""
View Service Layer - Contains ALL business logic extraction from views.
Full SOLID principles - Single Responsibility for each service.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta

from .attendance_handler import AttendanceHandler
from .models import AcademicYear, Attendance
from .queries import (
    AcademicYearQueries, ClassroomQueries, AttendanceQueries, StudentQueries
)
from .utils import get_current_academic_year, get_holiday_set, parse_weekend_days
from .statistics_handler import StatisticsHandler
from .services import AttendanceStatsService


class YearService:
    """Single Responsibility: Handle academic year logic."""

    @staticmethod
    def get_year_or_current(year_id: Optional[int], school) -> Optional[AcademicYear]:
        """Get year by ID or get current year."""
        if year_id:
            return AcademicYearQueries.get_year_by_id(year_id, school)
        return get_current_academic_year(school)


class DateRangeService:
    """Single Responsibility: Calculate date ranges for statistics."""

    @staticmethod
    def get_range(classroom=None, school=None) -> tuple[date, date]:
        """Get start and end dates for statistics."""
        if classroom and classroom.start_date and classroom.end_date:
            return classroom.start_date, classroom.end_date

        classrooms = ClassroomQueries.get_school_classrooms(school)
        if classrooms.exists():
            starts = [c.start_date for c in classrooms if c.start_date]
            ends = [c.end_date for c in classrooms if c.end_date]
            return (
                min(starts) if starts else datetime(2024, 6, 1).date(),
                max(ends) if ends else datetime(2025, 4, 30).date()
            )

        return datetime(2024, 6, 1).date(), datetime(2025, 4, 30).date()


class StatsPeriodService:
    """Single Responsibility: Compute statistics by period type."""

    @staticmethod
    def compute(period: str, student_ids: List[int], student_count: int,
                start: date, end: date, holidays: set, classroom=None) -> List[Dict]:
        """Compute statistics for the specified period."""
        match period:
            case 'daily':
                return StatisticsHandler.compute_daily_statistics(
                    student_ids, student_count, start, end, holidays
                )
            case 'weekly':
                return StatisticsHandler.compute_weekly_statistics(
                    student_ids, student_count, start, end, holidays
                )
            case 'monthly':
                weekend_days = parse_weekend_days(
                    classroom.weekend_days if classroom else None
                )
                return StatisticsHandler.compute_monthly_statistics(
                    student_ids, student_count, start, end, holidays, weekend_days
                )
            case 'yearly':
                return StatisticsHandler.compute_yearly_statistics(
                    student_ids, start, end
                )
            case _:
                return []


class AttendanceCreationService:
    """Single Responsibility: Validate and create attendance records."""

    @staticmethod
    def create_from_request(records: List[Dict], year: AcademicYear, school, performed_by=None) -> tuple[int, List[str]]:
        """Validate records and bulk create them."""
        holidays = get_holiday_set(year)

        attendance_objects, errors = AttendanceHandler.validate_and_prepare_records(
            records, year, school, holidays
        )

        if errors and not attendance_objects:
            return 0, errors

        count, error = AttendanceHandler.bulk_create_records(attendance_objects, performed_by=performed_by)

        if error:
            return 0, [error]

        return count, errors


class _AttendanceTotals:
    """Helper: Track and calculate attendance totals."""

    def __init__(self):
        self.students = 0
        self.present = 0
        self.records = 0

    def add(self, classroom_stats: Dict) -> None:
        """Add classroom stats to totals."""
        self.students += classroom_stats['student_count']
        self.present += classroom_stats['present_count']
        self.records += classroom_stats['attendance_records']

    def calculate_percentage(self) -> float:
        """Calculate overall attendance percentage."""
        if self.records == 0:
            return 0.0
        return round((self.present / self.records * 100), 2)


class _AttendanceQueryHelper:
    """Helper: Query attendance data for a date range."""

    @staticmethod
    def get_counts(classroom_student_ids: List[int], date_range: tuple[date, date]) -> tuple[int, int]:
        """Get present and total attendance counts."""
        start_date, end_date = date_range
        present = Attendance.objects.filter(
            student_id__in=classroom_student_ids,
            date__range=[start_date, end_date],
            present=True
        ).count()
        total = Attendance.objects.filter(
            student_id__in=classroom_student_ids,
            date__range=[start_date, end_date]
        ).count()
        return present, total


class _ClassroomStatsBuilder:
    """Helper: Build individual classroom statistics dictionaries."""

    @staticmethod
    def build(classroom, classroom_student_ids: List[int], present: int, total: int) -> Optional[Dict]:
        """Build a classroom stats dictionary if attendance records exist."""
        if total == 0:
            return None

        return {
            'classroom_id': classroom.id,
            'classroom_name': classroom.name,
            'student_count': len(classroom_student_ids),
            'attendance_records': total,
            'present_count': present,
            'attendance_percentage': round((present / total * 100) if total > 0 else 0, 2),
        }


class _StatisticsResponseBuilder:
    """Helper: Build the final statistics response dictionary."""

    @staticmethod
    def build(year: AcademicYear, as_of_date: date, totals: _AttendanceTotals,
              classroom_details: List[Dict]) -> Dict[str, Any]:
        """Build the complete statistics response."""
        return {
            'year': year.year,
            'as_of_date': as_of_date.isoformat(),
            'school_statistics': {
                'total_students': totals.students,
                'total_present': totals.present,
                'overall_attendance_percentage': totals.calculate_percentage(),
                'total_attendance_records': totals.records,
            },
            'classroom_details': classroom_details,
        }


class _TodayStatisticsHelper:
    """Helper: Calculate today's attendance statistics."""

    @staticmethod
    def compute(school, year: AcademicYear) -> Dict[str, Any]:
        """Compute today's attendance statistics."""
        today = datetime.now().date()

        if not _TodayStatisticsHelper._validate_data(school, year):
            return AttendanceStatsService._empty_school_stats(year, today)

        classroom_details, totals = _TodayStatisticsHelper._process_classrooms(school, year, today)
        return _StatisticsResponseBuilder.build(year, today, totals, classroom_details)

    @staticmethod
    def _validate_data(school, year: AcademicYear) -> bool:
        """Validate school and year have data."""
        classrooms = ClassroomQueries.get_school_classrooms(school)
        student_ids = list(AttendanceQueries.get_students_for_year(school, year))
        return classrooms.exists() and bool(student_ids)

    @staticmethod
    def _process_classrooms(school, year: AcademicYear, today: date) -> tuple[List[Dict], _AttendanceTotals]:
        """Process all classrooms and aggregate statistics."""
        classrooms = ClassroomQueries.get_school_classrooms(school)
        classroom_details = []
        totals = _AttendanceTotals()

        for classroom in classrooms:
            stats = _TodayStatisticsHelper._get_classroom_stats(school, year, classroom, today)
            if stats:
                classroom_details.append(stats)
                totals.add(stats)

        return classroom_details, totals

    @staticmethod
    def _get_classroom_stats(school, year: AcademicYear, classroom, today: date) -> Optional[Dict]:
        """Get today's stats for a specific classroom."""
        classroom_students = StudentQueries.get_students(
            school, classroom_id=classroom.id, year_id=year.id
        )

        if not classroom_students.exists():
            return None

        classroom_student_ids = list(classroom_students.values_list('id', flat=True))
        present, total = _AttendanceQueryHelper.get_counts(classroom_student_ids, (today, today))

        return _ClassroomStatsBuilder.build(classroom, classroom_student_ids, present, total)



class _MonthRangeHelper:
    """Helper: Calculate month date ranges."""

    @staticmethod
    def normalize_month_year(month: Optional[int], year_month: Optional[int]) -> tuple[int, int]:
        """Normalize month and year, defaulting to current if not provided."""
        if not month or not year_month:
            today = datetime.now().date()
            month = month or today.month
            year_month = year_month or today.year
        return month, year_month

    @staticmethod
    def get_range(month: int, year_month: int) -> tuple[date, date]:
        """Get start and end date for a given month."""
        month_start = datetime(year_month, month, 1).date()
        month_end = (
            datetime(year_month + 1, 1, 1).date() - timedelta(days=1)
            if month == 12
            else datetime(year_month, month + 1, 1).date() - timedelta(days=1)
        )
        return month_start, month_end


class _MonthlyStatisticsHelper:
    """Helper: Calculate monthly attendance statistics."""

    @staticmethod
    def compute(school, year: AcademicYear, month: Optional[int] = None,
                year_month: Optional[int] = None) -> Dict[str, Any]:
        """Compute monthly attendance statistics."""
        month, year_month = _MonthRangeHelper.normalize_month_year(month, year_month)
        month_start, month_end = _MonthRangeHelper.get_range(month, year_month)

        if not _MonthlyStatisticsHelper._validate_data(school, year):
            return AttendanceStatsService._empty_school_stats(year, datetime.now().date())

        classroom_details, totals = _MonthlyStatisticsHelper._process_classrooms(
            school, year, month_start, month_end
        )
        return _StatisticsResponseBuilder.build(year, datetime.now().date(), totals, classroom_details)

    @staticmethod
    def _validate_data(school, year: AcademicYear) -> bool:
        """Validate school and year have data."""
        classrooms = ClassroomQueries.get_school_classrooms(school)
        student_ids = list(AttendanceQueries.get_students_for_year(school, year))
        return classrooms.exists() and bool(student_ids)

    @staticmethod
    def _process_classrooms(school, year: AcademicYear, month_start: date,
                           month_end: date) -> tuple[List[Dict], _AttendanceTotals]:
        """Process all classrooms and aggregate monthly statistics."""
        classrooms = ClassroomQueries.get_school_classrooms(school)
        classroom_details = []
        totals = _AttendanceTotals()

        for classroom in classrooms:
            stats = _MonthlyStatisticsHelper._get_classroom_stats(
                school, year, classroom, month_start, month_end
            )
            if stats:
                classroom_details.append(stats)
                totals.add(stats)

        return classroom_details, totals

    @staticmethod
    def _get_classroom_stats(school, year: AcademicYear, classroom, month_start: date,
                            month_end: date) -> Optional[Dict]:
        """Get monthly stats for a specific classroom."""
        classroom_students = StudentQueries.get_students(
            school, classroom_id=classroom.id, year_id=year.id
        )

        if not classroom_students.exists():
            return None

        classroom_student_ids = list(classroom_students.values_list('id', flat=True))
        present, total = _AttendanceQueryHelper.get_counts(
            classroom_student_ids, (month_start, month_end)
        )

        return _ClassroomStatsBuilder.build(classroom, classroom_student_ids, present, total)



class StatisticsRetrievalService:
    """Single Responsibility: Retrieve statistics data."""

    @staticmethod
    def get_classroom_statistics(school, year: AcademicYear, classroom_id: Optional[int],
                                 period: str) -> Dict[str, Any]:
        """Get statistics for a specific classroom."""
        classroom = ClassroomQueries.get_classroom_by_id(classroom_id, school) if classroom_id else None

        start_date, end_date = DateRangeService.get_range(classroom, school)
        student_ids = list(AttendanceQueries.get_students_for_year(school, year))

        if not student_ids:
            return {'statistics': [], 'classroom': classroom.name if classroom else 'All'}

        holidays = get_holiday_set(year)
        stats = StatsPeriodService.compute(
            period, student_ids, len(student_ids), start_date, end_date, holidays, classroom
        )

        return {
            'statistics': stats,
            'classroom': classroom.name if classroom else 'All'
        }

    @staticmethod
    def get_school_statistics(school, year: AcademicYear, period: str = 'overall',
                             month: Optional[int] = None, year_month: Optional[int] = None) -> Dict[str, Any]:
        """Get school-wide statistics for a specific period.

        Args:
            school: The school object
            year: The academic year
            period: 'overall', 'today', or 'monthly'
            month: Month number (1-12) for monthly period
            year_month: Year for monthly period (e.g., 2024)
        """
        match period:
            case 'overall':
                return AttendanceStatsService.get_school_wide_stats(school, year)
            case 'today':
                return _TodayStatisticsHelper.compute(school, year)
            case 'monthly':
                return _MonthlyStatisticsHelper.compute(school, year, month, year_month)
            case _:
                return AttendanceStatsService._empty_school_stats(year, datetime.now().date())

