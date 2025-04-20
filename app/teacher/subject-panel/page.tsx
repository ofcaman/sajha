"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import type { ExamTerm } from "@/lib/models/exam-models"
import { getSubjectsForGrade } from "@/lib/models/subject-models"
import { ArrowLeft, Loader2, Search } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function SubjectPanelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([])
  const [selectedExamTermId, setSelectedExamTermId] = useState<string>("")
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([])
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [grades, setGrades] = useState<string[]>(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])

  useEffect(() => {
    checkTeacherAndLoadData()
  }, [])

  useEffect(() => {
    if (selectedGrade) {
      loadStudentsByGrade(selectedGrade)
      loadTeacherAssignments()
    }
  }, [selectedGrade])

  useEffect(() => {
    if (searchQuery) {
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.fatherName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchQuery, students])

  const checkTeacherAndLoadData = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
        setCurrentTeacher({
          id: "demo123",
          name: "DEMO TEACHER",
          email: "demo@sajhaschool.edu",
          phone: "9876543210",
          qualification: "M.Ed",
          profileImageUrl: "",
          roles: ["principal", "computer_teacher"],
          assignedClass: "10",
          active: true,
        })
        await loadExamTerms()
        setLoading(false)
        return
      }

      // Get teacher ID from localStorage
      const teacherId = localStorage.getItem("teacherId")

      if (!teacherId) {
        router.push("/teacher/login")
        return
      }

      // Load teacher data
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)

        // If teacher is a class teacher, set the selected grade to their assigned class
        if (teacherData.roles?.includes("class_teacher") && teacherData.assignedClass) {
          setSelectedGrade(teacherData.assignedClass)
        }

        await loadExamTerms()
      } else {
        router.push("/teacher/login")
      }
    } catch (error) {
      console.error("Error checking teacher:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadExamTerms = async () => {
    try {
      if (isDemoMode) {
        // Create demo exam terms
        const demoExamTerms: ExamTerm[] = [
          {
            id: "term1",
            name: "First Term (Active)",
            startDate: new Date(2025, 3, 9),
            endDate: new Date(2025, 3, 23),
            isActive: true,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
          {
            id: "term2",
            name: "Second Term",
            startDate: new Date(2025, 6, 15),
            endDate: new Date(2025, 6, 30),
            isActive: false,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
        ]
        setExamTerms(demoExamTerms)
        setSelectedExamTermId(demoExamTerms[0].id)
      } else {
        // Get current academic year
        const now = new Date()
        const year = now.getFullYear()
        const academicYear = now.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`

        // Query exam terms for the current academic year
        const examTermsRef = collection(db, "exam_terms")
        const q = query(examTermsRef, where("academicYear", "==", academicYear))
        const querySnapshot = await getDocs(q)

        const examTermsList: ExamTerm[] = []
        querySnapshot.forEach((doc) => {
          const examTerm = doc.data() as ExamTerm
          examTerm.id = doc.id

          // Convert Firestore timestamps to Date objects
          examTerm.startDate = doc.data().startDate.toDate()
          examTerm.endDate = doc.data().endDate.toDate()
          examTerm.createdAt = doc.data().createdAt.toDate()
          examTerm.updatedAt = doc.data().updatedAt.toDate()

          examTermsList.push(examTerm)
        })

        setExamTerms(examTermsList)

        // Set active term as selected
        const activeTerm = examTermsList.find((term) => term.isActive)
        if (activeTerm) {
          setSelectedExamTermId(activeTerm.id)
        } else if (examTermsList.length > 0) {
          setSelectedExamTermId(examTermsList[0].id)
        }
      }
    } catch (error) {
      console.error("Error loading exam terms:", error)
    }
  }

  const loadStudentsByGrade = async (grade: string) => {
    try {
      if (isDemoMode) {
        // Create demo students
        const demoStudents: Student[] = Array.from({ length: 10 }, (_, i) => ({
          id: `student${i + 1}`,
          firstName: `Student`,
          middleName: "",
          lastName: `${i + 1}`,
          name: `Student ${i + 1}`,
          fatherName: `Father ${i + 1}`,
          motherName: `Mother ${i + 1}`,
          contactNumber: `98765${i.toString().padStart(5, "0")}`,
          dob: "2065-01-15",
          rollNumber: `${i + 1}`,
          grade: grade,
          symbolNumber: null,
          address: "Kathmandu",
          usesBus: i % 3 === 0,
          busRoute: i % 3 === 0 ? "Route A" : "",
          resultPdfUrl: "",
          subjects: [],
          totalMarks: 0,
          percentage: 0,
          rank: 0,
          attendance: 0,
          totalClasses: 0,
          monthlyFee: 1500,
          dues: i % 5 === 0 ? 1500 : 0,
          currentSubject: null,
          attendanceStatus: "",
          attendanceId: "",
          isSelected: false,
          qrCode: null,
          profilePictureUrl: null,
          transportationFee: i % 3 === 0 ? 500 : 0,
        }))

        setStudents(demoStudents)
        setFilteredStudents(demoStudents)
      } else {
        // Query students by grade
        const studentsRef = collection(db, "students")
        const q = query(studentsRef, where("grade", "==", grade))
        const querySnapshot = await getDocs(q)

        const studentsList: Student[] = []
        querySnapshot.forEach((doc) => {
          const student = doc.data() as Student
          student.id = doc.id
          studentsList.push(student)
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          const rollA = Number.parseInt(a.rollNumber) || 0
          const rollB = Number.parseInt(b.rollNumber) || 0
          return rollA - rollB
        })

        setStudents(studentsList)
        setFilteredStudents(studentsList)
      }
    } catch (error) {
      console.error("Error loading students:", error)
    }
  }

  const loadTeacherAssignments = async () => {
    try {
      if (!currentTeacher || !currentTeacher.id || !selectedGrade) {
        return
      }

      if (isDemoMode) {
        // Create demo assignments
        const demoAssignments = [
          {
            id: "assignment1",
            teacherId: "demo123",
            teacherName: "DEMO TEACHER",
            grade: selectedGrade,
            subject: "Mathematics",
            academicYear: "2025-2026",
          },
          {
            id: "assignment2",
            teacherId: "demo123",
            teacherName: "DEMO TEACHER",
            grade: selectedGrade,
            subject: "English",
            academicYear: "2025-2026",
          },
          {
            id: "assignment3",
            teacherId: "demo123",
            teacherName: "DEMO TEACHER",
            grade: selectedGrade,
            subject: "Science",
            academicYear: "2025-2026",
          },
        ]
        setTeacherAssignments(demoAssignments)

        // Extract assigned subjects for the selected grade
        const subjectsForGrade = demoAssignments.filter((a) => a.grade === selectedGrade).map((a) => a.subject)

        // Check if the teacher is a principal or computer_teacher
        const isAdmin = currentTeacher.roles.includes("principal") || currentTeacher.roles.includes("computer_teacher")

        if (isAdmin) {
          // Use all subjects for the grade
          const allSubjects = getSubjectsForGrade(selectedGrade)
          setAssignedSubjects(allSubjects)
        } else {
          setAssignedSubjects(subjectsForGrade)
        }
      } else {
        // Fetch teacher assignments from Firestore
        const assignmentsRef = collection(db, "teacher_assignments")
        const q = query(
          assignmentsRef,
          where("teacherId", "==", currentTeacher.id),
          where("grade", "==", selectedGrade),
        )
        const querySnapshot = await getDocs(q)

        const assignments: any[] = []
        querySnapshot.forEach((doc) => {
          assignments.push({ id: doc.id, ...doc.data() })
        })

        setTeacherAssignments(assignments)

        // Extract assigned subjects for the selected grade
        const subjectsForGrade = assignments.map((a) => a.subject)

        // Check if the teacher is a principal or computer_teacher
        const isAdmin = currentTeacher.roles.includes("principal") || currentTeacher.roles.includes("computer_teacher")

        if (isAdmin) {
          // Use all subjects for the grade
          const allSubjects = getSubjectsForGrade(selectedGrade)
          setAssignedSubjects(allSubjects)
        } else {
          setAssignedSubjects(subjectsForGrade)
        }
      }
    } catch (error) {
      console.error("Error loading teacher assignments:", error)
    }
  }

  const handleEnterMarks = (studentId: string) => {
    router.push(`/teacher/marks-entry?studentId=${studentId}&examTermId=${selectedExamTermId}`)
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Special handling for principals and computer teachers
  const isAdmin =
    currentTeacher?.roles?.includes("principal") || currentTeacher?.roles?.includes("computer_teacher") || false

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Subject Panel</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Class and Exam Term</CardTitle>
          <p className="text-sm text-muted-foreground">Choose a class and exam term to enter marks</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grade">Select Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="examTerm">Select Exam Term</Label>
              <Select value={selectedExamTermId} onValueChange={setSelectedExamTermId}>
                <SelectTrigger id="examTerm">
                  <SelectValue placeholder="Select exam term" />
                </SelectTrigger>
                <SelectContent>
                  {examTerms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} {term.isActive && "(Active)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedGrade && selectedExamTermId && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Students</h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {assignedSubjects.length === 0 && !isAdmin && (
            <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
              You are not assigned to teach any subjects for Grade {selectedGrade}. Please contact the administrator.
            </div>
          )}

          {isAdmin && (
            <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded border border-blue-200">
              As an administrator, you have access to enter marks for all subjects.
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {filteredStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">Roll No.</th>
                        <th className="text-left p-4">Name</th>
                        <th className="text-left p-4">Father's Name</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">{student.rollNumber}</td>
                          <td className="p-4">{student.name}</td>
                          <td className="p-4">{student.fatherName}</td>
                          <td className="p-4">
                            <Button
                              onClick={() => handleEnterMarks(student.id)}
                              disabled={assignedSubjects.length === 0 && !isAdmin}
                            >
                              Enter Marks
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {selectedGrade ? "No students found in this grade" : "Please select a grade to view students"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
