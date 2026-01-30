from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django import forms
from django.utils.safestring import mark_safe
from .models import (
    User, School, AcademicYear, ClassRoom, Student,
    Attendance, Holiday, AuditLog, Device, Teacher
)


# -----------------------
# Custom Widget for Weekend Days
# -----------------------
class WeekendDaysWidget(forms.Widget):
    """Custom widget to display weekend days as checkboxes"""

    def render(self, name, value, attrs=None, renderer=None):
        days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

        # Parse the value (could be list, string, or None)
        selected_days = []
        if value:
            if isinstance(value, str):
                try:
                    import json
                    selected_days = json.loads(value)
                except:
                    selected_days = []
            elif isinstance(value, list):
                selected_days = value

        html = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 12px; background-color: #f9f9f9; border-radius: 4px; border: 1px solid #ddd;">'

        for index, day in enumerate(days):
            checked = 'checked' if index in selected_days else ''
            html += f'<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" name="{name}__{index}" value="{index}" {checked} style="cursor: pointer;" /><span>{day}</span></label>'

        html += '</div>'
        return mark_safe(html)

    def value_from_datadict(self, data, files, name):
        """Extract values from form data"""
        selected = []
        for i in range(7):
            key = f"{name}__{i}"
            if key in data:
                selected.append(int(data[key]))
        return selected


class WeekendDaysField(forms.Field):
    """Custom field for weekend days"""
    widget = WeekendDaysWidget

    def to_python(self, value):
        if not value:
            return []
        if isinstance(value, list):
            return sorted(value)
        return sorted(value)

    def prepare_value(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except:
                return []
        return value


# -----------------------
# Custom Form for ClassRoom
# -----------------------
class ClassRoomForm(forms.ModelForm):
    weekend_days = WeekendDaysField(required=False)

    class Meta:
        model = ClassRoom
        fields = '__all__'

    def clean_weekend_days(self):
        """Convert selected days to JSON format for storage"""
        import json
        data = self.cleaned_data.get('weekend_days', [])
        if data:
            return json.dumps(sorted(data))
        return json.dumps([])

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.weekend_days:
            # Parse JSON for display
            import json
            try:
                self.fields['weekend_days'].initial = json.loads(self.instance.weekend_days) if isinstance(self.instance.weekend_days, str) else self.instance.weekend_days
            except:
                self.fields['weekend_days'].initial = []


# -----------------------
# School
# -----------------------

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('user_type', 'school')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('user_type', 'school')}),
    )
    list_display = ('username', 'email', 'user_type', 'school', 'is_staff', 'date_joined')
    list_filter = ('user_type', 'school', 'is_staff')
    search_fields = ('username', 'email', 'school__name')
    list_select_related = ('school',)


# ----------------------
# School
# ----------------------
@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


# ----------------------
# AcademicYear
# ----------------------
@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('id', 'year', 'school', 'is_current')
    list_filter = ('is_current', 'school')
    search_fields = ('year', 'school__name')
    autocomplete_fields = ['school']
    list_select_related = ('school',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('year', 'school', 'is_current')
        }),
    )


# ----------------------
# ClassRoom
# ----------------------
@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    form = ClassRoomForm
    list_display = ('id', 'name', 'school', 'academic_year', 'start_date', 'end_date', 'get_weekend_days')
    search_fields = ('name', 'school__name')
    autocomplete_fields = ['school', 'academic_year']
    list_select_related = ('school', 'academic_year')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'school', 'academic_year')
        }),
        ('Date Range', {
            'fields': ('start_date', 'end_date')
        }),
        ('Weekend Configuration', {
            'fields': ('weekend_days',),
            'description': 'Select which days are weekend for this specific classroom'
        }),
    )

    def get_weekend_days(self, obj):
        """Display weekend days in list view"""
        import json
        days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        try:
            selected = json.loads(obj.weekend_days) if isinstance(obj.weekend_days, str) else obj.weekend_days
            return ', '.join([days[i] for i in selected])
        except:
            return '-'
    get_weekend_days.short_description = 'Weekend Days'


# ----------------------
# Student
# ----------------------
@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_name', 'roll_number', 'classroom')
    search_fields = ('roll_number', 'user__first_name', 'user__last_name')
    autocomplete_fields = ['user', 'classroom']
    list_select_related = ('user', 'classroom')
    list_filter = ('classroom__academic_year', 'classroom')

    def get_name(self, obj):
        if obj.user:
            return obj.user.get_full_name()
        return "No User"
    get_name.short_description = 'Name'


