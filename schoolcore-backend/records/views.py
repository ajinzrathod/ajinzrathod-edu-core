"""
Pure HTTP layer - nothing else.
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import (
    AcademicYear, Attendance, Holiday, Device, Teacher
)
from .serializers import (
    LoginSerializer, ClassRoomSerializer,
    AttendanceSerializer, HolidaySerializer, AcademicYearSerializer,
    StudentDetailSerializer, AuditLogSerializer, DeviceSerializer,
    TeacherSerializer
)
from .utils import get_current_academic_year, generate_device_fingerprint, get_device_info
from .handlers import AuthenticationHandler
from .attendance_handler import AttendanceFilterHandler
from .queries import (
    UserQueries, AcademicYearQueries, ClassroomQueries, StudentQueries,
    AttendanceQueries, HolidayQueries
)
from .formatters import (
    UserResponseFormatter, AttendanceResponseFormatter, WeekendResponseFormatter
)
from .view_services import (
    YearService, AttendanceCreationService, StatisticsRetrievalService
)
from .api_audit import APIAuditMixin
from django.utils import timezone
from django.db.models import Q


# ============================================================================
# Authentication
# ============================================================================

class LoginView(APIView):
    """User login endpoint with device verification for admins."""
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        user_type = serializer.validated_data['user_type']

        # Generate device fingerprint
        device_fingerprint = generate_device_fingerprint(request)
        device_info = get_device_info(request)

        # Check if this is an admin login
        if user_type in ['admin', 'schooladmin']:
            # Check or create device record
            device, created = Device.objects.get_or_create(
                user=user,
                device_fingerprint=device_fingerprint,
                defaults={'device_info': device_info}
            )

            # Update login attempt info
            if not created:
                device.login_attempts += 1
                device.last_login_attempt = timezone.now()
                device.save(update_fields=['login_attempts', 'last_login_attempt'])

            # Check if device is approved
            if not device.is_approved:
                return Response(
                    {
                        'error': 'Device not verified',
                        'message': 'Your device is not yet approved. Please ask your super admin to approve this device.',
                        'device_id': device.id,
                        'device_info': device_info,
                        'status': 'pending_approval'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            # Device is approved, proceed with login
            tokens = AuthenticationHandler.generate_tokens(user)
            response_data = UserResponseFormatter.login(tokens, {
                'id': user.id, 'username': user.username,
                'first_name': user.first_name, 'last_name': user.last_name,
                'email': user.email, 'user_type': user_type,
                'school__id': user.school.id, 'school__name': user.school.name
            }, user_type)

            return Response(response_data)

        # Non-admin users (students) can login directly
        tokens = AuthenticationHandler.generate_tokens(user)
        response_data = UserResponseFormatter.login(tokens, {
            'id': user.id, 'username': user.username,
            'first_name': user.first_name, 'last_name': user.last_name,
            'email': user.email, 'user_type': user_type,
            'school__id': user.school.id, 'school__name': user.school.name
        }, user_type)

        return Response(response_data)


# ============================================================================
# User
# ============================================================================

class UserDetailView(APIView):
    """Get current user profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_data = UserQueries.get_user_detail(request.user.id)
        return Response(UserResponseFormatter.profile(user_data))


# ============================================================================
# Academic Years
# ============================================================================

class AcademicYearListView(generics.ListAPIView):
    """List academic years."""
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AcademicYearQueries.get_school_years(self.request.user.school)


# ============================================================================
# Classrooms
# ============================================================================

class ClassListView(APIAuditMixin, generics.ListCreateAPIView):
    """List or create classrooms."""
    serializer_class = ClassRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        year_id = self.request.query_params.get('year_id')
        return ClassroomQueries.get_school_classrooms(
            self.request.user.school, year_id
        )

    def perform_create(self, serializer):
        instance = serializer.save(school=self.request.user.school)
        # Log the creation
        changes = {
            'name': {'old': None, 'new': instance.name},
            'academic_year_id': {'old': None, 'new': instance.academic_year_id},
            'start_date': {'old': None, 'new': instance.start_date.isoformat() if instance.start_date else None},
            'end_date': {'old': None, 'new': instance.end_date.isoformat() if instance.end_date else None},
        }
        self.log_api_action('create', instance, changes)


