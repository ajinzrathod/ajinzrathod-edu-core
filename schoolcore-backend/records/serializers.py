from rest_framework import serializers
from .models import (
    User, School, AcademicYear, ClassRoom, Student,
    Attendance, Holiday, AuditLog, Device, Teacher
)
from django.contrib.auth import authenticate
import json

# Custom field to handle JSON list properly
class JSONListField(serializers.ListField):
    """Custom field that handles both list and JSON string representations"""
    child = serializers.IntegerField()

    def to_representation(self, value):
        """Convert stored value to list representation"""
        if not value:
            return []

        # If it's already a list, return it
        if isinstance(value, list):
            return value

        # If it's a string, try to parse it as JSON
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, TypeError):
                return []

        return []

    def to_internal_value(self, data):
        """Convert input to internal representation"""
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except (json.JSONDecodeError, TypeError):
                data = []

        # Ensure it's a list
        if not isinstance(data, list):
            data = []

        return super().to_internal_value(data)

# -----------------------
# Device Serializer
# -----------------------
class DeviceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = Device
        fields = ['id', 'user', 'user_name', 'device_fingerprint', 'device_info', 'is_approved',
                  'approved_by', 'approved_by_name', 'approved_at', 'first_login_attempt',
                  'last_login_attempt', 'login_attempts']
        read_only_fields = ['device_fingerprint', 'device_info', 'first_login_attempt', 'last_login_attempt', 'login_attempts']


# -----------------------
# Login Serializer (supports both admin and student users)
# -----------------------
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        username = data['username']
        password = data['password']

        user = authenticate(username=username, password=password)
        if user:
            data['user'] = user
            data['user_type'] = user.user_type
            return data

        raise serializers.ValidationError("Invalid credentials")

# -----------------------
# User Serializer (for display purposes)
# -----------------------
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type', 'school']

# -----------------------
# User Create Serializer (for creating users)
# -----------------------
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'first_name', 'last_name', 'user_type', 'school']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

# -----------------------
# User Search Serializer (for finding existing users)
# -----------------------
class UserSearchSerializer(serializers.Serializer):
    """Serialize user search results with enrollment history."""
    id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    enrollment_history = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )

# -----------------------
# School Serializer
# -----------------------
class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ['id', 'name']

# -----------------------
# Academic Year Serializer
# -----------------------
class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'year', 'is_current', 'school']

