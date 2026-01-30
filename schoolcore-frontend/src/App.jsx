import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import StudentDetailPage from "./pages/StudentDetailPage.jsx";
import ClassroomDetailPage from "./pages/ClassroomDetailPage.jsx";
import { AppConfigProvider } from "./context/AppConfigContext.jsx";
import { setAuthToken } from "./utils/api";
import "./index.css";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error("Failed to parse user data:", err);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  const handleLogin = (token, userData) => {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setToken(token);
      setUser(userData);
      setAuthToken(token);
    } catch (err) {
      console.error("Failed to save login data:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  if (!token || !user) {
    return (
      <AppConfigProvider>
        <BrowserRouter>
          <Login onLogin={handleLogin} />
        </BrowserRouter>
      </AppConfigProvider>
    );
  }

  return (
    <AppConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="/classrooms" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="/classrooms/:classroomId" element={<ClassroomDetailPage user={user} onLogout={handleLogout} />} />
          <Route path="/students" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="/students/:studentId" element={<StudentDetailPage user={user} onLogout={handleLogout} />} />
          <Route path="/attendance" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="/reports" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="/holidays" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="/audit-logs" element={<Dashboard user={user} onLogout={handleLogout} />} />
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AppConfigProvider>
  );
}