class ClassDetailView(APIAuditMixin, generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete classroom."""
    serializer_class = ClassRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ClassroomQueries.get_school_classrooms(
            self.request.user.school
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        old_values = {
            'name': instance.name,
            'academic_year_id': instance.academic_year_id,
            'start_date': instance.start_date.isoformat() if instance.start_date else None,
            'end_date': instance.end_date.isoformat() if instance.end_date else None,
        }

        instance = serializer.save(school=self.request.user.school)

        # Build changes
        changes = {}
        new_values = {
            'name': instance.name,
            'academic_year_id': instance.academic_year_id,
            'start_date': instance.start_date.isoformat() if instance.start_date else None,
            'end_date': instance.end_date.isoformat() if instance.end_date else None,
        }

        for field, new_value in new_values.items():
            old_value = old_values.get(field)
            if old_value != new_value:
                changes[field] = {'old': old_value, 'new': new_value}

        if changes:
            self.log_api_action('update', instance, changes)


# ============================================================================
# Students
# ============================================================================

class StudentListView(APIAuditMixin, generics.ListCreateAPIView):
    """List or create students."""
    serializer_class = StudentDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudentQueries.get_students(
            self.request.user.school,
            self.kwargs.get('classroom_id'),
            self.request.query_params.get('year_id')
        )

    def perform_create(self, serializer):
        instance = serializer.save()
        # Log the creation
        changes = {
            'roll_number': {'old': None, 'new': instance.roll_number},
            'classroom_id': {'old': None, 'new': instance.classroom_id},
            'user_id': {'old': None, 'new': instance.user_id},
        }
        self.log_api_action('create', instance, changes)


class StudentDetailView(APIAuditMixin, generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete student."""
    serializer_class = StudentDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudentQueries.get_students(self.request.user.school)


class UserSearchView(APIView):
    """Search for existing users by first and last name."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        first_name = request.query_params.get('first_name', '').strip()
        last_name = request.query_params.get('last_name', '').strip()

        if not first_name or not last_name:
            return Response(
                {'error': 'first_name and last_name parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        users = list(UserQueries.search_user_by_name(
            first_name, last_name, request.user.school
        ))

        from .serializers import UserSearchSerializer
        serializer = UserSearchSerializer(users, many=True)
        return Response({'users': serializer.data, 'count': len(serializer.data)})


class StudentCreateView(APIAuditMixin, generics.CreateAPIView):
    """Create a new student with user search/creation."""
    serializer_class = StudentDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Use StudentCreationSerializer for POST requests."""
        if self.request.method == 'POST':
            from .serializers import StudentCreationSerializer
            return StudentCreationSerializer
        return StudentDetailSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        changes = {
            'roll_number': {'old': None, 'new': instance.roll_number},
            'classroom_id': {'old': None, 'new': instance.classroom_id},
            'user_id': {'old': None, 'new': instance.user_id},
        }
        self.log_api_action('create', instance, changes)


# ============================================================================
# Attendance
# ============================================================================

class StudentAttendanceView(generics.ListAPIView):
    """List student attendance records."""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        student_id = self.kwargs.get("student_id")
        year_id = self.request.query_params.get("year_id")
        user = self.request.user

        if not student_id or not year_id:
            return Attendance.objects.none()

        if not StudentQueries.student_exists(student_id, user.school):
            return Attendance.objects.none()

        return AttendanceQueries.get_student_attendance(student_id, year_id)


class AttendanceListView(generics.ListAPIView):
    """List attendance records with filters."""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AttendanceQueries.get_attendance_by_school(
            self.request.user.school
        )

        queryset = AttendanceFilterHandler.filter_attendance_records(
            queryset,
            year_id=self.request.query_params.get('year_id'),
            classroom_id=self.kwargs.get('classroom_id'),
            date=self.request.query_params.get('date'),
            month=self.request.query_params.get('month'),
            user=self.request.user
        )

        return AttendanceFilterHandler.optimize_queryset(queryset)


class AttendanceCreateView(APIView):
    """Create or update attendance records."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        records = self._extract_records(request.data)

        if not records:
            return Response(
                {'error': 'No records provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        year = YearService.get_year_or_current(
            records[0].get('year_id') if records else None,
            request.user.school
        )

        if not year:
            return Response(
                {'error': 'Academic year not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Pass request user for audit logging
        count, errors = AttendanceCreationService.create_from_request(
            records, year, request.user.school, performed_by=request.user
        )

        if count == 0 and errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            AttendanceResponseFormatter.create_bulk(count, len(records), errors)
        )

    @staticmethod
    def _extract_records(data: dict) -> list:
        """Extract attendance records from request data."""
        records = data.get('attendance', [])
        if not isinstance(records, list):
            records = [data]
        return records


class AttendanceDetailView(APIView):
    """Update or delete attendance record."""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        attendance = AttendanceQueries.get_attendance_record(pk, self.request.user.school)

        if not attendance:
            return Response(
                {'error': 'Attendance not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        old_present = attendance.present
        attendance.present = request.data.get('present', attendance.present)
        attendance.save()

        # Log the update
        if old_present != attendance.present:
            from .services import AuditLogService
            AuditLogService.log_action(
                action='update',
                performed_by=request.user,
                model_name='Attendance',
                object_id=attendance.id,
                object_display=str(attendance),
                changes={'present': {'old': old_present, 'new': attendance.present}}
            )

        from .serializers import AttendanceSerializer
        return Response(AttendanceSerializer(attendance).data)

    def delete(self, request, pk):
        attendance = AttendanceQueries.get_attendance_record(pk, self.request.user.school)

        if not attendance:
            return Response(
                {'error': 'Attendance not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Log the deletion
        from .services import AuditLogService
        AuditLogService.log_action(
            action='delete',
            performed_by=request.user,
            model_name='Attendance',
            object_id=attendance.id,
            object_display=str(attendance),
            changes={'deleted': {'old': False, 'new': True}}
        )

        attendance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Statistics
# ============================================================================

class AttendanceStatisticsView(APIView):
    """Get attendance statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = YearService.get_year_or_current(
            request.query_params.get('year_id'),
            request.user.school
        )

        if not year:
            return Response(
                {'error': 'Academic year not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        period = request.query_params.get('period', 'monthly')
        classroom_id = request.query_params.get('classroom_id')

        stats_data = StatisticsRetrievalService.get_classroom_statistics(
            request.user.school, year, classroom_id, period
        )

        return Response(
            AttendanceResponseFormatter.statistics(
                period, year.year, stats_data['classroom'], stats_data['statistics']
            )
        )


class SchoolWideStatisticsView(APIView):
    """Get school-wide attendance statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = YearService.get_year_or_current(
            request.query_params.get('year_id'),
            request.user.school
        )

        if not year:
            return Response(
                {'error': 'Academic year not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        period = request.query_params.get('period', 'overall')

        # Extract month and year for monthly period
        month = request.query_params.get('month')
        year_month = request.query_params.get('year')

        month = int(month) if month else None
        year_month = int(year_month) if year_month else None

        stats = StatisticsRetrievalService.get_school_statistics(
            request.user.school, year, period, month=month, year_month=year_month
        )

        return Response(
            AttendanceResponseFormatter.school_wide_statistics(stats, period)
        )


# ============================================================================
# Holidays
# ============================================================================

class HolidayListCreateView(APIAuditMixin, generics.ListCreateAPIView):
    """List or create holidays."""
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        year_id = self.request.query_params.get('year_id')

        if not year_id:
            year_id = AcademicYear.objects.filter(
                school=self.request.user.school, is_current=True
            ).values_list('id', flat=True).first()

        return HolidayQueries.get_holidays(year_id, self.request.user.school) if year_id \
            else Holiday.objects.none()

    def perform_create(self, serializer):
        year = YearService.get_year_or_current(
            self.request.data.get('year_id'),
            self.request.user.school
        )
        instance = serializer.save(year=year)

        # Log the creation
        changes = {
            'date': {'old': None, 'new': instance.date.isoformat()},
            'name': {'old': None, 'new': instance.name},
        }
        self.log_api_action('create', instance, changes)


class HolidayDetailView(APIAuditMixin, generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete holiday."""
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Holiday.objects.filter(
            year__school=self.request.user.school
        ).select_related('year')


# ============================================================================
# Configuration
# ============================================================================

class SchoolWeekendView(APIView):
    """Get weekend configuration."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = get_current_academic_year(request.user.school)
        weekend_days = year.weekend_days if year else [0]
        weekend_days = weekend_days if weekend_days else [0]

        return Response(WeekendResponseFormatter.weekend_config(weekend_days))


# ============================================================================
# Audit Logs
# ============================================================================

class AuditLogListView(generics.ListAPIView):
    """List audit logs for the school with pagination."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # We'll implement custom pagination

    def get_queryset(self):
        from .models import AuditLog
        school = self.request.user.school

        # Filter by school through performed_by user's school
        qs = AuditLog.objects.filter(performed_by__school=school)

        # Optional filters
        model_name = self.request.query_params.get('model')
        action = self.request.query_params.get('action')

        if model_name:
            qs = qs.filter(model_name=model_name)
        if action:
            qs = qs.filter(action=action)

        return qs.order_by('-timestamp')

    def list(self, request, *args, **kwargs):
        """Override list to add pagination."""
        queryset = self.get_queryset()

        # Get pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        # Validate page_size (max 100)
        if page_size > 100:
            page_size = 100
        if page_size < 1:
            page_size = 20
        if page < 1:
            page = 1

        # Calculate offset and limit
        offset = (page - 1) * page_size
        total_count = queryset.count()
        total_pages = (total_count + page_size - 1) // page_size

        # Get paginated data
        paginated_data = queryset[offset:offset + page_size]
        serializer = self.get_serializer(paginated_data, many=True)

        return Response({
            'results': serializer.data,
            'pagination': {
                'current_page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_previous': page > 1,
            }
        })


# ============================================================================
# App Configuration
# ============================================================================

class AppConfigView(APIView):
    """Get global app configuration."""
    permission_classes = []  # Public endpoint

    def get(self, request):
        from .config import APP_NAME, APP_VERSION, APP_DESCRIPTION

        return Response({
            'app_name': APP_NAME,
            'app_version': APP_VERSION,
            'app_description': APP_DESCRIPTION,
        })


# ============================================================================
# Device Management
# ============================================================================

class PendingDevicesListView(generics.ListAPIView):
    """List all pending devices for approval (super admin only)."""
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter to only show pending devices
        return Device.objects.filter(is_approved=False).order_by('-last_login_attempt')


class DeviceApprovalView(APIView):
    """Approve or reject a device."""
    permission_classes = [IsAuthenticated]

    def post(self, request, device_id):
        """Approve a device"""
        try:
            device = Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            return Response(
                {'error': 'Device not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        device.is_approved = True
        device.approved_by = request.user
        device.approved_at = timezone.now()
        device.save(update_fields=['is_approved', 'approved_by', 'approved_at'])

        return Response({
            'success': True,
            'message': f'Device approved for user {device.user.username}',
            'device': DeviceSerializer(device).data
        })

    def delete(self, request, device_id):
        """Reject/delete a device"""
        try:
            device = Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            return Response(
                {'error': 'Device not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user_username = device.user.username
        device.delete()

        return Response({
            'success': True,
            'message': f'Device rejected for user {user_username}'
        })


class UserDevicesListView(generics.ListAPIView):
    """List all devices for a specific user."""
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        return Device.objects.filter(user_id=user_id).order_by('-last_login_attempt')


# ============================================================================
# Teacher Management
# ============================================================================

class TeacherListView(generics.ListCreateAPIView):
    """List all teachers for the school or create a new teacher."""
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter teachers by user's school"""
        return Teacher.objects.filter(school=self.request.user.school).select_related('user')

    def perform_create(self, serializer):
        """Create a new teacher"""
        serializer.save(school=self.request.user.school)


class TeacherDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete a specific teacher."""
    serializer_class = TeacherSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter teachers by user's school"""
        return Teacher.objects.filter(school=self.request.user.school).select_related('user')


# ============================================================================
# Placeholder for future expansions
# ============================================================================
# Timetable, Absence, and Proxy management has been moved to the 'timetable' app


