from django.urls import path
from .views import (
    TimetableListView, TimetableDetailView, ClassroomTimetableView, TeacherScheduleView,
    AbsenceListView, AbsenceDetailView, ApproveAbsenceView,
    BulkAbsenceView, BulkMarkPresentView,
    ProxyListView, ProxyDetailView, CompleteProxyView,
    TeacherAvailabilityView, AbsenceDetailsView, AssignProxyView,
    TeacherProxyScheduleView, ClassroomTimetableWithAbsencesView,
    TeacherScheduleWithAbsencesView
)

urlpatterns = [
    # Timetable
    path("timetable/", TimetableListView.as_view(), name="timetable-list"),
    path("timetable/<int:id>/", TimetableDetailView.as_view(), name="timetable-detail"),
    path("classrooms/<int:classroom_id>/timetable/", ClassroomTimetableView.as_view(), name="classroom-timetable"),
    path("classrooms/<int:classroom_id>/timetable-with-absences/", ClassroomTimetableWithAbsencesView.as_view(), name="classroom-timetable-with-absences"),
    path("teachers/<int:teacher_id>/schedule/", TeacherScheduleView.as_view(), name="teacher-schedule"),
    path("teachers/<int:teacher_id>/schedule-with-absences/", TeacherScheduleWithAbsencesView.as_view(), name="teacher-schedule-with-absences"),

    # Absences
    path("absences/", AbsenceListView.as_view(), name="absences-list"),
    path("absences/<int:id>/", AbsenceDetailView.as_view(), name="absence-detail"),
    path("absences/<int:absence_id>/approve/", ApproveAbsenceView.as_view(), name="absence-approve"),
    path("absences/<int:teacher_id>/details/", AbsenceDetailsView.as_view(), name="absence-details"),
    path("absences/bulk/mark-absent/", BulkAbsenceView.as_view(), name="bulk-mark-absent"),
    path("absences/bulk/mark-present/", BulkMarkPresentView.as_view(), name="bulk-mark-present"),

    # Proxies
    path("proxies/", ProxyListView.as_view(), name="proxies-list"),
    path("proxies/<int:id>/", ProxyDetailView.as_view(), name="proxy-detail"),
    path("proxies/<int:proxy_id>/complete/", CompleteProxyView.as_view(), name="proxy-complete"),
    path("proxies/assign/", AssignProxyView.as_view(), name="proxy-assign"),
    path("teachers/<int:teacher_id>/proxy-schedule/", TeacherProxyScheduleView.as_view(), name="teacher-proxy-schedule"),

    # Teacher Availability
    path("teachers/availability/", TeacherAvailabilityView.as_view(), name="teacher-availability"),
]
