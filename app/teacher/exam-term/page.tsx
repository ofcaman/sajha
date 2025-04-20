"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  orderBy,
} from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import type { ExamTerm } from "@/lib/models/exam-models"
import { ArrowLeft, Loader2, Plus, Calendar } from "lucide-react"
import { ExamTermAdapter } from "@/components/exam-term-adapter"
import { ExamTermDialog } from "@/components/exam-term-dialog"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function ExamTermManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentExamTerm, setCurrentExamTerm] = useState<ExamTerm | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    checkPermission()
  }, [])

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
        loadExamTerms()
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
          setPermissionMessage("Please sign in to manage exam terms")
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

        // Check if teacher has permission to manage exam terms
        if (teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")) {
          setHasPermission(true)
          loadExamTerms()
        } else {
          setHasPermission(false)
          setPermissionMessage("Only principal or computer teacher can manage exam terms")
        }
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

  const loadExamTerms = async () => {
    setLoading(true)

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
      } else {
        // Get current academic year
        const now = new Date()
        const year = now.getFullYear()
        const academicYear = now.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`

        // Query exam terms for the current academic year
        const examTermsRef = collection(db, "exam_terms")
        const q = query(examTermsRef, where("academicYear", "==", academicYear), orderBy("startDate", "asc"))
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
      }
    } catch (error: any) {
      console.error("Error loading exam terms:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExamTerm = () => {
    setCurrentExamTerm(null)
    setIsAddDialogOpen(true)
  }

  const handleEditExamTerm = (examTerm: ExamTerm) => {
    setCurrentExamTerm(examTerm)
    setIsEditDialogOpen(true)
  }

  const handleDeleteExamTerm = (examTerm: ExamTerm) => {
    setCurrentExamTerm(examTerm)
    setIsDeleteDialogOpen(true)
  }

  const saveExamTerm = async (examTermData: Partial<ExamTerm>) => {
    try {
      setActionLoading(true)

      // Get current academic year
      const now = new Date()
      const year = now.getFullYear()
      const academicYear = now.getMonth() < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`

      if (isDemoMode) {
        // Create a new exam term with a random ID
        const newExamTerm: ExamTerm = {
          id: `term${examTerms.length + 1}`,
          name: examTermData.name || "",
          startDate: examTermData.startDate || new Date(),
          endDate: examTermData.endDate || new Date(),
          isActive: examTermData.isActive || false,
          academicYear,
          createdBy: currentTeacher?.id || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        setExamTerms([...examTerms, newExamTerm])
        setIsAddDialogOpen(false)
      } else {
        // Create a new exam term in Firestore
        const newExamTerm = {
          name: examTermData.name,
          startDate: examTermData.startDate,
          endDate: examTermData.endDate,
          isActive: examTermData.isActive,
          academicYear,
          createdBy: currentTeacher?.id || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const docRef = await addDoc(collection(db, "exam_terms"), newExamTerm)

        // Add the new exam term to the local state
        setExamTerms([
          ...examTerms,
          {
            ...newExamTerm,
            id: docRef.id,
          } as ExamTerm,
        ])

        setIsAddDialogOpen(false)
      }
    } catch (error: any) {
      console.error("Error saving exam term:", error)
      alert(`Error saving exam term: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const updateExamTerm = async (examTermData: Partial<ExamTerm>) => {
    if (!currentExamTerm) return

    try {
      setActionLoading(true)

      if (isDemoMode) {
        // Update the exam term in the local state
        const updatedExamTerms = examTerms.map((term) =>
          term.id === currentExamTerm.id
            ? {
                ...term,
                ...examTermData,
                updatedAt: new Date(),
              }
            : term,
        )

        setExamTerms(updatedExamTerms)
        setIsEditDialogOpen(false)
      } else {
        // Update the exam term in Firestore
        const updatedExamTerm = {
          ...examTermData,
          updatedAt: new Date(),
        }

        await setDoc(doc(db, "exam_terms", currentExamTerm.id), updatedExamTerm, { merge: true })

        // Update the exam term in the local state
        const updatedExamTerms = examTerms.map((term) =>
          term.id === currentExamTerm.id
            ? {
                ...term,
                ...examTermData,
                updatedAt: new Date(),
              }
            : term,
        )

        setExamTerms(updatedExamTerms)
        setIsEditDialogOpen(false)
      }
    } catch (error: any) {
      console.error("Error updating exam term:", error)
      alert(`Error updating exam term: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const deleteExamTerm = async () => {
    if (!currentExamTerm) return

    try {
      setActionLoading(true)

      if (isDemoMode) {
        // Remove the exam term from the local state
        setExamTerms(examTerms.filter((term) => term.id !== currentExamTerm.id))
        setIsDeleteDialogOpen(false)
      } else {
        // Delete the exam term from Firestore
        await deleteDoc(doc(db, "exam_terms", currentExamTerm.id))

        // Remove the exam term from the local state
        setExamTerms(examTerms.filter((term) => term.id !== currentExamTerm.id))
        setIsDeleteDialogOpen(false)
      }
    } catch (error: any) {
      console.error("Error deleting exam term:", error)
      alert(`Error deleting exam term: ${error.message}`)
    } finally {
      setActionLoading(false)
    }
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
            <Button className="mt-4 w-full" onClick={() => router.push("/teacher/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
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
          <h1 className="text-2xl font-bold">Exam Term Management</h1>
        </div>
        <Button onClick={handleAddExamTerm}>
          <Plus className="h-4 w-4 mr-2" />
          Add Exam Term
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : examTerms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No exam terms available</p>
            <Button className="mt-4" onClick={handleAddExamTerm}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Exam Term
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ExamTermAdapter examTerms={examTerms} onEdit={handleEditExamTerm} onDelete={handleDeleteExamTerm} />
      )}

      {/* Add Exam Term Dialog */}
      <ExamTermDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={saveExamTerm}
        isLoading={actionLoading}
        title="Add Exam Term"
        description="Add a new exam term for the current academic year."
        buttonText="Save"
      />

      {/* Edit Exam Term Dialog */}
      <ExamTermDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        examTerm={currentExamTerm}
        onSave={updateExamTerm}
        isLoading={actionLoading}
        title="Edit Exam Term"
        description="Update the exam term details."
        buttonText="Update"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam Term</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this exam term? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteExamTerm} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