# -----------------------
# Classroom Serializer
# -----------------------
class ClassRoomSerializer(serializers.ModelSerializer):
    weekend_days = JSONListField(required=False, allow_empty=True)

    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'school', 'academic_year', 'start_date', 'end_date', 'weekend_days']
        read_only_fields = ['school']  # School is set by backend from authenticated user


    def validate(self, data):
        """Validate that end_date is greater than start_date if both are provided"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date and end_date:
            if end_date <= start_date:
                raise serializers.ValidationError({
                    'end_date': 'End date must be greater than start date.'
                })

        return data

# -----------------------
# Student Serializer
# -----------------------
# Student Serializer
# -----------------------
class StudentSerializer(serializers.ModelSerializer):
    user = UserCreateSerializer(required=False, allow_null=True)

    class Meta:
        model = Student
        fields = ['id', 'user', 'roll_number', 'classroom']

    def create(self, validated_data):
        user_data = validated_data.pop('user', None)
        student = Student.objects.create(**validated_data)

        if user_data:
            user_data['user_type'] = 'student'  # Force student type
            user = User.objects.create_user(**user_data)
            student.user = user
            student.save()

        return student

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)

        # Update student fields except user
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update user if provided
        if user_data and instance.user:
            for attr, value in user_data.items():
                if attr != 'password':
                    setattr(instance.user, attr, value)
            instance.user.save()

        return instance

# -----------------------
# Student Creation Serializer (with user handling)
# -----------------------
class StudentCreationSerializer(serializers.ModelSerializer):
    """Handle student creation with existing or new user."""
    user_id = serializers.IntegerField(required=False, allow_null=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = Student
        fields = ['id', 'roll_number', 'classroom', 'user_id', 'first_name', 'last_name', 'email']

    def validate_roll_number(self, value):
        """Validate roll number is within range."""
        if value < 1 or value > 100:
            raise serializers.ValidationError("Roll number must be between 1 and 100")
        return value

    def validate(self, attrs):
        """
        Validate constraints:
        1. Roll number must be unique per classroom
        2. Student cannot be in multiple classrooms in the same academic year
        3. Student cannot have duplicate enrollment in same classroom
        """
        classroom = attrs.get('classroom')
        roll_number = attrs.get('roll_number')
        user_id = attrs.get('user_id')

        if not classroom or not roll_number:
            return attrs

        # Check 1: Roll number uniqueness per classroom
        existing_roll = Student.objects.filter(
            classroom=classroom,
            roll_number=roll_number
        ).exists()

        if existing_roll:
            raise serializers.ValidationError({
                'roll_number': f"Roll number {roll_number} already exists in {classroom.name}"
            })

        # Check 2 & 3: If user_id is provided, check for enrollment conflicts
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({'user_id': 'User not found'})

            # Check for duplicate in same classroom
            existing_same = Student.objects.filter(
                user=user,
                classroom=classroom
            ).exists()

            if existing_same:
                raise serializers.ValidationError({
                    'user_id': f'{user.get_full_name()} is already enrolled in {classroom.name}'
                })

            # Check for multiple classrooms in same academic year
            existing_in_year = Student.objects.filter(
                user=user,
                classroom__academic_year=classroom.academic_year
            ).exists()

            if existing_in_year:
                raise serializers.ValidationError({
                    'user_id': f'{user.get_full_name()} is already enrolled in another classroom in {classroom.academic_year.year}. A student can only be in one classroom per year.'
                })

        return attrs

    def create(self, validated_data):
        user_id = validated_data.pop('user_id', None)
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        email = validated_data.pop('email', '')

        # Handle user
        if user_id:
            # Use existing user
            try:
                user = User.objects.get(id=user_id, school=self.context['request'].user.school)
            except User.DoesNotExist:
                raise serializers.ValidationError({'user_id': 'User not found'})
        else:
            # Create new user
            if not (first_name and last_name):
                raise serializers.ValidationError("first_name and last_name are required when creating a new user")

            roll_number = validated_data.get('roll_number', '')
            username = f"student_{first_name.lower()}_{last_name.lower()}_{roll_number}".replace(" ", "_")

            # Ensure unique username
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                first_name=first_name,
                last_name=last_name,
                email=email or f"{username}@school.com",
                school=self.context['request'].user.school,
                user_type='student'
            )

        student = Student.objects.create(user=user, **validated_data)
        return student


# -----------------------
# Attendance Serializer
# -----------------------
class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    roll_number = serializers.CharField(source='student.roll_number', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_name', 'roll_number', 'date', 'present', 'year']


# -----------------------
# Holiday Serializer
# -----------------------
class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'year', 'date', 'name']

    def validate(self, data):
        """Validate that holiday date is within classroom date ranges"""
        holiday_date = data.get('date')
        year = data.get('year')

        if holiday_date and year:
            # Get all classrooms for this school and year
            classrooms = ClassRoom.objects.filter(school=year.school, academic_year=year)

            # Check if the holiday date falls within at least one classroom's date range
            valid = False
            if classrooms.exists():
                for classroom in classrooms:
                    if classroom.start_date and classroom.end_date:
                        if classroom.start_date <= holiday_date <= classroom.end_date:
                            valid = True
                            break

            if not valid and classrooms.exists():
                # Get the min and max dates from classrooms
                min_date = min((c.start_date for c in classrooms if c.start_date), default=None)
                max_date = max((c.end_date for c in classrooms if c.end_date), default=None)
                if min_date and max_date:
                    raise serializers.ValidationError({
                        'date': f'Holiday date must be within the academic year ({min_date} to {max_date}).'
                    })

        return data

# -----------------------
# Student Detail Serializer (includes attendance stats)
# -----------------------
class StudentDetailSerializer(serializers.ModelSerializer):
    user_full_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    classroom_name = serializers.SerializerMethodField()
    attendance_count = serializers.SerializerMethodField()
    total_days = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'roll_number', 'user', 'user_full_name', 'user_email', 'classroom', 'classroom_name', 'attendance_count', 'total_days']
        read_only_fields = ['user', 'attendance_count', 'total_days']

    def get_user_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else "N/A"

    def get_user_email(self, obj):
        return obj.user.email if obj.user else ""

    def get_classroom_name(self, obj):
        return obj.classroom.name if obj.classroom else ""

    def get_attendance_count(self, obj):
        return Attendance.objects.filter(student=obj, present=True).count()

    def get_total_days(self, obj):
        return Attendance.objects.filter(student=obj).count()


# -----------------------
# Audit Log Serializer
# -----------------------
class AuditLogSerializer(serializers.Serializer):
    """Serializer for audit logs."""
    id = serializers.IntegerField(read_only=True)
    action = serializers.CharField()
    performed_by_id = serializers.IntegerField(source='performed_by.id', read_only=True, allow_null=True)
    performed_by_name = serializers.SerializerMethodField()
    model_name = serializers.CharField()
    object_id = serializers.IntegerField()
    object_display = serializers.CharField()
    changes = serializers.JSONField()
    timestamp = serializers.DateTimeField()

    def get_performed_by_name(self, obj):
        """Get user's full name who performed the action."""
        if obj.performed_by:
            return obj.performed_by.get_full_name() or obj.performed_by.username
        return "System"


# -----------------------
# Teacher Serializer
# -----------------------
class TeacherSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Teacher
        fields = [
            'id', 'user_id', 'username', 'first_name', 'last_name', 'email',
            'school', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


