"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, ArrowLeft, Upload, Trash2 } from "lucide-react"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher, Student } from "@/lib/models"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export default function EditStudentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Form fields
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [fatherName, setFatherName] = useState("")
  const [motherName, setMotherName] = useState("")
  const [contactNumber, setContactNumber] = useState("")
  const [dob, setDob] = useState("")
  const [rollNumber, setRollNumber] = useState("")
  const [grade, setGrade] = useState("")
  const [symbolNumber, setSymbolNumber] = useState("")
  const [address, setAddress] = useState("")
  const [usesBus, setUsesBus] = useState(false)
  const [busRoute, setBusRoute] = useState("")
  const [dues, setDues] = useState("0")

  const classes = ["P.G", "Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => (i + 1).toString())]

  useEffect(() => {
    if (!studentId) {
      router.push("/teacher/dashboard")
      return
    }

    checkPermission()
  }, [studentId, router])

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
        loadStudentData()
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
          setPermissionMessage("Please sign in to edit student details")
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

        // Only principal or computer teacher can edit students
        if (teacherData.roles?.includes("principal") || teacherData.roles?.includes("computer_teacher")) {
          setHasPermission(true)
          loadStudentData()
        } else {
          // Class teachers can only edit students in their class
          if (teacherData.roles?.includes("class_teacher") && teacherData.assignedClass) {
            // Load student to check their grade
            const studentDoc = await getDoc(doc(db, "students", studentId!))

            if (studentDoc.exists()) {
              const studentData = studentDoc.data() as Student

              if (studentData.grade === teacherData.assignedClass) {
                setHasPermission(true)
                loadStudentData()
              } else {
                setHasPermission(false)
                setPermissionMessage("You can only edit students in your assigned class")
              }
            } else {
              setHasPermission(false)
              setPermissionMessage("Student not found")
            }
          } else {
            setHasPermission(false)
            setPermissionMessage("You don't have permission to edit student details")
          }
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

  const loadStudentData = async () => {
    setLoading(true)

    try {
      if (isDemoMode) {
        // Create demo student data based on the ID
        const studentNumber = Number.parseInt(studentId?.replace("student", "") || "1")

        const demoStudent: Student = {
          id: studentId || "student1",
          firstName: "Student",
          middleName: "",
          lastName: `${studentNumber}`,
          name: `Student ${studentNumber}`,
          fatherName: `Father ${studentNumber}`,
          motherName: `Mother ${studentNumber}`,
          contactNumber: `98765${studentNumber.toString().padStart(5, "0")}`,
          dob: "2065-01-15",
          rollNumber: `${studentNumber}`,
          grade: "10",
          symbolNumber: null,
          address: "Kathmandu",
          usesBus: studentNumber % 3 === 0,
          busRoute: studentNumber % 3 === 0 ? "Route A" : "",
          resultPdfUrl: "",
          subjects: [],
          totalMarks: 0,
          percentage: 0,
          rank: 0,
          attendance: 0,
          totalClasses: 0,
          monthlyFee: 1500,
          dues: studentNumber % 5 === 0 ? 1500 : 0,
          currentSubject: null,
          attendanceStatus: "",
          attendanceId: "",
          isSelected: false,
          qrCode: null,
          profilePictureUrl: null,
          transportationFee: studentNumber % 3 === 0 ? 500 : 0,
        }

        setStudentToEdit(demoStudent)
        populateFormFields(demoStudent)
      } else {
        // Fetch student data from Firestore
        const studentDoc = await getDoc(doc(db, "students", studentId!))

        if (studentDoc.exists()) {
          const studentData = studentDoc.data() as Student
          studentData.id = studentDoc.id
          setStudentToEdit(studentData)
          populateFormFields(studentData)
        } else {
          setFormErrors({ general: "Student not found" })
        }
      }
    } catch (error: any) {
      console.error("Error loading student data:", error)
      setFormErrors({ general: `Error loading student data: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const populateFormFields = (student: Student) => {
    setFirstName(student.firstName || "")
    setMiddleName(student.middleName || "")
    setLastName(student.lastName || "")
    setFatherName(student.fatherName || "")
    setMotherName(student.motherName || "")
    setContactNumber(student.contactNumber || "")
    setDob(student.dob || "")
    setRollNumber(student.rollNumber || "")
    setGrade(student.grade || "")
    setSymbolNumber(student.symbolNumber || "")
    setAddress(student.address || "")
    setUsesBus(student.usesBus || false)
    setBusRoute(student.busRoute || "")
    setDues(student.dues?.toString() || "0")

    if (student.profilePictureUrl) {
      setImagePreview(student.profilePictureUrl)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!firstName.trim()) errors.firstName = "First name is required"
    if (!lastName.trim()) errors.lastName = "Last name is required"
    if (!rollNumber.trim()) errors.rollNumber = "Roll number is required"
    if (!fatherName.trim()) errors.fatherName = "Father's name is required"

    if (!contactNumber.trim()) {
      errors.contactNumber = "Contact number is required"
    } else if (contactNumber.length !== 10 || !/^\d+$/.test(contactNumber)) {
      errors.contactNumber = "Enter a valid 10-digit contact number"
    }

    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      errors.dob = "Enter date in YYYY-MM-DD format (e.g., 2080-01-15)"
    }

    const duesValue = Number.parseInt(dues)
    if (isNaN(duesValue) || duesValue < 0) {
      errors.dues = "Dues cannot be negative"
    }

    if (!grade) errors.grade = "Please select a grade"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (isDemoMode) {
      // In demo mode, return a placeholder URL
      return "/placeholder-user.jpg"
    }

    const storageRef = ref(storage, `student_profile_pics/${Date.now()}_${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const getDefaultMonthlyFee = (grade: string): number => {
    switch (grade) {
      case "P.G":
      case "Nursery":
        return 1200
      case "LKG":
        return 1300
      case "UKG":
        return 1400
      default:
        const classNumber = Number.parseInt(grade)
        if (!isNaN(classNumber) && classNumber >= 1) {
          return 1500 + (classNumber - 1) * 100
        }
        return 0
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSaving(true)

    try {
      // Check if we're in demo mode
      if (!isDemoMode) {
        // Check for duplicate roll number in the same grade (excluding this student)
        const studentsRef = collection(db, "students")
        const q = query(studentsRef, where("rollNumber", "==", rollNumber), where("grade", "==", grade))
        const querySnapshot = await getDocs(q)

        let hasDuplicate = false
        querySnapshot.forEach((doc) => {
          if (doc.id !== studentId) {
            hasDuplicate = true
          }
        })

        if (hasDuplicate) {
          setFormErrors({
            ...formErrors,
            rollNumber: `Roll number ${rollNumber} already exists in ${grade}`,
          })
          setSaving(false)
          return
        }
      }

      // Get monthly fee for the grade
      let monthlyFee = getDefaultMonthlyFee(grade)

      if (!isDemoMode) {
        try {
          const feeDoc = await getDoc(doc(db, "fees", grade))
          if (feeDoc.exists() && feeDoc.data().monthlyFee) {
            monthlyFee = feeDoc.data().monthlyFee
          }
        } catch (error) {
          console.warn(`No fee set for ${grade}. Using default fee.`)
        }
      }

      const transportationFee = usesBus ? 500 : 0

      // Upload image if selected
      let profilePictureUrl = studentToEdit?.profilePictureUrl || ""
      if (selectedImage) {
        profilePictureUrl = await uploadImageToStorage(selectedImage)
      }

      // Create full name
      const fullName = middleName.trim()
        ? `${firstName.trim()} ${middleName.trim()} ${lastName.trim()}`
        : `${firstName.trim()} ${lastName.trim()}`

      // Create updated student object
      const updatedStudent: Partial<Student> = {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        name: fullName,
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        contactNumber: contactNumber.trim(),
        dob: dob.trim(),
        rollNumber: rollNumber.trim(),
        grade: grade,
        symbolNumber: symbolNumber.trim() || null,
        address: address.trim(),
        usesBus: usesBus,
        busRoute: usesBus ? busRoute.trim() : "",
        monthlyFee: monthlyFee,
        dues: Number.parseInt(dues) || 0,
        profilePictureUrl: profilePictureUrl,
        transportationFee: transportationFee,
      }

      if (isDemoMode) {
        // In demo mode, just show success message and redirect
        alert("Student updated successfully (Demo Mode)")
        router.push("/teacher/dashboard?id=demo123")
      } else {
        // Update in Firestore
        await updateDoc(doc(db, "students", studentId!), updatedStudent)

        // Success - redirect back to dashboard
        router.push("/teacher/dashboard?id=" + currentTeacher?.id)
      }
    } catch (error: any) {
      console.error("Error updating student:", error)
      setFormErrors({ general: `Error updating student: ${error.message}` })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      if (isDemoMode) {
        // In demo mode, just show success message and redirect
        alert("Student deleted successfully (Demo Mode)")
        router.push("/teacher/dashboard?id=demo123")
      } else {
        // Delete from Firestore
        await deleteDoc(doc(db, "students", studentId!))

        // Success - redirect back to dashboard
        router.push("/teacher/dashboard?id=" + currentTeacher?.id)
      }
    } catch (error: any) {
      console.error("Error deleting student:", error)
      alert(`Error deleting student: ${error.message}`)
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
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
        <h1 className="text-2xl font-bold">Edit Student</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
          <CardDescription>Update the details of the student</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {formErrors.general && (
              <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700 mb-4">
                {formErrors.general}
              </div>
            )}

            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-gray-400">👤</span>
                )}
              </div>
              <div className="flex items-center">
                <Label
                  htmlFor="picture"
                  className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Picture
                </Label>
                <Input id="picture" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={formErrors.firstName ? "border-red-500" : ""}
                />
                {formErrors.firstName && <p className="text-red-500 text-sm">{formErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={formErrors.lastName ? "border-red-500" : ""}
                />
                {formErrors.lastName && <p className="text-red-500 text-sm">{formErrors.lastName}</p>}
              </div>
            </div>

            {/* Parent Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fatherName">
                  Father's Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fatherName"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className={formErrors.fatherName ? "border-red-500" : ""}
                />
                {formErrors.fatherName && <p className="text-red-500 text-sm">{formErrors.fatherName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother's Name</Label>
                <Input id="motherName" value={motherName} onChange={(e) => setMotherName(e.target.value)} />
              </div>
            </div>

            {/* Contact and DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className={formErrors.contactNumber ? "border-red-500" : ""}
                />
                {formErrors.contactNumber && <p className="text-red-500 text-sm">{formErrors.contactNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth (YYYY-MM-DD)</Label>
                <Input
                  id="dob"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="2080-01-15"
                  className={formErrors.dob ? "border-red-500" : ""}
                />
                {formErrors.dob && <p className="text-red-500 text-sm">{formErrors.dob}</p>}
              </div>
            </div>

            {/* Academic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">
                  Grade <span className="text-red-500">*</span>
                </Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className={formErrors.grade ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.grade && <p className="text-red-500 text-sm">{formErrors.grade}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollNumber">
                  Roll Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rollNumber"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className={formErrors.rollNumber ? "border-red-500" : ""}
                />
                {formErrors.rollNumber && <p className="text-red-500 text-sm">{formErrors.rollNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbolNumber">Symbol Number</Label>
                <Input id="symbolNumber" value={symbolNumber} onChange={(e) => setSymbolNumber(e.target.value)} />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            {/* Transportation */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="usesBus" checked={usesBus} onCheckedChange={setUsesBus} />
                <Label htmlFor="usesBus">Uses School Bus</Label>
              </div>

              {usesBus && (
                <div className="space-y-2">
                  <Label htmlFor="busRoute">Bus Route</Label>
                  <Input id="busRoute" value={busRoute} onChange={(e) => setBusRoute(e.target.value)} />
                </div>
              )}
            </div>

            {/* Dues */}
            <div className="space-y-2">
              <Label htmlFor="dues">Dues (if any)</Label>
              <Input
                id="dues"
                type="number"
                value={dues}
                onChange={(e) => setDues(e.target.value)}
                className={formErrors.dues ? "border-red-500" : ""}
              />
              {formErrors.dues && <p className="text-red-500 text-sm">{formErrors.dues}</p>}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Student
              </Button>

              <Button type="submit" disabled={saving || deleting}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this student? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
