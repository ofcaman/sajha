"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  updateDoc,
  deleteDoc,
} from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import type { TeacherAssignment } from "@/lib/models/teacher-assignment-models"
import { ArrowLeft, Edit, Plus, Trash2, Loader2 } from "lucide-react"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function TeacherAssignmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("teacherId")
  const currentUserId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [targetTeacher, setTargetTeacher] = useState<Teacher | null>(null)
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentAssignment, setCurrentAssignment] = useState<TeacherAssignment | null>(null)
  const [formData, setFormData] = useState({
    grade: "",
    subject: "",
    academicYear: new Date().getFullYear().toString(),
  })
  const [isDemoMode, setIsDemoMode] = useState(false)

  // List of grades and subjects
  const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  const subjects = [
    "Math",
    "Science",
    "English",
    "Serofero",
    "Computer",
    "Nepali",
    "Samajik",
    "Health",
    "O.PT",
    "Grammar",
    "Translation",
  ]

  useEffect(() => {
    if (!teacherId || !currentUserId) {
      router.push("/teacher/dashboard")
      return
    }

    checkPermission()
  }, [teacherId, currentUserId, router])

  const checkPermission = async () => {
    setPermissionChecking(true)

    try {
      // Check if we're in demo mode
      const isDemoMode = localStorage.getItem("isDemoMode") === "true"
      setIsDemoMode(isDemoMode)

      if (isDemoMode) {
        // In demo mode, set up demo data
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

        setTargetTeacher({
          id: teacherId,
          name: "DEMO TARGET TEACHER",
          email: "target@sajhaschool.edu",
          phone: "9876543211",
          qualification: "B.Ed",
          profileImageUrl: "",
          roles: ["class_teacher"],
          assignedClass: "9",
          active: true,
        })

        setHasPermission(true)
        loadDemoAssignments()
        setPermissionChecking(false)
        return
      }

      // Get the current user (teacher) document
      const currentTeacherDoc = await getDoc(doc(db, "teachers", currentUserId))

      if (!currentTeacherDoc.exists()) {
        setHasPermission(false)
        setPermissionMessage("Current teacher not found")
        setPermissionChecking(false)
        return
      }

      const currentTeacherData = currentTeacherDoc.data() as Teacher
      currentTeacherData.id = currentTeacherDoc.id
      setCurrentTeacher(currentTeacherData)

      // Check if current teacher is principal or computer_teacher
      const isAdmin =
        currentTeacherData.roles?.includes("principal") || currentTeacherData.roles?.includes("computer_teacher")

      if (!isAdmin) {
        setHasPermission(false)
        setPermissionMessage("You don't have permission to manage teacher assignments")
        setPermissionChecking(false)
        return
      }

      // Get the target teacher document
      const targetTeacherDoc = await getDoc(doc(db, "teachers", teacherId))

      if (!targetTeacherDoc.exists()) {
        setHasPermission(false)
        setPermissionMessage("Target teacher not found")
        setPermissionChecking(false)
        return
      }

      const targetTeacherData = targetTeacherDoc.data() as Teacher
      targetTeacherData.id = targetTeacherDoc.id
      setTargetTeacher(targetTeacherData)

      setHasPermission(true)
      loadAssignments()
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
    } finally {
      setPermissionChecking(false)
    }
  }

  const loadDemoAssignments = () => {
    // Create demo assignments
    const demoAssignments: TeacherAssignment[] = [
      {
        id: "assignment1",
        teacherId: teacherId || "",
        teacherName: "DEMO TARGET TEACHER",
        grade: "9",
        subject: "Math",
        academicYear: "2023",
      },
      {
        id: "assignment2",
        teacherId: teacherId || "",
        teacherName: "DEMO TARGET TEACHER",
        grade: "10",
        subject: "Science",
        academicYear: "2023",
      },
    ]

    setAssignments(demoAssignments)
    setLoading(false)
  }

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const assignmentsQuery = query(collection(db, "teacher_assignments"), where("teacherId", "==", teacherId))

      const querySnapshot = await getDocs(assignmentsQuery)
      const assignmentsList: TeacherAssignment[] = []

      querySnapshot.forEach((doc) => {
        const assignment = doc.data() as TeacherAssignment
        assignment.id = doc.id
        assignmentsList.push(assignment)
      })

      setAssignments(assignmentsList)
    } catch (error: any) {
      console.error("Error loading assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAssignment = async () => {
    if (!targetTeacher) return

    const newAssignment: Omit<TeacherAssignment, "id"> = {
      teacherId: targetTeacher.id,
      teacherName: targetTeacher.name,
      grade: formData.grade,
      subject: formData.subject,
      academicYear: formData.academicYear,
    }

    try {
      if (isDemoMode) {
        // In demo mode, just add to local state
        const demoAssignment: TeacherAssignment = {
          ...newAssignment,
          id: `assignment${assignments.length + 1}`,
        }
        setAssignments([...assignments, demoAssignment])
      } else {
        // Add to Firestore
        const docRef = await addDoc(collection(db, "teacher_assignments"), newAssignment)
        const addedAssignment: TeacherAssignment = {
          ...newAssignment,
          id: docRef.id,
        }
        setAssignments([...assignments, addedAssignment])
      }

      // Reset form and close dialog
      setFormData({
        grade: "",
        subject: "",
        academicYear: new Date().getFullYear().toString(),
      })
      setIsAddDialogOpen(false)
    } catch (error: any) {
      console.error("Error adding assignment:", error)
      alert(`Error adding assignment: ${error.message}`)
    }
  }

  const handleEditAssignment = async () => {
    if (!currentAssignment) return

    const updatedAssignment: TeacherAssignment = {
      ...currentAssignment,
      grade: formData.grade,
      subject: formData.subject,
      academicYear: formData.academicYear,
    }

    try {
      if (isDemoMode) {
        // In demo mode, just update local state
        const updatedAssignments = assignments.map((assignment) =>
          assignment.id === currentAssignment.id ? updatedAssignment : assignment,
        )
        setAssignments(updatedAssignments)
      } else {
        // Update in Firestore
        await updateDoc(doc(db, "teacher_assignments", currentAssignment.id), {
          grade: formData.grade,
          subject: formData.subject,
          academicYear: formData.academicYear,
        })

        // Update local state
        const updatedAssignments = assignments.map((assignment) =>
          assignment.id === currentAssignment.id ? updatedAssignment : assignment,
        )
        setAssignments(updatedAssignments)
      }

      // Reset form and close dialog
      setCurrentAssignment(null)
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating assignment:", error)
      alert(`Error updating assignment: ${error.message}`)
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    try {
      if (isDemoMode) {
        // In demo mode, just update local state
        const filteredAssignments = assignments.filter((assignment) => assignment.id !== assignmentId)
        setAssignments(filteredAssignments)
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "teacher_assignments", assignmentId))

        // Update local state
        const filteredAssignments = assignments.filter((assignment) => assignment.id !== assignmentId)
        setAssignments(filteredAssignments)
      }
    } catch (error: any) {
      console.error("Error deleting assignment:", error)
      alert(`Error deleting assignment: ${error.message}`)
    }
  }

  const openEditDialog = (assignment: TeacherAssignment) => {
    setCurrentAssignment(assignment)
    setFormData({
      grade: assignment.grade,
      subject: assignment.subject,
      academicYear: assignment.academicYear,
    })
    setIsEditDialogOpen(true)
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
          <CardHeader>
            <CardTitle>Permission Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{permissionMessage}</p>
            <Button className="mt-4 w-full" onClick={() => router.push(`/teacher/dashboard?id=${currentUserId}`)}>
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
        <h1 className="text-2xl font-bold">Teacher Assignments</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{targetTeacher?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div>
              <p>
                <strong>Email:</strong> {targetTeacher?.email}
              </p>
              <p>
                <strong>Phone:</strong> {targetTeacher?.phone}
              </p>
              <p>
                <strong>Qualification:</strong> {targetTeacher?.qualification}
              </p>
              <p>
                <strong>Roles:</strong> {targetTeacher?.roles?.join(", ")}
              </p>
              {targetTeacher?.assignedClass && (
                <p>
                  <strong>Assigned Class:</strong> {targetTeacher.assignedClass}
                </p>
              )}
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Current Assignments</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : assignments.length > 0 ? (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Grade {assignment.grade} - {assignment.subject}
                    </h3>
                    <p className="text-muted-foreground">Academic Year: {assignment.academicYear}</p>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(assignment)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No assignments found for this teacher.</p>
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Assignment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Assignment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
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

            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAssignment}
              disabled={!formData.grade || !formData.subject || !formData.academicYear}
            >
              Add Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
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

            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditAssignment}
              disabled={!formData.grade || !formData.subject || !formData.academicYear}
            >
              Update Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
