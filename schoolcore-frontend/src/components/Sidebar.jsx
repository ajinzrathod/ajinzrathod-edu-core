import { Link, useLocation } from "react-router-dom";
import { useAppConfig } from "../context/AppConfigContext.jsx";

export default function Sidebar({ schoolName, userName, onLogout }) {
  const { config } = useAppConfig();
  const location = useLocation();
  // Extract the main path segment (first part after /)
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentPath = pathSegments.length === 0 ? "overview" : pathSegments[0];

  const menuItems = [
    { id: "overview", label: "Overview", icon: "🏠", path: "/" },
    { id: "classrooms", label: "Classrooms", icon: "📚", path: "/classrooms" },
    { id: "students", label: "Students", icon: "👥", path: "/students" },
    { id: "attendance", label: "Attendance", icon: "✓", path: "/attendance" },
    { id: "reports", label: "Reports", icon: "📊", path: "/reports" },
    { id: "holidays", label: "Holidays", icon: "🗓️", path: "/holidays" },
    { id: "audit-logs", label: "Audit Logs", icon: "📋", path: "/audit-logs" },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col h-screen shadow-xl">
      {/* Logo & School Name */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold mb-1">{config.app_name}</h1>
        <p className="text-sm text-gray-300 truncate">{schoolName || "School"}</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentPath === item.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
            👤
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{userName}</p>
            <p className="text-xs text-gray-400">School Admin</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

