"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getAuth, signOut } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"
import { Loader2, LogOut, Plus, RefreshCcw, Search, UserPlus } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function TeacherDashboardPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("students")
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!teacherId) {
        router.push("/teacher/login")
        return
      }

      try {
        // Check if we're in demo mode
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          // Load demo data
          setTeacher({
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
          setIsAdmin(true)
          loadDemoData()
        } else {
          // Load real data from Firebase
          const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

          if (teacherDoc.exists()) {
            const teacherData = teacherDoc.data() as Teacher
            teacherData.id = teacherDoc.id
            setTeacher(teacherData)

            // Check if teacher is admin (principal or computer_teacher)
            const isAdminUser =
              teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")
            setIsAdmin(isAdminUser)

            // Load students after teacher data is loaded
            loadStudents(teacherData)

            // Load teachers if admin
            if (isAdminUser) {
              loadTeachers()
            }
          } else {
            setError("Teacher not found")
            setTimeout(() => router.push("/teacher/login"), 2000)
          }
        }
      } catch (error: any) {
        setError(`Error fetching teacher data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchTeacherData()
  }, [teacherId, router])

  const loadDemoData = () => {
    // Load demo students
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
      attendanceStatus: "",
      attendanceId: "",
      isSelected: false,
      qrCode: null,
      profilePictureUrl: null,
      transportationFee: i % 3 === 0 ? 500 : 0,
    }))

    setStudents(demoStudents)

    // Load demo teachers
    const demoTeachers: Teacher[] = [
      {
        id: "demo123",
        name: "DEMO TEACHER",
        email: "demo@sajhaschool.edu",
        phone: "9876543210",
        qualification: "M.Ed",
        profileImageUrl: "",
        roles: ["principal", "computer_teacher"],
        assignedClass: "10",
        active: true,
      },
      {
        id: "teacher1",
        name: "JOHN DOE",
        email: "john@sajhaschool.edu",
        phone: "9876543211",
        qualification: "B.Ed",
        profileImageUrl: "",
        roles: ["class_teacher"],
        assignedClass: "9",
        active: true,
      },
      {
        id: "teacher2",
        name: "JANE SMITH",
        email: "jane@sajhaschool.edu",
        phone: "9876543212",
        qualification: "M.Sc",
        profileImageUrl: "",
        roles: ["subject_teacher"],
        assignedClass: "",
        active: true,
      },
    ]

    setTeachers(demoTeachers)
    setLoading(false)
  }

  const loadStudents = async (teacherData: Teacher) => {
    setRefreshing(true)
    try {
      let studentsQuery

      // Filter students based on teacher role
      if (teacherData.roles?.includes("class_teacher") && teacherData.assignedClass) {
        // Class teachers see only their assigned class
        studentsQuery = query(collection(db, "students"), where("grade", "==", teacherData.assignedClass))
      } else {
        // Other teachers see all students
        studentsQuery = collection(db, "students")
      }

      const querySnapshot = await getDocs(studentsQuery)
      const studentsList: Student[] = []

      querySnapshot.forEach((doc) => {
        const student = doc.data() as Student
        student.id = doc.id
        studentsList.push(student)
      })

      // Sort students by grade and roll number
      studentsList.sort((a, b) => {
        const gradeA = Number.parseInt(a.grade) || Number.MAX_SAFE_INTEGER
        const gradeB = Number.parseInt(b.grade) || Number.MAX_SAFE_INTEGER

        if (gradeA !== gradeB) return gradeA - gradeB

        const rollA = Number.parseInt(a.rollNumber) || Number.MAX_SAFE_INTEGER
        const rollB = Number.parseInt(b.rollNumber) || Number.MAX_SAFE_INTEGER
        return rollA - rollB
      })

      setStudents(studentsList)
    } catch (error: any) {
      console.error("Error loading students:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const loadTeachers = async () => {
    try {
      const teachersQuery = collection(db, "teachers")
      const querySnapshot = await getDocs(teachersQuery)
      const teachersList: Teacher[] = []

      querySnapshot.forEach((doc) => {
        const teacher = doc.data() as Teacher
        teacher.id = doc.id
        teachersList.push(teacher)
      })

      // Sort teachers by name
      teachersList.sort((a, b) => a.name.localeCompare(b.name))

      setTeachers(teachersList)
    } catch (error: any) {
      console.error("Error loading teachers:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem("teacherId")
      localStorage.removeItem("isDemoMode")
      localStorage.removeItem("demoTeacherId")
      router.push("/teacher/login")
    } catch (error: any) {
      setError(`Logout error: ${error.message}`)
    }
  }

  const handleStudentClick = (studentId: string) => {
    router.push(`/teacher/student-result?id=${studentId}`)
  }

  const handleAddStudent = () => {
    router.push("/teacher/add-student")
  }

  const handleAddTeacher = () => {
    router.push("/teacher/add-teacher")
  }

  const handleViewTeacher = (teacherId: string) => {
    router.push(`/teacher/view-teacher?id=${teacherId}`)
  }

  const getRoleText = (roles: string[] = []) => {
    if (roles.includes("principal")) return "Principal"
    if (roles.includes("computer_teacher")) return "Computer Teacher"
    if (roles.includes("class_teacher")) return `Class Teacher - Grade ${teacher?.assignedClass}`
    if (roles.includes("subject_teacher")) return "Subject Teacher"
    return "Teacher"
  }

  const getRolesList = (roles: string[] = []) => {
    return roles
      .map((role) => {
        switch (role) {
          case "principal":
            return "Principal"
          case "computer_teacher":
            return "Computer Teacher"
          case "class_teacher":
            return "Class Teacher"
          case "subject_teacher":
            return "Subject Teacher"
          default:
            return role
        }
      })
      .join(", ")
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
            <Button className="mt-4" onClick={() => router.push("/teacher/login")}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const dashboardMenuItems = [
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/notification-0dhQamNWbb1IN5Fy2KDLiHGzdqHFCG.png",
      title: "Notices",
      onClick: () => router.push("/teacher/notices"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/subjects-9TfbIqpb3ilHR4Ebczi1KCFpFmwFiL.png",
      title: "Subjects",
      onClick: () => router.push("/teacher/subject-panel"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/exam-g7yar1njsndYYM4JeflnkjCatr1MHg.png",
      title: "Marks Entry",
      onClick: () => router.push("/teacher/marks-entry"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mark-entry-eFaGlcXTcYWRK9h8LwdXBDepZ7iuaz.png",
      title: "Subject Panel",
      onClick: () => router.push("/teacher/subject-panel"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/exam-term-rO2xYdgTQ8CDoyoSZKMSLnq7s5WokD.png",
      title: "Exam Term",
      onClick: () => router.push("/teacher/exam-term"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/QRCODEGENERATE-Hf5B1YjwJdf5G85Ug3JmRyYllEdnCE.png",
      title: "QR Scanner",
      onClick: () => router.push(`/teacher/qr-scanner?id=${teacherId}`),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pay-9r39vuosTh2v9pF2OUFghGgUS0lyQB.png",
      title: "Update Bill",
      onClick: () => router.push("/teacher/update-bill"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/report-cKcPlEAsMlb3HseFdNoPOwpAVtCb3a.png",
      title: "Reports",
      onClick: () => router.push("/teacher/reports"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/teacher-2LHqStarjn58h1FK2VEaE5gYjcZvmy.png",
      title: "Teachers",
      onClick: () => setActiveTab("teachers"),
    },
    {
      icon: "/class-routine.png",
      title: "Class Routine",
      onClick: () => router.push("/teacher/class-routine"),
    },
  ]

  // Admin-only menu items
  const adminMenuItems = [
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/QRCODEGENERATE-Hf5B1YjwJdf5G85Ug3JmRyYllEdnCE.png",
      title: "Generate QR",
      onClick: () => router.push(`/teacher/qr-scanner?id=${teacherId}`),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pay-9r39vuosTh2v9pF2OUFghGgUS0lyQB.png",
      title: "Add Fee",
      onClick: () => router.push(`/teacher/generate-bill?id=${teacherId}`),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/report-cKcPlEAsMlb3HseFdNoPOwpAVtCb3a.png",
      title: "Generate Reports",
      onClick: () => router.push("/teacher/generate-reports"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/exam-term-rO2xYdgTQ8CDoyoSZKMSLnq7s5WokD.png",
      title: "Exam Term",
      onClick: () => router.push("/teacher/exam-term"),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/subjects-9TfbIqpb3ilHR4Ebczi1KCFpFmwFiL.png",
      title: "Assign Subject",
      onClick: () => router.push(`/teacher/assign-subject?id=${teacherId}`),
    },
    {
      icon: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/notification-0dhQamNWbb1IN5Fy2KDLiHGzdqHFCG.png",
      title: "Add Notice",
      onClick: () => router.push(`/teacher/add-notice?id=${teacherId}`),
    },
  ]

  return (
    <div className="container py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/school_logo-CMGB0z4UaUmQ2amweOElwZq72VzLCw.png"
            alt="School Logo"
            className="h-16 w-auto mr-4"
          />
          <div>
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {teacher?.name || "Teacher"}</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Teacher Profile Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                {teacher?.name?.charAt(0) || "T"}
              </div>
            </div>
            <div className="flex-grow">
              <h2 className="text-2xl font-bold">{teacher?.name}</h2>
              <p className="text-muted-foreground">{getRoleText(teacher?.roles)}</p>
              <p className="text-sm">{teacher?.email}</p>
              <p className="text-sm">{teacher?.phone}</p>
              <p className="text-sm">{teacher?.qualification}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Menu */}
      <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {dashboardMenuItems.map((item, index) => (
          <Card key={index} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={item.onClick}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 flex items-center justify-center mb-2">
                <img src={item.icon || "/placeholder.svg"} alt={item.title} className="h-12 w-12" />
              </div>
              <p className="text-sm font-medium">{item.title}</p>
            </CardContent>
          </Card>
        ))}

        {/* Show admin menu items only for admin users */}
        {isAdmin &&
          adminMenuItems.map((item, index) => (
            <Card
              key={`admin-${index}`}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={item.onClick}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 flex items-center justify-center mb-2">
                  <img src={item.icon || "/placeholder.svg"} alt={item.title} className="h-12 w-12" />
                </div>
                <p className="text-sm font-medium">{item.title}</p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Tabs for Students and Teachers */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          {isAdmin && <TabsTrigger value="teachers">Teachers</TabsTrigger>}
        </TabsList>

        <TabsContent value="students">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
            <div>
              <h2 className="text-xl font-semibold">Students</h2>
              <p className="text-sm text-muted-foreground">{students.length} students</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-grow-0 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search students..." className="pl-8" />
              </div>
              <Button variant="outline" size="icon" onClick={() => loadStudents(teacher!)} disabled={refreshing}>
                <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
              {isAdmin && (
                <Button onClick={handleAddStudent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              )}
            </div>
          </div>

          {/* Students Table */}
          <Card>
            <CardContent className="p-0">
              {students.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4">Roll No.</th>
                        <th className="text-left p-4">Name</th>
                        <th className="text-left p-4">Grade</th>
                        <th className="text-left p-4">Father's Name</th>
                        <th className="text-left p-4">Contact</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">{student.rollNumber}</td>
                          <td className="p-4">{student.name}</td>
                          <td className="p-4">{student.grade}</td>
                          <td className="p-4">{student.fatherName}</td>
                          <td className="p-4">{student.contactNumber}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleStudentClick(student.id)}>
                                View
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/teacher/edit-student?id=${student.id}`)
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No students found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="teachers">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
              <div>
                <h2 className="text-xl font-semibold">Teachers</h2>
                <p className="text-sm text-muted-foreground">{teachers.length} teachers</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search teachers..." className="pl-8" />
                </div>
                <Button variant="outline" size="icon" onClick={loadTeachers} disabled={refreshing}>
                  <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
                <Button onClick={handleAddTeacher}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Teacher
                </Button>
              </div>
            </div>

            {/* Teachers Table */}
            <Card>
              <CardContent className="p-0">
                {teachers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4">Name</th>
                          <th className="text-left p-4">Email</th>
                          <th className="text-left p-4">Phone</th>
                          <th className="text-left p-4">Roles</th>
                          <th className="text-left p-4">Assigned Class</th>
                          <th className="text-left p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.map((teacher) => (
                          <tr key={teacher.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">{teacher.name}</td>
                            <td className="p-4">{teacher.email}</td>
                            <td className="p-4">{teacher.phone}</td>
                            <td className="p-4">{getRolesList(teacher.roles)}</td>
                            <td className="p-4">{teacher.assignedClass || "-"}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleViewTeacher(teacher.id)}>
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => router.push(`/teacher/edit-teacher?id=${teacher.id}`)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">No teachers found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
