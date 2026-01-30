from django.db import models
from records.models import Teacher, User, ClassRoom


# -----------------------
# TimetableEntry
# -----------------------
class TimetableEntry(models.Model):
    DAY_CHOICES = (
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    )

    id = models.BigAutoField(primary_key=True)
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, db_index=True, related_name='timetable_entries')
    day = models.CharField(max_length=10, choices=DAY_CHOICES, db_index=True)
    period = models.IntegerField()  # Period/slot in the day (1, 2, 3, etc.)
    subject = models.CharField(max_length=100)
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, db_index=True, related_name='timetable_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('classroom', 'day', 'period')
        indexes = [
            models.Index(fields=['classroom', 'day']),
            models.Index(fields=['teacher', 'day']),
            models.Index(fields=['classroom', 'day', 'period']),
        ]
        ordering = ['day', 'period']

    def __str__(self):
        return f"{self.classroom.name} - {self.get_day_display()} P{self.period} - {self.subject} - {self.teacher}"


# -----------------------
# Teacher Attendance (Present/Absent)
# -----------------------
class TeacherAttendance(models.Model):
    STATUS_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
    )

    id = models.BigAutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_index=True, related_name='attendance')
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present', db_index=True)
    reason = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('teacher', 'date')
        indexes = [
            models.Index(fields=['teacher', 'date']),
            models.Index(fields=['date', 'status']),
            models.Index(fields=['teacher', 'status']),
        ]
        ordering = ['-date']
        verbose_name = 'Teacher Attendance'
        verbose_name_plural = 'Teacher Attendances'

    def __str__(self):
        status_display = 'Present' if self.status == 'present' else 'Absent'
        return f"{self.teacher.user.get_full_name()} - {self.date} - {status_display}"


# Keep old name for backwards compatibility
class Absence(TeacherAttendance):
    class Meta:
        proxy = True
        verbose_name = 'Absence Record'
        verbose_name_plural = 'Absence Records'

    def save(self, *args, **kwargs):
        self.status = 'absent'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.teacher.user.get_full_name()} - {self.date} - Absent"


# -----------------------
# Proxy Assignment
# -----------------------
class Proxy(models.Model):
    STATUS_CHOICES = (
        ('assigned', 'Assigned'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    DAY_CHOICES = (
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    )

    id = models.BigAutoField(primary_key=True)
    absence = models.ForeignKey(Absence, on_delete=models.CASCADE, db_index=True, related_name='proxies')
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, db_index=True)
    day = models.CharField(max_length=10, choices=DAY_CHOICES, db_index=True)
    period = models.IntegerField()
    original_teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_index=True, related_name='assigned_absences')
    proxy_teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_index=True, related_name='proxy_assignments')
    subject = models.CharField(max_length=100)
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned', db_index=True)
    reason = models.CharField(max_length=500, blank=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_proxies')
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['date', 'status']),
            models.Index(fields=['proxy_teacher', 'status']),
            models.Index(fields=['original_teacher', 'date']),
            models.Index(fields=['classroom', 'date']),
        ]
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.original_teacher.user.get_full_name()} → {self.proxy_teacher.user.get_full_name()} - {self.date} - {self.get_status_display()}"
