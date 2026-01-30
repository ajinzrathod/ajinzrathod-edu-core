import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";
import { useAppConfig } from "../context/AppConfigContext.jsx";
import Alert from "./Alert.jsx";
import Sidebar from "./Sidebar.jsx";
import ClassroomManagement from "./ClassroomManagement.jsx";
import StudentManagement from "./StudentManagement.jsx";
import AttendanceManagement from "./AttendanceManagement.jsx";
import HolidayManagement from "./HolidayManagement.jsx";
import AttendanceReport from "./AttendanceReport.jsx";
import AuditLogs from "./AuditLogs.jsx";

export default function Dashboard({ user, onLogout }) {
  const { config } = useAppConfig();
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [yearLoading, setYearLoading] = useState(false);
  const [error, setError] = useState("");
  const [overviewStats, setOverviewStats] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      // Clear old data immediately to prevent stale UI flash
      setClassrooms([]);
      setSelectedClassroom(null);
      setYearLoading(true);
      fetchClassrooms();
      fetchOverviewStats();
    }
  }, [selectedYear]);

  const fetchOverviewStats = async () => {
    try {
      setError("");
      // Fetch school statistics for overview
      const statsResponse = await api.get("attendance/school-statistics/", {
        params: {
          year_id: selectedYear?.id,
          period: "overall"
        }
      });

      // Fetch holidays count
      const holidaysResponse = await api.get("holidays/", {
        params: { year_id: selectedYear?.id }
      });

      // Calculate classroom performance metrics
      const classroomDetails = statsResponse.data.classroom_details || [];
      let bestClassroom = null;
      let worstClassroom = null;
      let totalPercentage = 0;
      let above90 = 0;
      let above80 = 0;
      let below80 = 0;

      classroomDetails.forEach(classroom => {
        const percentage = classroom.attendance_records === 0 ? 0 : (classroom.present_count / classroom.attendance_records) * 100;
        totalPercentage += percentage;

        if (percentage >= 90) above90++;
        else if (percentage >= 80 && percentage < 90) above80++;
        else if (percentage < 80) below80++;

        if (!bestClassroom || percentage > ((bestClassroom.present_count / bestClassroom.attendance_records) * 100)) {
          bestClassroom = classroom;
        }
        if (!worstClassroom || percentage < ((worstClassroom.present_count / worstClassroom.attendance_records) * 100)) {
          worstClassroom = classroom;
        }
      });

      const avgPercentage = classroomDetails.length > 0 ? (totalPercentage / classroomDetails.length).toFixed(2) : 0;

      setOverviewStats({
        totalStudents: statsResponse.data.school_statistics.total_students,
        totalAttendanceRecords: statsResponse.data.school_statistics.total_attendance_records,
        totalPresent: statsResponse.data.school_statistics.total_present,
        overallAttendancePercentage: statsResponse.data.school_statistics.overall_attendance_percentage,
        totalHolidays: Array.isArray(holidaysResponse.data) ? holidaysResponse.data.length : 0,
        // Performance metrics
        above90Count: above90,
        above80Count: above80,
        below80Count: below80,
        avgAttendancePercentage: avgPercentage,
        bestClassroom: bestClassroom,
        worstClassroom: worstClassroom
      });
    } catch (err) {
      // Silently fail for overview stats - use defaults
      setOverviewStats(null);
    }
  };

  const fetchYears = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("years/");
      const yearsData = Array.isArray(response.data) ? response.data : [];
      setYears(yearsData);
      if (yearsData.length > 0) {
        const currentYear = yearsData.find(y => y.is_current) || yearsData[0];
        setSelectedYear(currentYear);
      }
    } catch (err) {
      setError(handleApiError(err));
      setYears([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      setError("");
      const response = await api.get("classrooms/", {
        params: { year_id: selectedYear?.id }
      });
      const classroomsData = Array.isArray(response.data) ? response.data : [];
      setClassrooms(classroomsData);
      setSelectedClassroom(null);
    } catch (err) {
      setError(handleApiError(err));
      setClassrooms([]);
    } finally {
      setYearLoading(false);
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      onLogout();
    }
  };

  const OverviewPage = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
        <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user?.first_name || "User"}!</h2>
        <p className="text-gray-600 mt-1">Here's an overview of your school management system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: "📚", label: "Classrooms", value: classrooms.length },
          { icon: "👥", label: "Students", value: overviewStats?.totalStudents ?? "---" },
          { icon: "✓", label: "Attendance Marked", value: overviewStats?.totalAttendanceRecords ?? "---" },
          { icon: "🗓️", label: "Holidays", value: overviewStats?.totalHolidays ?? "0" }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-t-4 border-blue-500">
            <div className="text-3xl mb-2">{stat.icon}</div>
            <h3 className="text-sm font-semibold text-gray-600 mb-1">{stat.label}</h3>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {overviewStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-700">Present</span>
                <span className="text-xl font-bold text-green-600">{overviewStats.totalPresent}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-700">Absent</span>
                <span className="text-xl font-bold text-red-600">{overviewStats.totalAttendanceRecords - overviewStats.totalPresent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Overall Percentage</span>
                <span className="text-xl font-bold text-emerald-600">{overviewStats.overallAttendancePercentage}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">90% - 100%</span>
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full font-semibold">{overviewStats.above90Count}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">80% - 89%</span>
                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">{overviewStats.above80Count}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-700 font-semibold text-red-700">Needs Attention (Below 80%)</span>
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full font-semibold">{overviewStats.below80Count}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {overviewStats && overviewStats.below80Count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Classroom Performance</h3>
            <div className="space-y-4">
              {overviewStats.bestClassroom && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Best Performer</p>
                  <p className="text-lg font-bold text-green-700">{overviewStats.bestClassroom.classroom_name}</p>
                  <p className="text-sm text-gray-600">
                    {overviewStats.bestClassroom.present_count} / {overviewStats.bestClassroom.attendance_records}
                    ({((overviewStats.bestClassroom.present_count / overviewStats.bestClassroom.attendance_records) * 100).toFixed(2)}%)
                  </p>
                </div>
              )}
              {overviewStats.worstClassroom && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Needs Attention</p>
                  <p className="text-lg font-bold text-red-700">{overviewStats.worstClassroom.classroom_name}</p>
                  <p className="text-sm text-gray-600">
                    {overviewStats.worstClassroom.present_count} / {overviewStats.worstClassroom.attendance_records}
                    ({((overviewStats.worstClassroom.present_count / overviewStats.worstClassroom.attendance_records) * 100).toFixed(2)}%)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-700">Avg Attendance %</span>
                <span className="text-xl font-bold text-blue-600">{overviewStats.avgAttendancePercentage}%</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-700">Academic Year</span>
                <span className="text-lg font-bold text-gray-700">{selectedYear?.year || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Total Classrooms</span>
                <span className="text-lg font-bold text-gray-700">{classrooms.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button onClick={() => navigate("/classrooms")} className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition">
            <p className="font-semibold text-blue-700">Manage Classrooms</p>
            <p className="text-sm text-gray-600">Add or edit classrooms</p>
          </button>
          <button onClick={() => navigate("/students")} className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-left transition">
            <p className="font-semibold text-purple-700">Manage Students</p>
            <p className="text-sm text-gray-600">Add or manage student records</p>
          </button>
          <button onClick={() => navigate("/attendance")} className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-left transition">
            <p className="font-semibold text-green-700">Mark Attendance</p>
            <p className="text-sm text-gray-600">Record daily attendance</p>
          </button>
          <button onClick={() => navigate("/reports")} className="p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-left transition">
            <p className="font-semibold text-orange-700">View Reports</p>
            <p className="text-sm text-gray-600">View attendance analytics</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    const path = location.pathname;

    if (path === "/" || path === "") {
      return <OverviewPage />;
    } else if (path === "/classrooms") {
      return (
        <ClassroomManagement
          classrooms={classrooms}
          onRefresh={fetchClassrooms}
          user={user}
          selectedYear={selectedYear}
          years={years}
          onYearChange={setSelectedYear}
        />
      );
    } else if (path === "/students") {
      return (
        <StudentManagement
          selectedYear={selectedYear}
          selectedClassroom={selectedClassroom}
          onClassroomChange={setSelectedClassroom}
          classrooms={classrooms}
          onRefresh={fetchClassrooms}
          years={years}
          onYearChange={setSelectedYear}
        />
      );
    } else if (path === "/attendance") {
      return (
        <AttendanceManagement
          selectedYear={selectedYear}
          selectedClassroom={selectedClassroom}
          onClassroomChange={setSelectedClassroom}
          classrooms={classrooms}
          years={years}
          onYearChange={setSelectedYear}
        />
      );
    } else if (path === "/reports") {
      return (
        <AttendanceReport
          selectedYear={selectedYear}
        />
      );
    } else if (path === "/holidays") {
      return (
        <HolidayManagement
          selectedYear={selectedYear}
          years={years}
          onYearChange={setSelectedYear}
        />
      );
    } else if (path === "/audit-logs") {
      return (
        <AuditLogs user={user} />
      );
    }

    return <OverviewPage />;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="flex-shrink-0">
        <Sidebar
          schoolName={user?.school?.name}
          userName={`${user?.first_name} ${user?.last_name}`}
          onLogout={handleLogoutClick}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="bg-white border-b border-gray-200 shadow-sm p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{config.app_name} Management</h1>
              <p className="text-sm text-gray-600 mt-1">{user?.school?.name}</p>
            </div>
            {years.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Academic Year:</label>
                <div className="relative">
                  <select
                    value={selectedYear?.id || ""}
                    onChange={(e) => {
                      const year = years.find(y => y.id === parseInt(e.target.value));
                      setSelectedYear(year);
                    }}
                    disabled={yearLoading}
                    className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      yearLoading ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                    }`}
                  >
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.year} {year.is_current ? "(Current)" : ""}
                      </option>
                    ))}
                  </select>
                  {yearLoading && (
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6">
            {error && (
              <Alert
                message={error}
                type="error"
                onClose={() => setError("")}
              />
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>
            ) : yearLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading academic year data...</p>
                  <p className="text-gray-500 text-sm mt-2">Please wait while we refresh the data</p>
                </div>
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
