/**
 * School-scoped storage utility
 * All data is stored with school_id prefix to ensure multi-tenancy
 */

import { Teacher, Class, TimetableEntry, Absence, ProxyRecord } from '../types'

const STORAGE_VERSION = 'v1'

// Storage keys for each entity type
const KEYS = {
  teachers: (schoolId: string) => `school_${schoolId}_teachers`,
  classes: (schoolId: string) => `school_${schoolId}_classes`,
  timetable: (schoolId: string) => `school_${schoolId}_timetable`,
  absences: (schoolId: string) => `school_${schoolId}_absences`,
  proxies: (schoolId: string) => `school_${schoolId}_proxies`,
  config: (schoolId: string) => `school_${schoolId}_config`,
}

class SchoolStorage {
  /**
   * Teachers Management
   */

  getTeachers(schoolId: string): Teacher[] {
    const data = localStorage.getItem(KEYS.teachers(schoolId))
    return data ? JSON.parse(data) : []
  }

  setTeachers(schoolId: string, teachers: Teacher[]): void {
    localStorage.setItem(KEYS.teachers(schoolId), JSON.stringify(teachers))
  }

  addTeacher(schoolId: string, teacher: Teacher): void {
    const teachers = this.getTeachers(schoolId)
    teachers.push(teacher)
    this.setTeachers(schoolId, teachers)
  }

  updateTeacher(schoolId: string, teacherId: string, updates: Partial<Teacher>): void {
    const teachers = this.getTeachers(schoolId)
    const index = teachers.findIndex((t) => t.id === teacherId)
    if (index !== -1) {
      teachers[index] = { ...teachers[index], ...updates }
      this.setTeachers(schoolId, teachers)
    }
  }

  deleteTeacher(schoolId: string, teacherId: string): void {
    const teachers = this.getTeachers(schoolId).filter((t) => t.id !== teacherId)
    this.setTeachers(schoolId, teachers)
  }

  getTeacherById(schoolId: string, teacherId: string): Teacher | undefined {
    return this.getTeachers(schoolId).find((t) => t.id === teacherId)
  }

  /**
   * Classes Management
   */

  getClasses(schoolId: string): Class[] {
    const data = localStorage.getItem(KEYS.classes(schoolId))
    return data ? JSON.parse(data) : []
  }

  setClasses(schoolId: string, classes: Class[]): void {
    localStorage.setItem(KEYS.classes(schoolId), JSON.stringify(classes))
  }

  addClass(schoolId: string, cls: Class): void {
    const classes = this.getClasses(schoolId)
    classes.push(cls)
    this.setClasses(schoolId, classes)
  }

  updateClass(schoolId: string, classId: string, updates: Partial<Class>): void {
    const classes = this.getClasses(schoolId)
    const index = classes.findIndex((c) => c.id === classId)
    if (index !== -1) {
      classes[index] = { ...classes[index], ...updates }
      this.setClasses(schoolId, classes)
    }
  }

  deleteClass(schoolId: string, classId: string): void {
    const classes = this.getClasses(schoolId).filter((c) => c.id !== classId)
    this.setClasses(schoolId, classes)
  }

  getClassById(schoolId: string, classId: string): Class | undefined {
    return this.getClasses(schoolId).find((c) => c.id === classId)
  }

  /**
   * Timetable Management
   */

  getTimetable(schoolId: string): TimetableEntry[] {
    const data = localStorage.getItem(KEYS.timetable(schoolId))
    return data ? JSON.parse(data) : []
  }

  setTimetable(schoolId: string, timetable: TimetableEntry[]): void {
    localStorage.setItem(KEYS.timetable(schoolId), JSON.stringify(timetable))
  }

  addTimetableEntry(schoolId: string, entry: TimetableEntry): void {
    const timetable = this.getTimetable(schoolId)
    timetable.push(entry)
    this.setTimetable(schoolId, timetable)
  }

  updateTimetableEntry(schoolId: string, entryId: string, updates: Partial<TimetableEntry>): void {
    const timetable = this.getTimetable(schoolId)
    const index = timetable.findIndex((e) => e.id === entryId)
    if (index !== -1) {
      timetable[index] = { ...timetable[index], ...updates }
      this.setTimetable(schoolId, timetable)
    }
  }

  deleteTimetableEntry(schoolId: string, entryId: string): void {
    const timetable = this.getTimetable(schoolId).filter((e) => e.id !== entryId)
    this.setTimetable(schoolId, timetable)
  }

  getTimetableByClass(schoolId: string, classId: string): TimetableEntry[] {
    return this.getTimetable(schoolId).filter((e) => e.class_id === classId)
  }

  getTimetableByClassAndDay(
    schoolId: string,
    classId: string,
    day: string
  ): TimetableEntry[] {
    return this.getTimetable(schoolId).filter(
      (e) => e.class_id === classId && e.day === day
    )
  }

  /**
   * Absences Management
   */

