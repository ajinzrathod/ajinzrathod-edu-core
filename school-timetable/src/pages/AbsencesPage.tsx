import React, { useState, useMemo } from 'react'
import { useSchoolData } from '../context/SchoolDataContext'
import {
  AlertCircle,
  Plus,
  X,
  Check,
  Calendar,
} from 'lucide-react'

export const AbsencesPage: React.FC = () => {
  const { teachers, absences, addAbsence, updateAbsence, deleteAbsence } = useSchoolData()

  const [isAddingAbsence, setIsAddingAbsence] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'absent' | 'present'>('all')
  const [formData, setFormData] = useState({
    teacher: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
  })

  const handleAddAbsence = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.teacher || !formData.reason.trim()) {
      alert('Please fill in all fields')
      return
    }

    // Check if teacher already has absence on this date
    const existing = absences.find(
      (a) => a.teacher === formData.teacher && a.date === formData.date
    )
    if (existing) {
      alert('Teacher already has an absence record for this date')
      return
    }

    addAbsence({
      teacher: formData.teacher,
      date: formData.date,
      reason: formData.reason,
      status: 'absent',
    })

    setFormData({
      teacher: '',
      date: new Date().toISOString().split('T')[0],
      reason: '',
    })
    setIsAddingAbsence(false)
  }

  const handleMarkPresent = (absenceId: string) => {
    updateAbsence(absenceId, { status: 'present' })
  }

  const handleDeleteAbsence = (absenceId: string) => {
    if (confirm('Are you sure you want to delete this absence record?')) {
      deleteAbsence(absenceId)
    }
  }

  // Filter and sort absences
  const filteredAbsences = useMemo(() => {
    let result = [...absences]

    if (filterStatus !== 'all') {
      result = result.filter((a) => a.status === filterStatus)
    }

    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [absences, filterStatus])

  const getTeacherName = (teacherId: string | number) => {
    const teacher = teachers.find((t) => t.id === teacherId)
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown'
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      total: absences.length,
      absent: absences.filter((a) => a.status === 'absent').length,
      present: absences.filter((a) => a.status === 'present').length,
      today: absences.filter((a) => a.date === today && a.status === 'absent').length,
    }
  }, [absences])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-8 w-8 text-red-600" />
            Absences
          </h1>
          <p className="text-gray-600 mt-1">Manage and track teacher absences</p>
        </div>
        <button
          onClick={() => setIsAddingAbsence(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Mark Absent
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm font-medium">Total Absences</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm font-medium">Marked Absent</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.absent}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm font-medium">Marked Present</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.present}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm font-medium">Absent Today</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.today}</p>
        </div>
      </div>

      {/* Add Absence Form */}
      {isAddingAbsence && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Mark Teacher Absent</h2>
            <button
              onClick={() => setIsAddingAbsence(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleAddAbsence} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher
              </label>
              <select
                value={formData.teacher}
                onChange={(e) =>
                  setFormData({ ...formData, teacher: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Teacher --</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="e.g., Sick leave, Personal"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="md:col-span-3 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Mark Absent
            </button>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-white rounded-lg shadow p-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          All ({absences.length})
        </button>
        <button
          onClick={() => setFilterStatus('absent')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStatus === 'absent'
              ? 'bg-red-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Absent ({stats.absent})
        </button>
        <button
          onClick={() => setFilterStatus('present')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filterStatus === 'present'
              ? 'bg-green-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Present ({stats.present})
        </button>
      </div>

      {/* Absences List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredAbsences.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No absences recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAbsences.map((absence) => (
                  <tr key={absence.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {getTeacherName(absence.teacher_id)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(absence.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {absence.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          absence.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {absence.status === 'absent' && (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {absence.status === 'present' && (
                          <Check className="h-3 w-3" />
                        )}
                        {absence.status.charAt(0).toUpperCase() +
                          absence.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      {absence.status === 'absent' && (
                        <button
                          onClick={() => handleMarkPresent(absence.id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Mark Present
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAbsence(absence.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
