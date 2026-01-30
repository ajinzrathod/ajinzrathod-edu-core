import React, { useMemo, useState } from 'react'
import { useSchoolData } from '../context/SchoolDataContext'
import {
  Users,
  AlertCircle,
  Plus,
  X,
  Mail,
  Briefcase,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react'

export const TeachersPage: React.FC = () => {
  const { teachers, addTeacher, deleteTeacher, getProxiesByTeacher, getAbsencesByTeacher, proxies, bulkMarkAbsent, bulkMarkPresent } =
    useSchoolData()

  const [isAddingTeacher, setIsAddingTeacher] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set())
  const [bulkReason, setBulkReason] = useState('')
  const [isMarkingAbsent, setIsMarkingAbsent] = useState(false)

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
  })

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      alert('Please fill in all fields')
      return
    }

    addTeacher({
      username: formData.username || formData.first_name.toLowerCase(),
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      user_type: 'teacher',
      school: {
        id: 1,
        name: 'School',
      },
    })

    setFormData({
      username: '',
      first_name: '',
      last_name: '',
      email: '',
    })
    setIsAddingTeacher(false)
  }

  const handleDeleteTeacher = (teacherId: string) => {
    if (confirm('Are you sure you want to delete this teacher?')) {
      deleteTeacher(teacherId)
    }
  }

  const toggleTeacherSelection = (teacherId: string) => {
    const newSelected = new Set(selectedTeachers)
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId)
    } else {
      newSelected.add(teacherId)
    }
    setSelectedTeachers(newSelected)
  }

  const toggleAllTeachers = () => {
    if (selectedTeachers.size === teachers.length) {
      setSelectedTeachers(new Set())
    } else {
      setSelectedTeachers(new Set(teachers.map(t => t.id)))
    }
  }

  const handleBulkMarkAbsent = async () => {
    if (selectedTeachers.size === 0) {
      alert('Please select at least one teacher')
      return
    }

    if (!selectedDate) {
      alert('Please select a date')
      return
    }

    setIsMarkingAbsent(true)
    try {
      await bulkMarkAbsent(Array.from(selectedTeachers), selectedDate, bulkReason)
      alert(`${selectedTeachers.size} teacher(s) marked as absent`)
      setSelectedTeachers(new Set())
      setBulkReason('')
    } catch (error) {
      alert('Error marking teachers as absent')
      console.error(error)
    } finally {
      setIsMarkingAbsent(false)
    }
  }

  const handleBulkMarkPresent = async () => {
    if (selectedTeachers.size === 0) {
      alert('Please select at least one teacher')
      return
    }

    if (!selectedDate) {
      alert('Please select a date')
      return
    }

    setIsMarkingAbsent(true)
    try {
      await bulkMarkPresent(Array.from(selectedTeachers), selectedDate)
      alert(`${selectedTeachers.size} teacher(s) marked as present`)
      setSelectedTeachers(new Set())
    } catch (error) {
      alert('Error marking teachers as present')
      console.error(error)
    } finally {
      setIsMarkingAbsent(false)
    }
  }

  // Calculate stats for each teacher
  const teacherStats = useMemo(() => {
    return teachers.map((teacher) => ({
      ...teacher,
      proxiesTaken: proxies.filter(
        (p) => p.proxy_teacher_id === teacher.id && p.status === 'completed'
      ).length,
      absences: getAbsencesByTeacher(teacher.id),
      currentAbsences: getAbsencesByTeacher(teacher.id).filter(
        (a) => a.date >= new Date().toISOString().split('T')[0]
      ).length,
      isAbsentOnSelectedDate: getAbsencesByTeacher(teacher.id).some(a => a.date === selectedDate),
    }))
  }, [teachers, proxies, getAbsencesByTeacher, selectedDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Teachers
          </h1>
          <p className="text-gray-600 mt-1">
            Manage teachers and mark attendance in bulk
          </p>
        </div>
        <button
          onClick={() => setIsAddingTeacher(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          Add Teacher
        </button>
      </div>

      {/* Add Teacher Form */}
      {isAddingTeacher && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Add New Teacher</h2>
            <button
              onClick={() => setIsAddingTeacher(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                placeholder="e.g., Rajesh"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                placeholder="e.g., Kumar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="teacher@school.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username (Optional)
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="auto-generated if empty"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Add Teacher
            </button>
          </form>
        </div>
      )}

      {/* Bulk Attendance Management */}
      {teachers.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-600" />
            Bulk Attendance Management
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="e.g., School event, Workshop"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleBulkMarkAbsent}
                disabled={selectedTeachers.size === 0 || isMarkingAbsent}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
              >
                <XCircle className="h-4 w-4" />
                Mark Absent ({selectedTeachers.size})
              </button>
              <button
                onClick={handleBulkMarkPresent}
                disabled={selectedTeachers.size === 0 || isMarkingAbsent}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Present ({selectedTeachers.size})
              </button>
            </div>
          </div>

          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
            <input
              type="checkbox"
              checked={selectedTeachers.size === teachers.length && teachers.length > 0}
              onChange={toggleAllTeachers}
              className="w-4 h-4 cursor-pointer"
            />
            <label className="text-sm font-medium text-gray-900 cursor-pointer flex-1">
              Select All Teachers ({teachers.length})
            </label>
          </div>
        </div>
      )}

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teacherStats.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg mb-4">No teachers added yet</p>
            <button
              onClick={() => setIsAddingTeacher(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Add the first teacher
            </button>
          </div>
        ) : (
          teacherStats.map((teacher) => (
            <div
              key={teacher.id}
              className={`bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden border-l-4 ${
                teacher.isAbsentOnSelectedDate ? 'border-red-600' : 'border-blue-600'
              } ${selectedTeachers.has(teacher.id) ? 'ring-2 ring-purple-500' : ''}`}
            >
              <div className="p-6">
                {/* Checkbox and Header */}
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={selectedTeachers.has(teacher.id)}
                    onChange={() => toggleTeacherSelection(teacher.id)}
                    className="w-5 h-5 cursor-pointer mt-0.5"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {teacher.first_name} {teacher.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">Teacher</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      teacher.isAbsentOnSelectedDate
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {teacher.isAbsentOnSelectedDate ? 'Absent' : 'Present'}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${teacher.email}`} className="hover:text-blue-600">
                      {teacher.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>@{teacher.username}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Proxies Taken</p>
                    <p className="text-xl font-bold text-blue-600">{teacher.proxiesTaken}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Total Absences</p>
                    <p className="text-xl font-bold text-orange-600">{teacher.absences.length}</p>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteTeacher(teacher.id)}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-2 rounded-lg transition text-sm font-medium"
                >
                  Delete Teacher
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
