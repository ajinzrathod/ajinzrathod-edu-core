"""
Service layer for timetable and proxy management.
Handles business logic for displaying teacher availability and assigning proxies.
"""

from datetime import date as date_type
from timetable.models import TimetableEntry, Absence, Proxy
from records.models import Teacher, ClassRoom


class TeacherAvailabilityService:
    """
    Service to check teacher availability for a specific time slot.

    A teacher is available for proxy if:
    1. They don't have a class scheduled at that period
    2. They don't already have a proxy assigned for that period
    3. They are not absent on that date
    """

    @staticmethod
    def get_teacher_availability_for_period(
        teacher: Teacher,
        date: date_type,
        day: str,
        period: int
    ) -> dict:
        """
        Check if a teacher is available for a specific period.

        Args:
            teacher: Teacher object
            date: Date in question
            day: Day of week ('monday', 'tuesday', etc.)
            period: Period number

        Returns:
            {
                'available': bool,
                'reason': str or None,  # Why not available if unavailable
                'has_class': bool,
                'has_proxy': bool,
                'is_absent': bool
            }
        """
        result = {
            'available': True,
            'reason': None,
            'has_class': False,
            'has_proxy': False,
            'is_absent': False
        }

        # Check 1: Is teacher absent on this date?
        is_absent = Absence.objects.filter(
            teacher=teacher,
            date=date,
            status='absent'
        ).exists()

        if is_absent:
            result['available'] = False
            result['is_absent'] = True
            result['reason'] = 'Teacher is absent on this date'
            return result

        # Check 2: Does teacher have a class at this period?
        has_class = TimetableEntry.objects.filter(
            teacher=teacher,
            day=day,
            period=period
        ).exists()

        if has_class:
            result['available'] = False
            result['has_class'] = True
            result['reason'] = 'Teacher has a scheduled class at this period'
            return result

        # Check 3: Does teacher already have a proxy assigned at this period?
        has_proxy = Proxy.objects.filter(
            proxy_teacher=teacher,
            date=date,
            day=day,
            period=period,
            status__in=['assigned', 'completed']
        ).exists()

        if has_proxy:
            result['available'] = False
            result['has_proxy'] = True
            result['reason'] = 'Teacher already has a proxy assigned at this period'
            return result

        return result

    @staticmethod
    def get_available_teachers_for_period(
        school,
        date: date_type,
        day: str,
        period: int,
        exclude_teacher_id=None
    ) -> dict:
        """
        Get all teachers and their availability status for a specific period.

        Args:
            school: School object
            date: Date in question
            day: Day of week
            period: Period number
            exclude_teacher_id: Teacher ID to exclude (usually the absent teacher)

        Returns:
            {
                'available': [teacher objects],
                'unavailable': [
                    {
                        'teacher': teacher object,
                        'reason': str,
                        'reason_type': 'class' | 'proxy' | 'absent'
                    },
                    ...
                ]
            }
        """
        all_teachers = Teacher.objects.filter(
            school=school
        ).select_related('user')

        if exclude_teacher_id:
            all_teachers = all_teachers.exclude(id=exclude_teacher_id)

        available_teachers = []
        unavailable_teachers = []

        for teacher in all_teachers:
            availability = TeacherAvailabilityService.get_teacher_availability_for_period(
                teacher, date, day, period
            )

            if availability['available']:
                available_teachers.append(teacher)
            else:
                reason_type = 'class' if availability['has_class'] else \
                             'proxy' if availability['has_proxy'] else \
                             'absent'

                unavailable_teachers.append({
                    'teacher': teacher,
                    'reason': availability['reason'],
                    'reason_type': reason_type
                })

        return {
            'available': available_teachers,
            'unavailable': unavailable_teachers
        }


