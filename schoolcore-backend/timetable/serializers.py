from rest_framework import serializers
from .models import TimetableEntry, Absence, Proxy


# -----------------------
# TimetableEntry Serializer
# -----------------------
class TimetableEntrySerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model = TimetableEntry
        fields = [
            'id', 'classroom', 'classroom_name', 'day', 'day_display',
            'period', 'subject', 'teacher', 'teacher_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_teacher_name(self, obj):
        if obj.teacher and obj.teacher.user:
            return f"{obj.teacher.user.first_name} {obj.teacher.user.last_name}"
        return None


# -----------------------
# Absence/Teacher Attendance Serializer
# -----------------------
class AbsenceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Absence
        fields = [
            'id', 'teacher', 'teacher_name', 'date', 'reason', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_teacher_name(self, obj):
        if obj.teacher and obj.teacher.user:
            return f"{obj.teacher.user.first_name} {obj.teacher.user.last_name}"
        return None


# -----------------------
# Proxy Serializer
# -----------------------
class ProxySerializer(serializers.ModelSerializer):
    original_teacher_name = serializers.SerializerMethodField()
    proxy_teacher_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    day_display = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model = Proxy
        fields = [
            'id', 'absence', 'classroom', 'classroom_name', 'day', 'day_display',
            'period', 'original_teacher', 'original_teacher_name',
            'proxy_teacher', 'proxy_teacher_name', 'subject', 'date',
            'status', 'reason', 'assigned_by', 'assigned_by_name',
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_original_teacher_name(self, obj):
        if obj.original_teacher and obj.original_teacher.user:
            return f"{obj.original_teacher.user.first_name} {obj.original_teacher.user.last_name}"
        return None

    def get_proxy_teacher_name(self, obj):
        if obj.proxy_teacher and obj.proxy_teacher.user:
            return f"{obj.proxy_teacher.user.first_name} {obj.proxy_teacher.user.last_name}"
        return None

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return f"{obj.assigned_by.first_name} {obj.assigned_by.last_name}"
        return None
