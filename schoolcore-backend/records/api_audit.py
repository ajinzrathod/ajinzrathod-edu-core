"""
API-specific audit logging for tracking user actions through REST endpoints.
"""

from .services import AuditLogService


class APIAuditMixin:
    """
    Mixin to add audit logging to API views.
    Logs create, update, and delete operations with the authenticated user.
    """

    def get_audit_model_name(self):
        """Get the model name for audit logging."""
        if hasattr(self, 'serializer_class') and hasattr(self.serializer_class, 'Meta'):
            return self.serializer_class.Meta.model.__name__
        return self.queryset.model.__name__ if hasattr(self, 'queryset') else 'Unknown'

    def log_api_action(self, action, instance, changes=None):
        """
        Log an API action to the audit log.

        Args:
            action: 'create', 'update', or 'delete'
            instance: The model instance that was affected
            changes: Optional dict of changes
        """
        try:
            from .models import AuditLog

            # Get the request user
            user = self.request.user if hasattr(self, 'request') else None

            if not user:
                return

            AuditLogService.log_action(
                action=action,
                performed_by=user,
                model_name=self.get_audit_model_name(),
                object_id=instance.id,
                object_display=str(instance),
                changes=changes or {}
            )
        except Exception as e:
            # Don't fail the API request if audit logging fails
            print(f"Audit logging error: {str(e)}")
            pass

    def perform_create(self, serializer):
        """Override to log create action."""
        instance = serializer.save()

        # Log the creation
        changes = {}
        for field, value in serializer.validated_data.items():
            if hasattr(value, 'isoformat'):
                value = value.isoformat()
            elif hasattr(value, 'pk'):
                value = value.pk
            changes[field] = {'old': None, 'new': value}

        self.log_api_action('create', instance, changes)
        return instance

    def perform_update(self, serializer):
        """Override to log update action."""
        instance = serializer.instance
        old_values = {}

        # Capture old values
        for field, value in serializer.validated_data.items():
            old_value = getattr(instance, field, None)
            if hasattr(old_value, 'isoformat'):
                old_value = old_value.isoformat()
            elif hasattr(old_value, 'pk'):
                old_value = old_value.pk
            old_values[field] = old_value

        # Perform the update
        instance = serializer.save()

        # Build changes dict
        changes = {}
        for field, new_value in serializer.validated_data.items():
            old_value = old_values.get(field)

            if hasattr(new_value, 'isoformat'):
                new_value = new_value.isoformat()
            elif hasattr(new_value, 'pk'):
                new_value = new_value.pk

            if old_value != new_value:
                changes[field] = {'old': old_value, 'new': new_value}

        if changes:
            self.log_api_action('update', instance, changes)

        return instance

    def perform_destroy(self, instance):
        """Override to log delete action."""
        # Log before deletion
        self.log_api_action('delete', instance, {'deleted': {'old': False, 'new': True}})

        # Perform the deletion
        instance.delete()
