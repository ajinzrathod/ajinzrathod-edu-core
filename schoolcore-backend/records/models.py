from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
import hashlib
import json


# -----------------------
# Device
# -----------------------
class Device(models.Model):
    """
    Tracks devices attempting to login. Device is identified by device_fingerprint.
    Super admin must approve devices before users can login from them.
    """
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='devices', db_index=True)
    device_fingerprint = models.CharField(max_length=255, db_index=True)  # Hash of device info
    device_info = models.JSONField(default=dict, blank=True)  # User agent, IP, etc.
    is_approved = models.BooleanField(default=False, db_index=True)
    approved_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='approved_devices')
    approved_at = models.DateTimeField(null=True, blank=True)
    first_login_attempt = models.DateTimeField(auto_now_add=True)
    last_login_attempt = models.DateTimeField(auto_now=True)
    login_attempts = models.IntegerField(default=1)

    class Meta:
        unique_together = ('user', 'device_fingerprint')
        indexes = [
            models.Index(fields=['user', 'is_approved']),
            models.Index(fields=['device_fingerprint']),
        ]
        ordering = ['-last_login_attempt']

    def __str__(self):
        status = "✓ Approved" if self.is_approved else "⏳ Pending"
        return f"{self.user.username} - {status} - {self.first_login_attempt}"


# -----------------------
# Audit Log
# -----------------------
class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
    )

    id = models.BigAutoField(primary_key=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, db_index=True)
    performed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.BigIntegerField(db_index=True)
    object_display = models.CharField(max_length=500, blank=True)
    changes = models.JSONField(default=dict, blank=True, help_text="Dict of field changes: {field: {old: value, new: value}}")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['performed_by', 'timestamp']),
            models.Index(fields=['model_name', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.get_action_display()} {self.model_name} by {self.performed_by} at {self.timestamp}"


# -----------------------
# School
# -----------------------
class School(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
        ]

    def __str__(self):
        return self.name


# -----------------------
# Custom User
# -----------------------
class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('admin', 'School Admin'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    )

    id = models.BigAutoField(primary_key=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default=None, null=True, blank=True, db_index=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['school', 'user_type']),
        ]

    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()}) - {self.school.name}"


# -----------------------
# Academic Year
# -----------------------
class AcademicYear(models.Model):
    id = models.BigAutoField(primary_key=True)
    year = models.CharField(max_length=9, db_index=True)  # "2024-2025"
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_index=True)
    is_current = models.BooleanField(default=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['school', 'is_current']),
            models.Index(fields=['school', 'year']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['school'],
                condition=models.Q(is_current=True),
                name='unique_current_year_per_school'
            )
        ]

    def __str__(self):
        return f"{self.year} - {self.school.name}"


# -----------------------
# Classroom
# -----------------------
class ClassRoom(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=50)
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_index=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, db_index=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    weekend_days = models.JSONField(default=list, blank=True,
                                    help_text="JSON array of weekend day codes: [0], [6,0], etc. Specific to this classroom")

    class Meta:
        unique_together = ('name', 'school', 'academic_year')
        indexes = [
            models.Index(fields=['school', 'academic_year', 'name']),
        ]

    def clean(self):
        """Validate that end_date is greater than start_date if both are provided"""
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                raise ValidationError("End date must be greater than start date.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.school.name}) - {self.academic_year.year}"


# -----------------------
# Student
# -----------------------
class Student(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True,
        limit_choices_to={'user_type': 'student'}, db_index=True
    )
    roll_number = models.IntegerField()
    classroom = models.ForeignKey(ClassRoom, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)

    class Meta:
        unique_together = ('user', 'classroom')
        indexes = [
            models.Index(fields=['user', 'classroom']),
            models.Index(fields=['user']),
            models.Index(fields=['classroom']),
        ]
        verbose_name_plural = "Students"

    def clean(self):
        """
        Validate that the same student cannot be in multiple different classrooms
        in the same academic year.

        Note: The unique_together constraint ('user', 'classroom') already prevents
        duplicate enrollments in the same classroom, so we only need to check for
        multiple different classrooms in the same year here.
        """
        if not self.user or not self.classroom:
            return

        # Check: Same academic year, DIFFERENT classroom
        # A student can be in the same classroom across different years,
        # but cannot be in multiple different classrooms in the same year
        existing_in_year = Student.objects.filter(
            user=self.user,
            classroom__academic_year=self.classroom.academic_year
        ).exclude(classroom=self.classroom)  # Exclude the current classroom

        if self.id:
            existing_in_year = existing_in_year.exclude(id=self.id)

        if existing_in_year.exists():
            existing_classroom = existing_in_year.first().classroom
            raise ValidationError({
                'user': f'{self.user.get_full_name()} is already in {existing_classroom.name} in {self.classroom.academic_year.year}. A student can only be in one classroom per year.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.user:
            return f"{self.user.get_full_name()} - Roll {self.roll_number} ({self.classroom.name})"
        return f"Student - Roll {self.roll_number}"


# -----------------------
# Attendance per student per day
# -----------------------
class Attendance(models.Model):
    id = models.BigAutoField(primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField()
    present = models.BooleanField(default=True)
    year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('student', 'date', 'year')
        indexes = [
            models.Index(fields=['student', 'year'], name='att_student_year_idx'),
            models.Index(fields=['date', 'year'], name='att_date_year_idx'),
            models.Index(fields=['student', 'date'], name='att_student_date_idx'),
            models.Index(fields=['year', 'date', 'student'], name='att_year_date_student_idx'),
        ]

    def __str__(self):
        student_name = self.student.user.get_full_name() if self.student.user else f"Roll {self.student.roll_number}"
        return f"{student_name} - {self.date} - {'Present' if self.present else 'Absent'}"


# -----------------------
# Holidays per School per AcademicYear
# -----------------------
class Holiday(models.Model):
    id = models.BigAutoField(primary_key=True)
    year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, db_index=True)
    date = models.DateField()
    name = models.CharField(max_length=255, blank=True)

    class Meta:
        # Holidays are unique per academic year and date. The AcademicYear is linked to a School,
        # so we don't need a separate school FK here.
        unique_together = ('year', 'date')
        indexes = [
            models.Index(fields=['year', 'date']),
        ]

    def clean(self):
        """Validate holiday data"""
        # No date range validation - holidays can be on any date
        pass

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        # Show school via the related academic year
        school_name = self.year.school.name if self.year and self.year.school else 'Unknown School'
        return f"{self.date} - {self.name or 'Holiday'} ({self.year.year}) - {school_name}"


# -----------------------
# Teacher
# -----------------------
class Teacher(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, null=True, blank=True,
        limit_choices_to={'user_type': 'teacher'}, db_index=True
    )
    school = models.ForeignKey(School, on_delete=models.CASCADE, db_index=True, related_name='teachers')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['school']),
            models.Index(fields=['user']),
        ]
        ordering = ['user__first_name', 'user__last_name']

    def __str__(self):
        if self.user:
            return f"{self.user.get_full_name()} - {self.school.name}"
        return f"Teacher {self.id} - {self.school.name}"


