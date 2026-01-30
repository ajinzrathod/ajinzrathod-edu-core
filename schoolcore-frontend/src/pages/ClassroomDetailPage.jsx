import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../utils/api";
import { handleApiError } from "../utils/errorHandler";
import Alert from "../components/Alert";
import Sidebar from "../components/Sidebar";

export default function ClassroomDetailPage({ user, onLogout }) {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleLogoutClick = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      onLogout();
    }
  };

  useEffect(() => {
    if (!classroomId) {
      navigate("/classrooms");
      return;
    }
    fetchClassroom();
  }, [classroomId]);

  const fetchClassroom = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`classrooms/${classroomId}/`);
      setClassroom(response.data);
    } catch (err) {
      setError(handleApiError(err));
      setTimeout(() => navigate("/classrooms"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading classroom details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!classroom) {
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
            <h1 className="text-2xl font-bold text-gray-800">Classroom Not Found</h1>
            <p className="text-sm text-gray-600 mt-1">{user?.school?.name}</p>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-6 space-y-4">
              {error && (
                <Alert
                  message={error}
                  type="error"
                  onClose={() => setError("")}
                />
              )}
              <button
                onClick={() => navigate("/classrooms")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Back to Classrooms
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-800">{classroom.name}</h1>
              <p className="text-sm text-gray-600 mt-1">{user?.school?.name}</p>
            </div>
            <button
              onClick={() => navigate("/classrooms")}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Information</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Name</p>
                    <p className="text-gray-800">{classroom.name}</p>
                  </div>
                  {classroom.start_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Start Date</p>
                      <p className="text-gray-800">{new Date(classroom.start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {classroom.end_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">End Date</p>
                      <p className="text-gray-800">{new Date(classroom.end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
