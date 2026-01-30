import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SchoolDataProvider } from './context/SchoolDataContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TeachersPage } from './pages/TeachersPage'
import { TimetablePage } from './pages/TimetablePage'
import { ProxyPage } from './pages/ProxyPage'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  LogOut,
} from 'lucide-react'

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  if (!user) {
    return <>{children}</>
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    { href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard' },
    { href: '/teachers', icon: <Users className="h-5 w-5" />, label: 'Teachers' },
    { href: '/timetable', icon: <Calendar className="h-5 w-5" />, label: 'Timetable' },
    { href: '/proxy', icon: <Briefcase className="h-5 w-5" />, label: 'Proxy' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold">School Timetable</h1>
        </div>

        <nav className="mt-6 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition"
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
          <button
            onClick={() => {
              handleLogout()
              setSidebarOpen(false)
            }}
            className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            {sidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-gray-600">{user.user_type}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

const ProtectedPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <SchoolDataProvider schoolId={user.school__id}>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    </SchoolDataProvider>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedPageWrapper>
                  <DashboardPage />
                </ProtectedPageWrapper>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedPageWrapper>
                  <TeachersPage />
                </ProtectedPageWrapper>
              }
            />
            <Route
              path="/timetable"
              element={
                <ProtectedPageWrapper>
                  <TimetablePage />
                </ProtectedPageWrapper>
              }
            />
            <Route
              path="/proxy"
              element={
                <ProtectedPageWrapper>
                  <ProxyPage />
                </ProtectedPageWrapper>
              }
            />
            <Route path="/" element={<RootRoute />} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </Router>
  )
}

// Component to handle root route redirection
const RootRoute: React.FC = () => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default App
