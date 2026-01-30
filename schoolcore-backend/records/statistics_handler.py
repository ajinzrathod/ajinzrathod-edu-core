"""
Handler classes for statistics computation.
Separated for clean architecture and loose coupling.
"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Set
from .models import Attendance


class StatisticsHandler:
    """Encapsulates statistics computation logic."""

    @staticmethod
    def compute_daily_statistics(
        student_ids: List[int],
        student_count: int,
        start_date: date,
        end_date: date,
        holidays: Set[date]
    ) -> List[Dict[str, Any]]:
        """Compute daily attendance statistics."""
        stats = []
        current = start_date

        while current <= end_date:
            if current not in holidays:
                present = Attendance.objects.filter(
                    student_id__in=student_ids, date=current, present=True
                ).count()
                total = Attendance.objects.filter(
                    student_id__in=student_ids, date=current
                ).count()

                if total > 0:
                    stats.append({
                        'date': current.isoformat(),
                        'present': present,
                        'total': total,
                        'pending': student_count - total
                    })

            current += timedelta(days=1)

        return stats

    @staticmethod
    def compute_weekly_statistics(
        student_ids: List[int],
        student_count: int,
        start_date: date,
        end_date: date,
        holidays: Set[date]
    ) -> List[Dict[str, Any]]:
        """Compute weekly attendance statistics."""
        stats = []
        current = start_date
        week_num = 1

        while current <= end_date:
            week_end = min(current + timedelta(days=6), end_date)
            present = Attendance.objects.filter(
                student_id__in=student_ids, date__range=[current, week_end], present=True
            ).count()
            total = Attendance.objects.filter(
                student_id__in=student_ids, date__range=[current, week_end]
            ).count()

            stats.append({
                'week': f"Week {week_num}: {current.isoformat()} to {week_end.isoformat()}",
                'present': present,
                'total': total,
                'pending': max(0, student_count * (week_end - current).days - total)
            })

            current = week_end + timedelta(days=1)
            week_num += 1

        return stats

    @staticmethod
    def compute_monthly_statistics(
        student_ids: List[int],
        student_count: int,
        start_date: date,
        end_date: date,
        holidays: Set[date],
        weekend_days: List[int]
    ) -> List[Dict[str, Any]]:
        """Compute monthly attendance statistics."""
        stats = []
        current = start_date

        while current <= end_date:
            month = current.month
            year = current.year

            # Get last day of month
            if month == 12:
                month_end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                month_end = datetime(year, month + 1, 1).date() - timedelta(days=1)

            month_end = min(month_end, end_date)

            # Count weekends, holidays, and school days
            month_stats = StatisticsHandler._count_month_days(
                current, month_end, weekend_days, holidays
            )

            # Get attendance records
            present = Attendance.objects.filter(
                student_id__in=student_ids, date__range=[current, month_end], present=True
            ).count()
            total = Attendance.objects.filter(
                student_id__in=student_ids, date__range=[current, month_end]
            ).count()

            expected_records = month_stats['school_days'] * student_count
            pending = max(0, expected_records - total)

            stats.append({
                'month': datetime(year, month, 1).strftime('%B'),
                'total_days': month_stats['total_days'],
                'holidays': month_stats['holidays'],
                'weekends': month_stats['weekends'],
                'expected_days': month_stats['school_days'],
                'present': present,
                'absent': total - present if total > 0 else 0,
                'pending': pending
            })

            # Move to next month
            if month == 12:
                current = datetime(year + 1, 1, 1).date()
            else:
                current = datetime(year, month + 1, 1).date()

        return stats

    @staticmethod
    def compute_yearly_statistics(
        student_ids: List[int],
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """Compute yearly attendance statistics."""
        present = Attendance.objects.filter(
            student_id__in=student_ids, date__range=[start_date, end_date], present=True
        ).count()
        total = Attendance.objects.filter(
            student_id__in=student_ids, date__range=[start_date, end_date]
        ).count()

        return [{
            'present': present,
            'total': total,
            'pending': max(0, total - present),
            'percentage': round((present / total * 100) if total > 0 else 0, 2)
        }]

    @staticmethod
    def _count_month_days(
        start: date,
        end: date,
        weekend_days: List[int],
        holidays: Set[date]
    ) -> Dict[str, int]:
        """Count weekends, holidays, and school days in a month."""
        weekend_count = 0
        holiday_count = 0
        school_days = 0
        current = start

        while current <= end:
            is_weekend = (current.weekday() + 1) % 7 in weekend_days
            is_holiday = current in holidays

            if is_weekend:
                weekend_count += 1
            if is_holiday:
                holiday_count += 1
            if not is_weekend and not is_holiday:
                school_days += 1

            current += timedelta(days=1)

        return {
            'total_days': (end - start).days + 1,
            'weekends': weekend_count,
            'holidays': holiday_count,
            'school_days': school_days
        }
