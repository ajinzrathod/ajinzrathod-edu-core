/**
 * Script to seed initial school data
 * This can be run from the browser console or imported as a utility
 */

import { Teacher, Class, TimetableEntry } from '../types'
import { schoolStorage, generateId } from './storage'

// Sample data for demonstration
export const SAMPLE_TEACHERS: Omit<Teacher, 'id'>[] = [
  {
    username: 'y_sir',
    first_name: 'Y',
    last_name: 'Sir',
    email: 'y.sir@school.com',
    user_type: 'teacher',
    school: {
      id: 1,
      name: 'Sample School',
    },
  },
  {
    username: 'x_mam',
    first_name: 'X',
    last_name: 'Mam',
    email: 'x.mam@school.com',
    user_type: 'teacher',
    school: {
      id: 1,
      name: 'Sample School',
    },
  },
  {
    username: 'dhruvi_mam',
    first_name: 'Dhruvi',
    last_name: 'Mam',
    email: 'dhruvi.mam@school.com',
    user_type: 'teacher',
    school: {
      id: 1,
      name: 'Sample School',
    },
  },
  {
    username: 'eng_teacher',
    first_name: 'English',
    last_name: 'Teacher',
    email: 'english@school.com',
    user_type: 'teacher',
    school: {
      id: 1,
      name: 'Sample School',
    },
  },
]

export const SAMPLE_CLASSES: Omit<Class, 'id'>[] = [
  {
    name: 'Class 10-A',
    grade: '10',
    section: 'A',
  },
  {
    name: 'Class 10-B',
    grade: '10',
    section: 'B',
  },
  {
    name: 'Class 9-A',
    grade: '9',
    section: 'A',
  },
]

export const SAMPLE_TIMETABLE: Omit<TimetableEntry, 'id'>[] = [
  // Class 10-A
  {
    class_id: '', // Will be filled with actual ID
    day: 'monday',
    period: 1,
    subject: 'English',
    teacher_id: '', // Will be filled
  },
  {
    class_id: '',
    day: 'monday',
    period: 2,
    subject: 'Maths',
    teacher_id: '', // Y Sir
  },
  {
    class_id: '',
    day: 'monday',
    period: 3,
    subject: 'Science',
    teacher_id: '', // X Mam
  },
  {
    class_id: '',
    day: 'monday',
    period: 4,
    subject: 'SST',
    teacher_id: '', // Dhruvi Mam
  },

  // Tuesday same as Monday (can be customized)
  {
    class_id: '',
    day: 'tuesday',
    period: 1,
    subject: 'English',
    teacher_id: '',
  },
  {
    class_id: '',
    day: 'tuesday',
    period: 2,
    subject: 'Maths',
    teacher_id: '',
  },
  {
    class_id: '',
    day: 'tuesday',
    period: 3,
    subject: 'Science',
    teacher_id: '',
  },
  {
    class_id: '',
    day: 'tuesday',
    period: 4,
    subject: 'SST',
    teacher_id: '',
  },
]

/**
 * Seeds sample data into localStorage for a school
 * Use this to quickly set up a demo school
 */
export const seedSampleData = (schoolId: string): void => {
  console.log(`🌱 Seeding sample data for school ${schoolId}...`)

  // Clear existing data
  schoolStorage.clearAllData(schoolId)

  // Add teachers
  const teachers = SAMPLE_TEACHERS.map((t) => ({
    ...t,
    id: generateId(),
  }))
  schoolStorage.setTeachers(schoolId, teachers)
  console.log(`✅ Added ${teachers.length} teachers`)

  // Add classes
  const classes = SAMPLE_CLASSES.map((c) => ({
    ...c,
    id: generateId(),
  }))
  schoolStorage.setClasses(schoolId, classes)
  console.log(`✅ Added ${classes.length} classes`)

  // Add timetable entries
  const timetableEntries: TimetableEntry[] = []
  classes.forEach((cls) => {
    const daysOfWeek: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'> = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ]

    daysOfWeek.forEach((day) => {
      // Period 1: English
      timetableEntries.push({
        id: generateId(),
        class_id: cls.id,
        day,
        period: 1,
        subject: 'English',
        teacher_id: teachers[3].id, // English Teacher
      })

      // Period 2: Maths
      timetableEntries.push({
        id: generateId(),
        class_id: cls.id,
        day,
        period: 2,
        subject: 'Maths',
        teacher_id: teachers[0].id, // Y Sir
      })

      // Period 3: Science
      timetableEntries.push({
        id: generateId(),
        class_id: cls.id,
        day,
        period: 3,
        subject: 'Science',
        teacher_id: teachers[1].id, // X Mam
      })

      // Period 4: SST
      timetableEntries.push({
        id: generateId(),
        class_id: cls.id,
        day,
        period: 4,
        subject: 'SST',
        teacher_id: teachers[2].id, // Dhruvi Mam
      })
    })
  })

  schoolStorage.setTimetable(schoolId, timetableEntries)
  console.log(`✅ Added ${timetableEntries.length} timetable entries`)

  // Initialize empty arrays for absences and proxies
  schoolStorage.setAbsences(schoolId, [])
  schoolStorage.setProxies(schoolId, [])

  console.log('✅ Sample data seeded successfully!')
  console.log('📊 Summary:', schoolStorage.getStorageInfo(schoolId))
}

/**
 * Export data to JSON for backup
 */
export const exportSchoolData = (schoolId: string): string => {
  const data = schoolStorage.exportData(schoolId)
  return JSON.stringify(data, null, 2)
}

/**
 * Import data from JSON
 */
export const importSchoolData = (schoolId: string, jsonString: string): void => {
  try {
    const data = JSON.parse(jsonString)
    schoolStorage.importData(schoolId, data)
    console.log('✅ Data imported successfully!')
  } catch (error) {
    console.error('❌ Failed to import data:', error)
    throw error
  }
}

/**
 * Parse CSV and import timetable
 * Expected CSV format:
 * class_name,day,period,subject,teacher_name
 */
export const importTimetableFromCSV = (
  schoolId: string,
  csvText: string
): { success: number; failed: number; errors: string[] } => {
  const lines = csvText.trim().split('\n')
  const errors: string[] = []
  let success = 0
  let failed = 0

  const teachers = schoolStorage.getTeachers(schoolId)
  const classes = schoolStorage.getClasses(schoolId)

  lines.slice(1).forEach((line, index) => {
    try {
      const [className, day, periodStr, subject, teacherName] = line
        .split(',')
        .map((s) => s.trim())

      const classRecord = classes.find((c) => c.name === className)
      const teacher = teachers.find(
        (t) => `${t.first_name} ${t.last_name}`.toLowerCase() === teacherName.toLowerCase()
      )

      if (!classRecord) {
        errors.push(`Row ${index + 2}: Class "${className}" not found`)
        failed++
        return
      }

      if (!teacher) {
        errors.push(`Row ${index + 2}: Teacher "${teacherName}" not found`)
        failed++
        return
      }

      const period = parseInt(periodStr)
      if (isNaN(period)) {
        errors.push(`Row ${index + 2}: Invalid period "${periodStr}"`)
        failed++
        return
      }

      const entry: TimetableEntry = {
        id: generateId(),
        class_id: classRecord.id,
        day: day.toLowerCase() as any,
        period,
        subject,
        teacher_id: teacher.id,
      }

      schoolStorage.addTimetableEntry(schoolId, entry)
      success++
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }
  })

  return { success, failed, errors }
}
