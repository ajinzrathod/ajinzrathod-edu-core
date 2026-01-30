import React, { useState, useMemo } from 'react'
import { useSchoolData } from '../context/SchoolDataContext'
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  Clock,
  User,
  Shield,
  ArrowLeft,
} from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

type ViewMode = 'overview' | 'class-detail' | 'teacher-detail' | 'proxy-assignment'

export const TimetablePage: React.FC = () => {
  const { classes, timetable, teachers, absences, proxies, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry, getTimetableByClass } =
    useSchoolData()

  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.id || '')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedAbsenceId, setSelectedAbsenceId] = useState<string>('')
  const [proxyTeacherId, setProxyTeacherId] = useState<string>('')
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    day: 'monday' as const,
    period: 1,
    subject: '',
    teacher_id: '',
  })

  // Get current date and day
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]
  const todayDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1 // Convert Sunday (0) to 6, Monday (1) to 0
  const todayDay = DAYS[todayDayIndex] || 'monday'

  // Get dates for the current week (Monday to Sunday)
  const weekDatesMap = useMemo(() => {
    const map: Record<string, string> = {}
    const currentDate = new Date(today)

    // Calculate Monday of current week
    const day = currentDate.getDay()
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const monday = new Date(currentDate.setDate(diff))

    // Fill in dates for each day of the week
    DAYS.forEach((dayName, index) => {
      const date = new Date(monday)
      date.setDate(date.getDate() + index)
      map[dayName] = date.toISOString().split('T')[0]
    })

    return map
  }, [today])

  // Get today's absences that need proxies (only for current day)
  const todayAbsencesNeedingProxies = useMemo(() => {
    return absences
      .filter((a) => a.date === todayString && a.status === 'absent')
      .map((absence) => {
        const hasProxy = proxies.some(
          (p) => p.absence === absence.id && p.status !== 'cancelled'
        )
        return {
          ...absence,
          hasProxy,
          teacher_name: teachers.find(t => t.id === absence.teacher)?.first_name + ' ' + teachers.find(t => t.id === absence.teacher)?.last_name,
        }
      })
  }, [absences, proxies, teachers, todayString])

  // Get timetable for selected class and organize by period
  const classEntries = useMemo(() => {
    if (!selectedClass) return []
    return getTimetableByClass(selectedClass).sort((a, b) => {
      const dayOrder = DAYS.indexOf(a.day as any) - DAYS.indexOf(b.day as any)
      if (dayOrder !== 0) return dayOrder
      return a.period - b.period
    })
  }, [selectedClass, getTimetableByClass])

  // Get all periods for the class (max period across all days)
  const allPeriods = useMemo(() => {
    if (classEntries.length === 0) return []
    const maxPeriod = Math.max(...classEntries.map(e => e.period))
    return Array.from({ length: maxPeriod }, (_, i) => i + 1)
  }, [classEntries])

  // Get timetable entries grouped by day and period for tabular view
  const timetableByDayAndPeriod = useMemo(() => {
    const grouped: Record<string, Record<number, typeof classEntries[0] | undefined>> = {}
    DAYS.forEach((day) => {
      grouped[day] = {}
      allPeriods.forEach((period) => {
        grouped[day][period] = classEntries.find((e) => e.day === day && e.period === period)
      })
    })
    return grouped
  }, [classEntries, allPeriods])

  // Get teacher's schedule
  const teacherSchedule = useMemo(() => {
    if (!selectedTeacher) return []
    return timetable
      .filter((t) => t.teacher === selectedTeacher)
      .sort((a, b) => {
        const dayOrder = DAYS.indexOf(a.day as any) - DAYS.indexOf(b.day as any)
        if (dayOrder !== 0) return dayOrder
        return a.period - b.period
      })
  }, [selectedTeacher, timetable])

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId)
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown'
  }

  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId)
    return cls ? cls.name : 'Unknown'
  }

  const getDayName = (day: string): string => {
    return DAY_LABELS[day] || day.charAt(0).toUpperCase() + day.slice(1)
  }

  // Handle proxy assignment - ONLY for current day
  const handleAssignProxy = async () => {
    if (!selectedAbsenceId || !proxyTeacherId) {
      alert('Please select both an absence and a proxy teacher')
      return
    }

    const absence = absences.find(a => a.id === selectedAbsenceId)
    if (!absence) return

    // Ensure proxy can only be assigned to current day
    if (absence.date !== todayString) {
      alert('Proxies can only be assigned for today')
      return
    }

    // Get the timetable entry for the absent teacher on current day
    const absentTeacherTimetables = timetable.filter(
      (t) => t.teacher === absence.teacher && t.day === todayDay
    )

    if (absentTeacherTimetables.length === 0) {
      alert('No timetable entry found for this teacher today')
      return
    }

    // For now, create a proxy for the first entry
    const entry = absentTeacherTimetables[0]
    const cls = classes.find(c => c.id === entry.classroom)

    if (!cls) {
      alert('Class not found')
      return
    }

    try {
      // Call the proxy assignment API
      const token = localStorage.getItem('token') || localStorage.getItem('access_token')
      const response = await fetch('/api/timetable/proxies/assign/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          absence_id: selectedAbsenceId,
          period: entry.period,
          classroom_id: cls.id,
          proxy_teacher_id: parseInt(proxyTeacherId as string),
          subject: entry.subject,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign proxy')
      }

      alert('Proxy assigned successfully!')
      setViewMode('class-detail')
      setSelectedAbsenceId('')
      setProxyTeacherId('')
    } catch (error) {
      alert('Error assigning proxy: ' + error)
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Timetable & Proxies</h1>
        <p className="text-gray-600 mt-1">Manage class schedules, teacher schedules, and proxy assignments</p>
      </div>

      {/* Today's Absences Needing Proxies - Alert */}
      {todayAbsencesNeedingProxies.filter(a => !a.hasProxy).length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            ⚠️ Teachers Absent Today - Need Proxies
          </h2>
          <div className="space-y-3">
            {todayAbsencesNeedingProxies
              .filter(a => !a.hasProxy)
              .map((absence) => (
                <div key={absence.id} className="flex items-center justify-between bg-white p-4 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{absence.teacher_name}</p>
                    <p className="text-sm text-gray-600">{absence.reason || 'No reason provided'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAbsenceId(absence.id)
                      setViewMode('proxy-assignment')
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Assign Proxy
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* View Mode Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'overview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📋 Class Overview
        </button>
        <button
          onClick={() => setViewMode('teacher-detail')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'teacher-detail'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          👨‍🏫 Teacher Schedule
        </button>
      </div>

      {/* OVERVIEW MODE - Class Selection Grid */}
      {viewMode === 'overview' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Select a Class</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const classAbsences = absences.filter(
                (a) => a.date === todayString && a.status === 'absent' && timetable.some(t => t.classroom === cls.id && t.teacher === a.teacher)
              )
              const needsProxy = classAbsences.length > 0
              return (
                <div
                  key={cls.id}
                  onClick={() => {
                    setSelectedClass(cls.id)
                    setViewMode('class-detail')
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition transform hover:scale-105 ${
                    needsProxy
                      ? 'border-red-500 bg-red-50 ring-2 ring-red-400'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{cls.name}</h3>
                      <p className="text-sm text-gray-600">
                        Grade {cls.grade}, Section {cls.section}
                      </p>
                    </div>
                    {needsProxy ? (
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {classAbsences.length} Absent
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        All Good
                      </span>
                    )}
                  </div>
                  {needsProxy && (
                    <div className="bg-red-100 border border-red-300 rounded p-2 text-sm text-red-800">
                      {classAbsences.map((a) => (
                        <p key={a.id}>❌ {getTeacherName(a.teacher)}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* CLASS DETAIL MODE - Tabular Timetable View */}
      {viewMode === 'class-detail' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            {/* Header with back button and class selector */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewMode('overview')}
                  className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getClassName(selectedClass)} - Weekly Timetable
                  </h2>
                  <p className="text-gray-600">Current week (showing {getDayName(todayDay)} as today)</p>
                </div>
              </div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {classEntries.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No timetable entries for this class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left font-bold text-gray-700 w-20 bg-gray-50">Period</th>
                      {DAYS.map((day) => (
                        <th
                          key={day}
                          className={`px-4 py-3 text-center font-bold text-gray-700 min-w-48 ${
                            day === todayDay ? 'bg-blue-100 border-b-4 border-blue-500' : ''
                          }`}
                        >
                          <div className={day === todayDay ? 'text-blue-700' : ''}>
                            <div>{getDayName(day)}</div>
                            <div className="text-sm font-normal text-gray-600">{weekDatesMap[day]}</div>
                            {day === todayDay && <div className="text-xs text-blue-600 font-bold">TODAY</div>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allPeriods.map((period) => (
                      <tr key={period} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-4 font-bold text-gray-700 bg-gray-50 text-center w-20">
                          Period {period}
                        </td>
                        {DAYS.map((day) => {
                          const entry = timetableByDayAndPeriod[day][period]
                          const dayDate = weekDatesMap[day] // Get actual date for this day
                          const isTeacherAbsent = entry
                            ? absences.some(
                                (a) =>
                                  a.teacher === entry.teacher &&
                                  a.date === dayDate && // Use actual date for this day
                                  a.status === 'absent'
                              )
                            : false
                          const hasProxy = entry
                            ? proxies.some(
                                (p) =>
                                  p.original_teacher === entry.teacher &&
                                  p.date === dayDate && // Use actual date for this day
                                  p.period === entry.period &&
                                  p.status !== 'cancelled'
                              )
                            : false
                          const proxyTeacher = entry
                            ? proxies.find(
                                (p) =>
                                  p.original_teacher === entry.teacher &&
                                  p.date === dayDate && // Use actual date for this day
                                  p.period === entry.period &&
                                  p.status !== 'cancelled'
                              )
                            : null

                          return (
                            <td
                              key={`${day}-${period}`}
                              className={`px-4 py-4 min-w-48 ${
                                day === todayDay ? 'bg-blue-50' : ''
                              } ${
                                isTeacherAbsent && !hasProxy
                                  ? 'bg-red-50 border-l-4 border-red-500'
                                  : isTeacherAbsent && hasProxy
                                  ? 'bg-yellow-50 border-l-4 border-yellow-500'
                                  : entry
                                  ? 'bg-blue-50 border-l-4 border-blue-500'
                                  : 'bg-gray-50'
                              }`}
                            >
                              {entry ? (
                                <div className="space-y-2">
                                  <div>
                                    <p className="font-bold text-gray-900">{entry.subject}</p>
                                    <p className="text-sm text-gray-700">{getTeacherName(entry.teacher)}</p>
                                  </div>
                                  {isTeacherAbsent && (
                                    <div className="pt-2 border-t border-red-200">
                                      <p className="text-xs font-semibold text-red-700">❌ Teacher Absent</p>
                                      {!hasProxy && (
                                        <button
                                          onClick={() => {
                                            const absence = absences.find(
                                              (a) =>
                                                a.teacher === entry.teacher &&
                                                a.date === dayDate // Use actual date for this day
                                            )
                                            if (absence) {
                                              setSelectedAbsenceId(absence.id)
                                              setViewMode('proxy-assignment')
                                            }
                                          }}
                                          className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
                                        >
                                          Assign Proxy
                                        </button>
                                      )}
                                      {hasProxy && proxyTeacher && (
                                        <p className="text-xs text-green-700 font-semibold mt-2">
                                          ✅ Proxy: {getTeacherName(proxyTeacher.proxy_teacher)}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-sm italic">No class</p>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEACHER DETAIL MODE */}
      {viewMode === 'teacher-detail' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Select Teacher
              </label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a teacher --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTeacher && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <User className="h-6 w-6" />
                  {getTeacherName(selectedTeacher)}'s Schedule
                </h2>

                {teacherSchedule.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No timetable entries for this teacher</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <th className="px-4 py-3 text-left font-bold text-gray-700 w-20 bg-gray-50">Period</th>
                          {DAYS.map((day) => (
                            <th
                              key={day}
                              className={`px-4 py-3 text-center font-bold text-gray-700 min-w-48 ${
                                day === todayDay ? 'bg-blue-100 border-b-4 border-blue-500' : ''
                              }`}
                            >
                              <div className={day === todayDay ? 'text-blue-700' : ''}>
                                <div>{getDayName(day)}</div>
                                <div className="text-sm font-normal text-gray-600">{weekDatesMap[day]}</div>
                                {day === todayDay && <div className="text-xs text-blue-600 font-bold">TODAY</div>}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(
                          { length: Math.max(...teacherSchedule.map((e) => e.period), 0) },
                          (_, i) => i + 1
                        ).map((period) => (
                          <tr key={period} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-4 font-bold text-gray-700 bg-gray-50 text-center w-20">
                              Period {period}
                            </td>
                            {DAYS.map((day) => {
                              const entry = teacherSchedule.find((e) => e.day === day && e.period === period)
                              const dayDate = weekDatesMap[day] // Get actual date for this day
                              const isAbsent = selectedTeacher
                                ? absences.some(
                                    (a) =>
                                      a.teacher === selectedTeacher &&
                                      a.date === dayDate && // Use actual date for this day
                                      a.status === 'absent'
                                  )
                                : false

                              return (
                                <td
                                  key={`${day}-${period}`}
                                  className={`px-4 py-4 min-w-48 ${
                                    day === todayDay ? 'bg-blue-50' : ''
                                  } ${
                                    isAbsent
                                      ? 'bg-red-50 border-l-4 border-red-500'
                                      : entry
                                      ? 'bg-green-50 border-l-4 border-green-500'
                                      : 'bg-gray-50'
                                  }`}
                                >
                                  {entry ? (
                                    <div>
                                      <p className="font-bold text-gray-900">{entry.subject}</p>
                                      <p className="text-sm text-gray-700">{getClassName(entry.classroom)}</p>
                                      {isAbsent && (
                                        <p className="text-xs font-semibold text-red-700 mt-2">
                                          ❌ Absent on {dayDate}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-gray-400 text-sm italic">Free</p>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROXY ASSIGNMENT MODE */}
      {viewMode === 'proxy-assignment' && selectedAbsenceId && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Assign Proxy Teacher</h2>
            <button
              onClick={() => {
                setViewMode('class-detail')
                setSelectedAbsenceId('')
                setProxyTeacherId('')
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {absences.find(a => a.id === selectedAbsenceId) && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900">
                  Absent Teacher: {getTeacherName(absences.find(a => a.id === selectedAbsenceId)?.teacher || '')}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Date: {todayString}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Proxy Teacher
                </label>
                <select
                  value={proxyTeacherId}
                  onChange={(e) => setProxyTeacherId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a teacher --</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAssignProxy}
                  disabled={!proxyTeacherId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Assign Proxy
                </button>
                <button
                  onClick={() => {
                    setViewMode('class-detail')
                    setSelectedAbsenceId('')
                    setProxyTeacherId('')
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

