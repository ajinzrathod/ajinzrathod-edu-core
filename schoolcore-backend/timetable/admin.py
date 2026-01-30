from django.contrib import admin
from .models import TimetableEntry, Absence, TeacherAttendance, Proxy


@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = ('classroom', 'day', 'period', 'subject', 'teacher', 'created_at')
    list_filter = ('day', 'classroom__school', 'created_at')
    search_fields = ('classroom__name', 'subject', 'teacher__user__first_name', 'teacher__user__last_name')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Info', {
            'fields': ('classroom', 'day', 'period', 'subject', 'teacher')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeacherAttendance)
class TeacherAttendanceAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'date', 'status', 'reason', 'created_at')
    list_filter = ('status', 'date', 'teacher__school')
    search_fields = ('teacher__user__first_name', 'teacher__user__last_name', 'reason')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Info', {
            'fields': ('teacher', 'date', 'status', 'reason')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Proxy)
class ProxyAdmin(admin.ModelAdmin):
    list_display = ('original_teacher', 'proxy_teacher', 'date', 'classroom', 'period', 'status')
    list_filter = ('status', 'date', 'classroom__school', 'created_at')
    search_fields = ('original_teacher__user__first_name', 'proxy_teacher__user__first_name', 'classroom__name')
    readonly_fields = ('created_at', 'updated_at', 'completed_at')
    fieldsets = (
        ('Absence Info', {
            'fields': ('absence', 'original_teacher', 'date')

        }),
        ('Assignment', {
            'fields': ('proxy_teacher', 'classroom', 'day', 'period', 'subject')
        }),
        ('Status', {
            'fields': ('status', 'reason', 'assigned_by', 'completed_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
