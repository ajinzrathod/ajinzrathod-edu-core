import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { Teacher, Class, TimetableEntry, Absence, ProxyRecord } from '../types'

interface SchoolDataContextType {
  // Teachers
  teachers: Teacher[]
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<Teacher>
  updateTeacher: (teacherId: string, updates: Partial<Teacher>) => Promise<void>
  deleteTeacher: (teacherId: string) => Promise<void>
  getTeacherById: (teacherId: string) => Teacher | undefined

  // Classes
  classes: Class[]
  addClass: (cls: Omit<Class, 'id'>) => Promise<Class>
  updateClass: (classId: string, updates: Partial<Class>) => Promise<void>
  deleteClass: (classId: string) => Promise<void>
  getClassById: (classId: string) => Class | undefined

  // Timetable
  timetable: TimetableEntry[]
  addTimetableEntry: (entry: Omit<TimetableEntry, 'id'>) => Promise<TimetableEntry>
  updateTimetableEntry: (entryId: string, updates: Partial<TimetableEntry>) => Promise<void>
  deleteTimetableEntry: (entryId: string) => Promise<void>
  getTimetableByClass: (classId: string) => TimetableEntry[]
  getTimetableByClassAndDay: (classId: string, day: string) => TimetableEntry[]

  // Absences
  absences: Absence[]
  addAbsence: (absence: Omit<Absence, 'id' | 'created_at'>) => Promise<Absence>
  updateAbsence: (absenceId: string, updates: Partial<Absence>) => Promise<void>
  deleteAbsence: (absenceId: string) => Promise<void>
  getAbsencesByTeacher: (teacherId: string) => Absence[]
  getAbsencesByDate: (date: string) => Absence[]
  isTeacherAbsentOnDate: (teacherId: string, date: string) => boolean

  // Proxies
  proxies: ProxyRecord[]
  addProxy: (proxy: Omit<ProxyRecord, 'id' | 'created_at'>) => Promise<ProxyRecord>
  updateProxy: (proxyId: string, updates: Partial<ProxyRecord>) => Promise<void>
  deleteProxy: (proxyId: string) => Promise<void>
  getProxiesByTeacher: (teacherId: string) => ProxyRecord[]
  getProxiesByDate: (date: string) => ProxyRecord[]
  getTeacherProxyCount: (teacherId: string) => number

  // Utils
  isLoading: boolean
  refreshData: () => Promise<void>
}

export const SchoolDataContext = createContext<SchoolDataContextType | undefined>(undefined)

// Get API base URL
const API_BASE_URL = '/api'

// Get auth token from localStorage
const getAuthToken = () => {
  // Check both possible storage keys
  let token = localStorage.getItem('token')  // Main frontend uses 'token'
  if (!token) {
    token = localStorage.getItem('access_token')  // Alternative key
  }
  if (!token) {
    const auth = localStorage.getItem('auth')
    if (auth) {
      try {
        const parsed = JSON.parse(auth)
        token = parsed.access_token || parsed.access
      } catch {
        token = null
      }
    }
  }

  if (token) {
    console.log('[Auth] Token found:', token.substring(0, 20) + '...')
  } else {
    console.warn('[Auth] No token found in localStorage')
  }

  return token
}

