// Exam Term model
export interface ExamTerm {
  id: string
  name: string // "First Term", "Second Term", "Third Term", "Final Term"
  startDate: Date
  endDate: Date
  isActive: boolean
  academicYear: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Exam model
export interface Exam {
  id: string
  name: string
  description: string
  date: string
  time: string
  className: string
  subject: string
}

// Exam Result model
export interface Subject {
  id: string
  name: string
  creditHours: number
  theoryMarks: number
  practicalMarks: number
  finalGrade: string
  gradePoint: number
  remarks: string
  examTerm: string
  maxTheoryMarks: number
  maxPracticalMarks: number
  hasPractical: boolean
}

export interface ExamResult {
  id: string
  studentId: string
  examName: string
  examId: string
  subjects: Subject[]
  totalMarks: number
  percentage: number
  gpa: number
  grade: string
  result: string
  date: Date
}
