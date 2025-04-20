"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import { ArrowLeft, Bell, Calendar, Loader2, Plus } from "lucide-react"
import { nepaliMonths, toNepaliDigits } from "@/lib/nepali-date"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Define the Notice interface to match the database structure with Nepali date
interface Notice {
  id?: string
  title: string
  description: string
  timestamp: Date
  teacherId: string
  teacherName: string
  imageUrl?: string
  nepaliDate?: string
  bsYear?: number
  bsMonth?: number
  bsDay?: number
}

export default function NoticesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
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
        setIsAdmin(true)
        loadDemoNotices()
        return
      }

      const teacherId = localStorage.getItem("teacherId")
      if (!teacherId) {
        router.push("/teacher/login")
        return
      }

      try {
        // Fixed: Use doc() and getDoc() functions properly
        const teacherDocRef = doc(db, "teachers", teacherId)
        const teacherSnapshot = await getDoc(teacherDocRef)

        if (teacherSnapshot.exists()) {
          const teacherData = teacherSnapshot.data() as Teacher
          teacherData.id = teacherSnapshot.id
          setCurrentTeacher(teacherData)

          // Check if teacher is admin
          const isAdminUser =
            teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")
          setIsAdmin(isAdminUser)
        } else {
          router.push("/teacher/login")
          return
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      }

      loadNotices()
    }

    checkAuth()
  }, [router])

  const loadDemoNotices = () => {
    // Create demo notices with Nepali dates
    const demoNotices: Notice[] = [
      {
        id: "notice1",
        title: "School Closed for Dashain Festival",
        description:
          "This is to inform all students and parents that the school will remain closed from Ashwin 25 to Kartik 8 for Dashain festival. Classes will resume on Kartik 9.",
        timestamp: new Date(2024, 9, 1), // October 1, 2024
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
        imageUrl: "",
        nepaliDate: "2081 आश्विन 15",
        bsYear: 2081,
        bsMonth: 6, // Ashwin
        bsDay: 15,
      },
      {
        id: "notice2",
        title: "Annual Sports Meet",
        description:
          "The annual sports meet will be held on Kartik 15. All students are required to participate. Parents are cordially invited to attend the event.",
        timestamp: new Date(2024, 10, 15), // November 15, 2024
        teacherId: "demo123",
        teacherName: "DEMO TEACHER",
        imageUrl: "",
        nepaliDate: "2081 कार्तिक 30",
        bsYear: 2081,
        bsMonth: 7, // Kartik
        bsDay: 30,
      },
      {
        id: "notice3",
        title: "Parent-Teacher Meeting",
        description:
          "A parent-teacher meeting will be held on Mangsir 10. All parents are requested to attend the meeting to discuss their child's progress.",
        timestamp: new Date(2024, 11, 1), // December 1, 2024
        teacherId: "teacher1",
        teacherName: "JOHN DOE",
        imageUrl: "",
        nepaliDate: "2081 मंसिर 15",
        bsYear: 2081,
        bsMonth: 8, // Mangsir
        bsDay: 15,
      },
    ]

    setNotices(demoNotices)
    setLoading(false)
  }

  const loadNotices = async () => {
    try {
      const noticesQuery = query(collection(db, "notices"), orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(noticesQuery)

      const noticesList: Notice[] = []
      querySnapshot.forEach((doc) => {
        const notice = doc.data() as Notice
        notice.id = doc.id

        // Convert Firestore timestamp to Date
        if (notice.timestamp) {
          notice.timestamp = doc.data().timestamp.toDate()
        }

        noticesList.push(notice)
      })

      setNotices(noticesList)
    } catch (error) {
      console.error("Error loading notices:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (notice: Notice) => {
    // If we have Nepali date information
    if (notice.nepaliDate) {
      return notice.nepaliDate
    } else if (notice.bsYear && notice.bsMonth && notice.bsDay) {
      return `${toNepaliDigits(notice.bsYear)} ${nepaliMonths[notice.bsMonth - 1]} ${toNepaliDigits(notice.bsDay)}`
    }

    // Fallback to AD date
    const date = notice.timestamp instanceof Date ? notice.timestamp : new Date(notice.timestamp)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">School Notices</h1>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push(`/teacher/add-notice?id=${currentTeacher?.id}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Notice
          </Button>
        )}
      </div>

      {notices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notices available</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => router.push(`/teacher/add-notice?id=${currentTeacher?.id}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Notice
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {notices.map((notice) => (
            <Card key={notice.id}>
              <CardHeader>
                <CardTitle>{notice.title}</CardTitle>
                <CardDescription className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(notice)}
                  <span className="mx-2">•</span>
                  {notice.teacherName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{notice.description}</p>
                {notice.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={notice.imageUrl || "/placeholder.svg"}
                      alt={notice.title}
                      className="rounded-md max-h-96 w-auto mx-auto"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
