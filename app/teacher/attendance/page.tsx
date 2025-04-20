"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, setDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import { ArrowLeft, Loader2 } from "lucide-react"

// Add the import for the Nepali date picker
import { NepaliDatePicker } from "@/components/nepali-date-picker"
import { BsCalendar, type BsDate, nepaliMonths, toNepaliDigits } from "@/lib/nepali-date"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Interface for Attendance record
interface Attendance {
  id?: string
  studentId: string
  date: string // AD date in YYYY-MM-DD format
  bsDate: string // BS date in YYYY-MM-DD format
  bsYear: number // BS year
  bsMonth: number // BS month
  bsDay: number // BS day
  subject: string
  status: string
  teacherId: string
  teacherName: string
  grade: string
}

export default function AttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)

  const [grades, setGrades] = useState<string[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [selectedGrade, setSelectedGrade] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  // Use BS date as the primary date
  const [currentBsDate, setCurrentBsDate] = useState<BsDate>(BsCalendar.getCurrentBsDate())
  const [currentDate, setCurrentDate] = useState(currentBsDate.adDate)
  const [dateString, setDateString] = useState("")
  const [bsDateString, setBsDateString] = useState("")

  const [showNepaliDigits, setShowNepaliDigits] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    checkPermission()
  }, [])

  // Update the useEffect that handles date changes
  useEffect(() => {
    // Format the AD date string for Firebase queries (YYYY-MM-DD)
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, "0")
    const day = String(currentDate.getDate()).padStart(2, "0")
    setDateString(`${year}-${month}-${day}`)

    // Format the BS date string (YYYY-MM-DD)
    const bsYear = currentBsDate.year
    const bsMonth = String(currentBsDate.month).padStart(2, "0")
    const bsDay = String(currentBsDate.day).padStart(2, "0")
    setBsDateString(`${bsYear}-${bsMonth}-${bsDay}`)

    if (selectedGrade && selectedSubject) {
      loadAttendanceForDate()
    }
  }, [currentDate, currentBsDate, selectedGrade, selectedSubject])

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

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
        loadDemoData()
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
          setPermissionMessage("Please sign in to access attendance")
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

  const loadDemoData = () => {
    // Set demo grades and subjects
    const demoGrades = ["P.G", "Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
    const demoSubjects = ["English", "Nepali", "Mathematics", "Science", "Social Studies", "Computer"]

    setGrades(demoGrades)
    setSelectedGrade("10")
    setSubjects(demoSubjects)
    setSelectedSubject("Mathematics")

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
      grade: "10",
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
      attendanceStatus: i % 3 === 0 ? "present" : i % 3 === 1 ? "absent" : "late",
      attendanceId: `attendance${i}`,
      isSelected: false,
      qrCode: null,
      profilePictureUrl: null,
      transportationFee: i % 3 === 0 ? 500 : 0,
    }))

    setStudents(demoStudents)
    setLoading(false)
  }

  const checkTeacherPermission = async (teacherId: string) => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)
        setHasPermission(true)

        // Load teacher's assigned grades and subjects
        await loadTeacherAssignments(teacherData)
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

  const loadTeacherAssignments = async (teacherData: Teacher) => {
    try {
      // If teacher is a class teacher, they can only take attendance for their class
      if (teacherData.roles?.includes("class_teacher") && teacherData.assignedClass) {
        setGrades([teacherData.assignedClass])
        setSelectedGrade(teacherData.assignedClass)

        // Load subjects for this grade
        await loadSubjectsForGrade(teacherData.assignedClass)
      } else {
        // For other teachers, load all grades
        const gradesQuery = query(collection(db, "grades"), where("order", ">", 0))
        const querySnapshot = await getDocs(gradesQuery)

        const gradesList: string[] = []
        querySnapshot.forEach((doc) => {
          const gradeName = doc.data().name
          if (gradeName) gradesList.push(gradeName)
        })

        // If no grades found in the grades collection, use default grades
        if (gradesList.length === 0) {
          const defaultGrades = [
            "P.G",
            "Nursery",
            "LKG",
            "UKG",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
          ]
          setGrades(defaultGrades)
          if (defaultGrades.length > 0) {
            setSelectedGrade(defaultGrades[0])
            await loadSubjectsForGrade(defaultGrades[0])
          }
        } else {
          setGrades(gradesList)
          if (gradesList.length > 0) {
            setSelectedGrade(gradesList[0])
            await loadSubjectsForGrade(gradesList[0])
          }
        }
      }
    } catch (error: any) {
      console.error("Error loading teacher assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectsForGrade = async (grade: string) => {
    try {
      if (currentTeacher?.roles?.includes("subject_teacher")) {
        // For subject teachers, load only their assigned subjects
        const assignmentsQuery = query(
          collection(db, "teacher_assignments"),
          where("teacherId", "==", currentTeacher.id),
          where("grade", "==", grade),
        )
        const querySnapshot = await getDocs(assignmentsQuery)

        const subjectsList: string[] = []
        querySnapshot.forEach((doc) => {
          const subject = doc.data().subject
          if (subject) subjectsList.push(subject)
        })

        setSubjects(subjectsList)
        if (subjectsList.length > 0) {
          setSelectedSubject(subjectsList[0])
          await loadStudentsForGrade(grade)
        }
      } else {
        // For other teachers, load all subjects
        const defaultSubjects = ["English", "Nepali", "Mathematics", "Science", "Social Studies", "Computer"]
        setSubjects(defaultSubjects)
        if (defaultSubjects.length > 0) {
          setSelectedSubject(defaultSubjects[0])
          await loadStudentsForGrade(grade)
        }
      }
    } catch (error: any) {
      console.error("Error loading subjects:", error)
    }
  }

  const loadStudentsForGrade = async (grade: string) => {
    setLoading(true)
    try {
      const studentsQuery = query(collection(db, "students"), where("grade", "==", grade))
      const querySnapshot = await getDocs(studentsQuery)

      const studentsList: Student[] = []
      querySnapshot.forEach((doc) => {
        const student = doc.data() as Student
        student.id = doc.id
        student.attendanceStatus = ""
        student.attendanceId = ""
        studentsList.push(student)
      })

      // Sort by roll number
      studentsList.sort((a, b) => {
        const rollA = Number.parseInt(a.rollNumber) || Number.MAX_SAFE_INTEGER
        const rollB = Number.parseInt(b.rollNumber) || Number.MAX_SAFE_INTEGER
        return rollA - rollB
      })

      setStudents(studentsList)

      // Load attendance for the current date
      if (dateString) {
        loadAttendanceForDate(studentsList)
      }
    } catch (error: any) {
      console.error("Error loading students:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAttendanceForDate = async (studentsList: Student[] = students) => {
    if (!dateString || !selectedSubject || studentsList.length === 0) return

    setRefreshing(true)

    // Reset attendance status for all students
    const updatedStudents = studentsList.map((student) => ({
      ...student,
      attendanceStatus: "",
      attendanceId: "",
    }))

    try {
      // For each student, check if there's an attendance record for this date and subject
      for (const student of updatedStudents) {
        // First try to find by BS date
        let attendanceQuery = query(
          collection(db, "attendance"),
          where("studentId", "==", student.id),
          where("bsDate", "==", bsDateString),
          where("subject", "==", selectedSubject),
        )

        let querySnapshot = await getDocs(attendanceQuery)

        // If not found by BS date, try AD date (for backward compatibility)
        if (querySnapshot.empty) {
          attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", student.id),
            where("date", "==", dateString),
            where("subject", "==", selectedSubject),
          )
          querySnapshot = await getDocs(attendanceQuery)
        }

        if (!querySnapshot.empty) {
          const attendanceDoc = querySnapshot.docs[0]
          const attendance = attendanceDoc.data() as Attendance
          student.attendanceStatus = attendance.status
          student.attendanceId = attendanceDoc.id
        }
      }

      setStudents([...updatedStudents])
    } catch (error: any) {
      console.error("Error loading attendance:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const saveAttendance = async (student: Student, status: string) => {
    setRefreshing(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"

      if (isDemoMode) {
        // In demo mode, just update the local state
        setStudents(
          students.map((s) =>
            s.id === student.id ? { ...s, attendanceStatus: status, attendanceId: "demo-attendance-id" } : s,
          ),
        )
      } else {
        const attendance: Attendance = {
          studentId: student.id,
          date: dateString,
          bsDate: bsDateString,
          bsYear: currentBsDate.year,
          bsMonth: currentBsDate.month,
          bsDay: currentBsDate.day,
          subject: selectedSubject,
          status: status,
          teacherId: currentTeacher?.id || "",
          teacherName: currentTeacher?.name || "",
          grade: selectedGrade,
        }

        if (student.attendanceId) {
          // Update existing attendance record
          await setDoc(doc(db, "attendance", student.attendanceId), attendance)
        } else {
          // Create new attendance record
          const docRef = await addDoc(collection(db, "attendance"), attendance)
          student.attendanceId = docRef.id
        }

        // Update local state
        setStudents(
          students.map((s) =>
            s.id === student.id ? { ...s, attendanceStatus: status, attendanceId: student.attendanceId } : s,
          ),
        )
      }
    } catch (error: any) {
      console.error("Error saving attendance:", error)
      alert(`Error saving attendance: ${error.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDateChange = (date: BsDate) => {
    setCurrentBsDate(date)
    setCurrentDate(date.adDate)
  }

  const formatBsDate = () => {
    if (showNepaliDigits) {
      return `${toNepaliDigits(currentBsDate.year)} ${nepaliMonths[currentBsDate.month - 1]} ${toNepaliDigits(currentBsDate.day)}`
    }
    return `${currentBsDate.year} ${nepaliMonths[currentBsDate.month - 1]} ${currentBsDate.day}`
  }

  // Format AD date
  const formatAdDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (permissionChecking) {
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
          <CardContent className="pt-6">
            <p className="text-red-500">{permissionMessage}</p>
            <Button className="mt-4" onClick={() => router.push("/teacher/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Attendance Management</h1>
      </div>

      {/* Date Navigation with Nepali Date Picker */}
      <Card className="mb-6 bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
              <NepaliDatePicker
                value={currentBsDate}
                onChange={handleDateChange}
                showNepaliDigits={showNepaliDigits}
                className="bg-white rounded-md text-foreground"
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-lg font-medium">{formatBsDate()}</p>
              <p className="text-sm opacity-90">{formatAdDate(currentDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade and Subject Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Select Grade</label>
          <Select
            value={selectedGrade}
            onValueChange={(value) => {
              setSelectedGrade(value)
              loadSubjectsForGrade(value)
            }}
          >
            <SelectTrigger>
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
          <label className="block text-sm font-medium mb-1">Select Subject</label>
          <Select
            value={selectedSubject}
            onValueChange={(value) => {
              setSelectedSubject(value)
              loadAttendanceForDate()
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Attendance Legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge className="bg-green-500 hover:bg-green-600">Present</Badge>
        <Badge className="bg-red-500 hover:bg-red-600">Absent</Badge>
        <Badge className="bg-yellow-500 hover:bg-yellow-600">Late</Badge>
      </div>

      {/* Students List */}
      <h2 className="text-xl font-semibold mb-4">Students List</h2>

      {loading || refreshing ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : students.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Roll No.</th>
                    <th className="text-left p-4">Name</th>
                    <th className="text-left p-4">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="p-4">
                        {showNepaliDigits ? toNepaliDigits(Number(student.rollNumber)) : student.rollNumber}
                      </td>
                      <td className="p-4">{student.name}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={student.attendanceStatus === "present" ? "default" : "outline"}
                            className={student.attendanceStatus === "present" ? "bg-green-500 hover:bg-green-600" : ""}
                            onClick={() => saveAttendance(student, "present")}
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant={student.attendanceStatus === "absent" ? "default" : "outline"}
                            className={student.attendanceStatus === "absent" ? "bg-red-500 hover:bg-red-600" : ""}
                            onClick={() => saveAttendance(student, "absent")}
                          >
                            Absent
                          </Button>
                          <Button
                            size="sm"
                            variant={student.attendanceStatus === "late" ? "default" : "outline"}
                            className={student.attendanceStatus === "late" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                            onClick={() => saveAttendance(student, "late")}
                          >
                            Late
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {selectedGrade && selectedSubject ? "No students found for this grade" : "Please select a grade and subject"}
        </div>
      )}
    </div>
  )
}
