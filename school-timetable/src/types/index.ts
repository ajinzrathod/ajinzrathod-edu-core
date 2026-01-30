export interface User {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  user_type: 'admin' | 'schooladmin' | 'teacher' | 'student'
  school__id: string
  school__name: string
}

export interface School {
  id: string
  name: string
  address: string
  phone: string
}

export interface Teacher {
  id: string | number
  username: string
  first_name: string
  last_name: string
  email: string
  user_type: 'admin' | 'teacher' | 'student'
  school: {
    id: number
    name: string
  }
}

export interface Class {
  id: string
  name: string
  grade: string
  section: string
}

// Subject taught in a class (e.g., "English", "Maths", "Science", "SST")
export interface Subject {
  id: string
  name: string
  code?: string
}

// Timetable entry for a class on a specific day with teacher
export interface TimetableEntry {
  id: string | number
  classroom: string | number  // Changed from class_id to classroom (FK ID from backend)
  classroom_name?: string  // Added classroom name from serializer
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  period: number // Position in the day (1st, 2nd, 3rd period etc)
  subject: string // Subject name (e.g., "English")
  teacher: string | number // Current teacher assigned (FK ID from backend)
  teacher_name?: string  // Added teacher name from serializer
  created_at?: string
  updated_at?: string
}

// Absence record - when a teacher is absent on a specific date
export interface Absence {
  id: string | number
  teacher: string | number  // Changed from teacher_id to teacher (FK ID from backend)
  teacher_name?: string  // Added from serializer
  date: string // YYYY-MM-DD format
  reason: string
  status: 'absent' | 'present'  // Changed from approved/pending
  created_at: string
}

// Proxy record - when another teacher takes a class due to absence
export interface ProxyRecord {
  id: string | number
  absence: string | number  // Changed from absence_id
  classroom: string | number  // Changed from class_id
  classroom_name?: string
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  period: number
  original_teacher: string | number  // Changed from original_teacher_id
  original_teacher_name?: string
  proxy_teacher: string | number  // Changed from proxy_teacher_id
  proxy_teacher_name?: string
  subject: string
  date: string // YYYY-MM-DD format
  status: 'assigned' | 'completed' | 'cancelled'
  reason: string
  assigned_by?: string // Admin who made the assignment
  completed_at?: string
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
  status: 'approved' | 'pending_approval'
  device_id?: string
}

export interface AuthContextType {
  user: User | null
  school: School | null
  token: string | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}
