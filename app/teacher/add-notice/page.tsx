"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { firebaseConfig } from "@/lib/firebase-config"
import type { Teacher } from "@/lib/models"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { NepaliDatePicker } from "@/components/nepali-date-picker"
import { BsCalendar, type BsDate, nepaliMonths } from "@/lib/nepali-date"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export default function AddNoticePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Form fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [currentBsDate, setCurrentBsDate] = useState<BsDate>(BsCalendar.getCurrentBsDate())

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
        setPermissionChecking(false)
        setLoading(false)
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
          setPermissionMessage("Please sign in to add notices")
          router.push("/teacher/login")
        }
      } else {
        // Get the teacher document for the current user
        const teacherDoc = await getDoc(doc(db, "teachers", teacherId))

        if (teacherDoc.exists()) {
          const teacherData = teacherDoc.data() as Teacher
          teacherData.id = teacherDoc.id
          setCurrentTeacher(teacherData)
          setHasPermission(true)
          setLoading(false)
        } else {
          setHasPermission(false)
          setPermissionMessage("Teacher not found")
          setLoading(false)
        }
      }
    } catch (error: any) {
      console.error("Error checking permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
      setLoading(false)
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
        setLoading(false)
      } else {
        setHasPermission(false)
        setPermissionMessage("Teacher account not found")
        setLoading(false)
      }
    } catch (error: any) {
      console.error("Error checking teacher permission:", error)
      setHasPermission(false)
      setPermissionMessage(`Error checking permissions: ${error.message}`)
      setLoading(false)
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

    if (!title.trim()) errors.title = "Title is required"
    if (!description.trim()) errors.description = "Description is required"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const uploadImageToStorage = async (file: File): Promise<string> => {
    if (isDemoMode) {
      // In demo mode, return a placeholder URL
      return "/placeholder.svg"
    }

    const storageRef = ref(storage, `notice_images/${Date.now()}_${file.name}`)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleDateChange = (date: BsDate) => {
    setCurrentBsDate(date)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSaving(true)

    try {
      // Upload image if selected
      let imageUrl = ""
      if (selectedImage) {
        imageUrl = await uploadImageToStorage(selectedImage)
      }

      // Format the Nepali date for display
      const nepaliDateString = `${currentBsDate.year} ${nepaliMonths[currentBsDate.month - 1]} ${currentBsDate.day}`

      // Create notice object with Nepali date
      const notice = {
        title: title.trim(),
        description: description.trim(),
        timestamp: serverTimestamp(), // Use serverTimestamp for Firestore
        teacherId: currentTeacher?.id || "",
        teacherName: currentTeacher?.name || "",
        ...(imageUrl && { imageUrl }), // Only add imageUrl if it exists
        // Add Nepali date information
        nepaliDate: nepaliDateString,
        bsYear: currentBsDate.year,
        bsMonth: currentBsDate.month,
        bsDay: currentBsDate.day,
      }

      if (isDemoMode) {
        // In demo mode, just show success message and redirect
        alert("Notice added successfully (Demo Mode)")
        router.push("/teacher/dashboard?id=demo123")
      } else {
        // Save to Firestore
        await addDoc(collection(db, "notices"), notice)

        // Success - redirect back to dashboard
        router.push("/teacher/dashboard?id=" + currentTeacher?.id)
      }
    } catch (error: any) {
      console.error("Error adding notice:", error)
      alert(`Error adding notice: ${error.message}`)
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
        <h1 className="text-2xl font-bold">Add Notice</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Notice</CardTitle>
          <CardDescription>Add a new notice for students and teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
              />
              {formErrors.title && <p className="text-red-500 text-sm">{formErrors.title}</p>}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <NepaliDatePicker value={currentBsDate} onChange={handleDateChange} showNepaliDigits={true} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={formErrors.description ? "border-red-500" : ""}
              />
              {formErrors.description && <p className="text-red-500 text-sm">{formErrors.description}</p>}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image">Image (Optional)</Label>
              <div className="flex flex-col items-center">
                {imagePreview && (
                  <div className="mb-4 w-full max-w-md">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Notice Preview"
                      className="w-full h-auto rounded-md object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center">
                  <Label
                    htmlFor="image"
                    className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Label>
                  <Input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Publish Notice"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