class AbsenceHandlingService:
    """Service to handle absent teacher scenarios."""

    @staticmethod
    def get_absent_teacher_periods(teacher: Teacher, date: date_type) -> list:
        """
        Get all periods that an absent teacher was supposed to teach.

        Returns:
            [
                {
                    'period': int,
                    'day': str,
                    'subject': str,
                    'classroom': ClassRoom object,
                    'classroom_name': str,
                    'timetable_entry_id': int
                },
                ...
            ]
        """
        # Get the day of week from the date
        day_name = date.strftime('%A').lower()

        # Get all classes this teacher teaches on this day
        timetable_entries = TimetableEntry.objects.filter(
            teacher=teacher,
            day=day_name
        ).select_related('classroom')

        periods = []
        for entry in timetable_entries:
            periods.append({
                'period': entry.period,
                'day': entry.day,
                'subject': entry.subject,
                'classroom': entry.classroom,
                'classroom_name': entry.classroom.name,
                'timetable_entry_id': entry.id
            })

        return periods

    @staticmethod
    def get_absence_details(teacher: Teacher, date: date_type) -> dict:
        """
        Get comprehensive details about an absence including all periods affected.

        Returns:
            {
                'teacher': teacher object,
                'date': date,
                'periods': [...],  # From get_absent_teacher_periods
                'pending_proxies': [...],  # Proxies assigned but not completed
                'completed_proxies': [...]
            }
        """
        periods = AbsenceHandlingService.get_absent_teacher_periods(teacher, date)

        # Get absence record
        absence = Absence.objects.filter(
            teacher=teacher,
            date=date,
            status='absent'
        ).first()

        # Get proxies
        pending_proxies = []
        completed_proxies = []

        if absence:
            pending = Proxy.objects.filter(
                absence=absence,
                status='assigned'
            ).select_related('proxy_teacher', 'proxy_teacher__user')

            completed = Proxy.objects.filter(
                absence=absence,
                status='completed'
            ).select_related('proxy_teacher', 'proxy_teacher__user')

            pending_proxies = [
                {
                    'id': p.id,
                    'period': p.period,
                    'classroom': p.classroom.name,
                    'proxy_teacher': {
                        'id': p.proxy_teacher.id,
                        'name': p.proxy_teacher.user.get_full_name() if p.proxy_teacher.user else None
                    },
                    'subject': p.subject
                }
                for p in pending
            ]

            completed_proxies = [
                {
                    'id': p.id,
                    'period': p.period,
                    'classroom': p.classroom.name,
                    'proxy_teacher': {
                        'id': p.proxy_teacher.id,
                        'name': p.proxy_teacher.user.get_full_name() if p.proxy_teacher.user else None
                    },
                    'subject': p.subject
                }
                for p in completed
            ]

        return {
            'teacher': teacher,
            'date': date,
            'periods': periods,
            'pending_proxies': pending_proxies,
            'completed_proxies': completed_proxies
        }


class ProxyAssignmentService:
    """Service to handle proxy assignments."""

    @staticmethod
    def assign_proxy(
        absence: Absence,
        period: int,
        classroom: ClassRoom,
        proxy_teacher: Teacher,
        assigned_by_user,
        subject: str
    ) -> Proxy:
        """
        Assign a proxy teacher for a specific period.

        Args:
            absence: Absence object
            period: Period number
            classroom: ClassRoom object
            proxy_teacher: Teacher object (the substitute)
            assigned_by_user: User assigning the proxy
            subject: Subject name

        Returns:
            Proxy object (created or updated)
        """
        day = absence.date.strftime('%A').lower()

        proxy, created = Proxy.objects.update_or_create(
            absence=absence,
            classroom=classroom,
            day=day,
            period=period,
            defaults={
                'original_teacher': absence.teacher,
                'proxy_teacher': proxy_teacher,
                'subject': subject,
                'date': absence.date,
                'status': 'assigned',
                'assigned_by': assigned_by_user,
            }
        )

        return proxy

    @staticmethod
    def get_teacher_proxy_schedule_for_day(
        teacher: Teacher,
        date: date_type
    ) -> dict:
        """
        Get all proxy assignments for a teacher on a specific day.

        Returns:
            {
                'teacher': teacher object,
                'date': date,
                'day': str,
                'assigned_proxies': [
                    {
                        'period': int,
                        'classroom': str,
                        'subject': str,
                        'original_teacher': str,
                        'status': str
                    }
                ],
                'free_periods': [1, 2, 5],  # Periods not affected by proxies
                'total_periods': 5  # Total periods in a day
            }
        """
        day = date.strftime('%A').lower()

        # Get all proxies for this teacher on this day
        proxies = Proxy.objects.filter(
            proxy_teacher=teacher,
            date=date,
            status__in=['assigned', 'completed']
        ).select_related('original_teacher', 'original_teacher__user')

        proxy_periods = {}
        for proxy in proxies:
            proxy_periods[proxy.period] = {
                'period': proxy.period,
                'classroom': proxy.classroom.name,
                'subject': proxy.subject,
                'original_teacher': proxy.original_teacher.user.get_full_name() if proxy.original_teacher.user else None,
                'status': proxy.status,
                'proxy_id': proxy.id
            }

        # Determine free periods (assuming 5 periods per day)
        total_periods = 5
        all_periods = set(range(1, total_periods + 1))
        assigned_periods = set(proxy_periods.keys())
        free_periods = sorted(list(all_periods - assigned_periods))

        return {
            'teacher': teacher,
            'date': date,
            'day': day,
            'assigned_proxies': list(proxy_periods.values()),
            'free_periods': free_periods,
            'total_periods': total_periods,
            'total_assigned_proxies': len(proxy_periods)
        }

    @staticmethod
    def cancel_proxy(proxy_id: int) -> bool:
        """Cancel a proxy assignment."""
        try:
            proxy = Proxy.objects.get(id=proxy_id)
            proxy.status = 'cancelled'
            proxy.save()
            return True
        except Proxy.DoesNotExist:
            return False


