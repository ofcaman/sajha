"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import type { Homework } from "@/lib/models/homework-models"
import { ArrowLeft, Book, Calendar, Clock, Download, FileText, Plus } from "lucide-react"
import { format } from "date-fns"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function HomeworkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/dashboard")
      return
    }

    checkPermission()
  }, [teacherId, router])

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
        loadDemoHomeworks()
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
          setPermissionMessage("Please sign in to access homework")
          router.push("/teacher/login")
        }
      } else {
        // Get the teacher document for the current user
        const teacherDoc = await getDoc(doc(db, "teachers", teacherId!))

        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data() as Teacher
          teacherData.id = teacherDoc.id
          setCurrentTeacher(teacherData)
          setHasPermission(true)
          loadHomeworks(teacherData)
        } else {
          setHasPermission(false)
          setPermissionMessage("Teacher not found")
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
        setHasPermission(true)
        loadHomeworks(teacherData)
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

  const loadDemoHomeworks = () => {
    // Create demo homeworks
    const demoHomeworks: Homework[] = [
      {
        id: "hw1",
        grade: "10",
        subject: "Mathematics",
        title: "Algebra Practice",
        description: "Complete exercises 1-10 on page 45 of the textbook.",
        timestamp: new Date(2025, 3, 15), // April 15, 2025
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
        fileUrl: "https://example.com/math_homework.pdf",
        fileName: "math_homework.pdf",
      },
      {
        id: "hw2",
        grade: "10",
        subject: "Science",
        title: "Chemistry Lab Report",
        description: "Write a lab report on the experiment we conducted in class.",
        timestamp: new Date(2025, 3, 18), // April 18, 2025
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
      },
      {
        id: "hw3",
        grade: "9",
        subject: "English",
        title: "Essay Writing",
        description: "Write a 500-word essay on the topic 'My Future Goals'.",
        timestamp: new Date(2025, 3, 20), // April 20, 2025
        teacherId: "teacher1",
        teacherName: "JOHN DOE",
      },
    ]

    setHomeworks(demoHomeworks)
    setLoading(false)
  }

  const loadHomeworks = async (teacherData: Teacher) => {
    setLoading(true)
    try {
      let homeworkQuery

      // If teacher is a principal or computer teacher, they can see all homeworks
      if (teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")) {
        homeworkQuery = query(collection(db, "homework"), orderBy("timestamp", "desc"), limit(50))
      } else {
        // Other teachers can only see their own homeworks
        homeworkQuery = query(
          collection(db, "homework"),
          where("teacherId", "==", teacherData.id),
          orderBy("timestamp", "desc"),
          limit(50),
        )
      }

      const querySnapshot = await getDocs(homeworkQuery)
      const homeworkList: Homework[] = []

      querySnapshot.forEach((doc) => {
        const homework = doc.data() as Homework
        homework.id = doc.id

        // Convert Firestore timestamp to Date
        if (homework.timestamp) {
          homework.timestamp = doc.data().timestamp.toDate()
        }

        homeworkList.push(homework)
      })

      setHomeworks(homeworkList)
    } catch (error: any) {
      console.error("Error loading homeworks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddHomework = () => {
    router.push(`/teacher/add-homework?id=${currentTeacher?.id}`)
  }

  const filterHomeworks = () => {
    if (activeTab === "all") {
      return homeworks
    } else if (activeTab === "my") {
      return homeworks.filter((hw) => hw.teacherId === currentTeacher?.id)
    } else {
      // Filter by grade (activeTab contains the grade)
      return homeworks.filter((hw) => hw.grade === activeTab)
    }
  }

  const getUniqueGrades = () => {
    const grades = new Set<string>()
    homeworks.forEach((hw) => grades.add(hw.grade))
    return Array.from(grades).sort()
  }

  if (permissionChecking) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
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

  const filteredHomeworks = filterHomeworks()
  const uniqueGrades = getUniqueGrades()

  return (
    <div className="container py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Homework Management</h1>
        </div>
        <Button onClick={handleAddHomework}>
          <Plus className="h-4 w-4 mr-2" />
          Add Homework
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="all">All Homework</TabsTrigger>
          <TabsTrigger value="my">My Assignments</TabsTrigger>
          {uniqueGrades.map((grade) => (
            <TabsTrigger key={grade} value={grade}>
              Grade {grade}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : filteredHomeworks.length > 0 ? (
            <div className="space-y-4">
              {filteredHomeworks.map((homework) => (
                <Card key={homework.id}>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div>
                        <CardTitle className="text-xl">{homework.title}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="flex items-center">
                            <Book className="h-4 w-4 mr-1" />
                            {homework.subject}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Grade {homework.grade}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {format(homework.timestamp, "PPP")}
                          </span>
                        </CardDescription>
                      </div>
                      {homework.fileUrl && (
                        <a
                          href={homework.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-sm text-primary hover:underline"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {homework.fileName || "Download Attachment"}
                        </a>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line">{homework.description}</p>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">Assigned by: {homework.teacherName}</CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No homework assignments found</p>
                <Button className="mt-4" onClick={handleAddHomework}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Homework
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
