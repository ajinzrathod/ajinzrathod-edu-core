from django.urls import path
from .views import (
    LoginView, UserDetailView,
    AcademicYearListView,
    ClassListView, ClassDetailView,
    StudentListView, StudentDetailView, UserSearchView, StudentCreateView,
    StudentAttendanceView, AttendanceListView, AttendanceCreateView, AttendanceDetailView,
    AttendanceStatisticsView, SchoolWideStatisticsView,
    HolidayListCreateView, HolidayDetailView,
    SchoolWeekendView, AuditLogListView, AppConfigView,
    PendingDevicesListView, DeviceApprovalView, UserDevicesListView,
    TeacherListView, TeacherDetailView
)

urlpatterns = [
    # Authentication
    path("login/", LoginView.as_view(), name="login"),
    path("user/", UserDetailView.as_view(), name="user-detail"),

    # Academic Years
    path("years/", AcademicYearListView.as_view(), name="academic-years"),

    # Classrooms
    path("classrooms/", ClassListView.as_view(), name="classrooms-list"),
    path("classrooms/<int:pk>/", ClassDetailView.as_view(), name="classroom-detail"),

    # Students
    path("students/", StudentListView.as_view(), name="students-list"),
    path("classrooms/<int:classroom_id>/students/", StudentListView.as_view(), name="students-by-classroom"),
    path("students/<int:pk>/", StudentDetailView.as_view(), name="student-detail"),
    path("users/search/", UserSearchView.as_view(), name="user-search"),
    path("students/create/", StudentCreateView.as_view(), name="student-create"),

    # Attendance
    path("attendance/student/<int:student_id>/", StudentAttendanceView.as_view(), name="student-attendance"),
    path("attendance/", AttendanceListView.as_view(), name="attendance-list"),
    path("classrooms/<int:classroom_id>/attendance/", AttendanceListView.as_view(), name="attendance-by-classroom"),
    path("attendance/create/", AttendanceCreateView.as_view(), name="attendance-create"),
    path("attendance/<int:pk>/", AttendanceDetailView.as_view(), name="attendance-detail"),
    path("attendance/statistics/", AttendanceStatisticsView.as_view(), name="attendance-statistics"),
    path("attendance/school-statistics/", SchoolWideStatisticsView.as_view(), name="school-statistics"),

    # Holidays
    path("holidays/", HolidayListCreateView.as_view(), name="holidays-list"),
    path("holidays/<int:pk>/", HolidayDetailView.as_view(), name="holiday-detail"),

    # School Weekend Configuration
    path("school/weekends/", SchoolWeekendView.as_view(), name="school-weekends"),

    # Audit Logs
    path("audit-logs/", AuditLogListView.as_view(), name="audit-logs-list"),

    # App Configuration
    path("config/", AppConfigView.as_view(), name="app-config"),

    # Device Management
    path("devices/pending/", PendingDevicesListView.as_view(), name="pending-devices"),
    path("devices/<int:device_id>/approve/", DeviceApprovalView.as_view(), name="device-approve"),
    path("devices/<int:device_id>/reject/", DeviceApprovalView.as_view(), name="device-reject"),
    path("users/<int:user_id>/devices/", UserDevicesListView.as_view(), name="user-devices"),

    # Teachers
    path("teachers/", TeacherListView.as_view(), name="teachers-list"),
    path("teachers/<int:id>/", TeacherDetailView.as_view(), name="teacher-detail"),
]
