"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  serverTimestamp,
} from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import type { TeacherAssignment } from "@/lib/models/homework-models"
import { ArrowLeft, Loader2, Upload, File } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export default function AddHomeworkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [assignedGrades, setAssignedGrades] = useState<string[]>([])
  const [gradeToSubjectsMap, setGradeToSubjectsMap] = useState<Record<string, string[]>>({})
  const [selectedGrade, setSelectedGrade] = useState<string>("")
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    if (!teacherId) {
      router.push("/teacher/dashboard")
      return
    }

    checkPermission()
  }, [teacherId, router])

  useEffect(() => {
    if (selectedGrade) {
      updateSubjectsForGrade(selectedGrade)
    }
  }, [selectedGrade, gradeToSubjectsMap])

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
        loadDemoAssignments()
        setPermissionChecking(false)
        return
      }

      const user = auth.currentUser

      if (!user) {
        // Check if we have a teacher ID in localStorage
        const loggedInTeacherId = localStorage.getItem("teacherId")

        if (loggedInTeacherId) {
          await checkTeacherPermission(loggedInTeacherId)
        } else {
          setHasPermission(false)
          setPermissionMessage("Please sign in to add homework")
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
          loadTeacherAssignments(teacherData.id)
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

  const checkTeacherPermission = async (loggedInTeacherId: string) => {
    try {
      const teacherDoc = await getDoc(doc(db, "teachers", loggedInTeacherId))

      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data() as Teacher
        teacherData.id = teacherDoc.id
        setCurrentTeacher(teacherData)
        setHasPermission(true)
        loadTeacherAssignments(teacherData.id)
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

  const loadDemoAssignments = () => {
    // Create demo assignments
    const demoGrades = ["10", "9", "8"]
    setAssignedGrades(demoGrades)

    const demoGradeToSubjectsMap: Record<string, string[]> = {
      "10": ["Mathematics", "Science", "Computer"],
      "9": ["English", "Social Studies"],
      "8": ["Nepali", "Science"],
    }
    setGradeToSubjectsMap(demoGradeToSubjectsMap)

    // Set default selections
    setSelectedGrade("10")
    updateSubjectsForGrade("10", demoGradeToSubjectsMap)
    setLoading(false)
  }

  const loadTeacherAssignments = async (teacherId: string) => {
    setLoading(true)
    try {
      // Query teacher assignments
      const assignmentsQuery = query(collection(db, "teacher_assignments"), where("teacherId", "==", teacherId))
      const querySnapshot = await getDocs(assignmentsQuery)

      if (querySnapshot.empty) {
        setPermissionMessage("No subject assignments found for this teacher")
        setHasPermission(false)
        setLoading(false)
        return
      }

      const grades: string[] = []
      const gradeSubjectsMap: Record<string, string[]> = {}

      querySnapshot.forEach((doc) => {
        const assignment = doc.data() as TeacherAssignment
        const grade = assignment.grade?.trim()
        const subject = assignment.subject?.trim()

        if (grade && subject) {
          if (!grades.includes(grade)) {
            grades.push(grade)
          }

          if (!gradeSubjectsMap[grade]) {
            gradeSubjectsMap[grade] = []
          }

          if (!gradeSubjectsMap[grade].includes(subject)) {
            gradeSubjectsMap[grade].push(subject)
          }
        }
      })

      // Sort grades
      grades.sort()
      setAssignedGrades(grades)
      setGradeToSubjectsMap(gradeSubjectsMap)

      // Set default selections
      if (grades.length > 0) {
        setSelectedGrade(grades[0])
        updateSubjectsForGrade(grades[0], gradeSubjectsMap)
      }
    } catch (error: any) {
      console.error("Error loading teacher assignments:", error)
      setPermissionMessage(`Error loading assignments: ${error.message}`)
      setHasPermission(false)
    } finally {
      setLoading(false)
    }
  }

  const updateSubjectsForGrade = (grade: string, map?: Record<string, string[]>) => {
    const subjectsMap = map || gradeToSubjectsMap
    const subjects = subjectsMap[grade] || []
    setAssignedSubjects(subjects)

    if (subjects.length > 0) {
      setSelectedSubject(subjects[0])
    } else {
      setSelectedSubject("")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!selectedGrade) {
      errors.grade = "Please select a grade"
    }

    if (!selectedSubject) {
      errors.subject = "Please select a subject"
    }

    if (!title.trim()) {
      errors.title = "Title is required"
    }

    if (!description.trim()) {
      errors.description = "Description is required"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !currentTeacher) return

    setSaving(true)

    try {
      let fileUrl = ""
      let fileName = ""

      // Upload file if selected
      if (selectedFile) {
        const fileRef = ref(storage, `homework/${Date.now()}_${selectedFile.name}`)
        await uploadBytes(fileRef, selectedFile)
        fileUrl = await getDownloadURL(fileRef)
        fileName = selectedFile.name
      }

      const homeworkData = {
        grade: selectedGrade,
        subject: selectedSubject,
        title: title.trim(),
        description: description.trim(),
        timestamp: new Date(),
        teacherId: currentTeacher.id,
        teacherName: currentTeacher.name,
        ...(fileUrl && { fileUrl, fileName }),
      }

      if (isDemoMode) {
        // In demo mode, just show success message and redirect
        alert("Homework added successfully (Demo Mode)")
        router.push(`/teacher/homework?id=${currentTeacher.id}`)
      } else {
        // Save to Firestore
        await addDoc(collection(db, "homework"), {
          ...homeworkData,
          timestamp: serverTimestamp(),
        })

        // Redirect to homework page
        router.push(`/teacher/homework?id=${currentTeacher.id}`)
      }
    } catch (error: any) {
      console.error("Error adding homework:", error)
      alert(`Error adding homework: ${error.message}`)
    } finally {
      setSaving(false)
    }
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

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Add Homework</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Homework Assignment</CardTitle>
          <CardDescription>Assign homework to students in your classes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Grade Selection */}
              <div className="space-y-2">
                <Label htmlFor="grade">
                  Grade <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade} disabled={assignedGrades.length <= 1}>
                  <SelectTrigger id="grade" className={formErrors.grade ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedGrades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.grade && <p className="text-red-500 text-sm">{formErrors.grade}</p>}
              </div>

              {/* Subject Selection */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                  disabled={assignedSubjects.length <= 1}
                >
                  <SelectTrigger id="subject" className={formErrors.subject ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.subject && <p className="text-red-500 text-sm">{formErrors.subject}</p>}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={formErrors.title ? "border-red-500" : ""}
                placeholder="e.g., Chapter 5 Exercises"
              />
              {formErrors.title && <p className="text-red-500 text-sm">{formErrors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={formErrors.description ? "border-red-500" : ""}
                placeholder="Provide detailed instructions for the homework assignment"
                rows={5}
              />
              {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Attachment (Optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedFile ? "Change File" : "Upload File"}
                </Button>
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{selectedFile.name}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Supported file types: Images (JPG, PNG) and PDF documents</p>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Assign Homework"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