const apiCall = async (method: string, endpoint: string, data?: any) => {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('[API] Authorization header set')
  } else {
    console.warn('[API] No authorization token available!')
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  const url = `${API_BASE_URL}${endpoint}`
  console.log(`[API Call] ${method} ${url}`, { headers, token: token ? 'present' : 'missing' })

  const response = await fetch(url, options)

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[API Error] ${method} ${url} - ${response.status}: ${errorText}`)
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data_response = await response.json()
  console.log(`[API Success] ${method} ${url}`, data_response)
  return data_response
}

export const SchoolDataProvider: React.FC<{
  children: ReactNode
  schoolId: string
}> = ({ children, schoolId }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [proxies, setProxies] = useState<ProxyRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load all data from API on mount
  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [teachersData, classesData, timetableData, absencesData, proxiesData] = await Promise.all([
        apiCall('GET', '/teachers/'),
        apiCall('GET', '/classrooms/'),
        apiCall('GET', '/timetable/'),
        apiCall('GET', '/absences/'),
        apiCall('GET', '/proxies/'),
      ])

      setTeachers(Array.isArray(teachersData) ? teachersData : [])
      setClasses(Array.isArray(classesData) ? classesData : [])
      setTimetable(Array.isArray(timetableData) ? timetableData : [])
      setAbsences(Array.isArray(absencesData) ? absencesData : [])
      setProxies(Array.isArray(proxiesData) ? proxiesData : [])
    } catch (error) {
      console.error('Error fetching data from API:', error)
      // Fallback to empty arrays on error
      setTeachers([])
      setClasses([])
      setTimetable([])
      setAbsences([])
      setProxies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data on component mount
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Teachers
  const addTeacher = useCallback(
    (teacher: Omit<Teacher, 'id'>) => {
      const newTeacher: Teacher = { ...teacher, id: generateId() }
      schoolStorage.addTeacher(schoolId, newTeacher)
      setTeachers((prev) => [...prev, newTeacher])
      return newTeacher
    },
    [schoolId]
  )

  const updateTeacher = useCallback(
    (teacherId: string, updates: Partial<Teacher>) => {
      schoolStorage.updateTeacher(schoolId, teacherId, updates)
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherId ? { ...t, ...updates } : t))
      )
    },
    [schoolId]
  )

  const deleteTeacher = useCallback(
    (teacherId: string) => {
      schoolStorage.deleteTeacher(schoolId, teacherId)
      setTeachers((prev) => prev.filter((t) => t.id !== teacherId))
    },
    [schoolId]
  )

  const getTeacherById = useCallback(
    (teacherId: string) => {
      return teachers.find((t) => t.id === teacherId)
    },
    [teachers]
  )

  // Classes
  const addClass = useCallback(
    (cls: Omit<Class, 'id'>) => {
      const newClass: Class = { ...cls, id: generateId() }
      schoolStorage.addClass(schoolId, newClass)
      setClasses((prev) => [...prev, newClass])
      return newClass
    },
    [schoolId]
  )

  const updateClass = useCallback(
    (classId: string, updates: Partial<Class>) => {
      schoolStorage.updateClass(schoolId, classId, updates)
      setClasses((prev) =>
        prev.map((c) => (c.id === classId ? { ...c, ...updates } : c))
      )
    },
    [schoolId]
  )

  const deleteClass = useCallback(
    (classId: string) => {
      schoolStorage.deleteClass(schoolId, classId)
      setClasses((prev) => prev.filter((c) => c.id !== classId))
    },
    [schoolId]
  )

  const getClassById = useCallback(
    (classId: string) => {
      return classes.find((c) => c.id === classId)
    },
    [classes]
  )

  // Timetable
  const addTimetableEntry = useCallback(
    (entry: Omit<TimetableEntry, 'id'>) => {
      const newEntry: TimetableEntry = { ...entry, id: generateId(), created_at: new Date().toISOString() }
      schoolStorage.addTimetableEntry(schoolId, newEntry)
      setTimetable((prev) => [...prev, newEntry])
      return newEntry
    },
    [schoolId]
  )

  const updateTimetableEntry = useCallback(
    (entryId: string, updates: Partial<TimetableEntry>) => {
      schoolStorage.updateTimetableEntry(schoolId, entryId, {
        ...updates,
        updated_at: new Date().toISOString(),
      })
      setTimetable((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, ...updates, updated_at: new Date().toISOString() }
            : e
        )
      )
    },
    [schoolId]
  )

  const deleteTimetableEntry = useCallback(
    (entryId: string) => {
      schoolStorage.deleteTimetableEntry(schoolId, entryId)
      setTimetable((prev) => prev.filter((e) => e.id !== entryId))
    },
    [schoolId]
  )

  const getTimetableByClass = useCallback(
    (classId: string) => {
      return timetable.filter((e) => String(e.classroom) === String(classId))
    },
    [timetable]
  )

  const getTimetableByClassAndDay = useCallback(
    (classId: string, day: string) => {
      return timetable.filter((e) => String(e.classroom) === String(classId) && e.day === day)
    },
    [timetable]
  )

  // Absences
  const addAbsence = useCallback(
    (absence: Omit<Absence, 'id' | 'created_at'>) => {
      const newAbsence: Absence = {
        ...absence,
        id: generateId(),
        created_at: new Date().toISOString(),
      }
      schoolStorage.addAbsence(schoolId, newAbsence)
      setAbsences((prev) => [...prev, newAbsence])
      return newAbsence
    },
    [schoolId]
  )

  const updateAbsence = useCallback(
    (absenceId: string, updates: Partial<Absence>) => {
      schoolStorage.updateAbsence(schoolId, absenceId, updates)
      setAbsences((prev) =>
        prev.map((a) => (a.id === absenceId ? { ...a, ...updates } : a))
      )
    },
    [schoolId]
  )

  const deleteAbsence = useCallback(
    (absenceId: string) => {
      schoolStorage.deleteAbsence(schoolId, absenceId)
      setAbsences((prev) => prev.filter((a) => a.id !== absenceId))
    },
    [schoolId]
  )

  const getAbsencesByTeacher = useCallback(
    (teacherId: string) => {
      return absences.filter((a) => String(a.teacher) === String(teacherId))
    },
    [absences]
  )

  const getAbsencesByDate = useCallback(
    (date: string) => {
      return absences.filter((a) => a.date === date)
    },
    [absences]
  )

  const isTeacherAbsentOnDate = useCallback(
    (teacherId: string, date: string) => {
      return absences.some((a) => String(a.teacher) === String(teacherId) && a.date === date)
    },
    [absences]
  )

  const bulkMarkAbsent = useCallback(
    async (teacherIds: string[], date: string, reason: string) => {
      try {
        const response = await apiCall('POST', '/absences/bulk/mark-absent/', {
          teacher_ids: teacherIds.map(id => parseInt(id)),
          date,
          reason
        })

        // Update local state
        const newAbsences = response.absences || []
        setAbsences((prev) => {
          const updated = [...prev]
          // Remove existing absences for these teachers on this date
          for (const teacherId of teacherIds) {
            updated.forEach((a, idx) => {
              if (String(a.teacher) === String(teacherId) && a.date === date) {
                updated.splice(idx, 1)
              }
            })
          }
          // Add new absences
          return [...updated, ...newAbsences]
        })
      } catch (error) {
        console.error('Error bulk marking absent:', error)
        throw error
      }
    },
    []
  )

  const bulkMarkPresent = useCallback(
    async (teacherIds: string[], date: string) => {
      try {
        await apiCall('POST', '/absences/bulk/mark-present/', {
          teacher_ids: teacherIds.map(id => parseInt(id)),
          date
        })

        // Update local state - remove absences for these teachers on this date
        setAbsences((prev) =>
          prev.filter((a) => {
            const isTeacherInList = teacherIds.includes(String(a.teacher))
            const isDateMatch = a.date === date
            return !(isTeacherInList && isDateMatch)
          })
        )
      } catch (error) {
        console.error('Error bulk marking present:', error)
        throw error
      }
    },
    []
  )

  // ...existing code...

  const getProxiesByTeacher = useCallback(
    (teacherId: string) => {
      return proxies.filter((p) => String(p.proxy_teacher) === String(teacherId))
    },
    [proxies]
  )

  const getProxiesByDate = useCallback(
    (date: string) => {
      return proxies.filter((p) => p.date === date)
    },
    [proxies]
  )

  const getTeacherProxyCount = useCallback(
    (teacherId: string) => {
      return proxies.filter((p) => String(p.proxy_teacher) === String(teacherId) && p.status === 'completed').length
    },
    [proxies]
  )

  // Proxy functions
  const addProxy = useCallback(
    (proxy: Omit<ProxyRecord, 'id' | 'created_at'>) => {
      const newProxy: ProxyRecord = {
        ...proxy,
        id: generateId(),
        created_at: new Date().toISOString(),
      }
      setProxies((prev) => [...prev, newProxy])
      return newProxy
    },
    []
  )

  const updateProxy = useCallback(
    (proxyId: string, updates: Partial<ProxyRecord>) => {
      setProxies((prev) =>
        prev.map((p) => (p.id === proxyId ? { ...p, ...updates } : p))
      )
    },
    []
  )

  const deleteProxy = useCallback(
    (proxyId: string) => {
      setProxies((prev) => prev.filter((p) => p.id !== proxyId))
    },
    []
  )

  const value: SchoolDataContextType = {
    teachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    getTeacherById,

    classes,
    addClass,
    updateClass,
    deleteClass,
    getClassById,

    timetable,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    getTimetableByClass,
    getTimetableByClassAndDay,

    absences,
    addAbsence,
    updateAbsence,
    deleteAbsence,
    getAbsencesByTeacher,
    getAbsencesByDate,
    isTeacherAbsentOnDate,
    bulkMarkAbsent,
    bulkMarkPresent,

    proxies,
    addProxy,
    updateProxy,
    deleteProxy,
    getProxiesByTeacher,
    getProxiesByDate,
    getTeacherProxyCount,

    isLoading,
    refreshData,
  }

  return (
    <SchoolDataContext.Provider value={value}>
      {children}
    </SchoolDataContext.Provider>
  )
}

export const useSchoolData = () => {
  const context = React.useContext(SchoolDataContext)
  if (!context) {
    throw new Error('useSchoolData must be used within SchoolDataProvider')
  }
  return context
}