# ----------------------
# Attendance
# ----------------------
class ClassroomFilter(admin.SimpleListFilter):
    title = 'classroom'
    parameter_name = 'classroom'

    def lookups(self, request, model_admin):
        classrooms = ClassRoom.objects.all()
        return [(c.id, c.name) for c in classrooms]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(student__classroom_id=self.value())
        return queryset


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'date', 'present', 'year')
    autocomplete_fields = ['student', 'year']
    list_filter = ('date', 'present', 'year', ClassroomFilter)
    search_fields = ('student__user__first_name', 'student__user__last_name', 'student__roll_number')
    list_select_related = ('student', 'year')


# ----------------------
# Holiday
# ----------------------
@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'date', 'year')
    list_filter = ('year',)
    search_fields = ('name',)
    autocomplete_fields = ['year']
    list_select_related = ('year',)


# ----------------------
# Audit Log
# ----------------------
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'timestamp', 'action', 'performed_by', 'model_name', 'object_display')
    list_filter = ('action', 'model_name', 'timestamp')
    search_fields = ('model_name', 'object_display', 'performed_by__username')
    autocomplete_fields = ['performed_by']
    list_select_related = ('performed_by',)
    readonly_fields = ('id', 'action', 'performed_by', 'model_name', 'object_id', 'object_display', 'changes', 'timestamp')

    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'timestamp', 'action', 'performed_by')
        }),
        ('Model Information', {
            'fields': ('model_name', 'object_id', 'object_display')
        }),
        ('Changes', {
            'fields': ('changes',),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return True

    def has_change_permission(self, request, obj=None):
        return False

    def delete_model(self, request, obj):
        """Override delete to capture the admin user who deleted the audit log."""
        # Store the current user in thread-local before deletion
        try:
            from schoolcore.middleware import set_request_user
            set_request_user(request.user)
        except:
            pass

        super().delete_model(request, obj)

        # Clean up
        try:
            from schoolcore.middleware import set_request_user
            set_request_user(None)
        except:
            pass


# -----------------------
# Device Admin
# -----------------------
@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    """Admin interface for managing login devices."""
    list_display = ('user', 'device_fingerprint', 'approval_status', 'login_attempts', 'last_login_attempt')
    list_filter = ('is_approved', 'first_login_attempt', 'last_login_attempt')
    search_fields = ('user__username', 'user__email', 'device_fingerprint')

    fieldsets = (
        ('Device Information', {
            'fields': ('user', 'device_fingerprint', 'device_info')
        }),
        ('Approval Status', {
            'fields': ('is_approved', 'approved_by', 'approved_at')
        }),
        ('Login Attempts', {
            'fields': ('first_login_attempt', 'last_login_attempt', 'login_attempts')
        }),
    )

    readonly_fields = ('device_fingerprint', 'device_info', 'first_login_attempt',
                       'last_login_attempt', 'login_attempts', 'approved_at', 'approved_by')

    def approval_status(self, obj):
        """Display approval status with color."""
        if obj.is_approved:
            return mark_safe('<span style="color: green;">✓ Approved</span>')
        return mark_safe('<span style="color: red;">⏳ Pending</span>')
    approval_status.short_description = 'Status'

    def save_model(self, request, obj, form, change):
        """Automatically set approved_by and approved_at when is_approved is set to True."""
        from django.utils import timezone

        # If is_approved is True and approved_by is not set, set it to current user
        if obj.is_approved and not obj.approved_by:
            obj.approved_by = request.user
            obj.approved_at = timezone.now()

        # If is_approved is changed from True to False, clear the approval info
        if not obj.is_approved:
            obj.approved_by = None
            obj.approved_at = None

        super().save_model(request, obj, form, change)

    def has_delete_permission(self, request, obj=None):
        """Allow super admins to delete devices."""
        return True

    def get_readonly_fields(self, request, obj=None):
        """Make user field readonly for existing devices, and approved_by/approved_at always readonly."""
        readonly = list(self.readonly_fields)
        if obj:  # Editing existing device
            readonly.append('user')
        return readonly


# ----------------------
# Teacher
# ----------------------
@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('get_full_name', 'get_username', 'school', 'created_at')
    list_filter = ('school', 'created_at')
    search_fields = ('user__first_name', 'user__last_name', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Teacher Info', {
            'fields': ('user', 'school')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'N/A'
    get_full_name.short_description = 'Teacher Name'

    def get_username(self, obj):
        return obj.user.username if obj.user else 'N/A'
    get_username.short_description = 'Username'
