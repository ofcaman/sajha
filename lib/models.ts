export interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  qualification: string
  profileImageUrl: string
  roles: string[]
  assignedClass: string
  active: boolean
}

export interface TeacherAssignment {
  id: string
  teacherId: string
  teacherName: string
  grade: string
  subject: string
  academicYear: string
}

export interface Student {
  id: string
  firstName: string
  middleName: string
  lastName: string
  name: string
  fatherName: string
  motherName: string
  contactNumber: string
  dob: string
  rollNumber: string
  grade: string
  symbolNumber: string | null
  address: string
  usesBus: boolean
  busRoute: string
  resultPdfUrl: string
  subjects: Subject[]
  totalMarks: number
  percentage: number
  rank: number
  attendance: number
  totalClasses: number
  monthlyFee: number
  dues: number
  currentSubject: Subject | null
  attendanceStatus: string
  attendanceId: string
  isSelected: boolean
  qrCode: string | null
  profilePictureUrl: string | null
  transportationFee: number
}

export interface Subject {
  id: string
  name: string
  fullMarks?: number
  passMarks?: number
  obtainedMarks?: number
  grade?: string
  theoryMarks: number
  practicalMarks: number
  finalGrade?: string
  gradePoint?: number
  remarks?: string
  examTerm: string
  maxTheoryMarks: number
  maxPracticalMarks: number
  hasPractical: boolean
}

export interface Notice {
  id?: string
  title: string
  description: string
  timestamp: Date
  teacherId: string
  teacherName: string
  imageUrl?: string
}
