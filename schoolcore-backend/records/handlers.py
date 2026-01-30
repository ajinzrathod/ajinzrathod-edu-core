"""
Handler classes for authentication logic.
Separated for clean architecture and loose coupling.
"""

from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from .models import User


class AuthenticationHandler:
    """Encapsulates authentication business logic."""

    @staticmethod
    def authenticate_user(username: str, password: str, school) -> dict:
        """
        Authenticate user and validate permissions.

        Returns:
            dict with user data and user_type
        """
        from .serializers import LoginSerializer

        user = User.objects.filter(
            username=username, school=school
        ).select_related('school').first()

        if not user or not user.check_password(password):
            return None

        if user.user_type not in ['admin', 'schooladmin']:
            return None

        return {
            'user': user,
            'user_type': user.user_type
        }

    @staticmethod
    def generate_tokens(user: User) -> dict:
        """Generate JWT tokens for authenticated user."""
        refresh = RefreshToken.for_user(user)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

    @staticmethod
    def format_user_response(user: User, user_type: str) -> dict:
        """Format user data for API response."""
        return {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'school': {
                'id': user.school.id,
                'name': user.school.name
            }
        }
