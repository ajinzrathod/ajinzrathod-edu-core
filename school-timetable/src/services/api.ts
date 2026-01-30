import axios, { AxiosInstance } from 'axios'

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Handle response errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Auth endpoints
  login(username: string, password: string) {
    return this.client.post('/api/login/', { username, password })
  }

  refreshAccessToken(refreshToken: string) {
    return this.client.post('/api/refresh/', { refresh_token: refreshToken })
  }

  // User endpoints
  getUserDetail() {
    return this.client.get('/api/user/')
  }

  // Academic Year endpoints
  getAcademicYears() {
    return this.client.get('/api/years/')
  }

  // Classroom endpoints
  getClassrooms() {
    return this.client.get('/api/classrooms/')
  }

  getClassroom(id: string) {
    return this.client.get(`/api/classrooms/${id}/`)
  }

  // Students endpoints
  getStudents() {
    return this.client.get('/api/students/')
  }

  getStudentsByClassroom(classroomId: string) {
    return this.client.get(`/api/classrooms/${classroomId}/students/`)
  }

  getStudent(id: string) {
    return this.client.get(`/api/students/${id}/`)
  }

  createStudent(data: any) {
    return this.client.post('/api/students/create/', data)
  }

  // Attendance endpoints
  getAttendance() {
    return this.client.get('/api/attendance/')
  }

  getAttendanceByClassroom(classroomId: string) {
    return this.client.get(`/api/classrooms/${classroomId}/attendance/`)
  }

  getStudentAttendance(studentId: string) {
    return this.client.get(`/api/attendance/student/${studentId}/`)
  }

  getAttendanceDetail(id: string) {
    return this.client.get(`/api/attendance/${id}/`)
  }

  createAttendance(data: any) {
    return this.client.post('/api/attendance/create/', data)
  }

  getAttendanceStatistics() {
    return this.client.get('/api/attendance/statistics/')
  }

  getSchoolWideStatistics() {
    return this.client.get('/api/attendance/school-statistics/')
  }

  // Holiday endpoints
  getHolidays() {
    return this.client.get('/api/holidays/')
  }

  getHolidayDetail(id: string) {
    return this.client.get(`/api/holidays/${id}/`)
  }

  createHoliday(data: any) {
    return this.client.post('/api/holidays/', data)
  }

  // School Weekend endpoints
  getSchoolWeekends() {
    return this.client.get('/api/school/weekends/')
  }

  // Audit logs
  getAuditLogs() {
    return this.client.get('/api/audit-logs/')
  }

  // App config
  getAppConfig() {
    return this.client.get('/api/config/')
  }

  // Device management
  getPendingDevices() {
    return this.client.get('/api/devices/pending/')
  }

  approveDevice(deviceId: string) {
    return this.client.post(`/api/devices/${deviceId}/approve/`)
  }

  rejectDevice(deviceId: string) {
    return this.client.post(`/api/devices/${deviceId}/reject/`)
  }

  getUserDevices(userId: string) {
    return this.client.get(`/api/users/${userId}/devices/`)
  }
}

export default new ApiClient()
