import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import StudentDetail from "../components/StudentDetail";
import Sidebar from "../components/Sidebar";
import api from "../utils/api";

export default function StudentDetailPage({ user, onLogout }) {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch student name - must be before any conditional returns
  useEffect(() => {
    const fetchStudentName = async () => {
      try {
        const response = await api.get(`students/${studentId}/`);
        setStudentName(response.data.user_full_name);
      } catch (err) {
        console.error("Error fetching student name:", err);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentName();
    }
  }, [studentId]);

  // Store classroom and year selection in localStorage when navigating to student details
  useEffect(() => {
    if (location.state?.classroomId && location.state?.yearId) {
      localStorage.setItem("selectedClassroomId", location.state.classroomId);
      localStorage.setItem("selectedYearId", location.state.yearId);
    }
  }, [location.state]);

  const handleLogoutClick = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      onLogout();
    }
  };

  if (!studentId) {
    navigate("/students");
    return null;
  }

  // Get classroom and year info from location state first, then fall back to localStorage
  const classroomId = location.state?.classroomId || localStorage.getItem("selectedClassroomId");
  const yearId = location.state?.yearId || localStorage.getItem("selectedYearId");

  const handleBack = () => {
    if (classroomId && yearId) {
      navigate("/students", { state: { classroomId: parseInt(classroomId), yearId: parseInt(yearId) } });
    } else {
      navigate(-1);
    }
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
              <h1 className="text-2xl font-bold text-gray-800">{loading ? "Loading..." : studentName}</h1>
              <p className="text-sm text-gray-600 mt-1">{user?.school?.name}</p>
            </div>
            <button
              onClick={handleBack}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6">
            <StudentDetail
              studentId={parseInt(studentId)}
              onBack={handleBack}
              selectedYear={yearId ? { id: parseInt(yearId) } : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
