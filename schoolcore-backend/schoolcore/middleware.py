"""
Middleware to store the current request user in a thread-local variable.
This allows signals to access the request user without being passed explicitly.
"""
import threading
from django.utils.deprecation import MiddlewareMixin

# Thread-local storage for request user
_request_user = threading.local()


def get_request_user():
    """Get the current request user from thread-local storage."""
    return getattr(_request_user, 'user', None)


def set_request_user(user):
    """Set the current request user in thread-local storage."""
    _request_user.user = user


class RequestUserMiddleware(MiddlewareMixin):
    """Middleware to store the current request user."""

    def process_request(self, request):
        """Store the user from the request."""
        set_request_user(getattr(request, 'user', None))
        return None

    def process_response(self, request, response):
        """Clean up the stored user."""
        set_request_user(None)
        return response
