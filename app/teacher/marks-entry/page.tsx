"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import type { ExamTerm, ExamResult, Subject } from "@/lib/models/exam-models"
import { getSubjectConfig, getSubjectsForGrade, calculateGrade } from "@/lib/models/subject-models"
import { ArrowLeft, Loader2, Save, Check } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function MarksEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get("studentId")
  const examTermId = searchParams.get("examTermId")

  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [examTerm, setExamTerm] = useState<ExamTerm | null>(null)
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([])
  const [selectedExamTermId, setSelectedExamTermId] = useState<string>(examTermId || "")
  const [subjects, setSubjects] = useState<string[]>([])
  const [subjectMarks, setSubjectMarks] = useState<
    Record<string, { theory: string; practical: string; remarks: string }>
  >({})
  const [formErrors, setFormErrors] = useState<Record<string, Record<string, string>>>({})
  const [savedSubjects, setSavedSubjects] = useState<Subject[]>([])
  const [activeTab, setActiveTab] = useState<string>("entry")
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [subjectConfigs, setSubjectConfigs] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!studentId) {
      router.push("/teacher/dashboard")
      return
    }

    checkPermission()
  }, [studentId, router])

  useEffect(() => {
    if (selectedExamTermId && examTerms.length > 0) {
      const term = examTerms.find((term) => term.id === selectedExamTermId)
      if (term) {
        setExamTerm(term)
        loadSavedMarks(term.id)
      }
    }
  }, [selectedExamTermId, examTerms])

  // Add a new useEffect to load teacher assignments when currentTeacher changes
  useEffect(() => {
    if (currentTeacher && student) {
      loadTeacherAssignments()
    }
  }, [currentTeacher, student])

  // Initialize subject marks when subjects change
  useEffect(() => {
    const newSubjectMarks: Record<string, { theory: string; practical: string; remarks: string }> = {}
    const newSubjectConfigs: Record<string, any> = {}

    subjects.forEach((subject) => {
      const config = getSubjectConfig(subject)
      newSubjectConfigs[subject] = config

      // Check if we already have marks for this subject
      const existingSubject = savedSubjects.find((s) => s.name === subject)

      if (existingSubject) {
        newSubjectMarks[subject] = {
          theory: existingSubject.theoryMarks.toString(),
          practical: existingSubject.practicalMarks.toString(),
          remarks: existingSubject.remarks || "",
        }
      } else {
        newSubjectMarks[subject] = {
          theory: "",
          practical: "",
          remarks: "",
        }
      }
    })

    setSubjectMarks(newSubjectMarks)
    setSubjectConfigs(newSubjectConfigs)
  }, [subjects, savedSubjects])

  const checkPermission = async () => {
    setPermissionChecking(true)

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
        setHasPermission(true)
        await loadStudentData()
        await loadExamTerms()
        setPermissionChecking(false)
        return
      }

      const user = auth.currentUser

      if (!user) {
        // Check if we have a teacher ID in localStorage
        const teacherId = localStorage.getItem("teacherId")

        if (teacherId) {
          await checkTeacherPermission(teacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to enter marks")
          router.push("/teacher/login")
        }
      } else {
        // Get the teacher document for the current user
        const teachersRef = collection(db, "teachers")
        const q = query(teachersRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const teacherId = querySnapshot.docs[0].id
          await checkTeacherPermission(teacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Teacher not found in database")
        }
      }
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
    }
  }

  const checkTeacherPermission = async (teacherId: string) => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)

        // All teachers can enter marks
        setHasPermission(true)
        await loadStudentData()
        await loadExamTerms()
      } else {
        setHasPermission(false)
        setPermissionMessage("Teacher account not found")
      }
    } catch (error: any) {
      console.error("Error checking teacher permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    }
  }

  const loadStudentData = async () => {
    setLoading(true)

    try {
      if (isDemoMode) {
        // Create demo student data
        const demoStudent: Student = {
          id: studentId || "student1",
          firstName: "Student",
          middleName: "",
          lastName: "1",
          name: "Student 1",
          fatherName: "Father 1",
          motherName: "Mother 1",
          contactNumber: "9876543210",
          dob: "2065-01-15",
          rollNumber: "1",
          grade: "10",
          symbolNumber: null,
          address: "Kathmandu",
          usesBus: false,
          busRoute: "",
          resultPdfUrl: "",
          subjects: [],
          totalMarks: 0,
          percentage: 0,
          rank: 0,
          attendance: 0,
          totalClasses: 0,
          monthlyFee: 1500,
          dues: 0,
          currentSubject: null,
          attendanceStatus: "",
          attendanceId: "",
          isSelected: false,
          qrCode: null,
          profilePictureUrl: null,
          transportationFee: 0,
        }

        setStudent(demoStudent)
        // Get subjects for this grade
        const subjectsForGrade = getSubjectsForGrade(demoStudent.grade)
        setSubjects(subjectsForGrade)
      } else {
        // Fetch student data from Firestore
        const studentDoc = await getDoc(doc(db, "students", studentId!))

        if (studentDoc.exists()) {
          const studentData = studentDoc.data() as Student
          studentData.id = studentDoc.id
          setStudent(studentData)

          // Get subjects for this grade
          const subjectsForGrade = getSubjectsForGrade(studentData.grade)
          setSubjects(subjectsForGrade)
        } else {
          setPermissionMessage("Student not found")
          setHasPermission(false)
        }
      }
    } catch (error: any) {
      console.error("Error loading student data:", error)
      setPermissionMessage(`Error loading student data: ${error.message}`)
      setHasPermission(false)
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
            name: "First Term",
            startDate: new Date(2025, 3, 9), // April 9, 2025
            endDate: new Date(2025, 3, 23), // April 23, 2025
            isActive: true,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
          {
            id: "term2",
            name: "Second Term",
            startDate: new Date(2025, 6, 15), // July 15, 2025
            endDate: new Date(2025, 6, 30), // July 30, 2025
            isActive: false,
            academicYear: "2025-2026",
            createdBy: "demo123",
            createdAt: new Date(2025, 3, 9),
            updatedAt: new Date(2025, 3, 9),
          },
        ]
        setExamTerms(demoExamTerms)

        // Set selected exam term
        if (examTermId) {
          setSelectedExamTermId(examTermId)
        } else {
          // Find active term or use the first one
          const activeTerm = demoExamTerms.find((term) => term.isActive)
          setSelectedExamTermId(activeTerm?.id || demoExamTerms[0]?.id || "")
        }
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

        // Set selected exam term
        if (examTermId) {
          setSelectedExamTermId(examTermId)
        } else if (examTermsList.length > 0) {
          // Find active term or use the first one
          const activeTerm = examTermsList.find((term) => term.isActive)
          setSelectedExamTermId(activeTerm?.id || examTermsList[0].id)
        }
      }
    } catch (error: any) {
      console.error("Error loading exam terms:", error)
    }
  }

  const loadSavedMarks = async (termId: string) => {
    if (!student) return

    try {
      if (isDemoMode) {
        // Create demo saved subjects
        const demoSubjects: Subject[] = [
          {
            id: "sub1",
            name: "Mathematics",
            creditHours: 4,
            theoryMarks: 75,
            practicalMarks: 0,
            finalGrade: "A",
            gradePoint: 3.6,
            remarks: "Good performance",
            examTerm: termId,
            maxTheoryMarks: 100,
            maxPracticalMarks: 0,
            hasPractical: false,
          },
          {
            id: "sub2",
            name: "English",
            creditHours: 4,
            theoryMarks: 65,
            practicalMarks: 20,
            finalGrade: "B+",
            gradePoint: 3.2,
            remarks: "Needs improvement in writing",
            examTerm: termId,
            maxTheoryMarks: 75,
            maxPracticalMarks: 25,
            hasPractical: true,
          },
        ]
        setSavedSubjects(demoSubjects)
      } else {
        // Query for existing exam result
        const resultsRef = collection(db, "exam_results")
        const q = query(resultsRef, where("studentId", "==", student.id), where("examId", "==", termId))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const resultDoc = querySnapshot.docs[0]
          const resultData = resultDoc.data() as ExamResult
          setSavedSubjects(resultData.subjects || [])
        } else {
          setSavedSubjects([])
        }
      }
    } catch (error: any) {
      console.error("Error loading saved marks:", error)
    }
  }

  const validateForm = () => {
    const errors: Record<string, Record<string, string>> = {}
    let isValid = true

    if (!selectedExamTermId) {
      isValid = false
    }

    // Validate each subject's marks
    assignedSubjects.forEach((subject) => {
      const config = subjectConfigs[subject]
      const marks = subjectMarks[subject]
      const subjectErrors: Record<string, string> = {}

      if (!marks) return

      if (!marks.theory.trim()) {
        subjectErrors.theory = "Theory marks are required"
        isValid = false
      } else {
        const theory = Number(marks.theory)
        if (isNaN(theory) || theory < 0 || theory > config.maxTheoryMarks) {
          subjectErrors.theory = `Theory marks must be between 0 and ${config.maxTheoryMarks}`
          isValid = false
        }
      }

      if (config.hasPractical) {
        if (!marks.practical.trim()) {
          subjectErrors.practical = "Practical marks are required"
          isValid = false
        } else {
          const practical = Number(marks.practical)
          if (isNaN(practical) || practical < 0 || practical > config.maxPracticalMarks) {
            subjectErrors.practical = `Practical marks must be between 0 and ${config.maxPracticalMarks}`
            isValid = false
          }
        }
      }

      if (Object.keys(subjectErrors).length > 0) {
        errors[subject] = subjectErrors
      }
    })

    setFormErrors(errors)
    return isValid
  }

  const handleSaveAllMarks = async () => {
    if (!validateForm() || !student || !examTerm) return

    setSaving(true)
    setSaveSuccess(false)

    try {
      // Create subject objects for each subject
      const subjectsToSave: Subject[] = []

      assignedSubjects.forEach((subjectName) => {
        const config = subjectConfigs[subjectName]
        const marks = subjectMarks[subjectName]

        if (!marks) return

        const theory = Number(marks.theory)
        const practical = config.hasPractical ? Number(marks.practical) : 0
        const totalObtained = theory + practical
        const totalPossible = config.totalMarks
        const percentage = (totalObtained / totalPossible) * 100
        const { grade, gradePoint } = calculateGrade(percentage)

        // Create subject object
        const subject: Subject = {
          id: `${subjectName}-${Date.now()}`,
          name: subjectName,
          creditHours: 4, // Default credit hours
          theoryMarks: theory,
          practicalMarks: practical,
          finalGrade: grade,
          gradePoint: gradePoint,
          remarks: marks.remarks,
          examTerm: examTerm.id,
          maxTheoryMarks: config.maxTheoryMarks,
          maxPracticalMarks: config.maxPracticalMarks,
          hasPractical: config.hasPractical,
        }

        subjectsToSave.push(subject)
      })

      if (isDemoMode) {
        // In demo mode, just update the local state
        setSavedSubjects(subjectsToSave)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        // Check if an exam result already exists for this student and exam term
        const resultsRef = collection(db, "exam_results")
        const q = query(resultsRef, where("studentId", "==", student.id), where("examId", "==", examTerm.id))
        const querySnapshot = await getDocs(q)

        // Calculate total marks, percentage, etc.
        const totalMarks = subjectsToSave.reduce((sum, s) => sum + s.theoryMarks + s.practicalMarks, 0)
        const totalPossibleMarks = subjectsToSave.reduce((sum, s) => sum + s.maxTheoryMarks + s.maxPracticalMarks, 0)
        const overallPercentage = (totalMarks / totalPossibleMarks) * 100
        const { grade: overallGrade, gradePoint: overallGPA } = calculateGrade(overallPercentage)

        if (!querySnapshot.empty) {
          // Update existing exam result
          const resultDoc = querySnapshot.docs[0]

          // Update the exam result
          await updateDoc(doc(db, "exam_results", resultDoc.id), {
            subjects: subjectsToSave,
            totalMarks,
            percentage: overallPercentage,
            gpa: overallGPA,
            grade: overallGrade,
            result: overallPercentage >= 40 ? "Pass" : "Fail",
            updatedAt: serverTimestamp(),
          })
        } else {
          // Create new exam result
          const newExamResult: Omit<ExamResult, "id"> = {
            studentId: student.id,
            examName: examTerm.name,
            examId: examTerm.id,
            subjects: subjectsToSave,
            totalMarks,
            percentage: overallPercentage,
            gpa: overallGPA,
            grade: overallGrade,
            result: overallPercentage >= 40 ? "Pass" : "Fail",
            date: new Date(),
          }

          await addDoc(collection(db, "exam_results"), newExamResult)
        }

        setSavedSubjects(subjectsToSave)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error: any) {
      console.error("Error saving marks:", error)
      alert(`Error saving marks: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const loadTeacherAssignments = async () => {
    try {
      // Make sure currentTeacher and student are defined
      if (!currentTeacher || !currentTeacher.id || !student) {
        console.log("Teacher or student not loaded yet, skipping assignment load")
        return
      }

      if (isDemoMode) {
        // Create demo assignments
        const demoAssignments = [
          {
            id: "assignment1",
            teacherId: "demo123",
            teacherName: "DEMO TEACHER",
            grade: "10",
            subject: "Mathematics",
            academicYear: "2025-2026",
          },
          {
            id: "assignment2",
            teacherId: "demo123",
            teacherName: "DEMO TEACHER",
            grade: "10",
            subject: "English",
            academicYear: "2025-2026",
          },
          {
            id: "assignment3",
            teacherId: "demo123",
            teacherName: "DEMO TEACHER",
            grade: "10",
            subject: "Science",
            academicYear: "2025-2026",
          },
        ]
        setTeacherAssignments(demoAssignments)

        // Extract assigned subjects for the student's grade
        const subjectsForGrade = demoAssignments.filter((a) => a.grade === student.grade).map((a) => a.subject)

        setAssignedSubjects(subjectsForGrade)

        // If the teacher is a principal or computer_teacher, they can access all subjects
        const isAdmin = currentTeacher.roles.includes("principal") || currentTeacher.roles.includes("computer_teacher")

        if (isAdmin) {
          // Use all subjects for the grade
          const allSubjects = getSubjectsForGrade(student.grade)
          setAssignedSubjects(allSubjects)
        }
      } else {
        // Fetch teacher assignments from Firestore
        const assignmentsRef = collection(db, "teacher_assignments")
        const q = query(assignmentsRef, where("teacherId", "==", currentTeacher.id))
        const querySnapshot = await getDocs(q)

        const assignments: any[] = []
        querySnapshot.forEach((doc) => {
          assignments.push({ id: doc.id, ...doc.data() })
        })

        setTeacherAssignments(assignments)

        // Extract assigned subjects for the student's grade
        const subjectsForGrade = assignments.filter((a) => a.grade === student.grade).map((a) => a.subject)

        setAssignedSubjects(subjectsForGrade)

        // Check if the teacher is a principal or computer_teacher
        const isAdmin = currentTeacher.roles.includes("principal") || currentTeacher.roles.includes("computer_teacher")

        if (isAdmin) {
          // Use all subjects for the grade
          const allSubjects = getSubjectsForGrade(student.grade)
          setAssignedSubjects(allSubjects)
        }
      }
    } catch (error: any) {
      console.error("Error loading teacher assignments:", error)
    }
  }

  const handleInputChange = (subject: string, field: "theory" | "practical" | "remarks", value: string) => {
    setSubjectMarks((prev) => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [field]: value,
      },
    }))
  }

  if (permissionChecking || loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Permission Denied</CardTitle>
            <CardDescription>{permissionMessage}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push("/teacher/dashboard?id=" + currentTeacher?.id)}>
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Special handling for principals and computer teachers
  const isAdmin =
    currentTeacher?.roles?.includes("principal") || currentTeacher?.roles?.includes("computer_teacher") || false

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Marks Entry</h1>
      </div>

      {student && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold">{student.name}</h2>
                <p className="text-muted-foreground">
                  Grade: {student.grade} | Roll No: {student.rollNumber}
                </p>
                {student.symbolNumber && <p className="text-muted-foreground">Symbol No: {student.symbolNumber}</p>}
              </div>
              <div className="space-y-1">
                <p>
                  <span className="font-medium">Father's Name:</span> {student.fatherName}
                </p>
                <p>
                  <span className="font-medium">Contact:</span> {student.contactNumber}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="entry">Marks Entry</TabsTrigger>
          <TabsTrigger value="view">View Marks</TabsTrigger>
        </TabsList>

        <TabsContent value="entry">
          <Card>
            <CardHeader>
              <CardTitle>Enter Marks</CardTitle>
              <CardDescription>Enter marks for all subjects in the selected exam term</CardDescription>
              {assignedSubjects.length === 0 && student && !isAdmin && (
                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                  You are not assigned to teach any subjects for Grade {student.grade}. Please contact the
                  administrator.
                </div>
              )}
              {isAdmin && (
                <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded border border-blue-200">
                  As an administrator, you have access to enter marks for all subjects.
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Exam Term Selection */}
                <div className="space-y-2">
                  <Label htmlFor="examTerm">
                    Exam Term <span className="text-red-500">*</span>
                  </Label>
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

                {/* Subject Marks Entry */}
                {assignedSubjects.length > 0 && (
                  <div className="space-y-6 mt-6">
                    <h3 className="text-lg font-medium">Subject Marks</h3>

                    {assignedSubjects.map((subject) => {
                      const config = subjectConfigs[subject]
                      const marks = subjectMarks[subject] || { theory: "", practical: "", remarks: "" }
                      const errors = formErrors[subject] || {}

                      if (!config) return null

                      return (
                        <div key={subject} className="border p-4 rounded-md">
                          <h4 className="text-md font-medium mb-4">{subject}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Theory Marks */}
                            <div className="space-y-2">
                              <Label htmlFor={`${subject}-theory`}>
                                Theory Marks <span className="text-red-500">*</span>
                                <span className="text-muted-foreground text-sm ml-2">
                                  (Max: {config.maxTheoryMarks})
                                </span>
                              </Label>
                              <Input
                                id={`${subject}-theory`}
                                type="number"
                                min="0"
                                max={config.maxTheoryMarks}
                                value={marks.theory}
                                onChange={(e) => handleInputChange(subject, "theory", e.target.value)}
                                className={errors.theory ? "border-red-500" : ""}
                              />
                              {errors.theory && <p className="text-red-500 text-sm">{errors.theory}</p>}
                            </div>

                            {/* Practical Marks (if applicable) */}
                            {config.hasPractical && (
                              <div className="space-y-2">
                                <Label htmlFor={`${subject}-practical`}>
                                  Practical Marks <span className="text-red-500">*</span>
                                  <span className="text-muted-foreground text-sm ml-2">
                                    (Max: {config.maxPracticalMarks})
                                  </span>
                                </Label>
                                <Input
                                  id={`${subject}-practical`}
                                  type="number"
                                  min="0"
                                  max={config.maxPracticalMarks}
                                  value={marks.practical}
                                  onChange={(e) => handleInputChange(subject, "practical", e.target.value)}
                                  className={errors.practical ? "border-red-500" : ""}
                                />
                                {errors.practical && <p className="text-red-500 text-sm">{errors.practical}</p>}
                              </div>
                            )}
                          </div>

                          {/* Remarks */}
                          <div className="space-y-2 mt-4">
                            <Label htmlFor={`${subject}-remarks`}>Remarks</Label>
                            <Textarea
                              id={`${subject}-remarks`}
                              value={marks.remarks}
                              onChange={(e) => handleInputChange(subject, "remarks", e.target.value)}
                              placeholder="Optional remarks about the student's performance"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                {saveSuccess && (
                  <div className="flex items-center text-green-600">
                    <Check className="h-4 w-4 mr-2" />
                    All marks saved successfully
                  </div>
                )}
              </div>
              <Button onClick={handleSaveAllMarks} disabled={saving || assignedSubjects.length === 0}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Marks
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Saved Marks</CardTitle>
              <CardDescription>View marks entered for this student</CardDescription>
            </CardHeader>
            <CardContent>
              {savedSubjects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Subject</th>
                        <th className="text-left p-2">Theory</th>
                        <th className="text-left p-2">Practical</th>
                        <th className="text-left p-2">Total</th>
                        <th className="text-left p-2">Grade</th>
                        <th className="text-left p-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedSubjects.map((subject) => (
                        <tr key={subject.id} className="border-b">
                          <td className="p-2">{subject.name}</td>
                          <td className="p-2">
                            {subject.theoryMarks}/{subject.maxTheoryMarks}
                          </td>
                          <td className="p-2">
                            {subject.hasPractical ? `${subject.practicalMarks}/${subject.maxPracticalMarks}` : "N/A"}
                          </td>
                          <td className="p-2">
                            {subject.theoryMarks + subject.practicalMarks}/
                            {subject.maxTheoryMarks + subject.maxPracticalMarks}
                          </td>
                          <td className="p-2">{subject.finalGrade}</td>
                          <td className="p-2">{subject.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No marks have been entered for this student in the selected exam term.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
