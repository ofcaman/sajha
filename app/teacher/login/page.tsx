"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { initializeApp } from "firebase/app"
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore"
import { firebaseConfig } from "@/lib/firebase-config"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function TeacherLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (email.trim() === "" || password.trim() === "") {
      setError("Please fill all fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      if (user) {
        // Query Firestore to find the teacher by email
        const teachersRef = collection(db, "teachers")
        const q = query(teachersRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const teacherId = querySnapshot.docs[0].id

          // Store teacher ID in localStorage
          localStorage.setItem("teacherId", teacherId)
          localStorage.removeItem("isDemoMode")

          // Redirect to dashboard
          router.push(`/teacher/dashboard?id=${teacherId}`)
        } else {
          setError("Teacher not found in database")
        }
      } else {
        setError("User not found")
      }
    } catch (error: any) {
      setError(`Authentication failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError("")

    try {
      // Set demo mode in localStorage
      localStorage.setItem("isDemoMode", "true")
      localStorage.setItem("demoTeacherId", "demo123")

      // Redirect to dashboard
      router.push(`/teacher/dashboard?id=demo123`)
    } catch (error: any) {
      setError(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Teacher Login</CardTitle>
          <CardDescription>Enter your credentials to access the teacher portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@sajhaschool.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button variant="outline" className="w-full" onClick={handleDemoLogin} disabled={loading}>
            Demo Mode (No Login Required)
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
