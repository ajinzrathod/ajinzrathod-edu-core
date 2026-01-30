"""
Utility functions for common operations.
"""
import json
import hashlib
from datetime import datetime, timedelta, date
from typing import Optional, Set, List, Dict
from .models import AcademicYear, Holiday


# ============================================================================
# Device Fingerprinting
# ============================================================================

def generate_device_fingerprint(request) -> str:
    """
    Generate a device fingerprint from request metadata.

    Uses User-Agent and IP address to create a unique device identifier.
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    client_ip = get_client_ip(request)

    # Combine user agent and IP for fingerprint
    fingerprint_data = f"{user_agent}:{client_ip}"
    fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()

    return fingerprint


def get_device_info(request) -> dict:
    """
    Extract device information from request.
    """
    return {
        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        'ip_address': get_client_ip(request),
        'host': request.META.get('HTTP_HOST', ''),
    }


def get_client_ip(request) -> str:
    """
    Get client IP address from request, handling proxies.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip or 'unknown'


# ============================================================================
# Academic Year Helper
# ============================================================================

_ACADEMIC_YEAR_CACHE: Dict[str, Optional[AcademicYear]] = {}


def get_current_academic_year(school, use_cache: bool = True) -> Optional[AcademicYear]:
    """
    Retrieve the current academic year for a school with optional caching.

    Args:
        school: School instance
        use_cache: Whether to use in-memory cache (default: True)

    Returns:
        AcademicYear instance or None if not found
    """
    if use_cache:
        cache_key = f"current_year_{school.id}"
        if cache_key not in _ACADEMIC_YEAR_CACHE:
            _ACADEMIC_YEAR_CACHE[cache_key] = AcademicYear.objects.filter(
                school=school, is_current=True
            ).first()
        return _ACADEMIC_YEAR_CACHE[cache_key]

    return AcademicYear.objects.filter(
        school=school, is_current=True
    ).first()


def clear_academic_year_cache() -> None:
    """Clear the academic year cache."""
    _ACADEMIC_YEAR_CACHE.clear()


# ============================================================================
# Date and Weekend Helper
# ============================================================================

def parse_weekend_days(weekend_data) -> List[int]:
    """
    Parse weekend days from various formats.

    Args:
        weekend_data: JSON string or list of weekend day codes

    Returns:
        List of weekend day codes (0=Sunday, 1=Monday, ..., 6=Saturday)
    """
    if not weekend_data:
        return [0, 6]  # Default: Sunday and Saturday

    if isinstance(weekend_data, str):
        try:
            weekend_data = json.loads(weekend_data)
        except json.JSONDecodeError:
            return [0, 6]

    return weekend_data if isinstance(weekend_data, list) else [0, 6]


def is_weekend(date_obj: date, classroom) -> bool:
    """
    Check if a given date is a weekend for a specific classroom.

    Args:
        date_obj: Date to check
        classroom: ClassRoom instance (can be None)

    Returns:
        True if date is a weekend, False otherwise
    """
    weekend_days = parse_weekend_days(classroom.weekend_days if classroom else None)

    # Convert Python weekday (0=Monday, 6=Sunday) to ISO weekday (0=Sunday, 6=Saturday)
    iso_weekday = (date_obj.weekday() + 1) % 7

    return iso_weekday in weekend_days


# ============================================================================
# Holiday Helper
# ============================================================================

def get_holiday_set(year: AcademicYear) -> Set[datetime.date]:
    """
    Get all holidays for an academic year as a set for O(1) lookup.

    Args:
        year: AcademicYear instance

    Returns:
        Set of holiday dates
    """
    return set(
        Holiday.objects.filter(year=year).values_list('date', flat=True)
    )


# ============================================================================
# Date Range Helper
# ============================================================================

def count_school_days(
    start_date: date,
    end_date: date,
    weekend_days: List[int],
    holidays: Set[date]
) -> int:
    """
    Count school days (excluding weekends and holidays) in a date range.

    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        weekend_days: List of weekend day codes
        holidays: Set of holiday dates

    Returns:
        Number of school days
    """
    school_days = 0
    current = start_date

    while current <= end_date:
        is_weekend_day = (current.weekday() + 1) % 7 in weekend_days
        is_holiday = current in holidays

        if not is_weekend_day and not is_holiday:
            school_days += 1

        current += timedelta(days=1)

    return school_days
