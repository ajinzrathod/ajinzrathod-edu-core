from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import TimetableEntry, Absence, Proxy
from .serializers import TimetableEntrySerializer, AbsenceSerializer, ProxySerializer
from records.models import ClassRoom, Teacher


# ============================================================================
# Timetable Management
# ============================================================================

class TimetableListView(generics.ListCreateAPIView):
    """List all timetable entries or create a new one."""
    serializer_class = TimetableEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter timetable by user's school and current academic year"""
        from records.models import AcademicYear

        # Get current academic year
        current_year = AcademicYear.objects.filter(
            school=self.request.user.school,
            is_current=True
        ).first()

        # Filter by school first, then by year if available
        queryset = TimetableEntry.objects.filter(
            classroom__school=self.request.user.school
        ).select_related('classroom', 'teacher', 'teacher__user')

        # If we have a current year, we could filter classrooms by it
        # For now, we'll return all timetable entries for the school
        return queryset

    def perform_create(self, serializer):
        """Create a new timetable entry"""
        serializer.save()


class TimetableDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a timetable entry."""
    serializer_class = TimetableEntrySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter timetable by user's school"""
        return TimetableEntry.objects.filter(
            classroom__school=self.request.user.school
        ).select_related('classroom', 'teacher', 'teacher__user')


class ClassroomTimetableView(APIView):
    """Get timetable for a specific classroom."""
    permission_classes = [IsAuthenticated]

    def get(self, request, classroom_id):
        """Get full timetable for a classroom"""
        try:
            classroom = ClassRoom.objects.get(id=classroom_id, school=request.user.school)
        except ClassRoom.DoesNotExist:
            return Response(
                {'error': 'Classroom not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        entries = TimetableEntry.objects.filter(
            classroom=classroom
        ).select_related('teacher', 'teacher__user').order_by('day', 'period')

        # Group by day
        timetable_by_day = {}
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

        for day in days:
            timetable_by_day[day] = {
                'day': day,
                'periods': {}
            }

        # Add entries
        for entry in entries:
            if entry.day not in timetable_by_day:
                continue

            timetable_by_day[entry.day]['periods'][entry.period] = TimetableEntrySerializer(entry).data

        # Mark free periods
        for day in days:
            for period in range(1, 6):
                if period not in timetable_by_day[day]['periods']:
                    timetable_by_day[day]['periods'][period] = {
                        'period': period,
                        'is_free': True
                    }

            timetable_by_day[day]['periods'] = dict(
                sorted(timetable_by_day[day]['periods'].items())
            )

        return Response({
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'school': classroom.school.name
            },
            'timetable': list(timetable_by_day.values())
        })


