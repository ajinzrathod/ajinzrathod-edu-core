from django.apps import AppConfig


class RecordsConfig(AppConfig):
    name = 'records'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        """Register signals when the app is ready."""
        import records.signals  # noqa

