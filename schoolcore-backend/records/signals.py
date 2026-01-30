"""
Django signals for automatic audit logging of model changes.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import (
    User, ClassRoom, Student, Attendance, Holiday, AcademicYear, School, AuditLog
)
from .services import AuditLogService
from .config import ENABLE_AUDIT_LOGS


# Models to audit (excluding AuditLog itself and School)
AUDITED_MODELS = {
    'User': User,
    'ClassRoom': ClassRoom,
    'Student': Student,
    'Attendance': Attendance,
    'Holiday': Holiday,
    'AcademicYear': AcademicYear,
}


def _get_request_user():
    """Get the current request user from middleware thread-local storage or Django admin."""
    try:
        from schoolcore.middleware import get_request_user
        user = get_request_user()
        # Return the user only if they are authenticated
        if user and user.is_authenticated:
            return user
    except ImportError:
        pass

    # Fallback: Try to get user from Django's thread-local request if available
    try:
        from django.core.exceptions import ImproperlyConfigured
        from django.core.handlers.wsgi import WSGIHandler
        from threading import current_thread
        import inspect

        # Look through the call stack for a request object
        for frame_info in inspect.stack():
            frame = frame_info.frame
            if 'request' in frame.f_locals:
                request = frame.f_locals['request']
                if hasattr(request, 'user') and hasattr(request.user, 'is_authenticated'):
                    if request.user.is_authenticated:
                        return request.user
            if 'self' in frame.f_locals:
                obj = frame.f_locals['self']
                if hasattr(obj, 'request') and hasattr(obj.request, 'user'):
                    if obj.request.user.is_authenticated:
                        return obj.request.user
    except:
        pass

    return None


def _should_log_change(instance):
    """Check if an instance change should be logged."""
    if not ENABLE_AUDIT_LOGS:
        return False

    # Don't log AuditLog changes
    if isinstance(instance, AuditLog):
        return False

    # Don't log School changes directly (log through user/classroom)
    if isinstance(instance, School):
        return False

    # Skip models that are logged via API (to avoid duplicates)
    # API logging handles: ClassRoom, Student, Holiday, Attendance
    # Keep signal logging only for: User, AcademicYear
    api_logged_models = (ClassRoom, Student, Holiday, Attendance)
    if isinstance(instance, api_logged_models):
        return False

    return True


@receiver(post_save, sender=User)
def log_user_change(sender, instance, created, **kwargs):
    """Log user creation or update."""
    if not _should_log_change(instance):
        return

    try:
        school = instance.school
    except:
        return

    action = 'create' if created else 'update'
    changes = {}

    if created:
        # For creates, include all relevant fields
        changes = {
            'username': {'old': None, 'new': instance.username},
            'first_name': {'old': None, 'new': instance.first_name},
            'last_name': {'old': None, 'new': instance.last_name},
            'email': {'old': None, 'new': instance.email},
            'user_type': {'old': None, 'new': instance.user_type},
        }

    AuditLogService.log_action(
        action=action,
        performed_by=instance,
        model_name='User',
        object_id=instance.id,
        object_display=str(instance),
        changes=changes
    )


@receiver(post_delete, sender=User)
def log_user_delete(sender, instance, **kwargs):
    """Log user deletion."""
    if not _should_log_change(instance):
        return

    AuditLogService.log_action(
        action='delete',
        performed_by=_get_request_user(),
        model_name='User',
        object_id=instance.id,
        object_display=str(instance),
        changes={'deleted': {'old': False, 'new': True}}
    )


@receiver(post_save, sender=ClassRoom)
def log_classroom_change(sender, instance, created, **kwargs):
    """Log classroom creation or update."""
    if not _should_log_change(instance):
        return

    action = 'create' if created else 'update'
    changes = {}

    if created:
        changes = {
            'name': {'old': None, 'new': instance.name},
            'academic_year_id': {'old': None, 'new': instance.academic_year_id},
            'start_date': {'old': None, 'new': instance.start_date.isoformat() if instance.start_date else None},
            'end_date': {'old': None, 'new': instance.end_date.isoformat() if instance.end_date else None},
        }

    AuditLogService.log_action(
        action=action,
        performed_by=_get_request_user(),
        model_name='ClassRoom',
        object_id=instance.id,
        object_display=str(instance),
        changes=changes
    )


@receiver(post_delete, sender=ClassRoom)
def log_classroom_delete(sender, instance, **kwargs):
    """Log classroom deletion."""
    if not _should_log_change(instance):
        return

    AuditLogService.log_action(
        action='delete',
        performed_by=_get_request_user(),
        model_name='ClassRoom',
        object_id=instance.id,
        object_display=str(instance),
        changes={'deleted': {'old': False, 'new': True}}
    )


@receiver(post_save, sender=Student)
def log_student_change(sender, instance, created, **kwargs):
    """Log student creation or update."""
    if not _should_log_change(instance):
        return

    action = 'create' if created else 'update'
    changes = {}

    if created:
        changes = {
            'roll_number': {'old': None, 'new': instance.roll_number},
            'classroom_id': {'old': None, 'new': instance.classroom_id},
            'user_id': {'old': None, 'new': instance.user_id},
        }

    AuditLogService.log_action(
        action=action,
        performed_by=_get_request_user(),
        model_name='Student',
        object_id=instance.id,
        object_display=str(instance),
        changes=changes
    )


@receiver(post_delete, sender=Student)
def log_student_delete(sender, instance, **kwargs):
    """Log student deletion."""
    if not _should_log_change(instance):
        return

    AuditLogService.log_action(
        action='delete',
        performed_by=_get_request_user(),
        model_name='Student',
        object_id=instance.id,
        object_display=str(instance),
        changes={'deleted': {'old': False, 'new': True}}
    )


@receiver(post_save, sender=Holiday)
def log_holiday_change(sender, instance, created, **kwargs):
    """Log holiday creation or update."""
    if not _should_log_change(instance):
        return

    action = 'create' if created else 'update'
    changes = {}

    if created:
        changes = {
            'date': {'old': None, 'new': instance.date.isoformat()},
            'name': {'old': None, 'new': instance.name},
        }

    # Get the current user (from request or middleware)
    current_user = _get_request_user()

    AuditLogService.log_action(
        action=action,
        performed_by=current_user,
        model_name='Holiday',
        object_id=instance.id,
        object_display=str(instance),
        changes=changes
    )


@receiver(post_delete, sender=Holiday)
def log_holiday_delete(sender, instance, **kwargs):
    """Log holiday deletion."""
    if not _should_log_change(instance):
        return

    AuditLogService.log_action(
        action='delete',
        performed_by=_get_request_user(),
        model_name='Holiday',
        object_id=instance.id,
        object_display=str(instance),
        changes={'deleted': {'old': False, 'new': True}}
    )


@receiver(post_save, sender=Attendance)
def log_attendance_change(sender, instance, created, **kwargs):
    """Log attendance record creation or update."""
    if not _should_log_change(instance):
        return

    action = 'create' if created else 'update'
    changes = {}

    if created:
        changes = {
            'student_id': {'old': None, 'new': instance.student_id},
            'date': {'old': None, 'new': instance.date.isoformat()},
            'present': {'old': None, 'new': instance.present},
        }

    AuditLogService.log_action(
        action=action,
        performed_by=_get_request_user(),
        model_name='Attendance',
        object_id=instance.id,
        object_display=str(instance),
        changes=changes
    )


@receiver(post_delete, sender=Attendance)
def log_attendance_delete(sender, instance, **kwargs):
    """Log attendance deletion."""
    if not _should_log_change(instance):
        return

    AuditLogService.log_action(
        action='delete',
        performed_by=_get_request_user(),
        model_name='Attendance',
        object_id=instance.id,
        object_display=str(instance),
        changes={'deleted': {'old': False, 'new': True}}
    )


@receiver(post_save, sender=AcademicYear)
def log_academic_year_change(sender, instance, created, **kwargs):
    """Log academic year creation or update."""
    if not _should_log_change(instance):
        return

    action = 'create' if created else 'update'
    changes = {}

    if created:
        changes = {
            'year': {'old': None, 'new': instance.year},
            'is_current': {'old': None, 'new': instance.is_current},
        }

    AuditLogService.log_action(
        action=action,
        performed_by=_get_request_user(),
        model_name='AcademicYear',
        object_id=instance.id,
        object_display=str(instance),
        changes=changes
    )


@receiver(post_delete, sender=AcademicYear)
def log_academic_year_delete(sender, instance, **kwargs):
    """Log academic year deletion."""
    if not _should_log_change(instance):
        return

    AuditLogService.log_action(
        action='delete',
        performed_by=_get_request_user(),
        model_name='AcademicYear',
        object_id=instance.id,
        object_display=str(instance),
        changes={'deleted': {'old': False, 'new': True}}
    )