class TeacherScheduleView(APIView):
    """Get teacher's full schedule including free periods."""
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id):
        """Get teacher's timetable with free periods highlighted"""
        try:
            teacher = Teacher.objects.get(id=teacher_id, school=request.user.school)
        except Teacher.DoesNotExist:
            return Response(
                {'error': 'Teacher not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all timetable entries for this teacher
        entries = TimetableEntry.objects.filter(
            teacher=teacher
        ).select_related('classroom').order_by('day', 'period')

        # Group by day
        schedule_by_day = {}
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

        for day in days:
            schedule_by_day[day] = {
                'day': day,
                'periods': {}
            }

        # Add timetable entries
        for entry in entries:
            if entry.day not in schedule_by_day:
                continue

            schedule_by_day[entry.day]['periods'][entry.period] = {
                'period': entry.period,
                'subject': entry.subject,
                'classroom': entry.classroom.name,
                'is_free': False
            }

        # Mark free periods
        for day in days:
            for period in range(1, 6):  # 5 periods per day
                if period not in schedule_by_day[day]['periods']:
                    schedule_by_day[day]['periods'][period] = {
                        'period': period,
                        'is_free': True
                    }

            # Sort periods
            schedule_by_day[day]['periods'] = dict(
                sorted(schedule_by_day[day]['periods'].items())
            )

        return Response({
            'teacher': {
                'id': teacher.id,
                'username': teacher.user.username if teacher.user else None,
                'first_name': teacher.user.first_name if teacher.user else None,
                'last_name': teacher.user.last_name if teacher.user else None,
                'email': teacher.user.email if teacher.user else None,
            },
            'schedule': list(schedule_by_day.values())
        })


# ============================================================================
# Absence Management
# ============================================================================

class AbsenceListView(generics.ListCreateAPIView):
    """List all absences or create a new absence."""
    serializer_class = AbsenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter absences by user's school"""
        return Absence.objects.filter(
            teacher__school=self.request.user.school
        ).select_related('teacher', 'teacher__user')

    def perform_create(self, serializer):
        """Create a new absence"""
        serializer.save()


class BulkAbsenceView(APIView):
    """Mark multiple teachers as absent on a specific date."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Mark multiple teachers as absent.

        Expected body:
        {
            "teacher_ids": [1, 2, 3],
            "date": "2025-01-27",
            "reason": "School event"
        }
        """
        try:
            teacher_ids = request.data.get('teacher_ids', [])
            date = request.data.get('date')
            reason = request.data.get('reason', '')

            if not teacher_ids or not date:
                return Response(
                    {'error': 'teacher_ids and date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify all teachers belong to the user's school
            teachers = Teacher.objects.filter(
                id__in=teacher_ids,
                school=request.user.school
            )

            if teachers.count() != len(teacher_ids):
                return Response(
                    {'error': 'Some teachers not found or belong to different school'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create absences (or update existing)
            created_absences = []
            for teacher in teachers:
                absence, created = Absence.objects.update_or_create(
                    teacher=teacher,
                    date=date,
                    defaults={
                        'reason': reason,
                        'status': 'absent',
                    }
                )
                created_absences.append(absence)

            return Response({
                'success': True,
                'message': f'Marked {len(created_absences)} teachers as absent',
                'absences': AbsenceSerializer(created_absences, many=True).data
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class BulkMarkPresentView(APIView):
    """Mark multiple teachers as present (remove absence records)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Mark multiple teachers as present.

        Expected body:
        {
            "teacher_ids": [1, 2, 3],
            "date": "2025-01-27"
        }
        """
        try:
            teacher_ids = request.data.get('teacher_ids', [])
            date = request.data.get('date')

            if not teacher_ids or not date:
                return Response(
                    {'error': 'teacher_ids and date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get absences to delete
            absences = Absence.objects.filter(
                teacher__school=request.user.school,
                teacher_id__in=teacher_ids,
                date=date
            )

            count = absences.count()
            absences.delete()

            return Response({
                'success': True,
                'message': f'Marked {count} teachers as present',
                'deleted_count': count
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class AbsenceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete an absence record."""
    serializer_class = AbsenceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter absences by user's school"""
        return Absence.objects.filter(
            teacher__school=self.request.user.school
        ).select_related('teacher', 'teacher__user')


class ApproveAbsenceView(APIView):
    """Approve or reject an absence."""
    permission_classes = [IsAuthenticated]

    def post(self, request, absence_id):
        """Approve an absence"""
        try:
            absence = Absence.objects.get(id=absence_id, teacher__school=request.user.school)
        except Absence.DoesNotExist:
            return Response(
                {'error': 'Absence not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        absence.status = 'approved'
        absence.save()

        return Response({
            'success': True,
            'message': f'Absence approved for {absence.teacher.user.get_full_name()}',
            'absence': AbsenceSerializer(absence).data
        })


# ============================================================================
# Proxy Management
# ============================================================================

class ProxyListView(generics.ListCreateAPIView):
    """List all proxies or create a new proxy."""
    serializer_class = ProxySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter proxies by user's school"""
        return Proxy.objects.filter(
            classroom__school=self.request.user.school
        ).select_related(
            'absence', 'classroom', 'original_teacher', 'original_teacher__user',
            'proxy_teacher', 'proxy_teacher__user', 'assigned_by'
        )

    def perform_create(self, serializer):
        """Create a new proxy"""
        serializer.save(assigned_by=self.request.user)


class ProxyDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a proxy record."""
    serializer_class = ProxySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter proxies by user's school"""
        return Proxy.objects.filter(
            classroom__school=self.request.user.school
        ).select_related(
            'absence', 'classroom', 'original_teacher', 'original_teacher__user',
            'proxy_teacher', 'proxy_teacher__user', 'assigned_by'
        )


class CompleteProxyView(APIView):
    """Mark a proxy as completed."""
    permission_classes = [IsAuthenticated]

    def post(self, request, proxy_id):
        """Mark proxy as completed"""
        try:
            proxy = Proxy.objects.get(id=proxy_id, classroom__school=request.user.school)
        except Proxy.DoesNotExist:
            return Response(
                {'error': 'Proxy not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        proxy.status = 'completed'
        proxy.completed_at = timezone.now()
        proxy.save()

        return Response({
            'success': True,
            'message': 'Proxy marked as completed',
            'proxy': ProxySerializer(proxy).data
        })


# ============================================================================
# Teacher Availability & Proxy Assignment
# ============================================================================

class TeacherAvailabilityView(APIView):
    """Check teacher availability for a specific period and get availability status for all teachers."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get teacher availability for a specific period.

        Query params:
        - date: "2025-01-27"
        - day: "monday"
        - period: 1
        - exclude_teacher_id: 5 (optional, usually the absent teacher)
        """
        from timetable.timetable_services import TeacherAvailabilityService
        from datetime import datetime

        try:
            date_str = request.query_params.get('date')
            day = request.query_params.get('day')
            period = request.query_params.get('period')
            exclude_teacher_id = request.query_params.get('exclude_teacher_id')

            if not all([date_str, day, period]):
                return Response(
                    {'error': 'date, day, and period are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            period = int(period)

            # Get availability for all teachers
            availability = TeacherAvailabilityService.get_available_teachers_for_period(
                request.user.school,
                date_obj,
                day,
                period,
                exclude_teacher_id=int(exclude_teacher_id) if exclude_teacher_id else None
            )

            # Format response
            available_data = [
                {
                    'id': t.id,
                    'name': t.user.get_full_name() if t.user else None,
                    'email': t.user.email if t.user else None
                }
                for t in availability['available']
            ]

            unavailable_data = [
                {
                    'id': item['teacher'].id,
                    'name': item['teacher'].user.get_full_name() if item['teacher'].user else None,
                    'reason': item['reason'],
                    'reason_type': item['reason_type']  # 'class', 'proxy', or 'absent'
                }
                for item in availability['unavailable']
            ]

            return Response({
                'success': True,
                'date': date_str,
                'day': day,
                'period': period,
                'available': available_data,
                'unavailable': unavailable_data,
                'available_count': len(available_data),
                'unavailable_count': len(unavailable_data)
            })

        except ValueError as e:
            return Response(
                {'error': f'Invalid parameter format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AbsenceDetailsView(APIView):
    """Get details about an absent teacher and all their affected classes."""
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id):
        """
        Get absence details for a teacher.

        Query params:
        - date: "2025-01-27"
        """
        from timetable.timetable_services import AbsenceHandlingService
        from datetime import datetime

        try:
            date_str = request.query_params.get('date')

            if not date_str:
                return Response(
                    {'error': 'date parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify teacher exists in this school
            try:
                teacher = Teacher.objects.get(id=teacher_id, school=request.user.school)
            except Teacher.DoesNotExist:
                return Response(
                    {'error': 'Teacher not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

            # Get absence details
            details = AbsenceHandlingService.get_absence_details(teacher, date_obj)

            return Response({
                'success': True,
                'teacher': {
                    'id': teacher.id,
                    'name': teacher.user.get_full_name() if teacher.user else None,
                    'email': teacher.user.email if teacher.user else None
                },
                'date': date_str,
                'periods': details['periods'],
                'pending_proxies': details['pending_proxies'],
                'completed_proxies': details['completed_proxies'],
                'total_periods_affected': len(details['periods']),
                'total_proxies_assigned': len(details['pending_proxies']) + len(details['completed_proxies'])
            })

        except ValueError as e:
            return Response(
                {'error': f'Invalid parameter format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AssignProxyView(APIView):
    """Assign a proxy teacher for a specific period."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Assign a proxy teacher.

        Expected body:
        {
            "absence_id": 1,
            "period": 1,
            "classroom_id": 1,
            "proxy_teacher_id": 2,
            "subject": "Mathematics"
        }
        """
        from timetable.timetable_services import ProxyAssignmentService

        try:
            absence_id = request.data.get('absence_id')
            period = request.data.get('period')
            classroom_id = request.data.get('classroom_id')
            proxy_teacher_id = request.data.get('proxy_teacher_id')
            subject = request.data.get('subject')

            if not all([absence_id, period, classroom_id, proxy_teacher_id, subject]):
                return Response(
                    {'error': 'All fields are required: absence_id, period, classroom_id, proxy_teacher_id, subject'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get and verify absence
            try:
                absence = Absence.objects.get(id=absence_id, teacher__school=request.user.school)
            except Absence.DoesNotExist:
                return Response(
                    {'error': 'Absence not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get and verify classroom
            try:
                classroom = ClassRoom.objects.get(id=classroom_id, school=request.user.school)
            except ClassRoom.DoesNotExist:
                return Response(
                    {'error': 'Classroom not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get and verify proxy teacher
            try:
                proxy_teacher = Teacher.objects.get(id=proxy_teacher_id, school=request.user.school)
            except Teacher.DoesNotExist:
                return Response(
                    {'error': 'Proxy teacher not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Assign proxy
            proxy = ProxyAssignmentService.assign_proxy(
                absence=absence,
                period=period,
                classroom=classroom,
                proxy_teacher=proxy_teacher,
                assigned_by_user=request.user,
                subject=subject
            )

            return Response({
                'success': True,
                'message': 'Proxy assigned successfully',
                'proxy': ProxySerializer(proxy).data
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TeacherProxyScheduleView(APIView):
    """Get a teacher's proxy schedule for a specific day."""
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id):
        """
        Get proxy schedule for a teacher on a specific date.

        Query params:
        - date: "2025-01-27"
        """
        from timetable.timetable_services import ProxyAssignmentService
        from datetime import datetime

        try:
            date_str = request.query_params.get('date')

            if not date_str:
                return Response(
                    {'error': 'date parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify teacher exists
            try:
                teacher = Teacher.objects.get(id=teacher_id, school=request.user.school)
            except Teacher.DoesNotExist:
                return Response(
                    {'error': 'Teacher not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

            # Get schedule
            schedule = ProxyAssignmentService.get_teacher_proxy_schedule_for_day(teacher, date_obj)

            return Response({
                'success': True,
                'teacher': {
                    'id': teacher.id,
                    'name': teacher.user.get_full_name() if teacher.user else None
                },
                'date': date_str,
                'day': schedule['day'],
                'assigned_proxies': schedule['assigned_proxies'],
                'free_periods': schedule['free_periods'],
                'total_periods': schedule['total_periods'],
                'total_assigned_proxies': schedule['total_assigned_proxies']
            })

        except ValueError as e:
            return Response(
                {'error': f'Invalid parameter format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ClassroomTimetableWithAbsencesView(APIView):
    """Get full classroom timetable with absence information for a specific date."""
    permission_classes = [IsAuthenticated]

    def get(self, request, classroom_id):
        """
        Get classroom timetable with absence info.

        Query params:
        - date: "2025-01-27" (optional)
        """
        from timetable.timetable_services import TimetableDisplayService
        from datetime import datetime

        try:
            classroom = ClassRoom.objects.get(id=classroom_id, school=request.user.school)
        except ClassRoom.DoesNotExist:
            return Response(
                {'error': 'Classroom not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        date_str = request.query_params.get('date')
        date_obj = None

        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format, use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        from timetable.timetable_services import TimetableDisplayService
        timetable = TimetableDisplayService.get_classroom_timetable_with_absences(classroom, date_obj)

        return Response({
            'success': True,
            **timetable
        })


class TeacherScheduleWithAbsencesView(APIView):
    """Get full teacher schedule with absence information for a specific date."""
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id):
        """
        Get teacher schedule with absence info.

        Query params:
        - date: "2025-01-27" (optional)
        """
        from timetable.timetable_services import TimetableDisplayService
        from datetime import datetime

        try:
            teacher = Teacher.objects.get(id=teacher_id, school=request.user.school)
        except Teacher.DoesNotExist:
            return Response(
                {'error': 'Teacher not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        date_str = request.query_params.get('date')
        date_obj = None

        if date_str:
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format, use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        from timetable.timetable_services import TimetableDisplayService
        schedule = TimetableDisplayService.get_teacher_full_schedule_with_absences(teacher, date_obj)

        return Response({
            'success': True,
            **schedule
        })
