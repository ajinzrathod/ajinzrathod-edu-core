import React, { useState, useMemo } from 'react'
import { useSchoolData } from '../context/SchoolDataContext'
import {
  Briefcase,
  Plus,
  X,
  Check,
  AlertCircle,
  Trash2,
  CheckCircle,
} from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export const ProxyPage: React.FC = () => {
  const {
    teachers,
    classes,
    timetable,
    absences,
    proxies,
    addProxy,
  } = useSchoolData()

  const [selectedAbsenceDate, setSelectedAbsenceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [filterStatus, setFilterStatus] = useState<'assigned' | 'completed' | 'cancelled' | 'all'>('all')
  const [assigningPeriod, setAssigningPeriod] = useState<{ classId: string; period: number } | null>(null)
  const [selectedProxyTeacher, setSelectedProxyTeacher] = useState<string>('')

  // Get all absences for the selected date
  const absencesForDate = useMemo(() => {
    return absences.filter(
      (a) => a.date === selectedAbsenceDate && a.status === 'absent'
    )
  }, [absences, selectedAbsenceDate])

  // Get the day of week for selected date
  const dayOfWeek = useMemo(() => {
    return new Date(selectedAbsenceDate).toLocaleDateString('en-US', {
      weekday: 'long',
    }).toLowerCase()
  }, [selectedAbsenceDate])

  // Find all periods affected by absences on this date
  const affectedPeriods = useMemo(() => {
    const periodsList: Array<{
      classId: string
      className: string
      period: number
      subject: string
      absentTeacherId: string
      absentTeacherName: string
      hasProxy: boolean
      proxyTeacherId?: string
      proxyTeacherName?: string
    }> = []

    absencesForDate.forEach((absence) => {
      const entries = timetable.filter(
        (e) => e.teacher === absence.teacher && e.day === dayOfWeek
      )

      entries.forEach((entry) => {
        const teacher = teachers.find((t) => t.id === absence.teacher)
        const className = classes.find((c) => c.id === entry.classroom)?.name || 'Unknown'

        // Check if proxy already exists for this period
        const existingProxy = proxies.find(
          (p) =>
            p.original_teacher === absence.teacher &&
            p.classroom === entry.classroom &&
            p.period === entry.period &&
            p.date === selectedAbsenceDate
        )

        periodsList.push({
          classId: entry.classroom,
          className,
          period: entry.period,
          subject: entry.subject,
          absentTeacherId: absence.teacher,
          absentTeacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown',
          hasProxy: !!existingProxy,
          proxyTeacherId: existingProxy?.proxy_teacher,
          proxyTeacherName: existingProxy
            ? teachers.find((t) => t.id === existingProxy.proxy_teacher)
              ? `${teachers.find((t) => t.id === existingProxy.proxy_teacher)!.first_name} ${
                  teachers.find((t) => t.id === existingProxy.proxy_teacher)!.last_name
                }`
              : 'Unknown'
            : undefined,
        })
      })
    })

    return periodsList
  }, [absencesForDate, timetable, teachers, classes, dayOfWeek, selectedAbsenceDate, proxies])

  // Get available teachers for a specific period
  const getAvailableTeachersForPeriod = (period: {
    classId: string
    period: number
    absentTeacherId: string
  }) => {
    const absentTeacherIds = absencesForDate.map((a) => a.teacher)

    return teachers
      .filter((teacher) => !absentTeacherIds.includes(teacher.id))
      .map((teacher) => {
        // Check if teacher has a class at this period
        const hasClassThisPeriod = timetable.some(
          (t) => t.teacher === teacher.id && t.day === dayOfWeek && t.period === period.period
        )

        // Count today's proxies
        const todayProxyCount = proxies.filter(
          (p) => p.proxy_teacher === teacher.id && p.date === selectedAbsenceDate && p.status !== 'cancelled'
        ).length

        // Check if already has proxy for this specific period
        const hasProxyThisPeriod = proxies.some(
          (p) =>
            p.proxy_teacher === teacher.id &&
            p.day === dayOfWeek &&
            p.period === period.period &&
            p.date === selectedAbsenceDate &&
            p.status !== 'cancelled'
        )

        let unavailableReason: string | null = null
        if (hasClassThisPeriod) {
          unavailableReason = 'Has scheduled class'
        } else if (hasProxyThisPeriod) {
          unavailableReason = 'Already has proxy this period'
        }

        return {
          id: teacher.id,
          name: `${teacher.first_name} ${teacher.last_name}`,
          todayProxyCount,
          unavailableReason,
          isAvailable: !unavailableReason,
        }
      })
      .sort((a, b) => {
        // Available first, then by proxy count
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1
        }
        return a.todayProxyCount - b.todayProxyCount
      })
  }

  const handleAssignProxy = async () => {
    if (!assigningPeriod || !selectedProxyTeacher) return

    const period = affectedPeriods.find(
      (p) => p.classId === assigningPeriod.classId && p.period === assigningPeriod.period
    )
    if (!period) return

    try {
      const response = await fetch('/api/timetable/proxies/assign/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          absence_id: absencesForDate.find((a) => a.teacher === period.absentTeacherId)?.id,
          period: period.period,
          classroom_id: parseInt(period.classId),
          proxy_teacher_id: parseInt(selectedProxyTeacher),
          subject: period.subject,
        }),
      })

      if (response.ok) {
        setAssigningPeriod(null)
        setSelectedProxyTeacher('')
        // Refresh data
        window.location.reload()
      }
    } catch (error) {
      console.error('Error assigning proxy:', error)
    }
  }

  const getClassName = (classId: string | number) => {
    return classes.find((c) => c.id === classId)?.name || 'Unknown'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'assigned':
        return <AlertCircle className="h-4 w-4" />
      case 'cancelled':
        return <X className="h-4 w-4" />
      default:
        return null
    }
  }

  const stats = useMemo(() => {
    return {
      total: proxies.length,
      assigned: proxies.filter((p) => p.status === 'assigned').length,
      completed: proxies.filter((p) => p.status === 'completed').length,
      cancelled: proxies.filter((p) => p.status === 'cancelled').length,
    }
  }, [proxies])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-blue-600" />
            Proxy Management
          </h1>
          <p className="text-gray-600 mt-1">Assign substitute teachers for each period</p>
        </div>
      </div>

      {/* Date Picker */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <input
          type="date"
          value={selectedAbsenceDate}
          onChange={(e) => setSelectedAbsenceDate(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Absent Teachers Summary */}
      {absencesForDate.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">Absent Teachers Today</h3>
          <div className="flex flex-wrap gap-2">
            {absencesForDate.map((absence) => (
              <span
                key={absence.id}
                className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {teachers.find((t) => t.id === absence.teacher)
                  ? `${teachers.find((t) => t.id === absence.teacher)!.first_name} ${
                      teachers.find((t) => t.id === absence.teacher)!.last_name
                    }`
                  : 'Unknown'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Affected Periods */}
      {affectedPeriods.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Classes Needing Substitutes</h2>
          {affectedPeriods.map((period, idx) => (
            <div
              key={`${period.classId}-${period.period}-${idx}`}
              className={`border-2 rounded-lg p-4 ${
                period.hasProxy ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    Period {period.period} - {period.className}
                  </p>
                  <p className="text-sm text-gray-600">Subject: {period.subject}</p>
                  <p className="text-sm text-gray-600">Original Teacher: {period.absentTeacherName}</p>
                </div>
                {period.hasProxy && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-700">✓ Assigned</p>
                    <p className="text-sm text-green-600">{period.proxyTeacherName}</p>
                  </div>
                )}
              </div>

              {!period.hasProxy && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Substitute Teacher
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {getAvailableTeachersForPeriod(period).map((teacher) => (
                        <button
                          key={teacher.id}
                          onClick={() => {
                            setAssigningPeriod(period)
                            setSelectedProxyTeacher(teacher.id.toString())
                          }}
                          className={`w-full text-left p-3 rounded-lg border-2 transition ${
                            teacher.isAvailable
                              ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer'
                              : 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{teacher.name}</p>
                              {teacher.todayProxyCount > 0 && (
                                <p className="text-xs text-gray-600">
                                  Today's Proxies: {teacher.todayProxyCount}
                                </p>
                              )}
                            </div>
                            {teacher.unavailableReason && (
                              <span className="text-xs text-red-600 font-medium">
                                {teacher.unavailableReason}
                              </span>
                            )}
                            {teacher.isAvailable && (
                              <span className="text-xs text-green-600 font-medium">
                                ✓ Available
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {assigningPeriod?.period === period.period &&
                    assigningPeriod?.classId === period.classId &&
                    selectedProxyTeacher && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleAssignProxy}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                        >
                          Confirm Assignment
                        </button>
                        <button
                          onClick={() => {
                            setAssigningPeriod(null)
                            setSelectedProxyTeacher('')
                          }}
                          className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No absences recorded for this date</p>
        </div>
      )}

      {/* Filter Tabs */}
      {proxies.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-2 bg-white rounded-lg shadow p-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'all' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Proxies
            </button>
            <button
              onClick={() => setFilterStatus('assigned')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'assigned' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Assigned
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === 'completed' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Proxies List Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Class</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Period</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Original Teacher</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Proxy Teacher</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {proxies
                    .filter(
                      (p) => filterStatus === 'all' || p.status === filterStatus
                    )
                    .map((proxy) => (
                      <tr key={proxy.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-900">
                          {new Date(proxy.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-gray-900">{getClassName(proxy.classroom)}</td>
                        <td className="px-6 py-3 text-gray-900">{proxy.period}</td>
                        <td className="px-6 py-3 text-gray-900">
                          {teachers.find((t) => t.id === proxy.original_teacher)
                            ? `${
                                teachers.find((t) => t.id === proxy.original_teacher)!
                                  .first_name
                              } ${teachers.find((t) => t.id === proxy.original_teacher)!.last_name}`
                            : 'Unknown'}
                        </td>
                        <td className="px-6 py-3 text-gray-900">
                          {teachers.find((t) => t.id === proxy.proxy_teacher)
                            ? `${
                                teachers.find((t) => t.id === proxy.proxy_teacher)!
                                  .first_name
                              } ${teachers.find((t) => t.id === proxy.proxy_teacher)!.last_name}`
                            : 'Unknown'}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              proxy.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : proxy.status === 'assigned'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {proxy.status.charAt(0).toUpperCase() + proxy.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