class TimetableDisplayService:
    """Service to format and display timetables."""

    @staticmethod
    def get_classroom_timetable_with_absences(
        classroom: ClassRoom,
        date: date_type = None
    ) -> dict:
        """
        Get classroom timetable, optionally showing absence info for a specific date.

        Args:
            classroom: ClassRoom object
            date: Optional specific date to show absence info

        Returns:
            {
                'classroom': {...},
                'timetable': {
                    'monday': [
                        {
                            'period': 1,
                            'subject': 'Math',
                            'teacher': {...},
                            'teacher_absent': bool,
                            'proxies': [...]
                        },
                        ...
                    ],
                    ...
                }
            }
        """
        timetable_entries = TimetableEntry.objects.filter(
            classroom=classroom
        ).select_related('teacher', 'teacher__user')

        timetable_by_day = {
            'monday': [],
            'tuesday': [],
            'wednesday': [],
            'thursday': [],
            'friday': [],
        }

        for entry in timetable_entries:
            day = entry.day

            teacher_absent = False
            proxies = []

            if date:
                # Check if teacher is absent
                teacher_absent = Absence.objects.filter(
                    teacher=entry.teacher,
                    date=date,
                    status='absent'
                ).exists()

                # Get proxies for this period
                if teacher_absent:
                    proxies_qs = Proxy.objects.filter(
                        original_teacher=entry.teacher,
                        classroom=classroom,
                        day=day,
                        period=entry.period,
                        date=date,
                        status__in=['assigned', 'completed']
                    ).select_related('proxy_teacher', 'proxy_teacher__user')

                    proxies = [
                        {
                            'id': p.id,
                            'proxy_teacher_name': p.proxy_teacher.user.get_full_name() if p.proxy_teacher.user else None,
                            'status': p.status
                        }
                        for p in proxies_qs
                    ]

            timetable_entry_data = {
                'period': entry.period,
                'subject': entry.subject,
                'teacher': {
                    'id': entry.teacher.id,
                    'name': entry.teacher.user.get_full_name() if entry.teacher.user else None
                },
                'teacher_absent': teacher_absent,
                'proxies': proxies
            }

            timetable_by_day[day].append(timetable_entry_data)

        # Sort by period
        for day in timetable_by_day:
            timetable_by_day[day].sort(key=lambda x: x['period'])

        return {
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'school': classroom.school.name
            },
            'timetable': timetable_by_day
        }

    @staticmethod
    def get_teacher_full_schedule_with_absences(
        teacher: Teacher,
        date: date_type = None
    ) -> dict:
        """
        Get teacher's full schedule, optionally showing absence info for a specific date.

        Args:
            teacher: Teacher object
            date: Optional specific date

        Returns:
            {
                'teacher': {...},
                'schedule': {
                    'monday': [
                        {
                            'period': 1,
                            'subject': 'Math',
                            'classroom': {...},
                            'is_absent': bool,
                            'proxies': []
                        },
                        ...
                    ],
                    ...
                },
                'is_absent_on_date': bool  # If date provided
            }
        """
        entries = TimetableEntry.objects.filter(
            teacher=teacher
        ).select_related('classroom')

        schedule_by_day = {
            'monday': [],
            'tuesday': [],
            'wednesday': [],
            'thursday': [],
            'friday': [],
        }

        is_absent_on_date = False

        if date:
            is_absent_on_date = Absence.objects.filter(
                teacher=teacher,
                date=date,
                status='absent'
            ).exists()

        for entry in entries:
            day = entry.day

            proxies = []
            if date and is_absent_on_date:
                # Get proxies assigned for this period
                proxies_qs = Proxy.objects.filter(
                    original_teacher=teacher,
                    classroom=entry.classroom,
                    day=day,
                    period=entry.period,
                    date=date,
                    status__in=['assigned', 'completed']
                ).select_related('proxy_teacher', 'proxy_teacher__user')

                proxies = [
                    {
                        'id': p.id,
                        'proxy_teacher_name': p.proxy_teacher.user.get_full_name() if p.proxy_teacher.user else None,
                        'status': p.status
                    }
                    for p in proxies_qs
                ]

            schedule_entry_data = {
                'period': entry.period,
                'subject': entry.subject,
                'classroom': {
                    'id': entry.classroom.id,
                    'name': entry.classroom.name
                },
                'is_absent': is_absent_on_date,
                'proxies': proxies
            }

            schedule_by_day[day].append(schedule_entry_data)

        # Sort by period
        for day in schedule_by_day:
            schedule_by_day[day].sort(key=lambda x: x['period'])

        return {
            'teacher': {
                'id': teacher.id,
                'name': teacher.user.get_full_name() if teacher.user else None,
                'email': teacher.user.email if teacher.user else None
            },
            'schedule': schedule_by_day,
            'is_absent_on_date': is_absent_on_date,
            'date': date
        }