  getAbsences(schoolId: string): Absence[] {
    const data = localStorage.getItem(KEYS.absences(schoolId))
    return data ? JSON.parse(data) : []
  }

  setAbsences(schoolId: string, absences: Absence[]): void {
    localStorage.setItem(KEYS.absences(schoolId), JSON.stringify(absences))
  }

  addAbsence(schoolId: string, absence: Absence): void {
    const absences = this.getAbsences(schoolId)
    absences.push(absence)
    this.setAbsences(schoolId, absences)
  }

  updateAbsence(schoolId: string, absenceId: string, updates: Partial<Absence>): void {
    const absences = this.getAbsences(schoolId)
    const index = absences.findIndex((a) => a.id === absenceId)
    if (index !== -1) {
      absences[index] = { ...absences[index], ...updates }
      this.setAbsences(schoolId, absences)
    }
  }

  deleteAbsence(schoolId: string, absenceId: string): void {
    const absences = this.getAbsences(schoolId).filter((a) => a.id !== absenceId)
    this.setAbsences(schoolId, absences)
  }

  getAbsencesByTeacher(schoolId: string, teacherId: string): Absence[] {
    return this.getAbsences(schoolId).filter((a) => a.teacher_id === teacherId)
  }

  getAbsencesByDate(schoolId: string, date: string): Absence[] {
    return this.getAbsences(schoolId).filter((a) => a.date === date)
  }

  getAbsenceByTeacherAndDate(
    schoolId: string,
    teacherId: string,
    date: string
  ): Absence | undefined {
    return this.getAbsences(schoolId).find(
      (a) => a.teacher_id === teacherId && a.date === date
    )
  }

  /**
   * Proxies Management
   */

  getProxies(schoolId: string): ProxyRecord[] {
    const data = localStorage.getItem(KEYS.proxies(schoolId))
    return data ? JSON.parse(data) : []
  }

  setProxies(schoolId: string, proxies: ProxyRecord[]): void {
    localStorage.setItem(KEYS.proxies(schoolId), JSON.stringify(proxies))
  }

  addProxy(schoolId: string, proxy: ProxyRecord): void {
    const proxies = this.getProxies(schoolId)
    proxies.push(proxy)
    this.setProxies(schoolId, proxies)
  }

  updateProxy(schoolId: string, proxyId: string, updates: Partial<ProxyRecord>): void {
    const proxies = this.getProxies(schoolId)
    const index = proxies.findIndex((p) => p.id === proxyId)
    if (index !== -1) {
      proxies[index] = { ...proxies[index], ...updates }
      this.setProxies(schoolId, proxies)
    }
  }

  deleteProxy(schoolId: string, proxyId: string): void {
    const proxies = this.getProxies(schoolId).filter((p) => p.id !== proxyId)
    this.setProxies(schoolId, proxies)
  }

  getProxiesByTeacher(schoolId: string, teacherId: string): ProxyRecord[] {
    return this.getProxies(schoolId).filter((p) => p.proxy_teacher_id === teacherId)
  }

  getProxiesByDate(schoolId: string, date: string): ProxyRecord[] {
    return this.getProxies(schoolId).filter((p) => p.date === date)
  }

  getProxiesByClass(schoolId: string, classId: string): ProxyRecord[] {
    return this.getProxies(schoolId).filter((p) => p.class_id === classId)
  }

  /**
   * Utility Methods
   */

  clearAllData(schoolId: string): void {
    localStorage.removeItem(KEYS.teachers(schoolId))
    localStorage.removeItem(KEYS.classes(schoolId))
    localStorage.removeItem(KEYS.timetable(schoolId))
    localStorage.removeItem(KEYS.absences(schoolId))
    localStorage.removeItem(KEYS.proxies(schoolId))
    localStorage.removeItem(KEYS.config(schoolId))
  }

  getStorageInfo(schoolId: string) {
    return {
      teachers: this.getTeachers(schoolId).length,
      classes: this.getClasses(schoolId).length,
      timetableEntries: this.getTimetable(schoolId).length,
      absences: this.getAbsences(schoolId).length,
      proxies: this.getProxies(schoolId).length,
    }
  }

  exportData(schoolId: string) {
    return {
      teachers: this.getTeachers(schoolId),
      classes: this.getClasses(schoolId),
      timetable: this.getTimetable(schoolId),
      absences: this.getAbsences(schoolId),
      proxies: this.getProxies(schoolId),
    }
  }

  importData(schoolId: string, data: any): void {
    if (data.teachers) this.setTeachers(schoolId, data.teachers)
    if (data.classes) this.setClasses(schoolId, data.classes)
    if (data.timetable) this.setTimetable(schoolId, data.timetable)
    if (data.absences) this.setAbsences(schoolId, data.absences)
    if (data.proxies) this.setProxies(schoolId, data.proxies)
  }
}

// Export singleton instance
export const schoolStorage = new SchoolStorage()

// Helper to generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
