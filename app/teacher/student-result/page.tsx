"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { initializeApp } from "firebase/app"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Student, Teacher } from "@/lib/models"
import { ArrowLeft, Loader2 } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function StudentResultPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get("id")
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        router.push("/teacher/dashboard")
        return
      }

      try {
        // Check if we're in demo mode
        const isDemoMode = localStorage.getItem("isDemoMode") === "true"

        if (isDemoMode) {
          // Create demo student data
          const demoStudent: Student = {
            id: studentId,
            firstName: "Student",
            middleName: "",
            lastName: "Demo",
            name: "Student Demo",
            fatherName: "Father Demo",
            motherName: "Mother Demo",
            contactNumber: "9876543210",
            dob: "2065-01-15",
            rollNumber: "1",
            grade: "10",
            symbolNumber: "S12345",
            address: "Kathmandu",
            usesBus: true,
            busRoute: "Route A",
            resultPdfUrl: "",
            subjects: [
              {
                id: "sub1",
                name: "English",
                fullMarks: 100,
                passMarks: 40,
                obtainedMarks: 75,
                grade: "B+",
                theoryMarks: 55,
                practicalMarks: 20,
                finalGrade: "B+",
                gradePoint: 3.2,
                remarks: "Very Good",
                examTerm: "First Term",
                maxTheoryMarks: 75,
                maxPracticalMarks: 25,
                hasPractical: true,
              },
              {
                id: "sub2",
                name: "Mathematics",
                fullMarks: 100,
                passMarks: 40,
                obtainedMarks: 82,
                grade: "A",
                theoryMarks: 82,
                practicalMarks: 0,
                finalGrade: "A",
                gradePoint: 3.6,
                remarks: "Excellent",
                examTerm: "First Term",
                maxTheoryMarks: 100,
                maxPracticalMarks: 0,
                hasPractical: false,
              },
              {
                id: "sub3",
                name: "Science",
                fullMarks: 100,
                passMarks: 40,
                obtainedMarks: 68,
                grade: "B",
                theoryMarks: 48,
                practicalMarks: 20,
                finalGrade: "B",
                gradePoint: 2.8,
                remarks: "Good",
                examTerm: "First Term",
                maxTheoryMarks: 75,
                maxPracticalMarks: 25,
                hasPractical: true,
              },
            ],
            totalMarks: 225,
            percentage: 75.0,
            rank: 3,
            attendance: 85,
            totalClasses: 100,
            monthlyFee: 1500,
            dues: 0,
            currentSubject: null,
            attendanceStatus: "",
            attendanceId: "",
            isSelected: false,
            qrCode: null,
            profilePictureUrl: null,
            transportationFee: 500,
          }

          setStudent(demoStudent)
        } else {
          // Fetch real student data from Firestore
          const studentDoc = await getDoc(doc(db, "students", studentId))

          if (studentDoc.exists()) {
            const studentData = studentDoc.data() as Student
            studentData.id = studentDoc.id
            setStudent(studentData)
          } else {
            setError("Student not found")
          }
        }

        // Check if current teacher is admin
        const isDemoModeAdmin = localStorage.getItem("isDemoMode") === "true"

        if (isDemoModeAdmin) {
          setIsAdmin(true)
        } else {
          // Check if current teacher is admin
          const teacherId = localStorage.getItem("teacherId")
          if (teacherId) {
            try {
              const teacherDoc = await getDoc(doc(db, "teachers", teacherId))
              if (teacherDoc.exists()) {
                const teacherData = teacherDoc.data() as Teacher
                const isAdminUser =
                  teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")
                setIsAdmin(isAdminUser)
              }
            } catch (error) {
              console.error("Error checking admin status:", error)
            }
          }
        }
      } catch (error: any) {
        setError(`Error fetching student data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [studentId, router])

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error || "Student data not available"}</p>
            <Button className="mt-4" onClick={() => router.push("/teacher/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Student Result</h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Information</CardTitle>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/edit-student?id=${student.id}`)}>
              Edit Student
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-shrink-0">
                {student.profilePictureUrl ? (
                  <img
                    src={student.profilePictureUrl || "/placeholder.svg"}
                    alt={student.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
                    {student.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{student.name}</h2>
                <p className="text-muted-foreground">
                  Grade: {student.grade} | Roll No: {student.rollNumber}
                </p>
                {student.symbolNumber && <p className="text-muted-foreground">Symbol No: {student.symbolNumber}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <p>
                <span className="font-medium">Father's Name:</span> {student.fatherName}
              </p>
              <p>
                <span className="font-medium">Mother's Name:</span> {student.motherName}
              </p>
              <p>
                <span className="font-medium">Contact:</span> {student.contactNumber}
              </p>
              <p>
                <span className="font-medium">Address:</span> {student.address}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="results">
        <TabsList className="mb-4">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Academic Results</CardTitle>
            </CardHeader>
            <CardContent>
              {student.subjects && student.subjects.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Subject</th>
                        <th className="text-left p-2">Full Marks</th>
                        <th className="text-left p-2">Pass Marks</th>
                        <th className="text-left p-2">Obtained Marks</th>
                        <th className="text-left p-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {student.subjects.map((subject, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{subject.name}</td>
                          <td className="p-2">{subject.fullMarks}</td>
                          <td className="p-2">{subject.passMarks}</td>
                          <td className="p-2">{subject.obtainedMarks}</td>
                          <td className="p-2">{subject.grade || "-"}</td>
                        </tr>
                      ))}
                      <tr className="font-medium">
                        <td className="p-2">Total</td>
                        <td className="p-2">
                          {student.subjects.reduce((sum, subject) => sum + (subject.fullMarks || 0), 0)}
                        </td>
                        <td className="p-2"></td>
                        <td className="p-2">{student.totalMarks}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-4">
                    <p>
                      <span className="font-medium">Percentage:</span> {student.percentage.toFixed(2)}%
                    </p>
                    <p>
                      <span className="font-medium">Rank:</span> {student.rank || "N/A"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center py-4">No results available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-32 h-32 rounded-full border-8 border-primary flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold">
                      {student.totalClasses > 0 ? Math.round((student.attendance / student.totalClasses) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div>
                  <p>
                    <span className="font-medium">Present Days:</span> {student.attendance}
                  </p>
                  <p>
                    <span className="font-medium">Total Classes:</span> {student.totalClasses}
                  </p>
                  <p>
                    <span className="font-medium">Absent Days:</span> {student.totalClasses - student.attendance}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle>Fee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium">Monthly Fee:</p>
                    <p className="text-2xl">Rs. {student.monthlyFee}</p>
                  </div>
                  {student.usesBus && (
                    <div>
                      <p className="font-medium">Transportation Fee:</p>
                      <p className="text-2xl">Rs. {student.transportationFee}</p>
                    </div>
                  )}
                </div>

                {student.dues > 0 && (
                  <div className="bg-red-50 p-4 rounded-md border border-red-200">
                    <p className="font-medium text-red-700">Outstanding Dues:</p>
                    <p className="text-2xl text-red-700">Rs. {student.dues}</p>
                  </div>
                )}

                {student.usesBus && (
                  <div>
                    <p className="font-medium">Bus Route:</p>
                    <p>{student.busRoute}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
