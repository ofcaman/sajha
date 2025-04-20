export interface Homework {
  id: string
  grade: string
  subject: string
  title: string
  description: string
  timestamp: Date
  teacherId: string
  teacherName: string
  fileUrl?: string
  fileName?: string
}

export interface TeacherAssignment {
  id: string
  teacherId: string
  teacherName: string
  grade: string
  subject: string
  academicYear: string
}
