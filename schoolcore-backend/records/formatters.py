"""
Response formatters for API responses.
Separates response building logic from views.
"""

from typing import Dict, Any, Optional, List


class ResponseFormatter:
    """Base formatter for API responses."""

    @staticmethod
    def success(data: Any, message: str = None, status_code: int = 200) -> Dict:
        """Format successful response."""
        response = {'data': data}
        if message:
            response['message'] = message
        return response

    @staticmethod
    def error(error: str, status_code: int = 400) -> Dict:
        """Format error response."""
        return {'error': error}

    @staticmethod
    def paginated(data: List, count: int, page: int = 1) -> Dict:
        """Format paginated response."""
        return {
            'data': data,
            'pagination': {
                'total': count,
                'page': page
            }
        }


class UserResponseFormatter:
    """Format user-related responses."""

    @staticmethod
    def profile(user_data: Dict) -> Dict:
        """Format user profile response."""
        return {
            'id': user_data['id'],
            'username': user_data['username'],
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'email': user_data['email'],
            'user_type': user_data['user_type'],
            'school': {
                'id': user_data['school__id'],
                'name': user_data['school__name']
            }
        }

    @staticmethod
    def login(tokens: Dict, user_data: Dict, user_type: str) -> Dict:
        """Format login response."""
        return {
            **tokens,
            'user_type': user_type,
            'user': UserResponseFormatter.profile(user_data)
        }


class AttendanceResponseFormatter:
    """Format attendance-related responses."""

    @staticmethod
    def create_bulk(count: int, total: int, errors: Optional[List[str]] = None) -> Dict:
        """Format bulk create response."""
        return {
            'message': f'Saved {count} attendance records',
            'processed': count,
            'total': total,
            'errors': errors if errors else None
        }

    @staticmethod
    def update(serialized_data: Dict) -> Dict:
        """Format single update response."""
        return serialized_data

    @staticmethod
    def statistics(
        period: str,
        year: str,
        classroom: str,
        stats: List[Dict]
    ) -> Dict:
        """Format statistics response."""
        return {
            'period': period,
            'year': year,
            'classroom': classroom,
            'statistics': stats
        }

    @staticmethod
    def school_wide_statistics(
        stats: Dict,
        period: str
    ) -> Dict:
        """Format school-wide statistics response."""
        return {
            **stats,
            'period': period
        }

    @staticmethod
    def no_data(period: str, year: str, classroom: str) -> Dict:
        """Format empty statistics response."""
        return {
            'period': period,
            'year': year,
            'classroom': classroom,
            'statistics': []
        }


class WeekendResponseFormatter:
    """Format weekend configuration response."""

    @staticmethod
    def weekend_config(weekend_days: List[int]) -> Dict:
        """Format weekend days response."""
        day_names = {
            0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
            4: 'Thursday', 5: 'Friday', 6: 'Saturday',
        }

        return {
            'weekend_days': weekend_days,
            'weekend_names': [day_names[d] for d in weekend_days]
        }
