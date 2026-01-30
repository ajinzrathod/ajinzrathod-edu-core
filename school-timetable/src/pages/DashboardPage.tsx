import React, { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSchoolData } from '../context/SchoolDataContext'
import { Users, BookOpen, Briefcase, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { teachers, classes, timetable, absences, proxies } = useSchoolData()

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const absentsToday = absences.filter(
      (a) => a.date === today && a.status === 'absent'
    ).length
    const proxiesComplete = proxies.filter((p) => p.status === 'completed').length
    const proxiesAssigned = proxies.filter((p) => p.status === 'assigned').length

    return [
      {
        title: 'Total Teachers',
        value: teachers.length,
        icon: <Users className="h-6 w-6" />,
        color: 'bg-blue-500',
        bgLight: 'bg-blue-50',
      },
      {
        title: 'Total Classes',
        value: classes.length,
        icon: <BookOpen className="h-6 w-6" />,
        color: 'bg-purple-500',
        bgLight: 'bg-purple-50',
      },
      {
        title: 'Absent Today',
        value: absentsToday,
        icon: <AlertCircle className="h-6 w-6" />,
        color: 'bg-red-500',
        bgLight: 'bg-red-50',
      },
      {
        title: 'Active Proxies',
        value: proxiesAssigned,
        icon: <Briefcase className="h-6 w-6" />,
        color: 'bg-orange-500',
        bgLight: 'bg-orange-50',
      },
      {
        title: 'Total Proxies',
        value: proxies.length,
        icon: <TrendingUp className="h-6 w-6" />,
        color: 'bg-green-500',
        bgLight: 'bg-green-50',
      },
    ]
  }, [teachers, classes, absences, proxies])

  // Get today's absences with proxies assigned
  const todayAbsencesWithStatus = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return absences
      .filter((a) => a.date === today && a.status === 'absent')
      .map((absence) => {
        const assignedProxies = proxies.filter(
          (p) =>
            p.original_teacher === absence.teacher &&
            p.date === today &&
            p.status !== 'cancelled'
        )
        return {
          ...absence,
          hasProxy: assignedProxies.length > 0,
          proxiesAssigned: assignedProxies.length,
        }
      })
  }, [absences, proxies])

  // Top teachers by proxy count
  const topProxyTeachers = useMemo(() => {
    const teacherProxyCounts = teachers.map((teacher) => ({
      ...teacher,
      proxyCount: proxies.filter(
        (p) => p.proxy_teacher === teacher.id && p.status === 'completed'
      ).length,
    }))
    return teacherProxyCounts
      .filter((t) => t.proxyCount > 0)
      .sort((a, b) => b.proxyCount - a.proxyCount)
      .slice(0, 5)
  }, [teachers, proxies])

  const getTeacherName = (teacherId: string | number) => {
    const teacher = teachers.find((t) => t.id === teacherId)
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-4xl font-bold">Welcome, {user?.first_name}!</h1>
        <p className="text-blue-100 mt-2">School: {user?.school__name}</p>
        <p className="text-blue-100 text-sm mt-1">Role: {user?.user_type}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className={`${stat.bgLight} rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 ${stat.color.replace(
              'bg-',
              'border-'
            )}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-lg p-3 text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Absences Alert */}
      {todayAbsencesWithStatus.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            Absences Today ({todayAbsencesWithStatus.length})
          </h2>
          <div className="space-y-3">
            {todayAbsencesWithStatus.map((absence) => (
              <div
                key={absence.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {getTeacherName(absence.teacher)}
                  </p>
                  <p className="text-sm text-gray-600">{absence.reason}</p>
                </div>
                {absence.hasProxy ? (
                  <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    Proxy Assigned ({absence.proxiesAssigned})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    No Proxy
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Proxy Takers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Top Proxy Teachers
          </h2>
          {topProxyTeachers.length === 0 ? (
            <p className="text-gray-500 text-center py-6">No proxy records yet</p>
          ) : (
            <div className="space-y-3">
              {topProxyTeachers.map((teacher, index) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {teacher.first_name} {teacher.last_name}
                      </p>
                      <p className="text-xs text-gray-600">@{teacher.username}</p>
                    </div>
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">
                    {teacher.proxyCount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-green-600" />
            Proxy Summary
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-700 font-medium">Total Proxies</span>
              <span className="text-2xl font-bold text-blue-600">{proxies.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-gray-700 font-medium">Currently Assigned</span>
              <span className="text-2xl font-bold text-orange-600">
                {proxies.filter((p) => p.status === 'assigned').length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-gray-700 font-medium">Completed</span>
              <span className="text-2xl font-bold text-green-600">
                {proxies.filter((p) => p.status === 'completed').length}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-gray-700 font-medium">Cancelled</span>
              <span className="text-2xl font-bold text-red-600">
                {proxies.filter((p) => p.status === 'cancelled').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-purple-600" />
          School Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-gray-600 text-sm font-medium">Total Teachers</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{teachers.length}</p>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <p className="text-gray-600 text-sm font-medium">Total Classes</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{classes.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 text-sm font-medium">Timetable Entries</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{timetable.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
